// Shared hexagon score badge — used in lessons list and lesson menu
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Плавная интерполяция цвета по оценке 0–5 ─────────────────────────────────
function lerpRGB(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const SCORE_STOPS: [number, [number, number, number]][] = [
  [0.0, [45,  68,  58 ]],  // нейтральный
  [0.6, [210, 55,  55 ]],  // красный
  [2.0, [225, 115, 30 ]],  // оранжевый
  [3.5, [205, 170, 20 ]],  // золотой
  [4.2, [100, 200, 80 ]],  // светло-зелёный
  [5.0, [60,  210, 110]],  // зелёный
];

export function scoreToRGB(score: number): [number, number, number] {
  if (score <= 0) return SCORE_STOPS[0][1];
  for (let i = 1; i < SCORE_STOPS.length; i++) {
    const [prevAt, prevCol] = SCORE_STOPS[i - 1];
    const [at, col] = SCORE_STOPS[i];
    if (score <= at) {
      const t = (score - prevAt) / (at - prevAt);
      return lerpRGB(prevCol, col, t);
    }
  }
  return SCORE_STOPS[SCORE_STOPS.length - 1][1];
}

export function rgbStr([r, g, b]: [number, number, number]): string {
  return `rgb(${r},${g},${b})`;
}

export function lightenRGB(
  [r, g, b]: [number, number, number],
  amt = 55,
): [number, number, number] {
  return [Math.min(255, r + amt), Math.min(255, g + amt), Math.min(255, b + amt)];
}

// ── Чистая форма гексагона (pointy-top) ──────────────────────────────────────
function HexShape({ size, color }: { size: number; color: string }) {
  const triH = size * 0.2887;
  const midH = size * 0.5774;
  return (
    <View style={{ width: size, height: size * 1.1547, alignItems: 'center' }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: triH,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
        marginBottom: -1,
      }} />
      <View style={{ width: size, height: midH + 2, backgroundColor: color }} />
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size / 2, borderRightWidth: size / 2, borderTopWidth: triH,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color,
        marginTop: -1,
      }} />
    </View>
  );
}

// ── Гексагон с обводкой ───────────────────────────────────────────────────────
export function HexBadge({ size, fill, border, children }: {
  size: number; fill: string; border: string; children: React.ReactNode;
}) {
  const B = 2.5;
  const outer = size + B * 2;
  const outerH = outer * 1.1547;
  return (
    <View style={{ width: outer, height: outerH }}>
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        <HexShape size={outer} color={border} />
      </View>
      <View style={{ position: 'absolute', top: B * 1.1547, left: B }}>
        <HexShape size={size} color={fill} />
      </View>
      <View style={{
        position: 'absolute', top: 0, left: 0,
        width: outer, height: outerH,
        justifyContent: 'center', alignItems: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

// ── Готовый бейдж с оценкой (самый частый кейс) ───────────────────────────────
export default function HexScore({
  score,
  size = 56,
  locked = false,
  textGhost,
  correctText,
  isDark,
  f,
}: {
  score: number;
  size?: number;
  locked?: boolean;
  textGhost: string;   // t.textGhost из темы
  correctText?: string;  // t.correctText из темы (optional for backward compat)
  isDark?: boolean;      // isDark from theme (optional for backward compat)
  f: any;              // шрифты из useTheme
}) {
  const rgb        = scoreToRGB(locked ? 0 : score);
  const fillColor  = rgbStr(rgb);
  const isDarkTheme = isDark !== undefined ? isDark : true; // default to dark
  const borderColor = score > 0 && !locked
    ? rgbStr(lightenRGB(rgb, 60))
    : isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor  = score === 0 || locked ? textGhost : (correctText || '#FFFFFF');

  return (
    <HexBadge size={size} fill={fillColor} border={borderColor}>
      {locked
        ? <Ionicons name="lock-closed" size={size * 0.28} color={textGhost} />
        : <Text
            style={{ color: textColor, fontWeight: '800', fontSize: f.sub }}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {score.toFixed(1)}
          </Text>
      }
    </HexBadge>
  );
}
