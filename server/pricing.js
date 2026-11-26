/** Server-side Pi pricing — never trust client-computed π amounts. */

export const PI_USD_VALUE = 314159;
export const DEMO_INR_PER_USD = 83;

export function inrToUsd(inr) {
  return Math.round((Number(inr) / DEMO_INR_PER_USD) * 100) / 100;
}

export function usdToPi(usd) {
  const cents = Math.round(Number(usd) * 100);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  const scaled = Math.round((cents * 1e7) / (PI_USD_VALUE * 100));
  return scaled / 1e7;
}

export function inrToPi(inr) {
  return usdToPi(inrToUsd(inr));
}

/** Compare π amounts with fixed 7-decimal precision. */
export function piAmountsEqual(a, b) {
  const left = Math.round(Number(a) * 1e7);
  const right = Math.round(Number(b) * 1e7);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}
