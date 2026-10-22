// ═══════════════════════════════════════════════════════════════════════════
// spire_scene_header_tint.ts — цвет верха «Сцены» Пика для шапки «Сообщества» и полосы под часами.
//
// зачем (Пик v2, шаг 3b-2; владелец 22.10: «чтобы пик не был отдельной частью в отдельном окошке»; эталон peak-scene-v2.html — сцена уходит
// под часы и под вкладки «Пик · Друзья · Наборы»): вкладки рисует «Сообщество», полосу под часами — оболочка вкладок, а цвет знает сцена.
// Сцена кладёт сюда свой верхний цвет, пока «Пик» на экране, и убирает, когда уходит; шапка и полоса красятся, только пока цвет есть.
// Только память процесса, без хранилища и сети — как home_scene_status_tint у Главной.
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';

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
