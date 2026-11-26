/**
 * Travel search — sample data only on public routes.
 * Live Amadeus calls are disabled on this public app.
 */

import { SAMPLE_FLIGHT, getHotel } from "./catalog.js";

const SAMPLE_HOTEL_ROWS = [
  {
    id: "h1",
    name: "Palm Grove Resort",
    city: "GOI",
    area: "Candolim",
    stars: 4,
    pricePerNight: 7800,
    rating: 4.6,
    amenities: ["Pool", "Beach access", "Breakfast"],
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    description: "Sample stay near Candolim.",
  },
  {
    id: "h3",
    name: "Skyline Marine Drive",
    city: "BOM",
    area: "Marine Drive",
    stars: 5,
    pricePerNight: 15900,
    rating: 4.7,
    amenities: ["Sea view", "Gym", "Club lounge"],
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
    description: "Sample Mumbai stay.",
  },
  {
    id: "h4",
    name: "Garden Courtyard Inn",
    city: "BLR",
    area: "Indiranagar",
    stars: 4,
    pricePerNight: 6200,
    rating: 4.5,
    amenities: ["Garden", "Cafe", "Workspace"],
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80",
    description: "Sample Bengaluru stay.",
  },
  {
    id: "h-del",
    name: "Connaught Place Suites",
    city: "DEL",
    area: "Connaught Place",
    stars: 4,
    pricePerNight: 9200,
    rating: 4.4,
    amenities: ["Breakfast", "Airport transfer"],
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80",
    description: "Sample Delhi stay.",
  },
];

const ALLOWED_AIRPORTS = new Set(["DEL", "BOM", "BLR", "GOI", "MAA", "CCU", "DXB", "SIN", "BKK", "LON"]);

export function normalizeAirport(code, fallback) {
  const c = String(code || fallback).toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
  return ALLOWED_AIRPORTS.has(c) ? c : fallback;
}

export async function searchFlights({ from, to, date: _date, adults: _adults }) {
  const origin = normalizeAirport(from, "DEL");
  const dest = normalizeAirport(to, "GOI");
  const flights =
    origin === SAMPLE_FLIGHT.from && dest === SAMPLE_FLIGHT.to
      ? [
          {
            id: SAMPLE_FLIGHT.id,
            airline: SAMPLE_FLIGHT.airline,
            flightNo: SAMPLE_FLIGHT.flightNo,
            from: SAMPLE_FLIGHT.from,
            to: SAMPLE_FLIGHT.to,
            depart: "06:40",
            arrive: "09:05",
            duration: "2h 25m",
            stops: 0,
            price: SAMPLE_FLIGHT.price,
            cabin: SAMPLE_FLIGHT.cabin,
          },
        ]
      : [];

  return {
    source: "sample",
    message:
      "Sample flight data only. Live Amadeus search is disabled on this public app to prevent unauthenticated use of operator API credentials.",
    piRate: "1 Pi = $314159",
    flights,
  };
}

export async function searchHotels({ city, checkin: _checkin, nights: _nights, adults: _adults }) {
  const code = normalizeAirport(city, "GOI");
  const hotels = SAMPLE_HOTEL_ROWS.filter((h) => h.city === code);
  // Ensure catalog-priced hotels stay findable by id even if city filter empty.
  const priced = hotels.length
    ? hotels
    : SAMPLE_HOTEL_ROWS.slice(0, 2).map((h) => ({ ...h, city: code }));
  for (const h of priced) {
    if (!getHotel(h.id)) {
      /* catalog is source of truth for checkout; search can show extras */
    }
  }

  return {
    source: "sample",
    message:
      "Sample hotel data only. Live Amadeus search is disabled on this public app to prevent unauthenticated use of operator API credentials.",
    piRate: "1 Pi = $314159",
    hotels: priced,
  };
}
