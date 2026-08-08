import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Platform, type PlatformOSType } from 'react-native';

export const PLATFORM_UI_PREVIEW_STORAGE_KEY = 'platform_ui_preview_mode';

/** `real` — настоящее устройство; иначе подмена для QA (экран тестеров). */
export type PlatformUiPreviewMode = 'real' | 'ios' | 'android';

let mode: PlatformUiPreviewMode = 'real';
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

export function subscribePlatformUiPreview(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlatformUiPreviewMode(): PlatformUiPreviewMode {
  return mode;
}

/** Для веток «как на Android / как на iOS» в интерфейсе. Не подменяйте этим нативные SDK. */
export function getEffectivePlatformOS(): PlatformOSType {
  if (mode === 'ios') return 'ios';
  if (mode === 'android') return 'android';
  return Platform.OS;
}

export async function hydratePlatformUiPreviewFromStorage(): Promise<void> {
  try {
    const v = await AsyncStorage.getItem(PLATFORM_UI_PREVIEW_STORAGE_KEY);
    if (v === 'ios' || v === 'android') mode = v;
    else mode = 'real';
    notify();
  } catch {
    /* ignore */
  }
}

export function useEffectivePlatformOS(): PlatformOSType {
  return useSyncExternalStore(subscribePlatformUiPreview, getEffectivePlatformOS, getEffectivePlatformOS);
}
