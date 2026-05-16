import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { ensureAnonUser } from '../cloud_sync';
import { replaceShardsBalanceLocal } from '../shards_system';
import { emitAppEvent } from '../events';
import { LEAGUE_RACE_MIN_PARTICIPANTS } from '../league_race_visibility';

export const LEAGUE_CROWN_NICK_COLOR = '#16B7D9';
export const LEAGUE_CHEST_MIN_CONTRIBUTION = 500;
export const LEAGUE_CHEST_SHARDS_REWARD = 30;
export const LEAGUE_CHEST_ENERGY_MS = 5 * 60 * 1000;
export const LEAGUE_CHEST_BASE_GOAL = 200_000;
export const LEAGUE_CHEST_GOAL_STEP = 20_000;

export function getLeagueChestGoal(leagueId?: number | null): number {
  const id = Math.max(0, Math.floor(Number(leagueId) || 0));
  return LEAGUE_CHEST_BASE_GOAL + id * LEAGUE_CHEST_GOAL_STEP;
}

const CROWNS_COL = 'league_crowns';
const ENERGY_OVERRIDE_KEY = 'league_chest_energy_override_v1';
const XP_OVERRIDE_KEY = 'league_chest_xp_override_v1';
const STREAK_SHIELD_KEY = 'chain_shield';
const FUNCTIONS_REGION = 'us-central1';

export type LeagueChestMember = {
  uid?: string;
  name: string;
  points: number;
  isMe?: boolean;
};

export type LeagueCrown = {
  uid: string;
  name: string;
  weekId: string;
  groupId: string;
  leagueId: number;
  expiresAt: number;
  aura: 'league_chest_crown';
};

export type LeagueChestClaim = {
  claimed: boolean;
  crown?: LeagueCrown | null;
  rewards?: {
    shards: number;
    energyRecoveryMs: number;
    xpOverrideMultiplier: number;
    xpOverrideUses: number;
    streakShieldCount: number;
    expiresAt: number;
  };
};

export async function resolveMyLeagueGroupMeta(): Promise<{
  weekId: string;
  groupId: string;
  leagueId: number;
} | null> {
  const db = getDb();
  if (!db) return null;
  const uid = await ensureAnonUser();
  if (!uid) return null;
  try {
    const snap = await db.collection('leaderboard').doc(uid).get();
    if (!snap.exists) return null;
    const d = snap.data() ?? {};
    const weekId = String(d.groupWeekId ?? d.weekKey ?? '').trim();
    const groupId = String(d.groupId ?? '').trim();
    if (!weekId || !groupId) return null;
    return {
      weekId,
      groupId,
      leagueId: Math.max(0, Math.floor(Number(d.leagueId) || 0)),
    };
  } catch {
    return null;
  }
}

function getDb() {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
}

function callable<TReq, TRes>(name: string) {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    return httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), name) as (data: TReq) => Promise<{ data: TRes }>;
  } catch {
    return null;
  }
}

function safeId(value: string): string {
  return value.replace(/[^\w.-]/g, '_').slice(0, 140);
}

function claimDocId(uid: string, weekId: string, groupId: string): string {
  return `${safeId(weekId)}_${safeId(groupId)}_${safeId(uid)}`;
}

export async function readLeagueChestEnergyOverrideMs(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(ENERGY_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number; recoveryMs?: number };
    if (!parsed.expiresAt || Date.now() >= parsed.expiresAt) {
      await AsyncStorage.removeItem(ENERGY_OVERRIDE_KEY);
      return null;
    }
    const recoveryMs = Number(parsed.recoveryMs);
    return Number.isFinite(recoveryMs) && recoveryMs > 0 ? recoveryMs : null;
  } catch {
    return null;
  }
}

export async function consumeLeagueChestXpOverrideMultiplier(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(XP_OVERRIDE_KEY);
    if (!raw) return 1;
    const parsed = JSON.parse(raw) as { expiresAt?: number; multiplier?: number; remainingUses?: number };
    const remainingUses = Math.floor(Number(parsed.remainingUses) || 0);
    const multiplier = Number(parsed.multiplier) || 1;
    if (!parsed.expiresAt || Date.now() >= parsed.expiresAt || remainingUses <= 0 || multiplier <= 1) {
      await AsyncStorage.removeItem(XP_OVERRIDE_KEY);
      return 1;
    }
    const nextUses = remainingUses - 1;
    if (nextUses <= 0) {
      await AsyncStorage.removeItem(XP_OVERRIDE_KEY);
    } else {
      await AsyncStorage.setItem(XP_OVERRIDE_KEY, JSON.stringify({ ...parsed, remainingUses: nextUses }));
    }
    return multiplier;
  } catch {
    return 1;
  }
}

async function applyLocalRewardPack(expiresAt: number, balance?: number): Promise<void> {
  if (typeof balance === 'number' && Number.isFinite(balance)) {
    await replaceShardsBalanceLocal(balance);
    emitAppEvent('shards_earned', { amount: LEAGUE_CHEST_SHARDS_REWARD, reasonKey: 'league_chest' });
  }
  await AsyncStorage.multiSet([
    [ENERGY_OVERRIDE_KEY, JSON.stringify({ recoveryMs: LEAGUE_CHEST_ENERGY_MS, expiresAt })],
    [XP_OVERRIDE_KEY, JSON.stringify({ multiplier: 2, remainingUses: 3, expiresAt })],
  ]);
  const shieldRaw = await AsyncStorage.getItem(STREAK_SHIELD_KEY);
  let shields = 0;
  try {
    const parsed = shieldRaw ? JSON.parse(shieldRaw) : null;
    shields = Math.max(0, Math.floor(Number(parsed?.daysLeft) || 0));
  } catch {
    shields = 0;
  }
  await AsyncStorage.setItem(STREAK_SHIELD_KEY, JSON.stringify({
    daysLeft: shields + 1,
    grantedAt: new Date().toISOString().split('T')[0],
  }));
  emitAppEvent('energy_reload');
}

export async function ensureLeagueChestRewards(params: {
  weekId: string;
  groupId: string;
  leagueId: number;
  members: LeagueChestMember[];
  chestReady: boolean;
  myContribution: number;
}): Promise<LeagueChestClaim> {
  if (!params.chestReady || !params.groupId || !params.weekId) return { claimed: false };
  if (params.members.length < LEAGUE_RACE_MIN_PARTICIPANTS) return { claimed: false };
  const myUid = await ensureAnonUser();
  if (!myUid) return { claimed: false };

  const localClaimKey = `league_chest_claimed_${claimDocId(myUid, params.weekId, params.groupId)}`;
  const alreadyLocal = await AsyncStorage.getItem(localClaimKey);
  if (alreadyLocal === '1') return { claimed: true };

  const fn = callable<
    { weekId: string; groupId: string },
    LeagueChestClaim & { ok?: boolean; balance?: number; alreadyClaimed?: boolean }
  >('leagueChestClaim');
  if (!fn) return { claimed: false };

  try {
    const { data } = await fn({ weekId: params.weekId, groupId: params.groupId });
    if (data.claimed) await AsyncStorage.setItem(localClaimKey, '1');
    if (data.crown?.uid === myUid) {
      emitAppEvent('league_crown_updated', { uid: myUid, expiresAt: data.crown.expiresAt });
    }
    if (data.rewards) {
      await applyLocalRewardPack(data.rewards.expiresAt, data.balance);
    }
    return data;
  } catch {
    return { claimed: false };
  }
}

export async function fetchActiveLeagueCrowns(uids: string[]): Promise<Record<string, LeagueCrown>> {
  const db = getDb();
  if (!db || uids.length === 0) return {};
  const unique = Array.from(new Set(uids.filter(Boolean)));
  const out: Record<string, LeagueCrown> = {};
  for (let i = 0; i < unique.length; i += 10) {
    const part = unique.slice(i, i + 10);
    try {
      const snap = await db.collection(CROWNS_COL).where('uid', 'in', part).get();
      snap.docs.forEach((doc) => {
        const d = doc.data() as LeagueCrown;
        if (d?.uid && Number(d.expiresAt) > Date.now()) out[d.uid] = d;
      });
    } catch {
      // ignore chunk
    }
  }
  return out;
}
