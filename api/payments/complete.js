import { completePayment } from "../../server/payments.js";
import { rateLimitWeb, sameAppOriginWeb } from "../../server/security.js";

export async function POST(request) {
  const limited = rateLimitWeb(request);
  if (limited) return limited;
  const forbidden = sameAppOriginWeb(request);
  if (forbidden) return forbidden;

  try {
    const body = await request.json().catch(() => ({}));
    const data = await completePayment(body.paymentId, body.txid);
    return Response.json({ ok: true, data });
  } catch (err) {
    const status = err?.status || 500;
    return Response.json(
      {
        ok: false,
        error: status >= 500 && status !== 503 ? "Payment completion failed." : err.message,
      },
      { status },
    );
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
