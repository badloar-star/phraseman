import React, { memo, useEffect } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Вариант ответа с premium-motion по каталогу активностей 04.
 *
 * зачем (аудит анимаций 22.08): варианты были голым Pressable с opacity —
 * ни нажатия, ни отклика на выбор, а ошибку показывала тряска ВСЕЙ зоны
 * ответов, хотя спека разрешает только точечный `wrong_option_nudge` самого
 * неверного варианта (transform/opacity, без красной рамки, без сохранения
 * выбора). Здесь ровно эти токены:
 *   press    — 80мс, scale 0.975 (нажатие);
 *   select   — 140мс (в коридоре 120–160мс);
 *   nudge    — короткий горизонтальный толчок только этого варианта.
 * Всё на UI-потоке, конечные анимации, reduce motion оставляет финальный кадр.
 */

const PRESS_MS = 80;
const SELECT_MS = 140;
const NUDGE_MS = 60;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);

interface Props {
  label: string;
  selected: boolean;
  /** Счётчик толчков: рост значения запускает nudge именно этого варианта. */
  nudgeToken: number;
  disabled: boolean;
  reduceMotion: boolean;
  style: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
  onPress: () => void;
}

export const LearningV2AnswerChoice = memo(function LearningV2AnswerChoice({
  label,
  selected,
  nudgeToken,
  disabled,
  reduceMotion,
  style,
  textStyle,
  onPress,
}: Props) {
  const press = useSharedValue(1);
  const nudge = useSharedValue(0);
  const select = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    select.value = withTiming(selected ? 1 : 0, {
      duration: reduceMotion ? 1 : SELECT_MS,
      easing: EASE,
    });
  }, [reduceMotion, select, selected]);

  useEffect(() => {
    if (nudgeToken === 0 || reduceMotion) return;
    // Толчок именно этого варианта — не экран и не вся зона ответов.
    nudge.value = withSequence(
      withTiming(-6, { duration: NUDGE_MS, easing: EASE }),
      withTiming(5, { duration: NUDGE_MS, easing: EASE }),
      withTiming(0, { duration: NUDGE_MS, easing: EASE }),
    );
  }, [nudge, nudgeToken, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: nudge.value },
      { scale: press.value * (1 + select.value * 0.012) },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={() => {
          if (reduceMotion) return;
          press.value = withTiming(0.975, { duration: PRESS_MS, easing: EASE });
        }}
        onPressOut={() => {
          if (reduceMotion) return;
          press.value = withTiming(1, { duration: PRESS_MS, easing: EASE });
        }}
        onPress={onPress}
        style={style}
      >
        <Text style={textStyle}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
});

export default LearningV2AnswerChoice;
