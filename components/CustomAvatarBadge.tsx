import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CustomAvatarLogoColor,
  getCustomAvatarById,
  getCustomAvatarGradientById,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';

type Props = {
  value?: string | null;
  avatarId?: string;
  gradientId?: string;
  logoColor?: CustomAvatarLogoColor;
  size?: number;
  style?: any;
};

export default function CustomAvatarBadge({ value, avatarId, gradientId, logoColor, size = 44, style }: Props) {
  const parsed = parseCustomAvatarValue(value);
  const resolvedAvatarId = avatarId ?? parsed?.avatarId;
  const resolvedGradientId = gradientId ?? parsed?.gradientId;
  const resolvedLogoColor = logoColor ?? parsed?.logoColor ?? 'black';
  const avatar = resolvedAvatarId ? getCustomAvatarById(resolvedAvatarId) : undefined;
  const gradient = (resolvedGradientId ? getCustomAvatarGradientById(resolvedGradientId) : undefined)
    ?? CUSTOM_AVATAR_GRADIENTS[0];
  const gid = React.useMemo(() => `customAvatarGradient${Math.round(Math.random() * 1_000_000)}`, []);
  const imageSize = Math.round(size * 0.84);
  const points = `${size * 0.5},${size * 0.035} ${size * 0.93},${size * 0.26} ${size * 0.93},${size * 0.74} ${size * 0.5},${size * 0.965} ${size * 0.07},${size * 0.74} ${size * 0.07},${size * 0.26}`;

  if (!avatar) return null;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient.colors[0]} />
            <Stop offset="0.52" stopColor={gradient.colors[1]} />
            <Stop offset="1" stopColor={gradient.colors[2]} />
          </LinearGradient>
        </Defs>
        <Polygon points={points} fill={`url(#${gid})`} stroke="rgba(255,255,255,0.58)" strokeWidth={Math.max(1, size * 0.035)} />
      </Svg>
      <Image
        source={avatar.image}
        style={{
          width: imageSize,
          height: imageSize,
          tintColor: resolvedLogoColor === 'white' ? '#FFFFFF' : '#070B12',
        }}
        resizeMode="contain"
      />
    </View>
  );
}
