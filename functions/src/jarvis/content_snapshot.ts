import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import type { FetchContentSourceResult } from './content_firestore_fetcher';
import { runContentDepartment } from './content_department';

/**
 * Единственный шов между Firestore и департаментом «Контент» — тот же
 * принцип, что у quality/money/growth: планировщик и панель зовут один путь.
 */

export type ContentFetcher = () => Promise<FetchContentSourceResult>;

export interface ContentFetcherMap {
  readonly lesson_stats: ContentFetcher;
}

export interface BuildContentSnapshotInput {
  readonly fetchers: ContentFetcherMap;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface ContentSnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

function failClosedFetch(observedAtMs: number): FetchContentSourceResult {
  return Object.freeze({
    sourceId: 'lesson_stats' as const,
    state: 'error' as const,
    truncated: false,
    droppedCount: 0,
    rows: Object.freeze([]),
    observedAtMs,
  });
}

export async function buildContentSnapshot(input: BuildContentSnapshotInput): Promise<ContentSnapshot> {
  let fetch: FetchContentSourceResult;
  try {
    fetch = await input.fetchers.lesson_stats();
  } catch {
    fetch = failClosedFetch(input.nowMs);
  }

  const { decisions } = runContentDepartment({
    fetches: [fetch],
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
