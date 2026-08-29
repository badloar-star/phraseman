import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { ensureAnonUser } from '../cloud_sync';
import { commitConfirmedExternalShardEvent } from '../shards_system';
import { emitAppEvent } from '../events';
import { LEAGUE_RACE_MIN_PARTICIPANTS } from '../league_race_visibility';
import { setPackGiftTrial48hOnce } from '../flashcards/pack_trial_gift';
import { grantLocalChestSpin } from '../local_level_spins';
import { captureAccountGeneration } from '../account_generation';
import { commitExternalAuraSelectionOccurrence } from '../customization_selection_runtime';
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
export const LEAGUE_CHEST_SHARDS_REWARD = 30;
/**
 * Интервал восстановления энергии, который даёт недельный сундук лиги.
 *
 * зачем: владелец 2026-08-23. Было 5 минут при базе 10 — сундук экономил
 * 5 минут на единицу. После перевода базы на 30 минут те же 5 означали бы
 * ускорение ВШЕСТЕРО и фактически снимали лимит на неделю. Владелец выбрал
 * «на треть быстрее»: 30 → 20 минут.
 *
 * ОБЯЗАНО совпадать с серверным ENERGY_MS в functions/src/league_chest.ts —
 * сервер кладёт это значение в награду, клиент им же валидирует.
 */
export const LEAGUE_CHEST_ENERGY_MS = 20 * 60 * 1000;
// зачем (владелец 2026-08-27: «400 тысяч рун недостижимо даже для ботов»):
// прежние 400 000 калибровались под ОПЫТ. После перевода лиги на руны замер по
// формуле жителей дал комнате из 28 человек ~55 000 РУН за неделю — цель была
// недостижима примерно в семь раз. База 100 000 и шаг 10 000: боты закрывают
// около половины, остальное добирают живые игроки.
//
// Значение обязано совпадать с серверным LEAGUE_CHEST_BASE_GOAL в
// functions/src/league_chest.ts, иначе клиент покажет «готово», а сервер
// откажет в выдаче.
export const LEAGUE_CHEST_BASE_GOAL = 100_000;
export const LEAGUE_CHEST_GOAL_STEP = 10_000;
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
const LOCAL_CLAIM_KEY_PREFIX = 'league_chest_claimed_';
const LOCAL_PENDING_CLAIM_KEY_PREFIX = 'league_chest_claim_pending_';
// зачем (владелец 2026-08-26): модалка сундука лиги показывалась бесконечно —
// сервер на ПОВТОРНЫЙ claim всегда отдаёт полный пакет наград (alreadyClaimed +
// rewards, functions/src/league_chest.ts:477), а единственной защитой от
// повторного показа был useRef в club_screen. Ref живёт только пока смонтирован
// экран: ушёл на другой таб — ref обнулился — при возврате модалка снова.
// Флаг обязан переживать перемонтирование и перезапуск приложения, поэтому он
// лежит в AsyncStorage рядом с маркером самого клейма.
const LOCAL_REVEAL_SHOWN_KEY_PREFIX = 'league_chest_reveal_shown_';
const LOCAL_REWARD_EFFECT_KEY_PREFIX = 'league_chest_reward_effect_';
const LOCAL_CLAIM_MAX_KEYS = 32;
const LOCAL_CLAIM_PRUNE_INTERVAL_MS = 12 * 60 * 60 * 1000;
const leagueChestClaimInFlight = new Map<string, Promise<LeagueChestClaim>>();
let lastLocalClaimPruneAt = 0;
let localClaimPruneInFlight = false;

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
  // зачем (владелец, 2026-08-26): жемчужина в сундуке была фикцией — сервер
  // клал amount=0, модалка рисовала «+N жемчужин», кошелёк не менялся. Награда
  // заменена на 1 спин общей рулетки (см. functions/src/league_chest.ts).
  | 'spin_credit'
  | 'xp_boost'
  | 'energy_fast_recovery'
  | 'streak_shield'
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

const ACTIVE_LEAGUE_CHEST_REWARD_KINDS: ReadonlySet<string> = new Set<LeagueChestRewardKind>([
  'shards', 'spin_credit', 'xp_boost', 'energy_fast_recovery', 'streak_shield', 'pack_trial_48h',
  'avatar_aura', 'custom_avatar', 'gold_theme', 'gold_theme_duplicate',
]);

export function isActiveLeagueChestReward(drop: unknown): drop is LeagueChestRewardDrop {
  return !!drop && typeof drop === 'object'
    && ACTIVE_LEAGUE_CHEST_REWARD_KINDS.has(String((drop as { kind?: unknown }).kind ?? ''));
}

export type LeagueChestClaim = {
  claimed: boolean;
  pending?: boolean;
  claimedAtMs?: number;
  crown?: LeagueCrown | null;
  rewards?: {
    drops: LeagueChestRewardDrop[];
    shards?: number;
    energyRecoveryMs?: number;
    xpOverrideMultiplier?: number;
    xpOverrideUses?: number;
    streakShieldCount?: number;
    themeGoldUnlocked?: boolean;
    packGiftVoucherId?: string;
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
  userUid: string;
};

export function buildLeagueBonusSeenKey(userUid: string, weekId: string): string {
  return `${safeId(userUid)}_${safeId(weekId)}`;
}

export function reserveLeagueBonusNotice(reservations: Set<string>, key: string): boolean {
  if (reservations.has(key)) return false;
  reservations.add(key);
  return true;
}

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
  return `${LOCAL_CLAIM_KEY_PREFIX}${claimDocId(uid, weekId, groupId)}`;
}

function localPendingClaimKey(uid: string, weekId: string, groupId: string): string {
  return `${LOCAL_PENDING_CLAIM_KEY_PREFIX}${claimDocId(uid, weekId, groupId)}`;
}

function localRevealShownKey(uid: string, weekId: string, groupId: string): string {
  return `${LOCAL_REVEAL_SHOWN_KEY_PREFIX}${claimDocId(uid, weekId, groupId)}`;
}

/**
 * Показывали ли уже модалку открытия сундука за эту неделю и эту комнату.
 *
 * зачем: см. комментарий у LOCAL_REVEAL_SHOWN_KEY_PREFIX — сервер отдаёт
 * награды при каждом повторном claim, поэтому «уже показывали» обязано быть
 * ПЕРСИСТЕНТНЫМ, а не жить в памяти экрана.
 */
export async function hasLeagueChestRevealBeenShown(params: {
  weekId: string;
  groupId: string;
}): Promise<boolean> {
  const myUid = await ensureAnonUser();
  if (!myUid || !params.weekId || !params.groupId) return false;
  return (await AsyncStorage
    .getItem(localRevealShownKey(myUid, params.weekId, params.groupId))
    .catch(() => null)) === '1';
}

/** Пометить, что модалку сундука за эту неделю уже показали. */
export async function markLeagueChestRevealShown(params: {
  weekId: string;
  groupId: string;
}): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid || !params.weekId || !params.groupId) return;
  await AsyncStorage
    .setItem(localRevealShownKey(myUid, params.weekId, params.groupId), '1')
    .catch(() => {});
}

async function pruneLocalClaimKeys(retainKey: string): Promise<void> {
  const now = Date.now();
  if (localClaimPruneInFlight || now - lastLocalClaimPruneAt < LOCAL_CLAIM_PRUNE_INTERVAL_MS) return;
  localClaimPruneInFlight = true;
  lastLocalClaimPruneAt = now;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const claimKeys = keys
      .filter((key) => key.startsWith(LOCAL_CLAIM_KEY_PREFIX))
      .sort((a, b) => b.localeCompare(a));
    if (claimKeys.length <= LOCAL_CLAIM_MAX_KEYS) return;
    const keep = new Set(claimKeys.slice(0, LOCAL_CLAIM_MAX_KEYS));
    keep.add(retainKey);
    const staleClaims = claimKeys.filter((key) => !keep.has(key));
    // зачем СТРОГО парой: маркер «модалку показали» удаляем ровно для тех
    // недель, чей маркер клейма тоже уходит. Если чистить их независимо
    // (по своему лимиту), возможен перекос «клейм жив, метка показа стёрта» —
    // и старый сундук показал бы модалку ещё раз. Пара живёт и умирает вместе.
    const staleReveal = staleClaims.map((key) => (
      `${LOCAL_REVEAL_SHOWN_KEY_PREFIX}${key.slice(LOCAL_CLAIM_KEY_PREFIX.length)}`
    ));
    const remove = [...staleClaims, ...staleReveal];
    if (remove.length > 0) await AsyncStorage.multiRemove(remove);
  } catch {
    // Best-effort local marker cleanup only.
  } finally {
    localClaimPruneInFlight = false;
  }
}

function leagueChestClaimRequestKey(uid: string, weekId: string, groupId: string): string {
  return `${safeId(weekId)}:${safeId(groupId)}:${safeId(uid)}`;
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

export type LeagueBonusProgressSnapshot = {
  weekId: string;
  groupId: string;
  leagueId: number;
  members: LeagueChestMember[];
  leaguePoints: number;
  progress: number;
  goal: number;
  ready: boolean;
};

export function buildLeagueBonusProgressSnapshot(params: {
  meta: { weekId: string; groupId: string; leagueId: number };
  groupData?: Record<string, unknown> | null;
}): LeagueBonusProgressSnapshot | null {
  const { meta, groupData } = params;
  if (!groupData || groupData.weekId !== meta.weekId) return null;
  if (Math.max(0, Math.floor(Number(groupData.leagueId) || 0)) !== meta.leagueId) return null;
  const members = parseMembers(groupData.members);
  const leaguePoints = members.reduce((sum, member) => sum + member.points, 0);
  const progress = leaguePoints;
  const goal = getLeagueChestGoal(meta.leagueId);
  return { ...meta, members, leaguePoints, progress, goal, ready: progress >= goal };
}

function buildLeagueBonusAvailability(params: {
  meta: { weekId: string; groupId: string; leagueId: number };
  myUid: string;
  groupData?: Record<string, unknown> | null;
  claimExists: boolean;
  locallyClaimed: boolean;
}): LeagueBonusAvailability | null {
  const { meta, myUid, groupData, claimExists, locallyClaimed } = params;
  const snapshot = buildLeagueBonusProgressSnapshot({ meta, groupData });
  if (!snapshot) return null;
  const { members, goal, progress } = snapshot;
  if (!members.some((m) => m.uid === myUid)) return null;
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
    userUid: myUid,
  };
}

export async function checkLeagueBonusAvailability(): Promise<LeagueBonusAvailability | null> {
  const db = getDb();
  if (!db) return null;
  const [meta, myUid] = await Promise.all([resolveMyLeagueGroupMeta(), ensureAnonUser()]);
  if (!meta || !myUid) return null;
  const claimKey = localClaimKey(myUid, meta.weekId, meta.groupId);
  const pendingClaimKey = localPendingClaimKey(myUid, meta.weekId, meta.groupId);
  const [claimRaw, pendingRaw] = await Promise.all([
    AsyncStorage.getItem(claimKey).catch(() => null),
    AsyncStorage.getItem(pendingClaimKey).catch(() => null),
  ]);
  const locallyClaimed = claimRaw === '1' || pendingRaw === '1';
  if (locallyClaimed) return null;
  const [groupSnap, claimSnap] = await Promise.all([
    db.collection('league_groups').doc(meta.groupId).get().catch(() => null),
    db.collection('league_chest_claims').doc(claimDocId(myUid, meta.weekId, meta.groupId)).get().catch(() => null),
  ]);
  return buildLeagueBonusAvailability({
    meta,
    myUid,
    groupData: groupSnap?.exists ? (groupSnap.data() as Record<string, unknown>) : null,
    claimExists: !!claimSnap?.exists,
    locallyClaimed,
  });
}

export async function fetchLeagueBonusProgressSnapshot(): Promise<LeagueBonusProgressSnapshot | null> {
  const db = getDb();
  if (!db) return null;
  const meta = await resolveMyLeagueGroupMeta();
  if (!meta) return null;
  const groupSnap = await db.collection('league_groups').doc(meta.groupId).get().catch(() => null);
  return buildLeagueBonusProgressSnapshot({
    meta,
    groupData: groupSnap?.exists ? (groupSnap.data() as Record<string, unknown>) : null,
  });
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

/**
 * Read-only вариант (для UI getCurrentMultiplier): возвращает текущий множитель
 * без потребления заряда. Сам consume происходит только в registerXP, иначе UI
 * прожжёт бонус при простом отображении. Зеркалирует логику consume в части
 * валидности (expiresAt, remainingUses, multiplier>1), но не мутирует storage.
 */
export async function peekLeagueChestXpOverrideMultiplier(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(XP_OVERRIDE_KEY);
    if (!raw) return 1;
    const parsed = JSON.parse(raw) as { expiresAt?: number; multiplier?: number; remainingUses?: number };
    const remainingUses = Math.floor(Number(parsed.remainingUses) || 0);
    const multiplier = Number(parsed.multiplier) || 1;
    if (!parsed.expiresAt || Date.now() >= parsed.expiresAt || remainingUses <= 0 || multiplier <= 1) return 1;
    return multiplier;
  } catch {
    return 1;
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

async function grantAvatarAuraReward(auraId?: string, occurrenceId?: string): Promise<void> {
  const aura = AVATAR_AURAS.find((item) =>
    item.id === auraId && !item.premiumOnly && !item.retiredFromShop);
  if (!aura) return;
  const raw = await AsyncStorage.getItem(AVATAR_AURA_OWNED_KEY);
  let owned: Record<string, true> = {};
  try {
    owned = raw ? JSON.parse(raw) : {};
  } catch {
    owned = {};
  }
  const writes: [string, string][] = [
    [AVATAR_AURA_OWNED_KEY, JSON.stringify({ ...owned, [aura.id]: true })],
    [AVATAR_AURA_GIFT_OWNED_KEY, aura.id],
  ];
  // Old callers without an immutable claim occurrence retain their historical
  // behavior; collapsing them to one aura-id grant would silently remove
  // repeated-same-aura semantics.
  if (!occurrenceId) writes.push([USER_AVATAR_AURA_KEY, aura.id]);
  await AsyncStorage.multiSet(writes);
  if (occurrenceId) {
    await commitExternalAuraSelectionOccurrence({
      source: 'league_chest', occurrenceId, auraId: aura.id,
    });
  }
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
  studyTarget?: RuntimeStudyTarget,
  claimEffectId?: string,
  claimedAtMs?: number,
): Promise<void> {
  const drops = Array.isArray(rewardPack.drops) ? rewardPack.drops.filter(isActiveLeagueChestReward) : [];
  const expiresAt = Math.max(0, Math.floor(Number(rewardPack.expiresAt) || 0));
  const shardAmount = drops
    .filter((drop) => drop.kind === 'shards' || drop.kind === 'gold_theme_duplicate')
    .reduce((sum, drop) => sum + rewardAmount(drop), 0);

  if (shardAmount > 0 && claimEffectId) {
    const credited = await commitConfirmedExternalShardEvent({
      source: 'league_chest',
      eventId: claimEffectId,
      delta: shardAmount,
      reason: 'league_chest',
      grant: {
        kind: 'competition_chest_reward',
        subjectId: claimEffectId,
        payload: { claimEffectId },
      },
    });
    if (credited.status !== 'applied' && credited.status !== 'already-applied') {
      throw new Error('league_chest_shard_event_failed');
    }
  }

  const writes: [string, string][] = [];
  const xpBoost = drops.find((drop) => drop.kind === 'xp_boost');
  if (xpBoost && expiresAt > Date.now()) {
    const xpEffectKey = claimEffectId ? `${LOCAL_REWARD_EFFECT_KEY_PREFIX}${safeId(claimEffectId)}_xp_boost` : '';
    if (!xpEffectKey || (await AsyncStorage.getItem(xpEffectKey).catch(() => null)) !== '1') {
      writes.push([XP_OVERRIDE_KEY, JSON.stringify({
        multiplier: Math.max(1, Number(xpBoost.multiplier) || 2),
        remainingUses: Math.max(1, Math.floor(Number(xpBoost.uses) || 3)),
        expiresAt,
      })]);
      if (xpEffectKey) writes.push([xpEffectKey, '1']);
    }
  }

  const energyBoost = drops.find((drop) => drop.kind === 'energy_fast_recovery');
  if (energyBoost && expiresAt > Date.now()) {
    const energyEffectKey = claimEffectId ? `${LOCAL_REWARD_EFFECT_KEY_PREFIX}${safeId(claimEffectId)}_energy_fast_recovery` : '';
    if (!energyEffectKey || (await AsyncStorage.getItem(energyEffectKey).catch(() => null)) !== '1') {
      writes.push([ENERGY_OVERRIDE_KEY, JSON.stringify({
        recoveryMs: Math.max(60_000, Math.floor(Number(energyBoost.recoveryMs) || LEAGUE_CHEST_ENERGY_MS)),
        expiresAt,
      })]);
      if (energyEffectKey) writes.push([energyEffectKey, '1']);
    }
  }

  if (writes.length > 0) await AsyncStorage.multiSet(writes);

  const shieldCount = drops
    .filter((drop) => drop.kind === 'streak_shield')
    .reduce((sum, drop) => sum + Math.max(1, rewardAmount(drop) || 1), 0);
  if (shieldCount > 0) {
    const shieldEffectKey = claimEffectId ? `${LOCAL_REWARD_EFFECT_KEY_PREFIX}${safeId(claimEffectId)}_streak_shield` : '';
    if (shieldEffectKey && (await AsyncStorage.getItem(shieldEffectKey).catch(() => null)) === '1') {
      // Already applied for this league claim.
    } else {
    const shieldRaw = await AsyncStorage.getItem(STREAK_SHIELD_KEY);
    let shields = 0;
    try {
      const parsed = shieldRaw ? JSON.parse(shieldRaw) : null;
      shields = Math.max(0, Math.floor(Number(parsed?.daysLeft) || 0));
    } catch {
      shields = 0;
    }
    const writes: [string, string][] = [[STREAK_SHIELD_KEY, JSON.stringify({
        daysLeft: shields + shieldCount,
        grantedAt: new Date().toISOString().split('T')[0],
      })]];
      if (shieldEffectKey) writes.push([shieldEffectKey, '1']);
      await AsyncStorage.multiSet(writes);
    }
  }

  // зачем (владелец, 2026-08-26): спин — замена фиктивной жемчужины, и он
  // обязан РЕАЛЬНО падать в кошелёк подарков. Ключ идемпотентности собран из
  // id клейма и id дропа: сервер отдаёт тот же пакет наград при каждом
  // повторном обращении к сундуку, поэтому без ключа один сундук выдавал бы
  // спины бесконечно — тот же корень, что и у бесконечной модалки.
  const spinDrops = drops.filter((drop) => drop.kind === 'spin_credit');
  if (spinDrops.length > 0 && claimEffectId) {
    const token = captureAccountGeneration();
    for (const drop of spinDrops) {
      const count = Math.max(1, rewardAmount(drop) || 1);
      for (let index = 0; index < count; index += 1) {
        // writeLocalState сам шлёт 'level_spin_balance_changed', поэтому
        // счётчик спинов на Главной обновляется без отдельного эмита здесь.
        await grantLocalChestSpin(`${claimEffectId}:${drop.id}:${index}`, token).catch(() => false);
      }
    }
  }

  for (const drop of drops) {
    if (drop.kind === 'gold_theme') {
      await unlockLeagueGoldThemeReward('league_chest');
    } else if (drop.kind === 'pack_trial_48h') {
      const trial = await setPackGiftTrial48hOnce(
        studyTarget,
        `${claimEffectId ?? 'league_chest'}:${drop.id}:pack_trial_48h`,
        drop.expiresAt,
        rewardPack.packGiftVoucherId,
        rewardPack.packGiftVoucherId,
        'league_chest',
      );
      if (trial) await primeMarketplaceBuiltCardsCacheFromAccessibleStorage(studyTarget);
    } else if (drop.kind === 'avatar_aura') {
      await grantAvatarAuraReward(
        drop.auraId,
        claimEffectId ? `${claimEffectId}:${drop.id}:avatar_aura` : undefined,
      );
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
  studyTarget?: RuntimeStudyTarget;
}): Promise<LeagueChestClaim> {
  if (!params.chestReady || !params.groupId || !params.weekId) return { claimed: false };
  if (params.members.length < LEAGUE_RACE_MIN_PARTICIPANTS) return { claimed: false };
  const myUid = await ensureAnonUser();
  if (!myUid) return { claimed: false };

  const claimKey = localClaimKey(myUid, params.weekId, params.groupId);
  const pendingClaimKey = localPendingClaimKey(myUid, params.weekId, params.groupId);
  const alreadyLocal = await AsyncStorage.getItem(claimKey);
  if (alreadyLocal === '1') {
    await AsyncStorage.removeItem(pendingClaimKey).catch(() => {});
  } else {
    await AsyncStorage.setItem(pendingClaimKey, '1').catch(() => {});
  }

  const fn = callable<
    { weekId: string; groupId: string },
    LeagueChestClaim & { ok?: boolean; alreadyClaimed?: boolean }
  >('leagueChestClaim');
  if (!fn) return { claimed: true, pending: alreadyLocal !== '1' };
  const key = leagueChestClaimRequestKey(myUid, params.weekId, params.groupId);
  const existing = leagueChestClaimInFlight.get(key);
  if (existing) return existing;

  const request = (async () => {
    try {
      const { data } = await fn({ weekId: params.weekId, groupId: params.groupId });
      const safeRewards = data.rewards ? {
        ...data.rewards,
        drops: Array.isArray(data.rewards.drops) ? data.rewards.drops.filter(isActiveLeagueChestReward) : [],
      } : undefined;
      const safeData = { ...data, rewards: safeRewards };
      if (safeData.claimed) {
        if (safeData.crown?.uid === myUid) {
          emitAppEvent('league_crown_updated', {
            uid: myUid,
            expiresAt: safeData.crown.expiresAt,
            crownCount: Math.max(1, Math.floor(Number(safeData.crown.crownCount) || 1)),
          });
        }
        if (safeData.rewards) {
          await applyLocalRewardPack(
            safeData.rewards,
            params.studyTarget,
            claimDocId(myUid, params.weekId, params.groupId),
            safeData.claimedAtMs,
          );
        }
        await AsyncStorage.setItem(claimKey, '1');
        await AsyncStorage.removeItem(pendingClaimKey).catch(() => {});
        void pruneLocalClaimKeys(claimKey).catch(() => {});
      } else {
        await AsyncStorage.removeItem(pendingClaimKey).catch(() => {});
      }
      return safeData;
    } catch {
      return { claimed: true, pending: alreadyLocal !== '1' };
    }
  })().finally(() => {
    leagueChestClaimInFlight.delete(key);
  });

  leagueChestClaimInFlight.set(key, request);
  return request;
}

export async function hasLeagueChestClaimOrPending(params: {
  weekId: string;
  groupId: string;
}): Promise<boolean> {
  const myUid = await ensureAnonUser();
  if (!myUid || !params.weekId || !params.groupId) return false;
  const [claimRaw, pendingRaw] = await Promise.all([
    AsyncStorage.getItem(localClaimKey(myUid, params.weekId, params.groupId)).catch(() => null),
    AsyncStorage.getItem(localPendingClaimKey(myUid, params.weekId, params.groupId)).catch(() => null),
  ]);
  return claimRaw === '1' || pendingRaw === '1';
}

export async function hasLeagueChestPendingClaim(params: {
  weekId: string;
  groupId: string;
}): Promise<boolean> {
  const myUid = await ensureAnonUser();
  if (!myUid || !params.weekId || !params.groupId) return false;
  return (await AsyncStorage.getItem(localPendingClaimKey(myUid, params.weekId, params.groupId)).catch(() => null)) === '1';
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
