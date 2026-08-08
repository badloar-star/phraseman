import type { MoneyRawRow, MoneyReportCollection } from './money_source_reader';
import type { EvidenceState } from './decision';

/**
 * Тонкая обёртка над Firestore для департамента «Деньги».
 *
 * зачем: revenuecat_premium_events и paywall_funnel читаются по-разному —
 * у первого числовой eventTimestampMs, у второго строковый day (YYYY-MM-DD),
 * см. admin_daily_digest.ts:18 и :721-744. Один интерфейс наружу, две ветки
 * внутри — так департамент не обязан знать про эту разницу схем.
 */

export const MAX_MONEY_ROWS_PER_SOURCE = 100;
export const MONEY_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

export interface FetchMoneySourceInput {
  readonly sourceId: MoneyReportCollection;
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export interface FetchMoneySourceResult {
  readonly sourceId: MoneyReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly MoneyRawRow[];
  readonly observedAtMs: number;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function dayString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function packResult(sourceId: MoneyReportCollection, rows: readonly MoneyRawRow[], truncated: boolean, droppedCount: number, observedAtMs: number): FetchMoneySourceResult {
  return Object.freeze({
    sourceId,
    state: rows.length === 0 ? ('empty' as const) : ('ready' as const),
    truncated,
    droppedCount,
    rows: Object.freeze(rows),
    observedAtMs,
  });
}

function errorResult(sourceId: MoneyReportCollection, observedAtMs: number): FetchMoneySourceResult {
  return Object.freeze({ sourceId, state: 'error' as const, truncated: false, droppedCount: 0, rows: Object.freeze([]), observedAtMs });
}

async function fetchRevenuecatEvents(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  const sinceMs = input.nowMs - MONEY_LOOKBACK_MS;
  try {
    const snapshot = await input.collection
      .where('eventTimestampMs', '>=', sinceMs)
      .orderBy('eventTimestampMs', 'desc')
      .limit(MAX_MONEY_ROWS_PER_SOURCE + 1)
      .get();
    const docs = snapshot.docs;
    const truncated = docs.length > MAX_MONEY_ROWS_PER_SOURCE;
    const kept = truncated ? docs.slice(0, MAX_MONEY_ROWS_PER_SOURCE) : docs;
    const rows = kept.map((snap) => {
      const data = snap.data() as Record<string, unknown>;
      return Object.freeze({ eventType: text(data.eventType), periodType: text(data.periodType) });
    });
    return packResult('revenuecat_premium_events', rows, truncated, truncated ? docs.length - MAX_MONEY_ROWS_PER_SOURCE : 0, input.nowMs);
  } catch {
    return errorResult('revenuecat_premium_events', input.nowMs);
  }
}

/** Тот же паттерн, что admin_daily_digest.ts:721-744: ключ day — строка, окно 24ч перекрывает максимум два дня. */
async function fetchPaywallFunnel(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  const sinceMs = input.nowMs - MONEY_LOOKBACK_MS;
  try {
    const fromDay = dayString(sinceMs);
    const toDay = dayString(input.nowMs);
    const snapshot = await input.collection
      .where('day', '>=', fromDay)
      .where('day', '<=', toDay)
      .limit(MAX_MONEY_ROWS_PER_SOURCE + 1)
      .get();
    const docs = snapshot.docs;
    const truncated = docs.length > MAX_MONEY_ROWS_PER_SOURCE;
    const kept = truncated ? docs.slice(0, MAX_MONEY_ROWS_PER_SOURCE) : docs;
    const rows = kept
      .map((snap) => snap.data() as Record<string, unknown>)
      .filter((data) => data.dev !== true && data.step === 'purchase_completed')
      .map(() => Object.freeze({ eventType: 'purchase_completed', periodType: null }));
    return packResult('paywall_funnel', rows, truncated, truncated ? docs.length - MAX_MONEY_ROWS_PER_SOURCE : 0, input.nowMs);
  } catch {
    return errorResult('paywall_funnel', input.nowMs);
  }
}

export async function fetchMoneySource(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  return input.sourceId === 'paywall_funnel' ? fetchPaywallFunnel(input) : fetchRevenuecatEvents(input);
}
