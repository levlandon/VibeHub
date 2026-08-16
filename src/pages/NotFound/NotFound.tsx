import styles from "./NotFound.module.css";

export function NotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>404</h1>
      <p className={styles.text}>Такой страницы нет.</p>
      <a className={styles.link} href="/models">
        ← К моделям
      </a>
    </div>
  );
}
