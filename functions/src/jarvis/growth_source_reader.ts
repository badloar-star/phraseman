import { normalizeEvidence, type Evidence, type EvidenceState } from './decision';

/**
 * Читатель источников департамента «Рост».
 *
 * зачем: владелец 2026-08-02 решил ограничить «Рост» дешёвым сигналом —
 * только приток новых пользователей (users.created_at, тот же паттерн, что
 * в admin_daily_digest.ts:702). Настоящее удержание/отток в проекте считается
 * только через BigQuery (admin_product_analytics.ts) — платная, отдельная
 * инфраструктура, туда Джарвис пока не идёт. Полное сканирование users, как
 * в re_engage_push.ts, тоже отклонено — противоречит Firebase-экономии плана.
 */

export const GROWTH_REPORT_COLLECTIONS = ['users'] as const;
export type GrowthReportCollection = typeof GROWTH_REPORT_COLLECTIONS[number];

const UNKNOWN_BUCKET = 'unknown';

export interface GrowthRawRow {
  readonly platform: string | null;
}

export interface GrowthAggregate {
  readonly totalCount: number;
  readonly byPlatform: Readonly<Record<string, number>>;
}

export interface GrowthSourceFetchResult {
  readonly sourceId: GrowthReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly GrowthRawRow[];
  readonly observedAtMs: number;
}

function bucketOf(value: string | null): string {
  return value && value.trim() ? value.trim().toLowerCase().slice(0, 40) : UNKNOWN_BUCKET;
}

export function aggregateGrowthRows(rows: readonly GrowthRawRow[]): GrowthAggregate {
  const byPlatform: Record<string, number> = {};
  for (const row of rows) {
    const key = bucketOf(row.platform);
    byPlatform[key] = (byPlatform[key] ?? 0) + 1;
  }
  return Object.freeze({ totalCount: rows.length, byPlatform: Object.freeze(byPlatform) });
}

export function buildGrowthEvidence(fetch: GrowthSourceFetchResult): Evidence {
  const aggregate = aggregateGrowthRows(fetch.rows);
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
