import { flights as sampleFlights, hotels as sampleHotels, type Flight, type Hotel } from "../data/mock";

export type TravelSource = "live" | "sample" | "error";

export type FlightSearchResponse = {
  source: TravelSource;
  message?: string;
  piRate?: string;
  flights: Flight[];
};

export type HotelSearchResponse = {
  source: TravelSource;
  message?: string;
  piRate?: string;
  hotels: Hotel[];
};

const FLIGHT_KEY = "shubham-selected-flight";
const HOTEL_KEY = "shubham-selected-hotel";
const PI_RATE = "1 Pi = $314159";

function sampleFlightResponse(from: string, to: string): FlightSearchResponse {
  const origin = from.toUpperCase();
  const dest = to.toUpperCase();
  const matched = sampleFlights.filter((f) => f.from === origin && f.to === dest);
  return {
    source: "sample",
    message:
      "Sample flight data only. Live Amadeus search is disabled on this public app to prevent unauthenticated use of operator API credentials.",
    piRate: PI_RATE,
    flights: matched,
  };
}

function sampleHotelResponse(city: string): HotelSearchResponse {
  const code = city.toUpperCase();
  const matched = sampleHotels.filter((h) => h.city === code);
  return {
    source: "sample",
    message:
      "Sample hotel data only. Live Amadeus search is disabled on this public app to prevent unauthenticated use of operator API credentials.",
    piRate: PI_RATE,
    hotels: matched.length ? matched : sampleHotels.slice(0, 2).map((h) => ({ ...h, city: code })),
  };
}

/** POST so browsers always send Origin (required by the API origin guard). */
async function postJson<T>(url: string, body: Record<string, string | number>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function fetchFlights(opts: {
  from: string;
  to: string;
  date: string;
  adults: string | number;
}): Promise<FlightSearchResponse> {
  try {
    return await postJson("/api/flights", {
      from: opts.from,
      to: opts.to,
      date: opts.date,
      adults: Number(opts.adults || 1),
    });
  } catch {
    // Published static host may not mount Express — keep demo usable.
    return sampleFlightResponse(opts.from, opts.to);
  }
}

export async function fetchHotels(opts: {
  city: string;
  checkin: string;
  nights: string | number;
  adults: string | number;
}): Promise<HotelSearchResponse> {
  try {
    return await postJson("/api/hotels", {
      city: opts.city,
      checkin: opts.checkin,
      nights: Number(opts.nights || 3),
      adults: Number(opts.adults || 2),
    });
  } catch {
    return sampleHotelResponse(opts.city);
  }
}

export function rememberFlight(flight: Flight) {
  sessionStorage.setItem(FLIGHT_KEY, JSON.stringify(flight));
}

export function recallFlight(id: string): Flight | null {
  try {
    const raw = sessionStorage.getItem(FLIGHT_KEY);
    if (!raw) return null;
    const flight = JSON.parse(raw) as Flight;
    return flight.id === id ? flight : null;
  } catch {
    return null;
  }
}

export function rememberHotel(hotel: Hotel) {
  sessionStorage.setItem(HOTEL_KEY, JSON.stringify(hotel));
}

export function recallHotel(id: string): Hotel | null {
  try {
    const raw = sessionStorage.getItem(HOTEL_KEY);
    if (!raw) return null;
    const hotel = JSON.parse(raw) as Hotel;
    return hotel.id === id ? hotel : null;
  } catch {
    return null;
  }
}
