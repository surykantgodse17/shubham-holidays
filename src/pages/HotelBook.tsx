import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { cityName, formatINR, hotels } from "../data/mock";
import { setCart } from "../lib/storage";
import { Steps } from "../components/Steps";

export function HotelBook() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get("id") ?? "";
  const checkin = params.get("checkin") ?? "";
  const nights = Number(params.get("nights") ?? "3");
  const guests = params.get("guests") ?? "2";
  const hotel = hotels.find((h) => h.id === id);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [requests, setRequests] = useState("");

  if (!hotel) {
    return (
      <div className="page shell empty">
        <p>Hotel not found.</p>
        <Link to="/hotels" className="btn btn-sea">
          Back to search
        </Link>
      </div>
    );
  }

  const total = hotel.pricePerNight * Math.max(1, nights);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCart({
      kind: "hotel",
      id: hotel!.id,
      title: hotel!.name,
      subtitle: `${cityName(hotel!.city)} · ${checkin || "Flexible"} · ${nights} night${nights === 1 ? "" : "s"}`,
      amount: total,
      meta: {
        guests,
        nights: String(nights),
        guest: name.trim(),
        email: email.trim(),
        requests: requests.trim(),
      },
    });
    navigate("/checkout");
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Guest details</span>
        <h1>Book your stay</h1>
        <Steps
          items={[
            { label: "Search", state: "done" },
            { label: "Select", state: "done" },
            { label: "Book", state: "active" },
            { label: "Pay", state: "todo" },
          ]}
        />
      </div>

      <div className="shell book-layout">
        <form className="panel" onSubmit={onSubmit}>
          <h2>Guest</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="name">Lead guest name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="requests">Special requests</label>
              <textarea
                id="requests"
                value={requests}
                onChange={(e) => setRequests(e.target.value)}
                placeholder="Late check-in, twin beds, quiet floor…"
              />
            </div>
          </div>
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary">
              Continue to payment
            </button>
            <Link
              to={`/hotels/results?city=${hotel.city}&checkin=${checkin}&nights=${nights}&guests=${guests}`}
              className="btn btn-ghost"
            >
              Change hotel
            </Link>
          </div>
        </form>

        <aside className="panel">
          <h2>Stay summary</h2>
          <img
            src={hotel.image}
            alt=""
            style={{ borderRadius: "var(--radius-sm)", marginBottom: "1rem", maxHeight: 160, width: "100%", objectFit: "cover" }}
          />
          <div className="summary-row">
            <span>Hotel</span>
            <span>{hotel.name}</span>
          </div>
          <div className="summary-row">
            <span>Location</span>
            <span>
              {hotel.area}, {cityName(hotel.city)}
            </span>
          </div>
          <div className="summary-row">
            <span>Nights</span>
            <span>{nights}</span>
          </div>
          <div className="summary-row">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
