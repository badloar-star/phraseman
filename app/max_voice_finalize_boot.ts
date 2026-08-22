import { AppState } from 'react-native';

import { getStableId } from './stable_id';
import { drainOneMaxFinalize } from './max_voice_finalize_client';

let drainInFlight: Promise<void> | null = null;

export function drainOnePendingMaxFinalize(): Promise<void> {
  if (drainInFlight) return drainInFlight;
  drainInFlight = (async () => {
    const accountKey = await getStableId();
    await drainOneMaxFinalize(accountKey);
  })().catch(() => {
    // The account-scoped outbox remains durable for the next foreground pass.
  }).finally(() => {
    drainInFlight = null;
  });
  return drainInFlight;
}

export function installMaxVoiceFinalizeBootDrain(): () => void {
  void drainOnePendingMaxFinalize();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    void drainOnePendingMaxFinalize();
  });
  return () => subscription.remove();
}

