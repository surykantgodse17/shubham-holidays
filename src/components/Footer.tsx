import { Link } from "react-router-dom";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "../lib/contact";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <img
            src="/logo-full.png"
            alt="Shubham Holidays"
            className="footer-logo"
            width={160}
            height={70}
            decoding="async"
          />
          <p className="footer-tagline">Flights, stays, and curated journeys — sample demo data. Pay with Pi.</p>
        </div>
        <div className="footer-links">
          <Link to="/flights">Flights</Link>
          <Link to="/hotels">Hotels</Link>
          <Link to="/explore">Explore</Link>
          <Link to="/bookings">Bookings</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-contact">
          <h3 className="footer-contact-title">Contact</h3>
          <a className="footer-contact-link" href={CONTACT_MAILTO}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 7 9-7" />
            </svg>
            <span>{CONTACT_EMAIL}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
