import { useSyncExternalStore } from 'react';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';

// Session-local QA switch. Never persisted and never clears user-owned history.
let enabled = false;
const listeners = new Set<() => void>();
export function isDevFeatureIntroReplayEnabled(): boolean {
  return ENABLE_DEV_TOOLS && !IS_STORE_RELEASE && enabled;
}
export function setDevFeatureIntroReplay(value: boolean): void {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE || value === enabled) return;
  enabled = value;
  listeners.forEach(listener => listener());
}
export function subscribeDevFeatureIntroReplay(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useDevFeatureIntroReplay(): boolean {
  return useSyncExternalStore(subscribeDevFeatureIntroReplay, isDevFeatureIntroReplayEnabled, () => false);
}
