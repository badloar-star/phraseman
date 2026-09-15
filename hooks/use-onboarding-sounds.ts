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
    // зачем (решение владельца 2026-09-15): ответы озвучиваются только
    // вибрацией. Демо онбординга следует тому же правилу; интерфейс хука
    // сохранён, чтобы не трогать сценарий показа.
    playDemoCorrect: () => undefined,
    playPlanReady: () => request('pm.complete.micro', 'plan-ready'),
    playPurchaseSuccess: () => request('pm.reward.premium_open', 'purchase-success'),
  }), []);
}
