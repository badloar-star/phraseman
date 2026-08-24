import type { ImageSourcePropType } from 'react-native';
import type { LevelSpinRewardId } from './level_spin_reward_catalog';

/**
 * Universal Level Spin reward art. These assets deliberately do not vary by
 * interface theme: each family carries its own restrained material accent.
 */
export const LEVEL_SPIN_REWARD_IMAGE_SOURCES = Object.freeze({
  xp_250: require('../assets/images/level-spin-rewards/xp_250.webp'),
  xp_500: require('../assets/images/level-spin-rewards/xp_500.webp'),
  xp_1000: require('../assets/images/level-spin-rewards/xp_1000.webp'),
  xp_3000: require('../assets/images/level-spin-rewards/xp_3000.webp'),
  xp_5000: require('../assets/images/level-spin-rewards/xp_5000.webp'),
  xp_10000: require('../assets/images/level-spin-rewards/xp_10000.webp'),
  xp_25000: require('../assets/images/level-spin-rewards/xp_25000.webp'),
  xp_50000: require('../assets/images/level-spin-rewards/xp_50000.webp'),
  pearls_5: require('../assets/images/level-spin-rewards/pearls_5.webp'),
  pearls_10: require('../assets/images/level-spin-rewards/pearls_10.webp'),
  pearls_20: require('../assets/images/level-spin-rewards/pearls_20.webp'),
  pearls_50: require('../assets/images/level-spin-rewards/pearls_50.webp'),
  pearls_100: require('../assets/images/level-spin-rewards/pearls_100.webp'),
  pearls_250: require('../assets/images/level-spin-rewards/pearls_250.webp'),
  pearls_500: require('../assets/images/level-spin-rewards/pearls_500.webp'),
  stars_10: require('../assets/images/level-spin-rewards/stars_10.webp'),
  stars_20: require('../assets/images/level-spin-rewards/stars_20.webp'),
  stars_50: require('../assets/images/level-spin-rewards/stars_50.webp'),
  stars_100: require('../assets/images/level-spin-rewards/stars_100.webp'),
  stars_250: require('../assets/images/level-spin-rewards/stars_250.webp'),
  stars_500: require('../assets/images/level-spin-rewards/stars_500.webp'),
  stars_1000: require('../assets/images/level-spin-rewards/stars_1000.webp'),
  energy_full: require('../assets/images/level-spin-rewards/energy_full.webp'),
  energy_plus2: require('../assets/images/level-spin-rewards/energy_plus2.webp'),
  energy_plus3: require('../assets/images/level-spin-rewards/energy_plus3.webp'),
  hint_1: require('../assets/images/level-spin-rewards/hint_1.webp'),
  hint_3: require('../assets/images/level-spin-rewards/hint_3.webp'),
  chain_shield_1: require('../assets/images/level-spin-rewards/chain_shield_1.webp'),
  xp_bank_150: require('../assets/images/level-spin-rewards/xp_bank_150.webp'),
  xp_bank_300: require('../assets/images/level-spin-rewards/xp_bank_300.webp'),
  xp_bank_600: require('../assets/images/level-spin-rewards/xp_bank_600.webp'),
  xp_2x_24h: require('../assets/images/level-spin-rewards/xp_2x_24h.webp'),
  xp_2x_48h: require('../assets/images/level-spin-rewards/xp_2x_48h.webp'),
  plus_days_3: require('../assets/images/level-spin-rewards/plus_days_3.webp'),
  plus_days_7: require('../assets/images/level-spin-rewards/plus_days_7.webp'),
  cosmetic_avatar_aura: require('../assets/images/level-spin-rewards/cosmetic_avatar_aura.webp'),
} as const satisfies Readonly<Record<LevelSpinRewardId, ImageSourcePropType>>);

export type LevelSpinRewardImageKey = keyof typeof LEVEL_SPIN_REWARD_IMAGE_SOURCES;

/** Historical rewards keep their identity but borrow the nearest V2 family art. */
export const LEVEL_SPIN_REWARD_IMAGE_ALIASES = Object.freeze({
  chain_shield_3: 'chain_shield_1',
  choice_3_level: 'xp_bank_600',
  club_boost_free: 'energy_plus2',
  energy_plus1: 'energy_plus2',
  focus_10m_25: 'xp_2x_24h',
  focus_15m_50: 'xp_2x_48h',
  pack_voucher_48h: 'plus_days_3',
  prem_pack_48h: 'plus_days_7',
  prem_level_unlock_dark_logic: 'plus_days_7',
  prem_level_unlock_negotiator: 'plus_days_7',
  prem_level_unlock_peaky_blinders: 'plus_days_7',
  prem_level_unlock_royal_tea: 'plus_days_7',
  prem_level_unlock_wild_west: 'plus_days_7',
  prem_shards_10: 'xp_500',
  prem_shards_15: 'xp_1000',
  prem_shards_20: 'xp_3000',
  premium_xp_bank_1000: 'xp_bank_600',
  shards_3: 'pearls_5',
  shards_6: 'pearls_10',
  shards_10: 'pearls_20',
  wager_discount_25: 'chain_shield_1',
  xp_50: 'xp_250',
  xp_100: 'xp_250',
} as const satisfies Readonly<Record<string, LevelSpinRewardImageKey>>);

export function levelSpinRewardImageSource(rewardId: string): ImageSourcePropType | null {
  const alias = (LEVEL_SPIN_REWARD_IMAGE_ALIASES as Readonly<Record<string, LevelSpinRewardImageKey>>)[rewardId];
  if (alias) return LEVEL_SPIN_REWARD_IMAGE_SOURCES[alias];
  return Object.prototype.hasOwnProperty.call(LEVEL_SPIN_REWARD_IMAGE_SOURCES, rewardId)
    ? LEVEL_SPIN_REWARD_IMAGE_SOURCES[rewardId as LevelSpinRewardImageKey]
    : null;
}
