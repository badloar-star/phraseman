// ═══════════════════════════════════════════════════════════════════════════
// use_spire_tower_touch_lock.ts — пока палец в окне башни, страница Пика и «потяни, чтобы обновить» не перехватывают жест.
//
// зачем (координатор 15.10, 🔴 по кадру Pixel 8, п. г): «свайп по окну башни должен работать — иначе не увидеть шпиль». На Android вложенный вертикальный ScrollView внутри страницы
// с RefreshControl отдаёт жест внешнему: окно башни не прокручивалось. Стандартное лечение — на время касания окна выключить прокрутку страницы и обновление потягиванием.
// Состояние меняется только на касание/отпускание окна, не на каждый кадр жеста.
//
// зачем (владелец 25.10, ТОЛЬКО iPhone: «скролл в разделе Пик поломан — то не работает, то появляется, но очень коряво»): на «Сцене» окно башни
// занимает почти весь экран, и каждое касание выключало прокрутку страницы прямо посреди жеста (смена scrollEnabled во время касания на iOS
// рвёт начатый жест страницы). На iOS вложенные прокрутки одной оси разруливает сама система — блокировку там не ставим, только пишем журнал.
// Android — как было (там без блокировки окно башни не крутится).
// ═══════════════════════════════════════════════════════════════════════════
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { logSpireScroll } from './spire_scroll_log';

export type SpireTowerTouchLock = Readonly<{ locked: boolean; onTouchActive: (active: boolean, why?: string) => void }>;

/** На iOS страница не блокируется касанием башни (вложенная прокрутка — системная). */
export const SPIRE_TOWER_LOCKS_PAGE = Platform.OS !== 'ios';

export function useSpireTowerTouchLock(): SpireTowerTouchLock {
  const [locked, setLocked] = useState(false);
  const sinceRef = useRef(0);
  const onTouchActive = useCallback((active: boolean, why = 'unknown') => {
    const heldMs = active ? 0 : sinceRef.current ? Date.now() - sinceRef.current : null;
    if (active) sinceRef.current = Date.now(); else sinceRef.current = 0;
    logSpireScroll('tower_touch', { active, why, locksPage: SPIRE_TOWER_LOCKS_PAGE, heldMs });
    if (!SPIRE_TOWER_LOCKS_PAGE) return;
    setLocked((prev) => (prev === active ? prev : active));
  }, []);
  // зачем (Ревизор по 690a67f59, 🟡): уход с экрана (смена вкладки) с пальцем на окне башни не должен оставить страницу заблокированной — при потере фокуса блокировка снимается
  useFocusEffect(useCallback(() => () => { logSpireScroll('tower_touch_blur_reset'); setLocked(false); }, []));
  return { locked, onTouchActive };
}
