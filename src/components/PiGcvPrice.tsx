import { formatInrPiGcv } from "../lib/pi";

/** GCV price under flight / hotel / package cards. */
export function PiGcvPrice({
  inr,
  className = "pi-gcv-price",
}: {
  inr: number;
  className?: string;
}) {
  return <p className={className}>{formatInrPiGcv(inr)}</p>;
}
