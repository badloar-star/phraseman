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
      if (claimRef.current === claim) claimRef.current = null;
      try { stopCaptureRef.current(); } catch { /* native capture already gone */ }
    });
    claimRef.current = claim;
    const ready = await whenRecordingAudioReady(claim);
    if (!ready || !claim.isCurrent()) {
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
