/**
 * Мини-сцены на картах разминки — из макета в точности (docs/design/v2-app/elevate-mechanics.css:87–102,
 * elevate-mechanics.app.js `GAMES`): «Поток» — бегущие полосы, «Лишнее слово» — выпадающая плашка,
 * «Сортировка» — карта улетает в корзину. Для остальных игр сцен в макете нет — карта остаётся без сцены
 * (нет макета — не придумываем).
 * зачем useRuntimeActive: сцены крутятся по кругу — они обязаны замирать, когда экран не на виду.
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';

import { GAME_EASE } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

const OUT = Easing.bezier(GAME_EASE.out[0], GAME_EASE.out[1], GAME_EASE.out[2], GAME_EASE.out[3]);
const EASE_OUT = Easing.bezier(GAME_EASE.easeOut[0], GAME_EASE.easeOut[1], GAME_EASE.easeOut[2], GAME_EASE.easeOut[3]);
type Step = readonly [value: number, share: number];

/** Круг из опорных точек: каждая — «дойти до значения за долю общего времени» (как отрезки `@keyframes`). */
function useLoop(value: SharedValue<number>, start: number, steps: readonly Step[], totalMs: number, easing: ReturnType<typeof Easing.bezier>, active: boolean): void {
  useEffect(() => {
    cancelAnimation(value);
    value.value = start;
    if (!active) return undefined;
    value.value = withRepeat(withSequence(...steps.map(([to, share]) => withTiming(to, { duration: totalMs * share, easing }))), -1, false);
    return () => cancelAnimation(value);
    // шаги — постоянные таблицы модуля
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value]);
}

/* ---- «Поток»: `.a-flow i`, `@keyframes flow { to { transform: translateX(520px) } }` ---- */
const FLOW_LINES = [[38, 150, 2600, 0], [74, 96, 1900, 700], [108, 190, 3100, 1600], [142, 120, 2200, 300], [176, 164, 2800, 2100]] as const;
const FLOW_TRAVEL = 520;

const FlowLine = memo(function FlowLine({ top, width, ms, ahead, active }: Readonly<{ top: number; width: number; ms: number; ahead: number; active: boolean }>) {
  const t = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (!active) return undefined;
    t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [active, ms, t]);
  // отрицательная задержка макета — полоса стартует уже в пути
  const phase = (ahead % ms) / ms;
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: ((t.value + phase) % 1) * FLOW_TRAVEL }] }));
  return (
    <Reanimated.View style={[s.flowLine, { top, width }, style]}>
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Reanimated.View>
  );
});

/* ---- «Лишнее слово»: `.a-cut`, `@keyframes cutx` — 3,2 с `--out` ---- */
const CUT_MS = 3200;
const CUT_Y: readonly Step[] = [[0, 0.3], [70, 0.25], [70, 0.37], [0, 0.08]];
const CUT_ROT: readonly Step[] = [[0, 0.3], [24, 0.25], [0, 0.15], [0, 0.22], [0, 0.08]];
const CUT_OP: readonly Step[] = [[1, 0.3], [0, 0.25], [0, 0.37], [1, 0.08]];
const CUT_W: readonly Step[] = [[44, 0.55], [0, 0.15], [0, 0.22], [44, 0.08]];
const CUT_M: readonly Step[] = [[0, 0.55], [-4, 0.15], [-4, 0.22], [0, 0.08]];

const CutArt = memo(function CutArt({ active }: Readonly<{ active: boolean }>) {
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const op = useSharedValue(1);
  const w = useSharedValue(44);
  const m = useSharedValue(0);
  useLoop(y, 0, CUT_Y, CUT_MS, OUT, active);
  useLoop(rot, 0, CUT_ROT, CUT_MS, OUT, active);
  useLoop(op, 1, CUT_OP, CUT_MS, OUT, active);
  useLoop(w, 44, CUT_W, CUT_MS, OUT, active);
  useLoop(m, 0, CUT_M, CUT_MS, OUT, active);
  const style = useAnimatedStyle(() => ({ width: w.value, marginHorizontal: m.value, opacity: op.value, transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }] }));
  return (
    <View style={s.cut}>
      <View style={[s.cutBar, s.cutBarA]} />
      <Reanimated.View style={[s.cutBar, s.cutBarX, style]} />
      <View style={[s.cutBar, s.cutBarB]} />
    </View>
  );
});

/* ---- «Сортировка»: `.a-sort`, `@keyframes sortc` (3,4 с `--out`) и `bkp` (3,4 с ease-out) ---- */
const SORT_MS = 3400;
const SORT_X: readonly Step[] = [[0, 0.18], [92, 0.28], [0, 0.01], [0, 0.23], [0, 0.3]];
const SORT_Y: readonly Step[] = [[0, 0.18], [96, 0.28], [-30, 0.01], [0, 0.23], [0, 0.3]];
const SORT_ROT: readonly Step[] = [[0, 0.18], [22, 0.28], [0, 0.01], [0, 0.23], [0, 0.3]];
const SORT_SC: readonly Step[] = [[1, 0.18], [0.5, 0.28], [0.9, 0.01], [1, 0.23], [1, 0.3]];
const SORT_OP: readonly Step[] = [[1, 0.18], [0, 0.28], [0, 0.01], [1, 0.23], [1, 0.3]];
const BIN_OP: readonly Step[] = [[0.16, 0.4], [0.42, 0.1], [0.16, 0.3], [0.16, 0.2]];

const SortArt = memo(function SortArt({ active }: Readonly<{ active: boolean }>) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rot = useSharedValue(0);
  const sc = useSharedValue(1);
  const op = useSharedValue(1);
  const bin = useSharedValue(0.16);
  useLoop(x, 0, SORT_X, SORT_MS, OUT, active);
  useLoop(y, 0, SORT_Y, SORT_MS, OUT, active);
  useLoop(rot, 0, SORT_ROT, SORT_MS, OUT, active);
  useLoop(sc, 1, SORT_SC, SORT_MS, OUT, active);
  useLoop(op, 1, SORT_OP, SORT_MS, OUT, active);
  useLoop(bin, 0.16, BIN_OP, SORT_MS, EASE_OUT, active);
  const cardStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { scale: sc.value }] }));
  const binStyle = useAnimatedStyle(() => ({ opacity: bin.value }));
  return (
    <>
      <View style={[s.sortBin, s.sortBinLeft, s.sortBinIdle]} />
      <Reanimated.View style={[s.sortBin, s.sortBinRight, binStyle]} />
      <Reanimated.View style={[s.sortCard, cardStyle]} />
    </>
  );
});

type Props = Readonly<{ gameId: string }>;

function WarmupCardArt({ gameId }: Props) {
  const reduceMotion = useReduceMotion();
  const active = useRuntimeActive(true) && !reduceMotion;
  if (gameId === 'flow') {
    return <View pointerEvents="none" style={s.art}>{FLOW_LINES.map(([top, width, ms, ahead]) => <FlowLine key={top} top={top} width={width} ms={ms} ahead={ahead} active={active} />)}</View>;
  }
  if (gameId === 'odd_word') return <View pointerEvents="none" style={s.art}><CutArt active={active} /></View>;
  if (gameId === 'sort') return <View pointerEvents="none" style={s.art}><SortArt active={active} /></View>;
  return null;
}

const s = StyleSheet.create({
  // `.gc .art { position: absolute; inset: 0 0 132px 0; overflow: hidden }`
  art: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 132, overflow: 'hidden' },
  flowLine: { position: 'absolute', left: '-60%', height: 12, borderRadius: 6, overflow: 'hidden' },
  cut: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 30 },
  cutBar: { height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.86)' },
  cutBarA: { width: 52 },
  cutBarB: { width: 70 },
  cutBarX: { backgroundColor: 'rgba(255,255,255,0.34)' },
  sortCard: { position: 'absolute', left: '50%', top: 74, width: 96, height: 64, marginLeft: -48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)' },
  sortBin: { position: 'absolute', bottom: -46, width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF' },
  sortBinIdle: { opacity: 0.16 },
  sortBinLeft: { left: -30 },
  sortBinRight: { right: -30 },
});

export default memo(WarmupCardArt);
