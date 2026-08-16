import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconInfo,
  IconOpen,
} from "../../../components/icons";
import type { Model } from "../../../types/models";
import { formatFullDate } from "../../../utils/dateFormat";
import styles from "./ModelComponents.module.css";

export interface ModelInfoPopoverProps {
  model: Model;
  copied?: boolean;
  onCopyId?: () => void;
}

export const ModelInfoPopover = memo(function ModelInfoPopover({
  model,
  copied: externalCopied,
  onCopyId: externalCopyId,
}: ModelInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalCopied, setInternalCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const copied = externalCopied ?? internalCopied;

  const handleCopy = useCallback(async () => {
    if (externalCopyId) {
      externalCopyId();
      return;
    }
    if (!model?.id) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(model.id);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = model.id;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setInternalCopied(true);
      setTimeout(() => setInternalCopied(false), 1800);
    } catch (err) {
      console.warn("Failed to copy model ID:", err);
    }
  }, [externalCopyId, model?.id]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Handle outside click & Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  const handleKeyDownPopover = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };

  const formattedDate = model.releaseDate ? formatFullDate(model.releaseDate) : null;
  const tokenizer = model.architecture?.tokenizer;
  const instructType = model.architecture?.instructType;
  const maxCompletionTokens =
    model.maxCompletionTokens && model.maxCompletionTokens > 0
      ? model.maxCompletionTokens.toLocaleString("ru-RU")
      : null;

  return (
    <div className={styles.popoverContainer} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.infoTriggerBtn} ${isOpen ? styles.infoTriggerActive : ""}`}
        onClick={toggleOpen}
        title="Техническая информация о модели"
        aria-label="Техническая информация о модели"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <IconInfo width={14} height={14} />
      </button>

      {isOpen ? (
        <div
          className={styles.popoverMenu}
          role="dialog"
          aria-modal="true"
          aria-label="Техническая информация о модели"
          onKeyDown={handleKeyDownPopover}
        >
          <div className={styles.popoverHead}>
            <span className={styles.popoverTitle}>Информация</span>
            <button
              type="button"
              className={styles.popoverCloseBtn}
              onClick={close}
              title="Закрыть"
              aria-label="Закрыть"
            >
              <IconClose width={14} height={14} />
            </button>
          </div>

          <div className={styles.popoverBody}>
            <div className={styles.popoverRow}>
              <span className={styles.popoverLabel}>Model ID</span>
              <div className={styles.popoverValueRow}>
                <span className={styles.popoverMono}>{model.id}</span>
                <button
                  type="button"
                  className={styles.popoverCopyBtn}
                  onClick={handleCopy}
                  title={copied ? "Скопировано!" : "Скопировать Model ID"}
                  aria-label={copied ? "ID модели скопирован" : "Скопировать Model ID"}
                >
                  {copied ? (
                    <IconCheck width={12} height={12} className={styles.copiedIcon} />
                  ) : (
                    <IconCopy width={12} height={12} />
                  )}
                </button>
              </div>
            </div>

            {model.sourceUrl ? (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Первоисточник</span>
                <a
                  href={model.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.popoverLink}
                >
                  <span>OpenRouter API</span>
                  <IconOpen width={12} height={12} />
                </a>
              </div>
            ) : null}

            {model.huggingFaceId ? (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Hugging Face</span>
                <a
                  href={`https://huggingface.co/${model.huggingFaceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.popoverLink}
                >
                  <span>{model.huggingFaceId}</span>
                  <IconOpen width={12} height={12} />
                </a>
              </div>
            ) : null}

            {formattedDate ? (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Добавлено</span>
                <span className={styles.popoverValue}>{formattedDate}</span>
              </div>
            ) : null}

            {tokenizer ? (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Токенизатор</span>
                <span className={styles.popoverValue}>{tokenizer}</span>
              </div>
            ) : null}

            {instructType ? (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Инструкции</span>
                <span className={styles.popoverValue}>{instructType}</span>
              </div>
            ) : null}

            {maxCompletionTokens ? (
              <div className={styles.popoverRow}>
                <span className={styles.popoverLabel}>Макс. ответ</span>
                <span className={styles.popoverValue}>{maxCompletionTokens} токенов</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
});
