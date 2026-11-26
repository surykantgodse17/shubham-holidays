import { searchFlights, normalizeAirport } from "../server/travel.js";
import { rateLimitWeb, sameAppOriginWeb, safeApiError } from "../server/security.js";

async function handleSearch(request) {
  const limited = await rateLimitWeb(request);
  if (limited) return limited;
  const forbidden = sameAppOriginWeb(request);
  if (forbidden) return forbidden;

  try {
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
    const from = normalizeAirport(body.from ?? url.searchParams.get("from"), "DEL");
    const to = normalizeAirport(body.to ?? url.searchParams.get("to"), "GOI");
    const date = String(body.date ?? url.searchParams.get("date") ?? "").slice(0, 10);
    const adults = Math.min(
      6,
      Math.max(1, Number(body.adults ?? url.searchParams.get("adults")) || 1),
    );
    const result = await searchFlights({ from, to, date, adults });
    return Response.json(result);
  } catch (err) {
    return Response.json({ ...safeApiError(err), flights: [] }, { status: 500 });
  }
}

/** Prefer POST so browsers always send Origin (required by sameAppOriginWeb). */
export async function POST(request) {
  return handleSearch(request);
}

export async function GET(request) {
  return handleSearch(request);
}

export default async function handler(req, res) {
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const chunks = [];
  if (req.method === "POST") {
    for await (const chunk of req) chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const request = new Request(url, {
    method: req.method || "GET",
    headers: req.headers,
    body: req.method === "POST" ? raw || "{}" : undefined,
  });
  const response = await handleSearch(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
