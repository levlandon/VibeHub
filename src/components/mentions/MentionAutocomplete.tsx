import { useHub } from "../../state/HubContext";
import type { EntityRef } from "../../types/entities";
import { ProviderMark } from "../ProviderMark/ProviderMark";
import styles from "./MentionAutocomplete.module.css";

const GROUP_ORDER = ["model", "tool", "user"] as const;
const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  model: "Модели",
  tool: "Инструменты",
  user: "Люди",
};

export function MentionAutocomplete({
  items,
  active,
  onPick,
}: {
  items: EntityRef[];
  active: number;
  onPick: (entity: EntityRef) => void;
}) {
  const { models, tools } = useHub();
  if (!items.length) return null;

  return (
    <div className={styles.ac} role="listbox">
      {GROUP_ORDER.map((kind) => {
        const group = items.filter((item) => item.kind === kind);
        if (!group.length) return null;
        return (
          <div key={kind}>
            <p className={styles.acLabel}>{GROUP_LABEL[kind]}</p>
            {group.map((item) => {
              const idx = items.indexOf(item);
              const model = models.find((m) => m.id === item.id);
              const tool = tools.find((t) => t.id === item.id);
              return (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  className={`${styles.acItem} ${idx === active ? styles.acOn : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(item);
                  }}
                >
                  {item.kind === "model" && model ? (
                    <ProviderMark model={model} size={28} />
                  ) : (
                    <span className={styles.acMark}>{item.name.slice(0, 1)}</span>
                  )}
                  <span>
                    <strong>{item.name}</strong>
                    <em>
                      {item.kind === "model"
                        ? model?.provider
                        : item.kind === "tool"
                          ? tool?.typeLabel
                          : `@${item.id}`}
                    </em>
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
