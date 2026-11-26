import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, []);

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 16c4-8 12-8 16 0" stroke="#f3f7f4" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="8" r="2.2" fill="#d97706" />
            </svg>
          </span>
          Shubham Holidays
        </Link>

        <button
          className="menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>

        <nav className={`nav-links${open ? " open" : ""}`} aria-label="Primary">
          <NavLink to="/flights" onClick={() => setOpen(false)}>
            Flights
          </NavLink>
          <NavLink to="/hotels" onClick={() => setOpen(false)}>
            Hotels
          </NavLink>
          <NavLink to="/explore" onClick={() => setOpen(false)}>
            Explore
          </NavLink>
          <NavLink to="/bookings" onClick={() => setOpen(false)}>
            My bookings
          </NavLink>
        </nav>

        <div className="nav-cta">
          <Link to="/explore" className="btn btn-sea">
            Plan a trip
          </Link>
        </div>
      </div>
    </header>
  );
}
