// ═══════════════════════════════════════════════════════════════════════════
// story_template_kit.tsx — общие части кадров историй: корень кадра, обзор/заголовок/подзаголовок, плитки чисел, чип, конфетти, кольцо.
//
// зачем (макет stories-templates-v1.html, «типографика кадра (StorySlides 1:1)»): размеры, кегли, отступы и цвета — ровно из CSS макета:
// .ov 13/17 700 +1,4 accentText; .h1 34/40 800 −0,6 max 334 (малый 30/36); .p 16/22 вторичный max 320; .stt 92+, 10/14, радиус 16, фон текст·10 %;
// .chip 32, радиус 16, фон текст·12 %; конфетти 8×12 из 50 %/42 %; кольцо 180 с дорожкой текст·14 % и дугой accent (толщина 12).
// Цвета — только токены темы (story_template_palette); обводок контейнеров нет.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import { EASE_CONF, EASE_OUT, frameMs, phase, useStoryFrameClock } from './story_frame_clock';
import { confettiPieces, type ConfettiPiece } from './story_template_layout';
import { Enter, Words } from './story_template_motion';
import { mix, useStoryTemplatePalette, type StoryTemplatePalette } from './story_template_palette';

/**
 * Корень кадра: слой частиц на всю область кадра + колонка содержимого с полями 28 (как .sl макета).
 * Слой обрезается по кадру (.conf / .snow: overflow hidden); `layerClip={false}` — дождь монет (.rain макета не обрезан: монеты стартуют над кадром).
 */
export const FrameRoot = memo(function FrameRoot({ layer, layerClip = true, children, testID }: Readonly<{ layer?: React.ReactNode; layerClip?: boolean; children: React.ReactNode; testID?: string }>) {
  return (
    <View testID={testID} style={k.root}>
      {layer ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, layerClip ? k.clip : null]}>{layer}</View> : null}
      <View style={k.column}>{children}</View>
    </View>
  );
});

/** .art — блок арта над текстом, отступ снизу 18. */
export const Art = memo(function Art({ children, style }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  return <View style={[k.art, style]}>{children}</View>;
});

/** .ov — обзор цвета темы, заглавные, разрядка 1,4. */
export const Ov = memo(function Ov({ text, d }: Readonly<{ text: string; d: number }>) {
  const pal = useStoryTemplatePalette();
  return <Enter d={d}><Text style={[k.ov, { color: pal.acc }]}>{text}</Text></Enter>;
});

/** .h1 — заголовок, слова лесенкой через 50 мс; small — .h1.s (30/36). */
export const H1 = memo(function H1({ text, d0, small = false }: Readonly<{ text: string; d0: number; small?: boolean }>) {
  const pal = useStoryTemplatePalette();
  const style = small ? k.h1s : k.h1;
  // зачем (узкие экраны < 390): max-width 334 макета — потолок; строки выравниваются в той ширине, что реально есть между полями 28
  const [avail, setAvail] = useState<number | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => { setAvail(Math.round(e.nativeEvent.layout.width)); }, []);
  return (
    <View style={k.h1Box} onLayout={onLayout}>
      <Words text={text} d0={d0} style={[style, { color: pal.tx }]} maxWidth={Math.min(334, avail ?? 334)} gap={small ? 8 : 9} accessibilityRole="header" />
    </View>
  );
});

/** .p — подзаголовок вторичным цветом, max 320. */
export const P = memo(function P({ text, d }: Readonly<{ text: string; d: number }>) {
  const pal = useStoryTemplatePalette();
  return <Enter d={d} style={k.pBox}><Text style={[k.p, { color: pal.sec }]}>{text}</Text></Enter>;
});

/** .stats — ряд плиток чисел (перенос, по центру). */
export const Stats = memo(function Stats({ children, maxWidth }: Readonly<{ children: React.ReactNode; maxWidth?: number }>) {
  return <View style={[k.stats, maxWidth ? { maxWidth } : null]}>{children}</View>;
});

/** .stt — плитка: число (b) и подпись (span). */
export const Stat = memo(function Stat({ value, label, d }: Readonly<{ value: React.ReactNode; label: string; d: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <Enter d={d} style={[k.stt, { backgroundColor: mix(pal.tx, 0.1) }]}>
      {typeof value === 'string' ? <Text style={[k.sttB, { color: pal.tx }]}>{value}</Text> : value}
      <Text style={[k.sttS, { color: pal.sec }]}>{label}</Text>
    </Enter>
  );
});

/** Стиль числа плитки (.stt b) — для CountUp внутри Stat. */
export function statNumberStyle(pal: StoryTemplatePalette): StyleProp<TextStyle> {
  return [k.sttB, { color: pal.tx }];
}

/** .chip — значок цвета темы и подпись на плашке текст·12 %. */
export const Chip = memo(function Chip({ icon, text, d }: Readonly<{ icon: React.ComponentProps<typeof Ionicons>['name']; text: string; d: number }>) {
  const pal = useStoryTemplatePalette();
  return (
    <Enter d={d} style={[k.chip, { backgroundColor: mix(pal.tx, 0.12) }]}>
      <Ionicons name={icon} size={15} color={pal.acc} />
      <Text style={[k.chipT, { color: pal.tx }]}>{text}</Text>
    </Enter>
  );
});

// ── конфетти (макет `confetti(n, d0)`) ───────────────────────────────────────────────────────────────────────────

const ConfettiBit = memo(function ConfettiBit({ piece }: Readonly<{ piece: ConfettiPiece }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const style = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    // stConf 1700 мс; до задержки — первый кадр (fill both): на месте и видна
    const p = EASE_CONF(phase(t, piece.d, 1700));
    return { opacity: 1 - p, transform: [{ translateX: piece.dx * p }, { translateY: piece.dy * p }, { rotate: `${piece.rot * p}deg` }] };
  });
  return <Animated.View style={[k.conf, { backgroundColor: piece.color }, style]} />;
});

/** Слой конфетти в цветах темы; «Уменьшить движение» — слоя нет (как display:none в макете). */
export const Confetti = memo(function Confetti({ n, d0 }: Readonly<{ n: number; d0: number }>) {
  const pal = useStoryTemplatePalette();
  const { final } = useStoryFrameClock();
  const pieces = useMemo(() => confettiPieces(n, d0, [pal.accB, pal.accG, pal.tx, pal.sec]), [n, d0, pal.accB, pal.accG, pal.tx, pal.sec]);
  if (final) return null;
  return <>{pieces.map((piece) => <ConfettiBit key={`${piece.dx}:${piece.dy}:${piece.d}`} piece={piece} />)}</>;
});

// ── кольцо (макет `ring(frac, inner)`) ───────────────────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
/** Длина окружности r = 80 (stroke-dasharray 502.65 макета). */
export const RING_LEN = 502.65;

/** Кольцо 180: дорожка текст·14 %, дуга accent рисуется до доли frac за 1400 мс после 300 мс; появляется пружиной на 100 мс. */
export const Ring = memo(function Ring({ frac, children }: Readonly<{ frac: number; children: React.ReactNode }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const off = RING_LEN * (1 - Math.max(0, Math.min(1, frac)));
  const arc = useAnimatedProps(() => {
    const p = EASE_OUT(phase(frameMs(progress.value, durationMs, final), 300, 1400));
    return { strokeDashoffset: RING_LEN - (RING_LEN - off) * p };
  });
  return (
    <Enter kind="pop" d={100} style={k.ring}>
      <Svg width={180} height={180} viewBox="0 0 180 180">
        <G rotation={-90} origin="90, 90">
          <Circle cx={90} cy={90} r={80} fill="none" stroke={mix(pal.tx, 0.14)} strokeWidth={12} />
          <AnimatedCircle cx={90} cy={90} r={80} fill="none" stroke={pal.accG} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${RING_LEN}`} animatedProps={arc} />
        </G>
      </Svg>
      <View style={k.ringC}>{children}</View>
    </Enter>
  );
});

export const k = StyleSheet.create({
  root: { flex: 1, alignSelf: 'stretch' },
  clip: { overflow: 'hidden' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  art: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  ov: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  h1Box: { marginTop: 8, alignSelf: 'stretch', alignItems: 'center' },
  h1: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  h1s: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  pBox: { marginTop: 8, maxWidth: 320 },
  p: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  big: { fontSize: 96, lineHeight: 96, fontWeight: '800', letterSpacing: -4, textAlign: 'center', fontVariant: ['tabular-nums'] },
  bigM: { fontSize: 72, lineHeight: 76, fontWeight: '800', letterSpacing: -3, textAlign: 'center', fontVariant: ['tabular-nums'] },
  bigS: { fontSize: 56, lineHeight: 60, fontWeight: '800', letterSpacing: -2, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 18 },
  stt: { minWidth: 92, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center' },
  sttB: { fontSize: 24, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  sttS: { fontSize: 13, lineHeight: 17, marginTop: 1, textAlign: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, marginTop: 14 },
  chipT: { fontSize: 14, fontWeight: '700' },
  conf: { position: 'absolute', left: '50%', top: '42%', width: 8, height: 12, borderRadius: 3 },
  ring: { width: 180, height: 180 },
  ringC: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
