// ═══════════════════════════════════════════════════════════════════════════
// SpireTowerTextures.tsx — материал поверх кладки: ОДИН <Pattern> на лигу (порт texPattern образца spire-leagues.html).
//
// зачем (владелец 13.10: «премиальные цвета и ТЕКСТУРЫ»): patternUnits="userSpaceOnUse" — текстура непрерывна через все этажи и конус;
// на башне она кладётся одним Rect на этаж. 3–7 фигур на паттерн, только заливки/обводки с opacity, фильтров нет.
// Вызывать как ФУНКЦИЮ внутри <Defs> (skinTextureDefs(tex)), не как компонент.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { Circle, Ellipse, Path, Pattern, Polygon, RadialGradient, Stop } from 'react-native-svg';
import type { SpireTowerTexture } from '../../modules/spire/tower_skins';

export const SPIRE_TEX_ID = 'spireTex';
const JADE_GLOW_ID = 'spireJg';
const r1 = (n: number): number => Math.round(n * 10) / 10;

/** Четырёхлучевая искра (star4 образца). */
function star4(key: string, x: number, y: number, r: number, c: string, a: number) {
  return <Path key={key} d={`M${r1(x)} ${r1(y - r)}Q${r1(x)} ${r1(y)} ${r1(x + r)} ${r1(y)}Q${r1(x)} ${r1(y)} ${r1(x)} ${r1(y + r)}Q${r1(x)} ${r1(y)} ${r1(x - r)} ${r1(y)}Q${r1(x)} ${r1(y)} ${r1(x)} ${r1(y - r)}Z`} fill={c} opacity={a} />;
}
function poly(key: string, pts: readonly (readonly [number, number])[], fill: string, opacity: number) {
  return <Polygon key={key} points={pts.map((q) => `${r1(q[0])},${r1(q[1])}`).join(' ')} fill={fill} opacity={opacity} />;
}
function pat(w: number, h: number, body: React.ReactNode) {
  return <Pattern id={SPIRE_TEX_ID} patternUnits="userSpaceOnUse" width={w} height={h}>{body}</Pattern>;
}

const AGATE_RINGS = [40, 32, 25, 18, 11, 5] as const;

/** Содержимое <Defs> для текстуры лиги: паттерн (+ радиальный градиент нефрита). null — без текстуры. */
export function skinTextureDefs(tex: SpireTowerTexture | null): React.ReactNode {
  switch (tex) {
    case 'speckle': return pat(16, 16, (
      <>
        <Circle cx={3} cy={4} r={0.9} fill="#FFFFFF" opacity={0.3} />
        <Circle cx={11} cy={2} r={0.7} fill="#000000" opacity={0.45} />
        <Circle cx={8} cy={9} r={1.1} fill="#E8ECF2" opacity={0.22} />
        <Circle cx={14} cy={12} r={0.8} fill="#000000" opacity={0.5} />
        <Circle cx={2} cy={13} r={0.6} fill="#FFFFFF" opacity={0.28} />
        <Circle cx={12} cy={7} r={0.5} fill="#C8D2DE" opacity={0.35} />
        <Circle cx={6} cy={14.5} r={0.7} fill="#000000" opacity={0.35} />
      </>
    ));
    case 'columns': return pat(7, 40, (
      <>
        <Path d="M2 0V40" stroke="#000000" strokeWidth={0.9} opacity={0.28} />
        <Path d="M5.5 0V40" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.06} />
        <Path d="M1 18h3" stroke="#000000" strokeWidth={0.7} opacity={0.25} />
      </>
    ));
    case 'marble': return pat(140, 110, (
      <>
        <Path d="M-10 20C30 5 50 45 90 30S140 60 150 50" stroke="#C9A24A" strokeWidth={1.1} fill="none" opacity={0.6} />
        <Path d="M60 38C70 55 66 70 80 92" stroke="#C9A24A" strokeWidth={0.6} fill="none" opacity={0.45} />
        <Path d="M-10 80C20 70 60 100 100 78S150 90 160 85" stroke="#7E7A76" strokeWidth={0.9} fill="none" opacity={0.4} />
        <Path d="M110 0C104 20 120 30 112 50" stroke="#9A9690" strokeWidth={0.5} fill="none" opacity={0.35} />
      </>
    ));
    case 'jade': return (
      <>
        <RadialGradient id={JADE_GLOW_ID} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#9FF0C8" stopOpacity={0.38} />
          <Stop offset="1" stopColor="#9FF0C8" stopOpacity={0} />
        </RadialGradient>
        {pat(70, 60, (
          <>
            <Ellipse cx={20} cy={18} rx={18} ry={10} fill={`url(#${JADE_GLOW_ID})`} />
            <Ellipse cx={52} cy={44} rx={16} ry={9} fill={`url(#${JADE_GLOW_ID})`} />
            <Ellipse cx={50} cy={12} rx={10} ry={5} fill="#04241A" opacity={0.28} />
            <Ellipse cx={14} cy={48} rx={8} ry={4} fill="#04241A" opacity={0.22} />
          </>
        ))}
      </>
    );
    case 'quartz': return pat(46, 46, (
      <>
        <Ellipse cx={24} cy={24} rx={16} ry={7} fill="#FFFFFF" opacity={0.08} />
        {star4('q1', 10, 12, 2.6, '#FFFFFF', 0.7)}
        {star4('q2', 34, 32, 1.8, '#FFFFFF', 0.55)}
        <Path d="M30 8L36 4" stroke="#FFFFFF" strokeWidth={0.6} opacity={0.45} />
        <Path d="M14 38l3-2 3 2-3 2z" fill="#FFFFFF" opacity={0.3} />
      </>
    ));
    case 'agate': return pat(90, 90, AGATE_RINGS.map((r, i) => (
      <Ellipse key={r} cx={45} cy={45} rx={r} ry={r1(r * 0.6)} fill="none" stroke={i % 2 ? '#2A140A' : '#F2D8B4'} strokeWidth={i % 2 ? 1.6 : 1} opacity={i % 2 ? 0.3 : 0.32} />
    )));
    case 'onyx': return pat(120, 26, (
      <>
        <Path d="M0 6Q30 2 60 6T120 6" stroke="#FFFFFF" strokeWidth={1.2} fill="none" opacity={0.09} />
        <Path d="M0 17Q30 21 60 17T120 17" stroke="#000000" strokeWidth={2.2} fill="none" opacity={0.35} />
        <Path d="M0 22Q30 19 60 22T120 22" stroke="#FFFFFF" strokeWidth={0.7} fill="none" opacity={0.06} />
      </>
    ));
    case 'amethyst': return pat(34, 34, (
      <>
        {poly('a1', [[0, 0], [17, 6], [8, 17]], '#D8B8FF', 0.16)}
        {poly('a2', [[17, 6], [34, 0], [26, 17]], '#FFFFFF', 0.08)}
        {poly('a3', [[8, 17], [17, 34], [0, 34]], '#1A0830', 0.25)}
        {poly('a4', [[26, 17], [34, 34], [17, 34]], '#B58CFF', 0.14)}
        <Path d="M17 6V34" stroke="#E0C8FF" strokeWidth={0.6} opacity={0.14} />
      </>
    ));
    case 'opal': return pat(150, 84, (
      <>
        <Ellipse cx={30} cy={18} rx={34} ry={7} fill="#7FE0C8" opacity={0.2} rotation={-8} originX={30} originY={18} />
        <Ellipse cx={100} cy={14} rx={30} ry={6} fill="#FFB8D8" opacity={0.18} rotation={6} originX={100} originY={14} />
        <Ellipse cx={120} cy={52} rx={36} ry={7} fill="#9FC8FF" opacity={0.2} rotation={-5} originX={120} originY={52} />
        <Ellipse cx={50} cy={60} rx={32} ry={6} fill="#FFE08A" opacity={0.16} rotation={7} originX={50} originY={60} />
        <Ellipse cx={80} cy={36} rx={22} ry={4} fill="#C9A4FF" opacity={0.2} />
        <Ellipse cx={10} cy={76} rx={20} ry={4} fill="#7FE0C8" opacity={0.14} />
      </>
    ));
    case 'topaz': return pat(38, 38, (
      <>
        <Path d="M0 22L38 14" stroke="#FFD36A" strokeWidth={3} opacity={0.1} />
        {star4('t1', 9, 10, 2.6, '#FFF6D0', 0.85)}
        {star4('t2', 28, 26, 1.8, '#FFF6D0', 0.7)}
        {star4('t3', 30, 6, 1.2, '#FFFFFF', 0.5)}
        <Circle cx={14} cy={30} r={0.8} fill="#FFFFFF" opacity={0.5} />
        <Path d="M-2 34C10 28 20 30 40 20" stroke="#FFE7A0" strokeWidth={0.8} fill="none" opacity={0.55} />
      </>
    ));
    case 'obsidian': return pat(170, 150, (
      <>
        <Path d="M-10 50L180 -20" stroke="#FFFFFF" strokeWidth={10} opacity={0.05} />
        <Path d="M-10 120L180 50" stroke="#FFFFFF" strokeWidth={3} opacity={0.04} />
        <Path d="M20 150C40 118 34 96 62 74S96 40 92 0" stroke="#E0503A" strokeWidth={3} fill="none" opacity={0.16} />
        <Path d="M20 150C40 118 34 96 62 74S96 40 92 0" stroke="#FF8A5A" strokeWidth={0.9} fill="none" opacity={0.65} />
        <Path d="M62 74C80 80 98 78 120 92" stroke="#FF8A5A" strokeWidth={0.6} fill="none" opacity={0.45} />
        <Path d="M140 150C136 128 150 116 146 96" stroke="#E0503A" strokeWidth={0.7} fill="none" opacity={0.4} />
      </>
    ));
    case 'diamond': return pat(48, 48, (
      <>
        {poly('d1', [[0, 0], [24, 0], [12, 16]], '#CFF2FF', 0.18)}
        {poly('d2', [[24, 0], [48, 0], [36, 16]], '#FFFFFF', 0.12)}
        {poly('d3', [[12, 16], [36, 16], [24, 40]], '#9FD8FF', 0.15)}
        <Path d="M0 48L24 30" stroke="#FFB8D8" strokeWidth={0.7} opacity={0.3} />
        <Path d="M24 30L48 48" stroke="#B8FFE0" strokeWidth={0.7} opacity={0.28} />
        <Path d="M36 16L48 24" stroke="#FFE08A" strokeWidth={0.7} opacity={0.26} />
        <Path d="M5 48C15 30 30 20 46 2" stroke="#E8FBFF" strokeWidth={0.9} fill="none" opacity={0.5} />
        {star4('d4', 40, 40, 1.6, '#FFFFFF', 0.8)}
      </>
    ));
    default: return null;
  }
}
