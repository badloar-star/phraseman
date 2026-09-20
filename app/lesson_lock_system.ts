/**
 * Система блокировки уроков
 *
 * РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-20:
 * Free получает уроки 1–3; дальше нужен Plus. Внутри Plus курс открывается
 * по мере прохождения, кроме первых уроков разделов A1/A2/B1/B2.
 *
 * Правила доступа, сверху вниз:
 * - Уроки 1–3 — открыты Free всегда.
 * - Урок куплен за 100 жемчужин — открыт навсегда (app/lessons_pearl_unlock.ts).
 *   Покупка открывает РОВНО один урок и НЕ считается его прохождением.
 * - Для активного Plus уроки 1, 9, 19, 29 доступны сразу.
 * - Остальные Plus-уроки требуют бронзу на предыдущем (score >= 2.5).
 *
 * Прочее без изменений:
 * - Зачёт уровня: все уроки этого уровня >= 4.5.
 * - Экзамен профессора Лингмана: все уроки = 5.0 + все зачёты сданы.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { storageGet, storageSet, storageGetString, storageSetString } from '../lib/storage';
import { withStorageLock } from './storage_mutex';
import { effectiveLessonStarScore } from './lesson_star_score';
import {
  BRONZE_UNLOCK_SCORE,
  isFreeSampleLesson,
  isPremiumSectionStarterLesson,
  requiresPremiumForLesson,
} from './monetization_policy';
import { isAlwaysOpenLesson, isMainCourseLesson } from './main_course_access';
import { purchasedLessonsKey, readPurchasedLessons } from './lessons_pearl_unlock_storage';
import {
  COURSE_LEVEL_RANGES,
  type CourseLevel,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  isLastLessonInLevel,
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

/**
 * Может ли завершение текущего урока записать последовательный unlock следующего.
 * Free никогда не расширяет основной курс дальше безусловных уроков 1–3;
 * active Plus сохраняет прежнюю последовательную механику внутри раздела.
 */
export const canUnlockNextLessonAfterCompletion = (
  currentLessonId: number,
  hasPremiumAccess: boolean,
): boolean => {
  const nextLessonId = currentLessonId + 1;
  if (!isMainCourseLesson(currentLessonId) || !isMainCourseLesson(nextLessonId)) return false;
  if (isLastLessonInLevel(currentLessonId)) return false;
  return hasPremiumAccess || !requiresPremiumForLesson(nextLessonId);
};

/** Route flags cannot announce an unlock that the current entitlement forbids. */
export const shouldAnnounceNextLessonUnlock = (
  currentLessonId: number,
  reportedUnlocked: boolean,
  hasPremiumAccess: boolean,
): boolean => reportedUnlocked && canUnlockNextLessonAfterCompletion(currentLessonId, hasPremiumAccess);

/** Разблокирует следующий урок если score >= 2.5 (бронза) и тариф разрешает. */
export const tryUnlockNextLesson = async (
  currentLessonId: number,
  score: number,
  studyTarget?: RuntimeStudyTarget,
  hasPremiumAccess = false,
): Promise<boolean> => {
  if (!canUnlockNextLessonAfterCompletion(currentLessonId, hasPremiumAccess)) return false;
  if (score >= BRONZE_UNLOCK_SCORE) {
    const nextLessonId = currentLessonId + 1;
    const alreadyUnlocked = await isLessonUnlocked(nextLessonId, studyTarget);
    if (!alreadyUnlocked) {
      await unlockLesson(nextLessonId, studyTarget);
      return true;
    }
  }
  return false;
};

export const isLessonUnlockedByEarnedProgress = async (
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> => {
  if (isAlwaysOpenLesson(lessonId) || isFreeSampleLesson(lessonId)) return true;
  if (!isMainCourseLesson(lessonId)) return false;

  // Exact pearl entitlement remains accessible after Plus expires. Old score,
  // persisted unlock and legacy-cap evidence must not widen the Free sample.
  if ((await readPurchasedLessons(studyTarget)).includes(lessonId)) return true;
  return false;
};

/**
 * Ищет ближайший доступный урок ВНИЗ от запомненного — за ОДНО чтение диска.
 *
 * зачем (владелец 2026-09-02, замер [PERF-STEPS]): Главная делала это циклом
 * `while (await isLessonUnlockedByEarnedProgress(...))`, и на первом заходе шаг
 * lessons+unlockLoop занимал 8 346 мс из 9 247 — 90% всей загрузки экрана.
 * Каждая итерация читала диск 2+ раза (массив разблокированных + пара ключей
 * прошлого урока), а при успехе ещё и писала под замком. До 31 итерации — это
 * ~90 последовательных операций.
 *
 * Здесь всё нужное берётся одним multiGet, а решение считается в памяти.
 * Логика доступа учитывает текущий тариф: Free всегда получает 1–3 и точные
 * жемчужные покупки; Plus дополнительно получает старты 9/19/29, а остальные
 * уроки — после бронзы ★2.5 на непосредственном предыдущем уроке.
 *
 * Отличие намеренное: побочная запись unlockLesson здесь НЕ делается. Это
 * чтение для кнопки «Урок» на Главной, а не место выдачи доступа — реальный
 * гейт остаётся на экране урока.
 */
export const resolveLastAvailableLessonId = async (
  requestedLessonId: number,
  studyTarget?: RuntimeStudyTarget,
  isPremium = false,
): Promise<number> => {
  if (!Number.isFinite(requestedLessonId)) return 1;
  let lessonId = Math.min(32, Math.max(1, Math.floor(requestedLessonId)));
  if (lessonId === 1) return 1;

  const keys: string[] = [purchasedLessonsKey(studyTarget)];
  for (let id = 1; id <= lessonId; id++) {
    keys.push(lessonBestScoreKey(id, studyTarget), lessonProgressKey(id, studyTarget));
  }

  let store: Map<string, string | null>;
  try {
    store = new Map(await AsyncStorage.multiGet(keys));
  } catch (e) {
    // зачем: не смогли прочитать — возвращаем запрошенный урок как есть, экран
    // урока сам покажет гейт. Причина обязана попасть в лог (немой catch запрещён).
    DebugLogger.error(
      'lesson_lock_system:resolveLastAvailable',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
    return lessonId;
  }

  const purchased = new Set(safeNumberList(store.get(purchasedLessonsKey(studyTarget)) ?? null));
  const isAvailable = (id: number): boolean => {
    if (isFreeSampleLesson(id)) return true;
    if (purchased.has(id)) return true;
    if (!isPremium) return false;
    if (isPremiumSectionStarterLesson(id)) return true;
    const prevId = id - 1;
    const { score } = effectiveLessonStarScore(
      store.get(lessonBestScoreKey(prevId, studyTarget)) ?? null,
      store.get(lessonProgressKey(prevId, studyTarget)) ?? null,
    );
    return score >= BRONZE_UNLOCK_SCORE;
  };

  while (lessonId > 1 && !isAvailable(lessonId)) {
    lessonId -= 1;
  }
  return lessonId;
};

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
  if (isAlwaysOpenLesson(lessonId) || isFreeSampleLesson(lessonId)) return true;
  if ((await readPurchasedLessons(studyTarget)).includes(lessonId)) return true;
  if (isPremiumSectionStarterLesson(lessonId)) return true;
  if (!isMainCourseLesson(lessonId)) return false;
  const prevLessonId = lessonId - 1;
  const [prevBestRaw, prevProgressRaw] = await AsyncStorage.multiGet([
    lessonBestScoreKey(prevLessonId, studyTarget),
    lessonProgressKey(prevLessonId, studyTarget),
  ]);
  return effectiveLessonStarScore(prevBestRaw[1], prevProgressRaw[1]).score >= BRONZE_UNLOCK_SCORE;
};

export const getLessonLockInfo = async (lessonId: number, studyTarget?: RuntimeStudyTarget) => {
  const isUnlocked = isAlwaysOpenLesson(lessonId)
    || await isLessonUnlockedByEarnedProgress(lessonId, studyTarget);
  const prevLessonId = lessonId - 1;
  return { isUnlocked, prevLessonId, prevScore: 0, requiredScore: BRONZE_UNLOCK_SCORE };
};

export const getLockMessageText = (info: Awaited<ReturnType<typeof getLessonLockInfo>>, lang: Lang): string => {
  const n = info.prevLessonId;
  const byLang: Record<string, string> = {
    ru: 'Ещё рано',
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

/** Rebuild the persisted projection after Plus expires.
 * Free keeps lessons 1–3; exact pearl grants are durable and are never removed. */
export const recomputeEarnedUnlocks = async (studyTarget?: RuntimeStudyTarget): Promise<void> => {
  try {
    const purchased = await readPurchasedLessons(studyTarget);
    const freeProjection = Array.from(new Set([1, 2, 3, ...purchased]))
      .filter(isMainCourseLesson)
      .sort((a, b) => a - b);
    await storageSet(unlockedLessonsKey(studyTarget), freeProjection);
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
