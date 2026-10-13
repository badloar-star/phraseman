// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerSvg.tsx — башня из 15 этажей на react-native-svg (порт towerSvg() макета spire.html).
//
// зачем (⚡): башня статична — никаких покадровых setState и бесконечных анимаций.
// Каждый этаж — отдельный memo-компонент, который перерисовывается только когда
// меняется его состояние (мой / пройден / впереди / выбран). Размытие макета
// (feGaussianBlur) заменено радиальными градиентами — дешевле и одинаково на iOS/Android.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText,
} from 'react-native-svg';
import type { Lang } from '../../constants/i18n';
import { SPIRE_DEFAULT_SKIN, type SpireTowerSkin } from '../../modules/spire/tower_skins';
import { spireText } from './spire_strings';
import {
  SPIRE_CX, SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW, spireFloorState, spireIsGuard, spireIsSummit,
  type SpireFloorGeom,
} from './spire_tower_model';

type WindowTone = 'lit' | 'past' | 'dark';
const WINDOW_FILL: Record<WindowTone, string> = { lit: '#EEF0F6', past: '#3A3A40', dark: '#0B0B0D' }; // theme-exempt: иллюстрация башни Шпиля (SVG)

function windowPath(x: number, y: number, w: number, h: number): string {
  return `M${x.toFixed(1)} ${(y + w / 2).toFixed(1)}a${(w / 2).toFixed(1)} ${(w / 2).toFixed(1)} 0 0 1 ${w.toFixed(1)} 0V${y + h}H${x.toFixed(1)}Z`;
}

/** Ряды кладки со швами, сгущающимися к краям цилиндра (stones() макета). */
function stonesPath(fl: SpireFloorGeom): Readonly<{ seams: string; light: string }> {
  const { y, h, w, x0 } = fl;
  const r = w / 2;
  let seams = '';
  let light = '';
  let row = 0;
  for (let yy = y + 11; yy < y + h; yy += 11, row += 1) {
    seams += `M${x0} ${yy}Q${SPIRE_CX} ${yy + 4} ${x0 + w} ${yy}`;
    light += `M${x0} ${yy + 1.2}Q${SPIRE_CX} ${yy + 5.2} ${x0 + w} ${yy + 1.2}`;
    for (let t = -1.35 + (row % 2) * 0.14; t < 1.4; t += 0.28) {
      const x = SPIRE_CX + r * Math.sin(t);
      seams += `M${x.toFixed(1)} ${(yy - 11 + 1.5 * Math.cos(t)).toFixed(1)}V${(yy + 3 * Math.cos(t)).toFixed(1)}`;
    }
  }
  return { seams, light };
}

const FloorWindows = memo(function FloorWindows({ fl, tone, lit }: { fl: SpireFloorGeom; tone: WindowTone; lit: string }) {
  const { f, y, w } = fl;
  const r = w / 2;
  const guard = spireIsGuard(f);
  const angles = f >= 12 ? [-0.55, 0.55] : [-0.72, 0, 0.72];
  return (
    <>
      {angles.map((t) => {
        const big = guard && t === 0;
        const ww = (big ? 16 : 12) * Math.cos(t);
        const wh = big ? 30 : 20;
        const x = SPIRE_CX + r * Math.sin(t) - ww / 2;
        const yy = y + (guard ? 22 : 12) - (big ? 6 : 0);
        const d = windowPath(x, yy, ww, wh);
        return (
          <G key={t}>
            {tone === 'lit' ? <Path d={d} fill={lit} fillOpacity={0.3} stroke={lit} strokeOpacity={0.25} strokeWidth={6} strokeLinejoin="round" /> : null}{/* theme-exempt: свечение окна на ночной сцене башни — небо (spireSky) всегда тёмное, в светлом оформлении сцена не светлеет */}
            <Path d={d} fill={tone === 'lit' ? lit : WINDOW_FILL[tone]} />
            <Rect x={x - 2} y={yy + wh} width={ww + 4} height={2.6} rx={1} fill="#6B6B72" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
          </G>
        );
      })}
    </>
  );
});

type FloorProps = Readonly<{
  fl: SpireFloorGeom;
  tone: WindowTone;
  lit: string;
  mine: boolean;
  selected: boolean;
  label: string;
  onSelect: (floor: number) => void;
}>;

const Floor = memo(function Floor({ fl, tone, lit, mine, selected, label, onSelect }: FloorProps) {
  const { f, y, h, w, x0 } = fl;
  const guard = spireIsGuard(f);
  const stones = useMemo(() => stonesPath(fl), [fl]);
  const clipId = `spireCl${f}`;
  return (
    <G onPress={() => onSelect(f)}>
      <ClipPath id={clipId}><Rect x={x0} y={y} width={w} height={h} /></ClipPath>
      {mine ? <Ellipse cx={SPIRE_CX} cy={y + h / 2} rx={w / 2 + 70} ry={h} fill="url(#spireLitFloor)" /> : null}
      <Rect x={x0} y={y} width={w} height={h} fill={guard ? 'url(#spireCylG)' : 'url(#spireCyl)'} />
      <Path d={stones.seams} stroke="rgba(0,0,0,.34)" strokeWidth={1.1} fill="none" clipPath={`url(#${clipId})`} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Path d={stones.light} stroke="rgba(255,255,255,.045)" strokeWidth={1} fill="none" clipPath={`url(#${clipId})`} />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Rect x={x0} y={y} width={w} height={h} fill="url(#spireUnder)" />
      <FloorWindows fl={fl} tone={tone} lit={lit} />
      {guard ? null : (
        <>
          <Rect x={x0 - 5} y={y - 3} width={w + 10} height={7} rx={3} fill="url(#spireCylCorn)" />
          <Rect x={x0 - 5} y={y - 3} width={w + 10} height={1.4} rx={0.7} fill="rgba(255,255,255,.28)" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
        </>
      )}
      <SvgText x={14} y={y + h / 2 + (label ? 0 : 5)} fontSize={14} fontWeight={mine ? '700' : '600'} fill={mine ? '#FFFFFF' : '#6E6E72'} textAnchor="middle">{String(f)}</SvgText>{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {label ? <SvgText x={20} y={y + h / 2 + 14} fontSize={7.5} fontWeight="700" letterSpacing={0.5} fill="#8E8E92" textAnchor="middle">{label}</SvgText> : null}
      {selected ? <Rect x={x0 - 9} y={y - (guard ? 20 : 6)} width={w + 18} height={h + (guard ? 23 : 9)} rx={5} fill="none" stroke="rgba(255,255,255,.8)" strokeWidth={1.4} /> : null}{/* theme-exempt: рамка выбранного этажа на ночной сцене (небо всегда тёмное) */}
      <Rect x={0} y={y - 4} width={SPIRE_TW} height={h + 4} fill="transparent" />
    </G>
  );
});

/** Зубцы и машикули Стража (parapet() макета). */
const Parapet = memo(function Parapet({ fl, tint }: { fl: SpireFloorGeom; tint: SpireTowerSkin['merlonTint'] }) {
  const { y, w, x0 } = fl;
  const r = w / 2 + 7;
  const merlons: React.ReactNode[] = [];
  for (let t = -1.32; t <= 1.33; t += 0.3) {
    const mw = 11 * Math.cos(t);
    const x = SPIRE_CX + r * Math.sin(t) - mw / 2;
    const c = Math.round(66 + 44 * (0.62 - 0.38 * Math.sin(t + 0.45)));
    merlons.push(<Rect key={`m${t.toFixed(2)}`} x={x} y={y - 17} width={mw} height={14} rx={1.2} fill={`rgb(${c + tint[0]},${c + tint[1]},${c + tint[2]})`} />);
  }
  let brackets = '';
  for (let t = -1.25; t <= 1.26; t += 0.25) {
    const cw = 6 * Math.cos(t);
    const x = SPIRE_CX + (w / 2 + 3) * Math.sin(t) - cw / 2;
    brackets += `M${x.toFixed(1)} ${y + 6}h${cw.toFixed(1)}l-1 7h${(-cw + 2).toFixed(1)}Z`;
  }
  return (
    <G>
      <Rect x={x0 - 7} y={y - 4} width={w + 14} height={10} rx={2} fill="url(#spireCylCorn)" />
      {merlons}
      <Path d={brackets} fill="rgba(0,0,0,.45)" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
    </G>
  );
});

const Crown = memo(function Crown() {
  const t = SPIRE_TOWER_GEOM.floors[SPIRE_FLOOR_COUNT - 1];
  const dw = t.w - 22;
  const dx = SPIRE_CX - dw / 2;
  const yd = t.y - 34;
  const apex = yd - 168;
  const rw = dw + 26;
  let shingles = '';
  for (let yy = yd - 10; yy > apex + 10; yy -= 11) {
    const k = (yd - yy) / (yd - apex);
    const hw = (rw / 2) * (1 - k);
    shingles += `M${(SPIRE_CX - hw).toFixed(1)} ${yy}Q${SPIRE_CX} ${(yy + 4 * (1 - k)).toFixed(1)} ${(SPIRE_CX + hw).toFixed(1)} ${yy}`;
  }
  return (
    <G>
      <Rect x={dx} y={yd} width={dw} height={34} fill="url(#spireCyl)" />
      <Rect x={SPIRE_CX - rw / 2} y={yd - 4} width={rw} height={8} rx={4} fill="url(#spireCylCorn)" />
      <Polygon points={`${SPIRE_CX - rw / 2},${yd} ${SPIRE_CX + rw / 2},${yd} ${SPIRE_CX},${apex}`} fill="url(#spireCone)" />
      <Path d={shingles} stroke="rgba(0,0,0,.38)" strokeWidth={1.1} fill="none" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Circle cx={SPIRE_CX} cy={apex - 14} r={34} fill="url(#spireGlow)" />
      <Rect x={SPIRE_CX - 1} y={apex - 12} width={2} height={16} fill="#D6D6D8" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Circle cx={SPIRE_CX} cy={apex - 16} r={5.5} fill="#FFFFFF" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
    </G>
  );
});

const STARS: readonly (readonly [number, number])[] = [[40, 30], [96, 70], [150, 22], [238, 54], [300, 18], [352, 76], [70, 128], [330, 140], [20, 190], [372, 210], [120, 180]];

type Props = Readonly<{
  lang: Lang;
  /** null = локальной недели нет: ни одно окно не светится. */
  myFloor: number | null;
  selected: number;
  onSelect: (floor: number) => void;
  width: number;
  /** Наряд лиги (modules/spire/tower_skins.ts). Нет пропа = Оникс без деталей, прежний вид. */
  skin?: SpireTowerSkin;
}>;

function SpireTowerSvg({ lang, myFloor, selected, onSelect, width, skin = SPIRE_DEFAULT_SKIN }: Props) {
  const geom = SPIRE_TOWER_GEOM;
  const scale = width / SPIRE_TW;
  const guardLabel = useMemo(() => spireText(lang, 'guard').toUpperCase(), [lang]);
  const summitLabel = useMemo(() => spireText(lang, 'summit').toUpperCase(), [lang]);
  const cloudsLabel = useMemo(() => spireText(lang, 'aboveClouds').toUpperCase(), [lang]);
  const b = geom.floors[0];
  const skyY = geom.top - 250;
  return (
    <Svg width={width} height={geom.height * scale} viewBox={`0 0 ${SPIRE_TW} ${geom.height}`}>
      <Defs>
        <LinearGradient id="spireCyl" x1="0" x2="1" y1="0" y2="0"><Stop offset="0" stopColor={skin.cyl[0]} /><Stop offset="0.16" stopColor={skin.cyl[1]} /><Stop offset="0.36" stopColor={skin.cyl[2]} /><Stop offset="0.55" stopColor={skin.cyl[3]} /><Stop offset="0.8" stopColor={skin.cyl[4]} /><Stop offset="1" stopColor={skin.cyl[5]} /></LinearGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG), цвета из наряда лиги */}
        <LinearGradient id="spireCylG" x1="0" x2="1" y1="0" y2="0"><Stop offset="0" stopColor={skin.cylG[0]} /><Stop offset="0.16" stopColor={skin.cylG[1]} /><Stop offset="0.36" stopColor={skin.cylG[2]} /><Stop offset="0.55" stopColor={skin.cylG[3]} /><Stop offset="0.8" stopColor={skin.cylG[4]} /><Stop offset="1" stopColor={skin.cylG[5]} /></LinearGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG), цвета из наряда лиги */}
        <LinearGradient id="spireCylCorn" x1="0" x2="1" y1="0" y2="0"><Stop offset="0" stopColor={skin.corn[0]} /><Stop offset="0.35" stopColor={skin.corn[1]} /><Stop offset="0.6" stopColor={skin.corn[2]} /><Stop offset="1" stopColor={skin.corn[3]} /></LinearGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG), цвета из наряда лиги */}
        <LinearGradient id="spireCone" x1="0" x2="1" y1="0" y2="0"><Stop offset="0" stopColor={skin.cone[0]} /><Stop offset="0.35" stopColor={skin.cone[1]} /><Stop offset="0.6" stopColor={skin.cone[2]} /><Stop offset="1" stopColor={skin.cone[3]} /></LinearGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG), цвета из наряда лиги */}
        <LinearGradient id="spireUnder" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor="#000000" stopOpacity={0.42} /><Stop offset="0.3" stopColor="#000000" stopOpacity={0} /><Stop offset="1" stopColor="#000000" stopOpacity={0.12} /></LinearGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
        <RadialGradient id="spireGlow" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor={skin.glow} stopOpacity={0.5} /><Stop offset="0.45" stopColor={skin.glow} stopOpacity={0.1} /><Stop offset="1" stopColor={skin.glow} stopOpacity={0} /></RadialGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG), цвета из наряда лиги */}
        <RadialGradient id="spireLitFloor" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></RadialGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
        <LinearGradient id="spireSky" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={skin.sky[0]} /><Stop offset="0.5" stopColor={skin.sky[1]} /><Stop offset="1" stopColor={skin.sky[2]} /></LinearGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG), цвета из наряда лиги */}
        <RadialGradient id="spireGround" cx="0.5" cy="0.2" rx="0.5" ry="0.5"><Stop offset="0" stopColor="#26262A" /><Stop offset="1" stopColor="#0E0E10" stopOpacity={0} /></RadialGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
        <RadialGradient id="spireCloud" cx="0.5" cy="0.5" rx="0.5" ry="0.5"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.09} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></RadialGradient>{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      </Defs>
      <Rect width={SPIRE_TW} height={geom.height} fill="url(#spireSky)" />
      <Ellipse cx={SPIRE_CX} cy={geom.top - 120} rx={200} ry={260} fill="rgba(255,255,255,.03)" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      {STARS.map(([x, yy], i) => <Circle key={`s${i}`} cx={x} cy={skyY - 40 + yy} r={i % 3 ? 0.8 : 1.2} fill={`rgba(255,255,255,${i % 2 ? 0.35 : 0.55})`} />)}{/* theme-exempt: звёзды на ночном небе сцены (spireSky всегда тёмное) */}
      <Ellipse cx={60} cy={geom.top - 150} rx={130} ry={28} fill="url(#spireCloud)" />
      <Ellipse cx={330} cy={geom.top - 170} rx={140} ry={30} fill="url(#spireCloud)" />
      <Ellipse cx={80} cy={geom.top - 96} rx={110} ry={22} fill="url(#spireCloud)" />
      <Ellipse cx={320} cy={geom.top - 90} rx={120} ry={22} fill="url(#spireCloud)" />
      <SvgText x={SPIRE_CX} y={geom.top - 272} fontSize={11} fontWeight="700" letterSpacing={3} fill="#5E5E62" textAnchor="middle">{cloudsLabel}</SvgText>{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Ellipse cx={SPIRE_CX} cy={geom.base + 44} rx={210} ry={40} fill="url(#spireGround)" />
      <Ellipse cx={SPIRE_CX} cy={geom.base + 30} rx={b.w / 2 + 64} ry={12} fill="rgba(0,0,0,.55)" />{/* theme-exempt: иллюстрация башни Шпиля (SVG) */}
      <Rect x={b.x0 - 30} y={geom.base + 16} width={b.w + 60} height={14} rx={3} fill="url(#spireCylCorn)" opacity={0.7} />
      <Rect x={b.x0 - 16} y={geom.base + 2} width={b.w + 32} height={16} rx={3} fill="url(#spireCylCorn)" />
      {geom.floors.map((fl) => {
        const state = spireFloorState(fl.f, myFloor);
        const tone: WindowTone = state === 'mine' ? 'lit' : state === 'passed' ? 'past' : 'dark';
        const label = spireIsSummit(fl.f) ? summitLabel : spireIsGuard(fl.f) ? guardLabel : '';
        return <Floor key={fl.f} fl={fl} tone={tone} lit={skin.lit} mine={state === 'mine'} selected={fl.f === selected} label={label} onSelect={onSelect} />;
      })}
      {geom.floors.filter((fl) => spireIsGuard(fl.f) && !spireIsSummit(fl.f)).map((fl) => <Parapet key={`p${fl.f}`} fl={fl} tint={skin.merlonTint} />)}
      <Crown />
    </Svg>
  );
}

export default memo(SpireTowerSvg);
