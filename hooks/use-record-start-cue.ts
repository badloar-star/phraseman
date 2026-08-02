import { useCallback } from 'react';
import { Platform } from 'react-native';

import { soundDirector } from '../modules/audio/sound_director';
import { hapticMediumImpact } from './use-haptics';

/**
 * Call at recognizer readiness, immediately before microphone capture begins.
 * Android intentionally remains haptic-only to avoid smearing the first word.
 */
export function useRecordStartCue() {
  const playRecordStart = useCallback(() => {
    void hapticMediumImpact();
    if (Platform.OS === 'android') return;
    soundDirector.request('pm.voice.record_ready', {
      scope: 'voice-capture',
      dedupeKey: 'record-ready',
    });
  }, []);

  return { playRecordStart };
}
