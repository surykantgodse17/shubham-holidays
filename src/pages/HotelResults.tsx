import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { cityName, formatINR, type Hotel } from "../data/mock";
import { formatPiUsdRate } from "../lib/pi";
import { fetchHotels, rememberHotel, type TravelSource } from "../lib/travelApi";
import { PiGcvPrice } from "../components/PiGcvPrice";
import { Steps } from "../components/Steps";

export function HotelResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const city = params.get("city") ?? "GOI";
  const checkin = params.get("checkin") ?? "";
  const nights = params.get("nights") ?? "3";
  const guests = params.get("guests") ?? "2";
  const [minStars, setMinStars] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [source, setSource] = useState<TravelSource>("sample");
  const [message, setMessage] = useState("Searching hotels…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelected(null);
    fetchHotels({ city, checkin, nights, adults: guests })
      .then((data) => {
        if (cancelled) return;
        setHotels(data.hotels || []);
        setSource(data.source);
        setMessage(data.message || (data.source === "live" ? "Live hotel results" : "Sample hotel data"));
      })
      .catch((err) => {
        if (cancelled) return;
        setHotels([]);
        setSource("error");
        setError(err instanceof Error ? err.message : "Hotel search failed");
        setMessage("Could not reach hotel search.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, checkin, nights, guests]);

  const results = useMemo(() => {
    let list = hotels;
    if (minStars > 0) list = list.filter((h) => h.stars >= minStars);
    return [...list].sort((a, b) => a.pricePerNight - b.pricePerNight);
  }, [hotels, minStars]);

  function continueBook() {
    if (!selected) return;
    const hotel = hotels.find((h) => h.id === selected);
    if (!hotel) return;
    rememberHotel(hotel);
    navigate(`/hotels/book?id=${selected}&checkin=${checkin}&nights=${nights}&guests=${guests}`);
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Select stay</span>
        <h1>Hotels in {cityName(city)}</h1>
        <p>
          {checkin ? `Check-in ${checkin}` : "Flexible"} · {nights} night{nights === "1" ? "" : "s"} · {guests}{" "}
          guest{guests === "1" ? "" : "s"} · {formatPiUsdRate()}
        </p>
        {source === "error" && message ? (
          <p className="sample-banner mt-065">
            <span className="badge badge-sample">Error</span>
            {message}
          </p>
        ) : null}
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
            <legend>Minimum stars</legend>
            {[0, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name="stars"
                  checked={minStars === n}
                  onChange={() => setMinStars(n)}
                />
                {n === 0 ? "Any" : `${n}+`}
              </label>
            ))}
          </fieldset>
          <Link to="/hotels" className="btn-text">
            ← Edit search
          </Link>
        </aside>

        <div>
          {loading ? (
            <div className="empty panel">
              <p>Searching hotels…</p>
            </div>
          ) : error ? (
            <div className="empty panel">
              <p className="error-text">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty panel">
              <p>No hotels for this search. Try Goa, Mumbai, Bengaluru, or Delhi.</p>
            </div>
          ) : (
            <div className="result-list">
              {results.map((h) => (
                <article
                  key={h.id}
                  className={`result-card hotel-card${selected === h.id ? " selected" : ""}`}
                >
                  <img src={h.image} alt="" loading="lazy" />
                  <div className="result-main">
                    <h3>{h.name}</h3>
                    <div className="result-meta">
                      <span className="stars">{"★".repeat(Math.max(1, Math.min(5, h.stars)))}</span>
                      <span>{h.area}</span>
                      <span>{h.rating.toFixed(1)} rating</span>
                    </div>
                    <p className="mt-045 ink-soft text-092">
                      {h.description}
                    </p>
                  </div>
                  <div className="result-price">
                    <div className="per">per night</div>
                    <div className="amount">{formatINR(h.pricePerNight)}</div>
                    <PiGcvPrice inr={h.pricePerNight} />
                    <button
                      type="button"
                      className="btn btn-sea mt-055"
                      onClick={() => setSelected(h.id)}
                    >
                      {selected === h.id ? "Selected" : "Select"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="btn-row btn-row-end mt-125">
            <button className="btn btn-primary" disabled={!selected} onClick={continueBook}>
              Continue to book
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
