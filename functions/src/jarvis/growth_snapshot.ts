import type { Decision, DecisionTrigger } from './decision';
import type { FetchGrowthSourceResult } from './growth_firestore_fetcher';
import { runGrowthDepartment } from './growth_department';
import type { GrowthReportCollection } from './growth_source_reader';

/** Единственный шов между Firestore и департаментом «Рост». */

export type GrowthFetcher = () => Promise<FetchGrowthSourceResult>;

export interface GrowthFetcherMap {
  readonly users: GrowthFetcher;
}

export interface BuildGrowthSnapshotInput {
  readonly fetchers: GrowthFetcherMap;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
}

export interface GrowthSnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

function failClosedFetch(sourceId: GrowthReportCollection, observedAtMs: number): FetchGrowthSourceResult {
  return Object.freeze({ sourceId, state: 'error' as const, truncated: false, droppedCount: 0, rows: Object.freeze([]), observedAtMs });
}

export async function buildGrowthSnapshot(input: BuildGrowthSnapshotInput): Promise<GrowthSnapshot> {
  let usersFetch: FetchGrowthSourceResult;
  try {
    usersFetch = await input.fetchers.users();
  } catch {
    usersFetch = failClosedFetch('users', input.nowMs);
  }

  const { decisions } = runGrowthDepartment({
    fetches: [usersFetch],
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
