import React from 'react';
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

  return (
    <AvatarAura auraId={auraId} size={size} style={style}>
      {avatarImage
        ? <Image source={avatarImage} style={{ width: size, height: size }} contentFit="contain" />
        : <LevelBadge level={resolvedLevel} size={size} />
      }
    </AvatarAura>
  );
}
