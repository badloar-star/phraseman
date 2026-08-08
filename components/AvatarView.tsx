import React, { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import LevelBadge from './LevelBadge';
import { getAvatarByIndex } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';
import CustomAvatarBadge from './CustomAvatarBadge';
import { parseCustomAvatarValue } from '../constants/custom_avatars';
import AvatarAura from './AvatarAura';
import { getLevelAvatarMaterial } from '../constants/avatar_level_materials';
import type { LevelAvatarMaterial } from '../constants/avatar_level_materials';
import LevelAvatarMaterialOverlay from './LevelAvatarMaterialOverlay';

interface Props {
  avatar?: string | null;
  totalXP?: number;
  level?: number;
  size?: number;
  style?: any;
  auraId?: string | null;
  /**
   * false → аура статична (без бесконечной анимации). Передавай в прокручиваемых
   * списках (лента/лиги/арена), где одновременно видно много аватарок, иначе каждая
   * крутит свой loop и греет телефон при скролле.
   */
  animateAura?: boolean;
  ownerActive?: boolean;
}

function AvatarImageWithFallback({
  source,
  size,
  fallbackLevel,
  overlayLevel,
  tint,
  material,
}: {
  source: any;
  size: number;
  fallbackLevel: number;
  overlayLevel: number;
  tint?: readonly [string, string];
  material?: LevelAvatarMaterial;
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
      <LevelAvatarMaterialOverlay size={size} level={overlayLevel} tint={tint} material={material} />
    </View>
  );
}

function AvatarView({ avatar, totalXP, level, size = 44, style, auraId, animateAura = true, ownerActive }: Props) {
  const resolvedLevel = level ?? (totalXP !== undefined ? getLevelFromXP(totalXP) : 1);
  const customAvatar = parseCustomAvatarValue(avatar);
  if (customAvatar) {
    return (
      <AvatarAura auraId={auraId} size={size} style={style} animate={animateAura} ownerActive={ownerActive}>
        <CustomAvatarBadge value={avatar} size={size} />
      </AvatarAura>
    );
  }
  const avatarIndex = avatar && /^\d+$/.test(avatar) ? parseInt(avatar) : resolvedLevel;
  const avatarDef = getAvatarByIndex(avatarIndex);
  const avatarImage = avatarDef?.image;
  const fallbackLevel = avatarImage ? resolvedLevel : avatarIndex;
  const material = getLevelAvatarMaterial(avatarIndex);

  return (
    <AvatarAura auraId={auraId} size={size} style={style} animate={animateAura} ownerActive={ownerActive}>
      {avatarImage
        ? <AvatarImageWithFallback source={avatarImage} size={size} fallbackLevel={fallbackLevel} overlayLevel={avatarIndex} tint={avatarDef?.tint} material={material} />
        : <LevelBadge level={fallbackLevel} size={size} />
      }
    </AvatarAura>
  );
}

export default memo(AvatarView);
