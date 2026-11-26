import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cities } from "../data/mock";
import { Steps } from "../components/Steps";

export function Flights() {
  const navigate = useNavigate();
  const [from, setFrom] = useState("DEL");
  const [to, setTo] = useState("GOI");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [guests, setGuests] = useState("1");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    navigate(`/flights/results?from=${from}&to=${to}&date=${date}&guests=${guests}`);
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Flights</span>
        <h1>Find your flight</h1>
        <p>Search the available IndiGo Delhi → Goa flight, then select and book.</p>
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
              Search flights
            </button>
          </div>
          <p className="sample-banner">
            <span className="badge badge-sample">Sample data</span>
            One real IndiGo flight: Delhi (DEL) → Goa (GOI).
          </p>
        </form>
      </div>
    </div>
  );
}
