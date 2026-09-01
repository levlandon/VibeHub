import { IconClose } from "../icons";
import { ProviderMark } from "../ProviderMark/ProviderMark";
import { useI18n } from "../../i18n";
import styles from "./ProfileChips.module.css";

export interface EditableModelChipProps {
  name: string;
  provider?: string;
  model?: { providerId?: string; provider?: string; name: string };
  onRemove: () => void;
}

export function EditableModelChip({
  name,
  provider,
  model,
  onRemove,
}: EditableModelChipProps) {
  const { t } = useI18n();
  const markModel = model || (provider ? { providerId: provider, provider, name } : { name });

  return (
    <div className={styles.editableModelChip} title={name}>
      <ProviderMark
        model={markModel}
        size={15}
        className={styles.modelMark}
      />
      <span className={styles.label}>{name}</span>
      <button
        type="button"
        className={styles.removeBtn}
        title={t("profile.removeModel", { name })}
        aria-label={t("profile.removeModel", { name })}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <IconClose width={12} height={12} />
      </button>
    </div>
  );
}
