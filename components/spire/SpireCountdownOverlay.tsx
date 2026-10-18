// ═══════════════════════════════════════════════════════════════════════════
// SpireCountdownOverlay.tsx — крупные цифры отсчёта 3 → 2 → 1 поверх экрана ступени Пика.
//
// зачем (прямая просьба владельца через координатора 18.10): каждая цифра ~0,9 с по центру, мягкое появление и масштаб — на UI-потоке (Reanimated:
// значения прогресса живут в shared value, React меняет только саму цифру три раза). «Уменьшить движение» — без масштаба, только смена цифр.
// Кривая появления — сильный ease-out (cubic-bezier .23,1,.32,1), как у остальных появлений Пика; цифра чуть тает к концу своей секунды, чтобы следующая
// не наезжала. Слой не ловит касания (pointerEvents none): «назад» работает во время отсчёта.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { SPIRE_COUNTDOWN_STEP_MS } from '../../app/spire/use_spire_countdown';
import { useSpirePalette } from './useSpirePalette';

const APPEAR_MS = 320;
const FADE_OUT_MS = 180;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Props = Readonly<{ digit: number | null }>;

function SpireCountdownOverlayBase({ digit }: Props) {
  const p = useSpirePalette();
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(1);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (digit === null) return;
    if (reduceMotion) {
      // без анимации масштаба — просто смена цифр
      progress.value = 1;
      fade.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: APPEAR_MS, easing: EASE_OUT });
    fade.value = 1;
    fade.value = withDelay(SPIRE_COUNTDOWN_STEP_MS - FADE_OUT_MS, withTiming(0, { duration: FADE_OUT_MS, easing: Easing.out(Easing.quad) }));
  }, [digit, reduceMotion, progress, fade]);

  const digitStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value * 1.6, 1) * fade.value,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  if (digit === null) return null;
  return (
    <View pointerEvents="none" style={s.root} testID="spire-countdown" accessibilityLiveRegion="polite" accessible accessibilityLabel={String(digit)}>
      <Animated.Text style={[s.digit, { color: p.text }, digitStyle]} allowFontScaling={false}>{String(digit)}</Animated.Text>
    </View>
  );
}

export default memo(SpireCountdownOverlayBase);

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 132, lineHeight: 148, fontWeight: '800', letterSpacing: -2, textAlign: 'center' },
});
