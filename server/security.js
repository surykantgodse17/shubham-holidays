/** Lightweight abuse protection for public /api routes (no paid upstream). */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const buckets = new Map();

function clientKey(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function rateLimit(req, res, next) {
  const key = clientKey(req);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > MAX_PER_WINDOW) {
    res.status(429).json({
      source: "error",
      message: "Too many requests. Please try again shortly.",
      flights: [],
      hotels: [],
    });
    return;
  }
  next();
}

/** Prefer same-origin browser calls; allow missing Origin on same-host navigations. */
export function sameAppOrigin(req, res, next) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin) {
    next();
    return;
  }
  try {
    const o = new URL(origin);
    if (host && o.host === host) {
      next();
      return;
    }
  } catch {
    /* fall through */
  }
  res.status(403).json({
    source: "error",
    message: "Forbidden.",
    flights: [],
    hotels: [],
  });
}

export function safeApiError(_err) {
  return {
    source: "error",
    message: "Search unavailable. Please try again.",
  };
}
