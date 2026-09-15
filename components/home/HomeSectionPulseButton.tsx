import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { homeMistakesCounterLabel } from '../../app/home_mistakes_pulse_model';
import { useTheme } from '../ThemeContext';

/**
 * Небольшая кнопка-пилюля в ряду заголовка «Сегодня»: «Ошибки · N», «Видео · N».
 *
 * зачем (владелец 2026-09-15): раздел ошибок получил такой вход, и владелец
 * попросил ровно такой же для видео — «точно такую же кнопку слева от ошибки».
 * Один компонент на обе: иначе они разъедутся при первой же правке цвета.
 *
 * Цвет — акцент темы интерфейса (владелец: «не красная, цвет темы»). Серое
 * состояние `muted` — когда показывать нечего, но кнопка остаётся на месте,
 * чтобы ряд не прыгал и человек знал, где раздел.
 */

export type HomeSectionPulseTone = 'accent' | 'muted';

type Props = {
  label: string;
  /** Число на счётчике; 0 — счётчик не рисуется. */
  count: number;
  /** Период дыхания в мс; null — не пульсирует. */
  pulsePeriodMs: number | null;
  tone: HomeSectionPulseTone;
  ownerVisible?: boolean;
  onPress: () => void;
  testID?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function HomeSectionPulseButton({
  label, count, pulsePeriodMs, tone, ownerVisible = true, onPress, testID,
}: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive(ownerVisible);
  const phase = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(phase);
    if (!runtimeActive || reduceMotion || pulsePeriodMs === null) {
      phase.value = 0;
      return () => cancelAnimation(phase);
    }
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: pulsePeriodMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(phase);
  }, [phase, pulsePeriodMs, reduceMotion, runtimeActive]);

  // Дыхание тихое: 2.5% масштаба и мягкий ореол (владелец: «пульс слабее»).
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + phase.value * 0.025) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + phase.value * 0.2,
    transform: [{ scale: 1 + phase.value * 0.12 }],
  }));

  const accented = tone === 'accent';
  const fill = accented ? t.accent : t.bgSurface2;
  const surface = accented ? t.accentBg : t.bgCard;
  const counterText = accented ? t.correctText : t.textMuted;
  const counterLabel = homeMistakesCounterLabel(count);

  return (
    <View style={styles.slot}>
      {pulsePeriodMs !== null ? (
        <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.accent }, haloStyle]} />
      ) : null}
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `${label}: ${counterLabel}` : label}
        hitSlop={8}
        onPressIn={() => { press.value = withTiming(0.94, { duration: 110 }); }}
        onPressOut={() => { press.value = withSpring(1, { damping: 16, stiffness: 260, mass: 0.6 }); }}
        onPress={onPress}
        style={[styles.pill, { backgroundColor: surface }, count > 0 ? null : styles.pillBare, pillStyle]}
      >
        <Text
          style={[styles.label, { color: accented ? t.textPrimary : t.textMuted, fontSize: Math.max(12, f.label - 1) }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {count > 0 ? (
          <View style={[styles.counter, { backgroundColor: fill }]}>
            <Text style={[styles.counterText, { color: counterText, fontSize: Math.max(12, f.label - 1) }]}>
              {counterLabel}
            </Text>
          </View>
        ) : null}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { alignItems: 'center', justifyContent: 'center', minHeight: 30 },
  halo: { position: 'absolute', left: 4, right: 4, top: 2, bottom: 2, borderRadius: 999 },
  pill: {
    height: 30,
    paddingLeft: 11,
    paddingRight: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  // Без счётчика правый отступ симметричен левому.
  pillBare: { paddingRight: 11 },
  label: { fontWeight: '900', letterSpacing: 0 },
  counter: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { fontWeight: '900', fontVariant: ['tabular-nums'] },
});

export default memo(HomeSectionPulseButton);
