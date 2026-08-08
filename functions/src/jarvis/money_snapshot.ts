import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import type { FetchMoneySourceResult } from './money_firestore_fetcher';
import { runMoneyDepartment } from './money_department';
import type { MoneyReportCollection } from './money_source_reader';

/**
 * Единственный шов между источниками Firestore и департаментом «Деньги».
 * Тот же принцип, что у quality_snapshot.ts: суточный планировщик и панель
 * по требованию владельца обязаны звать один и тот же путь.
 */

export type MoneyFetcher = () => Promise<FetchMoneySourceResult>;

export interface MoneyFetcherMap {
  readonly revenuecat_premium_events: MoneyFetcher;
  readonly paywall_funnel: MoneyFetcher;
}

export interface BuildMoneySnapshotInput {
  readonly fetchers: MoneyFetcherMap;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface MoneySnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

const COLLECTIONS: readonly MoneyReportCollection[] = ['revenuecat_premium_events', 'paywall_funnel'];

function failClosedFetch(sourceId: MoneyReportCollection, observedAtMs: number): FetchMoneySourceResult {
  return Object.freeze({ sourceId, state: 'error' as const, truncated: false, droppedCount: 0, rows: Object.freeze([]), observedAtMs });
}

export async function buildMoneySnapshot(input: BuildMoneySnapshotInput): Promise<MoneySnapshot> {
  const fetches = await Promise.all(COLLECTIONS.map(async (sourceId) => {
    try {
      return await input.fetchers[sourceId]();
    } catch {
      return failClosedFetch(sourceId, input.nowMs);
    }
  }));

  const { decisions } = runMoneyDepartment({
    fetches,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
