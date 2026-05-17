import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { loadOwnedPackIds } from './marketplace';

export async function countOwnedCardPacks(): Promise<number> {
  const [official, community] = await Promise.all([
    loadOwnedPackIds(),
    loadCommunityOwnedPackIds(),
  ]);
  return new Set([...official, ...community]).size;
}

export async function trackCardPackAcquiredAchievement(): Promise<void> {
  const totalPacks = await countOwnedCardPacks();
  const { checkAchievements } = await import('../achievements');
  void checkAchievements({ type: 'pack_purchased', totalPacks });
}

export async function trackExternalShardSpendAchievement(amount: number): Promise<void> {
  const safeAmount = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  if (safeAmount <= 0) return;
  const { checkAchievements } = await import('../achievements');
  void checkAchievements({ type: 'shards_spent', amount: safeAmount });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
