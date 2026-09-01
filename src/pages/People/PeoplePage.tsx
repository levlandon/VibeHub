import { IconUsers } from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { useI18n } from "../../i18n";
import styles from "./PeoplePage.module.css";

export function PeoplePage() {
  const { t } = useI18n();

  return (
    <div className={styles.page}>
      <PageHeader title={t("people.title")}>
        <div />
      </PageHeader>

      <div className={styles.noticeCard}>
        <div className={styles.icon}>
          <IconUsers width={24} height={24} />
        </div>
        <h3 className={styles.title}>{t("people.descriptionTitle")}</h3>
        <p className={styles.description}>
          {t("people.description")}
        </p>
      </div>
    </div>
  );
}
