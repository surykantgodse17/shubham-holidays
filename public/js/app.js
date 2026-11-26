const FLIGHT_CITIES = ["Mumbai", "Delhi", "Goa", "Dubai", "Bangkok", "London"];
const HOTEL_CITIES = ["Goa", "Manali", "Mumbai", "Dubai", "Jaipur"];
const PI_AUTH_SCOPES = ["username", "payments", "wallet_address"];
const AIRLINE_COLOR = {
  IndiGo: "#1d4e9f",
  "Air India": "#b8860b",
  SpiceJet: "#d23b2f",
  Emirates: "#b10f2e",
};

const state = {
  config: null,
  token: localStorage.getItem("sh_token") || "",
  user: null,
  points: 0,
  view: "home",
  offers: [],
  error: "",
  notice: "",
  busy: false,
  flights: null,
  hotels: null,
  selectedFlight: null,
  selectedHotel: null,
  roomType: "Deluxe",
  combo: null,
  bookings: [],
  confirmed: null,
};

const app = document.getElementById("app");

function iso(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function moneyUsd(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function moneyPi(value) {
  const amount = Number(value || 0);
  if (!amount) return "0 Pi";
  const text = amount.toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} Pi`;
}

function usdToPi(usd) {
  const rate = state.config ? state.config.piUsdValue : 314159;
  const cents = Math.round(Number(usd) * 100);
  if (!cents || cents <= 0) return 0;
  return Math.round((cents * 1e7) / (rate * 100)) / 1e7;
}

function previewPoints(fareUsd, requested) {
  const fare = Math.round(Number(fareUsd) * 100) / 100;
  const available = Math.max(0, Math.floor(state.points || 0));
  const asked = Math.max(0, Math.floor(Number(requested) || 0));
  const used = Math.min(asked, available, Math.floor(fare));
  const payable = Math.round((fare - used) * 100) / 100;
  const earned = payable >= 1 ? Math.max(1, Math.floor(payable * 0.05)) : 0;
  return { fare, used, payable, pi: usdToPi(payable), earned };
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    state.user = null;
    state.token = "";
    localStorage.removeItem("sh_token");
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function inPiApp() {
  return /PiBrowser/i.test(navigator.userAgent) || window.self !== window.top;
}

async function saveSession(accessToken) {
  const data = await api("/api/session", { method: "POST", body: { accessToken } });
  state.token = data.token;
  state.user = data.user;
  state.points = data.points;
  localStorage.setItem("sh_token", data.token);
  state.notice = `Welcome, ${data.user.username}. You have ${data.points} bonus points.`;
  state.view = "home";
}

async function onIncomplete(payment) {
  if (!state.token || !payment) return;
  const paymentId = payment.identifier || payment.id;
  const txid = payment.transaction && payment.transaction.txid;
  if (!paymentId) return;
  try {
    const data = txid
      ? await api("/api/payments/incomplete", { method: "POST", body: { payment } })
      : await api("/api/payments/approve", { method: "POST", body: { paymentId } });
    if (data.booking) {
      state.points = data.points;
      state.confirmed = data.booking;
      state.view = "confirmed";
      render();
    }
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function login() {
  state.error = "";
  if (!state.config.clientId) {
    state.error = "Pi sign-in is not configured on this server yet.";
    render();
    return;
  }
  try {
    if (window.Pi && inPiApp()) {
      const auth = await Pi.authenticate(PI_AUTH_SCOPES, onIncomplete);
      await saveSession(auth.accessToken);
      render();
      return;
    }
    const oauthState = crypto.randomUUID();
    sessionStorage.setItem("pi_oauth_state", oauthState);
    if (window.Pi && typeof Pi.signIn === "function") {
      Pi.signIn({
        clientId: state.config.clientId,
        redirectUri: state.config.redirectUri,
        scopes: ["username", "wallet_address"],
        state: oauthState,
      });
      return;
    }
    const url = new URL("https://accounts.pinet.com/oauth/authorize");
    url.searchParams.set("response_type", "token");
    url.searchParams.set("client_id", state.config.clientId);
    url.searchParams.set("redirect_uri", state.config.redirectUri);
    url.searchParams.set("scope", "username wallet_address");
    url.searchParams.set("state", oauthState);
    window.location.assign(url.toString());
  } catch (error) {
    state.error = error.message || "Pi sign-in did not finish.";
    render();
  }
}

async function consumeHash() {
  if (!location.hash.includes("access_token") && !location.hash.includes("error=")) return;
  const params = new URLSearchParams(location.hash.slice(1));
  const expected = sessionStorage.getItem("pi_oauth_state");
  sessionStorage.removeItem("pi_oauth_state");
  history.replaceState(null, "", location.pathname + location.search);
  if (params.get("error")) throw new Error("Pi sign-in was cancelled.");
  if (!expected || params.get("state") !== expected) {
    throw new Error("Sign-in could not be verified. Please try again.");
  }
  await saveSession(params.get("access_token"));
}

function options(list, selected) {
  return list.map((city) => `<option ${city === selected ? "selected" : ""}>${esc(city)}</option>`).join("");
}

function shell(content) {
  const name = state.user ? state.user.username : "Guest";
  return `
    <header class="topbar">
      <div class="wrap topbar-row">
        <div class="brand"><img class="logo" src="/logo.jpg" alt="Shubham Holidays logo" />Shubham <span>Holidays</span></div>
        <div class="brand-row">
          <div class="points-pill">${state.user ? `${state.points} pts` : "Pi login"}</div>
          <div class="user-pill">${esc(name)}</div>
          <nav class="desktop-nav">
            <button data-go="home">Home</button>
            <button data-go="flights">Flights</button>
            <button data-go="hotels">Hotels</button>
            <button data-go="bookings">My Bookings</button>
            ${state.user ? `<button id="logout">Logout</button>` : `<button id="login">Login with Pi</button>`}
          </nav>
        </div>
      </div>
    </header>
    <main class="wrap page">
      ${state.error ? `<div class="error">${esc(state.error)}</div>` : ""}
      ${state.notice ? `<div class="notice">${esc(state.notice)}</div>` : ""}
      ${content}
    </main>
    <nav class="bottom-nav">
      <button data-go="home" class="${state.view === "home" ? "active" : ""}">Home</button>
      <button data-go="flights" class="${state.view.startsWith("flight") ? "active" : ""}">Flights</button>
      <button data-go="hotels" class="${state.view.startsWith("hotel") ? "active" : ""}">Hotels</button>
      <button data-go="bookings" class="${state.view === "bookings" || state.view === "confirmed" ? "active" : ""}">Bookings</button>
    </nav>`;
}

function rateLine() {
  const rate = state.config ? state.config.piUsdValue : 314159;
  return `1 Pi = ${moneyUsd(rate)}`;
}

function homeView() {
  const offers = state.offers.map((offer) => `
    <article class="offer">
      <strong>${esc(offer.title)}</strong>
      <div class="pi">${moneyPi(offer.amountPi)}</div>
      <div class="fine">${moneyUsd(offer.fareUsd)} promo fare · ${esc(offer.from)} to ${esc(offer.to)}</div>
      <button class="primary" data-combo="${esc(offer.id)}">View offer</button>
    </article>`).join("");
  return `
    <section class="banner">
      <img class="logo-hero" src="/logo.jpg" alt="Shubham Holidays logo" />
      <div>
        <h1>Shubham Holidays</h1>
        <p>Book flights and hotels using Pi. Fast, secure, and easy booking via Pi payments.</p>
        <div class="rate">${rateLine()}</div>
      </div>
    </section>
    <div class="actions">
      <button class="big" data-go="flights">Book Flight</button>
      <button class="big alt" data-go="hotels">Book Hotel</button>
    </div>
    <h2 class="section-title">Popular offers</h2>
    <div class="offers">${offers}</div>
    <h2 class="section-title">Bonus points</h2>
    <article class="card">
      <p>1 bonus point equals $1 off a booking. You earn 5 points for every $100 paid with Pi, with at least 1 point when you pay $1 or more.</p>
      <p class="fine">Points are reserved when you start a booking and returned if you cancel before payment. Cancelling a confirmed ticket keeps a 10% charge and refunds the rest in Pi.</p>
    </article>`;
}

function flightSearchView() {
  const q = state.flights && state.flights.query ? state.flights.query : {
    from: "Mumbai", to: "Goa", departureDate: iso(7), returnDate: "", passengers: 1,
  };
  const results = state.flights && state.flights.trips ? state.flights.trips.map((trip) => `
    <article class="flight">
      <div class="airline">
        <div class="brand-row">
          <div class="badge" style="background:${AIRLINE_COLOR[trip.airline] || "#08315c"}">${esc(trip.airlineCode)}</div>
          <div><strong>${esc(trip.airline)}</strong><div class="fine">${esc(trip.tripType)}</div></div>
        </div>
        <div class="price-col"><div class="pi">${moneyPi(trip.totalPi)}</div><div class="fine">${moneyUsd(trip.totalUsd)}</div></div>
      </div>
      <div class="times">
        <div><strong>${esc(trip.outbound.depart)}</strong><div class="fine">${esc(trip.outbound.fromCode)}</div></div>
        <div class="duration">${esc(trip.outbound.durationText)}<br>${esc(trip.outbound.stopLabel)}</div>
        <div style="text-align:right"><strong>${esc(trip.outbound.arrive)}</strong><div class="fine">${esc(trip.outbound.toCode)}</div></div>
      </div>
      ${trip.inbound ? `<div class="fine">Return ${esc(trip.inbound.date)} · ${esc(trip.inbound.depart)} – ${esc(trip.inbound.arrive)} · ${esc(trip.inbound.durationText)}</div>` : ""}
      <button class="primary" data-flight="${esc(trip.id)}">Select flight</button>
    </article>`).join("") : "";
  return `
    <h1>Book a flight</h1>
    <form id="flight-search" class="card search cols">
      <label>From city<select name="from">${options(FLIGHT_CITIES, q.from)}</select></label>
      <label>To city<select name="to">${options(FLIGHT_CITIES, q.to)}</select></label>
      <label>Departure date<input type="date" name="departureDate" required value="${esc(q.departureDate)}" min="${iso(0)}"></label>
      <label>Return date<input type="date" name="returnDate" value="${esc(q.returnDate || "")}" min="${iso(0)}"></label>
      <label>Passengers<input type="number" name="passengers" min="1" max="6" value="${esc(q.passengers)}" required></label>
      <button class="primary" ${state.busy ? "disabled" : ""}>Search flights</button>
    </form>
    <div class="stack" style="margin-top:14px">${results || `<p class="fine">Choose cities and search. Fares are in dollars, then charged in Pi at ${rateLine()}.</p>`}</div>`;
}

function pointsFields(fareUsd) {
  const asked = 0;
  const quote = previewPoints(fareUsd, asked);
  return `
    <label>Bonus points to redeem
      <input type="number" name="pointsToRedeem" min="0" max="${state.points}" value="0" data-fare="${fareUsd}">
    </label>
    <div class="breakdown" id="quote">
      <div><span>Fare</span><span>${moneyUsd(quote.fare)}</span></div>
      <div><span>Points discount</span><span>- ${moneyUsd(quote.used)}</span></div>
      <div><span>Payable</span><span>${moneyUsd(quote.payable)}</span></div>
      <div class="pay-line"><span>Pay with Pi</span><span>${moneyPi(quote.pi)}</span></div>
      <div class="fine">You will earn ${quote.earned} points after payment. Balance: ${state.points} points. ${rateLine()}.</div>
    </div>`;
}

function flightBookView() {
  const trip = state.selectedFlight;
  if (!trip) return `<p>Select a flight first.</p>`;
  const people = Array.from({ length: trip.passengers }, (_, index) => `
    <div class="card people">
      <strong>Passenger ${index + 1}</strong>
      <label>Name<input name="name" required placeholder="Full name"></label>
      <label>Age<input name="age" type="number" min="1" max="120" required></label>
      <label>Phone<input name="phone" required placeholder="10-digit mobile"></label>
    </div>`).join("");
  return `
    <h1>${esc(trip.airline)} · ${esc(trip.outbound.from)} to ${esc(trip.outbound.to)}</h1>
    <p class="fine">${esc(trip.outbound.date)} ${esc(trip.outbound.depart)} · ${esc(trip.outbound.durationText)} · ${moneyPi(trip.totalPi)}</p>
    <form id="flight-book" class="stack">
      ${people}
      <div class="card stack">${pointsFields(trip.totalUsd)}
        <button class="primary" ${state.busy ? "disabled" : ""}>Continue to payment</button>
      </div>
    </form>`;
}

function hotelSearchView() {
  const q = state.hotels && state.hotels.query ? state.hotels.query : {
    city: "Goa", checkIn: iso(7), checkOut: iso(9), rooms: 1, guests: 2,
  };
  const cards = state.hotels && state.hotels.hotels ? state.hotels.hotels.map((hotel) => `
    <article class="hotel">
      <img src="${esc(hotel.image)}" alt="${esc(hotel.name)}" />
      <div class="hotel-body">
        <div class="airline">
          <strong>${esc(hotel.name)}</strong>
          <span class="stars">${hotel.rating.toFixed(1)} ★</span>
        </div>
        <div class="fine">${esc(hotel.tagline)}</div>
        <div class="chips">${hotel.facilities.map((item) => `<span class="chip">${esc(item)}</span>`).join("")}</div>
        <div class="price-col" style="text-align:left"><div class="pi">${moneyPi(hotel.pricePerNightPi)} / night</div><div class="fine">${moneyUsd(hotel.pricePerNight)} per night · Deluxe stay ${moneyPi(hotel.totalDeluxePi)}</div></div>
        <button class="primary" data-hotel="${esc(hotel.id)}">Select hotel</button>
      </div>
    </article>`).join("") : "";
  return `
    <h1>Book a hotel</h1>
    <form id="hotel-search" class="card search cols">
      <label>City<select name="city">${options(HOTEL_CITIES, q.city)}</select></label>
      <label>Rooms<input type="number" name="rooms" min="1" max="5" value="${esc(q.rooms)}" required></label>
      <label>Check-in<input type="date" name="checkIn" required value="${esc(q.checkIn)}" min="${iso(0)}"></label>
      <label>Check-out<input type="date" name="checkOut" required value="${esc(q.checkOut)}" min="${iso(1)}"></label>
      <label>Guests<input type="number" name="guests" min="1" max="8" value="${esc(q.guests)}" required></label>
      <button class="primary" ${state.busy ? "disabled" : ""}>Search hotels</button>
    </form>
    <div class="stack" style="margin-top:14px">${cards}</div>`;
}

function hotelBookView() {
  const stay = state.hotels;
  const hotel = state.selectedHotel;
  if (!hotel || !stay) return `<p>Select a hotel first.</p>`;
  const deluxe = previewPoints(hotel.totalDeluxeUsd, 0);
  const suite = previewPoints(hotel.totalSuiteUsd, 0);
  const fare = state.roomType === "Suite" ? hotel.totalSuiteUsd : hotel.totalDeluxeUsd;
  return `
    <h1>${esc(hotel.name)}</h1>
    <p class="fine">${esc(stay.city)} · ${esc(stay.checkIn)} to ${esc(stay.checkOut)} · ${stay.nights} night(s) · ${stay.rooms} room(s)</p>
    <div class="room-pick">
      <button type="button" class="${state.roomType === "Deluxe" ? "active" : ""}" data-room="Deluxe"><strong>Deluxe</strong><div>${moneyPi(deluxe.pi)}</div><div class="fine">${moneyUsd(hotel.totalDeluxeUsd)}</div></button>
      <button type="button" class="${state.roomType === "Suite" ? "active" : ""}" data-room="Suite"><strong>Suite</strong><div>${moneyPi(suite.pi)}</div><div class="fine">${moneyUsd(hotel.totalSuiteUsd)}</div></button>
    </div>
    <form id="hotel-book" class="card stack" style="margin-top:12px">
      <label>Guest name<input name="name" required></label>
      <label>Phone<input name="phone" required placeholder="10-digit mobile"></label>
      ${pointsFields(fare)}
      <button class="primary" ${state.busy ? "disabled" : ""}>Continue to payment</button>
    </form>`;
}

function comboView() {
  const offer = state.combo;
  if (!offer) return `<p>Choose an offer from the home page.</p>`;
  return `
    <h1>${esc(offer.title)}</h1>
    <p class="pi">${moneyPi(offer.amountPi)}</p>
    <p class="fine">${moneyUsd(offer.fareUsd)} · ${esc(offer.from)} to ${esc(offer.to)} · ${rateLine()}</p>
    <form id="combo-book" class="card stack">
      <label>Departure date<input type="date" name="departureDate" required value="${iso(14)}" min="${iso(0)}"></label>
      <label>Passenger name<input name="name" required></label>
      <label>Age<input name="age" type="number" min="1" max="120" required></label>
      <label>Phone<input name="phone" required></label>
      ${pointsFields(offer.fareUsd)}
      <button class="primary" ${state.busy ? "disabled" : ""}>Continue to payment</button>
    </form>`;
}

function ticketCard(booking) {
  const status = booking.status === "confirmed" ? "Confirmed" : booking.status === "cancelled" ? "Cancelled" : "Payment pending";
  return `
    <article class="ticket">
      <div class="airline"><strong>${esc(booking.summary)}</strong><span class="chip">${esc(status)}</span></div>
      <div class="fine">${esc(booking.details && (booking.details.tripType || booking.details.roomType || booking.details.title || ""))}</div>
      <div class="breakdown">
        <div><span>Fare</span><span>${moneyUsd(booking.fareUsd)}</span></div>
        <div><span>Points used</span><span>${booking.pointsRedeemed}</span></div>
        <div class="pay-line"><span>Pi charged</span><span>${moneyPi(booking.amount)}</span></div>
        ${booking.pnr ? `<div><span>PNR</span><span>${esc(booking.pnr)}</span></div>` : ""}
        ${booking.refund && booking.refund.status === "completed" ? `<div><span>Cancellation charge</span><span>${moneyPi(booking.refund.feePi)}</span></div><div><span>Pi refunded</span><span>${moneyPi(booking.refund.refundPi)}</span></div>` : ""}
      </div>
      <div class="actions">
        ${booking.status === "confirmed" ? `<button class="secondary" data-download="${esc(booking.id)}">Download ticket</button>` : ""}
        ${booking.status === "confirmed" && booking.amount > 0 ? `<button class="danger" data-cancel="${esc(booking.id)}">Cancel booking</button>` : ""}
        ${booking.status === "pending" ? `<button class="primary" data-pay="${esc(booking.id)}">Pay with Pi</button><button class="danger" data-cancel="${esc(booking.id)}">Cancel</button>` : ""}
      </div>
    </article>`;
}

function bookingsView() {
  if (!state.user) return `<div class="card"><h1>My Bookings</h1><p>Login with your Pi account to see tickets.</p><button class="primary" id="login">Login with Pi</button></div>`;
  const list = state.bookings.length ? state.bookings.map(ticketCard).join("") : `<p class="fine">No bookings yet. A confirmed ticket appears here with a download button.</p>`;
  return `<h1>My Bookings</h1><div class="stack">${list}</div>`;
}

function confirmedView() {
  const booking = state.confirmed;
  if (!booking) return bookingsView();
  return `
    <div class="card">
      <h1>${booking.status === "confirmed" ? "Booking confirmed" : "Payment still pending"}</h1>
      ${booking.pnr ? `<p class="pi">PNR ${esc(booking.pnr)}</p>` : ""}
      <p>${esc(booking.summary)}</p>
      <p class="fine">Paid ${moneyPi(booking.amount)} from a ${moneyUsd(booking.fareUsd)} fare. Points earned: ${booking.pointsEarned}.</p>
      ${booking.status === "confirmed" ? `<button class="secondary" data-download="${esc(booking.id)}">Download ticket</button>` : `<button class="primary" data-pay="${esc(booking.id)}">Pay with Pi</button>`}
    </div>`;
}

function render() {
  const views = {
    home: homeView,
    flights: flightSearchView,
    "flight-book": flightBookView,
    hotels: hotelSearchView,
    "hotel-book": hotelBookView,
    combo: comboView,
    bookings: bookingsView,
    confirmed: confirmedView,
  };
  app.innerHTML = shell((views[state.view] || homeView)());
  bind();
}

function bind() {
  app.querySelectorAll("[data-go]").forEach((button) => {
    button.onclick = () => {
      state.error = "";
      state.notice = "";
      state.view = button.dataset.go;
      if (state.view === "bookings") loadBookings().finally(render);
      else render();
    };
  });
  const loginButton = document.getElementById("login");
  if (loginButton) loginButton.onclick = login;
  const logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.onclick = async () => {
      try { await api("/api/logout", { method: "POST", body: {} }); } catch (error) { /* signed out locally */ }
      state.token = "";
      state.user = null;
      state.points = 0;
      localStorage.removeItem("sh_token");
      state.view = "home";
      render();
    };
  }
  const flightSearch = document.getElementById("flight-search");
  if (flightSearch) flightSearch.onsubmit = onFlightSearch;
  const flightBook = document.getElementById("flight-book");
  if (flightBook) flightBook.onsubmit = onFlightBook;
  const hotelSearch = document.getElementById("hotel-search");
  if (hotelSearch) hotelSearch.onsubmit = onHotelSearch;
  const hotelBook = document.getElementById("hotel-book");
  if (hotelBook) hotelBook.onsubmit = onHotelBook;
  const comboBook = document.getElementById("combo-book");
  if (comboBook) comboBook.onsubmit = onComboBook;
  app.querySelectorAll("[data-flight]").forEach((button) => {
    button.onclick = () => {
      state.selectedFlight = state.flights.trips.find((trip) => trip.id === button.dataset.flight);
      state.view = "flight-book";
      state.error = "";
      render();
    };
  });
  app.querySelectorAll("[data-hotel]").forEach((button) => {
    button.onclick = () => {
      state.selectedHotel = state.hotels.hotels.find((hotel) => hotel.id === button.dataset.hotel);
      state.roomType = "Deluxe";
      state.view = "hotel-book";
      render();
    };
  });
  app.querySelectorAll("[data-room]").forEach((button) => {
    button.onclick = () => {
      state.roomType = button.dataset.room;
      render();
    };
  });
  app.querySelectorAll("[data-combo]").forEach((button) => {
    button.onclick = () => {
      state.combo = state.offers.find((offer) => offer.id === button.dataset.combo);
      state.view = "combo";
      render();
    };
  });
  app.querySelectorAll("[data-pay]").forEach((button) => {
    button.onclick = () => {
      const booking = state.bookings.find((item) => item.id === button.dataset.pay) || state.confirmed;
      startPayment(booking);
    };
  });
  app.querySelectorAll("[data-cancel]").forEach((button) => {
    button.onclick = () => cancelBooking(button.dataset.cancel);
  });
  app.querySelectorAll("[data-download]").forEach((button) => {
    button.onclick = () => {
      const booking = state.bookings.find((item) => item.id === button.dataset.download) || state.confirmed;
      downloadTicket(booking);
    };
  });
  const pointsInput = app.querySelector("[name=pointsToRedeem]");
  if (pointsInput) pointsInput.oninput = () => updateQuote(pointsInput);
}

function updateQuote(input) {
  const quote = previewPoints(Number(input.dataset.fare), input.value);
  const box = document.getElementById("quote");
  if (!box) return;
  box.innerHTML = `
    <div><span>Fare</span><span>${moneyUsd(quote.fare)}</span></div>
    <div><span>Points discount</span><span>- ${moneyUsd(quote.used)}</span></div>
    <div><span>Payable</span><span>${moneyUsd(quote.payable)}</span></div>
    <div class="pay-line"><span>Pay with Pi</span><span>${moneyPi(quote.pi)}</span></div>
    <div class="fine">You will earn ${quote.earned} points after payment. Balance: ${state.points} points. ${rateLine()}.</div>`;
}

async function onFlightSearch(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const query = {
    from: form.get("from"),
    to: form.get("to"),
    departureDate: form.get("departureDate"),
    returnDate: form.get("returnDate"),
    passengers: Number(form.get("passengers")),
  };
  state.busy = true;
  state.error = "";
  render();
  try {
    const data = await api("/api/flights/search", { method: "POST", body: query });
    state.flights = { ...data, query };
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

function readPassengers(form) {
  const names = [...form.querySelectorAll("[name=name]")].map((input) => input.value);
  const ages = [...form.querySelectorAll("[name=age]")].map((input) => input.value);
  const phones = [...form.querySelectorAll("[name=phone]")].map((input) => input.value);
  return names.map((name, index) => ({ name, age: Number(ages[index]), phone: phones[index] }));
}

async function onFlightBook(event) {
  event.preventDefault();
  if (!requireUser()) return;
  const trip = state.selectedFlight;
  const form = event.target;
  state.busy = true;
  render();
  try {
    const data = await api("/api/bookings/flight", {
      method: "POST",
      body: {
        from: trip.outbound.from,
        to: trip.outbound.to,
        departureDate: trip.outbound.date,
        returnDate: trip.inbound ? trip.inbound.date : "",
        passengers: readPassengers(form),
        flightId: trip.id,
        pointsToRedeem: Number(form.pointsToRedeem.value || 0),
      },
    });
    state.points = data.points;
    await afterBooking(data.booking);
  } catch (error) {
    state.error = error.message;
    state.busy = false;
    render();
  }
}

async function onHotelSearch(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const query = {
    city: form.get("city"),
    checkIn: form.get("checkIn"),
    checkOut: form.get("checkOut"),
    rooms: Number(form.get("rooms")),
    guests: Number(form.get("guests")),
  };
  state.busy = true;
  state.error = "";
  render();
  try {
    const data = await api("/api/hotels/search", { method: "POST", body: query });
    state.hotels = { ...data, query };
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

async function onHotelBook(event) {
  event.preventDefault();
  if (!requireUser()) return;
  const form = event.target;
  const stay = state.hotels;
  state.busy = true;
  render();
  try {
    const data = await api("/api/bookings/hotel", {
      method: "POST",
      body: {
        city: stay.city,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        rooms: stay.rooms,
        guests: stay.guests,
        hotelId: state.selectedHotel.id,
        roomType: state.roomType,
        guest: { name: form.name.value, phone: form.phone.value },
        pointsToRedeem: Number(form.pointsToRedeem.value || 0),
      },
    });
    state.points = data.points;
    await afterBooking(data.booking);
  } catch (error) {
    state.error = error.message;
    state.busy = false;
    render();
  }
}

async function onComboBook(event) {
  event.preventDefault();
  if (!requireUser()) return;
  const form = event.target;
  state.busy = true;
  render();
  try {
    const data = await api("/api/bookings/combo", {
      method: "POST",
      body: {
        comboId: state.combo.id,
        departureDate: form.departureDate.value,
        passenger: { name: form.name.value, age: Number(form.age.value), phone: form.phone.value },
        pointsToRedeem: Number(form.pointsToRedeem.value || 0),
      },
    });
    state.points = data.points;
    await afterBooking(data.booking);
  } catch (error) {
    state.error = error.message;
    state.busy = false;
    render();
  }
}

function requireUser() {
  if (state.user) return true;
  state.error = "Login with your Pi account before booking.";
  state.view = "home";
  render();
  login();
  return false;
}

async function afterBooking(booking) {
  state.busy = false;
  state.confirmed = booking;
  if (booking.status === "confirmed") {
    state.notice = booking.pnr ? `Ticket confirmed. PNR ${booking.pnr}.` : "Booking confirmed.";
    state.view = "confirmed";
    render();
    return;
  }
  state.view = "confirmed";
  render();
  await startPayment(booking);
}

async function startPayment(booking) {
  if (!booking || booking.amount <= 0) return;
  if (!window.Pi || typeof Pi.createPayment !== "function" || !inPiApp()) {
    state.error = "Open Shubham Holidays in Pi Browser to pay with Pi. Your booking is saved under My Bookings.";
    state.view = "confirmed";
    render();
    return;
  }
  state.busy = true;
  state.error = "";
  render();
  try {
    await Pi.authenticate(PI_AUTH_SCOPES, onIncomplete);
    const result = await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (ok, value) => {
        if (settled) return;
        settled = true;
        if (ok) resolve(value);
        else reject(value);
      };
      Pi.createPayment({
        amount: booking.amount,
        memo: booking.memo,
        metadata: { bookingId: booking.id },
      }, {
        onReadyForServerApproval(paymentId) {
          api("/api/payments/approve", { method: "POST", body: { paymentId } }).catch((error) => finish(false, error));
        },
        onReadyForServerCompletion(paymentId, txid) {
          api("/api/payments/complete", { method: "POST", body: { paymentId, txid } })
            .then((data) => finish(true, data))
            .catch((error) => finish(false, error));
        },
        onCancel() {
          finish(false, new Error("Payment cancelled. The booking stays pending until you pay or cancel it."));
        },
        onError(error) {
          finish(false, new Error((error && error.message) || "Pi payment failed."));
        },
      });
    });
    state.points = result.points;
    state.confirmed = result.booking;
    state.notice = `Ticket confirmed. PNR ${result.booking.pnr}.`;
    state.view = "confirmed";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

function cancellationPreview(amountPi) {
  const units = Math.round(Number(amountPi) * 1e7);
  if (!units || units <= 0) return { feePi: 0, refundPi: 0 };
  const feeUnits = Math.min(units, Math.max(1, Math.ceil(units * 0.1 - 1e-9)));
  return { feePi: feeUnits / 1e7, refundPi: (units - feeUnits) / 1e7 };
}

async function cancelBooking(id) {
  const booking = state.bookings.find((item) => item.id === id) || state.confirmed;
  if (booking && booking.status === "confirmed" && booking.amount > 0) {
    const quote = cancellationPreview(booking.amount);
    const ok = window.confirm(`Cancel this ticket? A 10% cancellation charge of ${moneyPi(quote.feePi)} applies. ${moneyPi(quote.refundPi)} Pi is refunded.`);
    if (!ok) return;
  }
  try {
    const data = await api(`/api/bookings/${id}/cancel`, { method: "POST", body: {} });
    state.points = data.points;
    state.confirmed = data.booking;
    const refund = data.booking.refund;
    state.notice = refund && refund.status === "completed"
      ? `Booking cancelled. ${moneyPi(refund.refundPi)} Pi refunded after a ${moneyPi(refund.feePi)} cancellation charge.`
      : "Booking cancelled and reserved points were returned.";
    await loadBookings();
    state.view = "bookings";
  } catch (error) {
    state.error = error.message;
  }
  render();
}

async function loadBookings() {
  if (!state.token) return;
  const data = await api("/api/bookings");
  state.bookings = data.bookings;
  state.points = data.points;
}

function downloadTicket(booking) {
  if (!booking) return;
  const details = booking.details || {};
  const rows = [
    ["Booking", booking.summary],
    ["Status", booking.status],
    ["PNR", booking.pnr || "-"],
    ["Fare", moneyUsd(booking.fareUsd)],
    ["Points redeemed", String(booking.pointsRedeemed || 0)],
    ["Payable", moneyUsd(booking.payableUsd)],
    ["Pi paid", moneyPi(booking.amount)],
    ["Rate", `1 Pi = ${moneyUsd(booking.piUsdValue || 314159)}`],
  ];
  if (details.passengers) {
    details.passengers.forEach((person, index) => {
      rows.push([`Passenger ${index + 1}`, `${person.name}, age ${person.age}, ${person.phone}`]);
    });
  }
  if (details.guest) rows.push(["Guest", `${details.guest.name}, ${details.guest.phone}`]);
  if (details.passenger) rows.push(["Guest", `${details.passenger.name}, ${details.passenger.phone}`]);
  const body = rows.map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(booking.pnr || "Ticket")}</title>
    <style>body{font-family:Segoe UI,sans-serif;background:#f3f6fb;color:#172033} .ticket{max-width:640px;margin:24px auto;background:white;border-radius:16px;padding:20px} h1{color:#08315c} th{text-align:left;color:#5d6b80;padding:6px 12px 6px 0}</style>
    </head><body><article class="ticket"><h1>Shubham Holidays</h1><p>Flight & Hotel Booking with Pi</p><table>${body}</table></article></body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${booking.pnr || booking.id}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function boot() {
  state.config = await api("/api/config");
  if (window.Pi) {
    try { Pi.init({ version: "2.0", sandbox: Boolean(state.config.sandbox) }); } catch (error) { /* SDK absent outside Pi Browser */ }
  }
  const offers = await api("/api/offers");
  state.offers = offers.offers;
  try { await consumeHash(); } catch (error) { state.error = error.message; }
  if (state.token && !state.user) {
    try {
      const me = await api("/api/me");
      state.user = me.user;
      state.points = me.points;
    } catch (error) {
      state.token = "";
    }
  }
  render();
}

boot().catch((error) => {
  app.innerHTML = `<main class="wrap page"><div class="error">${esc(error.message)}</div></main>`;
});
