import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { ensureAnonUser } from '../cloud_sync';
import { replaceShardsBalanceLocal } from '../shards_system';
import { emitAppEvent } from '../events';
import { LEAGUE_RACE_MIN_PARTICIPANTS } from '../league_race_visibility';
import { addArenaPlaysBonusForToday } from '../arena_daily_limit';
import { setRandomPackGiftTrial48h } from '../flashcards/pack_trial_gift';
import { primeMarketplaceBuiltCardsCacheFromAccessibleStorage } from '../flashcards/marketplace';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import {
  AVATAR_AURA_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  AVATAR_AURAS,
  USER_AVATAR_AURA_KEY,
} from '../../constants/avatar_auras';
import {
  CUSTOM_AVATAR_OWNED_KEY,
  CUSTOM_AVATARS,
  type CustomAvatarLogoColor,
} from '../../constants/custom_avatars';

export const LEAGUE_CROWN_NICK_COLOR = '#16B7D9';
export const LEAGUE_CHEST_MIN_CONTRIBUTION = 500;
export const LEAGUE_CHEST_SHARDS_REWARD = 30;
export const LEAGUE_CHEST_ENERGY_MS = 5 * 60 * 1000;
export const LEAGUE_CHEST_BASE_GOAL = 200_000;
export const LEAGUE_CHEST_GOAL_STEP = 20_000;
export const LEAGUE_GOLD_THEME_UNLOCK_KEY = 'league_gold_theme_unlocked_v1';
export const LEAGUE_GOLD_THEME_UNLOCK_AT_KEY = 'league_gold_theme_unlocked_at';
export const LEAGUE_BONUS_ADMIN_PREVIEW_KEY = 'league_bonus_admin_force_ready_v1';

export type LeagueBonusAdminPreview = {
  expiresAt: number;
  crownWinner?: boolean;
};

export function getLeagueChestGoal(leagueId?: number | null): number {
  const id = Math.max(0, Math.floor(Number(leagueId) || 0));
  return LEAGUE_CHEST_BASE_GOAL + id * LEAGUE_CHEST_GOAL_STEP;
}

const CROWNS_COL = 'league_crowns';
const ENERGY_OVERRIDE_KEY = 'league_chest_energy_override_v1';
const XP_OVERRIDE_KEY = 'league_chest_xp_override_v1';
const STREAK_SHIELD_KEY = 'chain_shield';
const CUSTOM_AVATAR_GIFT_OWNED_KEY = 'custom_avatar_gift_owned_v1';
const FUNCTIONS_REGION = 'us-central1';

function getCurrentWeekId(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

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
  crownCount?: number;
  aura: 'league_chest_crown';
};

export type LeagueChestRewardRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type LeagueChestRewardKind =
  | 'shards'
  | 'xp_boost'
  | 'energy_fast_recovery'
  | 'streak_shield'
  | 'arena_plays'
  | 'pack_trial_48h'
  | 'avatar_aura'
  | 'custom_avatar'
  | 'gold_theme'
  | 'gold_theme_duplicate';

export type LeagueChestRewardDrop = {
  id: string;
  kind: LeagueChestRewardKind;
  rarity: LeagueChestRewardRarity;
  amount?: number;
  multiplier?: number;
  uses?: number;
  recoveryMs?: number;
  expiresAt?: number;
  auraId?: string;
  customAvatarId?: string;
  gradientId?: string;
  logoColor?: CustomAvatarLogoColor;
};

export type LeagueChestClaim = {
  claimed: boolean;
  crown?: LeagueCrown | null;
  rewards?: {
    drops: LeagueChestRewardDrop[];
    shards?: number;
    energyRecoveryMs?: number;
    xpOverrideMultiplier?: number;
    xpOverrideUses?: number;
    streakShieldCount?: number;
    themeGoldUnlocked?: boolean;
    expiresAt: number;
  };
};

export type LeagueBonusAvailability = {
  available: boolean;
  weekId: string;
  groupId: string;
  leagueId: number;
  progress: number;
  goal: number;
  memberCount: number;
  crownName?: string;
  crownUid?: string;
  isCrownWinner: boolean;
};

export async function hasLeagueGoldThemeReward(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(LEAGUE_GOLD_THEME_UNLOCK_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function unlockLeagueGoldThemeReward(source = 'league_chest'): Promise<void> {
  try {
    const already = await hasLeagueGoldThemeReward();
    await AsyncStorage.multiSet([
      [LEAGUE_GOLD_THEME_UNLOCK_KEY, '1'],
      [LEAGUE_GOLD_THEME_UNLOCK_AT_KEY, String(Date.now())],
    ]);
    if (!already) emitAppEvent('gold_theme_unlocked', { source });
  } catch {
    // Cosmetic reward only; never block the chest flow.
  }
}

export async function revokeLeagueGoldThemeReward(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([LEAGUE_GOLD_THEME_UNLOCK_KEY, LEAGUE_GOLD_THEME_UNLOCK_AT_KEY]);
    const currentTheme = await AsyncStorage.getItem('app_theme');
    if (currentTheme === 'gold') await AsyncStorage.setItem('app_theme', 'midnight');
  } catch {
    // ignore local admin reset failures
  }
}

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
    const leagueId = Math.max(0, Math.floor(Number(d.leagueId) || 0));
    if (!weekId || weekId !== getCurrentWeekId() || !groupId) return null;
    const groupSnap = await db.collection('league_groups').doc(groupId).get().catch(() => null);
    const group = groupSnap?.exists ? groupSnap.data() ?? {} : null;
    const members = group?.members && typeof group.members === 'object' ? group.members as Record<string, unknown> : {};
    if (!group || group.weekId !== weekId || Math.floor(Number(group.leagueId) || 0) !== leagueId || !members[uid]) {
      return null;
    }
    return {
      weekId,
      groupId,
      leagueId,
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

function localClaimKey(uid: string, weekId: string, groupId: string): string {
  return `league_chest_claimed_${claimDocId(uid, weekId, groupId)}`;
}

function parseMembers(raw: unknown): LeagueChestMember[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw as Record<string, Record<string, unknown>>)
    .map(([uid, m]) => ({
      uid,
      name: String(m?.name ?? 'Player').replace(/\s+/g, ' ').trim().slice(0, 48) || 'Player',
      points: Math.max(0, Math.floor(Number(m?.points) || 0)),
    }))
    .filter((m) => !!m.uid);
}

function buildLeagueBonusAvailability(params: {
  meta: { weekId: string; groupId: string; leagueId: number };
  myUid: string;
  groupData?: Record<string, unknown> | null;
  arenaData?: Record<string, unknown> | null;
  claimExists: boolean;
  locallyClaimed: boolean;
}): LeagueBonusAvailability | null {
  const { meta, myUid, groupData, arenaData, claimExists, locallyClaimed } = params;
  if (!groupData || groupData.weekId !== meta.weekId) return null;
  const groupLeagueId = Math.max(0, Math.floor(Number(groupData.leagueId) || 0));
  if (groupLeagueId !== meta.leagueId) return null;
  const members = parseMembers(groupData.members);
  if (!members.some((m) => m.uid === myUid)) return null;
  const goal = getLeagueChestGoal(meta.leagueId);
  const leaguePoints = members.reduce((sum, m) => sum + Math.max(0, Math.floor(Number(m.points) || 0)), 0);
  const arenaBonus = Math.max(0, Math.floor(Number(arenaData?.totalPoints) || 0));
  const progress = leaguePoints + arenaBonus;
  if (members.length < LEAGUE_RACE_MIN_PARTICIPANTS || progress < goal || claimExists || locallyClaimed) return null;
  const sorted = [...members].sort((a, b) => b.points - a.points);
  const winner = sorted[0];
  return {
    available: true,
    weekId: meta.weekId,
    groupId: meta.groupId,
    leagueId: meta.leagueId,
    progress,
    goal,
    memberCount: members.length,
    crownName: winner?.name,
    crownUid: winner?.uid,
    isCrownWinner: winner?.uid === myUid,
  };
}

export async function checkLeagueBonusAvailability(): Promise<LeagueBonusAvailability | null> {
  const db = getDb();
  if (!db) return null;
  const [meta, myUid] = await Promise.all([resolveMyLeagueGroupMeta(), ensureAnonUser()]);
  if (!meta || !myUid) return null;
  const claimKey = localClaimKey(myUid, meta.weekId, meta.groupId);
  const locallyClaimed = (await AsyncStorage.getItem(claimKey).catch(() => null)) === '1';
  if (locallyClaimed) return null;
  const [groupSnap, arenaSnap, claimSnap] = await Promise.all([
    db.collection('league_groups').doc(meta.groupId).get().catch(() => null),
    db.collection('arena_club_events').doc(`${safeId(meta.weekId)}_${safeId(meta.groupId)}`).get().catch(() => null),
    db.collection('league_chest_claims').doc(claimDocId(myUid, meta.weekId, meta.groupId)).get().catch(() => null),
  ]);
  return buildLeagueBonusAvailability({
    meta,
    myUid,
    groupData: groupSnap?.exists ? (groupSnap.data() as Record<string, unknown>) : null,
    arenaData: arenaSnap?.exists ? (arenaSnap.data() as Record<string, unknown>) : null,
    claimExists: !!claimSnap?.exists,
    locallyClaimed,
  });
}

export function subscribeLeagueBonusAvailability(
  onAvailable: (availability: LeagueBonusAvailability) => void,
): () => void {
  const db = getDb();
  if (!db) return () => {};
  let closed = false;
  let meta: { weekId: string; groupId: string; leagueId: number } | null = null;
  let myUid = '';
  let groupData: Record<string, unknown> | null = null;
  let arenaData: Record<string, unknown> | null = null;
  let claimExists = false;
  let locallyClaimed = false;
  let lastKey = '';
  const unsubs: Array<() => void> = [];

  const maybeEmit = () => {
    if (closed || !meta || !myUid) return;
    const availability = buildLeagueBonusAvailability({
      meta,
      myUid,
      groupData,
      arenaData,
      claimExists,
      locallyClaimed,
    });
    if (!availability) return;
    const key = `${availability.weekId}:${availability.groupId}:${availability.progress}:${availability.crownUid ?? ''}`;
    if (key === lastKey) return;
    lastKey = key;
    onAvailable(availability);
  };

  void (async () => {
    const resolved = await Promise.all([resolveMyLeagueGroupMeta(), ensureAnonUser()]).catch(() => [null, null] as const);
    if (closed) return;
    meta = resolved[0];
    myUid = String(resolved[1] ?? '');
    if (!meta || !myUid) return;
    locallyClaimed = (await AsyncStorage.getItem(localClaimKey(myUid, meta.weekId, meta.groupId)).catch(() => null)) === '1';
    const arenaDocId = `${safeId(meta.weekId)}_${safeId(meta.groupId)}`;
    unsubs.push(
      db.collection('league_groups').doc(meta.groupId).onSnapshot((snap) => {
        groupData = snap.exists ? (snap.data() as Record<string, unknown>) : null;
        maybeEmit();
      }, () => {}),
    );
    unsubs.push(
      db.collection('arena_club_events').doc(arenaDocId).onSnapshot((snap) => {
        arenaData = snap.exists ? (snap.data() as Record<string, unknown>) : null;
        maybeEmit();
      }, () => {}),
    );
    unsubs.push(
      db.collection('league_chest_claims').doc(claimDocId(myUid, meta.weekId, meta.groupId)).onSnapshot((snap) => {
        claimExists = snap.exists;
        maybeEmit();
      }, () => {}),
    );
  })();

  return () => {
    closed = true;
    unsubs.forEach((unsub) => {
      try { unsub(); } catch {}
    });
  };
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

function rewardAmount(drop: LeagueChestRewardDrop | undefined): number {
  return Math.max(0, Math.floor(Number(drop?.amount) || 0));
}

async function grantAvatarAuraReward(auraId?: string): Promise<void> {
  const aura = AVATAR_AURAS.find((item) => item.id === auraId && !item.premiumOnly);
  if (!aura) return;
  const raw = await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY);
  let owned: Record<string, true> = {};
  try {
    owned = raw ? JSON.parse(raw) : {};
  } catch {
    owned = {};
  }
  await AsyncStorage.multiSet([
    [AVATAR_AURA_OWNED_KEY, JSON.stringify({ ...owned, [aura.id]: true })],
    [AVATAR_AURA_GIFT_OWNED_KEY, aura.id],
    [USER_AVATAR_AURA_KEY, aura.id],
  ]);
}

async function grantCustomAvatarReward(drop: LeagueChestRewardDrop): Promise<void> {
  const avatarId = String(drop.customAvatarId ?? '').trim();
  if (!avatarId || !CUSTOM_AVATARS.some((avatar) => avatar.id === avatarId)) return;
  const gradientId = String(drop.gradientId ?? 'noirgold').trim() || 'noirgold';
  const logoColor: CustomAvatarLogoColor = drop.logoColor === 'white' ? 'white' : 'black';
  const raw = await AsyncStorage.getItem(CUSTOM_AVATAR_OWNED_KEY);
  let owned: Record<string, string> = {};
  try {
    owned = raw ? JSON.parse(raw) : {};
  } catch {
    owned = {};
  }
  await AsyncStorage.multiSet([
    [CUSTOM_AVATAR_OWNED_KEY, JSON.stringify({ ...owned, [avatarId]: `${gradientId}:${logoColor}` })],
    [CUSTOM_AVATAR_GIFT_OWNED_KEY, avatarId],
  ]);
}

async function applyLocalRewardPack(
  rewardPack: NonNullable<LeagueChestClaim['rewards']>,
  balance?: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const drops = Array.isArray(rewardPack.drops) ? rewardPack.drops : [];
  const expiresAt = Math.max(0, Math.floor(Number(rewardPack.expiresAt) || 0));
  const shardAmount = drops
    .filter((drop) => drop.kind === 'shards' || drop.kind === 'gold_theme_duplicate')
    .reduce((sum, drop) => sum + rewardAmount(drop), 0);

  if (typeof balance === 'number' && Number.isFinite(balance)) {
    await replaceShardsBalanceLocal(balance);
    if (shardAmount > 0) emitAppEvent('shards_earned', { amount: shardAmount, reasonKey: 'league_chest' });
  }

  const writes: [string, string][] = [];
  const xpBoost = drops.find((drop) => drop.kind === 'xp_boost');
  if (xpBoost && expiresAt > Date.now()) {
    writes.push([XP_OVERRIDE_KEY, JSON.stringify({
      multiplier: Math.max(1, Number(xpBoost.multiplier) || 2),
      remainingUses: Math.max(1, Math.floor(Number(xpBoost.uses) || 3)),
      expiresAt,
    })]);
  }

  const energyBoost = drops.find((drop) => drop.kind === 'energy_fast_recovery');
  if (energyBoost && expiresAt > Date.now()) {
    writes.push([ENERGY_OVERRIDE_KEY, JSON.stringify({
      recoveryMs: Math.max(60_000, Math.floor(Number(energyBoost.recoveryMs) || LEAGUE_CHEST_ENERGY_MS)),
      expiresAt,
    })]);
  }

  if (writes.length > 0) await AsyncStorage.multiSet(writes);

  const shieldCount = drops
    .filter((drop) => drop.kind === 'streak_shield')
    .reduce((sum, drop) => sum + Math.max(1, rewardAmount(drop) || 1), 0);
  if (shieldCount > 0) {
    const shieldRaw = await AsyncStorage.getItem(STREAK_SHIELD_KEY);
    let shields = 0;
    try {
      const parsed = shieldRaw ? JSON.parse(shieldRaw) : null;
      shields = Math.max(0, Math.floor(Number(parsed?.daysLeft) || 0));
    } catch {
      shields = 0;
    }
    await AsyncStorage.setItem(STREAK_SHIELD_KEY, JSON.stringify({
      daysLeft: shields + shieldCount,
      grantedAt: new Date().toISOString().split('T')[0],
    }));
  }

  for (const drop of drops) {
    if (drop.kind === 'gold_theme') {
      await unlockLeagueGoldThemeReward('league_chest');
    } else if (drop.kind === 'arena_plays') {
      await addArenaPlaysBonusForToday(rewardAmount(drop) || 5);
    } else if (drop.kind === 'pack_trial_48h') {
      const trial = await setRandomPackGiftTrial48h(studyTarget);
      if (trial) await primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget);
    } else if (drop.kind === 'avatar_aura') {
      await grantAvatarAuraReward(drop.auraId);
    } else if (drop.kind === 'custom_avatar') {
      await grantCustomAvatarReward(drop);
    }
  }

  emitAppEvent('energy_reload');
}

export async function ensureLeagueChestRewards(params: {
  weekId: string;
  groupId: string;
  leagueId: number;
  members: LeagueChestMember[];
  chestReady: boolean;
  myContribution: number;
  studyTarget?: RuntimeStudyTarget;
}): Promise<LeagueChestClaim> {
  if (!params.chestReady || !params.groupId || !params.weekId) return { claimed: false };
  if (params.members.length < LEAGUE_RACE_MIN_PARTICIPANTS) return { claimed: false };
  const myUid = await ensureAnonUser();
  if (!myUid) return { claimed: false };

  const claimKey = localClaimKey(myUid, params.weekId, params.groupId);
  const alreadyLocal = await AsyncStorage.getItem(claimKey);
  if (alreadyLocal === '1') return { claimed: true };

  const fn = callable<
    { weekId: string; groupId: string },
    LeagueChestClaim & { ok?: boolean; balance?: number; alreadyClaimed?: boolean }
  >('leagueChestClaim');
  if (!fn) return { claimed: false };

  try {
    const { data } = await fn({ weekId: params.weekId, groupId: params.groupId });
    if (data.claimed) await AsyncStorage.setItem(claimKey, '1');
    if (data.crown?.uid === myUid) {
      emitAppEvent('league_crown_updated', {
        uid: myUid,
        expiresAt: data.crown.expiresAt,
        crownCount: Math.max(1, Math.floor(Number(data.crown.crownCount) || 1)),
      });
    }
    if (data.rewards) await applyLocalRewardPack(data.rewards, data.balance, params.studyTarget);
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
  const docCountByUid: Record<string, number> = {};
  const storedCountByUid: Record<string, number> = {};
  for (let i = 0; i < unique.length; i += 10) {
    const part = unique.slice(i, i + 10);
    try {
      const snap = await db.collection(CROWNS_COL).where('uid', 'in', part).get();
      snap.docs.forEach((doc) => {
        const d = doc.data() as LeagueCrown;
        if (!d?.uid) return;
        docCountByUid[d.uid] = (docCountByUid[d.uid] ?? 0) + 1;
        storedCountByUid[d.uid] = Math.max(
          storedCountByUid[d.uid] ?? 0,
          Math.floor(Number(d.crownCount) || 0),
        );
        const current = out[d.uid];
        const currentUpdatedAt = Math.max(0, Math.floor(Number((current as any)?.updatedAt) || Number(current?.expiresAt) || 0));
        const nextUpdatedAt = Math.max(0, Math.floor(Number((d as any).updatedAt) || Number(d.expiresAt) || 0));
        if (!current || nextUpdatedAt >= currentUpdatedAt) out[d.uid] = d;
      });
    } catch {
      // ignore chunk
    }
  }
  Object.keys(out).forEach((uid) => {
    out[uid] = {
      ...out[uid],
      crownCount: Math.max(1, storedCountByUid[uid] ?? 0, docCountByUid[uid] ?? 0),
    };
  });
  return out;
}
