// ═══════════════════════════════════════════════════════════════════════════
// MomentCoin.tsx — монета ранга в моментах вовлечения (окно «С возвращением», Пик и дальше).
//
// зачем (закон владельца 14.10: «Монета — это валюта, и всё»): монета НЕ персонаж — она не спит, не выглядывает, не радуется и
// не говорит. Только нейтральное движение валюты: появление, лёгкий отскок при начислении, рост и сияние при повышении ранга,
// блики металла. Ассет — монета ранга человека (coin_rank_XX через SpireRankCoin). Длительности и кривые — из образца
// engagement-moments (emPop, emCcJump, emGlint); кривая ключевого кадра действует на каждый отрезок, как в CSS: один прогресс
// проходит 0→1→…→k, каждый отрезок — свой withTiming. Всё на UI-треде (Reanimated); «уменьшить движение» — монета стоит;
// бесконечные блики — только пока экран в фокусе и приложение активно. Хаптик и звук — событием onCue, решает экран.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
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
import SpireRankCoin from '../spire/SpireRankCoin';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

/** still — без движения; appear — появление; bounce — отскок при начислении; rankUp — рост и сияние при повышении ранга. */
export type MomentCoinMotion = 'still' | 'appear' | 'bounce' | 'rankUp';
export type MomentCoinCue = `coin.${Exclude<MomentCoinMotion, 'still'>}`;

export type MomentCoinProps = Readonly<{
  /** Ранг монеты 0…19; null — базовая монета. */
  rank: number | null;
  size: number;
  motion?: MomentCoinMotion;
  /** Повторить то же движение — сменить ключ. */
  motionKey?: number;
  glints?: boolean;
  /** false — без тени под монетой. */
  shadow?: boolean;
  onCue?: (cue: MomentCoinCue) => void;
  /** Видимость у владельца (шторка/вкладка); блики стоят, пока false. */
  active?: boolean;
  testID?: string;
}>;

// ─── кривые образца (engagement-moments.css :root) ─────────────────────────
const EASE_POP = Easing.bezier(0.3, 1.6, 0.5, 1); // --em-ease-pop
const CSS_EASE_IN_OUT = Easing.bezier(0.42, 0, 0.58, 1); // ключевое слово CSS ease-in-out

type Frame = Readonly<{ at: number; ty?: number; rot?: number; sx?: number; sy?: number; op?: number; glow?: number }>;
type MotionTrack = Readonly<{ ms: number; frames: readonly Frame[] }>;

// Пропущенное свойство кадра = покой (0 / 1); ореол по умолчанию 0.
const TRACKS: Readonly<Record<Exclude<MomentCoinMotion, 'still'>, MotionTrack>> = {
  // emPop (engagement-moments.css): 0% op0 scale(.4) → 70% op1 scale(1.12) → 100% scale(1); `.a-pop` 640 мс pop.
  appear: { ms: 640, frames: [{ at: 0, op: 0, sx: 0.4, sy: 0.4 }, { at: 0.7, sx: 1.12, sy: 1.12 }, { at: 1 }] },
  // emCcJump (v2.css): лёгкий отскок, 900 мс pop.
  bounce: { ms: 900, frames: [{ at: 0 }, { at: 0.2, ty: 4, sx: 1.1, sy: 0.9 }, { at: 0.55, ty: -34, sx: 0.95, sy: 1.08, rot: 6 }, { at: 0.8, ty: 2, sx: 1.06, sy: 0.94 }, { at: 1 }] },
  // Рост и сияние: масштаб как у emCcWow (1.18 → .96 → 1) без поворота и без появления из нуля, ореол вспыхивает и гаснет.
  rankUp: { ms: 1100, frames: [{ at: 0 }, { at: 0.5, sx: 1.18, sy: 1.18, glow: 1 }, { at: 0.7, sx: 0.96, sy: 0.96, glow: 0.6 }, { at: 1 }] },
};

export function momentCoinTrack(motion: Exclude<MomentCoinMotion, 'still'>): MotionTrack {
  return TRACKS[motion];
}

const STILL_TRACK: MotionTrack = { ms: 0, frames: [{ at: 0 }, { at: 1 }] };

function channel(frames: readonly Frame[], key: keyof Omit<Frame, 'at'>, rest: number): number[] {
  return frames.map((f) => f[key] ?? rest);
}

function MomentCoin({ rank, size, motion = 'still', motionKey = 0, glints, shadow = true, onCue, active, testID }: MomentCoinProps) {
  const reduceMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive(active ?? true);
  const track = motion === 'still' ? STILL_TRACK : TRACKS[motion];
  const ch = useMemo(() => ({
    ty: channel(track.frames, 'ty', 0),
    rot: channel(track.frames, 'rot', 0),
    sx: channel(track.frames, 'sx', 1),
    sy: channel(track.frames, 'sy', 1),
    op: channel(track.frames, 'op', 1),
    glow: channel(track.frames, 'glow', 0),
  }), [track]);
  const input = useMemo(() => track.frames.map((_, i) => i), [track]);
  const last = track.frames.length - 1;
  const progress = useSharedValue(last);
  const onCueRef = useRef(onCue);
  onCueRef.current = onCue;

  useEffect(() => {
    cancelAnimation(progress);
    if (motion !== 'still') onCueRef.current?.(`coin.${motion}`);
    // «Уменьшить движение» и «без движения» — сразу конечный кадр (он у всех движений = покой).
    if (reduceMotion || motion === 'still') { progress.value = last; return; }
    const segs = track.frames.slice(1).map((f, i) => withTiming(i + 1, { duration: (f.at - track.frames[i].at) * track.ms, easing: EASE_POP }));
    progress.value = 0;
    progress.value = segs.length === 1 ? segs[0] : withSequence(...segs);
    return () => cancelAnimation(progress);
  }, [last, motion, motionKey, progress, reduceMotion, track]);

  const coinStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, input, ch.op),
    transform: [
      { translateY: interpolate(progress.value, input, ch.ty) },
      { rotate: `${interpolate(progress.value, input, ch.rot)}deg` },
      { scaleX: interpolate(progress.value, input, ch.sx) },
      { scaleY: interpolate(progress.value, input, ch.sy) },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, input, ch.glow) }));

  return (
    <View testID={testID} pointerEvents="none" style={[s.wrap, { width: size }]}>
      <Animated.View testID={testID ? `${testID}-coin-${motion}` : undefined} style={[{ width: size, height: size }, s.coinFilter, coinStyle]}>
        {motion === 'rankUp' && !reduceMotion ? (
          <Animated.View style={[s.glow, { width: size, height: size, borderRadius: size / 2 }, glowStyle]} />
        ) : null}
        <SpireRankCoin rank={rank} size={size} />
        {glints && !reduceMotion ? (
          <>
            <Glint style={{ left: '18%', top: '16%' }} delayMs={0} on={runtimeActive} />
            <Glint style={{ right: '14%', top: '40%' }} delayMs={500} on={runtimeActive} />
          </>
        ) : null}
      </Animated.View>
      {shadow ? <View style={[s.shadow, { width: size * 0.6 }]} /> : null}
    </View>
  );
}

// ─── блик металла: emGlint 1.4 с ease-in-out, бесконечно, только на живом экране ─
function Glint({ style, delayMs, on }: Readonly<{ style: ViewStyle; delayMs: number; on: boolean }>) {
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    if (!on) { p.value = 0; return; }
    const cycle = withSequence(withTiming(1, { duration: 700, easing: CSS_EASE_IN_OUT }), withTiming(2, { duration: 700, easing: CSS_EASE_IN_OUT }));
    p.value = withDelay(delayMs, withRepeat(cycle, -1, false));
    return () => cancelAnimation(p);
  }, [delayMs, on, p]);
  const st = useAnimatedStyle(() => {
    const k = p.value <= 1 ? p.value : 2 - p.value; // 0 → 1 → 0
    return { opacity: k, transform: [{ scale: 0.3 + 0.7 * k }] };
  });
  return <Animated.View pointerEvents="none" style={[s.glint, style, st]} />;
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  // drop-shadow(0 14px 24px rgba(0,0,0,.5)) монеты из образца.
  coinFilter: { filter: [{ dropShadow: { offsetX: 0, offsetY: 14, standardDeviation: 12, color: 'rgba(0,0,0,0.5)' } }] },
  glow: { position: 'absolute', left: 0, top: 0, boxShadow: '0 0 28px 6px rgba(255,224,138,0.85)' }, // theme-exempt: сияние металла при повышении ранга
  glint: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', boxShadow: '0 0 10px #FFFFFF' }, // theme-exempt: блик металла
  shadow: { height: 10, borderRadius: 999, marginTop: 6, backgroundColor: 'rgba(0,0,0,0.45)', opacity: 0.45, filter: [{ blur: 4 }] }, // theme-exempt: тень под монетой
});

export default memo(MomentCoin);
