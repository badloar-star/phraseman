// ════════════════════════════════════════════════════════════════════════════
// mastery.ts — повторное прохождение завершённых уроков за осколки
//
// Логика:
//  1. Юзер впервые доходит до lesson_complete для урока N → markLessonFinishedOnce(N)
//     выставляет lesson_finished_once_v1_${N} = '1'.
//  2. На карточке урока (lessons.tsx) и в меню урока (lesson_menu.tsx) —
//     если finished_once && !premium → бейдж с ценой в осколках и «Перепройти».
//  3. Цена следующего платного перепрохождения урока N: BASE + STEP * (число уже успешных оплат/бесплатных перепроходов N).
//     Счётчик lesson_replay_count_v1_${N} растёт после каждого успешного executeReplay (в т.ч. Premium).
//  4. executeReplay:
//     - premium → бесплатно, только +1 к счётчику (прогресс по фразам не трогаем).
//     - !premium → spendShards(price, 'lesson_replay'), затем +1 к счётчику.
//
// Сам урок НЕ блокируется — теория, словарь, irregular verbs, флэшкарды
// продолжают работать. Заблокирована ТОЛЬКО кнопка "Начать урок" (отработка фраз).
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spendShards } from './shards_system';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import {
  masteryFinishedOnceKey,
  masteryReplayCountKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from './target_storage_keys';

/** Стартовая цена первого платного перепрохождения (при счётчике 0). */
export const MASTERY_REPLAY_BASE_SHARDS = 5;

/** На сколько осколков дороже каждое следующее перепрохождение этого же урока. */
export const MASTERY_REPLAY_PRICE_STEP_SHARDS = 5;

/** @deprecated Используйте BASE / getMasteryReplayPriceShards; оставлено для совместимости (= база первого раза). */
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

/** Цена в осколках за следующее платное перепрохождение урока (с учётом счётчика перепроходов). */
export function computeMasteryReplayPriceFromCount(replayCount: number): number {
  const n = Math.max(0, Math.floor(replayCount));
  return MASTERY_REPLAY_BASE_SHARDS + MASTERY_REPLAY_PRICE_STEP_SHARDS * n;
}

export async function getMasteryReplayPriceShards(
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  const c = await getLessonReplayCount(lessonId, studyTarget);
  return computeMasteryReplayPriceFromCount(c);
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
  | { ok: false; reason: 'insufficient_shards' | 'not_finished_yet' };

/**
 * Оформить перепрохождение урока (списание или бесплатно для Premium).
 * Прогресс по фразам и позиция в уроке не изменяются — только счётчик и осколки.
 */
export async function executeReplay(
  lessonId: number,
  isPremium: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<ExecuteReplayResult> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return { ok: false, reason: 'not_finished_yet' };
  }
  const finished = await isLessonFinishedOnce(lessonId, studyTarget);
  if (!finished) return { ok: false, reason: 'not_finished_yet' };

  let spent = 0;
  if (!isPremium) {
    const price = await getMasteryReplayPriceShards(lessonId, studyTarget);
    const ok = await spendShards(price, 'lesson_replay');
    if (!ok) return { ok: false, reason: 'insufficient_shards' };
    spent = price;
  }

  try {
    await bumpLessonReplayCount(lessonId, studyTarget);
  } catch (error) {
    DebugLogger.error('mastery:executeReplay:bumpCount', error, 'critical');
  }

  emitAppEvent('lesson_replay_started', { lessonId, spent, studyTarget: storageStudyTarget(studyTarget) });
  return { ok: true, spent };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
