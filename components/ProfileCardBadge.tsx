import React, { memo } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { ENABLE_PROFILE_CARD } from '../app/config';
import {
  profileCardLevelRoman,
  resolveProfileCardDisplay,
} from '../app/profile_card_system';

type Props = {
  /** Raw stored card level (0–5). Anything <= 0 renders nothing. */
  level?: number | null;
  /** Raw stored card theme; only applied from level 2 (see resolveProfileCardDisplay). */
  theme?: string | null;
  /** 'sm' for tight list rows, 'md' for headers / wider rows. */
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

/**
 * Compact "CARD V" prestige pill shown next to a player's name in lists (friends, arena
 * leaderboard, club roster) and the arena/PvP versus screen. This is the public payoff
 * of upgrading the profile card: previously the level was synced and stored but never
 * drawn in any list — so a higher card gave the owner no visible status anywhere except
 * deep inside the profile modal. Level 0 renders null to keep lists clean.
 */
function ProfileCardBadge({ level, theme, size = 'sm', style }: Props) {
  // Gated on the same kill-switch as the upgrade flow: flipping ENABLE_PROFILE_CARD off
  // must remove the public footprint everywhere (lists still carry synced levels), not
  // just block new upgrades.
  if (!ENABLE_PROFILE_CARD) return null;
  const { level: cardLevel, colors } = resolveProfileCardDisplay({ level, theme });
  if (cardLevel <= 0) return null;

  const compact = size === 'sm';
  const fontSize = compact ? 9 : 10;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Card level ${cardLevel}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          borderRadius: 999,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.accentStrong,
          paddingHorizontal: compact ? 6 : 8,
          paddingVertical: compact ? 2 : 3,
          shadowColor: colors.shadowColor,
          shadowOpacity: cardLevel >= 3 ? 0.5 : 0,
          shadowRadius: cardLevel >= 3 ? 5 : 0,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    >
      <Text style={{ color: colors.accent, fontSize, fontWeight: '900', letterSpacing: 0.4 }}>
        CARD {profileCardLevelRoman(cardLevel)}
      </Text>
    </View>
  );
}

export default memo(ProfileCardBadge);
