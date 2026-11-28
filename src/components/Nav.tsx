import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/I18nProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

type NavProps = {
  /** On the home page the header sits under the hero photo. */
  belowHero?: boolean;
  /** Home hero: menu + brand sit on top of the background photo. */
  overHero?: boolean;
};

function scrollToHomePackages() {
  document.getElementById("home-packages")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Nav({ belowHero = false, overHero = false }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function goPackages(e: MouseEvent) {
    e.preventDefault();
    setOpen(false);
    if (location.pathname === "/") {
      scrollToHomePackages();
      return;
    }
    navigate("/", { state: { scrollTo: "packages" } });
  }

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
          <div className="nav-brand-actions">
            <LanguageSwitcher overHero={overHero} />
            <button
              className="menu-btn"
              aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span />
            </button>
          </div>
        </div>

        <nav className={`nav-links${open ? " open" : ""}`} aria-label="Primary">
          <NavLink to="/" end onClick={() => setOpen(false)}>
            {t("nav.home")}
          </NavLink>
          <NavLink to="/flights" onClick={() => setOpen(false)}>
            {t("nav.flights")}
          </NavLink>
          <NavLink to="/hotels" onClick={() => setOpen(false)}>
            {t("nav.hotels")}
          </NavLink>
          <a href="/#/" className="nav-packages-link" onClick={goPackages}>
            {t("nav.packages")}
          </a>
          <NavLink to="/explore" onClick={() => setOpen(false)}>
            {t("nav.explore")}
          </NavLink>
          <NavLink to="/bookings" onClick={() => setOpen(false)}>
            {t("nav.bookings")}
          </NavLink>
          <NavLink to="/contact" onClick={() => setOpen(false)}>
            {t("nav.contact")}
          </NavLink>
          {overHero ? (
            <Link to="/flights" className="btn btn-primary nav-cta" onClick={() => setOpen(false)}>
              {t("nav.planTrip")}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
