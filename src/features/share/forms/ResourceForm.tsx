import { postTypeConfig } from "../../../config/postTypes";
import {
  ContentField,
  ExtraTextField,
  TitleField,
  patchDraft,
} from "../fields/ComposerFields";
import type { TypeFormProps } from "./types";

export function ResourceForm({ draft, onChange }: TypeFormProps) {
  const fields = postTypeConfig("resource").fields;
  return (
    <>
      <TitleField value={draft.title} onChange={(title) => onChange(patchDraft(draft, { title }))} />
      <ContentField
        value={draft.content}
        onChange={(content) => onChange(patchDraft(draft, { content }))}
      />
      {fields.map((field) => (
        <ExtraTextField
          key={field.key}
          field={field}
          value={draft.extras[field.key] ?? ""}
          onChange={(value) =>
            onChange(patchDraft(draft, { extras: { [field.key]: value } }))
          }
        />
      ))}
    </>
  );
}
