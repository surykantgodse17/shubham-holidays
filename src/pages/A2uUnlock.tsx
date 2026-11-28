import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { browserSessionHeaders, ensureCsrfToken } from "../lib/csrf";
import { authenticatePi, connectPiForCheckout, isPiSandbox, type PiConnectionState } from "../lib/pi";

type A2uStatus = {
  enabled: boolean;
  target: number;
  uniqueCompleted: number;
  remaining: number;
  met: boolean;
  amountPi: number;
  incompleteCount: number;
  seedLooksValid?: boolean;
  incompleteError?: string;
  recent?: Array<{
    username: string;
    uidShort: string;
    paymentId: string;
    txidShort: string;
    status: string;
  }>;
};

export function A2uUnlock() {
  const [conn, setConn] = useState<PiConnectionState>({ status: "idle" });
  const [status, setStatus] = useState<A2uStatus | null>(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    await ensureCsrfToken();
    const res = await fetch("/api/a2u/status", {
      credentials: "include",
      headers: { Accept: "application/json", ...browserSessionHeaders() },
    });
    const body = (await res.json()) as A2uStatus & { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(body.error || "Could not load A2U status.");
    setStatus(body);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await connectPiForCheckout(setConn);
        if (!cancelled) await loadStatus();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to connect.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  async function onSignIn() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const session = await authenticatePi(["username", "payments", "wallet_address"]);
      setUsername(session.username || "Pi user");
      setMessage(`Signed in as @${session.username || "user"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pi sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onClaim() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await ensureCsrfToken(true);
      let token = "";
      try {
        const session = await authenticatePi(["username", "payments", "wallet_address"]);
        token = String(session.accessToken || "").trim();
        if (session.username) setUsername(session.username);
      } catch (err) {
        throw err instanceof Error ? err : new Error("Pi sign-in required.");
      }
      if (!token) throw new Error("Missing Pi access token. Approve Sign in with Pi and retry.");

      const res = await fetch("/api/a2u/claim", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...browserSessionHeaders(),
        },
        body: "{}",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        alreadyClaimed?: boolean;
        paymentId?: string;
        txid?: string;
        amountPi?: number;
        status?: A2uStatus;
      };
      if (!res.ok || body.ok === false) throw new Error(body.error || "A2U claim failed.");
      if (body.status) setStatus(body.status);
      else await loadStatus();
      setMessage(
        body.alreadyClaimed
          ? "This Pi account already received Staging A2U. Use a different Pi account for the next unique wallet."
          : `A2U sent (${body.amountPi ?? status?.amountPi ?? 0.001} Test Pi). Payment ${body.paymentId || ""} · tx ${body.txid || ""}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "A2U claim failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onResolve() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await ensureCsrfToken(true);
      const res = await fetch("/api/a2u/resolve", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...browserSessionHeaders(),
        },
        body: "{}",
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; status?: A2uStatus };
      if (!res.ok || body.ok === false) throw new Error(body.error || "Resolve failed.");
      if (body.status) setStatus(body.status);
      else await loadStatus();
      setMessage("Resolved incomplete A2U payments (completed or cancelled).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed.");
    } finally {
      setBusy(false);
    }
  }

  const progress = status
    ? `${status.uniqueCompleted} / ${status.target} unique wallets`
    : "…";

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Staging · Testnet 02</span>
        <h1>A2U unlock (5 unique wallets)</h1>
        <p>
          Complete <strong>App-to-User</strong> Test Pi payouts to <strong>5 different Pi accounts</strong>{" "}
          so Mainnet wallet <strong>Apply</strong> can unlock. Open this page in{" "}
          <strong>Pi Browser</strong> (Sandbox / Staging app).
        </p>
      </div>

      <div className="shell book-layout">
        <div className="panel">
          <h2>Progress</h2>
          <p className="ink-soft">
            Unique completed: <strong>{progress}</strong>
            {status?.met ? " — target met. Return to Pi Developers → Mainnet wallet Apply." : null}
          </p>
          {!status?.enabled ? (
            <p className="error-text">
              Server A2U is not enabled yet. Add Vercel env on project{" "}
              <code>shubham-holidays-testnet-02</code>: <code>PI_A2U_ENABLED=true</code>, Staging{" "}
              <code>PI_NETWORK_API_KEY</code>, and <code>PI_WALLET_PRIVATE_SEED</code> (wallet seed starting
              with S, 56 chars). Redeploy, then retry.
            </p>
          ) : (
            <p className="ink-soft text-092">
              Each claim sends ~{status.amountPi} Test Pi from the Staging app wallet to the signed-in user.
              One claim per Pi uid.
              {status.seedLooksValid === false
                ? " Warning: wallet seed is set but does not look like a valid 56-char S… seed."
                : null}
            </p>
          )}

          <div className={`pi-status pi-status-${conn.status === "ready" ? "ready" : conn.status === "error" ? "error" : "connecting"}`}>
            <p>
              {conn.status === "ready"
                ? isPiSandbox()
                  ? "Pi Browser · Staging sandbox ready"
                  : "Pi Browser ready"
                : conn.status === "sandbox-fallback"
                  ? "Open in Pi Browser / Sandbox to claim A2U."
                  : conn.status === "error"
                    ? conn.message
                    : "Connecting to Pi SDK…"}
            </p>
          </div>

          {username ? <p className="ink-soft">Signed in: @{username}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          <div className="hero-actions" style={{ marginTop: "1rem", flexWrap: "wrap", gap: "0.65rem" }}>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onSignIn}>
              Sign in with Pi
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || !status?.enabled} onClick={onClaim}>
              {busy ? "Working…" : "Receive Test Pi (A2U)"}
            </button>
            <button type="button" className="btn btn-sea" disabled={busy || !status?.enabled} onClick={onResolve}>
              Resolve stuck A2U
            </button>
          </div>

          <ol className="ink-soft text-092" style={{ marginTop: "1.25rem", paddingLeft: "1.2rem" }}>
            <li>Open this URL in Pi Browser: https://shubham-holidays.vercel.app/#/a2u</li>
            <li>Tap <strong>Sign in with Pi</strong>, then <strong>Receive Test Pi (A2U)</strong>.</li>
            <li>Wait for success — progress should increase by 1.</li>
            <li>Log out / switch to another Pi account (or another phone) and repeat until 5/5.</li>
            <li>In Pi Developers → Production (Mainnet) wallet, tap <strong>Apply</strong> again.</li>
          </ol>
        </div>

        <aside className="panel">
          <h2>Recent payouts</h2>
          {!status?.recent?.length ? (
            <p className="ink-soft">No completed A2U rows yet.</p>
          ) : (
            <ul className="package-inclusions">
              {status.recent.map((row) => (
                <li key={row.paymentId}>
                  @{row.username || row.uidShort} · {row.status} · tx {row.txidShort || "—"}
                </li>
              ))}
            </ul>
          )}
          {status && status.incompleteCount > 0 ? (
            <p className="error-text">Incomplete server payments: {status.incompleteCount}. Tap Resolve stuck.</p>
          ) : null}
          <p style={{ marginTop: "1rem" }}>
            <Link to="/" className="btn-text">
              ← Back home
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
