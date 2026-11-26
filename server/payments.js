/**
 * Pi Network payment bridge (server-only).
 * Uses PI_NETWORK_API_KEY from the environment — never expose to the client.
 */

const PI_API_BASE = (process.env.PI_API_BASE || "https://api.minepi.com/v2").replace(/\/$/, "");

export function piApiKey() {
  return String(process.env.PI_NETWORK_API_KEY || process.env.PI_API_KEY || "").trim();
}

export function paymentsReady() {
  return Boolean(piApiKey());
}

async function piFetch(path, body) {
  const key = piApiKey();
  if (!key) {
    const err = new Error(
      "Pi payments are not configured on the server yet. Add PI_NETWORK_API_KEY in app secrets (Pi Developers → Settings → API key).",
    );
    err.status = 503;
    throw err;
  }

  const res = await fetch(`${PI_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      `Pi API error (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  return data;
}

export async function approvePayment(paymentId) {
  const id = String(paymentId || "").trim();
  if (!id) {
    const err = new Error("Missing paymentId.");
    err.status = 400;
    throw err;
  }
  return piFetch(`/payments/${encodeURIComponent(id)}/approve`, {});
}

export async function completePayment(paymentId, txid) {
  const id = String(paymentId || "").trim();
  const tx = String(txid || "").trim();
  if (!id || !tx) {
    const err = new Error("Missing paymentId or txid.");
    err.status = 400;
    throw err;
  }
  return piFetch(`/payments/${encodeURIComponent(id)}/complete`, { txid: tx });
}
