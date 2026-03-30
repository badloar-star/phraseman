import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { getFrameById } from '../constants/avatars';
import LevelBadge from './LevelBadge';

interface Props {
  emoji:     string;
  frameId:   string;
  size?:     number;
  style?:    any;
  fontSize?: number;
  noAvatar?: boolean; // показывать только кольцо рамки (без аватарки)
  bgColor?:  string;  // цвет заливки центра при noAvatar=true
}

// ── Rainbow colours ─────────────────────────────────────────────────────────
const RAINBOW_COLORS = [
  '#FF006E','#FF4500','#FFD700','#47C870',
  '#00F5FF','#7B2FBE','#A855F7','#FF006E',
];

export default function AnimatedFrame({ emoji, frameId, size = 44, style, fontSize, noAvatar = false, bgColor }: Props) {
  const frame = getFrameById(frameId);

  const BW        = Math.max(2, Math.round(size * 0.055));
  const outerW    = size + BW * 2;
  const containerW = outerW + 20;
  const containerH = outerW + 20;
  const isLevel = /^\d+$/.test(emoji);

  // ── Animated values ───────────────────────────────────────────────────────
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const translateY  = useRef(new Animated.Value(0)).current;
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const waveAnim    = useRef(new Animated.Value(0)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;
  const rainbowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    switch (frame.animation) {
      case 'pulse':
        loop = Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1,   duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]));
        break;

      case 'breathe':
        loop = Animated.loop(Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.09, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1,    duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]));
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.7, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.2, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])).start();
        break;

      case 'heartbeat':
        loop = Animated.loop(Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.12, duration: 160, easing: Easing.out(Easing.quad),   useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.97, duration: 130, easing: Easing.in(Easing.quad),    useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.06, duration: 160, easing: Easing.out(Easing.quad),   useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1,    duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay(1200),
        ]));
        break;

      case 'float':
        loop = Animated.loop(Animated.sequence([
          Animated.timing(translateY, { toValue: -5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(translateY, { toValue:  5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]));
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
        break;

      case 'wave': {
        const runWave = () => {
          waveAnim.setValue(0);
          waveOpacity.setValue(0.7);
          Animated.parallel([
            Animated.timing(waveAnim,    { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(waveOpacity, { toValue: 0, duration: 1400, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
          ]).start(() => setTimeout(runWave, 600));
        };
        runWave();
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
        return;
      }

      case 'spin':
        loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true }));
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.65, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.15, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
        break;

      case 'orbit':
        loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }));
        Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 0.5, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
        break;

      case 'rainbow':
        loop = Animated.loop(Animated.timing(rainbowAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false }));
        Animated.loop(Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.07, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])).start();
        break;

      default: break;
    }

    if (loop) loop.start();
    return () => { loop?.stop(); };
  }, [frame.animation]);

  // ── Interpolations ────────────────────────────────────────────────────────
  const glowOpacity  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.55] });
  const outerOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.22] });
  const spinRotate   = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const waveScale    = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const rainbowColor = rainbowAnim.interpolate({
    inputRange:  RAINBOW_COLORS.map((_, i) => i / (RAINBOW_COLORS.length - 1)),
    outputRange: RAINBOW_COLORS,
  });

  const containerTransform: any[] = [];
  if (frame.animation === 'breathe' || frame.animation === 'heartbeat' || frame.animation === 'rainbow') {
    containerTransform.push({ scale: scaleAnim });
  }
  if (frame.animation === 'float') {
    containerTransform.push({ translateY });
  }

  // ── Круговые эффекты за рамкой ────────────────────────────────────────────
  const renderEffects = () => {
    if (frame.animation === 'plain') return null;

    if (frame.animation === 'rainbow') {
      return (
        <Animated.View style={{
          position: 'absolute',
          width: outerW + 8, height: outerW + 8,
          borderRadius: (outerW + 8) / 2,
          borderWidth: 3,
          borderColor: rainbowColor as any,
          opacity: 0.85,
        }} />
      );
    }

    if (frame.animation === 'spin' || frame.animation === 'orbit') {
      const dotSize = frame.animation === 'orbit' ? 8 : 0;
      return (
        <>
          <Animated.View style={{
            position: 'absolute', opacity: outerOpacity,
            width: outerW + 14, height: outerW + 14,
            borderRadius: (outerW + 14) / 2,
            backgroundColor: frame.color2 || frame.color,
          }} />
          <Animated.View style={{
            position: 'absolute',
            width: outerW + 12, height: outerW + 12,
            transform: [{ rotate: spinRotate }],
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
              transform: [{ rotate: spinAnim.interpolate({ inputRange: [0,1], outputRange: ['180deg','540deg'] }) }],
            }}>
              <View style={{
                position: 'absolute',
                top: -(dotSize-2)/2, left: (outerW+12)/2 - (dotSize-2)/2,
                width: dotSize-2, height: dotSize-2, borderRadius: (dotSize-2)/2,
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
            position: 'absolute', opacity: waveOpacity, transform: [{ scale: waveScale }],
            width: outerW, height: outerW, borderRadius: outerW / 2,
            backgroundColor: frame.color,
          }} />
          <Animated.View style={{
            position: 'absolute', opacity: glowOpacity,
            width: outerW + 10, height: outerW + 10, borderRadius: (outerW + 10) / 2,
            backgroundColor: frame.color,
          }} />
        </>
      );
    }

    // pulse / breathe / heartbeat / float — круговое свечение
    return (
      <>
        <Animated.View style={{
          position: 'absolute', opacity: glowOpacity,
          width: outerW + 6, height: outerW + 6, borderRadius: (outerW + 6) / 2,
          backgroundColor: frame.color,
        }} />
        <Animated.View style={{
          position: 'absolute', opacity: outerOpacity,
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

      {/* Контейнер рамки */}
      <View style={{ width: outerW, height: outerW }}>

        {/* Аватарка */}
        {!noAvatar && (
          <View style={{
            position: 'absolute', width: outerW, height: outerW,
            borderRadius: outerW / 2, overflow: 'hidden',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {isLevel
              ? <LevelBadge level={parseInt(emoji)} size={Math.round(outerW * 0.86)} />
              : <Text style={{ fontSize: fontSize ?? Math.round(outerW * 0.5), lineHeight: Math.round(outerW * 0.5) * 1.2 }}>{emoji}</Text>
            }
          </View>
        )}

        {/* Заливка центра (noAvatar) */}
        {noAvatar && bgColor && (
          <View style={{
            position: 'absolute', width: outerW, height: outerW,
            borderRadius: outerW / 2, backgroundColor: bgColor,
          }} />
        )}

        {/* Кольцо рамки поверх — круглое, полое */}
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
