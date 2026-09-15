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

import { triLang, type Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { homeMistakesCounterLabel, homeMistakesPulsePeriodMs } from '../../app/home_mistakes_pulse_model';
import { useTheme } from '../ThemeContext';

type Props = {
  /** Все неисправленные ошибки. 0 - кнопка не рисуется. */
  count: number;
  lang: Lang;
  /** Видимость владельца (Главная в фокусе и приложение активно). */
  ownerVisible?: boolean;
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Небольшая кнопка напротив заголовка «Сегодня»: «Ошибки · N».
 *
 * зачем (владелец 2026-09-14): раздел ошибок должен быть виден всегда, когда
 * ошибки есть, но не раздвигать Главную - поэтому пилюля в строке заголовка,
 * а не карточка. Пульс - дыхание масштаба и ореола; период зависит от числа
 * ошибок (homeMistakesPulsePeriodMs). Вечный цикл живёт только пока Главная в
 * фокусе и приложение активно (perf-контракт), reduce motion его выключает.
 */
function HomeMistakesPulseButton({ count, lang, ownerVisible = true, onPress }: Props) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const runtimeActive = useRuntimeActive(ownerVisible);
  const phase = useSharedValue(0);
  const press = useSharedValue(1);
  const periodMs = homeMistakesPulsePeriodMs(count);

  useEffect(() => {
    cancelAnimation(phase);
    if (!runtimeActive || reduceMotion || periodMs === null) {
      phase.value = 0;
      return () => cancelAnimation(phase);
    }
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: periodMs / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(phase);
  }, [periodMs, phase, reduceMotion, runtimeActive]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + phase.value * 0.045) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + phase.value * 0.42,
    transform: [{ scale: 1 + phase.value * 0.22 }],
  }));

  if (periodMs === null) return null;

  const label = triLang(lang, {
    ru: 'Ошибки', uk: 'Помилки', en: 'Mistakes', es: 'Errores', 'pt-BR': 'Erros',
    vi: 'Lỗi sai', id: 'Kesalahan', tr: 'Hatalar', pl: 'Błędy',
  });
  const counter = homeMistakesCounterLabel(count);

  return (
    <View style={styles.slot}>
      {/* Ореол под пилюлей: тон ошибки, только альфа - без обводок. */}
      <Animated.View pointerEvents="none" style={[styles.halo, { backgroundColor: t.wrong }, haloStyle]} />
      <AnimatedPressable
        testID="home-mistakes-pulse-button"
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${counter}`}
        hitSlop={8}
        onPressIn={() => { press.value = withTiming(0.94, { duration: 110 }); }}
        onPressOut={() => { press.value = withSpring(1, { damping: 16, stiffness: 260, mass: 0.6 }); }}
        onPress={onPress}
        style={[styles.pill, { backgroundColor: t.wrongBg }, pillStyle]}
      >
        <Text style={[styles.label, { color: t.textPrimary, fontSize: Math.max(12, f.label - 1) }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.counter, { backgroundColor: t.wrong }]}>
          <Text style={[styles.counterText, { color: '#FFFFFF', fontSize: Math.max(12, f.label - 1) }]}>
            {counter}
          </Text>
        </View>
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

export default memo(HomeMistakesPulseButton);
