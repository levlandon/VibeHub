import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { IconChevron } from "../icons";
import styles from "./CategoryStrip.module.css";

export interface CategoryStripItem {
  id: string;
  label: string;
  count?: number;
}

interface CategoryStripProps {
  items: CategoryStripItem[];
  value: string;
  onChange: (id: string) => void;
}

export function CategoryStrip({ items, value, onChange }: CategoryStripProps) {
  const { t } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items]);

  const scroll = (dir: number) => {
    scroller.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap}>
      {canLeft ? (
        <button type="button" className={styles.arrow} aria-label={t("common.previous")} onClick={() => scroll(-1)}>
          <IconChevron width={16} height={16} style={{ transform: "rotate(180deg)" }} />
        </button>
      ) : null}
      <div className={styles.scroller} ref={scroller} role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === value}
            className={`${styles.tab} ${item.id === value ? styles.on : ""}`}
            onClick={() => onChange(item.id)}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" && item.count > 0 ? (
              <span className={styles.countBadge}>{item.count}</span>
            ) : null}
          </button>
        ))}
      </div>
      {canRight ? (
        <button type="button" className={`${styles.arrow} ${styles.right}`} aria-label={t("common.next")} onClick={() => scroll(1)}>
          <IconChevron width={16} height={16} />
        </button>
      ) : null}
    </div>
  );
}
