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
  readonly collection: FirebaseFirestore.Query;
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

function number(value: unknown): number | null {
  return Number.isSafeInteger(value) ? Number(value) : null;
}

function inWindow(value: unknown, sinceMs: number, nowMs: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= sinceMs && Number(value) <= nowMs;
}

function boundedDocs(snapshot: { readonly docs: readonly FirebaseFirestore.QueryDocumentSnapshot[] }): {
  readonly kept: readonly FirebaseFirestore.QueryDocumentSnapshot[];
  readonly truncated: boolean;
} {
  const truncated = snapshot.docs.length > MAX_MONEY_ROWS_PER_SOURCE;
  return { kept: snapshot.docs.slice(0, MAX_MONEY_ROWS_PER_SOURCE), truncated };
}

async function fetchPersonalEconomy(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  const sinceMs = input.nowMs - MONEY_LOOKBACK_MS;
  try {
    const snapshot = await input.collection
      .where('createdAtMs', '>=', sinceMs)
      .where('createdAtMs', '<=', input.nowMs)
      .orderBy('createdAtMs', 'desc')
      .limit(MAX_MONEY_ROWS_PER_SOURCE + 1)
      .get();
    const { kept, truncated } = boundedDocs(snapshot);
    let invalidRows = 0;
    const rows = kept.flatMap((snap) => {
      const data = snap.data() as Record<string, unknown>;
      if (!inWindow(data.createdAtMs, sinceMs, input.nowMs)) {
        invalidRows += 1;
        return [];
      }
      return [Object.freeze({
        eventType: input.sourceId === 'external_economy_events' ? text(data.eventId) : null,
        periodType: null,
        ownerStableId: text(data.ownerStableId),
        openingBalance: number(data.openingBalance),
        direction: text(data.direction),
        delta: number(data.delta),
        balanceBefore: number(data.balanceBefore),
        balanceAfter: number(data.balanceAfter),
        revision: number(data.revision),
        source: text(data.source),
        createdAtMs: number(data.createdAtMs),
      })];
    });
    return packResult(input.sourceId, rows, truncated, invalidRows + (truncated ? 1 : 0), input.nowMs);
  } catch {
    return errorResult(input.sourceId, input.nowMs);
  }
}

async function fetchRevenuecatEvents(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  const sinceMs = input.nowMs - MONEY_LOOKBACK_MS;
  try {
    const snapshot = await input.collection
      .where('environment', '==', 'PRODUCTION')
      .where('eventTimestampMs', '>=', sinceMs)
      .where('eventTimestampMs', '<=', input.nowMs)
      .orderBy('eventTimestampMs', 'desc')
      .limit(MAX_MONEY_ROWS_PER_SOURCE + 1)
      .get();
    const { kept, truncated } = boundedDocs(snapshot);
    let invalidRows = 0;
    const rows = kept.flatMap((snap) => {
      const data = snap.data() as Record<string, unknown>;
      const environment = text(data.environment)?.toUpperCase() ?? null;
      if (environment !== 'PRODUCTION' || !inWindow(data.eventTimestampMs, sinceMs, input.nowMs)) {
        invalidRows += 1;
        return [];
      }
      return [Object.freeze({
        eventType: text(data.eventType),
        periodType: text(data.periodType),
        environment,
        createdAtMs: number(data.eventTimestampMs),
      })];
    });
    return packResult('revenuecat_premium_events', rows, truncated, invalidRows + (truncated ? 1 : 0), input.nowMs);
  } catch {
    return errorResult('revenuecat_premium_events', input.nowMs);
  }
}

async function fetchPaywallFunnel(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  const sinceMs = input.nowMs - MONEY_LOOKBACK_MS;
  try {
    const snapshot = await input.collection
      .where('step', '==', 'purchase_completed')
      .where('dev', '==', false)
      .where('ts', '>=', sinceMs)
      .where('ts', '<=', input.nowMs)
      .orderBy('ts', 'desc')
      .limit(MAX_MONEY_ROWS_PER_SOURCE + 1)
      .get();
    const { kept, truncated } = boundedDocs(snapshot);
    let invalidRows = 0;
    const rows = kept
      .map((snap) => snap.data() as Record<string, unknown>)
      .flatMap((data) => {
        if (data.dev !== false || data.step !== 'purchase_completed' || !inWindow(data.ts, sinceMs, input.nowMs)) {
          invalidRows += 1;
          return [];
        }
        return [Object.freeze({ eventType: 'purchase_completed', periodType: null, createdAtMs: number(data.ts) })];
      });
    return packResult('paywall_funnel', rows, truncated, invalidRows + (truncated ? 1 : 0), input.nowMs);
  } catch {
    return errorResult('paywall_funnel', input.nowMs);
  }
}

export async function fetchMoneySource(input: FetchMoneySourceInput): Promise<FetchMoneySourceResult> {
  if (input.sourceId === 'paywall_funnel') return fetchPaywallFunnel(input);
  if (input.sourceId === 'revenuecat_premium_events') return fetchRevenuecatEvents(input);
  return fetchPersonalEconomy(input);
}
