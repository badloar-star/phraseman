import { normalizeEvidence, type Evidence, type EvidenceState } from './decision';

/**
 * Читатель источников департамента «Качество».
 *
 * зачем: план запрещает передавать модели/Telegram полный текст репортов, PII
 * и UID пользователей. adminListReportQueue (admin_reports_center.ts) уже
 * безопасно читает Firestore с where/limit/курсором, но проецирует ПОЛНЫЙ
 * репорт (summary, users.*, context.details) — это годится для админки под
 * ролью, но не для модели. Поэтому здесь агрегируются только счётчики по
 * category/screen — тот же путь чтения, более узкая проекция.
 */

export const QUALITY_REPORT_COLLECTIONS = ['error_reports', 'user_reports', 'app_errors'] as const;
export type QualityReportCollection = typeof QUALITY_REPORT_COLLECTIONS[number];

const UNKNOWN_BUCKET = 'unknown';

export interface QualityRawRow {
  readonly category: string | null;
  readonly screen: string | null;
  readonly createdAtMs: number;
}

export interface QualityAggregate {
  readonly totalCount: number;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly byScreen: Readonly<Record<string, number>>;
}

export interface QualitySourceFetchResult {
  readonly sourceId: QualityReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly QualityRawRow[];
  readonly observedAtMs: number;
}

function bucketOf(value: string | null): string {
  return value && value.trim() ? value.trim().toLowerCase().slice(0, 60) : UNKNOWN_BUCKET;
}

function increment(bucket: Record<string, number>, key: string): void {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

/**
 * Единственное, что может попасть в модель или в Telegram: счётчики.
 * Ни текста жалобы, ни UID, ни устройства — этого поля здесь просто нет.
 */
export function aggregateQualityRows(rows: readonly QualityRawRow[]): QualityAggregate {
  const byCategory: Record<string, number> = {};
  const byScreen: Record<string, number> = {};
  for (const row of rows) {
    increment(byCategory, bucketOf(row.category));
    increment(byScreen, bucketOf(row.screen));
  }
  return Object.freeze({
    totalCount: rows.length,
    byCategory: Object.freeze(byCategory),
    byScreen: Object.freeze(byScreen),
  });
}

/**
 * Оборачивает результат выборки в Evidence по ядру Джарвиса. Обрезанная или
 * ошибочная выборка не получает права на число — normalizeEvidence сам это
 * гарантирует, здесь только честно передаётся state/truncated/droppedCount.
 */
export function buildQualityEvidence(fetch: QualitySourceFetchResult): Evidence {
  const aggregate = aggregateQualityRows(fetch.rows);
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
