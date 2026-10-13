// ═══════════════════════════════════════════════════════════════════════════
// lesson_progress_scan.ts — сводка прохождения 32 уроков для ачивок на экране итога (lesson_complete).
//
// зачем (аудит Optimistic UI «Профиль и Уроки», координатор 13.10; R1 «итог урока»): экран «Сохраняю результат…» держался, пока `grantBonus` последовательно читал
// 32 ключа AsyncStorage по одному (32 обращения через мост). Те же данные приходят ОДНИМ `multiGet`; разбор прежний — урок засчитан при ≥45 верных,
// «идеальный» — без ошибок. СПЕРВА ЛОГИ: `[LESSON-RESULT-SAVE]` печатает число ключей, мс чтения и мс разбора, чтобы замер до/после был виден в журнале.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DebugLogger } from './debug-logger';
import { lessonProgressKey } from './target_storage_keys';

const LOG = '[LESSON-RESULT-SAVE]';
export const LESSON_PROGRESS_SCAN_COUNT = 32;
/** Урок считается пройденным при стольких верных ответах (как раньше в lesson_complete). */
export const LESSON_PROGRESS_PASS_CORRECT = 45;

export type LessonProgressSummary = Readonly<{
  lessonCount: number;
  perfectCount: number;
  wasPerfect: boolean;
  brokenKeys: number;
}>;

export type LessonProgressScanResult = LessonProgressSummary & Readonly<{ keys: number; readMs: number; parseMs: number }>;

/** Чистый разбор строк хранилища: [номер урока, сырое значение]. Битая запись не валит остальные — считается в brokenKeys и пишется в журнал. */
export function summarizeLessonProgress(
  rows: readonly (readonly [number, string | null])[],
  currentLessonId: number,
): LessonProgressSummary {
  let lessonCount = 0;
  let perfectCount = 0;
  let wasPerfect = false;
  let brokenKeys = 0;
  for (const [lessonId, raw] of rows) {
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        brokenKeys += 1;
        DebugLogger.warn(LOG, `scan: урок ${lessonId} — прогресс не массив (${typeof parsed}), пропускаем`);
        continue;
      }
      const p = parsed as string[];
      const correct = p.filter((x) => x === 'correct' || x === 'replay_correct').length;
      if (correct >= LESSON_PROGRESS_PASS_CORRECT) {
        lessonCount += 1;
        const wrong = p.filter((x) => x === 'wrong').length;
        if (wrong === 0 && lessonId === currentLessonId) wasPerfect = true;
        if (wrong === 0) perfectCount += 1;
      }
    } catch (error) {
      brokenKeys += 1;
      DebugLogger.warn(LOG, `scan: урок ${lessonId} — прогресс не разобрался (${error instanceof Error ? error.message : String(error)}), пропускаем`);
    }
  }
  return { lessonCount, perfectCount, wasPerfect, brokenKeys };
}

/** Один `multiGet` вместо 32 последовательных `getItem`. Сбой чтения — пустая сводка и причина в журнале (ачивки не должны ронять итог урока). */
export async function scanLessonProgress(
  studyTarget: Parameters<typeof lessonProgressKey>[1],
  currentLessonId: number,
): Promise<LessonProgressScanResult> {
  const ids = Array.from({ length: LESSON_PROGRESS_SCAN_COUNT }, (_, i) => i + 1);
  const keys = ids.map((id) => lessonProgressKey(id, studyTarget));
  const startedAt = Date.now();
  let rows: (readonly [number, string | null])[] = [];
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const byKey = new Map(pairs.map(([key, value]) => [key, value] as const));
    rows = ids.map((id, i) => [id, byKey.get(keys[i]) ?? null] as const);
  } catch (error) {
    DebugLogger.warn(LOG, `scan: multiGet упал (${error instanceof Error ? error.message : String(error)}) — ачивки по прохождению пропущены`);
  }
  const readMs = Date.now() - startedAt;
  const parsedAt = Date.now();
  const summary = summarizeLessonProgress(rows, currentLessonId);
  const parseMs = Date.now() - parsedAt;
  DebugLogger.info(LOG, `scan: lesson=${currentLessonId} ключей=${keys.length} multiGet=${readMs}мс разбор=${parseMs}мс засчитано=${summary.lessonCount} идеальных=${summary.perfectCount} wasPerfect=${String(summary.wasPerfect)} битых=${summary.brokenKeys}`);
  return { ...summary, keys: keys.length, readMs, parseMs };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
