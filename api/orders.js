import { requirePiCaller } from "../server/payments.js";
import { createOrderTicket } from "../server/orders.js";
import { consumeCheckoutSession } from "../server/checkout.js";
import { BODY_MAX_DEFAULT, readNodeBodyLimited, readWebBodyLimited } from "../server/httpBody.js";
import {
  paymentRateLimitWeb,
  requireAppOriginWeb,
  requireBrowserSessionWeb,
  requireCsrfWeb,
} from "../server/security.js";

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
    const caller = await requirePiCaller(
      request.headers.get("authorization"),
      request.headers.get("host") || "",
    );
    const bodyRead = await readWebBodyLimited(request, BODY_MAX_DEFAULT);
    if (!bodyRead.ok) return bodyRead.response;
    const body = bodyRead.text ? JSON.parse(bodyRead.text) : {};
    const checkoutId = String(body.checkoutId || body.checkoutSessionId || "").trim();
    if (!checkoutId) {
      return Response.json(
        { ok: false, error: "Missing checkout session. Start checkout again." },
        { status: 400 },
      );
    }

    // Price only from server-stored session — ignore client kind/productId/guests/nights.
    const locked = await consumeCheckoutSession({
      checkoutId,
      browserId: browser.browserId,
      bookingId: body.bookingId,
      memo: body.memo,
    });

    const order = createOrderTicket({
      uid: caller.uid,
      bookingId: locked.bookingId || body.bookingId,
      kind: locked.kind,
      productId: locked.productId,
      guests: locked.guests,
      nights: locked.nights,
      memo: locked.memo,
    });
    return Response.json({ ok: true, checkoutId, ...order });
  } catch (err) {
    const status = err?.status || 500;
    const safe =
      status === 401 || status === 400 || status === 403 || status === 404 || status === 409 || status === 503
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
