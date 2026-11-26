import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatINR, listings } from "../data/mock";
import { setCart } from "../lib/storage";

export function ExploreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = listings.find((l) => l.id === id);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!listing) {
    return (
      <div className="page shell empty">
        <p>Listing not found.</p>
        <Link to="/explore" className="btn btn-sea">
          Back to explore
        </Link>
      </div>
    );
  }

  function onBook(e: FormEvent) {
    e.preventDefault();
    const g = Math.max(1, Number(guests));
    setCart({
      kind: "listing",
      id: listing!.id,
      title: listing!.title,
      subtitle: `${listing!.place} · ${date} · ${listing!.type}`,
      amount: listing!.price * (listing!.type === "Package" ? 1 : g),
      meta: {
        guests: String(g),
        guest: name.trim(),
        email: email.trim(),
        date,
      },
    });
    navigate("/checkout");
  }

  return (
    <div className="page">
      <div className="shell">
        <Link to="/explore" className="btn-text" style={{ display: "inline-block", marginTop: "1.25rem" }}>
          ← All listings
        </Link>

        <div className="detail-hero">
          <img src={listing.image} alt="" />
          <div className="detail-hero-overlay">
            <span className="badge badge-amber">{listing.type}</span>
            <h1 style={{ marginTop: "0.5rem" }}>{listing.title}</h1>
            <p>
              {listing.place} · {listing.duration}
            </p>
            <div className="chips">
              {listing.highlights.map((h) => (
                <span key={h} className="chip">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="book-layout" style={{ marginTop: "1.5rem" }}>
          <div className="panel">
            <h2>About</h2>
            <p style={{ color: "var(--ink-soft)", lineHeight: 1.65 }}>{listing.description}</p>
            <p className="sample-banner">
              <span className="badge badge-sample">Sample listing</span>
              Partner and experience inventory is mocked for this demo.
            </p>
          </div>

          <form className="panel" onSubmit={onBook}>
            <h2>Book</h2>
            <div className="summary-row">
              <span>From</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--sea-deep)" }}>
                {formatINR(listing.price)}
              </span>
            </div>
            <div className="form-grid" style={{ marginTop: "1rem" }}>
              <div className="field">
                <label htmlFor="date">Preferred date</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
              <div className="field full">
                <label htmlFor="name">Your name</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field full">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: "1.1rem", width: "100%" }}>
              Continue to payment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
