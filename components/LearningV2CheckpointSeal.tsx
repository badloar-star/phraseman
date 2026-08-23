import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Печать главы — вход в проверочное занятие и его награда.
 *
 * зачем (макет 26-checkpoint-and-runes, утверждён владельцем 22.08): раньше
 * чекпоинт ничем не отличался от обычного занятия, кроме значка на карте.
 * Печать с наливающимся кольцом сразу сообщает «это рубеж главы, а не рядовой
 * урок»: кольцо показывает, сколько занятий главы пройдено, печать выстреливает.
 *
 * Анимации КОНЕЧНЫЕ (без withRepeat) — реестр вечных циклов не затрагивается.
 * reduce motion показывает готовый кадр без движения.
 */

const RING_MS = 900;
const POP_MS = 520;
const SIZE = 116;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const EASE = Easing.bezier(0.38, 0.7, 0.125, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** Доля пройденного в главе, 0..1 — сколько занятий закрыто. */
  progress: number;
  /** Символ печати; по умолчанию рунический знак главы. */
  glyph?: string;
  ringColor: string;
  trackColor: string;
  faceColor: string;
  glyphColor: string;
  reduceMotion: boolean;
  /** Играть вход. Награда передаёт true после записи результата. */
  play: boolean;
}

export const LearningV2CheckpointSeal = memo(function LearningV2CheckpointSeal({
  progress,
  glyph = 'ᛝ',
  ringColor,
  trackColor,
  faceColor,
  glyphColor,
  reduceMotion,
  play,
}: Props) {
  const bounded = Math.max(0, Math.min(1, progress));
  const ring = useSharedValue(reduceMotion ? bounded : 0);
  const pop = useSharedValue(reduceMotion || !play ? 1 : 0.7);

  useEffect(() => {
    if (!play) return;
    if (reduceMotion) {
      ring.value = bounded;
      pop.value = 1;
      return;
    }
    ring.value = withTiming(bounded, { duration: RING_MS, easing: EASE });
    pop.value = withSequence(
      withTiming(1.12, { duration: POP_MS * 0.55, easing: EASE }),
      withTiming(1, { duration: POP_MS * 0.45, easing: EASE }),
    );
  }, [bounded, play, pop, reduceMotion, ring]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - ring.value),
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View style={[styles.root, popStyle]}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={trackColor}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={ringProps}
          // Старт сверху, как у любого кольца прогресса в приложении.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={[styles.face, { backgroundColor: faceColor }]}>
        <Text style={[styles.glyph, { color: glyphColor }]}>{glyph}</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: SIZE - STROKE * 4,
    height: SIZE - STROKE * 4,
    borderRadius: (SIZE - STROKE * 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 40, fontWeight: '700' },
});

export default LearningV2CheckpointSeal;
