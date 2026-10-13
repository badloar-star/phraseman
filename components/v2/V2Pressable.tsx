import React, { memo, useCallback, useMemo, useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { KIT_PRESS_DOWN, KIT_PRESS_OPACITY_DOWN, KIT_PRESS_OPACITY_UP, KIT_PRESS_SCALE, KIT_PRESS_UP } from '../../constants/kitPress';

type PassthroughProps = Omit<PressableProps, 'style' | 'children' | 'onPressIn' | 'onPressOut'>;

interface Props extends PassthroughProps {
  /** Раскладка и вид карточки — применяются к тому слою, что сжимается. */
  style?: StyleProp<ViewStyle>;
  /** Место в родителе (flex, ширина) — для внешней зоны нажатия. */
  outerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  /** Насколько сжимается при нажатии. Карточки — 0.97–0.98, мелкие кнопки — 0.94. */
  scaleTo?: number;
  withHaptic?: boolean;
}

/** Прозрачность, которую вызывающий задал в `style` (приглушение «недоступно»); без неё или вне 0…1 — 1. */
export function v2PressableStyleOpacity(style: StyleProp<ViewStyle>): number {
  // Последнее заданное значение побеждает — как при склейке стилей.
  const pick = (s: StyleProp<ViewStyle>): number | undefined => {
    if (Array.isArray(s)) {
      for (let i = s.length - 1; i >= 0; i -= 1) { const v = pick(s[i] as StyleProp<ViewStyle>); if (v !== undefined) return v; }
      return undefined;
    }
    return s && typeof s === 'object' && typeof (s as ViewStyle).opacity === 'number' ? (s as ViewStyle).opacity as number : undefined;
  };
  const value = pick(style);
  return value !== undefined && value >= 0 && value < 1 ? value : 1;
}

/**
 * Нажимаемая поверхность стиля 2.0.
 *
 * зачем: TapScale кладёт детей во внутренний Animated.View без стиля, поэтому
 * flexDirection/gap/padding карточки к детям не доходили — строки «Сегодня» и
 * плашки «Серия/Монеты» рассыпались столбиком. Здесь стиль живёт на слое, который
 * сжимается, а отклик — масштаб и мягкое затемнение до .86 (kit `.t.down`; не 0.6, которое
 * на больших карточках выглядит как мигание) на нативном драйвере.
 */
function V2Pressable({ style, outerStyle, children, scaleTo = KIT_PRESS_SCALE, withHaptic = true, disabled, ...rest }: Props) {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // зачем (координатор 10.10, гейт «приложение = макет»): нажатие — как у всех обёрток: kit.css `.t` — вдавливание 90 мс до scaleTo и
  // opacity .86, отпускание 240 мс cubic-bezier(.3,1.4,.5,1) (раньше здесь была своя пружина 520/34 без прозрачности).
  const animateTo = useCallback((toValue: number) => {
    if (reduceMotion) { scale.setValue(1); return; }
    const pressed = toValue !== 1;
    Animated.parallel([
      Animated.timing(scale, { toValue, ...(pressed ? KIT_PRESS_DOWN : KIT_PRESS_UP), useNativeDriver: true }),
      Animated.timing(opacity, { ...(pressed ? KIT_PRESS_OPACITY_DOWN : KIT_PRESS_OPACITY_UP), useNativeDriver: true }),
    ]).start();
  }, [opacity, reduceMotion, scale]);

  const onPressIn = useCallback(() => {
    animateTo(scaleTo);
    if (withHaptic && !disabled) hapticTap();
  }, [animateTo, disabled, scaleTo, withHaptic]);

  const onPressOut = useCallback(() => animateTo(1), [animateTo]);

  // зачем (Макеты 13.10, paywalls-013): `[style, { opacity }]` — прозрачность нажатия (1) перекрывала `opacity` из стиля, и с 10.10
  // молча не гасли «недоступные» кнопки (× и «Восстановить» во время оплаты, использованные слова Шпиля). Прозрачность стиля
  // умножается на прозрачность нажатия; без своей прозрачности — прежний путь без лишнего узла.
  const baseOpacity = v2PressableStyleOpacity(style);
  const layerOpacity = useMemo(() => (baseOpacity === 1 ? opacity : Animated.multiply(opacity, baseOpacity)), [baseOpacity, opacity]);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      accessibilityState={{ ...rest.accessibilityState, disabled: !!disabled }}
      style={outerStyle}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[style, { opacity: layerOpacity, transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default memo(V2Pressable);
