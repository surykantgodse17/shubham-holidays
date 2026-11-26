(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  var nav = document.querySelector("#site-nav");
  var toggle = document.querySelector(".nav-toggle");
  var toggleLabel = toggle.querySelector(".sr-only");
  var mobileQuery = window.matchMedia("(max-width: 860px)");
  var phoneAnchor = document.querySelector("[data-contact='phone']");
  var emailAnchor = document.querySelector("[data-contact='email']");
  var waDigits = (phoneAnchor.getAttribute("href") || "").replace(/\D/g, "");
  var emailAddress = (emailAnchor.getAttribute("href") || "").replace("mailto:", "").split("?")[0];

  function syncHeader() {
    header.classList.toggle("is-solid", window.scrollY > 20);
  }

  function setNavOpen(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggleLabel.textContent = open ? "Close menu" : "Open menu";
    document.body.classList.toggle("nav-lock", open);
    if ("inert" in nav) nav.inert = mobileQuery.matches && !open;
  }

  function closeNav() {
    setNavOpen(false);
  }

  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
  if ("inert" in nav && mobileQuery.matches) nav.inert = true;

  toggle.addEventListener("click", function () {
    setNavOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && header.classList.contains("is-open")) {
      closeNav();
      toggle.focus();
    }
  });

  mobileQuery.addEventListener("change", function () {
    if (!mobileQuery.matches) closeNav();
    else if ("inert" in nav) nav.inert = !nav.classList.contains("is-open");
  });

  var sections = ["home", "packages", "about", "booking", "my-bookings", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll("a"));
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          if (link.getAttribute("href") === "#" + entry.target.id) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0.01 });
    sections.forEach(function (section) { spy.observe(section); });
  }

  var year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  var today = new Date();
  var iso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  document.querySelectorAll("input[type='date']").forEach(function (input) {
    input.min = iso;
  });

  var cards = Array.prototype.slice.call(document.querySelectorAll(".package-card"));
  var filterBar = document.querySelector("#filter-bar");
  var filterText = document.querySelector("#filter-text");
  var emptyState = document.querySelector("#empty-state");
  var emptyCopy = document.querySelector("#empty-copy");
  var searchForm = document.querySelector("#trip-search");
  var searchQuery = document.querySelector("#search-q");
  var searchDate = document.querySelector("#search-date");
  var searchGuests = document.querySelector("#search-guests");

  function applyFilter(query) {
    var q = query.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var hay = (card.getAttribute("data-keywords") || "").toLowerCase();
      var match = !q || hay.indexOf(q) !== -1;
      card.classList.toggle("is-hidden", !match);
      if (match) shown += 1;
    });
    if (!q) {
      filterBar.hidden = true;
      emptyState.hidden = true;
      return;
    }
    filterBar.hidden = false;
    filterText.textContent = shown
      ? "Showing " + shown + (shown === 1 ? " trip" : " trips") + " for “" + query.trim() + "”."
      : "Nothing on this page matches “" + query.trim() + "”.";
    emptyState.hidden = shown !== 0;
    if (!shown) {
      emptyCopy.textContent = "We can still plan " + query.trim() + ". Send the travel desk a note and we will build the trip.";
    }
  }

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    applyFilter(searchQuery.value);
    document.getElementById("packages").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelector("#clear-filter").addEventListener("click", function () {
    searchQuery.value = "";
    applyFilter("");
    searchQuery.focus();
  });

  function clearErrors(form) {
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field.name) return;
      field.removeAttribute("aria-invalid");
    });
    form.querySelectorAll(".field-error").forEach(function (slot) {
      slot.textContent = "";
    });
  }

  function setError(form, name, message) {
    var field = form.elements[name];
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    if (!field) return;
    if (message) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    if (slot) slot.textContent = message || "";
  }

  function validate(form) {
    clearErrors(form);
    var ok = true;
    var name = form.elements.name.value.trim();
    var phone = form.elements.phone.value.trim();
    var emailValue = form.elements.email.value.trim();
    var destination = form.elements.destination.value;
    var dateValue = form.elements.date.value;
    var travellers = form.elements.travellers.value;
    var notes = form.elements.notes.value.trim();
    var digits = phone.replace(/\D/g, "");

    if (name.length < 2) {
      setError(form, "name", "Please enter your name.");
      ok = false;
    }
    if (digits.length < 10 || digits.length > 15) {
      setError(form, "phone", "Enter a phone number with at least 10 digits.");
      ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError(form, "email", "Enter a valid email address.");
      ok = false;
    }
    if (!destination) {
      setError(form, "destination", "Choose a destination.");
      ok = false;
    }
    if (!dateValue) {
      setError(form, "date", "Choose a travel date.");
      ok = false;
    } else if (dateValue < iso) {
      setError(form, "date", "Choose today or a future date.");
      ok = false;
    }
    if (!travellers) {
      setError(form, "travellers", "Choose how many people are travelling.");
      ok = false;
    }
    if (notes.length > 400) {
      setError(form, "notes", "Please keep notes under 400 characters.");
      ok = false;
    }
    if (!ok) {
      var invalid = form.querySelector("[aria-invalid='true']");
      if (invalid) invalid.focus();
    }
    return ok;
  }

  function buildMessage(data) {
    var lines = [
      "Hello Shubham Holidays, I would like to plan a trip.",
      "",
      "Name: " + data.name.trim(),
      "Phone: " + data.phone.trim(),
      "Email: " + data.email.trim(),
      "Destination: " + data.destination,
      "Travel date: " + data.date,
      "Travellers: " + data.travellers
    ];
    if (data.notes && data.notes.trim()) lines.push("Notes: " + data.notes.trim());
    if (typeof window.shubhamQuote === "function") {
      var fare = window.shubhamQuote(data.destination);
      if (fare) lines.push(fare);
    }
    return lines.join("\n");
  }

  function showStatus(form, via, url) {
    var status = form.querySelector(".form-status");
    status.hidden = false;
    status.replaceChildren();
    status.append(document.createTextNode(via === "email"
      ? "Your enquiry is ready in email. "
      : "Your enquiry is ready in WhatsApp. "));
    var link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = via === "email" ? "Open email" : "Open WhatsApp";
    status.append(link);
    status.append(document.createTextNode(" if it did not open on its own."));
  }

  document.querySelectorAll(".enquiry-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var via = event.submitter && event.submitter.value ? event.submitter.value : "whatsapp";
      if (!validate(form)) {
        var status = form.querySelector(".form-status");
        if (status) status.hidden = true;
        return;
      }
      var data = {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        email: form.elements.email.value,
        destination: form.elements.destination.value,
        date: form.elements.date.value,
        travellers: form.elements.travellers.value,
        notes: form.elements.notes.value
      };
      var message = buildMessage(data);
      var url = via === "email"
        ? "mailto:" + emailAddress + "?subject=" + encodeURIComponent("Holiday enquiry — " + data.destination) + "&body=" + encodeURIComponent(message)
        : "https://wa.me/" + waDigits + "?text=" + encodeURIComponent(message);
      window.open(url, "_blank", "noopener,noreferrer");
      showStatus(form, via, url);
    });
  });

  var dialog = document.querySelector("#booking-dialog");
  var bookingForm = document.querySelector("#booking-form");

  function applyTripDefaults(destination) {
    document.querySelectorAll(".enquiry-form").forEach(function (form) {
      if (destination && form.elements.destination) {
        var hasOption = Array.prototype.some.call(form.elements.destination.options, function (option) {
          return option.value === destination;
        });
        if (hasOption) form.elements.destination.value = destination;
      }
      if (searchDate.value) form.elements.date.value = searchDate.value;
      if (searchGuests.value) form.elements.travellers.value = searchGuests.value;
    });
  }

  function openBooking(destination) {
    closeNav();
    applyTripDefaults(destination);
    var status = bookingForm.querySelector(".form-status");
    if (status) status.hidden = true;
    clearErrors(bookingForm);
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
      bookingForm.elements.name.focus();
    } else {
      document.getElementById("contact").scrollIntoView();
      document.querySelector("#contact-form").elements.name.focus();
    }
  }

  document.querySelectorAll(".js-book").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      var destination = link.getAttribute("data-destination") || "";
      openBooking(destination);
      document.dispatchEvent(new CustomEvent("shubham:book", {
        detail: {
          destination: destination,
          inr: Number(link.getAttribute("data-inr")) || 0
        }
      }));
    });
  });

  document.querySelector("#booking-close").addEventListener("click", function () {
    dialog.close();
  });

  var floatBtn = document.querySelector(".float-wa");
  var heroWa = document.querySelector(".hero-wa");
  if (floatBtn && heroWa && "IntersectionObserver" in window) {
    var floatObserver = new IntersectionObserver(function (entries) {
      floatBtn.classList.toggle("is-hidden", entries[0].isIntersecting);
    }, { threshold: 0.4 });
    floatObserver.observe(heroWa);
  } else if (floatBtn) {
    floatBtn.classList.remove("is-hidden");
  }
})();
