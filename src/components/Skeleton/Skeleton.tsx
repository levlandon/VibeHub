import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import styles from "./Skeleton.module.css";

export type SkeletonVariant = "text" | "circular" | "rectangular" | "rounded";
export type SkeletonAnimation = "shimmer" | "none";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: SkeletonAnimation;
  count?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  animation = "shimmer",
  count = 1,
  className = "",
  style,
  children,
  ...rest
}: SkeletonProps) {
  const inlineStyle: CSSProperties = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  const classes = [
    styles.skeleton,
    styles[variant],
    animation === "shimmer" ? styles.shimmer : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className={classes}
            style={inlineStyle}
            aria-hidden="true"
            {...rest}
          >
            {children}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className={classes} style={inlineStyle} aria-hidden="true" {...rest}>
      {children}
    </div>
  );
}
