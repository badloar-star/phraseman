// progress_sync_v1.ts — облачная копия прогресса курса Learning V2 и экзаменов глав (решение координатора 22.10, вариант А).
// зачем: пройденные эпизоды и сданные экзамены жили только на телефоне — при переустановке или смене телефона пропадали.
// Теперь их компактная копия едет в документ пользователя той же пачкой, что весь прогресс (SYNC_KEYS в app/cloud_sync.ts):
// новых чтений нет, запись — только когда значение изменилось. Модуль чистый: кодирование и правила слияния без хранилища.
//  • прогресс курса — строгая цепочка занятий, поэтому достаточно ОДНОГО числа: сколько занятий пройдено подряд;
//  • экзамен — короткий массив полей без текстов.
// Слияние никогда не теряет пройденное: число — максимум; экзамен — «сдан» побеждает, лучший счёт и попытки — максимум.

export const LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1 = "learning_v2_course_progress_sync_v1";
export const LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1 = "learning_v2_chapter_exam_sync_v1";
const LOG = "[V2-PROGRESS-SYNC]";

/** Число пройденных подряд занятий из значения ключа; битое или пустое — 0. */
export function parseCourseProgressSyncCountV1(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export type ChapterExamSyncRecordV1 = Readonly<{
  examKey: string;
  status: "passed" | "failed";
  passedCorrect: number | null;
  lastCorrect: number;
  attempts: number;
  lastFinishedAtMs: number;
  retryAtMs: number | null;
}>;

// Компактно: [сдан 1/0, лучший сданный счёт|-1, последний счёт, попытки, время конца, время пересдачи|0]
type Packed = [number, number, number, number, number, number];

export function packChapterExamSyncV1(records: Readonly<Record<string, ChapterExamSyncRecordV1>>): string {
  const out: Record<string, Packed> = {};
  for (const [key, r] of Object.entries(records)) {
    out[key] = [r.status === "passed" ? 1 : 0, r.passedCorrect ?? -1, r.lastCorrect, r.attempts, r.lastFinishedAtMs, r.retryAtMs ?? 0];
  }
  return JSON.stringify(out);
}

const isPacked = (value: unknown): value is Packed =>
  Array.isArray(value) && value.length === 6 && value.every((n) => typeof n === "number" && Number.isFinite(n));

export function unpackChapterExamSyncV1(raw: string | null | undefined): Record<string, ChapterExamSyncRecordV1> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG} exam:unparseable`, JSON.stringify({ len: raw.length, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, ChapterExamSyncRecordV1> = {};
  for (const [examKey, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isPacked(value)) continue;
    const [passed, passedCorrect, lastCorrect, attempts, lastFinishedAtMs, retryAtMs] = value;
    out[examKey] = Object.freeze({
      examKey,
      status: passed === 1 ? "passed" : "failed",
      passedCorrect: passedCorrect >= 0 ? passedCorrect : null,
      lastCorrect,
      attempts,
      lastFinishedAtMs,
      retryAtMs: retryAtMs > 0 ? retryAtMs : null,
    });
  }
  return out;
}

/** Две записи одного экзамена: сданный побеждает, лучший счёт и попытки — максимум; пауза — только у несданного, по последней попытке. */
export function mergeChapterExamRecordV1(a: ChapterExamSyncRecordV1, b: ChapterExamSyncRecordV1): ChapterExamSyncRecordV1 {
  const passed = a.status === "passed" || b.status === "passed";
  const latest = a.lastFinishedAtMs >= b.lastFinishedAtMs ? a : b;
  const passedScores = [a.passedCorrect, b.passedCorrect].filter((n): n is number => typeof n === "number");
  return Object.freeze({
    examKey: a.examKey,
    status: passed ? "passed" : "failed",
    passedCorrect: passedScores.length ? Math.max(...passedScores) : null,
    lastCorrect: latest.lastCorrect,
    attempts: Math.max(a.attempts, b.attempts),
    lastFinishedAtMs: latest.lastFinishedAtMs,
    retryAtMs: passed ? null : latest.retryAtMs,
  });
}

export function mergeChapterExamRecordMapsV1(
  a: Readonly<Record<string, ChapterExamSyncRecordV1>>,
  b: Readonly<Record<string, ChapterExamSyncRecordV1>>,
): Record<string, ChapterExamSyncRecordV1> {
  const out: Record<string, ChapterExamSyncRecordV1> = { ...b };
  for (const [key, record] of Object.entries(a)) out[key] = out[key] ? mergeChapterExamRecordV1(record, out[key]) : record;
  return out;
}

/** Правило восстановления (local, cloud) → значение для записи: облако и телефон сливаются, пустая сторона ничего не стирает. */
export function mergeChapterExamSyncRestoreValueV1(localRaw: string | null | undefined, cloudRaw: string): string {
  const local = unpackChapterExamSyncV1(localRaw);
  const cloud = unpackChapterExamSyncV1(cloudRaw);
  const merged = mergeChapterExamRecordMapsV1(local, cloud);
  const out = packChapterExamSyncV1(merged);
  console.log(`${LOG} restore:exam`, JSON.stringify({ local: Object.keys(local).length, cloud: Object.keys(cloud).length, merged: Object.keys(merged).length, rule: "passed_wins_best_score_max" })); // guard-ok: какое правило сработало
  return out;
}

/** Правило восстановления прогресса курса: максимум; пустой или битый телефон облако не уменьшает. */
export function mergeCourseProgressSyncRestoreValueV1(localRaw: string | null | undefined, cloudRaw: string): string {
  const local = parseCourseProgressSyncCountV1(localRaw);
  const cloud = parseCourseProgressSyncCountV1(cloudRaw);
  const merged = Math.max(local, cloud);
  console.log(`${LOG} restore:course`, JSON.stringify({ local, cloud, merged, rule: "max_completed_never_lost" })); // guard-ok: какое правило сработало
  return String(merged);
}

// ── Звёзды эпизодов (координатор 22.10): без них после переустановки пройденные эпизоды показывались бы с одной звездой.
// Компактно: строка по порядку занятий курса, символ на занятие — '0'…'3' или '-' (результата нет); ≤ 1792 байт на весь курс.
export const LEARNING_V2_SESSION_STARS_SYNC_KEY_V1 = "learning_v2_session_stars_sync_v1";

const STAR_CHARS = new Set(["-", "0", "1", "2", "3"]);
const starRank = (char: string | undefined): number => (char === undefined || char === "-" ? -1 : Number(char));

/** Звёзды по id занятия → строка по порядку курса (хвост без результатов обрезан). */
export function packSessionStarsSyncV1(
  stars: Readonly<Record<string, number>>,
  orderedSessionIds: readonly string[],
): string {
  const chars = orderedSessionIds.map((id) => {
    const value = stars[id];
    return value === 0 || value === 1 || value === 2 || value === 3 ? String(value) : "-";
  });
  return chars.join("").replace(/-+$/u, "");
}

/** Строка → звёзды по id занятия; посторонние символы и лишняя длина отбрасываются. */
export function unpackSessionStarsSyncV1(
  raw: string | null | undefined,
  orderedSessionIds: readonly string[],
): Record<string, 0 | 1 | 2 | 3> {
  const out: Record<string, 0 | 1 | 2 | 3> = {};
  if (!raw) return out;
  const limit = Math.min(raw.length, orderedSessionIds.length);
  for (let i = 0; i < limit; i += 1) {
    const char = raw[i];
    if (char === "0" || char === "1" || char === "2" || char === "3") out[orderedSessionIds[i]] = Number(char) as 0 | 1 | 2 | 3;
  }
  return out;
}

/** Правило восстановления: по каждому занятию — лучшая звезда; пустая или битая сторона ничего не стирает. */
export function mergeSessionStarsSyncRestoreValueV1(localRaw: string | null | undefined, cloudRaw: string): string {
  const clean = (raw: string | null | undefined) => [...(raw ?? "")].map((c) => (STAR_CHARS.has(c) ? c : "-"));
  const local = clean(localRaw);
  const cloud = clean(cloudRaw);
  const length = Math.max(local.length, cloud.length);
  const merged: string[] = [];
  let improvedFromLocal = 0;
  for (let i = 0; i < length; i += 1) {
    const best = starRank(local[i]) > starRank(cloud[i]) ? local[i] : (cloud[i] ?? "-");
    if (best !== (cloud[i] ?? "-")) improvedFromLocal += 1;
    merged.push(best ?? "-");
  }
  const out = merged.join("").replace(/-+$/u, "");
  console.log(`${LOG} restore:stars`, JSON.stringify({ local: local.length, cloud: cloud.length, improvedFromLocal, rule: "best_star_per_session" })); // guard-ok: какое правило сработало
  return out;
}
