import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { replaceShardsBalanceLocal } from './shards_system';

const FUNCTIONS_REGION = 'us-central1';

export type FriendQuestStatus = 'active' | 'ready' | 'completed' | 'expired';

export type FriendQuest = {
  questId: string;
  participantUids: string[];
  status: FriendQuestStatus;
  startedAtMs: number;
  expiresAtMs: number;
  weekKey: string;
  targetXp: number;
  rewardShards: number;
  rewardXp: number;
  progressByUid: Record<string, number>;
  remainingXpByUid: Record<string, number>;
  rewardClaimedByUid?: Record<string, boolean>;
};

export type FriendQuestStatusResponse = {
  ok: boolean;
  quest: FriendQuest | null;
};

export type FriendQuestClaimResponse = {
  ok: boolean;
  questId: string;
  rewardApplied: boolean;
  reached?: boolean;
  callerShards?: number;
  callerXp?: number;
};

function isFriendQuestsCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function getStableIdForQuest(): Promise<string> {
  if (!isFriendQuestsCloudEnabled()) {
    throw new Error('friend_quests_unavailable');
  }
  const stableId = await ensureAnonUser();
  if (!stableId) {
    throw new Error('quest_user_unavailable');
  }
  await ensureStableAuthLinkForStableId(stableId).catch(() => false);
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  return stableId;
}

export async function getActiveFriendQuest(): Promise<FriendQuestStatusResponse> {
  const stableId = await getStableIdForQuest();
  const fn = callable<{ stableId: string }, FriendQuestStatusResponse>('friendGetActiveQuest');
  const res = await fn({ stableId });
  return res.data;
}

export async function claimFriendQuestReward(questId: string): Promise<FriendQuestClaimResponse> {
  const stableId = await getStableIdForQuest();
  const fn = callable<{ stableId: string; questId: string }, FriendQuestClaimResponse>('friendClaimQuestReward');
  const res = await fn({ stableId, questId });
  if (Number.isFinite(res.data.callerShards)) {
    await replaceShardsBalanceLocal(res.data.callerShards as number);
  }
  if (Number.isFinite(res.data.callerXp)) {
    await AsyncStorage.setItem('user_total_xp', String(res.data.callerXp));
  }
  return res.data;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
