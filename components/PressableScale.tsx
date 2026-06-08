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

// Forward every Pressable prop (accessibilityRole/Label/State, testID, hitSlop,
// onFocus, etc.) so screen readers (VoiceOver / TalkBack) can announce the
// control. Without this, every PressableScale button is invisible to assistive
// tech — critical for the 50+ audience. We override style/onPress* ourselves.
type Props = Omit<PressableProps, 'style' | 'onPress' | 'onPressIn' | 'onPressOut' | 'children'> & {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleTo?: number; // default 0.94
  withHaptic?: boolean;
};

export default function PressableScale({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = 0.94,
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
      // Default to button role so assistive tech always has something to
      // announce; callers can override anything via ...rest.
      accessibilityRole="button"
      {...rest}
      accessibilityState={{ disabled: !!disabled, ...(rest.accessibilityState ?? {}) }}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      // Стиль на Pressable, иначе в колонке (ScrollView) ширина = по контенту — кнопки разной длины.
      style={[{ alignSelf: 'stretch' }, style]}
    >
      <Animated.View style={{ width: '100%', transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
