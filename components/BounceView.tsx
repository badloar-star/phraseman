import React from 'react';
import { type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * Кросс-платформенная «резинка» для экранов БЕЗ скролла.
 *
 * На скролл-экранах за overscroll-резинку отвечает `BouncyScrollView`. Но там,
 * где контент целиком влезает в экран, скроллить нечего — «края» нет. Здесь любой
 * вертикальный потяг сдвигает весь контент с затухающим сопротивлением и пружинит
 * назад (тот же Telegram/Instagram-фил), даже когда двигать по сути некуда.
 *
 * Тот же паттерн, что у `app/TabSlider.tsx` и `components/BouncyScrollView.tsx`
 * (Gesture.Pan + Animated.View) — он заведомо работает в этом проекте на Fabric
 * (`newArchEnabled=true`), где defaultProps на host-компонентах игнорируются.
 *
 * Drop-in: оборачивает контент. Ставить ВНУТРИ фона (SafeAreaView/корневой View),
 * чтобы фон (`ScreenGradient`) и абсолютные оверлеи/модалки оставались на месте,
 * а тянулся только контент.
 */
export interface BounceViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Максимальное смещение при «дотягивании» (px). */
  maxStretch?: number;
  /** Жёсткость возврата: меньше — мягче пружинит. */
  damping?: number;
  enabled?: boolean;
}

export default function BounceView({
  children,
  style,
  maxStretch = 90,
  damping = 15,
  enabled = true,
}: BounceViewProps) {
  const stretch = useSharedValue(0);
  const ms = useSharedValue(maxStretch);
  ms.value = maxStretch;

  const pan = Gesture.Pan()
    .enabled(enabled)
    // Активируемся на вертикали, сдаёмся на горизонтали — чтобы не мешать тапам,
    // кнопкам и горизонтальным back-свайпам. (Зеркально к TabSlider, который
    // активен на X и сдаётся на Y.)
    .activeOffsetY([-14, 14])
    .failOffsetX([-18, 18])
    .onUpdate((e) => {
      'worklet';
      const dy = e.translationY;
      const limit = ms.value;
      // Скроллить некуда, поэтому тянем в обе стороны с логарифмическим
      // сопротивлением (та же формула, что в BouncyScrollView).
      const sign = dy < 0 ? -1 : 1;
      const mag = Math.min(Math.abs(dy), 600);
      stretch.value = sign * limit * (1 - Math.exp(-mag / (limit * 1.6)));
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
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
