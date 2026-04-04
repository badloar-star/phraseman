import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, Image } from 'react-native';
import { getFrameById } from '../constants/avatars';
import LevelBadge from './LevelBadge';

interface Props {
  emoji?:    string;
  image?:    any;
  frameId:   string;
  size?:     number;
  style?:    any;
  fontSize?: number;
  noAvatar?: boolean;
  bgColor?:  string;
  animated?: boolean; // false = static (for grids) — keeps visual style, no motion
}

// ── Rainbow colours ──────────────────────────────────────────────────────────
const RAINBOW_COLORS = [
  '#FF006E','#FF4500','#FFD700','#47C870',
  '#00F5FF','#7B2FBE','#A855F7','#FF006E',
];

// ── Shared animation values — one set for the entire app ─────────────────────
// This means 8 loops total regardless of how many AnimatedFrame components exist.
const S = {
  glow:      new Animated.Value(0),
  breathScale: new Animated.Value(1),
  heartbeat: new Animated.Value(1),
  spin:      new Animated.Value(0),
  float:     new Animated.Value(0),
  floatGlow: new Animated.Value(0),
  wave:      new Animated.Value(0),
  waveOp:    new Animated.Value(0),
  rainbow:   new Animated.Value(0),
};

// ── Start shared loops once at module load ────────────────────────────────────
(function startSharedAnimations() {
  // glow — used by pulse / spin / orbit / breathe
  Animated.loop(Animated.sequence([
    Animated.timing(S.glow, { toValue: 1,   duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    Animated.timing(S.glow, { toValue: 0.1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
  ])).start();

  // breathe scale
  Animated.loop(Animated.sequence([
    Animated.timing(S.breathScale, { toValue: 1.09, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.timing(S.breathScale, { toValue: 1,    duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
  ])).start();

  // heartbeat — double-beat pattern
  Animated.loop(Animated.sequence([
    Animated.timing(S.heartbeat, { toValue: 1.12, duration: 160, easing: Easing.out(Easing.quad),   useNativeDriver: true }),
    Animated.timing(S.heartbeat, { toValue: 0.97, duration: 130, easing: Easing.in(Easing.quad),    useNativeDriver: true }),
    Animated.timing(S.heartbeat, { toValue: 1.06, duration: 160, easing: Easing.out(Easing.quad),   useNativeDriver: true }),
    Animated.timing(S.heartbeat, { toValue: 1,    duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    Animated.delay(1200),
  ])).start();

  // spin — used by spin & orbit
  Animated.loop(
    Animated.timing(S.spin, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })
  ).start();

  // float (translateY)
  Animated.loop(Animated.sequence([
    Animated.timing(S.float,     { toValue: -5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    Animated.timing(S.float,     { toValue:  5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
  ])).start();
  Animated.loop(Animated.sequence([
    Animated.timing(S.floatGlow, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    Animated.timing(S.floatGlow, { toValue: 0.1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
  ])).start();

  // wave
  const runWave = () => {
    S.wave.setValue(0);
    S.waveOp.setValue(0.7);
    Animated.parallel([
      Animated.timing(S.wave,   { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(S.waveOp, { toValue: 0, duration: 1400, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
    ]).start(() => setTimeout(runWave, 600));
  };
  runWave();

  // rainbow — only 1 loop with useNativeDriver: false
  Animated.loop(
    Animated.timing(S.rainbow, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false })
  ).start();
})();

// ── Precomputed interpolations (stable references) ───────────────────────────
const I = {
  glowOpacity:  S.glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.55] }),
  outerOpacity: S.glow.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.22] }),
  spinRotate:   S.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
  spinRotate2:  S.spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '540deg'] }),
  waveScale:    S.wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }),
  rainbowColor: S.rainbow.interpolate({
    inputRange:  RAINBOW_COLORS.map((_, i) => i / (RAINBOW_COLORS.length - 1)),
    outputRange: RAINBOW_COLORS,
  }),
};

export default function AnimatedFrame({
  emoji, image, frameId, size = 44, style, fontSize,
  noAvatar = false, bgColor, animated = true,
}: Props) {
  const frame = getFrameById(frameId);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const BW         = Math.max(2, Math.round(size * 0.055));
  const outerW     = size + BW * 2;
  const containerW = outerW + 20;
  const containerH = outerW + 20;
  const isLevel    = emoji && /^\d+$/.test(emoji);

  useEffect(() => { setImageLoadFailed(false); }, [image]);

  // ── Container transform ───────────────────────────────────────────────────
  const containerTransform: any[] = [];
  if (animated) {
    if (frame.animation === 'breathe' || frame.animation === 'rainbow') {
      containerTransform.push({ scale: S.breathScale });
    } else if (frame.animation === 'heartbeat') {
      containerTransform.push({ scale: S.heartbeat });
    } else if (frame.animation === 'float') {
      containerTransform.push({ translateY: S.float });
    }
  }

  // ── Effects layer ─────────────────────────────────────────────────────────
  const renderEffects = () => {
    if (frame.animation === 'plain') return null;

    if (!animated) {
      // Static mode — just a glowing ring without motion
      return (
        <View style={{
          position: 'absolute',
          width: outerW + 8, height: outerW + 8,
          borderRadius: (outerW + 8) / 2,
          borderWidth: 2,
          borderColor: frame.color,
          opacity: 0.45,
        }} />
      );
    }

    if (frame.animation === 'rainbow') {
      return (
        <Animated.View style={{
          position: 'absolute',
          width: outerW + 8, height: outerW + 8,
          borderRadius: (outerW + 8) / 2,
          borderWidth: 3,
          borderColor: I.rainbowColor as any,
          opacity: 0.85,
        }} />
      );
    }

    if (frame.animation === 'spin' || frame.animation === 'orbit') {
      const dotSize = frame.animation === 'orbit' ? 8 : 0;
      return (
        <>
          <Animated.View style={{
            position: 'absolute', opacity: I.outerOpacity,
            width: outerW + 14, height: outerW + 14,
            borderRadius: (outerW + 14) / 2,
            backgroundColor: frame.color2 || frame.color,
          }} />
          <Animated.View style={{
            position: 'absolute',
            width: outerW + 12, height: outerW + 12,
            transform: [{ rotate: I.spinRotate }],
          }}>
            <View style={{
              width: outerW + 12, height: outerW + 12,
              borderRadius: (outerW + 12) / 2,
              borderWidth: frame.animation === 'spin' ? 2.5 : 0,
              borderColor: frame.color,
              borderStyle: 'dashed',
              opacity: 0.75,
            }} />
            {frame.animation === 'orbit' && (
              <View style={{
                position: 'absolute',
                top: -(dotSize / 2), left: (outerW + 12) / 2 - dotSize / 2,
                width: dotSize, height: dotSize, borderRadius: dotSize / 2,
                backgroundColor: frame.color,
              }} />
            )}
          </Animated.View>
          {frame.animation === 'orbit' && (
            <Animated.View style={{
              position: 'absolute',
              width: outerW + 12, height: outerW + 12,
              transform: [{ rotate: I.spinRotate2 }],
            }}>
              <View style={{
                position: 'absolute',
                top: -(dotSize - 2) / 2, left: (outerW + 12) / 2 - (dotSize - 2) / 2,
                width: dotSize - 2, height: dotSize - 2, borderRadius: (dotSize - 2) / 2,
                backgroundColor: frame.color2 || frame.color, opacity: 0.6,
              }} />
            </Animated.View>
          )}
        </>
      );
    }

    if (frame.animation === 'wave') {
      return (
        <>
          <Animated.View style={{
            position: 'absolute', opacity: S.waveOp, transform: [{ scale: I.waveScale }],
            width: outerW, height: outerW, borderRadius: outerW / 2,
            backgroundColor: frame.color,
          }} />
          <Animated.View style={{
            position: 'absolute', opacity: I.glowOpacity,
            width: outerW + 10, height: outerW + 10, borderRadius: (outerW + 10) / 2,
            backgroundColor: frame.color,
          }} />
        </>
      );
    }

    if (frame.animation === 'float') {
      return (
        <>
          <Animated.View style={{
            position: 'absolute', opacity: S.floatGlow,
            width: outerW + 6, height: outerW + 6, borderRadius: (outerW + 6) / 2,
            backgroundColor: frame.color,
          }} />
          <Animated.View style={{
            position: 'absolute', opacity: I.outerOpacity,
            width: outerW + 18, height: outerW + 18, borderRadius: (outerW + 18) / 2,
            backgroundColor: frame.color2 || frame.color,
          }} />
        </>
      );
    }

    // pulse / breathe / heartbeat — glow circles
    return (
      <>
        <Animated.View style={{
          position: 'absolute', opacity: I.glowOpacity,
          width: outerW + 6, height: outerW + 6, borderRadius: (outerW + 6) / 2,
          backgroundColor: frame.color,
        }} />
        <Animated.View style={{
          position: 'absolute', opacity: I.outerOpacity,
          width: outerW + 18, height: outerW + 18, borderRadius: (outerW + 18) / 2,
          backgroundColor: frame.color2 || frame.color,
        }} />
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[
      { width: containerW, height: containerH, justifyContent: 'center', alignItems: 'center' },
      containerTransform.length > 0 && { transform: containerTransform },
      style,
    ]}>
      {renderEffects()}

      <View style={{ width: outerW, height: outerW }}>
        {!noAvatar && (
          <View style={{
            position: 'absolute', width: outerW, height: outerW,
            borderRadius: outerW / 2, overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {image && !imageLoadFailed
              ? <Image
                  source={image}
                  style={{ width: outerW, height: outerW, borderRadius: outerW / 2 }}
                  onError={() => setImageLoadFailed(true)}
                  onLoadStart={() => setImageLoadFailed(false)}
                />
              : isLevel
              ? <LevelBadge level={parseInt(emoji!)} size={Math.round(outerW * 0.86)} />
              : <Text style={{ fontSize: fontSize ?? Math.round(outerW * 0.5), lineHeight: Math.round(outerW * 0.5) * 1.2 }}>{emoji}</Text>
            }
          </View>
        )}

        {noAvatar && bgColor && (
          <View style={{
            position: 'absolute', width: outerW, height: outerW,
            borderRadius: outerW / 2, backgroundColor: bgColor,
          }} />
        )}

        <View style={{
          position: 'absolute', width: outerW, height: outerW,
          borderRadius: outerW / 2,
          borderWidth: BW, borderColor: frame.color,
          backgroundColor: 'transparent',
        }} />
      </View>
    </Animated.View>
  );
}
