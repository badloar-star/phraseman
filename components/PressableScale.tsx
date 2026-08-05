import React, { memo, useRef, useCallback, useEffect } from 'react';
import { Animated, Pressable, type PressableProps, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { mergeAccessibilityDisabled } from './a11y_state';

// Пробрасываем нативные пропсы Pressable (accessibilityLabel/Role/State/Hint,
// testID, hitSlop, onFocus и т.д.), кроме обрабатываемых самим компонентом.
// Без этого каждая кнопка PressableScale невидима для скринридеров
// (VoiceOver / TalkBack) — критично для аудитории 50+.
type PassthroughPressableProps = Omit<
  PressableProps,
  'onPress' | 'onLongPress' | 'onPressIn' | 'onPressOut' | 'style' | 'disabled' | 'children'
>;

export type PressableScaleVariant = 'icon' | 'flat' | 'card' | 'primary';

interface Props extends PassthroughPressableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  busy?: boolean;
  variant?: PressableScaleVariant;
  /** Совместимость со старыми точечными настройками; variant предпочтительнее. */
  scaleTo?: number;
  withHaptic?: boolean;
  /** Отключает haptic, сохраняя визуальный press-state. */
  silent?: boolean;
};

const VARIANT_SCALE: Record<PressableScaleVariant, number> = {
  icon: 0.95,
  flat: 0.98,
  card: 0.988,
  primary: 0.97,
};

function PressableScale({
  onPress,
  onLongPress,
  style,
  contentStyle,
  children,
  disabled,
  busy = false,
  variant,
  scaleTo,
  withHaptic = true,
  silent = false,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const unavailable = Boolean(disabled || busy);
  const pressedScale = scaleTo ?? (variant ? VARIANT_SCALE[variant] : 0.94);

  useEffect(() => () => {
    scale.stopAnimation();
    opacity.stopAnimation();
  }, [opacity, scale]);

  const pressIn = useCallback(() => {
    // зачем: владелец жаловался на «микрозадержку при нажатии на любую кнопку».
    // Причина — hapticTap() стоял ПЕРВЫМ: это async-функция, но до первого await
    // она идёт синхронно по JS-потоку и дёргает нативный модуль через мост, а на
    // холодном старте (кэш настройки ещё не прогрет) добавляет поход в
    // AsyncStorage. Всё это откладывало старт визуальной анимации на тот самый
    // ощутимый миг. Теперь порядок обратный: сначала кадр (то, что видит глаз),
    // хаптик догоняет следом — Taptic Engine всё равно получает свою фору,
    // потому что onPressIn срабатывает задолго до onPress.
    if (unavailable) {
      if (!silent && withHaptic) hapticTap();
      return;
    }
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 0.82, duration: 70, useNativeDriver: true }).start();
    } else {
      Animated.spring(scale, {
        toValue: pressedScale,
        useNativeDriver: true,
        friction: MOTION_SPRING_LEGACY.press.friction,
        tension: MOTION_SPRING_LEGACY.press.tension,
      }).start();
    }
    if (!silent && !unavailable && withHaptic) hapticTap();
  }, [opacity, pressedScale, reduceMotion, scale, silent, unavailable, withHaptic]);

  const pressOut = useCallback(() => {
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: true }).start();
      return;
    }
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: MOTION_SPRING_LEGACY.press.friction,
      tension: MOTION_SPRING_LEGACY.press.tension,
    }).start();
  }, [opacity, reduceMotion, scale]);

  return (
    <Pressable
      // Роль по умолчанию — кнопка; переопределяется через ...rest при необходимости.
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={unavailable}
      accessibilityState={mergeAccessibilityDisabled(rest.accessibilityState, unavailable)}
      // Стиль на Pressable, иначе в колонке (ScrollView) ширина = по контенту — кнопки разной длины.
      style={[{ alignSelf: 'stretch' }, style]}
    >
      <Animated.View style={[{ width: '100%', opacity, transform: [{ scale }] }, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default memo(PressableScale);
