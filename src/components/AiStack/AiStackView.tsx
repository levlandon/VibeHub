import {
  resolveAgentToStackItem,
  resolveModelToStackItem,
  resolveToolToStackItem,
} from "../../data/aiStack";
import { useI18n } from "../../i18n";
import type { Model, Tool } from "../../types/hub";
import { IconBot, IconModels, IconTools } from "../icons";
import styles from "./AiStackView.module.css";

interface AiStackViewProps {
  codingAgents: string[];
  models: string[];
  tools: string[];
  availableModels?: Model[];
  availableTools?: Tool[];
}

export function AiStackView({
  codingAgents,
  models,
  tools,
  availableModels = [],
  availableTools = [],
}: AiStackViewProps) {
  const { t } = useI18n();
  return (
    <div className={styles.stackContainer}>
      {/* 1. Coding Agents */}
      <div className={styles.categoryBlock}>
        <div className={styles.categoryHeader}>
          <IconBot width={16} height={16} />
          <span>{t("profile.codingAgents")}</span>
          <span className={styles.categoryCount}>{codingAgents.length}</span>
        </div>
        {codingAgents.length === 0 ? (
          <div className={styles.emptyCategory}>{t("profile.codingAgentsNone")}</div>
        ) : (
          <div className={styles.itemList}>
            {codingAgents.map((name) => {
              const item = resolveAgentToStackItem(name);
              return (
                <div key={name} className={styles.itemBadge}>
                  <span className={styles.iconWrap}>
                    <IconBot width={13} height={13} />
                  </span>
                  <span>{item.name}</span>
                  {item.badge ? <span className={styles.badgeSub}>({item.badge})</span> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Models */}
      <div className={styles.categoryBlock}>
        <div className={styles.categoryHeader}>
          <IconModels width={16} height={16} />
          <span>{t("composer.models")}</span>
          <span className={styles.categoryCount}>{models.length}</span>
        </div>
        {models.length === 0 ? (
          <div className={styles.emptyCategory}>{t("profile.modelsNone")}</div>
        ) : (
          <div className={styles.itemList}>
            {models.map((id) => {
              const item = resolveModelToStackItem(id, availableModels);
              return (
                <div key={id} className={styles.itemBadge}>
                  <span className={styles.iconWrap}>
                    <IconModels width={13} height={13} />
                  </span>
                  <span>{item.name}</span>
                  {item.provider ? <span className={styles.badgeSub}>• {item.provider}</span> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Tools */}
      <div className={styles.categoryBlock}>
        <div className={styles.categoryHeader}>
          <IconTools width={16} height={16} />
          <span>{t("composer.tools")}</span>
          <span className={styles.categoryCount}>{tools.length}</span>
        </div>
        {tools.length === 0 ? (
          <div className={styles.emptyCategory}>{t("profile.toolsNone")}</div>
        ) : (
          <div className={styles.itemList}>
            {tools.map((id) => {
              const item = resolveToolToStackItem(id, availableTools);
              return (
                <div key={id} className={styles.itemBadge}>
                  <span className={styles.iconWrap}>
                    <IconTools width={13} height={13} />
                  </span>
                  <span>{item.name}</span>
                  {item.badge ? <span className={styles.badgeSub}>• {item.badge}</span> : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
