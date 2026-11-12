/**
 * Живая волна игры «На слух» — из макета в точности (docs/design/v2-app/elevate-games.js:11–12, elevate-extra.css:156–159):
 * 22 столбика 6 через 5 в поле высотой 110; пока звучит фраза, каждый ходит туда-обратно от 12 до 24 + (k·37)%70
 * по ease-in-out с периодом 520 / 420 / 340 мс (по раунду), фаза сдвинута на −90 мс на столбик; через 2200 мс волна
 * гаснет за 300 мс к высоте 14 и прозрачности .35. Числа — constants/gameMotion.ts (GAME_MOTION_EXTRA).
 *
 * зачем один общий отсчёт времени: 22 отдельных бесконечных анимации — это 22 таймера на UI-потоке; здесь один
 * линейный отсчёт, а высота каждого столбика считается из него. Отсчёт идёт только пока экран на виду
 * (useRuntimeActive) и не включено «уменьшить движение».
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

import { GAME_MOTION_EXTRA as W } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

/** CSS `ease-in-out`. Кривые создаются один раз на модуль, а не внутри анимированного стиля. */
const WAVE_EASE = Easing.bezierFn(0.42, 0, 0.58, 1);
/** CSS `transition` без кривой — `ease`. */
const SETTLE_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
const LINEAR = Easing.linear;
/** Сколько полных периодов укладывается в один круг отсчёта: на стыке кругов фаза не прыгает. */
const CYCLES_PER_LAP = 60;

const BARS = Array.from({ length: W.listenWaveBars }, (_, k) => ({ k, peak: W.listenWaveBase + ((k * W.listenWaveStep) % W.listenWaveSpread) }));

type BarProps = Readonly<{ k: number; peak: number; color: string; clock: SharedValue<number>; settle: SharedValue<number>; cycleMs: number; still: boolean }>;

const WaveBar = memo(function WaveBar({ k, peak, color, clock, settle, cycleMs, still }: BarProps) {
  const style = useAnimatedStyle(() => {
    let live = peak;
    if (!still) {
      // зачем: CSS `animation-delay: -k·90ms` + `alternate` — столбик k опережает первый на k·90 мс внутри цикла туда-обратно
      const period = cycleMs * 2;
      const pos = (clock.value + k * W.listenWavePhaseMs) % period;
      const u = pos < cycleMs ? pos / cycleMs : 2 - pos / cycleMs;
      live = W.listenWaveLowHeight + (peak - W.listenWaveLowHeight) * WAVE_EASE(u);
    }
    const height = live + (W.listenWaveRestHeight - live) * settle.value;
    return { height, opacity: 1 - (1 - W.listenWaveRestOpacity) * settle.value };
  }, [cycleMs, k, peak, still]);
  return <Reanimated.View style={[s.bar, { backgroundColor: color }, style]} />;
});

type Props = Readonly<{
  /** Номер раунда с нуля: от него зависит период волны. */
  roundIndex: number;
  color: string;
  /** Смена значения заново оживляет волну (повтор фразы). */
  replayKey: number;
}>;

function GameListenWave({ roundIndex, color, replayKey }: Props) {
  const reduceMotion = useReduceMotion();
  const active = useRuntimeActive(true);
  const cycles = W.listenWaveCycleMs;
  const cycleMs = cycles[Math.min(Math.max(0, roundIndex), cycles.length - 1)];
  const clock = useSharedValue(0);
  const settle = useSharedValue(0);

  // зачем: волна живёт 2200 мс от начала звучания, потом гаснет за 300 мс — как `remove('live')` в макете
  useEffect(() => {
    settle.value = 0;
    const id = setTimeout(() => {
      settle.value = withTiming(1, { duration: W.listenWaveSettleMs, easing: SETTLE_EASE });
    }, W.listenWaveLiveMs);
    return () => clearTimeout(id);
  }, [replayKey, settle]);

  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(clock);
      return undefined;
    }
    const lap = cycleMs * 2 * CYCLES_PER_LAP;
    clock.value = 0;
    clock.value = withRepeat(withTiming(lap, { duration: lap, easing: LINEAR }), -1, false);
    return () => cancelAnimation(clock);
  }, [active, clock, cycleMs, reduceMotion, replayKey]);

  return (
    <View style={s.wave}>
      {BARS.map(({ k, peak }) => (
        <WaveBar key={`wave-${k}`} k={k} peak={peak} color={color} clock={clock} settle={settle} cycleMs={cycleMs} still={reduceMotion} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: W.listenWaveGap, height: W.listenWaveHeight },
  bar: { width: W.listenWaveBarWidth, borderRadius: W.listenWaveBarWidth / 2 },
});

export default memo(GameListenWave);
