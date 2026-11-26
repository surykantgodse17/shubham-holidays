import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <BrandLogo size="md" withWordmark />
          <p className="footer-tagline">Flights, stays, and curated journeys — sample demo data. Pay with Pi.</p>
        </div>
        <div className="footer-links">
          <Link to="/flights">Flights</Link>
          <Link to="/hotels">Hotels</Link>
          <Link to="/explore">Explore</Link>
          <Link to="/bookings">Bookings</Link>
        </div>
      </div>
    </footer>
  );
}
