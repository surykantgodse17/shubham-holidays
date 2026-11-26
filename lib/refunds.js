const store = require("./store");
const pricing = require("./pricing");
const pi = require("./pi");

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function pointsOf(data, uid) {
  return Math.max(0, Math.floor(Number(data.points[uid]) || 0));
}

function findOwned(data, id, uid) {
  return data.bookings.find((item) => item.id === id && item.uid === uid);
}

function memoFor(booking) {
  return `Shubham Holidays cancellation ${booking.id}`.slice(0, 100);
}

function savedQuote(booking) {
  const refund = booking.refund;
  if (refund && Number.isFinite(Number(refund.refundPi))) {
    return {
      paidPi: Number(refund.paidPi),
      feePi: Number(refund.feePi),
      refundPi: Number(refund.refundPi),
    };
  }
  return pricing.cancellationQuote(booking.amount);
}

function sameMoney(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.00000005;
}

function matchesRefund(payment, bookingId) {
  const metadata = payment && payment.metadata;
  return Boolean(metadata && metadata.kind === "refund" && String(metadata.bookingId) === String(bookingId));
}

function assertCompletedRefund(payment, booking, user, quote) {
  if (!matchesRefund(payment, booking.id)) {
    throw httpError("This Pi refund does not match the booking.", 400);
  }
  if (payment.direction && payment.direction !== "app_to_user") {
    throw httpError("This payout is not a refund from Shubham Holidays.", 400);
  }
  if (!sameMoney(payment.amount, quote.refundPi)) {
    throw httpError("Refund amount does not match the cancellation quote.", 400);
  }
  const recipient = String(payment.user_uid || payment.uid || "");
  if (recipient && recipient !== user.uid) {
    throw httpError("This refund belongs to a different Pi account.", 403);
  }
  const status = payment.status || {};
  if (status.cancelled || status.user_cancelled) {
    throw httpError("This refund was cancelled.", 400);
  }
  if (!status.developer_completed) {
    throw httpError("Pi has not completed this refund yet.", 502);
  }
}

function closeBooking(data, id, uid, quote, paymentId, txid) {
  const found = findOwned(data, id, uid);
  if (!found) throw httpError("Booking not found.", 404);
  found.status = "cancelled";
  found.cancelledAt = found.cancelledAt || new Date().toISOString();
  found.refund = {
    status: "completed",
    paidPi: quote.paidPi,
    feePi: quote.feePi,
    refundPi: quote.refundPi,
    paymentId: paymentId || (found.refund && found.refund.paymentId) || null,
    txid: txid || (found.refund && found.refund.txid) || null,
    memo: (found.refund && found.refund.memo) || memoFor(found),
  };
  if (found.pointsCredited && found.pointsEarned) {
    const balance = pointsOf(data, uid);
    const take = Math.min(balance, found.pointsEarned);
    data.points[uid] = balance - take;
    found.pointsReversed = take;
    found.pointsCredited = false;
  }
  return found;
}

async function adoptOpenRefund(bookingId) {
  const open = await pi.incompleteA2U();
  return open.find((payment) => matchesRefund(payment, bookingId)) || null;
}

async function refundPaidBooking(user, bookingId) {
  const id = String(bookingId || "");
  const existing = store.snapshot().bookings.find((item) => item.id === id && item.uid === user.uid);
  if (!existing) throw httpError("Booking not found.", 404);
  if (existing.refund && existing.refund.status === "completed") return existing;
  if (existing.status !== "confirmed") {
    throw httpError("Only a confirmed booking can be refunded.", 400);
  }
  if (!(Number(existing.amount) > 0)) {
    throw httpError("This ticket was covered by bonus points. Contact support from the ticket page.", 400);
  }

  const quote = savedQuote(existing);
  if (!(quote.refundPi > 0)) {
    return store.update((data) => closeBooking(data, id, user.uid, quote, null, null));
  }

  let paymentId = existing.refund && existing.refund.paymentId;
  let txid = existing.refund && existing.refund.txid;
  if (!paymentId) {
    const memo = memoFor(existing);
    await store.update((data) => {
      const found = findOwned(data, id, user.uid);
      if (!found) throw httpError("Booking not found.", 404);
      if (!found.refund || !found.refund.paymentId) {
        found.refund = {
          status: "creating",
          paidPi: quote.paidPi,
          feePi: quote.feePi,
          refundPi: quote.refundPi,
          paymentId: null,
          txid: null,
          memo,
        };
      }
      return found;
    });
    try {
      paymentId = await pi.createA2U({
        amount: quote.refundPi,
        memo,
        metadata: { bookingId: id, kind: "refund" },
        uid: user.uid,
      });
    } catch (error) {
      let ongoing = matchesRefund(error.payment, id) ? error.payment : null;
      if (!ongoing && error.status !== 503) {
        try {
          ongoing = await adoptOpenRefund(id);
        } catch {
          ongoing = null;
        }
      }
      if (!ongoing) throw error;
      paymentId = ongoing.identifier;
      txid = ongoing.transaction && ongoing.transaction.txid;
    }
    await store.update((data) => {
      const found = findOwned(data, id, user.uid);
      found.refund.paymentId = paymentId;
      found.refund.txid = txid || found.refund.txid || null;
      found.refund.status = found.refund.txid ? "submitted" : "pending";
      return found;
    });
  }

  if (!txid) {
    txid = await pi.submitA2U(paymentId);
    await store.update((data) => {
      const found = findOwned(data, id, user.uid);
      found.refund.txid = txid;
      found.refund.status = "submitted";
      return found;
    });
  }

  const completed = await pi.completeA2U(paymentId, txid);
  assertCompletedRefund(completed, existing, user, quote);
  return store.update((data) => closeBooking(data, id, user.uid, quote, paymentId, txid));
}

module.exports = { refundPaidBooking };
