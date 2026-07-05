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
import type { ConstellationMatchPlayer, ConstellationStar } from './types/constellations';
import { allMapHexes, hexKey, parseHexKey, ringOf, type ConstellationRing, type Hex } from './constellations_hex';
import { starName } from './constellation_star_names';

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
  stars, homes, players, highlightKeys, myTargetKey, mySlot, onStarPress, flashKey,
}: SkyMapProps) {
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
              fill={c.owner !== null ? `url(#top${c.owner})` : 'url(#topNeutral)'}
              stroke={hl ? '#EAF2FF' : c.owner !== null ? CONSTELLATION_SLOT_COLORS[c.owner] : '#2B3C66'}
              strokeOpacity={hl ? 1 : c.owner !== null ? 0.8 : 0.55}
              strokeWidth={hl ? 2.2 : 1}
              strokeDasharray={hl ? '5 3' : undefined}
              onPress={onStarPress ? () => onStarPress(c.key) : undefined}
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
              <SvgText x={c.top[0] + 11} y={c.top[1] - 10} fontSize={10} fill="#EAF2FF">
                {c.radiance >= 2 ? '✦✦' : '✦'}
              </SvgText>
            ) : null}
            {cores !== null && c.owner !== null ? (
              <SvgText x={c.top[0]} y={c.top[1] + 21} fontSize={9} textAnchor="middle"
                fill={CONSTELLATION_SLOT_COLORS[c.owner]} opacity={0.95}>
                {'●'.repeat(Math.max(0, cores))}
              </SvgText>
            ) : null}
            {/* Подпись имени (2.1): у Полярной и домов — «якорные» звёзды поля.
                У рядовых звёзд имя показывать не будем (шум); оно есть в шторке. */}
            {(isPolar || isHome) ? (
              <SvgText x={c.top[0]} y={c.top[1] - (isPolar ? 20 : 15)} fontSize={8.5}
                textAnchor="middle" fill="#C7D4F0" opacity={0.75} fontWeight="600">
                {starName(c.key)}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* луч к выбранной цели */}
      {beam ? (
        <Line x1={beam.x1} y1={beam.y1} x2={beam.x2} y2={beam.y2}
          stroke="url(#beamG)" strokeWidth={3} strokeDasharray="7 5" />
      ) : null}

      {/* вспышка захвата (резолв) */}
      {flashKey ? (() => {
        const h = parseHexKey(flashKey);
        if (!h) return null;
        const [x, y] = topPx(h);
        return <Circle cx={x} cy={y} r={18} fill="none" stroke="#EAF2FF" strokeOpacity={0.8} strokeWidth={2} />;
      })() : null}
    </Svg>
  );
}

export const ConstellationSkyMap = memo(SkyMapInner);
