/**
 * Анимации при раскрытии подарка/сундука. ПОЛНОСТЬЮ без бумажных конфетти —
 * объёмные «парящие» эффекты по регистру редкости:
 *   sparkle/confetti → энергия и осколки света (расходящаяся ударная волна + искры вверх)
 *   epic            → золотой ореол + сходящиеся искры + двойное кольцо
 *   premium         → фиолетово-золотое сияние с лучами + ореол
 *
 * Публичный контракт сохранён: <GiftOpenBurst tier size /> + animTierF2p / animTierPrem /
 * тип GiftAnimTier. Компонент используют 3 потребителя на размерах 132 / 136 / 210:
 *   LevelGiftModal, LevelGiftDualModal, CollectibleDropModal.
 *
 * Движок — Reanimated 4 (UI-поток), как ShineOverlay/ProfileCardMotionFx. Эффект
 * проигрывается ОДИН раз при маунте (burst keyed by gift id → ремаунт = новый запуск).
 * Уважает системную reduce-motion: при ней рисуется статичный мягкий ореол без движения.
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
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';

export type GiftAnimTier = 'sparkle' | 'confetti' | 'epic' | 'premium';

/** Палитры по ярусам. Спокойные холодные искры для common, золото для epic, фиолет+золото для premium. */
const PALETTE: Record<GiftAnimTier, { core: string; glow: string; particles: readonly string[] }> = {
  sparkle:  { core: '#BFE9FF', glow: 'rgba(56,189,248,0.45)',  particles: ['#BFE9FF', '#7DD3FC', '#E0F4FF', '#A5B4FC'] },
  confetti: { core: '#BFE9FF', glow: 'rgba(56,189,248,0.45)',  particles: ['#BFE9FF', '#7DD3FC', '#E0F4FF', '#5EEAD4'] },
  epic:     { core: '#FFE7A6', glow: 'rgba(245,158,11,0.5)',   particles: ['#FFE7A6', '#F0B429', '#FFF3C4', '#E0A124'] },
  premium:  { core: '#DDD6FE', glow: 'rgba(124,58,237,0.5)',   particles: ['#DDD6FE', '#C4B5FD', '#FBBF24', '#A78BFA'] },
};

/** Детерминированный псевдо-рандом по индексу — частицы стабильны между ремаунтами (как ArenaConfettiBurst). */
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Одна искра-«осколок». Стартует у центра, разлетается наружу по своему углу, гаснет.
 * common/confetti — точки-искры; epic/premium — длиннее и ярче.
 */
function Shard({
  index,
  total,
  tier,
  reach,
  color,
}: {
  index: number;
  total: number;
  tier: GiftAnimTier;
  reach: number;
  color: string;
}) {
  const p = useSharedValue(0);
  const angle = (Math.PI * 2 * index) / total + (seeded(index, 1) - 0.5) * 0.8;
  const dist = reach * (0.55 + seeded(index, 2) * 0.55);
  const dx = Math.cos(angle) * dist;
  const dy = Math.sin(angle) * dist * 0.92 - reach * 0.12;
  const dur = (tier === 'sparkle' || tier === 'confetti') ? 620 : 780;
  const delay = Math.floor(seeded(index, 3) * 90);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(p);
  }, [p, dur, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.12, 0.7, 1], [0, 1, 0.85, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 1], [0, dx]) },
      { translateY: interpolate(p.value, [0, 1], [0, dy]) },
      { scale: interpolate(p.value, [0, 0.3, 1], [0.2, 1, 0.25]) },
    ],
  }));

  const long = tier === 'epic' || tier === 'premium';
  const w = long ? 5 : 4;
  const h = long ? 11 : 4;

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: w,
          height: h,
          marginLeft: -w / 2,
          marginTop: -h / 2,
          borderRadius: w,
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

/** Расходящееся кольцо ударной волны (одно или два). */
function ShockRing({ size, color, delay, thickness }: { size: number; color: string; delay: number; thickness: number }) {
  const p = useSharedValue(0);
  const base = Math.round(size * 0.28);

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: 760, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(p);
  }, [p, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.1, 1], [0, 0.85, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.3, 1]) }],
  }));

  const ring = Math.round(size * 0.92);
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: ring,
          height: ring,
          marginLeft: -ring / 2,
          marginTop: -ring / 2,
          borderRadius: ring / 2,
          borderWidth: thickness,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/** Вспышка-ореол в центре: яркий короткий пик + плавное затухание (для epic/premium). */
function CoreFlash({ size, glow, core }: { size: number; glow: string; core: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 620, easing: Easing.in(Easing.quad) }),
    );
    return () => cancelAnimation(p);
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 0.95]),
    transform: [{ scale: interpolate(p.value, [0, 1], [0.5, 1.5]) }],
  }));

  const d = Math.round(size * 0.7);
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: d,
          height: d,
          marginLeft: -d / 2,
          marginTop: -d / 2,
          borderRadius: d / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[core, glow, 'transparent']}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Reanimated.View>
  );
}

/** Лучи света для premium-яруса — медленный поворот + общий «выезд». */
function PremiumRays({ size, color }: { size: number; color: string }) {
  const spin = useSharedValue(0);
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = 0;
    grow.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    spin.value = withTiming(1, { duration: 12000, easing: Easing.linear });
    return () => {
      cancelAnimation(spin);
      cancelAnimation(grow);
    };
  }, [spin, grow]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(grow.value, [0, 1], [0, 0.85]),
    transform: [
      { scale: interpolate(grow.value, [0, 1], [0.4, 1]) },
      { rotateZ: `${interpolate(spin.value, [0, 1], [0, 90])}deg` },
    ],
  }));

  const field = Math.round(size * 1.4);
  const rayLen = Math.round(size * 0.62);
  const rays = Array.from({ length: 10 });
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: '50%', top: '50%', width: field, height: field, marginLeft: -field / 2, marginTop: -field / 2 },
        wrapStyle,
      ]}
    >
      {rays.map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 4,
            height: rayLen,
            marginLeft: -2,
            transform: [{ rotateZ: `${i * 36}deg` }, { translateY: -rayLen / 2 }],
            borderRadius: 3,
            backgroundColor: color,
            opacity: 0.5,
          }}
        />
      ))}
    </Reanimated.View>
  );
}

/** Статичный мягкий ореол — фолбэк при reduce-motion (ничего не двигается). */
function StaticGlow({ size, glow }: { size: number; glow: string }) {
  const d = Math.round(size * 0.8);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: d,
        height: d,
        marginLeft: -d / 2,
        marginTop: -d / 2,
        borderRadius: d / 2,
        overflow: 'hidden',
        opacity: 0.6,
      }}
    >
      <LinearGradient colors={[glow, 'transparent']} start={{ x: 0.5, y: 0.5 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/**
 * Системная «Уменьшение движения». При ней не запускаем лучи/искры (доступность).
 * Паттерн из ProfileCardMotionFx.
 */
function useReduceMotion(): boolean {
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

export function GiftOpenBurst({ tier, size = 100 }: { tier: GiftAnimTier; size?: number }) {
  const reduceMotion = useReduceMotion();
  const pal = PALETTE[tier] ?? PALETTE.sparkle;
  const isHigh = tier === 'epic' || tier === 'premium';
  const n = isHigh ? 22 : 14;
  const reach = size * 0.42;

  if (reduceMotion) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
        <StaticGlow size={size} glow={pal.glow} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      {tier === 'premium' && <PremiumRays size={size} color={pal.core} />}
      {isHigh && <CoreFlash size={size} glow={pal.glow} core={pal.core} />}
      <ShockRing size={size} color={pal.core} delay={0} thickness={2} />
      {isHigh && <ShockRing size={size} color={pal.core} delay={140} thickness={1} />}
      {Array.from({ length: n }).map((_, i) => (
        <Shard
          key={i}
          index={i}
          total={n}
          tier={tier}
          reach={reach}
          color={pal.particles[i % pal.particles.length]!}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 0,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function animTierF2p(r: string): GiftAnimTier {
  if (r === 'epic') return 'epic';
  if (r === 'rare') return 'confetti';
  return 'sparkle';
}

export function animTierPrem(): GiftAnimTier {
  return 'premium';
}
