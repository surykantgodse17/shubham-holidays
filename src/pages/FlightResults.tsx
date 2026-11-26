import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { cityName, flights, formatINR } from "../data/mock";
import { Steps } from "../components/Steps";

export function FlightResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = params.get("from") ?? "DEL";
  const to = params.get("to") ?? "GOI";
  const date = params.get("date") ?? "";
  const guests = params.get("guests") ?? "1";
  const [nonstop, setNonstop] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const results = useMemo(() => {
    let list = flights.filter((f) => f.from === from && f.to === to);
    if (nonstop) list = list.filter((f) => f.stops === 0);
    return [...list].sort((a, b) => a.price - b.price);
  }, [from, to, nonstop]);

  function continueBook() {
    if (!selected) return;
    navigate(`/flights/book?id=${selected}&date=${date}&guests=${guests}`);
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Select flight</span>
        <h1>
          {cityName(from)} → {cityName(to)}
        </h1>
        <p>
          {date ? `Departing ${date}` : "Flexible date"} · {guests} traveler{guests === "1" ? "" : "s"}
        </p>
        <Steps
          items={[
            { label: "Search", state: "done" },
            { label: "Select", state: "active" },
            { label: "Book", state: "todo" },
            { label: "Pay", state: "todo" },
          ]}
        />
      </div>

      <div className="shell results-layout">
        <aside className="filters">
          <h3>Filters</h3>
          <fieldset className="filter-group">
            <legend>Stops</legend>
            <label>
              <input type="checkbox" checked={nonstop} onChange={(e) => setNonstop(e.target.checked)} />
              Non-stop only
            </label>
          </fieldset>
          <Link to="/flights" className="btn-text">
            ← Edit search
          </Link>
        </aside>

        <div>
          {results.length === 0 ? (
            <div className="empty panel">
              <p>No flights on this route. Search Delhi (DEL) → Goa (GOI) for the IndiGo 6E 2145 service.</p>
            </div>
          ) : (
            <div className="result-list">
              {results.map((f, i) => (
                <article
                  key={f.id}
                  className={`result-card${selected === f.id ? " selected" : ""}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="result-main">
                    <h3>
                      {f.airline}{" "}
                      <span style={{ fontWeight: 500, color: "var(--ink-muted)", fontSize: "0.9rem" }}>
                        {f.flightNo}
                      </span>
                    </h3>
                    <div className="result-meta">
                      <span>
                        {f.depart} → {f.arrive}
                      </span>
                      <span>{f.duration}</span>
                      <span>{f.stops === 0 ? "Non-stop" : `${f.stops} stop`}</span>
                      <span>{f.cabin}</span>
                    </div>
                  </div>
                  <div className="result-price">
                    <div className="per">per traveler</div>
                    <div className="amount">{formatINR(f.price)}</div>
                    <button
                      type="button"
                      className="btn btn-sea"
                      style={{ marginTop: "0.55rem" }}
                      onClick={() => setSelected(f.id)}
                    >
                      {selected === f.id ? "Selected" : "Select"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" disabled={!selected} onClick={continueBook}>
              Continue to book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
