import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

const CORRECT_SOUND = require('../assets/audio/correct.mp3');

export function useCorrectSound() {
  const player = useAudioPlayer(CORRECT_SOUND);

  useEffect(() => {
    return () => {
      try { player.remove(); } catch {}
    };
  }, [player]);

  const playCorrect = useCallback(() => {
    try {
      player.volume = 0.1;
      player.seekTo(0);
      player.play();
    } catch {}
  }, [player]);

  return { playCorrect };
}
