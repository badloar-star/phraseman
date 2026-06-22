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
exports.promoCodeUpsert = exports.promoCodeRedeem = void 0;
exports.normalizePromoCode = normalizePromoCode;
exports.decidePromoRedemption = decidePromoRedemption;
// ════════════════════════════════════════════════════════════════════════════
// promo_codes.ts — промокоды-награды (база под маркетинг). Админ создаёт код в
// «Пульте», юзер вводит его в приложении и получает N дней премиума (VIP-дни,
// тот же механизм, что у рефералов — один источник правды premium-доступа).
//
// НЕ скидка на цену подписки (её задают App Store/Google Play). Это выдача
// доступа за код — полностью на нашем бэкенде, не зависит от настроек сторов.
//
// Коллекции:
//   promo_codes/{CODE}                      — определение кода (см. PromoCodeDoc)
//   users/{uid}/promo_redemptions/{CODE}    — маркер «этот юзер уже активировал»
//                                              (идемпотентность + один код на юзера)
//
// Безопасность: stableUid берём ТОЛЬКО из auth (resolveStableUidForAuth), как в
// рефералах/карточках. Все проверки и инкремент usedCount — в одной транзакции.
// ════════════════════════════════════════════════════════════════════════════
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const referral_1 = require("./referral");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const PROMO_CODES = 'promo_codes';
const PROMO_REDEMPTIONS = 'promo_redemptions';
// Код: 3..32 символа, латиница/цифры/дефис/подчёркивание. Храним в верхнем регистре.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
/** Нормализует пользовательский ввод кода (trim + upper). */
function normalizePromoCode(raw) {
    return String(raw ?? '').trim().toUpperCase();
}
/**
 * Чистое решение: можно ли активировать код прямо сейчас. Без Firestore — всё
 * передаётся явно, чтобы тестировать. Транзакция вызывает это и при ok начисляет.
 */
function decidePromoRedemption(params) {
    const { code, alreadyRedeemed, nowMs } = params;
    if (!code)
        return { ok: false, reason: 'not_found' };
    if (!code.enabled)
        return { ok: false, reason: 'disabled' };
    if (code.expiresAtMs > 0 && nowMs >= code.expiresAtMs)
        return { ok: false, reason: 'expired' };
    if (alreadyRedeemed)
        return { ok: false, reason: 'already_redeemed' };
    if (code.maxRedemptions > 0 && code.usedCount >= code.maxRedemptions) {
        return { ok: false, reason: 'limit_reached' };
    }
    if (!Number.isFinite(code.rewardDays) || code.rewardDays <= 0) {
        return { ok: false, reason: 'bad_reward' };
    }
    return { ok: true, rewardDays: code.rewardDays };
}
function readInt(v, fallback = 0) {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? n : fallback;
}
/** Парсит сырой Firestore-док кода в типизированный PromoCodeDoc (или null). */
function parsePromoCodeDoc(data) {
    if (!data)
        return null;
    return {
        rewardDays: readInt(data.rewardDays, 0),
        enabled: data.enabled === true,
        maxRedemptions: Math.max(0, readInt(data.maxRedemptions, 0)),
        usedCount: Math.max(0, readInt(data.usedCount, 0)),
        expiresAtMs: Math.max(0, readInt(data.expiresAtMs, 0)),
        note: typeof data.note === 'string' ? data.note : undefined,
    };
}
/** VIP-патч для прогресса (по образцу referral, но vip_plan='promo'). */
function buildPromoVipPatch(currentProgress, nowMs, addDays, code) {
    const currentUntil = (0, referral_1.vipUntilFromProgress)(currentProgress);
    const vipUntil = (0, referral_1.stackVipUntilMs)(currentUntil, nowMs, addDays);
    return {
        vip_active: 'true',
        vip_plan: 'promo',
        vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
        vip_until: String(vipUntil),
        vip_admin_override: 'true',
        vip_admin_grant_at: String(nowMs),
        promo_vip_last_code: code,
    };
}
/* ── onCall: promoCodeRedeem (юзер вводит код) ──────────────────────────────── */
exports.promoCodeRedeem = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const code = normalizePromoCode(request.data?.code);
    if (!CODE_RE.test(code))
        throw new https_1.HttpsError('invalid-argument', 'bad_code');
    const db = admin.firestore();
    // stableId НИКОГДА не из тела запроса (как в рефералах/карточках).
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    const nowMs = Date.now();
    const codeRef = db.collection(PROMO_CODES).doc(code);
    const userRef = db.collection('users').doc(stableUid);
    const redemptionRef = userRef.collection(PROMO_REDEMPTIONS).doc(code);
    return db.runTransaction(async (tx) => {
        const [codeSnap, redemptionSnap, userSnap] = await Promise.all([
            tx.get(codeRef),
            tx.get(redemptionRef),
            tx.get(userRef),
        ]);
        const decision = decidePromoRedemption({
            code: parsePromoCodeDoc(codeSnap.exists ? codeSnap.data() : undefined),
            alreadyRedeemed: redemptionSnap.exists,
            nowMs,
        });
        if (!decision.ok) {
            return { ok: false, reason: decision.reason };
        }
        const user = userSnap.data() ?? {};
        const progress = user.progress ?? {};
        const vipPatch = buildPromoVipPatch(progress, nowMs, decision.rewardDays, code);
        // Маркер активации (идемпотентность + один код на юзера).
        tx.set(redemptionRef, {
            code,
            rewardDays: decision.rewardDays,
            redeemedAtMs: nowMs,
            authUid,
        });
        // Инкремент счётчика использований кода.
        tx.set(codeRef, { usedCount: admin.firestore.FieldValue.increment(1), lastRedeemedAtMs: nowMs }, { merge: true });
        // Выдача VIP-дней (тот же механизм, что admin-grant/реферал).
        tx.set(userRef, { progress: vipPatch, updatedAt: nowMs }, { merge: true });
        return { ok: true, rewardDays: decision.rewardDays, vipUntilMs: Number(vipPatch.vip_until) };
    });
});
/* ── onCall: promoCodeUpsert (админ создаёт/правит код) ──────────────────────── */
exports.promoCodeUpsert = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const code = normalizePromoCode(request.data?.code);
    if (!CODE_RE.test(code))
        throw new https_1.HttpsError('invalid-argument', 'bad_code');
    const rewardDays = readInt(request.data?.rewardDays, 0);
    if (rewardDays <= 0 || rewardDays > 3650) {
        throw new https_1.HttpsError('invalid-argument', 'rewardDays must be 1..3650');
    }
    const enabled = request.data?.enabled !== false; // по умолчанию включён
    const maxRedemptions = Math.max(0, readInt(request.data?.maxRedemptions, 0));
    const expiresAtMs = Math.max(0, readInt(request.data?.expiresAtMs, 0));
    const note = String(request.data?.note ?? '').slice(0, 200);
    const db = admin.firestore();
    const codeRef = db.collection(PROMO_CODES).doc(code);
    const adminEmail = String(request.auth?.token?.email ?? '');
    const now = Date.now();
    // Атомарно: правка НЕ трогает usedCount; инициализация usedCount=0 только если
    // кода ещё не было. Одна транзакция вместо set→get→set исключает гонку с redeem,
    // который параллельно инкрементит usedCount (нельзя обнулить денежный счётчик).
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        const patch = {
            rewardDays, enabled, maxRedemptions, expiresAtMs, note,
            updatedAtMs: now, updatedBy: adminEmail,
        };
        if (typeof snap.data()?.usedCount !== 'number') {
            patch.usedCount = 0;
            patch.createdAtMs = now;
            patch.createdBy = adminEmail;
        }
        tx.set(codeRef, patch, { merge: true });
    });
    return { ok: true, code };
});
//# sourceMappingURL=promo_codes.js.map