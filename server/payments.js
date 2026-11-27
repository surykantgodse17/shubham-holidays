/**
 * Pi Network payment bridge (server-only).
 * Approve/complete require:
 * 1) verified Pi user Bearer token
 * 2) server-signed order ticket (jti claimed once)
 * 3) Pi payment amount/metadata matching that order
 */

import { verifyOrderTicket } from "./orders.js";
import { piAmountsEqual } from "./pricing.js";
import { sql } from "./db.js";
import { saveConfirmedBooking } from "./bookings.js";

function resolvePiApiBase(hostHint = "") {
  const explicit = String(process.env.PI_API_BASE || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const envSandbox = String(process.env.PI_SANDBOX || "").trim().toLowerCase() === "true";
  const host = String(hostHint || "").toLowerCase();
  // Testnet 01 Grok host → sandbox API without baking PI_SANDBOX into npm start.
  const hostSandbox = host.endsWith("apps.grok.bot");
  return envSandbox || hostSandbox
    ? "https://sandbox-api.minepi.com/v2"
    : "https://api.minepi.com/v2";
}

export function piApiKey() {
  return String(process.env.PI_NETWORK_API_KEY || process.env.PI_API_KEY || "").trim();
}

export function paymentsReady() {
  return Boolean(piApiKey());
}

export async function verifyPiAccessToken(accessToken, requestHost) {
  const token = String(accessToken || "").trim();
  if (!token) {
    const err = new Error("Pi sign-in required.");
    err.status = 401;
    throw err;
  }

  const base = resolvePiApiBase(requestHost);
  const res = await fetch(`${base}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error("Pi session invalid or expired. Sign in with Pi again.");
    err.status = 401;
    throw err;
  }

  const uid = data.uid || data.user?.uid || data.identifier;
  if (!uid) {
    const err = new Error("Pi session invalid or expired. Sign in with Pi again.");
    err.status = 401;
    throw err;
  }

  return {
    uid: String(uid),
    username: data.username || data.user?.username || "",
  };
}

function extractBearer(authorizationHeader) {
  const raw = String(authorizationHeader || "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match ? match[1].trim() : "";
}

export async function requirePiCaller(authorizationHeader, requestHost) {
  return verifyPiAccessToken(extractBearer(authorizationHeader), requestHost);
}

async function piKeyFetch(path, { method = "GET", body, host } = {}) {
  const key = piApiKey();
  if (!key) {
    const err = new Error(
      "Pi payments are not configured on the server yet. Add PI_NETWORK_API_KEY in app secrets (Pi Developers → Settings → API key).",
    );
    err.status = 503;
    throw err;
  }

  const base = resolvePiApiBase(host);
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Key ${key}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      `Pi API error (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  return data;
}

async function getPayment(paymentId, host) {
  return piKeyFetch(`/payments/${encodeURIComponent(paymentId)}`, { host });
}

function paymentUserUid(payment) {
  return String(
    payment?.user_uid ||
      payment?.uid ||
      payment?.user?.uid ||
      payment?.from_uid ||
      "",
  );
}

/**
 * Bind a Pi platform payment to a server-signed order before approve/complete.
 */
async function assertPaymentMatchesOrder(payment, caller, orderTokenFromBody) {
  const meta = payment?.metadata || {};
  const orderToken = String(orderTokenFromBody || meta.orderToken || meta.order_token || "").trim();
  const order = verifyOrderTicket(orderToken, caller.uid);

  const payUid = paymentUserUid(payment);
  if (!payUid || payUid !== caller.uid) {
    const err = new Error("Payment does not belong to this Pi user.");
    err.status = 403;
    throw err;
  }

  const payAmount = Number(payment?.amount);
  if (!piAmountsEqual(payAmount, order.amountPi)) {
    const err = new Error("Payment amount does not match the server order.");
    err.status = 403;
    throw err;
  }

  const metaBooking = String(meta.bookingId || meta.booking_id || "").trim();
  if (metaBooking && metaBooking !== order.bookingId) {
    const err = new Error("Payment booking does not match the server order.");
    err.status = 403;
    throw err;
  }

  return order;
}

async function purgeExpiredOrderTickets() {
  await sql(`delete from order_ticket_uses where expires_at < now()`);
}

/**
 * One-time jti claim: a signed order may approve/complete exactly one Pi paymentId.
 * Same paymentId retries are idempotent; a different paymentId is rejected.
 */
async function claimOrderTicketForPayment(order, paymentId, phase) {
  const jti = String(order?.jti || "").trim();
  if (!jti) {
    const err = new Error("Invalid or missing server order.");
    err.status = 400;
    throw err;
  }

  await purgeExpiredOrderTickets();

  const expiresAt = new Date(Number(order.exp) || Date.now() + 30 * 60 * 1000);
  const existing = await sql(`select jti, payment_id, status from order_ticket_uses where jti = $1`, [
    jti,
  ]);
  let row = existing[0];

  if (!row) {
    try {
      await sql(
        `insert into order_ticket_uses (jti, payment_id, uid, status, expires_at)
         values ($1, $2, $3, $4, $5)`,
        [
          jti,
          paymentId,
          String(order.uid),
          phase === "complete" ? "completed" : "approved",
          expiresAt.toISOString(),
        ],
      );
      return;
    } catch (err) {
      // Concurrent claim — re-read and enforce single payment binding.
      const again = await sql(`select jti, payment_id, status from order_ticket_uses where jti = $1`, [
        jti,
      ]);
      if (!again[0] || String(again[0].payment_id) !== String(paymentId)) {
        const conflict = new Error("This order was already used for another payment.");
        conflict.status = 409;
        throw conflict;
      }
      row = again[0];
    }
  }

  if (String(row.payment_id) !== String(paymentId)) {
    const err = new Error("This order was already used for another payment.");
    err.status = 409;
    throw err;
  }

  if (phase === "complete" && row.status !== "completed") {
    await sql(`update order_ticket_uses set status = 'completed' where jti = $1`, [jti]);
  }
}

export async function approvePayment(paymentId, authorizationHeader, orderToken, requestHost) {
  const caller = await requirePiCaller(authorizationHeader, requestHost);
  const id = String(paymentId || "").trim();
  if (!id) {
    const err = new Error("Missing paymentId.");
    err.status = 400;
    throw err;
  }

  const payment = await getPayment(id, requestHost);
  const order = await assertPaymentMatchesOrder(payment, caller, orderToken);
  await claimOrderTicketForPayment(order, id, "approve");
  return piKeyFetch(`/payments/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: {},
    host: requestHost,
  });
}

export async function completePayment(
  paymentId,
  txid,
  authorizationHeader,
  orderToken,
  bookingDetails = {},
  requestHost,
) {
  const caller = await requirePiCaller(authorizationHeader, requestHost);
  const id = String(paymentId || "").trim();
  const tx = String(txid || "").trim();
  if (!id || !tx) {
    const err = new Error("Missing paymentId or txid.");
    err.status = 400;
    throw err;
  }

  const payment = await getPayment(id, requestHost);
  const order = await assertPaymentMatchesOrder(payment, caller, orderToken);
  await claimOrderTicketForPayment(order, id, "complete");
  const piResult = await piKeyFetch(`/payments/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    body: { txid: tx },
    host: requestHost,
  });

  const booking = await saveConfirmedBooking({
    bookingId: bookingDetails.bookingId || order.bookingId,
    paymentId: id,
    txid: tx,
    piUid: caller.uid,
    order,
    guestName: bookingDetails.guestName,
    email: bookingDetails.email,
    title: bookingDetails.title || order.title,
    subtitle: bookingDetails.subtitle,
    amountInr: bookingDetails.amountInr,
    meta: {
      ...(bookingDetails.meta && typeof bookingDetails.meta === "object" ? bookingDetails.meta : {}),
      piUsername: caller.username || "",
    },
  });

  return { ...piResult, booking };
}
