const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dataFile = path.join(os.tmpdir(), `shubham-holidays-${process.pid}.json`);
process.env.DATA_FILE = dataFile;
process.env.PI_API_KEY = "";

const pricing = require("../lib/pricing");
const catalog = require("../lib/catalog");
const store = require("../lib/store");
const pi = require("../lib/pi");
const app = require("../server");

function iso(daysAhead) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

test("1 Pi is worth $314,159", () => {
  assert.equal(pricing.PI_USD_VALUE, 314159);
  assert.equal(pricing.usdToPi(314159), 1);
  assert.equal(pricing.usdToPi(0), 0);
  assert.equal(pricing.usdToPi(157079.5), 0.5);
});

test("bonus points do not change the fare", () => {
  const priced = pricing.applyPoints(120, 50, 40);
  assert.equal(priced.pointsRedeemed, 0);
  assert.equal(priced.pointsEarned, 0);
  assert.equal(priced.payableUsd, 120);
  assert.equal(priced.amountPi, pricing.usdToPi(120));
});

test("flight search lists IndiGo, Air India, SpiceJet, and Emirates", () => {
  const result = catalog.searchFlights({
    from: "Mumbai",
    to: "Delhi",
    departureDate: iso(7),
    passengers: 1,
  });
  assert.deepEqual(
    result.trips.map((trip) => trip.airline).sort(),
    ["Air India", "Emirates", "IndiGo", "SpiceJet"]
  );
  for (const trip of result.trips) {
    assert.equal(trip.totalPi, pricing.usdToPi(trip.totalUsd));
    assert.ok(trip.totalUsd >= 40);
  }
});

test("a booking charges the full fare in Pi", async (t) => {
  const server = app.listen(0);
  t.after(() => {
    server.close();
    fs.rmSync(dataFile, { force: true });
  });
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  await store.update((data) => {
    data.sessions.tok = {
      uid: "pioneer-1",
      username: "pioneer",
      exp: Date.now() + 60_000,
    };
    data.points["pioneer-1"] = 1000;
  });

  const search = await fetch(`${base}/api/flights/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Mumbai",
      to: "Goa",
      departureDate: iso(10),
      passengers: 1,
    }),
  }).then((response) => response.json());

  const trip = search.trips[0];
  const created = await fetch(`${base}/api/bookings/flight`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
    body: JSON.stringify({
      from: "Mumbai",
      to: "Goa",
      departureDate: iso(10),
      passengers: [{ name: "Asha Mehta", age: 32, phone: "9876543210" }],
      flightId: trip.id,
      pointsToRedeem: 1000,
    }),
  }).then((response) => response.json());

  assert.equal(created.booking.status, "pending");
  assert.equal(created.booking.pointsRedeemed, 0);
  assert.equal(created.booking.payableUsd, trip.totalUsd);
  assert.equal(created.booking.amount, pricing.usdToPi(trip.totalUsd));
  assert.equal(created.points, 1000);

  const partial = await fetch(`${base}/api/bookings/flight`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer tok" },
    body: JSON.stringify({
      from: "Mumbai",
      to: "Goa",
      departureDate: iso(10),
      passengers: [{ name: "Ravi Shah", age: 28, phone: "+91 9988776655" }],
      flightId: search.trips[1].id,
      pointsToRedeem: 10,
    }),
  });
  const pending = await partial.json();
  assert.equal(partial.status, 201);
  assert.equal(pending.booking.status, "pending");
  assert.equal(pending.booking.pointsRedeemed, 0);
  assert.equal(pending.booking.amount, pricing.usdToPi(pending.booking.payableUsd));
  assert.ok(pending.booking.amount > 0);

  const quote = pricing.cancellationQuote(1);
  assert.equal(quote.feePi, 0.1);
  assert.equal(quote.refundPi, 0.9);

  await store.update((data) => {
    data.points["pioneer-1"] = 20;
    data.bookings.push({
      id: "paid-1",
      uid: "pioneer-1",
      username: "pioneer",
      status: "confirmed",
      amount: 1,
      pointsEarned: 4,
      pointsCredited: true,
      paymentId: "u2a-1",
      summary: "Test flight",
      pnr: "SHTEST",
    });
  });

  const blocked = await fetch(`${base}/api/bookings/paid-1/cancel`, {
    method: "POST",
    headers: { Authorization: "Bearer tok" },
  });
  assert.equal(blocked.status, 503);
  assert.equal(store.snapshot().bookings.find((item) => item.id === "paid-1").status, "confirmed");

  const calls = [];
  pi.setA2UClientForTests({
    async createPayment(data) {
      calls.push("create");
      assert.equal(data.amount, 0.9);
      assert.equal(data.uid, "pioneer-1");
      assert.equal(data.metadata.bookingId, "paid-1");
      assert.equal(data.metadata.kind, "refund");
      return "refund-1";
    },
    async submitPayment() {
      calls.push("submit");
      return "tx-refund-1";
    },
    async completePayment(paymentId, txid) {
      calls.push("complete");
      return {
        identifier: paymentId,
        user_uid: "pioneer-1",
        amount: 0.9,
        direction: "app_to_user",
        metadata: { bookingId: "paid-1", kind: "refund" },
        status: { developer_completed: true, cancelled: false, user_cancelled: false },
        transaction: { txid },
      };
    },
    async getIncompleteServerPayments() {
      return [];
    },
  });
  t.after(() => pi.setA2UClientForTests(null));

  const refundedResponse = await fetch(`${base}/api/bookings/paid-1/cancel`, {
    method: "POST",
    headers: { Authorization: "Bearer tok" },
  });
  const refunded = await refundedResponse.json();
  assert.equal(refundedResponse.status, 200);
  assert.equal(refunded.booking.status, "cancelled");
  assert.equal(refunded.booking.refund.feePi, 0.1);
  assert.equal(refunded.booking.refund.refundPi, 0.9);
  assert.equal(refunded.points, 16);

  const again = await fetch(`${base}/api/bookings/paid-1/cancel`, {
    method: "POST",
    headers: { Authorization: "Bearer tok" },
  });
  assert.equal(again.status, 200);
  assert.deepEqual(calls, ["create", "submit", "complete"]);
});
