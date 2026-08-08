import { normalizeEvidence, type Evidence, type EvidenceState } from './decision';
import { qualityAffectedUserBucket, type QualityAffectedUserBucket } from '../quality_daily_aggregate';

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
  readonly build?: string;
  readonly platform?: string;
  readonly eventCount?: number;
  readonly affectedUserCount?: number | null;
}

export interface QualityAggregate {
  readonly totalCount: number;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly byScreen: Readonly<Record<string, number>>;
  readonly byBuild: Readonly<Record<string, number>>;
  readonly byPlatform: Readonly<Record<string, number>>;
  readonly releaseBuckets: readonly Readonly<{
    readonly build: string;
    readonly platform: string;
    readonly category: string;
    readonly screen: string;
    readonly eventCount: number;
    readonly affectedUserBucket: QualityAffectedUserBucket | 'unknown';
  }>[];
}

export interface QualitySourceFetchResult {
  readonly sourceId: QualityReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly QualityRawRow[];
  readonly observedAtMs: number;
  readonly evidenceMode?: 'exact_daily_aggregate' | 'degraded_raw_fallback' | 'legacy_raw';
}

function bucketOf(value: string | null): string {
  return value && value.trim() ? value.trim().toLowerCase().slice(0, 60) : UNKNOWN_BUCKET;
}

function increment(bucket: Record<string, number>, key: string, amount: number): void {
  bucket[key] = (bucket[key] ?? 0) + amount;
}

function eventCountOf(row: QualityRawRow): number {
  return Number.isSafeInteger(row.eventCount) && Number(row.eventCount) > 0 ? Number(row.eventCount) : 1;
}

/**
 * Единственное, что может попасть в модель или в Telegram: счётчики.
 * Ни текста жалобы, ни UID, ни устройства — этого поля здесь просто нет.
 */
export function aggregateQualityRows(rows: readonly QualityRawRow[]): QualityAggregate {
  const byCategory: Record<string, number> = {};
  const byScreen: Record<string, number> = {};
  const byBuild: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const releaseCounts = new Map<string, {
    build: string;
    platform: string;
    category: string;
    screen: string;
    eventCount: number;
    affectedUserCount: number | null;
  }>();
  let totalCount = 0;
  for (const row of rows) {
    const eventCount = eventCountOf(row);
    const category = bucketOf(row.category);
    const screen = bucketOf(row.screen);
    const build = bucketOf(row.build ?? null);
    const platform = bucketOf(row.platform ?? null);
    totalCount += eventCount;
    increment(byCategory, category, eventCount);
    increment(byScreen, screen, eventCount);
    increment(byBuild, build, eventCount);
    increment(byPlatform, platform, eventCount);
    const key = JSON.stringify([build, platform, category, screen]);
    const existing = releaseCounts.get(key);
    const affectedUserCount = Number.isSafeInteger(row.affectedUserCount) && Number(row.affectedUserCount) >= 0
      ? Number(row.affectedUserCount)
      : null;
    if (existing) {
      existing.eventCount += eventCount;
      existing.affectedUserCount = existing.affectedUserCount === null || affectedUserCount === null
        ? null
        : existing.affectedUserCount + affectedUserCount;
    } else {
      releaseCounts.set(key, { build, platform, category, screen, eventCount, affectedUserCount });
    }
  }
  const releaseBuckets = Object.freeze(Array.from(releaseCounts.values()).map((item) => Object.freeze({
    build: item.build,
    platform: item.platform,
    category: item.category,
    screen: item.screen,
    eventCount: item.eventCount,
    affectedUserBucket: item.affectedUserCount === null ? 'unknown' as const : qualityAffectedUserBucket(item.affectedUserCount),
  })));
  return Object.freeze({
    totalCount,
    byCategory: Object.freeze(byCategory),
    byScreen: Object.freeze(byScreen),
    byBuild: Object.freeze(byBuild),
    byPlatform: Object.freeze(byPlatform),
    releaseBuckets,
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
    digest: JSON.stringify({ evidenceMode: fetch.evidenceMode ?? 'legacy_raw', ...aggregate }),
  });
}
