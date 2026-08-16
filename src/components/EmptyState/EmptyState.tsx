import type { HTMLAttributes } from "react";
import styles from "./EmptyState.module.css";

export function EmptyState({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.empty} ${className}`.trim()} {...props} />;
}
