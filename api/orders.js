import { requirePiCaller } from "../server/payments.js";
import { createOrderTicket } from "../server/orders.js";
import { paymentRateLimitWeb, requireAppOriginWeb } from "../server/security.js";

export async function POST(request) {
  const limited = await paymentRateLimitWeb(request);
  if (limited) return limited;
  const forbidden = requireAppOriginWeb(request);
  if (forbidden) return forbidden;

  try {
    const caller = await requirePiCaller(request.headers.get("authorization"));
    const body = await request.json().catch(() => ({}));
    const order = createOrderTicket({
      uid: caller.uid,
      bookingId: body.bookingId,
      kind: body.kind,
      productId: body.productId || body.id,
      guests: body.guests,
      nights: body.nights,
      memo: body.memo,
    });
    return Response.json({ ok: true, ...order });
  } catch (err) {
    const status = err?.status || 500;
    const safe =
      status === 401 || status === 400 || status === 403 || status === 503
        ? err.message
        : "Could not create order.";
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
  const raw = Buffer.concat(chunks).toString("utf8");
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const request = new Request(url, {
    method: "POST",
    headers: req.headers,
    body: raw || "{}",
  });
  const response = await POST(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
