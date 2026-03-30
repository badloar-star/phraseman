import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import type { MedalTier } from '../app/medal_utils';

// ─── Цвета медалей ───────────────────────────────────────────────────────────
const MEDAL_COLORS: Record<MedalTier, {
  outer: string; inner: string; shine: string; ribbon1: string; ribbon2: string;
}> = {
  none:   { outer: '#3A3A3A', inner: '#2A2A2A', shine: '#555',    ribbon1: '#333', ribbon2: '#2A2A2A' },
  bronze: { outer: '#8B4513', inner: '#CD7F32', shine: '#E8A96A', ribbon1: '#7A3B10', ribbon2: '#5C2D0A' },
  silver: { outer: '#7A7A7A', inner: '#C0C0C0', shine: '#E8E8E8', ribbon1: '#6A6A6A', ribbon2: '#4A4A4A' },
  gold:   { outer: '#B8860B', inner: '#FFD700', shine: '#FFFACD', ribbon1: '#CC9900', ribbon2: '#A07800' },
};

interface MedalIconProps {
  tier:     MedalTier;
  size?:    number;
  animate?: boolean;   // shimmer для near-gold (silver)
}

export default function MedalIcon({ tier, size = 72, animate = false }: MedalIconProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate && tier === 'silver') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [animate, tier]);

  const c = MEDAL_COLORS[tier];
  const outerR   = size / 2;
  const circleR  = size * 0.38;
  const shineS   = size * 0.13;
  const ribbonW  = size * 0.22;
  const ribbonH  = size * 0.30;

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={{ width: size, height: size + ribbonH * 0.6, alignItems: 'center' }}>
      {/* Ленты (ribbon) — треугольники снизу */}
      <View style={{
        position: 'absolute', bottom: 0, left: outerR - ribbonW - 2,
        flexDirection: 'row', gap: 4,
      }}>
        {/* Левая лента */}
        <View style={{
          width: ribbonW, height: ribbonH,
          backgroundColor: c.ribbon1,
          borderBottomLeftRadius: 3,
          borderBottomRightRadius: 8,
          transform: [{ skewX: '6deg' }],
        }} />
        {/* Правая лента */}
        <View style={{
          width: ribbonW, height: ribbonH,
          backgroundColor: c.ribbon2,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 3,
          transform: [{ skewX: '-6deg' }],
        }} />
      </View>

      {/* Внешний круг */}
      <View style={{
        width: size, height: size, borderRadius: outerR,
        backgroundColor: c.outer,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: c.inner,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
      }}>
        {/* Внутренний круг — основной цвет медали */}
        <View style={{
          width: circleR * 2, height: circleR * 2, borderRadius: circleR,
          backgroundColor: c.inner,
          justifyContent: 'center', alignItems: 'center',
        }}>
          {/* Блик (shine) */}
          <View style={{
            position: 'absolute', top: size * 0.07, left: size * 0.12,
            width: shineS, height: shineS * 0.6,
            borderRadius: shineS / 2,
            backgroundColor: c.shine,
            opacity: 0.7,
            transform: [{ rotate: '-30deg' }],
          }} />

          {/* Символ медали */}
          {tier !== 'none' && (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {tier === 'gold' && <GoldStar size={circleR * 0.9} />}
              {tier === 'silver' && <SilverStar size={circleR * 0.85} />}
              {tier === 'bronze' && <BronzeB size={circleR * 0.75} />}
            </View>
          )}
        </View>

        {/* Shimmer overlay для Silver */}
        {animate && tier === 'silver' && (
          <Animated.View style={[StyleSheet.absoluteFill, {
            borderRadius: outerR,
            backgroundColor: '#ffffff',
            opacity: shimmerOpacity,
          }]} />
        )}
      </View>
    </View>
  );
}

// ─── Inner medal symbols ──────────────────────────────────────────────────────
function GoldStar({ size }: { size: number }) {
  return (
    <Text style={{ fontSize: size * 0.78, lineHeight: size * 0.9, color: '#FFF8DC', textShadowColor: '#B8860B', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
      {'★'}
    </Text>
  );
}

function SilverStar({ size }: { size: number }) {
  return (
    <Text style={{ fontSize: size * 0.78, lineHeight: size * 0.9, color: '#F0F4F8', textShadowColor: '#6A7A7A', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
      {'★'}
    </Text>
  );
}

function BronzeB({ size }: { size: number }) {
  return (
    <Text style={{ fontSize: size * 0.78, lineHeight: size * 0.9, color: '#ECC99A', textShadowColor: '#5C2D0A', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }}>
      {'★'}
    </Text>
  );
}
