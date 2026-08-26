import { useEffect, useMemo, useRef, useState } from "react";
import { usePosts } from "../../features/posts";
import { groupHits, searchHub } from "../../services/search";
import { useHub } from "../../state/HubContext";
import { IconSearch } from "../icons";
import styles from "./CommandPalette.module.css";

const RECENT_KEY = "vibehub-recent-searches";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeRecent(term: string) {
  const next = [term, ...readRecent().filter((item) => item !== term)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function CommandPalette() {
  const { searchOpen, setSearchOpen, models, tools, openEntity, setAddOpen } =
    useHub();
  const { posts } = usePosts();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    setRecent(readRecent());
    setQ("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, setSearchOpen]);

  const grouped = useMemo(
    () => groupHits(searchHub(q, models, tools, posts)),
    [q, models, tools, posts],
  );

  if (!searchOpen) return null;

  const goFirst = () => {
    const first = grouped[0]?.items[0];
    if (first) openHit(first.id, first.kind, q);
  };

  const openHit = (id: string, kind: string, term?: string) => {
    if (term?.trim()) writeRecent(term.trim());
    if (kind === "model" || kind === "tool") openEntity(kind, id);
    else {
      const post = posts.find((p) => p.id === id);
      const rel = post?.relatedEntities[0];
      if (rel && (rel.kind === "model" || rel.kind === "tool")) {
        openEntity(rel.kind, rel.id);
      } else {
        setAddOpen(true);
      }
    }
    setSearchOpen(false);
  };

  return (
    <div className={styles.overlay} onClick={() => setSearchOpen(false)} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-label="Поиск"
        onClick={(e) => e.stopPropagation()}
      >
        <label className={styles.field}>
          <IconSearch width={20} height={20} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Модели, инструменты, публикации..."
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goFirst();
            }}
          />
          <kbd>Esc</kbd>
        </label>
        {!q.trim() && recent.length > 0 ? (
          <div className={styles.block}>
            <p>Недавние</p>
            {recent.map((term) => (
              <button key={term} type="button" onClick={() => setQ(term)}>
                {term}
              </button>
            ))}
          </div>
        ) : null}
        {q.trim() ? (
          grouped.length === 0 ? (
            <div className={styles.block}>
              <span className={styles.empty}>Ничего не найдено</span>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.group} className={styles.block}>
                <p>{group.group}</p>
                {group.items.map((item) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    onClick={() => openHit(item.id, item.kind, q)}
                  >
                    <strong>{item.title}</strong>
                    <em>{item.meta}</em>
                  </button>
                ))}
              </div>
            ))
          )
        ) : null}
      </div>
    </div>
  );
}
