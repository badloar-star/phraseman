// ════════════════════════════════════════════════════════════════════════════
// dev_force_low_end.ts — dev-only переключатель авто-лайта (F9/8.4) для ручной
// проверки на любом телефоне, независимо от реального тира устройства.
// Модульный стор с подпиской (не React Context): starfield и sky map — соседи
// в дереве constellation_match, общего родителя-провайдера ставить не нужно.
// ════════════════════════════════════════════════════════════════════════════

import { useSyncExternalStore } from 'react';

let forced: boolean | null = null; // null = не трогать реальный тир устройства
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** dev-инструмент: принудительно включить/выключить авто-лайт поверх реального тира. */
export function setDevForceLowEnd(value: boolean | null): void {
  forced = value;
  emit();
}

export function getDevForceLowEnd(): boolean | null {
  return forced;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** null → используем реальный deviceIsLowEnd; иначе — форс из dev-тумблера. */
export function useDevForceLowEnd(): boolean | null {
  return useSyncExternalStore(subscribe, getDevForceLowEnd, getDevForceLowEnd);
}
