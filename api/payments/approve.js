import { approvePayment } from "../../server/payments.js";
import {
  paymentRateLimitWeb,
  requireAppOriginWeb,
  requireBrowserSessionWeb,
} from "../../server/security.js";

export async function POST(request) {
  const limited = await paymentRateLimitWeb(request);
  if (limited) return limited;
  const forbidden = requireAppOriginWeb(request);
  if (forbidden) return forbidden;
  const browser = requireBrowserSessionWeb(request);
  if (browser.error) return browser.error;

  try {
    const body = await request.json().catch(() => ({}));
    const data = await approvePayment(
      body.paymentId,
      request.headers.get("authorization"),
      body.orderToken,
      request.headers.get("host") || "",
    );
    return Response.json({ ok: true, data });
  } catch (err) {
    const status = err?.status || 500;
    const safe =
      status === 401 || status === 400 || status === 403 || status === 503
        ? err.message
        : "Payment approval failed.";
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
