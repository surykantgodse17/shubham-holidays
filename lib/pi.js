const PI_API_BASE = process.env.PI_API_BASE || "https://api.minepi.com/v2";

function apiKey() {
  return (process.env.PI_NETWORK_API_KEY || process.env.PI_API_KEY || "").trim();
}

function walletSeed() {
  return (process.env.PI_WALLET_SEED || "").trim();
}

let testA2U = null;

function setA2UClientForTests(client) {
  testA2U = client || null;
}

function a2uClient() {
  if (testA2U) return testA2U;
  const key = apiKey();
  const seed = walletSeed();
  if (!key || !seed) {
    const error = new Error(
      "Pi refunds are not ready on the server yet. Add PI_NETWORK_API_KEY and PI_WALLET_SEED in the server environment. Both stay on the server."
    );
    error.status = 503;
    throw error;
  }
  const PiNetwork = require("pi-backend").default;
  return new PiNetwork(key, seed);
}

function platformError(error) {
  const data = error && error.response && error.response.data;
  const message = (data && (data.error || data.message)) || (error && error.message) || "Pi payout failed.";
  const wrapped = new Error(typeof message === "string" ? message : "Pi payout failed.");
  wrapped.status = error && error.status ? error.status : 502;
  if (data && data.payment) wrapped.payment = data.payment;
  return wrapped;
}

async function createA2U(paymentData) {
  try {
    return await a2uClient().createPayment(paymentData);
  } catch (error) {
    throw platformError(error);
  }
}

async function submitA2U(paymentId) {
  try {
    return await a2uClient().submitPayment(paymentId);
  } catch (error) {
    const raw = error && error.message;
    if (raw && raw.startsWith("{")) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.txid) return String(parsed.txid);
      } catch {
        /* not the already-submitted payload */
      }
    }
    throw platformError(error);
  }
}

async function completeA2U(paymentId, txid) {
  try {
    return await a2uClient().completePayment(paymentId, txid);
  } catch (error) {
    try {
      const current = await a2uClient().getPayment(paymentId);
      if (current && current.status && current.status.developer_completed) return current;
    } catch {
      /* fall through to the original error */
    }
    throw platformError(error);
  }
}

async function incompleteA2U() {
  try {
    const payments = await a2uClient().getIncompleteServerPayments();
    return Array.isArray(payments) ? payments : [];
  } catch (error) {
    throw platformError(error);
  }
}

async function piFetch(pathname, options = {}) {
  const key = apiKey();
  if (!key) {
    const error = new Error(
      "Pi payments are not ready on the server yet. Add PI_NETWORK_API_KEY in the server environment (Pi Developers → Settings → API key). The key stays on the server."
    );
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${PI_API_BASE}${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 180) };
    }
  }
  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) || `Pi Platform returned ${response.status}`;
    const error = new Error(typeof message === "string" ? message : "Pi Platform request failed");
    error.status = response.status === 401 ? 502 : 502;
    throw error;
  }
  return data;
}

async function fetchMe(accessToken) {
  const token = String(accessToken || "").trim();
  if (!token || token.length > 4000) {
    const error = new Error("Pi sign-in did not return a token. Try again.");
    error.status = 400;
    throw error;
  }
  const response = await fetch(`${PI_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data || !data.uid) {
    const error = new Error("Pi could not confirm this account. Sign in again.");
    error.status = 401;
    throw error;
  }
  return {
    uid: String(data.uid),
    username: data.username ? String(data.username) : "Pioneer",
    walletAddress: data.wallet_address ? String(data.wallet_address) : "",
  };
}

function sameMoney(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.001;
}

async function getPayment(paymentId) {
  return piFetch(`/payments/${encodeURIComponent(paymentId)}`);
}

async function approvePayment(paymentId) {
  return piFetch(`/payments/${encodeURIComponent(paymentId)}/approve`, { method: "POST" });
}

async function completePayment(paymentId, txid) {
  return piFetch(`/payments/${encodeURIComponent(paymentId)}/complete`, {
    method: "POST",
    body: { txid },
  });
}

function paymentUser(payment) {
  return String(payment.user_uid || payment.uid || payment.userUid || "");
}

function assertPaymentMatches(payment, booking, user) {
  const metadata = payment && payment.metadata;
  const bookingId = metadata && (metadata.bookingId || metadata.booking_id);
  if (!bookingId || String(bookingId) !== booking.id) {
    const error = new Error("This Pi payment does not match the booking.");
    error.status = 400;
    throw error;
  }
  if (!sameMoney(payment.amount, booking.amount)) {
    const error = new Error("Payment amount does not match the ticket price.");
    error.status = 400;
    throw error;
  }
  const payer = paymentUser(payment);
  if (payer && payer !== user.uid) {
    const error = new Error("This payment belongs to a different Pi account.");
    error.status = 403;
    throw error;
  }
  if (payment.direction && payment.direction !== "user_to_app") {
    const error = new Error("Only a payment to Shubham Holidays can confirm this booking.");
    error.status = 400;
    throw error;
  }
  const status = payment.status || {};
  if (status.cancelled || status.user_cancelled) {
    const error = new Error("This payment was cancelled.");
    error.status = 400;
    throw error;
  }
}

module.exports = {
  apiKey,
  walletSeed,
  fetchMe,
  getPayment,
  approvePayment,
  completePayment,
  assertPaymentMatches,
  createA2U,
  submitA2U,
  completeA2U,
  incompleteA2U,
  setA2UClientForTests,
};
