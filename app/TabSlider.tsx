import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
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
  const { width: W } = useScreen();

  // All shared values run on the UI thread — no JS overhead during gesture
  const translateX  = useSharedValue(-activeIndex * W);
  const currentIdx  = useSharedValue(activeIndex);
  const isAnimating = useSharedValue(false);
  const tabWidth    = useSharedValue(W);
  const tabCount    = useSharedValue(React.Children.count(children));

  // JS-side refs for callbacks (worklets call runOnJS to reach them)
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

  // Snap when activeIndex changes from outside (tab bar tap) — JS thread only
  useLayoutEffect(() => {
    if (currentIdx.value !== activeIndex && !isAnimating.value) {
      currentIdx.value = activeIndex;
      cancelAnimation(translateX);
      translateX.value = -activeIndex * W;
    }
  }, [activeIndex, W, translateX, currentIdx, isAnimating]);

  const fireSwipeStart    = (i: number) => { onSwipeStartRef.current?.(i); };
  const fireSwipeComplete = (i: number) => { onSwipeCompleteRef.current?.(i); };

  const pan = Gesture.Pan()
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
        runOnJS(fireSwipeStart)(toIdx);
        translateX.value = withTiming(
          -toIdx * w,
          { duration: 260, easing: Easing.out(Easing.cubic) },
          (finished) => {
            'worklet';
            isAnimating.value = false;
            if (finished) runOnJS(fireSwipeComplete)(toIdx);
          }
        );
      } else if (shouldGoPrev) {
        const toIdx = idx - 1;
        isAnimating.value = true;
        currentIdx.value  = toIdx;
        runOnJS(fireSwipeStart)(toIdx);
        translateX.value = withTiming(
          -toIdx * w,
          { duration: 260, easing: Easing.out(Easing.cubic) },
          (finished) => {
            'worklet';
            isAnimating.value = false;
            if (finished) runOnJS(fireSwipeComplete)(toIdx);
          }
        );
      } else {
        // Возврат на место — spring с ощущением упругости
        translateX.value = withSpring(-idx * w, {
          damping: 22,
          stiffness: 220,
          mass: 0.4,
          velocity: vx,
        });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const tabs = React.Children.toArray(children);

  return (
    <GestureDetector gesture={pan}>
      <View style={s.outer}>
        <Animated.View style={[s.row, { width: W * tabs.length }, animStyle]}>
          {tabs.map((child, i) => (
            <View key={i} style={[s.tab, { width: W }]}>
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
