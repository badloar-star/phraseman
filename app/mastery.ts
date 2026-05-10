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

/** Стартовая цена первого платного перепрохождения (при счётчике 0). */
export const MASTERY_REPLAY_BASE_SHARDS = 5;

/** На сколько осколков дороже каждое следующее перепрохождение этого же урока. */
export const MASTERY_REPLAY_PRICE_STEP_SHARDS = 5;

/** @deprecated Используйте BASE / getMasteryReplayPriceShards; оставлено для совместимости (= база первого раза). */
export const MASTERY_REPLAY_COST_SHARDS = MASTERY_REPLAY_BASE_SHARDS;

/** AsyncStorage ключ-флаг "урок впервые завершён", по lesson id. */
const finishedOnceKey = (lessonId: number): string => `lesson_finished_once_v1_${lessonId}`;
const replayCountKey = (lessonId: number): string => `lesson_replay_count_v1_${lessonId}`;

/** Сколько раз уже оформляли перепрохождение урока через mastery (после каждого успешного executeReplay +1). */
export async function getLessonReplayCount(lessonId: number): Promise<number> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return 0;
  try {
    const raw = await AsyncStorage.getItem(replayCountKey(lessonId));
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

export async function getMasteryReplayPriceShards(lessonId: number): Promise<number> {
  const c = await getLessonReplayCount(lessonId);
  return computeMasteryReplayPriceFromCount(c);
}

async function bumpLessonReplayCount(lessonId: number): Promise<void> {
  const c = await getLessonReplayCount(lessonId);
  await AsyncStorage.setItem(replayCountKey(lessonId), String(c + 1));
}

/** Пройден ли урок хотя бы один раз (доходил до экрана lesson_complete). */
export async function isLessonFinishedOnce(lessonId: number): Promise<boolean> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return false;
  try {
    const v = await AsyncStorage.getItem(finishedOnceKey(lessonId));
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
export async function markLessonFinishedOnce(lessonId: number): Promise<{ firstTime: boolean }> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) return { firstTime: false };
  try {
    const existing = await AsyncStorage.getItem(finishedOnceKey(lessonId));
    if (existing === '1') return { firstTime: false };
    await AsyncStorage.setItem(finishedOnceKey(lessonId), '1');
    emitAppEvent('lesson_finished_once', { lessonId });
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
): Promise<ExecuteReplayResult> {
  if (!Number.isFinite(lessonId) || lessonId <= 0) {
    return { ok: false, reason: 'not_finished_yet' };
  }
  const finished = await isLessonFinishedOnce(lessonId);
  if (!finished) return { ok: false, reason: 'not_finished_yet' };

  let spent = 0;
  if (!isPremium) {
    const price = await getMasteryReplayPriceShards(lessonId);
    const ok = await spendShards(price, 'lesson_replay');
    if (!ok) return { ok: false, reason: 'insufficient_shards' };
    spent = price;
  }

  try {
    await bumpLessonReplayCount(lessonId);
  } catch (error) {
    DebugLogger.error('mastery:executeReplay:bumpCount', error, 'critical');
  }

  emitAppEvent('lesson_replay_started', { lessonId, spent });
  return { ok: true, spent };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
