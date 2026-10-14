// ═══════════════════════════════════════════════════════════════════════════
// moments_layout.tsx — общая раскладка моментов Пика: полноэкранный «отдельный экран темы» (эталон `.full`) и затемнение (`.dim`).
//
// зачем (владелец 14.10 «каша на экране»; эталон engagement-moments-app.css): полноэкранный момент — отдельный экран темы, НЕ прозрачный туман поверх подложки: ни одна буква
// момента не лежит на буквах экрана. Фон — градиент токенов ТЕКУЩЕЙ темы (bgTop → bg на 60 %), как радиальный `.full` образца; затемнение окна — чёрное 0,62 в любой теме
// (как GlassAlertDialog и `--dim`). Появление: fade 420 мс (`emFade`); reduceMotion — сразу.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from '../../SafeLinearGradient';
import { useSpirePalette } from '../useSpirePalette';

/** Затемнение окна момента: чёрное 0,62 в любой теме (как `.or-dim` и `--dim` образца). */
export const MOMENT_DIM_COLOR = 'rgba(0,0,0,0.62)'; // theme-exempt: затемнение окна — тёмный скрим в любой теме (как GlassAlertDialog)

/** Длительность появления полноэкранного момента, мс (`emFade 420ms`). */
export const MOMENT_FADE_MS = 420;

type FullProps = Readonly<{ children: ReactNode; testID?: string }>;

/** Полноэкранный момент: отдельный экран темы поверх приложения. */
export const MomentFullScreen = memo(function MomentFullScreen({ children, testID }: FullProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      testID={testID}
      accessibilityViewIsModal
      entering={reduceMotion ? undefined : FadeIn.duration(MOMENT_FADE_MS).easing(Easing.out(Easing.cubic))}
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient colors={[p.bgTop, p.bg, p.bg]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={s.fill}>{children}</View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  fill: { flex: 1 },
});
