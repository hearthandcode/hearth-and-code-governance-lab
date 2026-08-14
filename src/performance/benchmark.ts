export const SYNTHETIC_BENCHMARK_VERSION = "0.1-candidate.1" as const;

export interface BenchmarkWorkload {
  id: string;
  operation: "parse" | "render";
  unitsPerSample: number;
  samples: number;
  budgetMs: number;
  run: (unit: number, sample: number) => void;
  beforeSample?: (sample: number) => void;
  afterSample?: (sample: number) => void;
}

export interface BenchmarkResult {
  id: string;
  operation: "parse" | "render";
  unitsPerSample: number;
  samples: number;
  durationsMs: number[];
  medianMs: number;
  maximumMs: number;
  medianPerUnitMs: number;
  budgetMs: number;
  passed: boolean;
}

export interface SyntheticBenchmarkReceipt {
  recordType: "hcc-synthetic-performance-receipt";
  contractVersion: typeof SYNTHETIC_BENCHMARK_VERSION;
  authority: "bounded-local-performance-evidence";
  observedAt: string;
  environment: { runtime: string; dom: string; host: "synthetic-not-obsidian" };
  workloads: BenchmarkResult[];
  passed: boolean;
  effects: { vaultRead: false; vaultMutation: false; network: false; canonicalApply: false };
  limits: readonly string[];
}

export function measureWorkload(workload: BenchmarkWorkload, now: () => number = () => performance.now()): BenchmarkResult {
  if (!Number.isInteger(workload.unitsPerSample) || workload.unitsPerSample < 1) throw new Error("HCC-PERF-WORKLOAD: unitsPerSample must be a positive integer.");
  if (!Number.isInteger(workload.samples) || workload.samples < 1) throw new Error("HCC-PERF-WORKLOAD: samples must be a positive integer.");
  if (!Number.isFinite(workload.budgetMs) || workload.budgetMs <= 0) throw new Error("HCC-PERF-WORKLOAD: budgetMs must be positive.");
  const durationsMs: number[] = [];
  for (let sample = 0; sample < workload.samples; sample += 1) {
    workload.beforeSample?.(sample);
    const startedAt = now();
    for (let unit = 0; unit < workload.unitsPerSample; unit += 1) workload.run(unit, sample);
    const elapsed = now() - startedAt;
    workload.afterSample?.(sample);
    durationsMs.push(round(elapsed));
  }
  const ordered = [...durationsMs].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const medianMs = round(ordered.length % 2 === 0 ? (ordered[middle - 1]! + ordered[middle]!) / 2 : ordered[middle]!);
  const maximumMs = round(Math.max(...durationsMs));
  return {
    id: workload.id,
    operation: workload.operation,
    unitsPerSample: workload.unitsPerSample,
    samples: workload.samples,
    durationsMs,
    medianMs,
    maximumMs,
    medianPerUnitMs: round(medianMs / workload.unitsPerSample),
    budgetMs: workload.budgetMs,
    passed: maximumMs < workload.budgetMs
  };
}

export function createSyntheticBenchmarkReceipt(
  workloads: readonly BenchmarkWorkload[],
  environment: SyntheticBenchmarkReceipt["environment"],
  observedAt = new Date().toISOString(),
  now: () => number = () => performance.now()
): SyntheticBenchmarkReceipt {
  const results = workloads.map((workload) => measureWorkload(workload, now));
  return {
    recordType: "hcc-synthetic-performance-receipt",
    contractVersion: SYNTHETIC_BENCHMARK_VERSION,
    authority: "bounded-local-performance-evidence",
    observedAt,
    environment,
    workloads: results,
    passed: results.every((result) => result.passed),
    effects: { vaultRead: false, vaultMutation: false, network: false, canonicalApply: false },
    limits: Object.freeze([
      "Happy DOM timings are regression evidence, not real Obsidian rendering performance.",
      "This receipt does not measure Live Preview updates, interaction latency, layout, paint, memory, mobile behavior, or assistive technology.",
      "Budgets are generous failure ceilings and are not public performance promises."
    ])
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
