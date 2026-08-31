import { entityPath, profilePath } from "../../state/routing";
import type { EntityRef } from "../../types/entities";
import styles from "./Mention.module.css";

export function Mention({ entity }: { entity: EntityRef }) {
  const href =
    entity.kind === "model" || entity.kind === "tool"
      ? entityPath({ kind: entity.kind, id: entity.id })
      : entity.kind === "user"
      ? profilePath(entity.id)
      : null;

  if (!href) {
    return <span className={styles.mention}>@{entity.name}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.mention}
      onClick={(e) => {
        // Prevent click from bubbling to parent post card row / modal trigger
        e.stopPropagation();
      }}
    >
      @{entity.name}
    </a>
  );
}
