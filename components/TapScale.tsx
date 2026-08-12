import React, { memo, useRef, useCallback } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { mergeAccessibilityDisabled } from './a11y_state';

// Пробрасываем все нативные пропсы Pressable (включая accessibilityLabel/Role/
// State/Hint, testID, hitSlop), кроме тех, что TapScale обрабатывает сам со
// своей анимацией. Это закрывает a11y для всех icon-кнопок, использующих TapScale.
type PassthroughPressableProps = Omit<
  PressableProps,
  'onPress' | 'onLongPress' | 'onPressIn' | 'onPressOut' | 'style' | 'disabled' | 'children' | 'hitSlop'
>;

interface Props extends PassthroughPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  /** Scale factor on press. Default 0.88 — tighter than PressableScale (0.94) for small elements */
  scaleTo?: number;
  withHaptic?: boolean;
  hitSlop?: PressableProps['hitSlop'];
}

/**
 * Lightweight press feedback for icon buttons, small controls, inline taps.
 * Use PressableScale for full-width cards/buttons; TapScale for icons and small elements.
 *
 * Telegram pattern: scale + opacity together, spring back on release.
 */
function TapScale({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = 0.88,
  withHaptic = true,
  hitSlop = 8,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleTo,
        useNativeDriver: true,
        friction: MOTION_SPRING_LEGACY.micro.friction,
        tension: MOTION_SPRING_LEGACY.micro.tension,
      }),
      Animated.timing(opacity, {
        toValue: 0.6,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
    if (withHaptic && !disabled) hapticTap();
  }, [scale, opacity, scaleTo, withHaptic, disabled]);

  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: MOTION_SPRING_LEGACY.micro.friction,
        tension: MOTION_SPRING_LEGACY.micro.tension,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Pressable
      // Роль по умолчанию — кнопка. Любой переданный accessibilityRole
      // в ...rest переопределит её (rest идёт после).
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      // accessibilityState.disabled должен совпадать с реальным disabled,
      // даже если вызывающий передал свой state в ...rest.
      accessibilityState={mergeAccessibilityDisabled(rest.accessibilityState, disabled)}
      hitSlop={hitSlop}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default memo(TapScale);
