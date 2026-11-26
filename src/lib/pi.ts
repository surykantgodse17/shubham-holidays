/** Demo rate from prior Shubham Holidays Pi booking: 1 Pi = US$314,159 */
export const PI_USD_VALUE = 314159;
/** Demo INR→USD conversion for displaying Pi amounts from INR catalog prices */
export const DEMO_INR_PER_USD = 83;

export type PiPaymentResult = {
  mode: "pi" | "sandbox-demo";
  paymentId?: string;
  txid?: string;
  amountPi: number;
};

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

export function inPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /PiBrowser/i.test(navigator.userAgent) || Boolean((window as { piNetwork?: unknown }).piNetwork);
}

export function isPiSdkAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.Pi?.createPayment);
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

export function initPiSdk(): boolean {
  if (!window.Pi) return false;
  if (!initDone) {
    try {
      window.Pi.init({ version: "2.0", sandbox: isPiSandbox() });
      initDone = true;
    } catch {
      // SDK may already be initialized
      initDone = true;
    }
  }
  return true;
}

async function postBridge(path: string, body: Record<string, string>) {
  const base = piBridgeBase();
  if (!base) {
    throw new Error(
      "Pi payment needs a server bridge for approve/complete. Use sandbox demo outside Pi Browser, or set VITE_PI_BRIDGE_URL.",
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
  // Incomplete payments are left for the next authenticate cycle / bridge.
}

export async function payWithPi(opts: {
  amountInr: number;
  memo: string;
  bookingId: string;
  allowSandboxDemo: boolean;
}): Promise<PiPaymentResult> {
  const amountPi = inrToPi(opts.amountInr);
  if (amountPi <= 0) throw new Error("Invalid Pi amount.");

  const canUseSdk = initPiSdk() && isPiSdkAvailable() && inPiBrowser();
  const bridge = piBridgeBase();

  // Real Pi.createPayment needs a server bridge for approve/complete (API key stays server-side).
  if (!canUseSdk || !bridge) {
    if (!opts.allowSandboxDemo) {
      throw new Error(
        canUseSdk
          ? "Set VITE_PI_BRIDGE_URL to your approve/complete bridge to finish Pi payments."
          : "Open this app in Pi Browser to pay with Pi, or use the sandbox demo.",
      );
    }
    await new Promise((r) => window.setTimeout(r, 900));
    return {
      mode: "sandbox-demo",
      amountPi,
      paymentId: `demo-${opts.bookingId}`,
    };
  }

  const Pi = window.Pi!;
  await Pi.authenticate(PI_AUTH_SCOPES, onIncompletePaymentFound);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (ok: boolean, value: PiPaymentResult | Error) => {
      if (settled) return;
      settled = true;
      if (ok) resolve(value as PiPaymentResult);
      else reject(value);
    };

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
            .catch((err: Error) => finish(false, err instanceof Error ? err : new Error(String(err))));
        },
        onCancel() {
          finish(false, new Error("Pi payment cancelled."));
        },
        onError(error) {
          finish(false, new Error(error?.message || "Pi payment failed."));
        },
      },
    );
  });
}
