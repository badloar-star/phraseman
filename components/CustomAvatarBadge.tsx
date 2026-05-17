import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import CustomAvatarSilhouette, { isCustomAvatarSilhouette } from './CustomAvatarSilhouette';
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
  const rimOffset = Math.max(1, Math.round(size * 0.018));
  const isWhiteLogo = resolvedLogoColor === 'white';
  const rimColor = isWhiteLogo ? '#38BDF8' : '#F8FAFC';
  const logoColorFinal = isWhiteLogo ? '#FFFFFF' : '#111827';
  const detailColorFinal = isWhiteLogo ? '#111827' : '#F8FAFC';
  const rimOpacity = isWhiteLogo ? 0.34 : 0.82;
  const rimOffsets: readonly (readonly [number, number])[] = [
    [-rimOffset, 0],
    [rimOffset, 0],
    [0, -rimOffset],
    [0, rimOffset],
  ];
  const points = '50,3.5 93,26 93,74 50,96.5 7,74 7,26';

  if (!avatar) return null;
  const renderSilhouette = isCustomAvatarSilhouette(avatar.id);

  if (renderSilhouette) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient.colors[0]} />
              <Stop offset="0.52" stopColor={gradient.colors[1]} />
              <Stop offset="1" stopColor={gradient.colors[2]} />
            </LinearGradient>
          </Defs>
          <Polygon points={points} fill={`url(#${gid})`} stroke="rgba(255,255,255,0.58)" strokeWidth={3.5} />
          <CustomAvatarSilhouette avatarId={avatar.id} primary={logoColorFinal} secondary={detailColorFinal} />
        </Svg>
      </View>
    );
  }

  const nativeImage = isWhiteLogo ? avatar.imageWhite : avatar.imageBlack;
  const imageSource = nativeImage ?? avatar.image;
  if (!imageSource) return null;
  const imageSize = Math.round(size * (nativeImage ? 0.9 : 0.84));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient.colors[0]} />
            <Stop offset="0.52" stopColor={gradient.colors[1]} />
            <Stop offset="1" stopColor={gradient.colors[2]} />
          </LinearGradient>
        </Defs>
        <Polygon points={points} fill={`url(#${gid})`} stroke="rgba(255,255,255,0.58)" strokeWidth={3.5} />
      </Svg>
      {!nativeImage && rimOffsets.map(([x, y]) => (
        <Image
          key={`${x}:${y}`}
          source={imageSource}
          style={{
            position: 'absolute',
            width: imageSize,
            height: imageSize,
            opacity: rimOpacity,
            tintColor: rimColor,
            transform: [{ translateX: x }, { translateY: y }],
          }}
          resizeMode="contain"
        />
      ))}
      <Image
        source={imageSource}
        style={{
          width: imageSize,
          height: imageSize,
          tintColor: nativeImage ? undefined : logoColorFinal,
        }}
        resizeMode="contain"
      />
    </View>
  );
}
