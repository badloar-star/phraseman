// ═══════════════════════════════════════════════════════════════════════════
// StreakMomentFlame.tsx — огонь серии с цифрой на тёмной плашке для моментов (эталон streak-milestones.html: `.flame`, `.n`, `burstS`, `veil`).
//
// зачем (владелец 14.10 «цифру на огоньке не видно»): цифра лежит на тёмной плашке внутри огня (rgba(8,10,14,.82), белый текст), поэтому читается в любой стадии и теме
// (≥ 4,5:1 даже на белом огне — считает сторож). Огонь — только StreakFlameFill (заливка по дням, разгон от центра после 10); burst — 5 шагов масштаба 780 мс как `burstS`,
// морф между стадиями — вспышка-вуаль 700 мс. Всё движение на UI-треде (Reanimated); reduceMotion — без движения.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { StreakFlameFill } from '../StreakFlameFill';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { useSpirePalette } from '../../spire/useSpirePalette';
import type { StreakFlameStage } from './streak_milestones';
import { streakStageColors } from './streak_stage_colors';

/** Плашка цифры: тёмная в любой теме (theme-exempt — гарантирует контраст поверх огня любого цвета). */
export const STREAK_PLATE_BG = 'rgba(8,10,14,0.82)'; // theme-exempt: плашка цифры на огне — тёмная в любой теме, иначе цифру не видно
export const STREAK_PLATE_ALPHA = 0.82;
export const STREAK_PLATE_TEXT = '#FFFFFF'; // theme-exempt: белый текст на тёмной плашке

const BURST_STEPS = [[1.28, 260], [1.18, 130], [1.24, 130], [1.1, 130], [1, 130]] as const;
const EASE_BURST = Easing.bezier(0.23, 1, 0.32, 1);
const PLATE_TRACKING = -0.5; // guard-ok: межбуквенный интервал цифры (вид), не баланс

// зачем (Сверка 18.10, «у d365 нет искр»): эталонный `.flame.st-4 .stars` — шесть точек 3 px цвета текста со свечением `0 0 6px` в этих местах (% огня).
// Мерцание `tw` там вечное (запрещено сторожем движения) — слой появляется за 600 мс (как переход opacity `.stars`), точки стоят на среднем мерцания (0,6; масштаб 0,9).
const STAR_SPOTS = [[20, 18], [78, 12], [86, 48], [12, 60], [60, 6], [40, 30]] as const;
const STAR_DOT = 3;
const STAR_HALO = 9; // guard-ok: свечение точки (box-shadow 6px) — кружок-ореол, тени на Android у 3 px вида нет
const FlameStars = memo(function FlameStars({ color, reduceMotion }: Readonly<{ color: string; reduceMotion: boolean }>) {
  return (
    // FadeIn ведёт opacity своего вида к 1 — средняя яркость 0,6 живёт на внутреннем слое
    <Animated.View pointerEvents="none" entering={reduceMotion ? undefined : FadeIn.duration(600)} style={StyleSheet.absoluteFill} testID="streak-flame-stars">
      <View style={[StyleSheet.absoluteFill, s.stars]}>
        {STAR_SPOTS.map(([x, y]) => (
          <View key={`${x}-${y}`} style={[s.star, { left: `${x}%`, top: `${y}%` }]}>
            <View style={[s.starHalo, { backgroundColor: color }]} />
            <View style={[s.starDot, { backgroundColor: color }]} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

export type StreakMomentFlameProps = Readonly<{
  /** Дни для заливки/разгона огня (StreakFlameFill). */
  days: number;
  /** Цифра на плашке; '' — без плашки (мини-огонь). */
  label?: string | number;
  size?: number;
  /** Меняется — проигрывается burst. */
  burstKey?: number;
  /** Меняется — проигрывается морф-вспышка (смена стадии). */
  morphKey?: number;
  /** Стадия огня (цвета образца: 7 яркий, 30 второй цвет темы, 100 белый, 365 звёздный, 1000 золотой); нет — огонь как на Главной. */
  stage?: StreakFlameStage;
  accessibilityLabel?: string;
  testID?: string;
}>;

function StreakMomentFlame({ days, label = '', size = 160, burstKey, morphKey, stage, accessibilityLabel, testID = 'streak-moment-flame' }: StreakMomentFlameProps) {
  const p = useSpirePalette();
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  // зачем (координатор 15.10, храповик): графика огня — токен accentGraphic, как и на экране рубежа; текст/значки — accentTextSafe
  // зачем (Сверка 18.10, «у d1000 огонь белый, должен быть золотой»): p.gold в 2.0 — акцент темы (accentBright; в «Спокойно» почти белый), а эталонный
  // `--gold` стадии 5 — золото, совпадающее с `--warn` (engagement-moments-app.css:17/29). Берём семантический токен warn темы: золото во всех темах, ≥ 4,5 к фону.
  const colors = stage === undefined ? null : streakStageColors(stage, { themeId: liquidGlassThemeId, accentGraphic: glass.accentGraphic, text: p.text, bg: p.bg, gold: glass.warn });
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const veil = useSharedValue(0);
  useEffect(() => {
    if (burstKey === undefined || reduceMotion) return;
    scale.value = withSequence(...BURST_STEPS.map(([to, ms]) => withTiming(to, { duration: ms, easing: EASE_BURST })));
  }, [burstKey, reduceMotion, scale]);
  useEffect(() => {
    if (morphKey === undefined || reduceMotion) return;
    veil.value = 0;
    veil.value = withSequence(withTiming(0.75, { duration: 210, easing: EASE_BURST }), withTiming(0, { duration: 490, easing: EASE_BURST }));
  }, [morphKey, reduceMotion, veil]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value, transform: [{ scale: 0.7 + veil.value * 0.8 }] }));
  const text = String(label);
  const fontSize = Math.round(size * (text.length > 3 ? 0.18 : 0.24));
  return (
    <View testID={testID} accessible accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }}>
      <Animated.View pointerEvents="none" style={[s.veil, { backgroundColor: glass.accentTextSafe }, veilStyle]} />
      <Animated.View style={flameStyle}>
        <StreakFlameFill streakDays={days} size={size} colors={colors ?? undefined} />
      </Animated.View>
      {stage === 4 ? <FlameStars color={p.text} reduceMotion={reduceMotion} /> : null}
      {text !== '' ? (
        <View pointerEvents="none" style={s.plateWrap}>
          <View style={[s.plate, { paddingHorizontal: Math.round(fontSize * 0.32) }]}>
            <Text style={{ color: STREAK_PLATE_TEXT, fontSize, lineHeight: Math.round(fontSize * 1.25), fontWeight: '800', letterSpacing: PLATE_TRACKING }} numberOfLines={1}>{text}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  veil: { position: 'absolute', left: '-10%', right: '-10%', top: '-10%', bottom: '-10%', borderRadius: 999, opacity: 0 },
  plateWrap: { position: 'absolute', left: 0, right: 0, bottom: '12%', alignItems: 'center' },
  plate: { borderRadius: 999, backgroundColor: STREAK_PLATE_BG },
  stars: { opacity: 0.6 },
  star: { position: 'absolute', width: STAR_HALO, height: STAR_HALO, marginLeft: -STAR_HALO / 2, marginTop: -STAR_HALO / 2, alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.9 }] },
  starHalo: { position: 'absolute', width: STAR_HALO, height: STAR_HALO, borderRadius: STAR_HALO / 2, opacity: 0.35 },
  starDot: { width: STAR_DOT, height: STAR_DOT, borderRadius: STAR_DOT / 2 },
});

export default memo(StreakMomentFlame);
