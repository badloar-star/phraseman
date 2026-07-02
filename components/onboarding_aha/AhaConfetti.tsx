// Конфетти-burst пейоффа АХ-сцены. Адаптация паттерна ConfettiPiece/ConfettiBurst
// из app/pack_opening.tsx (строки 52-119): та же механика падения+вращения+fade,
// но короче (≤1400мс) и стартует из верхней трети экрана — быстрый праздничный
// бурст, а не затяжной дождь. Один прогон, без повторов — гейт на loop не нужен.

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

import { AHA_THEME } from './aha_theme';

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');

interface AhaConfettiProps {
  count?: number;
}

interface ConfettiPieceProps {
  color: string;
  delay: number;
  startX: number;
  startY: number;
}

/** Одна частица: падение вниз + вращение + fade-out в хвосте жизни. */
function ConfettiPiece({ color, delay, startX, startY }: ConfettiPieceProps) {
  const y = useRef(new Animated.Value(startY)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fallMs = 1100 + Math.random() * 200; // 1100–1300мс
    const fadeStartMs = fallMs - 200; // fade завершается точно к концу падения
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, {
          toValue: WIN_H + 20,
          duration: fallMs,
          useNativeDriver: true,
        }),
        Animated.timing(rot, { toValue: 720, duration: fallMs, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(fadeStartMs),
          Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, y, rot, op]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: startX,
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: color,
        opacity: op,
        transform: [
          { translateY: y },
          { rotate: rot.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] }) },
        ],
      }}
    />
  );
}

/** Праздничный burst пейоффа: частицы стартуют из верхней трети экрана. */
export default function AhaConfetti({ count = 26 }: AhaConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        color: AHA_THEME.confettiColors[i % AHA_THEME.confettiColors.length],
        delay: Math.floor(Math.random() * 100),
        startX: Math.floor(Math.random() * WIN_W),
        startY: Math.floor(Math.random() * (WIN_H / 3)),
      })),
    [count],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <ConfettiPiece key={p.key} color={p.color} delay={p.delay} startX={p.startX} startY={p.startY} />
      ))}
    </View>
  );
}
