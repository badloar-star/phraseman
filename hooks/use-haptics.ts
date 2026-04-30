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

async function runIfEnabled(run: () => Promise<void>) {
  try {
    if (cachedHapticTap === false) return;
    if (cachedHapticTap === null) {
      const val = await AsyncStorage.getItem('haptics_tap');
      cachedHapticTap = val !== 'false';
      if (!cachedHapticTap) return;
    }
    await run();
  } catch {}
}

export async function hapticSuccess() {
  await runIfEnabled(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export async function hapticWarning() {
  await runIfEnabled(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export async function hapticError() {
  await runIfEnabled(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export async function hapticSoftImpact() {
  await runIfEnabled(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
}

export async function hapticLightImpact() {
  await runIfEnabled(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export async function hapticMediumImpact() {
  await runIfEnabled(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function useHaptics() {
  const tap = useCallback(() => { hapticTap(); }, []);
  const success = useCallback(() => { hapticSuccess(); }, []);
  const warning = useCallback(() => { hapticWarning(); }, []);
  const error = useCallback(() => { hapticError(); }, []);
  const softImpact = useCallback(() => { hapticSoftImpact(); }, []);
  const lightImpact = useCallback(() => { hapticLightImpact(); }, []);
  const mediumImpact = useCallback(() => { hapticMediumImpact(); }, []);
  return { tap, success, warning, error, softImpact, lightImpact, mediumImpact };
}
