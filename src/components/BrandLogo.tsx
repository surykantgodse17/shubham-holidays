type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "hero";
  withWordmark?: boolean;
  className?: string;
  inverted?: boolean;
};

const sizes = {
  sm: 28,
  md: 36,
  lg: 56,
  hero: 88,
} as const;

export function BrandLogo({
  size = "md",
  withWordmark = false,
  className = "",
  inverted = false,
}: BrandLogoProps) {
  const px = sizes[size];
  return (
    <span className={`brand-logo ${inverted ? "inverted" : ""} ${className}`.trim()}>
      <img
        src={withWordmark ? "/logo-full.png" : "/logo.jpg"}
        alt={withWordmark ? "" : "शुभम हॉलीडेस · Shubham Holidays"}
        width={withWordmark ? Math.round(px * 2.2) : px}
        height={px}
        className={withWordmark ? "brand-logo-img brand-logo-full" : "brand-logo-img"}
        decoding="async"
      />
      {withWordmark ? (
        <span className="brand-logo-wordmark">
          <span className="brand-logo-text-mr" lang="mr">
            शुभम हॉलीडेस
          </span>
          <span className="brand-logo-text">Shubham Holidays</span>
        </span>
      ) : null}
    </span>
  );
}
