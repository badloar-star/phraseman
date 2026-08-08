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
import {
  GROWTH_DAILY_SCHEMA_VERSION,
  GROWTH_DAILY_SOURCE,
  utcDayKey,
} from '../growth_daily_aggregate';

/** @deprecated Kept for callers; growth no longer caps recent rows at this value. */
export const MAX_GROWTH_ROWS_PER_SOURCE = 500;
export const GROWTH_PAGE_SIZE = 500;
export const GROWTH_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

/** Верхняя граница страницы, которую сканируем в поисках недавних регистраций.
 *  Больше MAX_GROWTH_ROWS_PER_SOURCE: часть просканированных документов
 *  окажется старше окна и будет отброшена, поэтому запас нужен, чтобы
 *  реальных недавних пользователей не срезало вместе со старыми. */

export interface FetchGrowthSourceInput {
  readonly sourceId: GrowthReportCollection;
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly dailyCollection?: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export type GrowthEvidenceProvenance =
  | 'server_daily_aggregate'
  | 'degraded_legacy_users_sample';

export interface FetchGrowthSourceResult {
  readonly sourceId: GrowthReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly GrowthRawRow[];
  readonly count: number | null;
  readonly provenance: GrowthEvidenceProvenance;
  readonly periodKey: string;
  readonly observedAtMs: number;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function fetchGrowthSource(input: FetchGrowthSourceInput): Promise<FetchGrowthSourceResult> {
  const sinceMs = input.nowMs - GROWTH_LOOKBACK_MS;
  const periodKey = utcDayKey(input.nowMs);

  if (input.dailyCollection) {
    try {
      const dailySnap = await input.dailyCollection.doc(periodKey).get();
      if (dailySnap.exists) {
        const data = dailySnap.data() as Record<string, unknown> | undefined;
        const count = Number(data?.newUsers);
        const valid =
          data?.schemaVersion === GROWTH_DAILY_SCHEMA_VERSION &&
          data?.dayKey === periodKey &&
          data?.source === GROWTH_DAILY_SOURCE &&
          Number.isSafeInteger(count) &&
          count >= 0;
        if (valid) {
          return Object.freeze({
            sourceId: input.sourceId,
            state: count === 0 ? ('empty' as const) : ('ready' as const),
            truncated: false,
            droppedCount: 0,
            rows: Object.freeze([]),
            count,
            provenance: 'server_daily_aggregate' as const,
            periodKey,
            observedAtMs: input.nowMs,
          });
        }
      }
    } catch {
      // Fall through to bounded degraded evidence. Aggregate availability must
      // not turn into an unbounded users scan or a fabricated exact zero.
    }
  }

  try {
    // created_at is client-written and mixed-type. This single page is only a
    // degraded diagnostic sample while the server aggregate is absent; it is
    // never promoted to an exact count and never paginates across all users.
    const snapshot = await input.collection
      .orderBy('__name__', 'desc')
      .limit(GROWTH_PAGE_SIZE)
      .select('created_at', 'platform')
      .get();
    const rows: GrowthRawRow[] = [];
    for (const snap of snapshot.docs) {
      const data = snap.data() as Record<string, unknown>;
      const createdAtMs = parseMixedTimestampMs(data.created_at);
      if (createdAtMs === null || createdAtMs < sinceMs || createdAtMs > input.nowMs) continue;
      rows.push(Object.freeze({ platform: text(data.platform) }));
    }

    return Object.freeze({
      sourceId: input.sourceId,
      state: 'truncated' as const,
      truncated: true,
      droppedCount: 0,
      rows: Object.freeze(rows),
      count: null,
      provenance: 'degraded_legacy_users_sample' as const,
      periodKey,
      observedAtMs: input.nowMs,
    });
  } catch {
    return Object.freeze({
      sourceId: input.sourceId, state: 'error' as const, truncated: false, droppedCount: 0,
      rows: Object.freeze([]), count: null, provenance: 'degraded_legacy_users_sample' as const,
      periodKey, observedAtMs: input.nowMs,
    });
  }
}
