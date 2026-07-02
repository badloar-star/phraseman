import React, { memo, useEffect, useState } from 'react';
import {
  AppState,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from './SafeLinearGradient';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';

interface SkeletonBlockProps {
  /** Ширина блока. Число (px) или строка-процент ('60%'). */
  width: DimensionValue;
  /** Высота блока в px. */
  height: number;
  /** Радиус скругления. Default — половина высоты (капсула). */
  borderRadius?: number;
  /** Период одного прохода блика, мс. Default 1400. */
  durationMs?: number;
  /** Базовый цвет «кости». Default — полупрозрачный светлый. */
  baseColor?: string;
  /** Цвет бегущего блика. Default — чуть светлее базового. */
  highlightColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Один shimmer-блок: серый прямоугольник/капсула с бегущим слева-направо
 * переливом — как «прогружающиеся» плашки в Instagram. Работает на UI-потоке
 * (Reanimated). Ширину блика берём из onLayout, чтобы двигать translateX в
 * пикселях (как ShineOverlay) — без строкового `%` в transform, который ломок
 * на части версий Reanimated.
 *
 * Это НЕ спиннер: блок имитирует форму будущего контента, чтобы переход
 * «загрузка → данные» был плавным, без скачка лэйаута.
 */
function SkeletonBlockBase({
  width,
  height,
  borderRadius,
  durationMs = 1400,
  baseColor = 'rgba(255,255,255,0.08)',
  highlightColor = 'rgba(255,255,255,0.20)',
  style,
}: SkeletonBlockProps) {
  const sweep = useSharedValue(0);
  const [measuredW, setMeasuredW] = useState(0);
  const isFocused = useIsScreenFocused();

  // Луп бежит только когда экран виден И приложение на переднем плане: при
  // freezeOnBlur:false скелетон может пережить уход с экрана — гард гасит его,
  // чтобы блик не перерисовывался в фоне и не грел телефон.
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    };
    const stop = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(sweep);
    };
  }, [sweep, durationMs, measuredW, isFocused]);

  const bandWidth = Math.max(48, measuredW * 0.6);

  const shineStyle = useAnimatedStyle(() => {
    const x = interpolate(sweep.value, [0, 1], [-bandWidth, measuredW + bandWidth]);
    return { transform: [{ translateX: x }] };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== measuredW) setMeasuredW(w);
  };

  const radius = borderRadius ?? height / 2;

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        { width, height, borderRadius: radius, backgroundColor: baseColor, overflow: 'hidden' },
        style,
      ]}
    >
      {measuredW > 0 && (
        <Reanimated.View style={[{ width: bandWidth, height: '100%' }, shineStyle]}>
          <LinearGradient
            colors={['transparent', highlightColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );
}

const SkeletonBlock = memo(SkeletonBlockBase);
export default SkeletonBlock;
