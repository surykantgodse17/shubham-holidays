const FLIGHT_CITIES = ["Mumbai", "Delhi", "Goa", "Dubai", "Bangkok", "London"];
const HOTEL_CITIES = ["Goa", "Manali", "Mumbai", "Dubai", "Jaipur"];
const state = {
  config: null,
  token: localStorage.getItem("sh_token") || "",
  user: null,
  points: 0,
  mode: "flight",
  error: "",
  notice: "",
  busy: false,
  trips: [],
  hotels: [],
  index: 0,
  booking: null,
  stay: null,
  roomType: "Deluxe",
};
const root = document.getElementById("app");

function iso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}
function moneyUsd(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function moneyPi(value) {
  const amount = Number(value || 0);
  if (!amount) return "0 Pi";
  return `${amount.toFixed(7).replace(/0+$/, "").replace(/\.$/, "")} Pi`;
}
function rateLine() {
  return `1 Pi = ${moneyUsd(state.config ? state.config.piUsdValue : 314159)}`;
}
function options(list, selected) {
  return list.map((city) => `<option ${city === selected ? "selected" : ""}>${esc(city)}</option>`).join("");
}
async function api(url, options = {}) {
  const headers = {};
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
  state.notice = `Signed in as ${data.user.username}.`;
}
async function onIncomplete(payment) {
  if (!state.token || !payment) return;
  const txid = payment.transaction && payment.transaction.txid;
  try {
    const data = txid
      ? await api("/api/payments/incomplete", { method: "POST", body: { payment } })
      : await api("/api/payments/approve", { method: "POST", body: { paymentId: payment.identifier || payment.id } });
    if (data.booking) {
      state.booking = data.booking;
      state.points = data.points;
      state.notice = data.booking.pnr ? `PNR ${data.booking.pnr}` : "Payment updated.";
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
      const auth = await Pi.authenticate(["username", "payments", "wallet_address"], onIncomplete);
      await saveSession(auth.accessToken);
      render();
      return;
    }
    const oauthState = crypto.randomUUID();
    sessionStorage.setItem("pi_oauth_state", oauthState);
    const url = new URL("https://accounts.pinet.com/oauth/authorize");
    url.searchParams.set("response_type", "token");
    url.searchParams.set("client_id", state.config.clientId);
    url.searchParams.set("redirect_uri", state.config.redirectUri);
    url.searchParams.set("scope", "username wallet_address");
    url.searchParams.set("state", oauthState);
    if (window.Pi && typeof Pi.signIn === "function") {
      Pi.signIn({
        clientId: state.config.clientId,
        redirectUri: state.config.redirectUri,
        scopes: ["username", "wallet_address"],
        state: oauthState,
      });
      return;
    }
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
  if (!expected || params.get("state") !== expected) throw new Error("Sign-in could not be verified. Please try again.");
  await saveSession(params.get("access_token"));
}

function current() {
  return state.mode === "flight" ? state.trips[state.index] : state.hotels[state.index];
}

function resultHtml() {
  if (state.booking) {
    const item = state.booking;
    return `<div class="result">
      <div class="row"><strong>${esc(item.summary)}</strong><span>${esc(item.status)}</span></div>
      <div class="pi">${item.pnr ? `PNR ${esc(item.pnr)}` : "Payment pending"}</div>
      <div class="row"><span>${moneyUsd(item.fareUsd)}</span><span class="pi">${moneyPi(item.amount)}</span></div>
      <div class="row">
        ${item.status === "confirmed" ? `<button class="mini" id="download" type="button">Download ticket</button>` : ""}
        ${item.status === "pending" ? `<button class="mini" id="retry-pay" type="button">Pay with Pi</button>` : ""}
        <button class="mini" id="clear-booking" type="button">New search</button>
      </div>
    </div>`;
  }
  const item = current();
  const total = state.mode === "flight" ? state.trips.length : state.hotels.length;
  if (!item) return `<div class="result"><strong>Search to see a fare</strong><div class="msg">IndiGo, Air India, SpiceJet, and Emirates. Hotels show WiFi, breakfast, pool, and AC.</div></div>`;
  if (state.mode === "flight") {
    return `<div class="result">
      <div class="row"><strong>${esc(item.airline)}</strong><span>${state.index + 1}/${total}</span></div>
      <div>${esc(item.outbound.depart)} – ${esc(item.outbound.arrive)} · ${esc(item.outbound.durationText)} · ${esc(item.outbound.stopLabel)}</div>
      <div class="row"><span>${moneyUsd(item.totalUsd)}</span><span class="pi">${moneyPi(item.totalPi)}</span></div>
      <div class="row"><button class="mini" id="prev" type="button">Previous</button><button class="mini" id="next" type="button">Next airline</button></div>
    </div>`;
  }
  return `<div class="result">
    <div class="row"><strong>${esc(item.name)}</strong><span>${item.rating.toFixed(1)} ★</span></div>
    <div class="chips">${item.facilities.map((name) => `<span>${esc(name)}</span>`).join("")}</div>
    <div class="row"><span>${moneyUsd(state.roomType === "Suite" ? item.totalSuiteUsd : item.totalDeluxeUsd)} · ${esc(state.roomType)}</span><span class="pi">${moneyPi(state.roomType === "Suite" ? item.totalSuitePi : item.totalDeluxePi)}</span></div>
    <div class="row">
      <button class="mini" id="prev" type="button">Previous</button>
      <button class="mini" id="room" type="button">${state.roomType === "Suite" ? "Use Deluxe" : "Use Suite"}</button>
      <button class="mini" id="next" type="button">Next hotel</button>
    </div>
  </div>`;
}

function render() {
  const flight = state.mode === "flight";
  root.innerHTML = `<div class="screen">
    <header class="head">
      <img class="logo" src="logo.jpg" alt="Shubham Holidays logo" />
      <div><h1>Shubham Holidays</h1><p>Book flights and hotels using Pi</p></div>
      <button id="login" type="button">${state.user ? esc(state.user.username) : "Pi login"}</button>
    </header>
    <div class="rate">${rateLine()}</div>
    <div class="switch">
      <button type="button" data-mode="flight" class="${flight ? "on" : ""}">Book Flight</button>
      <button type="button" data-mode="hotel" class="${flight ? "" : "on"}">Book Hotel</button>
    </div>
    <form class="form" id="search">
      ${flight ? `
        <label>From<select name="from">${options(FLIGHT_CITIES, "Mumbai")}</select></label>
        <label>To<select name="to">${options(FLIGHT_CITIES, "Goa")}</select></label>
        <label>Depart<input type="date" name="departureDate" required value="${iso(7)}" min="${iso(0)}"></label>
        <label>Return<input type="date" name="returnDate" min="${iso(0)}"></label>
      ` : `
        <label class="span2">City<select name="city">${options(HOTEL_CITIES, "Goa")}</select></label>
        <label>Check-in<input type="date" name="checkIn" required value="${iso(7)}" min="${iso(0)}"></label>
        <label>Check-out<input type="date" name="checkOut" required value="${iso(8)}" min="${iso(1)}"></label>
        <label>Rooms<input type="number" name="rooms" min="1" max="5" value="1" required></label>
        <label>Guests<input type="number" name="guests" min="1" max="8" value="2" required></label>
      `}
      <button class="primary span2" ${state.busy ? "disabled" : ""}>Search</button>
    </form>
    ${resultHtml()}
    <div class="pay">
      <label>Name<input name="guestName" id="guestName" required placeholder="Full name"></label>
      <label>${flight ? "Age" : "Phone"}<input id="guestExtra" ${flight ? 'type="number" min="1" max="120" placeholder="Age"' : 'placeholder="Phone"'} required></label>
      ${flight ? `<label class="span2">Phone<input id="guestPhone" placeholder="10-digit mobile" required></label>` : ""}
      <div class="msg ${state.error ? "bad" : "ok"} span2">${esc(state.error || state.notice || "Fast, secure Pi payment.")}</div>
      <button class="primary" id="book" type="button" ${state.busy ? "disabled" : ""}>Pay with Pi</button>
    </div>
  </div>`;
  bind();
}

function bind() {
  document.getElementById("login").onclick = async () => {
    if (!state.user) return login();
    try { await api("/api/logout", { method: "POST", body: {} }); } catch (error) { /* local sign-out */ }
    state.token = "";
    state.user = null;
    state.points = 0;
    localStorage.removeItem("sh_token");
    render();
  };
  root.querySelectorAll("[data-mode]").forEach((button) => {
    button.onclick = () => {
      state.mode = button.dataset.mode;
      state.index = 0;
      state.booking = null;
      state.error = "";
      render();
    };
  });
  document.getElementById("search").onsubmit = onSearch;
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");
  if (prev) prev.onclick = () => step(-1);
  if (next) next.onclick = () => step(1);
  const room = document.getElementById("room");
  if (room) room.onclick = () => { state.roomType = state.roomType === "Suite" ? "Deluxe" : "Suite"; render(); };
  const book = document.getElementById("book");
  if (book) book.onclick = bookCurrent;
  const download = document.getElementById("download");
  if (download) download.onclick = () => downloadTicket(state.booking);
  const retry = document.getElementById("retry-pay");
  if (retry) retry.onclick = () => startPayment(state.booking);
  const clear = document.getElementById("clear-booking");
  if (clear) clear.onclick = () => { state.booking = null; state.notice = ""; render(); };
}
function step(delta) {
  const list = state.mode === "flight" ? state.trips : state.hotels;
  if (!list.length) return;
  state.index = (state.index + delta + list.length) % list.length;
  render();
}
async function onSearch(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  state.busy = true;
  state.error = "";
  state.booking = null;
  state.index = 0;
  render();
  try {
    if (state.mode === "flight") {
      const body = {
        from: form.get("from"), to: form.get("to"), departureDate: form.get("departureDate"), returnDate: form.get("returnDate"), passengers: 1,
      };
      const data = state.offline ? window.ShCatalog.searchFlights(body) : await api("/api/flights/search", { method: "POST", body });
      state.trips = data.trips;
      state.flightQuery = data;
    } else {
      const body = {
        city: form.get("city"), checkIn: form.get("checkIn"), checkOut: form.get("checkOut"),
        rooms: Number(form.get("rooms")), guests: Number(form.get("guests")),
      };
      const data = state.offline ? window.ShCatalog.searchHotels(body) : await api("/api/hotels/search", { method: "POST", body });
      state.hotels = data.hotels;
      state.stay = data;
    }
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}
function guestFields() {
  return {
    name: document.getElementById("guestName").value,
    extra: document.getElementById("guestExtra").value,
    phone: state.mode === "flight" ? document.getElementById("guestPhone").value : document.getElementById("guestExtra").value,
  };
}
async function bookCurrent() {
  if (state.offline) {
    state.error = "This free page can search fares. Pi payment needs the booking server, which GitHub Pages cannot run.";
    render();
    return;
  }
  if (!state.user) { state.error = "Login with Pi before paying."; render(); login(); return; }
  const item = current();
  if (!item) { state.error = "Search and choose a flight or hotel first."; render(); return; }
  const guest = guestFields();
  state.busy = true;
  state.error = "";
  render();
  try {
    const data = state.mode === "flight"
      ? await api("/api/bookings/flight", { method: "POST", body: {
        from: item.outbound.from, to: item.outbound.to, departureDate: item.outbound.date,
        returnDate: item.inbound ? item.inbound.date : "",
        passengers: [{ name: guest.name, age: Number(guest.extra), phone: guest.phone }],
        flightId: item.id, pointsToRedeem: 0,
      } })
      : await api("/api/bookings/hotel", { method: "POST", body: {
        city: state.stay.city, checkIn: state.stay.checkIn, checkOut: state.stay.checkOut,
        rooms: state.stay.rooms, guests: state.stay.guests, hotelId: item.id, roomType: state.roomType,
        guest: { name: guest.name, phone: guest.phone }, pointsToRedeem: 0,
      } });
    state.points = data.points;
    state.booking = data.booking;
    state.notice = data.booking.pnr ? `Ticket confirmed. PNR ${data.booking.pnr}.` : "Confirm the Pi payment.";
    state.busy = false;
    render();
    if (data.booking.amount > 0) await startPayment(data.booking);
  } catch (error) {
    state.error = error.message;
    state.busy = false;
    render();
  }
}
async function startPayment(booking) {
  if (!booking || booking.amount <= 0) return;
  if (!window.Pi || typeof Pi.createPayment !== "function" || !inPiApp()) {
    state.error = "Open this app in Pi Browser to pay with Pi. The booking is saved.";
    render();
    return;
  }
  state.busy = true;
  render();
  try {
    await Pi.authenticate(["username", "payments", "wallet_address"], onIncomplete);
    const result = await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (ok, value) => { if (settled) return; settled = true; if (ok) resolve(value); else reject(value); };
      Pi.createPayment({ amount: booking.amount, memo: booking.memo, metadata: { bookingId: booking.id } }, {
        onReadyForServerApproval(paymentId) { api("/api/payments/approve", { method: "POST", body: { paymentId } }).catch((error) => finish(false, error)); },
        onReadyForServerCompletion(paymentId, txid) {
          api("/api/payments/complete", { method: "POST", body: { paymentId, txid } }).then((data) => finish(true, data)).catch((error) => finish(false, error));
        },
        onCancel() { finish(false, new Error("Payment cancelled. The booking stays pending.")); },
        onError(error) { finish(false, new Error((error && error.message) || "Pi payment failed.")); },
      });
    });
    state.points = result.points;
    state.booking = result.booking;
    state.notice = `Ticket confirmed. PNR ${result.booking.pnr}.`;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}
function downloadTicket(booking) {
  const html = `<!DOCTYPE html><meta charset="utf-8"><title>${esc(booking.pnr || "Ticket")}</title><h1>Shubham Holidays</h1><p>${esc(booking.summary)}</p><p>PNR ${esc(booking.pnr || "-")}</p><p>${moneyPi(booking.amount)} at ${rateLine()}</p>`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  link.download = `${booking.pnr || booking.id}.html`;
  link.click();
}
async function boot() {
  try {
    state.config = await api("/api/config");
  } catch (error) {
    state.offline = true;
    state.config = { piUsdValue: 314159, sandbox: true, clientId: "", paymentsReady: false };
  }
  if (window.Pi) { try { Pi.init({ version: "2.0", sandbox: Boolean(state.config.sandbox) }); } catch (error) { /* outside Pi Browser */ } }
  try { await consumeHash(); } catch (error) { state.error = error.message; }
  if (state.token && !state.user) {
    try {
      const me = await api("/api/me");
      state.user = me.user;
      state.points = me.points;
    } catch (error) { state.token = ""; }
  }
  render();
}
boot().catch((error) => { root.textContent = error.message; });
