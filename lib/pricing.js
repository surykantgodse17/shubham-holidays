/** Published rate: 1 Pi = $314,159. Booking math uses this rate only. */
const PI_USD_VALUE = 314159;
const POINT_USD = 1;
const EARN_RATE = 0.05;
const CANCEL_FEE_RATE = 0.1;

function roundUsd(value) {
  return Math.round(Number(value) * 100) / 100;
}

function usdToPi(usd) {
  const cents = Math.round(Number(usd) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  const scaled = Math.round((cents * 1e7) / (PI_USD_VALUE * 100));
  return scaled / 1e7;
}

function applyPoints(amountUsd) {
  const fareUsd = roundUsd(amountUsd);
  if (!Number.isFinite(fareUsd) || fareUsd <= 0) {
    const error = new Error("This fare is not available.");
    error.status = 400;
    throw error;
  }
  return {
    fareUsd,
    pointsRedeemed: 0,
    pointsDiscountUsd: 0,
    payableUsd: fareUsd,
    amountPi: usdToPi(fareUsd),
    pointsEarned: 0,
    piUsdValue: PI_USD_VALUE,
    pointUsdValue: POINT_USD,
  };
}

function cancellationQuote(amountPi) {
  const units = Math.round(Number(amountPi) * 1e7);
  if (!Number.isFinite(units) || units <= 0) {
    return { paidPi: 0, feePi: 0, refundPi: 0, feeRate: CANCEL_FEE_RATE };
  }
  const feeUnits = Math.min(units, Math.max(1, Math.ceil(units * CANCEL_FEE_RATE - 1e-9)));
  return {
    paidPi: units / 1e7,
    feePi: feeUnits / 1e7,
    refundPi: (units - feeUnits) / 1e7,
    feeRate: CANCEL_FEE_RATE,
  };
}

module.exports = {
  PI_USD_VALUE,
  POINT_USD,
  EARN_RATE,
  CANCEL_FEE_RATE,
  roundUsd,
  usdToPi,
  applyPoints,
  cancellationQuote,
};
