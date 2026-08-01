import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
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
  return <Defs>
    <RadialGradient id={ids.spectral} cx="50%" cy="50%" rx="50%" ry="50%">
      <Stop offset="0" stopColor={first} stopOpacity={0.16} />
      <Stop offset="0.5" stopColor={second} stopOpacity={0.1} />
      <Stop offset="1" stopColor={third} stopOpacity={0} />
    </RadialGradient>
    <RadialGradient id={ids.core} cx="36%" cy="28%" rx="64%" ry="68%">
      <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.92} />
      <Stop offset="0.24" stopColor={first} stopOpacity={0.76} />
      <Stop offset="0.66" stopColor={second} stopOpacity={0.26} />
      <Stop offset="1" stopColor={third} stopOpacity={0} />
    </RadialGradient>
    <LinearGradient id={ids.edge} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor={first} stopOpacity={0.68} />
      <Stop offset="0.48" stopColor={third} stopOpacity={0.48} />
      <Stop offset="1" stopColor={second} stopOpacity={0.1} />
    </LinearGradient>
  </Defs>;
}

function OpalNimbus({ ids }: Pick<AuraSceneProps, 'ids'>) {
  return <G>
    <Circle cx="100" cy="100" r="93" fill={`url(#${ids.spectral})`} opacity={0.9} />
    <Ellipse cx="99" cy="31" rx="47" ry="27" fill={`url(#${ids.core})`} opacity={0.78} />
    <Ellipse cx="41" cy="119" rx="30" ry="45" fill={`url(#${ids.edge})`} opacity={0.62} transform="rotate(-26 41 119)" />
    <Ellipse cx="161" cy="118" rx="31" ry="46" fill={`url(#${ids.core})`} opacity={0.56} transform="rotate(28 161 118)" />
    <Circle cx="100" cy="171" r="28" fill={`url(#${ids.edge})`} opacity={0.34} />
  </G>;
}

function SolarCrown({ ids }: Pick<AuraSceneProps, 'ids'>) {
  return <G>
    <Circle cx="100" cy="100" r="92" fill={`url(#${ids.spectral})`} opacity={0.82} />
    <Ellipse cx="100" cy="28" rx="42" ry="25" fill={`url(#${ids.core})`} opacity={0.92} />
    <Circle cx="52" cy="61" r="26" fill={`url(#${ids.edge})`} opacity={0.68} />
    <Circle cx="148" cy="61" r="26" fill={`url(#${ids.core})`} opacity={0.62} />
    <Ellipse cx="58" cy="151" rx="29" ry="22" fill={`url(#${ids.core})`} opacity={0.5} transform="rotate(-32 58 151)" />
    <Ellipse cx="143" cy="151" rx="29" ry="22" fill={`url(#${ids.edge})`} opacity={0.48} transform="rotate(32 143 151)" />
  </G>;
}

function VelvetBloom({ ids }: Pick<AuraSceneProps, 'ids'>) {
  return <G>
    <Circle cx="100" cy="100" r="93" fill={`url(#${ids.spectral})`} opacity={0.82} />
    <Ellipse cx="100" cy="37" rx="34" ry="46" fill={`url(#${ids.core})`} opacity={0.72} />
    <Ellipse cx="162" cy="100" rx="45" ry="32" fill={`url(#${ids.edge})`} opacity={0.68} />
    <Ellipse cx="100" cy="163" rx="34" ry="46" fill={`url(#${ids.core})`} opacity={0.58} />
    <Ellipse cx="38" cy="100" rx="45" ry="32" fill={`url(#${ids.edge})`} opacity={0.56} />
    <Circle cx="146" cy="49" r="20" fill={`url(#${ids.core})`} opacity={0.3} />
  </G>;
}

function JadeTide({ ids }: Pick<AuraSceneProps, 'ids'>) {
  return <G>
    <Circle cx="100" cy="100" r="93" fill={`url(#${ids.spectral})`} opacity={0.84} />
    <Ellipse cx="101" cy="35" rx="62" ry="22" fill={`url(#${ids.core})`} opacity={0.76} transform="rotate(12 101 35)" />
    <Ellipse cx="165" cy="111" rx="25" ry="56" fill={`url(#${ids.edge})`} opacity={0.68} transform="rotate(26 165 111)" />
    <Ellipse cx="91" cy="170" rx="60" ry="23" fill={`url(#${ids.core})`} opacity={0.56} transform="rotate(-12 91 170)" />
    <Ellipse cx="35" cy="91" rx="25" ry="54" fill={`url(#${ids.edge})`} opacity={0.56} transform="rotate(-28 35 91)" />
  </G>;
}

function RoseSatin({ ids }: Pick<AuraSceneProps, 'ids'>) {
  return <G>
    <Circle cx="100" cy="100" r="93" fill={`url(#${ids.spectral})`} opacity={0.84} />
    <Ellipse cx="73" cy="43" rx="44" ry="29" fill={`url(#${ids.core})`} opacity={0.76} transform="rotate(-28 73 43)" />
    <Ellipse cx="151" cy="78" rx="30" ry="48" fill={`url(#${ids.edge})`} opacity={0.68} transform="rotate(32 151 78)" />
    <Ellipse cx="119" cy="158" rx="45" ry="29" fill={`url(#${ids.core})`} opacity={0.62} transform="rotate(-28 119 158)" />
    <Ellipse cx="43" cy="126" rx="28" ry="43" fill={`url(#${ids.edge})`} opacity={0.52} transform="rotate(28 43 126)" />
  </G>;
}

function SceneGeometry({ preset, ids }: Pick<AuraSceneProps, 'preset' | 'ids'>) {
  switch (preset.material) {
    case 'nimbus': return <OpalNimbus ids={ids} />;
    case 'crown': return <SolarCrown ids={ids} />;
    case 'velvet': return <VelvetBloom ids={ids} />;
    case 'jade': return <JadeTide ids={ids} />;
    case 'satin': return <RoseSatin ids={ids} />;
  }
}

export function AuraScene({ preset, size, ids }: AuraSceneProps) {
  return <Svg width={size} height={size} viewBox="0 0 200 200">
    <SpectralDefs preset={preset} ids={ids} />
    <SceneGeometry preset={preset} ids={ids} />
  </Svg>;
}
