import { memo, useLayoutEffect, useRef, useState } from "react";
import { IconChevronDown } from "../../../components/icons";
import styles from "./ModelComponents.module.css";
import { useI18n } from "../../../i18n";

export interface ExpandableDescriptionProps {
  description?: string;
  defaultLines?: number;
}

export const ExpandableDescription = memo(function ExpandableDescription({
  description,
}: ExpandableDescriptionProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || !description) {
      setCanExpand(false);
      return;
    }

    const checkOverflow = () => {
      // scrollHeight is greater than clientHeight if clamped text overflows
      const overflows = el.scrollHeight > el.clientHeight + 2;
      setCanExpand(overflows);
    };

    checkOverflow();

    const resizeObserver = new ResizeObserver(() => {
      if (!isExpanded) {
        checkOverflow();
      }
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [description, isExpanded]);

  if (!description || !description.trim()) {
    return (
      <div className={styles.descriptionWrap}>
        <p className={styles.descriptionEmpty}>
          {t("model.descriptionMissing")}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.descriptionWrap}>
      <p
        ref={textRef}
        className={`${styles.descriptionText} ${isExpanded ? styles.expanded : styles.clamped}`}
      >
        {description}
      </p>

      {canExpand || isExpanded ? (
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? t("common.collapse") : t("model.showFullDescription")}</span>
          <IconChevronDown
            width={13}
            height={13}
            className={`${styles.expandChevron} ${isExpanded ? styles.rotateChevron : ""}`}
          />
        </button>
      ) : null}
    </div>
  );
});
