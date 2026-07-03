import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { replaceShardsBalanceLocal } from './shards_system';

const FUNCTIONS_REGION = 'us-central1';
const FRIEND_QUEST_STATUS_CACHE_TTL_MS = 60 * 1000;

let friendQuestStatusCache: {
  stableId: string;
  updatedAtMs: number;
  data: FriendQuestStatusResponse;
} | null = null;
const friendQuestStatusInFlight = new Map<string, Promise<FriendQuestStatusResponse>>();
const friendQuestClaimInFlight = new Map<string, Promise<FriendQuestClaimResponse>>();

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
  shardsUpdatedAtMs?: number;
  callerXp?: number;
};

function isFriendQuestsCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function mirrorCallerXpWithoutRollback(callerXp: number): Promise<void> {
  if (!Number.isFinite(callerXp)) return;
  const serverXp = Math.max(0, Math.floor(callerXp));
  const localRaw = await AsyncStorage.getItem('user_total_xp').catch(() => null);
  const localXp = Math.max(0, parseInt(localRaw ?? '0', 10) || 0);
  await AsyncStorage.setItem('user_total_xp', String(Math.max(localXp, serverXp)));
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

export function invalidateActiveFriendQuestCache(stableId?: string): void {
  if (!stableId || friendQuestStatusCache?.stableId === stableId) {
    friendQuestStatusCache = null;
  }
}

export async function getActiveFriendQuest(options: { force?: boolean } = {}): Promise<FriendQuestStatusResponse> {
  const stableId = await getStableIdForQuest();
  const now = Date.now();
  if (
    !options.force
    && friendQuestStatusCache?.stableId === stableId
    && now - friendQuestStatusCache.updatedAtMs < FRIEND_QUEST_STATUS_CACHE_TTL_MS
  ) {
    return friendQuestStatusCache.data;
  }
  const existing = !options.force ? friendQuestStatusInFlight.get(stableId) : null;
  if (existing) return existing;

  const fn = callable<{ stableId: string; force?: boolean }, FriendQuestStatusResponse>('friendGetActiveQuest');
  const request = (async () => {
    const res = await fn({ stableId, force: options.force === true });
    friendQuestStatusCache = {
      stableId,
      updatedAtMs: Date.now(),
      data: res.data,
    };
    return res.data;
  })().finally(() => {
    friendQuestStatusInFlight.delete(stableId);
  });

  friendQuestStatusInFlight.set(stableId, request);
  return request;
}

export async function claimFriendQuestReward(questId: string): Promise<FriendQuestClaimResponse> {
  const stableId = await getStableIdForQuest();
  const key = friendQuestClaimRequestKey(stableId, questId);
  const existing = friendQuestClaimInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    const fn = callable<{ stableId: string; questId: string }, FriendQuestClaimResponse>('friendClaimQuestReward');
    const res = await fn({ stableId, questId });
    if (Number.isFinite(res.data.callerShards)) {
      await replaceShardsBalanceLocal(res.data.callerShards as number, {
        updatedAtMs: res.data.shardsUpdatedAtMs,
        op: 'earn',
        reason: 'friend_quest_reward',
      });
    }
    if (Number.isFinite(res.data.callerXp)) {
      await mirrorCallerXpWithoutRollback(res.data.callerXp as number);
    }
    invalidateActiveFriendQuestCache(stableId);
    return res.data;
  })().finally(() => {
    friendQuestClaimInFlight.delete(key);
  });

  friendQuestClaimInFlight.set(key, request);
  return request;
}

function friendQuestClaimRequestKey(stableId: string, questId: string): string {
  return JSON.stringify({ stableId, questId });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
