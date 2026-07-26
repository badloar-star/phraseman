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
exports.referralSpin = exports.referralSpinPickIndex = exports.referralSpinWeightsFromData = exports.REFERRAL_SPIN_DEFAULT_WEIGHTS = exports.REFERRAL_SPIN_PRIZE_DAYS = void 0;
exports.resolveReferralSpinWeights = resolveReferralSpinWeights;
/**
 * Рулетка Plus: конверсия спин-кредитов в дни VIP (стак vip_until).
 *
 * Модель:
 *   - кредиты: users/{id}.progress.referral_spin_credits (число); начисляет referralClaimSpin
 *     за qualified-приглашения (см. referral_claim_spin.ts).
 *   - лог: users/{id}/referral_spins/{spinRequestId} — docId = client spinRequestId,
 *     поэтому повторный вызов с тем же id возвращает уже выданный приз (идемпотентность).
 *
 * Честность (чистая логика вынесена в referral_spin_logic.ts и покрыта vitest):
 *   - веса из «Пульта» (remote_config/app.numbers.referral_spin_weights), дефолт ниже;
 *   - pity: первый спин юзера и каждый 10-й — приз >= 7 дней (индекс 0 исключён из пула);
 *   - джекпот-капы: 365 дней — 1 раз на аккаунт; 180 дней — 1 раз в 365 дней
 *     (проверяется по логу спинов ДО транзакции; при выпадении запрещённого — переброс
 *     внутри разрешённого пула, в лог пишется reroll: true);
 *   - RNG только серверный (crypto); seedHash в логе — для аудита спорных спинов.
 *
 * VIP пишем теми же полями vip_* в users/{id}.progress, что admin-grant и referralClaimVipReward
 * (vip_plan='referral_spin'). Клиент vip_* не трогает (rules: progressHasNoPremiumWrites).
 */
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const referral_1 = require("./referral");
const referral_spin_logic_1 = require("./referral_spin_logic");
const referral_roulette_policy_1 = require("./referral_roulette_policy");
const referral_spin_ledger_1 = require("./referral_spin_ledger");
// Реэкспорт для тестов/совместимости (раньше жили здесь).
var referral_spin_logic_2 = require("./referral_spin_logic");
Object.defineProperty(exports, "REFERRAL_SPIN_PRIZE_DAYS", { enumerable: true, get: function () { return referral_spin_logic_2.REFERRAL_SPIN_PRIZE_DAYS; } });
Object.defineProperty(exports, "REFERRAL_SPIN_DEFAULT_WEIGHTS", { enumerable: true, get: function () { return referral_spin_logic_2.REFERRAL_SPIN_DEFAULT_WEIGHTS; } });
Object.defineProperty(exports, "referralSpinWeightsFromData", { enumerable: true, get: function () { return referral_spin_logic_2.referralSpinWeightsFromData; } });
Object.defineProperty(exports, "referralSpinPickIndex", { enumerable: true, get: function () { return referral_spin_logic_2.referralSpinPickIndex; } });
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const USERS = 'users';
const SPINS_SUBCOLLECTION = 'referral_spins';
const DAY_MS = 24 * 60 * 60 * 1000;
const BIG_PRIZE_COOLDOWN_MS = 365 * DAY_MS;
/** Читает веса из «Пульта». НИКОГДА не бросает: ошибка/отсутствие → дефолт. */
async function resolveReferralSpinWeights(db) {
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        return (0, referral_spin_logic_1.referralSpinWeightsFromData)(data?.numbers);
    }
    catch (e) {
        console.warn('resolveReferralSpinWeights failed, using defaults', e);
        return (0, referral_spin_logic_1.referralSpinWeightsFromData)(undefined);
    }
}
function sha256Hex(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
}
/**
 * Спин рулетки: списывает 1 кредит, вытягивает приз (weighted RNG + pity + джекпот-капы),
 * стакает дни к vip_until. Идемпотентен по spinRequestId (docId лога).
 *
 * Ошибки: unauthenticated / invalid-argument / failed-precondition(NO_SPIN_CREDITS, LINK_ACCOUNT_REQUIRED).
 */
exports.referralSpin = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const stableId = String(request.data?.stableId ?? '').trim();
    const spinRequestId = String(request.data?.spinRequestId ?? '').trim();
    if (!stableId) {
        throw new https_1.HttpsError('invalid-argument', 'stableId required');
    }
    if (spinRequestId.length < 8 || spinRequestId.length > 128) {
        throw new https_1.HttpsError('invalid-argument', 'spinRequestId required (8..128 chars)');
    }
    const db = admin.firestore();
    await (0, referral_1.assertAuthStableLink)(db, authUid, stableId);
    const outerPolicy = await (0, referral_1.resolveReferralRoulettePolicy)(db);
    if (outerPolicy.emergencyStop) {
        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
    }
    const weights = await resolveReferralSpinWeights(db);
    const configRef = db.collection('remote_config').doc('app');
    const userRef = db.collection(USERS).doc(stableId);
    const spinsCol = userRef.collection(SPINS_SUBCOLLECTION);
    // Джекпот-капы по логу спинов — ДО транзакции (запросы внутри tx невозможны).
    // Нужен composite-индекс referral_spins(prizeDays, createdAtMs) — см. PATCHES.md.
    const nowForCaps = Date.now();
    const [jackpotSnap, bigPrizeSnap] = await Promise.all([
        spinsCol.where('prizeDays', '==', referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS[referral_spin_logic_1.JACKPOT_INDEX]).limit(1).get(),
        spinsCol
            .where('prizeDays', '==', referral_spin_logic_1.REFERRAL_SPIN_PRIZE_DAYS[referral_spin_logic_1.BIG_PRIZE_INDEX])
            .where('createdAtMs', '>', nowForCaps - BIG_PRIZE_COOLDOWN_MS)
            .limit(1)
            .get(),
    ]);
    const forbidden = new Set();
    if (!jackpotSnap.empty)
        forbidden.add(referral_spin_logic_1.JACKPOT_INDEX);
    if (!bigPrizeSnap.empty)
        forbidden.add(referral_spin_logic_1.BIG_PRIZE_INDEX);
    const outcome = await db.runTransaction(async (tx) => {
        const spinRef = spinsCol.doc(spinRequestId);
        const [configSnap, userSnap, existingSpin] = await Promise.all([
            tx.get(configRef),
            tx.get(userRef),
            tx.get(spinRef),
        ]);
        const configData = configSnap.data();
        const policy = (0, referral_roulette_policy_1.referralRoulettePolicyFromData)(configData);
        if (policy.emergencyStop) {
            throw new https_1.HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
        }
        // Идемпотентность: повтор с тем же spinRequestId → тот же приз, без списания кредита.
        if (existingSpin.exists) {
            const s = existingSpin.data();
            return {
                ok: true,
                prizeIndex: Math.max(0, Math.floor(Number(s.prizeIndex ?? 0))),
                prizeDays: Math.max(0, Math.floor(Number(s.prizeDays ?? 0))),
                spinsLeft: Math.max(0, Math.floor(Number(s.spinsLeftAfter ?? 0))),
                vipUntil: Math.max(0, Math.floor(Number(s.vipUntilMs ?? 0))),
                idempotent: true,
            };
        }
        const userData = userSnap.data() ?? {};
        const progress = userData.progress ?? {};
        const aggregateBefore = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
        const spinsUsedTotal = Math.max(0, Math.floor(Number(progress.referral_spins_total ?? 0)));
        const nowMs = Date.now();
        const ledgerVersion = Math.max(0, Math.floor(Number(progress.referral_spin_ledger_version ?? 0)));
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
        const migrationRows = legacyRows.filter((row, index) => !legacySnaps[index].exists && !persistedIds.has(row.id));
        const ledgerRows = [...persistedRows, ...migrationRows];
        const eligibleSummary = (0, referral_spin_ledger_1.reconcileLedgerRows)(ledgerRows, nowMs, policy);
        const allSummary = (0, referral_spin_ledger_1.reconcileLedgerRows)(ledgerRows, nowMs, { softEnabled: true });
        const expiredIds = new Set(allSummary.expiredIds);
        const migrationIds = new Set(migrationRows.map((row) => row.id));
        const persistedExpiredCount = allSummary.expiredIds.filter((id) => !migrationIds.has(id)).length;
        const conservativeWriteCount = migrationRows.length
            + persistedExpiredCount
            + 3
            + (shouldWriteMigrationMarker ? 1 : 0);
        if (conservativeWriteCount > 480) {
            throw new https_1.HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
        }
        migrationRows.forEach((row) => {
            const ref = userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(row.id);
            const { id: _id, ...data } = row;
            tx.create(ref, {
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
                ownerStableId: stableId,
                creditId,
                expiredAtMs: nowMs,
            }));
        }
        const selectedCredit = eligibleSummary.oldestValid;
        if (!selectedCredit) {
            tx.set(userRef, {
                progress: {
                    referral_spin_credits: allSummary.availableCount,
                    referral_spin_ledger_version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                    ...(migrateLegacyAggregate
                        ? { referral_spin_ledger_migrated_at_ms: nowMs }
                        : {}),
                },
                updatedAt: nowMs,
            }, { merge: true });
            return { noCredit: true };
        }
        // RNG: seed живёт только в памяти вызова; в лог — sha256(seed) для аудита.
        const seed = crypto.randomBytes(16).toString('hex');
        const rng = () => crypto.randomInt(0, 1000000000) / 1000000000;
        // Чистый розыгрыш (pity + джекпот-капы) — та же функция, что в тестах и админке.
        const draw = (0, referral_spin_logic_1.spinDraw)({ weights, spinsUsedTotal, forbidden, rng });
        const { prizeIndex, prizeDays, pity, reroll } = draw;
        // Стак VIP — тот же подход, что referralClaimVipReward: от max(текущее окно, now).
        const currentUntil = (0, referral_1.vipUntilFromProgress)(progress);
        const vipUntil = (0, referral_1.stackVipUntilMs)(currentUntil, nowMs, prizeDays);
        // The compatibility aggregate keeps every unexpired source, including dev
        // grants. The callable response is narrower: under soft OFF it reports only
        // production-drain credits so a dev-only balance cannot keep roulette open.
        const spinsLeft = Math.max(0, eligibleSummary.availableCount - 1);
        const aggregateSpinsLeft = Math.max(0, allSummary.availableCount - 1);
        tx.set(userRef.collection(referral_spin_ledger_1.REFERRAL_SPIN_LEDGER).doc(selectedCredit.id), {
            status: 'consumed',
            consumedAt: admin.firestore.FieldValue.serverTimestamp(),
            consumedAtMs: nowMs,
            spinRequestId,
        }, { merge: true });
        tx.set(userRef, {
            progress: {
                vip_active: 'true',
                vip_plan: 'referral_spin',
                vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
                vip_until: String(vipUntil),
                vip_admin_override: 'true',
                vip_admin_grant_at: String(nowMs),
                referral_vip_last_source: 'referral_spin',
                referral_spin_credits: aggregateSpinsLeft,
                referral_spin_ledger_version: referral_spin_ledger_1.REFERRAL_SPIN_LEDGER_VERSION,
                ...(migrateLegacyAggregate
                    ? { referral_spin_ledger_migrated_at_ms: nowMs }
                    : {}),
                referral_spins_total: spinsUsedTotal + 1,
            },
            updatedAt: nowMs,
        }, { merge: true });
        tx.set(spinRef, {
            prizeIndex,
            prizeDays,
            pity,
            reroll,
            seedHash: sha256Hex(seed),
            spinsUsedTotal: spinsUsedTotal + 1,
            spinsLeftAfter: spinsLeft,
            vipUntilMs: vipUntil,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtMs: nowMs,
            creditId: selectedCredit.id,
            creditSource: selectedCredit.source,
        });
        console.log(JSON.stringify({
            event: 'referral_spin',
            stableId,
            prizeIndex,
            prizeDays,
            pity,
            reroll,
            creditId: selectedCredit.id,
            creditSource: selectedCredit.source,
            spinsUsedTotal: spinsUsedTotal + 1,
        }));
        console.log(JSON.stringify({
            event: referral_roulette_policy_1.REFERRAL_ANALYTICS_EVENTS.creditConsumed,
            ownerStableId: stableId,
            creditId: selectedCredit.id,
            source: selectedCredit.source,
            spinRequestId,
            consumedAtMs: nowMs,
        }));
        return { ok: true, prizeIndex, prizeDays, spinsLeft, vipUntil };
    });
    if ('noCredit' in outcome) {
        throw new https_1.HttpsError('failed-precondition', 'NO_SPIN_CREDITS');
    }
    return outcome;
});
//# sourceMappingURL=referral_spin.js.map