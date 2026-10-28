// ═══════════════════════════════════════════════════════════════════════════
// story_template_parts.tsx — движущиеся детали кадров историй: рост столбиков, въезд сбоку, дыхание, вращение, переключение по времени,
// блик ачивки, раскрытие башни, смена уровня, веер карточек, галочка строки, монета-аватар с кольцом.
//
// зачем (макет stories-templates-v1.html): у каждой детали — свой @keyframes макета (stGrow, stRace, stFromL/R, stBreathe, stSpin, stSheen,
// stTower, stLvlOut/In, stFan, stCheck) с теми же длительностями, задержками и кривыми. Всё считается от часов кадра: удержание — пауза
// всего кадра, «Уменьшить движение» — конечное состояние сразу (вечные циклы стоят). Тени и кольца — boxShadow (новая архитектура), цвета —
// токены темы.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from '../../SafeLinearGradient';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { EASE_CSS_IN_OUT, EASE_CSS_OUT, EASE_OUT, frameMs, loop, phase, pingPong, useStoryFrameClock } from './story_frame_clock';
import { mix, useStoryTemplatePalette } from './story_template_palette';

type Kids = Readonly<{ children?: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }>;

/** stGrow / stRace: рост из основания — scaleY от низа (столбики) или scaleX от левого края до доли `to` (дорожки). */
export const Grow = memo(function Grow({ axis, to = 1, d, dur, style, children, testID }: Kids & Readonly<{ axis: 'x' | 'y'; to?: number; d: number; dur: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const s = Math.max(0.001, to * EASE_OUT(phase(frameMs(progress.value, durationMs, final), d, dur)));
    return axis === 'y' ? { transform: [{ scaleY: s }] } : { transform: [{ scaleX: s }] };
  });
  return <Animated.View testID={testID} style={[style, { transformOrigin: axis === 'y' ? 'bottom' : 'left' }, animated]}>{children}</Animated.View>;
});

/** stFromL / stFromR: въезд на 70 dp сбоку с проявлением (700 мс, ease-out, задержка 200). */
export const FromSide = memo(function FromSide({ side, d = 200, style, children }: Kids & Readonly<{ side: 'left' | 'right'; d?: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const e = EASE_OUT(phase(frameMs(progress.value, durationMs, final), d, 700));
    return { opacity: e, transform: [{ translateX: (side === 'left' ? -70 : 70) * (1 - e) }] };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
});

/** stBreathe: дыхание 1 → 1,04 → 1 за 2,6 с (ease-in-out), после задержки; вечный цикл — в «Уменьшить движение» стоит. */
export const Breathe = memo(function Breathe({ d = 0, style, children }: Kids & Readonly<{ d?: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    const k = t <= d ? 0 : EASE_CSS_IN_OUT(pingPong(t - d, 1300, final));
    return { transform: [{ scale: 1 + 0.04 * k }] };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
});

/** stSpin: оборот за periodMs, линейно, бесконечно. */
export const Spin = memo(function Spin({ periodMs, style, children }: Kids & Readonly<{ periodMs: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => ({ transform: [{ rotate: `${loop(frameMs(progress.value, durationMs, final), periodMs, final) * 360}deg` }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
});

/** Появление мгновенно в момент `at` (stFade 1 мс с fill both — точки дуэли «фраза за фразой»). */
export const AtTime = memo(function AtTime({ at, style, children }: Kids & Readonly<{ at: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => ({ opacity: frameMs(progress.value, durationMs, final) > at ? 1 : 0 }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
});

// ── блик ачивки (stSheen: полоса 115° проходит −70 % → 70 % за 1400 мс, ease-in-out, после 700 мс) ─────────────────────────────

/** Слой блика поверх арта size × size: inset −40 % −60 % макета, градиент «прозрачно 42 % · белый ,55 50 % · прозрачно 58 %». */
export const Sheen = memo(function Sheen({ size }: Readonly<{ size: number }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const w = size * 2.2;
  const h = size * 1.8;
  const animated = useAnimatedStyle(() => {
    const p = EASE_CSS_IN_OUT(phase(frameMs(progress.value, durationMs, final), 700, 1400));
    return { transform: [{ translateX: w * (-0.7 + 1.4 * p) }] };
  });
  const clear = mix(pal.mediaInk, 0);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -size * 0.6, top: -size * 0.4, width: w, height: h }, animated]}>
      {/* зачем: угол 115° CSS в точках start/end для бокса 2,2 × 1,8 (линия градиента через центр, длина |w·sin| + |h·cos|) */}
      <LinearGradient colors={[clear, mix(pal.mediaInk, 0.55), clear]} locations={[0.42, 0.5, 0.58]} start={{ x: -0.068, y: 0.177 }} end={{ x: 1.068, y: 0.823 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
});

// ── башня Пика: раскрытие снизу вверх (stTower: clip-path inset(100% 0 0 0) → inset(0) за 1500 мс после 200 мс) ──────────────────

/** Окно-маска едет вниз, содержимое — вверх на столько же: видна нижняя доля p башни, сама башня стоит на месте. */
export const TowerReveal = memo(function TowerReveal({ width, height, children }: Readonly<{ width: number; height: number; children: React.ReactNode }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const windowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: height * (1 - EASE_OUT(phase(frameMs(progress.value, durationMs, final), 200, 1500))) }] }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -height * (1 - EASE_OUT(phase(frameMs(progress.value, durationMs, final), 200, 1500))) }] }));
  return (
    <View style={{ width, height }}>
      <Animated.View style={[{ width, height, overflow: 'hidden' }, windowStyle]}>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
});

// ── смена уровня A1 → A2 (stLvlOut 700 мс с 500 мс, stLvlIn 700 мс с 560 мс) ──────────────────────────────────────────────────

export const LevelSwap = memo(function LevelSwap({ from, to }: Readonly<{ from: string; to: string }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const outStyle = useAnimatedStyle(() => {
    const e = EASE_OUT(phase(frameMs(progress.value, durationMs, final), 500, 700));
    return { opacity: 1 - e, transform: [{ translateY: -52 * e }, { scale: 1 - 0.4 * e }] };
  });
  const inStyle = useAnimatedStyle(() => {
    const e = EASE_OUT(phase(frameMs(progress.value, durationMs, final), 560, 700));
    return { opacity: e, transform: [{ translateY: 60 * (1 - e) }, { scale: 0.7 + 0.3 * e }] };
  });
  return (
    <View style={p.lvup} accessible accessibilityLabel={to}>
      <Animated.Text style={[p.lvOut, { color: pal.sec }, outStyle]}>{from}</Animated.Text>
      <Animated.Text style={[p.lvIn, { color: pal.tx }, inStyle]}>{to}</Animated.Text>
    </View>
  );
});

// ── веер карточек (stFan: из rotate 0, вниз 30 → поворот и сдвиг, 800 мс, transform-origin 50 % 120 %) ──────────────────────────

/** Ось поворота карточки 120 × 150 — на 120 % высоты: 105 dp ниже центра (перенос → поворот → сдвиг → перенос обратно). */
const FAN_PIVOT = 150 * 1.2 - 75;

export const FanCard = memo(function FanCard({ rot, dx, d, children }: Readonly<{ rot: number; dx: number; d: number; children: React.ReactNode }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    const e = EASE_OUT(phase(t, d, 800));
    return {
      opacity: t <= d ? 0 : e,
      transform: [{ translateY: FAN_PIVOT }, { rotate: `${rot * e}deg` }, { translateX: dx * e }, { translateY: 30 * (1 - e) }, { translateY: -FAN_PIVOT }],
    };
  });
  return (
    <Animated.View style={[p.fanCard, { backgroundColor: pal.card, boxShadow: `0 16px 36px -16px ${mix(pal.shTint, 0.7)}` }, animated]}>
      {children}
    </Animated.View>
  );
});

// ── галочка строки ошибок (stCheck: фон текст·14 % → accent, значок прозрачный → accentInk; 300 мс ease-out) ───────────────────

export const CheckFill = memo(function CheckFill({ d, children }: Readonly<{ d: number; children: React.ReactNode }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => ({ opacity: EASE_CSS_OUT(phase(frameMs(progress.value, durationMs, final), d, 300)) }));
  return <Animated.View style={[StyleSheet.absoluteFill, animated]}>{children}</Animated.View>;
});

// ── монета-аватар: кольцо победителя и кольцо фона в ряду аватаров ────────────────────────────────────────────────────────────

/** Монета size с кольцами boxShadow (`ring` — CSS-список теней макета, напр. «0 0 0 4px …, 0 0 0 10px …»). */
export const RingedCoin = memo(function RingedCoin({ rank, size, ring, style }: Readonly<{ rank: number | null; size: number; ring?: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, ring ? { boxShadow: ring } : null, style]}>
      <SpireRankCoin rank={rank} size={size} />
    </View>
  );
});

const p = StyleSheet.create({
  // .lvup 160 × 110; .o 80/96 и .nw 84/100 — 800, −4
  lvup: { width: 160, height: 110, alignItems: 'center', justifyContent: 'center' },
  lvOut: { position: 'absolute', fontSize: 80, lineHeight: 96, fontWeight: '800', letterSpacing: -4, textAlign: 'center' },
  lvIn: { position: 'absolute', fontSize: 84, lineHeight: 100, fontWeight: '800', letterSpacing: -4, textAlign: 'center' },
  // .fan .fc: left 50, top 10, 120 × 150, радиус 18
  fanCard: { position: 'absolute', left: 50, top: 10, width: 120, height: 150, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
