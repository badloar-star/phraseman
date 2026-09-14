import React, { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ENERGY_ACTIVE_CAPACITY_LIMIT } from '../../app/energy_contract';
import { energyVisualTransactions } from '../../app/energy_visual_transactions';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = Readonly<{
  value: number;
  active?: boolean;
  color: string;
  style?: StyleProp<TextStyle>;
}>;

function stepDuration(delta: number): number {
  if (delta <= 20) return 28;
  if (delta <= 60) return 20;
  return 12;
}

export const AnimatedEnergyNumber = memo(function AnimatedEnergyNumber({
  value,
  active = true,
  color,
  style,
}: Props) {
  const reducedMotion = useReducedMotion();
  const normalizedValue = Math.max(0, Math.min(ENERGY_ACTIVE_CAPACITY_LIMIT, Math.floor(value)));
  const displayed = useSharedValue(normalizedValue);
  const previousTarget = useRef(normalizedValue);
  const consumedOperationIds = useRef(new Set<string>());

  const animateBetween = useCallback((from: number, to: number) => {
    cancelAnimation(displayed);
    if (!active || reducedMotion || from === to) {
      displayed.value = to;
      return;
    }
    displayed.value = from;
    const direction = to > from ? 1 : -1;
    const duration = stepDuration(Math.abs(to - from));
    const steps = Array.from(
      { length: Math.abs(to - from) },
      (_, index) => withTiming(from + direction * (index + 1), { duration }),
    );
    displayed.value = steps.length === 1 ? steps[0] : withSequence(...steps);
  }, [active, displayed, reducedMotion]);

  useEffect(() => energyVisualTransactions.subscribe((event) => {
    if (consumedOperationIds.current.has(event.operationId)) return;
    consumedOperationIds.current.add(event.operationId);
    if (consumedOperationIds.current.size > 128) {
      const oldest = consumedOperationIds.current.values().next().value as string | undefined;
      if (oldest) consumedOperationIds.current.delete(oldest);
    }
    const from = Math.max(0, Math.min(ENERGY_ACTIVE_CAPACITY_LIMIT, Math.floor(event.from)));
    const to = Math.max(0, Math.min(ENERGY_ACTIVE_CAPACITY_LIMIT, Math.floor(event.to)));
    previousTarget.current = to;
    animateBetween(from, to);
  }), [animateBetween]);

  useEffect(() => {
    const from = previousTarget.current;
    const to = normalizedValue;
    previousTarget.current = to;
    animateBetween(from, to);
  }, [animateBetween, normalizedValue]);

  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.max(0, Math.min(ENERGY_ACTIVE_CAPACITY_LIMIT, Math.round(displayed.value)))}`,
    defaultValue: `${normalizedValue}`,
  }));

  return (
    <AnimatedTextInput
      animatedProps={animatedProps as never}
      editable={false}
      pointerEvents="none"
      importantForAccessibility="no"
      maxFontSizeMultiplier={1.15}
      style={[styles.value, { color }, style]}
    />
  );
});

const styles = StyleSheet.create({
  value: {
    width: 48,
    height: 30,
    padding: 0,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});

export default AnimatedEnergyNumber;
