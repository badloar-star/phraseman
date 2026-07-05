import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';

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

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius, backgroundColor: trackColor },
        style as ViewStyle,
      ]}
      pointerEvents="none"
    >
      <View style={[styles.fillClip, { width: `${pct * 100}%`, borderRadius: radius }]}>
        <LinearGradient
          colors={[accent, bright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { borderRadius: radius }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fillClip: {
    height: '100%',
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
  },
});

export default GradientProgressBar;
