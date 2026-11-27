import { searchFlights, normalizeAirport } from "../server/travel.js";
import { BODY_MAX_SEARCH, readNodeBodyLimited, readWebBodyLimited } from "../server/httpBody.js";
import {
  rateLimitWeb,
  requireBrowserSessionWeb,
  sameAppOriginWeb,
  safeApiError,
} from "../server/security.js";

async function handleSearch(request) {
  // Primary: shared rate limit + HttpOnly browser cookie. Origin/Sec-Fetch/X-Requested-With are secondary only.
  const limited = await rateLimitWeb(request);
  if (limited) return limited;
  const forbidden = sameAppOriginWeb(request);
  if (forbidden) return forbidden;
  const browser = requireBrowserSessionWeb(request);
  if (browser.error) return browser.error;

  try {
    const url = new URL(request.url);
    let body = {};
    if (request.method === "POST") {
      const bodyRead = await readWebBodyLimited(request, BODY_MAX_SEARCH);
      if (!bodyRead.ok) return bodyRead.response;
      body = bodyRead.text ? JSON.parse(bodyRead.text) : {};
    }
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
    if (err instanceof SyntaxError) {
      return Response.json({ ...safeApiError(err), flights: [], message: "Invalid JSON body." }, { status: 400 });
    }
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
  let raw = "{}";
  if (req.method === "POST") {
    const bodyRead = await readNodeBodyLimited(req, BODY_MAX_SEARCH);
    if (!bodyRead.ok) {
      res.status(bodyRead.status).json({
        source: "error",
        message: bodyRead.error,
        flights: [],
        hotels: [],
      });
      return;
    }
    raw = bodyRead.raw.toString("utf8") || "{}";
  }
  const request = new Request(url, {
    method: req.method || "GET",
    headers: req.headers,
    body: req.method === "POST" ? raw : undefined,
  });
  const response = await handleSearch(request);
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
