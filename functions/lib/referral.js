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
exports.referralOnUserProgressUpdated = exports.referralApply = exports.referralEnsureMyCode = void 0;
/**
 * Вирусный реферал: код в облаке, apply идемпотентно, награда шардами после
 * целевого действия (разблокирован урок 2 ⇒ урок 1 пройден с >= бронзы).
 */
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("node:crypto"));
const https_1 = require("firebase-functions/v2/https");
const functions = __importStar(require("firebase-functions/v2"));
const REGION = 'us-central1';
const CODE_LEN = 6;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CODE_ATTEMPTS = 12;
const REFEREE_SHARD_BONUS = 15;
const REFERRER_SHARD_BONUS = 20;
const MAX_REFERRER_BONUSES_PER_MONTH = 30;
/** Привязка apply только для «свежих» аккаунтов (ms с users.created_at). 0 = выкл. */
const REFEREE_MAX_ACCOUNT_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const REFERRAL_CODES = 'referral_codes';
const REFERRAL_OWNERS = 'referral_owners';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
function parseUnlockedLessons(raw) {
    if (raw == null)
        return [];
    if (Array.isArray(raw)) {
        return raw.map((n) => Number(n)).filter((n) => Number.isFinite(n));
    }
    if (typeof raw === 'string') {
        try {
            const j = JSON.parse(raw);
            return Array.isArray(j) ? j.map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [];
        }
        catch {
            return [];
        }
    }
    return [];
}
function hasLesson1DoneProgress(root) {
    if (!root)
        return false;
    const p = root?.progress;
    const u = p?.unlocked_lessons;
    return parseUnlockedLessons(u).includes(2);
}
function parseShardBalance(data) {
    const raw = data?.shards;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.floor(n);
}
function randomCode() {
    let s = '';
    for (let i = 0; i < CODE_LEN; i += 1) {
        s += CHARSET[crypto.randomInt(0, CHARSET.length)];
    }
    return s;
}
function yyyymmNow() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
async function assertAuthStableLink(db, authUid, clientStableId) {
    const linkRef = db.collection(AUTH_LINKS).doc(authUid);
    const linkSnap = await linkRef.get();
    if (!linkSnap.exists) {
        throw new https_1.HttpsError('failed-precondition', 'LINK_ACCOUNT_REQUIRED');
    }
    const stableId = String(linkSnap.data()?.stable_id ?? '').trim();
    if (!stableId || stableId !== clientStableId) {
        throw new https_1.HttpsError('permission-denied', 'STABLE_ID_MISMATCH');
    }
}
/**
 * App Check: клиент инициализирует в app/app_check_init.ts.
 * После проверки токенов в Firebase Console → true (иначе callables вернут 401).
 */
const CALLABLE_BASE = { region: REGION, enforceAppCheck: false };
/** Возвращает/создаёт публичный рефкод, привязанный к users/{stableId} через auth_links. */
exports.referralEnsureMyCode = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const stableId = String(request.data?.stableId ?? '').trim();
    if (!stableId) {
        throw new https_1.HttpsError('invalid-argument', 'stableId required');
    }
    const db = admin.firestore();
    await assertAuthStableLink(db, authUid, stableId);
    const ownerRef = db.collection(REFERRAL_OWNERS).doc(stableId);
    const existing = await ownerRef.get();
    if (existing.exists && existing.data()?.code) {
        return { code: String(existing.data().code) };
    }
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
        const code = randomCode();
        const codeRef = db.collection(REFERRAL_CODES).doc(code);
        // eslint-disable-next-line no-await-in-loop
        const created = await db.runTransaction(async (tx) => {
            const oSnap = await tx.get(ownerRef);
            if (oSnap.exists && oSnap.data()?.code) {
                return { code: String(oSnap.data().code), created: false };
            }
            const cSnap = await tx.get(codeRef);
            if (cSnap.exists) {
                return null;
            }
            const now = admin.firestore.FieldValue.serverTimestamp();
            tx.set(codeRef, { ownerStableId: stableId, createdAt: now, normalized: code });
            tx.set(ownerRef, { code, ownerStableId: stableId, createdAt: now }, { merge: true });
            return { code, created: true };
        });
        if (created && 'code' in created) {
            return { code: created.code };
        }
    }
    throw new https_1.HttpsError('resource-exhausted', 'CODE_GENERATION_FAILED');
});
/**
 * Первичная фиксация: приглашённый (referee) вводит код до/после sign-in. Идемпотентно.
 * Антифрод: аки старше REFEREE_MAX_ACCOUNT_AGE_MS (по users.created_at) не принимаем.
 */
exports.referralApply = (0, https_1.onCall)(CALLABLE_BASE, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Auth required');
    }
    const authUid = request.auth.uid;
    const refereeStableId = String(request.data?.refereeStableId ?? '').trim();
    const refCode = String(request.data?.refCode ?? '')
        .trim()
        .toUpperCase();
    if (!refereeStableId || !refCode) {
        throw new https_1.HttpsError('invalid-argument', 'refereeStableId and refCode required');
    }
    if (refCode.length < 4) {
        throw new https_1.HttpsError('invalid-argument', 'REF_CODE_INVALID');
    }
    const db = admin.firestore();
    await assertAuthStableLink(db, authUid, refereeStableId);
    const codeRef = db.collection(REFERRAL_CODES).doc(refCode);
    const attRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(refereeStableId);
    const userRef = db.collection(USERS).doc(refereeStableId);
    return db.runTransaction(async (tx) => {
        const att0 = await tx.get(attRef);
        if (att0.exists) {
            const d = att0.data();
            return {
                ok: true,
                already: true,
                refCode: d?.refCode ?? refCode,
                referrerStableId: d?.referrerStableId,
                status: d?.status,
            };
        }
        if (REFEREE_MAX_ACCOUNT_AGE_MS > 0) {
            const userSnap = await tx.get(userRef);
            if (userSnap.exists) {
                const c = userSnap.data()?.created_at;
                if (typeof c === 'number' && c > 0) {
                    const age = Date.now() - c;
                    if (age > REFEREE_MAX_ACCOUNT_AGE_MS) {
                        throw new https_1.HttpsError('failed-precondition', 'REFERRAL_REFEREE_ACCOUNT_TOO_OLD');
                    }
                }
            }
        }
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists) {
            throw new https_1.HttpsError('not-found', 'REF_CODE_UNKNOWN');
        }
        const ownerStableId = String(codeSnap.data()?.ownerStableId ?? '').trim();
        if (!ownerStableId) {
            throw new https_1.HttpsError('failed-precondition', 'REF_CODE_BROKEN');
        }
        if (ownerStableId === refereeStableId) {
            throw new https_1.HttpsError('invalid-argument', 'SELF_REFERRAL');
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        tx.set(attRef, {
            referrerStableId: ownerStableId,
            refCode,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });
        return { ok: true, already: false, referrerStableId: ownerStableId, refCode };
    });
});
/**
 * Когда в users/{stableId} появляется progress.unlocked_lessons с "2" (урок 1 с бронзой) —
 * начисляем шарды referee и referrer (идемпотентно; лимит на referrer в месяц).
 * onDocumentWritten: и первый create, и update.
 */
exports.referralOnUserProgressUpdated = functions.firestore.onDocumentWritten({ document: `${USERS}/{userId}`, region: REGION }, async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after.data();
    if (!after)
        return;
    const beforeExists = event.data?.before?.exists;
    const before = beforeExists ? event.data?.before.data() : undefined;
    const pA = after?.progress;
    const pB = before?.progress;
    if (pA?.unlocked_lessons === pB?.unlocked_lessons)
        return;
    if (!hasLesson1DoneProgress(after))
        return;
    const db = admin.firestore();
    const attRef = db.collection(REFERRAL_ATTRIBUTIONS).doc(userId);
    const attSnap = await attRef.get();
    if (!attSnap.exists)
        return;
    const att0 = attSnap.data();
    if (att0?.status && att0.status !== 'pending')
        return;
    const referrerId = String(att0.referrerStableId ?? '').trim();
    if (!referrerId)
        return;
    const ym = yyyymmNow();
    const uref = (uid) => db.collection(USERS).doc(uid);
    await db.runTransaction(async (tx) => {
        const attR = await tx.get(attRef);
        const refUserSnap = await tx.get(uref(referrerId));
        const refeeSnap = await tx.get(uref(userId));
        if (!attR.exists)
            return;
        if (!hasLesson1DoneProgress(refeeSnap.data()))
            return;
        const row = attR.data();
        if (row?.status && row?.status !== 'pending')
            return;
        const refData = refUserSnap.data() ?? {};
        const monthly = refData.referral_bonuses_monthly ?? {};
        const used = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
        let refererDelta = REFERRER_SHARD_BONUS;
        let outStatus = 'rewarded';
        if (used >= MAX_REFERRER_BONUSES_PER_MONTH) {
            refererDelta = 0;
            outStatus = 'skipped_referrer_cap';
        }
        const refeeBal = parseShardBalance(refeeSnap.data());
        const nextRefee = refeeBal + REFEREE_SHARD_BONUS;
        tx.set(uref(userId), { shards: nextRefee, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        const refeeLog = uref(userId).collection('shard_log').doc();
        tx.set(refeeLog, {
            type: 'earn',
            amount: REFEREE_SHARD_BONUS,
            reason: 'referral_referee_l1',
            balanceAfter: nextRefee,
            ts: new Date().toISOString(),
        });
        if (refererDelta > 0) {
            const refBal = parseShardBalance(refUserSnap.data());
            const nextRef = refBal + refererDelta;
            tx.set(uref(referrerId), {
                shards: nextRef,
                referral_bonuses_monthly: { ...monthly, [ym]: used + 1 },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            const refLog = uref(referrerId).collection('shard_log').doc();
            tx.set(refLog, {
                type: 'earn',
                amount: refererDelta,
                reason: 'referral_referrer_l1',
                balanceAfter: nextRef,
                ts: new Date().toISOString(),
            });
        }
        tx.set(attRef, {
            status: outStatus,
            rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
            referrerShardBonus: refererDelta,
            refereeShardBonus: REFEREE_SHARD_BONUS,
            qualifiedBy: 'unlocked_lesson_2',
        }, { merge: true });
    });
});
//# sourceMappingURL=referral.js.map