import { useEffect, useState } from "react";
import { faviconFor } from "../../lib/siteUrl";
import styles from "./SiteIcon.module.css";

export interface SiteIconProps {
  domain?: string;
  src?: string;
  fallbackText?: string;
  size?: number;
  iconSize?: number;
  radius?: number;
  className?: string;
  title?: string;
  alt?: string;
  "aria-label"?: string;
  loading?: "lazy" | "eager";
}

export function SiteIcon({
  domain,
  src,
  fallbackText,
  size = 44,
  iconSize,
  radius,
  className,
  title,
  alt = "",
  "aria-label": ariaLabel,
  loading = "lazy",
}: SiteIconProps) {
  const [hasError, setHasError] = useState(false);

  const cleanDomain = domain?.trim();
  const faviconUrl = src || (cleanDomain ? faviconFor(cleanDomain) : null);

  // Reset error state when the target favicon URL or domain changes
  useEffect(() => {
    setHasError(false);
  }, [faviconUrl]);

  const computedRadius =
    radius ?? (size < 24 ? 4 : size < 32 ? 6 : size <= 44 ? 10 : 12);
  const computedIconSize =
    iconSize ?? (size <= 20 ? 14 : size <= 28 ? 16 : size <= 44 ? 22 : 24);
  const fontSize = Math.max(9, Math.round(size * 0.32));

  const monogram = (fallbackText || cleanDomain || "?")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: computedRadius,
    fontSize,
  };

  if (!faviconUrl || hasError) {
    return (
      <span
        className={`${styles.container} ${styles.fallback} ${className || ""}`}
        style={containerStyle}
        title={title}
        aria-label={ariaLabel || title}
        aria-hidden={!ariaLabel && !title}
      >
        {monogram}
      </span>
    );
  }

  return (
    <span
      className={`${styles.container} ${styles.mark} ${className || ""}`}
      style={containerStyle}
      title={title}
      aria-label={ariaLabel || title}
    >
      <img
        src={faviconUrl}
        alt={alt}
        className={styles.iconImage}
        width={computedIconSize}
        height={computedIconSize}
        style={{
          width: computedIconSize,
          height: computedIconSize,
        }}
        loading={loading}
        onError={() => setHasError(true)}
      />
    </span>
  );
}
