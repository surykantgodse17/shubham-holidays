/**
 * Persist confirmed Pi Mainnet bookings (payment id, txid, catalog line, guest).
 */

import crypto from "node:crypto";
import { sql } from "./db.js";

export async function saveConfirmedBooking({
  bookingId,
  paymentId,
  txid,
  piUid,
  order,
  guestName,
  email,
  title,
  subtitle,
  amountInr,
  meta,
}) {
  const id = crypto.randomBytes(16).toString("hex");
  const bid = String(bookingId || order?.bookingId || "").trim().slice(0, 64);
  const payId = String(paymentId || "").trim();
  const tx = String(txid || "").trim();
  if (!bid || !payId || !tx) {
    const err = new Error("Missing booking or payment identifiers.");
    err.status = 400;
    throw err;
  }

  const existing = await sql(`select id from bookings where payment_id = $1`, [payId]);
  if (existing[0]) {
    return { id: existing[0].id, bookingId: bid, paymentId: payId, txid: tx, duplicate: true };
  }

  const safeMeta =
    meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};

  await sql(
    `insert into bookings
      (id, booking_id, payment_id, txid, pi_uid, kind, product_id, title, subtitle,
       guest_name, email, amount_inr, amount_usd, amount_pi, guests, nights, memo,
       payment_method, status, meta)
     values
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'confirmed',$19::jsonb)`,
    [
      id,
      bid,
      payId,
      tx,
      String(piUid || ""),
      String(order?.kind || ""),
      String(order?.productId || ""),
      String(title || order?.title || "").slice(0, 200),
      String(subtitle || "").slice(0, 300),
      String(guestName || "Guest").slice(0, 120),
      String(email || "").slice(0, 160),
      Number(amountInr || order?.amountInr || 0) || 0,
      Number(order?.amountUsd || 0) || 0,
      Number(order?.amountPi || 0) || 0,
      Number(order?.guests || 1) || 1,
      Number(order?.nights || 1) || 1,
      String(order?.memo || "").slice(0, 120),
      "Pi (Mainnet)",
      JSON.stringify(safeMeta),
    ],
  );

  return { id, bookingId: bid, paymentId: payId, txid: tx, duplicate: false };
}
