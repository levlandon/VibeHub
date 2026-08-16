import type { BenchmarkRow } from "../types/hub";

/**
 * Benchmarks data source.
 * Starts empty until real external benchmark providers (e.g. Artificial Analysis, SWE-bench) are connected.
 */
export const BENCHMARKS: BenchmarkRow[] = [];
