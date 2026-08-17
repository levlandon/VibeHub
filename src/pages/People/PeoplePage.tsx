import { IconUsers } from "../../components/icons";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import styles from "./PeoplePage.module.css";

export function PeoplePage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Люди">
        <div />
      </PageHeader>

      <div className={styles.noticeCard}>
        <div className={styles.icon}>
          <IconUsers width={24} height={24} />
        </div>
        <h3 className={styles.title}>Каталог пользователей и разработчиков</h3>
        <p className={styles.description}>
          Здесь скоро появится каталог участников сообщества, их AI-стеки, проекты и совместные активности.
        </p>
      </div>
    </div>
  );
}
