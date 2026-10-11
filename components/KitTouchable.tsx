import React, { forwardRef, memo, useMemo, useRef, useCallback } from 'react';
import { Animated, Pressable, StyleSheet, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import { KIT_PRESS_DOWN, KIT_PRESS_OPACITY_DOWN, KIT_PRESS_OPACITY_UP, KIT_PRESS_SCALE, KIT_PRESS_UP } from '../constants/kitPress';
import { useSystemReduceMotion } from '../hooks/use_system_reduce_motion';

// зачем: Pressable, обёрнутый в Animated, создаётся лениво — тесты, импортирующие экран с урезанным react-native (без Animated),
// не должны падать на импорте модуля.
let AnimatedPressableCache: React.ComponentType<PressableProps & { style?: unknown; ref?: React.Ref<View> }> | null = null;
function getAnimatedPressable() {
  if (!AnimatedPressableCache) AnimatedPressableCache = Animated.createAnimatedComponent(Pressable) as unknown as React.ComponentType<PressableProps & { style?: unknown; ref?: React.Ref<View> }>;
  return AnimatedPressableCache;
}

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Совместимость с TouchableOpacity: значение игнорируется — нажатие всегда как в ките (`.t.down`, opacity .86). */
  activeOpacity?: number;
};

/**
 * Замена TouchableOpacity с нажатием кита 2.0 (kit.css `.t`): вдавливание 90 мс до .97 + opacity .86, отпускание 240 мс
 * cubic-bezier(.3,1.4,.5,1) — те же числа, что у TapScale/PressableScale/PressableHybrid (constants/kitPress).
 * Отличие от тех обёрток: `style` остаётся на самом нажимаемом элементе, анимируются только transform и opacity, поэтому
 * раскладка не меняется (нет «ловушки TapScale», внутреннего Animated.View и принудительного stretch). Подходит для
 * точечной замены TouchableOpacity без правки вёрстки вызывающего места.
 */
// зачем (AppMessagesInbox измеряет кнопку через ref → measureInWindow): drop-in для TouchableOpacity обязан отдавать ref на View.
const KitTouchableBase = forwardRef<View, Props>(function KitTouchableBase({ style, children, activeOpacity: _activeOpacity, onPressIn, onPressOut, disabled, ...rest }, ref) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressOpacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useSystemReduceMotion();
  // базовая прозрачность из style вызывающего (например, 0.45 у отключённой кнопки) перемножается с нажатием, а не затирается
  const baseOpacity = useMemo(() => {
    const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
    return typeof flat?.opacity === 'number' ? flat.opacity : 1;
  }, [style]);
  const opacity = useMemo(() => Animated.multiply(pressOpacity, baseOpacity), [pressOpacity, baseOpacity]);

  const pressIn = useCallback<NonNullable<PressableProps['onPressIn']>>((event) => {
    const animations = [Animated.timing(pressOpacity, { ...KIT_PRESS_OPACITY_DOWN, useNativeDriver: true })];
    if (!reduceMotion) animations.push(Animated.timing(scale, { toValue: KIT_PRESS_SCALE, ...KIT_PRESS_DOWN, useNativeDriver: true }));
    Animated.parallel(animations).start();
    onPressIn?.(event);
  }, [onPressIn, pressOpacity, reduceMotion, scale]);

  const pressOut = useCallback<NonNullable<PressableProps['onPressOut']>>((event) => {
    const animations = [Animated.timing(pressOpacity, { ...KIT_PRESS_OPACITY_UP, useNativeDriver: true })];
    if (!reduceMotion) animations.push(Animated.timing(scale, { toValue: 1, ...KIT_PRESS_UP, useNativeDriver: true }));
    Animated.parallel(animations).start();
    onPressOut?.(event);
  }, [onPressOut, pressOpacity, reduceMotion, scale]);

  const AnimatedPressable = getAnimatedPressable();
  return (
    <AnimatedPressable
      ref={ref}
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[style, { opacity, transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
});

export const KitTouchable = memo(KitTouchableBase);
export default KitTouchable;
