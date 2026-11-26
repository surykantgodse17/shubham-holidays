/** Lightweight abuse protection for public /api routes (no paid upstream). */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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

/** Production / Sandbox-embed CSP (no Vite inline preamble). */
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

/**
 * Dev-only CSP: Vite React refresh needs inline/eval scripts and ws:// HMR.
 * Still allows Pi Sandbox iframe ancestors for local embed testing.
 */
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

/** Payment routes: Origin must be present and match this host (no anonymous curl). */
export function requireAppOrigin(req, res, next) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) {
    res.status(403).json({ ok: false, error: "Forbidden." });
    return;
  }
  try {
    if (new URL(origin).host === host) {
      next();
      return;
    }
  } catch {
    /* fall through */
  }
  res.status(403).json({ ok: false, error: "Forbidden." });
}

export function requireAppOriginWeb(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* fall through */
  }
  return Response.json({ ok: false, error: "Forbidden." }, { status: 403 });
}

/**
 * Payment rate limit: IP + Authorization fingerprint, persisted under /tmp so
 * instances on one machine share counters. Order/amount auth is the primary control.
 */
const PAY_WINDOW_MS = 60_000;
const PAY_MAX = 8;
const PAY_STORE = path.join(os.tmpdir(), "shubham-holidays-pay-rate.json");

function authFingerprint(authorization) {
  const raw = String(authorization || "").trim();
  if (!raw) return "anon";
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

function readPayStore() {
  try {
    const raw = fs.readFileSync(PAY_STORE, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writePayStore(data) {
  try {
    fs.writeFileSync(PAY_STORE, JSON.stringify(data), "utf8");
  } catch {
    /* best-effort on read-only fs */
  }
}

function takePayToken(key) {
  const now = Date.now();
  const store = readPayStore();
  for (const k of Object.keys(store)) {
    if (now - Number(store[k]?.start || 0) >= PAY_WINDOW_MS * 2) delete store[k];
  }
  let bucket = store[key];
  if (!bucket || now - Number(bucket.start) >= PAY_WINDOW_MS) {
    bucket = { start: now, count: 0 };
  }
  bucket.count = Number(bucket.count || 0) + 1;
  store[key] = bucket;
  writePayStore(store);
  return bucket.count <= PAY_MAX;
}

function payLimitKey(ip, authorization) {
  return `${ip}|${authFingerprint(authorization)}`;
}

export function paymentRateLimit(req, res, next) {
  const key = payLimitKey(clientKey(req), req.headers.authorization);
  if (!takePayToken(key)) {
    res.status(429).json({ ok: false, error: "Too many payment requests. Try again shortly." });
    return;
  }
  next();
}

export function paymentRateLimitWeb(request) {
  const key = payLimitKey(
    clientKeyFromRequest(request),
    request.headers.get("authorization"),
  );
  if (takePayToken(key)) return null;
  return Response.json(
    { ok: false, error: "Too many payment requests. Try again shortly." },
    { status: 429 },
  );
}
