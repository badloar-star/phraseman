import React, { createContext, useContext, useCallback, useMemo } from 'react';

interface TabCtx {
  activeIdx: number;
  goToTab: (idx: number) => void;
  goHome: () => void;
  focusTick: number;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
}

const TabContext = createContext<TabCtx>({
  activeIdx: 0,
  goToTab: () => {},
  goHome: () => {},
  focusTick: 0,
  onSwipeStart: () => {},
  onSwipeComplete: () => {},
});

export const useTabNav = () => useContext(TabContext);

export const TAB_KEYS = ['home', 'lessons', 'arena', 'settings'];

export function TabProvider({ children, activeIdx, onTabChange, onSwipeStart, onSwipeComplete, focusTick }: {
  children: React.ReactNode;
  activeIdx: number;
  onTabChange: (idx: number) => void;
  onSwipeStart: (idx: number) => void;
  onSwipeComplete: (idx: number) => void;
  focusTick: number;
}) {
  const goToTab = useCallback((idx: number) => onTabChange(idx), [onTabChange]);
  const goHome  = useCallback(() => onTabChange(0), [onTabChange]);
  const value = useMemo(
    () => ({ activeIdx, goToTab, goHome, focusTick, onSwipeStart, onSwipeComplete }),
    [activeIdx, goToTab, goHome, focusTick, onSwipeStart, onSwipeComplete],
  );
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

// Required by Expo Router — not a screen
export default function TabContextModule() { return null; }
