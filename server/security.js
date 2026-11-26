/** Lightweight abuse protection for public /api routes (no paid upstream). */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const MAX_KEYS = 5_000;
const buckets = new Map();

function clientKey(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function clientKeyFromRequest(request) {
  const xf = request.headers.get("x-forwarded-for");
  if (xf && xf.length) return xf.split(",")[0].trim();
  return "unknown";
}

function pruneBuckets(now) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.start >= WINDOW_MS * 2) buckets.delete(key);
  }
  if (buckets.size <= MAX_KEYS) return;
  const overflow = buckets.size - MAX_KEYS;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

function takeToken(key) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS / 2) pruneBuckets(now);
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start >= WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= MAX_PER_WINDOW;
}

export function rateLimit(req, res, next) {
  if (!takeToken(clientKey(req))) {
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

/** Web-handler rate limit. Returns a Response when limited, otherwise null. */
export function rateLimitWeb(request) {
  if (takeToken(clientKeyFromRequest(request))) return null;
  return Response.json(
    {
      source: "error",
      message: "Too many requests. Please try again shortly.",
      flights: [],
      hotels: [],
    },
    { status: 429 },
  );
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

/** Web-handler origin check. Returns a Response when forbidden, otherwise null. */
export function sameAppOriginWeb(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const host = request.headers.get("host");
    const o = new URL(origin);
    if (host && o.host === host) return null;
  } catch {
    /* fall through */
  }
  return Response.json(
    {
      source: "error",
      message: "Forbidden.",
      flights: [],
      hotels: [],
    },
    { status: 403 },
  );
}

export function safeApiError(_err) {
  return {
    source: "error",
    message: "Search unavailable. Please try again.",
  };
}

export const PI_SANDBOX_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' https://sdk.minepi.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https: data: blob:",
  "connect-src 'self' https://sdk.minepi.com https://api.minepi.com https://sandbox-api.minepi.com https://socialchain.app https://*.minepi.com",
  "frame-src https://sdk.minepi.com https://app-cdn.minepi.com https://*.minepi.com",
  "frame-ancestors 'self' https://*.pinet.com https://*.minepi.com",
  "worker-src 'self' blob:",
].join("; ");
