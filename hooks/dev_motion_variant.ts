// ════════════════════════════════════════════════════════════════════════════
// dev_motion_variant.ts — dev-only переключатель варианта движения для
// поверхностей, у которых нет prop-точки входа (таббар живёт в корневом
// лейауте, пропсом его не переключить). Тот же паттерн, что dev_force_low_end:
// модульный стор + useSyncExternalStore, без провайдера.
//
// зачем: после приёмки DEV Hub гибрид включён в РЕАЛЬНОМ таббаре по умолчанию;
// dev-переключатель сохраняет явный `classic` как быстрый путь отката.
// ════════════════════════════════════════════════════════════════════════════

import { useSyncExternalStore } from 'react';

export type MotionVariant = 'classic' | 'hybrid';

let tabBarVariant: MotionVariant = 'hybrid';
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** dev-инструмент: переключить характер движения реального таббара. */
export function setDevTabBarMotionVariant(value: MotionVariant): void {
  if (!__DEV__) return;
  tabBarVariant = value;
  emit();
}

export function getDevTabBarMotionVariant(): MotionVariant {
  return tabBarVariant;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** В store-сборке остаётся production-дефолт `hybrid`; setter отключён через __DEV__. */
export function useDevTabBarMotionVariant(): MotionVariant {
  return useSyncExternalStore(subscribe, getDevTabBarMotionVariant, getDevTabBarMotionVariant);
}
