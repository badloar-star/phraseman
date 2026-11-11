// ═══════════════════════════════════════════════════════════════════════════
// story_reward_stage.tsx — сцена кадров наград (U36): луч света, пыль в луче, статуэтка с отражением и бликом, смена статуэток.
//
// зачем (владелец 11.11: «дорого и премиально, реально красивые элементы, а не полоски»; макет
// docs/work/mockups/reward-reasons-2026-11-11/reward_story_premium.html): причину награды показывает сцена — статуэтка прежней лиги
// уступает место новой. Владелец 11.11 решил: сцена красится в цвета темы (свет и пыль — из токенов темы), фон рисует сам просмотр.
// Всё движение считается от часов кадра (story_frame_clock): пауза удержанием останавливает сцену, «Уменьшить движение» — сразу итог.
// Анимируются только сдвиг, масштаб и прозрачность — на UI-треде, без setState в кадрах.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
// зачем: картинку рисует expo-image — тот же компонент, что у арта ачивок (кэш и быстрая отрисовка), и он уже есть в подменах сторожей просмотра
import { Image } from 'expo-image';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, Ellipse, LinearGradient as SvgLinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from '../../SafeLinearGradient';
import { cubicBezier, EASE_CSS_IN_OUT, EASE_OUT, frameMs, loop, phase, useStoryFrameClock } from './story_frame_clock';
import { Enter } from './story_template_motion';
import { mix, useStoryTemplatePalette, type StoryTemplatePalette } from './story_template_palette';
import type { StoryRewardVariant } from './story_reward_variant';

/** Момент, когда новая статуэтка встала в свет, мс от начала кадра: от него считаются блик, искры и текст. */
export const REWARD_LAND_MS = 2700;
/** Смена статуэток: начало и длительность, мс (макет: 1500 → 2700). */
const SWAP_AT = 1500;
const SWAP_MS = 1200;
/** .77,0,.175,1 — плавный разгон и торможение смены статуэток и проезда камеры (макет). */
const EASE_IN_OUT_STRONG = cubicBezier(0.77, 0, 0.175, 1);

/** Цвет света сцены: яркий акцент темы; в светлом оформлении — графический акцент (контраст на светлом фоне). */
function lightColor(pal: StoryTemplatePalette): string {
  return pal.isLight ? pal.accG : pal.accB;
}

// ── луч света ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Четыре вложенных конуса дают мягкий край луча без размытия (размытие слоёв в RN дорого и не везде есть). */
const CONE_STEPS: readonly Readonly<{ top: number; bottom: number }>[] = [
  { top: 0.04, bottom: 0.28 }, { top: 0.06, bottom: 0.35 }, { top: 0.08, bottom: 0.42 }, { top: 0.1, bottom: 0.5 },
];

/**
 * Слой света на весь кадр. «Пьедестал» — луч строго сверху по центру; «Ночная галерея» — косой луч из правого верхнего угла.
 * Проявляется за секунду от начала кадра.
 */
export const StageLight = memo(function StageLight({ variant }: Readonly<{ variant: StoryRewardVariant }>) {
  const pal = useStoryTemplatePalette();
  const { width, height } = useWindowDimensions();
  const color = lightColor(pal);
  const cones = useMemo(() => {
    const topX = variant === 'gallery' ? width * 0.94 : width / 2;
    const bottomX = variant === 'gallery' ? width * 0.44 : width / 2;
    const bottomY = height * (variant === 'gallery' ? 0.74 : 0.64);
    return CONE_STEPS.map((step) => {
      const t = width * step.top;
      const b = width * step.bottom;
      return `M${topX - t},0 L${topX + t},0 L${bottomX + b},${bottomY} L${bottomX - b},${bottomY} Z`;
    });
  }, [variant, width, height]);
  return (
    <Enter kind="fade" d={0} dur={1000} style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="rewardCone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={pal.isLight ? 0.16 : 0.13} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.04} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        {cones.map((d) => <Path key={d} d={d} fill="url(#rewardCone)" />)}
      </Svg>
    </Enter>
  );
});

// ── пыль в луче ──────────────────────────────────────────────────────────────────────────────────────────────────────

type Mote = Readonly<{ x: number; y: number; size: number; periodMs: number; offsetMs: number; alpha: number }>;

/** Двенадцать пылинок: места и периоды заданы формулой от номера — кадр одинаков при каждом открытии. */
const MOTES: readonly Mote[] = Array.from({ length: 12 }, (_, i) => ({
  x: 24 + ((i * 37) % 53),
  y: 10 + ((i * 53) % 44),
  size: 2 + (i % 3) * 0.8,
  periodMs: 5200 + i * 310,
  offsetMs: i * 730,
  alpha: 0.28 + (i % 4) * 0.12,
}));

const DustMote = memo(function DustMote({ mote, color }: Readonly<{ mote: Mote; color: string }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const p = loop(frameMs(progress.value, durationMs, final) + mote.offsetMs, mote.periodMs, final);
    // всплывает на 46 dp и гаснет к концу цикла; при «меньше движения» цикл стоит в нуле — пылинка не видна
    return { opacity: mote.alpha * Math.sin(Math.PI * p), transform: [{ translateY: -46 * p }] };
  });
  return <Animated.View style={[s.mote, { left: `${mote.x}%`, top: `${mote.y}%`, width: mote.size, height: mote.size, borderRadius: mote.size / 2, backgroundColor: color }, animated]} />;
});

/** Слой пыли. При «Уменьшить движение» слоя нет вовсе. */
export const StageDust = memo(function StageDust() {
  const pal = useStoryTemplatePalette();
  const { final } = useStoryFrameClock();
  if (final) return null;
  const color = lightColor(pal);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{MOTES.map((mote) => <DustMote key={mote.offsetMs} mote={mote} color={color} />)}</View>;
});

// ── статуэтка: пятно света под ней, отражение в полу, блик строго по силуэту ────────────────────────────────────────────

type StatueProps = Readonly<{ source: number; size: number; /** Когда по статуэтке проходит блик, мс; null — блика нет. */ glintAt: number | null; label?: string }>;

const Glint = memo(function Glint({ size, at }: Readonly<{ size: number; at: number }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const band = size * 0.38;
  const animated = useAnimatedStyle(() => {
    // до начала полоса стоит слева за краем, после конца — справа за краем: в покое блика не видно
    const p = EASE_CSS_IN_OUT(phase(frameMs(progress.value, durationMs, final), at, 1150));
    return { transform: [{ translateX: -band * 1.4 + (size + band * 2.8) * p }, { rotate: '16deg' }] };
  });
  const clear = mix(pal.mediaInk, 0);
  return (
    <Animated.View style={[{ position: 'absolute', top: -size * 0.2, left: 0, width: band, height: size * 1.4 }, animated]}>
      <LinearGradient colors={[clear, mix(pal.mediaInk, 0.72), clear]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
});

export const Statue = memo(function Statue({ source, size, glintAt, label }: StatueProps) {
  const pal = useStoryTemplatePalette();
  const { final } = useStoryFrameClock();
  const color = lightColor(pal);
  const box = useMemo(() => ({ width: size, height: size }), [size]);
  return (
    <View style={box} accessible={label !== undefined} accessibilityRole={label !== undefined ? 'image' : undefined} accessibilityLabel={label}>
      {/* пятно света на полу под основанием */}
      <Svg width={size} height={size * 0.24} style={[s.abs, { top: size * 0.84 }]}>
        <Defs>
          <RadialGradient id="rewardPool" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={color} stopOpacity={pal.isLight ? 0.3 : 0.34} />
            <Stop offset="0.6" stopColor={color} stopOpacity={0.08} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size * 0.12} rx={size * 0.48} ry={size * 0.12} fill="url(#rewardPool)" />
      </Svg>
      {/* отражение: та же картинка вверх ногами, маска гасит её книзу */}
      <MaskedView pointerEvents="none" style={[s.abs, { top: size * 0.92, width: size, height: size * 0.42 }]}
        maskElement={<LinearGradient colors={['black', 'transparent']} style={StyleSheet.absoluteFill} />}>
        <Image source={source} contentFit="contain" accessible={false} style={[box, s.reflection]} />
      </MaskedView>
      <Image source={source} contentFit="contain" accessible={false} style={[s.abs, box]} />
      {/* блик: полоса света видна только там, где есть сама статуэтка */}
      {glintAt !== null && !final ? (
        <MaskedView pointerEvents="none" style={[s.abs, box]} maskElement={<Image source={source} contentFit="contain" accessible={false} style={box} />}>
          <Glint size={size} at={glintAt} />
        </MaskedView>
      ) : null}
    </View>
  );
});

// ── смена статуэток ──────────────────────────────────────────────────────────────────────────────────────────────────

type SwapProps = Readonly<{
  /** Статуэтка прежней лиги; null — лига не менялась, на сцене одна статуэтка. */
  from: number | null;
  to: number;
  size: number;
  /** +1 — лига выше, −1 — ниже, 0 — та же. */
  dir: 1 | 0 | -1;
  variant: StoryRewardVariant;
  label: string;
}>;

/**
 * «Пьедестал»: камера едет по высоте — при подъёме прежняя статуэтка уходит вниз, новая приходит сверху (при спуске наоборот).
 * «Ночная галерея»: камера едет вбок — при подъёме вправо, при спуске влево; прежняя статуэтка гаснет на краю.
 * Лига не менялась — одна статуэтка проявляется и медленно приближается.
 */
export const StatueSwap = memo(function StatueSwap({ from, to, size, dir, variant, label }: SwapProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const { width } = useWindowDimensions();
  const changed = from !== null && dir !== 0;
  const far = 120 * dir;
  // расстояние между статуэтками в галерее: соседняя целиком за краем кадра
  const span = size + Math.max(40, width - size + 40);
  const sign = dir >= 0 ? 1 : -1;

  const oldStyle = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    const shown = EASE_OUT(phase(t, 150, 900));
    const p = EASE_IN_OUT_STRONG(phase(t, SWAP_AT, SWAP_MS));
    if (variant === 'gallery') return { opacity: shown * (1 - 0.72 * p), transform: [{ translateX: -sign * span * p }] };
    return { opacity: shown * (1 - p), transform: [{ translateY: far * p }, { scale: 1 - 0.16 * p }] };
  });
  const newStyle = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    if (!changed) {
      const p = phase(t, 100, REWARD_LAND_MS - 100);
      const e = EASE_OUT(p);
      return { opacity: Math.min(1, e * 2.6), transform: [{ scale: 0.9 + 0.1 * e }] };
    }
    const p = EASE_IN_OUT_STRONG(phase(t, SWAP_AT, SWAP_MS));
    if (variant === 'gallery') return { opacity: 0.3 + 0.7 * p, transform: [{ translateX: sign * span * (1 - p) }, { scale: 0.92 + 0.08 * p }] };
    return { opacity: p, transform: [{ translateY: -far * 1.1 * (1 - p) }, { scale: 0.86 + 0.14 * p }] };
  });

  return (
    <View style={{ width: size, height: size }}>
      {changed && from !== null ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, oldStyle]}>
          <Statue source={from} size={size} glintAt={800} />
        </Animated.View>
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFill, newStyle]}>
        <Statue source={to} size={size} glintAt={REWARD_LAND_MS - 150} label={label} />
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  mote: { position: 'absolute' },
  // отражение: вверх ногами и приглушено
  reflection: { transform: [{ scaleY: -1 }], opacity: 0.28 },
});
