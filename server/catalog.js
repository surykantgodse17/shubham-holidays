/**
 * Server catalog — only source of truth for order pricing.
 * Clients send product ids + quantities; never a raw amount or π value.
 * Flow: catalog INR → USD (fixed FX) → π via GCV (USD / 314159).
 */

import { catalogInrToUsd } from "./pricing.js";

const FLIGHTS = [
  {
    id: "f1",
    airline: "IndiGo",
    flightNo: "6E 2145",
    from: "DEL",
    to: "GOI",
    price: 4890,
    cabin: "Economy",
  },
];

const HOTELS = [
  { id: "h1", name: "Palm Grove Resort", city: "GOI", pricePerNight: 7800 },
  { id: "h2", name: "Fort View Heritage", city: "GOI", pricePerNight: 12400 },
  { id: "h3", name: "Skyline Marine Drive", city: "BOM", pricePerNight: 15900 },
  { id: "h4", name: "Garden Courtyard Inn", city: "BLR", pricePerNight: 6200 },
  { id: "h5", name: "Ridge House Manali", city: "DEL", pricePerNight: 4100 },
  { id: "h-del", name: "Connaught Place Suites", city: "DEL", pricePerNight: 9200 },
];

const LISTINGS = [
  { id: "l1", title: "Kerala Backwaters Escape", type: "Package", price: 28900 },
  { id: "l2", title: "Himalayan Dawn Trek", type: "Experience", price: 6400 },
  { id: "l3", title: "Goa Culinary Trail", type: "Partner", price: 3200 },
  { id: "l4", title: "Rajasthan Fort Circuit", type: "Package", price: 42500 },
  { id: "l5", title: "Andaman Reef Snorkel", type: "Experience", price: 4800 },
  { id: "l6", title: "Mumbai Night Food Walk", type: "Partner", price: 2100 },
];

export function getFlight(id) {
  return FLIGHTS.find((f) => f.id === id) || null;
}

export function getHotel(id) {
  return HOTELS.find((h) => h.id === id) || null;
}

export function getListing(id) {
  return LISTINGS.find((l) => l.id === id) || null;
}

function withUsd(row) {
  const amountUsd = catalogInrToUsd(row.amountInr);
  return { ...row, amountUsd };
}

/**
 * @param {{ kind: string, productId: string, guests?: number, nights?: number }} input
 */
export function priceFromCatalog(input) {
  const kind = String(input.kind || "").trim().toLowerCase();
  const productId = String(input.productId || input.id || "").trim();
  const guests = Math.min(6, Math.max(1, Number(input.guests) || 1));
  const nights = Math.min(14, Math.max(1, Number(input.nights) || 1));

  if (!productId) {
    const err = new Error("Missing product id.");
    err.status = 400;
    throw err;
  }

  if (kind === "flight") {
    const flight = getFlight(productId);
    if (!flight) {
      const err = new Error("Unknown flight.");
      err.status = 404;
      throw err;
    }
    return withUsd({
      kind: "flight",
      productId: flight.id,
      title: `${flight.airline} ${flight.flightNo}`,
      amountInr: flight.price * guests,
      guests,
      nights: 1,
    });
  }

  if (kind === "hotel") {
    const hotel = getHotel(productId);
    if (!hotel) {
      const err = new Error("Unknown hotel.");
      err.status = 404;
      throw err;
    }
    return withUsd({
      kind: "hotel",
      productId: hotel.id,
      title: hotel.name,
      amountInr: hotel.pricePerNight * nights,
      guests,
      nights,
    });
  }

  if (kind === "listing") {
    const listing = getListing(productId);
    if (!listing) {
      const err = new Error("Unknown listing.");
      err.status = 404;
      throw err;
    }
    const amountInr =
      listing.type === "Package" ? listing.price : listing.price * guests;
    return withUsd({
      kind: "listing",
      productId: listing.id,
      title: listing.title,
      amountInr,
      guests,
      nights: 1,
    });
  }

  const err = new Error("Unknown product kind.");
  err.status = 400;
  throw err;
}

export const SAMPLE_FLIGHT = FLIGHTS[0];
export const SAMPLE_HOTELS = HOTELS.map((h) => ({
  ...h,
  area: h.city,
  stars: 4,
  rating: 4.5,
  amenities: [],
  image: "",
  description: "Sample stay.",
}));
