import { onAppEvent } from './events';
import { DebugLogger } from './debug-logger';

/**
 * Очередь «незабранных» наград для анимации сбора на Главной.
 *
 * зачем (владелец, 2026-09-01): «после того как пользователь заработал руны в
 * любом месте — урок, модалка, приз, спин — при возврате на главную они со
 * всех сторон анимированно собираются и влетают в счётчик, со звуком полёта».
 *
 * Почему отдельный модуль, а не состояние Главной: начисление случается там,
 * где Главной нет в дереве (урок, спин, модалка приза). События
 * `runes_balance_updated` / `shards_earned` летят В ЭТОТ МОМЕНТ и к возврату
 * домой давно потеряны. Очередь слушает их ВСЕГДА (подписка ставится один раз
 * на старте, из `app/_layout.tsx`) и копит дельты; Главная забирает накопленное
 * когда реально показана.
 *
 * Firestore/сеть не трогаются вообще: и то и другое событие уже эмитится
 * существующими кошельками, здесь только сумматор в памяти. Стоимости нет.
 *
 * ВАЖНО — очередь НЕ источник правды по балансу. Баланс живёт в снапшоте и
 * рисуется счётчиками сам; здесь лежит только «сколько прилетело с прошлого
 * показа», то есть материал для частиц. Потеря очереди (перезапуск приложения)
 * означает лишь пропущенную анимацию, а не потерянные руны.
 */

export type RewardFlightKind = 'runes' | 'shards';

export interface RewardFlightPending {
  readonly runes: number;
  readonly shards: number;
}

const EMPTY: RewardFlightPending = Object.freeze({ runes: 0, shards: 0 });

/**
 * Потолок накопления. Число частиц всё равно логарифмическое (см. оверлёт), но
 * держать в памяти бесконечно растущую сумму незачем: пользователю показывается
 * «прилетело много», а не точная сумма за месяц офлайна.
 */
const MAX_PENDING = 100000;

let pending: RewardFlightPending = EMPTY;
let listeners: Array<(value: RewardFlightPending) => void> = [];
let installed = false;

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_PENDING, Math.max(0, Math.round(value)));
}

function emit(): void {
  // Копия списка: слушатель вправе отписаться прямо из колбэка.
  for (const listener of [...listeners]) {
    try {
      listener(pending);
    } catch (error) {
      // Немой catch запрещён: молчащая ошибка одного подписчика не должна
      // ронять остальных, но обязана быть видна в логах.
      DebugLogger.warn(
        'reward_flight:listener_failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

function add(kind: RewardFlightKind, amount: number): void {
  const delta = clamp(amount);
  if (delta <= 0) return;
  pending = Object.freeze({
    runes: kind === 'runes' ? clamp(pending.runes + delta) : pending.runes,
    shards: kind === 'shards' ? clamp(pending.shards + delta) : pending.shards,
  });
  DebugLogger.info(
    'reward_flight:enqueued',
    JSON.stringify({ kind, delta, pending }),
  );
  emit();
}

/** Ручная постановка в очередь — для источников без собственного события. */
export function enqueueRewardFlight(kind: RewardFlightKind, amount: number): void {
  add(kind, amount);
}

/** Что накопилось и ещё не проигрывалось. Синхронно, без сети. */
export function peekPendingRewardFlight(): RewardFlightPending {
  return pending;
}

/**
 * Забрать накопленное и очистить очередь.
 *
 * Забирает ВСЁ разом и сразу обнуляет: если анимация не доиграет (экран закрыли,
 * reduce-motion), награда всё равно уже на балансе — повторно «собирать» её
 * нечего, иначе один и тот же приз летел бы в счётчик каждый вход на Главную.
 */
export function consumePendingRewardFlight(): RewardFlightPending {
  const taken = pending;
  if (taken.runes === 0 && taken.shards === 0) return EMPTY;
  pending = EMPTY;
  DebugLogger.info('reward_flight:consumed', JSON.stringify(taken));
  emit();
  return taken;
}

/** Сброс без проигрывания — смена аккаунта: чужие награды не летят новому. */
export function resetRewardFlightQueue(): void {
  if (pending.runes === 0 && pending.shards === 0) return;
  DebugLogger.info('reward_flight:reset', JSON.stringify(pending));
  pending = EMPTY;
  emit();
}

export function subscribeRewardFlight(
  listener: (value: RewardFlightPending) => void,
): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

/**
 * Поставить подписки на кошельки. Зовётся ОДИН раз из `app/_layout.tsx`.
 *
 * зачем именно там: начисление за спин прилетает уже на старте (см. комментарий
 * в _layout про `runes_balance_updated`), а Главная к этому моменту может быть
 * ещё не смонтирована. Подписка на уровне приложения не пропускает ничего.
 */
export function installRewardFlightQueue(): () => void {
  if (installed) return () => {};
  installed = true;

  // Руны: слушаем ДЕЛЬТУ, а не баланс. Трата (delta < 0) в счётчик не летит —
  // «собирается» только заработанное, покупка не должна выглядеть наградой.
  const runesSub = onAppEvent('runes_balance_updated', (payload) => {
    const delta = Number(payload?.delta) || 0;
    if (delta <= 0) {
      DebugLogger.info(
        'reward_flight:runes_skipped',
        JSON.stringify({ delta, reason: delta === 0 ? 'zero' : 'spend' }),
      );
      return;
    }
    add('runes', delta);
  });

  // Жемчужины: у них есть собственное событие начисления с суммой, поэтому
  // считать дельту из баланса не нужно (и нельзя — `shards_balance_updated`
  // летит и на тратах, и на замене баланса).
  const shardsSub = onAppEvent('shards_earned', (payload) => {
    const amount = Number(payload?.amount) || 0;
    if (amount <= 0) {
      DebugLogger.info('reward_flight:shards_skipped', JSON.stringify({ amount }));
      return;
    }
    add('shards', amount);
  });

  return () => {
    installed = false;
    runesSub.remove();
    shardsSub.remove();
  };
}
