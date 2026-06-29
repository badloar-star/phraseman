import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { storageStudyTarget, type RuntimeStudyTarget } from '../target_storage_keys';
import { loadOwnedPackIds } from './marketplace';

export async function countOwnedCardPacks(studyTarget?: RuntimeStudyTarget): Promise<number> {
  const target = storageStudyTarget(studyTarget);
  const [official, community] = await Promise.all([
    loadOwnedPackIds(target),
    loadCommunityOwnedPackIds(target),
  ]);
  return new Set([...official, ...community]).size;
}

export async function trackCardPackAcquiredAchievement(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const totalPacks = await countOwnedCardPacks(studyTarget);
  const { checkAchievements } = await import('../achievements');
  void checkAchievements({ type: 'pack_purchased', totalPacks, studyTarget });
}

export async function trackExternalShardSpendAchievement(amount: number): Promise<void> {
  const safeAmount = Math.max(0, Math.floor(Number.isFinite(amount) ? amount : 0));
  if (safeAmount <= 0) return;
  const { checkAchievements } = await import('../achievements');
  void checkAchievements({ type: 'shards_spent', amount: safeAmount });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
