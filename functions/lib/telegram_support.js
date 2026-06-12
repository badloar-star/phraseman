"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// telegram_support.ts — чат поддержки внутри премиум-бота Telegram.
//
// Поток: юзер жмёт «Связаться с поддержкой» (reply-кнопка / inline / /support)
// → бот просит написать сообщение и ставит режим awaiting_message в
// telegram_support_state/{telegramUserId} → каждый текст юзера в этом режиме
// пересылается ВСЕМ админам бота (adminUserIds из telegram_premium_bot/config,
// саморегистрация через /admin_setup) → админ отвечает reply'ем на пересланное
// сообщение или командой /reply <id> <текст> → ответ уходит конкретному юзеру.
//
// Маппинг «сообщение у админа ↔ юзер» хранится в
// telegram_support_threads/{adminId}_{adminMessageId} — у каждого юзера свой
// отдельный диалог, ответы не перепутываются.
//
// Режим липкий: юзер может писать несколько сообщений подряд. Выход — кнопка
// «Отмена», /start, /premium или кнопка оплаты (бот-файл зовёт clearSupportState).
//
// Премиум-активация остаётся РУЧНОЙ — этот модуль только переписка.
// ═══════════════════════════════════════════════════════════════════════════
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
exports.SUPPORT_PROMPT_RU = exports.SUPPORT_CALLBACK_CANCEL = exports.SUPPORT_CALLBACK_START = exports.SUPPORT_BUTTON_TEXT_RU = void 0;
exports.truncateForForward = truncateForForward;
exports.formatUserLabel = formatUserLabel;
exports.formatSupportForward = formatSupportForward;
exports.parseReplyCommand = parseReplyCommand;
exports.supportThreadDocId = supportThreadDocId;
exports.clearSupportState = clearSupportState;
exports.startSupportDialog = startSupportDialog;
exports.tryHandleSupportMessage = tryHandleSupportMessage;
exports.tryHandleSupportCallback = tryHandleSupportCallback;
const admin = __importStar(require("firebase-admin"));
exports.SUPPORT_BUTTON_TEXT_RU = 'Связаться с поддержкой';
exports.SUPPORT_CALLBACK_START = 'support:start';
exports.SUPPORT_CALLBACK_CANCEL = 'support:cancel';
exports.SUPPORT_PROMPT_RU = [
    'Напишите ваше сообщение — мы передадим его в центр поддержки.',
    'Ответ придёт прямо в этот чат.',
].join('\n');
const SUPPORT_SENT_RU = 'Сообщение отправлено в поддержку. Ответ придёт прямо в этот чат. Можно дописать ещё.';
const SUPPORT_CANCELLED_RU = 'Вы вышли из чата поддержки.';
const SUPPORT_UNAVAILABLE_RU = 'Не удалось отправить сообщение. Попробуйте, пожалуйста, позже.';
const SUPPORT_TEXT_ONLY_RU = 'Пока поддержка принимает только текстовые сообщения. Напишите, пожалуйста, текстом.';
const SUPPORT_REPLY_PREFIX_RU = 'Ответ поддержки:';
const STATE_COLLECTION = 'telegram_support_state';
const THREADS_COLLECTION = 'telegram_support_threads';
/** Лимит текста юзера в пересылке: 4096 (Telegram) минус обвязка с запасом. */
const FORWARD_TEXT_MAX = 3500;
// ── Чистые хелперы (покрыты тестами) ─────────────────────────────────────────
function truncateForForward(text, max = FORWARD_TEXT_MAX) {
    const clean = String(text ?? '').trim();
    return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}
function formatUserLabel(user) {
    const name = String(user?.first_name ?? '').trim();
    const username = String(user?.username ?? '').trim();
    const id = user?.id != null ? String(user.id) : '-';
    const parts = [name || 'Без имени'];
    if (username)
        parts.push(`@${username}`);
    parts.push(`id ${id}`);
    return parts.join(' · ');
}
/** Текст пересылки админу. Без parse_mode — бот везде шлёт plain text. */
function formatSupportForward(user, text) {
    const id = user?.id != null ? String(user.id) : '-';
    return [
        '📩 Поддержка — сообщение от пользователя',
        formatUserLabel(user),
        '',
        truncateForForward(text),
        '',
        `Ответить: сделайте reply на это сообщение или /reply ${id} <текст>`,
    ].join('\n');
}
/** Разбор «/reply 123456 текст ответа». null = не валидная команда. */
function parseReplyCommand(text) {
    const match = /^\/reply\s+(\d+)\s+([\s\S]+)$/.exec(String(text ?? '').trim());
    if (!match)
        return null;
    const replyText = match[2].trim();
    if (!replyText)
        return null;
    return { targetUserId: match[1], replyText };
}
function supportThreadDocId(adminUserId, adminMessageId) {
    return `${adminUserId}_${adminMessageId}`;
}
// ── Firestore-состояние ───────────────────────────────────────────────────────
function db() {
    return admin.firestore();
}
function stateRef(userId) {
    return db().collection(STATE_COLLECTION).doc(String(userId));
}
async function isAwaitingSupportMessage(userId) {
    const snap = await stateRef(userId).get();
    return snap.exists && snap.data()?.mode === 'awaiting_message';
}
/** Выход из режима поддержки без сообщения юзеру (для /start и кнопки оплаты). */
async function clearSupportState(userId) {
    try {
        await stateRef(userId).set({ mode: 'idle', updatedAtMs: Date.now() }, { merge: true });
    }
    catch (e) {
        console.error('telegram_support: clearSupportState failed', userId, e);
    }
}
// ── Диалоги ───────────────────────────────────────────────────────────────────
async function startSupportDialog(token, chatId, user, deps) {
    const userId = user?.id;
    if (!userId)
        return;
    await stateRef(userId).set({
        mode: 'awaiting_message',
        chatId: String(chatId),
        username: String(user?.username ?? ''),
        firstName: String(user?.first_name ?? ''),
        updatedAtMs: Date.now(),
    }, { merge: true });
    await deps.sendMessage(token, chatId, exports.SUPPORT_PROMPT_RU, {
        reply_markup: { inline_keyboard: [[{ text: 'Отмена', callback_data: exports.SUPPORT_CALLBACK_CANCEL }]] },
    });
}
async function cancelSupportDialog(token, chatId, userId, deps) {
    await clearSupportState(userId);
    await deps.sendMessage(token, chatId, SUPPORT_CANCELLED_RU);
}
/** Пересылает сообщение юзера всем админам, пишет thread-маппинг для reply-роутинга. */
async function forwardToAdmins(token, message, deps) {
    const user = message.from;
    const chatId = message.chat?.id;
    const adminIds = await deps.readAdminUserIds();
    if (adminIds.length === 0) {
        console.error('telegram_support: no adminUserIds configured — support message dropped');
        return false;
    }
    const forwardText = formatSupportForward(user, String(message.text ?? ''));
    let delivered = 0;
    for (const adminId of adminIds) {
        try {
            const result = await deps.sendMessage(token, adminId, forwardText);
            delivered += 1;
            const adminMessageId = result?.message_id;
            if (adminMessageId != null) {
                await db().collection(THREADS_COLLECTION)
                    .doc(supportThreadDocId(adminId, adminMessageId))
                    .set({
                    userTelegramId: String(user?.id ?? ''),
                    userChatId: String(chatId ?? user?.id ?? ''),
                    username: String(user?.username ?? ''),
                    firstName: String(user?.first_name ?? ''),
                    createdAtMs: Date.now(),
                    lastUserText: truncateForForward(String(message.text ?? ''), 500),
                }, { merge: true });
            }
        }
        catch (e) {
            console.error('telegram_support: forward to admin failed', adminId, e);
        }
    }
    return delivered > 0;
}
async function deliverAdminReply(token, adminChatId, targetChatId, targetUserId, replyText, deps) {
    try {
        await deps.sendMessage(token, targetChatId, `${SUPPORT_REPLY_PREFIX_RU}\n${truncateForForward(replyText)}`);
        await deps.sendMessage(token, adminChatId, `✅ Отправлено пользователю ${targetUserId}.`);
    }
    catch (e) {
        console.error('telegram_support: deliver reply failed', targetUserId, e);
        await deps.sendMessage(token, adminChatId, `Не удалось доставить ответ пользователю ${targetUserId} (возможно, он заблокировал бота).`).catch(() => undefined);
    }
}
// ── Точки входа для бот-файла ────────────────────────────────────────────────
/**
 * Пытается обработать входящее сообщение как поддержку.
 * true = обработано, бот-файлу больше ничего делать не надо.
 */
async function tryHandleSupportMessage(token, message, deps) {
    const chatId = message.chat?.id;
    const userId = message.from?.id;
    if (!chatId || !userId)
        return false;
    const text = String(message.text ?? '').trim();
    // Вход в чат поддержки: кнопка или команда.
    if (text === exports.SUPPORT_BUTTON_TEXT_RU || text === '/support') {
        await startSupportDialog(token, chatId, message.from, deps);
        return true;
    }
    // Админ: /reply <id> <текст>.
    if (text.startsWith('/reply')) {
        if (!(await deps.isAdmin(userId))) {
            await deps.sendMessage(token, chatId, 'Нет доступа.');
            return true;
        }
        const parsed = parseReplyCommand(text);
        if (!parsed) {
            await deps.sendMessage(token, chatId, 'Напишите так: /reply <telegram_id> <текст ответа>');
            return true;
        }
        // Чат юзера = его telegram id в личке; state-док может хранить уточнённый chatId.
        const stateSnap = await stateRef(parsed.targetUserId).get();
        const targetChatId = String(stateSnap.data()?.chatId || parsed.targetUserId);
        await deliverAdminReply(token, chatId, targetChatId, parsed.targetUserId, parsed.replyText, deps);
        return true;
    }
    // Админ отвечает reply'ем на пересланное сообщение поддержки.
    const repliedToId = message.reply_to_message?.message_id;
    if (repliedToId != null && text && (await deps.isAdmin(userId))) {
        const threadSnap = await db().collection(THREADS_COLLECTION)
            .doc(supportThreadDocId(userId, repliedToId))
            .get();
        if (threadSnap.exists) {
            const thread = threadSnap.data() || {};
            const targetUserId = String(thread.userTelegramId || '');
            const targetChatId = String(thread.userChatId || targetUserId);
            if (targetUserId) {
                await deliverAdminReply(token, chatId, targetChatId, targetUserId, text, deps);
                return true;
            }
        }
        // reply не на тред поддержки — отдаём бот-файлу как обычное сообщение.
    }
    // Юзер в режиме поддержки: пересылаем каждое сообщение.
    if (await isAwaitingSupportMessage(userId)) {
        if (!text) {
            await deps.sendMessage(token, chatId, SUPPORT_TEXT_ONLY_RU);
            return true;
        }
        const delivered = await forwardToAdmins(token, message, deps);
        await stateRef(userId).set({ lastMessageAtMs: Date.now() }, { merge: true });
        await deps.sendMessage(token, chatId, delivered ? SUPPORT_SENT_RU : SUPPORT_UNAVAILABLE_RU);
        return true;
    }
    return false;
}
/**
 * Пытается обработать callback inline-кнопок поддержки.
 * true = обработано (callback уже отвечен бот-файлом до вызова).
 */
async function tryHandleSupportCallback(token, data, chatId, user, deps) {
    if (data === exports.SUPPORT_CALLBACK_START) {
        await startSupportDialog(token, chatId, user, deps);
        return true;
    }
    if (data === exports.SUPPORT_CALLBACK_CANCEL) {
        if (user?.id != null)
            await cancelSupportDialog(token, chatId, user.id, deps);
        return true;
    }
    return false;
}
//# sourceMappingURL=telegram_support.js.map