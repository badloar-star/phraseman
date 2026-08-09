import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { LOGICAL_TAB_IDS, type TabRuntimeOwnerId } from './tab_page_model';

interface TabCtx {
  activeIdx: number;
  goToTab: (idx: number) => void;
  goHome: () => void;
  focusTick: number;
  runtimeOwnerId: TabRuntimeOwnerId;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
}

const TabContext = createContext<TabCtx>({
  activeIdx: 0,
  goToTab: () => {},
  goHome: () => {},
  focusTick: 0,
  runtimeOwnerId: 'home',
  onSwipeStart: () => {},
  onSwipeComplete: () => {},
});

export const useTabNav = () => useContext(TabContext);

// Один источник правды: запасной runtime-владелец обязан иметь тот же индекс,
// что и физическая релизная страница. Иначе после удаления/перестановки таба
// fallback незаметно отдаёт владельца соседнего экрана.
export const TAB_KEYS = LOGICAL_TAB_IDS;

export function TabProvider({
  children,
  activeIdx,
  onTabChange,
  onSwipeStart,
  onSwipeComplete,
  focusTick,
  runtimeOwnerId: runtimeOwnerIdProp,
}: {
  children: React.ReactNode;
  activeIdx: number;
  onTabChange: (idx: number) => void;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
  focusTick: number;
  runtimeOwnerId?: TabRuntimeOwnerId;
}) {
  const goToTab = useCallback((idx: number) => onTabChange(idx), [onTabChange]);
  const goHome  = useCallback(() => onTabChange(0), [onTabChange]);
  const runtimeOwnerId = runtimeOwnerIdProp ?? TAB_KEYS[activeIdx] ?? 'home';
  const value = useMemo(
    () => ({ activeIdx, goToTab, goHome, focusTick, runtimeOwnerId, onSwipeStart, onSwipeComplete }),
    [activeIdx, goToTab, goHome, focusTick, runtimeOwnerId, onSwipeStart, onSwipeComplete],
  );
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

// Required by Expo Router — not a screen
export default function TabContextModule() { return null; }
