import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  claimRecordingAudio,
  type RecordingAudioClaim,
  whenRecordingAudioReady,
} from '../modules/audio/audio_runtime_arbiter';

/** One mounted microphone surface = one revocable process-wide recording owner. */
export function useManagedRecordingAudio(stopCapture: () => void): Readonly<{
  begin(): Promise<boolean>;
  release(): void;
  isCurrent(): boolean;
}> {
  const stopCaptureRef = useRef(stopCapture);
  stopCaptureRef.current = stopCapture;
  const claimRef = useRef<RecordingAudioClaim | null>(null);

  const release = useCallback(() => {
    claimRef.current?.release();
    claimRef.current = null;
  }, []);

  const begin = useCallback(async (): Promise<boolean> => {
    let claim: RecordingAudioClaim | null = null;
    claim = claimRecordingAudio(() => {
      // зачем (2026-09-14): отзыв претензии — единственная причина, по которой
      // живой микрофон гасится извне; без лога это выглядело как «сам сломался».
      console.warn('[SPEAK-MIC] recording-claim:revoked', JSON.stringify({ wasCurrent: claimRef.current === claim })); // guard-ok: трасса владельца
      if (claimRef.current === claim) claimRef.current = null;
      try { stopCaptureRef.current(); } catch (e) {
        console.warn('[SPEAK-MIC] recording-claim:stop_threw', e instanceof Error ? e.message : String(e)); // guard-ok: трасса владельца
      }
    });
    claimRef.current = claim;
    const ready = await whenRecordingAudioReady(claim);
    if (!ready || !claim.isCurrent()) {
      console.warn('[SPEAK-MIC] recording-claim:not_ready', JSON.stringify({ ready, isCurrent: claim.isCurrent() })); // guard-ok: трасса владельца
      claim.release();
      if (claimRef.current === claim) claimRef.current = null;
      return false;
    }
    return true;
  }, []);

  const isCurrent = useCallback(() => claimRef.current?.isCurrent() === true, []);
  useEffect(() => release, [release]);
  return useMemo(() => ({ begin, release, isCurrent }), [begin, isCurrent, release]);
}
