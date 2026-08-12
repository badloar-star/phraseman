import { captureAccountGeneration } from './account_generation';
import {
  isInteractiveNetworkDeferredError,
  withBackgroundNetworkLease,
} from './interactive_network_quiet';
import {
  attemptWarmLearningV2CompletionCredentialsCachePreferred,
  peekLearningV2CompletionCredentialHandle,
  type CompletionCredentialWarmDisposition,
} from './learning_v2_completion_credential_cache';

export type LearningV2CompletionCredentialAdmission =
  | 'ready'
  | CompletionCredentialWarmDisposition
  | 'deferred';

/**
 * Scheduler-owned credential admission. The completion sync/submit path never
 * imports token APIs or the warmer; it can only consume an already-current
 * opaque handle. This operation may perform native network and therefore owns
 * a separate honest background lease through real native settlement.
 */
export const attemptLearningV2CompletionCredentialAdmission = async ():
Promise<LearningV2CompletionCredentialAdmission> => {
  const account = captureAccountGeneration();
  if (account.phase !== 'active' || !account.stableId || account.stableId.length > 256) {
    return 'unavailable';
  }
  if (peekLearningV2CompletionCredentialHandle(account)) return 'ready';
  try {
    const disposition = await withBackgroundNetworkLease(
      'completion.credentials',
      (lease) => attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
    );
    if (disposition !== 'published') return disposition;
    return peekLearningV2CompletionCredentialHandle(account) ? 'published' : 'stale';
  } catch (error) {
    if (isInteractiveNetworkDeferredError(error)) return 'deferred';
    return 'unavailable';
  }
};
