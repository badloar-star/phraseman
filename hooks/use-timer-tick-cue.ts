import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

// Canonical "phase timer running out" cue: reuses the same clean tick asset
// used across the app's UI sound pack (assets/audio/ui/tick.wav) — a crisp,
// non-cheap tick rather than a synthesized beep. Mirrors the
// use-message-received-cue pattern (expo-audio's useAudioPlayer).
const TIMER_TICK_SOUND = require('../assets/audio/ui/tick.wav');

const TIMER_TICK_VOLUME = 0.55;

/**
 * Returns `playTimerTick()` — call it once per second while a phase deadline
 * has ≤3s left, so the player hears the countdown instead of only seeing it.
 * Best-effort: a missing asset or disabled audio must never throw.
 */
export function useTimerTickCue() {
  const player = useAudioPlayer(TIMER_TICK_SOUND);

  useEffect(() => {
    return () => {
      try {
        player.remove();
      } catch {
        // player may already be torn down on unmount — safe to ignore
      }
    };
  }, [player]);

  const playTimerTick = useCallback(() => {
    try {
      player.volume = TIMER_TICK_VOLUME;
      player.seekTo(0);
      player.play();
    } catch {
      // no audio output / asset issue — silent is fine, timer is still visible
    }
  }, [player]);

  return { playTimerTick };
}
