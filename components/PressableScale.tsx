import React, { memo, useRef, useCallback } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { mergeAccessibilityDisabled } from './a11y_state';

// Пробрасываем нативные пропсы Pressable (accessibilityLabel/Role/State/Hint,
// testID и т.д.), кроме обрабатываемых самим компонентом. Закрывает a11y для
// всех крупных кнопок/карточек на PressableScale.
type PassthroughPressableProps = Omit<
  PressableProps,
  'onPress' | 'onLongPress' | 'onPressIn' | 'onPressOut' | 'style' | 'disabled' | 'children'
>;

interface Props extends PassthroughPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  scaleTo?: number; // default 0.94
  withHaptic?: boolean;
}

function PressableScale({
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
    // Haptic в onPressIn — даёт Taptic Engine ~50ms форы (warm-up до реального tap)
    if (withHaptic && !disabled) hapticTap();
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      friction: MOTION_SPRING_LEGACY.micro.friction,
      tension: MOTION_SPRING_LEGACY.micro.tension,
    }).start();
  }, [scale, scaleTo, withHaptic, disabled]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: MOTION_SPRING_LEGACY.micro.friction,
      tension: MOTION_SPRING_LEGACY.micro.tension,
    }).start();
  }, [scale]);

  return (
    <Pressable
      // Роль по умолчанию — кнопка; переопределяется через ...rest при необходимости.
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityState={mergeAccessibilityDisabled(rest.accessibilityState, disabled)}
      // Стиль на Pressable, иначе в колонке (ScrollView) ширина = по контенту — кнопки разной длины.
      style={[{ alignSelf: 'stretch' }, style]}
    >
      <Animated.View style={{ width: '100%', transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

export default memo(PressableScale);
