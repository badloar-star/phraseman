// ═══════════════════════════════════════════════════════════════════════════
// spire_scroll_log.ts — журнал [SPIRE-SCROLL] прокрутки экрана Пика: страница, окно башни, блокировка касанием.
//
// зачем (владелец 25.10, только iPhone: «скролл в разделе Пик поломан — то не работает, то появляется, но очень коряво»; чаще сразу
// при входе; координатор: СПЕРВА ЛОГИ): одна строка на событие — начало/конец перетаскивания, смена scrollEnabled и что её решило,
// размеры окна и содержимого, касание окна башни. console.log — его снимают с iPhone через Console.app; DebugLogger — переживает
// перезапуск. Каждое событие жеста — одна строка, не кадр прокрутки.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react';
import { Platform, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { DebugLogger } from '../../app/debug-logger';

const TAG = '[SPIRE-SCROLL]';
const T0 = Date.now();

export function logSpireScroll(event: string, data: Readonly<Record<string, unknown>> = {}): void {
  const line = JSON.stringify({ event, os: Platform.OS, ms: Date.now() - T0, ...data });
  console.log(TAG, line); // guard-ok: одна строка на событие жеста
  DebugLogger.info('[SPIRE]', `${TAG} ${line}`);
}

const r = (n: number): number => Math.round(n);

/** Одна строка [SPIRE-SCROLL] на смену того, что решает прокрутку страницы Пика (не на каждый рендер). */
export function useSpireScrollStateLog(state: Readonly<Record<string, string | number | boolean | null>>): void {
  const key = JSON.stringify(state);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: ключ — само состояние
  useEffect(() => { logSpireScroll('page_state', state); }, [key]);
}

type DragEvent = NativeSyntheticEvent<NativeScrollEvent>;

/** Обработчики перетаскивания страницы Пика для журнала: начало (позиция, содержимое, окно), конец, конец инерции. */
export function spirePageScrollLogProps(scrollEnabled: boolean): Readonly<{
  onScrollBeginDrag: (e: DragEvent) => void; onScrollEndDrag: (e: DragEvent) => void; onMomentumScrollEnd: (e: DragEvent) => void;
}> {
  return {
    onScrollBeginDrag: (e) => logSpireScroll('page_drag_begin', { y: r(e.nativeEvent.contentOffset.y), contentH: r(e.nativeEvent.contentSize.height), viewportH: r(e.nativeEvent.layoutMeasurement.height), scrollEnabled }),
    onScrollEndDrag: (e) => logSpireScroll('page_drag_end', { y: r(e.nativeEvent.contentOffset.y), vy: e.nativeEvent.velocity?.y ?? null }),
    onMomentumScrollEnd: (e) => logSpireScroll('page_momentum_end', { y: r(e.nativeEvent.contentOffset.y) }),
  };
}
