import { resolveIncompleteA2u } from "../../server/a2u.js";
import { BODY_MAX_DEFAULT, readNodeBodyLimited, readWebBodyLimited } from "../../server/httpBody.js";
import {
  paymentRateLimitWeb,
  requireAppOriginWeb,
  requireBrowserSessionWeb,
  requireCsrfWeb,
} from "../../server/security.js";

export async function POST(request) {
  const limited = await paymentRateLimitWeb(request);
  if (limited) return limited;
  const forbidden = requireAppOriginWeb(request);
  if (forbidden) return forbidden;
  const browser = requireBrowserSessionWeb(request);
  if (browser.error) return browser.error;
  const csrfBlocked = requireCsrfWeb(request, browser.browserId);
  if (csrfBlocked) return csrfBlocked;

  try {
    const bodyRead = await readWebBodyLimited(request, BODY_MAX_DEFAULT);
    if (!bodyRead.ok) return bodyRead.response;
    const data = await resolveIncompleteA2u();
    return Response.json(data);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    const status = err?.status || 500;
    const safe =
      status === 401 || status === 400 || status === 403 || status === 503
        ? err.message
        : "Could not resolve incomplete A2U payments.";
    return Response.json({ ok: false, error: safe }, { status });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }
  const bodyRead = await readNodeBodyLimited(req, BODY_MAX_DEFAULT);
  if (!bodyRead.ok) {
    res.status(bodyRead.status).json({ ok: false, error: bodyRead.error });
    return;
  }
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const request = new Request(url, {
    method: "POST",
    headers: req.headers,
    body: bodyRead.raw.toString("utf8") || "{}",
  });
  const response = await POST(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
