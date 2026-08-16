import { useHub } from "../../state/HubContext";
import type { EntityRef } from "../../types/entities";
import styles from "./Mention.module.css";

export function Mention({ entity }: { entity: EntityRef }) {
  const { openEntity } = useHub();
  const canOpen = entity.kind === "model" || entity.kind === "tool";

  return (
    <button
      type="button"
      className={styles.mention}
      disabled={!canOpen}
      onClick={() => {
        if (canOpen) openEntity(entity.kind, entity.id);
      }}
    >
      @{entity.name}
    </button>
  );
}
