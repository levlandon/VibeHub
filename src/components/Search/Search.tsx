import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { IconSearch } from "../icons";
import styles from "./Search.module.css";

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Search({
  value,
  onChange,
  placeholder,
}: SearchProps) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("common.searchPlaceholder");
  const [open, setOpen] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value) setOpen(true);
  }, [value]);

  const expand = () => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <label className={`${styles.field} ${open ? styles.open : ""}`}>
      <button type="button" className={styles.icon} aria-label={t("common.search")} onClick={expand}>
        <IconSearch width={18} height={18} />
      </button>
      <input
        id="hub-search"
        ref={inputRef}
        type="search"
        value={value}
        placeholder={resolvedPlaceholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!value) setOpen(false);
        }}
      />
    </label>
  );
}
