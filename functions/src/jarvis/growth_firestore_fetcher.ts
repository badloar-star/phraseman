import type { GrowthRawRow, GrowthReportCollection } from './growth_source_reader';
import type { EvidenceState } from './decision';

/**
 * Тонкая обёртка над Firestore для департамента «Рост».
 *
 * зачем: тот же паттерн, что admin_daily_digest.ts:702 (byMs('users', 'created_at')) —
 * where по времени + limit, без выкачивания всей коллекции. Без orderBy: нужен
 * только счётчик за окно, не последние N записей по конкретному порядку.
 */

export const MAX_GROWTH_ROWS_PER_SOURCE = 500;
export const GROWTH_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

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
    const snapshot = await input.collection
      .where('created_at', '>=', sinceMs)
      .limit(MAX_GROWTH_ROWS_PER_SOURCE + 1)
      .get();
    const docs = snapshot.docs;
    const truncated = docs.length > MAX_GROWTH_ROWS_PER_SOURCE;
    const kept = truncated ? docs.slice(0, MAX_GROWTH_ROWS_PER_SOURCE) : docs;
    return Object.freeze({
      sourceId: input.sourceId,
      state: kept.length === 0 ? ('empty' as const) : ('ready' as const),
      truncated,
      droppedCount: truncated ? docs.length - MAX_GROWTH_ROWS_PER_SOURCE : 0,
      rows: Object.freeze(kept.map((snap) => Object.freeze({ platform: text((snap.data() as Record<string, unknown>).platform) }))),
      observedAtMs: input.nowMs,
    });
  } catch {
    return Object.freeze({
      sourceId: input.sourceId, state: 'error' as const, truncated: false, droppedCount: 0,
      rows: Object.freeze([]), observedAtMs: input.nowMs,
    });
  }
}
