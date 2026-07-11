// ════════════════════════════════════════════════════════════════════════════
// constellation_sky_map.tsx — объёмная 2.5D карта неба «Созвездий» (спек F3/F9).
//
// Утверждённый владельцем визуальный язык (макет 2026-07-05): гексы — плато
// с боковыми гранями, высота колец растёт к Полярной («гора неба»), звёзды —
// свечения с ядром/гало/лучами, линии созвездий двойные (широкое свечение +
// нить), территории подсвечены заревом. Наклон в перспективе — статичный
// transform (НИКАКИХ вечных анимаций в самом компоненте — Performance Bible;
// живость даёт родитель жестами pan/pinch).
//
// Свечение — градиенты SVG (предрендер по смыслу F9: никаких runtime-блюров).
// Painter-алгоритм и высоты — 1:1 с одобренным макетом.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useMemo } from 'react';
import { Platform } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Polygon,
  Polyline,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { Lang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { isLowEndDevice } from '../hooks/device_perf_tier';
import { useDevForceLowEnd } from '../hooks/dev_force_low_end';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { ConstellationMatchPlayer, ConstellationStar } from './types/constellations';
import { allMapHexes, hexKey, parseHexKey, ringOf, type ConstellationRing, type Hex } from './constellations_hex';
import { starName } from './constellation_star_names';

const DEVICE_IS_LOW_END = isLowEndDevice(Platform);

/** Цвета слотов игроков — единые для карты, HUD и легенды. */
export const CONSTELLATION_SLOT_COLORS = ['#5AC8FA', '#FF7A9E', '#B08CFF', '#FFC65C'] as const;
const SLOT_DARK = ['#173B4F', '#4A1F2E', '#33244F', '#4A3A17'] as const;
const SLOT_SIDE = ['#2A6E8F', '#8F3A55', '#5E4396', '#8F6B2A'] as const;
const POLAR_GOLD = '#FFD166';

const ELEV: Record<ConstellationRing, number> = { outer: 0, middle: 14, inner: 30, polar: 48 };
const DEPTH: Record<ConstellationRing, number> = { outer: 12, middle: 15, inner: 18, polar: 22 };
const HEX_SIZE = 27;
const VIEW_W = 360;
const VIEW_H = 400;
/** Макс. ширина подписи имени звезды (ед. viewBox): длиннее — ужимаем глифы. */
const STAR_NAME_MAX_WIDTH = 92;
/** Вертикальное сжатие граней — иллюзия наклона доски. */
const Y_SQUASH = 0.88;

function basePx(h: Hex): [number, number] {
  return [HEX_SIZE * Math.sqrt(3) * (h.q + h.r / 2) + VIEW_W / 2, HEX_SIZE * 1.38 * h.r + 195];
}
function topPx(h: Hex): [number, number] {
  const [x, y] = basePx(h);
  return [x, y - ELEV[ringOf(h)]];
}
function cornersArr(cx: number, cy: number, rad: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a) * Y_SQUASH]);
  }
  return pts;
}

const DIRS: ReadonlyArray<[number, number]> = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export interface SkyMapProps {
  stars: Record<string, ConstellationStar>;
  homes: string[];
  players: ConstellationMatchPlayer[];
  /** Легальные цели фазы выбора — подсветка пунктиром. */
  highlightKeys?: readonly string[];
  /** Тапнутый гекс (открыта шторка) — яркая выделенная рамка. */
  selectedKey?: string | null;
  /** Моя выбранная цель — золотой луч от моей ближайшей звезды. */
  myTargetKey?: string | null;
  mySlot?: number | null;
  onStarPress?: (key: string) => void;
  /** Ключ вспышки захвата (резолв) — расходящееся кольцо. */
  flashKey?: string | null;
}

interface CellRender {
  key: string;
  hex: Hex;
  ring: ConstellationRing;
  owner: number | null;
  radiance: number;
  top: [number, number];
  sortY: number;
}

function SkyMapInner({
  stars, homes, players, highlightKeys, selectedKey, myTargetKey, mySlot, onStarPress, flashKey,
}: SkyMapProps) {
  const { lang } = useLang();
  // Авто-лайт (слабый Android-тир); dev-форс (null = реальный тир) переопределяет для ручной проверки.
  const devForce = useDevForceLowEnd();
  const isLowEnd = devForce ?? DEVICE_IS_LOW_END;
  const cells = useMemo((): CellRender[] => {
    const list = allMapHexes().map((hex) => {
      const key = hexKey(hex);
      const star = stars[key];
      return {
        key,
        hex,
        ring: ringOf(hex),
        owner: star?.owner ?? null,
        radiance: star?.radiance ?? 0,
        top: topPx(hex),
        sortY: basePx(hex)[1],
      };
    });
    return list.sort((a, b) => a.sortY - b.sortY); // художник: дальние раньше
  }, [stars]);

  const coresBySlot = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of players) map.set(p.slot, p.cores);
    return map;
  }, [players]);

  // Инициал владельца — «аватарка» на захваченном гексе (просьба владельца:
  // гексы заполняются аватаром хозяина). Настоящую картинку в SVG не тянем
  // (URL-аватары), используем первую букву имени в цветном круге.
  const initialBySlot = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of players) map.set(p.slot, (p.name?.[0] ?? '?').toUpperCase());
    return map;
  }, [players]);

  const constellationLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; owner: number }> = [];
    for (const c of cells) {
      if (c.owner === null) continue;
      for (const d of DIRS) {
        const nKey = `${c.hex.q + d[0]},${c.hex.r + d[1]}`;
        const n = stars[nKey];
        if (n && n.owner === c.owner && c.key < nKey) {
          const nh = parseHexKey(nKey);
          if (!nh) continue;
          const [x2, y2] = topPx(nh);
          lines.push({ x1: c.top[0], y1: c.top[1], x2, y2, owner: c.owner });
        }
      }
    }
    return lines;
  }, [cells, stars]);

  const beam = useMemo(() => {
    if (!myTargetKey || mySlot === null || mySlot === undefined) return null;
    const targetHex = parseHexKey(myTargetKey);
    if (!targetHex) return null;
    // Луч из ближайшей моей звезды к цели.
    let best: { d: number; from: [number, number] } | null = null;
    for (const c of cells) {
      if (c.owner !== mySlot) continue;
      const d = Math.abs(c.hex.q - targetHex.q) + Math.abs(c.hex.r - targetHex.r);
      if (!best || d < best.d) best = { d, from: c.top };
    }
    if (!best) return null;
    const [tx, ty] = topPx(targetHex);
    return { x1: best.from[0], y1: best.from[1], x2: tx, y2: ty };
  }, [cells, myTargetKey, mySlot]);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Defs>
        {/* верхние грани: свет сверху-слева */}
        <SvgLinearGradient id="topNeutral" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#16213F" />
          <Stop offset="1" stopColor="#0A1128" />
        </SvgLinearGradient>
        {CONSTELLATION_SLOT_COLORS.map((c, i) => (
          <SvgLinearGradient key={`top${i}`} id={`top${i}`} x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={c} stopOpacity={0.55} />
            <Stop offset="1" stopColor={SLOT_DARK[i]} stopOpacity={0.85} />
          </SvgLinearGradient>
        ))}
        {/* свечение звёзд: ядро и гало */}
        {['#8FA5D9', ...CONSTELLATION_SLOT_COLORS, POLAR_GOLD].map((c, i) => (
          <React.Fragment key={`g${i}`}>
            <RadialGradient id={`glow${i}`}>
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="0.25" stopColor={c} />
              <Stop offset="1" stopColor={c} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={`halo${i}`}>
              <Stop offset="0" stopColor={c} stopOpacity="0.5" />
              <Stop offset="1" stopColor={c} stopOpacity="0" />
            </RadialGradient>
          </React.Fragment>
        ))}
        <SvgLinearGradient id="beamG" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#EAF2FF" stopOpacity="0" />
          <Stop offset="0.5" stopColor="#EAF2FF" />
          <Stop offset="1" stopColor={POLAR_GOLD} />
        </SvgLinearGradient>
      </Defs>

      {/* зарево территорий */}
      {cells.map((c) => (c.owner !== null ? (
        <Circle
          key={`ug${c.key}`}
          cx={c.top[0]}
          cy={c.top[1]}
          r={HEX_SIZE * 1.9}
          fill={`url(#halo${c.owner + 1})`}
          opacity={0.4}
        />
      ) : null))}

      {/* плато: боковые грани + верх */}
      {cells.map((c) => {
        const pts = cornersArr(c.top[0], c.top[1], HEX_SIZE - 1.4);
        const depth = DEPTH[c.ring];
        const side = c.owner !== null ? SLOT_SIDE[c.owner] : '#0C1530';
        const side2 = c.owner !== null ? SLOT_DARK[c.owner] : '#080E22';
        const hl = highlightKeys?.includes(c.key);
        const sel = selectedKey === c.key; // тапнутый гекс — яркое выделение
        const quad = (a: [number, number], b: [number, number]) =>
          `${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1] + depth} ${a[0]},${a[1] + depth}`;
        return (
          <React.Fragment key={`cell${c.key}`}>
            <Polygon points={quad(pts[1], pts[2])} fill={side} fillOpacity={0.95} />
            <Polygon points={quad(pts[2], pts[3])} fill={side2} fillOpacity={0.95} />
            <Polygon points={quad(pts[0], pts[1])} fill={side2} fillOpacity={0.55} />
            <Polygon points={quad(pts[3], pts[4])} fill="#060B1C" fillOpacity={0.6} />
            <Polygon
              points={pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
              fill={sel ? 'rgba(255,209,102,0.28)' : c.owner !== null ? `url(#top${c.owner})` : 'url(#topNeutral)'}
              stroke={sel ? '#FFD166' : hl ? '#EAF2FF' : c.owner !== null ? CONSTELLATION_SLOT_COLORS[c.owner] : '#2B3C66'}
              strokeOpacity={sel ? 1 : hl ? 1 : c.owner !== null ? 0.8 : 0.55}
              strokeWidth={sel ? 3 : hl ? 2.2 : 1}
              strokeDasharray={sel ? undefined : hl ? '5 3' : undefined}
            />
            <Polyline
              points={`${pts[4][0]},${pts[4][1]} ${pts[5][0]},${pts[5][1]} ${pts[0][0]},${pts[0][1]}`}
              fill="none"
              stroke="#EAF2FF"
              strokeOpacity={c.owner !== null ? 0.35 : 0.14}
              strokeWidth={1}
            />
          </React.Fragment>
        );
      })}

      {/* линии созвездий: широкое свечение + нить */}
      {constellationLines.map((l, i) => (
        <React.Fragment key={`cl${i}`}>
          <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={CONSTELLATION_SLOT_COLORS[l.owner]} strokeOpacity={0.22} strokeWidth={5} />
          <Line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={CONSTELLATION_SLOT_COLORS[l.owner]} strokeOpacity={0.85} strokeWidth={1.5} />
        </React.Fragment>
      ))}

      {/* звёзды: гало, ядро, лучи-флеры, Сияние, ядра домов */}
      {cells.map((c) => {
        const isPolar = c.key === '0,0';
        const isHome = homes.includes(c.key);
        const gi = isPolar ? 5 : c.owner !== null ? c.owner + 1 : 0;
        const r = isPolar ? 8 : isHome ? 6 : 3.4;
        const flare = isPolar ? 16 : 9;
        const flareColor = isPolar ? POLAR_GOLD : c.owner !== null ? CONSTELLATION_SLOT_COLORS[c.owner] : null;
        const cores = isHome && c.owner !== null ? coresBySlot.get(c.owner) ?? 3 : null;
        return (
          <React.Fragment key={`star${c.key}`}>
            <Circle cx={c.top[0]} cy={c.top[1]} r={r * 3} fill={`url(#halo${gi})`}
              opacity={c.owner !== null || isPolar ? 0.8 : 0.35} />
            <Circle cx={c.top[0]} cy={c.top[1]} r={r} fill={`url(#glow${gi})`} />
            {/* Аватарка владельца (инициал в цветном круге) на захваченном гексе */}
            {c.owner !== null && !isPolar ? (
              <>
                <Circle cx={c.top[0]} cy={c.top[1]} r={8}
                  fill={CONSTELLATION_SLOT_COLORS[c.owner]} fillOpacity={0.9}
                  stroke="#EAF2FF" strokeOpacity={0.85} strokeWidth={1} />
                <SvgText x={c.top[0]} y={c.top[1] + 3.5} fontSize={9} fontWeight="800"
                  textAnchor="middle" fill="#0A0F26">
                  {initialBySlot.get(c.owner) ?? '?'}
                </SvgText>
              </>
            ) : null}
            {flareColor ? (
              <>
                <Line x1={c.top[0] - flare} y1={c.top[1]} x2={c.top[0] + flare} y2={c.top[1]}
                  stroke={flareColor} strokeOpacity={0.55} strokeWidth={1} />
                <Line x1={c.top[0]} y1={c.top[1] - flare * 0.8} x2={c.top[0]} y2={c.top[1] + flare * 0.8}
                  stroke={flareColor} strokeOpacity={0.45} strokeWidth={1} />
              </>
            ) : null}
            {isPolar ? (
              <Circle cx={c.top[0]} cy={c.top[1]} r={15} fill="none"
                stroke={POLAR_GOLD} strokeOpacity={0.5} strokeWidth={1.4} />
            ) : null}
            {c.radiance > 0 ? (
              <SvgText x={c.top[0] + 11} y={c.top[1] - 10} fontSize={11} fill="#EAF2FF">
                {c.radiance >= 2 ? '✦✦' : '✦'}
              </SvgText>
            ) : null}
            {/* Ядра дома — маленькие точки-пипсы ПОД аватаром (не текст ●●●,
                который выглядел мусором и путался с аватаркой владельца). */}
            {cores !== null && c.owner !== null ? (
              <>
                {Array.from({ length: Math.max(0, cores) }).map((_, k) => (
                  <Circle key={`core${k}`}
                    cx={c.top[0] + (k - (cores - 1) / 2) * 5}
                    cy={c.top[1] + 15}
                    r={1.8}
                    fill={CONSTELLATION_SLOT_COLORS[c.owner as number]} />
                ))}
              </>
            ) : null}
            {/* Подпись имени: Полярная и дома — «якорные» звёзды. Крупнее (было
                8.5px «не видно»), с тёмной подложкой-обводкой чтобы читалось. */}
            {(isPolar || isHome) ? (() => {
              const ny = isPolar ? c.top[1] + 30 : c.top[1] - 17;
              const label = starName(c.key, lang);
              // Длинное имя не должно вылезать за край карты (аудит): при превышении
              // лимита ширины SVG сам ужимает глифы (textLength+spacingAndGlyphs),
              // короткое рисуется как есть. ~7 ед/символ — эмпирический порог.
              const maxTextLen = STAR_NAME_MAX_WIDTH;
              const needsSqueeze = label.length * 7 > maxTextLen;
              const lenProps = needsSqueeze
                ? { textLength: maxTextLen, lengthAdjust: 'spacingAndGlyphs' as const }
                : {};
              // Авто-лайт (F9): react-native-svg не поддерживает paintOrder,
              // поэтому обводка+заливка требуют двух SvgText — на слабом тире
              // рисуем ОДИН проход (только заливку) вместо двух.
              if (isLowEnd) {
                return (
                  <SvgText x={c.top[0]} y={ny} fontSize={11} textAnchor="middle"
                    fill="#EAF2FF" fontWeight="700" {...lenProps}>
                    {label}
                  </SvgText>
                );
              }
              return (
                <>
                  {/* тёмная обводка снизу — читаемость на любом фоне */}
                  <SvgText x={c.top[0]} y={ny} fontSize={11} textAnchor="middle"
                    fill="none" stroke="#05060E" strokeWidth={3} fontWeight="700" {...lenProps}>
                    {label}
                  </SvgText>
                  <SvgText x={c.top[0]} y={ny} fontSize={11} textAnchor="middle"
                    fill="#EAF2FF" fontWeight="700" {...lenProps}>
                    {label}
                  </SvgText>
                </>
              );
            })() : null}
          </React.Fragment>
        );
      })}

      {/* луч к выбранной цели */}
      {beam ? (
        <Line x1={beam.x1} y1={beam.y1} x2={beam.x2} y2={beam.y2}
          stroke="url(#beamG)" strokeWidth={3} strokeDasharray="7 5" />
      ) : null}

      {/* синематик захвата (2.6): ударная волна + искры, анимировано reanimated.
          8.9: цвет вспышки = цвет ЗАХВАТЧИКА (владельца звезды после резолва),
          чтобы читалось «чей захват»; Полярная и нейтрал — fallback. */}
      {flashKey ? (() => {
        const h = parseHexKey(flashKey);
        if (!h) return null;
        const [x, y] = topPx(h);
        const capturerSlot = stars[flashKey]?.owner;
        const color = typeof capturerSlot === 'number'
          ? CONSTELLATION_SLOT_COLORS[capturerSlot]
          : flashKey === '0,0' ? POLAR_GOLD : '#EAF2FF';
        return <CaptureBurst key={flashKey} x={x} y={y} color={color} />;
      })() : null}

      {/* ХИТ-СЛОЙ (последним = поверх всех гексов): прозрачные круги ловят тап
          по каждой звезде одинаково. Раньше onPress висел на верхней грани,
          которую перекрывали соседние гексы (painter's algorithm) — оттого
          «два нажимаются, третий нет». Радиус крупнее грани — легче попасть. */}
      {onStarPress ? cells.map((c) => (
        <Circle
          key={`hit${c.key}`}
          cx={c.top[0]}
          cy={c.top[1]}
          r={HEX_SIZE * 0.95}
          fill="transparent"
          onPress={() => onStarPress(c.key)}
        />
      )) : null}
    </Svg>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/** Ударная волна захвата: 2 расходящихся кольца + 6 искр. Одноразово, гаснет ~900мс. */
function CaptureBurst({ x, y, color }: { x: number; y: number; color: string }) {
  const p = useSharedValue(0);
  const reduceMotion = useReduceMotion();
  React.useEffect(() => {
    // reduce-motion (8.4): без расходящейся ударной волны — сразу «погасла».
    if (reduceMotion) { p.value = 1; return; }
    p.value = 0;
    p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [x, y, p, reduceMotion]);

  const ring1 = useAnimatedProps(() => ({
    r: 8 + p.value * 30,
    opacity: (1 - p.value) * 0.9,
  }));
  const ring2 = useAnimatedProps(() => ({
    r: 8 + p.value * 20,
    opacity: (1 - p.value) * 0.7,
  }));
  return (
    <>
      <AnimatedCircle cx={x} cy={y} fill="none" stroke={color} strokeWidth={2.5} animatedProps={ring1} />
      <AnimatedCircle cx={x} cy={y} fill="none" stroke={color} strokeWidth={1.5} animatedProps={ring2} />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <BurstSpark key={deg} x={x} y={y} deg={deg} color={color} progress={p} />
      ))}
    </>
  );
}

/** Одна искра ударной волны — свой хук useAnimatedProps (не в цикле). */
function BurstSpark(
  { x, y, deg, color, progress }: { x: number; y: number; deg: number; color: string; progress: SharedValue<number> },
) {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const props = useAnimatedProps(() => {
    const d = progress.value * 26;
    const inner = 6 + d * 0.7;
    const outer = 10 + d;
    return {
      x1: x + dx * inner,
      y1: y + dy * inner,
      x2: x + dx * outer,
      y2: y + dy * outer,
      opacity: (1 - progress.value) * 0.85,
    };
  });
  return <AnimatedLine stroke={color} strokeWidth={1.6} strokeLinecap="round" animatedProps={props} />;
}

export const ConstellationSkyMap = memo(SkyMapInner);
