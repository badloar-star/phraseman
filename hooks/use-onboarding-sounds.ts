import { useMemo } from 'react';

import { soundDirector } from '../modules/audio/sound_director';
import type { SoundEventId } from '../modules/audio/sound_events';

export interface OnboardingSounds {
  playDemoCorrect: () => void;
  playPlanReady: () => void;
  playPurchaseSuccess: () => void;
}

function request(eventId: SoundEventId, dedupeKey: string): void {
  soundDirector.request(eventId, {
    scope: 'onboarding',
    dedupeKey,
  });
}

/** Compatibility hook; playback ownership and volume live in Sound Director. */
export function useOnboardingSounds(): OnboardingSounds {
  return useMemo(() => ({
    playDemoCorrect: () => request('pm.learn.correct', 'demo-correct'),
    playPlanReady: () => request('pm.complete.micro', 'plan-ready'),
    playPurchaseSuccess: () => request('pm.reward.premium_open', 'purchase-success'),
  }), []);
}
