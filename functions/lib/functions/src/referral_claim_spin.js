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
exports.referralClaimSpin = void 0;
/**
 * Конверсия qualified-приглашений в прокруты рулетки (замена/дополнение referralClaimVipReward).
 *
 * Pull-обналичивание: referrer жмёт «Крутить»/«Забрать прокруты» → за каждого qualified-друга
 * +1 спин-кредит (users/{id}.progress.referral_spin_credits), attribution → 'rewarded'
 * (rewardKind='spin_credit'). Идемпотентно: повтор без новых qualified вернёт claimed=0.
 *
 * Капы — те же, что у VIP-обналичивания (разделяем счётчики, чтобы переход VIP→рулетка
 * не открывал второй антифрод-канал): referral_vip_claims_monthly (30/мес) и
 * referral_vip_claims_daily (3/день), тюнинг из «Пульта» через resolveReferralConfig.
 * За капом приглашения НЕ теряются: остаются 'qualified', добираются завтра/в след. месяце.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const referral_1 = require("./referral");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const USERS = 'users';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
/** Сколько qualified-приглашений обрабатываем за один вызов (как у VIP-claim). */
const MAX_CLAIMS_PER_CALL = 20;
function yyyymmNow() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function yyyymmddNow() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
exports.referralClaimSpin = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const referrerStableId = String(request.data?.referrerStableId ?? '').trim();
    if (!referrerStableId) {
        throw new https_1.HttpsError('invalid-argument', 'referrerStableId required');
    }
    const db = admin.firestore();
    await (0, referral_1.assertAuthStableLink)(db, authUid, referrerStableId);
    const outerPolicy = await (0, referral_1.resolveReferralRoulettePolicy)(db);
    if (outerPolicy.emergencyStop) {
        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
    }
    // Тюнинг капов из «Пульта». Читаем ДО транзакции (отдельный документ).
    const cfg = await (0, referral_1.resolveReferralConfig)(db);
    // Какие приглашения готовы к конверсии (qualified + legacy skipped_referrer_cap — как в VIP-claim).
    const qualifiedSnap = await db
        .collection(REFERRAL_ATTRIBUTIONS)
        .where('referrerStableId', '==', referrerStableId)
        .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
        .limit(MAX_CLAIMS_PER_CALL)
        .get();
    const userRef = db.collection(USERS).doc(referrerStableId);
    const configRef = db.collection('remote_config').doc('app');
    const ym = yyyymmNow();
    const ymd = yyyymmddNow();
    return db.runTransaction(async (tx) => {
        // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
        const attRefs = qualifiedSnap.docs.map((d) => db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id));
        const [configSnap, userSnap, ...attSnaps] = await Promise.all([
            tx.get(configRef),
            tx.get(userRef),
            ...attRefs.map((r) => tx.get(r)),
        ]);
        const configData = configSnap.data();
        const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configData);
        if (policy.emergencyStop) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
        }
        const userData = userSnap.data() ?? {};
        const progressData = userData.progress ?? {};
        const monthly = progressData.referral_vip_claims_monthly ?? {};
        const daily = progressData.referral_vip_claims_daily ?? {};
        let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
        let usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
        const aggregateBefore = Math.max(0, Math.floor(Number(progressData.referral_spin_credits ?? 0)));
        const nowMs = Date.now();
        const ledgerVersion = Math.max(0, Math.floor(Number(progressData.referral_spin_ledger_version ?? 0)));
        const ledgerCollection = userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER);
        const migrationMarkerRef = ledgerCollection.doc(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID);
        const [migrationMarkerSnap, anyLedgerSnap] = await Promise.all([
            tx.get(migrationMarkerRef),
            tx.get(ledgerCollection.limit(1)),
        ]);
        const migrateLegacyAggregate = (0, referral_spin_ledger_1.shouldMigrateLegacyAggregate)({
            migrationMarkerExists: migrationMarkerSnap.exists,
            anyLedgerDocumentExists: !anyLedgerSnap.empty,
        });
        const shouldWriteMigrationMarker = !migrationMarkerSnap.exists;
        let legacyRows = [];
        let legacyRefs = [];
        let legacySnaps = [];
        if (migrateLegacyAggregate) {
            try {
                legacyRows = (0, referral_spin_ledger_1.buildLegacyCreditRows)(referrerStableId, aggregateBefore);
            }
            catch {
                throw new https_1.HttpsError('failed-precondition', 'LEGACY_CREDIT_MIGRATION_TOO_LARGE');
            }
            legacyRefs = legacyRows.map((row) => userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(row.id));
            legacySnaps = await Promise.all(legacyRefs.map((ref) => tx.get(ref)));
        }
        const candidateCreditRefs = attSnaps.map((snap) => (userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc((0, referral_spin_ledger_1.referralCreditId)(snap.id))));
        const candidateCreditSnaps = await Promise.all(candidateCreditRefs.map((ref) => tx.get(ref)));
        const availableSnap = await tx.get(ledgerCollection.where('status', '==', 'available').limit(450));
        if (availableSnap.size >= 450) {
            throw new https_1.HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
        }
        const persistedRows = availableSnap.docs.map((doc) => {
            const parsed = (0, referral_spin_ledger_1.ledgerRowFromData)(doc.id, doc.data());
            if (!parsed)
                throw new https_1.HttpsError('failed-precondition', 'LEDGER_INVALID_CREDIT');
            return parsed;
        });
        const persistedIds = new Set(persistedRows.map((row) => row.id));
        const migrationRows = legacyRows.filter((row, index) => (!legacySnaps[index].exists && !persistedIds.has(row.id)));
        const ledgerRows = [...persistedRows, ...migrationRows];
        const beforeClaimAll = (0, referral_spin_ledger_1.reconcileLedgerRowsForClaim)(ledgerRows, nowMs, { softEnabled: true }, 0);
        const expiredIds = new Set(beforeClaimAll.expiredIds);
        const migrationIds = new Set(migrationRows.map((row) => row.id));
        const persistedExpiredCount = beforeClaimAll.expiredIds.filter((id) => !migrationIds.has(id)).length;
        const conservativeWriteCount = migrationRows.length
            + persistedExpiredCount
            + (attSnaps.length * 2)
            + 2
            + (shouldWriteMigrationMarker ? 1 : 0);
        if (conservativeWriteCount > 480) {
            throw new https_1.HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
        }
        migrationRows.forEach((row) => {
            const { id: _id, ...data } = row;
            tx.create(userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(row.id), {
                ...data,
                earnedAt: admin.firestore.Timestamp.fromMillis(row.earnedAtMs),
                expiresAt: admin.firestore.Timestamp.fromMillis(row.expiresAtMs),
                ...(expiredIds.has(row.id) ? {
                    status: 'expired',
                    expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiredAtMs: nowMs,
                } : {}),
            });
        });
        if (shouldWriteMigrationMarker) {
            tx.create(migrationMarkerRef, {
                kind: 'migration_marker',
                version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAtMs: nowMs,
            });
        }
        for (const creditId of expiredIds) {
            if (migrationIds.has(creditId))
                continue;
            tx.set(userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(creditId), {
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                expiredAtMs: nowMs,
            }, { merge: true });
            console.log(JSON.stringify({
                event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.creditExpired,
                ownerStableId: referrerStableId,
                creditId,
                expiredAtMs: nowMs,
            }));
        }
        let claimed = 0;
        let cappedThisMonth = false;
        let cappedToday = false;
        for (let i = 0; i < attSnaps.length; i += 1) {
            const snap = attSnaps[i];
            if (!snap.exists)
                continue;
            const row = snap.data();
            if (row?.status !== 'qualified' && row?.status !== 'skipped_referrer_cap')
                continue;
            if (!(0, referral_roulette_policy_1.existingQualifiedDrainEligible)({
                createdAtMs: (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.createdAtMs),
                qualifiedAtMs: (0, referral_roulette_policy_1.policyTimestampMs)(row.qualifiedAt) || (0, referral_roulette_policy_1.policyTimestampMs)(row.qualifiedAtMs),
            }, policy))
                continue;
            if ((0, referral_1.referralClaimSlotsLeft)(usedThisMonth, usedToday, cfg.maxClaimsPerMonth, cfg.maxClaimsPerDay) <= 0) {
                // Кап (день/месяц). Статус НЕ понижаем — прокрут не теряется, доберётся позже.
                if (usedThisMonth >= cfg.maxClaimsPerMonth)
                    cappedThisMonth = true;
                else
                    cappedToday = true;
                tx.set(attRefs[i], { lastCappedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                break;
            }
            const creditRef = candidateCreditRefs[i];
            const creditSnap = candidateCreditSnaps[i];
            if (!creditSnap.exists) {
                const credit = (0, referral_spin_ledger_1.buildAvailableCredit)({
                    id: creditRef.id,
                    ownerStableId: referrerStableId,
                    source: 'referral',
                    attributionId: snap.id,
                    earnedAtMs: nowMs,
                });
                const { id: _id, ...creditData } = credit;
                tx.create(creditRef, {
                    ...creditData,
                    earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                    expiresAt: admin.firestore.Timestamp.fromMillis(credit.expiresAtMs),
                });
                claimed += 1;
                usedThisMonth += 1;
                usedToday += 1;
                console.log(JSON.stringify({
                    event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.creditEarned,
                    ownerStableId: referrerStableId,
                    attributionId: snap.id,
                    creditId: creditRef.id,
                    earnedAtMs: nowMs,
                    expiresAtMs: credit.expiresAtMs,
                }));
            }
            tx.set(attRefs[i], {
                status: 'rewarded',
                rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
                rewardKind: 'spin_credit',
            }, { merge: true });
        }
        const allAfterClaim = (0, referral_spin_ledger_1.reconcileLedgerRowsForClaim)(ledgerRows, nowMs, { softEnabled: true }, claimed);
        const eligibleAfterClaim = (0, referral_spin_ledger_1.reconcileLedgerRowsForClaim)(ledgerRows, nowMs, policy, claimed);
        const aggregateSpinsTotal = allAfterClaim.availableCountAfterClaim;
        const responseSpinsTotal = eligibleAfterClaim.availableCountAfterClaim;
        if (claimed > 0
            || ledgerVersion < referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION
            || expiredIds.size > 0
            || aggregateBefore !== aggregateSpinsTotal) {
            tx.set(userRef, {
                progress: {
                    referral_spin_credits: aggregateSpinsTotal,
                    referral_spin_ledger_version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                    ...(migrateLegacyAggregate
                        ? { referral_spin_ledger_migrated_at_ms: nowMs }
                        : {}),
                    ...(claimed > 0 ? {
                        // Те же счётчики капов, что у VIP-claim: чистим старые периоды (M1).
                        referral_vip_claims_monthly: (0, referral_1.prunePeriodCounter)({ ...monthly, [ym]: usedThisMonth }, 3),
                        referral_vip_claims_daily: (0, referral_1.prunePeriodCounter)({ ...daily, [ymd]: usedToday }, 10),
                    } : {}),
                },
                updatedAt: nowMs,
            }, { merge: true });
            if (claimed > 0) {
                const rewardRef = userRef.collection('shard_rewards').doc();
                tx.set(rewardRef, {
                    ts: new Date(nowMs).toISOString(),
                    reason: 'referral_spin_credit',
                    rewardType: 'spin_credit',
                    amount: claimed,
                    label: `🎡 +${claimed} прокрут(а) рулетки`,
                    seen: false,
                });
            }
        }
        console.log(JSON.stringify({
            event: 'referral_claim_spin',
            referrerStableId,
            claimed,
            spinsTotal: responseSpinsTotal,
            aggregateSpinsTotal,
            cappedThisMonth,
            cappedToday,
        }));
        return { ok: true, claimed, spinsTotal: responseSpinsTotal, cappedThisMonth, cappedToday };
    });
});
//# sourceMappingURL=referral_claim_spin.js.map