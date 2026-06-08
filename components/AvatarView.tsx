import React, { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import LevelBadge from './LevelBadge';
import { getAvatarByIndex, getAvatarImageByIndex } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import CustomAvatarBadge from './CustomAvatarBadge';
import { parseCustomAvatarValue } from '../constants/custom_avatars';
import AvatarAura from './AvatarAura';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Polygon } from 'react-native-svg';

interface Props {
  avatar?: string | null;
  totalXP?: number;
  level?: number;
  size?: number;
  style?: any;
  auraId?: string | null;
}

function AvatarImageWithFallback({
  source,
  size,
  fallbackLevel,
  tint,
}: {
  source: any;
  size: number;
  fallbackLevel: number;
  tint?: readonly [string, string];
}) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [source]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {!loaded ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0 }}>
          <LevelBadge level={fallbackLevel} size={size} centeredNumber />
        </View>
      ) : null}
      <Image
        source={source}
        style={{ width: size, height: size }}
        contentFit="contain"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
      {tint ? (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          <Defs>
            <SvgLinearGradient id="avatarTint" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={tint[0]} stopOpacity="0.5" />
              <Stop offset="1" stopColor={tint[1]} stopOpacity="0.5" />
            </SvgLinearGradient>
          </Defs>
          <Polygon points="50,3.5 93,26 93,74 50,96.5 7,74 7,26" fill="url(#avatarTint)" />
        </Svg>
      ) : null}
    </View>
  );
}

function AvatarView({ avatar, totalXP, level, size = 44, style, auraId }: Props) {
  const resolvedLevel = level ?? (totalXP !== undefined ? getLevelFromXP(totalXP) : 1);
  const customAvatar = parseCustomAvatarValue(avatar);
  if (customAvatar) {
    return (
      <AvatarAura auraId={auraId} size={size} style={style}>
        <CustomAvatarBadge value={avatar} size={size} />
      </AvatarAura>
    );
  }
  const avatarIndex = avatar && /^\d+$/.test(avatar) ? parseInt(avatar) : resolvedLevel;
  const avatarDef = getAvatarByIndex(avatarIndex);
  const avatarImage = avatarDef?.image;
  const fallbackLevel = avatarImage ? resolvedLevel : avatarIndex;

  return (
    <AvatarAura auraId={auraId} size={size} style={style}>
      {avatarImage
        ? <AvatarImageWithFallback source={avatarImage} size={size} fallbackLevel={fallbackLevel} tint={avatarDef?.tint} />
        : <LevelBadge level={fallbackLevel} size={size} />
      }
    </AvatarAura>
  );
}

export default memo(AvatarView);
