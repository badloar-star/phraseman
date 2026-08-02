import { useCallback } from 'react';

import { soundDirector } from '../modules/audio/sound_director';

/**
 * Cue for "I did not catch that" — recognition ended without usable speech.
 *
 * зачем: у распознавания это НЕ ошибка и НЕ ноль процентов, а отдельный исход
 * («не расслышал, скажи громче»). Раньше он был слышен только хаптикой, и на
 * тихом Android-телефоне пользователь не понимал, что попытка вообще закончилась.
 *
 * dedupeKey один на все ветки: сколько бы путей ни привело к «не расслышал»
 * (пустой транскрипт, nomatch, отказ микрофона, сбой старта), для пользователя
 * это одно событие, и звучать оно должно один раз.
 */
export function useNoSpeechCue() {
  const playNoSpeech = useCallback(() => {
    soundDirector.request('pm.voice.no_speech', {
      scope: 'voice-capture',
      dedupeKey: 'no-speech',
    });
  }, []);

  return { playNoSpeech };
}
