import type { ChatChannelId, ChatMessage } from "../types/hub";

export const CHAT_CHANNELS: { id: ChatChannelId; label: string }[] = [
  { id: "general", label: "общий" },
  { id: "coding", label: "coding" },
  { id: "models", label: "models" },
  { id: "tools", label: "tools" },
];

/**
 * Community chat messages data source.
 * Starts empty in production mode.
 */
export const INITIAL_MESSAGES: ChatMessage[] = [];
