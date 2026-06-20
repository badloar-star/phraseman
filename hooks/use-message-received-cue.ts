import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import { hapticTap } from './use-haptics';

// Canonical "new message from the team arrived" cue: a short whoosh that swells
// into a warm rising two-note pop (A5 → C#6) — a friendly "you've got mail"
// feel. Single source of truth so every place that announces an inbound app
// message sounds identical. Mirrors the use-record-start-cue pattern
// (expo-audio's useAudioPlayer). The asset is synthesized in-house (royalty-free).
const MESSAGE_RECEIVED_SOUND = require('../assets/audio/message_received.mp3');

// Gentle: this plays unprompted when a message lands, so it must feel like a
// soft notification, never startle. Slightly under the record-start cue.
const MESSAGE_RECEIVED_VOLUME = 0.5;

/**
 * Returns `playMessageReceived()` — call it the moment a new app message flies
 * into the header icon, in sync with the envelope animation.
 *
 * Both the sound and the haptic are best-effort: volume off, a missing asset,
 * or disabled haptics must never break anything, so the call is fully guarded.
 */
export function useMessageReceivedCue() {
  const player = useAudioPlayer(MESSAGE_RECEIVED_SOUND);

  useEffect(() => {
    return () => {
      try {
        player.remove();
      } catch {
        // player may already be torn down on unmount — safe to ignore
      }
    };
  }, [player]);

  const playMessageReceived = useCallback(() => {
    void hapticTap();
    try {
      player.volume = MESSAGE_RECEIVED_VOLUME;
      player.seekTo(0);
      player.play();
    } catch {
      // no audio output / asset issue — the haptic already fired, UX goes on
    }
  }, [player]);

  return { playMessageReceived };
}
