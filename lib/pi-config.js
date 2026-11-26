// Browser build of lib/pi-config.ts. Keep the two files identical.
export const PI_VALUE_USD = 314159;
// 1 USD = 88 INR approx, so 1 Pi = 27,646,000 INR approx
export const PI_VALUE_INR = 314159 * 88;

export function convertINRtoPi(inrAmount) {
  return inrAmount / PI_VALUE_INR;
}

export function convertPiToINR(piAmount) {
  return piAmount * PI_VALUE_INR;
}

export function convertPiToUSD(piAmount) {
  return piAmount * 314159;
}
