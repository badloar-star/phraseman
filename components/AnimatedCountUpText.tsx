import React, { memo, useEffect } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * AnimatedCountUpText — то же UI-thread решение, что ResultsXpValue в
 * ResultsSequence.tsx (Learning V2/Урок), но переиспользуемое отдельно от
 * той секвенции — для экранов, у которых нет полноценного ResultsSequence
 * (словарь, глаголы, блиц, тренировка, ошибки, голос).
 *
 * зачем (владелец, 2026-08-27): «руны + XP/счёт тоже анимированы (count-up)»
 * на всех семи экранах завершения, не только на уроке.
 */

type Props = Readonly<{
  value: number;
  durationMs?: number;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}>;

export const AnimatedCountUpText = memo(function AnimatedCountUpText({
  value, durationMs = 900, style, accessibilityLabel,
}: Props) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? value : 0);

  useEffect(() => {
    progress.value = reducedMotion ? value : withTiming(value, { duration: durationMs });
  }, [durationMs, progress, reducedMotion, value]);

  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.max(0, Math.round(progress.value))}`,
    defaultValue: '0',
  }));

  return (
    <AnimatedTextInput
      accessibilityLabel={accessibilityLabel}
      animatedProps={animatedProps as never}
      editable={false}
      pointerEvents="none"
      style={[styles.value, style]}
    />
  );
});

const styles = StyleSheet.create({
  value: { padding: 0, textAlign: 'center' },
});

export default AnimatedCountUpText;
