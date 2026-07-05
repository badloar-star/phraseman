import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import { hapticMediumImpact } from './use-haptics';

// Canonical "recording started" cue: a short rising two-tone chime + a distinct
// medium haptic. This is the SINGLE source of truth for the start-of-recording
// feedback so every voice mode (lesson "Устно", personal-plan pronunciation,
// any future speaking surface) sounds and feels identical. Mirrors the
// use-correct-sound pattern (expo-audio's useAudioPlayer).
const RECORD_START_SOUND = require('../assets/audio/record_start.mp3');

// Slightly louder than the "correct" tick (0.1): this is a deliberate signal
// that the mic is now live, but still gentle so it never clips into the speech.
const RECORD_START_VOLUME = 0.6;

/**
 * Returns `playRecordStart()` — call it the instant the microphone actually
 * starts listening (after permission is granted), so the user gets an
 * unmistakable audible + tactile confirmation that recording has begun.
 *
 * Both the sound and the haptic are best-effort: a device with the volume off,
 * a missing asset, or haptics disabled must never break the recording flow, so
 * every call is wrapped and failures are swallowed.
 */
export function useRecordStartCue() {
  const player = useAudioPlayer(RECORD_START_SOUND);

  useEffect(() => {
    return () => {
      try {
        player.remove();
      } catch {
        // player may already be torn down on unmount — safe to ignore
      }
    };
  }, [player]);

  const playRecordStart = useCallback(() => {
    // Tactile half of the cue: a medium impact reads as "something started",
    // distinct from the light tap used for ordinary button presses.
    void hapticMediumImpact();
    // On Android the start chime steals audio focus / smears the first word while
    // the recognizer warms up (same reason personal_plan_exercise gates it). The
    // haptic above is the confirmation there; the sound only plays on iOS.
    if (Platform.OS === 'android') return;
    try {
      player.volume = RECORD_START_VOLUME;
      player.seekTo(0);
      player.play();
    } catch {
      // no audio output / asset issue — the haptic already fired, recording goes on
    }
  }, [player]);

  return { playRecordStart };
}
