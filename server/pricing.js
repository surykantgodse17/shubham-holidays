/**
 * Pi payment pricing — GCV only.
 * Global Consensus Value: exactly 1 Pi = 314159 USD.
 * Pi Amount = USD Price / 314159
 * Never use market Pi price; never trust client-supplied amounts.
 */

/** Exact GCV: 1 Pi = 314159 USD */
export const PI_USD_VALUE = 314159;
export const PI_GCV_USD = PI_USD_VALUE;
export const PI_USD_RATE_COPY = "1 Pi = $314159";

/** Fixed catalog FX for INR inventory → USD (server-only; not market Pi). */
export const CATALOG_INR_PER_USD = 83;

/** Catalog INR → USD (rounded to cents). */
export function catalogInrToUsd(inr) {
  const n = Number(inr);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round((n / CATALOG_INR_PER_USD) * 100) / 100;
}

/**
 * GCV conversion: Pi Amount = USD Price / 314159
 * Result quantized to 7 decimal places (Pi payment precision).
 */
export function usdToPi(usd) {
  const dollars = Number(usd);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  // (usd / 314159) with 7dp: round(usd * 1e7 / 314159) / 1e7
  const scaled = Math.round((dollars * 1e7) / PI_GCV_USD);
  return scaled / 1e7;
}

/** Convenience: catalog INR → USD → GCV π */
export function catalogInrToPi(inr) {
  return usdToPi(catalogInrToUsd(inr));
}

/** @deprecated use catalogInrToUsd */
export function inrToUsd(inr) {
  return catalogInrToUsd(inr);
}

/** @deprecated use catalogInrToPi */
export function inrToPi(inr) {
  return catalogInrToPi(inr);
}

/** Compare π amounts with fixed 7-decimal precision. */
export function piAmountsEqual(a, b) {
  const left = Math.round(Number(a) * 1e7);
  const right = Math.round(Number(b) * 1e7);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}
