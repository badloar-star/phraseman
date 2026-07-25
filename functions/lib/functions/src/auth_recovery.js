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
exports.authConfirmRecoveryCode = exports.authRequestRecoveryCode = void 0;
exports.hashRecoveryCode = hashRecoveryCode;
const crypto = __importStar(require("crypto"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const account_delete_job_1 = require("./account_delete_job");
const admin_email_1 = require("./admin_email");
const admin_alerts_1 = require("./admin_alerts");
/**
 * Самообслуживаемое восстановление доступа к аккаунту по email-коду.
 *
 * Сценарий инцидента: юзер переустановил приложение, жмёт «Войти через Google»,
 * но на устройстве несколько Google-аккаунтов и он выбирает НЕ ТОТ — получает
 * новый provider uid и «пустой» аккаунт (прогресс «потерян»). Выход без
 * ручных действий владельца: юзер вводит свой stable_id (есть на устройстве),
 * сервер шлёт 6-значный код на email ПРИВЯЗКИ (users/{stableId}.linkedAuth.email,
 * адрес из input НЕ принимается), юзер вводит код — и сервер перепривязывает
 * его ТЕКУЩИЙ provider uid к старому stable_id. Код — доказательство владения
 * почтой привязки, поэтому перепривязка безопасна.
 *
 * Форма записей перепривязки НАМЕРЕННО повторяет ensureAuthLinkDoc /
 * ensureProviderLinkedAuth из auth_identity.ts (auth_links/{uid}.stable_id +
 * users/{stableId}.firebaseAuthUid/linkedAuth). Если меняется та форма —
 * синхронно менять здесь. Пишем вручную внутри транзакции, потому что
 * ensureAuthLinkDoc работает вне транзакций и не даёт атомарности
 * «проверка кода → перепривязка → consumed».
 */
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';
const RECOVERY_CODES = 'auth_recovery_codes';
const RECOVERY_RATE_LIMITS = 'auth_recovery_rate_limits';
const RECOVERY_EVENTS = 'auth_recovery_events';
const CODE_TTL_MS = 10 * 60 * 1000; // код живёт 10 минут
const CODE_MAX_ATTEMPTS = 5; // после 5 неверных попыток код блокируется
const RATE_WINDOW_MS = 60 * 60 * 1000; // окно rate-limit — 1 час
const RATE_MAX_PER_WINDOW = 3; // не больше 3 писем в час на stable_id
const ROLLBACK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // окно отката перепривязки — 14 дней
function requireRecoverySession(request) {
    if (!request.app)
        throw new https_1.HttpsError('failed-precondition', 'app_check_required');
    const authUid = String(request.auth?.uid ?? '').trim();
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const token = request.auth?.token ?? {};
    const firebase = token.firebase;
    const signInProvider = firebase && typeof firebase === 'object'
        ? String(firebase.sign_in_provider ?? '').trim()
        : '';
    const provider = signInProvider === 'google.com'
        ? 'google'
        : signInProvider === 'apple.com'
            ? 'apple'
            : null;
    if (!provider || token.email_verified !== true) {
        throw new https_1.HttpsError('permission-denied', 'recovery_provider_required');
    }
    return { authUid, provider };
}
function snapshotFingerprint(snapshot) {
    const updateTime = snapshot.updateTime;
    const version = updateTime
        ? typeof updateTime.seconds === 'number' && typeof updateTime.nanoseconds === 'number'
            ? `${updateTime.seconds}:${updateTime.nanoseconds}`
            : typeof updateTime.toMillis === 'function'
                ? String(updateTime.toMillis())
                : 'unknown'
        : 'missing';
    return JSON.stringify({
        exists: snapshot.exists,
        stableId: String(snapshot.data()?.stable_id ?? '').trim(),
        version,
    });
}
function userIdentityFingerprint(snapshot) {
    const data = snapshot.data() ?? {};
    const linked = readLinkedAuth(data);
    return JSON.stringify({
        exists: snapshot.exists,
        firebaseAuthUid: String(data.firebaseAuthUid ?? '').trim(),
        provider: linked.provider,
        providerUid: linked.providerUid,
    });
}
function oldProviderUids(userData) {
    const linked = readLinkedAuth(userData);
    return Array.from(new Set([
        String(userData.firebaseAuthUid ?? '').trim(),
        linked.providerUid,
    ].filter(Boolean)));
}
function isProviderOwnedUser(userData) {
    const linked = readLinkedAuth(userData);
    return Boolean(linked.provider || linked.providerUid);
}
function stableTransactionalEmailError(error) {
    const value = String(error ?? '').trim();
    if (value === 'resend_key_missing')
        return value;
    if (value === 'resend_http_failed' || value === 'resend_transport_failed')
        return value;
    return 'transactional_email_failed';
}
function throwRecoveryUnavailable() {
    console.warn(JSON.stringify({ event: 'auth_recovery_failed' }));
    throw new https_1.HttpsError('internal', 'recovery_unavailable');
}
function throwIdentityMismatch() {
    throw new https_1.HttpsError('permission-denied', 'recovery_identity_mismatch');
}
function assertTargetAnchorIfPresent(snapshot, stableId, providerUid, provider) {
    // Legacy cleanup may already have purged this provider anchor. In that case
    // the transactionally-read users document remains the ownership authority.
    if (!snapshot.exists)
        return false;
    const data = snapshot.data() ?? {};
    if (String(data.stable_id ?? '').trim() !== stableId
        || String(data.providerUid ?? '').trim() !== providerUid
        || String(data.provider ?? '').trim() !== provider) {
        throwIdentityMismatch();
    }
    return true;
}
function assertSessionProvider(sessionProvider, targetProvider, codeProvider) {
    if (!targetProvider
        || targetProvider !== sessionProvider
        || (codeProvider !== undefined && String(codeProvider ?? '').trim() !== sessionProvider)) {
        throw new https_1.HttpsError('permission-denied', 'recovery_provider_mismatch');
    }
}
function normalizeStableId(value) {
    return String(value ?? '').trim();
}
function numeric(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
/** sha256(salt + code) — хэш кода восстановления. Сам код в Firestore не храним. */
function hashRecoveryCode(salt, code) {
    return crypto.createHash('sha256').update(`${salt}${code}`).digest('hex');
}
function hashesEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length)
        return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
function generateRecoveryCode() {
    // 6 цифр, с ведущими нулями. crypto.randomInt — криптостойкий источник.
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}
function normalizeCodeInput(value) {
    const code = String(value ?? '').trim();
    if (!code)
        throw new https_1.HttpsError('invalid-argument', 'code_required');
    if (!/^\d{6}$/.test(code))
        throw new https_1.HttpsError('invalid-argument', 'code_format_invalid');
    return code;
}
function readLinkedAuth(userData) {
    const raw = userData.linkedAuth;
    const linked = raw && typeof raw === 'object' ? raw : {};
    const providerRaw = String(linked.provider ?? '').trim();
    const email = String(linked.email ?? '').trim();
    return {
        provider: providerRaw === 'google' || providerRaw === 'apple' ? providerRaw : null,
        email: email || null,
        displayName: String(linked.displayName ?? '').trim() || null,
        providerUid: String(linked.providerUid ?? '').trim(),
        devicePlatform: String(linked.devicePlatform ?? '').trim() || null,
    };
}
function escapeTelegramHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
/** Маска stable_id для алертов: только края UUID, без PII. */
function maskStableId(stableId) {
    if (stableId.length <= 8)
        return '***';
    return `${stableId.slice(0, 4)}…${stableId.slice(-4)}`;
}
function buildRecoveryEmailText(code) {
    // Двуязычное письмо (RU + EN): код крупно, TTL, «если не вы — игнорируйте».
    return [
        `Ваш код восстановления аккаунта Phraseman:`,
        ``,
        `${code}`,
        ``,
        `Код действует 10 минут. Введите его в приложении, чтобы восстановить доступ к своему прогрессу.`,
        `Если это были не вы — просто проигнорируйте это письмо.`,
        ``,
        `—`,
        ``,
        `Your Phraseman account recovery code:`,
        ``,
        `${code}`,
        ``,
        `The code expires in 10 minutes. Enter it in the app to restore access to your progress.`,
        `If you did not request this code, you can safely ignore this email.`,
    ].join('\n');
}
// ── authRequestRecoveryCode: отправка кода на email привязки ─────────────────
exports.authRequestRecoveryCode = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const { authUid, provider: sessionProvider } = requireRecoverySession(request);
    const stableId = normalizeStableId(request.data?.stableId);
    if (!stableId || stableId.length > 160) {
        throw new https_1.HttpsError('invalid-argument', 'stable_id_required');
    }
    const db = admin.firestore();
    const now = Date.now();
    const code = generateRecoveryCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = hashRecoveryCode(salt, code);
    const userRef = db.collection(USERS).doc(stableId);
    const currentLinkRef = db.collection(AUTH_LINKS).doc(authUid);
    const currentMarkerRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
    const targetTombstoneRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
    const rateRef = db.collection(RECOVERY_RATE_LIMITS).doc(stableId);
    const codeRef = db.collection(RECOVERY_CODES).doc(stableId);
    let delivery;
    try {
        delivery = await db.runTransaction(async (tx) => {
            const [userSnap, currentLinkSnap, currentMarkerSnap, targetTombstoneSnap, rateSnap] = await Promise.all([
                tx.get(userRef),
                tx.get(currentLinkRef),
                tx.get(currentMarkerRef),
                tx.get(targetTombstoneRef),
                tx.get(rateRef),
            ]);
            if (currentMarkerSnap.exists || targetTombstoneSnap.exists) {
                throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
            }
            if (!userSnap.exists) {
                throw new https_1.HttpsError('failed-precondition', 'recovery_no_email');
            }
            const userData = userSnap.data() ?? {};
            const linked = readLinkedAuth(userData);
            const maskedEmail = (0, auth_identity_1.maskEmailForRecoveryHint)(linked.email);
            if (!linked.email || !maskedEmail) {
                throw new https_1.HttpsError('failed-precondition', 'recovery_no_email');
            }
            assertSessionProvider(sessionProvider, linked.provider);
            const targetProvider = linked.provider;
            const targetProviderUids = oldProviderUids(userData);
            if (targetProviderUids.length === 0)
                throwIdentityMismatch();
            const targetAnchorRefs = targetProviderUids.map((uid) => db.collection(AUTH_LINKS).doc(uid));
            const targetMarkerRefs = targetProviderUids.map((uid) => db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(uid));
            const [targetAnchorSnaps, targetMarkerSnaps] = await Promise.all([
                Promise.all(targetAnchorRefs.map((ref) => tx.get(ref))),
                Promise.all(targetMarkerRefs.map((ref) => tx.get(ref))),
            ]);
            if (targetMarkerSnaps.some((snapshot) => snapshot.exists)) {
                throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
            }
            targetAnchorSnaps.forEach((snapshot, index) => {
                assertTargetAnchorIfPresent(snapshot, stableId, targetProviderUids[index], targetProvider);
            });
            const currentLinkData = currentLinkSnap.data() ?? {};
            const currentStableId = String(currentLinkData.stable_id ?? '').trim();
            if (currentLinkSnap.exists) {
                if (!currentStableId)
                    throwIdentityMismatch();
                if (currentStableId === stableId) {
                    if (!targetProviderUids.includes(authUid))
                        throwIdentityMismatch();
                    assertTargetAnchorIfPresent(currentLinkSnap, stableId, authUid, targetProvider);
                }
                else {
                    const displacedUserRef = db.collection(USERS).doc(currentStableId);
                    const displacedTombstoneRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(currentStableId);
                    const [displacedUserSnap, displacedTombstoneSnap] = await Promise.all([
                        tx.get(displacedUserRef),
                        tx.get(displacedTombstoneRef),
                    ]);
                    const displacedUserData = displacedUserSnap.data() ?? {};
                    if (displacedTombstoneSnap.exists
                        || !displacedUserSnap.exists
                        || String(displacedUserData.firebaseAuthUid ?? '').trim() !== authUid
                        || isProviderOwnedUser(displacedUserData)) {
                        throwIdentityMismatch();
                    }
                }
            }
            const rate = rateSnap.data() ?? {};
            const windowStartMs = numeric(rate.windowStartMs);
            const sameWindow = now - windowStartMs < RATE_WINDOW_MS;
            const count = sameWindow ? numeric(rate.count) : 0;
            if (count >= RATE_MAX_PER_WINDOW) {
                throw new https_1.HttpsError('resource-exhausted', 'recovery_rate_limited');
            }
            tx.set(rateRef, {
                stableId,
                windowStartMs: sameWindow ? windowStartMs : now,
                count: count + 1,
                updatedAtMs: now,
            }, { merge: true });
            tx.set(codeRef, {
                salt,
                codeHash,
                status: 'active',
                attempts: 0,
                requestedByUid: authUid,
                provider: targetProvider,
                createdAt: now,
                expiresAt: now + CODE_TTL_MS,
            });
            return { email: linked.email, maskedEmail, provider: targetProvider };
        });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throwRecoveryUnavailable();
    }
    const sendResult = await (0, admin_email_1.sendTransactionalEmail)({
        to: delivery.email,
        subject: 'Phraseman — код восстановления аккаунта',
        text: buildRecoveryEmailText(code),
    }).catch(() => ({ ok: false, error: 'resend_transport_failed' }));
    if (!sendResult.ok) {
        await codeRef.set({
            status: 'send_failed',
            sendError: stableTransactionalEmailError(sendResult.error),
            updatedAt: now,
        }, { merge: true }).catch(() => { });
        if (sendResult.error === 'resend_key_missing') {
            throw new https_1.HttpsError('failed-precondition', 'resend_key_missing');
        }
        throw new https_1.HttpsError('internal', 'recovery_email_failed');
    }
    return {
        ok: true,
        maskedEmail: delivery.maskedEmail,
        expiresInSec: Math.floor(CODE_TTL_MS / 1000),
        provider: delivery.provider,
    };
});
exports.authConfirmRecoveryCode = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const { authUid: newUid, provider: sessionProvider } = requireRecoverySession(request);
    const stableId = normalizeStableId(request.data?.stableId);
    if (!stableId || stableId.length > 160) {
        throw new https_1.HttpsError('invalid-argument', 'stable_id_required');
    }
    const code = normalizeCodeInput(request.data?.code);
    const db = admin.firestore();
    const now = Date.now();
    const codeRef = db.collection(RECOVERY_CODES).doc(stableId);
    const userRef = db.collection(USERS).doc(stableId);
    const linkRef = db.collection(AUTH_LINKS).doc(newUid);
    const markerRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(newUid);
    const targetTombstoneRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
    const leaderboardRef = db.collection(LEADERBOARD).doc(stableId);
    const eventRef = db.collection(RECOVERY_EVENTS).doc();
    let preflightLinkFingerprint;
    let preflightUserFingerprint;
    try {
        const [preflightLinkSnap, preflightUserSnap] = await Promise.all([
            linkRef.get(),
            userRef.get(),
        ]);
        preflightLinkFingerprint = snapshotFingerprint(preflightLinkSnap);
        preflightUserFingerprint = userIdentityFingerprint(preflightUserSnap);
    }
    catch {
        throwRecoveryUnavailable();
    }
    let outcome;
    try {
        outcome = await db.runTransaction(async (tx) => {
            const codeSnap = await tx.get(codeRef);
            const codeData = codeSnap.data();
            if (!codeSnap.exists || !codeData || codeData.status !== 'active') {
                throw new https_1.HttpsError('failed-precondition', 'recovery_code_missing');
            }
            if (numeric(codeData.expiresAt) <= now) {
                throw new https_1.HttpsError('deadline-exceeded', 'recovery_code_expired');
            }
            const attempts = numeric(codeData.attempts);
            if (attempts >= CODE_MAX_ATTEMPTS)
                return { kind: 'locked' };
            const expectedHash = String(codeData.codeHash ?? '');
            const actualHash = hashRecoveryCode(String(codeData.salt ?? ''), code);
            if (!hashesEqual(actualHash, expectedHash)) {
                tx.set(codeRef, { attempts: attempts + 1, updatedAt: now }, { merge: true });
                return { kind: 'invalid' };
            }
            const [userSnap, linkSnap, markerSnap, targetTombstoneSnap, leaderboardSnap] = await Promise.all([
                tx.get(userRef),
                tx.get(linkRef),
                tx.get(markerRef),
                tx.get(targetTombstoneRef),
                tx.get(leaderboardRef),
            ]);
            if (snapshotFingerprint(linkSnap) !== preflightLinkFingerprint) {
                throwIdentityMismatch();
            }
            if (userIdentityFingerprint(userSnap) !== preflightUserFingerprint) {
                throwIdentityMismatch();
            }
            if (markerSnap.exists || targetTombstoneSnap.exists) {
                throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
            }
            if (!userSnap.exists) {
                throw new https_1.HttpsError('failed-precondition', 'recovery_target_missing');
            }
            const userData = userSnap.data() ?? {};
            const linked = readLinkedAuth(userData);
            assertSessionProvider(sessionProvider, linked.provider, codeData.provider);
            const targetProvider = linked.provider;
            const allPreviousProviderUids = oldProviderUids(userData);
            if (allPreviousProviderUids.length === 0)
                throwIdentityMismatch();
            const targetAnchorRefs = allPreviousProviderUids.map((uid) => db.collection(AUTH_LINKS).doc(uid));
            const targetMarkerRefs = allPreviousProviderUids.map((uid) => db.collection(account_delete_job_1.ACCOUNT_DELETE_AUTH_MARKERS).doc(uid));
            const [targetAnchorSnaps, targetMarkerSnaps] = await Promise.all([
                Promise.all(targetAnchorRefs.map((ref) => tx.get(ref))),
                Promise.all(targetMarkerRefs.map((ref) => tx.get(ref))),
            ]);
            if (targetMarkerSnaps.some((snapshot) => snapshot.exists)) {
                throw new https_1.HttpsError('failed-precondition', 'account_delete_pending');
            }
            targetAnchorSnaps.forEach((snapshot, index) => {
                assertTargetAnchorIfPresent(snapshot, stableId, allPreviousProviderUids[index], targetProvider);
            });
            const linkData = linkSnap.data() ?? {};
            const previousLinkedStableId = String(linkData.stable_id ?? '').trim();
            let previousStableIdDisplacement = null;
            if (linkSnap.exists) {
                if (!previousLinkedStableId)
                    throwIdentityMismatch();
                if (previousLinkedStableId === stableId) {
                    if (!allPreviousProviderUids.includes(newUid))
                        throwIdentityMismatch();
                    assertTargetAnchorIfPresent(linkSnap, stableId, newUid, targetProvider);
                }
                else {
                    const displacedUserRef = db.collection(USERS).doc(previousLinkedStableId);
                    const displacedTombstoneRef = db.collection(account_delete_job_1.ACCOUNT_DELETE_TOMBSTONES).doc(previousLinkedStableId);
                    const [displacedUserSnap, displacedTombstoneSnap] = await Promise.all([
                        tx.get(displacedUserRef),
                        tx.get(displacedTombstoneRef),
                    ]);
                    const displacedUserData = displacedUserSnap.data() ?? {};
                    if (displacedTombstoneSnap.exists
                        || !displacedUserSnap.exists
                        || String(displacedUserData.firebaseAuthUid ?? '').trim() !== newUid
                        || isProviderOwnedUser(displacedUserData)) {
                        throwIdentityMismatch();
                    }
                    previousStableIdDisplacement = previousLinkedStableId;
                }
            }
            const previousProviderUids = allPreviousProviderUids.filter((uid) => uid !== newUid);
            const existingLinkedAt = numeric(linkData.linkedAt);
            tx.set(linkRef, {
                stable_id: stableId,
                providerUid: newUid,
                provider: targetProvider,
                linkedAt: existingLinkedAt > 0 ? existingLinkedAt : now,
                lastSignInAt: now,
                email: linked.email,
                displayName: linked.displayName,
                updatedAt: now,
            }, { merge: true });
            tx.set(userRef, {
                firebaseAuthUid: newUid,
                linkedAuth: {
                    provider: targetProvider,
                    providerUid: newUid,
                    email: linked.email,
                    displayName: linked.displayName,
                    linkedAt: now,
                    lastSignInAt: now,
                    devicePlatform: linked.devicePlatform ?? 'web',
                },
                updatedAt: now,
            }, { merge: true });
            if (leaderboardSnap.exists) {
                const leaderboardAuthUid = String(leaderboardSnap.data()?.firebaseAuthUid ?? '').trim();
                if (leaderboardAuthUid !== newUid) {
                    tx.set(leaderboardRef, { firebaseAuthUid: newUid, updatedAt: now }, { merge: true });
                }
            }
            tx.create(eventRef, {
                stableId,
                newProviderUid: newUid,
                previousProviderUids,
                ...(previousStableIdDisplacement ? { previousStableIdDisplacement } : {}),
                requestedByUid: String(codeData.requestedByUid ?? '').trim() || null,
                at: now,
                rollbackUntil: now + ROLLBACK_WINDOW_MS,
                status: 'completed',
            });
            tx.set(codeRef, { status: 'consumed', consumedAt: now, consumedByUid: newUid, updatedAt: now }, { merge: true });
            previousProviderUids.forEach((uid) => {
                const anchorIndex = allPreviousProviderUids.indexOf(uid);
                if (anchorIndex >= 0 && targetAnchorSnaps[anchorIndex].exists) {
                    tx.delete(targetAnchorRefs[anchorIndex]);
                }
            });
            return { kind: 'success', previousProviderUids, previousStableIdDisplacement };
        });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        throwRecoveryUnavailable();
    }
    if (outcome.kind === 'invalid') {
        throw new https_1.HttpsError('permission-denied', 'recovery_code_invalid');
    }
    if (outcome.kind === 'locked') {
        throw new https_1.HttpsError('resource-exhausted', 'recovery_code_locked');
    }
    try {
        const text = `🔐 <b>Восстановление аккаунта</b>\n\n` +
            `Stable: <code>${escapeTelegramHtml(maskStableId(stableId))}</code>\n` +
            `Новый провайдер: <code>…${escapeTelegramHtml(newUid.slice(-8))}</code>\n` +
            `Предыдущие uid: ${outcome.previousProviderUids.length}` +
            (outcome.previousStableIdDisplacement
                ? `\nВытеснён stable: <code>${escapeTelegramHtml(maskStableId(outcome.previousStableIdDisplacement))}</code>`
                : '');
        await (0, admin_alerts_1.sendTelegramAlert)(admin_alerts_1.ADMIN_ALERT_BOT_TOKEN.value() || process.env.ADMIN_ALERT_BOT_TOKEN || '', text, null);
    }
    catch {
        console.warn(JSON.stringify({ event: 'auth_recovery_alert_failed' }));
    }
    return { ok: true, stableId };
});
//# sourceMappingURL=auth_recovery.js.map