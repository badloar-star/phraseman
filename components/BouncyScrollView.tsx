import React, { forwardRef } from 'react';
import { ScrollView, type ScrollViewProps, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * Кросс-платформенная overscroll-резинка («потяни за край» как в Telegram/Instagram).
 *
 * На Android родной `bounces` не работает (iOS-only), а glow почти не виден.
 * Здесь резинка — через Reanimated + gesture-handler: контент у края тянется с
 * затухающим сопротивлением и пружинит назад. Ничего не «обновляется».
 *
 * Drop-in замена ScrollView: прокидывает все пропсы и ref.
 * Тот же паттерн, что у app/TabSlider.tsx (Gesture.Pan + Animated.View) — он
 * заведомо работает в этом проекте.
 */
export interface BouncyScrollViewProps extends ScrollViewProps {
  maxStretch?: number;
  damping?: number;
}

const BouncyScrollView = forwardRef<ScrollView, BouncyScrollViewProps>(function BouncyScrollView(
  { children, onScroll, maxStretch = 110, damping = 15, scrollEnabled = true, ...rest },
  ref,
) {
  const offsetY = useSharedValue(0);
  const maxOffsetY = useSharedValue(0);
  const stretch = useSharedValue(0);
  const ms = useSharedValue(maxStretch);
  ms.value = maxStretch;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    offsetY.value = contentOffset.y;
    maxOffsetY.value = Math.max(0, contentSize.height - layoutMeasurement.height);
    onScroll?.(e);
  };

  const pan = Gesture.Pan()
    .enabled(scrollEnabled)
    // Активируемся на вертикали, сдаёмся на горизонтали — чтобы не мешать
    // свайпу табов (TabSlider зеркально: активен на X, сдаётся на Y) и тапам.
    .activeOffsetY([-14, 14])
    .failOffsetX([-18, 18])
    .onUpdate((e) => {
      'worklet';
      const dy = e.translationY;
      const limit = ms.value;
      const atTop = offsetY.value <= 0 && dy > 0;
      const atBottom = offsetY.value >= maxOffsetY.value && dy < 0;
      if (atTop || atBottom) {
        const sign = dy < 0 ? -1 : 1;
        const mag = Math.min(Math.abs(dy), 600);
        stretch.value = sign * limit * (1 - Math.exp(-mag / (limit * 1.6)));
      } else {
        stretch.value = 0;
      }
    })
    .onEnd(() => {
      'worklet';
      stretch.value = withSpring(0, { damping, stiffness: 180, mass: 0.6 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stretch.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.ScrollView
        ref={ref as any}
        scrollEnabled={scrollEnabled}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        {...rest}
      >
        <Animated.View style={animatedStyle}>{children}</Animated.View>
      </Animated.ScrollView>
    </GestureDetector>
  );
});

export default BouncyScrollView;
