import type { LevelSpinRewardId } from './level_spin_reward_catalog';

export type LevelSpinRewardArtFamily =
  | 'xp'
  | 'pearls'
  | 'stars'
  | 'energy'
  | 'hints'
  | 'protection'
  | 'time'
  | 'plus'
  | 'aura'
  | 'avatar'
  | 'theme';

export const LEVEL_SPIN_REWARD_FAMILY_PALETTES = Object.freeze({
  xp: '#59607A',
  pearls: '#75877A',
  stars: '#8E7858',
  energy: '#3F6653',
  hints: '#987746',
  protection: '#74464A',
  time: '#3C6868',
  plus: '#847968',
  aura: '#67558A',
  avatar: '#526A7A',
  // зачем: тема оформления — про палитру интерфейса, поэтому акцент берёт
  // приглушённый сине-стальной тон, не пересекающийся с остальными семьями.
  theme: '#4E6A86',
} satisfies Record<LevelSpinRewardArtFamily, string>);

export type LevelSpinRewardAssetSpec = Readonly<{
  id: LevelSpinRewardId;
  family: LevelSpinRewardArtFamily;
  subject: string;
  accent: string;
  productionFile: `assets/images/level-spin-rewards/${string}.webp`;
}>;

type LevelSpinRewardAssetSpecFor<Id extends LevelSpinRewardId> = Readonly<
  Omit<LevelSpinRewardAssetSpec, 'id' | 'productionFile'> & {
    id: Id;
    productionFile: `assets/images/level-spin-rewards/${Id}.webp`;
  }
>;

const reward = <const Id extends LevelSpinRewardId>(
  id: Id,
  family: LevelSpinRewardArtFamily,
  subject: string,
): LevelSpinRewardAssetSpecFor<Id> => Object.freeze({
  id,
  family,
  subject,
  accent: LEVEL_SPIN_REWARD_FAMILY_PALETTES[family],
  productionFile: `assets/images/level-spin-rewards/${id}.webp` as const,
});

export const LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID = Object.freeze({
  xp_250: reward('xp_250', 'xp', 'one compact knowledge crystal in a small architectural mount'),
  xp_500: reward('xp_500', 'xp', 'two interlocked crystals using the same mount grammar'),
  xp_1000: reward('xp_1000', 'xp', 'three-crystal cluster in a wider base'),
  xp_3000: reward('xp_3000', 'xp', 'open knowledge tablet with a restrained crystal spine'),
  xp_5000: reward('xp_5000', 'xp', 'closed bound knowledge codex with a crystal clasp'),
  pearls_5: reward('pearls_5', 'pearls', 'small open porcelain shell with a restrained pearl cluster'),
  pearls_10: reward('pearls_10', 'pearls', 'rounded pearl cup with a ribbed shell structure'),
  pearls_20: reward('pearls_20', 'pearls', 'symmetrical double-shell reliquary'),
  stars_10: reward('stars_10', 'stars', 'one simple obsidian rune stone with a shallow porcelain-carved glyph'),
  stars_20: reward('stars_20', 'stars', 'a thicker obsidian rune stone with a narrow champagne inset'),
  stars_50: reward('stars_50', 'stars', 'a double-layer rune tablet with a deeper porcelain-carved glyph'),
  energy_full: reward('energy_full', 'energy', 'full sealed energy vessel with one contained core'),
  energy_plus2: reward('energy_plus2', 'energy', 'two-cell energy capsule'),
  hint_1: reward('hint_1', 'hints', 'one compact study lamp or optical lens'),
  hint_3: reward('hint_3', 'hints', 'three-lens study instrument using the same base grammar'),
  chain_shield_1: reward('chain_shield_1', 'protection', 'shield-seal surrounded by one linked structural rim'),
  xp_bank_150: reward('xp_bank_150', 'xp', 'two simple sealed knowledge tablets held by a plain band'),
  xp_bank_300: reward('xp_bank_300', 'xp', 'paired tablets held by a polished clasp'),
  xp_2x_24h: reward('xp_2x_24h', 'time', 'compact double-sided hourglass with a knowledge core'),
  xp_10000: reward('xp_10000', 'xp', 'tall prism held by a substantial collar'),
  xp_25000: reward('xp_25000', 'xp', 'crowned multi-prism cluster with layered hardware'),
  pearls_50: reward('pearls_50', 'pearls', 'closed shell reliquary with a visible pearl aperture'),
  pearls_100: reward('pearls_100', 'pearls', 'layered shell holding a short pearl strand'),
  stars_100: reward('stars_100', 'stars', 'a faceted rune stone with a restrained porcelain inner plate'),
  stars_250: reward('stars_250', 'stars', 'an architectural double-frame rune stone with pronounced relief'),
  energy_plus3: reward('energy_plus3', 'energy', 'three-cell energy capsule with stronger construction'),
  xp_bank_600: reward('xp_bank_600', 'xp', 'twin prisms joined by a structural bridge'),
  xp_2x_48h: reward('xp_2x_48h', 'time', 'layered chronometer with twin knowledge chambers'),
  xp_50000: reward('xp_50000', 'xp', 'monumental knowledge crystal in an architectural frame'),
  pearls_250: reward('pearls_250', 'pearls', 'crystal-edged shell holding one large pearl'),
  pearls_500: reward('pearls_500', 'pearls', 'monumental layered shell crown with refined metal hardware'),
  pearls_1000: reward('pearls_1000', 'pearls', 'twin monumental shells crowned by a single sovereign pearl'),
  stars_500: reward('stars_500', 'stars', 'a monumental stacked rune stone with refined champagne binding'),
  stars_1000: reward('stars_1000', 'stars', 'the deepest layered rune monolith with restrained round hardware'),
  stars_2000: reward('stars_2000', 'stars', 'a sovereign rune obelisk with doubled champagne bindings'),
  chain_shield_3: reward('chain_shield_3', 'protection', 'triple-linked shield-seal with three structural rims'),
  xp_bank_1500: reward('xp_bank_1500', 'xp', 'triple sealed knowledge tablets bound by a polished clasp'),
  plus_days_3: reward('plus_days_3', 'plus', 'restrained three-part access pass without lettering'),
  plus_days_7: reward('plus_days_7', 'plus', 'substantial access key with an opal-like neutral core'),
  plus_days_14: reward('plus_days_14', 'plus', 'paired access keys joined by a neutral opal band'),
  plus_days_30: reward('plus_days_30', 'plus', 'a monumental access seal with a full opal core'),
  cosmetic_avatar_aura: reward('cosmetic_avatar_aura', 'aura', 'contained luminous aura reliquary with a clean hexagonal center'),
  cosmetic_theme: reward('cosmetic_theme', 'theme', 'stacked palette tablets fanned inside a calm architectural mount'),
  cosmetic_avatar_common: reward('cosmetic_avatar_common', 'avatar', 'faceted anonymous avatar bust for a random avatar unlock'),
  attempt_restore_all: reward('attempt_restore_all', 'protection', 'three-heart recovery reliquary with three contained heart cores'),
} as const satisfies Readonly<Record<LevelSpinRewardId, LevelSpinRewardAssetSpec>>);

export const LEVEL_SPIN_REWARD_ASSET_MANIFEST = Object.freeze(
  Object.values(LEVEL_SPIN_REWARD_ASSET_MANIFEST_BY_ID),
);
