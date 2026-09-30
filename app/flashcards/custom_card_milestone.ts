import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from '../account_generation';
import { withCallableTimeout } from '../callable_timeout';
import type { StudyTarget } from '../study_target';
import { getAuthUserId } from '../user_id_policy';
import {
  processCustomCardMilestone,
  type CustomCardMilestoneResult,
} from './custom_card_milestone_outbox';

const FUNCTIONS_REGION = 'us-central1';

export type CustomCardMilestoneOwner = Readonly<{
  accountToken: AccountGenerationToken;
  expectedOwnerUid: string | null;
}>;

/** Capture both local lineage and Firebase auth synchronously before card I/O. */
export function captureCustomCardMilestoneOwner(): CustomCardMilestoneOwner {
  return Object.freeze({
    accountToken: captureAccountGeneration(),
    expectedOwnerUid: getAuthUserId(),
  });
}

/**
 * Best-effort owner visibility only. The callable receives no card text,
 * contact data, stable id, or Telegram credential; Firebase Auth supplies the
 * account identity server-side.
 */
export async function observeCustomCardMilestone(
  count: number,
  language: StudyTarget,
  owner: CustomCardMilestoneOwner,
): Promise<CustomCardMilestoneResult> {
  const stableId = owner.accountToken.stableId?.trim() ?? '';
  if (!stableId || !isCurrentAccountGeneration(owner.accountToken, stableId)) return 'stale-account';

  return processCustomCardMilestone({
    count,
    language,
    scope: {
      stableId,
      generation: owner.accountToken.generation,
      expectedOwnerUid: owner.expectedOwnerUid,
      isCurrent: () => isCurrentAccountGeneration(owner.accountToken, stableId),
    },
  }, {
    storage: AsyncStorage,
    nowMs: Date.now,
    commitIfCurrent: (work) => withAccountTransitionLock(async () => {
      if (!isCurrentAccountGeneration(owner.accountToken, stableId)) return false;
      await work();
      return isCurrentAccountGeneration(owner.accountToken, stableId);
    }),
    send: async (request) => {
      const call = httpsCallable<
        Readonly<{ count: number; language: StudyTarget; expectedOwnerUid: string }>,
        Readonly<{ accepted: true; duplicate: boolean }>
      >(getFunctions(getApp(), FUNCTIONS_REGION), 'customCardMilestoneNotify');
      // The network stays outside the account-transition lock. A captive
      // portal or cold function can defer this alert, never stall sign-out.
      const response = await withCallableTimeout(
        call(request),
        'custom_card_milestone',
      );
      if (response.data?.accepted !== true) throw new Error('custom_card_milestone_not_accepted');
      return response.data;
    },
  });
}

