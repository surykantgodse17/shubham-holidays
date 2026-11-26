import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatINR } from "../data/mock";
import { getBookings, type BookingRecord } from "../lib/storage";

export function Bookings() {
  const [tick, setTick] = useState(0);
  const bookings = useMemo(() => {
    void tick;
    return getBookings();
  }, [tick]);

  function clearAll() {
    localStorage.removeItem("shubham-holidays-bookings");
    setTick((t) => t + 1);
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Account</span>
        <h1>My bookings</h1>
        <p>Bookings stored locally in this browser. Demo entries are not real reservations.</p>
      </div>

      <div className="shell">
        <div className="panel">
          {bookings.length === 0 ? (
            <div className="empty">
              <p>No bookings yet. Search a flight, hotel, or experience to get started.</p>
              <div className="btn-row btn-row-center mt-1">
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
          ) : (
            <>
              {bookings.map((b: BookingRecord) => (
                <div key={b.bookingId} className="booking-item">
                  <div>
                    <div className="btn-row btn-row-gap-sm">
                      <strong className="booking-title">{b.title}</strong>
                      <span className={`badge ${b.status === "demo" ? "badge-sample" : "badge"}`}>
                        {b.status === "demo" ? "demo (local)" : b.status}
                      </span>
                      <span className="badge badge-sample">{b.kind}</span>
                    </div>
                    <p className="ink-soft mt-035">{b.subtitle}</p>
                    <p className="ink-muted text-085 mt-025">
                      {b.bookingId} · {b.guestName} · {new Date(b.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="booking-amount">
                      {formatINR(b.amount)}
                    </div>
                    <div className="booking-meta">{b.paymentMethod}</div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost mt-1" onClick={clearAll}>
                Clear local bookings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
