import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { parseSiteUrl } from "../../lib/siteUrl";
import { quickAccessRepository } from "../../services/collections";
import type { QuickAccessSite } from "../../types/hub";
import { Button } from "../Button/Button";
import { IconMore } from "../icons";
import { SiteIcon } from "../SiteIcon/SiteIcon";
import styles from "./QuickAccess.module.css";

export interface QuickAccessProps {
  externalAddOpen?: boolean;
  onCloseExternalAdd?: () => void;
  onSiteAdded?: () => void;
}

export function QuickAccess({
  externalAddOpen = false,
  onCloseExternalAdd,
  onSiteAdded,
}: QuickAccessProps) {
  const { t } = useI18n();
  const [sites, setSites] = useState<QuickAccessSite[]>([]);
  const [modal, setModal] = useState<"add" | QuickAccessSite | null>(null);

  const load = useCallback(async () => {
    const data = await quickAccessRepository.getSites();
    setSites(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (externalAddOpen) {
      setModal("add");
    }
  }, [externalAddOpen]);

  const handleCloseModal = () => {
    setModal(null);
    onCloseExternalAdd?.();
  };

  const handleSave = async (draft: QuickAccessSite) => {
    if (modal === "add") {
      await quickAccessRepository.addSite(draft);
      onSiteAdded?.();
    } else {
      await quickAccessRepository.updateSite(draft.id, draft);
    }
    await load();
    handleCloseModal();
  };

  const handleRemove = async (id: string) => {
    await quickAccessRepository.removeSite(id);
    await load();
  };

  return (
    <section className={styles.section} aria-labelledby="quick-access-title">
      <h2 id="quick-access-title">{t("quickAccess.title")}</h2>
      <ul className={styles.grid}>
        {sites.map((site) => (
          <li key={site.id}>
            <SiteTile
              site={site}
              onEdit={() => setModal(site)}
              onRemove={() => handleRemove(site.id)}
            />
          </li>
        ))}
      </ul>
      {modal ? (
        <SiteModal
          site={modal === "add" ? null : modal}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      ) : null}
    </section>
  );
}

function SiteTile({
  site,
  onEdit,
  onRemove,
}: {
  site: QuickAccessSite;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div className={styles.tileWrap} ref={wrap}>
      <a
        className={styles.tile}
        href={site.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SiteIcon
          src={site.favicon}
          domain={site.domain}
          fallbackText={site.title.slice(0, 1)}
          size={20}
          iconSize={20}
          radius={4}
        />
        <span className={styles.meta}>
          <strong>{site.title}</strong>
          <em>{site.domain}</em>
        </span>
      </a>
      <button
        type="button"
        className={styles.more}
        title={t("quickAccess.more")}
        aria-label={t("quickAccess.more")}
        onClick={(e) => {
          e.preventDefault();
          setMenu((v) => !v);
        }}
      >
        <IconMore width={16} height={16} />
      </button>
      {menu ? (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              onEdit();
            }}
          >
            {t("quickAccess.edit")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              onRemove();
            }}
          >
            {t("quickAccess.delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SiteModal({
  site,
  onClose,
  onSave,
}: {
  site: QuickAccessSite | null;
  onClose: () => void;
  onSave: (site: QuickAccessSite) => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState(site?.url ?? "");
  const [title, setTitle] = useState(site?.title ?? "");
  const [autoTitle, setAutoTitle] = useState(!site);
  const parsed = parseSiteUrl(url);

  const titleGuess = parsed?.title;

  useEffect(() => {
    if (autoTitle && titleGuess) setTitle(titleGuess);
  }, [autoTitle, titleGuess]);

  const submit = () => {
    if (!parsed) return;
    onSave({
      id: site?.id ?? `site-${Date.now()}`,
      url: parsed.url,
      domain: parsed.domain,
      favicon: parsed.favicon,
      title: title.trim() || parsed.title,
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="qa-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className={styles.field}>
            {t("quickAccess.link")}
            <input
              autoFocus
              value={url}
              placeholder="https://..."
              onChange={(e) => {
                setUrl(e.target.value);
                if (!autoTitle) return;
              }}
            />
          </label>
          <label className={styles.field}>
            {t("quickAccess.name")}
            <input
              value={title}
              placeholder={parsed?.title ?? t("quickAccess.namePlaceholder")}
              onChange={(e) => {
                setAutoTitle(false);
                setTitle(e.target.value);
              }}
            />
          </label>
          {parsed ? (
            <p className={styles.hint}>
              {parsed.domain}
              {parsed.favicon ? t("quickAccess.faviconHint") : ""}
            </p>
          ) : url.trim() ? (
            <p className={styles.hint}>{t("quickAccess.checkLink")}</p>
          ) : null}
          <div className={styles.actions}>
            <Button variant="text" onClick={onClose}>
              {t("quickAccess.cancel")}
            </Button>
            <Button variant="primary" disabled={!parsed} type="submit">
              {site ? t("quickAccess.save") : t("quickAccess.add")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
