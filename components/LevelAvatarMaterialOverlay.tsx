import React from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  Stop,
} from 'react-native-svg';
import type { AvatarTextureId, LevelAvatarMaterial } from '../constants/avatar_level_materials';

const AVATAR_HEX_POINTS = '50,3.5 93,26 93,74 50,96.5 7,74 7,26';

function eliteAmount(level: number): number {
  const clamped = Math.max(1, Math.min(60, Math.round(level)));
  return (clamped - 1) / 59;
}

function renderTexture(texture: AvatarTextureId, accent: string, level: number) {
  const shift = (level % 7) * 2;
  const soft = '#FFFFFF';
  const shade = '#07110A';

  switch (texture) {
    case 'linen':
    case 'mesh':
    case 'fiber':
    case 'rain':
    case 'brushed':
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <Line key={`line-a-${i}`} x1={12 + i * 18} y1={15 - shift} x2={38 + i * 18} y2={91 + shift} stroke={soft} strokeOpacity={0.18} strokeWidth={1.4} />
          ))}
          {[0, 1, 2].map((i) => (
            <Line key={`line-b-${i}`} x1={8 + i * 28} y1={88 + shift} x2={42 + i * 28} y2={9 - shift} stroke={shade} strokeOpacity={0.13} strokeWidth={1.1} />
          ))}
        </>
      );
    case 'bubbles':
    case 'droplets':
    case 'sprinkles':
    case 'confetti':
    case 'stardust':
      return (
        <>
          <Circle cx={25 + shift} cy="28" r="4.2" fill={soft} opacity="0.24" />
          <Circle cx="67" cy={34 + shift} r="2.5" fill={soft} opacity="0.30" />
          <Circle cx={45 - shift} cy="73" r="3.2" fill={accent} opacity="0.25" />
          <Circle cx="75" cy={68 - shift} r="1.8" fill={soft} opacity="0.32" />
          <Line x1="25" y1="60" x2="34" y2="56" stroke={soft} strokeOpacity={0.22} strokeWidth="2" strokeLinecap="round" />
          <Line x1="61" y1="23" x2="70" y2="19" stroke={accent} strokeOpacity={0.30} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'waves':
    case 'topo':
    case 'marble':
    case 'pearlwave':
    case 'mercury':
      return (
        <>
          <Path d={`M8 ${35 + shift} C24 ${25 - shift}, 37 ${48 + shift}, 54 ${36 - shift} S80 ${27 + shift}, 94 40`} fill="none" stroke={soft} strokeOpacity={0.20} strokeWidth="2.2" />
          <Path d={`M9 ${54 - shift} C27 ${43 + shift}, 40 ${65 - shift}, 58 ${52 + shift} S82 ${42 - shift}, 94 56`} fill="none" stroke={accent} strokeOpacity={0.20} strokeWidth="2" />
          <Path d={`M11 ${72 + shift} C26 65, 38 78, 54 70 S80 62, 91 75`} fill="none" stroke={soft} strokeOpacity={0.15} strokeWidth="1.6" />
        </>
      );
    case 'prism':
    case 'mosaic':
    case 'facets':
    case 'crystal':
    case 'iceprism':
    case 'diamondnebula':
    case 'prime':
      return (
        <>
          <Polygon points="14,31 50,8 44,48" fill={soft} opacity="0.16" />
          <Polygon points="50,8 86,31 58,50 44,48" fill={accent} opacity="0.16" />
          <Polygon points="14,69 44,48 50,92" fill={shade} opacity="0.12" />
          <Polygon points="58,50 86,69 50,92" fill={soft} opacity="0.13" />
          <Line x1="50" y1="8" x2="50" y2="92" stroke={soft} strokeOpacity={0.12} strokeWidth="1" />
          <Line x1="14" y1="31" x2="86" y2="69" stroke={soft} strokeOpacity={0.11} strokeWidth="1" />
        </>
      );
    case 'carbon':
    case 'circuit':
    case 'copper':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <Line key={`grid-h-${i}`} x1="15" y1={30 + i * 16 + shift} x2="85" y2={30 + i * 16 + shift} stroke={soft} strokeOpacity={0.17} strokeWidth="1.2" />
          ))}
          {[0, 1, 2].map((i) => (
            <Line key={`grid-v-${i}`} x1={28 + i * 18 - shift} y1="17" x2={28 + i * 18 - shift} y2="83" stroke={shade} strokeOpacity={0.14} strokeWidth="1.1" />
          ))}
          <Circle cx="68" cy="34" r="2.7" fill={accent} opacity="0.32" />
          <Circle cx="33" cy="65" r="2.2" fill={soft} opacity="0.24" />
        </>
      );
    case 'glass':
    case 'chrome':
    case 'platinum':
    case 'titanium':
    case 'celestial':
      return (
        <>
          <Path d="M18 28 C36 18, 55 16, 80 27" fill="none" stroke={soft} strokeOpacity={0.30} strokeWidth="4" strokeLinecap="round" />
          <Path d="M24 72 C43 82, 60 78, 77 68" fill="none" stroke={shade} strokeOpacity={0.12} strokeWidth="5" strokeLinecap="round" />
          <Line x1="23" y1="38" x2="78" y2="22" stroke={soft} strokeOpacity={0.16} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case 'opal':
    case 'pearl':
    case 'moonstone':
    case 'plasma':
    case 'aurora':
    case 'auroraglass':
    case 'royalopal':
      return (
        <>
          <Path d={`M16 ${40 + shift} C30 18, 58 20, 82 33`} fill="none" stroke={soft} strokeOpacity={0.23} strokeWidth="3.4" strokeLinecap="round" />
          <Path d={`M18 ${62 - shift} C42 46, 56 75, 84 56`} fill="none" stroke={accent} strokeOpacity={0.25} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="37" cy="38" r="8" fill={soft} opacity="0.10" />
          <Circle cx="66" cy="62" r="11" fill={accent} opacity="0.11" />
        </>
      );
    case 'obsidian':
    case 'blackgold':
    case 'volcanic':
    case 'eclipse':
    case 'supernova':
      return (
        <>
          <Path d={`M19 ${76 - shift} L38 43 L30 23 L54 51 L72 19 L61 58 L84 ${78 - shift}`} fill="none" stroke={accent} strokeOpacity={0.24} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <Line x1="20" y1="30" x2="82" y2="70" stroke={soft} strokeOpacity={0.10} strokeWidth="2" />
          <Line x1="76" y1="28" x2="27" y2="74" stroke={soft} strokeOpacity={0.10} strokeWidth="2" />
        </>
      );
    case 'nebula':
    case 'quantum':
    case 'cosmicemerald':
      return (
        <>
          <Path d={`M16 ${54 + shift} C30 33, 72 33, 84 ${54 - shift}`} fill="none" stroke={soft} strokeOpacity={0.20} strokeWidth="2.2" />
          <Path d={`M24 ${70 - shift} C38 49, 63 49, 77 ${70 + shift}`} fill="none" stroke={accent} strokeOpacity={0.23} strokeWidth="2.2" />
          <Circle cx="33" cy="35" r="1.8" fill={soft} opacity="0.34" />
          <Circle cx="72" cy="44" r="1.4" fill={soft} opacity="0.28" />
          <Circle cx="54" cy="72" r="1.7" fill={accent} opacity="0.34" />
        </>
      );
    case 'grain':
    case 'clay':
    case 'satin':
    case 'paper':
    case 'terrazzo':
    case 'stripes':
    case 'enamel':
    case 'rays':
    case 'leaf':
    case 'foil':
    case 'jade':
    case 'relic':
    case 'frost':
    case 'silk':
    case 'velvet':
    default:
      return (
        <>
          <Line x1="20" y1={30 + shift} x2="80" y2={22 - shift} stroke={soft} strokeOpacity={0.17} strokeWidth="2.2" strokeLinecap="round" />
          <Line x1="17" y1={55 - shift} x2="84" y2={47 + shift} stroke={accent} strokeOpacity={0.18} strokeWidth="1.8" strokeLinecap="round" />
          <Line x1="25" y1="74" x2="75" y2="66" stroke={shade} strokeOpacity={0.12} strokeWidth="2" strokeLinecap="round" />
          <Circle cx={34 + shift} cy="39" r="2.5" fill={soft} opacity="0.20" />
          <Circle cx="66" cy={63 - shift} r="2" fill={soft} opacity="0.16" />
        </>
      );
  }
}

export default function LevelAvatarMaterialOverlay({
  size,
  level,
  tint,
  material,
}: {
  size: number;
  level: number;
  tint?: readonly [string, string];
  material?: LevelAvatarMaterial;
}) {
  const colors = material?.colors ?? (tint ? [tint[0], tint[1], tint[0]] as const : undefined);
  if (!colors) return null;

  const elite = eliteAmount(level);
  const tintOpacity = 0.52 + elite * 0.13;
  const textureOpacity = 0.24 + elite * 0.16;
  const accent = material?.accent ?? colors[0];
  const texture = material?.texture ?? 'glass';
  const suffix = `${Math.max(1, Math.min(60, Math.round(level)))}_${Math.round(size)}`;
  const gradientId = `avatarMaterial_${suffix}`;
  const clipId = `avatarMaterialClip_${suffix}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors[0]} stopOpacity={tintOpacity} />
          <Stop offset="0.52" stopColor={colors[1]} stopOpacity={tintOpacity * 0.96} />
          <Stop offset="1" stopColor={colors[2]} stopOpacity={tintOpacity} />
        </SvgLinearGradient>
        <ClipPath id={clipId}>
          <Polygon points={AVATAR_HEX_POINTS} />
        </ClipPath>
      </Defs>
      <Polygon points={AVATAR_HEX_POINTS} fill={`url(#${gradientId})`} />
      <G clipPath={`url(#${clipId})`} opacity={textureOpacity}>
        {renderTexture(texture, accent, level)}
      </G>
      <Path d="M19 29 L50 12 L81 29" fill="none" stroke="#FFFFFF" strokeOpacity={0.18 + elite * 0.10} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Polygon points={AVATAR_HEX_POINTS} fill="none" stroke={accent} strokeOpacity={0.22 + elite * 0.18} strokeWidth={1.1 + elite * 0.7} />
    </Svg>
  );
}
