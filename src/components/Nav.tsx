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
        <Link to="/" className="brand" onClick={() => setOpen(false)} aria-label="शुभम हॉलीडेस · Shubham Holidays">
          <img
            src="/logo-full.png"
            alt=""
            className="nav-logo"
            width={220}
            height={48}
            decoding="async"
          />
          <span className="brand-text-stack">
            <span className="brand-text-mr" lang="mr">
              शुभम हॉलीडेस
            </span>
            <span className="brand-text-en">Shubham Holidays</span>
          </span>
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
          <NavLink to="/contact" onClick={() => setOpen(false)}>
            Contact
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
