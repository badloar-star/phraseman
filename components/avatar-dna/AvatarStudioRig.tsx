import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { Avatar3DP0DNA } from '../../modules/avatar-dna-3d/contracts';

type Props = Readonly<{
  dna: Avatar3DP0DNA;
  size: number;
}>;

const faceGeometry = Object.freeze({
  'face.soft': { width: 112, jaw: 'M86 106C84 154 70 172 60 172C50 172 36 154 34 106Z' },
  'face.heart': { width: 108, jaw: 'M86 106C81 151 68 175 60 178C52 175 39 151 34 106Z' },
  'face.strong': { width: 120, jaw: 'M90 106L85 156L70 174H50L35 156L30 106Z' },
});

export const AvatarStudioRig = memo(function AvatarStudioRig({ dna, size }: Props) {
  const face = faceGeometry[dna.facePresetId];
  const hairIsShort = dna.hairId === 'hair.crop';
  const wearsHood = dna.headwearId === 'hood.assassin';
  const scale = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Предпросмотр персонажа"
      style={scale}
      testID="avatar-studio-rig"
    >
      <Svg width={size} height={size} viewBox="0 0 120 200">
        <Defs>
          <LinearGradient id="avatar-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FDF4EB" />
            <Stop offset="1" stopColor="#EAC4A7" />
          </LinearGradient>
          <RadialGradient id="skin" cx="38%" cy="26%" r="78%">
            <Stop offset="0" stopColor="#FFE8D6" stopOpacity="0.82" />
            <Stop offset="1" stopColor={dna.skinTone} />
          </RadialGradient>
          <LinearGradient id="outfit" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E96C3C" />
            <Stop offset="1" stopColor="#A93620" />
          </LinearGradient>
        </Defs>

        <Rect width="120" height="200" rx="22" fill="url(#avatar-bg)" />
        <Circle cx="60" cy="79" r="48" fill="#F5D1B5" opacity="0.72" />
        <Path d="M20 202V170C20 151 36 140 60 140C84 140 100 151 100 170V202Z" fill="url(#outfit)" />
        <Path d="M47 139V123H73V139" fill={dna.skinTone} />

        <Ellipse cx="60" cy="98" rx={face.width / 2} ry="59" fill="url(#skin)" />
        <Path d={face.jaw} fill={dna.skinTone} opacity="0.34" />
        <Ellipse cx="8" cy="101" rx="7" ry="11" fill={dna.skinTone} />
        <Ellipse cx="112" cy="101" rx="7" ry="11" fill={dna.skinTone} />

        {!wearsHood && (
          <>
            <Path
              d={hairIsShort
                ? 'M15 86C14 38 38 23 61 23C89 23 107 45 104 84C96 64 86 55 72 52C56 49 45 57 35 67C28 74 22 81 15 86Z'
                : 'M12 91C12 45 31 19 60 19C94 19 111 48 104 91C98 74 91 66 82 61C86 45 76 36 62 36C48 36 39 43 35 57C26 63 19 73 12 91Z'}
              fill={dna.hairColor}
            />
            {!hairIsShort && <Path d="M21 78C30 55 45 48 63 49C52 62 42 75 38 99C31 93 26 87 21 78Z" fill="#3D190E" opacity="0.66" />}
          </>
        )}

        <Path d="M32 84Q41 78 49 83" stroke="#4A251B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <Path d="M71 83Q79 78 88 84" stroke="#4A251B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <Ellipse testID="avatar-rig-eye-left" cx="42" cy="99" rx="10" ry="12" fill="#FFF9F1" />
        <Ellipse testID="avatar-rig-eye-right" cx="78" cy="99" rx="10" ry="12" fill="#FFF9F1" />
        <Circle cx="42" cy="101" r="6" fill="#422116" />
        <Circle cx="78" cy="101" r="6" fill="#422116" />
        <Circle cx="44" cy="98" r="1.8" fill="#FFFFFF" />
        <Circle cx="80" cy="98" r="1.8" fill="#FFFFFF" />
        <Path d="M60 103C56 112 55 120 60 122C65 120 64 112 60 103Z" fill="#C96E4C" opacity="0.7" />
        <Path d="M47 135Q60 144 73 135Q60 153 47 135Z" fill="#A84032" />
        <Path d="M50 136Q60 139 70 136" stroke="#F8C0B1" strokeWidth="1.6" strokeLinecap="round" />

        {wearsHood && (
          <>
            <Path d="M11 146C9 82 28 27 60 21C92 27 111 82 109 146L91 134C94 99 84 57 60 48C36 57 26 99 29 134Z" fill="#6D2F27" />
            <Path d="M28 134C26 92 38 55 60 45C82 55 94 92 92 134C84 122 75 115 60 113C45 115 36 122 28 134Z" fill="#3E1B1A" />
          </>
        )}
      </Svg>
    </View>
  );
});
