import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import { runSupportDepartment } from './support_department';
import type { FetchSupportSourceResult } from './support_firestore_fetcher';

/**
 * Единственный шов между Firestore и департаментом «Скорость поддержки»:
 * планировщик и панель зовут один путь и не могут разойтись в показаниях.
 */

export type SupportFetcher = () => Promise<FetchSupportSourceResult>;

export interface BuildSupportSnapshotInput {
  readonly fetchSupport: SupportFetcher;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface SupportSnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

/** Упавший читатель — «неизвестно», а не «никто не ждёт». */
function failClosedFetch(observedAtMs: number): FetchSupportSourceResult {
  return Object.freeze({
    state: 'error' as const,
    waitingCount: null,
    oldestWaitingMs: null,
    answeredCount: null,
    medianReplyMs: null,
    observedAtMs,
  });
}

export async function buildSupportSnapshot(input: BuildSupportSnapshotInput): Promise<SupportSnapshot> {
  let fetch: FetchSupportSourceResult;
  try {
    fetch = await input.fetchSupport();
  } catch {
    fetch = failClosedFetch(input.nowMs);
  }

  const { decisions } = runSupportDepartment({
    fetch,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
