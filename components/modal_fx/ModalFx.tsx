/**
 * Общие анимационные примитивы модалок (Волна 0). Reanimated 4, UI-поток.
 * Праздник БЕЗ бумажного конфетти: парящие энергошарды вверх + лучи света +
 * дыхание кольца + шёлковый блик. Все лупы уважают reduce-motion.
 * См. docs/reports/ALL_MODALS_AUDIT_2026-06-21.md §3.6.
 *
 * Эталоны паттернов: ProfileCardMotionFx (Spark/HoloSweep/breath),
 * ShineOverlay (sheen), GiftOpenEffects (burst).
 */

import React, { memo, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';

/** Системная «Уменьшение движения» (iOS Accessibility → Motion). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Детерминированный псевдо-рандом по индексу — частицы стабильны между ремаунтами. */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* ------------------------------------------------------------------ */
/* FloatingShards — энергошарды всплывают вверх по дугам и тают.        */
/* Замена бумажного конфетти. Парят, не сыплются.                       */
/* ------------------------------------------------------------------ */

function Shard({ index, total, colors, reach, rise }: { index: number; total: number; colors: readonly string[]; reach: number; rise: number }) {
  const p = useSharedValue(0);
  const dx = (seeded(index, 1) - 0.5) * reach;
  const dur = 1000 + Math.floor(seeded(index, 2) * 500);
  const delay = Math.floor(seeded(index, 3) * 360);
  const rot = (seeded(index, 4) - 0.5) * 180;
  const color = colors[index % colors.length]!;

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(p);
  }, [p, dur, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.2, 0.85, 1], [0, 1, 0.7, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, dx]) },
      { translateY: interpolate(p.value, [0, 1], [0, -rise]) },
      { rotateZ: `${interpolate(p.value, [0, 1], [0, rot])}deg` },
      { scale: interpolate(p.value, [0, 0.25, 1], [0.3, 1, 0.85]) },
    ],
  }));

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 7,
          height: 12,
          borderRadius: 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

/**
 * Залп парящих осколков. active=true → проигрывается один раз (компонент keyed
 * родителем). При reduce-motion ничего не рисует.
 */
function FloatingShardsBase({
  colors,
  count = 9,
  reach = 150,
  rise = 100,
  bottomOffset = 0,
}: {
  colors: readonly string[];
  count?: number;
  reach?: number;
  rise?: number;
  /** Откуда стартуют осколки относительно низа контейнера. */
  bottomOffset?: number;
}) {
  const reduce = useReduceMotion();
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end' }]}>
      <View style={{ position: 'absolute', bottom: bottomOffset, left: '50%' }}>
        {Array.from({ length: count }).map((_, i) => (
          <Shard key={i} index={i} total={count} colors={colors} reach={reach} rise={rise} />
        ))}
      </View>
    </View>
  );
}

export const FloatingShards = memo(FloatingShardsBase);

/* ------------------------------------------------------------------ */
/* RaysHalo — конические лучи света, медленно вращаются + общий «выезд». */
/* ------------------------------------------------------------------ */

function RaysHaloBase({ color, size = 200, rays = 4, spinMs = 14000 }: { color: string; size?: number; rays?: number; spinMs?: number }) {
  const reduce = useReduceMotion();
  const spin = useSharedValue(0);
  const grow = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    grow.value = 0;
    grow.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    spin.value = withRepeat(withTiming(1, { duration: spinMs, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(spin);
      cancelAnimation(grow);
    };
  }, [spin, grow, spinMs, reduce]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(grow.value, [0, 1], [0, 0.8]),
    transform: [
      { scale: interpolate(grow.value, [0, 1], [0.4, 1]) },
      { rotateZ: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  if (reduce) return null;

  const rayLen = Math.round(size * 0.5);
  const step = 360 / rays;
  return (
    <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, wrapStyle]}>
      {Array.from({ length: rays }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 5,
            height: rayLen,
            top: '50%',
            borderRadius: 3,
            transform: [{ rotateZ: `${i * step}deg` }, { translateY: -rayLen / 2 }],
            overflow: 'hidden',
          }}
        >
          <LinearGradient colors={['transparent', color, 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        </View>
      ))}
    </Reanimated.View>
  );
}

export const RaysHalo = memo(RaysHaloBase);

/* ------------------------------------------------------------------ */
/* BreathHalo — мягко «дышащий» цветной ореол позади hero-кольца.       */
/* ------------------------------------------------------------------ */

function BreathHaloBase({ color, size = 140 }: { color: string; size?: number }) {
  const reduce = useReduceMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse, reduce]);

  const style = useAnimatedStyle(() => ({
    opacity: reduce ? 0.5 : interpolate(pulse.value, [0, 1], [0.4, 0.78]),
    transform: [{ scale: reduce ? 1 : interpolate(pulse.value, [0, 1], [0.9, 1.1]) }],
  }));

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}
    >
      <LinearGradient colors={[color, 'transparent']} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </Reanimated.View>
  );
}

export const BreathHalo = memo(BreathHaloBase);

/* ------------------------------------------------------------------ */
/* RevealRingFlash — кольцо score-pop 1→1.12→1 + вспышка (праздничный   */
/* reveal-момент). Проигрывается один раз при маунте.                   */
/* ------------------------------------------------------------------ */

function RevealRingFlashBase({ color, size = 96, thickness = 2 }: { color: string; size?: number; thickness?: number }) {
  const reduce = useReduceMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    p.value = 0;
    p.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(0.6, { duration: 260, easing: Easing.inOut(Easing.ease) }),
    );
    return () => cancelAnimation(p);
  }, [p, reduce]);

  const style = useAnimatedStyle(() => ({
    opacity: reduce ? 0.7 : interpolate(p.value, [0, 0.5, 1], [0, 1, 0.7]),
    transform: [{ scale: reduce ? 1 : interpolate(p.value, [0, 0.5, 1], [0.5, 1.12, 1]) }],
  }));

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

export const RevealRingFlash = memo(RevealRingFlashBase);

/* ------------------------------------------------------------------ */
/* ModalStaticGlow — статичный мягкий ореол (фолбэк reduce-motion).     */
/* ------------------------------------------------------------------ */

export const ModalStaticGlow = memo(function ModalStaticGlow({ color, size = 120 }: { color: string; size?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden', opacity: 0.55 }}
    >
      <LinearGradient colors={[color, 'transparent']} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
});
