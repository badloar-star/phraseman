import React, { memo, useRef, useCallback, useEffect } from 'react';
import { Animated, Easing, Pressable, type PressableProps, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { PRESS } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { mergeAccessibilityDisabled } from './a11y_state';

// зачем: владелец утвердил единый пресс-стандарт (гибрид «Световод + Чекан»,
// constants/motionHybrid.ts → PRESS) взамен трёх расходящихся реализаций
// (PressableScale ×2, TapScale). Это НОВЫЙ примитив рядом со старыми —
// миграция вызывающих мест будет отдельным шагом (владелец прямо запретил
// менять поведение боевых экранов в рамках этой задачи).
type PassthroughPressableProps = Omit<
  PressableProps,
  'onPress' | 'onLongPress' | 'onPressIn' | 'onPressOut' | 'style' | 'disabled' | 'children'
>;

/** Роль определяет силу вжатия (PRESS.scale) и есть ли перелёт на возврате
 *  (перелёт ~6% ТОЛЬКО у primary — закон гибрида: удар/вес не расходуется на
 *  второстепенные элементы). */
export type PressableHybridVariant = 'primary' | 'secondary' | 'icon' | 'chip' | 'card';

interface Props extends PassthroughPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
  variant?: PressableHybridVariant;
  withHaptic?: boolean;
  /** Отключает haptic, сохраняя визуальный press-state (для демо-панелей). */
  silent?: boolean;
}

function PressableHybrid({
  onPress,
  onLongPress,
  style,
  contentStyle,
  children,
  disabled,
  busy = false,
  variant = 'secondary',
  withHaptic = true,
  silent = false,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const unavailable = Boolean(disabled || busy);
  const pressedScale = PRESS.scale[variant];

  useEffect(() => () => {
    scale.stopAnimation();
    opacity.stopAnimation();
  }, [opacity, scale]);

  const pressIn = useCallback(() => {
    // Хаптик ДО анимации (паттерн PressableScale) — убирает микрозадержку
    // первого видимого кадра на холодном старте Taptic Engine.
    if (!silent && !unavailable && withHaptic) hapticTap();
    if (unavailable) return;
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 0.82, duration: PRESS.reducedDownMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    Animated.timing(scale, {
      toValue: pressedScale,
      duration: PRESS.downMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [opacity, pressedScale, reduceMotion, scale, silent, unavailable, withHaptic]);

  const pressOut = useCallback(() => {
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 1, duration: PRESS.reducedUpMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    // Перелёт (~6%) только у primary — PRESS.releasePrimary; остальным —
    // PRESS.release без перелёта (закон №1: удар/вес — только у кульминаций).
    const spring = variant === 'primary' ? PRESS.releasePrimary : PRESS.release;
    Animated.spring(scale, {
      toValue: 1,
      stiffness: spring.stiffness,
      damping: spring.damping,
      mass: spring.mass,
      useNativeDriver: true,
    }).start();
  }, [opacity, reduceMotion, scale, variant]);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={unavailable}
      accessibilityState={mergeAccessibilityDisabled(rest.accessibilityState, unavailable)}
      style={[{ alignSelf: 'stretch' }, style]}
    >
      <Animated.View style={[{ width: '100%', opacity, transform: [{ scale }] }, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default memo(PressableHybrid);
