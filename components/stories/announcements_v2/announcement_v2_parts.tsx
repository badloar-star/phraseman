// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_parts.tsx — цветные детали 36 кадров объявлений (макет stories-announcements-v1.html, v2.1): плоскость и диск темы, блик,
// кинетические строки капсом, одометр, кольцо из 7 долей, круговая надпись, кольцо Plus, лучи, волна.
//
// зачем (владелец 28.10: «точно так же, как на макете»): размеры, кегли, радиусы, длительности и кривые — числа макета построчно
// (.poster .plane / .qdisc / .disc2 / .mani / .odo / .ring7 / .stamp / .pz2 .ringc / .rays / .wave). Цвета — только токены темы
// (announcement_v2_palette): плоскости — accentGradient, лучи — accentSoft, кольцо — accent → accentBright → gradB.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, Text as SvgText, TextPath } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { LinearGradient } from '../../SafeLinearGradient';
import { EASE_CSS_OUT, frameMs, phase, useStoryFrameClock } from '../templates/story_frame_clock';
import { mix } from '../templates/story_template_palette';
import { EASE_CSS_IN_OUT, EASE_LINEAR, EASE_OUT, EASE_SPRING, Keyframed, Loop } from './announcement_v2_motion';
import { gradientPoints, useAnnPalette } from './announcement_v2_palette';
import { APP_FONT_FAMILY } from '../../../app/typography';

// ── плоскость и диск темы ─────────────────────────────────────────────────────────────────────────────────────────

type PlaneProps = Readonly<{ width: number; height: number; radius?: number; angle?: number; shadow?: boolean; style?: StyleProp<ViewStyle>; children?: React.ReactNode }>;

/** Прямоугольник с градиентом темы (linear-gradient(angle, --grad-a, --grad-b)), радиус 32, тень оттенка темы. */
export const Plane = memo(function Plane({ width, height, radius = 32, angle = 150, shadow = true, style, children }: PlaneProps) {
  const pal = useAnnPalette();
  const pts = useMemo(() => gradientPoints(angle, width, height), [angle, width, height]);
  return (
    <View style={[{ width, height, borderRadius: radius }, shadow ? { boxShadow: `0 24px 50px -24px ${mix(pal.shTint, 0.7)}` } : null, style]}>
      <View style={{ width, height, borderRadius: radius, overflow: 'hidden' }}>
        <LinearGradient colors={[pal.gradA, pal.gradB]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </View>
  );
});

type DiscProps = Readonly<{
  size: number; angle?: number;
  /** Вход stDiscIn (пружина .4 → 1 с проявлением за 900 мс) после d; точка опоры в долях диска (30 %/30 % у цитаты, 70 %/30 % у ИИ). */
  d?: number; originFx?: number; originFy?: number;
  style?: StyleProp<ViewStyle>; children?: React.ReactNode;
}>;

/** Диск темы (.qdisc / .disc2): круг с градиентом, вылетает из угла пружиной. */
export const Disc = memo(function Disc({ size, angle = 150, d = 100, originFx = 0.5, originFy = 0.5, style, children }: DiscProps) {
  const pal = useAnnPalette();
  const pts = useMemo(() => gradientPoints(angle, size, size), [angle, size]);
  return (
    <Keyframed keys={DISC_IN} d={d} dur={900} ease={EASE_SPRING} originX={(originFx - 0.5) * size} originY={(originFy - 0.5) * size} style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}>
      <LinearGradient colors={[pal.gradA, pal.gradB]} start={pts.start} end={pts.end} style={StyleSheet.absoluteFill} />
      {children}
    </Keyframed>
  );
});
const DISC_IN = [{ at: 0, scale: 0.4, opacity: 0 }, { at: 1, scale: 1, opacity: 1 }] as const;

/** Блик плоскости (stSheenLoop: полоса 115° −70 % → 70 % за 45 % периода, потом стоит; период 5–6 с после задержки). */
export const SheenLoop = memo(function SheenLoop({ width, height, periodMs = 5000, d = 1400 }: Readonly<{ width: number; height: number; periodMs?: number; d?: number }>) {
  const pal = useAnnPalette();
  const w = width * 2.2;
  const h = height * 1.8;
  const keys = useMemo(() => [{ at: 0, x: -0.7 * w }, { at: 0.45, x: 0.7 * w }, { at: 1, x: 0.7 * w }], [w]);
  const clear = mix(pal.mediaInk, 0);
  return (
    <Loop keys={keys} periodMs={periodMs} d={d} ease={EASE_CSS_IN_OUT} pointerEvents="none" style={{ position: 'absolute', left: -width * 0.6, top: -height * 0.4, width: w, height: h }}>
      <LinearGradient colors={[clear, mix(pal.mediaInk, 0.3), clear]} locations={[0.42, 0.5, 0.58]} start={{ x: -0.068, y: 0.177 }} end={{ x: 1.068, y: 0.823 }} style={StyleSheet.absoluteFill} />
    </Loop>
  );
});

// ── кинетические строки капсом (Манифест) ────────────────────────────────────────────────────────────────────────

const KIN_SIZES = [56, 50, 44, 40, 36, 32, 28, 24] as const;

/** Строки капсом по ширине: оценка 0,72 em на букву и 0,3 em на пробел (та же, что в макете — строки совпадают), до 8 строк; не влезло — 24. */
export function kineticLines(text: string, maxW = 300): Readonly<{ fs: number; lines: readonly string[] }> {
  const words = text.split(' ').filter(Boolean);
  const wl = (s: string, fs: number): number => fs * (s.replace(/ /g, '').length * 0.72 + (s.split(' ').length - 1) * 0.3);
  for (const fs of KIN_SIZES) {
    const lines: string[] = [];
    let cur = '';
    let ok = true;
    for (const w of words) {
      if (wl(w, fs) > maxW) { ok = false; break; }
      const t = cur ? `${cur} ${w}` : w;
      if (wl(t, fs) <= maxW) cur = t; else { lines.push(cur); cur = w; }
    }
    if (!ok) continue;
    if (cur) lines.push(cur);
    if (lines.length <= 8) return { fs, lines };
  }
  return { fs: 24, lines: words };
}

/** Строки выезжают из-под маски (stLineIn: y 115 % + skewY 5° → 0 за 760 мс после d0 + 120·i), потом дрейфуют ±8 dp (7 с, туда-обратно). */
export const KineticLines = memo(function KineticLines({ text, color, maxW = 300, d0 = 500 }: Readonly<{ text: string; color: string; maxW?: number; d0?: number }>) {
  const { fs, lines } = useMemo(() => kineticLines(text, maxW), [text, maxW]);
  const lineH = fs * 1.04;
  const inKeys = useMemo(() => [{ at: 0, y: lineH * 1.15, skewY: 5 }, { at: 1, y: 0, skewY: 0 }], [lineH]);
  return (
    <View style={m.lines} accessible accessibilityRole="header" accessibilityLabel={text}>
      {lines.map((line, i) => (
        <View key={`${i}-${line}`} style={{ overflow: 'hidden', marginHorizontal: -14, paddingHorizontal: 14, paddingTop: 0.12 * fs, paddingBottom: 0.06 * fs, marginTop: i === 0 ? 0 : -0.1 * fs }}>
          <Loop keys={i % 2 === 0 ? DRIFT_R : DRIFT_L} periodMs={7000} alternate d={-i * 1300} ease={EASE_CSS_IN_OUT}>
            <Keyframed keys={inKeys} d={d0 + i * 120} dur={760} ease={EASE_OUT}>
              <Text style={{ fontSize: fs, lineHeight: lineH, fontWeight: '800', letterSpacing: -0.02 * fs, textTransform: 'uppercase', color }}>{line}</Text>
            </Keyframed>
          </Loop>
        </View>
      ))}
    </View>
  );
});
const DRIFT_R = [{ at: 0, x: 0 }, { at: 1, x: 8 }] as const;
const DRIFT_L = [{ at: 0, x: 0 }, { at: 1, x: -8 }] as const;

// ── одометр (Большая цифра) ──────────────────────────────────────────────────────────────────────────────────────

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

/** Столбик цифры: лента 0…9 прокручивается до нужной (stOdo 1500 мс ease-out после d). */
const OdoDigit = memo(function OdoDigit({ digit, d, small, color }: Readonly<{ digit: number; d: number; small: boolean; color: string }>) {
  const h = small ? 72 : 96;
  const keys = useMemo(() => [{ at: 0, y: 0 }, { at: 1, y: -digit * h }], [digit, h]);
  return (
    <View style={{ width: small ? 44 : 60, height: h, overflow: 'hidden' }}>
      <Keyframed keys={keys} d={d} dur={1500} ease={EASE_OUT}>
        {DIGITS.map((ch) => <Text key={ch} style={[small ? m.odoDigitM : m.odoDigit, { height: h, lineHeight: h, color }]}>{ch}</Text>)}
      </Keyframed>
    </View>
  );
});

/** Число с разрядами (12 400): столбики цифр, пробел разряда — 18 dp; больше 5 цифр — малый размер (72). */
export const Odometer = memo(function Odometer({ value, d0 = 200, color }: Readonly<{ value: number; d0?: number; color: string }>) {
  const raw = String(Math.max(0, Math.round(value)));
  const small = raw.length > 5;
  const parts: readonly string[] = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < raw.length; i += 1) {
      const fromEnd = raw.length - i;
      out.push(raw[i]!);
      if (fromEnd > 1 && fromEnd % 3 === 1) out.push(' ');
    }
    return out;
  }, [raw]);
  return (
    <View style={m.odo} accessible accessibilityLabel={parts.join('')}>
      {parts.map((ch, i) => ch === ' ' ? <View key={`sp${i}`} style={m.odoSpace} /> : <OdoDigit key={`d${i}`} digit={Number(ch)} d={d0 + i * 120} small={small} color={color} />)}
    </View>
  );
});

// ── кольцо из 7 долей (Обратный отсчёт) ─────────────────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
/** Длина окружности r = 80; доля — дуга 60 с зазором (stroke-dasharray 60 443). */
const RING7_LEN = 503;

const Segment = memo(function Segment({ i, lit, d }: Readonly<{ i: number; lit: boolean; d: number }>) {
  const pal = useAnnPalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const arc = useAnimatedProps(() => {
    const len = 60 * EASE_CSS_OUT(phase(frameMs(progress.value, durationMs, final), d, 500));
    return { strokeDasharray: `${len} ${RING7_LEN - len}` };
  });
  const common = { cx: 95, cy: 95, r: 80, fill: 'none', strokeWidth: 14, strokeLinecap: 'round' as const, transform: `rotate(${(i * 360) / 7 - 90} 95 95)` };
  if (!lit) return <Circle {...common} stroke={mix(pal.tx, 0.14)} strokeDasharray="60 443" />;
  return <AnimatedCircle {...common} stroke={pal.accG} animatedProps={arc} />;
});

/** Семь долей по кругу 190; первые `lit` загораются по очереди (500 мс после 500 + 180·i). */
export const Ring7 = memo(function Ring7({ lit, children }: Readonly<{ lit: number; children: React.ReactNode }>) {
  return (
    <View style={m.ring7}>
      <Svg width={190} height={190} viewBox="0 0 190 190" style={StyleSheet.absoluteFill}>
        {Array.from({ length: 7 }, (_, i) => <Segment key={i} i={i} lit={i < lit} d={500 + i * 180} />)} {/* guard-ok: 7 долей, порядок постоянный */}
      </Svg>
      <View style={m.ring7C}>{children}</View>
    </View>
  );
});

// ── круговая надпись-печать (Только сегодня) ─────────────────────────────────────────────────────────────────────

/** Текст по кругу r = 88 в квадрате 230, вращается за 16 с (13/800, разрядка 1,6, цвет accentText). */
export const CircularText = memo(function CircularText({ text, id }: Readonly<{ text: string; id: string }>) {
  const pal = useAnnPalette();
  const txt = `${text.toUpperCase()} · `.repeat(3);
  return (
    <Loop keys={SPIN} periodMs={16000} ease={EASE_LINEAR} style={m.stamp} pointerEvents="none">
      <Svg width={230} height={230} viewBox="0 0 230 230">
        <Defs><Path id={id} d="M115,115 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" /></Defs>
        <SvgText fill={pal.acc} fontSize={13} fontWeight="800" letterSpacing={1.6} fontFamily={APP_FONT_FAMILY}>
          {/* зачем: textLength 552 = длина окружности r 88 — надпись замыкает круг без шва, как в макете */}
          <TextPath href={`#${id}`} textLength={552} lengthAdjust="spacing">{txt}</TextPath>
        </SvgText>
      </Svg>
    </Loop>
  );
});
const SPIN = [{ at: 0, rot: 0 }, { at: 1, rot: 360 }] as const;

// ── кольцо Plus (conic-gradient accent → accentBright → gradB → accent, r 70…90, оборот 9 с) ────────────────────

function rgb(color: string): readonly [number, number, number] {
  const hex = /^#([0-9a-f]{6})/i.exec(color);
  if (hex) return [parseInt(hex[1]!.slice(0, 2), 16), parseInt(hex[1]!.slice(2, 4), 16), parseInt(hex[1]!.slice(4, 6), 16)];
  const m = /^rgba?\(([^)]+)\)/i.exec(color);
  if (m) { const [r = '0', g = '0', b = '0'] = m[1]!.split(',').map((s) => s.trim()); return [Number(r), Number(g), Number(b)]; }
  return [128, 128, 128];
}
/** Цвет на доле t кольца из стопов (как conic-gradient с равными шагами). */
export function conicColor(stops: readonly string[], t: number): string {
  const n = stops.length - 1;
  const x = Math.max(0, Math.min(1, t)) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const u = x - i;
  const a = rgb(stops[i]!);
  const b = rgb(stops[i + 1]!);
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)}, ${Math.round(a[1] + (b[1] - a[1]) * u)}, ${Math.round(a[2] + (b[2] - a[2]) * u)})`;
}

const RING_STEPS = 36;
/** Дуга сектора кольца r = 80, толщина 20 (маска макета: прозрачно до 70, кольцо 70…90). */
function arcPath(i: number): string {
  const a0 = ((i / RING_STEPS) * Math.PI * 2) - Math.PI / 2;
  const a1 = (((i + 1.15) / RING_STEPS) * Math.PI * 2) - Math.PI / 2;
  const x0 = 90 + 80 * Math.cos(a0), y0 = 90 + 80 * Math.sin(a0), x1 = 90 + 80 * Math.cos(a1), y1 = 90 + 80 * Math.sin(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A80 80 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Кольцо 180 с градиентом по кругу; `periodMs` — оборот (9 с у Plus); `style` — размер и положение. */
export const ConicRing = memo(function ConicRing({ periodMs = 9000, style, pointerEvents }: Readonly<{ periodMs?: number; style?: StyleProp<ViewStyle>; pointerEvents?: 'none' }>) {
  const pal = useAnnPalette();
  const stops = useMemo(() => [pal.accG, pal.accB, pal.gradB, pal.accG], [pal.accG, pal.accB, pal.gradB]);
  return (
    <Loop keys={SPIN} periodMs={periodMs} ease={EASE_LINEAR} style={[m.ring180, style]} pointerEvents={pointerEvents}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        {Array.from({ length: RING_STEPS }, (_, i) => <Path key={i} d={arcPath(i)} stroke={conicColor(stops, i / RING_STEPS)} strokeWidth={20} fill="none" />)} {/* guard-ok: секторы кольца, порядок постоянный */}
      </Svg>
    </Loop>
  );
});

// ── лучи (Экзамен): 12 клиньев по 9° каждые 30°, accentSoft, гаснут к 68 % радиуса, оборот 40 с ──────────────────

function wedge(i: number): string {
  const a0 = ((i * 30) * Math.PI) / 180;
  const a1 = ((i * 30 + 9) * Math.PI) / 180;
  const R = 220;
  return `M220 220 L${(220 + R * Math.cos(a0)).toFixed(1)} ${(220 + R * Math.sin(a0)).toFixed(1)} A${R} ${R} 0 0 1 ${(220 + R * Math.cos(a1)).toFixed(1)} ${(220 + R * Math.sin(a1)).toFixed(1)} Z`;
}

export const Rays = memo(function Rays({ id }: Readonly<{ id: string }>) {
  const pal = useAnnPalette();
  return (
    <Loop keys={SPIN} periodMs={40000} ease={EASE_LINEAR} style={m.rays} pointerEvents="none">
      <Svg width={440} height={440} viewBox="0 0 440 440">
        <Defs>
          <RadialGradient id={id} cx="220" cy="220" r="220" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={pal.accSoft} stopOpacity={1} />
            <Stop offset="0.68" stopColor={pal.accSoft} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {Array.from({ length: 12 }, (_, i) => <Path key={i} d={wedge(i)} fill={`url(#${id})`} />)} {/* guard-ok: 12 клиньев, порядок постоянный */}
      </Svg>
    </Loop>
  );
});

// ── волна (ИИ): 26 столбиков дышат вразнобой (stEq: scaleY .22 → 1 туда-обратно) ─────────────────────────────────

export const Wave = memo(function Wave({ bars = 26 }: Readonly<{ bars?: number }>) {
  const pal = useAnnPalette();
  const specs = useMemo(() => Array.from({ length: bars }, (_, i) => ({ key: `b${i}`, periodMs: Math.round((0.5 + ((i * 7) % 5) * 0.14) * 1000), d: -(i * 90), h: 0.3 + Math.abs(Math.sin(i * 0.9)) * 0.7 })), [bars]);
  return (
    <View style={m.wave} pointerEvents="none">
      {specs.map((s) => (
        <Loop key={s.key} keys={EQ} periodMs={s.periodMs} alternate d={s.d} ease={EASE_CSS_IN_OUT} style={[m.bar, { height: 72 * s.h, backgroundColor: pal.accG }]} />
      ))}
    </View>
  );
});
const EQ = [{ at: 0, scaleY: 0.22 }, { at: 1, scaleY: 1 }] as const;

const m = StyleSheet.create({
  lines: { alignSelf: 'stretch', alignItems: 'flex-start' },
  odo: { flexDirection: 'row', gap: 2 },
  odoSpace: { width: 18 },
  odoDigit: { fontSize: 96, fontWeight: '800', letterSpacing: -4, textAlign: 'center', fontVariant: ['tabular-nums'] },
  odoDigitM: { fontSize: 72, fontWeight: '800', letterSpacing: -3, textAlign: 'center', fontVariant: ['tabular-nums'] },
  ring7: { width: 190, height: 190 },
  ring7C: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  stamp: { position: 'absolute', left: 0, top: 0, width: 230, height: 230 },
  ring180: { width: 180, height: 180 },
  rays: { width: 440, height: 440 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'stretch', height: 72, marginBottom: 16 },
  bar: { flex: 1, borderRadius: 3 },
});
