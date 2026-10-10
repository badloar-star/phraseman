import React, { memo, useRef, useCallback, useEffect } from 'react';
import { Animated, Pressable, type PressableProps, StyleProp, ViewStyle } from 'react-native';
import { hapticTap } from '../hooks/use-haptics';
import { KIT_PRESS_DOWN, KIT_PRESS_OPACITY_DOWN, KIT_PRESS_OPACITY_UP, KIT_PRESS_SCALE, KIT_PRESS_UP } from '../constants/kitPress';
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
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
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
  /** Optional per-surface press scale; keeps the established variant default otherwise. */
  pressScaleTo?: number;
};

// зачем (координатор 10.10): в ките нажатие одно для всех (`.t.down` scale .97) — роли больше не различаются по силе вжатия;
// явный scaleTo/pressScaleTo остаётся осознанным исключением вызывающего места.
const VARIANT_SCALE: Record<PressableScaleVariant, number> = {
  icon: KIT_PRESS_SCALE,
  flat: KIT_PRESS_SCALE,
  card: KIT_PRESS_SCALE,
  primary: KIT_PRESS_SCALE,
};

function PressableScale({
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  style,
  contentStyle,
  children,
  disabled,
  busy = false,
  variant,
  scaleTo,
  withHaptic = true,
  silent = false,
  pressScaleTo,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const unavailable = Boolean(disabled || busy);
  const pressedScale = pressScaleTo ?? scaleTo ?? (variant ? VARIANT_SCALE[variant] : KIT_PRESS_SCALE);

  useEffect(() => () => {
    scale.stopAnimation();
    opacity.stopAnimation();
  }, [opacity, scale]);

  const pressIn = useCallback<NonNullable<PressableProps['onPressIn']>>((event) => {
    // зачем: владелец жаловался на «микрозадержку при нажатии на любую кнопку».
    // Причина — hapticTap() стоял ПЕРВЫМ: это async-функция, но до первого await
    // она идёт синхронно по JS-потоку и дёргает нативный модуль через мост, а на
    // холодном старте (кэш настройки ещё не прогрет) добавляет поход в
    // AsyncStorage. Всё это откладывало старт визуальной анимации на тот самый
    // ощутимый миг. Теперь порядок обратный: сначала кадр (то, что видит глаз),
    // хаптик догоняет следом — Taptic Engine всё равно получает свою фору,
    // потому что onPressIn срабатывает задолго до onPress.
    if (unavailable) {
      return;
    }
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 0.82, duration: 70, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: pressedScale, ...KIT_PRESS_DOWN, useNativeDriver: true }),
        Animated.timing(opacity, { ...KIT_PRESS_OPACITY_DOWN, useNativeDriver: true }),
      ]).start();
    }
    onPressIn?.(event);
    if (!silent && !unavailable && withHaptic) hapticTap();
  }, [onPressIn, opacity, pressedScale, reduceMotion, scale, silent, unavailable, withHaptic]);

  const pressOut = useCallback<NonNullable<PressableProps['onPressOut']>>((event) => {
    if (reduceMotion) {
      Animated.timing(opacity, { toValue: 1, duration: 90, useNativeDriver: true }).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, ...KIT_PRESS_UP, useNativeDriver: true }),
        Animated.timing(opacity, { ...KIT_PRESS_OPACITY_UP, useNativeDriver: true }),
      ]).start();
    }
    onPressOut?.(event);
  }, [onPressOut, opacity, reduceMotion, scale]);

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
