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
exports.requireReportReplyPermission = requireReportReplyPermission;
exports.normalizeReportReplyReward = normalizeReportReplyReward;
exports.reportDocumentAllowsCoin = reportDocumentAllowsCoin;
exports.normalizeStoredReportReplyClaimAmount = normalizeStoredReportReplyClaimAmount;
exports.reportRecipientCandidate = reportRecipientCandidate;
exports.reportRecipientIdentityLookup = reportRecipientIdentityLookup;
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
const xp_levels_1 = require("./xp_levels");
const permissions_1 = require("./admin/permissions");
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
function firstNonEmptyString(...vals) {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim())
            return v.trim();
    }
    return '';
}
/**
 * Достаём публичные поля профиля для проекции борда из ТРЁХ источников по приоритету.
 *
 * ИСТОЧНИКИ ПРОФИЛЯ (аудит 2026-07-04):
 *   1) users/{uid}.progress.user_* — первичный, но у многих активных юзеров ПУСТ
 *      (имя/уровень живут только в AsyncStorage на устройстве, на сервер не синкаются).
 *   2) leaderboard/{uid} — вторичная проекция; ПРОПУСКАЕТ юзеров без имени/с xp<50.
 *   3) error_reports/{id} (репорт, за который юзер попал в хелперы) — САМЫЙ НАДЁЖНЫЙ:
 *      клиент кладёт userName/userLevel/userXP/userPremium прямо в документ репорта.
 * Без источника (3) реальные юзеры («Стелла» ур.50 и т.п.) показывались как «—» ур.1.
 *
 * ВАЖНО про уровень: progress.profile_card_level / leaderboard.profileCardLevel — это
 * ФЛАГ карточки (0..1), НЕ игровой уровень. Настоящий уровень (gameLevel) берём из
 * progress.user_level → getLevelFromXP(report.userXP) → report.userLevel.
 *
 * @param lb     leaderboard/{uid} (может отсутствовать)
 * @param prog   users/{uid}.progress
 * @param report документ репорта с полями userName/userLevel/userXP/userPremium
 */
function readLeaderboardProjection(lb, prog, report) {
    const d = lb ?? {};
    const p = prog ?? {};
    const r = report ?? {};
    const name = firstNonEmptyString(p.user_name, d.displayName, d.name, r.userName);
    const avatar = firstNonEmptyString(p.user_avatar, d.avatar, r.userAvatar);
    const aura = firstNonEmptyString(p.user_avatar_aura, d.aura, r.userAvatarAura);
    const frame = firstNonEmptyString(p.user_avatar_frame, d.frame, r.userAvatarFrame);
    // Настоящий игровой уровень: progress.user_level → getLevelFromXP(report.userXP) → report.userLevel.
    const reportXp = Math.floor(Number(r.userXP) || 0);
    const gameLevel = Math.max(0, Math.floor(Number(p.user_level) || 0)
        || (reportXp > 0 ? (0, xp_levels_1.getLevelFromXP)(reportXp) : 0)
        || Math.floor(Number(r.userLevel) || 0));
    const proj = {
        isPremium: !!d.isPremium || !!r.userPremium,
        isVip: !!d.isVip,
        isLifetime: !!d.isLifetime,
        profileCardLevel: Math.max(0, Math.floor(Number(d.profileCardLevel) || 0)),
    };
    if (gameLevel > 0)
        proj.gameLevel = gameLevel;
    if (name)
        proj.displayName = name.slice(0, 60);
    if (avatar)
        proj.avatar = avatar.slice(0, 64);
    if (aura)
        proj.aura = aura.slice(0, 64);
    if (frame)
        proj.frame = frame.slice(0, 64);
    const theme = firstNonEmptyString(d.profileCardTheme, p.profile_card_theme);
    if (theme)
        proj.profileCardTheme = theme.slice(0, 64);
    const crownCount = Math.max(0, Math.floor(Number(d.leagueCrownCount) || 0));
    if (crownCount > 0)
        proj.leagueCrownCount = crownCount;
    if (Number(d.leagueCrownExpiresAt) > 0) {
        proj.leagueCrownExpiresAt = Math.floor(Number(d.leagueCrownExpiresAt));
    }
    return proj;
}
const REPORT_RESOLUTIONS = ['confirmed_fixed', 'duplicate', 'in_progress', 'rejected', 'unconfirmed'];
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
function requireReportReplyPermission(request, permission) {
    if (!(0, permissions_1.hasClaimedPermission)(request.auth?.token, permission)) {
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    }
}
function cleanString(value, maxLen) {
    return String(value ?? '').trim().slice(0, maxLen);
}
function normalizeReportReplyReward(data) {
    const input = data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : {};
    const resolution = cleanString(input.resolution, 40);
    const coins = Number(input.coins ?? 0);
    if (!REPORT_RESOLUTIONS.includes(resolution)) {
        throw new https_1.HttpsError('invalid-argument', 'unsupported report resolution');
    }
    if (!Number.isInteger(coins) || (coins !== 0 && coins !== 1)) {
        throw new https_1.HttpsError('invalid-argument', 'coins must be exactly 0 or 1');
    }
    if (coins === 1 && resolution !== 'confirmed_fixed') {
        throw new https_1.HttpsError('failed-precondition', 'one coin requires confirmed_fixed');
    }
    return { resolution, coins: coins };
}
function reportDocumentAllowsCoin(report, resolution) {
    return resolution === 'confirmed_fixed'
        && (cleanString(report.resolution, 40) === 'confirmed_fixed' || cleanString(report.status, 40) === 'fixed');
}
function normalizeStoredReportReplyClaimAmount(message) {
    if (message.coins !== undefined)
        return Number(message.coins) === 1 ? 1 : 0;
    return Math.floor(Number(message.shards) || 0) > 0 ? 1 : 0;
}
function reportRecipientCandidate(reportCollection, report) {
    if (reportCollection === 'error_reports') {
        return cleanString(report.stableUid || report.uid, 128);
    }
    if (reportCollection === 'explain_report_entries') {
        return cleanString(report.stableUid || report.uid, 128);
    }
    if (reportCollection === 'user_reports' || reportCollection === 'community_pack_reports') {
        return cleanString(report.reporterUid, 128);
    }
    return '';
}
function reportRecipientIdentityLookup(reportCollection, report) {
    const originalUid = reportRecipientCandidate(reportCollection, report);
    const storedAuthUid = cleanString(report.authUid || report.reporterAuthUid, 128);
    if (!storedAuthUid)
        return { originalUid, authUid: originalUid };
    return { originalUid, authUid: storedAuthUid, requestedStableId: originalUid };
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
    requireReportReplyPermission(request, 'reports.reply.send');
    const reportCollection = cleanString(request.data?.reportCollection, 64);
    const reportId = cleanString(request.data?.reportId, 128);
    const title = cleanString(request.data?.title, REPLY_TITLE_MAX);
    const body = cleanString(request.data?.body, REPLY_BODY_MAX);
    const reward = normalizeReportReplyReward(request.data);
    if (!REPORT_COLLECTIONS.has(reportCollection)) {
        throw new https_1.HttpsError('invalid-argument', `reportCollection must be one of: ${Array.from(REPORT_COLLECTIONS).join(', ')}`);
    }
    if (!reportId)
        throw new https_1.HttpsError('invalid-argument', 'reportId required');
    if (!title || !body)
        throw new https_1.HttpsError('invalid-argument', 'title and body required');
    const db = admin.firestore();
    const adminEmail = String(request.auth?.token?.email ?? '');
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const reportRef = db.collection(reportCollection).doc(reportId);
    const initialReportSnap = await reportRef.get();
    if (!initialReportSnap.exists) {
        throw new https_1.HttpsError('not-found', `report ${reportCollection}/${reportId} not found`);
    }
    const recipientIdentity = reportRecipientIdentityLookup(reportCollection, initialReportSnap.data() ?? {});
    const { originalUid } = recipientIdentity;
    if (!originalUid || originalUid === 'unknown') {
        throw new https_1.HttpsError('failed-precondition', 'report recipient identity is missing');
    }
    const uid = await (0, auth_identity_1.resolveStableUidForAuth)(db, recipientIdentity.authUid, recipientIdentity.requestedStableId, { requireKnownIdentity: true, repairLinks: false });
    const userRef = db.collection('users').doc(uid);
    const messageRef = userRef.collection(exports.USER_MESSAGES_COLLECTION).doc();
    const notificationRef = (0, user_notifications_1.userNotificationRef)(db, uid, `report_reply_${messageRef.id}`);
    const auditRef = db.collection('admin_log').doc();
    const helperRef = db.collection(TOP_HELPERS_COLLECTION).doc(uid);
    // Публичный профиль для проекции борда из 3 источников (см. readLeaderboardProjection):
    // users.progress → leaderboard → САМ РЕПОРТ (userName/userLevel/userXP). Репорт —
    // самый надёжный источник имени/уровня для хелпера. Читаем ДО транзакции параллельно.
    const [leaderboardSnap, userProfileSnap, reportProfileSnap] = await Promise.all([
        db.collection('leaderboard').doc(uid).get(),
        userRef.get(),
        reportRef.get(),
    ]);
    const userProgress = (userProfileSnap.data()?.progress ?? {});
    const helperProjection = readLeaderboardProjection(leaderboardSnap.data(), userProgress, reportProfileSnap.data());
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
        if (reward.coins === 1 && !reportDocumentAllowsCoin(report, reward.resolution)) {
            throw new https_1.HttpsError('failed-precondition', 'report is not server-confirmed as fixed');
        }
        tx.set(messageRef, {
            kind: 'report_reply',
            title,
            body,
            coins: reward.coins,
            resolution: reward.resolution,
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
                coins: reward.coins,
                resolution: reward.resolution,
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
        if (reward.coins === 1) {
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
            replyTitle: title,
            replyBody: body,
            replyCoins: reward.coins,
            resolution: reward.resolution,
            repliedAt: nowIso,
            repliedAtMs: nowMs,
            repliedBy: adminEmail,
            replyRecipientUid: uid,
            ...(originalUid !== uid ? { replyOriginalUid: originalUid } : {}),
        }, { merge: true });
        tx.set(auditRef, {
            ts: nowIso,
            adminEmail,
            action: 'reply_to_report',
            uid,
            details: { reportCollection, reportId, coins: reward.coins, resolution: reward.resolution, title },
        });
    });
    return { ok: true, messageId: messageRef.id, notificationId: notificationRef.id, coins: reward.coins };
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
        const amount = normalizeStoredReportReplyClaimAmount(message);
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
            shards_updated_reason: 'report_reply_coin_claim',
            updatedAt: nowMs,
        }, { merge: true });
        const shardLogRef = userRef.collection('shard_log').doc();
        tx.set(shardLogRef, {
            ts: nowIso,
            type: 'earn',
            amount,
            reason: 'report_reply_coin_claim',
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
    'ВАЖНО: каждый юзер видит ТОЛЬКО своё сообщение и не знает о других юзерах, их репортах',
    'или каких-либо «соседних сообщениях». Никогда не ссылайся на другие сообщения, на других',
    'людей или на то, что кто-то уже сообщал об этой проблеме. Пиши так, будто это единственный',
    'разговор с этим человеком.',
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
    requireReportReplyPermission(request, 'reports.reply.draft');
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
    // Модель может вернуть НЕ JSON, а прозу/отказ (например, отказалась
    // формулировать ответ на репорт с чувствительным содержимым). Тогда JSON.parse
    // падает, и раньше админ видел глухое «INTERNAL» без причины. Отдаём понятную
    // ошибку с обрезанным сырым текстом модели, чтобы было видно, ЧТО она ответила
    // (в т.ч. текст отказа), и админ мог написать ответ вручную.
    const raw = String(result.text || '').trim();
    if (!raw) {
        throw new https_1.HttpsError('failed-precondition', 'ИИ вернул пустой ответ — сформулируй ответ вручную.');
    }
    let title = '';
    let body = '';
    try {
        const parsed = JSON.parse(raw);
        title = cleanString(parsed.title, REPLY_TITLE_MAX);
        body = cleanString(parsed.body, REPLY_BODY_MAX);
    }
    catch {
        throw new https_1.HttpsError('failed-precondition', `ИИ не вернул черновик (возможно, отказ). Ответ модели: ${raw.slice(0, 300)}`);
    }
    if (!title || !body) {
        throw new https_1.HttpsError('failed-precondition', `ИИ вернул неполный черновик (нет заголовка или текста). Ответ модели: ${raw.slice(0, 300)}`);
    }
    return { ok: true, title, body };
});
//# sourceMappingURL=report_replies.js.map