import { getA2uStatus } from "../../server/a2u.js";
import { rateLimitWeb, requireAppOriginWeb, requireBrowserSessionWeb } from "../../server/security.js";

export async function GET(request) {
  const limited = await rateLimitWeb(request);
  if (limited) return limited;
  const forbidden = requireAppOriginWeb(request);
  if (forbidden) return forbidden;
  const browser = requireBrowserSessionWeb(request);
  if (browser.error) return browser.error;

  try {
    const data = await getA2uStatus();
    return Response.json({ ok: true, ...data });
  } catch (err) {
    const status = err?.status || 500;
    return Response.json(
      { ok: false, error: status === 503 ? err.message : "Could not load A2U status." },
      { status },
    );
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const request = new Request(url, { method: "GET", headers: req.headers });
  const response = await GET(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
