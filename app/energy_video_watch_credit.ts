/**
 * Ускорение восстановления энергии за просмотр видео.
 *
 * зачем (владелец 2026-09-02): пока человек смотрит видео в приложении, единица
 * энергии восстанавливается за 10 минут вместо обычных 30. Владелец
 * сформулировал это буквально: «запустил плеер — 1 энергия за 10 минут».
 *
 * Поэтому механика простая и предсказуемая: как только видео пошло, остаток до
 * следующей единицы ПОДТЯГИВАЕТСЯ к 10 минутам, если он был больше, и дальше
 * течёт обычным ходом. Посмотрел десять минут — энергия пришла.
 *
 * Что НЕ делаем:
 *  - не увеличиваем остаток: если до энергии оставалось 5 минут, видео их не
 *    удлиняет до десяти. Ускорение обязано только ускорять.
 *  - не отбираем при паузе (решение владельца): досмотрел 4 минуты из десяти —
 *    оставшиеся 6 идут дальше обычным ходом. Возврат к прежнему остатку
 *    выглядел бы обманом — цифра прыгнула бы вверх.
 *
 * Почему НЕ через override интервала (как сундук лиги и turbo_regen).
 * Override меняет длину интервала целиком и на период. При паузе он вернул бы
 * интервал к 30 минутам, и уже накопленный прогресс пересчитался бы по новой
 * длине — таймер прыгал бы вверх-вниз на каждой паузе. Здесь вместо этого
 * сдвигается `lastRecoveryTime`: для всех трёх читателей энергии
 * (EnergyContext, energy_system, energy_peek_cache) это выглядит как «прошло
 * больше времени», и правок им не требуется.
 *
 * История бага: первая версия срезала остаток пропорционально просмотренному
 * (минута за три). Арифметически честно, но на экране читалось не как
 * «10 минут»: включив видео при остатке 28 минут, человек видел 28, потом 26…
 * Владелец справедливо указал, что договаривались о другом.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { getEnergyRecoveryIntervalMs } from './remote_flags';
import { withStorageLock } from './storage_mutex';

const ENERGY_STORAGE_KEY = 'energy_state';

/**
 * Остаток до следующей единицы, пока видео играет. Ровно то число, которое
 * назвал владелец: «1 энергия за 10 минут во время просмотра».
 */
export const VIDEO_WATCH_TARGET_RECOVERY_MS = 10 * 60 * 1000;

/**
 * Целевой остаток, к которому подтягивается таймер при живом просмотре.
 * Никогда не больше базового интервала: если пульт опустит базу ниже 10 минут,
 * просмотр просто перестаёт что-либо менять, но никогда не ЗАМЕДЛЯЕТ.
 */
export function getVideoWatchTargetRemainingMs(): number {
  const base = getEnergyRecoveryIntervalMs();
  if (!Number.isFinite(base) || base <= 0) return VIDEO_WATCH_TARGET_RECOVERY_MS;
  return Math.min(VIDEO_WATCH_TARGET_RECOVERY_MS, base);
}

/**
 * Отрезки короче этого не засчитываем: случайный тап «плей/пауза» не должен
 * плодить записи на диск.
 */
const MIN_CREDITED_SEGMENT_MS = 1000;

type StoredEnergy = { current?: unknown; lastRecoveryTime?: unknown };

export type WatchCreditOutcome =
  | { applied: false; reason: string }
  | { applied: true; watchedMs: number; bonusMs: number; lastRecoveryTime: number };

/**
 * Подтягивает остаток до следующей единицы к 10 минутам, пока идёт просмотр.
 * Возвращает исход — вызывающий решает, обновлять ли UI.
 *
 * Пишем под общим `withStorageLock`: тот же ключ трогают трата энергии, долив и
 * подарки — читать-менять-писать без замка означало бы потерянную запись.
 *
 * ВАЖНО: функция НЕ проверяет ни премиум, ни готовность энергии — это забота
 * вызывающего (см. use_video_watch_energy_boost). Здесь только арифметика и диск.
 */
export async function creditVideoWatchSegment(watchedMs: number): Promise<WatchCreditOutcome> {
  const rawWatched = Number(watchedMs);
  if (!Number.isFinite(rawWatched) || rawWatched < MIN_CREDITED_SEGMENT_MS) {
    // зачем: ранний выход обязан называть причину — немой возврат уже прятал
    // мёртвые механизмы в этом проекте (см. CLAUDE.md «сперва логи»).
    return { applied: false, reason: `segment_too_short:${rawWatched}` };
  }

  try {
    return await withStorageLock(async (): Promise<WatchCreditOutcome> => {
      const raw = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      if (!raw) {
        // Состояния ещё нет: энергия полная по определению (её создаст первая
        // загрузка с максимумом). Ускорять нечего.
        return { applied: false, reason: 'no_energy_state' };
      }
      let parsed: StoredEnergy;
      try {
        parsed = JSON.parse(raw) as StoredEnergy;
      } catch (e) {
        DebugLogger.error(
          'energy_video_watch_credit:parse',
          e instanceof Error ? e : new Error(String(e)),
          'warning',
        );
        return { applied: false, reason: 'corrupt_energy_state' };
      }
      if (!parsed || typeof parsed !== 'object') {
        return { applied: false, reason: 'energy_state_not_object' };
      }
      const lastRecoveryTime = Number(parsed.lastRecoveryTime);
      if (!Number.isFinite(lastRecoveryTime) || lastRecoveryTime <= 0) {
        // Битую метку чинит обычная загрузка; не подменяем её своей.
        return { applied: false, reason: `bad_last_recovery_time:${parsed.lastRecoveryTime}` };
      }

      const now = Date.now();
      const interval = getEnergyRecoveryIntervalMs();
      const target = getVideoWatchTargetRemainingMs();
      // Остаток считаем той же формулой, что и EnergyContext (см. строку с
      // `recoveryMsRef.current - (elapsed % recoveryMsRef.current)`) — иначе
      // значок над плеером и полоска энергии показывали бы разные числа.
      const elapsed = Math.max(0, now - lastRecoveryTime);
      const remaining = interval - (elapsed % interval);

      // Уже быстрее целевого (или ровно на нём) — трогать нечего. Ускорение
      // никогда не удлиняет ожидание: остаток 5 минут так и останется пятью.
      if (remaining <= target) {
        return { applied: false, reason: `already_faster:remaining=${remaining} target=${target}` };
      }

      // Подтягиваем метку назад ровно настолько, чтобы остаток стал целевым.
      const cut = remaining - target;
      const shifted = lastRecoveryTime - cut;

      const next = { ...parsed, lastRecoveryTime: shifted };
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(next));
      return {
        applied: true,
        watchedMs: Math.floor(rawWatched),
        bonusMs: cut,
        lastRecoveryTime: shifted,
      };
    });
  } catch (e) {
    DebugLogger.error(
      'energy_video_watch_credit:write',
      e instanceof Error ? e : new Error(String(e)),
      'warning',
    );
    return { applied: false, reason: 'storage_error' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
