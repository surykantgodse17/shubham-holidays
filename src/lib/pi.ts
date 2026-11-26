/** Canonical demo rate: 1 Pi = exactly 314159 USD */
export const PI_USD_VALUE = 314159;
/** Display string for the rate — always `$314159`, never locale-comma formatted */
export const PI_USD_RATE_LABEL = `$${PI_USD_VALUE}`;
/** Exact UI copy requested for checkout / rate display */
export const PI_USD_RATE_COPY = `1 Pi = ${PI_USD_RATE_LABEL}`;
/** Demo INR→USD conversion for displaying Pi amounts from INR catalog prices */
export const DEMO_INR_PER_USD = 83;

export const PI_SDK_URL = "https://sdk.minepi.com/pi-sdk.js";
/** sha384 of https://sdk.minepi.com/pi-sdk.js (fetched 2026-11-26; bump if Pi rotates the file) */
export const PI_SDK_SRI =
  "sha384-5RHyz+CU5PdxEjV3L+m1ZLXokX+DsqlX8LNHpX/WLfWcBkfRr0qyjPH5SiVquXQx";

export type PiPaymentResult = {
  mode: "pi" | "sandbox-demo";
  paymentId?: string;
  txid?: string;
  amountPi: number;
};

export type PiConnectionState =
  | { status: "idle" }
  | { status: "connecting"; detail: string }
  | { status: "ready"; inPiBrowser: true; sandbox: boolean; hasBridge: boolean }
  | { status: "sandbox-fallback"; reason: string; sandbox: boolean }
  | { status: "error"; message: string };

type PiPaymentDTO = {
  amount: number;
  memo: string;
  metadata: Record<string, string>;
};

type PiCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: unknown) => void;
};

type PiSDK = {
  init: (config: { version: string; sandbox?: boolean }) => void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<{ accessToken?: string; user?: { username?: string } }>;
  createPayment: (paymentData: PiPaymentDTO, callbacks: PiCallbacks) => void;
};

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

const PI_AUTH_SCOPES = ["username", "payments", "wallet_address"];
const LOAD_TIMEOUT_MS = 8_000;
const INIT_TIMEOUT_MS = 4_000;
const CONNECT_BUDGET_MS = 5_000;
const AUTH_TIMEOUT_MS = 45_000;
const PAY_TIMEOUT_MS = 120_000;

let scriptPromise: Promise<void> | null = null;
let initDone = false;
/** Latest Pi access token from authenticate — required by the payment bridge. */
let piAccessToken = "";

export function getPiAccessToken(): string {
  return piAccessToken;
}

function rememberPiAccessToken(token?: string) {
  const next = String(token || "").trim();
  if (next) piAccessToken = next;
}

export function inrToUsd(inr: number): number {
  return Math.round((Number(inr) / DEMO_INR_PER_USD) * 100) / 100;
}

export function usdToPi(usd: number): number {
  const cents = Math.round(Number(usd) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  const scaled = Math.round((cents * 1e7) / (PI_USD_VALUE * 100));
  return scaled / 1e7;
}

export function inrToPi(inr: number): number {
  return usdToPi(inrToUsd(inr));
}

export function formatPi(amount: number): string {
  return `${amount.toFixed(7)} π`;
}

/** UI copy: exactly `1 Pi = $314159` */
export function formatPiUsdRate(): string {
  return PI_USD_RATE_COPY;
}

/**
 * Strict Pi Browser detection — UA only.
 * Do not treat `window.piNetwork` / other hosts as Pi Browser; that false-positive
 * path called Pi.init() and left users stuck on “Connecting to Pi SDK”.
 */
export function inPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /PiBrowser/i.test(navigator.userAgent || "");
}

/** Sync initial checkout state so non–Pi Browser never paints “Connecting…”. */
export function initialPiConnectionState(): PiConnectionState {
  if (typeof window === "undefined") return { status: "idle" };
  if (!inPiBrowser()) {
    return {
      status: "sandbox-fallback",
      reason:
        "Not in Pi Browser. Pay with Pi needs Pi Browser; use the sandbox demo here, or open this app in Pi Browser.",
      sandbox: isPiSandbox(),
    };
  }
  return { status: "connecting", detail: "Loading Pi SDK…" };
}

export function isPiSdkAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.Pi?.createPayment && window.Pi?.init);
}

/**
 * Pi network mode for SDK init.
 * Production (Mainnet) is the registered network for this app.
 * Override with VITE_PI_SANDBOX=true only for local/dev experiments.
 * Localhost defaults to sandbox so local Express can still be embedded in Pi Sandbox for smoke tests;
 * the public host defaults to mainnet.
 */
export function isPiSandbox(): boolean {
  const raw = import.meta.env.VITE_PI_SANDBOX;
  if (raw !== undefined && raw !== "") {
    return String(raw).toLowerCase() !== "false";
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
  }
  return false;
}

/**
 * Optional absolute bridge URL for approve/complete (no secrets in the client).
 * Empty = same-origin `/api/payments/*` (local Express or published api handlers).
 */
export function piBridgeBase(): string {
  return String(import.meta.env.VITE_PI_BRIDGE_URL || "").replace(/\/$/, "");
}

/** True when payments can call a bridge (same-origin by default). */
export function hasPaymentBridge(): boolean {
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Load Pi SDK with SRI. Safe outside Pi Browser — does not call Pi.init. */
export function loadPiSdkScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pi SDK requires a browser."));
  }
  if (isPiSdkAvailable()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-pi-sdk="1"]`);
    if (existing) {
      if (isPiSdkAvailable()) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Pi SDK script failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = PI_SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.integrity = PI_SDK_SRI;
    script.dataset.piSdk = "1";

    const timer = window.setTimeout(() => {
      script.remove();
      scriptPromise = null;
      reject(new Error("Timed out loading Pi SDK. Check network or try again."));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timer);
      if (!isPiSdkAvailable()) {
        scriptPromise = null;
        reject(new Error("Pi SDK loaded but window.Pi is missing."));
        return;
      }
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      scriptPromise = null;
      reject(
        new Error(
          "Pi SDK failed to load (network or SRI mismatch). Refresh or use sandbox demo outside Pi Browser.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Initialize Pi SDK. Only call inside Pi Browser — outside, Pi.init often hangs on
 * “Connecting to Pi SDK”.
 */
export async function initPiSdkInBrowser(): Promise<void> {
  await loadPiSdkScript();
  if (!window.Pi) throw new Error("Pi SDK not available.");
  if (initDone) return;

  await withTimeout(
    new Promise<void>((resolve, reject) => {
      try {
        window.Pi!.init({ version: "2.0", sandbox: isPiSandbox() });
        initDone = true;
        // Give the SDK a tick to settle its bridge; do not wait forever.
        window.setTimeout(() => resolve(), 50);
      } catch (err) {
        // Already initialized is fine
        initDone = true;
        if (err instanceof Error && /already/i.test(err.message)) {
          resolve();
          return;
        }
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }),
    INIT_TIMEOUT_MS,
    "Timed out initializing Pi SDK. Close other Pi prompts and retry.",
  );
}

async function connectPiInBrowser(
  onProgress?: (state: PiConnectionState) => void,
): Promise<PiConnectionState> {
  const sandbox = isPiSandbox();
  const hasBridge = hasPaymentBridge();

  onProgress?.({ status: "connecting", detail: "Loading Pi SDK…" });
  try {
    await loadPiSdkScript();
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load Pi SDK.",
    };
  }

  onProgress?.({ status: "connecting", detail: "Initializing Pi SDK…" });
  try {
    await initPiSdkInBrowser();
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to initialize Pi SDK.",
    };
  }

  if (!isPiSdkAvailable()) {
    return {
      status: "error",
      message: "Pi SDK initialized but payment APIs are unavailable.",
    };
  }

  return {
    status: "ready",
    inPiBrowser: true,
    sandbox,
    hasBridge,
  };
}

/**
 * Resolve checkout connection state without hanging.
 * Outside Pi Browser we never load/init the SDK — sandbox-fallback immediately.
 * Inside Pi Browser, hard budget so “Connecting…” cannot stick forever.
 */
export async function connectPiForCheckout(
  onProgress?: (state: PiConnectionState) => void,
): Promise<PiConnectionState> {
  if (!inPiBrowser()) {
    const state = initialPiConnectionState();
    onProgress?.(state);
    return state;
  }

  try {
    const state = await withTimeout(
      connectPiInBrowser(onProgress),
      CONNECT_BUDGET_MS,
      "Timed out connecting to Pi SDK. Retry in Pi Browser, or use a normal browser for the sandbox demo.",
    );
    onProgress?.(state);
    return state;
  } catch (err) {
    const state: PiConnectionState = {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to connect to Pi SDK.",
    };
    onProgress?.(state);
    return state;
  }
}

async function postBridge(path: string, body: Record<string, string>) {
  const base = piBridgeBase();
  const token = getPiAccessToken();
  if (!token) {
    throw new Error("Pi sign-in required before payment. Use Sign in with Pi, then pay again.");
  }
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: { error?: string } = {};
  try {
    data = text ? (JSON.parse(text) as { error?: string }) : {};
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw new Error(data.error || text.slice(0, 240) || `Pi bridge error (${res.status})`);
  }
  return data;
}

function onIncompletePaymentFound(_payment: unknown) {
  // Left for the next authenticate / bridge cycle.
}

export type PiUserSession = {
  username?: string;
  accessToken?: string;
};

/** Pi Login (authenticate). Prefer Pi Browser (Production / Mainnet). */
export async function authenticatePi(
  scopes: string[] = ["username", "payments", "wallet_address"],
): Promise<PiUserSession> {
  await initPiSdkInBrowser();
  const Pi = window.Pi;
  if (!Pi?.authenticate) {
    throw new Error("Pi SDK authenticate is unavailable. Open this app in Pi Browser.");
  }
  const auth = await withTimeout(
    Pi.authenticate(scopes, onIncompletePaymentFound),
    AUTH_TIMEOUT_MS,
    "Timed out waiting for Pi authentication. Approve the prompt and retry.",
  );
  rememberPiAccessToken(auth?.accessToken);
  return {
    username: auth?.user?.username,
    accessToken: auth?.accessToken,
  };
}

/** Explicit sandbox demo — only for outside Pi Browser (or when user opts in). */
export async function payWithSandboxDemo(opts: {
  amountInr: number;
  bookingId: string;
}): Promise<PiPaymentResult> {
  const amountPi = inrToPi(opts.amountInr);
  if (amountPi <= 0) throw new Error("Invalid Pi amount.");
  await new Promise((r) => window.setTimeout(r, 700));
  return {
    mode: "sandbox-demo",
    amountPi,
    paymentId: `demo-${opts.bookingId}`,
  };
}

/** Real Pi Browser payment. Does not fall back to sandbox demo. */
export async function payWithPi(opts: {
  amountInr: number;
  memo: string;
  bookingId: string;
}): Promise<PiPaymentResult> {
  const amountPi = inrToPi(opts.amountInr);
  if (amountPi <= 0) throw new Error("Invalid Pi amount.");

  if (!inPiBrowser()) {
    throw new Error("Open this app in Pi Browser to pay with Pi.");
  }

  await initPiSdkInBrowser();
  const Pi = window.Pi;
  if (!Pi?.createPayment || !Pi.authenticate) {
    throw new Error("Pi SDK is not ready. Wait for Ready, then try again.");
  }

  const auth = await withTimeout(
    Pi.authenticate(PI_AUTH_SCOPES, onIncompletePaymentFound),
    AUTH_TIMEOUT_MS,
    "Timed out waiting for Pi authentication. Approve the prompt in Pi Browser and retry.",
  );
  rememberPiAccessToken(auth?.accessToken);
  if (!getPiAccessToken()) {
    throw new Error("Pi authenticate did not return an access token. Retry Sign in with Pi.");
  }

  return withTimeout(
    new Promise<PiPaymentResult>((resolve, reject) => {
      let settled = false;
      const finish = (ok: boolean, value: PiPaymentResult | Error) => {
        if (settled) return;
        settled = true;
        if (ok) resolve(value as PiPaymentResult);
        else reject(value);
      };

      try {
        Pi.createPayment(
          {
            amount: amountPi,
            memo: opts.memo.slice(0, 120),
            metadata: { bookingId: opts.bookingId },
          },
          {
            onReadyForServerApproval(paymentId) {
              postBridge("/api/payments/approve", { paymentId }).catch((err: Error) =>
                finish(false, err instanceof Error ? err : new Error(String(err))),
              );
            },
            onReadyForServerCompletion(paymentId, txid) {
              postBridge("/api/payments/complete", { paymentId, txid })
                .then(() =>
                  finish(true, {
                    mode: "pi",
                    paymentId,
                    txid,
                    amountPi,
                  }),
                )
                .catch((err: Error) =>
                  finish(false, err instanceof Error ? err : new Error(String(err))),
                );
            },
            onCancel() {
              finish(false, new Error("Pi payment cancelled."));
            },
            onError(error) {
              finish(false, new Error(error?.message || "Pi payment failed."));
            },
          },
        );
      } catch (err) {
        finish(false, err instanceof Error ? err : new Error(String(err)));
      }
    }),
    PAY_TIMEOUT_MS,
    "Timed out waiting for Pi payment. Check Pi Browser prompts and your payment bridge.",
  );
}
