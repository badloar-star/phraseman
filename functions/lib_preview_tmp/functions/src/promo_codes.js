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
exports.adminListPromoCodes = exports.promoCodeBatchUpsert = exports.promoCodeUpsert = exports.promoCodeRedeem = void 0;
exports.normalizePromoCode = normalizePromoCode;
exports.decidePromoRedemption = decidePromoRedemption;
exports.buildPromoVipPatch = buildPromoVipPatch;
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
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const referral_1 = require("./referral");
const remote_gates_1 = require("./remote_gates");
const permissions_1 = require("./admin/permissions");
const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK };
const PROMO_CODES = 'promo_codes';
const PROMO_REDEMPTIONS = 'promo_redemptions';
const PROMO_CODES_ENABLED_FLAG = 'promo_codes_enabled';
const MAX_REWARD_DAYS = 3650;
const MAX_BATCH_PROMO_CODES = 200;
// Код: 3..32 символа, латиница/цифры/дефис/подчёркивание. Храним в верхнем регистре.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const GENERATED_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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
    if (params.globallyEnabled === false)
        return { ok: false, reason: 'promo_disabled' };
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
    if (code.rewardKind === 'lifetime') {
        return { ok: true, rewardDays: 0, rewardKind: 'lifetime' };
    }
    if (!Number.isFinite(code.rewardDays) || code.rewardDays <= 0) {
        return { ok: false, reason: 'bad_reward' };
    }
    return { ok: true, rewardDays: code.rewardDays, rewardKind: 'days' };
}
function readInt(v, fallback = 0) {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? n : fallback;
}
function readRewardKind(v) {
    return v === 'lifetime' ? 'lifetime' : 'days';
}
function assertAdminPermission(request, permission) {
    if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim())
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = request.auth?.token?.adminRole;
    if (!(0, permissions_1.hasPermission)(role, permission))
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
}
function readAdminReason(raw) {
    return String(raw ?? '').trim().slice(0, 500);
}
/** Парсит сырой Firestore-док кода в типизированный PromoCodeDoc (или null). */
function parsePromoCodeDoc(data) {
    if (!data)
        return null;
    const rewardKind = data.rewardKind === 'lifetime' || data.lifetime === true ? 'lifetime' : 'days';
    return {
        rewardDays: readInt(data.rewardDays, 0),
        rewardKind,
        enabled: data.enabled === true,
        maxRedemptions: Math.max(0, readInt(data.maxRedemptions, 0)),
        usedCount: Math.max(0, readInt(data.usedCount, 0)),
        expiresAtMs: Math.max(0, readInt(data.expiresAtMs, 0)),
        note: typeof data.note === 'string' ? data.note : undefined,
    };
}
/** VIP-патч для прогресса (по образцу referral, но vip_plan='promo'). */
function buildPromoVipPatch(currentProgress, nowMs, addDays, rewardKind, code) {
    const currentUntil = (0, referral_1.vipUntilFromProgress)(currentProgress);
    const vipUntil = rewardKind === 'lifetime' ? 0 : (0, referral_1.stackVipUntilMs)(currentUntil, nowMs, addDays);
    return {
        vip_active: 'true',
        vip_plan: rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo',
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
    const globallyEnabled = await (0, remote_gates_1.resolveRemoteBool)(db, PROMO_CODES_ENABLED_FLAG, false);
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
            globallyEnabled,
        });
        if (!decision.ok) {
            return { ok: false, reason: decision.reason };
        }
        const user = userSnap.data() ?? {};
        const progress = user.progress ?? {};
        const vipPatch = buildPromoVipPatch(progress, nowMs, decision.rewardDays, decision.rewardKind, code);
        const vipUntilMs = Number(vipPatch.vip_until);
        // Маркер активации (идемпотентность + один код на юзера).
        tx.set(redemptionRef, {
            code,
            stableUid,
            rewardDays: decision.rewardDays,
            rewardKind: decision.rewardKind,
            vipPlan: vipPatch.vip_plan,
            vipUntilMs,
            redeemedAtMs: nowMs,
            authUid,
        });
        // Инкремент счётчика использований кода. lastRedeemedBy нужен веб-оплате
        // (web_checkout): при автопродлении Stripe-подписки сервер по коду находит
        // аккаунт и продлевает vip_until без участия юзера.
        tx.set(codeRef, {
            usedCount: admin.firestore.FieldValue.increment(1),
            lastRedeemedAtMs: nowMs,
            lastRedeemedBy: stableUid,
        }, { merge: true });
        // Выдача VIP-дней (тот же механизм, что admin-grant/реферал).
        tx.set(userRef, { progress: vipPatch, updatedAt: nowMs }, { merge: true });
        return {
            ok: true,
            rewardDays: decision.rewardDays,
            rewardKind: decision.rewardKind,
            vipUntilMs,
            grantAtMs: nowMs,
        };
    });
});
function readPromoCodeWritePayload(data) {
    const rewardKind = readRewardKind(data.rewardKind);
    const rewardDays = rewardKind === 'lifetime' ? 0 : readInt(data.rewardDays, 0);
    if (rewardKind === 'days' && (rewardDays <= 0 || rewardDays > MAX_REWARD_DAYS)) {
        throw new https_1.HttpsError('invalid-argument', `rewardDays must be 1..${MAX_REWARD_DAYS}`);
    }
    const enabled = data.enabled !== false; // по умолчанию включён
    const maxRedemptions = Math.max(0, readInt(data.maxRedemptions, 0));
    const expiresAtMs = Math.max(0, readInt(data.expiresAtMs, 0));
    const note = String(data.note ?? '').slice(0, 200);
    return { rewardDays, rewardKind, enabled, maxRedemptions, expiresAtMs, note };
}
function buildPromoCodeWritePatch(params) {
    const patch = {
        rewardDays: params.rewardDays,
        rewardKind: params.rewardKind,
        enabled: params.enabled,
        maxRedemptions: params.maxRedemptions,
        expiresAtMs: params.expiresAtMs,
        note: params.note,
        updatedAtMs: params.now,
        updatedBy: params.adminEmail,
    };
    if (typeof params.existing?.usedCount !== 'number') {
        patch.usedCount = 0;
        patch.createdAtMs = params.now;
        patch.createdBy = params.adminEmail;
    }
    return patch;
}
function sanitizeGeneratedPrefix(raw) {
    const prefix = normalizePromoCode(raw)
        .replace(/[^A-Z0-9_-]/g, '')
        .replace(/[-_]+$/g, '')
        .slice(0, 16);
    return prefix || 'PM';
}
function makeGeneratedPromoCode(prefix) {
    const bytes = (0, crypto_1.randomBytes)(10);
    let body = '';
    for (let i = 0; i < bytes.length; i += 1) {
        body += GENERATED_CODE_ALPHABET[bytes[i] % GENERATED_CODE_ALPHABET.length];
    }
    return `${prefix}-${body}`;
}
function readExplicitPromoCodes(raw) {
    const values = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
            ? raw.split(/[\s,;]+/)
            : [];
    const out = [];
    const seen = new Set();
    for (const value of values) {
        const code = normalizePromoCode(value);
        if (!code)
            continue;
        if (!CODE_RE.test(code))
            throw new https_1.HttpsError('invalid-argument', 'bad_code');
        if (!seen.has(code)) {
            seen.add(code);
            out.push(code);
        }
    }
    return out;
}
/* ── onCall: promoCodeUpsert (админ создаёт/правит код) ──────────────────────── */
exports.promoCodeUpsert = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    assertAdminPermission(request, 'money.manual_access.write');
    const code = normalizePromoCode(request.data?.code);
    if (!CODE_RE.test(code))
        throw new https_1.HttpsError('invalid-argument', 'bad_code');
    const payload = readPromoCodeWritePayload(request.data ?? {});
    const reason = readAdminReason(request.data?.reason);
    const db = admin.firestore();
    const codeRef = db.collection(PROMO_CODES).doc(code);
    const auditRef = db.collection('admin_log').doc();
    const adminEmail = String(request.auth?.token?.email ?? '');
    const now = Date.now();
    // Атомарно: правка НЕ трогает usedCount; инициализация usedCount=0 только если
    // кода ещё не было. Одна транзакция вместо set→get→set исключает гонку с redeem,
    // который параллельно инкрементит usedCount (нельзя обнулить денежный счётчик).
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(codeRef);
        const patch = buildPromoCodeWritePatch({ ...payload, now, adminEmail, existing: snap.data() });
        tx.set(codeRef, patch, { merge: true });
        tx.set(auditRef, {
            action: 'promo_code_upsert',
            targetUid: code,
            reason,
            details: {
                rewardDays: payload.rewardDays,
                rewardKind: payload.rewardKind,
                maxRedemptions: payload.maxRedemptions,
                enabled: payload.enabled,
            },
            adminEmail,
            ts: new Date(now).toISOString(),
        });
    });
    return { ok: true, code, rewardDays: payload.rewardDays, rewardKind: payload.rewardKind };
});
/* ── onCall: promoCodeBatchUpsert (админ создаёт/правит пачку кодов) ─────────── */
exports.promoCodeBatchUpsert = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    assertAdminPermission(request, 'money.manual_access.write');
    const payload = readPromoCodeWritePayload(request.data ?? {});
    const reason = readAdminReason(request.data?.reason);
    const explicitCodes = readExplicitPromoCodes(request.data?.codes);
    const generated = explicitCodes.length === 0;
    const createOnly = request.data?.createOnly === true;
    let codes = explicitCodes;
    if (generated) {
        const count = readInt(request.data?.count, 1);
        if (count <= 0 || count > MAX_BATCH_PROMO_CODES) {
            throw new https_1.HttpsError('invalid-argument', `count must be 1..${MAX_BATCH_PROMO_CODES}`);
        }
        const prefix = sanitizeGeneratedPrefix(request.data?.prefix);
        const seen = new Set();
        codes = [];
        while (codes.length < count) {
            const code = makeGeneratedPromoCode(prefix);
            if (!CODE_RE.test(code) || seen.has(code))
                continue;
            seen.add(code);
            codes.push(code);
        }
    }
    else if (codes.length > MAX_BATCH_PROMO_CODES) {
        throw new https_1.HttpsError('invalid-argument', `codes limit is ${MAX_BATCH_PROMO_CODES}`);
    }
    const db = admin.firestore();
    const adminEmail = String(request.auth?.token?.email ?? '');
    const now = Date.now();
    const refs = codes.map((code) => db.collection(PROMO_CODES).doc(code));
    const auditRef = db.collection('admin_log').doc();
    await db.runTransaction(async (tx) => {
        const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
        if (generated) {
            const collision = snaps.find((snap) => snap.exists);
            if (collision)
                throw new https_1.HttpsError('already-exists', 'generated_code_collision');
        }
        else if (createOnly) {
            const existing = snaps.find((snap) => snap.exists);
            if (existing)
                throw new https_1.HttpsError('already-exists', `promo_code_exists:${existing.id}`);
        }
        refs.forEach((ref, index) => {
            const snap = snaps[index];
            const patch = buildPromoCodeWritePatch({ ...payload, now, adminEmail, existing: snap.data() });
            tx.set(ref, patch, { merge: true });
        });
        tx.set(auditRef, {
            action: 'promo_codes_batch_upsert',
            targetUid: 'promo_codes',
            reason,
            details: {
                count: codes.length,
                generated,
                createOnly,
                rewardDays: payload.rewardDays,
                rewardKind: payload.rewardKind,
                maxRedemptions: payload.maxRedemptions,
                enabled: payload.enabled,
            },
            adminEmail,
            ts: new Date(now).toISOString(),
        });
    });
    return { ok: true, codes, rewardDays: payload.rewardDays, rewardKind: payload.rewardKind };
});
function promoDateMs(raw) {
    const n = Number(raw ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function firstNonEmpty(values) {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text)
            return text;
    }
    return '';
}
function promoUserLabel(data, uid) {
    const progress = data?.progress && typeof data.progress === 'object' ? data.progress : {};
    const profile = data?.profile && typeof data.profile === 'object' ? data.profile : {};
    const name = firstNonEmpty([
        data?.name,
        data?.displayName,
        data?.userName,
        data?.username,
        profile.name,
        profile.displayName,
        progress.name,
        progress.displayName,
        progress.user_name,
    ]);
    const email = firstNonEmpty([data?.email, profile.email, progress.email]);
    if (name && email)
        return `${name} · ${email}`;
    return name || email || uid || 'Unknown user';
}
function promoPlusUntilLabel(row, progress) {
    const vipPlan = String(row.vipPlan ?? '').toLowerCase();
    if (row.rewardKind === 'lifetime' || vipPlan.includes('lifetime'))
        return 0;
    const explicit = promoDateMs(row.vipUntilMs);
    if (explicit > 0)
        return explicit;
    const lastCode = String(progress?.promo_vip_last_code ?? '').toUpperCase();
    const rowCode = String(row.code ?? '').toUpperCase();
    if (!lastCode || lastCode === rowCode)
        return promoDateMs(progress?.vip_until);
    return 0;
}
exports.adminListPromoCodes = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    assertAdminPermission(request, 'money.read');
    const limitRaw = Math.trunc(Number(request.data?.limit ?? 80));
    const safeLimit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 80, 200));
    const db = admin.firestore();
    const codesSnap = await db
        .collection(PROMO_CODES)
        .orderBy('updatedAtMs', 'desc')
        .limit(safeLimit)
        .get();
    const redemptionsSnap = await db
        .collectionGroup(PROMO_REDEMPTIONS)
        .orderBy('redeemedAtMs', 'desc')
        .limit(Math.min(100, safeLimit))
        .get();
    const codes = codesSnap.docs.map((doc) => {
        const data = doc.data() || {};
        return {
            code: doc.id,
            rewardDays: Number(data.rewardDays ?? 0) || 0,
            rewardKind: data.rewardKind === 'lifetime' || data.lifetime === true ? 'lifetime' : 'days',
            enabled: data.enabled === true,
            maxRedemptions: Math.max(0, Number(data.maxRedemptions ?? 0) || 0),
            usedCount: Math.max(0, Number(data.usedCount ?? 0) || 0),
            expiresAtMs: promoDateMs(data.expiresAtMs),
            updatedAtMs: promoDateMs(data.updatedAtMs),
            updatedBy: String(data.updatedBy ?? ''),
            note: String(data.note ?? ''),
        };
    });
    const redemptions = await Promise.all(redemptionsSnap.docs.map(async (doc) => {
        const row = doc.data() || {};
        const userRef = doc.ref.parent.parent;
        const uid = String(row.stableUid || userRef?.id || '');
        let userData;
        if (userRef) {
            try {
                const userSnap = await userRef.get();
                userData = userSnap.exists ? userSnap.data() : undefined;
            }
            catch {
                userData = undefined;
            }
        }
        const progress = userData?.progress && typeof userData.progress === 'object' ? userData.progress : {};
        return {
            id: doc.id,
            code: String(row.code || doc.id),
            uid,
            authUid: String(row.authUid || ''),
            userLabel: promoUserLabel(userData, uid),
            rewardDays: Number(row.rewardDays ?? 0) || 0,
            rewardKind: row.rewardKind === 'lifetime' ? 'lifetime' : 'days',
            redeemedAtMs: promoDateMs(row.redeemedAtMs),
            vipUntilMs: promoPlusUntilLabel(row, progress),
        };
    }));
    return { ok: true, codes, redemptions };
});
//# sourceMappingURL=promo_codes.js.map