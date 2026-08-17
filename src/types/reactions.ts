export type ReactionType = "fire" | "slow" | "clown";

export interface ModelReactions {
  fire: number;
  slow: number;
  clown: number;
}

export interface UserModelReactions {
  modelId: string;
  reactions: ReactionType[];
}

export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
  tooltip: string;
}

export const REACTION_CONFIGS: ReactionConfig[] = [
  {
    type: "fire",
    emoji: "🔥",
    label: "Одобрение",
    tooltip: "Нравится сообществу",
  },
  {
    type: "slow",
    emoji: "🐌",
    label: "Медленная",
    tooltip: "Считают медленной",
  },
  {
    type: "clown",
    emoji: "🤡",
    label: "Ошибки",
    tooltip: "Часто тупит или ошибается",
  },
];
