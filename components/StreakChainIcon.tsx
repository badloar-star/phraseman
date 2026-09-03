import React, { memo, useEffect } from 'react';
import { type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { ThemeMode } from '../constants/theme';
import { getStreakFeatherIconVariant, getStreakFreezeIconVariant } from '../constants/streakIconAssets';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { useRuntimeActive } from '../hooks/use_runtime_active';

const AnimatedImage = Animated.createAnimatedComponent(Image);

// зачем: ТЗ «Единое перо цепочки дней» — спокойное дыхание начинается с
// третьей ступени (цепочка от 20 дней), чтобы новичок видел статичное перо,
// а «живым» оно становилось как награда за набранную серию.
const BREATH_FROM_DAYS = 20;
const BREATH_SCALE = 1.035;
const BREATH_HALF_MS = 1300; // полный цикл ≈ 2.6 с

interface StreakChainIconProps {
  themeMode: ThemeMode;
  streakDays: number;
  frozen?: boolean;
  inactive?: boolean;
  /** Разрешение сверху: экран виден и дыхание тут уместно (крупная личная иконка). */
  breathing?: boolean;
  size: number;
  style?: StyleProp<ImageStyle>;
}

function StreakChainIconBase({
  themeMode,
  streakDays,
  frozen = false,
  inactive = false,
  breathing = false,
  size,
  style,
}: StreakChainIconProps) {
  const variant = frozen
    ? getStreakFreezeIconVariant(themeMode)
    : getStreakFeatherIconVariant(themeMode, streakDays);

  const reduceMotion = useReduceMotion();
  // зачем: Performance Bible запрещает withRepeat(-1) без гейта фокуса и
  // AppState — иначе перо продолжало бы греть UI-поток в свёрнутом приложении.
  const runtimeActive = useRuntimeActive();
  const breath = useSharedValue(1);

  const alive =
    breathing && !frozen && !inactive && streakDays >= BREATH_FROM_DAYS && runtimeActive && !reduceMotion;

  useEffect(() => {
    if (alive) {
      breath.value = withRepeat(
        withSequence(
          withTiming(BREATH_SCALE, { duration: BREATH_HALF_MS, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: BREATH_HALF_MS, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      // Reduce Motion и уход с экрана → перо спокойно садится в базовый кадр.
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 180 });
    }
    return () => {
      cancelAnimation(breath);
    };
  }, [alive, breath]);

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  return (
    <AnimatedImage
      source={variant.source}
      contentFit="contain"
      accessibilityIgnoresInvertColors
      style={[
        { width: size, height: size, opacity: inactive && !frozen ? 0.42 : 1 },
        breathStyle,
        style,
      ]}
    />
  );
}

export const StreakChainIcon = memo(StreakChainIconBase);
