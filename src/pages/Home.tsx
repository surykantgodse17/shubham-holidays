import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Nav } from "../components/Nav";
import { PiGcvPrice } from "../components/PiGcvPrice";
import {
  cities,
  destinations,
  domesticPackages,
  formatINR,
  internationalPackages,
  pilgrimageDestinations,
  whatsappBookUrl,
} from "../data/mock";

type Tab = "flights" | "hotels" | "explore";

const HERO_DESCRIPTION =
  "Book Flights & Hotels with Pi. Fast, Secure & Easy Booking with Pi Payment.";

export function Home() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("flights");
  const [from, setFrom] = useState("DEL");
  const [to, setTo] = useState("GOI");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [city, setCity] = useState("GOI");
  const [guests, setGuests] = useState("2");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (tab === "flights") {
      navigate(`/flights/results?from=${from}&to=${to}&date=${date}&guests=${guests}`);
    } else if (tab === "hotels") {
      navigate(`/hotels/results?city=${city}&checkin=${date}&guests=${guests}`);
    } else {
      navigate("/explore");
    }
  }

  return (
    <div className="page">
      <section className="hero hero-with-overlay" aria-label="Shubham Holidays hero">
        <div
          className="hero-media hero-media-mainnet02"
          role="img"
          aria-label="Airplane flying over snow-capped mountain peaks above the clouds"
        />
        <div className="hero-overlay hero-overlay-ref">
          <Nav overHero />
          <div className="hero-copy shell">
            <img
              src="/logo-full.png"
              alt=""
              className="hero-copy-logo"
              width={160}
              height={70}
              decoding="async"
            />
            <h1 className="hero-copy-brand">Shubham Holidays</h1>
            <p className="hero-copy-lead">Travel that feels considered</p>
            <p className="hero-copy-desc">{HERO_DESCRIPTION}</p>
            <div className="hero-actions">
              <Link to="/flights" className="btn btn-primary">
                Search flights
              </Link>
              <Link to="/hotels" className="btn btn-sea">
                Search hotel
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section shell">
        <form className="search-panel" onSubmit={onSearch}>
          <div className="search-tabs" role="tablist" aria-label="Search type">
            {(
              [
                ["flights", "Flights"],
                ["hotels", "Hotels"],
                ["explore", "Packages"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "flights" && (
            <div className="search-grid">
              <div className="field">
                <label htmlFor="from">From</label>
                <select id="from" value={from} onChange={(e) => setFrom(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="to">To</label>
                <select id="to" value={to} onChange={(e) => setTo(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="date">Depart</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="guests">Travelers</label>
                <select id="guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">
                Search
              </button>
            </div>
          )}

          {tab === "hotels" && (
            <div className="search-grid">
              <div className="field">
                <label htmlFor="city">City</label>
                <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="checkin">Check-in</label>
                <input id="checkin" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="hguests">Guests</label>
                <select id="hguests" value={guests} onChange={(e) => setGuests(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="nights">Nights</label>
                <select id="nights" defaultValue="3">
                  {[1, 2, 3, 4, 5, 7].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">
                Find stays
              </button>
            </div>
          )}

          {tab === "explore" && (
            <div className="search-grid search-grid-compact">
              <div className="field">
                <label htmlFor="q">What are you looking for?</label>
                <input id="q" placeholder="Packages, treks, food walks…" readOnly value="Curated India & nearby" />
              </div>
              <button className="btn btn-primary" type="submit">
                Explore
              </button>
            </div>
          )}

        </form>
      </section>

      <section className="section shell">
        <div className="section-head">
          <span className="eyebrow">Where to next</span>
          <h2>Destinations with room to breathe</h2>
          <p>Soft coasts, green shade, and high ridges — pick a mood and we’ll take it from search to booking.</p>
        </div>
        <div className="strip">
          {destinations.map((d) => (
            <Link key={d.name} to={d.href} className="dest-tile">
              <img src={d.image} alt="" loading="lazy" />
              <div className="dest-tile-body">
                <h3>{d.name}</h3>
                <p>{d.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section shell" aria-labelledby="pilgrimage-heading">
        <div className="section-head">
          <span className="eyebrow">Faith · India</span>
          <h2 id="pilgrimage-heading">Indian Pilgrimage Circuit</h2>
          <p>Sacred towns across India — pick a shrine and we’ll arrange darshan, stays, and calm travel.</p>
        </div>
        <div className="strip strip-pilgrimage">
          {pilgrimageDestinations.map((d) => (
            <Link key={d.name} to={d.href} className="dest-tile">
              <img src={d.image} alt="" loading="lazy" />
              <div className="dest-tile-body">
                <h3>{d.name}</h3>
                <p>{d.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section shell" aria-labelledby="domestic-packages-heading">
        <div className="section-head">
          <span className="eyebrow">India</span>
          <h2 id="domestic-packages-heading">Domestic Packages</h2>
          <p>Curated journeys across India — same calm booking flow from browse to confirm.</p>
        </div>
        <div className="listing-grid">
          {domesticPackages.map((pkg) => (
            <Link key={pkg.id} to={`/explore/${pkg.id}`} className="listing-card">
              <img src={pkg.image} alt="" loading="lazy" />
              <div className="listing-body">
                <span className="listing-tag">Domestic</span>
                <h3>{pkg.title}</h3>
                <p className="ink-soft text-092">
                  {pkg.place} · {pkg.duration}
                </p>
                <div className="listing-footer">
                  <div className="listing-price-block">
                    <strong className="listing-price-label">{formatINR(pkg.price)}</strong>
                    <PiGcvPrice inr={pkg.price} />
                  </div>
                  <span className="btn-text">View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section shell" aria-labelledby="international-packages-heading">
        <div className="section-head">
          <span className="eyebrow">Abroad</span>
          <h2 id="international-packages-heading">International Tour Packages</h2>
          <p>Handpicked getaways with flights, hotels, visas, and sightseeing — book on WhatsApp.</p>
        </div>
        <div className="listing-grid">
          {internationalPackages.map((pkg) => (
            <article key={pkg.id} className="listing-card">
              <img src={pkg.image} alt="" loading="lazy" />
              <div className="listing-body">
                <span className="listing-tag listing-tag-intl">International</span>
                <h3>{pkg.title}</h3>
                <p className="ink-soft text-092">
                  {pkg.place} · {pkg.duration}
                </p>
                <ul className="package-inclusions">
                  {pkg.inclusions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="listing-footer listing-footer-stack">
                  <div className="listing-price-block">
                    <strong className="listing-price-label">
                      {formatINR(pkg.price)}
                      <span className="price-pp"> /- per person</span>
                    </strong>
                    <PiGcvPrice inr={pkg.price} />
                  </div>
                  <a
                    className="btn btn-sea btn-whatsapp"
                    href={whatsappBookUrl(pkg.title, pkg.duration, pkg.price)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book Now
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
