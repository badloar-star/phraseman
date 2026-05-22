import type { CardItem } from '../flashcards/types';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { fetchCommunityPackCards } from './communityFirestore';

let stagedCommunityPackMarketCards: CardItem[] | null = null;
/** `packId` з останнього успішного `stageCommunityPackCardsForNavigation` — для перевірки `?pack=` до зчитування AsyncStorage. */
let stagedNavigationPackId: string | null = null;

/**
 * Підготувати картки UGC-набору перед `router.push` на колекцію з `?pack=`.
 */
export async function stageCommunityPackCardsForNavigation(
  packId: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  stagedCommunityPackMarketCards = null;
  stagedNavigationPackId = packId;
  const cards = await fetchCommunityPackCards(packId, studyTarget);
  if (cards.length === 0) {
    stagedNavigationPackId = null;
    return false;
  }
  stagedCommunityPackMarketCards = cards;
  return true;
}

export function consumeStagedCommunityPackMarketCards(): CardItem[] | null {
  const x = stagedCommunityPackMarketCards;
  stagedCommunityPackMarketCards = null;
  return x;
}

export function getStagedNavigationPackId(): string | null {
  return stagedNavigationPackId;
}

export function clearStagedNavigationPackId(): void {
  stagedNavigationPackId = null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
