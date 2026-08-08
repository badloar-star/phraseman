import React, { memo } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ENABLE_PROFILE_CARD } from '../app/config';
import { useLang } from './LangContext';
import { resolveProfileCardDisplay } from '../app/profile_card_system';
import { profileCardLevelLabel } from './profileCardLabel';

type Props = {
  /** Raw stored card level (0 or 1). Anything <= 0 renders nothing. */
  level?: number | null;
  /** Raw stored card theme; kept only for legacy synced payloads. */
  theme?: string | null;
  /** 'sm' for tight list rows, 'md' for headers / wider rows. */
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

/**
 * Compact prestige pill shown next to a player's name in lists (friends,
 * leaderboard and club roster). The label is the localized
 * level name (Russian product names, or "Lv N" elsewhere) — no "CARD" prefix. This is the public payoff
 * of upgrading the profile card: previously the level was synced and stored but never
 * drawn in any list — so a higher card gave the owner no visible status anywhere except
 * deep inside the profile modal. Level 0 renders null to keep lists clean.
 */
function ProfileCardBadge({ level, theme, size = 'sm', style }: Props) {
  const { lang } = useLang();
  // Gated on the same kill-switch as the upgrade flow: flipping ENABLE_PROFILE_CARD off
  // must remove the public footprint everywhere (lists still carry synced levels), not
  // just block new upgrades.
  if (!ENABLE_PROFILE_CARD) return null;
  const { level: cardLevel, colors } = resolveProfileCardDisplay({ level, theme });
  if (cardLevel <= 0) return null;

  const compact = size === 'sm';
  const fontSize = compact ? 9 : 10;
  const iconSize = compact ? 9 : 11;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Card level ${cardLevel}`}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          alignSelf: 'flex-start',
          borderRadius: 999,
          backgroundColor: colors.accentSoft,
          borderWidth: 0,
          borderColor: colors.accentStrong,
          paddingHorizontal: compact ? 6 : 8,
          paddingVertical: compact ? 2 : 3,
          shadowColor: colors.shadowColor,
          shadowOpacity: 0.42,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    >
      <Ionicons name="sparkles" size={iconSize} color={colors.accent} />
      <Text style={{ color: colors.accent, fontSize, fontWeight: '900', letterSpacing: 0.4 }}>
        {profileCardLevelLabel(cardLevel, lang === 'ru')}
      </Text>
    </View>
  );
}

export default memo(ProfileCardBadge);
