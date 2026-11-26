/** Canonical demo rate: 1 π = exactly 314159 USD */
export const PI_USD_VALUE = 314159;
/** Display string for the rate — always `$314159`, never locale-comma formatted */
export const PI_USD_RATE_LABEL = `$${PI_USD_VALUE}`;
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
const LOAD_TIMEOUT_MS = 12_000;
const INIT_TIMEOUT_MS = 8_000;
const AUTH_TIMEOUT_MS = 45_000;
const PAY_TIMEOUT_MS = 120_000;

let scriptPromise: Promise<void> | null = null;
let initDone = false;

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

/** UI copy: `1 π = $314159` */
export function formatPiUsdRate(): string {
  return `1 π = ${PI_USD_RATE_LABEL}`;
}

export function inPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /PiBrowser/i.test(ua) || Boolean((window as { piNetwork?: unknown }).piNetwork);
}

export function isPiSdkAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.Pi?.createPayment && window.Pi?.init);
}

/** Sandbox by default; set VITE_PI_SANDBOX=false only when intentionally using mainnet. */
export function isPiSandbox(): boolean {
  const raw = import.meta.env.VITE_PI_SANDBOX;
  if (raw === undefined || raw === "") return true;
  return String(raw).toLowerCase() !== "false";
}

/** Optional public bridge URL for approve/complete (no secrets in the client). */
export function piBridgeBase(): string {
  return String(import.meta.env.VITE_PI_BRIDGE_URL || "").replace(/\/$/, "");
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

/**
 * Resolve checkout connection state without hanging.
 * Outside Pi Browser we never call Pi.init — go straight to sandbox-fallback.
 */
export async function connectPiForCheckout(
  onProgress?: (state: PiConnectionState) => void,
): Promise<PiConnectionState> {
  const sandbox = isPiSandbox();
  const hasBridge = Boolean(piBridgeBase());

  if (!inPiBrowser()) {
    const state: PiConnectionState = {
      status: "sandbox-fallback",
      reason:
        "Not in Pi Browser. Pay with Pi needs Pi Browser; use the sandbox demo here, or open this app in Pi Browser.",
      sandbox,
    };
    onProgress?.(state);
    return state;
  }

  onProgress?.({ status: "connecting", detail: "Loading Pi SDK…" });
  try {
    await loadPiSdkScript();
  } catch (err) {
    const state: PiConnectionState = {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load Pi SDK.",
    };
    onProgress?.(state);
    return state;
  }

  onProgress?.({ status: "connecting", detail: "Initializing Pi SDK…" });
  try {
    await initPiSdkInBrowser();
  } catch (err) {
    const state: PiConnectionState = {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to initialize Pi SDK.",
    };
    onProgress?.(state);
    return state;
  }

  if (!isPiSdkAvailable()) {
    const state: PiConnectionState = {
      status: "error",
      message: "Pi SDK initialized but payment APIs are unavailable.",
    };
    onProgress?.(state);
    return state;
  }

  const state: PiConnectionState = {
    status: "ready",
    inPiBrowser: true,
    sandbox,
    hasBridge,
  };
  onProgress?.(state);
  return state;
}

async function postBridge(path: string, body: Record<string, string>) {
  const base = piBridgeBase();
  if (!base) {
    throw new Error(
      "Pi payment needs a server bridge for approve/complete. Set VITE_PI_BRIDGE_URL, or use sandbox demo outside Pi Browser.",
    );
  }
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Pi bridge error (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

function onIncompletePaymentFound(_payment: unknown) {
  // Left for the next authenticate / bridge cycle.
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

  const bridge = piBridgeBase();
  if (!bridge) {
    throw new Error(
      "Pi Browser payments need a payment bridge (VITE_PI_BRIDGE_URL) for approve/complete. API keys stay on the server.",
    );
  }

  await withTimeout(
    Pi.authenticate(PI_AUTH_SCOPES, onIncompletePaymentFound),
    AUTH_TIMEOUT_MS,
    "Timed out waiting for Pi authentication. Approve the prompt in Pi Browser and retry.",
  );

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
