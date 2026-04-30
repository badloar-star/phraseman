import React from 'react';
import { Image, View } from 'react-native';
import LevelBadge from './LevelBadge';
import { getAvatarImageByIndex } from '../constants/avatars';
import { getLevelFromXP } from '../constants/theme';

interface Props {
  avatar?: string | null;  // числовой индекс аватара из приложения
  totalXP?: number;        // для LevelBadge если нет аватара
  level?: number;          // напрямую если уже вычислен
  size?: number;
  style?: any;
}

export default function AvatarView({ avatar, totalXP, level, size = 44, style }: Props) {
  const resolvedLevel = level ?? (totalXP !== undefined ? getLevelFromXP(totalXP) : 1);
  const avatarIndex = avatar && /^\d+$/.test(avatar) ? parseInt(avatar) : resolvedLevel;
  const avatarImage = getAvatarImageByIndex(avatarIndex);

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {avatarImage
        ? <Image source={avatarImage} style={{ width: size, height: size }} resizeMode="contain" />
        : <LevelBadge level={resolvedLevel} size={size} />
      }
    </View>
  );
}
