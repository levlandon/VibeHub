import type { ButtonHTMLAttributes } from "react";
import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export function IconButton({
  label,
  active,
  className = "",
  type = "button",
  title,
  ...props
}: IconButtonProps) {
  const effectiveTitle = title !== undefined ? title : label;

  return (
    <button
      type={type}
      title={effectiveTitle || undefined}
      aria-label={label}
      className={`${styles.btn} ${active ? styles.active : ""} ${className}`.trim()}
      {...props}
    />
  );
}
