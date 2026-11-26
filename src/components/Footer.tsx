import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div>
          <strong>Shubham Holidays</strong>
          <p style={{ marginTop: "0.35rem" }}>Flights, stays, and curated journeys — sample demo data.</p>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link to="/flights">Flights</Link>
          <Link to="/hotels">Hotels</Link>
          <Link to="/explore">Explore</Link>
          <Link to="/bookings">Bookings</Link>
        </div>
      </div>
    </footer>
  );
}
