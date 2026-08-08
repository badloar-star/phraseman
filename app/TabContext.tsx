import React, { createContext, useContext, useCallback, useMemo } from 'react';
import type { TabRuntimeOwnerId } from './tab_page_model';

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

// зачем: владелец (2026-08-02) убрал таб «Уроки» — порядок синхронизирован
// с LOGICAL_TAB_IDS в app/tab_page_model.ts.
export const TAB_KEYS = ['home', 'tournaments', 'friends', 'settings'] as const;

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
