import type { ThemedArtName } from '../../components/theme/themed_art_registry';
import { clampSpireTierIndex } from './tier_names';

type SpireRankArtName = Extract<ThemedArtName, `spire_rank_${number}`>;

/** The twelve named stones share six approved badges, two adjacent tiers per badge. */
export function spireRankArtName(tier: unknown): SpireRankArtName {
  const badge = Math.floor(clampSpireTierIndex(tier) / 2) + 1;
  return `spire_rank_${badge}` as SpireRankArtName;
}
