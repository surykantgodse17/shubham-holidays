export const PI_VALUE_USD = 314159;
// 1 USD = 88 INR approx, so 1 Pi = 27,646,000 INR approx
export const PI_VALUE_INR = 314159 * 88;

export function convertINRtoPi(inrAmount: number): number {
  return inrAmount / PI_VALUE_INR;
}

export function convertPiToINR(piAmount: number): number {
  return piAmount * PI_VALUE_INR;
}

export function convertPiToUSD(piAmount: number): number {
  return piAmount * 314159;
}
