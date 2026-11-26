/**
 * Server-stored checkout sessions — locks catalog line + qty before /api/orders.
 * Orders may only price from a consumed session, never free-form client product fields.
 */

import crypto from "node:crypto";
import { sql } from "./db.js";
import { priceFromCatalog } from "./catalog.js";
import { usdToPi, PI_USD_RATE_COPY } from "./pricing.js";

const SESSION_TTL_MS = 30 * 60 * 1000;
const BROWSER_COOKIE = "sh_browser";

export function browserCookieName() {
  return BROWSER_COOKIE;
}

export function readBrowserIdFromCookieHeader(cookieHeader) {
  const raw = String(cookieHeader || "");
  const match = new RegExp(`(?:^|;\\s*)${BROWSER_COOKIE}=([^;]+)`).exec(raw);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return String(match[1] || "").trim();
  }
}

export function issueBrowserId() {
  return crypto.randomBytes(24).toString("hex");
}

export function browserSetCookieHeader(browserId, { secure }) {
  const parts = [
    `${BROWSER_COOKIE}=${encodeURIComponent(browserId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=86400",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/**
 * Create a locked checkout session from catalog (ignores client amounts).
 */
export async function createCheckoutSession({
  browserId,
  kind,
  productId,
  guests,
  nights,
  bookingId,
  memo,
}) {
  const bid = String(browserId || "").trim();
  if (!bid || bid.length < 16) {
    const err = new Error("Missing browser session. Refresh and try again.");
    err.status = 403;
    throw err;
  }

  const priced = priceFromCatalog({ kind, productId, guests, nights });
  const amountUsd = priced.amountUsd;
  const amountPi = usdToPi(amountUsd);
  if (!(amountUsd > 0) || !(amountPi > 0)) {
    const err = new Error("Invalid catalog price for checkout.");
    err.status = 400;
    throw err;
  }

  const id = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const title = priced.title;
  const safeMemo = String(memo || `Shubham Holidays · ${title}`).slice(0, 120);
  const safeBooking = String(bookingId || "").trim().slice(0, 64) || null;

  await sql(
    `insert into checkout_sessions
      (id, browser_id, kind, product_id, guests, nights, amount_inr, amount_usd, amount_pi, title, memo, booking_id, status, expires_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open',$13)`,
    [
      id,
      bid,
      priced.kind,
      priced.productId,
      priced.guests,
      priced.nights,
      priced.amountInr,
      amountUsd,
      amountPi,
      title,
      safeMemo,
      safeBooking,
      expiresAt.toISOString(),
    ],
  );

  return {
    checkoutId: id,
    kind: priced.kind,
    productId: priced.productId,
    guests: priced.guests,
    nights: priced.nights,
    amountInr: priced.amountInr,
    amountUsd,
    amountPi,
    title,
    memo: safeMemo,
    gcv: PI_USD_RATE_COPY,
    expiresAt: expiresAt.getTime(),
  };
}

/**
 * Load + consume an open session for this browser. Returns locked catalog fields.
 */
export async function consumeCheckoutSession({ checkoutId, browserId, bookingId, memo }) {
  const id = String(checkoutId || "").trim();
  const bid = String(browserId || "").trim();
  if (!id || !bid) {
    const err = new Error("Missing checkout session.");
    err.status = 400;
    throw err;
  }

  await sql(`delete from checkout_sessions where expires_at < now()`);

  const rows = await sql(
    `select * from checkout_sessions where id = $1 and browser_id = $2`,
    [id, bid],
  );
  const row = rows[0];
  if (!row) {
    const err = new Error("Checkout session not found. Start checkout again.");
    err.status = 404;
    throw err;
  }
  if (row.status !== "open") {
    const err = new Error("Checkout session already used. Start checkout again.");
    err.status = 409;
    throw err;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    const err = new Error("Checkout session expired. Start checkout again.");
    err.status = 400;
    throw err;
  }

  // Re-price from catalog to ensure still matches locked amounts.
  const priced = priceFromCatalog({
    kind: row.kind,
    productId: row.product_id,
    guests: row.guests,
    nights: row.nights,
  });
  const amountUsd = priced.amountUsd;
  const amountPi = usdToPi(amountUsd);
  if (
    priced.amountInr !== Number(row.amount_inr) ||
    Number(amountUsd) !== Number(row.amount_usd) ||
    Number(amountPi) !== Number(row.amount_pi)
  ) {
    const err = new Error("Catalog price changed. Start checkout again.");
    err.status = 409;
    throw err;
  }

  const updated = await sql(
    `update checkout_sessions
     set status = 'consumed', consumed_at = now(),
         booking_id = coalesce($3, booking_id),
         memo = case when $4 = '' then memo else $4 end
     where id = $1 and browser_id = $2 and status = 'open'
     returning id`,
    [id, bid, String(bookingId || "").trim().slice(0, 64) || null, String(memo || "").trim().slice(0, 120)],
  );
  if (!updated[0]) {
    const err = new Error("Checkout session already used. Start checkout again.");
    err.status = 409;
    throw err;
  }

  return {
    kind: priced.kind,
    productId: priced.productId,
    guests: priced.guests,
    nights: priced.nights,
    amountInr: priced.amountInr,
    amountUsd,
    amountPi,
    title: priced.title,
    memo: String(memo || row.memo || `Shubham Holidays · ${priced.title}`).slice(0, 120),
    bookingId: String(bookingId || row.booking_id || "").trim(),
  };
}
