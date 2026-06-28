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
/** Префикс callback'а кнопки «Ответить» под пересланным сообщением. */
export const SUPPORT_CALLBACK_REPLY_PREFIX = 'sr:';

export const SUPPORT_PROMPT_RU = [
  'Напишите ваше сообщение — мы передадим его в центр поддержки.',
  'Ответ придёт прямо в этот чат.',
].join('\n');
const SUPPORT_SENT_RU = 'Сообщение отправлено в поддержку. Ответ придёт прямо в этот чат. Можно дописать ещё.';
const SUPPORT_CANCELLED_RU = 'Вы вышли из чата поддержки.';
const SUPPORT_UNAVAILABLE_RU = 'Не удалось отправить сообщение. Попробуйте, пожалуйста, позже.';
const SUPPORT_TEXT_ONLY_RU = 'Пока поддержка принимает только текстовые сообщения. Напишите, пожалуйста, текстом.';
const SUPPORT_REPLY_PREFIX_RU = 'Ответ поддержки:';

const SUPPORT_ADMIN_REPLY_CANCELLED_RU = 'Ответ отменён.';
const SUPPORT_ADMIN_REPLY_TEXT_ONLY_RU = 'Напишите ответ текстом — он уйдёт пользователю. /cancel — отмена.';
const SUPPORT_ADMIN_REPLY_THREAD_GONE_RU = '⚠️ Не удалось открыть ответ. Напишите так: /reply <id> <текст>';

const STATE_COLLECTION = 'telegram_support_state';
const THREADS_COLLECTION = 'telegram_support_threads';
const ADMIN_REPLY_COLLECTION = 'telegram_support_admin_reply';

/** Сколько режим «жду ответ админа» живёт, пока админ не написал текст. */
const ADMIN_REPLY_TTL_MS = 30 * 60 * 1000;

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
  /** Редактирует уже отправленное сообщение (для пометки «✅ Отвечено»). */
  editMessageText: (token: string, chatId: number | string, messageId: number | string, text: string, options?: Record<string, unknown>) => Promise<unknown>;
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

/**
 * Callback кнопки «Ответить». Кодируем ТОЛЬКО message_id админа (он маленький,
 * per-chat), id юзера НИКОГДА не кладём в callback_data — он может быть огромным.
 * Юзер восстанавливается из telegram_support_threads/{adminId}_{messageId}.
 * Если message_id отсутствует — возвращаем заведомо невалидную строку, чтобы
 * parseSupportReplyCallback её отверг (никаких «sr:undefined»).
 */
export function buildSupportReplyCallback(adminMessageId: number | string | null | undefined): string {
  return `${SUPPORT_CALLBACK_REPLY_PREFIX}${adminMessageId ?? ''}`;
}

/** Разбор «sr:<message_id>». Оба конца заякорены, только цифры. null = не наш. */
export function parseSupportReplyCallback(data: string): { adminMessageId: string } | null {
  const match = /^sr:(\d+)$/.exec(String(data ?? ''));
  return match ? { adminMessageId: match[1] } : null;
}

type SupportReplyKeyboard = { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };

/**
 * Inline-клавиатура с одной кнопкой «✍️ Ответить <Имя>». Имя живёт ТОЛЬКО в
 * тексте кнопки, в callback_data его нет — поэтому эмодзи/кавычки/длинное имя не
 * могут переполнить или сломать callback. Без message_id кнопку не строим.
 */
export function supportReplyKeyboard(adminMessageId: number | string | null | undefined, name: string): SupportReplyKeyboard | null {
  if (adminMessageId == null || String(adminMessageId).trim() === '') return null;
  const safeName = String(name ?? '').trim() || 'пользователю';
  return {
    inline_keyboard: [[{ text: `✍️ Ответить ${safeName}`, callback_data: buildSupportReplyCallback(adminMessageId) }]],
  };
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

// ── Состояние «админ пишет ответ конкретному юзеру» ───────────────────────────
// Отдельная коллекция, ключ = id САМОГО админа. Не пересекается с
// telegram_support_state (там ключ — id юзера) даже если один человек и админ, и
// пользователь поддержки: это разные коллекции.

type AdminAwaitingReply = {
  targetUserId: string;
  targetChatId: string;
  targetName: string;
  originAdminChatId: string;
  originAdminMessageId: number;
};

function adminReplyStateRef(adminId: number | string) {
  return db().collection(ADMIN_REPLY_COLLECTION).doc(String(adminId));
}

/** Включает режим «жду текст ответа» для админа, нацеленный на одного юзера. */
export async function setAdminAwaitingReply(adminId: number | string, payload: AdminAwaitingReply): Promise<void> {
  await adminReplyStateRef(adminId).set({
    mode: 'awaiting_admin_reply',
    targetUserId: payload.targetUserId,
    targetChatId: payload.targetChatId,
    targetName: payload.targetName,
    originAdminChatId: payload.originAdminChatId,
    originAdminMessageId: payload.originAdminMessageId,
    updatedAtMs: Date.now(),
  }, { merge: true });
}

/**
 * Читает активный режим ответа админа. Возвращает null, если режим не включён
 * ИЛИ протух (TTL) — чтобы забытый режим никогда не «съедал» обычные сообщения.
 */
export async function readAdminAwaitingReply(adminId: number | string): Promise<AdminAwaitingReply | null> {
  const snap = await adminReplyStateRef(adminId).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.mode !== 'awaiting_admin_reply') return null;
  if (!data.targetUserId) return null;
  const updatedAtMs = Number(data.updatedAtMs || 0);
  if (Date.now() - updatedAtMs > ADMIN_REPLY_TTL_MS) return null;
  return {
    targetUserId: String(data.targetUserId),
    targetChatId: String(data.targetChatId || data.targetUserId),
    targetName: String(data.targetName || ''),
    originAdminChatId: String(data.originAdminChatId || ''),
    originAdminMessageId: Number(data.originAdminMessageId || 0),
  };
}

/** Сбрасывает режим ответа админа (one-shot после доставки, /cancel, /start и т.п.). */
export async function clearAdminAwaitingReply(adminId: number | string): Promise<void> {
  try {
    await adminReplyStateRef(adminId).set({ mode: 'idle', updatedAtMs: Date.now() }, { merge: true });
  } catch (e) {
    console.error('telegram_support: clearAdminAwaitingReply failed', adminId, e);
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
  const buttonName = String(user?.first_name || user?.username || (user?.id ?? '')).trim();
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
        // Кнопку «Ответить» можно прикрепить только зная message_id, который
        // известен лишь после отправки → добавляем её правкой того же сообщения.
        // Best-effort: если правка не прошла, у админа остаётся /reply и свайп.
        const keyboard = supportReplyKeyboard(adminMessageId, buttonName);
        if (keyboard) {
          await deps.editMessageText(token, adminId, adminMessageId, forwardText, { reply_markup: keyboard })
            .catch((e) => console.error('telegram_support: attach reply button failed', adminId, e));
        }
      }
    } catch (e) {
      console.error('telegram_support: forward to admin failed', adminId, e);
    }
  }
  return delivered > 0;
}

/**
 * Доставляет ответ админа юзеру и подтверждает админу.
 * @returns true, если сообщение реально ушло юзеру (false при сбое доставки).
 * Возвращаемое значение нужно, чтобы пометку «✅ Отвечено» на карточке ставить
 * ТОЛЬКО после подтверждённой доставки. Старые call-site'ы значение игнорируют.
 */
async function deliverAdminReply(
  token: string,
  adminChatId: number | string,
  targetChatId: string,
  targetUserId: string,
  replyText: string,
  deps: SupportDeps,
  confirmLabel?: string,
): Promise<boolean> {
  try {
    await deps.sendMessage(token, targetChatId, `${SUPPORT_REPLY_PREFIX_RU}\n${truncateForForward(replyText)}`);
    await deps.sendMessage(token, adminChatId, confirmLabel || `✅ Отправлено пользователю ${targetUserId}.`);
    return true;
  } catch (e) {
    console.error('telegram_support: deliver reply failed', targetUserId, e);
    await deps.sendMessage(
      token,
      adminChatId,
      `Не удалось доставить ответ пользователю ${targetUserId} (возможно, он заблокировал бота).`,
    ).catch(() => undefined);
    return false;
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

  // Админ в режиме «жду ответ» (нажал кнопку «Ответить»): следующий ТЕКСТ —
  // это ответ юзеру. Стоит ВЫШЕ свайп-reply и user-forwarding, но ниже команд.
  if (await deps.isAdmin(userId)) {
    const awaiting = await readAdminAwaitingReply(userId);
    if (awaiting) {
      // Команда вместо текста (/start, /orders, /cancel…): выходим из режима.
      if (text.startsWith('/')) {
        await clearAdminAwaitingReply(userId);
        if (text === '/cancel' || text === '/отмена') {
          await deps.sendMessage(token, chatId, SUPPORT_ADMIN_REPLY_CANCELLED_RU);
          return true;
        }
        return false; // пусть команду обработает бот-файл
      }
      // Не-текст / пусто: не отправляем пустой ответ, режим держим.
      if (!text) {
        await deps.sendMessage(token, chatId, SUPPORT_ADMIN_REPLY_TEXT_ONLY_RU);
        return true;
      }
      const nameLabel = awaiting.targetName || awaiting.targetUserId;
      const delivered = await deliverAdminReply(
        token, chatId, awaiting.targetChatId, awaiting.targetUserId, text, deps,
        `✅ Отправлено ${nameLabel}`,
      );
      // Карточку помечаем «Отвечено» ТОЛЬКО при подтверждённой доставке.
      if (delivered && awaiting.originAdminChatId && awaiting.originAdminMessageId) {
        await deps.editMessageText(
          token, awaiting.originAdminChatId, awaiting.originAdminMessageId,
          `✅ Отвечено · ${nameLabel}`,
        ).catch((e) => console.error('telegram_support: mark answered failed', userId, e));
      }
      await clearAdminAwaitingReply(userId); // one-shot в любом случае
      return true;
    }
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
 * originMessageId — message_id того сообщения, под которым нажата кнопка
 * (нужно для кнопки «Ответить», чтобы найти тред и потом пометить «Отвечено»).
 */
export async function tryHandleSupportCallback(
  token: string,
  data: string,
  chatId: number | string,
  user: SupportTelegramUser | undefined,
  deps: SupportDeps,
  originMessageId?: number | string,
): Promise<boolean> {
  if (data === SUPPORT_CALLBACK_START) {
    await startSupportDialog(token, chatId, user, deps);
    return true;
  }
  if (data === SUPPORT_CALLBACK_CANCEL) {
    if (user?.id != null) await cancelSupportDialog(token, chatId, user.id, deps);
    return true;
  }

  // Кнопка «✍️ Ответить <Имя>» под пересланным сообщением.
  const replyTarget = parseSupportReplyCallback(data);
  if (replyTarget) {
    const adminId = user?.id;
    // Только админ может войти в режим ответа.
    if (adminId == null || !(await deps.isAdmin(adminId))) return false;
    // Восстанавливаем юзера из треда «адмін + message_id».
    const threadSnap = await db().collection(THREADS_COLLECTION)
      .doc(supportThreadDocId(adminId, replyTarget.adminMessageId))
      .get();
    const thread = threadSnap.exists ? (threadSnap.data() || {}) : null;
    const targetUserId = String(thread?.userTelegramId || '');
    if (!thread || !targetUserId) {
      await deps.sendMessage(token, chatId, SUPPORT_ADMIN_REPLY_THREAD_GONE_RU);
      return true;
    }
    const targetName = String(thread.firstName || thread.username || targetUserId).trim() || targetUserId;
    await setAdminAwaitingReply(adminId, {
      targetUserId,
      targetChatId: String(thread.userChatId || targetUserId),
      targetName,
      originAdminChatId: String(chatId),
      originAdminMessageId: Number(originMessageId || replyTarget.adminMessageId),
    });
    await deps.sendMessage(
      token, chatId,
      `✍️ Напишите ответ для ${targetName} одним сообщением — он уйдёт пользователю. /cancel — отмена.`,
    );
    return true;
  }

  return false;
}
