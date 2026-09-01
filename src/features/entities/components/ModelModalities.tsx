import { memo, useMemo, type ReactNode } from "react";
import {
  IconArrowRight,
  IconAudio,
  IconFile,
  IconImage,
  IconText,
  IconVideo,
} from "../../../components/icons";
import type { ModelArchitecture } from "../../../types/models";
import styles from "./ModelComponents.module.css";
import { useI18n } from "../../../i18n";
import type { TranslationValues } from "../../../i18n";

export interface ModelModalitiesProps {
  architecture?: ModelArchitecture;
}

const MODALITY_CONFIG: Record<
  string,
  { label: string; icon: (props: { width?: number; height?: number }) => ReactNode }
> = {
  text: {
    label: "model.modality.text",
    icon: (props) => <IconText {...props} />,
  },
  image: {
    label: "model.modality.image",
    icon: (props) => <IconImage {...props} />,
  },
  video: {
    label: "model.modality.video",
    icon: (props) => <IconVideo {...props} />,
  },
  audio: {
    label: "model.modality.audio",
    icon: (props) => <IconAudio {...props} />,
  },
  file: {
    label: "model.modality.file",
    icon: (props) => <IconFile {...props} />,
  },
  document: {
    label: "model.modality.document",
    icon: (props) => <IconFile {...props} />,
  },
  pdf: {
    label: "PDF",
    icon: (props) => <IconFile {...props} />,
  },
};

export function parseModalities(architecture?: ModelArchitecture): {
  inputs: string[];
  outputs: string[];
} {
  if (!architecture) {
    return { inputs: ["text"], outputs: ["text"] };
  }

  let inputs = architecture.inputModalities ?? [];
  let outputs = architecture.outputModalities ?? [];

  if (inputs.length === 0 || outputs.length === 0) {
    const rawModality = architecture.modality || "text->text";
    const [rawIn, rawOut] = rawModality.split("->");

    if (inputs.length === 0 && rawIn) {
      inputs = rawIn
        .split("+")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }
    if (outputs.length === 0 && rawOut) {
      outputs = rawOut
        .split("+")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return {
    inputs: inputs.length > 0 ? inputs : ["text"],
    outputs: outputs.length > 0 ? outputs : ["text"],
  };
}

function renderModalityItem(
  mod: string,
  key: string,
  t: (key: string, values?: TranslationValues) => string,
) {
  const norm = mod.toLowerCase().trim();
  const config = MODALITY_CONFIG[norm];

  if (config) {
    const label = t(config.label);
    return (
      <span
        key={key}
        className={styles.modalityIcon}
        title={label}
        aria-label={label}
      >
        {config.icon({ width: 13, height: 13 })}
      </span>
    );
  }

  // Fallback for unknown modality type
  return (
    <span
      key={key}
      className={styles.modalityFallback}
      title={t("model.modalityUnknown", { modality: mod })}
      aria-label={mod}
    >
      {mod}
    </span>
  );
}

export const ModelModalities = memo(function ModelModalities({
  architecture,
}: ModelModalitiesProps) {
  const { t } = useI18n();
  const { inputs, outputs } = useMemo(() => parseModalities(architecture), [architecture]);

  const readableSummary = useMemo(() => {
    return t("model.modalitySummary", { inputs: inputs.join(", "), outputs: outputs.join(", ") });
  }, [inputs, outputs, t]);

  return (
    <div
      className={styles.modalities}
      title={readableSummary}
      aria-label={readableSummary}
    >
      <div className={styles.modalityGroup}>
        {inputs.map((mod, idx) => renderModalityItem(mod, `in-${mod}-${idx}`, t))}
      </div>
      <span className={styles.modalityArrow} aria-hidden>
        <IconArrowRight width={11} height={11} />
      </span>
      <div className={styles.modalityGroup}>
        {outputs.map((mod, idx) => renderModalityItem(mod, `out-${mod}-${idx}`, t))}
      </div>
    </div>
  );
});
