import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';

import { PREMIUM_AVATAR_AURA_ID } from '../constants/avatar_auras';
import AvatarAura from './AvatarAura';

type Props = {
  enabled: boolean;
  avatarSize: number;
  maskColor: string;
  children: React.ReactNode;
  style?: ViewStyle;
  animateShimmer?: boolean;
};

function PremiumAvatarHalo({
  enabled,
  avatarSize,
  children,
  style,
  animateShimmer = true,
}: Props) {
  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <AvatarAura auraId={PREMIUM_AVATAR_AURA_ID} size={avatarSize} style={style} animate={animateShimmer}>
      {children}
    </AvatarAura>
  );
}

export default memo(PremiumAvatarHalo);
