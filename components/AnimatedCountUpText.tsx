import React, { memo, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  type AccessibilityProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { formatCountValue, type CountFormat } from './count_format';

export { formatCountValue };
export type { CountFormat };

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * AnimatedCountUpText — UI-thread решение для нейтральных числовых значений в
 * ResultsSequence.tsx (Learning V2/Урок), но переиспользуемое отдельно от
 * той секвенции — для экранов, у которых нет полноценного ResultsSequence
 * (словарь, глаголы, блиц, тренировка, ошибки, голос).
 *
 * зачем: count-up используется для рун и нейтральных числовых показателей.
 * на всех семи экранах завершения, не только на уроке.
 */

type Props = Readonly<{
  value: number;
  durationMs?: number;
  /** Через сколько мс после показа начать счёт (метка сценария окна). */
  delayMs?: number;
  format?: CountFormat;
  /** Кривая «замедление к концу» 1 − (1 − t)³ (окна Пика, статистика); по умолчанию — прежняя кривая withTiming. */
  easeOut?: boolean;
  /** Принудительно «Уменьшить движение» (родитель знает флаг сильнее системы); не задано — системная настройка. */
  reduceMotion?: boolean;
  testID?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessible?: boolean;
  importantForAccessibility?: AccessibilityProps['importantForAccessibility'];
}>;

export const AnimatedCountUpText = memo(function AnimatedCountUpText({
  value, durationMs = 900, delayMs = 0, format, easeOut = false, reduceMotion, testID, style, accessibilityLabel, accessible, importantForAccessibility,
}: Props) {
  const systemReduced = useReducedMotion();
  const reducedMotion = reduceMotion ?? systemReduced;
  const progress = useSharedValue(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(progress);
      progress.value = value;
      return undefined;
    }
    // зачем: счёт идёт от текущего значения (не сбрасывается в 0 при обновлении числа), на UI-потоке; метка сценария — withDelay
    const timing = withTiming(value, easeOut ? { duration: durationMs, easing: Easing.out(Easing.cubic) } : { duration: durationMs });
    progress.value = delayMs > 0 ? withDelay(delayMs, timing) : timing;
    return () => cancelAnimation(progress);
  }, [delayMs, durationMs, easeOut, progress, reducedMotion, value]);

  const animatedProps = useAnimatedProps(() => ({
    text: formatCountValue(progress.value, format),
    defaultValue: formatCountValue(0, format),
  }));

  return (
    <AnimatedTextInput
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessible={accessible}
      importantForAccessibility={importantForAccessibility}
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
