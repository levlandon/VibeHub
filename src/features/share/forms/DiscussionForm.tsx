import {
  ContentField,
  TitleField,
  patchDraft,
} from "../fields/ComposerFields";
import type { TypeFormProps } from "./types";

export function DiscussionForm({ draft, onChange }: TypeFormProps) {
  return (
    <>
      <TitleField value={draft.title} onChange={(title) => onChange(patchDraft(draft, { title }))} />
      <ContentField
        value={draft.content}
        onChange={(content) => onChange(patchDraft(draft, { content }))}
      />
    </>
  );
}
