import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
  /** Стиль ВЕРХНЕЙ (нажимаемой) поверхности — фон/радиус/паддинги кнопки. */
  style?: StyleProp<ViewStyle>;
  /** Стиль внешней обёртки (margin, alignSelf, ширина в layout). */
  wrapStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  /** Цвет «3D-кромки» (тень снизу). По умолчанию — затемнённый фон кнопки. */
  edgeColor?: string;
  /** Высота 3D-кромки в покое (px). Default 6. */
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
}

/**
 * Duolingo-style 3D-кнопка: при нажатии «вдавливается» в свою цветную кромку.
 *
 * Отличие от PressableScale (просто scale): здесь верхняя поверхность съезжает
 * вниз по translateY на высоту кромки, а сама кромка сжимается — даёт ощущение
 * физической глубины, как кнопка проверки ответа в Duolingo.
 *
 * Кромку рисуем отдельным View ПОД поверхностью; передавай фон/радиус/паддинги
 * кнопки через `style` (как у обычной кнопки). edgeColor по умолчанию темнее фона.
 *
 * На Reanimated — анимация на UI-потоке. Для иконок используй TapScale,
 * для простых full-width без 3D — PressableScale.
 */
function DuoPressable({
  onPress,
  onLongPress,
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
  ...rest
}: Props) {
  const press = useSharedValue(0);
  // Внешнее удержание «вдавленным» — отдельный канал, чтобы palec-press и
  // программное удержание не затирали друг друга.
  const held = useSharedValue(0);

  const pressIn = useCallback(() => {
    if (withHaptic && !disabled) hapticTap();
    press.value = withSpring(1, MOTION_SPRING.micro);
  }, [press, withHaptic, disabled]);

  const pressOut = useCallback(() => {
    press.value = withSpring(0, MOTION_SPRING.micro);
  }, [press]);

  useEffect(() => {
    held.value = withSpring(pressedExternally ? 1 : 0, MOTION_SPRING.micro);
  }, [pressedExternally, held]);

  // Лицо опускается вниз на высоту кромки при нажатии — «оседает» на кромку.
  // Кромка НЕ двигается (это нижний слой), лицо её накрывает. Тени сверху нет.
  // Глубина = max(реальный press, внешнее удержание) — depressed остаётся на
  // время вспышки, даже когда палец уже отпущен.
  const surfaceStyle = useAnimatedStyle(() => {
    const depth = Math.max(press.value, held.value);
    return { transform: [{ translateY: interpolate(depth, [0, 1], [0, edgeHeight]) }] };
  });

  // Кромка должна повторять скругление ЛИЦА, иначе цветная кромка снизу торчит
  // с другим радиусом углов и объём читается «сломанным» (углы кромки острее
  // углов кнопки). Копируем ВСЕ заданные радиусы лица (uniform + по-угловые,
  // число или строка-процент), а не только числовой borderRadius — иначе кнопки
  // с pill/по-угловым скруглением остаются с дефолтной кромкой 16.
  const edgeRadiusStyle = useMemo<ViewStyle | null>(() => {
    const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
    if (!flat) return null;
    const RADIUS_KEYS = [
      'borderRadius',
      'borderTopLeftRadius',
      'borderTopRightRadius',
      'borderBottomLeftRadius',
      'borderBottomRightRadius',
      'borderTopStartRadius',
      'borderTopEndRadius',
      'borderBottomStartRadius',
      'borderBottomEndRadius',
    ] as const;
    let out: ViewStyle | null = null;
    for (const k of RADIUS_KEYS) {
      const v = (flat as Record<string, unknown>)[k];
      if (typeof v === 'number' || typeof v === 'string') {
        (out ??= {} as ViewStyle)[k] = v as never;
      }
    }
    return out;
  }, [style]);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityState={mergeAccessibilityDisabled(rest.accessibilityState, disabled)}
      style={[styles.wrap, { paddingBottom: edgeHeight }, wrapStyle]}
    >
      {/* Кромка — нижний слой, стоит на месте. Видна полоской снизу (top сдвинут
          на edgeHeight, так что верх кромки совпадает с верхом лица в покое). */}
      <View
        pointerEvents="none"
        style={[
          styles.edge,
          { top: edgeHeight },
          edgeRadiusStyle,
          edgeColor ? { backgroundColor: edgeColor } : styles.edgeDefault,
        ]}
      />
      {/* Лицо — обычный поток, при нажатии съезжает вниз на edgeHeight. */}
      <Reanimated.View style={[styles.surface, style, gradientColors ? styles.surfaceClip : null, surfaceStyle]}>
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
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
  },
  edgeDefault: {
    // По умолчанию полупрозрачная тёмная кромка — работает на любом фоне кнопки.
    backgroundColor: 'rgba(0,0,0,0.28)',
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
