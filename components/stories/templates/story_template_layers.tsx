// ═══════════════════════════════════════════════════════════════════════════
// story_template_layers.tsx — слои и арты кадров историй: снег (праздник), дождь монет (отметка монет), переворот монеты с ореолом (ранг),
// круг темы с орбитами (новая тема).
//
// зачем (макет stories-templates-v1.html: .snow / .rain / .flip + .halo / .swatch): формулы раскладки частиц, длительности, задержки и кривые —
// из макета 1:1 (snow: 26 снежинок, x = i·37 % 100, размер 3 + i % 4, 7 + i % 5 с, задержка −0,9·i с; rain: 10 монет, x = 6 + 9,4·i %,
// размер 26 + 7·(i % 4), 1,5 + 0,3·(i % 3) с, задержка 140·i мс). «Уменьшить движение» — слоёв нет (display: none макета).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import SpireRankCoin from '../../spire/SpireRankCoin';
import { EASE_CSS_OUT, EASE_FALL, EASE_OUT, frameMs, phase, useStoryFrameClock } from './story_frame_clock';
import { coinDrops, snowFlakes, type Drop, type Flake } from './story_template_layout';
import { Spin } from './story_template_parts';
import { mix, useStoryTemplatePalette } from './story_template_palette';

// ── снег (stSnow: вниз на 880 и вбок на sx, линейно, бесконечно; к концу гаснет) ──────────────────────────────────────────────

const SnowFlake = memo(function SnowFlake({ flake, color, fallTo }: Readonly<{ flake: Flake; color: string; fallTo: number }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    // зачем: отрицательная задержка макета = снежинка уже в пути с первого кадра
    const u = ((frameMs(progress.value, durationMs, final) + flake.offsetMs) % flake.durMs) / flake.durMs;
    return { opacity: 0.75 * (1 - u), transform: [{ translateY: fallTo * u }, { translateX: flake.sx * u }] };
  });
  return <Animated.View style={[l.flake, { left: `${flake.x}%`, width: flake.size, height: flake.size, borderRadius: flake.size / 2, backgroundColor: color }, animated]} />;
});

/** Снег; `fallTo` — глубина падения, dp: 880 у макета историй, 760 у макета объявлений (stories-announcements-v1, Сайт 28.10). */
export const Snow = memo(function Snow({ fallTo = 880 }: Readonly<{ fallTo?: number }>) {
  const pal = useStoryTemplatePalette();
  const { final } = useStoryFrameClock();
  const flakes = useMemo(snowFlakes, []);
  if (final) return null;
  return <View style={l.clip}>{flakes.map((flake) => <SnowFlake key={`${flake.x}:${flake.offsetMs}`} flake={flake} color={pal.tx} fallTo={fallTo} />)}</View>;
});

// ── дождь монет (stRain: вниз на 820 с поворотом, кривая .4,0,1,1; гаснет на последних 15 %) ───────────────────────────────────

const CoinDrop = memo(function CoinDrop({ drop }: Readonly<{ drop: Drop }>) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const u = phase(frameMs(progress.value, durationMs, final), drop.d, drop.durMs);
    const fall = EASE_FALL(u);
    const fade = u <= 0.85 ? 1 : 1 - EASE_FALL((u - 0.85) / 0.15);
    return { opacity: fade, transform: [{ translateY: 820 * fall }, { rotate: `${drop.rot * fall}deg` }] };
  });
  return (
    <Animated.View style={[l.drop, { left: `${drop.x}%`, width: drop.size, height: drop.size }, animated]}>
      <SpireRankCoin rank={drop.rank} size={drop.size} />
    </Animated.View>
  );
});

/** Слой дождя: без обрезки (макет: монеты стартуют на 70 dp выше кадра, под шапкой). */
export const CoinRain = memo(function CoinRain() {
  const { final } = useStoryFrameClock();
  const drops = useMemo(coinDrops, []);
  if (final) return null;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{drops.map((drop) => <CoinDrop key={drop.d} drop={drop} />)}</View>;
});

// ── переворот монеты (stFlip: rotateY 0 → 180° за 900 мс после 500 мс) и ореол (stHalo: 1100 мс после 1300 мс) ─────────────────

export const CoinFlip = memo(function CoinFlip({ from, to }: Readonly<{ from: number; to: number }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const front = useAnimatedStyle(() => {
    const a = 180 * EASE_OUT(phase(frameMs(progress.value, durationMs, final), 500, 900));
    return { opacity: a < 90 ? 1 : 0, transform: [{ perspective: 800 }, { rotateY: `${a}deg` }] };
  });
  const back = useAnimatedStyle(() => {
    const a = 180 * EASE_OUT(phase(frameMs(progress.value, durationMs, final), 500, 900));
    return { opacity: a < 90 ? 0 : 1, transform: [{ perspective: 800 }, { rotateY: `${a - 180}deg` }] };
  });
  // зачем: box-shadow 0 0 0 0 → 0 0 0 70px с затуханием цвета и прозрачности = диск свечения, растущий от края монеты (120 → 260)
  const halo = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    const e = EASE_CSS_OUT(phase(t, 1300, 1100));
    const fade = 1 - e;
    return { opacity: t <= 1300 || final ? 0 : fade * fade, transform: [{ scale: (120 + 140 * e) / 120 }] };
  });
  return (
    <View style={l.flipWrap} accessible accessibilityLabel={String(to)}>
      <Animated.View style={[l.halo, { backgroundColor: pal.accGlow }, halo]} />
      <Animated.View style={[l.face, { backfaceVisibility: 'hidden' }, front]}><SpireRankCoin rank={from} size={120} /></Animated.View>
      <Animated.View style={[l.face, { backfaceVisibility: 'hidden' }, back]}><SpireRankCoin rank={to} size={120} /></Animated.View>
    </View>
  );
});

// ── круг темы (.swatch: ядро 120 с градиентом 135°, блик сверху, тень; две орбиты accent вращаются за 18 с) ───────────────────

/** Серп блика «inset 0 2px 0»: круг ядра минус тот же круг на 2 dp ниже (чётно-нечётная заливка), обрезано ядром. */
const CORE_HIGHLIGHT = 'M0,60 a60,60 0 1,0 120,0 a60,60 0 1,0 -120,0 Z M0,62 a60,60 0 1,0 120,0 a60,60 0 1,0 -120,0 Z';

/** Круг темы; `orbitColor` — цвет орбит: accG у макета историй, accInk у макета объявлений (`stroke: var(--acc-ink)`, Сайт 28.10). */
export const ThemeSwatch = memo(function ThemeSwatch({ colorA, colorB, orbitColor }: Readonly<{ colorA: string; colorB: string; orbitColor?: string }>) {
  const pal = useStoryTemplatePalette();
  const orbit = orbitColor ?? pal.accG;
  return (
    <View style={l.swatch}>
      <Spin periodMs={18000} style={StyleSheet.absoluteFill}>
        <Svg width={170} height={170} viewBox="0 0 170 170">
          <Ellipse cx={85} cy={85} rx={82} ry={36} fill="none" stroke={orbit} strokeWidth={7} strokeOpacity={0.7} transform="rotate(-22 85 85)" />
          <Ellipse cx={85} cy={85} rx={44} ry={66} fill="none" stroke={orbit} strokeWidth={4} strokeOpacity={0.5} transform="rotate(31 85 85)" />
        </Svg>
      </Spin>
      <View style={[l.core, { boxShadow: `0 20px 50px -20px ${mix(pal.shTint, 0.6)}` }]}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Defs>
            <SvgGradient id="tplSwatchCore" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colorA} />
              <Stop offset="1" stopColor={colorB} />
            </SvgGradient>
            <ClipPath id="tplSwatchClip"><Circle cx={60} cy={60} r={60} /></ClipPath>
          </Defs>
          <Circle cx={60} cy={60} r={60} fill="url(#tplSwatchCore)" />
          <G clipPath="url(#tplSwatchClip)">
            <Path d={CORE_HIGHLIGHT} fill={mix(pal.mediaInk, 0.45)} fillRule="evenodd" />
          </G>
        </Svg>
      </View>
    </View>
  );
});

const l = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  flake: { position: 'absolute', top: -12 },
  drop: { position: 'absolute', top: -70 },
  // .flipw: монета 120, ореол 120 по центру
  flipWrap: { width: 120, height: 120 },
  face: { position: 'absolute', left: 0, top: 0, width: 120, height: 120 },
  halo: { position: 'absolute', left: 0, top: 0, width: 120, height: 120, borderRadius: 60 },
  // .swatch 170, ядро 120 со сдвигом 25
  swatch: { width: 170, height: 170 },
  core: { position: 'absolute', left: 25, top: 25, width: 120, height: 120, borderRadius: 60 },
});
