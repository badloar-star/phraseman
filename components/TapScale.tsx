import React, { useRef, useCallback } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING } from '../constants/motion';

// Inline tap-with-scale wrapper (sibling of PressableScale, but NOT stretched —
// for icons/chips/header buttons that size to content).
// Forwards every Pressable prop (...rest) so accessibilityRole/Label/State,
// testID, hitSlop etc. reach the control for VoiceOver / TalkBack.
type Props = Omit<PressableProps, 'style' | 'onPress' | 'onPressIn' | 'onPressOut' | 'children'> & {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleTo?: number; // default 0.92
  withHaptic?: boolean;
};

export default function TapScale({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = 0.92,
  withHaptic = true,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: MOTION_SPRING.micro.friction,
      tension: MOTION_SPRING.micro.tension,
    }).start();
  }, [scale, scaleTo]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: MOTION_SPRING.micro.friction,
      tension: MOTION_SPRING.micro.tension,
    }).start();
  }, [scale]);

  const handlePress = useCallback(() => {
    if (withHaptic && !disabled) hapticTap();
    onPress?.();
  }, [withHaptic, disabled, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      accessibilityState={{ disabled: !!disabled, ...(rest.accessibilityState ?? {}) }}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
