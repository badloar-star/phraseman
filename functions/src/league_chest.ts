import * as admin from 'firebase-admin';
import { appendExternalEconomyEvent } from './external_economy_events';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { isResidentMember } from './league_residents';

const REGION = 'us-central1';
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const PACK_TRIAL_MS = 48 * 60 * 60 * 1000;
const MIN_RACE_PARTICIPANTS = 10;
// Новая экономика (план 2026-07-20, §7): сундук лиги больше не даёт монет —
// все shard-дропы обнулены (косметика/титулы сундука сохранены). Структура
// дропов не удалена: sumShardDrops складывает нули, а guard-ы shardReward > 0
// ниже просто не срабатывают.
const BASE_SHARDS_MIN = 0;
const BASE_SHARDS_MAX = 0;
const GOLD_DUPLICATE_SHARDS = 0;
const AURA_DUPLICATE_SHARDS = 0;
const AVATAR_DUPLICATE_SHARDS = 0;
// зачем: владелец 2026-08-23 — база восстановления стала 30 минут вместо 10,
// и прежние 5 минут означали бы ускорение вшестеро (снятие лимита на неделю).
// Выбрано «на треть быстрее»: 30 → 20 минут. ОБЯЗАНО совпадать с клиентским
// LEAGUE_CHEST_ENERGY_MS в app/services/league_chest_rewards.ts.
const ENERGY_MS = 20 * 60 * 1000;
// зачем (владелец 2026-08-04): комнаты дозаполняются жителями, и их опыт по
// решению владельца засчитывается в общую цель. Замер показал: 28 жителей дают
// ~159 000 XP за неделю, то есть прежний порог 200 000 закрывался бы почти без
// участия человека и сундук перестал бы быть достижением. Владелец поднял базу
// до 400 000; шаг за лигу прежний.
const LEAGUE_CHEST_BASE_GOAL = 400_000;
const LEAGUE_CHEST_GOAL_STEP = 20_000;
const CROWN_AURA = 'league_chest_crown';
const CROWN_NICK_COLOR = '#16B7D9';
const GOLD_THEME_UNLOCK_KEY = 'league_gold_theme_unlocked_v1';
const GOLD_THEME_UNLOCK_AT_KEY = 'league_gold_theme_unlocked_at';
const ENERGY_OVERRIDE_KEY = 'league_chest_energy_override_v1';
const XP_OVERRIDE_KEY = 'league_chest_xp_override_v1';
const STREAK_SHIELD_KEY = 'chain_shield';
const PACK_TRIAL_GIFT_KEY = 'flashcard_pack_trial_gift_v1';
const PACK_GIFT_GRANTS = 'flashcard_pack_gift_grants';
const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
const CUSTOM_AVATAR_OWNED_KEY = 'custom_avatar_owned_v1';
const CUSTOM_AVATAR_GIFT_OWNED_KEY = 'custom_avatar_gift_owned_v1';
const AVATAR_AURA_IDS = ['aura-ember', 'aura-mint', 'aura-prism'] as const;
const CUSTOM_AVATAR_DROP_IDS = Array.from(
  { length: 30 },
  (_, index) => `custom-gen-${String(index + 1).padStart(2, '0')}`,
) as readonly string[];
const CUSTOM_AVATAR_GRADIENT_IDS = ['aurora', 'ember', 'cosmic', 'forest', 'citrine', 'royal', 'ruby', 'magma', 'noirgold', 'sakura'] as const;

type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary';
type RewardKind =
  | 'shards'
  | 'xp_boost'
  // зачем (владелец, 2026-08-24): у сундука друзей появились прямые награды —
  // пачка опыта и полное восстановление шкалы энергии. Оба вида ЖИВУТ ЗДЕСЬ,
  // потому что RewardDrop общий для сундуков лиги и друзей; сундук лиги их
  // просто не кладёт, так что его выдача не меняется ни на единицу.
  | 'xp_grant'
  | 'energy_refill'
  | 'energy_fast_recovery'
  | 'streak_shield'
  | 'pack_trial_48h'
  | 'avatar_aura'
  | 'custom_avatar'
  | 'gold_theme'
  | 'gold_theme_duplicate';

export type RewardDrop = {
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

function isLeagueChestAuraId(value: unknown): value is typeof AVATAR_AURA_IDS[number] {
  return typeof value === 'string' && AVATAR_AURA_IDS.includes(value as typeof AVATAR_AURA_IDS[number]);
}

function buildClaimedRewardResponse(params: {
  claim: FirebaseFirestore.DocumentData | undefined;
}): {
  rewards?: {
    drops: RewardDrop[];
    shards?: number;
    energyRecoveryMs?: number;
    xpOverrideMultiplier?: number;
    xpOverrideUses?: number;
    streakShieldCount?: number;
    themeGoldUnlocked?: boolean;
    packGiftVoucherId?: string;
    expiresAt: number;
  };
  claimedAtMs: number;
} {
  const { claim } = params;
  const drops = Array.isArray(claim?.rewards) ? claim?.rewards as RewardDrop[] : [];
  const expiresAt = Math.max(0, readInt(claim?.expiresAt, 0));
  const rewardPayload = drops.length > 0 && expiresAt > 0
    ? {
      drops,
      shards: Math.max(0, readInt(claim?.shards, 0)),
      energyRecoveryMs: Math.max(0, readInt(claim?.energyRecoveryMs, 0)) || undefined,
      xpOverrideMultiplier: Math.max(1, Number(claim?.xpOverrideMultiplier) || 1) || undefined,
      xpOverrideUses: Math.max(0, readInt(claim?.xpOverrideUses, 0)) || undefined,
      streakShieldCount: Math.max(0, readInt(claim?.streakShieldCount, 0)) || undefined,
      themeGoldUnlocked: claim?.themeGoldUnlocked === true,
      packGiftVoucherId: sanitizeString(claim?.packGiftVoucherId, 180) || undefined,
      expiresAt,
    }
    : undefined;
  return {
    rewards: rewardPayload,
    claimedAtMs: Math.max(0, readInt(claim?.createdAt, 0)),
  };
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

/**
 * Патч в `progress` по выданным дропам.
 *
 * ВАЖНО (2026-08-24): виды `xp_grant` и `energy_refill` здесь НАМЕРЕННО не
 * обрабатываются — это не забытая ветка. Опыт и шкала энергии живут на
 * устройстве (`app/xp_manager.ts`, `app/energy_system.ts`), сервер их только
 * ОБЪЯВЛЯЕТ в `rewards.drops`, а применяет клиент
 * (`app/friends_together/chest_reward_apply.ts`). Писать их в progress отсюда
 * значило бы завести второй источник правды для опыта — ровно тот класс бага,
 * из-за которого раздваивался счёт звёзд турнира (инцидент 2026-08-04).
 */
export function buildRewardProgressPatch(params: {
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
    const rootDays = parseShield(user?.[STREAK_SHIELD_KEY]).daysLeft;
    const progressDays = parseShield(getProgress(user)[STREAK_SHIELD_KEY]).daysLeft;
    const dottedDays = parseShield(user?.[`progress.${STREAK_SHIELD_KEY}`]).daysLeft;
    const daysLeft = Math.max(rootDays, progressDays, dottedDays);
    const next = JSON.stringify({ daysLeft: daysLeft + shieldCount, grantedAt: today });
    patch[STREAK_SHIELD_KEY] = next;
    progressPatch[STREAK_SHIELD_KEY] = next;
  }

  if (drops.some((drop) => drop.kind === 'pack_trial_48h')) {
    progressPatch[PACK_TRIAL_GIFT_KEY] = JSON.stringify({ packId: 'league_bonus_voucher', expiresAt: now + PACK_TRIAL_MS });
  }

  const auraDrop = drops.find((drop) => drop.kind === 'avatar_aura' && isLeagueChestAuraId(drop.auraId));
  if (auraDrop?.auraId && isLeagueChestAuraId(auraDrop.auraId)) {
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

export const leagueChestClaim = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUid(db, authUid);
  await assertNotBanned(db, stableUid);

  const weekId = sanitizeString(request.data?.weekId, 20) || currentWeekId();
  const groupId = sanitizeString(request.data?.groupId, 180);
  if (!groupId) throw new HttpsError('invalid-argument', 'group_required');

  const groupRef = db.collection('league_groups').doc(groupId);
  const lbRef = db.collection('leaderboard').doc(stableUid);
  const claimRef = db.collection('league_chest_claims').doc(claimDocId(stableUid, weekId, groupId));
  const eventRef = db.collection('league_chest_events').doc(eventDocId(weekId, groupId));
  const userRef = db.collection('users').doc(stableUid);
  const now = Date.now();
  const expiresAt = now + MS_WEEK;

  return db.runTransaction(async (tx) => {
    const [groupSnap, lbSnap, claimSnap, userSnap, eventSnap] = await Promise.all([
      tx.get(groupRef),
      tx.get(lbRef),
      tx.get(claimRef),
      tx.get(userRef),
      tx.get(eventRef),
    ]);

    if (claimSnap.exists) {
      const claim = claimSnap.data() || {};
      if (claim.uid && claim.uid !== stableUid) throw new HttpsError('permission-denied', 'claim_owner_mismatch');
      const crownData = eventSnap.exists ? eventSnap.data() || {} : {};
      const replayCrown = crownData.uid
        ? {
          uid: sanitizeString(crownData.uid, 180),
          name: sanitizeString(crownData.name, 48) || 'Player',
          weekId: sanitizeString(crownData.weekId, 20) || weekId,
          groupId: sanitizeString(crownData.groupId, 180) || groupId,
          leagueId: Math.max(0, readInt(crownData.leagueId, readInt(claim.leagueId, 0))),
          expiresAt: Math.max(0, readInt(crownData.expiresAt, 0)),
          crownCount: Math.max(1, readInt(crownData.crownCount, 1)),
          aura: CROWN_AURA,
        }
        : null;
      const existing = buildClaimedRewardResponse({
        claim,
      });
      return { ok: true, claimed: true, alreadyClaimed: true, crown: replayCrown, ...existing };
    }

    if (weekId !== currentWeekId()) throw new HttpsError('failed-precondition', 'stale_week');
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
        // зачем (владелец 2026-08-04): опыт жителей засчитывается в общую цель
        // недели — это его явное решение. Но корону забрать они не могут:
        // корона пишется в league_crowns и в профиль победителя, у жителя
        // профиля не существует. Поэтому метку тащим до выбора победителя.
        isResident: isResidentMember(uid, m),
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
    const totalPoints = leaguePoints;
    if (totalPoints < goal) {
      return { ok: true, claimed: false, status: 'not_ready', progress: totalPoints, goal };
    }
    const existingReachedAt = Math.max(0, readInt(eventSnap.data()?.firstReachedAt, 0));
    const groupCreatedAt = Math.max(0, readInt(group.createdAt, 0));
    const firstReachedAt = existingReachedAt || now;
    const completedInMs = groupCreatedAt > 0 ? Math.max(0, firstReachedAt - groupCreatedAt) : null;

    members.sort((a, b) => b.points - a.points || a.uid.localeCompare(b.uid));
    // Корону получает лучший ЖИВОЙ игрок. Житель на первом месте — обычная
    // ситуация (они растут круглосуточно), но награда обязана достаться человеку.
    const winner = members.find((m) => !m.isResident);
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
      const crownRef = db.collection('league_crowns').doc(crownDocId(crown.uid, weekId));
      const leaderboardRef = db.collection('leaderboard').doc(crown.uid);
      const [existingCrownSnap, leaderboardSnap] = await Promise.all([
        tx.get(crownRef),
        tx.get(leaderboardRef),
      ]);
      const existingCrownCount = Math.max(
        0,
        readInt(existingCrownSnap.data()?.crownCount, 0),
        readInt(leaderboardSnap.data()?.leagueCrownCount, 0),
      );
      const finalCrownCount = existingCrownSnap.exists
        ? Math.max(1, existingCrownCount)
        : existingCrownCount + 1;
      tx.set(eventRef, {
        ...crown,
        expiresAt: finalExpiresAt,
        crownCount: finalCrownCount,
        firstReachedAt,
        completedInMs,
        roomPoints: totalPoints,
        goal,
        memberCount: members.length,
        leaguePoints,
        updatedAt: now,
      }, { merge: true });
      tx.set(crownRef, {
        ...crown,
        expiresAt: finalExpiresAt,
        crownCount: finalCrownCount,
        nickColor: CROWN_NICK_COLOR,
        updatedAt: now,
      }, { merge: true });
      tx.set(leaderboardRef, {
        leagueCrownActive: true,
        leagueCrownCount: finalCrownCount,
        leagueCrownExpiresAt: finalExpiresAt,
        leagueCrownWeekId: crown.weekId,
        leagueCrownGroupId: crown.groupId,
        leagueCrownAura: crown.aura,
      }, { merge: true });
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
    const xpBoost = rewardDrops.find((drop) => drop.kind === 'xp_boost');
    const energyBoost = rewardDrops.find((drop) => drop.kind === 'energy_fast_recovery');
    const streakShieldCount = rewardDrops
      .filter((drop) => drop.kind === 'streak_shield')
      .reduce((sum, drop) => sum + Math.max(1, readInt(drop.amount, 1)), 0);
    const packGiftDrop = rewardDrops.find((drop) => drop.kind === 'pack_trial_48h');
    const packGiftVoucherId = packGiftDrop ? `league_${claimDocId(stableUid, weekId, groupId)}` : '';
    const userPatch: Record<string, unknown> = {
      ...buildRewardProgressPatch({ drops: rewardDrops, user, now, expiresAt }),
      updatedAt: now,
    };
    if (shardReward > 0) appendExternalEconomyEvent(tx, userRef, {
      source: 'league_chest',
      eventId: claimRef.id,
      ownerStableId: stableUid,
      delta: shardReward,
      reason: 'league_chest',
      kind: 'competition_chest_reward',
      subjectId: claimRef.id,
      payload: { claimEffectId: claimRef.id },
      createdAtMs: now,
    });

    tx.set(claimRef, {
      uid: stableUid,
      authUid,
      weekId,
      groupId,
      leagueId,
      roomPoints: totalPoints,
      goal,
      rewards: rewardDrops,
      shards: shardReward,
      energyRecoveryMs: energyBoost ? Math.max(60_000, readInt(energyBoost.recoveryMs, ENERGY_MS)) : 0,
      xpOverrideMultiplier: xpBoost ? Math.max(1, Number(xpBoost.multiplier) || 2) : 1,
      xpOverrideUses: xpBoost ? Math.max(1, readInt(xpBoost.uses, 3)) : 0,
      streakShieldCount,
      themeGoldUnlocked: rewardDrops.some((drop) => drop.kind === 'gold_theme'),
      packGiftVoucherId: packGiftVoucherId || null,
      expiresAt,
      createdAt: now,
    });

    tx.set(userRef, userPatch, { merge: true });
    if (packGiftDrop && packGiftVoucherId) {
      tx.set(db.collection(PACK_GIFT_GRANTS).doc(packGiftVoucherId), {
        ownerStableUid: stableUid,
        source: 'league_chest',
        sourceId: claimRef.id,
        occurrenceId: packGiftVoucherId,
        expiresAt: Math.max(now + 1, readInt(packGiftDrop.expiresAt, now)),
        createdAt: now,
      });
    }
    if (shardReward > 0) {
      tx.set(userRef.collection('shard_log').doc(), {
        ts: new Date(now).toISOString(),
        type: 'earn',
        amount: shardReward,
        reason: 'league_chest',
        authority: 'external_event',
        weekId,
        groupId,
      });
    }

    return {
      ok: true,
      claimed: true,
      crown,
      claimedAtMs: now,
      rewards: {
        drops: rewardDrops,
        shards: shardReward,
        energyRecoveryMs: energyBoost ? Math.max(60_000, readInt(energyBoost.recoveryMs, ENERGY_MS)) : undefined,
        xpOverrideMultiplier: xpBoost ? Math.max(1, Number(xpBoost.multiplier) || 2) : undefined,
        xpOverrideUses: xpBoost ? Math.max(1, readInt(xpBoost.uses, 3)) : undefined,
        streakShieldCount: streakShieldCount > 0 ? streakShieldCount : undefined,
        themeGoldUnlocked: rewardDrops.some((drop) => drop.kind === 'gold_theme'),
        packGiftVoucherId: packGiftVoucherId || undefined,
        expiresAt,
      },
    };
  });
});
