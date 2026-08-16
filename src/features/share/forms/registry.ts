import type { ComponentType } from "react";
import type { PostType } from "../../../types/posts";
import { DiscussionForm } from "./DiscussionForm";
import { GuideForm } from "./GuideForm";
import { ProjectForm } from "./ProjectForm";
import { QuestionForm } from "./QuestionForm";
import { ResourceForm } from "./ResourceForm";
import type { TypeFormProps } from "./types";

export const TYPE_FORMS: Record<PostType, ComponentType<TypeFormProps>> = {
  discussion: DiscussionForm,
  question: QuestionForm,
  project: ProjectForm,
  guide: GuideForm,
  resource: ResourceForm,
};
