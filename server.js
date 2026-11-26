import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchFlights, searchHotels } from "./server/travel.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const isProd = process.env.NODE_ENV === "production";

async function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      amadeusConfigured: Boolean(
        process.env.AMADEUS_CLIENT_ID?.trim() && process.env.AMADEUS_CLIENT_SECRET?.trim(),
      ),
      piRate: "1 Pi = $314159",
    });
  });

  app.get("/api/flights", async (req, res) => {
    try {
      const from = String(req.query.from || "DEL").toUpperCase();
      const to = String(req.query.to || "GOI").toUpperCase();
      const date = String(req.query.date || "");
      const adults = Math.min(6, Math.max(1, Number(req.query.adults || 1)));
      const result = await searchFlights({ from, to, date, adults });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        source: "error",
        message: err instanceof Error ? err.message : "Flight search failed",
        flights: [],
      });
    }
  });

  app.get("/api/hotels", async (req, res) => {
    try {
      const city = String(req.query.city || "GOI").toUpperCase();
      const checkin = String(req.query.checkin || "");
      const nights = Math.min(14, Math.max(1, Number(req.query.nights || 3)));
      const adults = Math.min(6, Math.max(1, Number(req.query.adults || 2)));
      const result = await searchHotels({ city, checkin, nights, adults });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        source: "error",
        message: err instanceof Error ? err.message : "Hotel search failed",
        hotels: [],
      });
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
