import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchFlights, searchHotels, normalizeAirport } from "./server/travel.js";
import { rateLimit, sameAppOrigin, safeApiError } from "./server/security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const isProd = process.env.NODE_ENV === "production";

async function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      searchMode: "sample",
      piRate: "1 Pi = $314159",
    });
  });

  const protect = [rateLimit, sameAppOrigin];

  app.get("/api/flights", ...protect, async (req, res) => {
    try {
      const from = normalizeAirport(req.query.from, "DEL");
      const to = normalizeAirport(req.query.to, "GOI");
      const date = String(req.query.date || "").slice(0, 10);
      const adults = Math.min(6, Math.max(1, Number(req.query.adults) || 1));
      const result = await searchFlights({ from, to, date, adults });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ...safeApiError(err), flights: [] });
    }
  });

  app.get("/api/hotels", ...protect, async (req, res) => {
    try {
      const city = normalizeAirport(req.query.city, "GOI");
      const checkin = String(req.query.checkin || "").slice(0, 10);
      const nights = Math.min(14, Math.max(1, Number(req.query.nights) || 3));
      const adults = Math.min(6, Math.max(1, Number(req.query.adults) || 2));
      const result = await searchHotels({ city, checkin, nights, adults });
      res.json(result);
    } catch (err) {
      res.status(500).json({ ...safeApiError(err), hotels: [] });
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Shubham Holidays listening on http://127.0.0.1:${PORT}`);
});
