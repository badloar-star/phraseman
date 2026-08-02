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
exports.adminReferralHealth = exports.adminSetReferralRouletteEmergencyStop = exports.adminSetReferralRouletteEnabled = exports.adminSetSpinWeights = exports.adminSpinLogs = exports.adminSpinStats = exports.adminGetReferralDashboard = exports.adminListReferrals = exports.adminRevokeReferralAttribution = void 0;
exports.classifyReferralRevocationRecord = classifyReferralRevocationRecord;
exports.referralDashboardCursorFromAttribution = referralDashboardCursorFromAttribution;
exports.projectReferralDashboardRow = projectReferralDashboardRow;
exports.displayNameFromUser = displayNameFromUser;
exports.summarizeReferralDashboardPurchases = summarizeReferralDashboardPurchases;
exports.normalizeReferralConfigCommand = normalizeReferralConfigCommand;
/**
 * Admin-callables для раздела «Рефералы» админки: список приглашений, статистика
 * и лог рулетки, запись весов в «Пульт», health-проверки работоспособности.
 *
 * Гейт: custom claim `admin` в auth token.
 * TODO(verify): в extract нет существующего admin-gate — сверить имя claim'а и
 * механизм выдачи с реальным проектом (возможно, там свой assertAdmin / allowlist
 * email'ов). Точка одна — функция assertAdmin ниже.
 *
 * Все функции read-mostly; adminSetSpinWeights — единственная пишущая (валидация
 * суммы 100 через validateSpinWeights из referral_spin_logic.ts — та же, что в тестах).
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const referral_spin_logic_1 = require("./referral_spin_logic");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const premium_status_1 = require("./premium_status");
const referral_1 = require("./referral");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
const referral_admin_drain_metrics_1 = require("./referral_admin_drain_metrics");
const referral_admin_soft_toggle_1 = require("./referral_admin_soft_toggle");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const USERS = 'users';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const SPINS_SUBCOLLECTION = 'referral_spins';
const MAX_PAGE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_QUALIFIED_DAYS = 30;
/** Health-выборки ограничены сверху — дешёвые проверки, а не полный скан. */
const HEALTH_SAMPLE_USERS = 500;
const FIRESTORE_IN_BATCH = 30;
const FIRESTORE_GET_ALL_BATCH = 100;
const ADMIN_COMMAND_OPERATIONS = 'admin_command_operations';
const ADMIN_LOG = 'admin_log';
const REFERRAL_REVOKE_LEDGER_LIMIT = 450;
const REVOCABLE_REFERRAL_STATUSES = new Set([
    'pending',
    'qualified',
    'rewarded',
    'skipped_referrer_cap',
]);
function exactStoredShardBonus(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}
/**
 * Pure classification shared with contract tests. Reward precedence is
 * deliberate: stale legacy shard fields must never turn a spin/VIP grant into
 * a balance clawback.
 */
function classifyReferralRevocationRecord(row) {
    const previousStatus = String(row.status ?? '').trim();
    if (previousStatus === 'revoked') {
        return {
            allowed: false,
            previousStatus,
            error: 'REFERRAL_ALREADY_REVOKED',
            rewardMode: 'none',
            refereeShardBonus: 0,
            referrerShardBonus: 0,
        };
    }
    if (!REVOCABLE_REFERRAL_STATUSES.has(previousStatus)) {
        return {
            allowed: false,
            previousStatus,
            error: 'REFERRAL_STATUS_NOT_REVOCABLE',
            rewardMode: 'none',
            refereeShardBonus: 0,
            referrerShardBonus: 0,
        };
    }
    if (previousStatus !== 'rewarded') {
        return {
            allowed: true,
            previousStatus,
            rewardMode: 'none',
            refereeShardBonus: 0,
            referrerShardBonus: 0,
        };
    }
    const rewardKind = String(row.rewardKind ?? '').trim().toLowerCase();
    if (rewardKind === 'spin_credit') {
        return {
            allowed: true,
            previousStatus,
            rewardMode: 'spin_credit',
            refereeShardBonus: 0,
            referrerShardBonus: 0,
        };
    }
    if (rewardKind.includes('vip')) {
        return {
            allowed: true,
            previousStatus,
            rewardMode: 'vip_retained',
            refereeShardBonus: 0,
            referrerShardBonus: 0,
        };
    }
    const hasStoredShardBonus = Object.prototype.hasOwnProperty.call(row, 'refereeShardBonus')
        || Object.prototype.hasOwnProperty.call(row, 'referrerShardBonus');
    const rewardMode = rewardKind === 'legacy_shards' || hasStoredShardBonus
        ? 'legacy_shards'
        : 'reward_retained';
    return {
        allowed: true,
        previousStatus,
        rewardMode,
        refereeShardBonus: rewardMode === 'legacy_shards'
            ? exactStoredShardBonus(row.refereeShardBonus)
            : 0,
        referrerShardBonus: rewardMode === 'legacy_shards'
            ? exactStoredShardBonus(row.referrerShardBonus)
            : 0,
    };
}
const FIRESTORE_TIMESTAMP_MIN_SECONDS = -62135596800;
const FIRESTORE_TIMESTAMP_MAX_SECONDS = 253402300799;
function validatedReferralDashboardCursor(raw) {
    const seconds = raw.seconds;
    const nanoseconds = raw.nanoseconds;
    const attributionId = typeof raw.attributionId === 'string' ? raw.attributionId.trim() : '';
    if (typeof seconds !== 'number'
        || !Number.isSafeInteger(seconds)
        || seconds < FIRESTORE_TIMESTAMP_MIN_SECONDS
        || seconds > FIRESTORE_TIMESTAMP_MAX_SECONDS
        || typeof nanoseconds !== 'number'
        || !Number.isInteger(nanoseconds)
        || nanoseconds < 0
        || nanoseconds > 999999999
        || !attributionId
        || attributionId.includes('/')
        || Buffer.byteLength(attributionId, 'utf8') > 1500) {
        return null;
    }
    return {
        seconds,
        nanoseconds,
        attributionId,
    };
}
function referralDashboardCursorFromAttribution(attribution) {
    if (!attribution.createdAt || typeof attribution.createdAt !== 'object')
        return null;
    const createdAt = attribution.createdAt;
    return validatedReferralDashboardCursor({
        seconds: createdAt.seconds,
        nanoseconds: createdAt.nanoseconds,
        attributionId: attribution.id,
    });
}
function referralDashboardCursorFromData(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    return validatedReferralDashboardCursor(raw);
}
function dashboardDisplayName(value) {
    const name = String(value ?? '').trim();
    return name || 'Без имени';
}
function spinReceiptFromData(data) {
    return {
        creditId: String(data.creditId ?? ''),
        creditSource: String(data.creditSource ?? ''),
        prizeDays: Math.max(0, Math.floor(Number(data.prizeDays) || 0)),
        prizeKind: data.prizeKind === 'pearls' ? 'pearls' : 'days',
        prizePearls: Math.max(0, Math.floor(Number(data.prizePearls) || 0)),
        createdAtMs: tsToMs(data.createdAt) || tsToMs(data.createdAtMs),
    };
}
/**
 * Pure, read-only projection used by both the callable and its contract tests.
 * The purchase boolean deliberately comes only from server-owned store fields.
 */
function projectReferralDashboardRow(input) {
    const refereeStableId = String(input.attribution.id ?? '').trim();
    const referrerStableId = String(input.attribution.referrerStableId ?? '').trim();
    const plusPurchased = (0, premium_status_1.isStorePremiumActive)(input.refereeProgress, input.nowMs);
    const expectedCreditId = (0, referral_spin_ledger_1.referralCreditId)(refereeStableId);
    const receipt = input.spinReceipts
        .filter((candidate) => (String(candidate.creditId ?? '') === expectedCreditId
        && String(candidate.creditSource ?? '') === 'referral'))
        .map(spinReceiptFromData)
        .sort((a, b) => tsToMs(b.createdAtMs) - tsToMs(a.createdAtMs))[0];
    const prizeKind = receipt?.prizeKind === 'pearls' ? 'pearls' : 'days';
    return {
        referrerStableId,
        referrerName: dashboardDisplayName(input.displayNames[referrerStableId]),
        refereeStableId,
        refereeName: dashboardDisplayName(input.displayNames[refereeStableId]),
        refCode: String(input.attribution.refCode ?? '').trim(),
        createdAtMs: tsToMs(input.attribution.createdAt) || tsToMs(input.attribution.createdAtMs),
        plusPurchased,
        purchasedAtMs: plusPurchased
            ? (0, premium_status_1.parseProgressMs)(input.refereeProgress?.premium_rc_purchased_at_ms)
                || tsToMs(input.attribution.qualifiedAt)
                || tsToMs(input.attribution.qualifiedAtMs)
            : 0,
        roulette: receipt
            ? {
                state: 'spun',
                prizeDays: Math.max(0, Math.floor(Number(receipt.prizeDays) || 0)),
                prizeKind,
                prizePearls: Math.max(0, Math.floor(Number(receipt.prizePearls) || 0)),
                createdAtMs: tsToMs(receipt.createdAtMs),
            }
            : { state: 'not_spun' },
    };
}
function chunked(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}
async function getUsersById(db, ids) {
    const uniqueIds = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
    const result = new Map();
    for (const batch of chunked(uniqueIds, FIRESTORE_GET_ALL_BATCH)) {
        // eslint-disable-next-line no-await-in-loop
        const snapshots = await db.getAll(...batch.map((id) => db.collection(USERS).doc(id)));
        for (const snapshot of snapshots) {
            if (snapshot.exists)
                result.set(snapshot.id, snapshot.data() ?? {});
        }
    }
    return result;
}
function displayNameFromUser(data) {
    return (0, referral_1.referralDisplayNameFromUserData)(data);
}
function prizeAggregateKey(receipt) {
    return receipt.prizeKind === 'pearls'
        ? `pearls:${Math.max(0, Math.floor(Number(receipt.prizePearls) || 0))}`
        : `days:${Math.max(0, Math.floor(Number(receipt.prizeDays) || 0))}`;
}
function summarizeReferralDashboardPurchases(input) {
    let plusPurchased = 0;
    for (const attributionId of input.attributionIds) {
        if ((0, premium_status_1.isStorePremiumActive)(input.progressByRefereeId.get(attributionId), input.nowMs)) {
            plusPurchased += 1;
        }
    }
    return { totalInvited: input.attributionIds.length, plusPurchased };
}
/** TODO(verify): сверить с реальным admin-гейтом проекта. */
function assertAdmin(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    if (request.auth.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'ADMIN_REQUIRED');
    }
}
function adminRoleFromToken(token) {
    const role = token?.adminRole;
    return (0, roles_1.hasAdminRole)(role) ? role : null;
}
function clampLimit(raw, fallback) {
    const n = Math.trunc(Number(raw));
    if (!Number.isFinite(n) || n <= 0)
        return fallback;
    return Math.min(MAX_PAGE, n);
}
function tsToMs(v) {
    if (v && typeof v.toMillis === 'function') {
        return v.toMillis();
    }
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : 0;
}
async function countOf(query) {
    const snap = await query.count().get();
    return Number(snap.data().count ?? 0);
}
const COMMAND_TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
function normalizeReferralConfigCommand(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new https_1.HttpsError('invalid-argument', 'referral config command required');
    }
    const row = data;
    const expectedRevision = row.expectedRevision;
    const reason = String(row.reason ?? '').trim().slice(0, 500);
    const requestId = String(row.requestId ?? '').trim();
    const idempotencyKey = String(row.idempotencyKey ?? '').trim();
    if (typeof expectedRevision !== 'number'
        || !Number.isInteger(expectedRevision)
        || expectedRevision < 0
        || !reason
        || !COMMAND_TOKEN_RE.test(requestId)
        || !COMMAND_TOKEN_RE.test(idempotencyKey)
        || idempotencyKey.length > 120) {
        throw new https_1.HttpsError('invalid-argument', 'expectedRevision, reason, requestId and idempotencyKey are required');
    }
    return Object.freeze({ expectedRevision, reason, requestId, idempotencyKey });
}
function isSafeFirestoreDocumentId(value) {
    return Boolean(value)
        && value !== '.'
        && value !== '..'
        && !value.includes('/')
        && Buffer.byteLength(value, 'utf8') <= 1500;
}
function normalizeAdminReferralRevokeInput(data) {
    if (!data || typeof data !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'referral revoke command required');
    }
    const row = data;
    const refereeStableId = String(row.refereeStableId ?? '').trim();
    const reason = String(row.reason ?? '').trim().slice(0, 500);
    const requestId = String(row.requestId ?? '').trim();
    const idempotencyKey = String(row.idempotencyKey ?? '').trim();
    if (!isSafeFirestoreDocumentId(refereeStableId)
        || !reason
        || !COMMAND_TOKEN_RE.test(requestId)
        || !COMMAND_TOKEN_RE.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'refereeStableId, reason, requestId and idempotencyKey are required');
    }
    return Object.freeze({ refereeStableId, reason, requestId, idempotencyKey });
}
function finiteShardBalance(data) {
    const value = data?.shards;
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}
function storedOperationResult(data) {
    const result = data?.result;
    return result && typeof result === 'object' && !Array.isArray(result)
        ? result
        : {};
}
/**
 * Protected referral revocation. The attribution and its deterministic ledger
 * credit are the source of truth; the browser supplies only the attribution id
 * and the mandatory operator reason/command ids.
 */
exports.adminRevokeReferralAttribution = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    assertAdmin(request);
    const role = (0, permissions_1.roleFromAdminToken)(request.auth?.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'users.write')) {
        throw new https_1.HttpsError('permission-denied', 'USERS_WRITE_REQUIRED');
    }
    const actorUid = request.auth.uid;
    const input = normalizeAdminReferralRevokeInput(request.data);
    const refereeStableId = input.refereeStableId;
    const db = admin.firestore();
    const attributionRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(refereeStableId);
    const operationRef = db
        .collection(ADMIN_COMMAND_OPERATIONS)
        .doc(`referral_revoke_${input.idempotencyKey}`);
    const auditRef = db.collection(ADMIN_LOG).doc();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const requestFingerprint = JSON.stringify({
        action: 'referral.revoke',
        refereeStableId,
        reason: input.reason,
        requestId: input.requestId,
    });
    return db.runTransaction(async (tx) => {
        const [operationSnapshot, attributionSnapshot] = await Promise.all([
            tx.get(operationRef),
            tx.get(attributionRef),
        ]);
        if (operationSnapshot.exists) {
            const operation = operationSnapshot.data() ?? {};
            if (operation.requestFingerprint !== requestFingerprint
                || operation.actorUid !== actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return { ...storedOperationResult(operation), replayed: true };
        }
        if (!attributionSnapshot.exists) {
            throw new https_1.HttpsError('not-found', 'REFERRAL_ATTRIBUTION_NOT_FOUND');
        }
        const attribution = attributionSnapshot.data() ?? {};
        const classification = classifyReferralRevocationRecord(attribution);
        if (!classification.allowed) {
            throw new https_1.HttpsError('failed-precondition', classification.error ?? 'REFERRAL_STATUS_NOT_REVOCABLE');
        }
        const previousStatus = classification.previousStatus;
        const referrerStableId = String(attribution.referrerStableId ?? '').trim();
        const rewardKind = String(attribution.rewardKind ?? '').trim();
        if (classification.rewardMode !== 'none'
            && classification.rewardMode !== 'reward_retained'
            && !isSafeFirestoreDocumentId(referrerStableId)) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_REFERRER_INVALID');
        }
        const referrerRef = isSafeFirestoreDocumentId(referrerStableId)
            ? db.collection(USERS).doc(referrerStableId)
            : null;
        let creditRef = null;
        let creditSnapshot = null;
        let availableCreditSnapshot = null;
        let referrerUserSnapshot = null;
        let refereeUserSnapshot = null;
        if (classification.rewardMode === 'spin_credit' && referrerRef) {
            creditRef = referrerRef
                .collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER)
                .doc((0, referral_spin_ledger_1.referralCreditId)(refereeStableId));
            [creditSnapshot, availableCreditSnapshot, referrerUserSnapshot] = await Promise.all([
                tx.get(creditRef),
                tx.get(referrerRef
                    .collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER)
                    .where('status', '==', 'available')
                    .limit(REFERRAL_REVOKE_LEDGER_LIMIT)),
                tx.get(referrerRef),
            ]);
        }
        else if (classification.rewardMode === 'legacy_shards') {
            const refereeRef = db.collection(USERS).doc(refereeStableId);
            [refereeUserSnapshot, referrerUserSnapshot] = await Promise.all([
                tx.get(refereeRef),
                referrerRef ? tx.get(referrerRef) : Promise.resolve(null),
            ]);
        }
        let rewardOutcome = 'no_reward';
        let retainedReward = false;
        let refereeShardsReversed = 0;
        let referrerShardsReversed = 0;
        if (classification.rewardMode === 'spin_credit') {
            if (!creditRef || !creditSnapshot || !availableCreditSnapshot || !referrerRef) {
                rewardOutcome = 'spin_credit_missing_retained';
                retainedReward = true;
            }
            else if (!creditSnapshot.exists) {
                rewardOutcome = 'spin_credit_missing_retained';
                retainedReward = true;
            }
            else {
                const targetCredit = (0, referral_spin_ledger_1.ledgerRowFromData)(creditSnapshot.id, creditSnapshot.data());
                if (!targetCredit) {
                    throw new https_1.HttpsError('failed-precondition', 'LEDGER_INVALID_CREDIT');
                }
                if (targetCredit.source !== 'referral'
                    || targetCredit.ownerStableId !== referrerStableId
                    || targetCredit.attributionId !== refereeStableId) {
                    throw new https_1.HttpsError('failed-precondition', 'LEDGER_CREDIT_OWNERSHIP_MISMATCH');
                }
                if (targetCredit.status === 'consumed') {
                    rewardOutcome = 'spin_credit_consumed_retained';
                    retainedReward = true;
                }
                else if (targetCredit.status === 'expired') {
                    rewardOutcome = 'spin_credit_already_expired';
                }
                else {
                    if (availableCreditSnapshot.size >= REFERRAL_REVOKE_LEDGER_LIMIT) {
                        throw new https_1.HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
                    }
                    const availableRows = availableCreditSnapshot.docs.map((snapshot) => {
                        const parsed = (0, referral_spin_ledger_1.ledgerRowFromData)(snapshot.id, snapshot.data());
                        if (!parsed)
                            throw new https_1.HttpsError('failed-precondition', 'LEDGER_INVALID_CREDIT');
                        return parsed;
                    });
                    if (!availableRows.some((row) => row.id === targetCredit.id)) {
                        availableRows.push(targetCredit);
                    }
                    const reconciledBefore = (0, referral_spin_ledger_1.reconcileLedgerRows)(availableRows, nowMs, { softEnabled: true });
                    const reconciledAfter = (0, referral_spin_ledger_1.reconcileLedgerRows)(availableRows.filter((row) => row.id !== targetCredit.id), nowMs, { softEnabled: true });
                    for (const expiredCreditId of reconciledBefore.expiredIds) {
                        if (expiredCreditId === targetCredit.id)
                            continue;
                        tx.set(referrerRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(expiredCreditId), {
                            status: 'expired',
                            expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                            expiredAtMs: nowMs,
                            expiryReason: 'credit_expired_during_referral_revoke_reconciliation',
                        }, { merge: true });
                    }
                    const wasAlreadyExpired = targetCredit.expiresAtMs < nowMs;
                    tx.set(creditRef, {
                        status: 'expired',
                        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiredAtMs: nowMs,
                        expiryReason: wasAlreadyExpired
                            ? 'credit_expired_before_referral_revoke'
                            : 'admin_referral_revoke',
                        revokedAttributionOperationId: operationRef.id,
                    }, { merge: true });
                    tx.set(referrerRef, {
                        progress: {
                            referral_spin_credits: reconciledAfter.availableCount,
                            referral_spin_ledger_version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                        },
                        updatedAt: nowMs,
                    }, { merge: true });
                    rewardOutcome = wasAlreadyExpired
                        ? 'spin_credit_already_expired'
                        : 'spin_credit_cancelled';
                }
            }
        }
        else if (classification.rewardMode === 'vip_retained') {
            rewardOutcome = 'vip_retained';
            retainedReward = true;
        }
        else if (classification.rewardMode === 'reward_retained') {
            rewardOutcome = 'legacy_reward_retained';
            retainedReward = true;
        }
        else if (classification.rewardMode === 'legacy_shards') {
            const refereeBefore = finiteShardBalance(refereeUserSnapshot?.data());
            const referrerBefore = finiteShardBalance(referrerUserSnapshot?.data());
            const sameUser = referrerStableId === refereeStableId;
            refereeShardsReversed = refereeUserSnapshot?.exists
                ? Math.min(refereeBefore, classification.refereeShardBonus)
                : 0;
            referrerShardsReversed = referrerUserSnapshot?.exists
                ? Math.min(sameUser ? Math.max(0, refereeBefore - refereeShardsReversed) : referrerBefore, classification.referrerShardBonus)
                : 0;
            const refereeRef = db.collection(USERS).doc(refereeStableId);
            if (sameUser) {
                const totalReversed = refereeShardsReversed + referrerShardsReversed;
                if (totalReversed > 0) {
                    tx.update(refereeRef, {
                        shards: Math.max(0, refereeBefore - totalReversed),
                        updatedAt: nowMs,
                    });
                }
            }
            else {
                if (refereeShardsReversed > 0) {
                    tx.update(refereeRef, {
                        shards: Math.max(0, refereeBefore - refereeShardsReversed),
                        updatedAt: nowMs,
                    });
                }
                if (referrerShardsReversed > 0 && referrerRef) {
                    tx.update(referrerRef, {
                        shards: Math.max(0, referrerBefore - referrerShardsReversed),
                        updatedAt: nowMs,
                    });
                }
            }
            if (refereeShardsReversed > 0) {
                tx.create(refereeRef.collection('shard_log').doc(`${operationRef.id}_referee`), {
                    ts: nowIso,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: 'spend',
                    amount: -refereeShardsReversed,
                    reason: 'admin_referral_revoke',
                    balanceAfter: Math.max(0, refereeBefore - refereeShardsReversed - (sameUser ? referrerShardsReversed : 0)),
                    actorUid,
                    targetUid: refereeStableId,
                    attributionId: refereeStableId,
                    operationId: operationRef.id,
                });
            }
            if (referrerShardsReversed > 0 && referrerRef) {
                tx.create(referrerRef.collection('shard_log').doc(`${operationRef.id}_referrer`), {
                    ts: nowIso,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    type: 'spend',
                    amount: -referrerShardsReversed,
                    reason: 'admin_referral_revoke',
                    balanceAfter: sameUser
                        ? Math.max(0, refereeBefore - refereeShardsReversed - referrerShardsReversed)
                        : Math.max(0, referrerBefore - referrerShardsReversed),
                    actorUid,
                    targetUid: referrerStableId,
                    attributionId: refereeStableId,
                    operationId: operationRef.id,
                });
            }
            const requestedShardReversal = classification.refereeShardBonus
                + classification.referrerShardBonus;
            const actualShardReversal = refereeShardsReversed + referrerShardsReversed;
            rewardOutcome = actualShardReversal < requestedShardReversal
                ? 'legacy_shards_partially_reversed'
                : 'legacy_shards_reversed';
            retainedReward = actualShardReversal < requestedShardReversal;
        }
        const result = {
            ok: true,
            refereeStableId,
            referrerStableId,
            previousStatus,
            rewardKind,
            rewardOutcome,
            retainedReward,
            refereeShardsReversed,
            referrerShardsReversed,
            auditId: auditRef.id,
            replayed: false,
        };
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'referral.revoke',
            actorUid,
            role,
            entity: { collection: REFERRAL_ATTRIBUTIONS, id: refereeStableId },
            reason: input.reason,
            before: {
                status: previousStatus,
                rewardKind: rewardKind || null,
                referrerStableId: referrerStableId || null,
                refereeShardBonus: attribution.refereeShardBonus ?? null,
                referrerShardBonus: attribution.referrerShardBonus ?? null,
            },
            after: {
                status: 'revoked',
                previousStatus,
                rewardOutcome,
                retainedReward,
                refereeShardsReversed,
                referrerShardsReversed,
                operationId: operationRef.id,
            },
            rollbackReference: attributionRef.path,
            requestId: input.requestId,
            timestamp: nowIso,
        });
        tx.set(attributionRef, {
            status: 'revoked',
            previousStatus,
            revokedReason: input.reason,
            revokedAt: admin.firestore.FieldValue.serverTimestamp(),
            revokedAtMs: nowMs,
            revokedBy: actorUid,
            revocationRequestId: input.requestId,
            revocationOperationId: operationRef.id,
            revocationRewardOutcome: rewardOutcome,
        }, { merge: true });
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, {
            action: 'referral.revoke',
            requestFingerprint,
            actorUid,
            entityId: refereeStableId,
            auditId: auditRef.id,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtMs: nowMs,
        });
        return result;
    });
});
exports.adminListReferrals = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const status = String(request.data?.status ?? '').trim();
    const limit = clampLimit(request.data?.limit, 50);
    const cursorMs = tsToMs(request.data?.cursor);
    const db = admin.firestore();
    let query = db.collection(REFERRAL_ATTRIBUTIONS).orderBy('createdAt', 'desc');
    if (status === 'pending' || status === 'qualified' || status === 'rewarded' || status === 'skipped_referrer_cap') {
        query = db
            .collection(REFERRAL_ATTRIBUTIONS)
            .where('status', '==', status)
            .orderBy('createdAt', 'desc');
    }
    if (cursorMs > 0) {
        query = query.startAfter(admin.firestore.Timestamp.fromMillis(cursorMs));
    }
    const snap = await query.limit(limit).get();
    // Имена referrer/referee одной пачкой (как в referralListMyInvites).
    const uids = new Set();
    for (const d of snap.docs) {
        const row = d.data();
        uids.add(d.id);
        if (row.referrerStableId)
            uids.add(String(row.referrerStableId));
    }
    const uidList = [...uids].slice(0, 200);
    const userSnaps = uidList.length ? await db.getAll(...uidList.map((id) => db.collection(USERS).doc(id))) : [];
    const nameByUid = new Map();
    for (const u of userSnaps) {
        const data = u.data();
        const name = String(data?.displayName ?? data?.name ?? '').trim();
        if (name)
            nameByUid.set(u.id, name);
    }
    const rows = snap.docs.map((d) => {
        const row = d.data();
        return {
            refereeStableId: d.id,
            refereeName: nameByUid.get(d.id) ?? null,
            referrerStableId: String(row.referrerStableId ?? ''),
            referrerName: row.referrerStableId ? (nameByUid.get(String(row.referrerStableId)) ?? null) : null,
            status: String(row.status ?? 'pending'),
            refCode: String(row.refCode ?? ''),
            rewardKind: String(row.rewardKind ?? ''),
            createdAtMs: tsToMs(row.createdAt),
            qualifiedAtMs: tsToMs(row.qualifiedAt),
        };
    });
    const counts = {
        total: await countOf(db.collection(REFERRAL_ATTRIBUTIONS)),
        pending: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'pending')),
        qualified: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'qualified')),
        rewarded: await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'rewarded')),
    };
    return {
        ok: true,
        rows,
        counts,
        nextCursor: rows.length === limit ? rows[rows.length - 1]?.createdAtMs ?? null : null,
    };
});
// ── a2) Read-only dashboard: покупка Plus + результат конкретного spin-credit ─
exports.adminGetReferralDashboard = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const limit = clampLimit(request.data?.limit, 100);
    const cursor = referralDashboardCursorFromData(request.data?.cursor);
    const nowMs = Date.now();
    const db = admin.firestore();
    let pageQuery = db
        .collection(REFERRAL_ATTRIBUTIONS)
        .orderBy('createdAt', 'desc')
        .orderBy(admin.firestore.FieldPath.documentId(), 'desc');
    if (cursor) {
        pageQuery = pageQuery.startAfter(new admin.firestore.Timestamp(cursor.seconds, cursor.nanoseconds), cursor.attributionId);
    }
    const [pageSnap, allAttributionsSnap, allSpinsSnap] = await Promise.all([
        pageQuery.limit(limit).get(),
        db.collection(REFERRAL_ATTRIBUTIONS).select().get(),
        db.collectionGroup(SPINS_SUBCOLLECTION)
            .select('creditId', 'creditSource', 'prizeDays', 'prizeKind', 'prizePearls', 'createdAt', 'createdAtMs')
            .get(),
    ]);
    const pageAttributions = pageSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    const allAttributionIds = allAttributionsSnap.docs.map((doc) => doc.id);
    const pageUserIds = pageAttributions.flatMap((row) => [
        row.id,
        String(row.referrerStableId ?? ''),
    ]);
    const [pageUsers, allRefereeUsers] = await Promise.all([
        getUsersById(db, pageUserIds),
        getUsersById(db, allAttributionIds),
    ]);
    const pageCreditIds = pageAttributions.map((row) => (0, referral_spin_ledger_1.referralCreditId)(row.id));
    const pageSpinReceipts = [];
    for (const creditIds of chunked(pageCreditIds, FIRESTORE_IN_BATCH)) {
        // eslint-disable-next-line no-await-in-loop
        const snap = await db.collectionGroup(SPINS_SUBCOLLECTION)
            .where('creditId', 'in', creditIds)
            .get();
        for (const doc of snap.docs) {
            pageSpinReceipts.push(doc.data());
        }
    }
    const displayNames = {};
    for (const [id, data] of pageUsers.entries()) {
        displayNames[id] = displayNameFromUser(data);
    }
    const progressByUserId = new Map();
    for (const [id, data] of pageUsers.entries()) {
        progressByUserId.set(id, (data.progress ?? {}));
    }
    const rows = pageAttributions.map((attribution) => projectReferralDashboardRow({
        attribution,
        refereeProgress: progressByUserId.get(attribution.id),
        displayNames,
        spinReceipts: pageSpinReceipts,
        nowMs,
    }));
    const allProgressByRefereeId = new Map();
    for (const [id, data] of allRefereeUsers.entries()) {
        allProgressByRefereeId.set(id, (data.progress ?? {}));
    }
    const purchaseSummary = summarizeReferralDashboardPurchases({
        attributionIds: allAttributionIds,
        progressByRefereeId: allProgressByRefereeId,
        nowMs,
    });
    const allSpinReceipts = allSpinsSnap.docs.map((doc) => (spinReceiptFromData(doc.data())));
    const byPrize = {};
    const spunReferralCreditIds = new Set();
    for (const receipt of allSpinReceipts) {
        const key = prizeAggregateKey(receipt);
        byPrize[key] = (byPrize[key] ?? 0) + 1;
        if (receipt.creditSource === 'referral' && receipt.creditId) {
            spunReferralCreditIds.add(String(receipt.creditId));
        }
    }
    return {
        ok: true,
        rows,
        summary: {
            ...purchaseSummary,
            rouletteSpun: spunReferralCreditIds.size,
        },
        roulette: {
            totalSpins: allSpinReceipts.length,
            byPrize,
        },
        nextCursor: rows.length === limit && pageAttributions[pageAttributions.length - 1]
            ? referralDashboardCursorFromAttribution(pageAttributions[pageAttributions.length - 1])
            : null,
    };
});
// ── b) Статистика рулетки ─────────────────────────────────────────────────────
exports.adminSpinStats = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const db = admin.firestore();
    const spinsCol = db.collectionGroup(SPINS_SUBCOLLECTION);
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [total, today, week] = await Promise.all([
        countOf(spinsCol),
        countOf(spinsCol.where('createdAtMs', '>=', dayStart.getTime())),
        countOf(spinsCol.where('createdAtMs', '>=', now - 7 * DAY_MS)),
    ]);
    // Распределение призов: 6 count-запросов (по одному на prizeDays).
    const byPrize = {};
    for (const days of referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS) {
        // eslint-disable-next-line no-await-in-loop
        byPrize[String(days)] = await countOf(spinsCol.where('prizeDays', '==', days));
    }
    const daysGranted = referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS.reduce((s, d) => s + d * (byPrize[String(d)] ?? 0), 0);
    // Кредиты на руках: точная сумма по map-полю progress.* агрегацией не считается —
    // выборка HEALTH_SAMPLE_USERS юзеров с кредитами (помечаем sampled: true).
    const creditsSnap = await db
        .collection(USERS)
        .where('progress.referral_spin_credits', '>', 0)
        .limit(HEALTH_SAMPLE_USERS)
        .get();
    let creditsOnHandSampled = 0;
    for (const u of creditsSnap.docs) {
        const p = u.data().progress ?? {};
        creditsOnHandSampled += Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0)));
    }
    const weights = await (async () => {
        try {
            const snap = await db.collection('remote_config').doc('app').get();
            const data = snap.data();
            return (0, referral_spin_logic_1.referralSpinWeightsFromData)(data?.numbers);
        }
        catch {
            return (0, referral_spin_logic_1.referralSpinWeightsFromData)(undefined);
        }
    })();
    return {
        ok: true,
        spins: { total, today, week },
        daysGranted,
        creditsOnHand: creditsOnHandSampled,
        creditsSampled: creditsSnap.size >= HEALTH_SAMPLE_USERS,
        byPrize,
        weights,
        expectedShares: Object.fromEntries(referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS.map((d, i) => [String(d), (weights[i] ?? 0) / 100])),
    };
});
// ── b) Лог спинов ─────────────────────────────────────────────────────────────
exports.adminSpinLogs = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const limit = clampLimit(request.data?.limit, 50);
    const cursorMs = tsToMs(request.data?.cursor);
    const db = admin.firestore();
    let query = db.collectionGroup(SPINS_SUBCOLLECTION).orderBy('createdAtMs', 'desc');
    if (cursorMs > 0)
        query = query.startAfter(cursorMs);
    const snap = await query.limit(limit).get();
    const rows = snap.docs.map((d) => {
        // path: users/{uid}/referral_spins/{spinRequestId}
        const uid = d.ref.path.split('/')[1] ?? '';
        const row = d.data();
        return {
            uid,
            spinRequestId: d.id,
            prizeIndex: Math.max(0, Math.floor(Number(row.prizeIndex ?? 0))),
            prizeDays: Math.max(0, Math.floor(Number(row.prizeDays ?? 0))),
            reroll: row.reroll === true,
            pity: row.pity === true,
            createdAtMs: tsToMs(row.createdAtMs),
        };
    });
    return { ok: true, rows, nextCursor: rows.length === limit ? rows[rows.length - 1]?.createdAtMs ?? null : null };
});
// ── b) Запись весов в «Пульт» ─────────────────────────────────────────────────
exports.adminSetSpinWeights = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    assertAdmin(request);
    const role = adminRoleFromToken(request.auth?.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
    }
    const command = normalizeReferralConfigCommand(request.data);
    const v = (0, referral_spin_logic_1.validateSpinWeights)(request.data?.weights);
    if (!v.ok) {
        throw new https_1.HttpsError('invalid-argument', v.error);
    }
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc('app');
    const operationRef = db.collection('admin_command_operations')
        .doc(`referral_spin_weights_${command.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const actorUid = request.auth.uid;
    const requestFingerprint = JSON.stringify({
        action: 'referral_spin.weights.set',
        weights: v.weights,
        expectedRevision: command.expectedRevision,
        reason: command.reason,
        requestId: command.requestId,
    });
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([
            tx.get(configRef),
            tx.get(operationRef),
        ]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            if (previous.requestFingerprint !== requestFingerprint || previous.actorUid !== actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return { ...storedOperationResult(previous), replayed: true };
        }
        const config = (configSnap.data() ?? {});
        const currentRevision = Number(config.revision ?? 0);
        if (!Number.isInteger(currentRevision) || currentRevision !== command.expectedRevision) {
            throw new https_1.HttpsError('aborted', 'remote_config_revision_conflict');
        }
        const beforeWeights = config.numbers?.referral_spin_weights ?? null;
        const revision = currentRevision + 1;
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'referral_spin.weights.set',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: 'app' },
            reason: command.reason,
            before: { weights: beforeWeights, revision: currentRevision },
            after: { weights: v.weights, revision },
            requestId: command.requestId,
            timestamp: new Date().toISOString(),
        });
        const result = { ok: true, weights: v.weights, revision, auditId: auditRef.id };
        tx.set(configRef, {
            numbers: { referral_spin_weights: v.weights },
            revision,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: actorUid,
        }, { merge: true });
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, {
            action: 'referral_spin.weights.set',
            actorUid,
            requestFingerprint,
            auditId: auditRef.id,
            revision,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ...result, replayed: false };
    });
});
// ── b2) Мастер-флаг «Рулетка Plus + реферальная программа» ────────────────────
/**
 * Вкл/выкл всей связки рулетка+рефералка из админки БЕЗ релиза.
 * Пишет remote_config/app.numbers.referral_roulette_enabled (boolean) — тот же ключ,
 * что читают referralSpin/referralClaimSpin (resolveReferralRouletteEnabled) и клиент
 * (remote_flags → isReferralRouletteEnabled). Дефолт при отсутствии ключа = ON.
 */
exports.adminSetReferralRouletteEnabled = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    assertAdmin(request);
    const role = adminRoleFromToken(request.auth?.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
    }
    const enabled = request.data?.enabled;
    if (typeof enabled !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'enabled (boolean) required');
    }
    const command = normalizeReferralConfigCommand(request.data);
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc('app');
    const operationRef = db.collection('admin_command_operations')
        .doc(`referral_roulette_${command.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = JSON.stringify({
        action: 'referral_roulette.enabled.set',
        enabled,
        expectedRevision: command.expectedRevision,
        reason: command.reason,
        requestId: command.requestId,
    });
    const actorUid = request.auth.uid;
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            if (previous.requestFingerprint !== requestFingerprint || previous.actorUid !== actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return { ...storedOperationResult(previous), replayed: true };
        }
        const config = (configSnap.data() ?? {});
        const currentRevision = Number(config.revision ?? 0);
        if (!Number.isInteger(currentRevision) || currentRevision !== command.expectedRevision) {
            throw new https_1.HttpsError('aborted', 'remote_config_revision_conflict');
        }
        const beforeEnabled = config.numbers?.referral_roulette_enabled !== false;
        const beforeSoftOffAtMs = tsToMs(config.numbers?.referral_roulette_soft_off_at_ms);
        const nowMs = Date.now();
        const softOffAtMs = (0, referral_admin_soft_toggle_1.resolveReferralSoftOffAtMs)({
            enabled,
            beforeEnabled,
            beforeSoftOffAtMs,
            nowMs,
        });
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'referral_roulette.enabled.set',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: 'app' },
            reason: command.reason,
            before: { enabled: beforeEnabled, softOffAtMs: beforeSoftOffAtMs, revision: currentRevision },
            after: { enabled, softOffAtMs, revision: currentRevision + 1 },
            requestId: command.requestId,
            timestamp: new Date().toISOString(),
        });
        const result = {
            ok: true,
            enabled,
            softOffAtMs,
            revision: currentRevision + 1,
            auditId: auditRef.id,
        };
        tx.set(configRef, {
            numbers: {
                referral_roulette_enabled: enabled,
                referral_roulette_soft_off_at_ms: softOffAtMs,
            },
            revision: currentRevision + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: actorUid,
        }, { merge: true });
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, {
            action: 'referral_roulette.enabled.set',
            actorUid,
            requestFingerprint,
            enabled,
            softOffAtMs,
            auditId: auditRef.id,
            revision: currentRevision + 1,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ...result, replayed: false };
    });
});
/** True kill switch: blocks qualification, credit award, claim, and spin for everyone. */
exports.adminSetReferralRouletteEmergencyStop = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    (0, callable_options_1.requireAdminAppCheck)(request);
    assertAdmin(request);
    const role = adminRoleFromToken(request.auth?.token);
    if (!role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'APPLICATION_CONFIG_WRITE_REQUIRED');
    }
    const emergencyStop = request.data?.emergencyStop;
    if (typeof emergencyStop !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'emergencyStop (boolean) required');
    }
    const command = normalizeReferralConfigCommand(request.data);
    const db = admin.firestore();
    const configRef = db.collection('remote_config').doc('app');
    const operationRef = db.collection('admin_command_operations')
        .doc(`referral_roulette_emergency_${command.idempotencyKey}`);
    const auditRef = db.collection('admin_log').doc();
    const requestFingerprint = JSON.stringify({
        action: 'referral_roulette.emergency_stop.set',
        emergencyStop,
        expectedRevision: command.expectedRevision,
        reason: command.reason,
        requestId: command.requestId,
    });
    const actorUid = request.auth.uid;
    return db.runTransaction(async (tx) => {
        const [configSnap, operationSnap] = await Promise.all([tx.get(configRef), tx.get(operationRef)]);
        if (operationSnap.exists) {
            const previous = operationSnap.data() ?? {};
            if (previous.requestFingerprint !== requestFingerprint || previous.actorUid !== actorUid) {
                throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
            }
            return { ...storedOperationResult(previous), replayed: true };
        }
        const config = (configSnap.data() ?? {});
        const currentRevision = Number(config.revision ?? 0);
        if (!Number.isInteger(currentRevision) || currentRevision !== command.expectedRevision) {
            throw new https_1.HttpsError('aborted', 'remote_config_revision_conflict');
        }
        const beforeEmergencyStop = config.numbers?.referral_roulette_emergency_stop === true;
        const audit = (0, audit_contract_1.createAuditRecord)({
            action: 'referral_roulette.emergency_stop.set',
            actorUid,
            role,
            entity: { collection: 'remote_config', id: 'app' },
            reason: command.reason,
            before: { emergencyStop: beforeEmergencyStop, revision: currentRevision },
            after: { emergencyStop, revision: currentRevision + 1 },
            requestId: command.requestId,
            timestamp: new Date().toISOString(),
        });
        const result = {
            ok: true,
            emergencyStop,
            revision: currentRevision + 1,
            auditId: auditRef.id,
        };
        tx.set(configRef, {
            numbers: { referral_roulette_emergency_stop: emergencyStop },
            revision: currentRevision + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: actorUid,
        }, { merge: true });
        tx.create(auditRef, { ...audit, operationId: operationRef.id });
        tx.create(operationRef, {
            action: 'referral_roulette.emergency_stop.set',
            actorUid,
            requestFingerprint,
            emergencyStop,
            auditId: auditRef.id,
            revision: currentRevision + 1,
            result,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ...result, replayed: false };
    });
});
exports.adminReferralHealth = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdmin(request);
    const db = admin.firestore();
    const checks = [];
    // 1. Функции задеплоены: сам факт ответа этого callable + соседние считаем по
    // доступности данных. Точная проверка деплоя — внешняя (CI/консоль), TODO.
    checks.push({
        id: 'functions_deployed',
        status: 'ok',
        detail: 'adminReferralHealth отвечает; referralSpin/referralClaimSpin/feed_fanout деплоятся тем же пакетом (проверка CI — TODO)',
    });
    // 2. Весы валидны (мягкий парсер → если дефолт вместо конфига, значит мусор/отсутствует).
    let weightsValid = true;
    // Мастер-флаг: отсутствие ключа = ON, ошибка чтения = fail-closed.
    let rouletteEnabled = false;
    let emergencyStop = true;
    let softOffAtMs = 0;
    let roulettePolicy = {
        softEnabled: false,
        emergencyStop: true,
        softOffAtMs: 0,
    };
    let rouletteFlagReadable = false;
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        weightsValid = (0, referral_spin_logic_1.validateSpinWeights)(data?.numbers?.referral_spin_weights).ok;
        roulettePolicy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(data);
        rouletteEnabled = roulettePolicy.softEnabled;
        emergencyStop = roulettePolicy.emergencyStop;
        softOffAtMs = roulettePolicy.softOffAtMs;
        rouletteFlagReadable = true;
    }
    catch {
        weightsValid = false;
    }
    checks.push({
        id: 'roulette_feature_flag',
        status: !rouletteFlagReadable ? 'fail' : rouletteEnabled ? 'ok' : 'warn',
        detail: !rouletteFlagReadable
            ? 'Не удалось прочитать referral_roulette_enabled — серверные spin/claim закрыты fail-closed'
            : rouletteEnabled
                ? 'referral_roulette_enabled: ON — рулетка и рефералка работают'
                : 'referral_roulette_enabled: OFF — новые приглашения и dev-выдача закрыты; grandfathered claim/spin работают до своих дедлайнов',
    });
    checks.push({
        id: 'roulette_emergency_stop',
        status: emergencyStop ? 'fail' : 'ok',
        detail: emergencyStop
            ? 'Аварийная остановка активна: qualification, award, claim и spin заблокированы для всех'
            : 'Аварийная остановка выключена',
    });
    checks.push({
        id: 'weights_valid',
        status: weightsValid ? 'ok' : 'warn',
        detail: weightsValid
            ? 'remote_config/app.numbers.referral_spin_weights: 6 призов, сумма 100'
            : 'Весы отсутствуют/битые — runtime работает на дефолтах (55/30/11.5/2.9/0.55/0.05)',
    });
    // 3. Спины с призом вне конфигурации (должно быть 0).
    const outOfConfig = await countOf(db.collectionGroup(SPINS_SUBCOLLECTION).where('prizeDays', 'not-in', [...referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS]));
    checks.push({
        id: 'no_out_of_config_prizes',
        status: outOfConfig === 0 ? 'ok' : 'fail',
        detail: outOfConfig === 0 ? 'Все prizeDays ∈ [1,7,30,90,180,365]' : `${outOfConfig} спинов с призом вне конфигурации!`,
    });
    // 4. Qualified-атрибуции старше 30 дней (застрявшие прокруты).
    const staleCutoff = admin.firestore.Timestamp.fromMillis(Date.now() - STALE_QUALIFIED_DAYS * DAY_MS);
    const staleQualified = await countOf(db.collection(REFERRAL_ATTRIBUTIONS).where('status', '==', 'qualified').where('createdAt', '<', staleCutoff));
    checks.push({
        id: 'no_stale_qualified',
        status: staleQualified === 0 ? 'ok' : 'warn',
        detail: staleQualified === 0
            ? 'Нет qualified-приглашений старше 30 дней'
            : `${staleQualified} приглашений ждут клейма > ${STALE_QUALIFIED_DAYS}д — напомнить юзерам/проверить UI`,
    });
    // 5. Баланс кредитов (выборка): issued ≈ used + onHand. Точный аудит — отдельная
    // джоба (агрегации по map-полям недоступны), TODO.
    const creditsSnap = await db
        .collection(USERS)
        .where('progress.referral_spin_credits', '>', 0)
        .limit(HEALTH_SAMPLE_USERS)
        .get();
    let onHand = 0;
    let used = 0;
    for (const u of creditsSnap.docs) {
        const p = u.data().progress ?? {};
        onHand += Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0)));
        used += Math.max(0, Math.floor(Number(p.referral_spins_total ?? 0)));
    }
    checks.push({
        id: 'credits_balance_sampled',
        status: 'ok',
        detail: `Выборка ${creditsSnap.size} юзеров: на руках ${onHand}, использовано ${used}. Точный баланс issued=used+onHand — отдельная reconcile-джоба (TODO)`,
    });
    const drainSampleLimit = HEALTH_SAMPLE_USERS + 1;
    const serverNowMs = Date.now();
    const [pendingDrainSnap, qualifiedDrainSnap, ledgerAvailableSnap] = await Promise.all([
        db.collection(REFERRAL_ATTRIBUTIONS)
            .where('status', '==', 'pending')
            .limit(drainSampleLimit)
            .get(),
        db.collection(REFERRAL_ATTRIBUTIONS)
            .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
            .limit(drainSampleLimit)
            .get(),
        db.collectionGroup(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER)
            .where('status', '==', 'available')
            .limit(drainSampleLimit)
            .get(),
    ]);
    const sampledAttributions = [...pendingDrainSnap.docs, ...qualifiedDrainSnap.docs]
        .slice(0, HEALTH_SAMPLE_USERS * 2)
        .map((doc) => {
        const row = doc.data();
        return {
            status: String(row.status ?? ''),
            createdAtMs: tsToMs(row.createdAt) || tsToMs(row.createdAtMs),
            qualifiedAtMs: tsToMs(row.qualifiedAt) || tsToMs(row.qualifiedAtMs),
        };
    });
    const sampledCredits = ledgerAvailableSnap.docs
        .slice(0, HEALTH_SAMPLE_USERS)
        .map((doc) => {
        const row = doc.data();
        return {
            status: String(row.status ?? ''),
            source: String(row.source ?? ''),
            expiresAtMs: tsToMs(row.expiresAt) || tsToMs(row.expiresAtMs),
        };
    });
    const semanticDrain = (0, referral_admin_drain_metrics_1.summarizeReferralAdminDrain)({
        policy: roulettePolicy,
        nowMs: serverNowMs,
        attributions: sampledAttributions,
        credits: sampledCredits,
    });
    const drainMetrics = {
        ...semanticDrain,
        aggregateCreditsSampled: onHand,
        softOffAtMs,
        legacyCreditExpiryMs: (0, referral_roulette_policy_1.legacyCreditExpiryMs)(),
        serverNowMs,
        sampleLimit: HEALTH_SAMPLE_USERS,
        truncated: pendingDrainSnap.size > HEALTH_SAMPLE_USERS
            || qualifiedDrainSnap.size > HEALTH_SAMPLE_USERS
            || ledgerAvailableSnap.size > HEALTH_SAMPLE_USERS,
    };
    // 6. Отставание feed: последнее событие my_events vs последняя feed-копия (по выборке).
    let feedLagMinutes = -1;
    try {
        const [latestEvent, latestFeed] = await Promise.all([
            db.collectionGroup('my_events').orderBy('ts', 'desc').limit(1).get(),
            db.collectionGroup('feed').orderBy('ts', 'desc').limit(1).get(),
        ]);
        const eTs = Number(latestEvent.docs[0]?.data()?.ts ?? 0);
        const fTs = Number(latestFeed.docs[0]?.data()?.ts ?? 0);
        if (eTs > 0 && fTs > 0)
            feedLagMinutes = Math.max(0, Math.round((eTs - fTs) / 60000));
    }
    catch {
        /* индексы collectionGroup могут отсутствовать до backfill — тогда warn ниже */
    }
    checks.push({
        id: 'feed_lag',
        status: feedLagMinutes < 0 ? 'warn' : feedLagMinutes < 5 ? 'ok' : 'warn',
        detail: feedLagMinutes < 0
            ? 'Не удалось оценить (нет данных/индекса collectionGroup) — проверить после backfill'
            : `Отставание fan-out ≈ ${feedLagMinutes} мин (порог 5 мин)`,
    });
    const worst = checks.some((c) => c.status === 'fail')
        ? 'fail'
        : checks.some((c) => c.status === 'warn')
            ? 'warn'
            : 'ok';
    return {
        ok: true,
        status: worst,
        checks,
        rouletteEnabled,
        emergencyStop,
        softOffAtMs,
        drainMetrics,
        checkedAtMs: Date.now(),
    };
});
//# sourceMappingURL=admin_referrals.js.map