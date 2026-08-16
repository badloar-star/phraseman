/**
 * PressableScale — обёртка кнопки FeedbackKit с физикой вдавливания (спек §2).
 *
 * Reanimated, всё на UI-треде: при нажатии кнопка «вдавливается» — чистый
 * translateY БЕЗ scale (владелец 2026-08-16: «вдавливание = сжатие всего
 * блока» читалось как второй слой под кнопкой, а не как продавленная кромка).
 * Возврат — пружиной. На onPressIn зовёт fk.tap() (тихий клик + light haptic;
 * сам fk уважает тумблеры). variant:
 *  - '3d'   — кнопки ответов/CTA (заметное вдавливание вниз),
 *  - 'flat' — мелкие элементы (тоньше ход).
 *
 * Perf: без вечных таймеров/циклов — только пружины на событие нажатия;
 * на unmount отменяем анимации.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import fk from '../../app/feedback/feedback_kit';
import { PRESS } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type PressableScaleVariant = '3d' | 'flat';

export interface PressableScaleProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Заметность вдавливания. По умолчанию '3d'. */
  variant?: PressableScaleVariant;
  /** Отключить звук/хаптику tap (визуал остаётся). */
  silent?: boolean;
}

export function PressableScale({
  children,
  style,
  variant = '3d',
  silent = false,
  disabled,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  // зачем: вдавливание — чистая геометрия (translateY), не сжатие. depth —
  // на сколько px «клавиша» уходит вниз; '3d' заметнее, 'flat' — тоньше ход.
  const depth = variant === '3d' ? 4 : 1.5;

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = reduceMotion ? 1 : withTiming(1, { duration: PRESS.downMs });
      if (!silent && !disabled) fk.tap();
      onPressIn?.(e);
    },
    [pressed, reduceMotion, silent, disabled, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = reduceMotion ? 0 : withSpring(0, variant === '3d' ? PRESS.releasePrimary : PRESS.release);
      onPressOut?.(e);
    },
    [pressed, reduceMotion, variant, onPressOut],
  );

  React.useEffect(() => {
    return () => cancelAnimation(pressed);
  }, [pressed]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: pressed.value * depth }],
    };
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      {...rest}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default PressableScale;
