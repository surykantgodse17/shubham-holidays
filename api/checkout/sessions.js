import { createCheckoutSession } from "../../server/checkout.js";
import {
  clientKeyFromRequest,
  ensureBrowserSessionWeb,
  paymentRateLimitWeb,
  requireAppOriginWeb,
} from "../../server/security.js";

export async function POST(request) {
  const limited = await paymentRateLimitWeb(request);
  if (limited) return limited;
  const forbidden = requireAppOriginWeb(request);
  if (forbidden) return forbidden;

  const { browserId, setCookie } = ensureBrowserSessionWeb(request);
  const headers = { "Content-Type": "application/json" };
  if (setCookie) headers["Set-Cookie"] = setCookie;

  try {
    const body = await request.json().catch(() => ({}));
    const session = await createCheckoutSession({
      browserId,
      clientIp: clientKeyFromRequest(request),
      kind: body.kind,
      productId: body.productId || body.id,
      guests: body.guests,
      nights: body.nights,
      bookingId: body.bookingId,
      memo: body.memo,
    });
    return new Response(JSON.stringify({ ok: true, ...session }), {
      status: 200,
      headers,
    });
  } catch (err) {
    const status = err?.status || 500;
    const safe =
      status === 401 || status === 400 || status === 403 || status === 404 || status === 503
        ? err.message
        : "Could not start checkout.";
    return new Response(JSON.stringify({ ok: false, error: safe }), { status, headers });
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
  const setCookie = response.headers.get("Set-Cookie");
  if (setCookie) res.setHeader("Set-Cookie", setCookie);
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
