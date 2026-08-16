import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { hapticTap } from '../hooks/use-haptics';
import { PRESS } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { mergeAccessibilityDisabled } from './a11y_state';

// Пробрасываем нативные пропсы Pressable (a11y, testID, hitSlop), кроме тех,
// что компонент обрабатывает сам.
type PassthroughPressableProps = Omit<
  PressableProps,
  'onPress' | 'onLongPress' | 'onPressIn' | 'onPressOut' | 'style' | 'disabled' | 'children'
>;

interface Props extends PassthroughPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  /** Runs together with DuoPressable's built-in press animation. */
  onPressIn?: PressableProps['onPressIn'];
  /** Runs together with DuoPressable's built-in release animation. */
  onPressOut?: PressableProps['onPressOut'];
  /** Стиль ВЕРХНЕЙ (нажимаемой) поверхности — фон/радиус/паддинги кнопки. */
  style?: StyleProp<ViewStyle>;
  /** Стиль внешней обёртки (margin, alignSelf, ширина в layout). */
  wrapStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  /**
   * Цвет «подошвы» под лицом кнопки. Задан → рисуется отдельный статичный слой
   * ниже лица (та же ширина/радиус), который НЕ двигается и не масштабируется —
   * именно он создаёт объём клавиши. Не задан → кнопка плоская (старое
   * поведение), кромка не рисуется и лишняя высота не резервируется.
   */
  edgeColor?: string;
  /**
   * Высота кромки в px — на столько лицо уезжает вниз при нажатии (кромка
   * визуально «схлопывается» до нуля). Учитывается в разметке: обёртка
   * резервирует под неё место, чтобы контент под кнопкой не прыгал.
   */
  edgeHeight?: number;
  /** Градиент поверхности (для градиентных CTA). Если задан — рисуется LinearGradient под children. */
  gradientColors?: readonly string[];
  /** start/end градиента (по умолчанию диагональ). */
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  withHaptic?: boolean;
  /**
   * Удерживать лицо «вдавленным» извне (поверх реального press пальца). Нужно,
   * когда объём должен оставаться на время вспышки/отклика, а не только пока
   * палец зажат (плитка успевает показать глубину даже при быстром тапе).
   */
  pressedExternally?: boolean;
  /**
   * Необязательная задержка press-фидбэка для отдельных элементов внутри
   * конфликтующего скролла. Обычные кнопки обязаны отвечать в тот же кадр,
   * поэтому глобальное значение по умолчанию равно 0.
   */
  delayPressIn?: number;
}

// зачем: владелец — «кромка должна продавливаться, а не всё целиком» (2026-08-16).
// Плоские кнопки (без edgeColor) получают тот же честный keycap-принцип в
// миниатюре: лёгкий сдвиг вниз без scale/opacity, вместо старого
// «сжимается весь блок» (выглядело как второй слой под кнопкой).
const FLAT_PRESS_TRANSLATE_Y = 1.5;

/**
 * Кнопка-клавиша: статичная цветная «подошва» (edge) снизу + лицо (face),
 * которое едет вниз на edgeHeight при нажатии — кромка визуально схлопывается
 * до нуля, как у настоящей клавиши. Без edgeColor — плоская кнопка с лёгким
 * translateY, без scale и без падения opacity.
 * Если в style приходит opacity, переносим её на wrapper, чтобы сохранить
 * disabled-состояние отдельно от анимированной прозрачности поверхности.
 */
function DuoPressable({
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  style,
  wrapStyle,
  children,
  disabled,
  edgeColor,
  edgeHeight = 6,
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  withHaptic = true,
  pressedExternally = false,
  delayPressIn = 0,
  ...rest
}: Props) {
  const hasEdge = !!edgeColor;
  const travel = hasEdge ? edgeHeight : FLAT_PRESS_TRANSLATE_Y;
  const reduceMotion = useReduceMotion();

  const press = useSharedValue(0);
  // Внешнее удержание «вдавленным» — отдельный канал, чтобы palec-press и
  // программное удержание не затирали друг друга.
  const held = useSharedValue(0);

  const pressIn = useCallback((event: GestureResponderEvent) => {
    press.value = reduceMotion ? 1 : withTiming(1, { duration: PRESS.downMs });
    if (withHaptic && !disabled) hapticTap();
    onPressIn?.(event);
  }, [press, reduceMotion, withHaptic, disabled, onPressIn]);

  const pressOut = useCallback((event: GestureResponderEvent) => {
    press.value = reduceMotion ? 0 : withSpring(0, PRESS.release);
    onPressOut?.(event);
  }, [press, reduceMotion, onPressOut]);

  useEffect(() => {
    const next = pressedExternally ? 1 : 0;
    held.value = reduceMotion ? next : withSpring(next, PRESS.release);
  }, [pressedExternally, reduceMotion, held]);

  const flattenedSurfaceStyle = useMemo(() => StyleSheet.flatten(style) as ViewStyle | undefined, [style]);
  const surfaceOpacity = typeof flattenedSurfaceStyle?.opacity === 'number' ? flattenedSurfaceStyle.opacity : undefined;
  const surfaceOpacityStyle = surfaceOpacity === undefined ? null : { opacity: surfaceOpacity };
  const surfaceBaseStyle = useMemo<StyleProp<ViewStyle>>(() => {
    if (surfaceOpacity === undefined || !flattenedSurfaceStyle) return style;
    const { opacity: _opacity, ...restStyle } = flattenedSurfaceStyle as ViewStyle & { opacity?: number };
    return restStyle;
  }, [flattenedSurfaceStyle, style, surfaceOpacity]);

  const radius = typeof flattenedSurfaceStyle?.borderRadius === 'number' ? flattenedSurfaceStyle.borderRadius : styles.surface.borderRadius;

  // Лицо едет вниз на всю высоту кромки (или на лёгкий флэт-сдвиг без кромки).
  // Никакого scale/opacity — вдавливание читается только по геометрии, как у
  // настоящей клавиши.
  const faceStyle = useAnimatedStyle(() => {
    const depth = Math.max(press.value, held.value);
    return {
      transform: [{ translateY: depth * travel }],
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      unstable_pressDelay={delayPressIn}
      disabled={disabled}
      accessibilityState={mergeAccessibilityDisabled(rest.accessibilityState, disabled)}
      style={[styles.wrap, hasEdge ? { paddingBottom: edgeHeight } : null, surfaceOpacityStyle, wrapStyle]}
    >
      {hasEdge ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, backgroundColor: edgeColor }]} />
      ) : null}
      <Reanimated.View style={[styles.surface, surfaceBaseStyle, gradientColors ? styles.surfaceClip : null, faceStyle]}>
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors as unknown as readonly [string, string, ...string[]]}
            start={gradientStart}
            end={gradientEnd}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}
        {children}
      </Reanimated.View>
    </Pressable>
  );
}

export default memo(DuoPressable);

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    position: 'relative',
  },
  surface: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  surfaceClip: {
    overflow: 'hidden',
  },
});
