import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findBookablePackage, formatINR, getPackageServices } from "../data/mock";
import { PiGcvPrice } from "../components/PiGcvPrice";
import { setCart } from "../lib/storage";

export function ExploreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listing = useMemo(() => (id ? findBookablePackage(id) : null), [id]);
  const services = useMemo(() => (listing ? getPackageServices(listing) : []), [listing]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected(Object.fromEntries(services.map((s) => [s.id, true])));
  }, [id, services]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [guests, setGuests] = useState("2");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const activeServices = services.filter((s) => selected[s.id]);
  const customizedTotal = activeServices.reduce((sum, s) => sum + s.price, 0);
  const allSelected = services.length > 0 && activeServices.length === services.length;

  if (!listing) {
    return (
      <div className="page shell empty">
        <p>Package not found.</p>
        <Link to="/" className="btn btn-sea">
          Back home
        </Link>
      </div>
    );
  }

  function toggleService(serviceId: string) {
    setSelected((prev) => {
      const nextOn = !prev[serviceId];
      const next = { ...prev, [serviceId]: nextOn };
      const stillOn = services.some((s) => next[s.id]);
      if (!stillOn) return prev;
      return next;
    });
  }

  function onBook(e: FormEvent) {
    e.preventDefault();
    if (activeServices.length === 0) return;
    const g = Math.max(1, Number(guests));
    const serviceNames = activeServices.map((s) => s.name).join(", ");
    setCart({
      kind: "listing",
      id: listing!.id,
      title: listing!.title,
      subtitle: `${listing!.place} · ${date} · ${activeServices.length}/${services.length} services`,
      amount: customizedTotal * (listing!.type === "Package" ? 1 : g),
      meta: {
        guests: String(g),
        guest: name.trim(),
        email: email.trim(),
        date,
        services: serviceNames,
        fullPackage: allSelected ? "yes" : "no",
        catalogPrice: String(listing!.price),
      },
    });
    navigate("/checkout");
  }

  return (
    <div className="page">
      <div className="shell">
        <Link to="/" className="btn-text inline-block mt-125">
          ← Back home
        </Link>

        <div className="detail-hero">
          <img src={listing.image} alt="" />
          <div className="detail-hero-overlay">
            <span className="badge badge-amber">{listing.type}</span>
            <h1 className="mt-05">{listing.title}</h1>
            <p>
              {listing.place} · {listing.duration}
            </p>
          </div>
        </div>

        <div className="book-layout mt-15">
          <div className="panel">
            <h2>Package details</h2>
            <p className="ink-soft line-1-65">{listing.description}</p>
            <p className="ink-soft text-092 mt-085">
              Full package is {formatINR(listing.price)}. Uncheck services you do not want — the total updates.
            </p>

            <h3 className="service-list-title">Services</h3>
            <ul className="service-list">
              {services.map((s) => (
                <li key={s.id}>
                  <label className="service-row">
                    <input
                      type="checkbox"
                      checked={!!selected[s.id]}
                      onChange={() => toggleService(s.id)}
                    />
                    <span className="service-name">{s.name}</span>
                    <span className="service-price">{formatINR(s.price)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <form className="panel" onSubmit={onBook}>
            <h2>Book</h2>
            <div className="summary-row">
              <span>Full package</span>
              <span>{formatINR(listing.price)}</span>
            </div>
            <div className="summary-row">
              <span>Selected ({activeServices.length}/{services.length})</span>
              <span className="font-display-strong">{formatINR(customizedTotal)}</span>
            </div>
            <PiGcvPrice inr={customizedTotal} className="pi-gcv-price pi-gcv-price--end" />
            {!allSelected && (
              <p className="ink-muted text-085 mt-055">
                Custom selection — lower than full package price.
              </p>
            )}
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
            <button type="submit" className="btn btn-primary btn-block mt-11" disabled={activeServices.length === 0}>
              Continue to payment · {formatINR(customizedTotal)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
