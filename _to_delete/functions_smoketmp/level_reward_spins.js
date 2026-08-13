"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.levelRewardSpinDelivery = exports.levelRewardSpinAcknowledge = exports.levelRewardSpinClaim = exports.levelRewardSpinStatus = exports.LEVEL_SPIN_MAX_LEVEL = exports.LEVEL_SPIN_RESULT_TTL_MS = exports.LEVEL_SPIN_SCHEMA_VERSION = exports.LEVEL_SPIN_CATALOG_VERSION = exports.LEVEL_SPIN_PROTOCOL = void 0;
exports.applyLevelSpinResultAction = applyLevelSpinResultAction;
exports.creditIdForLevel = creditIdForLevel;
exports.creditIdForLevelExam = creditIdForLevelExam;
exports.creditsToMint = creditsToMint;
exports.creditsToMintForCompletion = creditsToMintForCompletion;
exports.rewardForSpin = rewardForSpin;
exports.resolveCurrentLevelSpinEntitlement = resolveCurrentLevelSpinEntitlement;
exports.canonicalLevelSpinGiftId = canonicalLevelSpinGiftId;
exports.rewardForSpinForCurrentEntitlement = rewardForSpinForCurrentEntitlement;
exports.prepareLevelSpinMinting = prepareLevelSpinMinting;
exports.commitPreparedLevelSpinMinting = commitPreparedLevelSpinMinting;
exports.applyLevelSpinMinting = applyLevelSpinMinting;
exports.expirePendingLevelSpinDeliveries = expirePendingLevelSpinDeliveries;
exports.publicLevelSpinReceipt = publicLevelSpinReceipt;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const account_delete_job_1 = require("./account_delete_job");
exports.LEVEL_SPIN_PROTOCOL = 'v1';
exports.LEVEL_SPIN_CATALOG_VERSION = 1;
exports.LEVEL_SPIN_SCHEMA_VERSION = 1;
exports.LEVEL_SPIN_RESULT_TTL_MS = 72 * 60 * 60 * 1000;
exports.LEVEL_SPIN_MAX_LEVEL = 60;
const LEVEL_SPIN_DELIVERY_LEASE_MS = 60000;
function applyLevelSpinResultAction(state, action, expiresAtMs = Number.POSITIVE_INFINITY) {
    if (action.action === 'acknowledge') {
        return state.revealState === 'acknowledged'
            ? state
            : { ...state, revealState: 'acknowledged', acknowledgedAtMs: action.nowMs };
    }
    if (state.revealState !== 'acknowledged')
        throw new Error('level_spin_reveal_required');
    const currentLane = state.deliveries[action.lane];
    if (!currentLane)
        throw new Error('level_spin_delivery_lane_missing');
    if (currentLane.state === 'delivered' || currentLane.state === 'expired')
        return state;
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
    if (!/^[A-Za-z0-9_-]{16,96}$/.test(token))
        throw new Error('level_spin_delivery_token_invalid');
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
const STANDARD_GIFTS = [
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
const PREMIUM_GIFTS = [
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
const LEVEL_SPIN_REMOVED_GIFT_REPLACEMENTS = {
    club_boost_free: 'xp_250',
};
const MILESTONE_GIFTS = {
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
function boundedSample(rng) {
    const value = rng();
    if (!Number.isFinite(value))
        return 0;
    return Math.min(0.999999999999, Math.max(0, value));
}
function weightedPick(pool, rng) {
    const total = pool.reduce((sum, gift) => sum + gift.weight, 0);
    let cursor = boundedSample(rng) * total;
    for (const gift of pool) {
        cursor -= gift.weight;
        if (cursor < 0)
            return gift.id;
    }
    return pool[pool.length - 1].id;
}
function creditIdForLevel(level) {
    if (!Number.isInteger(level) || level < 2 || level > exports.LEVEL_SPIN_MAX_LEVEL) {
        throw new Error('level_spin_level_invalid');
    }
    return `level_spin_v1_${String(level).padStart(3, '0')}`;
}
function creditIdForLevelExam(level) {
    if (!['A1', 'A2', 'B1', 'B2'].includes(level))
        throw new Error('level_exam_spin_level_invalid');
    return `level_exam_spin_v1_${level}`;
}
const LEVEL_EXAM_CREDIT_DISPLAY_LEVEL = {
    A1: 2,
    A2: 3,
    B1: 4,
    B2: 5,
};
function creditsToMint(levelBaseline, reachedLevel) {
    const from = Math.max(2, Math.trunc(levelBaseline) + 1);
    const to = Math.min(exports.LEVEL_SPIN_MAX_LEVEL, Math.max(0, Math.trunc(reachedLevel)));
    const credits = [];
    for (let level = from; level <= to; level += 1) {
        credits.push({
            id: creditIdForLevel(level),
            level,
            kind: MILESTONE_GIFTS[level] ? 'milestone' : 'standard',
        });
    }
    return credits;
}
function creditsToMintForCompletion(levelBaseline, reachedLevel, examCompletion) {
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
function rewardForSpin(credit, rng) {
    const milestoneGift = credit.kind === 'milestone' ? MILESTONE_GIFTS[credit.level] : undefined;
    const baseGiftId = milestoneGift
        ? (credit.premiumAtEarn && milestoneGift === 'choice_3_level' ? 'xp_bank_600' : milestoneGift)
        : weightedPick(credit.premiumAtEarn
            ? STANDARD_GIFTS.filter((gift) => !PREMIUM_SAFE_BLOCKED_F2P.has(gift.id))
            : STANDARD_GIFTS, rng);
    if (!credit.premiumAtEarn)
        return { baseGiftId };
    return { baseGiftId, premiumGiftId: weightedPick(PREMIUM_GIFTS, rng) };
}
async function resolveCurrentLevelSpinEntitlement(resolvePremium) {
    try {
        return await resolvePremium() ? 'plus' : 'standard';
    }
    catch {
        return 'unknown';
    }
}
function canonicalLevelSpinGiftId(giftId, entitlement) {
    const removedReplacement = LEVEL_SPIN_REMOVED_GIFT_REPLACEMENTS[giftId];
    if (removedReplacement)
        return removedReplacement;
    if (entitlement === 'standard')
        return giftId;
    if (giftId === 'choice_3_level')
        return 'xp_bank_600';
    if (PREMIUM_SAFE_BLOCKED_F2P.has(giftId))
        return 'xp_250';
    return giftId;
}
function rewardForSpinForCurrentEntitlement(credit, entitlement, rng) {
    const sanitizeBase = entitlement !== 'standard';
    const reward = rewardForSpin({ ...credit, premiumAtEarn: sanitizeBase }, rng);
    return entitlement === 'plus'
        ? reward
        : { baseGiftId: reward.baseGiftId };
}
function normalizedServerState(raw, fallbackLevel, fallbackBalance) {
    const data = raw && typeof raw === 'object' ? raw : {};
    const levelBaseline = Number.isInteger(data.levelBaseline)
        ? Math.max(1, Math.min(exports.LEVEL_SPIN_MAX_LEVEL, Number(data.levelBaseline)))
        : Math.max(1, Math.min(exports.LEVEL_SPIN_MAX_LEVEL, Math.trunc(fallbackLevel)));
    const balance = Number.isInteger(data.balance)
        ? Math.max(0, Number(data.balance))
        : Math.max(0, Math.trunc(fallbackBalance));
    const activeRequestId = typeof data.activeRequestId === 'string' && data.activeRequestId.trim()
        ? data.activeRequestId.trim()
        : null;
    const protocol = data.protocol === exports.LEVEL_SPIN_PROTOCOL ? exports.LEVEL_SPIN_PROTOCOL : undefined;
    return { levelBaseline, balance, activeRequestId, ...(protocol ? { protocol } : {}) };
}
async function prepareLevelSpinMinting(input) {
    const current = normalizedServerState(input.userData.levelSpinServerState, input.beforeLevel, 0);
    const nextBaseline = Math.max(current.levelBaseline, Math.min(exports.LEVEL_SPIN_MAX_LEVEL, input.afterLevel));
    const effectiveV1 = current.protocol === exports.LEVEL_SPIN_PROTOCOL || input.protocol === exports.LEVEL_SPIN_PROTOCOL;
    if (!effectiveV1) {
        return {
            minted: 0,
            mintedCredits: [],
            balance: current.balance,
            state: { ...current, levelBaseline: nextBaseline },
            writes: [],
        };
    }
    const candidates = creditsToMintForCompletion(current.levelBaseline, input.afterLevel, input.examCompletion);
    if (candidates.length === 0) {
        return {
            minted: 0,
            mintedCredits: [],
            balance: current.balance,
            state: { ...current, levelBaseline: nextBaseline, protocol: exports.LEVEL_SPIN_PROTOCOL },
            writes: [],
        };
    }
    const premiumAtEarn = await (0, premium_status_1.resolvePremiumAccess)(input.db, input.stableUid, input.earnedAtMs, input.authUid, input.tx);
    const refs = candidates.map((credit) => input.userRef.collection('level_spin_credits').doc(credit.id));
    const snapshots = await Promise.all(refs.map((ref) => input.tx.get(ref)));
    let minted = 0;
    const mintedCredits = [];
    const writes = [];
    candidates.forEach((credit, index) => {
        if (snapshots[index].exists)
            return;
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
                schemaVersion: exports.LEVEL_SPIN_SCHEMA_VERSION,
                catalogVersion: exports.LEVEL_SPIN_CATALOG_VERSION,
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
            protocol: exports.LEVEL_SPIN_PROTOCOL,
        },
        writes,
    };
}
function commitPreparedLevelSpinMinting(tx, prepared) {
    prepared.writes.forEach(({ ref, data }) => tx.create(ref, data));
}
async function applyLevelSpinMinting(input) {
    const prepared = await prepareLevelSpinMinting(input);
    commitPreparedLevelSpinMinting(input.tx, prepared);
    return {
        minted: prepared.minted,
        mintedCredits: prepared.mintedCredits,
        balance: prepared.balance,
        state: prepared.state,
    };
}
function cleanRequestId(raw) {
    const requestId = String(raw ?? '').trim();
    if (!/^[A-Za-z0-9_-]{16,96}$/.test(requestId)) {
        throw new https_1.HttpsError('invalid-argument', 'bad_level_spin_request_id');
    }
    return requestId;
}
function cryptoSample() {
    return (0, crypto_1.randomInt)(0, 4294967296) / 4294967296;
}
async function stableUser(request) {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId, {
        requireKnownIdentity: true,
        repairLinks: false,
    });
    return { authUid, db, stableUid, userRef: db.collection('users').doc(stableUid) };
}
async function readLiveSpinIdentity(tx, db, authUid, stableUid, userRef) {
    const [userSnap, authLinkSnap, authDeleteSnap, stableDeleteSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(db.collection('auth_links').doc(authUid)),
        tx.get(db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)),
        tx.get(db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(stableUid)),
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
        throw new https_1.HttpsError('failed-precondition', 'level_spin_identity_transition_pending');
    }
    return userSnap;
}
const LEVEL_SPIN_CHOICE_GIFT_IDS = new Set(['xp_bank_300', 'focus_15m_50', 'cosmetic_avatar_common']);
function normalizedResultMutableState(data) {
    const rawDeliveries = data.deliveries && typeof data.deliveries === 'object'
        ? data.deliveries
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
function hasPendingLevelSpinDelivery(state) {
    return Object.values(state.deliveries)
        .some((lane) => lane && lane.state !== 'delivered' && lane.state !== 'expired');
}
function expirePendingLevelSpinDeliveries(state) {
    const expireLane = (lane) => !lane
        ? undefined
        : lane.state === 'delivered' || lane.state === 'expired'
            ? lane
            : { ...lane, state: 'expired', deliveryToken: null, deliveryLeaseUntilMs: 0 };
    return {
        ...state,
        deliveries: {
            base: expireLane(state.deliveries.base),
            ...(state.deliveries.premium ? { premium: expireLane(state.deliveries.premium) } : {}),
        },
    };
}
const LEVEL_SPIN_PUBLIC_DELIVERY_STATES = new Set([
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
function publicLaneState(lane, entitlement, expired) {
    if (!LEVEL_SPIN_PUBLIC_DELIVERY_STATES.has(lane.state))
        return null;
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
function publicLevelSpinReceipt(requestId, data, stableUid, entitlement = 'unknown', nowMs) {
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
    const expectedKind = examCredit ? 'standard' : (MILESTONE_GIFTS[level] ? 'milestone' : 'standard');
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
        || !Number.isInteger(level) || level < 2 || level > exports.LEVEL_SPIN_MAX_LEVEL
        || (!examCredit && creditId !== creditIdForLevel(level))
        || kind !== expectedKind
        || !LEVEL_SPIN_STORED_GIFT_IDS.has(storedBaseGiftId)
        || (storedPremiumGiftId !== null && !LEVEL_SPIN_STORED_GIFT_IDS.has(storedPremiumGiftId))
        || (typeof mutable.deliveries.base.selectedGiftId === 'string'
            && !LEVEL_SPIN_STORED_GIFT_IDS.has(mutable.deliveries.base.selectedGiftId))
        || (typeof mutable.deliveries.premium?.selectedGiftId === 'string'
            && !LEVEL_SPIN_STORED_GIFT_IDS.has(mutable.deliveries.premium.selectedGiftId))
        || !Number.isFinite(createdAtMs)
        || expiresAtMs !== createdAtMs + exports.LEVEL_SPIN_RESULT_TTL_MS
        || data.catalogVersion !== exports.LEVEL_SPIN_CATALOG_VERSION
        || data.schemaVersion !== exports.LEVEL_SPIN_SCHEMA_VERSION
        || !base
        || (exposePremiumLane && (!premiumGiftId || !premium)))
        return null;
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
        catalogVersion: exports.LEVEL_SPIN_CATALOG_VERSION,
        schemaVersion: exports.LEVEL_SPIN_SCHEMA_VERSION,
    };
}
exports.levelRewardSpinStatus = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
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
        const progress = (userSnap.data()?.progress ?? {});
        const state = normalizedServerState(userSnap.data()?.levelSpinServerState, Number(progress.user_level ?? 1), 0);
        const entitlement = await resolveCurrentLevelSpinEntitlement(() => (0, premium_status_1.resolvePremiumAccess)(db, stableUid, nowMs, authUid, tx));
        const oldest = availableSnap.empty ? null : {
            id: availableSnap.docs[0].id,
            level: Number(availableSnap.docs[0].data().level),
            kind: availableSnap.docs[0].data().kind,
        };
        const pendingResults = liveResultSnap.docs.flatMap((doc) => {
            const data = doc.data();
            const mutable = normalizedResultMutableState(data);
            const hasPendingLane = Object.values(mutable.deliveries)
                .some((lane) => lane && lane.state !== 'delivered' && lane.state !== 'expired');
            const receipt = publicLevelSpinReceipt(doc.id, data, stableUid, entitlement, nowMs);
            return hasPendingLane && receipt ? [receipt] : [];
        });
        expiredResultSnap.docs.forEach((doc) => {
            const expired = expirePendingLevelSpinDeliveries(normalizedResultMutableState(doc.data()));
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
exports.levelRewardSpinClaim = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
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
        const entitlement = await resolveCurrentLevelSpinEntitlement(() => (0, premium_status_1.resolvePremiumAccess)(db, stableUid, nowMs, authUid, tx));
        if (existingResult.exists) {
            const existingData = existingResult.data();
            return { data: existingData, entitlement, nowMs };
        }
        const progress = (userSnap.data()?.progress ?? {});
        const state = normalizedServerState(userSnap.data()?.levelSpinServerState, Number(progress.user_level ?? 1), Number(progress.level_reward_spin_balance ?? 0));
        if (state.activeRequestId && state.activeRequestId !== requestId) {
            throw new https_1.HttpsError('failed-precondition', 'ACTIVE_SPIN_PENDING');
        }
        if (state.activeRequestId === requestId) {
            throw new https_1.HttpsError('aborted', 'active_level_spin_result_missing');
        }
        const available = await tx.get(userRef.collection('level_spin_credits').where('status', '==', 'available').orderBy('level').limit(1));
        if (available.empty || state.balance <= 0) {
            throw new https_1.HttpsError('failed-precondition', 'NO_LEVEL_SPINS');
        }
        const creditSnap = available.docs[0];
        const credit = creditSnap.data();
        let sampleIndex = 0;
        const reward = rewardForSpinForCurrentEntitlement(credit, entitlement, () => randomSamples[sampleIndex++] ?? randomSamples[0]);
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
            expiresAtMs: nowMs + exports.LEVEL_SPIN_RESULT_TTL_MS,
            balanceAfter,
            status: 'awaiting_ack',
            revealState: 'pending',
            deliveries: {
                base: { state: 'unclaimed' },
                ...(reward.premiumGiftId ? { premium: { state: 'unclaimed' } } : {}),
            },
            hasPendingDelivery: true,
            catalogVersion: exports.LEVEL_SPIN_CATALOG_VERSION,
            schemaVersion: exports.LEVEL_SPIN_SCHEMA_VERSION,
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
    const publicReceipt = publicLevelSpinReceipt(requestId, internalResult.data, stableUid, internalResult.entitlement, internalResult.nowMs);
    if (!publicReceipt)
        throw new https_1.HttpsError('failed-precondition', 'level_spin_result_corrupt');
    return publicReceipt;
});
exports.levelRewardSpinAcknowledge = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const requestId = cleanRequestId(request.data?.requestId);
    const { authUid, stableUid, db, userRef } = await stableUser(request);
    const resultRef = userRef.collection('level_spin_results').doc(requestId);
    return db.runTransaction(async (tx) => {
        const [userSnap, resultSnap] = await Promise.all([
            readLiveSpinIdentity(tx, db, authUid, stableUid, userRef),
            tx.get(resultRef),
        ]);
        if (!resultSnap.exists)
            throw new https_1.HttpsError('not-found', 'level_spin_result_missing');
        const progress = (userSnap.data()?.progress ?? {});
        const state = normalizedServerState(userSnap.data()?.levelSpinServerState, Number(progress.user_level ?? 1), Number(progress.level_reward_spin_balance ?? 0));
        if (state.activeRequestId && state.activeRequestId !== requestId) {
            throw new https_1.HttpsError('failed-precondition', 'ACTIVE_SPIN_PENDING');
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
exports.levelRewardSpinDelivery = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const requestId = cleanRequestId(request.data?.requestId);
    const lane = request.data?.lane === 'premium' ? 'premium' : request.data?.lane === 'base' ? 'base' : null;
    const action = request.data?.action;
    if (!lane || !['begin_delivery', 'complete_delivery', 'release_delivery'].includes(String(action))) {
        throw new https_1.HttpsError('invalid-argument', 'bad_level_spin_delivery_action');
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
        const entitlement = await resolveCurrentLevelSpinEntitlement(() => (0, premium_status_1.resolvePremiumAccess)(db, stableUid, nowMs, authUid, tx));
        if (!resultSnap.exists)
            throw new https_1.HttpsError('not-found', 'level_spin_result_missing');
        if (lane === 'premium' && entitlement === 'unknown') {
            throw new https_1.HttpsError('failed-precondition', 'level_spin_entitlement_unknown');
        }
        const data = resultSnap.data();
        const expiresAtMs = Number(data.expiresAtMs ?? 0);
        let state = normalizedResultMutableState(data);
        let currentLane = state.deliveries[lane];
        if (!currentLane)
            throw new https_1.HttpsError('failed-precondition', 'level_spin_delivery_lane_missing');
        if (currentLane.state === 'delivered') {
            const deliveredStoredGiftId = currentLane.selectedGiftId
                ?? String(lane === 'base' ? data.baseGiftId ?? '' : data.premiumGiftId ?? '');
            const deliveredGiftId = canonicalLevelSpinGiftId(deliveredStoredGiftId, entitlement);
            return { ok: true, stableUid, requestId, lane, status: 'already_claimed', giftId: deliveredGiftId };
        }
        const storedRootGiftId = String(lane === 'base' ? data.baseGiftId ?? '' : data.premiumGiftId ?? '');
        if (!LEVEL_SPIN_STORED_GIFT_IDS.has(storedRootGiftId)) {
            throw new https_1.HttpsError('failed-precondition', 'level_spin_delivery_gift_missing');
        }
        const storedLockedGiftId = currentLane.selectedGiftId ?? '';
        if (storedLockedGiftId && !LEVEL_SPIN_STORED_GIFT_IDS.has(storedLockedGiftId)) {
            throw new https_1.HttpsError('failed-precondition', 'level_spin_delivery_gift_missing');
        }
        const canonicalRootGiftId = canonicalLevelSpinGiftId(storedRootGiftId, entitlement);
        const lockedGiftId = storedLockedGiftId
            ? canonicalLevelSpinGiftId(storedLockedGiftId, entitlement)
            : '';
        const canonicalSelectedGiftId = canonicalLevelSpinGiftId(selectedGiftId, entitlement);
        if (nowMs >= expiresAtMs) {
            const expiredGiftId = lockedGiftId || canonicalRootGiftId;
            state = applyLevelSpinResultAction(state, {
                action: action,
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
            throw new https_1.HttpsError('invalid-argument', 'level_spin_delivery_gift_mismatch');
        }
        if (storedLockedGiftId && selectedGiftId && canonicalSelectedGiftId !== lockedGiftId) {
            throw new https_1.HttpsError('invalid-argument', 'level_spin_delivery_selection_changed');
        }
        try {
            state = applyLevelSpinResultAction(state, {
                action: action,
                lane,
                nowMs,
                deliveryToken,
            }, expiresAtMs);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'level_spin_delivery_failed';
            if (message === 'level_spin_delivery_busy') {
                return { ok: true, stableUid, requestId, lane, status: 'busy', giftId: effectiveGiftId };
            }
            throw new https_1.HttpsError('failed-precondition', message);
        }
        const nextLane = state.deliveries[lane];
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
            giftId: canonicalLevelSpinGiftId(state.deliveries[lane]?.selectedGiftId ?? effectiveGiftId, entitlement),
            leaseUntil: state.deliveries[lane]?.deliveryLeaseUntilMs ?? 0,
        };
    });
});
