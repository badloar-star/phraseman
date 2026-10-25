// ═══════════════════════════════════════════════════════════════════════════
// spire_header_overlay.ts — высота шапки «Сообщества», когда она лежит ПОВЕРХ «Сцены» Пика.
//
// зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10 «верх цельный», координатор: «сцена от самого верха, шапка прозрачная поверх»): тело вкладки начинается
// от верха экрана, а лента Пика отступает на высоту шапки — башня стоит там же, где стояла, а фон сцены идёт под шапкой и часами.
// 0 — шапка обычным блоком (флаг выключен, другой раздел, сцены нет). Только память процесса.
// ═══════════════════════════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react';

let inset = 0;
const listeners = new Set<() => void>();

export function setSpireHeaderOverlayInset(next: number): void {
  const value = Math.max(0, Math.round(next));
  if (value === inset) return;
  inset = value;
  console.log('[TOP-BAND]', JSON.stringify({ at: 'spire_header_overlay', inset: value, decision: value > 0 ? 'header_over_scene' : 'header_block' })); // guard-ok: одна строка на смену решения
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[TOP-BAND] header overlay listener failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
    }
  });
}

const peek = (): number => inset;
const subscribe = (listener: () => void): (() => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Отступ ленты Пика под шапку, лежащую поверх сцены (0 — шапка обычным блоком). */
export function useSpireHeaderOverlayInset(): number {
  return useSyncExternalStore(subscribe, peek, peek);
}
