import { useCallback } from 'react';

import { soundDirector } from '../modules/audio/sound_director';

/**
 * Cue for "your turn to speak" in the conversational AI dialogue.
 *
 * зачем: это НЕ то же самое, что pm.voice.record_ready. record_ready звучит
 * ПОСЛЕ того, как пользователь уже зажал микрофон, и подтверждает «движок
 * слушает». turn_ready звучит РАНЬШЕ и сам по себе: собеседник договорил,
 * микрофон снова доступен — ход перешёл к пользователю. Без него конец
 * реплики ИИ был не слышен, и человек либо перебивал, либо ждал впустую.
 */
export function useTurnReadyCue() {
  const playTurnReady = useCallback(() => {
    soundDirector.request('pm.voice.turn_ready', {
      scope: 'voice-dialogue',
      dedupeKey: 'turn-ready',
    });
  }, []);

  return { playTurnReady };
}
