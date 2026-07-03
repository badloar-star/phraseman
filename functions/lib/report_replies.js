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
exports.adminDraftReportReply = exports.claimReportReward = exports.adminReplyToReport = exports.USER_MESSAGES_COLLECTION = void 0;
/**
 * Ответы на юзерские репорты через персональные уведомления (инбокс-колокольчик).
 *
 * Поток (заменяет молчаливое shards += 1 из админки):
 *   1) Админ (вручную или через ИИ-черновик adminDraftReportReply) готовит краткий
 *      вежливый ответ юзеру на его репорт.
 *   2) adminReplyToReport пишет персональное сообщение в users/{uid}/user_messages
 *      (kind 'report_reply'); если репорт подтвердился — с невостребованными осколками.
 *   3) Юзер видит ответ в колокольчике на главной; если есть награда — кнопка
 *      «Забрать осколки» вызывает claimReportReward (идемпотентная транзакция).
 *
 * Никаких модалок при начислении: осколки появляются только после явного клейма
 * из уведомления (требование владельца, 2026-07).
 *
 * Прочитанность/дизмисс — через существующий users/{uid}/app_message_states
 * (тот же механизм, что у глобальных app_messages; ключ = id сообщения).
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const explain_provider_1 = require("./explain/explain_provider");
const user_notifications_1 = require("./user_notifications");
const REGION = 'us-central1';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
exports.USER_MESSAGES_COLLECTION = 'user_messages';
/** Счётчик подтверждённых полезных репортов (титул «Хелпер», см. constants/titles.ts). */
const HELPFUL_REPORTS_CONFIRMED_KEY = 'helpful_error_reports_confirmed_v1';
/**
 * Публичная проекция борда «Топ хелперов» (top_helpers/{uid}). Пишется в той же
 * транзакции, что и инкремент счётчика — чтобы рейтинг на борде всегда совпадал с
 * progress.helpful_error_reports_confirmed_v1. Приватные users/{uid} читать нельзя
 * (rules), поэтому имя/аватар/премиум берём из публичного leaderboard/{uid} —
 * ровно те же поля, что рисует Зал славы, чтобы UI борда совпадал с лигой.
 */
const TOP_HELPERS_COLLECTION = 'top_helpers';
/** Достаём публичные поля профиля из leaderboard/{uid} (мягко, без падений). */
function readLeaderboardProjection(data) {
    const d = data ?? {};
    const name = (typeof d.displayName === 'string' && d.displayName.trim()) ||
        (typeof d.name === 'string' && d.name.trim()) ||
        '';
    const avatar = typeof d.avatar === 'string' && d.avatar.trim() ? d.avatar.trim() : '';
    const aura = typeof d.aura === 'string' && d.aura.trim() ? d.aura.trim() : '';
    const frame = typeof d.frame === 'string' && d.frame.trim() ? d.frame.trim() : '';
    const proj = {
        isPremium: !!d.isPremium,
        isVip: !!d.isVip,
        isLifetime: !!d.isLifetime,
        profileCardLevel: Math.max(0, Math.floor(Number(d.profileCardLevel) || 0)),
    };
    if (name)
        proj.displayName = name.slice(0, 60);
    if (avatar)
        proj.avatar = avatar.slice(0, 64);
    if (aura)
        proj.aura = aura.slice(0, 64);
    if (frame)
        proj.frame = frame.slice(0, 64);
    if (typeof d.profileCardTheme === 'string' && d.profileCardTheme.trim()) {
        proj.profileCardTheme = d.profileCardTheme.trim().slice(0, 64);
    }
    const crownCount = Math.max(0, Math.floor(Number(d.leagueCrownCount) || 0));
    if (crownCount > 0)
        proj.leagueCrownCount = crownCount;
    if (Number(d.leagueCrownExpiresAt) > 0) {
        proj.leagueCrownExpiresAt = Math.floor(Number(d.leagueCrownExpiresAt));
    }
    return proj;
}
const REPLY_SHARDS_MIN = 0;
const REPLY_SHARDS_MAX = 100;
const REPLY_TITLE_MAX = 120;
const REPLY_BODY_MAX = 1200;
/** Коллекции репортов, на которые можно отвечать. Замкнутый список — админка не
 *  должна уметь помечать произвольные документы произвольных коллекций. */
const REPORT_COLLECTIONS = new Set([
    'error_reports',
    'explain_report_entries',
    'user_reports',
    'community_pack_reports',
]);
function requireAdmin(request) {
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
}
function cleanString(value, maxLen) {
    return String(value ?? '').trim().slice(0, maxLen);
}
/**
 * adminReplyToReport — отправить юзеру персональный ответ на его репорт.
 *
 * data: {
 *   uid: string;                 // stable uid юзера (из репорта)
 *   reportCollection: string;    // одна из REPORT_COLLECTIONS
 *   reportId: string;            // id документа репорта
 *   title: string;               // заголовок в языке юзера
 *   body: string;                // краткий вежливый ответ в языке юзера
 *   shards?: number;             // 0 = не подтвердилось (без награды), 1..100 = награда к клейму
 * }
 *
 * Эффект (транзакция):
 *   - users/{uid}/user_messages/{auto}: kind 'report_reply', shards, claimed:false
 *   - при shards>0: progress.helpful_error_reports_confirmed_v1 += 1 (титул «Хелпер»)
 *   - репорт: status 'answered', replyMessageId, repliedAt (осколки НЕ начисляются здесь)
 *   - admin_log: аудит
 */
exports.adminReplyToReport = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requireAdmin(request);
    const uid = cleanString(request.data?.uid, 128);
    const reportCollection = cleanString(request.data?.reportCollection, 64);
    const reportId = cleanString(request.data?.reportId, 128);
    const title = cleanString(request.data?.title, REPLY_TITLE_MAX);
    const body = cleanString(request.data?.body, REPLY_BODY_MAX);
    const shardsRaw = Number(request.data?.shards ?? 0);
    const shards = Number.isFinite(shardsRaw) ? Math.floor(shardsRaw) : NaN;
    if (!uid || uid === 'unknown')
        throw new https_1.HttpsError('invalid-argument', 'uid required');
    if (!REPORT_COLLECTIONS.has(reportCollection)) {
        throw new https_1.HttpsError('invalid-argument', `reportCollection must be one of: ${Array.from(REPORT_COLLECTIONS).join(', ')}`);
    }
    if (!reportId)
        throw new https_1.HttpsError('invalid-argument', 'reportId required');
    if (!title || !body)
        throw new https_1.HttpsError('invalid-argument', 'title and body required');
    if (!Number.isFinite(shards) || shards < REPLY_SHARDS_MIN || shards > REPLY_SHARDS_MAX) {
        throw new https_1.HttpsError('invalid-argument', `shards must be ${REPLY_SHARDS_MIN}..${REPLY_SHARDS_MAX}`);
    }
    const db = admin.firestore();
    const adminEmail = String(request.auth?.token?.email ?? '');
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const reportRef = db.collection(reportCollection).doc(reportId);
    const userRef = db.collection('users').doc(uid);
    const messageRef = userRef.collection(exports.USER_MESSAGES_COLLECTION).doc();
    const notificationRef = (0, user_notifications_1.userNotificationRef)(db, uid, `report_reply_${messageRef.id}`);
    const auditRef = db.collection('admin_log').doc();
    const helperRef = db.collection(TOP_HELPERS_COLLECTION).doc(uid);
    // Публичный профиль для проекции борда (то же, что читает Зал славы). Читаем ДО
    // транзакции: leaderboard редко меняется, а лишний tx.get на каждый ответ — трата.
    const leaderboardSnap = await db.collection('leaderboard').doc(uid).get();
    const helperProjection = readLeaderboardProjection(leaderboardSnap.data());
    // Pro-план (разовая «Навсегда») резолвим СЕРВЕРНО из users/{uid} — leaderboard-документ
    // премиум-поля не обновляет, поэтому опираться на него для Pro нельзя.
    helperProjection.isLifetime = await (0, premium_status_1.resolveIsLifetimePlan)(db, uid, nowMs).catch(() => false);
    await db.runTransaction(async (tx) => {
        const reportSnap = await tx.get(reportRef);
        if (!reportSnap.exists)
            throw new https_1.HttpsError('not-found', `report ${reportCollection}/${reportId} not found`);
        const report = reportSnap.data() ?? {};
        // Идемпотентность: повторный «Ответить» на уже отвеченный репорт — ошибка,
        // а не второе сообщение юзеру (админ жмёт кнопку дважды / две вкладки).
        if (typeof report.replyMessageId === 'string' && report.replyMessageId) {
            throw new https_1.HttpsError('already-exists', 'report already replied');
        }
        tx.set(messageRef, {
            kind: 'report_reply',
            title,
            body,
            shards,
            claimed: false,
            claimedAtMs: null,
            reportCollection,
            reportId,
            adminEmail,
            createdAt: nowIso,
            createdAtMs: nowMs,
        });
        tx.set(notificationRef, {
            ...(0, user_notifications_1.buildUserNotification)({
                type: 'report_reply',
                fromUid: 'phraseman_team',
                fromName: 'Phraseman',
                text: title,
                nav: { kind: 'report_reply', messageId: messageRef.id },
            }, nowMs),
            reportReply: {
                messageId: messageRef.id,
                title,
                body,
                shards,
                claimed: false,
                claimedAtMs: null,
                reportCollection,
                reportId,
            },
        });
        // Подтверждённый полезный репорт — двигаем счётчик титула сразу (не при клейме:
        // подтверждение состоялось независимо от того, заберёт ли юзер награду).
        // В той же транзакции обновляем публичную проекцию борда «Топ хелперов»,
        // чтобы рейтинг на борде и счётчик титула никогда не разъезжались.
        if (shards > 0) {
            tx.set(userRef, {
                progress: { [HELPFUL_REPORTS_CONFIRMED_KEY]: admin.firestore.FieldValue.increment(1) },
            }, { merge: true });
            tx.set(helperRef, {
                uid,
                confirmed: admin.firestore.FieldValue.increment(1),
                lastConfirmedAtMs: nowMs,
                updatedAtMs: nowMs,
                ...helperProjection,
            }, { merge: true });
        }
        tx.set(reportRef, {
            status: 'answered',
            replyMessageId: messageRef.id,
            replyNotificationId: notificationRef.id,
            replyShards: shards,
            repliedAt: nowIso,
            repliedBy: adminEmail,
        }, { merge: true });
        tx.set(auditRef, {
            ts: nowIso,
            adminEmail,
            action: 'reply_to_report',
            uid,
            details: { reportCollection, reportId, shards, title },
        });
    });
    return { ok: true, messageId: messageRef.id, notificationId: notificationRef.id, shards };
});
/**
 * claimReportReward — юзер жмёт «Забрать осколки» в уведомлении-ответе.
 *
 * data: { messageId: string }
 *
 * Транзакция: проверить своё сообщение (kind report_reply, shards>0, !claimed) →
 * claimed:true + users.shards += shards + shard_log. Повторный вызов — 'already-exists'.
 */
exports.claimReportReward = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const messageId = cleanString(request.data?.messageId, 128);
    if (!messageId)
        throw new https_1.HttpsError('invalid-argument', 'messageId required');
    const db = admin.firestore();
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid);
    const userRef = db.collection('users').doc(stableUid);
    const messageRef = userRef.collection(exports.USER_MESSAGES_COLLECTION).doc(messageId);
    const notificationRef = (0, user_notifications_1.userNotificationRef)(db, stableUid, `report_reply_${messageId}`);
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    return db.runTransaction(async (tx) => {
        const [messageSnap, userSnap, notificationSnap] = await Promise.all([
            tx.get(messageRef),
            tx.get(userRef),
            tx.get(notificationRef),
        ]);
        if (!messageSnap.exists)
            throw new https_1.HttpsError('not-found', 'message not found');
        const message = messageSnap.data() ?? {};
        if (message.kind !== 'report_reply')
            throw new https_1.HttpsError('failed-precondition', 'not a report reply');
        const amount = Math.floor(Number(message.shards) || 0);
        if (amount <= 0)
            throw new https_1.HttpsError('failed-precondition', 'nothing to claim');
        if (message.claimed === true)
            throw new https_1.HttpsError('already-exists', 'already claimed');
        const before = Number(userSnap.data()?.shards) || 0;
        const after = before + amount;
        tx.update(messageRef, { claimed: true, claimedAtMs: nowMs });
        if (notificationSnap.exists) {
            tx.update(notificationRef, {
                'reportReply.claimed': true,
                'reportReply.claimedAtMs': nowMs,
                updatedAt: nowMs,
            });
        }
        tx.set(userRef, {
            shards: after,
            shards_updated_at_ms: nowMs,
            shards_updated_op: 'earn',
            shards_updated_reason: 'report_reply_claim',
            updatedAt: nowMs,
        }, { merge: true });
        const shardLogRef = userRef.collection('shard_log').doc();
        tx.set(shardLogRef, {
            ts: nowIso,
            type: 'earn',
            amount,
            reason: 'report_reply_claim',
            balanceBefore: before,
            balanceAfter: after,
            messageId,
        });
        return { ok: true, amount, balance: after };
    });
});
const DRAFT_SYSTEM_PROMPT = [
    'Ты — сотрудник поддержки приложения для изучения английского Phraseman.',
    'Тебе дают юзерский репорт об ошибке и вердикт команды (подтвердился или нет).',
    'Напиши КОРОТКИЙ (2-4 предложения) вежливый ответ юзеру на языке из поля lang.',
    'Обязательно: поблагодари за репорт. Если подтвердился — скажи, что ошибка исправлена',
    'и в этом сообщении его ждёт награда. Если не подтвердился — мягко объясни почему,',
    'без канцелярита и без обвинений. Пиши от лица команды («мы»), тепло и по-человечески.',
    'Без эмодзи-спама (максимум один), без ссылок, без обещаний сроков.',
    'Ответ верни строго JSON-объектом: {"title": "...", "body": "..."}.',
    'title — до 60 знаков, body — до 500 знаков.',
].join(' ');
/**
 * adminDraftReportReply — ИИ-черновик ответа юзеру (для админки).
 *
 * data: {
 *   reportText: string;             // сырой текст репорта (что прислал юзер + контекст)
 *   verdict: 'confirmed' | 'rejected';  // вердикт команды после разбора
 *   fixNote?: string;               // что именно исправили / почему отклонили
 *   lang?: string;                  // язык юзера (ru/uk/es/...), дефолт ru
 * }
 * Возвращает { title, body } — админ может отредактировать перед отправкой.
 */
exports.adminDraftReportReply = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] }, async (request) => {
    requireAdmin(request);
    const reportText = cleanString(request.data?.reportText, 4000);
    const verdict = cleanString(request.data?.verdict, 16);
    const fixNote = cleanString(request.data?.fixNote, 600);
    const lang = cleanString(request.data?.lang, 8) || 'ru';
    if (!reportText)
        throw new https_1.HttpsError('invalid-argument', 'reportText required');
    if (verdict !== 'confirmed' && verdict !== 'rejected') {
        throw new https_1.HttpsError('invalid-argument', "verdict must be 'confirmed' | 'rejected'");
    }
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const userPayload = JSON.stringify({ lang, verdict, fixNote: fixNote || null, report: reportText });
    const result = await (0, explain_provider_1.openAiChat)({
        apiKey,
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: DRAFT_SYSTEM_PROMPT },
            { role: 'user', content: userPayload },
        ],
        maxTokens: 400,
        temperature: 0.6,
        responseFormat: { type: 'json_object' },
    });
    let title = '';
    let body = '';
    try {
        const parsed = JSON.parse(result.text);
        title = cleanString(parsed.title, REPLY_TITLE_MAX);
        body = cleanString(parsed.body, REPLY_BODY_MAX);
    }
    catch {
        throw new https_1.HttpsError('internal', 'draft_parse_failed');
    }
    if (!title || !body)
        throw new https_1.HttpsError('internal', 'draft_empty');
    return { ok: true, title, body };
});
//# sourceMappingURL=report_replies.js.map