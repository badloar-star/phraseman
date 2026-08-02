import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import { runRetentionDepartment } from './retention_department';
import type { FetchRetentionSourceResult } from './retention_firestore_fetcher';

/**
 * Единственный шов между Firestore и департаментом «Удержание»:
 * планировщик и панель зовут один путь и не могут разойтись в показаниях.
 */

export type RetentionFetcher = () => Promise<FetchRetentionSourceResult>;

export interface BuildRetentionSnapshotInput {
  readonly fetchRetention: RetentionFetcher;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface RetentionSnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

/** Упавший читатель — «неизвестно», а не «все ушли». */
function failClosedFetch(observedAtMs: number): FetchRetentionSourceResult {
  return Object.freeze({
    state: 'error' as const,
    activeWeek: null,
    activeMonth: null,
    observedAtMs,
  });
}

// guard-ok: никаких onSnapshot-подписок здесь нет — это разовый вызов
// читателя. «Snapshot» в имени означает моментальный слепок решений, а не
// realtime-слушателя Firestore.
export async function buildRetentionSnapshot(input: BuildRetentionSnapshotInput): Promise<RetentionSnapshot> {
  let fetch: FetchRetentionSourceResult;
  try {
    fetch = await input.fetchRetention();
  } catch {
    fetch = failClosedFetch(input.nowMs);
  }

  const { decisions } = runRetentionDepartment({
    fetch,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
