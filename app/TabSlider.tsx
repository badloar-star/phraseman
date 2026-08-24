import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
  useReducedMotion,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useScreen } from '../hooks/use-screen';
import { tabSwipeLocked } from './tabSwipeLock';

const TAB_SWIPE_ACTIVE_OFFSET_X = 22;
const TAB_SWIPE_FAIL_OFFSET_Y = 12;

interface Props {
  activeIndex: number;
  onTabChange: (idx: number) => void;
  onSwipeStart?: (idx: number) => void;
  onSwipeComplete?: (idx: number) => void;
  children: React.ReactNode[];
  swipeEnabled?: boolean;
}

export default function TabSlider({
  activeIndex,
  onTabChange,
  onSwipeStart,
  onSwipeComplete,
  children,
  swipeEnabled = true,
}: Props) {
  const { width: screenW } = useScreen();
  const reducedMotion = useReducedMotion();
  const [layoutWidth, setLayoutWidth] = useState(screenW);
  const W = layoutWidth > 0 ? layoutWidth : screenW;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0) {
      setLayoutWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    }
  }, []);

  // All shared values run on the UI thread — no JS overhead during gesture
  const translateX  = useSharedValue(-activeIndex * W);
  const currentIdx  = useSharedValue(activeIndex);
  const isAnimating = useSharedValue(false);
  const tabWidth    = useSharedValue(W);
  const tabCount    = useSharedValue(React.Children.count(children));

  // JS-side refs for callbacks (worklets schedule them on the React Native thread).
  const onSwipeStartRef    = useRef(onSwipeStart);
  const onSwipeCompleteRef = useRef(onSwipeComplete);
  useEffect(() => { onSwipeStartRef.current = onSwipeStart; }, [onSwipeStart]);
  useEffect(() => { onSwipeCompleteRef.current = onSwipeComplete; }, [onSwipeComplete]);
  useEffect(() => { tabCount.value = React.Children.count(children); }, [children, tabCount]);

  // Sync width on resize
  useLayoutEffect(() => {
    if (tabWidth.value !== W) {
      tabWidth.value = W;
      translateX.value = -currentIdx.value * W;
    }
  }, [W, tabWidth, translateX, currentIdx]);

  // Programmatic tab changes come from an explicit tab-bar press. Commit the
  // destination immediately; adding another transition here makes a warm tab
  // feel delayed after React has already processed the press.
  useLayoutEffect(() => {
    if (currentIdx.value !== activeIndex) {
      currentIdx.value = activeIndex;
      cancelAnimation(translateX);
      isAnimating.value = false;
      translateX.value = -activeIndex * W;
    }
  }, [activeIndex, W, translateX, currentIdx, isAnimating]);

  const fireSwipeStart = useCallback((i: number) => { onSwipeStartRef.current?.(i); }, []);
  const fireSwipeComplete = useCallback((i: number) => { onSwipeCompleteRef.current?.(i); }, []);

  const pan = useMemo(() => Gesture.Pan()
    .enabled(swipeEnabled)
    // Require a deliberate horizontal drag so child buttons keep normal tap priority.
    .activeOffsetX([-TAB_SWIPE_ACTIVE_OFFSET_X, TAB_SWIPE_ACTIVE_OFFSET_X])
    .failOffsetY([-TAB_SWIPE_FAIL_OFFSET_Y, TAB_SWIPE_FAIL_OFFSET_Y])
    .onUpdate((e) => {
      'worklet';
      if (isAnimating.value) return;
      if (tabSwipeLocked.value) return;
      const base = -currentIdx.value * tabWidth.value;
      const dx = e.translationX;
      const ok =
        (dx < 0 && currentIdx.value < tabCount.value - 1) ||
        (dx > 0 && currentIdx.value > 0);
      if (ok) {
        translateX.value = base + dx * 0.92;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isAnimating.value) return;
      if (tabSwipeLocked.value) return;

      const dx = e.translationX;
      const vx = e.velocityX;
      const idx = currentIdx.value;
      const count = tabCount.value;
      const w = tabWidth.value;

      const shouldGoNext = (dx < -50 || vx < -400) && idx < count - 1;
      const shouldGoPrev = (dx > 50  || vx > 400)  && idx > 0;

      if (shouldGoNext) {
        const toIdx = idx + 1;
        isAnimating.value = true;
        currentIdx.value  = toIdx;
        scheduleOnRN(fireSwipeStart, toIdx);
        translateX.value = withTiming(
          -toIdx * w,
          { duration: reducedMotion ? 0 : 260, easing: Easing.out(Easing.cubic) },
          (finished) => {
            'worklet';
            isAnimating.value = false;
            if (finished) scheduleOnRN(fireSwipeComplete, toIdx);
          }
        );
      } else if (shouldGoPrev) {
        const toIdx = idx - 1;
        isAnimating.value = true;
        currentIdx.value  = toIdx;
        scheduleOnRN(fireSwipeStart, toIdx);
        translateX.value = withTiming(
          -toIdx * w,
          { duration: reducedMotion ? 0 : 260, easing: Easing.out(Easing.cubic) },
          (finished) => {
            'worklet';
            isAnimating.value = false;
            if (finished) scheduleOnRN(fireSwipeComplete, toIdx);
          }
        );
      } else {
        // Возврат на место — spring с ощущением упругости
        translateX.value = reducedMotion
          ? withTiming(-idx * w, { duration: 0 })
          : withSpring(-idx * w, {
            damping: 22,
            stiffness: 220,
            mass: 0.4,
            velocity: vx,
          });
      }
    }), [currentIdx, fireSwipeComplete, fireSwipeStart, isAnimating, reducedMotion, swipeEnabled, tabCount, tabWidth, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const tabs = React.Children.toArray(children);

  return (
    <GestureDetector gesture={pan}>
      <View style={s.outer} onLayout={handleLayout}>
        <Animated.View style={[s.row, { width: W * tabs.length }, animStyle]}>
          {tabs.map((child, i) => (
            <View
              key={i}
              style={[s.tab, { width: W }]}
              pointerEvents={i === activeIndex ? 'auto' : 'none'}
              accessibilityElementsHidden={i !== activeIndex}
              importantForAccessibility={i === activeIndex ? 'auto' : 'no-hide-descendants'}
            >
              {child}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, overflow: 'hidden', backgroundColor: 'transparent' },
  row:   { flex: 1, flexDirection: 'row' },
  tab:   { flex: 1, overflow: 'hidden' },
});
