import { parseSpans } from "../../services/content";
import type { ContentSpan, EntityRef } from "../../types/entities";
import { Mention } from "./Mention";

export function RichText({
  text,
  spans,
  entities,
}: {
  text: string;
  spans?: ContentSpan[];
  entities: EntityRef[];
}) {
  const parts = spans?.length ? spans : parseSpans(text, entities);
  return (
    <>
      {parts.map((part, i) =>
        part.type === "mention" ? (
          <Mention key={`${part.entity.id}-${i}`} entity={part.entity} />
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
}
