// ════════════════════════════════════════════════════════════════════════════
// mastery.ts — служебные флаги повторного прохождения завершённых уроков
//
// Логика:
//  1. Юзер впервые доходит до lesson_complete для урока N → markLessonFinishedOnce(N)
//     выставляет lesson_finished_once_v1_${N} = '1'.
//  2. Повторные прохождения для всех пользователей бесплатны и не требуют отдельного подтверждения.
//  3. Счётчик lesson_replay_count_v1_${N} может расти после executeReplay для аналитики/синхронизации.
//
// Сам урок не блокируется: повтор можно запускать сколько угодно раз.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import {
  masteryFinishedOnceKey,
  masteryReplayCountKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';

/** @deprecated Повтор уроков больше не стоит осколков; оставлено для совместимости старых импортов. */
export const MASTERY_REPLAY_BASE_SHARDS = 0;

/** @deprecated Повтор уроков больше не дорожает; оставлено для совместимости старых импортов. */
export const MASTERY_REPLAY_PRICE_STEP_SHARDS = 0;

/** @deprecated Повтор уроков бесплатный. */
export const MASTERY_REPLAY_COST_SHARDS = MASTERY_REPLAY_BASE_SHARDS;

/** Сколько раз уже оформляли перепрохождение урока через mastery (после каждого успешного executeReplay +1). */
export async function getLessonReplayCount(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<number> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return 0;
  try {
    const raw = await AsyncStorage.getItem(masteryReplayCountKey(lessonId, studyTarget));
    const n = parseInt(raw || '0', 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch (error) {
    DebugLogger.error('mastery:getLessonReplayCount', error, 'warning');
    return 0;
  }
}

/** @deprecated Повтор уроков бесплатный; функция возвращает 0 для совместимости. */
export function computeMasteryReplayPriceFromCount(replayCount: number): number {
  void replayCount;
  return 0;
}

export async function getMasteryReplayPriceShards(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  void lessonId;
  void studyTarget;
  return 0;
}

async function bumpLessonReplayCount(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<void> {
  const c = await getLessonReplayCount(lessonId, studyTarget);
  await AsyncStorage.setItem(masteryReplayCountKey(lessonId, studyTarget), String(c + 1));
}

/** Пройден ли урок хотя бы один раз (доходил до экрана lesson_complete). */
export async function isLessonFinishedOnce(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return false;
  try {
    const v = await AsyncStorage.getItem(masteryFinishedOnceKey(lessonId, studyTarget));
    return v === '1';
  } catch (error) {
    DebugLogger.error('mastery:isLessonFinishedOnce', error, 'warning');
    return false;
  }
}

/**
 * Вызывается из lesson_complete.tsx при mount экрана. Идемпотентен —
 * повторные вызовы для уже завершённого урока ничего не делают.
 */
export async function markLessonFinishedOnce(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ firstTime: boolean }> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return { firstTime: false };
  try {
    const existing = await AsyncStorage.getItem(masteryFinishedOnceKey(lessonId, studyTarget));
    if (existing === '1') return { firstTime: false };
    await AsyncStorage.setItem(masteryFinishedOnceKey(lessonId, studyTarget), '1');
    emitAppEvent('lesson_finished_once', { lessonId, studyTarget: storageStudyTarget(studyTarget) });
    return { firstTime: true };
  } catch (error) {
    DebugLogger.error('mastery:markLessonFinishedOnce', error, 'warning');
    return { firstTime: false };
  }
}

export type ExecuteReplayResult =
  | { ok: true; spent: number }
  | { ok: false; reason: 'not_finished_yet' };

/**
 * Оформить перепрохождение урока.
 * Прогресс по фразам и позиция в уроке не изменяются — только служебный счётчик.
 */
export async function executeReplay(
  lessonId: number,
  isPremium: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<ExecuteReplayResult> {
  void isPremium;
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return { ok: false, reason: 'not_finished_yet' };
  }
  const finished = await isLessonFinishedOnce(lessonId, studyTarget);
  if (!finished) return { ok: false, reason: 'not_finished_yet' };

  try {
    await bumpLessonReplayCount(lessonId, studyTarget);
  } catch (error) {
    DebugLogger.error('mastery:executeReplay:bumpCount', error, 'critical');
  }

  emitAppEvent('lesson_replay_started', { lessonId, spent: 0, studyTarget: storageStudyTarget(studyTarget) });
  return { ok: true, spent: 0 };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
