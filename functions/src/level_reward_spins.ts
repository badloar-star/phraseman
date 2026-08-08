import * as admin from 'firebase-admin';
import { randomInt } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { ACCOUNT_DELETE_AUTH_MARKERS, ACCOUNT_DELETE_TOMBSTONES } from './account_delete_job';

export const LEVEL_SPIN_PROTOCOL = 'v1' as const;
export const LEVEL_SPIN_CATALOG_VERSION = 1;
export const LEVEL_SPIN_SCHEMA_VERSION = 1;
export const LEVEL_SPIN_RESULT_TTL_MS = 72 * 60 * 60 * 1000;
export const LEVEL_SPIN_MAX_LEVEL = 60;

export type LevelSpinKind = 'standard' | 'milestone';
export type LevelExamSpinLevel = 'A1' | 'A2' | 'B1' | 'B2';
export type LevelSpinCreditSummary = {
  id: string;
  level: number;
  kind: LevelSpinKind;
};
export type LevelSpinReward = {
  baseGiftId: string;
  premiumGiftId?: string;
};
export type CurrentLevelSpinEntitlement = 'plus' | 'standard' | 'unknown';

export type LevelSpinRevealState = 'pending' | 'acknowledged';
export type LevelSpinDeliveryState = 'unclaimed' | 'delivering' | 'delivered' | 'expired';
export type LevelSpinDeliveryLane = 'base' | 'premium';
export type LevelSpinLaneDeliveryState = {
  state: LevelSpinDeliveryState;
  deliveryToken?: string | null;
  deliveryLeaseUntilMs?: number;
  deliveredAtMs?: number;
  selectedGiftId?: string;
};
export type LevelSpinResultMutableState = {
  revealState: LevelSpinRevealState;
  deliveries: Partial<Record<LevelSpinDeliveryLane, LevelSpinLaneDeliveryState>> & {
    base: LevelSpinLaneDeliveryState;
  };
  acknowledgedAtMs?: number;
};

export type LevelSpinResultAction =
  | { action: 'acknowledge'; nowMs: number }
  | { action: 'begin_delivery'; lane: LevelSpinDeliveryLane; nowMs: number; deliveryToken: string }
  | { action: 'complete_delivery'; lane: LevelSpinDeliveryLane; nowMs: number; deliveryToken: string }
  | { action: 'release_delivery'; lane: LevelSpinDeliveryLane; nowMs: number; deliveryToken: string };

const LEVEL_SPIN_DELIVERY_LEASE_MS = 60_000;

export function applyLevelSpinResultAction(
  state: LevelSpinResultMutableState,
  action: LevelSpinResultAction,
  expiresAtMs = Number.POSITIVE_INFINITY,
): LevelSpinResultMutableState {
  if (action.action === 'acknowledge') {
    return state.revealState === 'acknowledged'
      ? state
      : { ...state, revealState: 'acknowledged', acknowledgedAtMs: action.nowMs };
  }
  if (state.revealState !== 'acknowledged') throw new Error('level_spin_reveal_required');
  const currentLane = state.deliveries[action.lane];
  if (!currentLane) throw new Error('level_spin_delivery_lane_missing');
  if (currentLane.state === 'delivered' || currentLane.state === 'expired') return state;
  if (action.nowMs >= expiresAtMs) {
    return {
      ...state,
      deliveries: {
        ...state.deliveries,
        [action.lane]: {
          ...currentLane,
          state: 'expired',
          deliveryToken: null,
          deliveryLeaseUntilMs: 0,
        },
      },
    };
  }
  const token = action.deliveryToken.trim();
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(token)) throw new Error('level_spin_delivery_token_invalid');
  if (action.action === 'begin_delivery') {
    if (currentLane.state === 'delivering'
      && currentLane.deliveryToken !== token
      && Number(currentLane.deliveryLeaseUntilMs ?? 0) > action.nowMs) {
      throw new Error('level_spin_delivery_busy');
    }
    return {
      ...state,
      deliveries: {
        ...state.deliveries,
        [action.lane]: {
          ...currentLane,
          state: 'delivering',
          deliveryToken: token,
          deliveryLeaseUntilMs: action.nowMs + LEVEL_SPIN_DELIVERY_LEASE_MS,
        },
      },
    };
  }
  if (currentLane.state !== 'delivering'
    || currentLane.deliveryToken !== token
    || Number(currentLane.deliveryLeaseUntilMs ?? 0) <= action.nowMs) {
    throw new Error('level_spin_delivery_lease_invalid');
  }
  if (action.action === 'complete_delivery') {
    return {
      ...state,
      deliveries: {
        ...state.deliveries,
        [action.lane]: {
          ...currentLane,
          state: 'delivered',
          deliveryToken: null,
          deliveryLeaseUntilMs: 0,
          deliveredAtMs: action.nowMs,
        },
      },
    };
  }
  return {
    ...state,
    deliveries: {
      ...state.deliveries,
      [action.lane]: {
        ...currentLane,
        state: 'unclaimed',
        deliveryToken: null,
        deliveryLeaseUntilMs: 0,
      },
    },
  };
}

type WeightedGift = { id: string; weight: number };

const STANDARD_GIFTS: readonly WeightedGift[] = [
  { id: 'energy_full', weight: 9 }, { id: 'energy_plus1', weight: 8 },
  { id: 'xp_50', weight: 7 }, { id: 'xp_100', weight: 7 },
  { id: 'xp_250', weight: 6 }, { id: 'hint_1', weight: 8 },
  { id: 'shards_3', weight: 7 }, { id: 'xp_bank_150', weight: 6 },
  { id: 'focus_10m_25', weight: 4 }, { id: 'xp_2x_24h', weight: 9 },
  { id: 'energy_plus2', weight: 7 }, { id: 'chain_shield_1', weight: 8 },
  { id: 'hint_3', weight: 6 }, { id: 'shards_6', weight: 6 },
  { id: 'xp_bank_300', weight: 6 }, { id: 'focus_15m_50', weight: 5 },
  { id: 'cosmetic_avatar_common', weight: 5 }, { id: 'cosmetic_avatar_aura', weight: 4 },
  { id: 'xp_2x_48h', weight: 3 },
  { id: 'energy_plus3', weight: 2 }, { id: 'chain_shield_3', weight: 2 },
  { id: 'wager_discount_25', weight: 2 }, { id: 'shards_10', weight: 2 },
  { id: 'xp_bank_600', weight: 2 }, { id: 'pack_voucher_48h', weight: 1 },
  { id: 'choice_3_level', weight: 2 },
];

const PREMIUM_GIFTS: readonly WeightedGift[] = [
  { id: 'prem_shards_10', weight: 5 },
  { id: 'prem_shards_15', weight: 4 },
  { id: 'prem_shards_20', weight: 4 },
  { id: 'premium_xp_bank_1000', weight: 2 },
  { id: 'premium_cosmetic_avatar', weight: 2 },
  { id: 'premium_cosmetic_aura', weight: 2 },
  { id: 'prem_pack_48h', weight: 1 },
];

const PREMIUM_SAFE_BLOCKED_F2P = new Set([
  'energy_full',
  'energy_plus1',
  'energy_plus2',
  'energy_plus3',
  'choice_3_level',
]);

const LEVEL_SPIN_REMOVED_GIFT_REPLACEMENTS: Readonly<Record<string, string>> = {
  club_boost_free: 'xp_250',
};

const MILESTONE_GIFTS: Readonly<Record<number, string>> = {
  5: 'xp_bank_150',
  10: 'xp_bank_300',
  15: 'cosmetic_avatar_common',
  20: 'focus_15m_50',
  25: 'pack_voucher_48h',
  30: 'choice_3_level',
  35: 'cosmetic_avatar_aura',
  40: 'xp_bank_600',
  45: 'cosmetic_avatar_aura',
  50: 'choice_3_level',
  55: 'chain_shield_3',
  60: 'choice_3_level',
};

function boundedSample(rng: () => number): number {
  const value = rng();
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999999999, Math.max(0, value));
}

function weightedPick(pool: readonly WeightedGift[], rng: () => number): string {
  const total = pool.reduce((sum, gift) => sum + gift.weight, 0);
  let cursor = boundedSample(rng) * total;
  for (const gift of pool) {
    cursor -= gift.weight;
    if (cursor < 0) return gift.id;
  }
  return pool[pool.length - 1].id;
}

export function creditIdForLevel(level: number): string {
  if (!Number.isInteger(level) || level < 2 || level > LEVEL_SPIN_MAX_LEVEL) {
    throw new Error('level_spin_level_invalid');
  }
  return `level_spin_v1_${String(level).padStart(3, '0')}`;
}

export function creditIdForLevelExam(level: LevelExamSpinLevel): string {
  if (!['A1', 'A2', 'B1', 'B2'].includes(level)) throw new Error('level_exam_spin_level_invalid');
  return `level_exam_spin_v1_${level}`;
}

const LEVEL_EXAM_CREDIT_DISPLAY_LEVEL: Record<LevelExamSpinLevel, number> = {
  A1: 2,
  A2: 3,
  B1: 4,
  B2: 5,
};

export function creditsToMint(levelBaseline: number, reachedLevel: number): LevelSpinCreditSummary[] {
  const from = Math.max(2, Math.trunc(levelBaseline) + 1);
  const to = Math.min(LEVEL_SPIN_MAX_LEVEL, Math.max(0, Math.trunc(reachedLevel)));
  const credits: LevelSpinCreditSummary[] = [];
  for (let level = from; level <= to; level += 1) {
    credits.push({
      id: creditIdForLevel(level),
      level,
      kind: MILESTONE_GIFTS[level] ? 'milestone' : 'standard',
    });
  }
  return credits;
}

export function creditsToMintForCompletion(
  levelBaseline: number,
  reachedLevel: number,
  examCompletion?: { level: LevelExamSpinLevel; firstPass: boolean },
): LevelSpinCreditSummary[] {
  const credits = creditsToMint(levelBaseline, reachedLevel);
  if (examCompletion?.firstPass) {
    credits.push({
      id: creditIdForLevelExam(examCompletion.level),
      level: LEVEL_EXAM_CREDIT_DISPLAY_LEVEL[examCompletion.level],
      kind: 'standard',
    });
  }
  return credits;
}

export function rewardForSpin(
  credit: {
    level: number;
    kind: LevelSpinKind;
    premiumAtEarn: boolean;
  },
  rng: () => number,
): LevelSpinReward {
  const milestoneGift = credit.kind === 'milestone' ? MILESTONE_GIFTS[credit.level] : undefined;
  const baseGiftId = milestoneGift
    ? (credit.premiumAtEarn && milestoneGift === 'choice_3_level' ? 'xp_bank_600' : milestoneGift)
    : weightedPick(
      credit.premiumAtEarn
        ? STANDARD_GIFTS.filter((gift) => !PREMIUM_SAFE_BLOCKED_F2P.has(gift.id))
        : STANDARD_GIFTS,
      rng,
    );
  if (!credit.premiumAtEarn) return { baseGiftId };
  return { baseGiftId, premiumGiftId: weightedPick(PREMIUM_GIFTS, rng) };
}

export async function resolveCurrentLevelSpinEntitlement(
  resolvePremium: () => Promise<boolean>,
): Promise<CurrentLevelSpinEntitlement> {
  try {
    return await resolvePremium() ? 'plus' : 'standard';
  } catch {
    return 'unknown';
  }
}

export function canonicalLevelSpinGiftId(
  giftId: string,
  entitlement: CurrentLevelSpinEntitlement,
): string {
  const removedReplacement = LEVEL_SPIN_REMOVED_GIFT_REPLACEMENTS[giftId];
  if (removedReplacement) return removedReplacement;
  if (entitlement === 'standard') return giftId;
  if (giftId === 'choice_3_level') return 'xp_bank_600';
  if (PREMIUM_SAFE_BLOCKED_F2P.has(giftId)) return 'xp_250';
  return giftId;
}

export function rewardForSpinForCurrentEntitlement(
  credit: { level: number; kind: LevelSpinKind },
  entitlement: CurrentLevelSpinEntitlement,
  rng: () => number,
): LevelSpinReward {
  const sanitizeBase = entitlement !== 'standard';
  const reward = rewardForSpin({ ...credit, premiumAtEarn: sanitizeBase }, rng);
  return entitlement === 'plus'
    ? reward
    : { baseGiftId: reward.baseGiftId };
}

type SpinServerState = {
  levelBaseline: number;
  balance: number;
  activeRequestId: string | null;
  protocol?: typeof LEVEL_SPIN_PROTOCOL;
};

function normalizedServerState(raw: unknown, fallbackLevel: number, fallbackBalance: number): SpinServerState {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const levelBaseline = Number.isInteger(data.levelBaseline)
    ? Math.max(1, Math.min(LEVEL_SPIN_MAX_LEVEL, Number(data.levelBaseline)))
    : Math.max(1, Math.min(LEVEL_SPIN_MAX_LEVEL, Math.trunc(fallbackLevel)));
  const balance = Number.isInteger(data.balance)
    ? Math.max(0, Number(data.balance))
    : Math.max(0, Math.trunc(fallbackBalance));
  const activeRequestId = typeof data.activeRequestId === 'string' && data.activeRequestId.trim()
    ? data.activeRequestId.trim()
    : null;
  const protocol = data.protocol === LEVEL_SPIN_PROTOCOL ? LEVEL_SPIN_PROTOCOL : undefined;
  return { levelBaseline, balance, activeRequestId, ...(protocol ? { protocol } : {}) };
}

export type PreparedLevelSpinMinting = {
  minted: number;
  mintedCredits: LevelSpinCreditSummary[];
  balance: number;
  state: SpinServerState;
  writes: {
    ref: admin.firestore.DocumentReference;
    data: Record<string, unknown>;
  }[];
};

export async function prepareLevelSpinMinting(input: {
  db: admin.firestore.Firestore;
  tx: admin.firestore.Transaction;
  stableUid: string;
  authUid?: string;
  userRef: admin.firestore.DocumentReference;
  userData: Record<string, unknown>;
  progressBefore: Record<string, unknown>;
  beforeLevel: number;
  afterLevel: number;
  protocol?: string;
  earnedAtMs: number;
  examCompletion?: { level: LevelExamSpinLevel; firstPass: boolean };
}): Promise<PreparedLevelSpinMinting> {
  const current = normalizedServerState(
    input.userData.levelSpinServerState,
    input.beforeLevel,
    0,
  );
  const nextBaseline = Math.max(current.levelBaseline, Math.min(LEVEL_SPIN_MAX_LEVEL, input.afterLevel));
  const effectiveV1 = current.protocol === LEVEL_SPIN_PROTOCOL || input.protocol === LEVEL_SPIN_PROTOCOL;
  if (!effectiveV1) {
    return {
      minted: 0,
      mintedCredits: [],
      balance: current.balance,
      state: { ...current, levelBaseline: nextBaseline },
      writes: [],
    };
  }
  const candidates = creditsToMintForCompletion(
    current.levelBaseline,
    input.afterLevel,
    input.examCompletion,
  );
  if (candidates.length === 0) {
    return {
      minted: 0,
      mintedCredits: [],
      balance: current.balance,
      state: { ...current, levelBaseline: nextBaseline, protocol: LEVEL_SPIN_PROTOCOL },
      writes: [],
    };
  }
  const premiumAtEarn = await resolvePremiumAccess(
    input.db,
    input.stableUid,
    input.earnedAtMs,
    input.authUid,
    input.tx,
  );
  const refs = candidates.map((credit) => input.userRef.collection('level_spin_credits').doc(credit.id));
  const snapshots = await Promise.all(refs.map((ref) => input.tx.get(ref)));
  let minted = 0;
  const mintedCredits: LevelSpinCreditSummary[] = [];
  const writes: PreparedLevelSpinMinting['writes'] = [];
  candidates.forEach((credit, index) => {
    if (snapshots[index].exists) return;
    minted += 1;
    mintedCredits.push(credit);
    writes.push({
      ref: refs[index],
      data: {
        level: credit.level,
        kind: credit.kind,
        premiumAtEarn,
        status: 'available',
        earnedAtMs: input.earnedAtMs,
        consumedAtMs: null,
        claimRequestId: null,
        schemaVersion: LEVEL_SPIN_SCHEMA_VERSION,
        catalogVersion: LEVEL_SPIN_CATALOG_VERSION,
        ...(credit.id.startsWith('level_exam_spin_v1_') ? { source: 'level_exam' } : {}),
      },
    });
  });
  return {
    minted,
    mintedCredits,
    balance: current.balance + minted,
    state: {
      ...current,
      levelBaseline: nextBaseline,
      balance: current.balance + minted,
      protocol: LEVEL_SPIN_PROTOCOL,
    },
    writes,
  };
}

export function commitPreparedLevelSpinMinting(
  tx: admin.firestore.Transaction,
  prepared: PreparedLevelSpinMinting,
): void {
  prepared.writes.forEach(({ ref, data }) => tx.create(ref, data));
}

export async function applyLevelSpinMinting(input: {
  db: admin.firestore.Firestore;
  tx: admin.firestore.Transaction;
  stableUid: string;
  authUid?: string;
  userRef: admin.firestore.DocumentReference;
  userData: Record<string, unknown>;
  progressBefore: Record<string, unknown>;
  beforeLevel: number;
  afterLevel: number;
  protocol?: string;
  earnedAtMs: number;
  examCompletion?: { level: LevelExamSpinLevel; firstPass: boolean };
}): Promise<{
  minted: number;
  mintedCredits: LevelSpinCreditSummary[];
  balance: number;
  state: SpinServerState;
}> {
  const prepared = await prepareLevelSpinMinting(input);
  commitPreparedLevelSpinMinting(input.tx, prepared);
  return {
    minted: prepared.minted,
    mintedCredits: prepared.mintedCredits,
    balance: prepared.balance,
    state: prepared.state,
  };
}

function cleanRequestId(raw: unknown): string {
  const requestId = String(raw ?? '').trim();
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(requestId)) {
    throw new HttpsError('invalid-argument', 'bad_level_spin_request_id');
  }
  return requestId;
}

function cryptoSample(): number {
  return randomInt(0, 0x1_0000_0000) / 0x1_0000_0000;
}

async function stableUser(request: { auth?: { uid?: string }; data?: Record<string, unknown> }) {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, request.data?.stableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  return { authUid, db, stableUid, userRef: db.collection('users').doc(stableUid) };
}

async function readLiveSpinIdentity(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  authUid: string,
  stableUid: string,
  userRef: admin.firestore.DocumentReference,
): Promise<admin.firestore.DocumentSnapshot> {
  const [userSnap, authLinkSnap, authDeleteSnap, stableDeleteSnap] = await Promise.all([
    tx.get(userRef),
    tx.get(db.collection('auth_links').doc(authUid)),
    tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)),
    tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid)),
  ]);
  const userData = userSnap.data() ?? {};
  const linkedStableUid = String(authLinkSnap.data()?.stable_id ?? '').trim();
  if (!userSnap.exists
    || userData.identityHidden === true
    || userData.levelSpinMergePending === true
    || (userData.canonicalStableId && userData.canonicalStableId !== stableUid)
    || !authLinkSnap.exists
    || linkedStableUid !== stableUid
    || authDeleteSnap.exists
    || stableDeleteSnap.exists) {
    throw new HttpsError('failed-precondition', 'level_spin_identity_transition_pending');
  }
  return userSnap;
}

const LEVEL_SPIN_CHOICE_GIFT_IDS = new Set(['xp_bank_300', 'focus_15m_50', 'cosmetic_avatar_common']);

function normalizedResultMutableState(data: Record<string, unknown>): LevelSpinResultMutableState {
  const rawDeliveries = data.deliveries && typeof data.deliveries === 'object'
    ? data.deliveries as Record<string, LevelSpinLaneDeliveryState>
    : {};
  const legacyAcknowledged = data.status === 'acknowledged';
  return {
    revealState: data.revealState === 'acknowledged' || legacyAcknowledged ? 'acknowledged' : 'pending',
    deliveries: {
      base: rawDeliveries.base ?? { state: 'unclaimed' },
      ...(typeof data.premiumGiftId === 'string' && data.premiumGiftId
        ? { premium: rawDeliveries.premium ?? { state: 'unclaimed' } }
        : {}),
    },
    ...(Number.isFinite(Number(data.acknowledgedAtMs))
      ? { acknowledgedAtMs: Number(data.acknowledgedAtMs) }
      : {}),
  };
}

function hasPendingLevelSpinDelivery(state: LevelSpinResultMutableState): boolean {
  return Object.values(state.deliveries)
    .some((lane) => lane && lane.state !== 'delivered' && lane.state !== 'expired');
}

export function expirePendingLevelSpinDeliveries(
  state: LevelSpinResultMutableState,
): LevelSpinResultMutableState {
  const expireLane = (lane: LevelSpinLaneDeliveryState | undefined) => !lane
    ? undefined
    : lane.state === 'delivered' || lane.state === 'expired'
      ? lane
      : { ...lane, state: 'expired' as const, deliveryToken: null, deliveryLeaseUntilMs: 0 };
  return {
    ...state,
    deliveries: {
      base: expireLane(state.deliveries.base)!,
      ...(state.deliveries.premium ? { premium: expireLane(state.deliveries.premium) } : {}),
    },
  };
}

const LEVEL_SPIN_PUBLIC_DELIVERY_STATES = new Set<LevelSpinDeliveryState>([
  'unclaimed', 'delivering', 'delivered', 'expired',
]);
const LEVEL_SPIN_CATALOG_GIFT_IDS = new Set([
  ...STANDARD_GIFTS.map((gift) => gift.id),
  ...PREMIUM_GIFTS.map((gift) => gift.id),
  ...Object.values(MILESTONE_GIFTS),
]);
const LEVEL_SPIN_STORED_GIFT_IDS = new Set([
  ...LEVEL_SPIN_CATALOG_GIFT_IDS,
  ...Object.keys(LEVEL_SPIN_REMOVED_GIFT_REPLACEMENTS),
]);

function publicLaneState(
  lane: LevelSpinLaneDeliveryState,
  entitlement: CurrentLevelSpinEntitlement,
  expired: boolean,
): Record<string, unknown> | null {
  if (!LEVEL_SPIN_PUBLIC_DELIVERY_STATES.has(lane.state)) return null;
  const state = expired && lane.state !== 'delivered' && lane.state !== 'expired'
    ? 'expired'
    : lane.state;
  return {
    state,
    ...(typeof lane.selectedGiftId === 'string' && lane.selectedGiftId
      ? { selectedGiftId: canonicalLevelSpinGiftId(lane.selectedGiftId, entitlement) }
      : {}),
    ...(Number.isFinite(Number(lane.deliveryLeaseUntilMs))
      ? { deliveryLeaseUntilMs: Number(lane.deliveryLeaseUntilMs) }
      : {}),
    ...(Number.isFinite(Number(lane.deliveredAtMs))
      ? { deliveredAtMs: Number(lane.deliveredAtMs) }
      : {}),
  };
}

export function publicLevelSpinReceipt(
  requestId: string,
  data: Record<string, unknown>,
  stableUid: string,
  entitlement: CurrentLevelSpinEntitlement = 'unknown',
  nowMs?: number,
): Record<string, unknown> | null {
  const mutable = normalizedResultMutableState(data);
  const level = Number(data.level);
  const kind = data.kind;
  const creditId = String(data.creditId ?? '');
  const createdAtMs = Number(data.createdAtMs);
  const expiresAtMs = Number(data.expiresAtMs);
  const storedBaseGiftId = String(data.baseGiftId ?? '');
  const storedPremiumGiftId = typeof data.premiumGiftId === 'string' && data.premiumGiftId
    ? data.premiumGiftId
    : null;
  const examCredit = /^level_exam_spin_v1_(A1|A2|B1|B2)$/.test(creditId);
  const expectedKind: LevelSpinKind = examCredit ? 'standard' : (MILESTONE_GIFTS[level] ? 'milestone' : 'standard');
  const rawBaseGiftId = mutable.deliveries.base.selectedGiftId ?? storedBaseGiftId;
  const baseGiftId = canonicalLevelSpinGiftId(rawBaseGiftId, entitlement);
  const exposePremiumLane = storedPremiumGiftId !== null && entitlement !== 'unknown';
  const rawPremiumGiftId = storedPremiumGiftId === null
    ? null
    : mutable.deliveries.premium?.selectedGiftId ?? storedPremiumGiftId;
  const premiumGiftId = exposePremiumLane && rawPremiumGiftId !== null
    ? canonicalLevelSpinGiftId(rawPremiumGiftId, entitlement)
    : null;
  const expired = Number.isFinite(nowMs) && Number(nowMs) >= expiresAtMs;
  const base = publicLaneState(mutable.deliveries.base, entitlement, expired);
  const premium = exposePremiumLane && mutable.deliveries.premium
    ? publicLaneState(mutable.deliveries.premium, entitlement, expired)
    : null;
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(requestId)
    || !Number.isInteger(level) || level < 2 || level > LEVEL_SPIN_MAX_LEVEL
    || (!examCredit && creditId !== creditIdForLevel(level))
    || kind !== expectedKind
    || !LEVEL_SPIN_STORED_GIFT_IDS.has(storedBaseGiftId)
    || (storedPremiumGiftId !== null && !LEVEL_SPIN_STORED_GIFT_IDS.has(storedPremiumGiftId))
    || (typeof mutable.deliveries.base.selectedGiftId === 'string'
      && !LEVEL_SPIN_STORED_GIFT_IDS.has(mutable.deliveries.base.selectedGiftId))
    || (typeof mutable.deliveries.premium?.selectedGiftId === 'string'
      && !LEVEL_SPIN_STORED_GIFT_IDS.has(mutable.deliveries.premium.selectedGiftId))
    || !Number.isFinite(createdAtMs)
    || expiresAtMs !== createdAtMs + LEVEL_SPIN_RESULT_TTL_MS
    || data.catalogVersion !== LEVEL_SPIN_CATALOG_VERSION
    || data.schemaVersion !== LEVEL_SPIN_SCHEMA_VERSION
    || !base
    || (exposePremiumLane && (!premiumGiftId || !premium))) return null;
  return {
    ok: true,
    stableUid,
    requestId,
    creditId,
    level,
    kind,
    baseGiftId,
    premiumGiftId,
    createdAtMs,
    expiresAtMs,
    balanceAfter: Math.max(0, Math.trunc(Number(data.balanceAfter ?? 0))),
    status: mutable.revealState === 'acknowledged' ? 'acknowledged' : 'awaiting_ack',
    revealState: mutable.revealState,
    deliveries: {
      base,
      ...(premium ? { premium } : {}),
    },
    catalogVersion: LEVEL_SPIN_CATALOG_VERSION,
    schemaVersion: LEVEL_SPIN_SCHEMA_VERSION,
  };
}

export const levelRewardSpinStatus = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const { authUid, stableUid, db, userRef } = await stableUser(request);
  return db.runTransaction(async (tx) => {
    const nowMs = Date.now();
    const [userSnap, availableSnap, liveResultSnap, expiredResultSnap] = await Promise.all([
      readLiveSpinIdentity(tx, db, authUid, stableUid, userRef),
      tx.get(userRef.collection('level_spin_credits')
        .where('status', '==', 'available').orderBy('level').limit(60)),
      tx.get(userRef.collection('level_spin_results')
        .where('hasPendingDelivery', '==', true)
        .where('expiresAtMs', '>', nowMs)
        .orderBy('expiresAtMs', 'asc')
        .limit(60)),
      tx.get(userRef.collection('level_spin_results')
        .where('hasPendingDelivery', '==', true)
        .where('expiresAtMs', '<=', nowMs)
        .orderBy('expiresAtMs', 'asc')
        .limit(60)),
    ]);
    const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
    const state = normalizedServerState(
      userSnap.data()?.levelSpinServerState,
      Number(progress.user_level ?? 1),
      0,
    );
    const entitlement = await resolveCurrentLevelSpinEntitlement(
      () => resolvePremiumAccess(db, stableUid, nowMs, authUid, tx),
    );
    const oldest = availableSnap.empty ? null : {
      id: availableSnap.docs[0].id,
      level: Number(availableSnap.docs[0].data().level),
      kind: availableSnap.docs[0].data().kind as LevelSpinKind,
    };
    const pendingResults = liveResultSnap.docs.flatMap((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const mutable = normalizedResultMutableState(data);
      const hasPendingLane = Object.values(mutable.deliveries)
        .some((lane) => lane && lane.state !== 'delivered' && lane.state !== 'expired');
      const receipt = publicLevelSpinReceipt(doc.id, data, stableUid, entitlement, nowMs);
      return hasPendingLane && receipt ? [receipt] : [];
    });
    expiredResultSnap.docs.forEach((doc) => {
      const expired = expirePendingLevelSpinDeliveries(
        normalizedResultMutableState(doc.data() as Record<string, unknown>),
      );
      tx.update(doc.ref, { deliveries: expired.deliveries, hasPendingDelivery: false });
    });
    return {
      ok: true,
      stableUid,
      balance: availableSnap.size,
      oldest,
      activeRequestId: state.activeRequestId,
      pendingResults,
    };
  });
});

export const levelRewardSpinClaim = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const requestId = cleanRequestId(request.data?.requestId);
  const { authUid, stableUid, db, userRef } = await stableUser(request);
  const resultRef = userRef.collection('level_spin_results').doc(requestId);
  const randomSamples = [cryptoSample(), cryptoSample()];
  const internalResult = await db.runTransaction(async (tx) => {
    const nowMs = Date.now();
    const [userSnap, existingResult] = await Promise.all([
      readLiveSpinIdentity(tx, db, authUid, stableUid, userRef),
      tx.get(resultRef),
    ]);
    const entitlement = await resolveCurrentLevelSpinEntitlement(
      () => resolvePremiumAccess(db, stableUid, nowMs, authUid, tx),
    );
    if (existingResult.exists) {
      const existingData = existingResult.data() as Record<string, unknown>;
      return { data: existingData, entitlement, nowMs };
    }
    const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
    const state = normalizedServerState(
      userSnap.data()?.levelSpinServerState,
      Number(progress.user_level ?? 1),
      Number(progress.level_reward_spin_balance ?? 0),
    );
    if (state.activeRequestId && state.activeRequestId !== requestId) {
      throw new HttpsError('failed-precondition', 'ACTIVE_SPIN_PENDING');
    }
    if (state.activeRequestId === requestId) {
      throw new HttpsError('aborted', 'active_level_spin_result_missing');
    }
    const available = await tx.get(
      userRef.collection('level_spin_credits').where('status', '==', 'available').orderBy('level').limit(1),
    );
    if (available.empty || state.balance <= 0) {
      throw new HttpsError('failed-precondition', 'NO_LEVEL_SPINS');
    }
    const creditSnap = available.docs[0];
    const credit = creditSnap.data() as { level: number; kind: LevelSpinKind; premiumAtEarn: boolean };
    let sampleIndex = 0;
    const reward = rewardForSpinForCurrentEntitlement(
      credit,
      entitlement,
      () => randomSamples[sampleIndex++] ?? randomSamples[0],
    );
    const balanceAfter = Math.max(0, state.balance - 1);
    const result = {
      ok: true,
      stableUid,
      originStableUid: stableUid,
      requestId,
      creditId: creditSnap.id,
      level: credit.level,
      kind: credit.kind,
      baseGiftId: reward.baseGiftId,
      premiumGiftId: reward.premiumGiftId ?? null,
      rewardOccurrences: reward.premiumGiftId
        ? [{ lane: 'base', giftId: reward.baseGiftId }, { lane: 'premium', giftId: reward.premiumGiftId }]
        : [{ lane: 'base', giftId: reward.baseGiftId }],
      createdAtMs: nowMs,
      expiresAtMs: nowMs + LEVEL_SPIN_RESULT_TTL_MS,
      balanceAfter,
      status: 'awaiting_ack',
      revealState: 'pending',
      deliveries: {
        base: { state: 'unclaimed' },
        ...(reward.premiumGiftId ? { premium: { state: 'unclaimed' } } : {}),
      },
      hasPendingDelivery: true,
      catalogVersion: LEVEL_SPIN_CATALOG_VERSION,
      schemaVersion: LEVEL_SPIN_SCHEMA_VERSION,
    };
    tx.update(creditSnap.ref, {
      status: 'consumed',
      consumedAtMs: nowMs,
      claimRequestId: requestId,
    });
    tx.create(resultRef, result);
    tx.set(userRef, {
      progress: { level_reward_spin_balance: String(balanceAfter) },
      levelSpinServerState: { ...state, balance: balanceAfter, activeRequestId: requestId },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { data: result, entitlement, nowMs };
  });
  const publicReceipt = publicLevelSpinReceipt(
    requestId,
    internalResult.data as Record<string, unknown>,
    stableUid,
    internalResult.entitlement,
    internalResult.nowMs,
  );
  if (!publicReceipt) throw new HttpsError('failed-precondition', 'level_spin_result_corrupt');
  return publicReceipt;
});

export const levelRewardSpinAcknowledge = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const requestId = cleanRequestId(request.data?.requestId);
  const { authUid, stableUid, db, userRef } = await stableUser(request);
  const resultRef = userRef.collection('level_spin_results').doc(requestId);
  return db.runTransaction(async (tx) => {
    const [userSnap, resultSnap] = await Promise.all([
      readLiveSpinIdentity(tx, db, authUid, stableUid, userRef),
      tx.get(resultRef),
    ]);
    if (!resultSnap.exists) throw new HttpsError('not-found', 'level_spin_result_missing');
    const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
    const state = normalizedServerState(
      userSnap.data()?.levelSpinServerState,
      Number(progress.user_level ?? 1),
      Number(progress.level_reward_spin_balance ?? 0),
    );
    if (state.activeRequestId && state.activeRequestId !== requestId) {
      throw new HttpsError('failed-precondition', 'ACTIVE_SPIN_PENDING');
    }
    if (resultSnap.data()?.status !== 'acknowledged') {
      tx.update(resultRef, {
        status: 'acknowledged',
        revealState: 'acknowledged',
        acknowledgedAtMs: Date.now(),
      });
    }
    if (state.activeRequestId === requestId) {
      tx.set(userRef, { levelSpinServerState: { ...state, activeRequestId: null } }, { merge: true });
    }
    return { ok: true, stableUid, requestId };
  });
});

export const levelRewardSpinDelivery = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const requestId = cleanRequestId(request.data?.requestId);
  const lane = request.data?.lane === 'premium' ? 'premium' : request.data?.lane === 'base' ? 'base' : null;
  const action = request.data?.action;
  if (!lane || !['begin_delivery', 'complete_delivery', 'release_delivery'].includes(String(action))) {
    throw new HttpsError('invalid-argument', 'bad_level_spin_delivery_action');
  }
  const deliveryToken = cleanRequestId(request.data?.deliveryToken);
  const selectedGiftId = String(request.data?.selectedGiftId ?? '').trim();
  const { authUid, stableUid, db, userRef } = await stableUser(request);
  const nowMs = Date.now();
  const resultRef = userRef.collection('level_spin_results').doc(requestId);
  return db.runTransaction(async (tx) => {
    const [, resultSnap] = await Promise.all([
      readLiveSpinIdentity(tx, db, authUid, stableUid, userRef),
      tx.get(resultRef),
    ]);
    const entitlement = await resolveCurrentLevelSpinEntitlement(
      () => resolvePremiumAccess(db, stableUid, nowMs, authUid, tx),
    );
    if (!resultSnap.exists) throw new HttpsError('not-found', 'level_spin_result_missing');
    if (lane === 'premium' && entitlement === 'unknown') {
      throw new HttpsError('failed-precondition', 'level_spin_entitlement_unknown');
    }
    const data = resultSnap.data() as Record<string, unknown>;
    const expiresAtMs = Number(data.expiresAtMs ?? 0);
    let state = normalizedResultMutableState(data);
    let currentLane = state.deliveries[lane];
    if (!currentLane) throw new HttpsError('failed-precondition', 'level_spin_delivery_lane_missing');
    if (currentLane.state === 'delivered') {
      const deliveredStoredGiftId = currentLane.selectedGiftId
        ?? String(lane === 'base' ? data.baseGiftId ?? '' : data.premiumGiftId ?? '');
      const deliveredGiftId = canonicalLevelSpinGiftId(deliveredStoredGiftId, entitlement);
      return { ok: true, stableUid, requestId, lane, status: 'already_claimed', giftId: deliveredGiftId };
    }
    const storedRootGiftId = String(lane === 'base' ? data.baseGiftId ?? '' : data.premiumGiftId ?? '');
    if (!LEVEL_SPIN_STORED_GIFT_IDS.has(storedRootGiftId)) {
      throw new HttpsError('failed-precondition', 'level_spin_delivery_gift_missing');
    }
    const storedLockedGiftId = currentLane.selectedGiftId ?? '';
    if (storedLockedGiftId && !LEVEL_SPIN_STORED_GIFT_IDS.has(storedLockedGiftId)) {
      throw new HttpsError('failed-precondition', 'level_spin_delivery_gift_missing');
    }
    const canonicalRootGiftId = canonicalLevelSpinGiftId(storedRootGiftId, entitlement);
    const lockedGiftId = storedLockedGiftId
      ? canonicalLevelSpinGiftId(storedLockedGiftId, entitlement)
      : '';
    const canonicalSelectedGiftId = canonicalLevelSpinGiftId(selectedGiftId, entitlement);
    if (nowMs >= expiresAtMs) {
      const expiredGiftId = lockedGiftId || canonicalRootGiftId;
      state = applyLevelSpinResultAction(state, {
        action: action as 'begin_delivery' | 'complete_delivery' | 'release_delivery',
        lane,
        nowMs,
        deliveryToken,
      }, expiresAtMs);
      tx.update(resultRef, {
        deliveries: state.deliveries,
        hasPendingDelivery: hasPendingLevelSpinDelivery(state),
      });
      return { ok: true, stableUid, requestId, lane, status: 'expired', giftId: expiredGiftId };
    }

    const requiresChoice = entitlement === 'standard'
      && storedRootGiftId === 'choice_3_level'
      && !storedLockedGiftId;
    const effectiveGiftId = lockedGiftId || (requiresChoice
      ? canonicalSelectedGiftId
      : canonicalRootGiftId);
    if (!effectiveGiftId
      || (requiresChoice && !LEVEL_SPIN_CHOICE_GIFT_IDS.has(selectedGiftId))
      || (!requiresChoice && !storedLockedGiftId && selectedGiftId
        && canonicalSelectedGiftId !== effectiveGiftId)) {
      throw new HttpsError('invalid-argument', 'level_spin_delivery_gift_mismatch');
    }
    if (storedLockedGiftId && selectedGiftId && canonicalSelectedGiftId !== lockedGiftId) {
      throw new HttpsError('invalid-argument', 'level_spin_delivery_selection_changed');
    }

    try {
      state = applyLevelSpinResultAction(state, {
        action: action as 'begin_delivery' | 'complete_delivery' | 'release_delivery',
        lane,
        nowMs,
        deliveryToken,
      }, expiresAtMs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'level_spin_delivery_failed';
      if (message === 'level_spin_delivery_busy') {
        return { ok: true, stableUid, requestId, lane, status: 'busy', giftId: effectiveGiftId };
      }
      throw new HttpsError('failed-precondition', message);
    }
    const nextLane = state.deliveries[lane]!;
    state = {
      ...state,
      deliveries: {
        ...state.deliveries,
        [lane]: { ...nextLane, selectedGiftId: currentLane.selectedGiftId ?? effectiveGiftId },
      },
    };
    tx.update(resultRef, {
      deliveries: state.deliveries,
      hasPendingDelivery: hasPendingLevelSpinDelivery(state),
    });
    return {
      ok: true,
      stableUid,
      requestId,
      lane,
      status: action === 'release_delivery'
        ? 'released'
        : action === 'complete_delivery' ? 'claimed' : 'acquired',
      giftId: canonicalLevelSpinGiftId(
        state.deliveries[lane]?.selectedGiftId ?? effectiveGiftId,
        entitlement,
      ),
      leaseUntil: state.deliveries[lane]?.deliveryLeaseUntilMs ?? 0,
    };
  });
});
