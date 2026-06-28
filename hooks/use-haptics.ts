import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedHapticTap: boolean | null = null;

/**
 * Кулдаун лёгкого касания (selection). Гасит дребезг от очень частых тапов
 * по одной/соседним кнопкам.
 */
export const HAPTIC_TAP_COOLDOWN_MS = 80;
/**
 * Кулдаун «сильного» фидбэка одного и того же смысла (success/error/...).
 * Длинный, чтобы один и тот же сигнал не спамил.
 */
export const HAPTIC_FEEDBACK_COOLDOWN_MS = 4_500;
/**
 * Анти-наложение: общее окно, в которое после ЛЮБОЙ вибрации лёгкий tap
 * подавляется. Это ядро фикса «иногда хаптик сильнее без причины» —
 * раньше tap (selection) и feedback (success/error/impact) жили на разных
 * таймерах и могли сработать в один момент, складываясь в один сильный удар.
 *
 * Теперь любой «сильный» фидбэк ставит общий floor, и лёгкий tap внутри окна
 * не проходит → на одно событие остаётся одна вибрация нужного типа.
 * Окно ~ длительность короткой анимации нажатия; tap по ДРУГОЙ кнопке позже
 * окна снова разрешён.
 */
export const HAPTIC_TAP_AFTER_FEEDBACK_GUARD_MS = 140;

let lastTapHapticAt = Number.NEGATIVE_INFINITY;
let lastFeedbackHapticAt = Number.NEGATIVE_INFINITY;
/** Момент последней ЛЮБОЙ фактически проигранной вибрации (tap или feedback). */
let lastAnyHapticAt = Number.NEGATIVE_INFINITY;

// Синхронный кэш — читаем при старте приложения
if (typeof window !== 'undefined') {
  AsyncStorage.getItem('haptics_tap').then(val => {
    cachedHapticTap = val !== 'false';
  }).catch(() => {});
}

/** Вызывать при изменении настройки хаптика чтобы сразу обновить кэш */
export function setHapticCacheEnabled(enabled: boolean) {
  cachedHapticTap = enabled;
}

/**
 * Лёгкое касание (selection) разрешено, если:
 *  - прошёл tap-кулдаун (анти-дребезг по самим тапам), И
 *  - мы НЕ внутри окна сразу после «сильного» фидбэка (анти-наложение).
 */
function canRunTapHaptic(): boolean {
  const now = Date.now();
  if (now - lastTapHapticAt < HAPTIC_TAP_COOLDOWN_MS) return false;
  if (now - lastFeedbackHapticAt < HAPTIC_TAP_AFTER_FEEDBACK_GUARD_MS) return false;
  lastTapHapticAt = now;
  lastAnyHapticAt = now;
  return true;
}

/**
 * «Сильный» фидбэк (success/error/warning/impact). Главнее лёгкого tap'а:
 * проходит, даже если только что был tap, но при этом подавляет лёгкие tap'ы
 * в ближайшем окне (через lastFeedbackHapticAt). Один и тот же фидбэк в пределах
 * длинного кулдауна не повторяется.
 */
function canRunFeedbackHaptic(): boolean {
  const now = Date.now();
  if (now - lastFeedbackHapticAt < HAPTIC_FEEDBACK_COOLDOWN_MS) return false;
  lastFeedbackHapticAt = now;
  lastAnyHapticAt = now;
  return true;
}

/**
 * tap() — лёгкий тактильный отклик на каждое нажатие.
 * Вызывается напрямую без хука для использования вне компонентов.
 *
 * ВАЖНО: Вызывать в onPressIn, а не onPress — iOS Taptic Engine нужна
 * фора в ~50ms для warm-up. Вызов в onPressIn даёт эту фору бесплатно.
 *
 * ✓ onPressIn={() => hapticTap()}  onPress={action}   ← правильно
 * ✗ onPress={() => { hapticTap(); action(); }}         ← менее отзывчиво
 */
export async function hapticTap() {
  try {
    if (cachedHapticTap === false) return;
    if (!canRunTapHaptic()) return;
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
    if (!canRunFeedbackHaptic()) return;
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

export async function hapticHeavyImpact() {
  await runIfEnabled(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/**
 * Праздничная «двухступенчатая» вибрация (level up / крупная награда):
 * тяжёлый удар → через паузу мягкий «успех». Как у Duolingo на крупных
 * достижениях. Идёт ОДНИМ запросом через общий кулдаун, чтобы не множиться.
 */
export async function hapticCelebrate() {
  try {
    if (cachedHapticTap === false) return;
    if (!canRunFeedbackHaptic()) return;
    if (cachedHapticTap === null) {
      const val = await AsyncStorage.getItem('haptics_tap');
      cachedHapticTap = val !== 'false';
      if (!cachedHapticTap) return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 130);
  } catch {}
}

export function useHaptics() {
  const tap = useCallback(() => { hapticTap(); }, []);
  const success = useCallback(() => { hapticSuccess(); }, []);
  const warning = useCallback(() => { hapticWarning(); }, []);
  const error = useCallback(() => { hapticError(); }, []);
  const softImpact = useCallback(() => { hapticSoftImpact(); }, []);
  const lightImpact = useCallback(() => { hapticLightImpact(); }, []);
  const mediumImpact = useCallback(() => { hapticMediumImpact(); }, []);
  const heavyImpact = useCallback(() => { hapticHeavyImpact(); }, []);
  const celebrate = useCallback(() => { hapticCelebrate(); }, []);
  return { tap, success, warning, error, softImpact, lightImpact, mediumImpact, heavyImpact, celebrate };
}

export const __hapticsTestHooks = {
  resetRateLimit() {
    lastTapHapticAt = Number.NEGATIVE_INFINITY;
    lastFeedbackHapticAt = Number.NEGATIVE_INFINITY;
    lastAnyHapticAt = Number.NEGATIVE_INFINITY;
  },
};
