/**
 * Анимации при раскрытии сундука: искры (common), конфетти (rare), эпик / премиум.
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export type GiftAnimTier = 'sparkle' | 'confetti' | 'epic' | 'premium';

const C = {
  sparkle:  ['#94A3B8', '#CBD5E1', '#E2E8F0', '#A78BFA'] as const,
  confetti: ['#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'] as const,
  epic:     ['#FFD700', '#F59E0B', '#FDE68A', '#EAB308', '#FFF7ED'] as const,
  premium:  ['#A78BFA', '#7C3AED', '#C4B5FD', '#FBBF24', '#DDD6FE'] as const,
};

const pick = (arr: readonly string[], i: number) => arr[i % arr.length]!;

export function GiftOpenBurst({ tier, size = 100 }: { tier: GiftAnimTier; size?: number }) {
  const n = tier === 'sparkle' ? 12 : tier === 'confetti' ? 32 : 44;
  const parts = useRef(
    Array.from({ length: n }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      o: new Animated.Value(0),
      s: new Animated.Value(0.4),
    })),
  ).current;
  const ring  = useRef(new Animated.Value(0.2)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dur = tier === 'sparkle' ? 480 : 720;
    const delayFade = tier === 'sparkle' ? 80 : 120;
    parts.forEach((p, i) => {
      const base = (Math.PI * 2 * i) / n;
      const jitter = (Math.random() - 0.5) * 0.8;
      const angle = base + jitter;
      const dist = tier === 'sparkle'
        ? 22 + Math.random() * 32
        : 48 + Math.random() * 72;
      p.o.setValue(1);
      p.s.setValue(tier === 'sparkle' ? 0.35 : 0.7);
      Animated.parallel([
        Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: dur, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: Math.sin(angle) * dist * 0.92 - 10, duration: dur, useNativeDriver: true }),
        Animated.timing(p.o, {
          toValue: 0,
          duration: dur + 200,
          delay: delayFade,
          useNativeDriver: true,
        }),
        Animated.timing(p.s, { toValue: 0.05, duration: dur + 100, useNativeDriver: true }),
      ]).start();
    });
    if (tier === 'epic' || tier === 'premium') {
      ring.setValue(0.2);
      flash.setValue(0.45);
      Animated.parallel([
        Animated.spring(ring,  { toValue: 1.5,  friction: 6,  tension: 80, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(flash, { toValue: 0.95, duration: 90,  useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0,    duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
    }
  }, [tier, n, parts, ring, flash]);

  const showRing   = tier === 'epic' || tier === 'premium';
  const gradColors = tier === 'premium'
    ? (['rgba(91,33,182,0.6)', 'rgba(250,204,21,0.35)'] as const)
    : (['rgba(255,215,0,0.65)', 'rgba(180,83,9,0.3)'] as const);

  const colorAt = (i: number) => {
    if (tier === 'sparkle')  return pick(C.sparkle, i);
    if (tier === 'confetti') return pick(C.confetti, i);
    if (tier === 'epic')     return pick(C.epic, i);
    return pick(C.premium, i);
  };

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      {showRing && (
        <Animated.View
          style={{
            position: 'absolute',
            left:     size * 0.5 - 50,
            top:      size * 0.5 - 50,
            width:    100,
            height:   100,
            borderRadius: 50,
            overflow:    'hidden',
            opacity:  flash,
            transform:  [{ scale: ring }],
          }}
        >
          <LinearGradient
            colors={[...gradColors]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {parts.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width:  tier === 'sparkle' ? 4 : 6,
              height: tier === 'sparkle' ? 4 : 7,
              backgroundColor: colorAt(i),
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.s }],
              opacity:   p.o,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position:   'absolute',
    alignSelf:    'center',
    zIndex:       0,
    overflow:     'visible',
  },
  particle: {
    position:     'absolute',
    left:         '50%',
    top:          '50%',
    marginLeft:   -3,
    marginTop:    -3.5,
    borderRadius: 2,
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
