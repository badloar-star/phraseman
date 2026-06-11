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

import * as admin from 'firebase-admin';

export const SUPPORT_BUTTON_TEXT_RU = 'Связаться с поддержкой';
export const SUPPORT_CALLBACK_START = 'support:start';
export const SUPPORT_CALLBACK_CANCEL = 'support:cancel';

export const SUPPORT_PROMPT_RU = [
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

type SupportTelegramUser = {
  id?: number;
  username?: string;
  first_name?: string;
};

type SupportMessage = {
  message_id?: number;
  chat?: { id?: number | string };
  from?: SupportTelegramUser;
  text?: string;
  reply_to_message?: { message_id?: number };
};

/** Зависимости из бот-файла: единый Telegram-клиент и реестр админов. */
export type SupportDeps = {
  sendMessage: (token: string, chatId: number | string, text: string, options?: Record<string, unknown>) => Promise<unknown>;
  isAdmin: (userId: number | string) => Promise<boolean>;
  readAdminUserIds: () => Promise<string[]>;
};

// ── Чистые хелперы (покрыты тестами) ─────────────────────────────────────────

export function truncateForForward(text: string, max: number = FORWARD_TEXT_MAX): string {
  const clean = String(text ?? '').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

export function formatUserLabel(user: SupportTelegramUser | undefined): string {
  const name = String(user?.first_name ?? '').trim();
  const username = String(user?.username ?? '').trim();
  const id = user?.id != null ? String(user.id) : '-';
  const parts = [name || 'Без имени'];
  if (username) parts.push(`@${username}`);
  parts.push(`id ${id}`);
  return parts.join(' · ');
}

/** Текст пересылки админу. Без parse_mode — бот везде шлёт plain text. */
export function formatSupportForward(user: SupportTelegramUser | undefined, text: string): string {
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
export function parseReplyCommand(text: string): { targetUserId: string; replyText: string } | null {
  const match = /^\/reply\s+(\d+)\s+([\s\S]+)$/.exec(String(text ?? '').trim());
  if (!match) return null;
  const replyText = match[2].trim();
  if (!replyText) return null;
  return { targetUserId: match[1], replyText };
}

export function supportThreadDocId(adminUserId: number | string, adminMessageId: number | string): string {
  return `${adminUserId}_${adminMessageId}`;
}

// ── Firestore-состояние ───────────────────────────────────────────────────────

function db(): FirebaseFirestore.Firestore {
  return admin.firestore();
}

function stateRef(userId: number | string) {
  return db().collection(STATE_COLLECTION).doc(String(userId));
}

async function isAwaitingSupportMessage(userId: number | string): Promise<boolean> {
  const snap = await stateRef(userId).get();
  return snap.exists && snap.data()?.mode === 'awaiting_message';
}

/** Выход из режима поддержки без сообщения юзеру (для /start и кнопки оплаты). */
export async function clearSupportState(userId: number | string): Promise<void> {
  try {
    await stateRef(userId).set({ mode: 'idle', updatedAtMs: Date.now() }, { merge: true });
  } catch (e) {
    console.error('telegram_support: clearSupportState failed', userId, e);
  }
}

// ── Диалоги ───────────────────────────────────────────────────────────────────

export async function startSupportDialog(
  token: string,
  chatId: number | string,
  user: SupportTelegramUser | undefined,
  deps: SupportDeps,
): Promise<void> {
  const userId = user?.id;
  if (!userId) return;
  await stateRef(userId).set({
    mode: 'awaiting_message',
    chatId: String(chatId),
    username: String(user?.username ?? ''),
    firstName: String(user?.first_name ?? ''),
    updatedAtMs: Date.now(),
  }, { merge: true });
  await deps.sendMessage(token, chatId, SUPPORT_PROMPT_RU, {
    reply_markup: { inline_keyboard: [[{ text: 'Отмена', callback_data: SUPPORT_CALLBACK_CANCEL }]] },
  });
}

async function cancelSupportDialog(
  token: string,
  chatId: number | string,
  userId: number | string,
  deps: SupportDeps,
): Promise<void> {
  await clearSupportState(userId);
  await deps.sendMessage(token, chatId, SUPPORT_CANCELLED_RU);
}

/** Пересылает сообщение юзера всем админам, пишет thread-маппинг для reply-роутинга. */
async function forwardToAdmins(
  token: string,
  message: SupportMessage,
  deps: SupportDeps,
): Promise<boolean> {
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
      const result = await deps.sendMessage(token, adminId, forwardText) as { message_id?: number } | null;
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
    } catch (e) {
      console.error('telegram_support: forward to admin failed', adminId, e);
    }
  }
  return delivered > 0;
}

async function deliverAdminReply(
  token: string,
  adminChatId: number | string,
  targetChatId: string,
  targetUserId: string,
  replyText: string,
  deps: SupportDeps,
): Promise<void> {
  try {
    await deps.sendMessage(token, targetChatId, `${SUPPORT_REPLY_PREFIX_RU}\n${truncateForForward(replyText)}`);
    await deps.sendMessage(token, adminChatId, `✅ Отправлено пользователю ${targetUserId}.`);
  } catch (e) {
    console.error('telegram_support: deliver reply failed', targetUserId, e);
    await deps.sendMessage(
      token,
      adminChatId,
      `Не удалось доставить ответ пользователю ${targetUserId} (возможно, он заблокировал бота).`,
    ).catch(() => undefined);
  }
}

// ── Точки входа для бот-файла ────────────────────────────────────────────────

/**
 * Пытается обработать входящее сообщение как поддержку.
 * true = обработано, бот-файлу больше ничего делать не надо.
 */
export async function tryHandleSupportMessage(
  token: string,
  message: SupportMessage,
  deps: SupportDeps,
): Promise<boolean> {
  const chatId = message.chat?.id;
  const userId = message.from?.id;
  if (!chatId || !userId) return false;
  const text = String(message.text ?? '').trim();

  // Вход в чат поддержки: кнопка или команда.
  if (text === SUPPORT_BUTTON_TEXT_RU || text === '/support') {
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
export async function tryHandleSupportCallback(
  token: string,
  data: string,
  chatId: number | string,
  user: SupportTelegramUser | undefined,
  deps: SupportDeps,
): Promise<boolean> {
  if (data === SUPPORT_CALLBACK_START) {
    await startSupportDialog(token, chatId, user, deps);
    return true;
  }
  if (data === SUPPORT_CALLBACK_CANCEL) {
    if (user?.id != null) await cancelSupportDialog(token, chatId, user.id, deps);
    return true;
  }
  return false;
}
