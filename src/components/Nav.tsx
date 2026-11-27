import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

type NavProps = {
  /** On the home page the header sits under the hero photo. */
  belowHero?: boolean;
  /** Home hero: menu + brand sit on top of the background photo. */
  overHero?: boolean;
};

export function Nav({ belowHero = false, overHero = false }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`nav${belowHero ? " nav-below-hero" : ""}${overHero ? " nav-over-hero" : ""}${scrolled && !overHero ? " scrolled" : ""}`}
    >
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
          <NavLink to="/contact" onClick={() => setOpen(false)}>
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
