// ─── Визитка 2.0: фон и украшения каждого вида (макет profile-card-pro.html) ──
// зачем: 1:1 перенос слоёв .st-normal … .st-neon. Все украшения центрируются по одной
// точке (cx, cy) — «монета всегда ровно в центре своих колец/орбит». CSS-приёмы,
// которых нет в RN (conic-gradient, blur, mask), переданы средствами react-native-svg:
// радиальные градиенты вместо размытия, клинья-лучи вместо conic, градиент по радиусу
// вместо маски. Движение — только transform/opacity на UI-потоке (useLoop).
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «палитры визиток — свои» — палитры видов не переводить на токены темы; сторож
// tests/owner_locks_profile_card_metal.test.mjs, реестр docs/work/OWNER_LOCKS.md. Ослабить — только по новому слову владельца.
import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import type { ProfileCardLook } from '../../app/profile_card_styles';
import { LinearGradient } from '../SafeLinearGradient';
import { gradientPoints } from './profile_card_looks';
import { useLoop } from './useLoop';

type Props = Readonly<{
  look: ProfileCardLook;
  width: number;
  height: number;
  /** Центр украшений по вертикали, доля высоты (макет: --cy). */
  cy: number;
  /** Живое движение (false: превью-плитка, уменьшение движения). */
  animate: boolean;
  /** Масштаб украшений под ширину визитки (1 = макет 370pt). */
  k?: number;
}>;

type Center = Readonly<{ cx: number; cy: number; k: number; animate: boolean; width: number; height: number }>;

/** Квадрат size×size с центром в (cx, cy). */
function box(center: Center, size: number) {
  return {
    position: 'absolute' as const,
    left: center.cx - size / 2,
    top: center.cy - size / 2,
    width: size,
    height: size,
  };
}

/** Клинья по кругу (замена repeating-conic-gradient): каждые stepDeg клин шириной wedgeDeg. */
function wedgesPath(r: number, stepDeg: number, wedgeDeg: number, rInner = 0): string {
  const parts: string[] = [];
  for (let a = 0; a < 360; a += stepDeg) {
    const a0 = (a * Math.PI) / 180;
    const a1 = ((a + wedgeDeg) * Math.PI) / 180;
    const p = (rad: number, ang: number) => `${(r + rad * Math.cos(ang)).toFixed(2)},${(r + rad * Math.sin(ang)).toFixed(2)}`;
    parts.push(`M${p(rInner, a0)}L${p(r, a0)}L${p(r, a1)}L${p(rInner, a1)}Z`);
  }
  return parts.join('');
}

function Ring({ center, size, color, width = 1 }: { center: Center; size: number; color: string; width?: number }) {
  // guard-ok: тонкое полупрозрачное кольцо — украшение макета (исключение 2.0), не контейнер
  return <View pointerEvents="none" style={[box(center, size), { borderRadius: size / 2, borderWidth: width, borderColor: color }]} />;
}

function RadialGlow({ center, size, color, opacity, stopAt }: {
  center: Center; size: number; color: string; opacity: number; stopAt: number;
}) {
  const id = `glow-${size}-${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <Svg pointerEvents="none" width={size} height={size} style={box(center, size)}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset={String(stopAt)} stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

// ── Обычная ──────────────────────────────────────────────────────────────────
function NormalLayers({ center }: { center: Center }) {
  const { k } = center;
  return (
    <>
      <RadialGlow center={center} size={380 * k} color="#C8C2B4" opacity={0.26} stopAt={0.62} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
      <Ring center={center} size={256 * k} color="rgba(255,255,255,0.10)" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
      <Ring center={center} size={192 * k} color="rgba(255,255,255,0.10)" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
    </>
  );
}

// ── A · Голограмма ───────────────────────────────────────────────────────────
const GRID_V_COLOR = '#FF4FA3'; // theme-exempt: иллюстрация фона карточки профиля — линии сетки арта
const GRID_H_COLOR = '#00E5FF'; // theme-exempt: иллюстрация фона карточки профиля — линии сетки арта
const HOLO_HUES = ['#FF7AB6', '#FFD36E', '#7BFFCF', '#6FB8FF', '#C38BFF', '#FF7AB6'] as const; // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
const HOLO_STARS: readonly (readonly [number, number, number])[] = [
  [40, 60, 0], [300, 86, 0.8], [62, 230, 1.5], [292, 246, 0.4], [176, 30, 2.1], [26, 150, 2.6],
];

function HoloFoil({ center }: { center: Center }) {
  const size = Math.max(center.width, center.height) * 1.8;
  const spin = useLoop(9000, center.animate, { linear: true });
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const r = size / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', width: size, height: size, opacity: 0.42,
        left: center.width / 2 - r, top: center.height / 2 - r,
      }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          {HOLO_HUES.slice(0, 5).map((hue, i) => (
            <RadialGradient key={hue + i} id={`holo${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={hue} stopOpacity={0.95} />
              <Stop offset="0.55" stopColor={hue} stopOpacity={0.55} />
              <Stop offset="1" stopColor={hue} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {HOLO_HUES.slice(0, 5).map((hue, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <Circle
              key={hue + i}
              cx={r + Math.cos(a) * r * 0.24}
              cy={r + Math.sin(a) * r * 0.24}
              r={r * 0.5}
              fill={`url(#holo${i})`}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function Twinkle({ x, y, delay, animate }: { x: number; y: number; delay: number; animate: boolean }) {
  const t = useLoop(3000, animate, { delayMs: delay * 1000, restAt: 0.5 });
  const style = useAnimatedStyle(() => {
    const v = t.value <= 0.5 ? t.value * 2 : (1 - t.value) * 2;
    return { opacity: v, transform: [{ scale: 0.4 + 0.6 * v }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', left: x, top: y, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFFFFF', // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
        shadowColor: '#FFFFFF', shadowOpacity: 0.7, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
      }, style]}
    />
  );
}

function Guilloche({ center }: { center: Center }) {
  const size = 380 * center.k;
  const R = size / 2;
  const rings = useMemo(() => {
    const out: number[] = [];
    for (let r = 9; r < R; r += 9) out.push(r);
    return out;
  }, [R]);
  return (
    <Svg pointerEvents="none" width={size} height={size} style={box(center, size)}>
      <Defs>
        <RadialGradient id="guilFade" cx={R} cy={R} r={R} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          <Stop offset="0.57" stopColor="#FFFFFF" stopOpacity={1} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          <Stop offset="0.99" stopColor="#FFFFFF" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
        </RadialGradient>
      </Defs>
      <Path d={wedgesPath(R, 6, 2)} fill="url(#guilFade)" opacity={0.05} />
      <G opacity={0.08}>
        {rings.map((r) => (
          <Circle key={r} cx={R} cy={R} r={r} stroke="url(#guilFade)" strokeWidth={1} fill="none" />
        ))}
      </G>
    </Svg>
  );
}

function HoloLayers({ center }: { center: Center }) {
  return (
    <>
      <HoloFoil center={center} />
      {HOLO_STARS.map(([x, y, d]) => (
        <Twinkle key={`${x}-${y}`} x={x * center.k} y={y * center.k} delay={d} animate={center.animate} />
      ))}
      <Guilloche center={center} />
    </>
  );
}

// ── B · Обсидиан ─────────────────────────────────────────────────────────────
function ObsidianLayers({ center }: { center: Center }) {
  const { width, height, k } = center;
  const rosette = 340 * k;
  const R = rosette / 2;
  const spin = useLoop(60000, center.animate, { linear: true });
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const rings = useMemo(() => {
    const out: number[] = [];
    for (let r = R * 0.51; r < R * 0.98; r += 7) out.push(r);
    return out;
  }, [R]);
  const beamHalf = 420 * Math.tan((20 * Math.PI) / 180);
  return (
    <>
      <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="obsBg" cx={width / 2} cy={center.cy} rx={width * 0.9} ry={height * 0.6} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#231E14" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.72" stopColor="#0A0907" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </RadialGradient>
          <SvgLinearGradient id="obsBeam" x1={width / 2 - beamHalf} y1="0" x2={width / 2 + beamHalf} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFE2A0" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.5" stopColor="#FFE2A0" stopOpacity={0.26} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="1" stopColor="#FFE2A0" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </SvgLinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#obsBg)" />
        <Path d={`M${width / 2},-60L${width / 2 + beamHalf},360L${width / 2 - beamHalf},360Z`} fill="url(#obsBeam)" />
      </Svg>
      <Animated.View pointerEvents="none" style={[box(center, rosette), spinStyle]}>
        <Svg width={rosette} height={rosette}>
          <Defs>
            <RadialGradient id="rosFade" cx={R} cy={R} r={R} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#E8C882" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
              <Stop offset="0.48" stopColor="#E8C882" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
              <Stop offset="0.51" stopColor="#E8C882" stopOpacity={1} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
              <Stop offset="0.88" stopColor="#E8C882" stopOpacity={1} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
              <Stop offset="1" stopColor="#E8C882" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            </RadialGradient>
          </Defs>
          <Path d={wedgesPath(R, 5, 1)} fill="url(#rosFade)" opacity={0.24} />
          <G opacity={0.16}>
            {rings.map((r) => (
              <Circle key={r} cx={R} cy={R} r={r} stroke="url(#rosFade)" strokeWidth={1} fill="none" />
            ))}
          </G>
        </Svg>
      </Animated.View>
    </>
  );
}

// ── C · Аура ─────────────────────────────────────────────────────────────────
type Blob = Readonly<{ size: number; left: number; top: number; color: string; opacity: number; dx: number; dy: number; s: number; ms: number }>;

function AuraBlob({ blob, center }: { blob: Blob; center: Center }) {
  const t = useLoop(blob.ms, center.animate, { yoyo: true });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob.dx * center.k * t.value },
      { translateY: blob.dy * center.k * t.value },
      { scale: 1 + (blob.s - 1) * t.value },
    ],
  }));
  const size = blob.size * center.k;
  const id = `aura${blob.color.slice(1)}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: blob.left, top: blob.top, width: size, height: size, opacity: blob.opacity }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={blob.color} stopOpacity={1} />
            <Stop offset="0.5" stopColor={blob.color} stopOpacity={0.8} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function AuraLayers({ center }: { center: Center }) {
  const { k, width } = center;
  const blobs: readonly Blob[] = [
    { size: 330, left: -90 * k - 40, top: -70 * k - 40, color: '#7D4DFF', opacity: 0.85, dx: 90, dy: 60, s: 1.15, ms: 11000 }, // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
    { size: 290, left: width - (290 - 90) * k - 40, top: 60 * k - 40, color: '#FF5FA8', opacity: 0.85, dx: -80, dy: 90, s: 0.9, ms: 13000 }, // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
    { size: 310, left: 30 * k - 40, top: 260 * k - 40, color: '#FFB547', opacity: 0.55, dx: 60, dy: -70, s: 1.2, ms: 15000 }, // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
  ];
  // Размытие 46px передано мягким краем градиента: пятно рисуем на 80pt больше.
  return (
    <>
      {blobs.map((blob) => (
        <AuraBlob key={blob.color} blob={{ ...blob, size: blob.size + 80 / k }} center={center} />
      ))}
    </>
  );
}

// ── D · Хрусталь ─────────────────────────────────────────────────────────────
function IceLayers({ center }: { center: Center }) {
  const { width, height, k } = center;
  const facets = 420 * k;
  const R = facets / 2;
  const prism = 214 * k;
  const drift = useLoop(12000, center.animate, { yoyo: true, restAt: 0.5 });
  const causticW = width * 1.6;
  const causticStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(drift.value, [0, 1], [-0.25 * causticW, 0.25 * causticW]) }],
  }));
  const lines = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; o: number }[] = [];
    const add = (deg: number, step: number, o: number) => {
      const a = (deg * Math.PI) / 180;
      const dir = { x: Math.cos(a), y: Math.sin(a) };
      const nrm = { x: -dir.y, y: dir.x };
      for (let d = -R * 1.5; d <= R * 1.5; d += step) {
        out.push({
          x1: R + nrm.x * d - dir.x * R * 1.5, y1: R + nrm.y * d - dir.y * R * 1.5,
          x2: R + nrm.x * d + dir.x * R * 1.5, y2: R + nrm.y * d + dir.y * R * 1.5, o,
        });
      }
    };
    add(-28, 34, 0.07); // repeating-linear-gradient(62deg …)
    add(32, 42, 0.06); // repeating-linear-gradient(-58deg …)
    return out;
  }, [R]);
  const caustic = gradientPoints(115);
  return (
    <>
      <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="iceBg" cx={width / 2} cy={center.cy} rx={width * 0.8} ry={height * 0.55} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#3A6A8C" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.55" stopColor="#13263A" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="1" stopColor="#0B1520" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#iceBg)" />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: -0.3 * width, top: -0.3 * height, width: causticW, height: height * 1.6 }, causticStyle]}
      >
        <LinearGradient
          colors={['rgba(190,240,255,0)', 'rgba(190,240,255,0)', 'rgba(190,240,255,0.2)', 'rgba(255,200,240,0.14)', 'rgba(255,200,240,0)', 'rgba(255,200,240,0)']} // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
          locations={[0, 0.4, 0.47, 0.51, 0.58, 1]}
          start={caustic.start}
          end={caustic.end}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Svg pointerEvents="none" width={facets} height={facets} style={box(center, facets)}>
        <Defs>
          <RadialGradient id="facetFade" cx={R} cy={R} r={R} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.49" stopColor="#FFFFFF" stopOpacity={1} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.99" stopColor="#FFFFFF" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </RadialGradient>
          <ClipPath id="facetClip">
            <Circle cx={R} cy={R} r={R} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#facetClip)">
          {lines.map((l, i) => (
            <Line key={i} /* guard-ok: статичный список линий */ x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="url(#facetFade)" strokeOpacity={l.o} strokeWidth={1} />
          ))}
        </G>
      </Svg>
      <View
        pointerEvents="none"
        style={[box(center, prism), {
          borderRadius: 34 * k,
          transform: [{ rotate: '45deg' }],
          overflow: 'hidden',
          borderWidth: 1, // shadow-ok: кант призмы — часть арта фона визитки (иллюстрация), не контейнер; guard-ok: кант призмы из макета .st-ice .prism (1px, полупрозрачный)
          borderColor: 'rgba(220,245,255,0.35)', // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
          shadowColor: '#96DCFF', shadowOpacity: 0.22, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, // guard-ok: одна статичная тень, только iOS // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
        }]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.02)']} // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </>
  );
}

// ── E · Космос ───────────────────────────────────────────────────────────────
const SPACE_STARS: readonly (readonly [number, number, number, string])[] = [
  [0.12, 0.18, 1.5, '#FFFFFF'], [0.28, 0.62, 1, '#FFFFFF'], [0.44, 0.12, 1.5, '#CFE3FF'], [0.63, 0.3, 1, '#FFFFFF'], // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
  [0.82, 0.16, 2, '#FFFFFF'], [0.9, 0.58, 1, '#FFFFFF'], [0.08, 0.48, 1.5, '#FFE2F2'], [0.72, 0.72, 1, '#FFFFFF'], // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
  [0.36, 0.84, 1, '#FFFFFF'], [0.55, 0.52, 1.5, '#FFFFFF'], // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
];

function Orbit({ center, size, ms, reverse, dot, dotColor, glow }: {
  center: Center; size: number; ms: number; reverse: boolean; dot: number; dotColor: string; glow: string;
}) {
  const t = useLoop(ms, center.animate, { linear: true });
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -1 : 1) * t.value * 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[box(center, size), style]}>
      <View
        style={{
          position: 'absolute', left: size / 2 - dot / 2, top: -dot / 2, width: dot, height: dot, borderRadius: dot / 2,
          backgroundColor: dotColor, shadowColor: glow, shadowOpacity: 0.75, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        }}
      />
    </Animated.View>
  );
}

function SpaceLayers({ center }: { center: Center }) {
  const { width, height, k } = center;
  return (
    <>
      <Svg pointerEvents="none" width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="neb1" cx={width * 0.3} cy={height * 0.22} rx={width * 0.38} ry={height * 0.26} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#5846FF" stopOpacity={0.5} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.7" stopColor="#5846FF" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </RadialGradient>
          <RadialGradient id="neb2" cx={width * 0.76} cy={height * 0.44} rx={width * 0.34} ry={height * 0.24} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#00C8FF" stopOpacity={0.3} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.7" stopColor="#00C8FF" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </RadialGradient>
          <RadialGradient id="neb3" cx={width * 0.44} cy={height * 0.72} rx={width * 0.44} ry={height * 0.28} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FF46A0" stopOpacity={0.26} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.7" stopColor="#FF46A0" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#neb1)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#neb2)" />
        <Rect x={0} y={0} width={width} height={height} fill="url(#neb3)" />
        {SPACE_STARS.map(([x, y, r, c]) => (
          <Circle key={`${x}-${y}`} cx={x * width} cy={y * height} r={r / 2 + 0.25} fill={c} />
        ))}
      </Svg>
      <Ring center={center} size={290 * k} color="rgba(160,190,255,0.13)" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
      <Ring center={center} size={224 * k} color="rgba(160,190,255,0.26)" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
      <Orbit center={center} size={224 * k} ms={8000} reverse={false} dot={10} dotColor="#9FD8FF" glow="#78C8FF" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
      <Orbit center={center} size={290 * k} ms={14000} reverse dot={7} dotColor="#FFB3E0" glow="#FF8CD2" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
    </>
  );
}

// ── F · Неон ─────────────────────────────────────────────────────────────────
function NeonRing({ center, size, color }: { center: Center; size: number; color: string }) {
  const R = size / 2 + 12;
  const full = R * 2;
  return (
    <Svg pointerEvents="none" width={full} height={full} style={box(center, full)}>
      <Circle cx={R} cy={R} r={size / 2 - 1} stroke={color} strokeOpacity={0.12} strokeWidth={18} fill="none" />
      <Circle cx={R} cy={R} r={size / 2 - 1} stroke={color} strokeOpacity={0.28} strokeWidth={7} fill="none" />
      <Circle cx={R} cy={R} r={size / 2 - 1} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function NeonLayers({ center }: { center: Center }) {
  const { width, height, k } = center;
  const sun = 250 * k;
  const glow = 320 * k;
  const breath = useLoop(5000, center.animate, { yoyo: true, restAt: 1 });
  const breathStyle = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * breath.value }));
  const gridW = width * 1.8;
  const gridH = height * 0.5;
  const stripes = useMemo(() => {
    const out: number[] = [];
    for (let y = 0; y < sun; y += 18) out.push(y);
    return out;
  }, [sun]);
  const gridLines = useMemo(() => {
    const v: number[] = [];
    for (let x = 0; x <= gridW; x += 40) v.push(x);
    const h: number[] = [];
    for (let y = 0; y <= gridH; y += 40) h.push(y);
    return { v, h };
  }, [gridH, gridW]);
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: -0.4 * width, width: gridW, height: gridH, bottom: -0.1 * height,
          transformOrigin: 'bottom',
          transform: [{ perspective: 280 }, { rotateX: '62deg' }],
        }}
      >
        <Svg width={gridW} height={gridH}>
          {gridLines.v.map((x) => <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={gridH} stroke={GRID_V_COLOR} strokeOpacity={0.5} strokeWidth={1} />)}
          {gridLines.h.map((y) => <Line key={`h${y}`} x1={0} y1={y} x2={gridW} y2={y} stroke={GRID_H_COLOR} strokeOpacity={0.45} strokeWidth={1} />)}
        </Svg>
        <LinearGradient
          colors={['#07030D', 'rgba(7,3,13,0)']} // theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта
          locations={[0, 0.6]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Animated.View pointerEvents="none" style={[box(center, glow), breathStyle]}>
        <Svg width={glow} height={glow}>
          <Defs>
            <RadialGradient id="neonGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#00E5FF" stopOpacity={0.22} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
              <Stop offset="0.65" stopColor="#00E5FF" stopOpacity={0} />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            </RadialGradient>
          </Defs>
          <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#neonGlow)" />
        </Svg>
      </Animated.View>
      <Svg pointerEvents="none" width={sun} height={sun} style={[box(center, sun), { opacity: 0.5 }]}>
        <Defs>
          <SvgLinearGradient id="neonSun" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFCF5C" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="0.6" stopColor="#FF4FA3" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
            <Stop offset="1" stopColor="#7A2CFF" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
          </SvgLinearGradient>
          <ClipPath id="neonSunClip">
            <Circle cx={sun / 2} cy={sun / 2} r={sun / 2} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#neonSunClip)">
          {stripes.map((y) => <Rect key={y} x={0} y={y} width={sun} height={14} fill="url(#neonSun)" />)}
        </G>
      </Svg>
      <NeonRing center={center} size={222 * k} color="#FF4FA3" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
      <NeonRing center={center} size={196 * k} color="#00E5FF" />{/* theme-exempt: иллюстрация фона карточки профиля — материалы и блики арта */}
    </>
  );
}

function ProfileCardBackdrop({ look, width, height, cy, animate, k = 1 }: Props) {
  const center: Center = { cx: width / 2, cy: height * cy, k, animate, width, height };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {look === 'normal' ? <NormalLayers center={center} /> : null}
      {look === 'holo' ? <HoloLayers center={center} /> : null}
      {look === 'obs' ? <ObsidianLayers center={center} /> : null}
      {look === 'aura' ? <AuraLayers center={center} /> : null}
      {look === 'ice' ? <IceLayers center={center} /> : null}
      {look === 'space' ? <SpaceLayers center={center} /> : null}
      {look === 'neon' ? <NeonLayers center={center} /> : null}
    </View>
  );
}

export default memo(ProfileCardBackdrop);
