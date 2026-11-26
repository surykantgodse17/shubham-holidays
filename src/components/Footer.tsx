import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <BrandLogo size="sm" withWordmark />
          <p style={{ marginTop: "0.45rem" }}>Flights, stays, and curated journeys — sample demo data. Pay with Pi.</p>
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
