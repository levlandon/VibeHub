import { useState } from "react";
import { CategoryStrip } from "../../components/CategoryStrip/CategoryStrip";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { PageHeader } from "../../components/PageHeader/PageHeader";
import { BENCHMARKS } from "../../data/benchmarks";
import type { BenchmarkCategory } from "../../types/hub";
import styles from "./Benchmarks.module.css";

const FILTERS: { id: "all" | BenchmarkCategory; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "coding", label: "Coding" },
  { id: "reasoning", label: "Reasoning" },
  { id: "research", label: "Research" },
  { id: "vision", label: "Vision" },
  { id: "speed", label: "Speed" },
];

export function BenchmarksPage() {
  const [category, setCategory] = useState<(typeof FILTERS)[number]["id"]>("all");

  const rows = BENCHMARKS.filter(
    (row) => category === "all" || row.category === category,
  );

  return (
    <div className={styles.page}>
      <PageHeader title="Бенчмарки">
        <CategoryStrip
          items={FILTERS}
          value={category}
          onChange={(id) => setCategory(id as typeof category)}
        />
        <div className={styles.secondary}>
          <p className={styles.legend}>
            Score — проверенный результат внешнего теста
          </p>
        </div>
      </PageHeader>

      {BENCHMARKS.length === 0 ? (
        <EmptyState>
          <div className={styles.emptyContent}>
            <h3>Бенчмарки пока не подключены</h3>
            <p>
              Позже здесь появятся независимые данные из внешних бенчмарков (SWE-bench, LiveCodeBench, SimpleQA).
            </p>
          </div>
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>Нет строк по выбранному фильтру.</EmptyState>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Модель</th>
                <th>Benchmark</th>
                <th>Score</th>
                <th>Источник</th>
                <th>Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.modelName}</td>
                  <td>{row.benchmark}</td>
                  <td className={styles.score}>{formatScore(row.score)}</td>
                  <td>{row.source}</td>
                  <td>{row.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 2 ? 2 : 1);
}
