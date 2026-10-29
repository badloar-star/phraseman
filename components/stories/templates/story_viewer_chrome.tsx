// ═══════════════════════════════════════════════════════════════════════════
// story_viewer_chrome.tsx — оболочка просмотра историй по макету stories-templates-v1.html: фон, кнопка действия, значок паузы.
//
// зачем (макет, «просмотр (StoryViewer 1:1)»): фон — градиент bgTop → bg (55 %) → bgBottom, три пятна света темы (bgGlow) медленно плывут
// (26 / 31 / 37 с, туда-обратно), сверху — подсветка accentGlow (,5 тёмное / ,35 светлое). Размытие 44 px макета повторено профилем
// радиального градиента (посчитан по размытому конусу) — без дорогого blur. Кнопка действия — 50 dp, радиус 25, поля 28, на 84 от низа,
// входит с 900 мс (часы кадра: пауза держит и её). Значок паузы — по центру, 56, пока палец держит экран (160 мс).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { LinearGradient } from '../../SafeLinearGradient';
import { EASE_CSS_IN_OUT, EASE_OUT, cubicBezier, frameMs, phase, pingPong, useStoryFrameClock } from './story_frame_clock';
import { splitAlpha } from './story_template_layout';
import { mix, useStoryTemplatePalette } from './story_template_palette';
import type { StoryTemplateCta } from './story_template_registry';
import { tplText } from './story_template_strings';

// ── пятна света ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Профиль пятна после blur(44px) макета (доля радиуса → доля цвета, вместе с opacity ,95). */
const GLOW_PROFILE: readonly (readonly [number, number])[] = [
  [0, 0.65], [0.133, 0.611], [0.267, 0.508], [0.4, 0.371], [0.533, 0.23], [0.667, 0.114], [0.8, 0.043], [0.933, 0.011], [1, 0],
];

type GlowSpec = Readonly<{ id: string; size: number; drift: Readonly<{ periodMs: number; dx: number; dy: number; grow: number }> }>;
const GLOWS: readonly GlowSpec[] = [
  { id: 'storyGlow1', size: 360, drift: { periodMs: 26000, dx: 60, dy: 40, grow: 0 } },
  { id: 'storyGlow2', size: 320, drift: { periodMs: 31000, dx: -50, dy: -60, grow: 0 } },
  { id: 'storyGlow3', size: 340, drift: { periodMs: 37000, dx: -40, dy: -30, grow: 0.1 } },
];

const Glow = memo(function Glow({ spec, color, center, clock }: Readonly<{ spec: GlowSpec; color: string; center: Readonly<{ x: number; y: number }>; clock: ReturnType<typeof useSharedValue<number>> }>) {
  // радиус следа размытия ≈ 2/3 размера пятна (профиль доходит до нуля к 240 из 360)
  const r = Math.round(spec.size * 0.667);
  const { solid, alpha } = splitAlpha(color);
  const animated = useAnimatedStyle(() => {
    const k = EASE_CSS_IN_OUT(pingPong(clock.value, spec.drift.periodMs, false));
    return { transform: [{ translateX: spec.drift.dx * k }, { translateY: spec.drift.dy * k }, { scale: 1 + spec.drift.grow * k }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: center.x - r, top: center.y - r, width: r * 2, height: r * 2 }, animated]}>
      <Svg width={r * 2} height={r * 2}>
        <Defs>
          <RadialGradient id={spec.id} cx="50%" cy="50%" r="50%">
            {GLOW_PROFILE.map(([at, k]) => <Stop key={at} offset={String(at)} stopColor={solid} stopOpacity={alpha * k} />)}
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#${spec.id})`} />
      </Svg>
    </Animated.View>
  );
});

/** Фон просмотра: градиент, три пятна света (дрейф стоит при паузе и в «Уменьшить движение»), подсветка сверху. */
export const StoryBackdrop = memo(function StoryBackdrop({ paused }: Readonly<{ paused: boolean }>) {
  const pal = useStoryTemplatePalette();
  const reduceMotion = useReducedMotion();
  const { width: W, height: H } = useWindowDimensions();
  const clock = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || paused) { cancelAnimation(clock); return undefined; }
    // зачем: свои часы дрейфа идут линейно, пока просмотр не на паузе; кривую туда-обратно считает пятно
    clock.value = withTiming(clock.value + 600_000, { duration: 600_000, easing: cubicBezier(0, 0, 1, 1) });
    return () => cancelAnimation(clock);
  }, [clock, paused, reduceMotion]);
  // центры пятен макета: .g1 left −130 top 30 (360), .g2 right −120 top 290 (320), .g3 left 30 bottom −150 (340)
  const centers = [{ x: -130 + 180, y: 30 + 180 }, { x: W + 120 - 160, y: 290 + 160 }, { x: 30 + 170, y: H + 150 - 170 }];
  const glows = [pal.g1, pal.g2, pal.g3];
  const wash = splitAlpha(pal.accGlow);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[pal.bgTop, pal.bgMid, pal.bgBot]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      {GLOWS.map((spec, i) => <Glow key={spec.id} spec={spec} color={glows[i]!} center={centers[i]!} clock={clock} />)}
      <Svg width="100%" height="100%" style={[StyleSheet.absoluteFill, { opacity: pal.isLight ? 0.35 : 0.5 }]}>
        <Defs>
          <RadialGradient id="storyWash" cx="50%" cy="0%" rx="120%" ry="50%" fx="50%" fy="0%">
            <Stop offset="0" stopColor={wash.solid} stopOpacity={wash.alpha} />
            <Stop offset="0.62" stopColor={wash.solid} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#storyWash)" />
      </Svg>
    </View>
  );
});

// ── кнопка действия ────────────────────────────────────────────────────────────────────────────────────────────────

/** Нижняя граница кнопки от низа экрана: 84 по макету, но не ближе 24 к системной полосе. */
export const storyCtaBottom = (insetBottom: number): number => Math.max(84, insetBottom + 24);
export const STORY_CTA_HEIGHT = 50;
/** Кадр с кнопкой заканчивается выше: .sl.hascta { bottom: 150 }. */
export const STORY_SLIDE_BOTTOM_CTA = 150;
/** Строка под кнопкой — на 44 dp ниже её нижнего края (макет анонса: кнопка bottom 84, строка bottom 40). */
const FINE_GAP = 44;

export const StoryCta = memo(function StoryCta({ cta, lang, bottom, onPress, testID = 'story-cta' }: Readonly<{ cta: StoryTemplateCta; lang: Lang; bottom: number; onPress: () => void; testID?: string }>) {
  const pal = useStoryTemplatePalette();
  const { progress, durationMs, final } = useStoryFrameClock();
  const pressed = useSharedValue(0);
  const enter = useAnimatedStyle(() => {
    const e = EASE_OUT(phase(frameMs(progress.value, durationMs, final), 900, 460));
    return { opacity: e, transform: [{ translateY: 16 * (1 - e) }, { scale: 1 - 0.03 * pressed.value }] };
  });
  // зачем (Эмиль: кнопка отвечает на нажатие): scale .97 за 160 мс ease-out, отпустил — назад
  const onPressIn = useCallback(() => { pressed.value = withTiming(1, { duration: 160, easing: EASE_OUT }); }, [pressed]);
  const onPressOut = useCallback(() => { pressed.value = withTiming(0, { duration: 160, easing: EASE_OUT }); }, [pressed]);
  // зачем (анонс конкурса, владелец 29.10): мелкая строка под кнопкой — «Apple и Google не спонсоры конкурса»; появляется после кнопки (1200 мс)
  const fineIn = useAnimatedStyle(() => ({ opacity: EASE_OUT(phase(frameMs(progress.value, durationMs, final), 1200, 420)) }));
  const label = tplText(lang, cta.label);
  return (
    <>
      <Animated.View style={[c.wrap, { bottom }, enter]}>
        <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} // guard-ok: кнопка во всю ширину кадра × 50 dp
          style={[c.btn, { backgroundColor: pal.cta, boxShadow: `0 12px 28px -12px ${mix(pal.shTint, 0.55)}` }]}>
          <Ionicons name={cta.icon} size={18} color={pal.ctaInk} style={c.icon} />
          <Text style={[c.label, { color: pal.ctaInk }]}>{label}</Text>
        </Pressable>
      </Animated.View>
      {cta.fine ? (
        <Animated.View testID={`${testID}-fine`} pointerEvents="none" style={[c.fine, { bottom: Math.max(12, bottom - FINE_GAP) }, fineIn]}>
          <Text style={[c.fineText, { color: pal.mu }]}>{tplText(lang, cta.fine)}</Text>
        </Animated.View>
      ) : null}
    </>
  );
});

// ── значок паузы ───────────────────────────────────────────────────────────────────────────────────────────────────

export const StoryPauseBadge = memo(function StoryPauseBadge({ visible }: Readonly<{ visible: boolean }>) {
  const pal = useStoryTemplatePalette();
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = reduceMotion ? (visible ? 1 : 0) : withTiming(visible ? 1 : 0, { duration: 160 });
  }, [reduceMotion, shown, visible]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: 0.7 + 0.3 * shown.value }] }));
  return (
    <Animated.View testID="story-pause-badge" pointerEvents="none" style={[c.pz, { backgroundColor: mix(pal.tx, 0.16) }, style]}>
      <View style={[c.pzBar, { backgroundColor: pal.tx }]} />
      <View style={[c.pzBar, { backgroundColor: pal.tx }]} />
    </Animated.View>
  );
});

const c = StyleSheet.create({
  // .scta: поля 28, высота 50, радиус 25, зазор 10, 17/700, значок 18
  wrap: { position: 'absolute', left: 28, right: 28, height: STORY_CTA_HEIGHT },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 25, paddingHorizontal: 20 },
  icon: { lineHeight: 18 },
  label: { fontSize: 17, lineHeight: 22, fontWeight: '700', flexShrink: 1 },
  // .fine анонса: поля 28, 12/16, по центру, цвет «приглушённый» темы
  fine: { position: 'absolute', left: 28, right: 28 },
  fineText: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  // .pz: 56, по центру экрана; две полоски 6 × 20 с полями 3
  pz: { position: 'absolute', left: '50%', top: '50%', width: 56, height: 56, marginLeft: -28, marginTop: -28, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pzBar: { width: 6, height: 20, borderRadius: 2, marginHorizontal: 3 },
});
