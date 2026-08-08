import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import { runSafetyDepartment } from './safety_department';
import type { FetchSafetySourceResult } from './safety_firestore_fetcher';

/**
 * Единственный шов между Firestore и департаментом «Безопасность» — тот же
 * принцип, что у остальных: планировщик и панель зовут один путь и не могут
 * разойтись в показаниях.
 */

export type SafetyFetcher = () => Promise<FetchSafetySourceResult>;

export interface BuildSafetySnapshotInput {
  readonly fetchSafety: SafetyFetcher;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface SafetySnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

/** Упавший читатель — это «неизвестно», а не «чисто». */
function failClosedFetch(observedAtMs: number): FetchSafetySourceResult {
  return Object.freeze({
    state: 'error' as const,
    openFlags: null,
    openMinorFlags: null,
    recentFlags: null,
    observedAtMs,
  });
}

export async function buildSafetySnapshot(input: BuildSafetySnapshotInput): Promise<SafetySnapshot> {
  let fetch: FetchSafetySourceResult;
  try {
    fetch = await input.fetchSafety();
  } catch {
    fetch = failClosedFetch(input.nowMs);
  }

  const { decisions } = runSafetyDepartment({
    fetch,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
