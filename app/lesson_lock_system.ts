/**
 * Система блокировки уроков
 *
 * Правила разблокировки:
 * - Следующий урок в рамках уровня: score >= 2.5 (бронза)
 * - Зачёт уровня: все уроки этого уровня >= 4.5
 * - Экзамен профессора Лингмана: все уроки всех уровней = 5.0 + все зачёты сданы
 *
 * Первый урок всегда доступен.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import { CEFR_RANGES } from './medal_utils';
import { effectiveLessonStarScore } from './lesson_star_score';

const UNLOCKED_LESSONS_KEY = 'unlocked_lessons';

// ─── Урок ────────────────────────────────────────────────────────────────────

export const isLessonUnlocked = async (lessonId: number): Promise<boolean> => {
  if (lessonId === 1) return true;
  try {
    const unlockedStr = await AsyncStorage.getItem(UNLOCKED_LESSONS_KEY);
    const unlocked: number[] = unlockedStr ? JSON.parse(unlockedStr) : [];
    return unlocked.includes(lessonId);
  } catch {
    return false;
  }
};

export const unlockLesson = async (lessonId: number): Promise<void> => {
  try {
    const unlockedStr = await AsyncStorage.getItem(UNLOCKED_LESSONS_KEY);
    const unlocked: number[] = unlockedStr ? JSON.parse(unlockedStr) : [];
    if (!unlocked.includes(lessonId)) {
      unlocked.push(lessonId);
      await AsyncStorage.setItem(UNLOCKED_LESSONS_KEY, JSON.stringify(unlocked));
    }
  } catch {}
};

/** Разблокирует следующий урок если score >= 2.5 (бронза). Возвращает true если разблокировал. */
export const tryUnlockNextLesson = async (currentLessonId: number, score: number): Promise<boolean> => {
  if (score >= 2.5 && currentLessonId < 32) {
    const nextLessonId = currentLessonId + 1;
    const alreadyUnlocked = await isLessonUnlocked(nextLessonId);
    if (!alreadyUnlocked) {
      await unlockLesson(nextLessonId);
      return true;
    }
  }
  return false;
};

export const getLessonLockInfo = async (lessonId: number) => {
  const isUnlocked = await isLessonUnlocked(lessonId);
  const prevLessonId = lessonId - 1;
  return { isUnlocked, prevLessonId, prevScore: 0, requiredScore: 2.5 };
};

export const getLockMessageText = (info: Awaited<ReturnType<typeof getLessonLockInfo>>, lang: Lang): string => {
  if (lang === 'uk') {
    return `Пройди урок ${info.prevLessonId} з оцінкою >= 2.5 щоб розблокувати цей урок`;
  }
  if (lang === 'es') {
    return `Completa la lección ${info.prevLessonId} con puntuación de al menos 2,5 para desbloquear esta lección`;
  }
  return `Пройди урок ${info.prevLessonId} с оценкой >= 2.5 чтобы разблокировать этот урок`;
};

// ─── Зачёт уровня ─────────────────────────────────────────────────────────────

/**
 * Возвращает название уровня (A1/A2/B1/B2) если зачёт этого уровня был ТОЛЬКО ЧТО разблокирован
 * (т.е. все уроки уровня впервые достигли >= 4.5).
 * Иначе возвращает null.
 */
export const tryUnlockLevelExam = async (lessonId: number): Promise<string | null> => {
  try {
    // Найти уровень урока
    let foundLevel: string | null = null;
    for (const [lvl, [from, to]] of Object.entries(CEFR_RANGES)) {
      if (lessonId >= from && lessonId <= to) { foundLevel = lvl; break; }
    }
    if (!foundLevel) return null;

    // Уже было разблокировано ранее?
    const alreadyKey = `level_exam_${foundLevel}_available`;
    const already = await AsyncStorage.getItem(alreadyKey);
    if (already === '1') return null;

    // Все уроки уровня >= 4.5 по max(best_score, progress) — см. lesson_star_score
    const [from, to] = CEFR_RANGES[foundLevel];
    const keys: string[] = [];
    for (let id = from; id <= to; id++) {
      keys.push(`lesson${id}_best_score`, `lesson${id}_progress`);
    }
    const map = Object.fromEntries(await AsyncStorage.multiGet(keys));
    let allReady = true;
    for (let id = from; id <= to; id++) {
      const { score } = effectiveLessonStarScore(map[`lesson${id}_best_score`], map[`lesson${id}_progress`]);
      if (score < 4.5) {
        allReady = false;
        break;
      }
    }
    if (!allReady) return null;

    // Разблокируем впервые
    await AsyncStorage.setItem(alreadyKey, '1');
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
export const tryUnlockLingmanExam = async (): Promise<boolean> => {
  try {
    const alreadyKey = 'lingman_exam_available';
    const already = await AsyncStorage.getItem(alreadyKey);
    if (already === '1') return false;

    const lessonKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      lessonKeys.push(`lesson${i}_best_score`, `lesson${i}_progress`);
    }
    const lessonMap = Object.fromEntries(await AsyncStorage.multiGet(lessonKeys));
    let allPerfect = true;
    for (let i = 1; i <= 32; i++) {
      const { score } = effectiveLessonStarScore(lessonMap[`lesson${i}_best_score`], lessonMap[`lesson${i}_progress`]);
      if (score < 5.0) {
        allPerfect = false;
        break;
      }
    }
    if (!allPerfect) return false;

    // Все 4 зачёта должны быть сданы
    const examKeys = ['A1', 'A2', 'B1', 'B2'].map(lvl => `level_exam_${lvl}_passed`);
    const examPairs = await AsyncStorage.multiGet(examKeys);
    const allPassed = examPairs.every(([, v]) => v === '1');
    if (!allPassed) return false;

    await AsyncStorage.setItem(alreadyKey, '1');
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
 *    (level_exam_{A1|A2|B1}_passed='1') или, для урока 19, при наличии премиума.
 *  - Здесь, при пересчёте «честно заработанных» открытий, премиум НЕ учитываем
 *    (этот метод вызывается именно при снятии премиума, чтобы зафиксировать
 *    то что юзер заработал «по уму»). Урок 19 без премиума требует сдачу A2.
 */
export const recomputeEarnedUnlocks = async (): Promise<void> => {
  try {
    const scoreKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      scoreKeys.push(`lesson${i}_best_score`, `lesson${i}_progress`);
    }
    const scoreMap = Object.fromEntries(await AsyncStorage.multiGet(scoreKeys));
    const scores = Array.from({ length: 32 }, (_, i) =>
      effectiveLessonStarScore(scoreMap[`lesson${i + 1}_best_score`], scoreMap[`lesson${i + 1}_progress`]).score,
    );

    const examPairs = await AsyncStorage.multiGet([
      'level_exam_A1_passed',
      'level_exam_A2_passed',
      'level_exam_B1_passed',
    ]);
    const examMap = Object.fromEntries(examPairs);
    const a1Passed = examMap['level_exam_A1_passed'] === '1';
    const a2Passed = examMap['level_exam_A2_passed'] === '1';
    const b1Passed = examMap['level_exam_B1_passed'] === '1';

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
    await AsyncStorage.setItem(UNLOCKED_LESSONS_KEY, JSON.stringify(earned));
  } catch {}
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
 *   • Урок 19    — открыт если сдан зачёт A2 ИЛИ премиум активен сейчас.
 *   • Урок 20..28 — открыт если предыдущий ★2.5+ И урок 19 открыт.
 *   • Урок 29    — открыт ТОЛЬКО если сдан зачёт B1.
 *   • Урок 30..32 — открыт если предыдущий ★2.5+ И урок 29 открыт.
 *
 * Что НЕ делает:
 *   • НЕ учитывает placement_level (это runtime-логика в (tabs)/index.tsx и
 *     lesson_menu, не должна попадать в persisted unlocked_lessons).
 *   • НЕ учитывает tester_no_limits / DEV_MODE (это runtime override).
 *   • НЕ учитывает had_premium_ever (после lapse премиума урок 19 закрывается).
 *
 * Также проставляет минимальный best_score=2.5 предыдущему уроку, если он 0,
 * чтобы новая UI-формула в (tabs)/index.tsx не закрывала уже открытые уроки.
 *
 * Идемпотентно: помечаем флагом `lesson_unlock_repair_v3` и больше не запускаем.
 */
export const repairLessonUnlocksAfterRestore = async (): Promise<void> => {
  const REPAIR_KEY = 'lesson_unlock_repair_v3';
  try {
    const done = await AsyncStorage.getItem(REPAIR_KEY);
    if (done === '1') return;

    // ── 1. Загружаем состояние ────────────────────────────────────────────────
    const metaKeys = [
      'level_exam_A1_passed',
      'level_exam_A2_passed',
      'level_exam_B1_passed',
      'premium_active',
      'admin_premium_override',
      'premium_plan',
      'premium_expiry',
    ];
    const lessonKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      lessonKeys.push(`lesson${i}_best_score`, `lesson${i}_progress`);
    }
    const allEntries = await AsyncStorage.multiGet([...metaKeys, ...lessonKeys]);
    const map = Object.fromEntries(allEntries);

    const a1Passed = map['level_exam_A1_passed'] === '1';
    const a2Passed = map['level_exam_A2_passed'] === '1';
    const b1Passed = map['level_exam_B1_passed'] === '1';
    const adminOv = map['admin_premium_override'] === 'true';
    const planStr = String(map['premium_plan'] || '').trim();
    const ex = parseInt(map['premium_expiry'] || '0', 10) || 0;
    const adminGrantOk =
      adminOv &&
      !!planStr &&
      planStr.toLowerCase() !== 'null' &&
      (ex === 0 || ex > Date.now());
    const isPremiumNow = map['premium_active'] === 'true' || adminGrantOk;

    const scores = Array.from({ length: 32 }, (_, i) =>
      effectiveLessonStarScore(
        map[`lesson${i + 1}_best_score`],
        map[`lesson${i + 1}_progress`],
      ).score,
    );

    // ── 2. Пересчитываем unlocked_lessons СТРОГО по правилам игры ──────────────
    const u = new Array(32).fill(false);
    u[0] = true; // урок 1 всегда
    for (let i = 1; i < 32; i++) {
      const num = i + 1;
      if      (num === 9)  u[i] = a1Passed;
      else if (num === 19) u[i] = a2Passed || isPremiumNow;
      else if (num === 29) u[i] = b1Passed;
      else                 u[i] = u[i - 1] && scores[i - 1] >= 2.5;
    }
    const earned = u.reduce<number[]>((acc, ok, i) => {
      if (ok) acc.push(i + 1);
      return acc;
    }, []);
    await AsyncStorage.setItem(UNLOCKED_LESSONS_KEY, JSON.stringify(earned));

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
        map[`lesson${prevId}_best_score`],
        map[`lesson${prevId}_progress`],
      );
      if (score < 2.5) {
        fixes.push([`lesson${prevId}_best_score`, '2.5']);
      }
    }
    if (fixes.length > 0) {
      await AsyncStorage.multiSet(fixes);
    }

    await AsyncStorage.setItem(REPAIR_KEY, '1');
  } catch {
    // soft-fail: следующий запуск повторит попытку, флаг не выставлен
  }
};

/** Синхронная проверка (без флага "впервые") — для UI exam.tsx */
export const isLingmanExamAvailable = async (): Promise<boolean> => {
  try {
    const lessonKeys: string[] = [];
    for (let i = 1; i <= 32; i++) {
      lessonKeys.push(`lesson${i}_best_score`, `lesson${i}_progress`);
    }
    const lessonMap = Object.fromEntries(await AsyncStorage.multiGet(lessonKeys));
    for (let i = 1; i <= 32; i++) {
      const { score } = effectiveLessonStarScore(lessonMap[`lesson${i}_best_score`], lessonMap[`lesson${i}_progress`]);
      if (score < 5.0) return false;
    }

    const examKeys = ['A1', 'A2', 'B1', 'B2'].map(lvl => `level_exam_${lvl}_passed`);
    const examPairs = await AsyncStorage.multiGet(examKeys);
    return examPairs.every(([, v]) => v === '1');
  } catch {
    return false;
  }
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
