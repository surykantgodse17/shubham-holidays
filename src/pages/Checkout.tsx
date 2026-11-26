import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { Steps } from "../components/Steps";
import { formatINR } from "../data/mock";
import {
  formatPi,
  inPiBrowser,
  initPiSdk,
  inrToPi,
  inrToUsd,
  isPiSandbox,
  isPiSdkAvailable,
  payWithPi,
  PI_USD_VALUE,
  piBridgeBase,
} from "../lib/pi";
import {
  addBooking,
  clearCart,
  getCart,
  makeBookingId,
  type CartItem,
} from "../lib/storage";

export function Checkout() {
  const navigate = useNavigate();
  const [cart, setCartState] = useState<CartItem | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [piReady, setPiReady] = useState(false);

  useEffect(() => {
    setCartState(getCart());
    setPiReady(initPiSdk() && isPiSdkAvailable());
  }, []);

  const amountPi = useMemo(() => (cart ? inrToPi(cart.amount) : 0), [cart]);
  const amountUsd = useMemo(() => (cart ? inrToUsd(cart.amount) : 0), [cart]);
  const inBrowser = inPiBrowser();
  const sandbox = isPiSandbox();
  const hasBridge = Boolean(piBridgeBase());

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

  async function onPay(e: FormEvent) {
    e.preventDefault();
    setError("");
    setProcessing(true);

    const bookingId = makeBookingId();
    const memo = `Shubham Holidays · ${cart!.title}`.slice(0, 120);

    try {
      const allowSandboxDemo = !inBrowser || !piReady || !hasBridge;
      const result = await payWithPi({
        amountInr: cart!.amount,
        memo,
        bookingId,
        allowSandboxDemo,
      });

      const guestName = cart!.meta?.guest || cart!.meta?.passenger || "Guest";
      const email = cart!.meta?.email || "guest@example.com";
      addBooking({
        ...cart!,
        bookingId,
        createdAt: new Date().toISOString(),
        guestName,
        email,
        paymentMethod:
          result.mode === "pi"
            ? `Pi Network${sandbox ? " (sandbox)" : ""}`
            : "Pi (sandbox demo)",
        status: "confirmed",
        meta: {
          ...cart!.meta,
          amountPi: String(result.amountPi),
          piPaymentId: result.paymentId || "",
          piTxid: result.txid || "",
        },
      });
      clearCart();
      navigate(`/confirmation?id=${bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pi payment failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="page">
      <div className="shell page-hero checkout-hero">
        <BrandLogo size="lg" />
        <span className="eyebrow">Checkout</span>
        <h1>Pay with Pi</h1>
        <p>
          Fares are shown in INR and charged in Pi at the demo rate{" "}
          <strong>1 π = ${PI_USD_VALUE.toLocaleString("en-US")}</strong>
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
        <form className="panel" onSubmit={onPay}>
          <h2>Pi Network payment</h2>

          <label className="pay-option" style={{ marginBottom: "1rem" }}>
            <input type="radio" name="pay" checked readOnly />
            <span>Pay with Pi</span>
            <span className="badge badge-amber" style={{ marginLeft: "auto" }}>
              {sandbox ? "Sandbox" : "Mainnet"}
            </span>
          </label>

          <div className="pi-status">
            {inBrowser && piReady ? (
              <p>
                Pi Browser detected{hasBridge ? " — live Pi payment flow ready." : " — no payment bridge configured; sandbox demo will complete the booking."}
              </p>
            ) : (
              <p>
                Outside Pi Browser (or SDK unavailable): use the <strong>sandbox demo</strong> to complete a mock Pi payment. Open in Pi Browser with a payment bridge for the real SDK flow.
              </p>
            )}
          </div>

          {error && <p className="error-text">{error}</p>}
          <p className="pay-note">
            No Pi API secrets are embedded in this client. Server approve/complete uses an optional bridge URL only.
          </p>

          <button
            type="submit"
            className="btn btn-primary btn-pi"
            style={{ marginTop: "1.15rem", width: "100%" }}
            disabled={processing}
          >
            {processing ? "Waiting for Pi…" : `Pay ${formatPi(amountPi)}`}
          </button>
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
