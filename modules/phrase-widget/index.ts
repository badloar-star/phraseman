/**
 * phrase-widget — thin JS facade over the native widget bridge.
 *
 * Native implementations live in:
 *   - ios/PhraseWidgetModule.swift      (writes App Group UserDefaults)
 *   - android/.../PhraseWidgetModule.kt (writes SharedPreferences)
 *
 * In environments without the native module (Expo Go, web, tests) every method
 * is a safe no-op and `isAvailable()` returns false, so callers can stay simple.
 */

import { requireOptionalNativeModule } from 'expo-modules-core';

import type { WidgetPayload } from './types';

interface PhraseWidgetNativeModule {
  /** Persist the snapshot to platform shared storage. */
  setData(payload: WidgetPayload): Promise<void>;
  /** Ask the OS to refresh all timelines / app widget instances. */
  reloadAll(): Promise<void>;
}

const nativeModule = requireOptionalNativeModule<PhraseWidgetNativeModule>('PhraseWidget');

function isAvailable(): boolean {
  return nativeModule != null;
}

async function setData(payload: WidgetPayload): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.setData(payload);
}

async function reloadAll(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.reloadAll();
}

export default { isAvailable, setData, reloadAll };
export type { WidgetPayload };
