// StreakConfetti.tsx — конфетти рубежей 100 / 365 / 500 (образец engagement-moments.js: confetti — частицы падают сверху, гаснут у низа).
// зачем (гейт паритета, круг 1, 14.10; правило Макетов «конфетти никогда поверх текста и кнопок»): частицы рисуются ПОД содержимым сцены (вызывающий ставит компонент до текста), падают 2,6–4,2 с
// и оседают ближе к низу экрана; цвета — токены темы и золото. Один общий прогресс на UI-треде, у каждой частицы своё окно времени. reduceMotion — без конфетти.
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { momentJitter } from '../../spire/moments/moments_effects';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { useTheme } from '../../ThemeContext';
import { useSpirePalette } from '../../spire/useSpirePalette';

const TOTAL_MS = 4600;

type PieceProps = Readonly<{ progress: SharedValue<number>; x: number; fall: number; start: number; span: number; size: number; color: string; spin: number; square: boolean }>;
const Piece = memo(function Piece({ progress, x, fall, start, span, size, color, spin, square }: PieceProps) {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / span));
    return { opacity: t <= 0 || t >= 1 ? 0 : Math.min(1, (1 - t) * 6), transform: [{ translateX: x }, { translateY: -24 + fall * t }, { rotate: `${spin * t}deg` }] };
  });
  return <Animated.View pointerEvents="none" style={[s.piece, { width: size * 2, height: square ? size : size * 2, borderRadius: square ? 1 : size, backgroundColor: color }, style]} />;
});

export type StreakConfettiProps = Readonly<{ fire: boolean; n?: number }>;

function StreakConfetti({ fire, n = 60 }: StreakConfettiProps) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const p = useSpirePalette();
  const { liquidGlassThemeId } = useTheme();
  // зачем (координатор 15.10, храповик): текст/значки цвета темы — токен accentTextSafe (в светлом глубокий, в тёмном ровно accent)
  const accentTextSafe = liquidGlassTokens(liquidGlassThemeId).accentTextSafe;
  const progress = useSharedValue(0);
  useEffect(() => {
    if (fire && !reduceMotion) progress.value = withTiming(1, { duration: TOTAL_MS, easing: Easing.linear });
  }, [fire, reduceMotion, progress]);
  const colors = useMemo(() => [p.cta, accentTextSafe, p.gold, p.text, p.textSecondary], [p.cta, accentTextSafe, p.gold, p.text, p.textSecondary]);
  const pieces = useMemo(() => Array.from({ length: n }, (_, i) => {
    const start = momentJitter(i, 11) * 0.35;
    const span = (2600 + momentJitter(i, 12) * 1600) / TOTAL_MS;
    return {
      key: i, x: momentJitter(i, 13) * width, fall: height * (0.55 + momentJitter(i, 14) * 0.45), start, span: Math.min(span, 1 - start),
      size: 3 + momentJitter(i, 15) * 3, color: colors[i % colors.length]!, spin: (momentJitter(i, 16) - 0.5) * 900, square: momentJitter(i, 17) > 0.5,
    };
  }), [n, width, height, colors]);
  if (!fire || reduceMotion) return null;
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      {pieces.map((q) => <Piece key={q.key} progress={progress} x={q.x} fall={q.fall} start={q.start} span={q.span} size={q.size} color={q.color} spin={q.spin} square={q.square} />)}
    </View>
  );
}

const s = StyleSheet.create({ piece: { position: 'absolute', left: 0, top: 0 } });

export default memo(StreakConfetti);
