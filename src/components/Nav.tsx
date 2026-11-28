import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { isPiSandbox } from "../lib/pi";

type NavProps = {
  /** On the home page the header sits under the hero photo. */
  belowHero?: boolean;
};

export function Nav({ belowHero = false }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const showTestPi = isPiSandbox();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${belowHero ? " nav-below-hero" : ""}${scrolled ? " scrolled" : ""}`}>
      <div className="nav-stack">
        <div className="nav-brand-row">
          <Link to="/" className="site-brand" onClick={() => setOpen(false)}>
            <img
              src="/logo-full.png"
              alt=""
              className="site-brand-logo"
              width={56}
              height={56}
              decoding="async"
            />
            <span className="site-brand-text">SHUBHAM HOLIDAYS</span>
          </Link>
          <button
            className="menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
          </button>
        </div>

        <nav className={`nav-links${open ? " open" : ""}`} aria-label="Primary">
          <NavLink to="/" end onClick={() => setOpen(false)}>
            Home
          </NavLink>
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
          {showTestPi ? (
            <NavLink to="/a2u" className="nav-test-pi" onClick={() => setOpen(false)}>
              Test Pi A2U
            </NavLink>
          ) : null}
          <NavLink to="/contact" onClick={() => setOpen(false)}>
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
