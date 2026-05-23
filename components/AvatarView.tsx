import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import LevelBadge from './LevelBadge';
import { getAvatarImageByIndex } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import CustomAvatarBadge from './CustomAvatarBadge';
import { parseCustomAvatarValue } from '../constants/custom_avatars';
import AvatarAura from './AvatarAura';

interface Props {
  avatar?: string | null;  // числовой индекс аватара из приложения
  totalXP?: number;        // для LevelBadge если нет аватара
  level?: number;          // напрямую если уже вычислен
  size?: number;
  style?: any;
  auraId?: string | null;
}

function AvatarImageWithFallback({
  source,
  size,
  fallbackLevel,
}: {
  source: any;
  size: number;
  fallbackLevel: number;
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
    </View>
  );
}

export default function AvatarView({ avatar, totalXP, level, size = 44, style, auraId }: Props) {
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
  const avatarImage = getAvatarImageByIndex(avatarIndex);
  const fallbackLevel = avatarImage ? resolvedLevel : avatarIndex;

  return (
    <AvatarAura auraId={auraId} size={size} style={style}>
      {avatarImage
        ? <AvatarImageWithFallback source={avatarImage} size={size} fallbackLevel={fallbackLevel} />
        : <LevelBadge level={fallbackLevel} size={size} />
      }
    </AvatarAura>
  );
}
