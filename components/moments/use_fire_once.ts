// ═══════════════════════════════════════════════════════════════════════════
// use_fire_once.ts — «сработать один раз» для кнопок моментов: защита от двойного тапа, синхронная.
//
// зачем (координатор 14.10, аудит Optimistic UI): родительское состояние busy приходит на следующем кадре, а два быстрых тапа успевают в один. Окно моментов
// обязано сразу, синхронно, в самом обработчике пометить «уже нажато» и вызвать действие один раз: родитель СНАЧАЛА закрывает окно, потом навигация/запись.
// resetKey — когда окно показывается снова (visible: false → true), счётчик сбрасывается.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef } from 'react';

/** Возвращает `fire(действие, метка)`: первое нажатие вызывает действие, остальные до смены resetKey гасятся (с записью в журнал). */
export function useFireOnce(scope: string, resetKey?: unknown): (action: () => void, label: string) => void {
  const firedRef = useRef(false);
  useEffect(() => { firedRef.current = false; }, [resetKey]);
  return useCallback((action: () => void, label: string) => {
    if (firedRef.current) {
      console.log(`[${scope}] ${label}: повторное нажатие погашено`); // guard-ok: журнал погашенного двойного тапа
      return;
    }
    firedRef.current = true;
    console.log(`[${scope}] ${label}: действие вызвано`); // guard-ok: единичный журнал действия
    action();
  }, [scope]);
}
