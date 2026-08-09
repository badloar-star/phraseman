import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import Reanimated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING } from '../constants/motion';
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
  /** @deprecated Сохранено для совместимости. Декоративная кромка больше не рисуется. */
  edgeColor?: string;
  /** @deprecated Сохранено для совместимости. Нажатие больше не меняет геометрию. */
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

/**
 * Кнопка с коротким press-откликом без декоративной обводки и сдвига геометрии.
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
  edgeColor: _edgeColor,
  edgeHeight: _edgeHeight = 6,
  gradientColors,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  withHaptic = true,
  pressedExternally = false,
  delayPressIn = 0,
  ...rest
}: Props) {
  const press = useSharedValue(0);
  // Внешнее удержание «вдавленным» — отдельный канал, чтобы palec-press и
  // программное удержание не затирали друг друга.
  const held = useSharedValue(0);

  const pressIn = useCallback((event: GestureResponderEvent) => {
    press.value = withSpring(1, MOTION_SPRING.micro);
    if (withHaptic && !disabled) hapticTap();
    onPressIn?.(event);
  }, [press, withHaptic, disabled, onPressIn]);

  const pressOut = useCallback((event: GestureResponderEvent) => {
    press.value = withSpring(0, MOTION_SPRING.micro);
    onPressOut?.(event);
  }, [press, onPressOut]);

  useEffect(() => {
    held.value = withSpring(pressedExternally ? 1 : 0, MOTION_SPRING.micro);
  }, [pressedExternally, held]);

  const flattenedSurfaceStyle = useMemo(() => StyleSheet.flatten(style) as ViewStyle | undefined, [style]);
  const surfaceOpacity = typeof flattenedSurfaceStyle?.opacity === 'number' ? flattenedSurfaceStyle.opacity : undefined;
  const surfaceOpacityStyle = surfaceOpacity === undefined ? null : { opacity: surfaceOpacity };
  const surfaceBaseStyle = useMemo<StyleProp<ViewStyle>>(() => {
    if (surfaceOpacity === undefined || !flattenedSurfaceStyle) return style;
    const { opacity: _opacity, ...restStyle } = flattenedSurfaceStyle as ViewStyle & { opacity?: number };
    return restStyle;
  }, [flattenedSurfaceStyle, style, surfaceOpacity]);

  // Короткое сжатие и снижение прозрачности дают понятный press-state, но не
  // создают цветную «обводку» и не двигают соседний контент.
  const surfaceStyle = useAnimatedStyle(() => {
    const depth = Math.max(press.value, held.value);
    return {
      transform: [{ scale: interpolate(depth, [0, 1], [1, 0.97]) }],
      opacity: interpolate(depth, [0, 1], [1, 0.88]),
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
      style={[styles.wrap, surfaceOpacityStyle, wrapStyle]}
    >
      <Reanimated.View style={[styles.surface, surfaceBaseStyle, gradientColors ? styles.surfaceClip : null, surfaceStyle]}>
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
