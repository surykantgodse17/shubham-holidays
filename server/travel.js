/** Amadeus self-service (test by default). Secrets: AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET */

const AMADEUS_HOST =
  String(process.env.AMADEUS_HOST || "https://test.api.amadeus.com").replace(/\/$/, "");
const INR_PER_USD = 83;

const AIRLINES = {
  "6E": "IndiGo",
  AI: "Air India",
  UK: "Vistara",
  QP: "Akasa Air",
  SG: "SpiceJet",
  EK: "Emirates",
  SQ: "Singapore Airlines",
  TG: "Thai Airways",
  BA: "British Airways",
  LH: "Lufthansa",
  AF: "Air France",
  QR: "Qatar Airways",
  EY: "Etihad",
};

const SAMPLE_FLIGHT = {
  id: "f1",
  airline: "IndiGo",
  flightNo: "6E 2145",
  from: "DEL",
  to: "GOI",
  depart: "06:40",
  arrive: "09:05",
  duration: "2h 25m",
  stops: 0,
  price: 4890,
  cabin: "Economy",
};

const SAMPLE_HOTELS = [
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
    description: "Sample stay near Candolim (shown when Amadeus secrets are not set).",
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
    description: "Sample Mumbai stay (shown when Amadeus secrets are not set).",
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
    description: "Sample Bengaluru stay (shown when Amadeus secrets are not set).",
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
    description: "Sample Delhi stay (shown when Amadeus secrets are not set).",
  },
];

let cachedToken = null;
let cachedTokenExpires = 0;

function hasAmadeus() {
  return Boolean(process.env.AMADEUS_CLIENT_ID?.trim() && process.env.AMADEUS_CLIENT_SECRET?.trim());
}

function defaultDate(daysAhead = 14) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate, nights) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + nights);
  return d.toISOString().slice(0, 10);
}

function toInr(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  const cur = String(currency || "USD").toUpperCase();
  if (cur === "INR") return Math.round(n);
  if (cur === "EUR") return Math.round(n * 90);
  return Math.round(n * INR_PER_USD);
}

function parseIsoTime(iso) {
  if (!iso) return "--:--";
  const m = String(iso).match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "--:--";
}

function formatDuration(isoDuration) {
  if (!isoDuration) return "";
  const h = isoDuration.match(/(\d+)H/);
  const m = isoDuration.match(/(\d+)M/);
  const hours = h ? Number(h[1]) : 0;
  const mins = m ? Number(m[1]) : 0;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  if (mins) return `${mins}m`;
  return isoDuration;
}

async function getAmadeusToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpires - 30_000) return cachedToken;

  const id = process.env.AMADEUS_CLIENT_ID.trim();
  const secret = process.env.AMADEUS_CLIENT_SECRET.trim();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  });

  const res = await fetch(`${AMADEUS_HOST}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus auth failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  cachedTokenExpires = Date.now() + Number(data.expires_in || 1799) * 1000;
  return cachedToken;
}

async function amadeusGet(pathname, query) {
  const token = await getAmadeusToken();
  const url = new URL(`${AMADEUS_HOST}${pathname}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus ${pathname} failed (${res.status}): ${text.slice(0, 240)}`);
  }
  return res.json();
}

function mapFlightOffer(offer, index) {
  const itinerary = offer.itineraries?.[0];
  const segments = itinerary?.segments || [];
  const first = segments[0];
  const last = segments[segments.length - 1];
  const carrier = first?.carrierCode || "XX";
  const number = first?.number || String(index + 1);
  const traveler = offer.travelerPricings?.[0];
  const fare = offer.price?.grandTotal ?? traveler?.price?.total;
  const currency = offer.price?.currency || traveler?.price?.currency || "USD";
  const cabin =
    traveler?.fareDetailsBySegment?.[0]?.cabin === "BUSINESS"
      ? "Business"
      : traveler?.fareDetailsBySegment?.[0]?.cabin === "PREMIUM_ECONOMY"
        ? "Premium Economy"
        : "Economy";

  return {
    id: offer.id || `live-f-${index}`,
    airline: AIRLINES[carrier] || carrier,
    flightNo: `${carrier} ${number}`,
    from: first?.departure?.iataCode || "",
    to: last?.arrival?.iataCode || "",
    depart: parseIsoTime(first?.departure?.at),
    arrive: parseIsoTime(last?.arrival?.at),
    duration: formatDuration(itinerary?.duration),
    stops: Math.max(0, segments.length - 1),
    price: toInr(fare, currency),
    cabin,
  };
}

export async function searchFlights({ from, to, date, adults }) {
  const departDate = date || defaultDate(14);

  if (!hasAmadeus()) {
    const flights =
      from === SAMPLE_FLIGHT.from && to === SAMPLE_FLIGHT.to
        ? [SAMPLE_FLIGHT]
        : [];
    return {
      source: "sample",
      message:
        "Live flight search needs AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET (Amadeus self-service test keys). Showing sample data until those are set.",
      piRate: "1 Pi = $314159",
      flights,
    };
  }

  const data = await amadeusGet("/v2/shopping/flight-offers", {
    originLocationCode: from,
    destinationLocationCode: to,
    departureDate: departDate,
    adults,
    currencyCode: "INR",
    max: 20,
  });

  const flights = (data.data || []).map(mapFlightOffer).filter((f) => f.from && f.to && f.price > 0);

  return {
    source: "live",
    message: "Live results from Amadeus Flight Offers Search (test API).",
    piRate: "1 Pi = $314159",
    flights,
  };
}

export async function searchHotels({ city, checkin, nights, adults }) {
  const checkInDate = checkin || defaultDate(21);
  const checkOutDate = addDays(checkInDate, nights);

  if (!hasAmadeus()) {
    const hotels = SAMPLE_HOTELS.filter((h) => h.city === city);
    return {
      source: "sample",
      message:
        "Live hotel search needs AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET. Showing sample stays until those are set.",
      piRate: "1 Pi = $314159",
      hotels: hotels.length ? hotels : SAMPLE_HOTELS.slice(0, 2).map((h) => ({ ...h, city })),
    };
  }

  const list = await amadeusGet("/v1/reference-data/locations/hotels/by-city", {
    cityCode: city,
  });
  const hotelIds = (list.data || [])
    .slice(0, 15)
    .map((h) => h.hotelId)
    .filter(Boolean);

  if (hotelIds.length === 0) {
    return {
      source: "live",
      message: "No hotels found for this city in Amadeus.",
      piRate: "1 Pi = $314159",
      hotels: [],
    };
  }

  const offers = await amadeusGet("/v3/shopping/hotel-offers", {
    hotelIds: hotelIds.join(","),
    adults,
    checkInDate,
    checkOutDate,
    currency: "INR",
  });

  const hotels = (offers.data || []).map((entry, index) => {
    const hotel = entry.hotel || {};
    const offer = entry.offers?.[0];
    const total = offer?.price?.total;
    const currency = offer?.price?.currency || "INR";
    const perNight = Math.max(1, Math.round(toInr(total, currency) / Math.max(1, nights)));
    return {
      id: hotel.hotelId || offer?.id || `live-h-${index}`,
      name: hotel.name || "Hotel",
      city,
      area: hotel.address?.lines?.[0] || hotel.address?.cityName || city,
      stars: Number(hotel.rating) || 3,
      pricePerNight: perNight,
      rating: Number(hotel.rating) || 4,
      amenities: (hotel.amenities || []).slice(0, 4).map(String),
      image: `https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80`,
      description: offer?.room?.description?.text || "Live hotel offer from Amadeus.",
    };
  });

  return {
    source: "live",
    message: "Live results from Amadeus Hotel Search (test API).",
    piRate: "1 Pi = $314159",
    hotels,
  };
}
