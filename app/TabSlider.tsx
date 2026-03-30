import React, { useRef, useCallback, useEffect } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import { useScreen } from '../hooks/use-screen';

const SWIPE_MIN = 50;
const RATIO_MIN = 2.2;

interface Props {
  activeIndex: number;
  onTabChange: (idx: number) => void;
  children: React.ReactNode[];
}

export default function TabSlider({ activeIndex, onTabChange, children }: Props) {
  const { width: screenW, contentMaxW } = useScreen();
  const W = Math.min(screenW, contentMaxW);
  const wRef = useRef(W);

  const translateX  = useRef(new Animated.Value(-activeIndex * W)).current;
  const currentIdx  = useRef(activeIndex);
  const isAnimating = useRef(false);

  // Snap to current tab when width changes (orientation change)
  useEffect(() => {
    if (wRef.current !== W) {
      wRef.current = W;
      translateX.setValue(-currentIdx.current * W);
    }
  }, [W]);

  useEffect(() => {
    if (currentIdx.current !== activeIndex) {
      // Тап по таббару — мгновенно, без анимации
      currentIdx.current = activeIndex;
      translateX.stopAnimation();
      translateX.setValue(-activeIndex * wRef.current);
      isAnimating.current = false;
    }
  }, [activeIndex]);

  const swipeToRef = useRef<(idx: number) => void>(() => {});

  const swipeTo = useCallback((toIdx: number) => {
    if (isAnimating.current) return;
    const w = wRef.current;
    isAnimating.current = true;
    currentIdx.current  = toIdx;
    Animated.spring(translateX, {
      toValue: -toIdx * w,
      useNativeDriver: true,
      friction: 10,
      tension: 85,
    }).start(() => {
      isAnimating.current = false;
    });
    onTabChange(toIdx);
  }, [onTabChange]);

  useEffect(() => { swipeToRef.current = swipeTo; }, [swipeTo]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
        if (isAnimating.current) return false;
        return (
          Math.abs(gs.dx) > SWIPE_MIN / 3 &&
          Math.abs(gs.dx) > Math.abs(gs.dy) * RATIO_MIN
        );
      },

      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },

      onPanResponderMove: (_, gs) => {
        if (isAnimating.current) return;
        const w     = wRef.current;
        const base  = -currentIdx.current * w;
        const count = (children as any[]).length;
        const ok = (gs.dx < 0 && currentIdx.current < count - 1) ||
                   (gs.dx > 0 && currentIdx.current > 0);
        if (ok) translateX.setValue(base + gs.dx * 0.88);
      },

      onPanResponderRelease: (_, gs) => {
        if (isAnimating.current) return;
        const w     = wRef.current;
        const idx   = currentIdx.current;
        const count = (children as any[]).length;
        if      (gs.dx < -SWIPE_MIN && idx < count - 1) swipeToRef.current(idx + 1);
        else if (gs.dx >  SWIPE_MIN && idx > 0)         swipeToRef.current(idx - 1);
        else Animated.spring(translateX, {
          toValue: -idx * w, useNativeDriver: true, friction: 12, tension: 150,
        }).start();
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: -currentIdx.current * wRef.current,
          useNativeDriver: true, friction: 12,
        }).start();
      },
    })
  ).current;

  const tabs = React.Children.toArray(children);

  return (
    <View style={s.outer} {...pan.panHandlers}>
      <Animated.View style={[s.row, { width: W * tabs.length, transform: [{ translateX }] }]}>
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
