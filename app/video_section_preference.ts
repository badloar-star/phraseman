import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'video_section_enabled_v1';

// null while storage is loading. Video screens and requests wait for the saved choice.
let enabled: boolean | null = null;
let requests: AbortController | null = null;
let hydration: Promise<void> | undefined;
let writes = Promise.resolve();
const listeners = new Set<() => void>();

function publish(value: boolean): void {
  if (value === enabled) return;
  enabled = value;
  if (value) {
    requests = new AbortController();
  } else {
    requests?.abort();
    requests = null;
  }
  for (const listener of listeners) listener();
}

export function hydrateVideoSectionPreference(): Promise<void> {
  hydration ??= AsyncStorage.getItem(STORAGE_KEY).then(
    (value) => { if (enabled === null) publish(value !== 'false'); },
    (error: unknown) => {
      console.warn('[VIDEO-SETTINGS] read_failed', error);
      if (enabled === null) publish(true);
    },
  );
  return hydration;
}

export function setVideoSectionEnabled(value: boolean): Promise<void> {
  publish(value);
  writes = writes.then(() => AsyncStorage.setItem(STORAGE_KEY, String(value))).catch((error: unknown) => {
    console.warn('[VIDEO-SETTINGS] write_failed', error);
  });
  return writes;
}

export function getVideoSectionSignal(): AbortSignal | null {
  return requests?.signal ?? null;
}

export function assertVideoRequestActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('Video request cancelled');
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getPreference(): boolean | null {
  return enabled;
}

export function useVideoSectionPreference(): boolean | null {
  return useSyncExternalStore(subscribe, getPreference, getPreference);
}

export default function __RouteShim() { return null; }
