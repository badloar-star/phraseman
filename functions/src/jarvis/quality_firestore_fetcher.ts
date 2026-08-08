import type { QualityRawRow, QualityReportCollection } from './quality_source_reader';
import type { EvidenceState } from './decision';

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
export const QUALITY_LOOKBACK_MS = 24 * 60 * 60 * 1_000;

export interface FetchQualitySourceInput {
  readonly sourceId: QualityReportCollection;
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export interface FetchQualitySourceResult {
  readonly sourceId: QualityReportCollection;
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly QualityRawRow[];
  readonly observedAtMs: number;
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

export async function fetchQualitySource(input: FetchQualitySourceInput): Promise<FetchQualitySourceResult> {
  const sinceMs = input.nowMs - QUALITY_LOOKBACK_MS;
  const observedAtMs = input.nowMs;
  try {
    const snapshot = await input.collection
      .where('createdAtMs', '>=', sinceMs)
      .orderBy('createdAtMs', 'desc')
      .limit(MAX_QUALITY_ROWS_PER_SOURCE + 1)
      .get();
    const docs = snapshot.docs;
    const truncated = docs.length > MAX_QUALITY_ROWS_PER_SOURCE;
    const kept = truncated ? docs.slice(0, MAX_QUALITY_ROWS_PER_SOURCE) : docs;
    return Object.freeze({
      sourceId: input.sourceId,
      state: kept.length === 0 ? ('empty' as const) : ('ready' as const),
      truncated,
      droppedCount: truncated ? docs.length - MAX_QUALITY_ROWS_PER_SOURCE : 0,
      rows: Object.freeze(kept.map((snap) => toRow(snap.data() as Record<string, unknown>))),
      observedAtMs,
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
    });
  }
}
