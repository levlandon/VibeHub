import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n";
import { parseSiteUrl } from "../../lib/siteUrl";
import type { CreateCollectionItemInput } from "../../types/collections";
import { Button } from "../Button/Button";
import { SiteIcon } from "../SiteIcon/SiteIcon";
import styles from "./AddWebsiteModal.module.css";

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collectionId: string, item: CreateCollectionItemInput) => void;
  collections: { id: string; name: string }[];
  defaultCollectionId?: string;
}

export function AddWebsiteModal({
  isOpen,
  onClose,
  onSave,
  collections,
  defaultCollectionId,
}: AddWebsiteModalProps) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCollectionId, setTargetCollectionId] = useState(
    defaultCollectionId || collections[0]?.id || "",
  );
  const [autoTitle, setAutoTitle] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setTitle("");
      setDescription("");
      setAutoTitle(true);
      setTargetCollectionId(defaultCollectionId || collections[0]?.id || "");
    }
  }, [isOpen, defaultCollectionId, collections]);

  const parsed = parseSiteUrl(url);

  useEffect(() => {
    if (autoTitle && parsed?.title) {
      setTitle(parsed.title);
    }
  }, [url, autoTitle, parsed?.title]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!parsed || !targetCollectionId) return;

    onSave(targetCollectionId, {
      url: parsed.url,
      title: title.trim() || parsed.title,
      domain: parsed.domain,
      description: description.trim() || undefined,
      favicon: parsed.favicon,
    });
  };

  const displayTitle = title.trim() || parsed?.title || parsed?.domain || t("collections.siteFallback");

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="add-site-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-site-title" className={styles.title}>
          {t("collections.addSiteTitle")}
        </h2>
        <form onSubmit={handleSubmit}>
          <label className={styles.field}>
            {t("collections.collectionRequired")}
            <select
              value={targetCollectionId}
              onChange={(e) => setTargetCollectionId(e.target.value)}
              required
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            {t("collections.urlRequired")}
            <input
              autoFocus
              type="text"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            {t("collections.nameOptional")}
            <input
              type="text"
              placeholder={parsed?.title ?? t("collections.serviceNamePlaceholder")}
              value={title}
              onChange={(e) => {
                setAutoTitle(false);
                setTitle(e.target.value);
              }}
            />
          </label>

          <label className={styles.field}>
            {t("collections.noteOptional")}
            <textarea
              placeholder={t("collections.notePlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </label>

          {parsed ? (
            <div className={styles.previewPill}>
              <SiteIcon
                src={parsed.favicon}
                domain={parsed.domain}
                fallbackText={displayTitle.slice(0, 2)}
                size={24}
                iconSize={20}
                radius={4}
              />
              <div className={styles.previewMeta}>
                <span className={styles.previewTitle}>{displayTitle}</span>
                <span className={styles.previewDomain}>{parsed.domain}</span>
              </div>
            </div>
          ) : null}

          <div className={styles.actions}>
            <Button variant="text" onClick={onClose} type="button">
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              disabled={!parsed || !targetCollectionId}
              type="submit"
            >
              {t("collections.addSite")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
