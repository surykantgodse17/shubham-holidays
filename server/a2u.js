/**
 * Staging / Testnet A2U (App-to-User) payouts.
 * Used to complete the “5 unique wallets” requirement before Mainnet wallet Apply.
 *
 * Requires server env (Testnet 02 only):
 * - PI_NETWORK_API_KEY = Staging API key
 * - PI_WALLET_PRIVATE_SEED = Staging app wallet seed (starts with S, 56 chars)
 * - PI_A2U_ENABLED=true
 */

import { randomUUID } from "node:crypto";
import PiNetworkImport from "pi-backend";
import { sql } from "./db.js";
import { piApiKey } from "./payments.js";

const PiNetwork = PiNetworkImport?.default || PiNetworkImport;

const TARGET_UNIQUE = Math.max(1, Number(process.env.PI_A2U_TARGET || 5) || 5);
const PAYOUT_AMOUNT = Number(process.env.PI_A2U_AMOUNT || 0.001);

function walletSeed() {
  return String(process.env.PI_WALLET_PRIVATE_SEED || process.env.PI_APP_WALLET_SEED || "").trim();
}

export function a2uConfigured() {
  return Boolean(piApiKey() && walletSeed() && process.env.PI_A2U_ENABLED === "true");
}

export function a2uTarget() {
  return TARGET_UNIQUE;
}

/** pi-backend returns `{ incomplete_server_payments: [...] }` — not a bare array. */
function normalizeIncomplete(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.incomplete_server_payments)) return raw.incomplete_server_payments;
  if (Array.isArray(raw?.payments)) return raw.payments;
  return [];
}

/** Turn axios / pi-backend / Horizon failures into a safe user-facing Error. */
function asA2uError(err, fallback = "A2U payout failed.") {
  if (err?.status && err?.message && !err.isAxiosError) return err;

  const data = err?.response?.data;
  const apiMsg =
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.message === "string" && data.message) ||
    (typeof data === "string" && data) ||
    "";
  const raw = String(apiMsg || err?.message || fallback);

  let message = raw;
  let status = 502;

  if (/not iterable|incomplete_server_payments/i.test(raw)) {
    message = "Internal A2U list parse error. Retry after redeploy.";
    status = 500;
  } else if (/private seed of your app wallet/i.test(raw)) {
    message =
      "PI_WALLET_PRIVATE_SEED does not match this Staging app wallet. Paste the seed from Pi Developers → Shubham Holidays 02 Staging → Wallet setup (must start with S).";
    status = 503;
  } else if (/must starts with 'S'|56-character/i.test(raw)) {
    message = "PI_WALLET_PRIVATE_SEED must be a 56-character seed starting with S.";
    status = 503;
  } else if (/op_underfunded|underfunded|insufficient/i.test(raw)) {
    message =
      "Staging app wallet has too little Test Pi. Fund the Staging wallet in Pi Developers, then retry Receive Test Pi (A2U).";
    status = 402;
  } else if (/404|not.?found|Account not found|status code 404/i.test(raw)) {
    message =
      "Staging app wallet account not found on Pi Testnet. Finish wallet setup and fund Test Pi in Pi Developers, then retry.";
    status = 503;
  } else if (/ongoing payment|complete the ongoing/i.test(raw)) {
    message = "An incomplete A2U payment is blocking new payouts. Tap Resolve stuck A2U, then retry.";
    status = 409;
  } else if (/timeout|ECONN|ENOTFOUND|network/i.test(raw)) {
    message = "Could not reach Pi API / Testnet Horizon. Wait a moment and retry.";
    status = 503;
  } else if (raw && raw !== "[object Object]") {
    // Keep short Pi API text when useful
    message = raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
    status = err?.response?.status && err.response.status >= 400 ? err.response.status : 502;
  }

  const out = new Error(message);
  out.status = status;
  return out;
}

function getClient() {
  if (!a2uConfigured()) {
    const err = new Error(
      "A2U is not enabled on this host. Set PI_A2U_ENABLED=true, Staging PI_NETWORK_API_KEY, and PI_WALLET_PRIVATE_SEED on Testnet 02.",
    );
    err.status = 503;
    throw err;
  }
  const seed = walletSeed();
  if (!seed.startsWith("S")) {
    const err = new Error("PI_WALLET_PRIVATE_SEED must be the Staging app wallet private seed (starts with S).");
    err.status = 503;
    throw err;
  }
  if (seed.length !== 56) {
    const err = new Error("PI_WALLET_PRIVATE_SEED must be exactly 56 characters (Pi wallet seed).");
    err.status = 503;
    throw err;
  }
  try {
    return new PiNetwork(piApiKey(), seed);
  } catch (err) {
    throw asA2uError(err, "Invalid Staging wallet seed or API key.");
  }
}

async function listIncomplete(pi) {
  try {
    return normalizeIncomplete(await pi.getIncompleteServerPayments());
  } catch (err) {
    throw asA2uError(err, "Could not list incomplete A2U payments.");
  }
}

async function countUniqueCompleted() {
  const rows = await sql(
    `select count(distinct pi_uid)::int as n
     from a2u_payouts
     where status = 'completed' and coalesce(txid, '') <> ''`,
  );
  return Number(rows[0]?.n || 0);
}

async function listRecent(limit = 12) {
  return sql(
    `select pi_uid, username, payment_id, txid, to_address, amount_pi, status, created_at
     from a2u_payouts
     order by created_at desc
     limit $1`,
    [limit],
  );
}

export async function getA2uStatus() {
  const uniqueCompleted = await countUniqueCompleted();
  const recent = await listRecent();
  let incomplete = [];
  let incompleteError = "";
  const seed = walletSeed();
  if (a2uConfigured()) {
    try {
      const pi = getClient();
      incomplete = await listIncomplete(pi);
    } catch (err) {
      incompleteError = err?.message || "incomplete list failed";
      incomplete = [];
    }
  }
  return {
    enabled: a2uConfigured(),
    target: TARGET_UNIQUE,
    uniqueCompleted,
    remaining: Math.max(0, TARGET_UNIQUE - uniqueCompleted),
    met: uniqueCompleted >= TARGET_UNIQUE,
    amountPi: PAYOUT_AMOUNT,
    incompleteCount: incomplete.length,
    incompleteError: incompleteError || undefined,
    seedPresent: Boolean(seed),
    seedLooksValid: Boolean(seed && seed.startsWith("S") && seed.length === 56),
    recent: recent.map((r) => ({
      username: r.username || "",
      uidShort: String(r.pi_uid || "").slice(0, 8),
      paymentId: r.payment_id,
      txidShort: String(r.txid || "").slice(0, 10),
      toAddressShort: String(r.to_address || "").slice(0, 8),
      amountPi: Number(r.amount_pi),
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}

/**
 * Resolve stuck A2U payments so a new payout can be created.
 * Prefer completing when a tx exists; otherwise cancel.
 */
export async function resolveIncompleteA2u() {
  try {
    const pi = getClient();
    const incomplete = await listIncomplete(pi);
    const results = [];
    for (const payment of incomplete) {
      const paymentId = String(payment?.identifier || "").trim();
      if (!paymentId) continue;
      const txid = String(payment?.transaction?.txid || "").trim();
      try {
        if (txid) {
          const completed = await pi.completePayment(paymentId, txid);
          results.push({ paymentId, action: "completed", txid });
          await upsertFromPayment(completed || payment, "completed");
        } else {
          await pi.cancelPayment(paymentId);
          results.push({ paymentId, action: "cancelled" });
        }
      } catch (err) {
        const mapped = asA2uError(err, "failed");
        results.push({ paymentId, action: "error", error: mapped.message });
      }
    }
    return { ok: true, results, status: await getA2uStatus() };
  } catch (err) {
    throw asA2uError(err, "Could not resolve incomplete A2U payments.");
  }
}

async function upsertFromPayment(payment, status, username = "") {
  const paymentId = String(payment?.identifier || "").trim();
  const uid = String(payment?.user_uid || payment?.uid || "").trim();
  if (!paymentId || !uid) return;
  const txid = String(payment?.transaction?.txid || "").trim();
  const toAddress = String(payment?.to_address || "").trim();
  const amount = Number(payment?.amount || PAYOUT_AMOUNT);
  const memo = String(payment?.memo || "").slice(0, 120);
  const existing = await sql(`select id from a2u_payouts where payment_id = $1`, [paymentId]);
  if (existing[0]) {
    await sql(
      `update a2u_payouts
       set txid = case when $2 <> '' then $2 else txid end,
           to_address = case when $3 <> '' then $3 else to_address end,
           status = $4,
           username = case when $5 <> '' then $5 else username end
       where payment_id = $1`,
      [paymentId, txid, toAddress, status, username],
    );
    return;
  }
  await sql(
    `insert into a2u_payouts
      (id, pi_uid, username, payment_id, txid, to_address, amount_pi, memo, status, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
    [
      randomUUID(),
      uid,
      username,
      paymentId,
      txid,
      toAddress,
      amount,
      memo,
      status,
      JSON.stringify({ direction: payment?.direction || "app_to_user" }),
    ],
  );
}

/**
 * One completed A2U payout per Pi uid (unique wallet progress).
 */
export async function claimA2uPayout(caller) {
  try {
    const uid = String(caller?.uid || "").trim();
    if (!uid) {
      const err = new Error("Pi sign-in required.");
      err.status = 401;
      throw err;
    }

    const prior = await sql(
      `select payment_id, txid, status from a2u_payouts where pi_uid = $1 and status = 'completed' limit 1`,
      [uid],
    );
    if (prior[0]?.txid) {
      return {
        ok: true,
        alreadyClaimed: true,
        paymentId: prior[0].payment_id,
        txid: prior[0].txid,
        status: await getA2uStatus(),
      };
    }

    const pi = getClient();

    // Clear any stuck server payment before creating a new one.
    const incomplete = await listIncomplete(pi);
    for (const payment of incomplete) {
      const paymentId = String(payment?.identifier || "").trim();
      if (!paymentId) continue;
      const txid = String(payment?.transaction?.txid || "").trim();
      if (txid) {
        try {
          await pi.completePayment(paymentId, txid);
          await upsertFromPayment({ ...payment, transaction: { txid } }, "completed");
        } catch {
          /* continue — may still block create */
        }
      } else {
        try {
          await pi.cancelPayment(paymentId);
        } catch {
          /* ignore — createPayment will fail with a clearer ongoing-payment error */
        }
      }
    }

    const amount = Number.isFinite(PAYOUT_AMOUNT) && PAYOUT_AMOUNT > 0 ? PAYOUT_AMOUNT : 0.001;
    const memo = "SH A2U unlock Staging".slice(0, 32);

    let paymentId;
    try {
      paymentId = await pi.createPayment({
        amount,
        memo,
        metadata: {
          purpose: "staging_a2u_unique_wallet",
          app: "shubham-holidays-testnet-02",
        },
        uid,
      });
    } catch (err) {
      throw asA2uError(err, "Pi createPayment (A2U) failed.");
    }

    await upsertFromPayment(
      {
        identifier: paymentId,
        user_uid: uid,
        amount,
        memo,
        to_address: "",
        transaction: null,
      },
      "created",
      caller.username || "",
    );

    let txid = "";
    try {
      txid = await pi.submitPayment(paymentId);
    } catch (err) {
      throw asA2uError(err, "Blockchain submit failed for A2U payment.");
    }

    let completed;
    try {
      completed = await pi.completePayment(paymentId, txid);
    } catch (err) {
      throw asA2uError(err, "Pi completePayment failed after submit. Tap Resolve stuck A2U.");
    }

    await upsertFromPayment(
      {
        ...(completed || {}),
        identifier: paymentId,
        user_uid: uid,
        amount,
        memo,
        to_address: completed?.to_address || "",
        transaction: { txid },
      },
      "completed",
      caller.username || "",
    );

    return {
      ok: true,
      alreadyClaimed: false,
      paymentId,
      txid,
      amountPi: amount,
      toAddress: completed?.to_address || "",
      status: await getA2uStatus(),
    };
  } catch (err) {
    throw asA2uError(err, "A2U payout failed.");
  }
}
