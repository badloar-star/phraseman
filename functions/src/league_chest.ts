import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'us-central1';
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const PACK_TRIAL_MS = 48 * 60 * 60 * 1000;
const MIN_CONTRIBUTION = 500;
const MIN_RACE_PARTICIPANTS = 10;
const BASE_SHARDS_MIN = 15;
const BASE_SHARDS_MAX = 35;
const GOLD_DUPLICATE_SHARDS = 25;
const AURA_DUPLICATE_SHARDS = 10;
const AVATAR_DUPLICATE_SHARDS = 12;
const ENERGY_MS = 5 * 60 * 1000;
const LEAGUE_CHEST_BASE_GOAL = 200_000;
const LEAGUE_CHEST_GOAL_STEP = 20_000;
const CROWN_AURA = 'league_chest_crown';
const CROWN_NICK_COLOR = '#16B7D9';
const GOLD_THEME_UNLOCK_KEY = 'league_gold_theme_unlocked_v1';
const GOLD_THEME_UNLOCK_AT_KEY = 'league_gold_theme_unlocked_at';
const ENERGY_OVERRIDE_KEY = 'league_chest_energy_override_v1';
const XP_OVERRIDE_KEY = 'league_chest_xp_override_v1';
const STREAK_SHIELD_KEY = 'chain_shield';
const ARENA_DAILY_GIFT_BONUS_KEY = 'arena_daily_gift_bonus_v1';
const PACK_TRIAL_GIFT_KEY = 'flashcard_pack_trial_gift_v1';
const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
const CUSTOM_AVATAR_OWNED_KEY = 'custom_avatar_owned_v1';
const CUSTOM_AVATAR_GIFT_OWNED_KEY = 'custom_avatar_gift_owned_v1';
const AVATAR_AURA_IDS = ['aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-gold', 'aura-coral'] as const;
const CUSTOM_AVATAR_DROP_IDS = Array.from(
  { length: 10 },
  (_, index) => `custom-gen-${String(index + 1).padStart(2, '0')}`,
) as readonly string[];
const CUSTOM_AVATAR_GRADIENT_IDS = ['aurora', 'ember', 'cosmic', 'forest', 'citrine', 'royal', 'ruby', 'magma', 'noirgold', 'sakura'] as const;

type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';
type RewardKind =
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

type RewardDrop = {
  id: string;
  kind: RewardKind;
  rarity: RewardRarity;
  amount?: number;
  multiplier?: number;
  uses?: number;
  recoveryMs?: number;
  expiresAt?: number;
  auraId?: string;
  customAvatarId?: string;
  gradientId?: string;
  logoColor?: 'black' | 'white';
};

function sanitizeString(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readInt(value: unknown, fallback = 0): number {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function getLeagueChestGoal(leagueId: unknown): number {
  const id = Math.max(0, readInt(leagueId, 0));
  return LEAGUE_CHEST_BASE_GOAL + id * LEAGUE_CHEST_GOAL_STEP;
}

function safeId(value: string): string {
  return value.replace(/[^\w.-]/g, '_').slice(0, 140);
}

function claimDocId(uid: string, weekId: string, groupId: string): string {
  return `${safeId(weekId)}_${safeId(groupId)}_${safeId(uid)}`;
}

function crownDocId(uid: string, weekId: string): string {
  return `${safeId(uid)}_${safeId(weekId)}`;
}

function eventDocId(weekId: string, groupId: string): string {
  return `${safeId(weekId)}_${safeId(groupId)}`;
}

function currentWeekId(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function resolveStableUid(db: FirebaseFirestore.Firestore, authUid: string): Promise<string> {
  const direct = await db.collection('users').doc(authUid).get().catch(() => null);
  if (direct?.exists) return authUid;
  const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
  if (!byAuth.empty) return byAuth.docs[0].id;
  return authUid;
}

async function assertNotBanned(db: FirebaseFirestore.Firestore, stableUid: string): Promise<void> {
  const [userSnap, bannedSnap] = await Promise.all([
    db.collection('users').doc(stableUid).get().catch(() => null),
    db.collection('banned_users').doc(stableUid).get().catch(() => null),
  ]);
  if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
    throw new HttpsError('permission-denied', 'user_banned');
  }
}

function parseShield(raw: unknown): { daysLeft: number } {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { daysLeft: Math.max(0, readInt(parsed?.daysLeft, 0)) };
  } catch {
    return { daysLeft: 0 };
  }
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function getProgress(data: FirebaseFirestore.DocumentData | undefined): Record<string, unknown> {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function getExistingField(data: FirebaseFirestore.DocumentData | undefined, key: string): unknown {
  const progress = getProgress(data);
  return data?.[key] ?? progress[key] ?? data?.[`progress.${key}`];
}

function todayStrUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rollUnit(seed: string): number {
  return hash32(seed) / 0x100000000;
}

function rollChance(seed: string, chance: number): boolean {
  return rollUnit(seed) < chance;
}

function rollInt(seed: string, min: number, max: number): number {
  const lo = Math.floor(min);
  const hi = Math.floor(max);
  return lo + Math.floor(rollUnit(seed) * (hi - lo + 1));
}

function pickOne<T>(seed: string, items: readonly T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.min(items.length - 1, Math.floor(rollUnit(seed) * items.length))] ?? null;
}

function sumShardDrops(drops: RewardDrop[]): number {
  return drops.reduce((sum, drop) => (
    drop.kind === 'shards' || drop.kind === 'gold_theme_duplicate'
      ? sum + Math.max(0, readInt(drop.amount, 0))
      : sum
  ), 0);
}

function buildLeagueRewardDrops(params: {
  stableUid: string;
  weekId: string;
  groupId: string;
  user: FirebaseFirestore.DocumentData | undefined;
  expiresAt: number;
  isCrownWinner: boolean;
}): RewardDrop[] {
  const { stableUid, weekId, groupId, user, expiresAt, isCrownWinner } = params;
  const seed = `${weekId}:${groupId}:${stableUid}`;
  const drops: RewardDrop[] = [];
  const baseShards = rollInt(`${seed}:base_shards`, BASE_SHARDS_MIN, BASE_SHARDS_MAX);
  drops.push({ id: 'league_shards', kind: 'shards', rarity: 'common', amount: baseShards });

  const addIf = (id: string, chance: number, drop: RewardDrop) => {
    if (rollChance(`${seed}:${id}`, chance)) drops.push(drop);
  };

  addIf('xp_boost', 0.45, {
    id: 'league_xp_2x_3',
    kind: 'xp_boost',
    rarity: 'rare',
    multiplier: 2,
    uses: 3,
    expiresAt,
  });
  addIf('energy_fast_recovery', 0.35, {
    id: 'league_energy_5m_week',
    kind: 'energy_fast_recovery',
    rarity: 'rare',
    recoveryMs: ENERGY_MS,
    expiresAt,
  });
  addIf('streak_shield', 0.22, {
    id: 'league_streak_shield_1',
    kind: 'streak_shield',
    rarity: 'rare',
    amount: 1,
  });
  addIf('arena_plays', 0.20, {
    id: 'league_arena_plays_5',
    kind: 'arena_plays',
    rarity: 'common',
    amount: 5,
  });
  addIf('bonus_shards', 0.15, {
    id: 'league_bonus_shards',
    kind: 'shards',
    rarity: 'rare',
    amount: rollInt(`${seed}:bonus_shards_amount`, 10, 22),
  });
  addIf('pack_trial_48h', 0.08, {
    id: 'league_pack_trial_48h',
    kind: 'pack_trial_48h',
    rarity: 'epic',
    expiresAt: Date.now() + PACK_TRIAL_MS,
  });

  const ownedAuras = parseJsonObject(getExistingField(user, AVATAR_AURA_OWNED_KEY));
  const auraCandidates = AVATAR_AURA_IDS.filter((auraId) => ownedAuras[auraId] !== true);
  if (rollChance(`${seed}:avatar_aura`, isCrownWinner ? 0.22 : 0.10)) {
    const auraId = pickOne(`${seed}:avatar_aura_pick`, auraCandidates);
    if (auraId) {
      drops.push({ id: `league_${auraId}`, kind: 'avatar_aura', rarity: 'epic', auraId });
    } else {
      drops.push({ id: 'league_aura_duplicate_shards', kind: 'shards', rarity: 'rare', amount: AURA_DUPLICATE_SHARDS });
    }
  }

  if (CUSTOM_AVATAR_DROP_IDS.length > 0 && rollChance(`${seed}:custom_avatar`, isCrownWinner ? 0.12 : 0.06)) {
    const ownedAvatars = parseJsonObject(getExistingField(user, CUSTOM_AVATAR_OWNED_KEY));
    const avatarCandidates = CUSTOM_AVATAR_DROP_IDS.filter((avatarId) => typeof ownedAvatars[avatarId] !== 'string');
    const customAvatarId = pickOne(`${seed}:custom_avatar_pick`, avatarCandidates);
    const gradientId = pickOne(`${seed}:custom_avatar_gradient`, CUSTOM_AVATAR_GRADIENT_IDS) ?? 'noirgold';
    const logoColor = rollChance(`${seed}:custom_avatar_logo`, 0.5) ? 'white' : 'black';
    if (customAvatarId) {
      drops.push({ id: `league_${customAvatarId}`, kind: 'custom_avatar', rarity: 'epic', customAvatarId, gradientId, logoColor });
    } else {
      drops.push({ id: 'league_avatar_duplicate_shards', kind: 'shards', rarity: 'rare', amount: AVATAR_DUPLICATE_SHARDS });
    }
  }

  const hasGold = String(getExistingField(user, GOLD_THEME_UNLOCK_KEY) ?? '') === '1';
  if (rollChance(`${seed}:gold_theme`, isCrownWinner ? 0.08 : 0.05)) {
    if (hasGold) {
      drops.push({ id: 'league_gold_duplicate', kind: 'gold_theme_duplicate', rarity: 'legendary', amount: GOLD_DUPLICATE_SHARDS });
    } else {
      drops.push({ id: 'league_gold_theme', kind: 'gold_theme', rarity: 'legendary' });
    }
  }

  return drops;
}

function buildRewardProgressPatch(params: {
  drops: RewardDrop[];
  user: FirebaseFirestore.DocumentData | undefined;
  now: number;
  expiresAt: number;
}): Record<string, unknown> {
  const { drops, user, now, expiresAt } = params;
  const today = todayStrUtc();
  const patch: Record<string, unknown> = {};
  const progressPatch: Record<string, unknown> = {};

  const xpBoost = drops.find((drop) => drop.kind === 'xp_boost');
  if (xpBoost) {
    progressPatch[XP_OVERRIDE_KEY] = JSON.stringify({
      multiplier: Math.max(1, Number(xpBoost.multiplier) || 2),
      remainingUses: Math.max(1, readInt(xpBoost.uses, 3)),
      expiresAt,
    });
  }

  const energyBoost = drops.find((drop) => drop.kind === 'energy_fast_recovery');
  if (energyBoost) {
    progressPatch[ENERGY_OVERRIDE_KEY] = JSON.stringify({
      recoveryMs: Math.max(60_000, readInt(energyBoost.recoveryMs, ENERGY_MS)),
      expiresAt,
    });
  }

  const shieldCount = drops
    .filter((drop) => drop.kind === 'streak_shield')
    .reduce((sum, drop) => sum + Math.max(1, readInt(drop.amount, 1)), 0);
  if (shieldCount > 0) {
    const shield = parseShield(getExistingField(user, STREAK_SHIELD_KEY));
    const next = JSON.stringify({ daysLeft: shield.daysLeft + shieldCount, grantedAt: today });
    patch[STREAK_SHIELD_KEY] = next;
    progressPatch[STREAK_SHIELD_KEY] = next;
  }

  const arenaPlays = drops
    .filter((drop) => drop.kind === 'arena_plays')
    .reduce((sum, drop) => sum + Math.max(1, readInt(drop.amount, 5)), 0);
  if (arenaPlays > 0) {
    const cur = parseJsonObject(getExistingField(user, ARENA_DAILY_GIFT_BONUS_KEY));
    const sameDay = cur.date === today;
    const extra = sameDay ? Math.max(0, readInt(cur.extra, 0)) : 0;
    progressPatch[ARENA_DAILY_GIFT_BONUS_KEY] = JSON.stringify({ date: today, extra: extra + arenaPlays });
  }

  if (drops.some((drop) => drop.kind === 'pack_trial_48h')) {
    progressPatch[PACK_TRIAL_GIFT_KEY] = JSON.stringify({ packId: 'league_bonus_voucher', expiresAt: now + PACK_TRIAL_MS });
  }

  const auraDrop = drops.find((drop) => drop.kind === 'avatar_aura' && drop.auraId);
  if (auraDrop?.auraId) {
    const owned = parseJsonObject(getExistingField(user, AVATAR_AURA_OWNED_KEY));
    progressPatch[AVATAR_AURA_OWNED_KEY] = JSON.stringify({ ...owned, [auraDrop.auraId]: true });
    progressPatch[AVATAR_AURA_GIFT_OWNED_KEY] = auraDrop.auraId;
    progressPatch[USER_AVATAR_AURA_KEY] = auraDrop.auraId;
  }

  const avatarDrop = drops.find((drop) => drop.kind === 'custom_avatar' && drop.customAvatarId);
  if (avatarDrop?.customAvatarId) {
    const owned = parseJsonObject(getExistingField(user, CUSTOM_AVATAR_OWNED_KEY));
    const gradientId = avatarDrop.gradientId || 'noirgold';
    const logoColor = avatarDrop.logoColor === 'white' ? 'white' : 'black';
    progressPatch[CUSTOM_AVATAR_OWNED_KEY] = JSON.stringify({
      ...owned,
      [avatarDrop.customAvatarId]: `${gradientId}:${logoColor}`,
    });
    progressPatch[CUSTOM_AVATAR_GIFT_OWNED_KEY] = avatarDrop.customAvatarId;
  }

  if (drops.some((drop) => drop.kind === 'gold_theme')) {
    progressPatch[GOLD_THEME_UNLOCK_KEY] = '1';
    progressPatch[GOLD_THEME_UNLOCK_AT_KEY] = String(now);
  }

  if (Object.keys(progressPatch).length > 0) patch.progress = progressPatch;
  return patch;
}

export const leagueChestClaim = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const weekId = sanitizeString(request.data?.weekId, 20) || currentWeekId();
  const groupId = sanitizeString(request.data?.groupId, 180);
  if (!groupId) throw new HttpsError('invalid-argument', 'group_required');
  if (weekId !== currentWeekId()) throw new HttpsError('failed-precondition', 'stale_week');

  const groupRef = db.collection('league_groups').doc(groupId);
  const lbRef = db.collection('leaderboard').doc(stableUid);
  const claimRef = db.collection('league_chest_claims').doc(claimDocId(stableUid, weekId, groupId));
  const eventRef = db.collection('league_chest_events').doc(eventDocId(weekId, groupId));
  const arenaEventRef = db.collection('arena_club_events').doc(`${safeId(weekId)}_${safeId(groupId)}`);
  const userRef = db.collection('users').doc(stableUid);
  const now = Date.now();
  const expiresAt = now + MS_WEEK;

  return db.runTransaction(async (tx) => {
    const [groupSnap, lbSnap, claimSnap, userSnap, eventSnap, arenaEventSnap] = await Promise.all([
      tx.get(groupRef),
      tx.get(lbRef),
      tx.get(claimRef),
      tx.get(userRef),
      tx.get(eventRef),
      tx.get(arenaEventRef),
    ]);

    if (!groupSnap.exists) throw new HttpsError('not-found', 'league_group_not_found');
    const group = groupSnap.data() || {};
    if (group.weekId !== weekId) throw new HttpsError('permission-denied', 'week_mismatch');
    const leagueId = Math.max(0, readInt(group.leagueId, 0));
    const lb = lbSnap.data() || {};
    if (lb.groupId !== groupId || lb.groupWeekId !== weekId) {
      throw new HttpsError('permission-denied', 'room_mismatch');
    }

    const membersRaw = group.members && typeof group.members === 'object' ? group.members : {};
    const members = Object.entries(membersRaw as Record<string, Record<string, unknown>>)
      .map(([uid, m]) => ({
        uid,
        name: sanitizeString(m?.name, 48) || 'Player',
        points: Math.max(0, readInt(m?.points, 0)),
      }))
      .filter((m) => !!m.uid);
    if (!members.some((m) => m.uid === stableUid)) {
      throw new HttpsError('permission-denied', 'not_group_member');
    }
    if (members.length < MIN_RACE_PARTICIPANTS) {
      return { ok: true, claimed: false, status: 'not_enough_participants' };
    }

    const goal = getLeagueChestGoal(leagueId);
    const leaguePoints = members.reduce((sum, m) => sum + m.points, 0);
    const arenaEvent = arenaEventSnap.data() || {};
    const arenaBonus = Math.max(0, readInt(arenaEvent.totalPoints, 0));
    const totalPoints = leaguePoints + arenaBonus;
    if (totalPoints < goal) {
      return { ok: true, claimed: false, status: 'not_ready', progress: totalPoints, goal };
    }
    const existingReachedAt = Math.max(0, readInt(eventSnap.data()?.firstReachedAt, 0));
    const groupCreatedAt = Math.max(0, readInt(group.createdAt, 0));
    const firstReachedAt = existingReachedAt || now;
    const completedInMs = groupCreatedAt > 0 ? Math.max(0, firstReachedAt - groupCreatedAt) : null;

    members.sort((a, b) => b.points - a.points);
    const winner = members[0];
    const crown = winner
      ? {
        uid: winner.uid,
        name: winner.name,
        weekId,
        groupId,
        leagueId,
        expiresAt,
        aura: CROWN_AURA,
      }
      : null;

    if (crown) {
      const existingExpiresAt = Math.max(0, readInt(eventSnap.data()?.expiresAt, 0));
      const finalExpiresAt = Math.max(existingExpiresAt, expiresAt);
      tx.set(eventRef, {
        ...crown,
        expiresAt: finalExpiresAt,
        firstReachedAt,
        completedInMs,
        roomPoints: totalPoints,
        goal,
        memberCount: members.length,
        leaguePoints,
        arenaBonus,
        updatedAt: now,
      }, { merge: true });
      tx.set(db.collection('league_crowns').doc(crownDocId(crown.uid, weekId)), {
        ...crown,
        expiresAt: finalExpiresAt,
        nickColor: CROWN_NICK_COLOR,
        updatedAt: now,
      }, { merge: true });
      tx.set(db.collection('leaderboard').doc(crown.uid), {
        leagueCrownExpiresAt: finalExpiresAt,
        leagueCrownWeekId: crown.weekId,
        leagueCrownGroupId: crown.groupId,
        leagueCrownAura: crown.aura,
      }, { merge: true });
    }

    const arenaMembers = arenaEvent.members && typeof arenaEvent.members === 'object'
      ? arenaEvent.members as Record<string, Record<string, unknown>>
      : {};
    const myContribution = Math.max(0, readInt(membersRaw[stableUid]?.points, 0))
      + Math.max(0, readInt(arenaMembers[stableUid]?.points, 0));
    if (myContribution < MIN_CONTRIBUTION) {
      return { ok: true, claimed: false, status: 'low_contribution', crown };
    }

    if (claimSnap.exists) {
      return { ok: true, claimed: true, alreadyClaimed: true, crown };
    }

    const user = userSnap.data() || {};
    const isCrownWinner = !!crown && crown.uid === stableUid;
    const rewardDrops = buildLeagueRewardDrops({
      stableUid,
      weekId,
      groupId,
      user,
      expiresAt,
      isCrownWinner,
    });
    const shardReward = sumShardDrops(rewardDrops);
    const beforeShards = Math.max(0, readInt(user.shards, 0));
    const afterShards = beforeShards + shardReward;
    const xpBoost = rewardDrops.find((drop) => drop.kind === 'xp_boost');
    const energyBoost = rewardDrops.find((drop) => drop.kind === 'energy_fast_recovery');
    const streakShieldCount = rewardDrops
      .filter((drop) => drop.kind === 'streak_shield')
      .reduce((sum, drop) => sum + Math.max(1, readInt(drop.amount, 1)), 0);
    const userPatch: Record<string, unknown> = {
      ...buildRewardProgressPatch({ drops: rewardDrops, user, now, expiresAt }),
      updatedAt: now,
    };
    if (shardReward > 0) {
      userPatch.shards = afterShards;
      userPatch.shards_updated_at_ms = now;
      userPatch.shards_updated_op = 'earn';
      userPatch.shards_updated_reason = 'league_chest';
    }

    tx.set(claimRef, {
      uid: stableUid,
      authUid,
      weekId,
      groupId,
      leagueId,
      contribution: myContribution,
      roomPoints: totalPoints,
      goal,
      rewards: rewardDrops,
      shards: shardReward,
      energyRecoveryMs: energyBoost ? Math.max(60_000, readInt(energyBoost.recoveryMs, ENERGY_MS)) : 0,
      xpOverrideMultiplier: xpBoost ? Math.max(1, Number(xpBoost.multiplier) || 2) : 1,
      xpOverrideUses: xpBoost ? Math.max(1, readInt(xpBoost.uses, 3)) : 0,
      streakShieldCount,
      themeGoldUnlocked: rewardDrops.some((drop) => drop.kind === 'gold_theme'),
      expiresAt,
      createdAt: now,
    });

    tx.set(userRef, userPatch, { merge: true });
    if (shardReward > 0) {
      tx.set(userRef.collection('shard_log').doc(), {
        ts: new Date(now).toISOString(),
        type: 'earn',
        amount: shardReward,
        reason: 'league_chest',
        balanceBefore: beforeShards,
        balanceAfter: afterShards,
        weekId,
        groupId,
      });
    }

    return {
      ok: true,
      claimed: true,
      crown,
      balance: afterShards,
      rewards: {
        drops: rewardDrops,
        shards: shardReward,
        energyRecoveryMs: energyBoost ? Math.max(60_000, readInt(energyBoost.recoveryMs, ENERGY_MS)) : undefined,
        xpOverrideMultiplier: xpBoost ? Math.max(1, Number(xpBoost.multiplier) || 2) : undefined,
        xpOverrideUses: xpBoost ? Math.max(1, readInt(xpBoost.uses, 3)) : undefined,
        streakShieldCount: streakShieldCount > 0 ? streakShieldCount : undefined,
        themeGoldUnlocked: rewardDrops.some((drop) => drop.kind === 'gold_theme'),
        expiresAt,
      },
    };
  });
});
