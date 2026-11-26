import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchFlights, searchHotels, normalizeAirport } from "./server/travel.js";
import { approvePayment, completePayment, requirePiCaller } from "./server/payments.js";
import { createOrderTicket } from "./server/orders.js";
import { createCheckoutSession, consumeCheckoutSession } from "./server/checkout.js";
import {
  rateLimit,
  sameAppOrigin,
  requireAppOrigin,
  paymentRateLimit,
  ensureBrowserSession,
  requireBrowserSession,
  safeApiError,
  PI_SANDBOX_CSP,
  PI_DEV_CSP,
} from "./server/security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const isProd = process.env.NODE_ENV === "production";

/** Exact Pi domain ownership key — served as raw bytes, no SPA/CSP wrapping. */
function readValidationKey() {
  const candidates = [
    path.join(__dirname, "public", "validation-key.txt"),
    path.join(__dirname, "dist", "validation-key.txt"),
  ];
  for (const file of candidates) {
    try {
      return fs.readFileSync(file);
    } catch {
      /* try next */
    }
  }
  return null;
}

function sendValidationKey(_req, res) {
  const body = readValidationKey();
  if (!body) {
    res.status(404).type("text/plain").send("missing");
    return;
  }
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Length", String(body.length));
  res.status(200).end(body);
}

async function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Pi ownership verify — register before JSON/CSP middleware.
  app.get("/validation-key.txt", sendValidationKey);

  app.use(express.json({ limit: "64kb" }));

  app.use((req, res, next) => {
    if (req.path === "/validation-key.txt") return next();
    res.removeHeader("X-Frame-Options");
    res.setHeader("Content-Security-Policy", isProd ? PI_SANDBOX_CSP : PI_DEV_CSP);
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      searchMode: "sample",
      piRate: "1 Pi = $314159",
    });
  });

  const protect = [rateLimit, sameAppOrigin];
  const protectPay = [paymentRateLimit, requireAppOrigin, ensureBrowserSession];
  const protectCheckout = [paymentRateLimit, requireAppOrigin, ensureBrowserSession];

  async function flightsHandler(req, res) {
    try {
      const src = req.method === "POST" ? req.body || {} : req.query;
      const from = normalizeAirport(src.from, "DEL");
      const to = normalizeAirport(src.to, "GOI");
      const date = String(src.date || "").slice(0, 10);
      const adults = Math.min(6, Math.max(1, Number(src.adults) || 1));
      const result = await searchFlights({ from, to, date, adults });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ...safeApiError(err), flights: [] });
    }
  }

  async function hotelsHandler(req, res) {
    try {
      const src = req.method === "POST" ? req.body || {} : req.query;
      const city = normalizeAirport(src.city, "GOI");
      const checkin = String(src.checkin || "").slice(0, 10);
      const nights = Math.min(14, Math.max(1, Number(src.nights) || 3));
      const adults = Math.min(6, Math.max(1, Number(src.adults) || 2));
      const result = await searchHotels({ city, checkin, nights, adults });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ...safeApiError(err), hotels: [] });
    }
  }

  app.post("/api/flights", ...protect, flightsHandler);
  app.get("/api/flights", ...protect, flightsHandler);
  app.post("/api/hotels", ...protect, hotelsHandler);
  app.get("/api/hotels", ...protect, hotelsHandler);

  app.post("/api/checkout/sessions", ...protectCheckout, async (req, res) => {
    try {
      const session = await createCheckoutSession({
        browserId: req.shBrowserId,
        kind: req.body?.kind,
        productId: req.body?.productId || req.body?.id,
        guests: req.body?.guests,
        nights: req.body?.nights,
        bookingId: req.body?.bookingId,
        memo: req.body?.memo,
      });
      res.json({ ok: true, ...session });
    } catch (err) {
      const status = err?.status || 500;
      const safe =
        status === 401 || status === 400 || status === 403 || status === 404 || status === 503
          ? err.message
          : "Could not start checkout.";
      res.status(status).json({ ok: false, error: safe });
    }
  });

  app.post("/api/orders", ...protectPay, requireBrowserSession, async (req, res) => {
    try {
      const caller = await requirePiCaller(req.headers.authorization);
      const checkoutId = String(req.body?.checkoutId || req.body?.checkoutSessionId || "").trim();
      if (!checkoutId) {
        res.status(400).json({ ok: false, error: "Missing checkout session. Start checkout again." });
        return;
      }
      // Price only from server-stored session — ignore client kind/productId/qty.
      const locked = await consumeCheckoutSession({
        checkoutId,
        browserId: req.shBrowserId,
        bookingId: req.body?.bookingId,
        memo: req.body?.memo,
      });
      const order = createOrderTicket({
        uid: caller.uid,
        bookingId: locked.bookingId || req.body?.bookingId,
        kind: locked.kind,
        productId: locked.productId,
        guests: locked.guests,
        nights: locked.nights,
        memo: locked.memo,
      });
      res.json({ ok: true, checkoutId, ...order });
    } catch (err) {
      const status = err?.status || 500;
      const safe =
        status === 401 || status === 400 || status === 403 || status === 404 || status === 409 || status === 503
          ? err.message
          : "Could not create order.";
      res.status(status).json({ ok: false, error: safe });
    }
  });

  app.post("/api/payments/approve", ...protectPay, async (req, res) => {
    try {
      const data = await approvePayment(
        req.body?.paymentId,
        req.headers.authorization,
        req.body?.orderToken,
      );
      res.json({ ok: true, data });
    } catch (err) {
      const status = err?.status || 500;
      const safe =
        status === 401 || status === 400 || status === 403 || status === 503
          ? err.message
          : "Payment approval failed.";
      res.status(status).json({ ok: false, error: safe });
    }
  });

  app.post("/api/payments/complete", ...protectPay, async (req, res) => {
    try {
      const data = await completePayment(
        req.body?.paymentId,
        req.body?.txid,
        req.headers.authorization,
        req.body?.orderToken,
      );
      res.json({ ok: true, data });
    } catch (err) {
      const status = err?.status || 500;
      const safe =
        status === 401 || status === 400 || status === 403 || status === 503
          ? err.message
          : "Payment completion failed.";
      res.status(status).json({ ok: false, error: safe });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: __dirname,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, "dist");
    app.use(express.static(dist, { index: false }));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  return app;
}

const app = await createApp();

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shubham Holidays listening on http://127.0.0.1:${PORT}`);
  });
}

export default app;
