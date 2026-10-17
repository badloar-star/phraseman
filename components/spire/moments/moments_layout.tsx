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
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from '../../SafeLinearGradient';
import { useSpirePalette } from '../useSpirePalette';
import { useShadowGlass } from '../../v2/ShadowSurface';

/** Затемнение окна момента: чёрное 0,62 в любой теме (как `.or-dim` и `--dim` образца). */
export const MOMENT_DIM_COLOR = 'rgba(0,0,0,0.62)'; // theme-exempt: затемнение окна — тёмный скрим в любой теме (как GlassAlertDialog)

/** Длительность появления полноэкранного момента, мс (`emFade 420ms`). */
export const MOMENT_FADE_MS = 420;

type FullProps = Readonly<{
  children: ReactNode;
  testID?: string;
  /**
   * Мягкое свечение за героем — эталонный `.glowspot` (engagement-moments.css:205 + app.css:114): круг 320, по центру по горизонтали,
   * центр на этой высоте экрана (по умолчанию эталона 38 %), радиальный градиент мягкого акцента темы (--acc-soft) до прозрачного на 65 %.
   * Нет пропа — свечения нет (как в окнах эталона без .glowspot).
   */
  glowTop?: `${number}%`;
}>;

const GLOW_SIZE = 320;

/** Эталонный `.glowspot`: без анимации (вечные циклы запрещены сторожем движения), под содержимым, касания не принимает. */
const MomentGlowSpot = memo(function MomentGlowSpot({ top, color }: Readonly<{ top: `${number}%`; color: string }>) {
  return (
    <View pointerEvents="none" accessible={false} style={[s.glow, { top }]}>
      <Svg width={GLOW_SIZE} height={GLOW_SIZE} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="momentGlowSpot" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.65" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#momentGlowSpot)" />
      </Svg>
    </View>
  );
});

/** Полноэкранный момент: отдельный экран темы поверх приложения. */
export const MomentFullScreen = memo(function MomentFullScreen({ children, testID, glowTop }: FullProps) {
  const p = useSpirePalette();
  const g = useShadowGlass(); // зачем (Сверка Макетов r1, G1): цвет свечения — мягкий акцент темы, как --acc-soft эталона
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      testID={testID}
      accessibilityViewIsModal
      entering={reduceMotion ? undefined : FadeIn.duration(MOMENT_FADE_MS).easing(Easing.out(Easing.cubic))}
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient colors={[p.bgTop, p.bg, p.bg]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {glowTop ? <MomentGlowSpot top={glowTop} color={g.accentSoft} /> : null}
      <View style={s.fill}>{children}</View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  fill: { flex: 1 },
  glow: { position: 'absolute', left: '50%', width: GLOW_SIZE, height: GLOW_SIZE, marginLeft: -GLOW_SIZE / 2, marginTop: -GLOW_SIZE / 2 },
});
