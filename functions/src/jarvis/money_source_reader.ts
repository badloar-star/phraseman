import { normalizeEvidence, type Evidence, type EvidenceState } from './decision';

/**
 * Читатель источников департамента «Деньги».
 *
 * зачем: та же защита, что у «Качества» — план запрещает передавать модели
 * PII и лишние поля. eventType/periodType-классификация скопирована 1:1
 * с admin_daily_digest.ts:406-414 (уже проверенный боевой контракт), чтобы
 * не изобретать вторую версию правды о том, что считается "новым платящим".
 * productId и любые другие поля сюда не попадают — только счётчики.
 */

export const MONEY_REPORT_COLLECTIONS = ['revenuecat_premium_events', 'paywall_funnel'] as const;
export type MoneyReportCollection = typeof MONEY_REPORT_COLLECTIONS[number];

export interface MoneyRawRow {
  readonly eventType: string | null;
  readonly periodType: string | null;
}

export interface MoneyAggregate {
  readonly totalCount: number;
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
  readonly trials: number;
}

export interface MoneySourceFetchResult {
  readonly sourceId: MoneyReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly MoneyRawRow[];
  readonly observedAtMs: number;
}

function upper(value: string | null): string {
  return (value ?? '').toUpperCase();
}

/**
 * Копия классификации admin_daily_digest.ts:406-414. Единственная версия
 * правды о том, что считается новым платящим/продлением/возвратом/пробным.
 */
export function aggregateMoneyRows(rows: readonly MoneyRawRow[]): MoneyAggregate {
  let newPaying = 0;
  let renewals = 0;
  let refunds = 0;
  let trials = 0;
  for (const row of rows) {
    const event = upper(row.eventType);
    const period = upper(row.periodType);
    if (event === 'NON_RENEWING_PURCHASE' || (event === 'INITIAL_PURCHASE' && period !== 'TRIAL')) newPaying += 1;
    else if (event === 'RENEWAL') renewals += 1;
    else if (event === 'REFUND') refunds += 1;
    else if (event === 'INITIAL_PURCHASE' && period === 'TRIAL') trials += 1;
  }
  return Object.freeze({ totalCount: rows.length, newPaying, renewals, refunds, trials });
}

export function buildMoneyEvidence(fetch: MoneySourceFetchResult): Evidence {
  const aggregate = aggregateMoneyRows(fetch.rows);
  return normalizeEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    count: aggregate.totalCount,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify(aggregate),
  });
}
