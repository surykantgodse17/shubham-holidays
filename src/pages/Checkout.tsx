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
      return "Local demo only";
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
        ? isPiSandbox()
          ? "Pi Browser ready (Testnet sandbox). You can pay with Test Pi."
          : "Pi Browser ready (Mainnet). You can pay with Pi."
        : isPiSandbox()
          ? "Pi Browser + SDK ready (Testnet sandbox), but the payment bridge did not respond."
          : "Pi Browser + SDK ready (Mainnet), but the payment bridge did not respond.";
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

  const canPayWithPi = conn.status === "ready" && conn.hasBridge;
  const canSandboxDemo = conn.status === "sandbox-fallback" || conn.status === "error";
  const isConnecting = conn.status === "connecting";

  if (!cart) {
    return (
      <div className="page shell empty">
        <BrandLogo size="lg" />
        <p>Your checkout is empty. Search a flight, hotel, or experience first.</p>
        <div className="btn-row btn-row-center">
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
    opts: { status: "confirmed" | "demo"; paymentId?: string; txid?: string },
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
      status: opts.status,
      meta: {
        ...cart!.meta,
        amountPi: String(amountPiPaid),
        piPaymentId: opts.paymentId || "",
        piTxid: opts.txid || "",
      },
    });
    clearCart();
    navigate(`/confirmation?id=${bookingId}`);
  }

  async function onPayPi(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!canPayWithPi) {
      setError("Pi is not ready yet. Wait for Ready, or open this app in Pi Browser.");
      return;
    }
    setProcessing(true);
    const bookingId = makeBookingId();
    const memo = `Shubham Holidays · ${cart!.title}`.slice(0, 120);
    try {
      const result = await payWithPi({
        kind: cart!.kind,
        productId: cart!.id,
        guests: Number(cart!.meta?.guests || 1),
        nights: Number(cart!.meta?.nights || 1),
        memo,
        bookingId,
        guestName: cart!.meta?.guest || cart!.meta?.passenger || "Guest",
        email: cart!.meta?.email || "guest@example.com",
        title: cart!.title,
        subtitle: cart!.subtitle,
        amountInr: cart!.amount,
      });
      await finishBooking(bookingId, "Pi (Mainnet)", result.amountPi, {
        status: "confirmed",
        paymentId: result.paymentId,
        txid: result.txid,
      });
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
      await finishBooking(bookingId, "Local demo — not a Pi payment", result.amountPi, {
        status: "demo",
        paymentId: result.paymentId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Local demo failed.");
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
          Production Mainnet. Fares are in INR; Pi is charged at GCV{" "}
          <strong>{formatPiUsdRate()}</strong>
          {" "}(catalog USD ÷ 314159; not market price).
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
          <h2>{isPiSandbox() ? "Pay with Test Pi (Sandbox)" : "Pi payment (Mainnet)"}</h2>

          <div className={`pi-status pi-status-${conn.status}`} role="status" aria-live="polite">
            <div className="pi-status-row">
              <span className={`badge ${conn.status === "error" ? "badge-amber" : "badge"}`}>
                {statusLabel(conn)}
              </span>
              {conn.status === "ready" && (
                <span className="badge badge-sample">
                  {isPiSandbox() ? "Testnet · Test Pi" : "Mainnet · Pi"}
                </span>
              )}
              {conn.status === "sandbox-fallback" && (
                <span className="badge badge-sample">Not a real payment</span>
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
              className="btn btn-ghost btn-block mt-085"
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
            className="btn btn-primary btn-pi btn-block mt-115"
            disabled={processing || isConnecting || !canPayWithPi}
          >
            {processing && canPayWithPi
              ? "Waiting for Pi…"
              : isConnecting
                ? "Checking Pi Browser…"
                : canPayWithPi
                  ? isPiSandbox()
                    ? `Pay with Test Pi (${formatPi(amountPi)})`
                    : `Pay with Pi (${formatPi(amountPi)})`
                  : isPiSandbox()
                    ? "Pay with Test Pi (open in Pi Browser)"
                    : "Pay with Pi (open in Pi Browser)"}
          </button>

          {canSandboxDemo && (
            <div className="demo-pay-block">
              <p className="demo-pay-warning">
                Local demo only: saves a sample booking in this browser. No Pi is charged and no real reservation is made.
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                disabled={processing}
                onClick={onSandboxDemo}
              >
                {processing
                  ? "Saving local demo…"
                  : `Try local demo (${formatPi(amountPi)}) — not a payment`}
              </button>
            </div>
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
            <span className="summary-value-wrap">{cart.subtitle}</span>
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
