import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { StarGlyph } from '../ui/V2Fx';
import { useTournamentPalette } from '../ui/v2_theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { pickRuneGlyphs } from '../../constants/runes';
import { v2motion } from '../ui/v2_theme';

/**
 * Полёт рун в кошелёк.
 *
 * Владелец (2026-08-12): начисленная валюта обязана физически долетать до
 * счётчика — это главный момент вознаграждения в Арене.
 *
 * зачем (владелец, 22.08): валюта переименована в руны, и в полёте идут РАЗНЫЕ
 * рунические символы — один повторённый глиф владелец отверг прямо.
 *
 * Каждая руна летит по дуге (Безье через контрольную точку выше прямой),
 * стартует с задержкой в 55 мс от предыдущей и приземляется с лёгким
 * перелётом. Счётчик увеличивается на КАЖДОЙ посадке, а не разом в конце —
 * иначе полёт читается как декорация.
 */

const MAX_VISIBLE = 12;

export type ArenaPoint = Readonly<{ x: number; y: number }>;

function FlyingStar({
  index,
  glyph,
  from,
  to,
  size,
  color,
  reduceMotion,
  onLand,
}: {
  index: number;
  glyph: string;
  from: ArenaPoint;
  to: ArenaPoint;
  size: number;
  color: string;
  reduceMotion: boolean;
  onLand: () => void;
}) {
  const t = useSharedValue(0);
  const pop = useSharedValue(0);

  /** Контрольная точка дуги: выше середины пути, со сносом в сторону. */
  const control = useMemo(() => ({
    x: (from.x + to.x) / 2 + (index % 2 === 0 ? -1 : 1) * (26 + index * 4),
    y: Math.min(from.y, to.y) - 70 - index * 6,
  }), [from.x, from.y, index, to.x, to.y]);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 1;
      onLand();
      return;
    }
    const delay = index * v2motion.starTrailStepMs;
    pop.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 9, stiffness: 300 }),
      withTiming(1, { duration: v2motion.starFlightMs - 160 }),
    ));
    t.value = withDelay(delay, withTiming(
      1,
      { duration: v2motion.starFlightMs, easing: Easing.bezier(0.35, 0, 0.2, 1) },
      (finished) => { if (finished) runOnJS(onLand)(); },
    ));
  }, [index, onLand, pop, reduceMotion, t]);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    const inv = 1 - p;
    // Квадратичная Безье: (1-p)^2*A + 2(1-p)p*C + p^2*B
    const x = inv * inv * from.x + 2 * inv * p * control.x + p * p * to.x;
    const y = inv * inv * from.y + 2 * inv * p * control.y + p * p * to.y;
    return {
      opacity: p < 0.94 ? Math.min(1, pop.value) : (1 - p) / 0.06,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { scale: pop.value * (1 - p * 0.35) },
        { rotate: `${p * 220}deg` },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.star, style]}>
      <StarGlyph size={size} color={color} glyph={glyph} />
    </Animated.View>
  );
}

function ArenaStarFlightBase({
  /** Сколько рун отправить. Больше MAX_VISIBLE схлопывается — иначе каша. */
  amount,
  from,
  to,
  size = 22,
  onEachLand,
  onComplete,
}: {
  amount: number;
  from?: ArenaPoint;
  to?: ArenaPoint;
  size?: number;
  onEachLand?: (landedIndex: number) => void;
  onComplete?: () => void;
}) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const count = Math.max(0, Math.min(MAX_VISIBLE, Math.trunc(amount)));
  const landedRef = React.useRef(0);

  useEffect(() => { landedRef.current = 0; }, [amount, from?.x, from?.y, to?.x, to?.y]);

  // зачем (владелец, 22.08): каждая руна полёта несёт СВОЙ символ; выборка
  // фиксируется на весь полёт, иначе глифы менялись бы прямо в воздухе.
  const glyphs = React.useMemo(() => pickRuneGlyphs(count), [count]);

  const handleLand = React.useCallback(() => {
    landedRef.current += 1;
    onEachLand?.(landedRef.current);
    if (landedRef.current >= count) onComplete?.();
  }, [count, onComplete, onEachLand]);

  if (!count || !from || !to) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, index) => (
        <FlyingStar
          key={index}
          index={index}
          glyph={glyphs[index]}
          from={from}
          to={to}
          size={size}
          color={P.gold}
          reduceMotion={reduceMotion}
          onLand={handleLand}
        />
      ))}
    </View>
  );
}

export const ArenaStarFlight = memo(ArenaStarFlightBase);

const styles = StyleSheet.create({
  star: { position: 'absolute', left: 0, top: 0 },
});
