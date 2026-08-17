import { useMemo, useState } from "react";
import {
  POPULAR_CODING_AGENTS,
  POPULAR_MODELS_PRESET,
  POPULAR_TOOLS_PRESET,
  resolveModelToStackItem,
  resolveToolToStackItem,
} from "../../data/aiStack";
import type { Model, Tool } from "../../types/hub";
import { IconCheck, IconClose, IconSearch } from "../icons";
import { AiStackCard } from "./AiStackCard";
import styles from "./AiStackPicker.module.css";

interface AiStackPickerProps {
  selectedAgents: string[];
  onChangeAgents: (agents: string[]) => void;
  selectedModels: string[];
  onChangeModels: (models: string[]) => void;
  selectedTools: string[];
  onChangeTools: (tools: string[]) => void;
  availableModels?: Model[];
  availableTools?: Tool[];
}

export function AiStackPicker({
  selectedAgents,
  onChangeAgents,
  selectedModels,
  onChangeModels,
  selectedTools,
  onChangeTools,
  availableModels = [],
  availableTools = [],
}: AiStackPickerProps) {
  const [modelSearch, setModelSearch] = useState("");
  const [toolSearch, setToolSearch] = useState("");

  const toggleAgent = (name: string) => {
    if (selectedAgents.includes(name)) {
      onChangeAgents(selectedAgents.filter((a) => a !== name));
    } else {
      onChangeAgents([...selectedAgents, name]);
    }
  };

  const toggleModel = (id: string) => {
    if (selectedModels.includes(id)) {
      onChangeModels(selectedModels.filter((m) => m !== id));
    } else {
      onChangeModels([...selectedModels, id]);
    }
  };

  const toggleTool = (id: string) => {
    if (selectedTools.includes(id)) {
      onChangeTools(selectedTools.filter((t) => t !== id));
    } else {
      onChangeTools([...selectedTools, id]);
    }
  };

  // Filtered models for search picker
  const filteredModels = useMemo(() => {
    const query = modelSearch.trim().toLowerCase();
    if (!query) return [];

    const matched = availableModels.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        m.provider.toLowerCase().includes(query),
    );

    return matched.slice(0, 15);
  }, [modelSearch, availableModels]);

  // Filtered tools for search picker
  const filteredTools = useMemo(() => {
    const query = toolSearch.trim().toLowerCase();
    if (!query) return [];

    const matched = availableTools.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        t.summary.toLowerCase().includes(query) ||
        t.tags.some((tag) => tag.toLowerCase().includes(query)),
    );

    return matched.slice(0, 15);
  }, [toolSearch, availableTools]);

  return (
    <div className={styles.container}>
      {/* 1. Coding Agents */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            Coding Agents
            <span className={`${styles.countBadge} ${selectedAgents.length > 0 ? styles.hasCount : ""}`}>
              {selectedAgents.length}
            </span>
          </span>
        </div>
        <div className={styles.grid}>
          {POPULAR_CODING_AGENTS.map((agent) => (
            <AiStackCard
              key={agent.id}
              item={agent}
              selected={selectedAgents.includes(agent.name)}
              onToggle={() => toggleAgent(agent.name)}
            />
          ))}
        </div>
      </div>

      {/* 2. Models */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            Models
            <span className={`${styles.countBadge} ${selectedModels.length > 0 ? styles.hasCount : ""}`}>
              {selectedModels.length}
            </span>
          </span>
        </div>

        {/* Selected non-preset models as chips */}
        {selectedModels.length > 0 && (
          <div className={styles.chipList}>
            {selectedModels.map((id) => {
              const item = resolveModelToStackItem(id, availableModels);
              return (
                <AiStackCard
                  key={id}
                  item={item}
                  selected={true}
                  variant="chip"
                  onToggle={() => toggleModel(id)}
                />
              );
            })}
          </div>
        )}

        {/* Popular Preset Models */}
        <div className={styles.chipList}>
          {POPULAR_MODELS_PRESET.map((model) => (
            <AiStackCard
              key={model.id}
              item={model}
              selected={selectedModels.includes(model.id)}
              variant="chip"
              onToggle={() => toggleModel(model.id)}
            />
          ))}
        </div>

        {/* Search / picker for all models */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>
            <IconSearch width={14} height={14} />
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по всем доступным моделям..."
            value={modelSearch}
            onChange={(e) => setModelSearch(e.target.value)}
          />
          {modelSearch && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setModelSearch("")}
              aria-label="Очистить поиск"
            >
              <IconClose width={14} height={14} />
            </button>
          )}
        </div>

        {modelSearch.trim() && (
          <div className={styles.searchResultsList}>
            {filteredModels.length === 0 ? (
              <div className={styles.emptySearch}>Модели не найдены</div>
            ) : (
              filteredModels.map((model) => {
                const isSelected = selectedModels.includes(model.id);
                return (
                  <button
                    key={model.id}
                    type="button"
                    className={`${styles.searchResultItem} ${isSelected ? styles.selected : ""}`}
                    onClick={() => toggleModel(model.id)}
                  >
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{model.name}</span>
                      <span className={styles.itemSub}>{model.provider}</span>
                    </div>
                    {isSelected && <IconCheck width={14} height={14} />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 3. Tools */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            Tools
            <span className={`${styles.countBadge} ${selectedTools.length > 0 ? styles.hasCount : ""}`}>
              {selectedTools.length}
            </span>
          </span>
        </div>

        {/* Selected non-preset tools as chips */}
        {selectedTools.length > 0 && (
          <div className={styles.chipList}>
            {selectedTools.map((id) => {
              const item = resolveToolToStackItem(id, availableTools);
              return (
                <AiStackCard
                  key={id}
                  item={item}
                  selected={true}
                  variant="chip"
                  onToggle={() => toggleTool(id)}
                />
              );
            })}
          </div>
        )}

        {/* Popular Preset Tools */}
        <div className={styles.chipList}>
          {POPULAR_TOOLS_PRESET.map((tool) => (
            <AiStackCard
              key={tool.id}
              item={tool}
              selected={selectedTools.includes(tool.id)}
              variant="chip"
              onToggle={() => toggleTool(tool.id)}
            />
          ))}
        </div>

        {/* Search / picker for tools if available */}
        {availableTools.length > 0 && (
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <IconSearch width={14} height={14} />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Поиск по каталогу инструментов..."
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
            />
            {toolSearch && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => setToolSearch("")}
                aria-label="Очистить поиск"
              >
                <IconClose width={14} height={14} />
              </button>
            )}
          </div>
        )}

        {toolSearch.trim() && (
          <div className={styles.searchResultsList}>
            {filteredTools.length === 0 ? (
              <div className={styles.emptySearch}>Инструменты не найдены</div>
            ) : (
              filteredTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className={`${styles.searchResultItem} ${isSelected ? styles.selected : ""}`}
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>{tool.name}</span>
                      <span className={styles.itemSub}>{tool.typeLabel || tool.category}</span>
                    </div>
                    {isSelected && <IconCheck width={14} height={14} />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
