// ═══════════════════════════════════════════════════════════════════════════
// use_spire_tower_touch_lock.ts — пока палец в окне башни, страница Пика и «потяни, чтобы обновить» не перехватывают жест.
//
// зачем (координатор 15.10, 🔴 по кадру Pixel 8, п. г): «свайп по окну башни должен работать — иначе не увидеть шпиль». На Android вложенный вертикальный ScrollView внутри страницы
// с RefreshControl отдаёт жест внешнему: окно башни не прокручивалось. Стандартное лечение — на время касания окна выключить прокрутку страницы и обновление потягиванием.
// Состояние меняется только на касание/отпускание окна, не на каждый кадр жеста.
// ═══════════════════════════════════════════════════════════════════════════
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export type SpireTowerTouchLock = Readonly<{ locked: boolean; onTouchActive: (active: boolean) => void }>;

export function useSpireTowerTouchLock(): SpireTowerTouchLock {
  const [locked, setLocked] = useState(false);
  const onTouchActive = useCallback((active: boolean) => setLocked((prev) => (prev === active ? prev : active)), []);
  // зачем (Ревизор по 690a67f59, 🟡): уход с экрана (смена вкладки) с пальцем на окне башни не должен оставить страницу заблокированной — при потере фокуса блокировка снимается
  useFocusEffect(useCallback(() => () => setLocked(false), []));
  return { locked, onTouchActive };
}
