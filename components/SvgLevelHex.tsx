import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Polygon, Ellipse } from 'react-native-svg';

// Математически плавная система градиентов для 60 уровней.
// Никаких резких переходов — каждый уровень интерполируется между
// ключевыми точками через линейную интерполяцию в HSL-пространстве.

type HSL = { h: number; s: number; l: number };

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function lerpHSL(a: HSL, b: HSL, t: number): HSL {
  // Интерполяция оттенка по кратчайшему пути
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return {
    h: (a.h + dh * t + 360) % 360,
    s: a.s + (b.s - a.s) * t,
    l: a.l + (b.l - a.l) * t,
  };
}

// Ключевые точки цветовой системы:
// level → {top, mid, bot} в HSL
// Уровни от 1 до 60 интерполируются между соседними ключевыми точками

type GradientKey = {
  level: number;
  top: HSL;   // верх hex
  mid: HSL;   // середина (светлее, блик)
  bot: HSL;   // низ hex
  rim: HSL;   // обводка
  glow: string; // ambient glow цвет
  glowOpacity: number;
};

const GRADIENT_KEYFRAMES: GradientKey[] = [
  // Уровень 1 — матовый серый, самый простой
  {
    level: 1,
    top: { h: 210, s: 8, l: 38 },
    mid: { h: 210, s: 12, l: 72 },
    bot: { h: 210, s: 10, l: 28 },
    rim: { h: 210, s: 15, l: 65 },
    glow: '#8AAABB',
    glowOpacity: 0.0,
  },
  // Уровень 5 — серебристо-синий, первый заметный прыжок
  {
    level: 5,
    top: { h: 200, s: 22, l: 42 },
    mid: { h: 198, s: 35, l: 78 },
    bot: { h: 202, s: 20, l: 30 },
    rim: { h: 196, s: 40, l: 68 },
    glow: '#6BB8CC',
    glowOpacity: 0.08,
  },
  // Уровень 10 — ярко-голубой milestone
  {
    level: 10,
    top: { h: 192, s: 72, l: 44 },
    mid: { h: 188, s: 80, l: 80 },
    bot: { h: 195, s: 65, l: 32 },
    rim: { h: 185, s: 85, l: 70 },
    glow: '#22D3EE',
    glowOpacity: 0.20,
  },
  // Уровень 15 — сапфирово-синий с фиолетовым намёком
  {
    level: 15,
    top: { h: 232, s: 75, l: 44 },
    mid: { h: 228, s: 82, l: 78 },
    bot: { h: 238, s: 68, l: 32 },
    rim: { h: 225, s: 88, l: 70 },
    glow: '#818CF8',
    glowOpacity: 0.22,
  },
  // Уровень 20 — насыщенный фиолетовый milestone
  {
    level: 20,
    top: { h: 262, s: 78, l: 46 },
    mid: { h: 258, s: 85, l: 78 },
    bot: { h: 268, s: 72, l: 34 },
    rim: { h: 255, s: 90, l: 72 },
    glow: '#A78BFA',
    glowOpacity: 0.26,
  },
  // Уровень 25 — розово-маджента
  {
    level: 25,
    top: { h: 310, s: 72, l: 44 },
    mid: { h: 306, s: 80, l: 78 },
    bot: { h: 316, s: 68, l: 32 },
    rim: { h: 308, s: 85, l: 70 },
    glow: '#EC4899',
    glowOpacity: 0.26,
  },
  // Уровень 30 — насыщенный рубиново-алый milestone
  {
    level: 30,
    top: { h: 348, s: 78, l: 44 },
    mid: { h: 344, s: 86, l: 76 },
    bot: { h: 352, s: 72, l: 32 },
    rim: { h: 345, s: 90, l: 70 },
    glow: '#F43F5E',
    glowOpacity: 0.28,
  },
  // Уровень 35 — коралловый с янтарём
  {
    level: 35,
    top: { h: 22, s: 80, l: 46 },
    mid: { h: 18, s: 88, l: 76 },
    bot: { h: 26, s: 74, l: 34 },
    rim: { h: 20, s: 92, l: 70 },
    glow: '#FB923C',
    glowOpacity: 0.28,
  },
  // Уровень 40 — золотой milestone
  {
    level: 40,
    top: { h: 42, s: 85, l: 46 },
    mid: { h: 38, s: 92, l: 80 },
    bot: { h: 46, s: 78, l: 34 },
    rim: { h: 40, s: 95, l: 72 },
    glow: '#FACC15',
    glowOpacity: 0.32,
  },
  // Уровень 45 — тёплое шампанское-золото
  {
    level: 45,
    top: { h: 50, s: 70, l: 58 },
    mid: { h: 46, s: 78, l: 88 },
    bot: { h: 52, s: 65, l: 44 },
    rim: { h: 48, s: 82, l: 80 },
    glow: '#FDE68A',
    glowOpacity: 0.30,
  },
  // Уровень 50 — кристально-белый с золотом milestone
  {
    level: 50,
    top: { h: 46, s: 52, l: 78 },
    mid: { h: 42, s: 60, l: 95 },
    bot: { h: 50, s: 48, l: 64 },
    rim: { h: 44, s: 65, l: 88 },
    glow: '#FEF3C7',
    glowOpacity: 0.38,
  },
  // Уровень 55 — аврора: жемчужно-белый с опалом
  {
    level: 55,
    top: { h: 175, s: 48, l: 76 },
    mid: { h: 170, s: 56, l: 94 },
    bot: { h: 180, s: 44, l: 62 },
    rim: { h: 168, s: 60, l: 86 },
    glow: '#A7F3D0',
    glowOpacity: 0.38,
  },
  // Уровень 60 — легендарный: опал / призма
  {
    level: 60,
    top: { h: 210, s: 60, l: 80 },
    mid: { h: 200, s: 70, l: 97 },
    bot: { h: 220, s: 55, l: 65 },
    rim: { h: 205, s: 75, l: 90 },
    glow: '#BAE6FD',
    glowOpacity: 0.45,
  },
];

function getGradientForLevel(level: number): {
  top: string; mid: string; bot: string; rim: string; glow: string; glowOpacity: number
} {
  const clamped = Math.max(1, Math.min(60, level));

  // Найти соседние ключевые точки
  let prev = GRADIENT_KEYFRAMES[0];
  let next = GRADIENT_KEYFRAMES[GRADIENT_KEYFRAMES.length - 1];

  for (let i = 0; i < GRADIENT_KEYFRAMES.length - 1; i++) {
    if (clamped >= GRADIENT_KEYFRAMES[i].level && clamped <= GRADIENT_KEYFRAMES[i + 1].level) {
      prev = GRADIENT_KEYFRAMES[i];
      next = GRADIENT_KEYFRAMES[i + 1];
      break;
    }
  }

  const t = prev.level === next.level
    ? 0
    : (clamped - prev.level) / (next.level - prev.level);

  const top = lerpHSL(prev.top, next.top, t);
  const mid = lerpHSL(prev.mid, next.mid, t);
  const bot = lerpHSL(prev.bot, next.bot, t);
  const rim = lerpHSL(prev.rim, next.rim, t);

  // Интерполяция glow opacity
  const glowOpacity = prev.glowOpacity + (next.glowOpacity - prev.glowOpacity) * t;

  // Интерполяция glow цвета через простую RGB
  const pc = hexToRGB(prev.glow);
  const nc = hexToRGB(next.glow);
  const gc = {
    r: Math.round(pc.r + (nc.r - pc.r) * t),
    g: Math.round(pc.g + (nc.g - pc.g) * t),
    b: Math.round(pc.b + (nc.b - pc.b) * t),
  };
  const glow = `#${gc.r.toString(16).padStart(2, '0')}${gc.g.toString(16).padStart(2, '0')}${gc.b.toString(16).padStart(2, '0')}`;

  return {
    top: hslToHex(top.h, top.s, top.l),
    mid: hslToHex(mid.h, mid.s, mid.l),
    bot: hslToHex(bot.h, bot.s, bot.l),
    rim: hslToHex(rim.h, rim.s, rim.l),
    glow,
    glowOpacity,
  };
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

interface Props {
  level: number;
  size?: number;
  style?: any;
}

// Hex points (flat-top, centered in 100x100 viewBox)
const HEX_POINTS = '50,4 93,27 93,73 50,96 7,73 7,27';

function SvgLevelHex({ level, size = 44, style }: Props) {
  const g = getGradientForLevel(level);
  const uid = `lvlhex_${level}_${size}`;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Основной вертикальный градиент */}
          <LinearGradient id={`${uid}_main`} x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor={g.mid} stopOpacity="1" />
            <Stop offset="0.30" stopColor={g.top} stopOpacity="1" />
            <Stop offset="0.65" stopColor={g.bot} stopOpacity="1" />
            <Stop offset="1" stopColor={g.bot} stopOpacity="0.85" />
          </LinearGradient>
          {/* Верхний highlight — имитация студийного света слева сверху */}
          <LinearGradient id={`${uid}_hi`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.10" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.0" />
          </LinearGradient>
          {/* Внутренний радиальный блик — центральный кристальный центр */}
          <RadialGradient id={`${uid}_glow`} cx="50%" cy="42%" r="38%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.0" />
          </RadialGradient>
          {/* Ambient glow — цветное свечение снизу */}
          <RadialGradient id={`${uid}_amb`} cx="50%" cy="80%" r="50%">
            <Stop offset="0" stopColor={g.glow} stopOpacity={String(g.glowOpacity)} />
            <Stop offset="1" stopColor={g.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Внешнее свечение (тень/аура) */}
        {g.glowOpacity > 0.05 ? (
          <Ellipse
            cx="50"
            cy="85"
            rx="30"
            ry="8"
            fill={g.glow}
            fillOpacity={g.glowOpacity * 0.6}
          />
        ) : null}

        {/* Основное тело хекса */}
        <Polygon points={HEX_POINTS} fill={`url(#${uid}_main)`} />
        {/* Highlight слой */}
        <Polygon points={HEX_POINTS} fill={`url(#${uid}_hi)`} />
        {/* Центральный кристальный блик */}
        <Polygon points={HEX_POINTS} fill={`url(#${uid}_glow)`} />
        {/* Ambient glow */}
        <Polygon points={HEX_POINTS} fill={`url(#${uid}_amb)`} />
        {/* Обводка */}
        <Polygon
          points={HEX_POINTS}
          fill="none"
          stroke={g.rim}
          strokeWidth="2.5"
          strokeOpacity="0.72"
        />
        {/* Внутренняя тонкая обводка для глубины */}
        <Polygon
          points="50,9 89,30 89,70 50,91 11,70 11,30"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1"
          strokeOpacity="0.18"
        />
      </Svg>
    </View>
  );
}

export default memo(SvgLevelHex);
