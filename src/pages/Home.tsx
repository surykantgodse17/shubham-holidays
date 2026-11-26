import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { cities, destinations } from "../data/mock";

type Tab = "flights" | "hotels" | "explore";

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
      <section className="hero" aria-label="Shubham Holidays hero">
        <div className="hero-media" role="img" aria-label="Mountain landscape at dusk" />
        <div className="hero-content">
          <div className="hero-brand-row">
            <BrandLogo size="hero" inverted />
            <p className="hero-brand">Shubham Holidays</p>
          </div>
          <h1 className="hero-headline">Travel that feels considered</h1>
          <p className="hero-sub">
            Search flights and stays, then book curated packages and local experiences — all in one calm flow.
          </p>
          <div className="hero-actions">
            <Link to="/flights" className="btn btn-primary">
              Search flights
            </Link>
            <Link to="/explore" className="btn btn-ghost hero-ghost-on-photo">
              Browse experiences
            </Link>
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

          <p className="sample-banner">
            <span className="badge badge-sample">Sample data</span>
            Demo inventory — no live airline or hotel APIs.
          </p>
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
    </div>
  );
}
