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

export interface ModelModalitiesProps {
  architecture?: ModelArchitecture;
}

const MODALITY_CONFIG: Record<
  string,
  { label: string; icon: (props: { width?: number; height?: number }) => ReactNode }
> = {
  text: {
    label: "Текст (Text)",
    icon: (props) => <IconText {...props} />,
  },
  image: {
    label: "Изображение (Image)",
    icon: (props) => <IconImage {...props} />,
  },
  video: {
    label: "Видео (Video)",
    icon: (props) => <IconVideo {...props} />,
  },
  audio: {
    label: "Аудио (Audio)",
    icon: (props) => <IconAudio {...props} />,
  },
  file: {
    label: "Файл / Документ (File)",
    icon: (props) => <IconFile {...props} />,
  },
  document: {
    label: "Документ (Document)",
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

function renderModalityItem(mod: string, key: string) {
  const norm = mod.toLowerCase().trim();
  const config = MODALITY_CONFIG[norm];

  if (config) {
    return (
      <span
        key={key}
        className={styles.modalityIcon}
        title={config.label}
        aria-label={config.label}
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
      title={`Модальность: ${mod}`}
      aria-label={mod}
    >
      {mod}
    </span>
  );
}

export const ModelModalities = memo(function ModelModalities({
  architecture,
}: ModelModalitiesProps) {
  const { inputs, outputs } = useMemo(() => parseModalities(architecture), [architecture]);

  const readableSummary = useMemo(() => {
    return `Модальность: [${inputs.join(", ")}] → [${outputs.join(", ")}]`;
  }, [inputs, outputs]);

  return (
    <div
      className={styles.modalities}
      title={readableSummary}
      aria-label={readableSummary}
    >
      <div className={styles.modalityGroup}>
        {inputs.map((mod, idx) => renderModalityItem(mod, `in-${mod}-${idx}`))}
      </div>
      <span className={styles.modalityArrow} aria-hidden>
        <IconArrowRight width={11} height={11} />
      </span>
      <div className={styles.modalityGroup}>
        {outputs.map((mod, idx) => renderModalityItem(mod, `out-${mod}-${idx}`))}
      </div>
    </div>
  );
});
