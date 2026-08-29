import { useCallback } from 'react';
import { soundDirector } from '../modules/audio/sound_director';

/** Compatibility hook for screens that have not migrated to FeedbackKit yet. */
export function useCorrectSound() {
  const playCorrect = useCallback((): void => {
    soundDirector.request('pm.learn.correct');
  }, []);

  return { playCorrect };
}
