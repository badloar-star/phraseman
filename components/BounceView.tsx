import React from 'react';
import { useWindowDimensions, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * Кросс-платформенная «резинка» для экранов БЕЗ скролла — ТОЛЬКО тяга вниз.
 *
 * Где контент целиком влезает в экран, скроллить нечего. Здесь потяг ВНИЗ
 * сдвигает контент с тем же сопротивлением, что у `BouncyScrollView` (формула
 * Apple), и пружинит назад. Тяга вверх игнорируется (симметрично скролл-резинке,
 * которая активна только у верхнего края).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ВАЖНО (Fabric): translateY-узел вынесен НАРУЖУ GestureDetector. Если
 * <Animated.View style={animatedStyle}> положить ВНУТРЬ <GestureDetector>,
 * GestureDetector.Wrap клонирует его, ремаунтит Reanimated-узел и роняет
 * приложение: "set key `current` on frozen object". Поэтому здесь:
 *   <Animated.View style={animatedStyle}>      ← translateY снаружи
 *     <GestureDetector><Animated.View>{children}</Animated.View></GestureDetector>
 *
 * Drop-in: оборачивает контент. Ставить ВНУТРИ фона (SafeAreaView/корневой View),
 * чтобы фон (`ScreenGradient`) и абсолютные оверлеи/модалки оставались на месте.
 */

// Физика iOS/Telegram — см. BouncyScrollView.tsx.
const APPLE_C = 0.55;
const SPRING = { dampingRatio: 1, duration: 500 } as const;

export interface BounceViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Высота вьюпорта для формулы сопротивления. По умолчанию — высота экрана. */
  dimension?: number;
  enabled?: boolean;
}

export default function BounceView({
  children,
  style,
  dimension,
  enabled = true,
}: BounceViewProps) {
  const { height: screenH } = useWindowDimensions();
  const dim = dimension ?? screenH;
  const stretch = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetY(10)
    .failOffsetX([-18, 18])
    .onUpdate((e) => {
      'worklet';
      // Только тяга ВНИЗ (translationY > 0). Вверх — игнор.
      if (e.translationY <= 0) {
        stretch.value = 0;
        return;
      }
      // Сопротивление по формуле Apple: (x·d·c)/(d+c·x).
      stretch.value = (e.translationY * dim * APPLE_C) / (dim + APPLE_C * e.translationY);
    })
    .onEnd(() => {
      'worklet';
      stretch.value = withSpring(0, SPRING);
    })
    .onFinalize(() => {
      'worklet';
      if (stretch.value !== 0) stretch.value = withSpring(0, SPRING);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stretch.value }],
  }));

  // translateY-узел СНАРУЖИ GestureDetector — ключ к отсутствию вылетов.
  return (
    <Animated.View style={[style, animatedStyle]}>
      <GestureDetector gesture={pan}>
        <Animated.View style={{ flex: 1 }}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
