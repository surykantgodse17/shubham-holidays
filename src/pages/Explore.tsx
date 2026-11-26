import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatINR, listings } from "../data/mock";

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

      <div className="shell" style={{ marginTop: "1rem" }}>
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

        <div className="listing-grid" style={{ marginTop: "1.25rem" }}>
          {items.map((l) => (
            <Link key={l.id} to={`/explore/${l.id}`} className="listing-card">
              <img src={l.image} alt="" loading="lazy" />
              <div className="listing-body">
                <span className="listing-tag">{l.type}</span>
                <h3>{l.title}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  {l.place} · {l.duration}
                </p>
                <div className="listing-footer">
                  <strong style={{ fontFamily: "var(--font-display)", color: "var(--sea-deep)" }}>
                    {formatINR(l.price)}
                  </strong>
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
