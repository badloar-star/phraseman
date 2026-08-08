import { isCommunityPacksCloudEnabled, callFlashcardPackGiftSyncState } from '../community_packs/functionsClient';
import { addCommunityOwnedPackId } from '../community_packs/communityOwnedStorage';
import { getCanonicalUserId } from '../user_id_policy';
import { addOwnedPackId } from './marketplace';
import { reconcilePackGiftTrials } from './pack_trial_gift';

/** Best-effort foreground restoration; local vouchers remain usable when offline. */
export async function syncFlashcardPackGiftState(): Promise<boolean> {
  if (!isCommunityPacksCloudEnabled()) return false;
  try {
    const stableId = await getCanonicalUserId();
    if (!stableId) return false;
    const state = await callFlashcardPackGiftSyncState({ stableId });
    for (const entitlement of state.entitlements) {
      if (entitlement.packType === 'official') {
        await addOwnedPackId(entitlement.packId, entitlement.studyTarget);
      } else {
        await addCommunityOwnedPackId(entitlement.packId, entitlement.studyTarget);
      }
    }
    await reconcilePackGiftTrials(state.vouchers, state.entitlements);
    return true;
  } catch {
    return false;
  }
}

export default function __RouteShim() { return null; }
