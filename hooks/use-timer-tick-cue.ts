import { useCallback } from 'react';

import { soundDirector } from '../modules/audio/sound_director';
import type { SoundRequestOptions } from '../modules/audio/sound_arbiter';

/**
 * Compatibility hook for the final countdown. The catalog cooldown (700ms)
 * only collapses sub-second bursts of duplicate requests; the honest
 * once-per-second tick cadence passes through and is heard in full.
 *
 * зачем 2026-08-03 (владелец: «тики звучат непонятно как»): прежний кулдаун
 * 1200 мс был длиннее секундного шага и глотал каждый второй тик — ритм
 * отсчёта звучал случайным. Ритм задают экраны; кулдаун остался только
 * против дребезга внутри секунды.
 *
 * зачем: владелец попросил, чтобы у таймера звучали ОБА края — предупреждение
 * на последних секундах и момент «время вышло». Держим их в одном хуке, потому
 * что это один и тот же таймер: экран не должен знать про два разных id и про
 * то, какой scope/dedupeKey у каждого.
 *
 * зачем 2026-08-04 (владелец: «звуки в турнире работают рандомно и через
 * раз»): хук общий для 4 экранов (турнир, диагностика, экзамен, флеш-арена),
 * все раньше делили ОДИН scope 'phase-timer' и общий лимит арбитра 2/сек на
 * ВСЁ приложение. В турнире тик таймера конкурирует за тот же лимит с
 * вердиктом ответа и тапом по паре — легко случались в одну секунду и часть
 * звуков молча гасла. rateLimitOverride позволяет турнирному экрану завести
 * СВОЙ scope с приподнятым лимитом, не трогая остальные три экрана, у которых
 * событий в секунду меньше и исходный лимит достаточен.
 *
 * зачем 2026-08-04 (владелец, после того как rateLimit уже поднят): подъём
 * лимита закрыл гашение «слишком много звуков в секунду», но не гашение по
 * приоритету — тик (62) молча проигрывает, если в это же мгновение ещё
 * доигрывает вердикт ответа (68-70). queueIfBusy даёт тику ОДИН отложенный
 * шанс сыграть сразу после освобождения слота вместо немого исчезновения.
 * Опционален и не тронут для трёх остальных экранов без этого поля.
 */
export function useTimerTickCue(rateLimitOverride?: {
  scope: string;
  rateLimit: SoundRequestOptions['rateLimit'];
  queueIfBusy?: boolean;
}) {
  const scope = rateLimitOverride?.scope ?? 'phase-timer';
  const rateLimit = rateLimitOverride?.rateLimit;
  const queueIfBusy = rateLimitOverride?.queueIfBusy;

  const playTimerTick = useCallback(() => {
    soundDirector.request('pm.learn.timer_warning', {
      scope,
      dedupeKey: 'warning',
      rateLimit,
      queueIfBusy,
    });
  }, [scope, rateLimit, queueIfBusy]);

  /**
   * зачем: dedupeKey отличается от предупреждения — иначе арбитр схлопнул бы
   * истечение как повтор тика, и самый важный край таймера остался бы немым.
   */
  const playTimerExpired = useCallback(() => {
    soundDirector.request('pm.learn.timer_expired', {
      scope,
      dedupeKey: 'expired',
      rateLimit,
      queueIfBusy,
    });
  }, [scope, rateLimit, queueIfBusy]);

  return { playTimerTick, playTimerExpired };
}
