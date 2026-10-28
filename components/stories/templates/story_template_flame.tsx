// ═══════════════════════════════════════════════════════════════════════════
// story_template_flame.tsx — огонь кадра «Серия · 7 дней» по макету stories-templates-v1.html (.flame): контур, два слоя пламени с градиентом
// из цвета темы и «дрожанием», белое ядро, подсветка.
//
// зачем (Сверка 28.10, кадр 1: «в приложении капля с кольцом, в макете градиентное пламя»): огонь приложения (StreakFlameFill) заливается
// по числу дней — на 7 днях залита только нижняя часть. Кадр истории рисует пламя макета целиком: --c3 (accent + 60 % белого) сверху →
// accent (45 %) → --c1 (accent + 25 % тени) снизу; слой l2 — screen ,55 (в светлом — обычный ,35); ядро — 75 dp на 25 % / 36 %, ,8 (светлое ,55).
// Дрожание — кривые и периоды макета (stFl1 2,3 с, stFl2 3,1 с, stFl3 1,7 с, туда-обратно) от часов кадра: удержание ставит на паузу.
// Цвета — только токены темы (mediaInk вместо #fff, shadowTint вместо #000).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from '../../SafeLinearGradient';
import { mixThemeColors } from '../../streak/StreakFlameFill';
import { cubicBezier, frameMs, pingPong, useStoryFrameClock } from './story_frame_clock';
import { splitAlpha } from './story_template_layout';
import { useStoryTemplatePalette } from './story_template_palette';

const EASE_FLICKER = cubicBezier(0.45, 0.05, 0.55, 0.95);
type Pose = Readonly<{ skew: number; sy: number; tx: number; ty: number }>;
// keyframes макета
const FL1: readonly [Pose, Pose, Pose] = [{ skew: -2.5, sy: 0.985, tx: 0, ty: 0 }, { skew: 1.5, sy: 1.01, tx: 0, ty: -1 }, { skew: 3, sy: 1.03, tx: 0, ty: -2 }];
const FL2: readonly [Pose, Pose] = [{ skew: 3, sy: 1.02, tx: 1, ty: 0 }, { skew: -3.5, sy: 0.97, tx: -1, ty: 0 }];
const FL3: readonly [Pose, Pose] = [{ skew: -4, sy: 0.94, tx: 0, ty: 0 }, { skew: 4, sy: 1.08, tx: 0, ty: -3 }];

function lerpPose(a: Pose, b: Pose, u: number): Pose {
  'worklet';
  return { skew: a.skew + (b.skew - a.skew) * u, sy: a.sy + (b.sy - a.sy) * u, tx: a.tx + (b.tx - a.tx) * u, ty: a.ty + (b.ty - a.ty) * u };
}

/** Поза по кадрам ключей: кривая применяется на каждом отрезке ключей (как в CSS). */
function poseAt(keys: readonly Pose[], k: number): Pose {
  'worklet';
  if (keys.length === 2) return lerpPose(keys[0]!, keys[1]!, EASE_FLICKER(k));
  return k < 0.5 ? lerpPose(keys[0]!, keys[1]!, EASE_FLICKER(k / 0.5)) : lerpPose(keys[1]!, keys[2]!, EASE_FLICKER((k - 0.5) / 0.5));
}

function useFlicker(keys: readonly Pose[], periodMs: number) {
  const { progress, durationMs, final } = useStoryFrameClock();
  return useAnimatedStyle(() => {
    const p = poseAt(keys, pingPong(frameMs(progress.value, durationMs, final), periodMs, final));
    return { transform: [{ translateX: p.tx }, { translateY: p.ty }, { skewX: `${p.skew}deg` }, { scaleY: p.sy }] };
  });
}

/** Пламя, залитое градиентом (маска — глиф flame). */
const GradientFlame = memo(function GradientFlame({ size, top, mid, bottom }: Readonly<{ size: number; top: string; mid: string; bottom: string }>) {
  return (
    <MaskedView style={{ width: size, height: size }} maskElement={<Ionicons name="flame" size={size} color="black" style={{ lineHeight: size, textAlign: 'center' }} />}>
      <LinearGradient colors={[top, mid, bottom]} locations={[0, 0.45, 1]} style={{ width: size, height: size }} />
    </MaskedView>
  );
});

export const TemplateFlame = memo(function TemplateFlame({ size = 150 }: Readonly<{ size?: number }>) {
  const pal = useStoryTemplatePalette();
  const c1 = mixThemeColors(pal.accG, pal.shTint, 0.25);
  const c3 = mixThemeColors(pal.accG, pal.mediaInk, 0.6);
  const l1 = useFlicker(FL1, 2300);
  const l2 = useFlicker(FL2, 3100);
  const core = useFlicker(FL3, 1700);
  const glow = splitAlpha(pal.accGlow);
  const coreSize = Math.round(size / 2);
  // .fglow: круг 70 % по центру на 58 % высоты, размытие 14 → радиальный градиент шире на размытие
  const glowR = Math.round(size * 0.35 + 28);
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg pointerEvents="none" width={glowR * 2} height={glowR * 2} style={{ position: 'absolute', left: size / 2 - glowR, top: size * 0.58 - glowR }}>
        <Defs>
          <RadialGradient id="tplFlameGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glow.solid} stopOpacity={glow.alpha * 0.8} />
            <Stop offset="0.65" stopColor={glow.solid} stopOpacity={glow.alpha * 0.25} />
            <Stop offset="1" stopColor={glow.solid} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={glowR} cy={glowR} r={glowR} fill="url(#tplFlameGlow)" />
      </Svg>
      <Ionicons name="flame-outline" size={size} color={pal.mu} style={[f.glyph, { lineHeight: size, opacity: 0.5 }]} />
      <Animated.View style={[f.layer, { opacity: pal.isLight ? 0.35 : 0.55, mixBlendMode: pal.isLight ? 'normal' : 'screen' }, l2]}>
        <GradientFlame size={size} top={c3} mid={pal.accG} bottom={c1} />
      </Animated.View>
      <Animated.View style={[f.layer, l1]}>
        <GradientFlame size={size} top={c3} mid={pal.accG} bottom={c1} />
      </Animated.View>
      <Animated.View style={[f.core, { left: size * 0.25, top: size * 0.36, width: coreSize, height: coreSize, opacity: pal.isLight ? 0.55 : 0.8 }, core]}>
        <Ionicons name="flame" size={coreSize} color={pal.mediaInk} style={{ lineHeight: coreSize, textAlign: 'center' }} />
      </Animated.View>
    </View>
  );
});

const f = StyleSheet.create({
  glyph: { position: 'absolute', left: 0, top: 0, textAlign: 'center' },
  // transform-origin 50 % 88 % у слоёв пламени, 50 % 95 % у ядра (макет)
  layer: { position: 'absolute', left: 0, top: 0, transformOrigin: '50% 88%' },
  core: { position: 'absolute', transformOrigin: '50% 95%' },
});
