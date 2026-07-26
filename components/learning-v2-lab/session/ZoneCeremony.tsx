// зачем: RN-порт .umap-ceremony из поставки — одноразовое поздравление при
// возврате с пройденной сессии: конфетти разлетается от центра, название зоны и
// can-do. Живёт ~2.4 с и уходит; тап закрывает раньше.
// Анимация — только transform/opacity на нативном потоке, без блокировки экрана.
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { GraphemeText } from '../kimi/primitives';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT, withAlpha } from '../kimi/tokens';

/** Частицы: угол разлёта, дальность и задержка — как в поставке (14 штук). */
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: `p-${i}`,
  angle: (i / 14) * 360,
  distance: 48 + (i % 3) * 18,
  delay: (i % 4) * 24,
  gold: i % 2 === 0,
}));

export interface ZoneCeremonyProps {
  readonly zoneTitle: string;
  readonly canDo: string;
  readonly onDone: () => void;
}

export const ZoneCeremony = memo(function ZoneCeremony({ zoneTitle, canDo, onDone }: ZoneCeremonyProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    // зачем: церемония одноразовая и не должна залипать — уходит сама
    const timer = setTimeout(onDone, 2400);
    return () => clearTimeout(timer);
  }, [fade, rise, onDone]);

  return (
    <Animated.View style={[s.overlay, { opacity: fade }]} pointerEvents="box-none">
      <Pressable style={s.press} onPress={onDone} accessibilityRole="button" accessibilityLabel="Закрыть поздравление">
        <View style={s.confetti} pointerEvents="none">
          {PARTICLES.map((particle) => (
            <Particle key={particle.id} {...particle} />
          ))}
        </View>
        <Animated.View style={[s.card, { transform: [{ translateY: rise }] }]}>
          <Text style={s.title}>Зона «{zoneTitle}» — шаг вперёд!</Text>
          <GraphemeText text={canDo} maxGraphemes={80} style={s.canDo} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const Particle = memo(function Particle(props: {
  readonly angle: number;
  readonly distance: number;
  readonly delay: number;
  readonly gold: boolean;
}) {
  const { angle, distance, delay, gold } = props;
  const progress = useRef(new Animated.Value(0)).current;
  // зачем: perf-контракт репо — анимации не крутятся на фоне
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!runtimeActive) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress, delay, runtimeActive]);

  // Разлёт: поворот на свой угол, отлёт вверх по этому направлению, уменьшение.
  const rad = (angle * Math.PI) / 180;
  return (
    <Animated.View
      style={[
        s.particle,
        gold ? s.particleGold : s.particleAccent,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * distance] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -Math.cos(rad) * distance] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }) },
          ],
        },
      ]}
    />
  );
});

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20 },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha('#070912', 0.72) },
  confetti: { position: 'absolute', top: '38%', left: '50%' },
  particle: { position: 'absolute', width: 8, height: 8 },
  particleAccent: { backgroundColor: C.accentPrimary, borderRadius: 2 },
  particleGold: { backgroundColor: C.gold, borderRadius: RADIUS.pill },
  card: {
    marginHorizontal: SPACE.s6,
    paddingVertical: SPACE.s5,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.xl,
    backgroundColor: C.card3,
    gap: SPACE.s2,
    alignItems: 'center',
  },
  title: {
    fontSize: TEXT.xl,
    fontWeight: WEIGHT.bold,
    color: C.gold,
    textAlign: 'center',
    lineHeight: TEXT.xl * LEADING.snug,
  },
  canDo: {
    fontSize: TEXT.md,
    color: C.fgPrimary,
    textAlign: 'center',
    lineHeight: TEXT.md * LEADING.snug,
  },
});
