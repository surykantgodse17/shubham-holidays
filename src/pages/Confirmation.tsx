import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatINR } from "../data/mock";
import { getBookings } from "../lib/storage";

export function Confirmation() {
  const [params] = useSearchParams();
  const id = params.get("id") ?? "";
  const booking = useMemo(() => getBookings().find((b) => b.bookingId === id), [id]);

  if (!booking) {
    return (
      <div className="page shell empty">
        <p>Booking not found. It may have been cleared from this browser.</p>
        <Link to="/bookings" className="btn btn-sea">
          View bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="shell confirm-wrap">
        <div className="check" aria-hidden>
          ✓
        </div>
        <h1>Booking confirmed</h1>
        <p>
          Reference <strong>{booking.bookingId}</strong> · saved in this browser
        </p>

        <div className="panel" style={{ textAlign: "left", maxWidth: 480, margin: "0 auto 1.5rem" }}>
          <div className="summary-row">
            <span>Item</span>
            <span>{booking.title}</span>
          </div>
          <div className="summary-row">
            <span>Details</span>
            <span style={{ textAlign: "right", maxWidth: "14rem" }}>{booking.subtitle}</span>
          </div>
          <div className="summary-row">
            <span>Guest</span>
            <span>{booking.guestName}</span>
          </div>
          <div className="summary-row">
            <span>Payment</span>
            <span>{booking.paymentMethod}</span>
          </div>
          <div className="summary-row">
            <span>Paid</span>
            <span>{formatINR(booking.amount)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/bookings" className="btn btn-sea">
            My bookings
          </Link>
          <Link to="/" className="btn btn-ghost">
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
