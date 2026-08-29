import React, { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import Avatar100Portrait, {
  AVATAR100_HEX_STROKE,
  AVATAR100_HEX_STROKE_WIDTH,
  AVATAR100_LOWER_V_POINTS,
  avatar100FitFor,
} from './Avatar100Portrait';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CustomAvatarLogoColor,
  CustomAvatarArtVersion,
  getCustomAvatarArtSource,
  getCustomAvatarById,
  getCustomAvatarGradientById,
  parseCustomAvatarValue,
} from '../constants/custom_avatars';

type Props = {
  value?: string | null;
  avatarId?: string;
  gradientId?: string;
  logoColor?: CustomAvatarLogoColor;
  artVersion?: CustomAvatarArtVersion;
  size?: number;
  style?: any;
};

type AvatarImageFit = {
  scale: number;
  translateX?: number;
  translateY?: number;
};

const DEFAULT_NATIVE_IMAGE_FIT: AvatarImageFit = { scale: 1.1 };

const CUSTOM_AVATAR_IMAGE_FITS: Record<string, AvatarImageFit> = {
  'custom-gen-01': { scale: 1.08 },
  'custom-gen-02': { scale: 1.13 },
  'custom-gen-03': { scale: 1.08 },
  'custom-gen-04': { scale: 1.08 },
  'custom-gen-05': { scale: 1.09 },
  'custom-gen-06': { scale: 1.08 },
  'custom-gen-07': { scale: 1.11 },
  'custom-gen-08': { scale: 1.08 },
  'custom-gen-09': { scale: 1.08 },
  'custom-gen-10': { scale: 1.08 },
  'custom-gen-11': { scale: 1.28 },
  'custom-gen-12': { scale: 1.25 },
  'custom-gen-13': { scale: 1.28 },
  'custom-gen-14': { scale: 1.18 },
  'custom-gen-15': { scale: 1.12 },
  'custom-gen-16': { scale: 1.08 },
  'custom-gen-17': { scale: 1.26 },
  'custom-gen-18': { scale: 1.2 },
  'custom-gen-19': { scale: 1.22 },
  'custom-gen-20': { scale: 1.07 },
  'custom-gen-21': { scale: 1.06 },
  'custom-gen-22': { scale: 1.07 },
  'custom-gen-23': { scale: 1.04 },
  'custom-gen-24': { scale: 1.13 },
  'custom-gen-25': { scale: 1.24 },
  'custom-gen-26': { scale: 1.17 },
  'custom-gen-27': { scale: 1.1 },
  'custom-gen-28': { scale: 1.07 },
  'custom-gen-29': { scale: 1.13 },
  'custom-gen-30': { scale: 1.05 },
  'custom-gen-31': { scale: 1.08 },
  'custom-gen-32': { scale: 1.08 },
  'custom-gen-33': { scale: 1.08 },
  'custom-gen-34': { scale: 1.08 },
  'custom-gen-35': { scale: 1.08 },
  'custom-gen-36': { scale: 1.08 },
  'custom-gen-37': { scale: 1.08 },
  'custom-gen-38': { scale: 1.08 },
  'custom-gen-39': { scale: 1.08 },
  'custom-gen-40': { scale: 1.08 },
  'custom-gen-41': { scale: 1.16 },
  'custom-gen-42': { scale: 1.2 },
  'custom-gen-43': { scale: 1.18 },
  'custom-gen-44': { scale: 1.2 },
  'custom-gen-45': { scale: 1.18 },
  'custom-gen-46': { scale: 1.2 },
  'custom-gen-47': { scale: 1.18 },
  'custom-gen-48': { scale: 1.18 },
  'custom-gen-49': { scale: 1.16 },
  'custom-gen-50': { scale: 1.18 },
  'custom-gen-51': { scale: 1.2 },
  'custom-gen-52': { scale: 1.15 },
  'custom-gen-53': { scale: 1.18 },
  'custom-gen-54': { scale: 1.15 },
  'custom-gen-55': { scale: 1.18 },
  'custom-gen-56': { scale: 1.18 },
  'custom-gen-57': { scale: 1.18 },
  'custom-gen-58': { scale: 1.16 },
  'custom-gen-59': { scale: 1.18 },
  'custom-gen-60': { scale: 1.18 },
  'custom-gen-61': { scale: 1.15 },
  'custom-gen-62': { scale: 1.17 },
};

function CustomAvatarImageWithFallback({
  source,
  style,
  contentFit,
  fallbackSize,
  fallbackColor,
}: {
  source: any;
  style: any;
  contentFit: 'contain';
  fallbackSize: number;
  fallbackColor: string;
}) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <>
      {!loaded ? (
        <Ionicons
          name="sparkles"
          size={Math.max(14, Math.round(fallbackSize * 0.45))}
          color={fallbackColor}
          style={{ position: 'absolute', opacity: 0.9 }}
        />
      ) : null}
      <Image
        source={source}
        style={style}
        contentFit={contentFit}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </>
  );
}

function CustomAvatarBadge({ value, avatarId, gradientId, logoColor, artVersion, size = 44, style }: Props) {
  const parsed = parseCustomAvatarValue(value);
  const resolvedAvatarId = avatarId ?? parsed?.avatarId;
  const resolvedGradientId = gradientId ?? parsed?.gradientId;
  const resolvedLogoColor = logoColor ?? parsed?.logoColor ?? 'white';
  const resolvedArtVersion = artVersion ?? parsed?.artVersion;
  const avatar = resolvedAvatarId ? getCustomAvatarById(resolvedAvatarId) : undefined;
  const gradient = (resolvedGradientId ? getCustomAvatarGradientById(resolvedGradientId) : undefined)
    ?? CUSTOM_AVATAR_GRADIENTS[0];
  const gid = React.useMemo(() => `customAvatarGradient${Math.round(Math.random() * 1_000_000)}`, []);
  const rimOffset = Math.max(1, Math.round(size * 0.018));
  const isWhiteLogo = resolvedLogoColor === 'white';
  const rimColor = isWhiteLogo ? '#38BDF8' : '#F8FAFC';
  const logoColorFinal = isWhiteLogo ? '#FFFFFF' : '#111827';
  const rimOpacity = isWhiteLogo ? 0.34 : 0.82;
  const rimOffsets: readonly (readonly [number, number])[] = [
    [-rimOffset, 0],
    [rimOffset, 0],
    [0, -rimOffset],
    [0, rimOffset],
  ];
  const points = '50,3.5 93,26 93,74 50,96.5 7,74 7,26';

  if (!avatar) return null;
  const nativeImage = getCustomAvatarArtSource(avatar.id, resolvedLogoColor, resolvedArtVersion);
  const imageSource = nativeImage ?? avatar.image;
  if (!imageSource) return null;

  // зачем: у Avatar100 своя геометрия из макета-эталона — единый силуэт, нижняя V
  // поверх портрета, верх поверх боковых линий. Старый арт продолжает рисоваться
  // прежним путём ниже, поэтому купленные раньше аватары выглядят как и выглядели.
  const avatar100Fit = nativeImage ? avatar100FitFor(avatar.id, resolvedLogoColor) : undefined;
  const avatar100Uri = typeof (nativeImage as { uri?: string } | undefined)?.uri === 'string'
    ? (nativeImage as { uri: string }).uri
    : undefined;
  if (avatar100Fit && avatar100Uri) {
    return (
      <View style={[{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
      }, style]}>
        {/* Слой 0 — гекс с общим градиентом (для black и white он один и тот же). */}
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
          <Defs>
            <LinearGradient id={gid} x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor={gradient.colors[0]} />
              <Stop offset="0.52" stopColor={gradient.colors[1]} />
              <Stop offset="1" stopColor={gradient.colors[2]} />
            </LinearGradient>
          </Defs>
          <Polygon
            points={points}
            fill={`url(#${gid})`}
            stroke={AVATAR100_HEX_STROKE}
            strokeWidth={AVATAR100_HEX_STROKE_WIDTH}
          />
        </Svg>

        {/* Слой 1 — тело портрета: под линиями гекса, обрезано нижней V. */}
        <Avatar100Portrait uri={avatar100Uri} size={size} fit={avatar100Fit} zone="body" />

        {/* Слой 2 — нижняя V поверх портрета: ниже неё тело не выходит. */}
        <Svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          <Polyline
            points={AVATAR100_LOWER_V_POINTS}
            fill="none"
            stroke={AVATAR100_HEX_STROKE}
            strokeWidth={AVATAR100_HEX_STROKE_WIDTH}
            strokeLinejoin="miter"
          />
        </Svg>

        {/* Слой 3 — верх портрета поверх линий: морда, уши и крылья не режутся. */}
        <Avatar100Portrait uri={avatar100Uri} size={size} fit={avatar100Fit} zone="upper" />
      </View>
    );
  }
  const imageFit = nativeImage && resolvedAvatarId
    ? (CUSTOM_AVATAR_IMAGE_FITS[resolvedAvatarId] ?? DEFAULT_NATIVE_IMAGE_FIT)
    : { scale: 1 };
  const imageSize = Math.round(size * (nativeImage ? imageFit.scale : 0.84));
  const imageTranslateX = Math.round(size * (imageFit.translateX ?? 0));
  const imageTranslateY = Math.round(size * (imageFit.translateY ?? 0));
  const centeredImageLayerStyle = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View style={[{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'visible',
    }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={gid} x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={gradient.colors[0]} />
            <Stop offset="0.52" stopColor={gradient.colors[1]} />
            <Stop offset="1" stopColor={gradient.colors[2]} />
          </LinearGradient>
        </Defs>
        <Polygon points={points} fill={`url(#${gid})`} stroke="rgba(255,255,255,0.58)" strokeWidth={3.5} />
      </Svg>
      {!nativeImage && rimOffsets.map(([x, y]) => (
        <View key={`${x}:${y}`} pointerEvents="none" style={centeredImageLayerStyle}>
          <Image
            source={imageSource}
            style={{
              width: imageSize,
              height: imageSize,
              opacity: rimOpacity,
              tintColor: rimColor,
              transform: [{ translateX: x }, { translateY: y }],
            }}
            contentFit="contain"
          />
        </View>
      ))}
      <View pointerEvents="none" style={centeredImageLayerStyle}>
        <CustomAvatarImageWithFallback
          source={imageSource}
          style={{
            width: imageSize,
            height: imageSize,
            tintColor: nativeImage ? undefined : logoColorFinal,
            transform: [{ translateX: imageTranslateX }, { translateY: imageTranslateY }],
          }}
          contentFit="contain"
          fallbackSize={size}
          fallbackColor={logoColorFinal}
        />
      </View>
    </View>
  );
}

export default memo(CustomAvatarBadge);
