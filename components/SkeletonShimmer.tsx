import React, { memo, useEffect, useLayoutEffect, useState } from 'react';
import {
  AppState,
  InteractionManager,
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
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import LinearGradient from './SafeLinearGradient';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

/** Предохранитель: сколько проходов блика максимум (≈ 84 с при 1400 мс). Скелет дольше минуты — это уже не загрузка, а зависание; крутить блик вечно незачем. */
export const SHIMMER_MAX_LOOPS = 60;

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
  baseColor: baseColorProp,
  highlightColor: highlightColorProp,
  style,
}: SkeletonBlockProps) {
  // зачем (10.10, замечание владельца о цвете не от темы): белая заглушка на светлой теме не видна — на светлой берём тон из токенов,
  // на тёмных значения прежние (пиксель в пиксель).
  const { liquidGlassThemeId } = useTheme();
  const skeletonGlass = liquidGlassTokens(liquidGlassThemeId);
  const baseColor = baseColorProp ?? (skeletonGlass.isLight ? skeletonGlass.hairlineSoft : 'rgba(255,255,255,0.08)'); // theme-exempt: тёмные темы — прежний вид
  const highlightColor = highlightColorProp ?? (skeletonGlass.isLight ? skeletonGlass.glassEdge : 'rgba(255,255,255,0.20)'); // theme-exempt: тёмные темы — прежний вид
  const sweep = useSharedValue(0);
  const [measuredW, setMeasuredW] = useState(0);
  const isFocused = useIsScreenFocused();
  // зачем (PM-033-A1): при системном «Уменьшить движение» блик не бегает —
  // остаётся статичная плашка той же формы (при sweep=0 блик за левым краем).
  const reducedMotion = useReducedMotion();

  // зачем (R08 «зависание интерфейса», Ревизор fd1d5d589, координатор 15.10): бесконечный блик крутился ровно в момент, когда скелет заменяется большим содержимым (~30 экранов), —
  // непрерывные коммиты анимации на Fabric могли перебить коммит React, и интерфейс замирал до касания. Правила:
  //  1) блик стартует только когда блок ИЗМЕРЕН (onLayout, measuredW > 0), экран ВИДЕН и нет «Уменьшить движение»;
  //  2) старт — после InteractionManager.runAfterInteractions: не посреди монтирования большого содержимого и не поверх идущих переходов;
  //  3) остановка на размонтировании — в очистке useLayoutEffect (срабатывает в самом коммите, до отрисовки заменяющего содержимого), а не в пассивной очистке позже;
  //  4) уход с экрана и фон приложения гасят анимацию и отменяют отложенный старт;
  //  5) цикл конечный (SHIMMER_MAX_LOOPS проходов): зависший скелет не крутится вечно, после — статичная плашка.
  useLayoutEffect(() => () => { cancelAnimation(sweep); }, [sweep]);

  useEffect(() => {
    if (measuredW <= 0 || !isFocused || reducedMotion) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return undefined;
    }
    let disposed = false;
    let pending: { cancel: () => void } | null = null;
    const start = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.ease) }),
        SHIMMER_MAX_LOOPS,
        false,
      );
    };
    const stop = () => {
      pending?.cancel();
      pending = null;
      cancelAnimation(sweep);
      sweep.value = 0;
    };
    const scheduleStart = () => {
      pending?.cancel();
      pending = InteractionManager.runAfterInteractions(() => {
        pending = null;
        if (!disposed && AppState.currentState === 'active') start();
      });
    };

    if (AppState.currentState === 'active') scheduleStart();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleStart();
      else stop();
    });
    return () => {
      disposed = true;
      appSub.remove();
      stop();
    };
  }, [sweep, durationMs, measuredW, isFocused, reducedMotion]);

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
