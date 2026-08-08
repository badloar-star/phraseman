import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import type { FetchContentSourceResult } from './content_firestore_fetcher';
import { runFactoryDepartment } from './factory_department';

/**
 * Единственный шов между Firestore и департаментом «Фабрика контента».
 *
 * зачем тот же источник, что у «Контента»: оба читают lesson_stats, но
 * спрашивают разное — «что сломано» и «чего не хватает». Панель зовёт их одним
 * прогоном, поэтому документы читаются один раз на департамент, а не заново.
 */

export type FactoryFetcher = () => Promise<FetchContentSourceResult>;

export interface BuildFactorySnapshotInput {
  readonly fetchFactory: FactoryFetcher;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface FactorySnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

/** Упавший читатель — «неизвестно», а не «курс полон». */
function failClosedFetch(): FetchContentSourceResult {
  return Object.freeze({
    sourceId: 'lesson_stats' as const,
    state: 'error' as const,
    truncated: false,
    droppedCount: 0,
    rows: Object.freeze([]),
    observedAtMs: 0,
  });
}

export async function buildFactorySnapshot(input: BuildFactorySnapshotInput): Promise<FactorySnapshot> {
  let fetch: FetchContentSourceResult;
  try {
    fetch = await input.fetchFactory();
  } catch {
    fetch = failClosedFetch();
  }

  const { decisions } = runFactoryDepartment({
    fetches: [fetch],
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
