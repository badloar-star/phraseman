import { isCommunityPacksCloudEnabled, callFlashcardPackGiftSyncState } from '../community_packs/functionsClient';
import { addCommunityOwnedPackId } from '../community_packs/communityOwnedStorage';
import { getCanonicalUserId } from '../user_id_policy';
import { reconcilePackGiftTrials } from './pack_trial_gift';
import { DebugLogger } from '../debug-logger';

/** Best-effort foreground restoration; local vouchers remain usable when offline. */
export async function syncFlashcardPackGiftState(): Promise<boolean> {
  if (!isCommunityPacksCloudEnabled()) return false;
  try {
    const stableId = await getCanonicalUserId();
    if (!stableId) return false;
    const state = await callFlashcardPackGiftSyncState({ stableId });
    const communityEntitlements = state.entitlements.filter((entitlement) => entitlement.packType === 'community');
    for (const entitlement of communityEntitlements) {
      await addCommunityOwnedPackId(entitlement.packId, entitlement.studyTarget);
    }
    await reconcilePackGiftTrials(state.vouchers, communityEntitlements);
    return true;
  } catch (e) {
    // зачем логируем (правило проекта «сперва логи», аудит 17.09.2026): весь
    // возврат подаренных/купленных наборов жил в одном немом catch — наружу
    // видно только false, и понять, упал ли серверный вызов или локальная
    // запись владения, было невозможно.
    DebugLogger.warn('packGiftSync', `[PACK-GIFT] синхронизация подарков не прошла: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

export default function __RouteShim() { return null; }
