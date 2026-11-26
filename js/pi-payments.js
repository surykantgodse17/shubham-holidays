import {
  convertINRtoPi,
  convertPiToUSD,
  PI_VALUE_USD
} from "../lib/pi-config.js";

var STORAGE_KEY = "shubham-holidays-bookings";
var SANDBOX_MIN_PI = 0.0001;
var selection = { destination: "", inr: 0 };

function formatInr(amount) {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

function formatUsd(amount) {
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPi(amount) {
  return Number(amount).toFixed(6);
}

function formatRate() {
  return "$" + PI_VALUE_USD.toLocaleString("en-US");
}

function isSandbox() {
  var host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "";
}

function quoteFromInr(inr) {
  var pi = convertINRtoPi(inr);
  return { inr: inr, pi: pi, usd: convertPiToUSD(pi) };
}

function chargeFor(gcvPi, testMode) {
  if (testMode) return { amount: 1, reason: "test" };
  if (isSandbox() && gcvPi < SANDBOX_MIN_PI) return { amount: 1, reason: "minimum" };
  return { amount: gcvPi, reason: "gcv" };
}

function testModeOn() {
  var box = document.querySelector("[data-test-mode]");
  return !box || box.checked;
}

function readBookings() {
  try {
    var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeBookings(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  renderBookings();
}

function renderPackagePrices() {
  document.querySelectorAll(".package-card").forEach(function (card) {
    var inr = Number(card.dataset.inr);
    var line = card.querySelector(".pi-price");
    if (!inr || !line) return;
    var quote = quoteFromInr(inr);
    line.textContent = formatInr(quote.inr) + " = " + formatPi(quote.pi) + " Pi (GCV " + formatRate() + ")";
  });
}

function renderPanels() {
  var testMode = testModeOn();
  document.querySelectorAll("[data-mode-label]").forEach(function (label) {
    label.textContent = testMode
      ? "Test Mode: Charge 1 Test-Pi"
      : "GCV Mode: Charge Real Pi Value";
  });
  document.querySelectorAll("[data-test-mode]").forEach(function (box) {
    box.checked = testMode;
  });

  var priced = selection.inr > 0;
  var quote = priced ? quoteFromInr(selection.inr) : null;
  var charge = quote ? chargeFor(quote.pi, testMode) : null;

  document.querySelectorAll("[data-pay-panel]").forEach(function (panel) {
    var line = panel.querySelector("[data-pay-line]");
    var breakdown = panel.querySelector("[data-pay-breakdown]");
    var note = panel.querySelector("[data-pay-note]");
    var button = panel.querySelector("[data-pay-pi]");
    if (!quote) {
      if (line) line.textContent = "Choose a package to see the GCV fare.";
      if (breakdown) breakdown.textContent = "";
      if (note) note.textContent = "1 Pi = " + formatRate() + " (GCV)";
      if (button) button.disabled = true;
      return;
    }
    if (line) {
      line.textContent = "You Pay: " + formatPi(quote.pi) + " Pi = " + formatUsd(quote.usd) + " = " + formatInr(quote.inr);
    }
    if (breakdown) {
      breakdown.textContent = "INR Price " + formatInr(quote.inr)
        + " · USD Price " + formatUsd(quote.usd)
        + " · Pi Price (GCV) " + formatPi(quote.pi) + " Pi";
    }
    if (note) {
      if (charge.reason === "test") {
        note.textContent = "The line above is the real GCV fare. Pi.createPayment will charge 1 Test-Pi.";
      } else if (charge.reason === "minimum") {
        note.textContent = "This GCV fare is under 0.0001 Pi, so Sandbox charges 1 Test-Pi. The line above stays the real GCV value.";
      } else {
        note.textContent = "1 Pi = " + formatRate() + " (GCV). Pi.createPayment will charge " + formatPi(charge.amount) + " Pi.";
      }
    }
    if (button) button.disabled = false;
  });
}

function renderBookings() {
  var list = document.querySelector("#booking-list");
  var empty = document.querySelector("#booking-empty");
  if (!list) return;
  var bookings = readBookings();
  list.replaceChildren();
  if (empty) empty.hidden = bookings.length > 0;
  bookings.forEach(function (item) {
    var article = document.createElement("article");
    article.className = "booking-item";
    var title = document.createElement("h3");
    title.textContent = item.destination || "Holiday";
    var amounts = document.createElement("p");
    amounts.textContent = "Paid " + formatPi(item.chargedPi) + " Pi and " + formatInr(item.inr)
      + " · GCV " + formatPi(item.gcvPi) + " Pi (" + formatUsd(item.usd) + ")";
    var meta = document.createElement("p");
    meta.className = "booking-meta";
    meta.textContent = (item.status || "Saved") + (item.createdAt ? " · " + item.createdAt : "");
    article.append(title, amounts, meta);
    list.append(article);
  });
}

function applySelection(destination, inr) {
  var nextInr = Number(inr) || 0;
  if (!nextInr && destination) {
    var card = document.querySelector('.package-card[data-destination="' + destination + '"]');
    if (card) nextInr = Number(card.dataset.inr) || 0;
  }
  selection = { destination: destination || "", inr: nextInr };
  renderPanels();
}

function setNote(text) {
  document.querySelectorAll("[data-pay-note]").forEach(function (el) {
    el.textContent = text;
  });
}

function saveBooking(entry) {
  var bookings = readBookings();
  bookings.unshift(entry);
  writeBookings(bookings);
}

function updateBooking(paymentId, patch) {
  if (!paymentId) return;
  var bookings = readBookings();
  var found = bookings.find(function (item) { return item.paymentId === paymentId; });
  if (!found) return;
  Object.assign(found, patch);
  writeBookings(bookings);
}

function payWithPi() {
  if (!selection.inr) {
    setNote("Choose Goa, Manali, Kerala, Dubai, or Kashmir to pay in Pi.");
    return;
  }
  var form = document.querySelector("#booking-form");
  var dialog = document.querySelector("#booking-dialog");
  if (form && !form.checkValidity()) {
    if (dialog && !dialog.open && typeof dialog.showModal === "function") dialog.showModal();
    form.reportValidity();
    return;
  }

  var quote = quoteFromInr(selection.inr);
  var testMode = testModeOn();
  var charge = chargeFor(quote.pi, testMode);
  var amount = Number(charge.amount.toFixed(7));
  var name = form && form.elements.name ? form.elements.name.value.trim() : "";
  var record = {
    id: Date.now(),
    destination: selection.destination,
    name: name,
    inr: quote.inr,
    usd: quote.usd,
    gcvPi: quote.pi,
    chargedPi: amount,
    testMode: charge.reason !== "gcv",
    status: "Ready to pay",
    createdAt: new Date().toLocaleString("en-IN"),
    paymentId: ""
  };

  var Pi = window.Pi;
  if (!Pi || typeof Pi.createPayment !== "function") {
    record.status = "Saved on this device — open in Pi Browser to pay";
    saveBooking(record);
    setNote("Pi Browser did not provide Pi.createPayment. Saved under My Bookings. Open this page in Pi Browser to charge "
      + (charge.reason === "gcv" ? formatPi(amount) + " Pi" : "1 Test-Pi") + ".");
    var bookings = document.getElementById("my-bookings");
    if (bookings) bookings.scrollIntoView({ behavior: "smooth", block: "start" });
    if (dialog && dialog.open) dialog.close();
    return;
  }

  Pi.authenticate(["payments"], function (payment) {
    var metadata = payment.metadata || {};
    saveBooking({
      id: Date.now(),
      destination: metadata.destination || "Holiday",
      name: metadata.name || "",
      inr: Number(metadata.inr) || 0,
      usd: Number(metadata.usd) || 0,
      gcvPi: Number(metadata.gcvPi) || 0,
      chargedPi: Number(payment.amount) || 0,
      testMode: false,
      status: "Incomplete payment",
      createdAt: new Date().toLocaleString("en-IN"),
      paymentId: payment.identifier || ""
    });
  }).then(function () {
    Pi.createPayment({
      amount: amount,
      memo: ("Shubham Holidays " + selection.destination).slice(0, 100),
      metadata: {
        destination: selection.destination,
        name: name,
        inr: quote.inr,
        usd: Number(quote.usd.toFixed(2)),
        gcvPi: Number(quote.pi.toFixed(7))
      }
    }, {
      onReadyForServerApproval: function (paymentId) {
        record.paymentId = paymentId;
        record.status = "Awaiting server approval";
        saveBooking(record);
        setNote("Payment started for " + formatPi(amount) + " Pi. The server still needs to approve " + paymentId + ".");
      },
      onReadyForServerCompletion: function (paymentId, txid) {
        updateBooking(paymentId, { status: "Paid · " + txid });
        setNote("Payment submitted. Transaction " + txid + ".");
      },
      onCancel: function (paymentId) {
        updateBooking(paymentId, { status: "Cancelled" });
        setNote("Payment cancelled.");
      },
      onError: function (error) {
        record.status = "Payment error";
        saveBooking(record);
        setNote(error && error.message ? error.message : "Pi could not start this payment.");
      }
    });
  }).catch(function (error) {
    setNote(error && error.message ? error.message : "Pi sign-in was cancelled.");
  });
}

window.shubhamQuote = function (destination) {
  var card = document.querySelector('.package-card[data-destination="' + destination + '"]');
  if (!card) return null;
  var quote = quoteFromInr(Number(card.dataset.inr));
  return "You Pay: " + formatPi(quote.pi) + " Pi = " + formatUsd(quote.usd) + " = " + formatInr(quote.inr) + " (GCV)";
};

if (window.Pi && typeof window.Pi.init === "function") {
  window.Pi.init({ version: "2.0", sandbox: isSandbox() });
}

document.querySelectorAll("[data-test-mode]").forEach(function (box) {
  box.addEventListener("change", function () {
    var on = box.checked;
    document.querySelectorAll("[data-test-mode]").forEach(function (other) {
      other.checked = on;
    });
    renderPanels();
  });
});

document.querySelectorAll("[data-pay-pi]").forEach(function (button) {
  button.addEventListener("click", payWithPi);
});

document.addEventListener("shubham:book", function (event) {
  var detail = event.detail || {};
  applySelection(detail.destination, detail.inr);
});

document.querySelectorAll(".enquiry-form select[name='destination']").forEach(function (select) {
  select.addEventListener("change", function () {
    applySelection(select.value, 0);
  });
});

renderPackagePrices();
renderPanels();
renderBookings();
