import { completePayment } from "../../server/payments.js";
import { BOOKING_META_MAX_BYTES, sanitizeBookingMeta } from "../../server/bookings.js";
import {
  paymentRateLimitWeb,
  requireAppOriginWeb,
  requireBrowserSessionWeb,
} from "../../server/security.js";

const COMPLETE_BODY_MAX_BYTES = 8192;

export async function POST(request) {
  const limited = await paymentRateLimitWeb(request);
  if (limited) return limited;
  const forbidden = requireAppOriginWeb(request);
  if (forbidden) return forbidden;
  const browser = requireBrowserSessionWeb(request);
  if (browser.error) return browser.error;

  try {
    const raw = await request.text();
    if (raw.length > COMPLETE_BODY_MAX_BYTES) {
      return Response.json({ ok: false, error: "Request body too large." }, { status: 413 });
    }
    const body = raw ? JSON.parse(raw) : {};
    const meta = sanitizeBookingMeta(body.meta);
    if (JSON.stringify(meta).length > BOOKING_META_MAX_BYTES) {
      return Response.json({ ok: false, error: "Booking meta too large." }, { status: 413 });
    }
    const host = request.headers.get("host") || "";
    const data = await completePayment(
      body.paymentId,
      body.txid,
      request.headers.get("authorization"),
      body.orderToken,
      {
        bookingId: body.bookingId,
        guestName: body.guestName,
        email: body.email,
        subtitle: body.subtitle,
        meta,
      },
      host,
    );
    return Response.json({ ok: true, data });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    const status = err?.status || 500;
    const safe =
      status === 401 || status === 400 || status === 403 || status === 503 || status === 413
        ? err.message
        : "Payment completion failed.";
    return Response.json({ ok: false, error: safe }, { status });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  if (raw.length > COMPLETE_BODY_MAX_BYTES) {
    res.status(413).json({ ok: false, error: "Request body too large." });
    return;
  }
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const request = new Request(url, {
    method: "POST",
    headers: req.headers,
    body: raw.toString("utf8") || "{}",
  });
  const response = await POST(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
