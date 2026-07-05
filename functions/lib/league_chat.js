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
exports.leagueChatReportMessage = exports.leagueChatDeleteMessage = exports.leagueChatSendMessage = exports.leagueChatAuthorizeRoom = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const league_chat_blocklist_generated_1 = require("./league_chat_blocklist.generated");
const auth_identity_1 = require("./auth_identity");
const callable_options_1 = require("./callable_options");
const user_notifications_1 = require("./user_notifications");
const REGION = 'us-central1';
const MAX_MESSAGE_LENGTH = 420;
const SEND_THROTTLE_MS = 12000;
const REPORT_THROTTLE_MS = 60000;
const MAX_REPORT_REASON_LENGTH = 500;
const LINK_RE = /\b(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|discord\.gg\/|discord\.com\/invite\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly\/|tinyurl\.com\/|linktr\.ee\/|instagram\.com\/|tiktok\.com\/|youtube\.com\/|youtu\.be\/)\S*/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d[\s().-]?){8,}/;
const HANDLE_RE = /(^|\s)@[a-z0-9_]{3,32}\b/i;
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };
const BLOCK_TERMS = league_chat_blocklist_generated_1.LEAGUE_CHAT_BLOCK_TERMS;
const BLOCK_PATTERNS = [
    /\b(?:h+u+[iy]+|x+u+[iy]+|x+y+[iu]+)\b/i,
    /\b(?:blya(?:d|t)?|suka|pizd\w*|pid[ao]r\w*)\b/i,
    /\b(?:f+u+c+k+|s+h+i+t+|c+u+n+t+)\b/i,
    /(?:^|\s)(?:бля(?:д|т)\w*|пизд\w*|ху[йеяию]\w*|[её]б\w*|у[её]б\w*|сука\w*)(?:\s|$)/i,
];
const HATE_PATTERNS = [
    /\b(?:nazi|hitler|heil)\b/i,
    /\b(?:racist|terrorist)\b/i,
    /\b(?:all|все|усе|todos|todas)\s+\w{2,24}\s+(?:are|is|must|should|должны|надо|нужно)/i,
    /\b(?:ненавижу|уничтожить|убить|выгнать|запретить)\s+\w{2,24}/i,
];
const REVIEW_IDENTITY_TERMS = league_chat_blocklist_generated_1.LEAGUE_CHAT_REVIEW_TERMS;
const SEXUAL_TERMS = league_chat_blocklist_generated_1.LEAGUE_CHAT_SEXUAL_TERMS;
const termCache = new WeakMap();
const ALLOWED_NORMALIZED_TERMS = new Set(['pass']);
function sanitizeText(text) {
    return String(text ?? '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH);
}
function normalize(input) {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[013457@$!]/g, (ch) => LEET[ch] ?? ch)
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/(.)\1{2,}/g, '$1$1')
        .replace(/[^a-zа-яёіїєґ0-9]+/giu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function compileTerms(terms) {
    const cached = termCache.get(terms);
    if (cached)
        return cached;
    const compiled = terms
        .map((term) => {
        const normalized = normalize(term);
        const termCompacted = normalized.replace(/\s+/g, '');
        return {
            normalized,
            compacted: termCompacted,
            compactMatch: termCompacted.length >= 5,
        };
    })
        // Мусор блоклиста ("a**"→"a", "am", "cu", "xx" после лит-нормализации)
        // вырождается в 1-2 символа и по word-boundary матчил ЛЮБОЙ текст со
        // словами "a"/"I am" → ложный blocked на невинных сообщениях. Дропаем
        // термы короче 3 символов (легитимные секс/identity-термы все ≥3).
        .filter((term) => term.compacted.length >= 3 && !ALLOWED_NORMALIZED_TERMS.has(term.normalized));
    termCache.set(terms, compiled);
    return compiled;
}
function containsTerm(normalized, compacted, terms) {
    const padded = ` ${normalized} `;
    return compileTerms(terms).some((term) => {
        if (!term.normalized)
            return false;
        if (padded.includes(` ${term.normalized} `))
            return true;
        return term.compactMatch && compacted.includes(term.compacted);
    });
}
function containsBlockedPattern(normalized, compacted) {
    return BLOCK_PATTERNS.some((re) => re.test(normalized) || re.test(compacted));
}
function uniq(items) {
    return Array.from(new Set(items));
}
function moderate(text) {
    const normalizedText = normalize(text);
    const compacted = normalizedText.replace(/\s+/g, '');
    const categories = [];
    const reasons = [];
    if (text.length > MAX_MESSAGE_LENGTH) {
        categories.push('length');
        reasons.push('message_too_long');
    }
    if (LINK_RE.test(text)) {
        categories.push('link');
        reasons.push('external_link');
    }
    if (EMAIL_RE.test(text) || PHONE_RE.test(text) || HANDLE_RE.test(text)) {
        categories.push('contact');
        reasons.push('external_contact');
    }
    if (/(.)\1{8,}/u.test(text)) {
        categories.push('spam');
        reasons.push('spam_pattern');
    }
    if (containsTerm(normalizedText, compacted, BLOCK_TERMS) || containsBlockedPattern(normalizedText, compacted)) {
        categories.push('profanity');
        reasons.push('blocked_term');
    }
    if (HATE_PATTERNS.some((re) => re.test(normalizedText))) {
        categories.push('hate');
        reasons.push('hate_or_harassment_pattern');
    }
    if (containsTerm(normalizedText, compacted, SEXUAL_TERMS)) {
        categories.push('sexual');
        reasons.push('sexual_content');
    }
    if (containsTerm(normalizedText, compacted, REVIEW_IDENTITY_TERMS)) {
        categories.push('identity');
        reasons.push('protected_identity_context');
    }
    if (/(?:\bты\b|\byou\b).{0,24}(?:туп|дебил|идиот|лох|stupid|idiot|dumb)/i.test(normalizedText)) {
        categories.push('insult');
        reasons.push('direct_insult');
    }
    if (/(?:убью|зарежу|сломаю|kill you|hurt you)/i.test(normalizedText)) {
        categories.push('threat');
        reasons.push('threat');
    }
    const uniqueCategories = uniq(categories);
    const status = uniqueCategories.some((c) => c !== 'identity') ? 'blocked' : uniqueCategories.includes('identity') ? 'review' : 'clean';
    return { status, categories: uniqueCategories, reasons: uniq(reasons), normalizedText };
}
function readNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
async function assertActiveChatUser(db, stableUid, authUid, room) {
    const [groupSnap, userSnap, leaderboardSnap, bannedSnap, chatBanSnap] = await Promise.all([
        db.collection('league_groups').doc(room.groupId).get(),
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('leaderboard').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
        db.collection('league_chat_bans').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
    const chatBan = chatBanSnap?.data() || {};
    const mutedUntil = readNumber(chatBan.mutedUntil);
    if (chatBan.status === 'banned' || mutedUntil > Date.now()) {
        throw new https_1.HttpsError('permission-denied', 'chat_restricted');
    }
    if (!groupSnap.exists)
        throw new https_1.HttpsError('not-found', 'league_group_not_found');
    const group = groupSnap.data() || {};
    if (group.weekId !== room.weekId || Math.trunc(Number(group.leagueId) || 0) !== room.leagueId) {
        throw new https_1.HttpsError('permission-denied', 'room_mismatch');
    }
    const leaderboard = leaderboardSnap?.data() || {};
    if (leaderboard.groupId !== room.groupId ||
        leaderboard.groupWeekId !== room.weekId ||
        Math.trunc(Number(leaderboard.leagueId) || 0) !== room.leagueId ||
        (leaderboard.firebaseAuthUid && leaderboard.firebaseAuthUid !== authUid)) {
        throw new https_1.HttpsError('permission-denied', 'leaderboard_room_mismatch');
    }
    const member = group.members?.[stableUid];
    if (!member)
        throw new https_1.HttpsError('permission-denied', 'not_league_member');
    return { member, userData: userSnap?.data() || {} };
}
async function grantRoomReadAccess(db, authUid, stableUid, room) {
    const ref = db
        .collection('league_chat_members')
        .doc(authUid)
        .collection('rooms')
        .doc(room.groupId);
    const existing = await ref.get().catch(() => null);
    const data = existing?.data() || {};
    if (existing?.exists &&
        data.weekId === room.weekId &&
        Math.trunc(Number(data.leagueId) || 0) === room.leagueId &&
        String(data.authUid || '') === authUid &&
        String(data.stableUid || '') === stableUid) {
        return;
    }
    await ref.set({
        ...room,
        authUid,
        stableUid,
        authorizedAt: Date.now(),
        updatedAt: Date.now(),
    }, { merge: true });
}
exports.leagueChatAuthorizeRoom = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    const groupId = String(request.data?.groupId ?? '').trim();
    const weekId = String(request.data?.weekId ?? '').trim();
    const leagueId = Math.trunc(Number(request.data?.leagueId) || 0);
    if (!groupId || !weekId)
        throw new https_1.HttpsError('invalid-argument', 'room_required');
    await assertActiveChatUser(db, stableUid, authUid, { groupId, weekId, leagueId });
    await grantRoomReadAccess(db, authUid, stableUid, { groupId, weekId, leagueId });
    return { ok: true };
});
exports.leagueChatSendMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    const text = sanitizeText(request.data?.text);
    const groupId = String(request.data?.groupId ?? '').trim();
    const weekId = String(request.data?.weekId ?? '').trim();
    const leagueId = Math.trunc(Number(request.data?.leagueId) || 0);
    const replyToMessageId = String(request.data?.replyToMessageId ?? '').trim().slice(0, 160);
    if (!text)
        throw new https_1.HttpsError('invalid-argument', 'empty_message');
    if (!groupId || !weekId)
        throw new https_1.HttpsError('invalid-argument', 'room_required');
    const now = Date.now();
    const rateRef = db.collection('league_chat_rate_limits').doc(stableUid);
    const [rateSnap, active] = await Promise.all([
        rateRef.get(),
        assertActiveChatUser(db, stableUid, authUid, { groupId, weekId, leagueId }),
    ]);
    const lastSendAt = Number(rateSnap.data()?.lastSendAt || 0);
    if (now - lastSendAt < SEND_THROTTLE_MS) {
        throw new https_1.HttpsError('resource-exhausted', 'send_throttled');
    }
    const member = active.member || {};
    const progress = (active.userData?.progress || {});
    const moderation = moderate(text);
    // Реплай как в Telegram: цитата денормализуется в сам док сообщения.
    // Невалидная цель (чужая комната/удалено) → сообщение уходит без цитаты.
    let replyTo = null;
    if (replyToMessageId) {
        const replySnap = await db.collection('league_chat_messages').doc(replyToMessageId).get();
        const reply = replySnap.data() || {};
        const sameRoom = String(reply.groupId || '') === groupId && String(reply.weekId || '') === weekId;
        if (replySnap.exists && sameRoom && reply.status === 'visible') {
            const i18n = (reply.i18n && typeof reply.i18n === 'object') ? reply.i18n : {};
            const quoteText = String(reply.text || i18n.en || Object.values(i18n)[0] || '').slice(0, 140);
            replyTo = {
                messageId: replyToMessageId,
                authorUid: String(reply.authorUid || '').slice(0, 160),
                authorName: String(reply.authorName || '').slice(0, 48),
                text: quoteText,
                kind: reply.kind === 'system' ? 'system' : 'user',
            };
        }
    }
    const base = {
        groupId,
        weekId,
        leagueId,
        authorUid: stableUid,
        authorAuthUid: authUid,
        authorName: String(member.name || progress.user_name || 'Player').slice(0, 48),
        authorAvatar: String(member.avatar || progress.user_avatar || ''),
        authorAura: String(member.aura || progress.user_avatar_aura || ''),
        text,
        normalizedText: moderation.normalizedText,
        moderationCategories: moderation.categories,
        moderationReasons: moderation.reasons,
        ...(replyTo ? {
            replyToMessageId: replyTo.messageId,
            replyToAuthorUid: replyTo.authorUid,
            replyToAuthorName: replyTo.authorName,
            replyToText: replyTo.text,
            replyToKind: replyTo.kind,
        } : {}),
        platform: String(request.data?.platform || ''),
        appVersion: String(request.data?.appVersion || ''),
        createdAt: now,
        updatedAt: now,
    };
    await rateRef.set({ lastSendAt: now, updatedAt: now }, { merge: true });
    await grantRoomReadAccess(db, authUid, stableUid, { groupId, weekId, leagueId });
    if (moderation.status === 'blocked') {
        await db.collection('league_chat_moderation_queue').add({ ...base, status: 'blocked', decision: 'auto_blocked' });
        return { ok: false, status: 'blocked', categories: moderation.categories };
    }
    if (moderation.status === 'review') {
        await db.collection('league_chat_moderation_queue').add({ ...base, status: 'review', decision: 'pending' });
        return { ok: false, status: 'review', categories: moderation.categories };
    }
    const ref = await db.collection('league_chat_messages').add({
        ...base,
        status: 'visible',
        reportCount: 0,
    });
    // Центр событий: «X ответил на ваше сообщение» — только живому юзеру и не себе.
    if (replyTo && replyTo.kind === 'user' && replyTo.authorUid && replyTo.authorUid !== stableUid) {
        await (0, user_notifications_1.userNotificationRef)(db, replyTo.authorUid).set((0, user_notifications_1.buildUserNotification)({
            type: 'league_chat_reply',
            fromUid: stableUid,
            fromName: base.authorName,
            fromAvatar: base.authorAvatar,
            text: text.slice(0, 140),
            nav: { kind: 'league_chat', groupId, weekId, leagueId, messageId: ref.id },
        }, now)).catch(() => { });
    }
    return { ok: true, status: 'sent', messageId: ref.id };
});
exports.leagueChatDeleteMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    const messageId = String(request.data?.messageId ?? '').trim();
    if (!messageId)
        throw new https_1.HttpsError('invalid-argument', 'message_required');
    const now = Date.now();
    const messageRef = db.collection('league_chat_messages').doc(messageId);
    await db.runTransaction(async (tx) => {
        const messageSnap = await tx.get(messageRef);
        if (!messageSnap.exists)
            throw new https_1.HttpsError('not-found', 'message_not_found');
        const message = messageSnap.data() || {};
        if (message.status === 'deleted')
            return;
        if (message.status !== 'visible')
            throw new https_1.HttpsError('failed-precondition', 'message_not_visible');
        if (String(message.authorUid || '') !== stableUid && String(message.authorAuthUid || '') !== authUid) {
            throw new https_1.HttpsError('permission-denied', 'not_message_author');
        }
        await assertActiveChatUser(db, stableUid, authUid, {
            groupId: String(message.groupId || ''),
            weekId: String(message.weekId || ''),
            leagueId: Math.trunc(Number(message.leagueId) || 0),
        });
        tx.update(messageRef, {
            status: 'deleted',
            deletedAt: now,
            deletedByUid: stableUid,
            deletedByAuthUid: authUid,
            updatedAt: now,
        });
    });
    return { ok: true };
});
exports.leagueChatReportMessage = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid, request.data?.stableId);
    const messageId = String(request.data?.messageId ?? '').trim();
    const reason = sanitizeText(request.data?.reason).slice(0, MAX_REPORT_REASON_LENGTH);
    if (!messageId)
        throw new https_1.HttpsError('invalid-argument', 'message_required');
    if (!reason)
        throw new https_1.HttpsError('invalid-argument', 'reason_required');
    const now = Date.now();
    const rateRef = db.collection('league_chat_report_rate_limits').doc(stableUid);
    const messageRef = db.collection('league_chat_messages').doc(messageId);
    const reportRef = db.collection('league_chat_reports').doc(`${messageId}_${stableUid}`);
    await db.runTransaction(async (tx) => {
        const [rateSnap, messageSnap, reportSnap] = await Promise.all([
            tx.get(rateRef),
            tx.get(messageRef),
            tx.get(reportRef),
        ]);
        const lastReportAt = Number(rateSnap.data()?.lastReportAt || 0);
        if (now - lastReportAt < REPORT_THROTTLE_MS)
            throw new https_1.HttpsError('resource-exhausted', 'report_throttled');
        if (reportSnap.exists)
            throw new https_1.HttpsError('already-exists', 'report_already_exists');
        if (!messageSnap.exists)
            throw new https_1.HttpsError('not-found', 'message_not_found');
        const message = messageSnap.data() || {};
        if (message.status !== 'visible')
            throw new https_1.HttpsError('failed-precondition', 'message_not_visible');
        await assertActiveChatUser(db, stableUid, authUid, {
            groupId: String(message.groupId || ''),
            weekId: String(message.weekId || ''),
            leagueId: Math.trunc(Number(message.leagueId) || 0),
        });
        tx.create(reportRef, {
            messageId,
            groupId: message.groupId,
            weekId: message.weekId,
            leagueId: message.leagueId,
            authorUid: message.authorUid,
            authorName: message.authorName,
            messageText: message.text,
            reason,
            reporterUid: stableUid,
            reporterAuthUid: authUid,
            status: 'new',
            createdAt: now,
            updatedAt: now,
        });
        tx.update(messageRef, {
            reportCount: admin.firestore.FieldValue.increment(1),
            updatedAt: now,
        });
        tx.set(rateRef, { lastReportAt: now, updatedAt: now }, { merge: true });
    });
    return { ok: true };
});
//# sourceMappingURL=league_chat.js.map