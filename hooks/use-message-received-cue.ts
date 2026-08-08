import { useCallback } from 'react';

import { soundDirector } from '../modules/audio/sound_director';
import { hapticTap } from './use-haptics';

/** In-app inbox notification; the director applies dedupe, cooldown and voice deferral. */
export function useMessageReceivedCue() {
  const playMessageReceived = useCallback(() => {
    void hapticTap();
    soundDirector.request('pm.system.info', {
      scope: 'app-message',
      dedupeKey: 'received',
      deferAfterVoice: true,
    });
  }, []);

  // The canonical info cue is short and self-limiting. Existing callers keep a
  // stop callback for source compatibility; later high-priority events preempt it.
  const stopMessageReceived = useCallback(() => {}, []);

  return { playMessageReceived, stopMessageReceived };
}
