import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

// Новый звук правильного ответа (universfield notification-018) — тот же, что и
// в FeedbackKit, чтобы правильный ответ звучал одинаково ВЕЗДЕ.
const CORRECT_SOUND = require('../assets/audio/correct_new.mp3');

export function useCorrectSound() {
  const player = useAudioPlayer(CORRECT_SOUND);

  useEffect(() => {
    return () => {
      try { player.remove(); } catch {}
    };
  }, [player]);

  const playCorrect = useCallback(() => {
    try {
      player.volume = 0.7;
      player.seekTo(0);
      player.play();
    } catch {}
  }, [player]);

  return { playCorrect };
}
