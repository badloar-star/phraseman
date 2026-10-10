import React, { memo, useCallback, useRef } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { KIT_PRESS_DOWN, KIT_PRESS_OPACITY_DOWN, KIT_PRESS_OPACITY_UP, KIT_PRESS_UP } from '../../constants/kitPress';

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

/**
 * Нажимаемая поверхность стиля 2.0.
 *
 * зачем: TapScale кладёт детей во внутренний Animated.View без стиля, поэтому
 * flexDirection/gap/padding карточки к детям не доходили — строки «Сегодня» и
 * плашки «Серия/Монеты» рассыпались столбиком. Здесь стиль живёт на слое, который
 * сжимается, а отклик — масштаб и мягкое затемнение до .86 (kit `.t.down`; не 0.6, которое
 * на больших карточках выглядит как мигание) на нативном драйвере.
 */
function V2Pressable({ style, outerStyle, children, scaleTo = 0.97, withHaptic = true, disabled, ...rest }: Props) {
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
      <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default memo(V2Pressable);
