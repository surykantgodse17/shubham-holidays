/**
 * Signed server orders for Pi payments (no DB required).
 * HMAC key derived from PI_NETWORK_API_KEY (payments already require it).
 */

import crypto from "node:crypto";
import { inrToPi } from "./pricing.js";

const ORDER_TTL_MS = 30 * 60 * 1000;

function apiKey() {
  return String(process.env.PI_NETWORK_API_KEY || process.env.PI_API_KEY || "").trim();
}

function signingKey() {
  const key = apiKey();
  if (!key) return null;
  return crypto.createHash("sha256").update(`shubham-order:${key}`).digest();
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(str) {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

export function createOrderTicket({ uid, bookingId, amountInr, memo }) {
  const key = signingKey();
  if (!key) {
    const err = new Error(
      "Pi payments are not configured on the server yet. Add PI_NETWORK_API_KEY in app secrets.",
    );
    err.status = 503;
    throw err;
  }

  const inr = Number(amountInr);
  if (!Number.isFinite(inr) || inr <= 0 || inr > 5_000_000) {
    const err = new Error("Invalid order amount.");
    err.status = 400;
    throw err;
  }

  const bid = String(bookingId || "").trim().slice(0, 64);
  if (!bid) {
    const err = new Error("Missing bookingId.");
    err.status = 400;
    throw err;
  }

  const amountPi = inrToPi(inr);
  if (amountPi <= 0) {
    const err = new Error("Invalid Pi amount for this order.");
    err.status = 400;
    throw err;
  }

  const payload = {
    v: 1,
    uid: String(uid),
    bookingId: bid,
    amountInr: Math.round(inr * 100) / 100,
    amountPi,
    memo: String(memo || "Shubham Holidays").slice(0, 120),
    exp: Date.now() + ORDER_TTL_MS,
    jti: crypto.randomBytes(12).toString("hex"),
  };

  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", key).update(body).digest());
  return {
    orderToken: `${body}.${sig}`,
    amountPi: payload.amountPi,
    amountInr: payload.amountInr,
    bookingId: payload.bookingId,
    memo: payload.memo,
    expiresAt: payload.exp,
  };
}

export function verifyOrderTicket(orderToken, expectedUid) {
  const key = signingKey();
  if (!key) {
    const err = new Error("Pi payments are not configured on the server yet.");
    err.status = 503;
    throw err;
  }

  const raw = String(orderToken || "").trim();
  const parts = raw.split(".");
  if (parts.length !== 2) {
    const err = new Error("Invalid or missing server order.");
    err.status = 400;
    throw err;
  }

  const [body, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", key).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const err = new Error("Invalid or missing server order.");
    err.status = 403;
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(fromB64url(body).toString("utf8"));
  } catch {
    const err = new Error("Invalid or missing server order.");
    err.status = 400;
    throw err;
  }

  if (!payload || payload.v !== 1) {
    const err = new Error("Invalid or missing server order.");
    err.status = 400;
    throw err;
  }
  if (Number(payload.exp) < Date.now()) {
    const err = new Error("Order expired. Start checkout again.");
    err.status = 400;
    throw err;
  }
  if (String(payload.uid) !== String(expectedUid)) {
    const err = new Error("Order does not belong to this Pi user.");
    err.status = 403;
    throw err;
  }
  return payload;
}
