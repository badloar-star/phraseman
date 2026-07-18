import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { TabRuntimeOwnerId } from '../lib/today/tab_page_model';

interface TabCtx {
  activeIdx: number;
  goToTab: (idx: number) => void;
  goHome: () => void;
  focusTick: number;
  runtimeOwnerId: TabRuntimeOwnerId;
  todaySessionEpoch: number;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
}

const TabContext = createContext<TabCtx>({
  activeIdx: 0,
  goToTab: () => {},
  goHome: () => {},
  focusTick: 0,
  runtimeOwnerId: 'home',
  todaySessionEpoch: 0,
  onSwipeStart: () => {},
  onSwipeComplete: () => {},
});

export const useTabNav = () => useContext(TabContext);

export const TAB_KEYS = ['home', 'lessons', 'friends', 'settings'] as const;

export function TabProvider({
  children,
  activeIdx,
  onTabChange,
  onSwipeStart,
  onSwipeComplete,
  focusTick,
  runtimeOwnerId: runtimeOwnerIdProp,
  todaySessionEpoch: todaySessionEpochProp,
}: {
  children: React.ReactNode;
  activeIdx: number;
  onTabChange: (idx: number) => void;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
  focusTick: number;
  runtimeOwnerId?: TabRuntimeOwnerId;
  todaySessionEpoch?: number;
}) {
  const goToTab = useCallback((idx: number) => onTabChange(idx), [onTabChange]);
  const goHome  = useCallback(() => onTabChange(0), [onTabChange]);
  const runtimeOwnerId = runtimeOwnerIdProp ?? TAB_KEYS[activeIdx] ?? 'home';
  const todaySessionEpoch = todaySessionEpochProp ?? 0;
  const value = useMemo(
    () => ({ activeIdx, goToTab, goHome, focusTick, runtimeOwnerId, todaySessionEpoch, onSwipeStart, onSwipeComplete }),
    [activeIdx, goToTab, goHome, focusTick, runtimeOwnerId, todaySessionEpoch, onSwipeStart, onSwipeComplete],
  );
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

// Required by Expo Router — not a screen
export default function TabContextModule() { return null; }
