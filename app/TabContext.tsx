import React, { createContext, useContext, useState, useCallback } from 'react';

interface TabCtx {
  activeIdx: number;
  goToTab: (idx: number) => void;
  goHome: () => void;
  focusTick: number;
}

const TabContext = createContext<TabCtx>({
  activeIdx: 0,
  goToTab: () => {},
  goHome: () => {},
  focusTick: 0,
});

export const useTabNav = () => useContext(TabContext);

export const TAB_KEYS = ['home', 'index', 'quizzes', 'hall_of_fame', 'settings'];

export function TabProvider({ children, activeIdx, onTabChange, focusTick }: {
  children: React.ReactNode;
  activeIdx: number;
  onTabChange: (idx: number) => void;
  focusTick: number;
}) {
  const goToTab = useCallback((idx: number) => onTabChange(idx), [onTabChange]);
  const goHome  = useCallback(() => onTabChange(0), [onTabChange]);
  return (
    <TabContext.Provider value={{ activeIdx, goToTab, goHome, focusTick }}>
      {children}
    </TabContext.Provider>
  );
}

// Required by Expo Router — not a screen
export default function TabContextModule() { return null; }
