// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_header_tint.ts — цвет верха «Сцены» Пика для шапки «Сообщества» и полосы под часами.
//
// зачем (Пик v2, шаг 3b-2; владелец 22.10: «чтобы пик не был отдельной частью в отдельном окошке»; эталон peak-scene-v2.html — сцена уходит
// под часы и под вкладки «Пик · Друзья · Наборы»): вкладки рисует «Сообщество», полосу под часами — оболочка вкладок, а цвет знает сцена.
// Сцена кладёт сюда свой верхний цвет, пока «Пик» на экране, и убирает, когда уходит; шапка и полоса красятся, только пока цвет есть.
// Только память процесса, без хранилища и сети — как home_scene_status_tint у Главной.
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';

import { SPIRE_SCENE_INK } from './spire_scene_palette';

let tint: string | null = null;
const listeners = new Set<() => void>();

export function setSpireSceneHeaderTint(next: string | null): void {
  if (next === tint) return;
  tint = next;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[SPIRE-SCENE] header-tint listener failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
    }
  });
}

export function peekSpireSceneHeaderTint(): string | null {
  return tint;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useSpireSceneHeaderTint(): string | null {
  return useSyncExternalStore(subscribe, peekSpireSceneHeaderTint, peekSpireSceneHeaderTint);
}

export type SpireSceneHeaderTone = Readonly<{ tint: string; text: string; muted: string }>;

/**
 * Тон шапки «Сообщества» над «Сценой» Пика; null — прежний вид шапки (флаг SPIRE_SCENE_V2_ENABLED выключен, вкладка не «Пик»
 * или сцены на экране нет). зачем (координатор 22.10: «при выключенном флаге — побайтно прежний вид, плюс тест на это»): решение — чистая
 * функция без react-native, её проверяет tests/spire_scene_contract.test.ts при любых входах.
 */
export function spireSceneHeaderTone(i: Readonly<{ enabled: boolean; onPeak: boolean; tint: string | null }>): SpireSceneHeaderTone | null {
  if (!i.enabled || !i.onPeak || i.tint === null) return null;
  return Object.freeze({ tint: i.tint, text: SPIRE_SCENE_INK.text, muted: SPIRE_SCENE_INK.muted });
}
