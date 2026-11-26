import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Footer } from "./components/Footer";
import { Home } from "./pages/Home";
import { Flights } from "./pages/Flights";
import { FlightResults } from "./pages/FlightResults";
import { FlightBook } from "./pages/FlightBook";
import { Hotels } from "./pages/Hotels";
import { HotelResults } from "./pages/HotelResults";
import { HotelBook } from "./pages/HotelBook";
import { Explore } from "./pages/Explore";
import { ExploreDetail } from "./pages/ExploreDetail";
import { Checkout } from "./pages/Checkout";
import { Confirmation } from "./pages/Confirmation";
import { Bookings } from "./pages/Bookings";
import { Contact } from "./pages/Contact";
import { FloatingWhatsApp } from "./components/FloatingWhatsApp";

export default function App() {
  return (
    <HashRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/flights/results" element={<FlightResults />} />
        <Route path="/flights/book" element={<FlightBook />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/hotels/results" element={<HotelResults />} />
        <Route path="/hotels/book" element={<HotelBook />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/explore/:id" element={<ExploreDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
      <FloatingWhatsApp />
    </HashRouter>
  );
}
