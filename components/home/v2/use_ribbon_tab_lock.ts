// зачем (координатор 08:01, находка Макетов на кадре 11886ef5b): свайп по ленте плиток Главной переключал ВКЛАДКУ, а не листал ленту — Пик был недостижим.
// Пейджер вкладок (app/TabSlider.tsx) проверяет замок tabSwipeLocked в onUpdate/onEnd. Пока палец на ленте — замок стоит; снимаем после отпускания,
// с задержкой, чтобы onEnd пейджера (поток UI, в момент отпускания) гарантированно увидел замок. Свайп вне ленты замок не ставит — вкладки листаются как прежде.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { tabSwipeLocked } from '../../../app/tabSwipeLock';

const UNLOCK_DELAY_MS = 120;
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

type ScrollEv = NativeSyntheticEvent<NativeScrollEvent>;

const scrollInfo = (e: ScrollEv) => {
  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
  const maxX = Math.max(0, contentSize.width - layoutMeasurement.width);
  return { x: Math.round(contentOffset.x), maxX: Math.round(maxX), atEnd: contentOffset.x >= maxX - 1 };
};

export function useRibbonTabLock(tag: string) {
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const log = useCallback((step: string, extra?: Record<string, unknown>) => {
    if (IS_DEV) console.log('[HOME-RIBBON]', step, JSON.stringify({ tag, locked: tabSwipeLocked.value, ...extra })); // guard-ok: только dev, по одному на шаг жеста
  }, [tag]);

  const lock = useCallback((why: string) => {
    if (unlockTimer.current) { clearTimeout(unlockTimer.current); unlockTimer.current = null; }
    tabSwipeLocked.value = true;
    log('lock', { why });
  }, [log]);

  const scheduleUnlock = useCallback((why: string) => {
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      unlockTimer.current = null;
      tabSwipeLocked.value = false;
      log('unlock', { why });
    }, UNLOCK_DELAY_MS);
  }, [log]);

  // зачем: лента ушла с экрана с поставленным замком (смена языка/набора плиток) — иначе вкладки перестали бы листаться навсегда
  useEffect(() => () => {
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    if (tabSwipeLocked.value) {
      tabSwipeLocked.value = false;
      console.warn('[HOME-RIBBON] unmount: замок снят при размонтировании ленты', JSON.stringify({ tag })); // guard-ok: ранний выход логирует причину
    }
  }, [tag]);

  return useMemo(() => ({
    onTouchStart: () => lock('touch_start'),
    onTouchEnd: () => scheduleUnlock('touch_end'),
    onTouchCancel: () => scheduleUnlock('touch_cancel'),
    onScrollBeginDrag: (e: ScrollEv) => { lock('drag_begin'); log('drag_begin', scrollInfo(e)); },
    onScrollEndDrag: (e: ScrollEv) => { log('drag_end', scrollInfo(e)); scheduleUnlock('drag_end'); },
    onMomentumScrollEnd: (e: ScrollEv) => log('momentum_end', scrollInfo(e)),
  }), [lock, scheduleUnlock, log]);
}
