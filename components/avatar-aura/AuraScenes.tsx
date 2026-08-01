import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { AuraPreset, AuraSvgIds } from './types';

interface AuraSceneProps {
  preset: AuraPreset;
  size: number;
  ids: AuraSvgIds;
  detail: 'hero' | 'thumbnail';
}

function SpectralDefs({ preset, ids }: Pick<AuraSceneProps, 'preset' | 'ids'>) {
  const [first, second, third] = preset.colors;
  return (
    <Defs>
      <RadialGradient id={ids.spectral} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0" stopColor={first} stopOpacity={0.54} />
        <Stop offset="0.46" stopColor={second} stopOpacity={0.2} />
        <Stop offset="1" stopColor={third} stopOpacity={0} />
      </RadialGradient>
      <RadialGradient id={ids.core} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.92} />
        <Stop offset="0.3" stopColor={first} stopOpacity={0.8} />
        <Stop offset="1" stopColor={second} stopOpacity={0.08} />
      </RadialGradient>
      <LinearGradient id={ids.edge} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={first} stopOpacity={0.2} />
        <Stop offset="0.5" stopColor={third} stopOpacity={0.92} />
        <Stop offset="1" stopColor={second} stopOpacity={0.26} />
      </LinearGradient>
    </Defs>
  );
}

function PrismOracle({ ids, detail }: Pick<AuraSceneProps, 'ids' | 'detail'>) {
  const thin = detail === 'hero' ? 2.4 : 2;
  return <G>
    <Polygon points="100,18 182,61 166,156 100,190 34,156 18,61" fill="none" stroke={`url(#${ids.edge})`} strokeWidth={thin} />
    <Polygon points="100,42 157,72 147,138 100,164 53,138 43,72" fill="none" stroke="#D5FBFF" strokeOpacity={0.54} strokeWidth={thin} />
    <Path d="M28 100 L100 18 L172 100 L100 182 Z M28 100 H172 M100 18 V182" fill="none" stroke={`url(#${ids.edge})`} strokeWidth={thin} />
    <Circle cx="100" cy="100" r="25" fill={`url(#${ids.core})`} />
    <Circle cx="100" cy="100" r="39" fill="none" stroke="#DFFFFF" strokeOpacity={0.48} strokeWidth={thin} />
  </G>;
}

function NeonLotus({ ids, detail }: Pick<AuraSceneProps, 'ids' | 'detail'>) {
  const strokeWidth = detail === 'hero' ? 3 : 2.2;
  return <G fill="none" strokeLinecap="round">
    {[0, 45, 90, 135].map((rotation) => <Path key={rotation} d="M100 100 C68 92 50 56 100 25 C150 56 132 92 100 100 Z" transform={`rotate(${rotation} 100 100)`} stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />)}
    <Circle cx="100" cy="100" r="48" stroke="#FFD5F2" strokeOpacity={0.35} strokeWidth={strokeWidth} />
    <Circle cx="100" cy="100" r="19" fill={`url(#${ids.core})`} />
    <Circle cx="100" cy="100" r="70" stroke={`url(#${ids.edge})`} strokeOpacity={0.58} strokeWidth={strokeWidth} />
  </G>;
}

function Chronosigil({ ids, detail }: Pick<AuraSceneProps, 'ids' | 'detail'>) {
  const strokeWidth = detail === 'hero' ? 3 : 2.1;
  return <G fill="none" strokeLinecap="round">
    <Circle cx="100" cy="100" r="70" stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
    <Circle cx="100" cy="100" r="54" stroke="#FFE6B5" strokeOpacity={0.38} strokeWidth={strokeWidth} strokeDasharray="4 9" />
    {[0, 90, 180, 270].map((rotation) => <Path key={rotation} d="M100 21 V37 M100 163 V179" transform={`rotate(${rotation} 100 100)`} stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth + 1} />)}
    <Path d="M100 61 V100 L130 120" stroke="#FFF1D0" strokeWidth={strokeWidth + 1} />
    <Polygon points="100,73 124,100 100,127 76,100" fill={`url(#${ids.core})`} stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
  </G>;
}

function VelvetEclipse({ ids, detail }: Pick<AuraSceneProps, 'ids' | 'detail'>) {
  const strokeWidth = detail === 'hero' ? 3 : 2.1;
  return <G>
    <Circle cx="92" cy="100" r="57" fill="#10091B" stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
    <Circle cx="114" cy="91" r="52" fill="#140B22" />
    <Path d="M53 143 A72 72 0 1 0 142 31" fill="none" stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
    <Path d="M35 120 C62 176 145 184 172 113" fill="none" stroke="#F1D6FF" strokeOpacity={0.4} strokeWidth={strokeWidth} />
    <Circle cx="55" cy="60" r="4" fill="#FAD9FF" />
    <Circle cx="150" cy="145" r="5" fill="#FFB6CF" />
  </G>;
}

function JadeCathedral({ ids, detail }: Pick<AuraSceneProps, 'ids' | 'detail'>) {
  const strokeWidth = detail === 'hero' ? 3 : 2.1;
  return <G fill="none" strokeLinecap="round">
    <Path d="M34 166 V82 L64 42 L100 18 L136 42 L166 82 V166" stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
    <Path d="M57 166 V92 L100 47 L143 92 V166 M76 166 V103 L100 78 L124 103 V166" stroke="#CCFFE4" strokeOpacity={0.52} strokeWidth={strokeWidth} />
    <Path d="M34 166 H166 M49 145 H151" stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
    <Rect x="88" y="111" width="24" height="55" rx="12" fill={`url(#${ids.core})`} stroke={`url(#${ids.edge})`} strokeWidth={strokeWidth} />
    <Circle cx="100" cy="55" r="9" fill="#E4FFF1" fillOpacity={0.8} />
  </G>;
}

function SceneGeometry({ preset, ids, detail }: Pick<AuraSceneProps, 'preset' | 'ids' | 'detail'>) {
  switch (preset.id) {
    case 'prism-oracle': return <PrismOracle ids={ids} detail={detail} />;
    case 'neon-lotus': return <NeonLotus ids={ids} detail={detail} />;
    case 'chronosigil': return <Chronosigil ids={ids} detail={detail} />;
    case 'velvet-eclipse': return <VelvetEclipse ids={ids} detail={detail} />;
    case 'jade-cathedral': return <JadeCathedral ids={ids} detail={detail} />;
  }
}

export function AuraScene({ preset, size, ids, detail }: AuraSceneProps) {
  return <Svg width={size} height={size} viewBox="0 0 200 200">
    <SpectralDefs preset={preset} ids={ids} />
    <Circle cx="100" cy="100" r="98" fill={`url(#${ids.spectral})`} />
    <Circle cx="100" cy="100" r="82" fill="none" stroke={`url(#${ids.edge})`} strokeOpacity={0.2} strokeWidth="1.4" />
    <SceneGeometry preset={preset} ids={ids} detail={detail} />
  </Svg>;
}
