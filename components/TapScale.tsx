import React, { memo, useRef, useCallback } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { KIT_PRESS_DOWN, KIT_PRESS_OPACITY_DOWN, KIT_PRESS_OPACITY_UP, KIT_PRESS_SCALE, KIT_PRESS_UP } from '../constants/kitPress';
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
  /** Scale factor on press. Default — эталон кита (`.t.down` scale .97, constants/kitPress); явный scaleTo — осознанное исключение. */
  scaleTo?: number;
  withHaptic?: boolean;
  hitSlop?: PressableProps['hitSlop'];
}

/**
 * Lightweight press feedback for icon buttons, small controls, inline taps.
 * Use PressableScale for full-width cards/buttons; TapScale for icons and small elements.
 *
 * зачем (координатор 10.10, гейт «приложение = макет»): движение — эталон кита (kit.css `.t`): вдавливание 90 мс до .97
 * и opacity .86, отпускание 240 мс cubic-bezier(.3,1.4,.5,1) — числа в constants/kitPress, одни на все обёртки.
 */
function TapScale({
  onPress,
  onLongPress,
  style,
  children,
  disabled,
  scaleTo = KIT_PRESS_SCALE,
  withHaptic = true,
  hitSlop = 8,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: scaleTo,
        ...KIT_PRESS_DOWN,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        ...KIT_PRESS_OPACITY_DOWN,
        useNativeDriver: true,
      }),
    ]).start();
    if (withHaptic && !disabled) hapticTap();
  }, [scale, opacity, scaleTo, withHaptic, disabled]);

  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        ...KIT_PRESS_UP,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        ...KIT_PRESS_OPACITY_UP,
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
