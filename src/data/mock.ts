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

export const flights: Flight[] = [
  { id: "f1", airline: "IndiGo", flightNo: "6E 2145", from: "DEL", to: "GOI", depart: "06:40", arrive: "09:05", duration: "2h 25m", stops: 0, price: 4890, cabin: "Economy" },
  { id: "f2", airline: "Vistara", flightNo: "UK 841", from: "DEL", to: "GOI", depart: "11:15", arrive: "13:50", duration: "2h 35m", stops: 0, price: 6420, cabin: "Economy" },
  { id: "f3", airline: "Air India", flightNo: "AI 659", from: "DEL", to: "GOI", depart: "16:20", arrive: "20:45", duration: "4h 25m", stops: 1, price: 5199, cabin: "Economy" },
  { id: "f4", airline: "IndiGo", flightNo: "6E 5301", from: "BOM", to: "BLR", depart: "08:10", arrive: "09:45", duration: "1h 35m", stops: 0, price: 3290, cabin: "Economy" },
  { id: "f5", airline: "Akasa Air", flightNo: "QP 1522", from: "BOM", to: "BLR", depart: "14:30", arrive: "16:10", duration: "1h 40m", stops: 0, price: 2980, cabin: "Economy" },
  { id: "f6", airline: "Vistara", flightNo: "UK 812", from: "DEL", to: "BOM", depart: "07:00", arrive: "09:10", duration: "2h 10m", stops: 0, price: 5450, cabin: "Premium Economy" },
  { id: "f7", airline: "Emirates", flightNo: "EK 511", from: "BOM", to: "DXB", depart: "22:45", arrive: "00:15", duration: "3h 00m", stops: 0, price: 18490, cabin: "Economy" },
  { id: "f8", airline: "Singapore Airlines", flightNo: "SQ 402", from: "DEL", to: "SIN", depart: "23:10", arrive: "07:25", duration: "5h 45m", stops: 0, price: 28900, cabin: "Economy" },
  { id: "f9", airline: "Thai Airways", flightNo: "TG 316", from: "DEL", to: "BKK", depart: "00:40", arrive: "06:20", duration: "4h 10m", stops: 0, price: 16850, cabin: "Economy" },
  { id: "f10", airline: "British Airways", flightNo: "BA 143", from: "DEL", to: "LON", depart: "13:55", arrive: "18:40", duration: "9h 15m", stops: 0, price: 45200, cabin: "Economy" },
  { id: "f11", airline: "IndiGo", flightNo: "6E 6088", from: "BLR", to: "MAA", depart: "09:25", arrive: "10:30", duration: "1h 05m", stops: 0, price: 2450, cabin: "Economy" },
  { id: "f12", airline: "Air India", flightNo: "AI 770", from: "CCU", to: "DEL", depart: "17:40", arrive: "20:05", duration: "2h 25m", stops: 0, price: 5120, cabin: "Economy" },
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
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1000&q=80",
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
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=80",
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
    image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1000&q=80",
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
    image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1000&q=80",
    highlights: ["Palace hotels", "Private guide", "Desert sunset"],
    description: "Forts by day, courtyard dinners by night — classic Rajasthan without the rush.",
  },
  {
    id: "l5",
    title: "Andaman Reef Snorkel",
    type: "Experience",
    place: "Havelock",
    duration: "1 day",
    price: 4800,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1000&q=80",
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
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80",
    highlights: ["Street classics", "Vegetarian options", "Local stories"],
    description: "From vada pav counters to late-night dessert — guided by a Bandra regular.",
  },
];

export const destinations = [
  {
    name: "Goa",
    blurb: "Palm coasts and slow evenings",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
    href: "/hotels?city=GOI",
  },
  {
    name: "Himalayas",
    blurb: "Ridges, mist, and quiet dawns",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80",
    href: "/explore",
  },
  {
    name: "Kerala",
    blurb: "Backwaters and green shade",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=80",
    href: "/explore/l1",
  },
];

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
