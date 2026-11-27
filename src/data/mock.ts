export type City = { code: string; name: string; country: string };

export const cities: City[] = [
  { code: "DEL", name: "New Delhi", country: "India" },
  { code: "BOM", name: "Mumbai", country: "India" },
  { code: "BLR", name: "Bengaluru", country: "India" },
  { code: "GOI", name: "Goa", country: "India" },
  { code: "MAA", name: "Chennai", country: "India" },
  { code: "CCU", name: "Kolkata", country: "India" },
  { code: "DXB", name: "Dubai", country: "UAE" },
  { code: "SIN", name: "Singapore", country: "Singapore" },
  { code: "BKK", name: "Bangkok", country: "Thailand" },
  { code: "LON", name: "London", country: "UK" },
];

export type Flight = {
  id: string;
  airline: string;
  flightNo: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration: string;
  stops: number;
  price: number;
  cabin: "Economy" | "Premium Economy" | "Business";
};

/** Single real-world IndiGo DEL→GOI service kept for demo booking. */
export const flights: Flight[] = [
  {
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
  },
];

export type Hotel = {
  id: string;
  name: string;
  city: string;
  area: string;
  stars: number;
  pricePerNight: number;
  rating: number;
  amenities: string[];
  image: string;
  description: string;
};

export const hotels: Hotel[] = [
  {
    id: "h1",
    name: "Palm Grove Resort",
    city: "GOI",
    area: "Candolim",
    stars: 4,
    pricePerNight: 7800,
    rating: 4.6,
    amenities: ["Pool", "Beach access", "Breakfast", "Spa"],
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    description: "Breezy rooms steps from Candolim beach, with a quiet pool courtyard and Goan seafood evenings.",
  },
  {
    id: "h2",
    name: "Fort View Heritage",
    city: "GOI",
    area: "Old Goa",
    stars: 5,
    pricePerNight: 12400,
    rating: 4.8,
    amenities: ["Heritage wing", "Pool", "Fine dining", "Transfer"],
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=900&q=80",
    description: "Restored Indo-Portuguese mansion with courtyard suites and curated local experiences.",
  },
  {
    id: "h3",
    name: "Skyline Marine Drive",
    city: "BOM",
    area: "Marine Drive",
    stars: 5,
    pricePerNight: 15900,
    rating: 4.7,
    amenities: ["Sea view", "Gym", "Club lounge", "Airport transfer"],
    image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
    description: "Floor-to-ceiling Queen’s Necklace views and a calm club floor for business travelers.",
  },
  {
    id: "h4",
    name: "Garden Courtyard Inn",
    city: "BLR",
    area: "Indiranagar",
    stars: 4,
    pricePerNight: 6200,
    rating: 4.5,
    amenities: ["Garden", "Cafe", "Workspace", "Parking"],
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=900&q=80",
    description: "Leafy Indiranagar stay with espresso bar, quiet work nooks, and late checkout options.",
  },
  {
    id: "h5",
    name: "Ridge House Manali",
    city: "DEL",
    area: "Day-trip hub / North India stays",
    stars: 3,
    pricePerNight: 4100,
    rating: 4.4,
    amenities: ["Mountain view", "Fireplace", "Homestyle meals"],
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80",
    description: "Timber lodge feel with ridge views — ideal before a Himachal road trip.",
  },
  {
    id: "h6",
    name: "Creek Boutique Dubai",
    city: "DXB",
    area: "Al Seef",
    stars: 4,
    pricePerNight: 11200,
    rating: 4.6,
    amenities: ["Creek view", "Rooftop", "Breakfast"],
    image: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
    description: "Modern Arabian design on Dubai Creek with rooftop sunset lounges.",
  },
  {
    id: "h7",
    name: "Orchard Suites Singapore",
    city: "SIN",
    area: "Orchard",
    stars: 5,
    pricePerNight: 18600,
    rating: 4.9,
    amenities: ["Pool", "Spa", "Club access", "Shopping"],
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    description: "Polished Orchard Road suites with a sky pool and seamless city access.",
  },
  {
    id: "h8",
    name: "Canal House Bangkok",
    city: "BKK",
    area: "Riverside",
    stars: 4,
    pricePerNight: 8900,
    rating: 4.5,
    amenities: ["River ferry", "Pool", "Thai breakfast"],
    image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=900&q=80",
    description: "Quiet riverside rooms with shuttle boats to the old city temples.",
  },
];

export type Listing = {
  id: string;
  title: string;
  type: "Package" | "Experience" | "Partner";
  place: string;
  duration: string;
  price: number;
  image: string;
  highlights: string[];
  description: string;
};

export const listings: Listing[] = [
  {
    id: "l1",
    title: "Kerala Backwaters Escape",
    type: "Package",
    place: "Alleppey · Kochi",
    duration: "4 nights",
    price: 28900,
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Houseboat night", "Spice plantation", "Airport transfers"],
    description: "Slow canals, a private houseboat dinner, and a soft landing in Fort Kochi’s cafés.",
  },
  {
    id: "l2",
    title: "Himalayan Dawn Trek",
    type: "Experience",
    place: "Triund · McLeod Ganj",
    duration: "2 days",
    price: 6400,
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Guided trek", "Camp breakfast", "Local porter support"],
    description: "A short, rewarding ridge walk with sunrise over the Dhauladhar range.",
  },
  {
    id: "l3",
    title: "Goa Culinary Trail",
    type: "Partner",
    place: "Panaji · Fontainhas",
    duration: "Half day",
    price: 3200,
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    highlights: ["5 tastings", "Local host", "Heritage walk"],
    description: "Walk Fontainhas with a local host — petiscos, feni lore, and bakery finds.",
  },
  {
    id: "l4",
    title: "Rajasthan Fort Circuit",
    type: "Package",
    place: "Jaipur · Jodhpur",
    duration: "5 nights",
    price: 42500,
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Palace hotels", "Private guide", "Desert sunset"],
    description: "Forts by day, courtyard dinners by night — classic Rajasthan without the rush.",
  },
  {
    id: "l7",
    title: "Indian Pilgrimage Circuit",
    type: "Package",
    place: "Varanasi · Tirupati · Shirdi · Somnath",
    duration: "6 nights",
    price: 35900,
    image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Temple darshan", "Puja arrangements", "AC hotels", "Local transfers"],
    description:
      "Sacred circuit across India’s beloved shrines — calm travel, guided darshan, and comfortable stays.",
  },
  {
    id: "l8",
    title: "Goa Beach Escape",
    type: "Package",
    place: "North Goa · South Goa",
    duration: "3 nights",
    price: 18900,
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Beach resort", "Breakfast", "Airport transfers", "Water sports option"],
    description: "Sun, sand, and slow evenings — a short coastal reset with resort stays and easy transfers.",
  },
  {
    id: "l9",
    title: "Kashmir Valley Retreat",
    type: "Package",
    place: "Srinagar · Gulmarg · Pahalgam",
    duration: "5 nights",
    price: 39900,
    image: "https://images.unsplash.com/photo-1566837497312-7be7830ae9b1?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Shikara ride", "Gulmarg gondola", "Houseboat night", "Local guide"],
    description: "Dal Lake mornings, pine valleys, and mountain air — Kashmir at an easy pace.",
  },
  {
    id: "l10",
    title: "Andaman Island Getaway",
    type: "Package",
    place: "Port Blair · Havelock",
    duration: "4 nights",
    price: 45900,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Ferry tickets", "Beach hotel", "Snorkel session", "Cellular Jail visit"],
    description: "Turquoise water, soft sand, and island hopping — Andaman without the planning stress.",
  },
  {
    id: "l5",
    title: "Andaman Reef Snorkel",
    type: "Experience",
    place: "Havelock",
    duration: "1 day",
    price: 4800,
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Certified guide", "Gear included", "Photo pack"],
    description: "Clear water reefs with a small-group boat and reef-safe kit.",
  },
  {
    id: "l6",
    title: "Mumbai Night Food Walk",
    type: "Partner",
    place: "Bandra · Hill Road",
    duration: "3 hours",
    price: 2100,
    image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80",
    highlights: ["Street classics", "Vegetarian options", "Local stories"],
    description: "From vada pav counters to late-night dessert — guided by a Bandra regular.",
  },
];

export const destinations = [
  {
    name: "Goa",
    blurb: "Palm coasts and slow evenings",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    href: "/hotels?city=GOI",
  },
  {
    name: "Himalayas",
    blurb: "Ridges, mist, and quiet dawns",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    href: "/explore",
  },
  {
    name: "Kerala",
    blurb: "Backwaters and green shade",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
    href: "/explore/l1",
  },
];

/** Domestic packages on the homepage — add/remove Package listings freely (no fixed count). */
export const domesticPackages = listings.filter((l) => l.type === "Package");

export type InternationalPackage = {
  id: string;
  title: string;
  place: string;
  duration: string;
  price: number;
  image: string;
  inclusions: string[];
};

/** International tours on the homepage — add/remove entries freely (no fixed count). */
export const internationalPackages: InternationalPackage[] = [
  {
    id: "intl-dubai",
    title: "Dubai",
    place: "United Arab Emirates",
    duration: "4N / 5D",
    price: 64999,
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1000&q=80",
    inclusions: [
      "Flight",
      "4-Star Hotel",
      "Breakfast",
      "Visa",
      "Burj Khalifa",
      "Desert Safari",
      "Dhow Cruise",
      "Dubai City Tour",
      "Airport Transfers",
    ],
  },
  {
    id: "intl-singapore",
    title: "Singapore",
    place: "Singapore",
    duration: "4N / 5D",
    price: 74999,
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1000&q=80",
    inclusions: [
      "Flight",
      "4-Star Hotel",
      "Breakfast",
      "Visa",
      "Universal Studios",
      "Marina Bay Sands",
      "Sentosa Island",
      "Night Safari",
      "Airport Transfers",
    ],
  },
  {
    id: "intl-malaysia",
    title: "Malaysia",
    place: "Kuala Lumpur · Genting",
    duration: "4N / 5D",
    price: 54999,
    image: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=80",
    inclusions: [
      "Flight",
      "4-Star Hotel",
      "Breakfast",
      "Visa",
      "Kuala Lumpur City Tour",
      "Genting Highlands",
      "Batu Caves",
      "Sunway Lagoon",
    ],
  },
  {
    id: "intl-thailand",
    title: "Thailand",
    place: "Bangkok · Pattaya",
    duration: "4N / 5D",
    price: 49999,
    image: "https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=1000&q=80",
    inclusions: [
      "Flight",
      "4-Star Hotel",
      "Breakfast",
      "Visa on Arrival assist",
      "Bangkok City Tour",
      "Coral Island",
      "Alcazar Show",
      "Airport Transfers",
    ],
  },
  {
    id: "intl-maldives",
    title: "Maldives",
    place: "Male · Island Resort",
    duration: "3N / 4D",
    price: 89999,
    image: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1000&q=80",
    inclusions: [
      "Flight",
      "Resort stay",
      "Breakfast & dinner",
      "Speedboat / seaplane transfer",
      "Snorkel session",
      "Beach villa / room",
    ],
  },
  {
    id: "intl-vietnam",
    title: "Vietnam",
    place: "Hanoi · Halong · Da Nang",
    duration: "5N / 6D",
    price: 59999,
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1000&q=80",
    inclusions: [
      "Flight",
      "4-Star Hotel",
      "Breakfast",
      "Visa assist",
      "Halong Bay cruise",
      "Hanoi city tour",
      "Airport Transfers",
    ],
  },
];

/** WhatsApp booking link for package cards. */
export function whatsappBookUrl(packageTitle: string, duration: string, price: number): string {
  const text = `Hi Shubham Holidays, I'd like to book: ${packageTitle} (${duration}) — ${formatINR(price)} per person.`;
  return `https://wa.me/919372010677?text=${encodeURIComponent(text)}`;
}

export function cityName(code: string): string {
  return cities.find((c) => c.code === code)?.name ?? code;
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
