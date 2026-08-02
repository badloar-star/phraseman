import { useCallback } from 'react';

import { soundDirector } from '../modules/audio/sound_director';

/**
 * Compatibility hook for the final countdown. Repeated calls are intentionally
 * collapsed by the catalog cooldown instead of producing one tick per second.
 *
 * зачем: владелец попросил, чтобы у таймера звучали ОБА края — предупреждение
 * на последних секундах и момент «время вышло». Держим их в одном хуке, потому
 * что это один и тот же таймер: экран не должен знать про два разных id и про
 * то, какой scope/dedupeKey у каждого.
 */
export function useTimerTickCue() {
  const playTimerTick = useCallback(() => {
    soundDirector.request('pm.learn.timer_warning', {
      scope: 'phase-timer',
      dedupeKey: 'warning',
    });
  }, []);

  /**
   * зачем: dedupeKey отличается от предупреждения — иначе арбитр схлопнул бы
   * истечение как повтор тика, и самый важный край таймера остался бы немым.
   */
  const playTimerExpired = useCallback(() => {
    soundDirector.request('pm.learn.timer_expired', {
      scope: 'phase-timer',
      dedupeKey: 'expired',
    });
  }, []);

  return { playTimerTick, playTimerExpired };
}
