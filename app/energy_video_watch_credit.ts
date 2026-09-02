/**
 * Ускорение восстановления энергии за просмотр видео.
 *
 * зачем (владелец 2026-09-02): пока человек смотрит видео в приложении, единица
 * энергии обязана восстанавливаться за 10 минут вместо обычных 30. Владелец
 * выбрал «честный зачёт просмотра»: ускоряется не абстрактный период, а РОВНО
 * то время, что видео реально играло. Посмотрел 10 минут — эти 10 минут
 * засчитались как 30. Поставил на паузу — зачёт мгновенно прекращается.
 *
 * Почему НЕ через override интервала (как сундук лиги и turbo_regen).
 * Override меняет длину интервала целиком и на период. Он не умеет «полминуты
 * быстро, полминуты обычно»: при паузе интервал вернулся бы к 30 минутам, и
 * уже накопленный прогресс пересчитался бы по новой длине — таймер прыгал бы
 * вверх-вниз на каждой паузе. Поэтому здесь другой механизм: мы не трогаем
 * интервал, а сдвигаем `lastRecoveryTime` назад на подаренное время. Для всех
 * трёх читателей энергии (EnergyContext, energy_system, energy_peek_cache) это
 * выглядит как «прошло больше времени» — они считают `now - lastRecoveryTime` и
 * не требуют ни строчки правок.
 *
 * Сдвиг назад безопасен: он лишь приближает момент долива, никогда не отнимает
 * энергию и не может дать больше, чем реально просмотрено × множитель.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { getEnergyRecoveryIntervalMs } from './remote_flags';
import { withStorageLock } from './storage_mutex';

const ENERGY_STORAGE_KEY = 'energy_state';

/** Целевой интервал восстановления, пока видео реально играет. */
// зачем: владелец назвал ровно эти числа — 10 минут вместо 30. Живут здесь
// одной парой, чтобы множитель нельзя было разъехать с целевым интервалом.
export const VIDEO_WATCH_TARGET_RECOVERY_MS = 10 * 60 * 1000;

/**
 * Во сколько раз минута просмотра «стоит» дороже обычной минуты.
 * База 30 мин / цель 10 мин = 3. Считается от ЖИВОГО интервала (пульт может
 * менять базу), поэтому это функция, а не константа.
 */
export function getVideoWatchSpeedMultiplier(): number {
  const base = getEnergyRecoveryIntervalMs();
  if (!Number.isFinite(base) || base <= 0) return 1;
  const multiplier = base / VIDEO_WATCH_TARGET_RECOVERY_MS;
  // Ускорение, а не замедление: если пульт опустит базу ниже 10 минут, просмотр
  // просто перестаёт что-либо менять, но никогда не тормозит восстановление.
  return multiplier > 1 ? multiplier : 1;
}

/**
 * Сколько «лишнего» времени дарит один отрезок просмотра.
 * 10 минут просмотра при множителе 3 → 20 минут сверх реально прошедших.
 */
export function watchedMsToBonusMs(watchedMs: number): number {
  if (!Number.isFinite(watchedMs) || watchedMs <= 0) return 0;
  const multiplier = getVideoWatchSpeedMultiplier();
  if (multiplier <= 1) return 0;
  return Math.floor(watchedMs * (multiplier - 1));
}

/**
 * Отрезки короче этого не засчитываем: случайный тап «плей/пауза» не должен
 * плодить записи на диск. Одна секунда просмотра всё равно ничего не решает.
 */
const MIN_CREDITED_SEGMENT_MS = 1000;

/**
 * Потолок ОДНОГО отрезка. Защищает от испорченных часов и от «телефон уснул
 * с открытым плеером на всю ночь»: WebView в фоне всё равно не играет, а
 * гигантский отрезок мгновенно залил бы весь запас. 30 минут непрерывного
 * просмотра за раз — с запасом для самого длинного урока.
 */
const MAX_CREDITED_SEGMENT_MS = 30 * 60 * 1000;

type StoredEnergy = { current?: unknown; lastRecoveryTime?: unknown };

export type WatchCreditOutcome =
  | { applied: false; reason: string }
  | { applied: true; watchedMs: number; bonusMs: number; lastRecoveryTime: number };

/**
 * Засчитывает отрезок просмотра: сдвигает `lastRecoveryTime` назад на бонусное
 * время. Возвращает исход — вызывающий решает, обновлять ли UI.
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
  const clampedWatched = Math.min(rawWatched, MAX_CREDITED_SEGMENT_MS);
  const bonusMs = watchedMsToBonusMs(clampedWatched);
  if (bonusMs <= 0) {
    return { applied: false, reason: `no_bonus:multiplier=${getVideoWatchSpeedMultiplier()}` };
  }

  try {
    return await withStorageLock(async (): Promise<WatchCreditOutcome> => {
      const raw = await AsyncStorage.getItem(ENERGY_STORAGE_KEY);
      if (!raw) {
        // Состояния ещё нет: энергия полная по определению (её создаст первая
        // загрузка с максимумом). Дарить нечего.
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
      // Потолок сдвига: метка не должна уехать в будущее и не должна уйти
      // дальше, чем «прямо сейчас минус один полный интервал». Иначе накопленный
      // бонус превратился бы в пачку энергии за один кадр, а лишнее всё равно
      // сгорает при доливе до максимума — храним только один шаг вперёд.
      const floor = now - getEnergyRecoveryIntervalMs();
      const shifted = Math.max(floor, lastRecoveryTime - bonusMs);
      if (shifted >= lastRecoveryTime) {
        return { applied: false, reason: 'already_at_floor' };
      }

      const next = { ...parsed, lastRecoveryTime: shifted };
      await AsyncStorage.setItem(ENERGY_STORAGE_KEY, JSON.stringify(next));
      return {
        applied: true,
        watchedMs: clampedWatched,
        bonusMs: lastRecoveryTime - shifted,
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
