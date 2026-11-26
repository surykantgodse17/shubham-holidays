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
        <p>Confirmed demo bookings stored locally in this browser.</p>
      </div>

      <div className="shell">
        <div className="panel">
          {bookings.length === 0 ? (
            <div className="empty">
              <p>No bookings yet. Search a flight, hotel, or experience to get started.</p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
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
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>{b.title}</strong>
                      <span className="badge">{b.status}</span>
                      <span className="badge badge-sample">{b.kind}</span>
                    </div>
                    <p style={{ color: "var(--ink-soft)", marginTop: "0.35rem" }}>{b.subtitle}</p>
                    <p style={{ color: "var(--ink-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      {b.bookingId} · {b.guestName} · {new Date(b.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--sea-deep)", fontSize: "1.2rem" }}>
                      {formatINR(b.amount)}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--ink-muted)" }}>{b.paymentMethod}</div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{ marginTop: "1rem" }} onClick={clearAll}>
                Clear demo bookings
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
