import React, { createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { HOME_ENTRANCE } from '../constants/motion';

interface TabCtx {
  activeIdx: number;
  goToTab: (idx: number) => void;
  goHome: () => void;
  focusTick: number;
  /** Общий Animated для фона Main — драйв анимации на главной + один ScreenGradient в (tabs)/_layout */
  homeBgParallax: Animated.Value;
}

const DUMMY_HOME_BG_PARALLAX = new Animated.Value(0);

const TabContext = createContext<TabCtx>({
  activeIdx: 0,
  goToTab: () => {},
  goHome: () => {},
  focusTick: 0,
  homeBgParallax: DUMMY_HOME_BG_PARALLAX,
});

export const useTabNav = () => useContext(TabContext);

export const TAB_KEYS = ['home', 'index', 'arena', 'settings'];

export function TabProvider({ children, activeIdx, onTabChange, focusTick }: {
  children: React.ReactNode;
  activeIdx: number;
  onTabChange: (idx: number) => void;
  focusTick: number;
}) {
  const homeBgParallax = useRef(new Animated.Value(HOME_ENTRANCE.bgDriftPx)).current;
  const goToTab = useCallback((idx: number) => onTabChange(idx), [onTabChange]);
  const goHome  = useCallback(() => onTabChange(0), [onTabChange]);
  const value = useMemo(
    () => ({ activeIdx, goToTab, goHome, focusTick, homeBgParallax }),
    [activeIdx, goToTab, goHome, focusTick, homeBgParallax],
  );
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

// Required by Expo Router — not a screen
export default function TabContextModule() { return null; }
