import type { AiStackItem } from "../types/profile";
import type { Model, Tool } from "../types/hub";

export const POPULAR_CODING_AGENTS: AiStackItem[] = [
  {
    id: "Codex",
    name: "Codex",
    category: "agents",
    description: "OpenAI code generation engine & agent",
    badge: "OpenAI",
  },
  {
    id: "Claude Code",
    name: "Claude Code",
    category: "agents",
    description: "Anthropic agentic CLI for terminal workflows",
    badge: "Anthropic",
  },
  {
    id: "Cursor",
    name: "Cursor",
    category: "agents",
    description: "AI-first code editor built for pair programming",
    badge: "IDE",
  },
  {
    id: "Gemini CLI",
    name: "Gemini CLI",
    category: "agents",
    description: "Google multimodal developer assistant",
    badge: "Google",
  },
  {
    id: "OpenCode",
    name: "OpenCode",
    category: "agents",
    description: "Open-source autonomous terminal coding agent",
    badge: "Open Source",
  },
  {
    id: "Aider",
    name: "Aider",
    category: "agents",
    description: "AI pair programming in your terminal",
    badge: "CLI",
  },
  {
    id: "Windsurf",
    name: "Windsurf",
    category: "agents",
    description: "Agentic IDE by Codeium with cascade flows",
    badge: "IDE",
  },
  {
    id: "Devin",
    name: "Devin",
    category: "agents",
    description: "Autonomous software engineer by Cognition",
    badge: "Autonomous",
  },
  {
    id: "Cline",
    name: "Cline",
    category: "agents",
    description: "Autonomous coding agent extension for VS Code",
    badge: "Extension",
  },
  {
    id: "GitHub Copilot",
    name: "GitHub Copilot",
    category: "agents",
    description: "AI pair programmer directly in your editor",
    badge: "GitHub",
  },
];

export const POPULAR_MODELS_PRESET: AiStackItem[] = [
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet",
    category: "models",
    provider: "Anthropic",
    badge: "Hybrid Reasoning",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    category: "models",
    provider: "Anthropic",
    badge: "SOTA Coding",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    category: "models",
    provider: "OpenAI",
    badge: "Omni",
  },
  {
    id: "openai/o3-mini",
    name: "o3-mini",
    category: "models",
    provider: "OpenAI",
    badge: "Reasoning",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    category: "models",
    provider: "DeepSeek",
    badge: "Open Reasoning",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    category: "models",
    provider: "DeepSeek",
    badge: "Cost Efficient",
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    category: "models",
    provider: "Google",
    badge: "Fast / Multimodal",
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    name: "Qwen 2.5 Coder 32B",
    category: "models",
    provider: "Qwen",
    badge: "Open Weights",
  },
];

export const POPULAR_TOOLS_PRESET: AiStackItem[] = [
  {
    id: "v0",
    name: "v0",
    category: "tools",
    description: "Generative UI system by Vercel",
    badge: "Frontend",
  },
  {
    id: "bolt-new",
    name: "Bolt.new",
    category: "tools",
    description: "Full-stack WebContainer sandbox & builder",
    badge: "Fullstack",
  },
  {
    id: "lovable",
    name: "Lovable",
    category: "tools",
    description: "Full-stack GPT engineer with instant preview",
    badge: "App Builder",
  },
  {
    id: "ollama",
    name: "Ollama",
    category: "tools",
    description: "Get up and running with local LLMs",
    badge: "Local AI",
  },
  {
    id: "langchain",
    name: "LangChain",
    category: "tools",
    description: "Framework for developing context-aware LLM apps",
    badge: "Framework",
  },
  {
    id: "mcp",
    name: "Model Context Protocol (MCP)",
    category: "tools",
    description: "Standard protocol for connecting AI to tools & data",
    badge: "Protocol",
  },
];

export function resolveModelToStackItem(modelIdOrName: string, availableModels: Model[] = []): AiStackItem {
  const found = availableModels.find((m) => m.id === modelIdOrName || m.name.toLowerCase() === modelIdOrName.toLowerCase());
  if (found) {
    return {
      id: found.id,
      name: found.name,
      category: "models",
      provider: found.provider,
      badge: found.contextLength ? `${Math.round(found.contextLength / 1000)}k ctx` : undefined,
    };
  }

  const preset = POPULAR_MODELS_PRESET.find((m) => m.id === modelIdOrName || m.name.toLowerCase() === modelIdOrName.toLowerCase());
  if (preset) return preset;

  // Fallback: format name cleanly if it's "provider/model"
  const parts = modelIdOrName.split("/");
  const provider = parts.length > 1 ? parts[0] : undefined;
  const name = parts.length > 1 ? parts.slice(1).join("/") : modelIdOrName;

  return {
    id: modelIdOrName,
    name,
    category: "models",
    provider,
  };
}

export function resolveToolToStackItem(toolIdOrName: string, availableTools: Tool[] = []): AiStackItem {
  const found = availableTools.find((t) => t.id === toolIdOrName || t.name.toLowerCase() === toolIdOrName.toLowerCase());
  if (found) {
    return {
      id: found.id,
      name: found.name,
      category: "tools",
      description: found.summary,
      badge: found.typeLabel || found.category,
    };
  }

  const preset = POPULAR_TOOLS_PRESET.find((t) => t.id === toolIdOrName || t.name.toLowerCase() === toolIdOrName.toLowerCase());
  if (preset) return preset;

  return {
    id: toolIdOrName,
    name: toolIdOrName,
    category: "tools",
  };
}

export function resolveAgentToStackItem(agentName: string): AiStackItem {
  const found = POPULAR_CODING_AGENTS.find((a) => a.id === agentName || a.name.toLowerCase() === agentName.toLowerCase());
  if (found) return found;

  return {
    id: agentName,
    name: agentName,
    category: "agents",
    badge: "Agent",
  };
}
