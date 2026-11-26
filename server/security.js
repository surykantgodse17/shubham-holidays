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
 * Atomic-ish sliding window counter in shared SQL (Postgres on publish, PGlite locally).
 */
async function takeSharedToken(bucketKey, max) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  await sql(`delete from rate_limits where window_start < $1`, [windowStart.toISOString()]);

  const rows = await sql(`select hit_count, window_start from rate_limits where bucket_key = $1`, [
    bucketKey,
  ]);
  const row = rows[0];
  if (!row || new Date(row.window_start).getTime() < windowStart.getTime()) {
    await sql(
      `insert into rate_limits (bucket_key, window_start, hit_count) values ($1, $2, 1)
       on conflict (bucket_key) do update set window_start = excluded.window_start, hit_count = 1`,
      [bucketKey, now.toISOString()],
    );
    return true;
  }
  const next = Number(row.hit_count) + 1;
  await sql(`update rate_limits set hit_count = $2 where bucket_key = $1`, [bucketKey, next]);
  return next <= max;
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
 * Fetch Metadata required — Origin alone is forgeable by non-browser clients.
 * Browsers always send Sec-Fetch-Site on fetch/XHR; require same-origin/same-site/none.
 */
function fetchSiteOk(secFetchSite) {
  if (!secFetchSite) return false;
  const site = String(secFetchSite).toLowerCase();
  return site === "same-origin" || site === "same-site" || site === "none";
}

function originAndFetchOk(origin, host, secFetchSite) {
  if (!origin || !hostMatches(origin, host)) return false;
  if (!fetchSiteOk(secFetchSite)) return false;
  return true;
}

/**
 * Search/API browser guard: matching Origin + required same-site Sec-Fetch-Site.
 */
export function sameAppOrigin(req, res, next) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const secFetchSite = req.headers["sec-fetch-site"];
  if (originAndFetchOk(origin, host, secFetchSite)) {
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
  if (originAndFetchOk(origin, host, secFetchSite)) return null;
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

/** Payment/checkout routes: Origin match + required same-site Sec-Fetch-Site. */
export function requireAppOrigin(req, res, next) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const secFetchSite = req.headers["sec-fetch-site"];
  if (!originAndFetchOk(origin, host, secFetchSite)) {
    res.status(403).json({ ok: false, error: "Forbidden." });
    return;
  }
  next();
}

export function requireAppOriginWeb(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (!originAndFetchOk(origin, host, secFetchSite)) {
    return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  return null;
}

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
