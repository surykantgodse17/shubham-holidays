import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { cityName, flights, formatINR } from "../data/mock";
import { formatPiUsdRate } from "../lib/pi";
import { recallFlight } from "../lib/travelApi";
import { setCart } from "../lib/storage";
import { PiGcvPrice } from "../components/PiGcvPrice";
import { Steps } from "../components/Steps";

export function FlightBook() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get("id") ?? "";
  const date = params.get("date") ?? "";
  const guests = Number(params.get("guests") ?? "1");
  const flight = useMemo(() => recallFlight(id) || flights.find((f) => f.id === id) || null, [id]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  if (!flight) {
    return (
      <div className="page shell empty">
        <p>Flight not found.</p>
        <Link to="/flights" className="btn btn-sea">
          Back to search
        </Link>
      </div>
    );
  }

  const total = flight.price * Math.max(1, guests);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setCart({
      kind: "flight",
      id: flight!.id,
      title: `${flight!.airline} ${flight!.flightNo}`,
      subtitle: `${cityName(flight!.from)} → ${cityName(flight!.to)} · ${date || "Flexible"}`,
      amount: total,
      meta: {
        guests: String(guests),
        cabin: flight!.cabin,
        passenger: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
    });
    navigate("/checkout");
  }

  return (
    <div className="page">
      <div className="shell page-hero">
        <span className="eyebrow">Passenger details</span>
        <h1>Book your flight</h1>
        <p>{formatPiUsdRate()}</p>
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
          <h2>Traveler</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="name">Full name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary">
              Continue to payment
            </button>
            <Link to={`/flights/results?from=${flight.from}&to=${flight.to}&date=${date}&guests=${guests}`} className="btn btn-ghost">
              Change flight
            </Link>
          </div>
        </form>

        <aside className="panel">
          <h2>Trip summary</h2>
          <div className="summary-row">
            <span>Flight</span>
            <span>
              {flight.airline} {flight.flightNo}
            </span>
          </div>
          <div className="summary-row">
            <span>Route</span>
            <span>
              {cityName(flight.from)} → {cityName(flight.to)}
            </span>
          </div>
          <div className="summary-row">
            <span>Time</span>
            <span>
              {flight.depart} – {flight.arrive}
            </span>
          </div>
          <div className="summary-row">
            <span>Travelers</span>
            <span>{guests}</span>
          </div>
          <div className="summary-row">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          <PiGcvPrice inr={total} className="pi-gcv-price pi-gcv-price--end" />
        </aside>
      </div>
    </div>
  );
}
