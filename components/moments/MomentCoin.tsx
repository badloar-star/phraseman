// ═══════════════════════════════════════════════════════════════════════════
// MomentCoin.tsx — монета-персонаж моментов вовлечения (образец engagement-moments-v2.css / -v3.css / -v3.js / -v3-all.html).
//
// зачем (координатор 14.10): одна общая монета для всех моментов v3 — «С возвращением» (m21), Пик (m01–m03) и дальше.
// Монета — ассет ранга человека (coin_rank_XX через SpireRankCoin). Настроения и эмоции — ровно те, что в образце, с теми же
// длительностями и кривыми; плюс движения валюты: появление, отскок при начислении, рост и сияние при повышении ранга.
// Владелец 14.10: анимации сна, сердечки и эмоции ОСТАЮТСЯ; запрещены только тексты, где монета описана как живое существо —
// сторож проверяет это по исходнику.
// Кривая ключевого кадра в CSS действует на КАЖДЫЙ отрезок между кадрами, поэтому здесь один прогресс на настроение проходит
// 0→1→…→k, каждый отрезок — свой withTiming с кривой образца, а свойства берутся interpolate по кадрам.
// Всё движение — на UI-треде (Reanimated). Бесконечные циклы (покой, сон, «z», блики, тень) крутятся только пока экран в фокусе
// и приложение активно. Хаптик и звук компонент не играет — сообщает событие onCue(имя), экран решает по тайм-листу момента.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import SpireRankCoin from '../spire/SpireRankCoin';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useSpireShadow } from '../spire/useSpireShadow';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

export type MomentCoinMood =
  | 'idle' | 'sleep' | 'peek' | 'cheer' | 'nod' | 'jump' | 'wow' | 'shiver' | 'spin'
  | 'still' | 'appear' | 'bounce' | 'rankUp';
export type MomentCoinEmote = 'heart' | 'star' | 'bang' | 'sweat' | 'dots';
/** Имя события для хаптика/звука: `coin.<настроение>` для разовых настроений, `coin.emote.<эмоция>` для эмоций. */
export type MomentCoinCue = `coin.${MomentCoinMood}` | `coin.emote.${MomentCoinEmote}`;

export type MomentCoinProps = Readonly<{
  /** Ранг монеты 0…19; null — базовая монета. */
  rank: number | null;
  size: number;
  mood: MomentCoinMood;
  /** Повторить то же разовое настроение — сменить ключ. */
  moodKey?: number;
  /** Облачко-реплика над монетой («Держимся.»). */
  say?: string;
  sayTone?: 'default' | 'gold';
  sayBig?: boolean;
  /** 'l' — облачко левее монеты (`.say.l` образца). */
  sayPos?: 'center' | 'l';
  /** Значок сна «z» (виден при mood='sleep'). */
  zz?: boolean;
  glints?: boolean;
  crown?: boolean;
  /** false — без тени под монетой. */
  shadow?: boolean;
  /** Всплеск эмоций; повторить тот же — сменить emoteKey. */
  emote?: MomentCoinEmote | null;
  emoteKey?: number;
  /** Сколько значков; по умолчанию как в образце. */
  emoteCount?: number;
  onCue?: (cue: MomentCoinCue) => void;
  /** Тап по монете. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Видимость у владельца (шторка/вкладка); бесконечные циклы стоят, пока false. */
  active?: boolean;
  testID?: string;
}>;

// ─── кривые образца (engagement-moments.css :root) ─────────────────────────
const EASE = Easing.bezier(0.2, 1, 0.3, 1); // --em-ease
const EASE_POP = Easing.bezier(0.3, 1.6, 0.5, 1); // --em-ease-pop
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1); // --em-ease-in-out
const CSS_EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1); // ключевое слово CSS ease-in-out

type Frame = Readonly<{ at: number; tx?: number; ty?: number; rot?: number; sx?: number; sy?: number; op?: number; ry?: number; glow?: number }>;
type MoodTrack = Readonly<{ ms: number; easing: ReturnType<typeof Easing.bezier>; loop: boolean; frames: readonly Frame[] }>;

const JUMP_FRAMES: readonly Frame[] = [{ at: 0 }, { at: 0.2, ty: 4, sx: 1.1, sy: 0.9 }, { at: 0.55, ty: -34, sx: 0.95, sy: 1.08, rot: 6 }, { at: 0.8, ty: 2, sx: 1.06, sy: 0.94 }, { at: 1 }];

// Кадры 1:1 с @keyframes emCc* (v2.css, v3.css), emPop и emSpinY (engagement-moments.css). Пропущенное свойство кадра = покой.
const TRACKS: Readonly<Record<MomentCoinMood, MoodTrack>> = {
  idle: { ms: 2800, easing: CSS_EASE_IN_OUT, loop: true, frames: [{ at: 0, rot: -2 }, { at: 0.5, ty: -7, rot: 2 }, { at: 1, rot: -2 }] },
  sleep: { ms: 3000, easing: CSS_EASE_IN_OUT, loop: true, frames: [{ at: 0, rot: -12, ty: 2 }, { at: 0.5, rot: -14, ty: 4 }, { at: 1, rot: -12, ty: 2 }] },
  peek: { ms: 900, easing: EASE_POP, loop: false, frames: [{ at: 0, ty: 40, rot: -20, op: 0 }, { at: 0.6, ty: -6, rot: 6 }, { at: 1 }] },
  cheer: {
    ms: 1100, easing: EASE_POP, loop: false,
    frames: [{ at: 0 }, { at: 0.15, sx: 1.12, sy: 0.86, ty: 4 }, { at: 0.45, sx: 0.94, sy: 1.1, ty: -40, rot: -8 }, { at: 0.65, ty: -30, rot: 8 }, { at: 0.85, sx: 1.08, sy: 0.92, ty: 3 }, { at: 1 }],
  },
  nod: { ms: 1200, easing: CSS_EASE_IN_OUT, loop: false, frames: [{ at: 0 }, { at: 0.25, rot: -9, ty: 2 }, { at: 0.5 }, { at: 0.75, rot: -9, ty: 2 }, { at: 1 }] },
  jump: { ms: 900, easing: EASE_POP, loop: false, frames: JUMP_FRAMES },
  wow: { ms: 1100, easing: EASE_POP, loop: false, frames: [{ at: 0, sx: 0.3, sy: 0.3, rot: -30, op: 0 }, { at: 0.5, sx: 1.18, sy: 1.18, rot: 6 }, { at: 0.7, sx: 0.96, sy: 0.96, rot: -3 }, { at: 1 }] },
  shiver: { ms: 600, easing: CSS_EASE_IN_OUT, loop: false, frames: [{ at: 0 }, { at: 0.2, tx: -3, rot: -3 }, { at: 0.4, tx: 3, rot: 3 }, { at: 0.6, tx: -2, rot: -2 }, { at: 0.8, tx: 2, rot: 2 }, { at: 1 }] },
  spin: { ms: 1200, easing: EASE_IN_OUT, loop: false, frames: [{ at: 0, ry: 0 }, { at: 1, ry: 720 }] },
  // Движения валюты (координатор 14.10).
  still: { ms: 0, easing: EASE_POP, loop: false, frames: [{ at: 0 }, { at: 1 }] },
  // emPop: 0% op0 scale(.4) → 70% op1 scale(1.12) → 100%; `.a-pop` 640 мс pop.
  appear: { ms: 640, easing: EASE_POP, loop: false, frames: [{ at: 0, op: 0, sx: 0.4, sy: 0.4 }, { at: 0.7, sx: 1.12, sy: 1.12 }, { at: 1 }] },
  // Отскок при начислении — кадры emCcJump.
  bounce: { ms: 900, easing: EASE_POP, loop: false, frames: JUMP_FRAMES },
  // Рост и сияние при повышении ранга: масштаб как у emCcWow (1.18 → .96 → 1) без поворота, ореол вспыхивает и гаснет.
  rankUp: { ms: 1100, easing: EASE_POP, loop: false, frames: [{ at: 0 }, { at: 0.5, sx: 1.18, sy: 1.18, glow: 1 }, { at: 0.7, sx: 0.96, sy: 0.96, glow: 0.6 }, { at: 1 }] },
};

/** Сколько значков всплывает по умолчанию — самые частые числа из образца v3-all. */
export const MOMENT_COIN_EMOTE_DEFAULT_COUNT: Readonly<Record<MomentCoinEmote, number>> = { bang: 1, sweat: 2, heart: 4, star: 4, dots: 1 };
const EMOTE_GLYPH: Readonly<Record<MomentCoinEmote, string>> = { heart: '♥', sweat: '💧', bang: '!', dots: '…', star: '✦' };
const EMOTE_MS = 1200;
const EMOTE_STEP_MS = 140;

export function momentCoinTrack(mood: MomentCoinMood): MoodTrack {
  return TRACKS[mood];
}

type Channels = Readonly<{ tx: number[]; ty: number[]; rot: number[]; sx: number[]; sy: number[]; op: number[]; ry: number[]; glow: number[] }>;
function channels(frames: readonly Frame[]): Channels {
  return {
    tx: frames.map((f) => f.tx ?? 0),
    ty: frames.map((f) => f.ty ?? 0),
    rot: frames.map((f) => f.rot ?? 0),
    sx: frames.map((f) => f.sx ?? 1),
    sy: frames.map((f) => f.sy ?? 1),
    op: frames.map((f) => f.op ?? 1),
    ry: frames.map((f) => f.ry ?? 0),
    glow: frames.map((f) => f.glow ?? 0),
  };
}

function MomentCoin(props: MomentCoinProps) {
  const { rank, size, mood, moodKey = 0, say, zz, glints, crown, shadow = true, emote, emoteKey, emoteCount, onCue, onPress, testID } = props;
  const reduceMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive(props.active ?? true);
  const palette = useSpirePalette();
  const plateShadow = useSpireShadow().plate;
  const track = TRACKS[mood];
  const ch = useMemo(() => channels(track.frames), [track]);
  const input = useMemo(() => track.frames.map((_, i) => i), [track]);
  const last = track.frames.length - 1;
  const progress = useSharedValue(reduceMotion || mood === 'still' ? last : 0);
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;

  useEffect(() => {
    cancelAnimation(progress);
    if (reduceMotion || mood === 'still') { progress.value = last; return; }
    if (track.loop && !runtimeActive) { progress.value = 0; return; }
    const segs = track.frames.slice(1).map((f, i) => withTiming(i + 1, { duration: (f.at - track.frames[i].at) * track.ms, easing: track.easing }));
    const run = segs.length === 1 ? segs[0] : withSequence(...segs);
    progress.value = 0;
    progress.value = track.loop ? withRepeat(run, -1, false) : run;
    return () => cancelAnimation(progress);
  }, [last, mood, moodKey, progress, reduceMotion, runtimeActive, track]);

  useEffect(() => {
    if (!track.loop && mood !== 'still') onCueRef.current?.(`coin.${mood}`);
  }, [mood, moodKey, track.loop]);

  const faceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, input, ch.op),
    transform: [
      { translateX: interpolate(progress.value, input, ch.tx) },
      { translateY: interpolate(progress.value, input, ch.ty) },
      { rotate: `${interpolate(progress.value, input, ch.rot)}deg` },
      { rotateY: `${interpolate(progress.value, input, ch.ry)}deg` },
      { scaleX: interpolate(progress.value, input, ch.sx) },
      { scaleY: interpolate(progress.value, input, ch.sy) },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, input, ch.glow) }));

  const loopsOn = !reduceMotion && runtimeActive;
  const body = (
    <View style={[s.cc, { width: size }]} testID={testID ? `${testID}-body` : undefined}>
      {say ? <SayBubble text={say} tone={props.sayTone ?? 'default'} big={props.sayBig === true} pos={props.sayPos ?? 'center'} size={size} reduceMotion={reduceMotion} bg={palette.card} ink={palette.text} plate={plateShadow} /> : null}
      {crown ? <Crown reduceMotion={reduceMotion} /> : null}
      <Animated.View style={[{ width: size, height: size }, mood === 'sleep' ? s.sleepFilter : s.faceFilter, faceStyle]} testID={testID ? `${testID}-face-${mood}` : undefined}>
        {mood === 'rankUp' && !reduceMotion ? <Animated.View style={[s.glow, { width: size, height: size, borderRadius: size / 2 }, glowStyle]} /> : null}
        <SpireRankCoin rank={rank} size={size} />
        {glints && !reduceMotion ? (
          <>
            <Glint style={{ left: '18%', top: '16%' }} delayMs={0} on={loopsOn} />
            <Glint style={{ right: '14%', top: '40%' }} delayMs={500} on={loopsOn} />
          </>
        ) : null}
        {mood === 'sleep' && zz ? <Zz on={loopsOn} color={palette.textSecondary} /> : null}
      </Animated.View>
      {shadow ? <CoinShadow size={size} on={loopsOn} /> : null}
      <EmoteBurst kind={emote ?? null} burstKey={emoteKey ?? 0} count={emoteCount} reduceMotion={reduceMotion} onCueRef={onCueRef} dotsColor={palette.textSecondary} starColor={palette.text} />
    </View>
  );
  if (!onPress) return <View testID={testID} pointerEvents="box-none">{body}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? say} hitSlop={12}>
      {body}
    </Pressable>
  );
}

// ─── облачко-реплика: emSay 500 мс pop (v2.css .cc .say) ────────────────────
type SayProps = Readonly<{ text: string; tone: 'default' | 'gold'; big: boolean; pos: 'center' | 'l'; size: number; reduceMotion: boolean; bg: string; ink: string; plate: ViewStyle }>;
function SayBubble({ text, tone, big, pos, size, reduceMotion, bg, ink, plate }: SayProps) {
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) { p.value = 1; return; }
    p.value = 0;
    p.value = withTiming(1, { duration: 500, easing: EASE_POP });
  }, [p, reduceMotion, text]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [8, 0]) }, { scale: interpolate(p.value, [0, 1], [0.8, 1]) }],
  }));
  const gold = tone === 'gold';
  const inkColor = gold ? GOLD_INK : ink;
  const bubbleShape = [s.say, big ? s.sayBig : null, pos === 'l' ? s.sayLeftShape : null];
  const anchor = pos === 'l' ? [s.sayAnchorLeft, { right: size / 2 - 30 }] : s.sayAnchorCenter;
  return (
    <View style={anchor} pointerEvents="none">
      <Animated.View style={[st, plate, bubbleShape, { backgroundColor: gold ? GOLD_MID : bg }]} accessible accessibilityLabel={text}>
        {gold ? <LinearGradient colors={GOLD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, bubbleShape, s.noPad]} /> : null}
        <Text style={[s.sayText, big ? s.sayTextBig : null, { color: inkColor }]}>{text}</Text>
        <View style={[s.sayTail, pos === 'l' ? s.sayTailLeft : null, { backgroundColor: gold ? GOLD_MID : bg }]} />
      </Animated.View>
    </View>
  );
}

// ─── корона: emCrownIn 800 мс pop, задержка 0.8 с ──────────────────────────
function Crown({ reduceMotion }: Readonly<{ reduceMotion: boolean }>) {
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) { p.value = 1; return; }
    p.value = withDelay(800, withTiming(1, { duration: 800, easing: EASE_POP }));
  }, [p, reduceMotion]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: interpolate(p.value, [0, 1], [-30, 0]) }, { rotate: `${interpolate(p.value, [0, 1], [-30, -8])}deg` }],
  }));
  return (
    <View style={s.crownAnchor} pointerEvents="none">
      <Animated.View style={st}>
        <Svg width={44} height={30} viewBox="0 0 44 30">
          <Path d="M4 26L2 8l10 8L22 2l10 14 10-8-2 18z" fill="#F5C451" stroke="#B9842A" strokeWidth={1.5} strokeLinejoin="round" />
          <Circle cx={22} cy={12} r={2.5} fill="#fff" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── блик: emGlint 1.4 с ease-in-out, бесконечно ───────────────────────────
function Glint({ style, delayMs, on }: Readonly<{ style: ViewStyle; delayMs: number; on: boolean }>) {
  // До старта (задержка второго блика) CSS показывает элемент без анимации — видимым; повторяем.
  const p = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(p);
    if (!on) { p.value = 1; return; }
    const cycle = withSequence(withTiming(1, { duration: 700, easing: CSS_EASE_IN_OUT }), withTiming(2, { duration: 700, easing: CSS_EASE_IN_OUT }));
    p.value = withDelay(delayMs, withSequence(withTiming(0, { duration: 0 }), withRepeat(cycle, -1, false)));
    return () => cancelAnimation(p);
  }, [delayMs, on, p]);
  const st = useAnimatedStyle(() => {
    const v = p.value;
    const k = v <= 1 ? v : 2 - v; // 0 → 1 → 0
    return { opacity: k, transform: [{ scale: 0.3 + 0.7 * k }] };
  });
  return <Animated.View pointerEvents="none" style={[s.glint, style, st]} />;
}

// ─── «z»: emZz 2.2 с ease-in-out — сдвиг одним отрезком, прозрачность двумя (0→40%→100%) ─
function Zz({ on, color }: Readonly<{ on: boolean; color: string }>) {
  const move = useSharedValue(0);
  const fade = useSharedValue(on ? 0 : 1);
  useEffect(() => {
    cancelAnimation(move);
    cancelAnimation(fade);
    if (!on) { move.value = 0; fade.value = 1; return; }
    move.value = 0;
    fade.value = 0;
    move.value = withRepeat(withTiming(1, { duration: 2200, easing: CSS_EASE_IN_OUT }), -1, false);
    fade.value = withRepeat(withSequence(withTiming(1, { duration: 880, easing: CSS_EASE_IN_OUT }), withTiming(2, { duration: 1320, easing: CSS_EASE_IN_OUT })), -1, false);
    return () => { cancelAnimation(move); cancelAnimation(fade); };
  }, [fade, move, on]);
  const st = useAnimatedStyle(() => ({
    opacity: fade.value <= 1 ? fade.value : 2 - fade.value,
    transform: [{ translateX: 14 * move.value }, { translateY: -22 * move.value }, { scale: 0.6 + 0.6 * move.value }],
  }));
  return <Animated.Text accessible={false} style={[s.zz, { color }, st]}>z</Animated.Text>;
}

// ─── тень под монетой: emShadowIdle 2.8 с, крутится всегда (как в образце) ─
function CoinShadow({ size, on }: Readonly<{ size: number; on: boolean }>) {
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    if (!on) { p.value = 0; return; }
    p.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: CSS_EASE_IN_OUT }), withTiming(0, { duration: 1400, easing: CSS_EASE_IN_OUT })), -1, false);
    return () => cancelAnimation(p);
  }, [on, p]);
  const st = useAnimatedStyle(() => ({ opacity: 0.45 - 0.15 * p.value, transform: [{ scaleX: 1 - 0.2 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[s.shadow, { width: size * 0.6 }, st]} />;
}

// ─── эмоции: emo() образца v3.js — значки всплывают со сдвигом 140 мс, живут 1600 + i·140 мс ─
type Particle = Readonly<{ id: string; kind: MomentCoinEmote; i: number; left: number; top: number; ex: number; ey: number }>;
type BurstProps = Readonly<{ kind: MomentCoinEmote | null; burstKey: number; count?: number; reduceMotion: boolean; onCueRef: React.MutableRefObject<MomentCoinProps['onCue']>; dotsColor: string; starColor: string }>;
function EmoteBurst({ kind, burstKey, count, reduceMotion, onCueRef, dotsColor, starColor }: BurstProps) {
  const [particles, setParticles] = useState<readonly Particle[]>([]);
  useEffect(() => {
    if (!kind) return;
    onCueRef.current?.(`coin.emote.${kind}`);
    if (reduceMotion) return; // зачем: «уменьшить движение» — статичная монета, всплывающих значков нет; событие хаптика/звука всё равно уходит
    const n = Math.max(1, Math.floor(count ?? MOMENT_COIN_EMOTE_DEFAULT_COUNT[kind]));
    const born = Date.now();
    const fresh: Particle[] = Array.from({ length: n }, (_, i) => ({
      id: `${born}-${burstKey}-${i}`, kind, i,
      left: 30 + Math.random() * 40, top: 10 + Math.random() * 30,
      ex: (Math.random() - 0.5) * 60, ey: -30 - Math.random() * 40,
    }));
    setParticles((prev) => [...prev, ...fresh]);
    const timers = fresh.map((pt) => setTimeout(() => setParticles((prev) => prev.filter((x) => x.id !== pt.id)), 1600 + pt.i * EMOTE_STEP_MS));
    return () => timers.forEach(clearTimeout);
  }, [burstKey, count, kind, onCueRef, reduceMotion]);
  if (particles.length === 0) return null;
  return (
    <>
      {particles.map((pt) => <EmoteGlyph key={pt.id} p={pt} dotsColor={dotsColor} starColor={starColor} />)}
    </>
  );
}

function EmoteGlyph({ p: pt, dotsColor, starColor }: Readonly<{ p: Particle; dotsColor: string; starColor: string }>) {
  const p = useSharedValue(0);
  useEffect(() => {
    // emEmo: 0% → 25% → 100%, кривая --em-ease на каждом отрезке; задержка i·140 мс (до неё виден кадр 0% — прозрачный).
    p.value = withDelay(pt.i * EMOTE_STEP_MS, withSequence(withTiming(1, { duration: EMOTE_MS * 0.25, easing: EASE }), withTiming(2, { duration: EMOTE_MS * 0.75, easing: EASE })));
    return () => cancelAnimation(p);
  }, [p, pt.i]);
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1, 2], [0, 1, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 1, 2], [0, 0, pt.ex]) },
      { translateY: interpolate(p.value, [0, 1, 2], [6, -4, pt.ey]) },
      { scale: interpolate(p.value, [0, 1, 2], [0.5, 1.1, 1]) },
    ],
  }));
  const color = pt.kind === 'dots' ? dotsColor : pt.kind === 'star' ? starColor : EMOTE_COLOR[pt.kind];
  return (
    <Animated.Text accessible={false} pointerEvents="none" style={[s.emo, pt.kind === 'bang' ? s.emoBang : null, pt.kind === 'dots' ? s.emoDots : null, { left: `${pt.left}%`, top: `${pt.top}%`, color }, st]}>
      {EMOTE_GLYPH[pt.kind]}
    </Animated.Text>
  );
}

// Цвета эмоций, «z», блика, короны и сияния — иллюстрация (эталон .emo.*, .glint, .crown), не токены темы.
const EMOTE_COLOR: Readonly<Record<'heart' | 'sweat' | 'bang', string>> = { heart: '#FF6B8B', sweat: '#7EC8FF', bang: '#FFD166' }; // theme-exempt: иллюстрация
const GOLD_GRADIENT = ['#FFE08A', '#F0B33A'] as const; // theme-exempt: `.say.gold` образца
const GOLD_MID = '#F7C962'; // theme-exempt: середина золотого градиента для хвостика облачка
const GOLD_INK = '#3A2400'; // theme-exempt: текст золотого облачка образца

const s = StyleSheet.create({
  cc: { position: 'relative', alignItems: 'center' },
  // drop-shadow(0 14px 24px rgba(0,0,0,.5)) монеты; во сне ещё saturate(.6) brightness(.8). iOS понимает только brightness.
  faceFilter: { filter: [{ dropShadow: { offsetX: 0, offsetY: 14, standardDeviation: 12, color: 'rgba(0,0,0,0.5)' } }] },
  sleepFilter: { filter: [{ dropShadow: { offsetX: 0, offsetY: 14, standardDeviation: 12, color: 'rgba(0,0,0,0.5)' } }, { saturate: 0.6 }, { brightness: 0.8 }] },
  glow: { position: 'absolute', left: 0, top: 0, boxShadow: '0 0 28px 6px rgba(255,224,138,0.85)' }, // theme-exempt: сияние металла при повышении ранга
  sayAnchorCenter: { position: 'absolute', bottom: '100%', left: -400, right: -400, marginBottom: 10, alignItems: 'center' },
  sayAnchorLeft: { position: 'absolute', bottom: '100%', marginBottom: 10, alignItems: 'flex-end' },
  // `.cc .say`: 10/14, скругление 18 (низ-лево 6), 15/700, в одну строку
  say: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomLeftRadius: 6 },
  sayBig: { paddingVertical: 12, paddingHorizontal: 16 },
  sayLeftShape: { borderBottomLeftRadius: 18, borderBottomRightRadius: 6 },
  noPad: { padding: 0 },
  // зачем (D145, сторож typography_store_surface_ratchet): шкала владельца 16/21 главнее макета (.say 15/700, .say.big 17) — облачко
  // отличается полями, не кеглем; значки сна и эмоций 20/25 (≥19 — вне храповика, межстрочный ≥1,25×).
  sayText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  sayTextBig: { fontSize: 16, lineHeight: 21 },
  sayTail: { position: 'absolute', left: '50%', bottom: -6, width: 12, height: 12, marginLeft: -14, borderRadius: 2, transform: [{ rotate: '45deg' }], zIndex: -1 },
  sayTailLeft: { left: undefined, right: 14, marginLeft: 0 },
  crownAnchor: { position: 'absolute', top: -22, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  glint: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', boxShadow: '0 0 10px #FFFFFF' }, // theme-exempt: блик металла
  zz: { position: 'absolute', right: -8, top: -4, fontSize: 20, lineHeight: 25, fontWeight: '800' },
  shadow: { height: 10, borderRadius: 999, marginTop: 6, backgroundColor: 'rgba(0,0,0,0.45)', filter: [{ blur: 4 }] }, // theme-exempt: тень под монетой
  emo: { position: 'absolute', fontSize: 20, lineHeight: 25 },
  emoBang: { fontSize: 26, lineHeight: 28, fontWeight: '900' },
  emoDots: { letterSpacing: 2 },
});

export default memo(MomentCoin);
