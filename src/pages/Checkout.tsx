import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatINR } from "../data/mock";
import {
  addBooking,
  clearCart,
  getCart,
  makeBookingId,
  type CartItem,
} from "../lib/storage";
import { Steps } from "../components/Steps";

type PayMethod = "card" | "upi" | "netbanking";

export function Checkout() {
  const navigate = useNavigate();
  const [cart, setCartState] = useState<CartItem | null>(null);
  const [method, setMethod] = useState<PayMethod>("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [upi, setUpi] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCartState(getCart());
  }, []);

  if (!cart) {
    return (
      <div className="page shell empty">
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

  function onPay(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (method === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 12 || !expiry || cvv.length < 3 || !cardName.trim()) {
        setError("Enter mock card details to continue (sandbox only).");
        return;
      }
    }
    if (method === "upi" && !upi.includes("@")) {
      setError("Enter a mock UPI ID like name@okbank.");
      return;
    }

    setProcessing(true);
    window.setTimeout(() => {
      const guestName = cart!.meta?.guest || cart!.meta?.passenger || cardName || "Guest";
      const email = cart!.meta?.email || "guest@example.com";
      const bookingId = makeBookingId();
      addBooking({
        ...cart!,
        bookingId,
        createdAt: new Date().toISOString(),
        guestName,
        email,
        paymentMethod:
          method === "card" ? "Card (sandbox)" : method === "upi" ? "UPI (sandbox)" : "Net banking (sandbox)",
        status: "confirmed",
      });
      clearCart();
      navigate(`/confirmation?id=${bookingId}`);
    }, 900);
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Checkout</span>
        <h1>Secure payment</h1>
        <p>Sandbox checkout — no real charges, no payment credentials stored.</p>
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
          <h2>Payment method</h2>
          <div className="pay-methods">
            {(
              [
                ["card", "Card"],
                ["upi", "UPI"],
                ["netbanking", "Net banking"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className="pay-option">
                <input
                  type="radio"
                  name="pay"
                  checked={method === id}
                  onChange={() => setMethod(id)}
                />
                <span>{label}</span>
                <span className="badge badge-sample" style={{ marginLeft: "auto" }}>
                  Sandbox
                </span>
              </label>
            ))}
          </div>

          {method === "card" && (
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="cardName">Name on card</label>
                <input
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="As on card"
                  autoComplete="cc-name"
                />
              </div>
              <div className="field full">
                <label htmlFor="cardNumber">Card number</label>
                <input
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4111 1111 1111 1111"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>
              <div className="field">
                <label htmlFor="expiry">Expiry</label>
                <input
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                />
              </div>
              <div className="field">
                <label htmlFor="cvv">CVV</label>
                <input
                  id="cvv"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </div>
            </div>
          )}

          {method === "upi" && (
            <div className="field">
              <label htmlFor="upi">UPI ID</label>
              <input
                id="upi"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                placeholder="name@okbank"
              />
            </div>
          )}

          {method === "netbanking" && (
            <div className="field">
              <label htmlFor="bank">Bank</label>
              <select id="bank" defaultValue="hdfc">
                <option value="hdfc">HDFC Bank (demo)</option>
                <option value="icici">ICICI Bank (demo)</option>
                <option value="sbi">State Bank of India (demo)</option>
              </select>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          <p className="pay-note">
            This is a mock payment screen. Nothing is charged and no payment details leave your browser.
          </p>

          <button type="submit" className="btn btn-primary" style={{ marginTop: "1.15rem", width: "100%" }} disabled={processing}>
            {processing ? "Processing…" : `Pay ${formatINR(cart.amount)}`}
          </button>
        </form>

        <aside className="panel">
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
            <span>Type</span>
            <span style={{ textTransform: "capitalize" }}>{cart.kind}</span>
          </div>
          <div className="summary-row">
            <span>Total</span>
            <span>{formatINR(cart.amount)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
