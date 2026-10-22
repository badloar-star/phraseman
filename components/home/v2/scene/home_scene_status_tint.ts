// ═══════════════════════════════════════════════════════════════════════════
// home_scene_status_tint.ts — цвет полосы статуса над «Сценой» Главной.
//
// зачем (координатор 22.10: «тон полосы статуса — да, маленьким отдельным шагом, только на вкладке Главной, другие вкладки не
// задеть»): оболочка вкладок даёт отступ сверху под строку статуса, а в эталоне сцена уходит «под часы». Сцена публикует свой
// верхний цвет, оболочка красит им только полосу над Главной; сцены нет (флаг выключен, другая раскладка) — цвета нет, полосы нет.
// Только память процесса, без хранилища и сети.
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';

let tint: string | null = null;
const listeners = new Set<() => void>();

export function setHomeSceneStatusTint(next: string | null): void {
  if (next === tint) return;
  tint = next;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[HOME-SCENE] status-tint listener failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
    }
  });
}

export function peekHomeSceneStatusTint(): string | null {
  return tint;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useHomeSceneStatusTint(): string | null {
  return useSyncExternalStore(subscribe, peekHomeSceneStatusTint, peekHomeSceneStatusTint);
}
