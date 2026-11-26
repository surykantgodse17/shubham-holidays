import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cities } from "../data/mock";
import { Steps } from "../components/Steps";

export function Hotels() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [city, setCity] = useState(params.get("city") ?? "GOI");
  const [checkin, setCheckin] = useState(() => new Date().toISOString().slice(0, 10));
  const [nights, setNights] = useState("3");
  const [guests, setGuests] = useState("2");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(`/hotels/results?city=${city}&checkin=${checkin}&nights=${nights}&guests=${guests}`);
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Hotels</span>
        <h1>Find a stay</h1>
        <p>Browse sample hotels by city, then select a room rate and continue to booking.</p>
        <Steps
          items={[
            { label: "Search", state: "active" },
            { label: "Select", state: "todo" },
            { label: "Book", state: "todo" },
            { label: "Pay", state: "todo" },
          ]}
        />
      </div>

      <div className="shell" style={{ marginTop: "1.25rem" }}>
        <form className="search-panel" onSubmit={onSubmit}>
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
              <input id="checkin" type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="nights">Nights</label>
              <select id="nights" value={nights} onChange={(e) => setNights(e.target.value)}>
                {[1, 2, 3, 4, 5, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="guests">Guests</label>
              <select id="guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" type="submit">
              Search hotels
            </button>
          </div>
          <p className="sample-banner">
            <span className="badge badge-sample">Sample data</span>
            Sample cities: Goa, Mumbai, Bengaluru, Delhi.
          </p>
        </form>
      </div>
    </div>
  );
}
