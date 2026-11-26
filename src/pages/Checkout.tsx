import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { Steps } from "../components/Steps";
import { formatINR } from "../data/mock";
import {
  authenticatePi,
  connectPiForCheckout,
  formatPi,
  formatPiUsdRate,
  initialPiConnectionState,
  inrToPi,
  inrToUsd,
  isPiSandbox,
  payWithPi,
  payWithSandboxDemo,
  type PiConnectionState,
} from "../lib/pi";
import {
  addBooking,
  clearCart,
  getCart,
  makeBookingId,
  type CartItem,
} from "../lib/storage";

function statusLabel(state: PiConnectionState): string {
  switch (state.status) {
    case "idle":
      return "Preparing";
    case "connecting":
      return "Connecting";
    case "ready":
      return "Ready";
    case "sandbox-fallback":
      return "Sandbox fallback";
    case "error":
      return "Error";
  }
}

function statusDetail(state: PiConnectionState): string {
  switch (state.status) {
    case "idle":
      return "Preparing checkout…";
    case "connecting":
      return state.detail;
    case "ready":
      return state.hasBridge
        ? `Pi Browser ready${state.sandbox ? " (sandbox)" : " (mainnet)"}. You can pay with Pi.`
        : `Pi Browser + SDK ready${state.sandbox ? " (sandbox)" : " (mainnet)"}, but the payment bridge did not respond.`;
    case "sandbox-fallback":
      return state.reason;
    case "error":
      return state.message;
  }
}

export function Checkout() {
  const navigate = useNavigate();
  const [cart, setCartState] = useState<CartItem | null>(() =>
    typeof window !== "undefined" ? getCart() : null,
  );
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [piUser, setPiUser] = useState<string>("");
  const [conn, setConn] = useState<PiConnectionState>(() => initialPiConnectionState());

  useEffect(() => {
    setCartState(getCart());
    let cancelled = false;
    (async () => {
      // Non–Pi Browser already has sandbox-fallback from initial state — still refresh.
      const next = await connectPiForCheckout((partial) => {
        if (!cancelled) setConn(partial);
      });
      if (!cancelled) setConn(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const amountPi = useMemo(() => (cart ? inrToPi(cart.amount) : 0), [cart]);
  const amountUsd = useMemo(() => (cart ? inrToUsd(cart.amount) : 0), [cart]);
  const sandbox = isPiSandbox();

  const canPayWithPi = conn.status === "ready" && conn.hasBridge;
  const canSandboxDemo = conn.status === "sandbox-fallback" || conn.status === "error";
  const isConnecting = conn.status === "connecting";

  if (!cart) {
    return (
      <div className="page shell empty">
        <BrandLogo size="lg" />
        <p>Your checkout is empty. Search a flight, hotel, or experience first.</p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/flights" className="btn btn-sea">
            Flights
          </Link>
          <Link to="/hotels" className="btn btn-ghost">
            Hotels
          </Link>
          <Link to="/explore" className="btn btn-ghost">
            Explore
          </Link>
        </div>
      </div>
    );
  }

  async function finishBooking(
    bookingId: string,
    paymentMethod: string,
    amountPiPaid: number,
    paymentId?: string,
    txid?: string,
  ) {
    const guestName = cart!.meta?.guest || cart!.meta?.passenger || "Guest";
    const email = cart!.meta?.email || "guest@example.com";
    addBooking({
      ...cart!,
      bookingId,
      createdAt: new Date().toISOString(),
      guestName,
      email,
      paymentMethod,
      status: "confirmed",
      meta: {
        ...cart!.meta,
        amountPi: String(amountPiPaid),
        piPaymentId: paymentId || "",
        piTxid: txid || "",
      },
    });
    clearCart();
    navigate(`/confirmation?id=${bookingId}`);
  }

  async function onPayPi(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!canPayWithPi) {
      setError("Pi is not ready for live payment yet. Wait for Ready, or open in Pi Browser with a payment bridge.");
      return;
    }
    setProcessing(true);
    const bookingId = makeBookingId();
    const memo = `Shubham Holidays · ${cart!.title}`.slice(0, 120);
    try {
      const result = await payWithPi({
        amountInr: cart!.amount,
        memo,
        bookingId,
      });
      await finishBooking(
        bookingId,
        `Pi Network${sandbox ? " (sandbox)" : ""}`,
        result.amountPi,
        result.paymentId,
        result.txid,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pi payment failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function onSandboxDemo() {
    setError("");
    setProcessing(true);
    const bookingId = makeBookingId();
    try {
      const result = await payWithSandboxDemo({
        amountInr: cart!.amount,
        bookingId,
      });
      await finishBooking(bookingId, "Pi (sandbox demo)", result.amountPi, result.paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sandbox demo failed.");
    } finally {
      setProcessing(false);
    }
  }

  async function onRetryConnect() {
    setError("");
    const seed = initialPiConnectionState();
    setConn(seed);
    if (seed.status === "sandbox-fallback") return;
    setConn({ status: "connecting", detail: "Retrying…" });
    const next = await connectPiForCheckout(setConn);
    setConn(next);
  }

  return (
    <div className="page">
      <div className="shell page-hero checkout-hero">
        <BrandLogo size="lg" />
        <span className="eyebrow">Checkout</span>
        <h1>Pay with Pi</h1>
        <p>
          Fares are shown in INR and charged in Pi at the demo rate{" "}
          <strong>{formatPiUsdRate()}</strong>
          {sandbox ? " · Pi sandbox mode" : ""}.
        </p>
        <Steps
          items={[
            { label: "Search", state: "done" },
            { label: "Select", state: "done" },
            { label: "Book", state: "done" },
            { label: "Pay", state: "active" },
          ]}
        />
      </div>

      <div className="shell book-layout">
        <form className="panel" onSubmit={onPayPi}>
          <h2>Pi Network payment</h2>

          <div className={`pi-status pi-status-${conn.status}`} role="status" aria-live="polite">
            <div className="pi-status-row">
              <span className={`badge ${conn.status === "error" ? "badge-amber" : "badge"}`}>
                {statusLabel(conn)}
              </span>
              {conn.status === "ready" && (
                <span className="badge badge-sample">{conn.sandbox ? "Sandbox" : "Mainnet"}</span>
              )}
              {conn.status === "sandbox-fallback" && (
                <span className="badge badge-sample">Demo</span>
              )}
            </div>
            <p>{statusDetail(conn)}</p>
            {(conn.status === "error" || isConnecting) && (
              <button type="button" className="btn btn-text" onClick={onRetryConnect} disabled={isConnecting}>
                {isConnecting ? "Still connecting…" : "Retry connection"}
              </button>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          <p className="pay-note">
            No Pi API secrets ship in this client. Approve/complete runs on same-origin{" "}
            <code>/api/payments/*</code> with <code>PI_NETWORK_API_KEY</code> on the server. Rate:{" "}
            <strong>{formatPiUsdRate()}</strong>.
          </p>

          {conn.status === "ready" && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: "0.85rem", width: "100%" }}
              disabled={processing}
              onClick={async () => {
                setError("");
                try {
                  const session = await authenticatePi(["username", "payments", "wallet_address"]);
                  setPiUser(session.username || "Pi user");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Pi sign-in failed.");
                }
              }}
            >
              {piUser ? `Signed in as @${piUser}` : "Sign in with Pi"}
            </button>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-pi"
            style={{ marginTop: "1.15rem", width: "100%" }}
            disabled={processing || isConnecting || !canPayWithPi}
          >
            {processing && canPayWithPi
              ? "Waiting for Pi…"
              : isConnecting
                ? "Checking Pi Browser…"
                : canPayWithPi
                  ? `Pay ${formatPi(amountPi)} with Pi`
                  : "Pay with Pi (needs Pi Browser)"}
          </button>

          {canSandboxDemo && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: "0.75rem", width: "100%" }}
              disabled={processing}
              onClick={onSandboxDemo}
            >
              {processing ? "Completing demo…" : `Complete with sandbox demo (${formatPi(amountPi)})`}
            </button>
          )}
        </form>

        <aside className="panel">
          <div className="checkout-aside-brand">
            <BrandLogo size="sm" withWordmark />
          </div>
          <h2>Order</h2>
          <div className="summary-row">
            <span>Item</span>
            <span>{cart.title}</span>
          </div>
          <div className="summary-row">
            <span>Details</span>
            <span style={{ textAlign: "right", maxWidth: "14rem" }}>{cart.subtitle}</span>
          </div>
          <div className="summary-row">
            <span>Catalog (INR)</span>
            <span>{formatINR(cart.amount)}</span>
          </div>
          <div className="summary-row">
            <span>≈ USD (demo)</span>
            <span>${amountUsd.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Payable in Pi</span>
            <span>{formatPi(amountPi)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
