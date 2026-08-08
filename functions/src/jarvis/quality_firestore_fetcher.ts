import type { QualityRawRow, QualityReportCollection } from './quality_source_reader';
import type { EvidenceState } from './decision';
import {
  QUALITY_DAILY_COLLECTION,
  QUALITY_DAILY_SCHEMA_VERSION,
  qualityUtcDayKey,
  qualityUtcDayStartMs,
} from '../quality_daily_aggregate';

/**
 * Тонкая обёртка над Firestore для департамента «Качество».
 *
 * зачем: тот же паттерн запроса, что в admin_reports_center.ts
 * (where createdAtMs >= sinceMs, orderBy desc, limit) — так снапшот
 * departments читает окно за сутки один раз, курсор для инкремента
 * появится в§ следующем шаге, когда будет видно реальное окно данных.
 * Проекция здесь уже безопасная: category/screen/createdAtMs, ничего
 * похожего на PII или текст жалобы сюда не попадает вообще.
 */

export const MAX_QUALITY_ROWS_PER_SOURCE = 100;
export const QUALITY_PAGE_SIZE = 500;
export const QUALITY_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

export interface FetchQualitySourceInput {
  readonly sourceId: QualityReportCollection;
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly db?: FirebaseFirestore.Firestore;
  readonly nowMs: number;
}

export interface FetchQualitySourceResult {
  readonly sourceId: QualityReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly QualityRawRow[];
  readonly observedAtMs: number;
  readonly evidenceMode?: 'exact_daily_aggregate' | 'degraded_raw_fallback' | 'legacy_raw';
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toRow(data: Record<string, unknown>): QualityRawRow {
  return Object.freeze({
    category: text(data.category),
    screen: text(data.screen),
    createdAtMs: typeof data.createdAtMs === 'number' && Number.isFinite(data.createdAtMs) ? data.createdAtMs : 0,
  });
}

function safeDimension(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._:-]{0,59}$/.test(normalized) ? normalized : null;
}

function safeCount(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

async function fetchExactDailyAggregate(
  input: FetchQualitySourceInput & { readonly db: FirebaseFirestore.Firestore },
): Promise<readonly QualityRawRow[] | null> {
  const meta = await input.db.collection(QUALITY_DAILY_COLLECTION).doc('_meta').get();
  const metaData = meta.data();
  const activatedAtMs = safeCount(metaData?.activatedAtMs);
  if (!meta.exists
    || metaData?.schemaVersion !== QUALITY_DAILY_SCHEMA_VERSION
    || activatedAtMs === null
    || activatedAtMs > qualityUtcDayStartMs(input.nowMs)) {
    return null;
  }

  const dayKey = qualityUtcDayKey(input.nowMs);
  const snapshot = await input.db
    .collection(QUALITY_DAILY_COLLECTION)
    .doc(dayKey)
    .collection('sources')
    .doc(input.sourceId)
    .collection('buckets')
    .get();
  const rows: QualityRawRow[] = [];
  for (const document of snapshot.docs) {
    const data = document.data() as Record<string, unknown>;
    const category = safeDimension(data.category);
    const screen = safeDimension(data.screen);
    const build = safeDimension(data.build);
    const platform = safeDimension(data.platform);
    const eventCount = safeCount(data.eventCount);
    const affectedUserCount = safeCount(data.affectedUserCount);
    if (data.schemaVersion !== QUALITY_DAILY_SCHEMA_VERSION
      || data.sourceId !== input.sourceId
      || data.dayKey !== dayKey
      || category === null
      || screen === null
      || build === null
      || platform === null
      || eventCount === null
      || affectedUserCount === null
      || affectedUserCount > eventCount) {
      throw new Error('quality_daily_malformed_aggregate');
    }
    rows.push(Object.freeze({
      category,
      screen,
      build,
      platform,
      createdAtMs: input.nowMs,
      eventCount,
      affectedUserCount,
    }));
  }
  return Object.freeze(rows);
}

function toDegradedRawRow(data: Record<string, unknown>): QualityRawRow {
  const base = toRow(data);
  return Object.freeze({
    ...base,
    build: safeDimension(data.buildNumber) ?? safeDimension(data.appVersion) ?? 'unknown',
    platform: safeDimension(data.platform) ?? 'unknown',
    category: safeDimension(base.category) ?? null,
    screen: safeDimension(base.screen) ?? null,
    eventCount: 1,
    affectedUserCount: null,
  });
}

export async function fetchQualitySource(input: FetchQualitySourceInput): Promise<FetchQualitySourceResult> {
  const sinceMs = input.nowMs - QUALITY_LOOKBACK_MS;
  const observedAtMs = input.nowMs;
  if (input.db) {
    try {
      const aggregateRows = await fetchExactDailyAggregate({ ...input, db: input.db });
      if (aggregateRows !== null) {
        return Object.freeze({
          sourceId: input.sourceId,
          state: aggregateRows.length === 0 ? ('empty' as const) : ('ready' as const),
          truncated: false,
          droppedCount: 0,
          rows: aggregateRows,
          observedAtMs,
          evidenceMode: 'exact_daily_aggregate' as const,
        });
      }
    } catch {
      // Missing/corrupt aggregate evidence is never treated as an exact zero.
      // The bounded raw projection below remains privacy-safe but degraded.
    }
  }
  try {
    const baseQuery = input.collection
      .where('createdAtMs', '>=', sinceMs)
      .where('createdAtMs', '<=', input.nowMs)
      .orderBy('createdAtMs', 'desc')
      .limit(QUALITY_PAGE_SIZE);
    const rows: QualityRawRow[] = [];
    let pageQuery: FirebaseFirestore.Query = baseQuery;
    while (true) {
      const snapshot = await pageQuery.get();
      for (const snap of snapshot.docs) {
        const row = input.db
          ? toDegradedRawRow(snap.data() as Record<string, unknown>)
          : toRow(snap.data() as Record<string, unknown>);
        if (row.createdAtMs >= sinceMs && row.createdAtMs <= input.nowMs) rows.push(row);
      }
      if (snapshot.docs.length < QUALITY_PAGE_SIZE) break;
      pageQuery = baseQuery.startAfter(snapshot.docs[snapshot.docs.length - 1]);
    }
    return Object.freeze({
      sourceId: input.sourceId,
      state: input.db ? ('partial' as const) : rows.length === 0 ? ('empty' as const) : ('ready' as const),
      truncated: false,
      droppedCount: 0,
      rows: Object.freeze(rows),
      observedAtMs,
      evidenceMode: input.db ? ('degraded_raw_fallback' as const) : ('legacy_raw' as const),
    });
  } catch {
    // Firestore недоступен или запрос упал — департамент не должен падать
    // целиком, а честно объявить этот источник ошибочным.
    return Object.freeze({
      sourceId: input.sourceId,
      state: 'error' as const,
      truncated: false,
      droppedCount: 0,
      rows: Object.freeze([]),
      observedAtMs,
      evidenceMode: input.db ? ('degraded_raw_fallback' as const) : ('legacy_raw' as const),
    });
  }
}
