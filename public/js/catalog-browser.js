(function () {
function usdToPi(usd) {
  const PI_USD_VALUE = 314159;
  const cents = Math.round(Number(usd) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.round((cents * 1e7) / (PI_USD_VALUE * 100)) / 1e7;
}

const FLIGHT_CITIES = ["Mumbai", "Delhi", "Goa", "Dubai", "Bangkok", "London"];
const HOTEL_CITIES = ["Goa", "Manali", "Mumbai", "Dubai", "Jaipur"];

const CITY_META = {
  Mumbai: { code: "BOM", country: "India" },
  Delhi: { code: "DEL", country: "India" },
  Goa: { code: "GOI", country: "India" },
  Dubai: { code: "DXB", country: "UAE" },
  Bangkok: { code: "BKK", country: "Thailand" },
  London: { code: "LHR", country: "UK" },
  Manali: { code: "KUU", country: "India" },
  Jaipur: { code: "JAI", country: "India" },
};

const AIRLINES = [
  { name: "IndiGo", code: "6E", delta: 0, depart: 6 * 60 + 20 },
  { name: "Air India", code: "AI", delta: 22, depart: 9 * 60 + 45 },
  { name: "SpiceJet", code: "SG", delta: -8, depart: 13 * 60 + 10 },
  { name: "Emirates", code: "EK", delta: 74, depart: 19 * 60 + 5 },
];

const ROUTES = {
  "Mumbai|Delhi": { minutes: 130, base: 96 },
  "Mumbai|Goa": { minutes: 80, base: 74 },
  "Mumbai|Dubai": { minutes: 200, base: 214 },
  "Mumbai|Bangkok": { minutes: 260, base: 188 },
  "Mumbai|London": { minutes: 570, base: 648 },
  "Delhi|Goa": { minutes: 165, base: 112 },
  "Delhi|Dubai": { minutes: 230, base: 228 },
  "Delhi|Bangkok": { minutes: 250, base: 196 },
  "Delhi|London": { minutes: 540, base: 620 },
  "Goa|Dubai": { minutes: 240, base: 246 },
  "Goa|Bangkok": { minutes: 280, base: 268 },
  "Goa|London": { minutes: 620, base: 734 },
  "Dubai|Bangkok": { minutes: 360, base: 206 },
  "Dubai|London": { minutes: 450, base: 428 },
  "Bangkok|London": { minutes: 680, base: 692 },
};

const HOTELS = [
  {
    id: "goa-sea-breeze",
    city: "Goa",
    name: "Sea Breeze Resort",
    rating: 4.6,
    tagline: "Beachfront stay in Candolim",
    facilities: ["WiFi", "Breakfast", "Pool", "AC"],
    pricePerNight: 58,
    image:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "goa-palolem-inn",
    city: "Goa",
    name: "Palolem Coconut Inn",
    rating: 4.3,
    tagline: "Quiet rooms near Palolem beach",
    facilities: ["WiFi", "Breakfast", "AC"],
    pricePerNight: 42,
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "goa-panjim-suites",
    city: "Goa",
    name: "Panjim City Suites",
    rating: 4.1,
    tagline: "Central Panjim, walk to the riverfront",
    facilities: ["WiFi", "AC"],
    pricePerNight: 34,
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "manali-snow-peak",
    city: "Manali",
    name: "Snow Peak Lodge",
    rating: 4.7,
    tagline: "Mountain view lodge above Old Manali",
    facilities: ["WiFi", "Breakfast", "Pool", "AC"],
    pricePerNight: 64,
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "manali-mall-road",
    city: "Manali",
    name: "Mall Road Retreat",
    rating: 4.4,
    tagline: "Steps from Mall Road cafes",
    facilities: ["WiFi", "Breakfast", "AC"],
    pricePerNight: 48,
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "manali-cedar",
    city: "Manali",
    name: "Cedar Pine Homestay",
    rating: 4.2,
    tagline: "Warm wooden rooms among pine trees",
    facilities: ["WiFi", "Breakfast"],
    pricePerNight: 36,
    image:
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "mumbai-marine",
    city: "Mumbai",
    name: "Marine Drive Grand",
    rating: 4.5,
    tagline: "Queen's Necklace skyline from your room",
    facilities: ["WiFi", "Breakfast", "Pool", "AC"],
    pricePerNight: 88,
    image:
      "https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "mumbai-bandra",
    city: "Mumbai",
    name: "Bandra Boutique Hotel",
    rating: 4.2,
    tagline: "Bandra West, close to cafes and the sea link",
    facilities: ["WiFi", "Breakfast", "AC"],
    pricePerNight: 62,
    image:
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "mumbai-cst",
    city: "Mumbai",
    name: "CST Transit Inn",
    rating: 3.9,
    tagline: "Practical stay near CSMT station",
    facilities: ["WiFi", "AC"],
    pricePerNight: 39,
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "dubai-marina-pearl",
    city: "Dubai",
    name: "Marina Pearl Hotel",
    rating: 4.8,
    tagline: "Marina walk and downtown lights",
    facilities: ["WiFi", "Breakfast", "Pool", "AC"],
    pricePerNight: 164,
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "dubai-creek",
    city: "Dubai",
    name: "Creek View Palace",
    rating: 4.6,
    tagline: "Classic Dubai across the creek",
    facilities: ["WiFi", "Breakfast", "Pool", "AC"],
    pricePerNight: 128,
    image:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "dubai-deira",
    city: "Dubai",
    name: "Deira Comfort Stay",
    rating: 4.1,
    tagline: "Simple comfort near the gold souk",
    facilities: ["WiFi", "AC"],
    pricePerNight: 79,
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "jaipur-haveli",
    city: "Jaipur",
    name: "Pink City Haveli",
    rating: 4.7,
    tagline: "Courtyard haveli in the old city",
    facilities: ["WiFi", "Breakfast", "Pool", "AC"],
    pricePerNight: 54,
    image:
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "jaipur-amber",
    city: "Jaipur",
    name: "Amber Fort View",
    rating: 4.5,
    tagline: "Sunrise views toward Amber Fort",
    facilities: ["WiFi", "Breakfast", "AC"],
    pricePerNight: 46,
    image:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "jaipur-johari",
    city: "Jaipur",
    name: "Johari Bazaar Inn",
    rating: 4.0,
    tagline: "Stay inside the bazaar lanes",
    facilities: ["WiFi", "AC"],
    pricePerNight: 31,
    image:
      "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&w=1200&q=70",
  },
];

const COMBOS = [
  {
    id: "goa-20",
    title: "Goa Flight + Hotel Combo",
    price: 99,
    from: "Mumbai",
    to: "Goa",
    airline: "IndiGo",
    hotelId: "goa-sea-breeze",
    nights: 1,
    roomType: "Deluxe",
    label: "Promo fare",
  },
  {
    id: "dubai-50",
    title: "Dubai Package",
    price: 249,
    from: "Mumbai",
    to: "Dubai",
    airline: "Emirates",
    hotelId: "dubai-marina-pearl",
    nights: 1,
    roomType: "Deluxe",
    label: "Promo fare",
  },
];

const ROOM_TYPES = {
  Deluxe: 1,
  Suite: 1.75,
};

function money(n) {
  return Math.round(Number(n) * 100) / 100;
}

function hash(str) {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function routeOf(a, b) {
  return ROUTES[`${a}|${b}`] || ROUTES[`${b}|${a}`] || null;
}

function assertCity(name, list, label) {
  if (!list.includes(name)) {
    const error = new Error(`Choose a valid ${label}.`);
    error.status = 400;
    throw error;
  }
}

function parseDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    const error = new Error(`Enter a valid ${field}.`);
    error.status = 400;
    throw error;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) {
    const error = new Error(`Enter a valid ${field}.`);
    error.status = 400;
    throw error;
  }
  const today = new Date();
  const min = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1);
  const max = min + 366 * 86400000;
  if (time < min || time > max) {
    const error = new Error(`${field} must be within the next year.`);
    error.status = 400;
    throw error;
  }
  return value;
}

function nightsBetween(checkIn, checkOut) {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function clock(minutes) {
  const dayOffset = Math.floor(minutes / (24 * 60));
  const mins = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const am = h < 12;
  const h12 = h % 12 || 12;
  return {
    label: `${h12}:${String(m).padStart(2, "0")} ${am ? "AM" : "PM"}`,
    dayOffset,
  };
}

function stopsFor(airline, from, to) {
  const domestic =
    CITY_META[from].country === "India" && CITY_META[to].country === "India";
  if (domestic) return airline === "Emirates" ? 1 : 0;
  if (from === "Dubai" || to === "Dubai") return 0;
  return airline === "SpiceJet" ? 1 : 0;
}

function legPrice(airline, from, to, date) {
  const route = routeOf(from, to);
  const bump = hash(`${date}|${airline.name}|${from}|${to}`) % 16;
  return money(Math.max(40, route.base + airline.delta + bump));
}

function buildLeg(airline, from, to, date) {
  const route = routeOf(from, to);
  const stops = stopsFor(airline.name, from, to);
  const bump = hash(`${date}|${airline.code}|${from}|${to}`) % 20;
  const departMinutes = airline.depart + bump;
  const durationMinutes = route.minutes + stops * 110;
  const arrive = clock(departMinutes + durationMinutes);
  const depart = clock(departMinutes);
  return {
    from,
    to,
    fromCode: CITY_META[from].code,
    toCode: CITY_META[to].code,
    date,
    depart: depart.label,
    arrive: arrive.label,
    nextDay: arrive.dayOffset > depart.dayOffset,
    durationMinutes,
    durationText: formatDuration(durationMinutes),
    stops,
    stopLabel: stops === 0 ? "Non-stop" : `${stops} stop`,
  };
}

function searchFlights(query) {
  const from = query.from;
  const to = query.to;
  assertCity(from, FLIGHT_CITIES, "from city");
  assertCity(to, FLIGHT_CITIES, "to city");
  if (from === to) {
    const error = new Error("From and To city must be different.");
    error.status = 400;
    throw error;
  }
  if (!routeOf(from, to)) {
    const error = new Error("No flights on this route yet.");
    error.status = 400;
    throw error;
  }
  const departureDate = parseDate(query.departureDate, "departure date");
  const returnDate = query.returnDate ? parseDate(query.returnDate, "return date") : null;
  if (returnDate && returnDate < departureDate) {
    const error = new Error("Return date must be on or after departure.");
    error.status = 400;
    throw error;
  }
  const passengers = Number(query.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6) {
    const error = new Error("Passengers must be between 1 and 6.");
    error.status = 400;
    throw error;
  }

  const trips = AIRLINES.map((airline) => {
    const outbound = buildLeg(airline, from, to, departureDate);
    const inbound = returnDate ? buildLeg(airline, to, from, returnDate) : null;
    const outPrice = legPrice(airline, from, to, departureDate);
    const inPrice = inbound ? legPrice(airline, to, from, returnDate) : 0;
    const pricePerPersonUsd = money(outPrice + (inbound ? inPrice * 0.95 : 0));
    const totalUsd = money(pricePerPersonUsd * passengers);
    const totalPi = usdToPi(totalUsd);
    return {
      id: `${airline.code}-${CITY_META[from].code}-${CITY_META[to].code}-${departureDate}-${returnDate || "ow"}`,
      airline: airline.name,
      airlineCode: airline.code,
      outbound,
      inbound,
      passengers,
      pricePerPersonUsd,
      pricePerPersonPi: usdToPi(pricePerPersonUsd),
      totalUsd,
      totalPi,
      totalPrice: totalPi,
      tripType: inbound ? "Round trip" : "One way",
    };
  }).sort((a, b) => a.totalPrice - b.totalPrice);

  return { from, to, departureDate, returnDate, passengers, trips };
}

function quoteFlight(body) {
  const result = searchFlights(body);
  const trip = result.trips.find((item) => item.id === body.flightId);
  if (!trip) {
    const error = new Error("That flight is no longer available. Search again.");
    error.status = 400;
    throw error;
  }
  return { ...result, trip };
}

function decorateHotel(hotel, nights, rooms) {
  const deluxeUsd = money(hotel.pricePerNight * nights * rooms);
  const suiteUsd = money(hotel.pricePerNight * ROOM_TYPES.Suite * nights * rooms);
  const suitePerNight = money(hotel.pricePerNight * ROOM_TYPES.Suite);
  return {
    ...hotel,
    pricePerNight: hotel.pricePerNight,
    pricePerNightPi: usdToPi(hotel.pricePerNight),
    suitePerNight,
    suitePerNightPi: usdToPi(suitePerNight),
    totalDeluxeUsd: deluxeUsd,
    totalSuiteUsd: suiteUsd,
    totalDeluxePi: usdToPi(deluxeUsd),
    totalSuitePi: usdToPi(suiteUsd),
    totalDeluxe: usdToPi(deluxeUsd),
    totalSuite: usdToPi(suiteUsd),
  };
}

function searchHotels(query) {
  const city = query.city;
  assertCity(city, HOTEL_CITIES, "city");
  const checkIn = parseDate(query.checkIn, "check-in date");
  const checkOut = parseDate(query.checkOut, "check-out date");
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > 30) {
    const error = new Error("Stay must be between 1 and 30 nights.");
    error.status = 400;
    throw error;
  }
  const rooms = Number(query.rooms);
  const guests = Number(query.guests);
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 5) {
    const error = new Error("Rooms must be between 1 and 5.");
    error.status = 400;
    throw error;
  }
  if (!Number.isInteger(guests) || guests < 1 || guests > 8) {
    const error = new Error("Guests must be between 1 and 8.");
    error.status = 400;
    throw error;
  }
  if (guests > rooms * 3) {
    const error = new Error("Add more rooms. Each room allows up to 3 guests.");
    error.status = 400;
    throw error;
  }
  const hotels = HOTELS.filter((hotel) => hotel.city === city)
    .map((hotel) => decorateHotel(hotel, nights, rooms))
    .sort((a, b) => a.pricePerNight - b.pricePerNight);
  return { city, checkIn, checkOut, nights, rooms, guests, hotels };
}

function quoteHotel(body) {
  const result = searchHotels(body);
  const hotel = result.hotels.find((item) => item.id === body.hotelId);
  if (!hotel) {
    const error = new Error("That hotel is not available in this city.");
    error.status = 400;
    throw error;
  }
  const roomType = body.roomType === "Suite" ? "Suite" : body.roomType === "Deluxe" ? "Deluxe" : null;
  if (!roomType) {
    const error = new Error("Choose Deluxe or Suite.");
    error.status = 400;
    throw error;
  }
  const amountUsd = roomType === "Suite" ? hotel.totalSuiteUsd : hotel.totalDeluxeUsd;
  const perNight = roomType === "Suite" ? hotel.suitePerNight : hotel.pricePerNight;
  const amountPi = usdToPi(amountUsd);
  return { ...result, hotel, roomType, perNight, amountUsd, amountPi, amount: amountPi };
}

function addDays(iso, days) {
  const time = Date.parse(`${iso}T00:00:00Z`) + days * 86400000;
  return new Date(time).toISOString().slice(0, 10);
}

function quoteCombo(comboId, departureDate) {
  const combo = COMBOS.find((item) => item.id === comboId);
  if (!combo) {
    const error = new Error("That offer is not available.");
    error.status = 400;
    throw error;
  }
  const start = parseDate(departureDate, "departure date");
  const hotel = HOTELS.find((item) => item.id === combo.hotelId);
  const end = addDays(start, combo.nights);
  return {
    combo,
    hotel,
    departureDate: start,
    returnDate: end,
    amountUsd: combo.price,
    amountPi: usdToPi(combo.price),
    amount: usdToPi(combo.price),
  };
}

function personName(value, label) {
  const name = String(value || "").trim().replace(/\s+/g, " ");
  if (!/^[\p{L}][\p{L} .'-]{1,58}$/u.test(name)) {
    const error = new Error(`Enter a valid ${label}.`);
    error.status = 400;
    throw error;
  }
  return name;
}

function personAge(value) {
  const age = Number(value);
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    const error = new Error("Age must be between 1 and 120.");
    error.status = 400;
    throw error;
  }
  return age;
}

function personPhone(value) {
  const phone = String(value || "").trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    const error = new Error("Enter a valid phone number with at least 10 digits.");
    error.status = 400;
    throw error;
  }
  return phone;
}

function flightPassengers(list, expectedCount) {
  if (!Array.isArray(list) || list.length !== expectedCount) {
    const error = new Error("Add details for every passenger.");
    error.status = 400;
    throw error;
  }
  return list.map((person, index) => ({
    name: personName(person.name, `name for passenger ${index + 1}`),
    age: personAge(person.age),
    phone: personPhone(person.phone),
  }));
}

function guestDetails(guest) {
  return {
    name: personName(guest && guest.name, "guest name"),
    phone: personPhone(guest && guest.phone),
  };
}


window.ShCatalog = { searchFlights, searchHotels };
})();
