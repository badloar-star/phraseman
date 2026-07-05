/**
 * PressableScale — обёртка кнопки FeedbackKit с физикой вдавливания (спек §2).
 *
 * Reanimated, всё на UI-треде: при нажатии кнопка «вдавливается» (translateY +
 * лёгкое сжатие scale), возврат — пружиной. На onPressIn зовёт fk.tap() (тихий
 * клик + light haptic; сам fk уважает тумблеры). variant:
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

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 } as const;

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

  const depth = variant === '3d' ? 3 : 1.5;
  const minScale = variant === '3d' ? 0.97 : 0.98;

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withTiming(1, { duration: 70 });
      if (!silent && !disabled) fk.tap();
      onPressIn?.(e);
    },
    [pressed, silent, disabled, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      pressed.value = withSpring(0, SPRING);
      onPressOut?.(e);
    },
    [pressed, onPressOut],
  );

  React.useEffect(() => {
    return () => cancelAnimation(pressed);
  }, [pressed]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = pressed.value;
    return {
      transform: [
        { translateY: p * depth },
        { scale: 1 - p * (1 - minScale) },
      ],
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
