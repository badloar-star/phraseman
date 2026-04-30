import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING } from '../constants/motion';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleTo?: number; // default 0.94
  withHaptic?: boolean;
}

export default function PressableScale({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = 0.94,
  withHaptic = true,
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
