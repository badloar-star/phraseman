import type { AccessibilityState } from 'react-native';

/**
 * Сливает переданный extra accessibilityState с обязательным `disabled`,
 * выводя его из реального disabled-флага компонента. Реальный disabled
 * всегда имеет приоритет — чтобы accessibilityState.disabled не разошёлся
 * с фактическим состоянием кнопки.
 */
export function mergeAccessibilityDisabled(
  extra: AccessibilityState | undefined,
  disabled: boolean | undefined,
): AccessibilityState {
  return { ...(extra ?? {}), disabled: !!disabled };
}

/**
 * Слияние accessibilityState для переключателя (switch): обязательные
 * `checked` (из value) и `disabled` всегда имеют приоритет над extra.
 */
export function mergeSwitchAccessibilityState(
  extra: AccessibilityState | undefined,
  value: boolean,
  disabled: boolean | undefined,
): AccessibilityState {
  return { ...(extra ?? {}), checked: !!value, disabled: !!disabled };
}
