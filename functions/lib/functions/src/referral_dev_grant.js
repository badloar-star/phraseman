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
exports.referralDevGrantSpin = void 0;
/**
 * DEV: выдача +1 спин-кредита рулетки по кнопке «DEV +1» в referrals hero.
 *
 * Только для тестовых dev-сборок. Защита:
 *   - гейт «Пульта»: remote_config/app.numbers.referral_dev_grant_enabled === true,
 *     иначе failed-precondition 'DEV_GRANT_DISABLED' (в проде флаг выключен — см. scripts/enable_dev_grant.mjs);
 *   - лимит ≤10/сутки (UTC) на юзера: progress.referral_dev_grants_daily{yyyy-mm-dd},
 *     тот же паттерн, что referral_vip_claims_daily (prunePeriodCounter, храним ~10 последних дней);
 *   - та же привязка auth↔stableId, что у referralSpin (assertAuthStableLink).
 *
 * Пишет progress.referral_spin_credits тем же путём, что referralClaimSpin,
 * с клиента поле недоступно (rules: blockedPremiumProgressKeys) — пишем Admin SDK.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const referral_1 = require("./referral");
const node_crypto_1 = require("node:crypto");
const referral_dev_grant_policy_1 = require("./referral_dev_grant_policy");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const USERS = 'users';
const MAX_GRANTS_PER_DAY = 10;
function yyyymmddNow() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
/** Гейт «Пульта». Строго === true; отсутствие/мусор/ошибка чтения → запрещено (безопасный дефолт). */
async function isDevGrantEnabled(db) {
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        return data?.numbers?.referral_dev_grant_enabled === true;
    }
    catch (e) {
        console.warn('isDevGrantEnabled: remote_config read failed, denying', e);
        return false;
    }
}
/**
 * +1 спин-кредит для dev-теста. Ошибки:
 * unauthenticated / invalid-argument / failed-precondition
 * (DEV_GRANT_DISABLED, DEV_GRANT_DAILY_LIMIT, LINK_ACCOUNT_REQUIRED).
 */
exports.referralDevGrantSpin = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const stableId = String(request.data?.stableId ?? '').trim();
    if (!stableId) {
        throw new https_1.HttpsError('invalid-argument', 'stableId required');
    }
    const db = admin.firestore();
    if (!(await isDevGrantEnabled(db))) {
        throw new https_1.HttpsError('failed-precondition', 'DEV_GRANT_DISABLED');
    }
    await (0, referral_1.assertAuthStableLink)(db, authUid, stableId);
    const userRef = db.collection(USERS).doc(stableId);
    const configRef = db.collection('remote_config').doc('app');
    const ymd = yyyymmddNow();
    const devCreditRef = userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(`dev_${(0, node_crypto_1.randomUUID)()}`);
    return db.runTransaction(async (tx) => {
        const [configSnap, userSnap] = await Promise.all([tx.get(configRef), tx.get(userRef)]);
        const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configSnap.data());
        (0, referral_dev_grant_policy_1.assertReferralDevGrantAcquisitionAllowed)(policy);
        const userData = userSnap.data() ?? {};
        const progress = userData.progress ?? {};
        const daily = (progress.referral_dev_grants_daily ?? {});
        const usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
        if (usedToday >= MAX_GRANTS_PER_DAY) {
            throw new https_1.HttpsError('failed-precondition', 'DEV_GRANT_DAILY_LIMIT');
        }
        const aggregateBefore = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
        const ledgerVersion = Math.max(0, Math.floor(Number(progress.referral_spin_ledger_version ?? 0)));
        const nowMs = Date.now();
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
                legacyRows = (0, referral_spin_ledger_1.buildLegacyCreditRows)(stableId, aggregateBefore);
            }
            catch {
                throw new https_1.HttpsError('failed-precondition', 'LEGACY_CREDIT_MIGRATION_TOO_LARGE');
            }
            legacyRefs = legacyRows.map((row) => userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(row.id));
            legacySnaps = await Promise.all(legacyRefs.map((ref) => tx.get(ref)));
        }
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
        const reconciliation = (0, referral_dev_grant_policy_1.reconcileDevGrantLedger)([...persistedRows, ...migrationRows], nowMs);
        const expiredIds = new Set(reconciliation.expiredIds);
        const migrationIds = new Set(migrationRows.map((row) => row.id));
        const persistedExpiredCount = reconciliation.expiredIds
            .filter((id) => !migrationIds.has(id)).length;
        const conservativeWriteCount = migrationRows.length
            + persistedExpiredCount
            + 2
            + (shouldWriteMigrationMarker ? 1 : 0);
        if (conservativeWriteCount > 480) {
            throw new https_1.HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
        }
        migrationRows.forEach((row) => {
            const { id: _id, ...data } = row;
            tx.create(ledgerCollection.doc(row.id), {
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
        for (const creditId of expiredIds) {
            if (migrationIds.has(creditId))
                continue;
            tx.set(ledgerCollection.doc(creditId), {
                status: 'expired',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                expiredAtMs: nowMs,
            }, { merge: true });
        }
        if (shouldWriteMigrationMarker) {
            tx.create(migrationMarkerRef, {
                kind: 'migration_marker',
                version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdAtMs: nowMs,
            });
        }
        const devCredit = (0, referral_spin_ledger_1.buildAvailableCredit)({
            id: devCreditRef.id,
            ownerStableId: stableId,
            source: 'dev_grant',
            earnedAtMs: nowMs,
        });
        const { id: _devCreditId, ...devCreditData } = devCredit;
        tx.create(devCreditRef, {
            ...devCreditData,
            earnedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromMillis(devCredit.expiresAtMs),
        });
        const spinsTotal = reconciliation.spinsTotalAfterGrant;
        tx.set(userRef, {
            progress: {
                referral_spin_credits: spinsTotal,
                referral_spin_ledger_version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                ...(migrateLegacyAggregate
                    ? { referral_spin_ledger_migrated_at_ms: nowMs }
                    : {}),
                // Дневной счётчик: чистим старые дни, чтобы map не рос бесконечно (как vip_claims_daily).
                referral_dev_grants_daily: (0, referral_1.prunePeriodCounter)({ ...daily, [ymd]: usedToday + 1 }, 10),
            },
            updatedAt: nowMs,
        }, { merge: true });
        console.log(JSON.stringify({
            event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.creditEarned,
            source: 'dev_grant',
            ownerStableId: stableId,
            creditId: devCreditRef.id,
            earnedAtMs: nowMs,
            expiresAtMs: devCredit.expiresAtMs,
        }));
        return { ok: true, spinsTotal };
    });
});
//# sourceMappingURL=referral_dev_grant.js.map