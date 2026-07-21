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
    if (qualifiedSnap.empty) {
        const u = await userRef.get();
        const p = u.data()?.progress ?? {};
        return {
            ok: true,
            claimed: 0,
            spinsTotal: Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0))),
            cappedThisMonth: false,
            cappedToday: false,
        };
    }
    const ym = yyyymmNow();
    const ymd = yyyymmddNow();
    return db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
        const attRefs = qualifiedSnap.docs.map((d) => db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id));
        const attSnaps = await Promise.all(attRefs.map((r) => tx.get(r)));
        const userData = userSnap.data() ?? {};
        const progressData = userData.progress ?? {};
        const monthly = progressData.referral_vip_claims_monthly ?? {};
        const daily = progressData.referral_vip_claims_daily ?? {};
        let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
        let usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
        let spinsTotal = Math.max(0, Math.floor(Number(progressData.referral_spin_credits ?? 0)));
        const nowMs = Date.now();
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
            if ((0, referral_1.referralClaimSlotsLeft)(usedThisMonth, usedToday, cfg.maxClaimsPerMonth, cfg.maxClaimsPerDay) <= 0) {
                // Кап (день/месяц). Статус НЕ понижаем — прокрут не теряется, доберётся позже.
                if (usedThisMonth >= cfg.maxClaimsPerMonth)
                    cappedThisMonth = true;
                else
                    cappedToday = true;
                tx.set(attRefs[i], { lastCappedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
                break;
            }
            spinsTotal += 1;
            usedThisMonth += 1;
            usedToday += 1;
            claimed += 1;
            tx.set(attRefs[i], {
                status: 'rewarded',
                rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
                rewardKind: 'spin_credit',
            }, { merge: true });
        }
        if (claimed > 0) {
            tx.set(userRef, {
                progress: {
                    referral_spin_credits: spinsTotal,
                    // Те же счётчики капов, что у VIP-claim: чистим старые периоды (M1).
                    referral_vip_claims_monthly: (0, referral_1.prunePeriodCounter)({ ...monthly, [ym]: usedThisMonth }, 3),
                    referral_vip_claims_daily: (0, referral_1.prunePeriodCounter)({ ...daily, [ymd]: usedToday }, 10),
                },
                updatedAt: nowMs,
            }, { merge: true });
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
        console.log(JSON.stringify({ event: 'referral_claim_spin', referrerStableId, claimed, spinsTotal, cappedThisMonth, cappedToday }));
        return { ok: true, claimed, spinsTotal, cappedThisMonth, cappedToday };
    });
});
//# sourceMappingURL=referral_claim_spin.js.map