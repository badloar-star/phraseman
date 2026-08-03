import type { GrowthRawRow, GrowthReportCollection } from './growth_source_reader';
import type { EvidenceState } from './decision';

/**
 * Тонкая обёртка над Firestore для департамента «Рост».
 *
 * зачем НЕ where по created_at: поле пишет клиентское приложение при первом
 * cloud-sync (app/cloud_sync.ts), не единая серверная функция — оно хранится
 * вперемешку как number/string/Firestore Timestamp (то же самое признаёт
 * admin_daily_digest.ts:698-711, business_tier_history.ts:52). Firestore
 * where сравнивает только значения ОДНОГО типа с переданным литералом:
 * запрос с числом молча теряет документы, где created_at — Timestamp, и
 * департамент показывал бы заниженные/нулевые регистрации, даже когда
 * реальные пользователи были. Поэтому вместо where по времени читаем
 * последнюю страницу по __name__ (тот же приём, что
 * business_tier_backfill_runner.ts:fetchUserPage) и фильтруем время в
 * памяти через parseMixedTimestampMs — как уже делает business_tier_backfill.ts.
 */

import { parseMixedTimestampMs } from './business_tier_history';

export const MAX_GROWTH_ROWS_PER_SOURCE = 500;
export const GROWTH_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

/** Верхняя граница страницы, которую сканируем в поисках недавних регистраций.
 *  Больше MAX_GROWTH_ROWS_PER_SOURCE: часть просканированных документов
 *  окажется старше окна и будет отброшена, поэтому запас нужен, чтобы
 *  реальных недавних пользователей не срезало вместе со старыми. */
const SCAN_PAGE_SIZE = 2_000;

export interface FetchGrowthSourceInput {
  readonly sourceId: GrowthReportCollection;
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export interface FetchGrowthSourceResult {
  readonly sourceId: GrowthReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly GrowthRawRow[];
  readonly observedAtMs: number;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function fetchGrowthSource(input: FetchGrowthSourceInput): Promise<FetchGrowthSourceResult> {
  const sinceMs = input.nowMs - GROWTH_LOOKBACK_MS;
  try {
    // orderBy('__name__', 'desc'): последняя страница по ID документа —
    // не идеальный прокси хронологии, но новые документы Firestore почти
    // всегда получают лексикографически больший auto-id, так что недавние
    // регистрации оказываются в начале этой страницы. limit(+1) — узнать,
    // упёрлись ли в потолок сканирования.
    const snapshot = await input.collection
      .orderBy('__name__', 'desc')
      .limit(SCAN_PAGE_SIZE + 1)
      .select('created_at', 'platform')
      .get();
    const docs = snapshot.docs;
    const scanTruncated = docs.length > SCAN_PAGE_SIZE;
    const scanned = scanTruncated ? docs.slice(0, SCAN_PAGE_SIZE) : docs;

    const recent = scanned.flatMap((snap) => {
      const data = snap.data() as Record<string, unknown>;
      const createdAtMs = parseMixedTimestampMs(data.created_at);
      if (createdAtMs === null || createdAtMs < sinceMs) return [];
      return [Object.freeze({ platform: text(data.platform) })];
    });

    const rowsTruncated = recent.length > MAX_GROWTH_ROWS_PER_SOURCE;
    const rows = rowsTruncated ? recent.slice(0, MAX_GROWTH_ROWS_PER_SOURCE) : recent;

    return Object.freeze({
      sourceId: input.sourceId,
      state: rows.length === 0 ? ('empty' as const) : ('ready' as const),
      // зачем truncated от ДВУХ причин: скан мог упереться в потолок страницы
      // ДО того, как увидел все недавние регистрации (scanTruncated) — тогда
      // честное число может быть занижено, даже если rowsTruncated=false.
      truncated: scanTruncated || rowsTruncated,
      droppedCount: rowsTruncated ? recent.length - MAX_GROWTH_ROWS_PER_SOURCE : 0,
      rows: Object.freeze(rows),
      observedAtMs: input.nowMs,
    });
  } catch {
    return Object.freeze({
      sourceId: input.sourceId, state: 'error' as const, truncated: false, droppedCount: 0,
      rows: Object.freeze([]), observedAtMs: input.nowMs,
    });
  }
}
