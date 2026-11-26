import type { Flight, Hotel } from "../data/mock";

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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
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
  const q = new URLSearchParams({
    from: opts.from,
    to: opts.to,
    date: opts.date,
    adults: String(opts.adults || 1),
  });
  return getJson(`/api/flights?${q}`);
}

export async function fetchHotels(opts: {
  city: string;
  checkin: string;
  nights: string | number;
  adults: string | number;
}): Promise<HotelSearchResponse> {
  const q = new URLSearchParams({
    city: opts.city,
    checkin: opts.checkin,
    nights: String(opts.nights || 3),
    adults: String(opts.adults || 2),
  });
  return getJson(`/api/hotels?${q}`);
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
