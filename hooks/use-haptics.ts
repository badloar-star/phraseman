import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedHapticTap: boolean | null = null;

// Синхронный кэш — читаем при старте приложения
AsyncStorage.getItem('haptics_tap').then(val => {
  cachedHapticTap = val !== 'false';
});

/** Вызывать при изменении настройки хаптика чтобы сразу обновить кэш */
export function setHapticCacheEnabled(enabled: boolean) {
  cachedHapticTap = enabled;
}

/**
 * tap() — лёгкий тактильный отклик на каждое нажатие.
 * Вызывается напрямую без хука для использования вне компонентов.
 */
export async function hapticTap() {
  try {
    if (cachedHapticTap === false) return;
    if (cachedHapticTap === null) {
      const val = await AsyncStorage.getItem('haptics_tap');
      cachedHapticTap = val !== 'false';
      if (!cachedHapticTap) return;
    }
    await Haptics.selectionAsync();
  } catch {}
}

export function useHaptics() {
  const tap = useCallback(() => { hapticTap(); }, []);
  return { tap };
}
