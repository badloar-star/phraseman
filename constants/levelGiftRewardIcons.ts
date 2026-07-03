import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from './theme';

const LEVEL_GIFT_REWARD_ICON_KEYS = [
  'arena_extra_5',
  'chain_shield_1',
  'chain_shield_3',
  'choice_3_level',
  'club_boost_free',
  'cosmetic_avatar_aura',
  'cosmetic_avatar_common',
  'energy_full',
  'energy_plus1',
  'energy_plus2',
  'energy_plus3',
  'focus_10m_25',
  'focus_15m_50',
  'hint_1',
  'hint_3',
  'pack_voucher_48h',
  'prem_level_unlock_dark_logic',
  'prem_level_unlock_negotiator',
  'prem_level_unlock_peaky_blinders',
  'prem_level_unlock_royal_tea',
  'prem_level_unlock_wild_west',
  'prem_pack_48h',
  'prem_shards_10',
  'prem_shards_15',
  'prem_shards_20',
  'premium_cosmetic_aura',
  'premium_cosmetic_avatar',
  'premium_xp_bank_1000',
  'shards_10',
  'shards_3',
  'shards_6',
  'wager_discount_25',
  'xp_100',
  'xp_250',
  'xp_2x_24h',
  'xp_2x_48h',
  'xp_50',
  'xp_bank_150',
  'xp_bank_300',
  'xp_bank_600',
] as const;

export const LEVEL_GIFT_REWARD_ICON_IDS: readonly string[] = LEVEL_GIFT_REWARD_ICON_KEYS;

export type LevelGiftRewardIconId = typeof LEVEL_GIFT_REWARD_ICON_KEYS[number];

const FALLBACK_LEVEL_GIFT_REWARD_ICON_ID: LevelGiftRewardIconId = 'choice_3_level';
const DEFAULT_SHARD_ICON_THEME: ThemeMode = 'minimalDark';

const SHARD_GIFT_AMOUNTS: Partial<Record<LevelGiftRewardIconId, number>> = {
  shards_3: 3,
  shards_6: 6,
  shards_10: 10,
  prem_shards_10: 10,
  prem_shards_15: 15,
  prem_shards_20: 20,
};

const THEMED_SHARD_GIFT_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/shards/dark-80.webp'),
  gold: require('../assets/images/shards/gold-80.webp'),
  coral: require('../assets/images/shards/coral-80.webp'),
  minimalDark: require('../assets/images/shards/minimalDark-80.webp'),
  business: require('../assets/images/shards/business-80.webp'),
  businessLight: require('../assets/images/shards/businessLight-80.webp'),
  midnight: require('../assets/images/shards/midnight-80.webp'),
  ember: require('../assets/images/shards/ember-80.webp'),
  aurora: require('../assets/images/shards/aurora-80.webp'),
  volt: require('../assets/images/shards/volt-80.webp'),
};

const LEVEL_GIFT_REWARD_ICONS: Record<LevelGiftRewardIconId, ImageSourcePropType> = {
  arena_extra_5: require('../assets/images/level_gift_reward_icons/arena_extra_5.webp'),
  chain_shield_1: require('../assets/images/level_gift_reward_icons/chain_shield_1.webp'),
  chain_shield_3: require('../assets/images/level_gift_reward_icons/chain_shield_3.webp'),
  choice_3_level: require('../assets/images/level_gift_reward_icons/choice_3_level.webp'),
  club_boost_free: require('../assets/images/level_gift_reward_icons/club_boost_free.webp'),
  cosmetic_avatar_aura: require('../assets/images/level_gift_reward_icons/cosmetic_avatar_aura.webp'),
  cosmetic_avatar_common: require('../assets/images/level_gift_reward_icons/cosmetic_avatar_common.webp'),
  energy_full: require('../assets/images/level_gift_reward_icons/energy_full.webp'),
  energy_plus1: require('../assets/images/level_gift_reward_icons/energy_plus1.webp'),
  energy_plus2: require('../assets/images/level_gift_reward_icons/energy_plus2.webp'),
  energy_plus3: require('../assets/images/level_gift_reward_icons/energy_plus3.webp'),
  focus_10m_25: require('../assets/images/level_gift_reward_icons/focus_10m_25.webp'),
  focus_15m_50: require('../assets/images/level_gift_reward_icons/focus_15m_50.webp'),
  hint_1: require('../assets/images/level_gift_reward_icons/hint_1.webp'),
  hint_3: require('../assets/images/level_gift_reward_icons/hint_3.webp'),
  pack_voucher_48h: require('../assets/images/level_gift_reward_icons/pack_voucher_48h.webp'),
  prem_level_unlock_dark_logic: require('../assets/images/level_gift_reward_icons/prem_level_unlock_dark_logic.webp'),
  prem_level_unlock_negotiator: require('../assets/images/level_gift_reward_icons/prem_level_unlock_negotiator.webp'),
  prem_level_unlock_peaky_blinders: require('../assets/images/level_gift_reward_icons/prem_level_unlock_peaky_blinders.webp'),
  prem_level_unlock_royal_tea: require('../assets/images/level_gift_reward_icons/prem_level_unlock_royal_tea.webp'),
  prem_level_unlock_wild_west: require('../assets/images/level_gift_reward_icons/prem_level_unlock_wild_west.webp'),
  prem_pack_48h: require('../assets/images/level_gift_reward_icons/prem_pack_48h.webp'),
  prem_shards_10: require('../assets/images/level_gift_reward_icons/prem_shards_10.webp'),
  prem_shards_15: require('../assets/images/level_gift_reward_icons/prem_shards_15.webp'),
  prem_shards_20: require('../assets/images/level_gift_reward_icons/prem_shards_20.webp'),
  premium_cosmetic_aura: require('../assets/images/level_gift_reward_icons/premium_cosmetic_aura.webp'),
  premium_cosmetic_avatar: require('../assets/images/level_gift_reward_icons/premium_cosmetic_avatar.webp'),
  premium_xp_bank_1000: require('../assets/images/level_gift_reward_icons/premium_xp_bank_1000.webp'),
  shards_10: require('../assets/images/level_gift_reward_icons/shards_10.webp'),
  shards_3: require('../assets/images/level_gift_reward_icons/shards_3.webp'),
  shards_6: require('../assets/images/level_gift_reward_icons/shards_6.webp'),
  wager_discount_25: require('../assets/images/level_gift_reward_icons/wager_discount_25.webp'),
  xp_100: require('../assets/images/level_gift_reward_icons/xp_100.webp'),
  xp_250: require('../assets/images/level_gift_reward_icons/xp_250.webp'),
  xp_2x_24h: require('../assets/images/level_gift_reward_icons/xp_2x_24h.webp'),
  xp_2x_48h: require('../assets/images/level_gift_reward_icons/xp_2x_48h.webp'),
  xp_50: require('../assets/images/level_gift_reward_icons/xp_50.webp'),
  xp_bank_150: require('../assets/images/level_gift_reward_icons/xp_bank_150.webp'),
  xp_bank_300: require('../assets/images/level_gift_reward_icons/xp_bank_300.webp'),
  xp_bank_600: require('../assets/images/level_gift_reward_icons/xp_bank_600.webp'),
};

export const LEVEL_GIFT_REWARD_ICON_SOURCES: readonly ImageSourcePropType[] = [
  ...Object.values(LEVEL_GIFT_REWARD_ICONS),
  ...Object.values(THEMED_SHARD_GIFT_ICONS),
];

export function getLevelGiftRewardIcon(
  giftId: string | null | undefined,
  themeMode: ThemeMode = DEFAULT_SHARD_ICON_THEME,
): ImageSourcePropType {
  const shardAmount = SHARD_GIFT_AMOUNTS[giftId as LevelGiftRewardIconId] ?? 0;
  if (shardAmount > 0) {
    return THEMED_SHARD_GIFT_ICONS[themeMode] ?? THEMED_SHARD_GIFT_ICONS[DEFAULT_SHARD_ICON_THEME];
  }

  return (
    LEVEL_GIFT_REWARD_ICONS[giftId as LevelGiftRewardIconId] ??
    LEVEL_GIFT_REWARD_ICONS[FALLBACK_LEVEL_GIFT_REWARD_ICON_ID]
  );
}

/** Тематическая иконка осколка (награда-орб для сундука недели и др. shard-наград). */
export function getThemedShardIcon(themeMode: ThemeMode = DEFAULT_SHARD_ICON_THEME): ImageSourcePropType {
  return THEMED_SHARD_GIFT_ICONS[themeMode] ?? THEMED_SHARD_GIFT_ICONS[DEFAULT_SHARD_ICON_THEME];
}
