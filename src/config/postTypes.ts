import type { PostType } from "../types/posts";

export interface ExtraField {
  key: string;
  label: string;
  placeholder: string;
}

export interface PostTypeConfig {
  id: PostType;
  label: string;
  hint: string;
  mark: string;
  composeTitle: string;
  fields: ExtraField[];
}

export const POST_TYPES: PostTypeConfig[] = [
  {
    id: "discussion",
    label: "Обсуждение",
    hint: "Тема для сообщества",
    mark: "💬",
    composeTitle: "Новое обсуждение",
    fields: [],
  },
  {
    id: "question",
    label: "Вопрос",
    hint: "Можно отметить решение",
    mark: "?",
    composeTitle: "Новый вопрос",
    fields: [],
  },
  {
    id: "project",
    label: "Проект",
    hint: "Репозиторий или демо",
    mark: "◇",
    composeTitle: "Новый проект",
    fields: [
      { key: "repositoryUrl", label: "Репозиторий", placeholder: "https://github.com/…" },
      { key: "demoUrl", label: "Демо", placeholder: "https://…" },
    ],
  },
  {
    id: "guide",
    label: "Гайд",
    hint: "Как пользоваться сущностью",
    mark: "≡",
    composeTitle: "Новый гайд",
    fields: [],
  },
  {
    id: "resource",
    label: "Ресурс",
    hint: "Внешняя ссылка",
    mark: "↗",
    composeTitle: "Новый ресурс",
    fields: [{ key: "url", label: "Ссылка", placeholder: "https://…" }],
  },
];

export const POST_FILTERS: { id: "all" | PostType; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "question", label: "Вопросы" },
  { id: "guide", label: "Гайды" },
  { id: "project", label: "Проекты" },
  { id: "resource", label: "Ресурсы" },
  { id: "discussion", label: "Обсуждения" },
];

export function postTypeConfig(type: PostType) {
  return POST_TYPES.find((item) => item.id === type) ?? POST_TYPES[0];
}

export function questionStatus(post: { type: PostType; solved?: boolean }) {
  if (post.type !== "question") return null;
  return post.solved
    ? { mark: "✓", label: "Решено" }
    : { mark: "?", label: "Вопрос" };
}
