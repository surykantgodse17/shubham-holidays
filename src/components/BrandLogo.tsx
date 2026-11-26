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
        src="/logo.jpg"
        alt={withWordmark ? "" : "Shubham Holidays"}
        width={px}
        height={px}
        className="brand-logo-img"
        decoding="async"
      />
      {withWordmark ? <span className="brand-logo-text">Shubham Holidays</span> : null}
    </span>
  );
}
