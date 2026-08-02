import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import type { FetchQualitySourceResult } from './quality_firestore_fetcher';
import { runQualityDepartment } from './quality_department';
import type { QualityReportCollection } from './quality_source_reader';

/**
 * Единственный шов между источниками Firestore и департаментом «Качество».
 *
 * зачем: и суточный планировщик, и панель по ручному запросу владельца
 * обязаны звать один и тот же путь — иначе Telegram и админка увидят разные
 * версии правды, а план прямо требует «каждая задача одинакова в Telegram
 * и админке».
 */

export type QualityFetcher = () => Promise<FetchQualitySourceResult>;

export interface QualityFetcherMap {
  readonly error_reports: QualityFetcher;
  readonly user_reports: QualityFetcher;
  readonly app_errors: QualityFetcher;
}

export interface BuildQualitySnapshotInput {
  readonly fetchers: QualityFetcherMap;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface QualitySnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

const COLLECTIONS: readonly QualityReportCollection[] = ['error_reports', 'user_reports', 'app_errors'];

function failClosedFetch(sourceId: QualityReportCollection, observedAtMs: number): FetchQualitySourceResult {
  return Object.freeze({
    sourceId,
    state: 'error' as const,
    truncated: false,
    droppedCount: 0,
    rows: Object.freeze([]),
    observedAtMs,
  });
}

export async function buildQualitySnapshot(input: BuildQualitySnapshotInput): Promise<QualitySnapshot> {
  const fetches = await Promise.all(COLLECTIONS.map(async (sourceId) => {
    try {
      return await input.fetchers[sourceId]();
    } catch {
      // Один упавший источник не должен убить весь снапшот — департамент
      // сам решит, хватает ли ему доказательств от оставшихся.
      return failClosedFetch(sourceId, input.nowMs);
    }
  }));

  const { decisions } = runQualityDepartment({
    fetches,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
