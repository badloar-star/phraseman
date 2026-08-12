import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { AudioPlayer } from 'expo-audio';
import {
  claimSpokenAudio,
  type SpokenAudioClaim,
  whenSpokenAudioReady,
} from '../modules/audio/audio_runtime_arbiter';

/**
 * Gives an expo-audio hook player process-wide spoken-audio ownership.
 * useAudioPlayer owns native disposal; this hook owns only play/pause/session
 * lifetime and makes every delayed seek/play conditional on the same claim.
 */
export function useManagedSpokenAudioPlayer(
  player: AudioPlayer,
  didJustFinish = false,
): Readonly<{
  playFromStart(): Promise<boolean>;
  stop(): void;
}> {
  const claimRef = useRef<SpokenAudioClaim | null>(null);

  const stop = useCallback(() => {
    claimRef.current?.release();
    claimRef.current = null;
    try { player.pause(); } catch { /* hook player may already be released */ }
  }, [player]);

  const playFromStart = useCallback(async (): Promise<boolean> => {
    let claim: SpokenAudioClaim | null = null;
    claim = claimSpokenAudio(() => {
      try { player.pause(); } catch { /* hook player may already be released */ }
      if (claimRef.current === claim) claimRef.current = null;
    });
    if (!claim) return false;
    claimRef.current = claim;

    const ready = await whenSpokenAudioReady(claim);
    if (!ready || !claim.isCurrent()) {
      claim.release();
      if (claimRef.current === claim) claimRef.current = null;
      return false;
    }
    try {
      await player.seekTo(0);
      if (!claim.isCurrent()) return false;
      player.play();
      return true;
    } catch {
      claim.release();
      if (claimRef.current === claim) claimRef.current = null;
      return false;
    }
  }, [player]);

  useEffect(() => {
    if (!didJustFinish) return;
    claimRef.current?.release();
    claimRef.current = null;
  }, [didJustFinish]);

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ playFromStart, stop }), [playFromStart, stop]);
}
