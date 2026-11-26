require("dotenv").config();

const crypto = require("crypto");
const path = require("path");
const express = require("express");
const catalog = require("./lib/catalog");
const store = require("./lib/store");
const pi = require("./lib/pi");
const pricing = require("./lib/pricing");
const refunds = require("./lib/refunds");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "80kb" }));
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://sdk.minepi.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://images.unsplash.com",
      "connect-src 'self' https://api.minepi.com https://socialchain.app https://accounts.pinet.com",
      "frame-ancestors 'self' https://*.pinet.com https://*.minepi.com",
      "base-uri 'self'",
      "form-action 'self' https://accounts.pinet.com",
    ].join("; ")
  );
  next();
});

function redirectFor(req) {
  const configured = (process.env.PI_REDIRECT_URI || "http://localhost:3000").trim();
  const host = (req && req.get("host")) || "";
  const proto = ((req && req.get("x-forwarded-proto")) || "http").split(",")[0].trim();
  if (host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `${proto}://${host}`;
  return configured;
}

function publicConfig(req) {
  return {
    clientId: (process.env.PI_CLIENT_ID || "").trim(),
    redirectUri: redirectFor(req),
    sandbox: String(process.env.PI_SANDBOX || "true").toLowerCase() !== "false",
    cancelFeeRate: pricing.CANCEL_FEE_RATE,
    piUsdValue: pricing.PI_USD_VALUE,
    pointUsdValue: pricing.POINT_USD,
    earnRate: pricing.EARN_RATE,
    paymentsReady: Boolean(pi.apiKey()),
  };
}

function sendError(res, error) {
  const status = error.status || 500;
  const message = status >= 500 && status !== 503 ? "Something went wrong. Please try again." : error.message;
  if (status >= 500) console.error(error);
  res.status(status).json({ error: message });
}

function auth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return res.status(401).json({ error: "Sign in with your Pi account to continue." });
  const session = store.snapshot().sessions[token];
  if (!session || session.exp < Date.now()) {
    return res.status(401).json({ error: "Your sign-in expired. Please sign in with Pi again." });
  }
  req.user = session;
  req.token = token;
  next();
}

function pointsOf(data, uid) {
  return Math.max(0, Math.floor(Number(data.points[uid]) || 0));
}

function makePnr(data) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 25; attempt += 1) {
    let pnr = "SH";
    for (let i = 0; i < 5; i += 1) pnr += alphabet[crypto.randomInt(alphabet.length)];
    if (!data.bookings.some((item) => item.pnr === pnr)) return pnr;
  }
  return `SH${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function memoFor(booking) {
  const label = booking.type === "hotel" ? "Hotel" : booking.type === "combo" ? "Package" : "Flight";
  return `Shubham Holidays ${label}`.slice(0, 100);
}

function holdBooking(data, user, draft, priced) {
  const balance = pointsOf(data, user.uid);
  if (priced.pointsRedeemed > balance) {
    const error = new Error("You do not have enough bonus points for that discount.");
    error.status = 400;
    throw error;
  }
  const booking = {
    id: crypto.randomBytes(9).toString("hex"),
    uid: user.uid,
    username: user.username,
    status: priced.amountPi > 0 ? "pending" : "confirmed",
    pnr: priced.amountPi > 0 ? null : makePnr(data),
    createdAt: new Date().toISOString(),
    confirmedAt: priced.amountPi > 0 ? null : new Date().toISOString(),
    fareUsd: priced.fareUsd,
    pointsRedeemed: priced.pointsRedeemed,
    pointsDiscountUsd: priced.pointsDiscountUsd,
    payableUsd: priced.payableUsd,
    amount: priced.amountPi,
    pointsEarned: priced.pointsEarned,
    pointsCredited: false,
    pointsReleased: priced.pointsRedeemed === 0,
    piUsdValue: pricing.PI_USD_VALUE,
    paymentId: null,
    txid: null,
    ...draft,
  };
  booking.memo = memoFor(booking);
  if (priced.pointsRedeemed > 0) {
    data.points[user.uid] = balance - priced.pointsRedeemed;
  }
  if (booking.status === "confirmed") {
    data.points[user.uid] = pointsOf(data, user.uid) + booking.pointsEarned;
    booking.pointsCredited = true;
  }
  data.bookings.push(booking);
  return booking;
}

function priceDraft(data, user, amountUsd, pointsRequested) {
  return pricing.applyPoints(amountUsd, pointsOf(data, user.uid), pointsRequested);
}

function confirmBooking(data, booking, paymentId, txid) {
  if (booking.status === "confirmed" && booking.pointsCredited) return booking;
  if (booking.status === "cancelled") {
    const error = new Error("This booking was cancelled.");
    error.status = 400;
    throw error;
  }
  booking.status = "confirmed";
  booking.pnr = booking.pnr || makePnr(data);
  booking.paymentId = paymentId || booking.paymentId;
  booking.txid = txid || booking.txid;
  booking.confirmedAt = booking.confirmedAt || new Date().toISOString();
  if (!booking.pointsCredited) {
    data.points[booking.uid] = pointsOf(data, booking.uid) + (booking.pointsEarned || 0);
    booking.pointsCredited = true;
  }
  return booking;
}

function releasePoints(data, booking) {
  if (booking.pointsReleased || !booking.pointsRedeemed) {
    booking.pointsReleased = true;
    return;
  }
  if (booking.pointsCredited) return;
  data.points[booking.uid] = pointsOf(data, booking.uid) + booking.pointsRedeemed;
  booking.pointsReleased = true;
}

function publicBooking(booking) {
  return {
    id: booking.id,
    type: booking.type,
    status: booking.status,
    pnr: booking.pnr,
    createdAt: booking.createdAt,
    confirmedAt: booking.confirmedAt,
    fareUsd: booking.fareUsd,
    pointsRedeemed: booking.pointsRedeemed,
    pointsDiscountUsd: booking.pointsDiscountUsd,
    payableUsd: booking.payableUsd,
    amount: booking.amount,
    pointsEarned: booking.pointsEarned,
    piUsdValue: booking.piUsdValue,
    memo: booking.memo,
    summary: booking.summary,
    details: booking.details,
    refund: booking.refund
      ? {
          status: booking.refund.status,
          paidPi: booking.refund.paidPi,
          feePi: booking.refund.feePi,
          refundPi: booking.refund.refundPi,
          txid: booking.refund.txid || null,
        }
      : null,
  };
}

app.get("/api/config", (req, res) => {
  res.json(publicConfig(req));
});

app.get("/api/offers", (req, res) => {
  res.json({
    piUsdValue: pricing.PI_USD_VALUE,
    offers: catalog.COMBOS.map((combo) => ({
      id: combo.id,
      title: combo.title,
      label: combo.label,
      from: combo.from,
      to: combo.to,
      fareUsd: combo.price,
      amountPi: pricing.usdToPi(combo.price),
    })),
  });
});

app.get("/validation-key.txt", (req, res) => {
  const key = (process.env.PI_VALIDATION_KEY || "").trim();
  if (!key) return res.status(404).type("text/plain").send("Not configured");
  res.type("text/plain").send(key);
});

app.post("/api/session", async (req, res) => {
  try {
    const profile = await pi.fetchMe(req.body && req.body.accessToken);
    const token = crypto.randomBytes(32).toString("hex");
    const session = {
      uid: profile.uid,
      username: profile.username,
      walletAddress: profile.walletAddress,
      exp: Date.now() + SESSION_MS,
    };
    const points = await store.update((data) => {
      data.sessions[token] = session;
      const now = Date.now();
      for (const key of Object.keys(data.sessions)) {
        if (data.sessions[key].exp < now) delete data.sessions[key];
      }
      return pointsOf(data, profile.uid);
    });
    res.json({ token, user: { username: profile.username, uid: profile.uid }, points });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/logout", auth, async (req, res) => {
  await store.update((data) => {
    delete data.sessions[req.token];
  });
  res.json({ ok: true });
});

app.get("/api/me", auth, (req, res) => {
  const data = store.snapshot();
  res.json({
    user: { username: req.user.username, uid: req.user.uid },
    points: pointsOf(data, req.user.uid),
  });
});

app.post("/api/flights/search", (req, res) => {
  try {
    res.json(catalog.searchFlights(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/hotels/search", (req, res) => {
  try {
    res.json(catalog.searchHotels(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/bookings/flight", auth, async (req, res) => {
  try {
    const body = req.body || {};
    const people = Array.isArray(body.passengers) ? body.passengers : body.travellers;
    const quote = catalog.quoteFlight({
      ...body,
      passengers: Array.isArray(body.passengers) ? body.passengers.length : body.passengers,
    });
    const passengers = catalog.flightPassengers(people, quote.passengers);
    const booking = await store.update((data) => {
      const priced = priceDraft(data, req.user, quote.trip.totalUsd, body.pointsToRedeem);
      return holdBooking(data, req.user, {
        type: "flight",
        summary: `${quote.trip.airline} ${quote.from} to ${quote.to}`,
        details: {
          airline: quote.trip.airline,
          from: quote.from,
          to: quote.to,
          departureDate: quote.departureDate,
          returnDate: quote.returnDate,
          passengers,
          outbound: quote.trip.outbound,
          inbound: quote.trip.inbound,
          tripType: quote.trip.tripType,
        },
      }, priced);
    });
    res.status(201).json({ booking: publicBooking(booking), points: pointsOf(store.snapshot(), req.user.uid) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/bookings/hotel", auth, async (req, res) => {
  try {
    const body = req.body || {};
    const quote = catalog.quoteHotel(body);
    const guest = catalog.guestDetails(body.guest);
    const booking = await store.update((data) => {
      const priced = priceDraft(data, req.user, quote.amountUsd, body.pointsToRedeem);
      return holdBooking(data, req.user, {
        type: "hotel",
        summary: `${quote.hotel.name}, ${quote.city}`,
        details: {
          hotelId: quote.hotel.id,
          hotelName: quote.hotel.name,
          city: quote.city,
          checkIn: quote.checkIn,
          checkOut: quote.checkOut,
          nights: quote.nights,
          rooms: quote.rooms,
          guests: quote.guests,
          roomType: quote.roomType,
          facilities: quote.hotel.facilities,
          image: quote.hotel.image,
          guest,
        },
      }, priced);
    });
    res.status(201).json({ booking: publicBooking(booking), points: pointsOf(store.snapshot(), req.user.uid) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/bookings/combo", auth, async (req, res) => {
  try {
    const body = req.body || {};
    const quote = catalog.quoteCombo(body.comboId, body.departureDate);
    const passenger = catalog.flightPassengers([body.passenger], 1)[0];
    const booking = await store.update((data) => {
      const priced = priceDraft(data, req.user, quote.amountUsd, body.pointsToRedeem);
      return holdBooking(data, req.user, {
        type: "combo",
        summary: quote.combo.title,
        details: {
          title: quote.combo.title,
          from: quote.combo.from,
          to: quote.combo.to,
          airline: quote.combo.airline,
          departureDate: quote.departureDate,
          returnDate: quote.returnDate,
          hotelName: quote.hotel.name,
          city: quote.hotel.city,
          roomType: quote.combo.roomType,
          nights: quote.combo.nights,
          facilities: quote.hotel.facilities,
          image: quote.hotel.image,
          passenger,
        },
      }, priced);
    });
    res.status(201).json({ booking: publicBooking(booking), points: pointsOf(store.snapshot(), req.user.uid) });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/bookings", auth, (req, res) => {
  const data = store.snapshot();
  const bookings = data.bookings
    .filter((item) => item.uid === req.user.uid)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(publicBooking);
  res.json({ bookings, points: pointsOf(data, req.user.uid) });
});

app.post("/api/bookings/:id/cancel", auth, async (req, res) => {
  try {
    const booking = await store.update((data) => {
      const found = data.bookings.find((item) => item.id === req.params.id && item.uid === req.user.uid);
      if (!found) {
        const error = new Error("Booking not found.");
        error.status = 404;
        throw error;
      }
      if (found.status === "confirmed") return found;
      found.status = "cancelled";
      releasePoints(data, found);
      return found;
    });
    if (booking.status === "confirmed") {
      const refunded = await refunds.refundPaidBooking(req.user, req.params.id);
      return res.json({ booking: publicBooking(refunded), points: pointsOf(store.snapshot(), req.user.uid) });
    }
    res.json({ booking: publicBooking(booking), points: pointsOf(store.snapshot(), req.user.uid) });
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/payments/approve", auth, async (req, res) => {
  try {
    const paymentId = String((req.body && req.body.paymentId) || "").trim();
    if (!paymentId) {
      const error = new Error("Missing payment.");
      error.status = 400;
      throw error;
    }
    const payment = await pi.getPayment(paymentId);
    const bookingId = payment.metadata && (payment.metadata.bookingId || payment.metadata.booking_id);
    const booking = store.snapshot().bookings.find((item) => item.id === String(bookingId || "") && item.uid === req.user.uid);
    if (!booking || booking.status === "cancelled") {
      const error = new Error("No matching booking for this payment.");
      error.status = 404;
      throw error;
    }
    if (booking.status === "confirmed") return res.json({ ok: true, booking: publicBooking(booking) });
    pi.assertPaymentMatches(payment, booking, req.user);
    await store.update((data) => {
      const found = data.bookings.find((item) => item.id === booking.id && item.uid === req.user.uid);
      if (found && !found.paymentId) found.paymentId = paymentId;
      return found;
    });
    if (!(payment.status && payment.status.developer_approved)) {
      await pi.approvePayment(paymentId);
    }
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
});

async function finishPayment(user, paymentId, txid) {
  const id = String(paymentId || "").trim();
  const transactionId = String(txid || "").trim();
  if (!id || !transactionId) {
    const error = new Error("Payment id and transaction id are required.");
    error.status = 400;
    throw error;
  }
  const payment = await pi.getPayment(id);
  const bookingId = payment.metadata && (payment.metadata.bookingId || payment.metadata.booking_id);
  const existing = store.snapshot().bookings.find((item) => item.id === String(bookingId || "") && item.uid === user.uid);
  if (!existing) {
    const error = new Error("No matching booking for this payment.");
    error.status = 404;
    throw error;
  }
  pi.assertPaymentMatches(payment, existing, user);
  let completed = payment;
  if (!(payment.status && payment.status.developer_completed)) {
    completed = await pi.completePayment(id, transactionId);
  }
  if (completed && completed.status && completed.status.developer_completed === false) {
    const error = new Error("Pi has not completed this payment yet.");
    error.status = 502;
    throw error;
  }
  const booking = await store.update((data) => {
    const found = data.bookings.find((item) => item.id === existing.id && item.uid === user.uid);
    return confirmBooking(data, found, id, transactionId);
  });
  return { booking: publicBooking(booking), points: pointsOf(store.snapshot(), user.uid) };
}

app.post("/api/payments/complete", auth, async (req, res) => {
  try {
    const body = req.body || {};
    res.json(await finishPayment(req.user, body.paymentId, body.txid));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/payments/incomplete", auth, async (req, res) => {
  try {
    const payment = (req.body && req.body.payment) || {};
    const paymentId = payment.identifier || payment.id;
    const txid = payment.transaction && payment.transaction.txid;
    if (!paymentId || !txid) return res.json({ ok: true, skipped: true });
    res.json(await finishPayment(req.user, paymentId, txid));
  } catch (error) {
    sendError(res, error);
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(400).json({ error: "Could not read that request." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Shubham Holidays listening on ${PORT}`);
  });
}

module.exports = app;
