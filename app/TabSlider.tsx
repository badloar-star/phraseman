import React, { useRef, useCallback, useEffect } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import { useScreen } from '../hooks/use-screen';
import { tabSwipeLock } from './tabSwipeLock';

const SWIPE_MIN = 50;
const RATIO_MIN = 2.2;

interface Props {
  activeIndex: number;
  onTabChange: (idx: number) => void;
  children: React.ReactNode[];
  swipeEnabled?: boolean;
}

export default function TabSlider({ activeIndex, onTabChange, children, swipeEnabled = true }: Props) {
  const { width: screenW, contentMaxW } = useScreen();
  const W = Math.min(screenW, contentMaxW);
  const wRef = useRef(W);

  const translateX  = useRef(new Animated.Value(-activeIndex * W)).current;
  const fadeOpacity = useRef(new Animated.Value(1)).current;
  const currentIdx  = useRef(activeIndex);
  const isAnimating = useRef(false);
  const pendingTargetIdxRef = useRef<number | null>(null);
  const suppressSwipeUntilRef = useRef(0);
  const moveRafRef = useRef<number | null>(null);
  const pendingDxRef = useRef<number | null>(null);

  // Snap to current tab when width changes (orientation change)
  useEffect(() => {
    if (wRef.current !== W) {
      wRef.current = W;
      translateX.setValue(-currentIdx.current * W);
    }
  }, [W, translateX]);

  const animateFadeToIndex = useCallback((toIdx: number) => {
    if (isAnimating.current) {
      pendingTargetIdxRef.current = toIdx;
      return;
    }
    isAnimating.current = true;
    translateX.stopAnimation();
    // For tap-based tab switches: snap to target position first,
    // then run only opacity transition (no horizontal motion).
    currentIdx.current = toIdx;
    translateX.setValue(-toIdx * wRef.current);
    tabSwipeLock.blocked = true;
    Animated.timing(fadeOpacity, {
      // Ultra-soft dim only (no visible blink).
      toValue: 0.94,
      duration: 90,
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(fadeOpacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: false,
      }).start(() => {
        isAnimating.current = false;
        const pending = pendingTargetIdxRef.current;
        if (pending !== null && pending !== currentIdx.current) {
          pendingTargetIdxRef.current = null;
          animateFadeToIndex(pending);
          return;
        }
        pendingTargetIdxRef.current = null;
        // Re-enable horizontal swipe shortly after visual settle.
        setTimeout(() => {
          tabSwipeLock.blocked = false;
        }, 40);
      });
    });
  }, [fadeOpacity, translateX]);

  useEffect(() => {
    if (currentIdx.current !== activeIndex) {
      suppressSwipeUntilRef.current = Date.now() + 260;
      // Переключение по табам/окнам: мягкий fade без горизонтального слайд-эффекта.
      animateFadeToIndex(activeIndex);
    }
  }, [activeIndex, animateFadeToIndex]);

  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  const swipeToRef = useRef<(idx: number) => void>(() => {});

  const swipeTo = useCallback((toIdx: number) => {
    if (isAnimating.current) {
      pendingTargetIdxRef.current = toIdx;
      return;
    }
    const w = wRef.current;
    isAnimating.current = true;
    currentIdx.current  = toIdx;
    Animated.timing(translateX, {
      toValue: -toIdx * w,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      isAnimating.current = false;
      const pending = pendingTargetIdxRef.current;
      if (pending !== null && pending !== currentIdx.current) {
        pendingTargetIdxRef.current = null;
        animateFadeToIndex(pending);
        return;
      }
      pendingTargetIdxRef.current = null;
    });
    onTabChange(toIdx);
  }, [animateFadeToIndex, onTabChange, translateX]);

  useEffect(() => { swipeToRef.current = swipeTo; }, [swipeTo, translateX]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
        if (!swipeEnabled) return false;
        if (Date.now() < suppressSwipeUntilRef.current) return false;
        if (isAnimating.current) return false;
        if (tabSwipeLock.blocked) return false;
        return (
          Math.abs(gs.dx) > SWIPE_MIN / 3 &&
          Math.abs(gs.dx) > Math.abs(gs.dy) * RATIO_MIN
        );
      },

      onPanResponderGrant: () => {
        if (Date.now() < suppressSwipeUntilRef.current) return;
        translateX.stopAnimation();
      },

      onPanResponderMove: (_, gs) => {
        if (!swipeEnabled) return;
        if (Date.now() < suppressSwipeUntilRef.current) return;
        if (isAnimating.current) return;
        pendingDxRef.current = gs.dx;
        if (moveRafRef.current !== null) return;
        moveRafRef.current = requestAnimationFrame(() => {
          moveRafRef.current = null;
          const dx = pendingDxRef.current;
          if (dx === null) return;
          const w     = wRef.current;
          const base  = -currentIdx.current * w;
          const count = (children as any[]).length;
          const ok = (dx < 0 && currentIdx.current < count - 1) ||
                     (dx > 0 && currentIdx.current > 0);
          if (ok) translateX.setValue(base + dx * 0.88);
        });
      },

      onPanResponderRelease: (_, gs) => {
        if (!swipeEnabled) return;
        if (Date.now() < suppressSwipeUntilRef.current) return;
        if (isAnimating.current) return;
        if (moveRafRef.current !== null) {
          cancelAnimationFrame(moveRafRef.current);
          moveRafRef.current = null;
        }
        pendingDxRef.current = null;
        const w     = wRef.current;
        const idx   = currentIdx.current;
        const count = (children as any[]).length;
        if      (gs.dx < -SWIPE_MIN && idx < count - 1) swipeToRef.current(idx + 1);
        else if (gs.dx >  SWIPE_MIN && idx > 0)         swipeToRef.current(idx - 1);
        else Animated.spring(translateX, {
          toValue: -idx * w, useNativeDriver: false, friction: 12, tension: 150,
        }).start();
      },

      onPanResponderTerminate: () => {
        if (!swipeEnabled) return;
        if (moveRafRef.current !== null) {
          cancelAnimationFrame(moveRafRef.current);
          moveRafRef.current = null;
        }
        pendingDxRef.current = null;
        Animated.spring(translateX, {
          toValue: -currentIdx.current * wRef.current,
          useNativeDriver: false, friction: 12,
        }).start();
      },
    })
  ).current;

  const tabs = React.Children.toArray(children);

  return (
    <View style={s.outer} {...pan.panHandlers}>
      <Animated.View style={[s.row, { width: W * tabs.length, transform: [{ translateX }], opacity: fadeOpacity }]}>
        {tabs.map((child, i) => (
          <View key={i} style={[s.tab, { width: W }]}>
            {child}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, overflow: 'hidden' },
  row:   { flex: 1, flexDirection: 'row' },
  tab:   { flex: 1, overflow: 'hidden' },
});
