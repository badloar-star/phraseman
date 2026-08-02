import type { EvidenceState } from './decision';
import type { ContentStudyTarget } from './content_lesson_stats_write';

/**
 * Читатель агрегата lesson_stats для департамента «Контент».
 *
 * зачем читать готовый агрегат, а не считать на лету: результаты уроков
 * хранятся внутри каждого пользователя (progress), и «средний балл урока N
 * по всем» потребовал бы дорогого collectionGroup-скана. Горячий путь
 * (progress_events.ts) уже инкрементально обновляет lesson_stats/{target}_lessonN,
 * здесь мы только читаем эти документы — один запрос с лимитом.
 */

/** Потолок читаемых уроков за проход. В проекте 32 урока × 2 языка — с запасом. */
export const MAX_LESSON_STATS_DOCS = 200;

/**
 * Минимум попыток, при котором вердикт по уроку вообще имеет смысл.
 * зачем: один ученик, зашедший в урок и вышедший с нулём, не должен
 * объявлять урок сломанным — это шум выборки, а не сигнал о контенте.
 */
export const MIN_SAMPLES_FOR_VERDICT = 20;

export interface ContentLessonRow {
  readonly lessonId: number;
  readonly target: ContentStudyTarget;
  readonly averageScore: number;
  readonly sampleCount: number;
}

export interface FetchContentSourceInput {
  readonly collection: FirebaseFirestore.CollectionReference;
  readonly nowMs: number;
}

export interface FetchContentSourceResult {
  readonly sourceId: 'lesson_stats';
  readonly state: EvidenceState;
  readonly truncated: boolean;
  readonly droppedCount: number;
  readonly rows: readonly ContentLessonRow[];
  readonly observedAtMs: number;
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function safeTarget(value: unknown): ContentStudyTarget {
  return value === 'fr' ? 'fr' : 'en';
}

/** null для битой строки — такая строка отбрасывается и считается в droppedCount, а не превращается в нули. */
function parseRow(data: Record<string, unknown>): ContentLessonRow | null {
  const stats = data.stats as Record<string, unknown> | undefined;
  if (!stats) return null;
  const lessonId = safeNumber(data.lessonId);
  const averageScore = safeNumber(stats.averageScore);
  const sampleCount = safeNumber(stats.sampleCount);
  if (lessonId === null || lessonId <= 0) return null;
  if (averageScore === null || sampleCount === null || sampleCount < 0) return null;
  return Object.freeze({
    lessonId,
    target: safeTarget(data.target),
    averageScore,
    sampleCount,
  });
}

export async function fetchContentSource(input: FetchContentSourceInput): Promise<FetchContentSourceResult> {
  try {
    const snapshot = await input.collection
      .orderBy('__name__')
      .limit(MAX_LESSON_STATS_DOCS + 1)
      .get();
    const docs = snapshot.docs;
    const truncated = docs.length > MAX_LESSON_STATS_DOCS;
    const kept = truncated ? docs.slice(0, MAX_LESSON_STATS_DOCS) : docs;

    const rows: ContentLessonRow[] = [];
    let malformed = 0;
    for (const doc of kept) {
      const row = parseRow(doc.data() as Record<string, unknown>);
      if (row) rows.push(row);
      else malformed += 1;
    }

    return Object.freeze({
      sourceId: 'lesson_stats' as const,
      state: kept.length === 0 ? ('empty' as const) : ('ready' as const),
      truncated,
      droppedCount: malformed + (truncated ? docs.length - MAX_LESSON_STATS_DOCS : 0),
      rows: Object.freeze(rows),
      observedAtMs: input.nowMs,
    });
  } catch {
    return Object.freeze({
      sourceId: 'lesson_stats' as const,
      state: 'error' as const,
      truncated: false,
      droppedCount: 0,
      rows: Object.freeze([]),
      observedAtMs: input.nowMs,
    });
  }
}
