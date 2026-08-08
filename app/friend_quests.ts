import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';
import { ensureAnonUser, ensureStableAuthLinkForStableId } from './cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { replaceShardsBalanceForAccountGeneration } from './shards_system';
import { enqueueAuthoritativeLevelSpinLevels } from './level_spin_level_up_queue';
import { persistAuthoritativeLevelSpinBalance } from './level_reward_spins_client';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';

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
  callerXpBeforeReward?: number;
  rewardXpApplied?: number;
  callerXp?: number;
  levelSpinMintedCredits?: Array<{
    id: string;
    level: number;
    kind: 'standard' | 'milestone';
  }>;
  levelSpinBalance?: number;
};

function isFriendQuestsCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function callable<TReq, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

async function mirrorCallerXpWithoutRollback(
  callerXp: number,
): Promise<void> {
  if (!Number.isFinite(callerXp)) return;
  const serverXp = Math.max(0, Math.floor(callerXp));
  const localRaw = await AsyncStorage.getItem('user_total_xp').catch(() => null);
  const localXp = Math.max(0, parseInt(localRaw ?? '0', 10) || 0);
  const nextXp = Math.max(localXp, serverXp);
  await AsyncStorage.setItem('user_total_xp', String(nextXp));
}

function exactSpinLevels(result: FriendQuestClaimResponse): number[] | null {
  if (!Array.isArray(result.levelSpinMintedCredits)
    || !Number.isSafeInteger(result.levelSpinBalance)
    || Number(result.levelSpinBalance) < 0) return null;
  const milestoneLevels = new Set([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  const valid = result.levelSpinMintedCredits.every((credit) => {
    if (!Number.isInteger(credit.level) || credit.level < 2 || credit.level > 60) return false;
    return credit.id === `level_spin_v1_${String(credit.level).padStart(3, '0')}`
      && credit.kind === (milestoneLevels.has(credit.level) ? 'milestone' : 'standard');
  });
  if (!valid) return null;
  return [...new Set(result.levelSpinMintedCredits.map((credit) => credit.level))]
    .sort((a, b) => a - b);
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
  const accountGeneration = captureAccountGeneration();
  const key = friendQuestClaimRequestKey(stableId, questId);
  const existing = friendQuestClaimInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    const fn = callable<{
      stableId: string;
      questId: string;
      levelSpinProtocol: 'v1';
    }, FriendQuestClaimResponse>('friendClaimQuestReward');
    const res = await fn({ stableId, questId, levelSpinProtocol: 'v1' });
    if (!isCurrentAccountGeneration(accountGeneration, stableId)) return res.data;
    if (Number.isFinite(res.data.callerShards)) {
      const shardOutcome = await replaceShardsBalanceForAccountGeneration(
        res.data.callerShards as number,
        accountGeneration,
        stableId,
        {
          updatedAtMs: res.data.shardsUpdatedAtMs,
          op: 'earn',
          reason: 'friend_quest_reward',
        },
      );
      if (shardOutcome === 'stale-generation') return res.data;
    }
    await withAccountTransitionLock(async (): Promise<void> => {
      if (!isCurrentAccountGeneration(accountGeneration, stableId)) return;
      if (Number.isFinite(res.data.callerXp)) {
        await mirrorCallerXpWithoutRollback(res.data.callerXp as number);
      }
      invalidateActiveFriendQuestCache(stableId);
      const levels = exactSpinLevels(res.data);
      if (!levels || !isCurrentAccountGeneration(accountGeneration, stableId)) return;
      await persistAuthoritativeLevelSpinBalance(stableId, res.data.levelSpinBalance as number);
      if (!isCurrentAccountGeneration(accountGeneration, stableId)) return;
      if (levels.length > 0) await enqueueAuthoritativeLevelSpinLevels(levels);
    });
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
