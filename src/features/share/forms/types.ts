import type { PostDraft } from "../types";

export interface TypeFormProps {
  draft: PostDraft;
  onChange: (draft: PostDraft) => void;
}
