/** Abuse protection — shared SQL rate limits + origin + fetch-metadata checks. */

import crypto from "node:crypto";
import { sql } from "./db.js";
import {
  browserCookieName,
  browserSetCookieHeader,
  issueBrowserId,
  readBrowserIdFromCookieHeader,
} from "./checkout.js";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const PAY_MAX = 8;
const SESSION_MAX = 12;

function clientKey(req) {
  // Prefer Express req.ip when trust proxy is set (ignores spoofed multi-hop XFF alone).
  if (req.ip) return String(req.ip);
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function clientKeyFromRequest(request) {
  // Prefer platform-injected client IP headers over raw XFF chains.
  const realIp =
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("true-client-ip");
  if (realIp) return realIp.trim();
  const xf = request.headers.get("x-forwarded-for");
  if (xf && xf.length) return xf.split(",")[0].trim();
  return "unknown";
}

function authFingerprint(authorization) {
  const raw = String(authorization || "").trim();
  if (!raw) return "anon";
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

/**
 * Atomic sliding-window counter (single upsert + RETURNING).
 * Postgres/PGlite serialize the conflict update so concurrent hits cannot skip the cap.
 */
async function takeSharedToken(bucketKey, max) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  // Best-effort cleanup; not on the critical path for correctness.
  await sql(`delete from rate_limits where window_start < $1`, [windowStart.toISOString()]).catch(
    () => {},
  );

  const rows = await sql(
    `insert into rate_limits (bucket_key, window_start, hit_count)
     values ($1, $2, 1)
     on conflict (bucket_key) do update set
       hit_count = case
         when rate_limits.window_start < $3 then 1
         else rate_limits.hit_count + 1
       end,
       window_start = case
         when rate_limits.window_start < $3 then excluded.window_start
         else rate_limits.window_start
       end
     returning hit_count`,
    [bucketKey, now.toISOString(), windowStart.toISOString()],
  );
  const count = Number(rows[0]?.hit_count || 0);
  return count > 0 && count <= max;
}

export function rateLimit(req, res, next) {
  takeSharedToken(`search:${clientKey(req)}`, MAX_PER_WINDOW)
    .then((ok) => {
      if (!ok) {
        res.status(429).json({
          source: "error",
          message: "Too many requests. Please try again shortly.",
          flights: [],
          hotels: [],
        });
        return;
      }
      next();
    })
    .catch(() => {
      res.status(503).json({
        source: "error",
        message: "Search unavailable. Please try again.",
        flights: [],
        hotels: [],
      });
    });
}

export async function rateLimitWeb(request) {
  try {
    const ok = await takeSharedToken(`search:${clientKeyFromRequest(request)}`, MAX_PER_WINDOW);
    if (ok) return null;
    return Response.json(
      {
        source: "error",
        message: "Too many requests. Please try again shortly.",
        flights: [],
        hotels: [],
      },
      { status: 429 },
    );
  } catch {
    return Response.json(
      {
        source: "error",
        message: "Search unavailable. Please try again.",
        flights: [],
        hotels: [],
      },
      { status: 503 },
    );
  }
}

function hostMatches(urlString, host) {
  try {
    return Boolean(host && new URL(urlString).host === host);
  } catch {
    return false;
  }
}

/**
 * Browser Fetch Metadata — forgeable by non-browser HTTP clients.
 * Defense-in-depth only (browser-shaped filter), never primary CSRF or auth.
 * Primary CSRF for cookie-bound POSTs: HMAC X-CSRF-Token (see requireCsrf).
 * Auth: HttpOnly sh_browser + (payments) Pi Bearer + signed order tickets.
 */

/** Per-process random key when no env secret exists (local only — never a fixed string). */
let ephemeralCsrfKey = null;

function csrfSigningKey() {
  const material = String(
    process.env.CSRF_SECRET ||
      process.env.PI_NETWORK_API_KEY ||
      process.env.PI_API_KEY ||
      process.env.DATABASE_URL ||
      "",
  ).trim();
  if (material) {
    return crypto.createHash("sha256").update(`shubham-csrf-v1:${material}`).digest();
  }
  // Published apps always have DATABASE_URL; local/dev gets an unpredictable ephemeral key.
  ephemeralCsrfKey ??= crypto.randomBytes(32);
  return ephemeralCsrfKey;
}

/** HMAC CSRF bound to the HttpOnly browser cookie id (not forgeable via Origin alone). */
export function issueCsrfToken(browserId) {
  const id = String(browserId || "").trim();
  if (!id) return "";
  return crypto.createHmac("sha256", csrfSigningKey()).update(`csrf:${id}`).digest("hex");
}

function timingSafeEqualHex(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right || left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
  } catch {
    return false;
  }
}

/** Primary CSRF for checkout / orders / payments (paired with requireBrowserSession). */
export function requireCsrf(req, res, next) {
  const browserId = readBrowserIdFromCookieHeader(req.headers.cookie) || req.shBrowserId;
  const presented = String(req.headers["x-csrf-token"] || "").trim();
  const expected = issueCsrfToken(browserId);
  if (!browserId || !timingSafeEqualHex(presented, expected)) {
    res.status(403).json({ ok: false, error: "Forbidden." });
    return;
  }
  next();
}

export function requireCsrfWeb(request, browserId) {
  const id = browserId || readBrowserIdFromCookieHeader(request.headers.get("cookie"));
  const presented = String(request.headers.get("x-csrf-token") || "").trim();
  const expected = issueCsrfToken(id);
  if (!id || !timingSafeEqualHex(presented, expected)) {
    return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  return null;
}
function fetchSiteOk(secFetchSite) {
  if (!secFetchSite) return false;
  const site = String(secFetchSite).toLowerCase();
  return site === "same-origin" || site === "same-site";
}

function fetchModeDestOk(secFetchMode, secFetchDest) {
  const mode = String(secFetchMode || "").toLowerCase();
  const dest = String(secFetchDest || "").toLowerCase();
  // Real browser fetch/XHR to our JSON APIs.
  if (mode !== "cors" && mode !== "same-origin") return false;
  if (dest !== "empty") return false;
  return true;
}

function originAndFetchOk(origin, host, secFetchSite, secFetchMode, secFetchDest) {
  if (!origin || !hostMatches(origin, host)) return false;
  if (!fetchSiteOk(secFetchSite)) return false;
  if (!fetchModeDestOk(secFetchMode, secFetchDest)) return false;
  return true;
}

/**
 * Secondary browser-shaped filter only (headers are forgeable by non-browser clients).
 * Do not treat this as authorization.
 * Primary controls: rate limits; search also requires HttpOnly sh_browser;
 * checkout/pay require cookie + HMAC CSRF (+ Pi Bearer on pay).
 */
const APP_FETCH_HEADER = "shubhamholidays";

function appFetchHeaderOk(value) {
  return String(value || "").trim().toLowerCase() === APP_FETCH_HEADER;
}

export function sameAppOrigin(req, res, next) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const secFetchSite = req.headers["sec-fetch-site"];
  const secFetchMode = req.headers["sec-fetch-mode"];
  const secFetchDest = req.headers["sec-fetch-dest"];
  const requestedWith = req.headers["x-requested-with"];
  if (
    originAndFetchOk(origin, host, secFetchSite, secFetchMode, secFetchDest) &&
    appFetchHeaderOk(requestedWith)
  ) {
    next();
    return;
  }
  res.status(403).json({
    source: "error",
    message: "Forbidden.",
    flights: [],
    hotels: [],
  });
}

export function sameAppOriginWeb(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const secFetchSite = request.headers.get("sec-fetch-site");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const requestedWith = request.headers.get("x-requested-with");
  if (
    originAndFetchOk(origin, host, secFetchSite, secFetchMode, secFetchDest) &&
    appFetchHeaderOk(requestedWith)
  ) {
    return null;
  }
  return Response.json(
    { source: "error", message: "Forbidden.", flights: [], hotels: [] },
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
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https: data: blob:",
  "connect-src 'self' https://sdk.minepi.com https://api.minepi.com https://sandbox-api.minepi.com https://socialchain.app https://*.minepi.com",
  "frame-src https://sdk.minepi.com https://app-cdn.minepi.com https://*.minepi.com",
  "frame-ancestors 'self' https://*.pinet.com https://*.minepi.com",
  "worker-src 'self' blob:",
].join("; ");

export const PI_DEV_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.minepi.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' https: data: blob:",
  "connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https://sdk.minepi.com https://api.minepi.com https://sandbox-api.minepi.com https://socialchain.app https://*.minepi.com",
  "frame-src https://sdk.minepi.com https://app-cdn.minepi.com https://*.minepi.com",
  "frame-ancestors 'self' https://*.pinet.com https://*.minepi.com",
  "worker-src 'self' blob:",
].join("; ");

/** Payment/checkout routes: secondary browser-shaped filter (CSRF is requireCsrf). */
export function requireAppOrigin(req, res, next) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const secFetchSite = req.headers["sec-fetch-site"];
  const secFetchMode = req.headers["sec-fetch-mode"];
  const secFetchDest = req.headers["sec-fetch-dest"];
  const requestedWith = req.headers["x-requested-with"];
  if (
    !originAndFetchOk(origin, host, secFetchSite, secFetchMode, secFetchDest) ||
    !appFetchHeaderOk(requestedWith)
  ) {
    res.status(403).json({ ok: false, error: "Forbidden." });
    return;
  }
  next();
}

export function requireAppOriginWeb(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const secFetchSite = request.headers.get("sec-fetch-site");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const requestedWith = request.headers.get("x-requested-with");
  if (
    !originAndFetchOk(origin, host, secFetchSite, secFetchMode, secFetchDest) ||
    !appFetchHeaderOk(requestedWith)
  ) {
    return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  return null;
}

/** Export for checkout session IP capping. */
export { clientKey, clientKeyFromRequest };

/**
 * Ensure HttpOnly browser session cookie (binds checkout sessions to this browser).
 * Express middleware — mutates req.shBrowserId.
 */
export function ensureBrowserSession(req, res, next) {
  let id = readBrowserIdFromCookieHeader(req.headers.cookie);
  if (!id) {
    id = issueBrowserId();
    const secure = req.secure || String(req.headers["x-forwarded-proto"] || "").includes("https");
    res.append("Set-Cookie", browserSetCookieHeader(id, { secure }));
  }
  req.shBrowserId = id;
  next();
}

/** For Fetch API handlers: return { browserId, setCookie? }. */
export function ensureBrowserSessionWeb(request) {
  let id = readBrowserIdFromCookieHeader(request.headers.get("cookie"));
  let setCookie = null;
  if (!id) {
    id = issueBrowserId();
    const url = new URL(request.url);
    const secure = url.protocol === "https:";
    setCookie = browserSetCookieHeader(id, { secure });
  }
  return { browserId: id, setCookie };
}

export function requireBrowserSession(req, res, next) {
  const id = readBrowserIdFromCookieHeader(req.headers.cookie) || req.shBrowserId;
  if (!id) {
    res.status(403).json({ ok: false, error: "Missing browser session. Refresh and try again." });
    return;
  }
  req.shBrowserId = id;
  next();
}

export function requireBrowserSessionWeb(request) {
  const id = readBrowserIdFromCookieHeader(request.headers.get("cookie"));
  if (!id) {
    return {
      error: Response.json(
        { ok: false, error: "Missing browser session. Refresh and try again." },
        { status: 403 },
      ),
    };
  }
  return { browserId: id };
}

/** Cap anonymous /api/session cookie minting (not an auth grant). */
export function sessionRateLimit(req, res, next) {
  takeSharedToken(`session:${clientKey(req)}`, SESSION_MAX)
    .then((ok) => {
      if (!ok) {
        res.status(429).json({ ok: false, error: "Too many requests. Please try again shortly." });
        return;
      }
      next();
    })
    .catch(() => {
      res.status(503).json({ ok: false, error: "Session unavailable. Please try again." });
    });
}

export async function sessionRateLimitWeb(request) {
  try {
    const ok = await takeSharedToken(`session:${clientKeyFromRequest(request)}`, SESSION_MAX);
    if (ok) return null;
    return Response.json(
      { ok: false, error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  } catch {
    return Response.json({ ok: false, error: "Session unavailable. Please try again." }, { status: 503 });
  }
}

export function paymentRateLimit(req, res, next) {
  const key = `pay:${clientKey(req)}:${authFingerprint(req.headers.authorization)}`;
  takeSharedToken(key, PAY_MAX)
    .then((ok) => {
      if (!ok) {
        res.status(429).json({ ok: false, error: "Too many payment requests. Try again shortly." });
        return;
      }
      next();
    })
    .catch(() => {
      res.status(503).json({ ok: false, error: "Payments temporarily unavailable." });
    });
}

export async function paymentRateLimitWeb(request) {
  const key = `pay:${clientKeyFromRequest(request)}:${authFingerprint(request.headers.get("authorization"))}`;
  try {
    const ok = await takeSharedToken(key, PAY_MAX);
    if (ok) return null;
    return Response.json(
      { ok: false, error: "Too many payment requests. Try again shortly." },
      { status: 429 },
    );
  } catch {
    return Response.json({ ok: false, error: "Payments temporarily unavailable." }, { status: 503 });
  }
}

export { browserCookieName };
