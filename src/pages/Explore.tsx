import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatINR, listings } from "../data/mock";
import { PiGcvPrice } from "../components/PiGcvPrice";

const types = ["All", "Package", "Experience", "Partner"] as const;

export function Explore() {
  const [filter, setFilter] = useState<(typeof types)[number]>("All");

  const items = useMemo(() => {
    if (filter === "All") return listings;
    return listings.filter((l) => l.type === filter);
  }, [filter]);

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Ecosystem</span>
        <h1>Packages, experiences & partners</h1>
        <p>Browse curated journeys and local listings — book in a few steps with sample inventory.</p>
      </div>

      <div className="shell mt-1">
        <div className="search-tabs" role="tablist" aria-label="Listing type">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={filter === t}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="listing-grid mt-125">
          {items.map((l) => (
            <Link key={l.id} to={`/explore/${l.id}`} className="listing-card">
              <img src={l.image} alt="" loading="lazy" />
              <div className="listing-body">
                <span className="listing-tag">{l.type}</span>
                <h3>{l.title}</h3>
                <p className="ink-soft text-092">
                  {l.place} · {l.duration}
                </p>
                <div className="listing-footer">
                  <div className="listing-price-block">
                    <strong className="listing-price-label">
                      {formatINR(l.price)}
                    </strong>
                    <PiGcvPrice inr={l.price} />
                  </div>
                  <span className="btn-text">View →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
