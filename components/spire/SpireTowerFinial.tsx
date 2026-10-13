// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerFinial.tsx — навершие башни по лиге (порт finialSvg образца spire-leagues.html).
//
// зачем (владелец 13.10: «детали разные»): у каждой лиги своё навершие — от металлического шара до бриллианта в короне; 2–9 узлов.
// Центр (cx, cy) — там, где у прежней башни стоит белый шар. big = вершина недели (×1.25). Градиенты spireMetal / spireOrb / spireEmber
// объявляет SpireTowerSvg в <Defs>.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { Circle, Ellipse, Path, Polygon, Rect } from 'react-native-svg';
import type { SpireTowerSkin } from '../../modules/spire/tower_skins';

const f1 = (n: number): number => Math.round(n * 10) / 10;
const METAL = 'url(#spireMetal)';
type Pt = readonly [number, number];
const pts = (a: readonly Pt[]): string => a.map((q) => `${f1(q[0])},${f1(q[1])}`).join(' ');

/** Гранёный камень: корпус, светлая левая грань, тёмная правая (gemD образца) — 3 узла. */
function gemD(k: string, x: number, y: number, r: number, c: string) {
  return [
    <Polygon key={`${k}a`} points={pts([[x, y - r * 1.2], [x + r * 0.8, y - r * 0.2], [x, y + r], [x - r * 0.8, y - r * 0.2]])} fill={c} />,
    <Polygon key={`${k}b`} points={pts([[x, y - r * 1.2], [x - r * 0.8, y - r * 0.2], [x, y - r * 0.1]])} fill="rgba(255,255,255,.75)" />,
    <Polygon key={`${k}c`} points={pts([[x, y - r * 0.1], [x + r * 0.8, y - r * 0.2], [x, y + r]])} fill="rgba(0,0,0,.28)" />,
  ];
}

function star4(k: string, x: number, y: number, r: number, c: string, a: number) {
  return <Path key={k} d={`M${f1(x)} ${f1(y - r)}Q${f1(x)} ${f1(y)} ${f1(x + r)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y + r)}Q${f1(x)} ${f1(y)} ${f1(x - r)} ${f1(y)}Q${f1(x)} ${f1(y)} ${f1(x)} ${f1(y - r)}Z`} fill={c} opacity={a} />;
}

type Props = Readonly<{ skin: SpireTowerSkin; cx: number; cy: number; big: boolean }>;

function SpireTowerFinial({ skin, cx, cy, big }: Props) {
  const s = big ? 1.25 : 1;
  const g = skin.gem;
  switch (skin.finial) {
    case 'ball':
      return (
        <>
          <Circle cx={cx} cy={cy} r={f1(5.5 * s)} fill={METAL} />
          <Circle cx={f1(cx - 1.6)} cy={f1(cy - 1.8)} r={f1(1.5 * s)} fill="rgba(255,255,255,.75)" />
        </>
      );
    case 'gem':
      return (
        <>
          <Rect x={f1(cx - 4 * s)} y={f1(cy + 4 * s)} width={f1(8 * s)} height={f1(2.4 * s)} rx={1} fill={METAL} />
          {gemD('g', cx, cy, 6.5 * s, g)}
          {skin.id === 'onyx' ? <Path d={`M${f1(cx - 5.2 * s)} ${f1(cy - 1.3 * s)}L${f1(cx)} ${f1(cy - 7.8 * s)}L${f1(cx + 5.2 * s)} ${f1(cy - 1.3 * s)}`} stroke="#E8EBF2" strokeWidth={0.9} fill="none" /> : null}
        </>
      );
    case 'crystal': {
      const w = 5 * s;
      const h = 14 * s;
      return (
        <>
          <Polygon points={pts([[cx - w, cy + 5], [cx + w, cy + 5], [cx + w, cy - h * 0.4], [cx, cy - h], [cx - w, cy - h * 0.4]])} fill={g} />
          <Polygon points={pts([[cx - w, cy + 5], [cx - w * 0.2, cy + 5], [cx - w * 0.2, cy - h * 0.4], [cx, cy - h], [cx - w, cy - h * 0.4]])} fill="rgba(255,255,255,.55)" />
          <Polygon points={pts([[cx + w * 0.3, cy + 5], [cx + w, cy + 5], [cx + w, cy - h * 0.4], [cx, cy - h]])} fill="rgba(0,0,0,.18)" />
          <Rect x={f1(cx - w - 1)} y={f1(cy + 4)} width={f1(w * 2 + 2)} height={2.4} rx={1} fill={METAL} />
        </>
      );
    }
    case 'cabochon':
      return (
        <>
          <Ellipse cx={cx} cy={cy} rx={f1(7 * s)} ry={f1(6 * s)} fill={METAL} />
          <Ellipse cx={cx} cy={cy} rx={f1(5.6 * s)} ry={f1(4.8 * s)} fill={g} />
          <Ellipse cx={cx} cy={cy} rx={f1(3.6 * s)} ry={f1(3 * s)} fill="none" stroke="#F2D8B4" strokeWidth={0.9} opacity={0.8} />
          <Ellipse cx={cx} cy={cy} rx={f1(1.8 * s)} ry={f1(1.4 * s)} fill="#5A2A12" />
          <Ellipse cx={f1(cx - 2 * s)} cy={f1(cy - 2.2 * s)} rx={f1(1.8 * s)} ry={1} fill="rgba(255,255,255,.7)" />
        </>
      );
    case 'cluster': {
      const c = (k: string, x: number, y: number, w: number, h: number, lean: number) => [
        <Polygon key={`${k}a`} points={pts([[x - w, y], [x + w, y], [x + w + lean * 0.4, y - h * 0.65], [x + lean, y - h], [x - w + lean * 0.4, y - h * 0.65]])} fill={g} />,
        <Polygon key={`${k}b`} points={pts([[x - w, y], [x, y], [x + lean, y - h], [x - w + lean * 0.4, y - h * 0.65]])} fill="rgba(255,255,255,.4)" />,
      ];
      return (
        <>
          {c('l', cx - 5 * s, cy + 6, 2.6 * s, 11 * s, -3)}
          {c('r', cx + 5 * s, cy + 6, 2.6 * s, 11 * s, 3)}
          {c('m', cx, cy + 6, 3.4 * s, 17 * s, 0)}
          <Rect x={f1(cx - 9 * s)} y={f1(cy + 5)} width={f1(18 * s)} height={2.4} rx={1} fill={METAL} />
        </>
      );
    }
    case 'orb':
      return (
        <>
          <Rect x={f1(cx - 4 * s)} y={f1(cy + 5.5 * s)} width={f1(8 * s)} height={2.4} rx={1} fill={METAL} />
          <Circle cx={cx} cy={cy} r={f1(7 * s)} fill="url(#spireOrb)" />
          <Circle cx={f1(cx - 2.4 * s)} cy={f1(cy - 2.6 * s)} r={f1(1.8 * s)} fill="#FFFFFF" opacity={0.85} />
        </>
      );
    case 'crown': {
      const w = 9 * s;
      const b = cy + 6;
      const t = cy - 4 * s;
      return (
        <>
          <Path d={`M${f1(cx - w)} ${f1(b)}L${f1(cx - w)} ${f1(t)}L${f1(cx - w * 0.5)} ${f1(b - 5)}L${cx} ${f1(t - 3)}L${f1(cx + w * 0.5)} ${f1(b - 5)}L${f1(cx + w)} ${f1(t)}L${f1(cx + w)} ${f1(b)}Z`} fill={METAL} />
          {gemD('c', cx, b - 3.5, 3 * s, g)}
          <Circle cx={f1(cx - w)} cy={f1(t - 1)} r={1.4} fill="#FFF3C8" />
          <Circle cx={f1(cx + w)} cy={f1(t - 1)} r={1.4} fill="#FFF3C8" />
        </>
      );
    }
    case 'shard': {
      const h = 20 * s;
      return (
        <>
          <Circle cx={cx} cy={f1(cy - 2)} r={f1(14 * s)} fill="url(#spireEmber)" />
          <Polygon points={pts([[cx - 4 * s, cy + 6], [cx + 4.5 * s, cy + 6], [cx + 1.5, cy - h]])} fill="#141218" />
          <Polygon points={pts([[cx - 4 * s, cy + 6], [cx - 0.5, cy + 6], [cx + 1.5, cy - h]])} fill="#3A3640" />
          <Path d={`M${f1(cx + 4.5 * s)} ${f1(cy + 6)}L${f1(cx + 1.5)} ${f1(cy - h)}`} stroke={g} strokeWidth={1.2} />
          <Rect x={f1(cx - 6 * s)} y={f1(cy + 5)} width={f1(12 * s)} height={2.4} rx={1} fill={METAL} />
        </>
      );
    }
    case 'brilliant': {
      const w = 8 * s;
      const b = cy + 8;
      const t = cy - 1;
      const gy = cy - 6 * s;
      const r = 6 * s;
      return (
        <>
          <Path d={`M${f1(cx - w)} ${f1(b)}L${f1(cx - w)} ${f1(t)}L${f1(cx - w * 0.5)} ${f1(b - 4)}L${cx} ${f1(t - 2)}L${f1(cx + w * 0.5)} ${f1(b - 4)}L${f1(cx + w)} ${f1(t)}L${f1(cx + w)} ${f1(b)}Z`} fill={METAL} />
          <Polygon points={pts([[cx - r, gy], [cx - r * 0.5, gy - r * 0.6], [cx + r * 0.5, gy - r * 0.6], [cx + r, gy], [cx, gy + r * 1.1]])} fill={g} />
          <Polygon points={pts([[cx - r * 0.5, gy - r * 0.6], [cx + r * 0.5, gy - r * 0.6], [cx + r * 0.25, gy], [cx - r * 0.25, gy]])} fill="#FFFFFF" />
          <Polygon points={pts([[cx + r * 0.25, gy], [cx + r, gy], [cx, gy + r * 1.1]])} fill="rgba(90,140,200,.35)" />
          {star4('s', cx + r + 2, gy - r * 0.7, 3 * s, '#FFFFFF', 0.9)}
        </>
      );
    }
    default:
      return <Circle cx={cx} cy={cy} r={f1(5.5 * s)} fill="#FFFFFF" />;
  }
}

export default memo(SpireTowerFinial);
