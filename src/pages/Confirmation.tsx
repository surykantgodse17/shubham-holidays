import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatINR } from "../data/mock";
import { formatPi, formatPiUsdRate } from "../lib/pi";
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

  const isDemo = booking.status === "demo";

  return (
    <div className="page">
      <div className="shell confirm-wrap">
        <img
          src="/logo-full.png"
          alt="Shubham Holidays"
          className="confirm-brand-logo"
          width={220}
          height={78}
          decoding="async"
        />
        <h1>{isDemo ? "Local demo saved" : "Booking confirmed"}</h1>
        <p>
          {isDemo ? (
            <>
              Reference <strong>{booking.bookingId}</strong> · sample only in this browser · not a Pi payment or real reservation
            </>
          ) : (
            <>
              Reference <strong>{booking.bookingId}</strong> · saved in this browser · {formatPiUsdRate()}
            </>
          )}
        </p>

        {isDemo && (
          <p className="sample-banner confirm-demo-banner">
            <span className="badge badge-sample">Demo</span>
            No Pi was charged and no supplier booking was created. Open in Pi Browser to pay for real.
          </p>
        )}

        <div className="panel confirm-panel">
          <div className="summary-row">
            <span>Item</span>
            <span>{booking.title}</span>
          </div>
          <div className="summary-row">
            <span>Details</span>
            <span className="summary-value-wrap">{booking.subtitle}</span>
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
            <span>Status</span>
            <span>{isDemo ? "demo (local only)" : booking.status}</span>
          </div>
          <div className="summary-row">
            <span>Catalog (INR)</span>
            <span>{formatINR(booking.amount)}</span>
          </div>
          {booking.meta?.amountPi ? (
            <div className="summary-row">
              <span>{isDemo ? "Demo Pi amount" : "Paid in Pi"}</span>
              <span>{formatPi(Number(booking.meta.amountPi))}</span>
            </div>
          ) : null}
        </div>

        <div className="btn-row btn-row-center">
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
