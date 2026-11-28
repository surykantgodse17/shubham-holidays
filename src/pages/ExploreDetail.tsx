import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findBookablePackage, formatINR } from "../data/mock";
import { PiGcvPrice } from "../components/PiGcvPrice";
import { setCart } from "../lib/storage";

export function ExploreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = id ? findBookablePackage(id) : null;
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
        <Link to="/explore" className="btn-text inline-block mt-125">
          ← All listings
        </Link>

        <div className="detail-hero">
          <img src={listing.image} alt="" />
          <div className="detail-hero-overlay">
            <span className="badge badge-amber">{listing.type}</span>
            <h1 className="mt-05">{listing.title}</h1>
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

        <div className="book-layout mt-15">
          <div className="panel">
            <h2>About</h2>
            <p className="ink-soft line-1-65">{listing.description}</p>
            {listing.id.startsWith("intl-") ? (
              <p className="ink-soft line-1-65 mt-085">
                Book in-app and pay with Pi at checkout. Sample tour inventory for this demo.
              </p>
            ) : (
              <p className="sample-banner">
                <span className="badge badge-sample">Sample listing</span>
                Partner and experience inventory is mocked for this demo.
              </p>
            )}
          </div>

          <form className="panel" onSubmit={onBook}>
            <h2>Book</h2>
            <div className="summary-row">
              <span>From</span>
              <span className="font-display-strong">
                {formatINR(listing.price)}
              </span>
            </div>
            <PiGcvPrice inr={listing.price} className="pi-gcv-price pi-gcv-price--end" />
            <div className="form-grid mt-1">
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
            <button type="submit" className="btn btn-primary btn-block mt-11">
              Continue to payment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
