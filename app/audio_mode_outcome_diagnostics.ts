import type { ManagedAudioModeResult } from './audio_session_coordinator';
import { noteSwallowed } from './swallow_log';

export function reportRootAudioModeOutcome(result: ManagedAudioModeResult): void {
  if (result.outcome === 'applied') return;
  noteSwallowed(
    '_layout:useEffect.setManagedAudioMode',
    new Error(`managed audio mode outcome: ${result.outcome}`),
  );
}

export function reportYoutubeAudioModeOutcome(result: ManagedAudioModeResult): void {
  if (result.outcome === 'applied') return;
  console.warn('[VIDEO-PLAYER] режим звука не вернулся', result.outcome); // guard-ok: bounded native mode failure/timeout on player cleanup
}
