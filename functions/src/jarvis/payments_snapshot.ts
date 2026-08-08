import type { AppTier } from './app_tier';
import type { Decision, DecisionTrigger } from './decision';
import { runPaymentsDepartment } from './payments_department';
import {
  PAYMENT_FAILURE_COLLECTIONS,
  type FetchPaymentsSourceResult,
  type PaymentFailureCollection,
} from './payments_firestore_fetcher';

/**
 * Единственный шов между Firestore и департаментом «Платежи» — тот же
 * принцип, что у остальных: планировщик и панель зовут один путь.
 */

export type PaymentsFetcher = () => Promise<FetchPaymentsSourceResult>;

export interface PaymentsFetcherMap {
  readonly telegram_premium_dead_letter: PaymentsFetcher;
  readonly revenuecat_premium_denials: PaymentsFetcher;
}

export interface BuildPaymentsSnapshotInput {
  readonly fetchers: PaymentsFetcherMap;
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface PaymentsSnapshot {
  readonly generatedAtMs: number;
  readonly decisions: readonly Decision[];
}

function failClosedFetch(sourceId: PaymentFailureCollection, observedAtMs: number): FetchPaymentsSourceResult {
  return Object.freeze({
    sourceId,
    state: 'error' as const,
    truncated: false,
    droppedCount: 0,
    rows: Object.freeze([]),
    observedAtMs,
  });
}

export async function buildPaymentsSnapshot(input: BuildPaymentsSnapshotInput): Promise<PaymentsSnapshot> {
  const fetches = await Promise.all(PAYMENT_FAILURE_COLLECTIONS.map(async (sourceId) => {
    try {
      return await input.fetchers[sourceId]();
    } catch {
      return failClosedFetch(sourceId, input.nowMs);
    }
  }));

  const { decisions } = runPaymentsDepartment({
    fetches,
    trigger: input.trigger,
    question: input.question,
    nowMs: input.nowMs,
    appTier: input.appTier,
  });

  return Object.freeze({ generatedAtMs: input.nowMs, decisions });
}
