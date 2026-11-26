import { searchHotels, normalizeAirport } from "../server/travel.js";
import { rateLimitWeb, sameAppOriginWeb, safeApiError } from "../server/security.js";

export async function GET(request) {
  const limited = rateLimitWeb(request);
  if (limited) return limited;
  const forbidden = sameAppOriginWeb(request);
  if (forbidden) return forbidden;

  try {
    const url = new URL(request.url);
    const city = normalizeAirport(url.searchParams.get("city"), "GOI");
    const checkin = String(url.searchParams.get("checkin") || "").slice(0, 10);
    const nights = Math.min(14, Math.max(1, Number(url.searchParams.get("nights")) || 3));
    const adults = Math.min(6, Math.max(1, Number(url.searchParams.get("adults")) || 2));
    const result = await searchHotels({ city, checkin, nights, adults });
    return Response.json(result);
  } catch (err) {
    return Response.json({ ...safeApiError(err), hotels: [] }, { status: 500 });
  }
}

export default async function handler(req, res) {
  const url = `http://${req.headers.host || "localhost"}${req.url}`;
  const request = new Request(url, { headers: req.headers });
  const response = await GET(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
