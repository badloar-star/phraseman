/**
 * Система блокировки уроков
 *
 * Правила разблокировки:
 * - Free: A1 (уроки 1-8) доступен по последовательной бронзовой цепочке; дальше нужен Premium.
 * - Premium: все уроки текущего уровня доступны сразу, следующий уровень открывает зачёт.
 * - Следующий урок внутри уже заработанной free-цепочки: score >= 2.5 (бронза)
 * - Зачёт уровня: все уроки этого уровня >= 4.5; для Premium UI открывает зачёт текущего уровня сразу.
 * - Экзамен профессора Лингмана: все уроки всех уровней = 5.0 + все зачёты сданы
 *
 * Первый урок всегда доступен.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { storageGet, storageSet, storageGetString, storageSetString } from '../lib/storage';
import { withStorageLock } from './storage_mutex';
import { effectiveLessonStarScore } from './lesson_star_score';
import { BRONZE_UNLOCK_SCORE, FREE_LESSON_LIMIT } from './monetization_policy';
import { isFeaturePremiumGated } from './feature_gates';
import { getFreeLessonsExtra, getPremiumLessonsExtra } from './remote_flags';
import {
  COURSE_LEVEL_RANGES,
  COURSE_LEVELS,
  type CourseLevel,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  isLastLessonInLevel,
  isLessonWithinReachedLevel,
  normalizeCourseLevel,
} from './course_levels';
import {
  lessonBestScoreKey,
  lessonPassCountKey,
  lessonProgressKey,
  lessonUnlockRepairKey,
  levelExamKey,
  lingmanExamAvailableKey,
  premiumCourseLevelKey,
  storedProgressFlagIsTrue,
  unlockedLessonsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { DebugLogger } from './debug-logger';

// ─── Урок ────────────────────────────────────────────────────────────────────

export const isLessonUnlocked = async (
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  if (lessonId === 1) return true;
  try {
    const unlocked = (await storageGet<number[]>(unlockedLessonsKey(studyTarget))) ?? [];
    return unlocked.includes(lessonId);
  } catch {
    return false;
  }
};

export const unlockLesson = async (
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  try {
    // зачем (аудит 2026-08-24): read-modify-write МАССИВА разблокированных уроков без
    // замка — классический lost update. isLessonUnlockedByEarnedProgress зовёт unlockLesson
    // побочным эффектом при обычном ЧТЕНИИ, а меню уроков и главный экран проверяют
    // доступ параллельно: два перекрывшихся вызова читали один и тот же старый массив,
    // и урок, открытый первым, терялся при записи второго. Читаем и пишем под замком.
    await withStorageLock(async () => {
      const key = unlockedLessonsKey(studyTarget);
      const unlocked = (await storageGet<number[]>(key)) ?? [];
      if (!unlocked.includes(lessonId)) {
        await storageSet(key, [...unlocked, lessonId]);
      }
    });
  } catch (e) {
      DebugLogger.error('lesson_lock_system:unlocked', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/** Разблокирует следующий урок если score >= 2.5 (бронза). Возвращает true если разблокировал. */
export const tryUnlockNextLesson = async (
  currentLessonId: number,
  score: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  if (isLastLessonInLevel(currentLessonId)) return false;
  if (score >= BRONZE_UNLOCK_SCORE && currentLessonId < 32) {
    const nextLessonId = currentLessonId + 1;
    const alreadyUnlocked = await isLessonUnlocked(nextLessonId, studyTarget);
    if (!alreadyUnlocked) {
      await unlockLesson(nextLessonId, studyTarget);
      return true;
    }
  }
  return false;
};

/**
 * Открыт ли урок поурочным исключением «Пульта» — тот же приоритет, что в
 * monetization_policy.isFreeLesson: premium_lessons_extra перебивает всё
 * остальное, затем «весь раздел во Фри», затем free_lessons_extra.
 */
function isLessonFreeByRemoteException(lessonId: number): boolean {
  if (getPremiumLessonsExtra().has(lessonId)) return false;
  if (!isFeaturePremiumGated('lessons')) return true;
  return getFreeLessonsExtra().has(lessonId);
}

export const isLessonUnlockedByEarnedProgress = async (
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  if (lessonId === 1) return true;
  if (lessonId < 1 || lessonId > 32) return false;

  // зачем: вкладка уроков строит доступ через buildSequentialFreeLessonUnlocks и
  // учитывает поурочные исключения «Пульта» (весь раздел во «Фри» / free_lessons_extra),
  // а этот рантайм-гард их не знал. Из-за расхождения карточка урока выглядела
  // открытой (без замочка), но экран урока встречал заглушкой «Урок заблокирован».
  // Исключения трактуем здесь так же, как в политике.
  if (isLessonFreeByRemoteException(lessonId)) return true;

  if (lessonId > FREE_LESSON_LIMIT) {
    return isLessonUnlocked(lessonId, studyTarget);
  }

  const unlocked = await isLessonUnlocked(lessonId, studyTarget);

  const prevLessonId = lessonId - 1;
  const [prevBestRaw, prevProgressRaw] = await AsyncStorage.multiGet([
    lessonBestScoreKey(prevLessonId, studyTarget),
    lessonProgressKey(prevLessonId, studyTarget),
  ]);
  const { score } = effectiveLessonStarScore(prevBestRaw[1], prevProgressRaw[1]);
  if (score < BRONZE_UNLOCK_SCORE) return false;

  if (!unlocked) {
    await unlockLesson(lessonId, studyTarget);
  }
  return true;
};

function areScoresReady(scores: number[], from: number, to: number, required: number): boolean {
  for (let lessonId = from; lessonId <= to; lessonId++) {
    if ((scores[lessonId - 1] ?? 0) < required) return false;
  }
  return true;
}

function safeNumberList(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      : [];
  } catch {
    return [];
  }
}

function maxLevel(a: CourseLevel, b: CourseLevel): CourseLevel {
  return getCourseLevelIndex(a) >= getCourseLevelIndex(b) ? a : b;
}

export const getPremiumCourseLevel = async (studyTarget?: RuntimeStudyTarget): Promise<CourseLevel> => {
  try {
    const premiumLevelKey = premiumCourseLevelKey(studyTarget);
    const unlockedKey = unlockedLessonsKey(studyTarget);
    const metaKeys = [
      premiumLevelKey,
      unlockedKey,
      levelExamKey('A1', 'passed', studyTarget),
      levelExamKey('A2', 'passed', studyTarget),
      levelExamKey('B1', 'passed', studyTarget),
      levelExamKey('B2', 'passed', studyTarget),
    ];
    const lessonKeys: string[] = [];
    for (let id = 1; id <= 32; id++) {
      lessonKeys.push(
        lessonBestScoreKey(id, studyTarget),
        lessonProgressKey(id, studyTarget),
        lessonPassCountKey(id, studyTarget),
      );
    }
    const map = Object.fromEntries(await AsyncStorage.multiGet([...metaKeys, ...lessonKeys]));

    let reached: CourseLevel = normalizeCourseLevel(map[premiumLevelKey]) ?? 'A1';
    if (storedProgressFlagIsTrue(map[levelExamKey('A1', 'passed', studyTarget)])) reached = maxLevel(reached, 'A2');
    if (storedProgressFlagIsTrue(map[levelExamKey('A2', 'passed', studyTarget)])) reached = maxLevel(reached, 'B1');
    if (
      storedProgressFlagIsTrue(map[levelExamKey('B1', 'passed', studyTarget)]) ||
      storedProgressFlagIsTrue(map[levelExamKey('B2', 'passed', studyTarget)])
    ) reached = maxLevel(reached, 'B2');

    for (const lessonId of safeNumberList(map[unlockedKey])) {
      reached = maxLevel(reached, getCourseLevelForLesson(lessonId));
    }

    for (let id = 1; id <= 32; id++) {
      const { score, correctCount } = effectiveLessonStarScore(
        map[lessonBestScoreKey(id, studyTarget)],
        map[lessonProgressKey(id, studyTarget)],
      );
      const passCount = parseInt(map[lessonPassCountKey(id, studyTarget)] || '0', 10) || 0;
      if (score > 0 || correctCount > 0 || passCount > 0) {
        reached = maxLevel(reached, getCourseLevelForLesson(id));
      }
    }

    await storageSetString(premiumLevelKey, reached);
    return reached;
  } catch {
    return 'A1';
  }
};

export const markPremiumCourseLevelReached = async (
  level: CourseLevel,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> => {
  try {
    const current = await getPremiumCourseLevel(studyTarget);
    await storageSetString(premiumCourseLevelKey(studyTarget), maxLevel(current, level));
  } catch (e) {
      DebugLogger.error('lesson_lock_system:current', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

export const isLessonUnlockedByPremiumCourse = async (
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  const reached = await getPremiumCourseLevel(studyTarget);
  return isLessonWithinReachedLevel(lessonId, reached);
};

export const getLessonLockInfo = async (lessonId: number, studyTarget?: RuntimeStudyTarget) => {
  const isUnlocked = await isLessonUnlocked(lessonId, studyTarget);
  const prevLessonId = lessonId - 1;
  return { isUnlocked, prevLessonId, prevScore: 0, requiredScore: 2.5 };
};

export const getLockMessageText = (info: Awaited<ReturnType<typeof getLessonLockInfo>>, lang: Lang): string => {
  const n = info.prevLessonId;
  const byLang: Record<string, string> = {
    ru: `Пройди урок ${n} с оценкой >= 2.5, чтобы разблокировать этот урок`,
    uk: `Пройди урок ${n} з оцінкою >= 2.5, щоб розблокувати цей урок`,
    es: `Completa la lección ${n} con una puntuación de al menos 2,5 para desbloquear esta lección`,
    'pt-BR': `Conclua a lição ${n} com nota de pelo menos 2,5 para desbloquear esta lição`,
    vi: `Hoàn thành bài ${n} với điểm từ 2,5 trở lên để mở khóa bài này`,
    id: `Selesaikan pelajaran ${n} dengan nilai minimal 2,5 untuk membuka pelajaran ini`,
    tr: `Bu dersi açmak için ${n}. dersi en az 2,5 puanla tamamla`,
    pl: `Ukończ lekcję ${n} z wynikiem co najmniej 2,5, aby odblokować tę lekcję`,
  };
  return byLang[lang] ?? byLang.ru;
};

// ─── Зачёт уровня ─────────────────────────────────────────────────────────────

/**
 * Возвращает название уровня (A1/A2/B1/B2) если зачёт этого уровня был ТОЛЬКО ЧТО разблокирован
 * (т.е. все уроки уровня впервые достигли >= 4.5).
 * Иначе возвращает null.
 */
export const tryUnlockLevelExam = async (
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<string | null> => {
  try {
    // Найти уровень урока
    let foundLevel: string | null = null;
    for (const [lvl, [from, to]] of Object.entries(COURSE_LEVEL_RANGES)) {
      if (lessonId >= from && lessonId <= to) { foundLevel = lvl; break; }
    }
    if (!foundLevel) return null;

    // Уже было разблокировано ранее?
    const alreadyKey = levelExamKey(foundLevel, 'available', studyTarget);
    const already = await storageGetString(alreadyKey);
    if (storedProgressFlagIsTrue(already)) return null;

    // Все уроки уровня >= 4.5 по max(best_score, progress) — см. lesson_star_score
    const [from, to] = COURSE_LEVEL_RANGES[foundLevel as CourseLevel];
    const keys: string[] = [];
    for (let id = from; id <= to; id++) {
      keys.push(lessonBestScoreKey(id, studyTarget), lessonProgressKey(id, studyTarget));
    }
    const map = Object.fromEntries(await AsyncStorage.multiGet(keys));
    let allReady = true;
    for (let id = from; id <= to; id++) {
      const { score } = effectiveLessonStarScore(
        map[lessonBestScoreKey(id, studyTarget)],
        map[lessonProgressKey(id, studyTarget)],
      );
      if (score < 4.5) {
        allReady = false;
        break;
      }
    }
    if (!allReady) return null;

    // Разблокируем впервые
    await storageSetString(alreadyKey, '1');
    return foundLevel;
  } catch {
    return null;
  }
};

// ─── Экзамен профессора Лингмана ──────────────────────────────────────────────

/**
 * Возвращает true если экзамен Лингмана был ТОЛЬКО ЧТО разблокирован:
 * все 32 урока = 5.0 И все 4 зачёта сданы (level_exam_X_passed = '1').
 */
export const tryUnlockLingmanExam = async (studyTarget?: RuntimeStudyTarget): Promise<boolean> => {
  try {
    const alreadyKey = lingmanExamAvailableKey(studyTarget);
    const already = await storageGetString(alreadyKey);
    if (storedProgressFlagIsTrue(already)) return false;

    const lessonKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      lessonKeys.push(lessonBestScoreKey(i, studyTarget), lessonProgressKey(i, studyTarget));
    }
    const lessonMap = Object.fromEntries(await AsyncStorage.multiGet(lessonKeys));
    let allPerfect = true;
    for (let i = 1; i <= 32; i++) {
      const { score } = effectiveLessonStarScore(
        lessonMap[lessonBestScoreKey(i, studyTarget)],
        lessonMap[lessonProgressKey(i, studyTarget)],
      );
      if (score < 5.0) {
        allPerfect = false;
        break;
      }
    }
    if (!allPerfect) return false;

    // Все 4 зачёта должны быть сданы
    const examKeys = ['A1', 'A2', 'B1', 'B2'].map(lvl => levelExamKey(lvl, 'passed', studyTarget));
    const examPairs = await AsyncStorage.multiGet(examKeys);
    const allPassed = examPairs.every(([, v]) => storedProgressFlagIsTrue(v));
    if (!allPassed) return false;

    await storageSetString(alreadyKey, '1');
    return true;
  } catch {
    return false;
  }
};

/**
 * Пересчитывает unlocked_lessons на основе реальных очков (без учёта premium/noLimits).
 * Вызывать после снятия premium/тестерских флагов.
 *
 * Правила:
 *  - Урок N открыт ⇔ урок N-1 пройден на ★2.5+ (для не-пограничных).
 *  - Пограничные 9/19/29 открываются ТОЛЬКО через сдачу зачёта прошлого уровня
 *    (level_exam_{A1|A2|B1}_passed='1').
 *  - Здесь, при пересчёте «честно заработанных» открытий, премиум НЕ учитываем
 *    (этот метод вызывается именно при снятии премиума, чтобы зафиксировать
 *    то что юзер заработал «по уму»). Урок 19 без премиума требует сдачу A2.
 */
export const recomputeEarnedUnlocks = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  try {
    const scoreKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      scoreKeys.push(lessonBestScoreKey(i, studyTarget), lessonProgressKey(i, studyTarget));
    }
    const scoreMap = Object.fromEntries(await AsyncStorage.multiGet(scoreKeys));
    const scores = Array.from({ length: 32 }, (_, i) =>
      effectiveLessonStarScore(
        scoreMap[lessonBestScoreKey(i + 1, studyTarget)],
        scoreMap[lessonProgressKey(i + 1, studyTarget)],
      ).score,
    );

    const examPairs = await AsyncStorage.multiGet([
      levelExamKey('A1', 'passed', studyTarget),
      levelExamKey('A2', 'passed', studyTarget),
      levelExamKey('B1', 'passed', studyTarget),
    ]);
    const examMap = Object.fromEntries(examPairs);
    const a1Passed = storedProgressFlagIsTrue(examMap[levelExamKey('A1', 'passed', studyTarget)]);
    const a2Passed = storedProgressFlagIsTrue(examMap[levelExamKey('A2', 'passed', studyTarget)]);
    const b1Passed = storedProgressFlagIsTrue(examMap[levelExamKey('B1', 'passed', studyTarget)]);
    const u = new Array(32).fill(false);
    u[0] = true; // урок 1 всегда открыт
    for (let i = 1; i < 32; i++) {
      const num = i + 1;
      if      (num === 9)  u[i] = a1Passed;
      else if (num === 19) u[i] = a2Passed; // премиум-кейс не учитываем — этот recompute для пост-премиум
      else if (num === 29) u[i] = b1Passed;
      else                 u[i] = u[i - 1] && scores[i - 1] >= 2.5;
    }

    const earned = u.reduce<number[]>((acc, unlocked, i) => {
      if (unlocked) acc.push(i + 1);
      return acc;
    }, []);
    await storageSet(unlockedLessonsKey(studyTarget), earned);
  } catch (e) {
      DebugLogger.error('lesson_lock_system:earned', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/**
 * Одноразовая починка `unlocked_lessons` после релиза, в котором правила были
 * де-факто мягче чем должны (пограничные открывались через blockAll45, без сдачи
 * зачёта). Пересчитывает `unlocked_lessons` СТРОГО ПО ПРАВИЛАМ ИГРЫ:
 *
 *   • Урок 1 — всегда открыт.
 *   • Урок 2..8  — открыт если предыдущий ★2.5+.
 *   • Урок 9     — открыт ТОЛЬКО если сдан зачёт A1 (`level_exam_A1_passed='1'`).
 *   • Урок 10..18 — открыт если предыдущий ★2.5+ И урок 9 открыт.
 *   • Урок 19    — открыт если сдан зачёт A2.
 *   • Урок 20..28 — открыт если предыдущий ★2.5+ И урок 19 открыт.
 *   • Урок 29    — открыт ТОЛЬКО если сдан зачёт B1.
 *   • Урок 30..32 — открыт если предыдущий ★2.5+ И урок 29 открыт.
 *
 * Что НЕ делает:
 *   • НЕ учитывает диагностический тест: он только рекомендует уровень.
 *   • НЕ учитывает tester_no_limits / DEV_MODE (это runtime override).
 *   • НЕ учитывает had_premium_ever (после lapse премиума урок 19 закрывается).
 *
 * Также проставляет минимальный best_score=2.5 предыдущему уроку, если он 0,
 * чтобы новая UI-формула в (tabs)/lessons.tsx не закрывала уже открытые уроки.
 *
 * Идемпотентно: помечаем флагом `lesson_unlock_repair_v3` и больше не запускаем.
 */
export const repairLessonUnlocksAfterRestore = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  const REPAIR_KEY = lessonUnlockRepairKey(studyTarget);
  try {
    const done = await storageGetString(REPAIR_KEY);
    if (storedProgressFlagIsTrue(done)) return;

    // ── 1. Загружаем состояние ────────────────────────────────────────────────
    const metaKeys = [
      levelExamKey('A1', 'passed', studyTarget),
      levelExamKey('A2', 'passed', studyTarget),
      levelExamKey('B1', 'passed', studyTarget),
    ];
    const lessonKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      lessonKeys.push(lessonBestScoreKey(i, studyTarget), lessonProgressKey(i, studyTarget));
    }
    const allEntries = await AsyncStorage.multiGet([...metaKeys, ...lessonKeys]);
    const map = Object.fromEntries(allEntries);

    const a1Passed = storedProgressFlagIsTrue(map[levelExamKey('A1', 'passed', studyTarget)]);
    const a2Passed = storedProgressFlagIsTrue(map[levelExamKey('A2', 'passed', studyTarget)]);
    const b1Passed = storedProgressFlagIsTrue(map[levelExamKey('B1', 'passed', studyTarget)]);

    const scores = Array.from({ length: 32 }, (_, i) =>
      effectiveLessonStarScore(
        map[lessonBestScoreKey(i + 1, studyTarget)],
        map[lessonProgressKey(i + 1, studyTarget)],
      ).score,
    );
    // ── 2. Пересчитываем unlocked_lessons СТРОГО по правилам игры ──────────────
    const u = new Array(32).fill(false);
    u[0] = true; // урок 1 всегда
    for (let i = 1; i < 32; i++) {
      const num = i + 1;
      if      (num === 9)  u[i] = a1Passed;
      else if (num === 19) u[i] = a2Passed;
      else if (num === 29) u[i] = b1Passed;
      else                 u[i] = u[i - 1] && scores[i - 1] >= 2.5;
    }
    const earned = u.reduce<number[]>((acc, ok, i) => {
      if (ok) acc.push(i + 1);
      return acc;
    }, []);
    await storageSet(unlockedLessonsKey(studyTarget), earned);

    // ── 3. Чиним best_score=2.5 для предыдущих уроков (cloud-restore safety) ──
    // Если урок N открыт но lesson{N-1}_best_score=0 (не сохранён, потому что
    // юзер прошёл на ★2.5..4.4) и lesson{N-1}_progress пропал (он не в SYNC_KEYS),
    // то новая UI-формула покажет урок N закрытым. Поднимаем best_score до 2.5
    // (минимум-бронза) — медали и pass_count не трогаем.
    const fixes: [string, string][] = [];
    for (const num of earned) {
      // Для пограничных предыдущий урок не определяет открытие — пропускаем
      if (num === 9 || num === 19 || num === 29 || num === 1) continue;
      const prevId = num - 1;
      const { score } = effectiveLessonStarScore(
        map[lessonBestScoreKey(prevId, studyTarget)],
        map[lessonProgressKey(prevId, studyTarget)],
      );
      if (score < 2.5) {
        fixes.push([lessonBestScoreKey(prevId, studyTarget), '2.5']);
      }
    }
    if (fixes.length > 0) {
      await AsyncStorage.multiSet(fixes);
    }

    await storageSetString(REPAIR_KEY, '1');
  } catch (e) {
      // soft-fail: следующий запуск повторит попытку, флаг не выставлен
      DebugLogger.error('lesson_lock_system:prevId', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
};

/** Синхронная проверка (без флага "впервые") — для UI exam.tsx */
export const isLingmanExamAvailable = async (studyTarget?: RuntimeStudyTarget): Promise<boolean> => {
  try {
    const lessonKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      lessonKeys.push(lessonBestScoreKey(i, studyTarget), lessonProgressKey(i, studyTarget));
    }
    const lessonMap = Object.fromEntries(await AsyncStorage.multiGet(lessonKeys));
    for (let i = 1; i <= 32; i++) {
      const { score } = effectiveLessonStarScore(
        lessonMap[lessonBestScoreKey(i, studyTarget)],
        lessonMap[lessonProgressKey(i, studyTarget)],
      );
      if (score < 5.0) return false;
    }

    const examKeys = ['A1', 'A2', 'B1', 'B2'].map(lvl => levelExamKey(lvl, 'passed', studyTarget));
    const examPairs = await AsyncStorage.multiGet(examKeys);
    return examPairs.every(([, v]) => storedProgressFlagIsTrue(v));
  } catch {
    return false;
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
