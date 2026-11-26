/**
 * Pi Network payment bridge (server-only).
 * Approve/complete require:
 * 1) verified Pi user Bearer token
 * 2) server-signed order ticket
 * 3) Pi payment amount/metadata matching that order
 */

import { verifyOrderTicket } from "./orders.js";
import { piAmountsEqual } from "./pricing.js";

const PI_API_BASE = (process.env.PI_API_BASE || "https://api.minepi.com/v2").replace(/\/$/, "");

export function piApiKey() {
  return String(process.env.PI_NETWORK_API_KEY || process.env.PI_API_KEY || "").trim();
}

export function paymentsReady() {
  return Boolean(piApiKey());
}

export async function verifyPiAccessToken(accessToken) {
  const token = String(accessToken || "").trim();
  if (!token) {
    const err = new Error("Pi sign-in required.");
    err.status = 401;
    throw err;
  }

  const res = await fetch(`${PI_API_BASE}/me`, {
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

export async function requirePiCaller(authorizationHeader) {
  return verifyPiAccessToken(extractBearer(authorizationHeader));
}

async function piKeyFetch(path, { method = "GET", body } = {}) {
  const key = piApiKey();
  if (!key) {
    const err = new Error(
      "Pi payments are not configured on the server yet. Add PI_NETWORK_API_KEY in app secrets (Pi Developers → Settings → API key).",
    );
    err.status = 503;
    throw err;
  }

  const res = await fetch(`${PI_API_BASE}${path}`, {
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

async function getPayment(paymentId) {
  return piKeyFetch(`/payments/${encodeURIComponent(paymentId)}`);
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

export async function approvePayment(paymentId, authorizationHeader, orderToken) {
  const caller = await requirePiCaller(authorizationHeader);
  const id = String(paymentId || "").trim();
  if (!id) {
    const err = new Error("Missing paymentId.");
    err.status = 400;
    throw err;
  }

  const payment = await getPayment(id);
  await assertPaymentMatchesOrder(payment, caller, orderToken);
  return piKeyFetch(`/payments/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: {},
  });
}

export async function completePayment(paymentId, txid, authorizationHeader, orderToken) {
  const caller = await requirePiCaller(authorizationHeader);
  const id = String(paymentId || "").trim();
  const tx = String(txid || "").trim();
  if (!id || !tx) {
    const err = new Error("Missing paymentId or txid.");
    err.status = 400;
    throw err;
  }

  const payment = await getPayment(id);
  await assertPaymentMatchesOrder(payment, caller, orderToken);
  return piKeyFetch(`/payments/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    body: { txid: tx },
  });
}
