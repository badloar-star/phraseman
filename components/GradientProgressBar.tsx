import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { LUM } from '../constants/motionHybrid';

/**
 * Единая красивая полоса прогресса для режимов заданий/отработки/вызовов.
 *
 * Дизайн: сплошная градиентная заливка (без обводок, только тон),
 * скруглённые концы, тёмный трек-фон. Заливка растёт слева направо.
 *
 * НЕ используется в самом уроке (lesson1.tsx) — там свой сегментный индикатор.
 */
export interface GradientProgressBarProps {
  /** Прогресс 0..1 (доля). Значения вне диапазона зажимаются. */
  progress: number;
  /** Базовый акцентный цвет режима (напр. зелёный для фраз, синий для слов). */
  accent: string;
  /** Светлый край градиента. По умолчанию — тот же accent (плоский тон). */
  accentBright?: string;
  /** Высота полосы, px. */
  height?: number;
  /** Цвет трека (фон незаполненной части). */
  trackColor?: string;
  /** Дополнительные стили обёртки-трека (margin и т.п.). */
  style?: ViewStyle | ViewStyle[];
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Осветляет #RRGGBB к белому на долю amount (0..1) для деликатного перелива. */
export function lightenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * clamp01(amount));
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

export function GradientProgressBar({
  progress,
  accent,
  accentBright,
  height = 8,
  trackColor = 'rgba(255,255,255,0.08)',
  style,
}: GradientProgressBarProps) {
  const pct = clamp01(progress);
  const radius = height / 2;
  const bright = accentBright ?? lightenHex(accent, 0.28);
  const reduceMotion = useReducedMotion();

  // зачем: заливка едет через transform:scaleX (закон «только transform/opacity»),
  // а не через width — так рост полосы уходит с JS-потока на UI-поток и не
  // триггерит layout-пересчёт на каждый answer в trainer/exam сессиях.
  // transformOrigin: '0% 50%' держит левый край на месте при масштабировании
  // (Fabric/New Architecture поддерживает нативно, RN 0.81 + Reanimated 4).
  const scale = useSharedValue(reduceMotion ? pct : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scale);
      scale.value = pct;
      return;
    }
    scale.value = withTiming(pct, { duration: LUM.resolveMs, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    transformOrigin: '0% 50%',
    transform: [{ scaleX: Math.max(0.0001, scale.value) }],
  }));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius, backgroundColor: trackColor },
        style as ViewStyle,
      ]}
      pointerEvents="none"
    >
      <Reanimated.View style={[styles.fillClip, fillStyle, { borderRadius: radius }]}>
        <LinearGradient
          colors={[accent, bright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { borderRadius: radius }]}
        />
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    // НЕ width: '100%' — с marginHorizontal у вызовов (trainer-сессии, exam)
    // полоса становилась шире родителя и уезжала за правый край экрана.
    // stretch в колонке занимает доступную ширину с учётом margin'ов.
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  fillClip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
});

export default GradientProgressBar;
