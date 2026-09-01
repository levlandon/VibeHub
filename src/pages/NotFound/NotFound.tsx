import { useI18n } from "../../i18n";
import styles from "./NotFound.module.css";

export function NotFound() {
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.text}>{t("notFound.description")}</p>
      <a className={styles.link} href="/models">
        ← {t("notFound.back")}
      </a>
    </div>
  );
}
