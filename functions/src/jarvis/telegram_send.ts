import { logger } from 'firebase-functions';
import type { InlineKeyboard } from './telegram_buttons';

/**
 * Отправка сводки Джарвиса С КНОПКАМИ.
 *
 * зачем не переиспользовать sendTelegramAlert: тот шлёт только текст и не
 * умеет reply_markup. Добавлять клавиатуру в общий отправщик алертов рискованно —
 * он завязан на другие сценарии; здесь нужен свой, узкий путь.
 *
 * Получатель берётся из СЕКРЕТА, а не из admin_config/alerts: полномочия
 * подтверждать действия не должны зависеть от документа, редактируемого
 * из браузера.
 */

const TELEGRAM_API = 'https://api.telegram.org';

export interface SendJarvisDigestInput {
  readonly botToken: string;
  readonly chatId: string;
  readonly text: string;
  readonly keyboard: InlineKeyboard | null;
}

/** Никогда не бросает: неудачная отправка не должна валить суточный крон. */
export async function sendJarvisDigest(input: SendJarvisDigestInput): Promise<boolean> {
  return (await sendJarvisDigestMessage(input)) !== null;
}

/**
 * То же, но возвращает message_id отправленного сообщения.
 *
 * зачем (владелец, 2026-08-17: «я нажал уже кучу раз, а оно всё приходит»):
 * карточка ответа пересоздаётся каждый час, и в чате копятся ПЯТЬ карточек с
 * живыми на вид кнопками. Владелец жал на старую версию — её токен уже
 * погашен, нажатие уходило в пустоту, и выглядело это как «система не
 * работает». Чтобы гасить кнопки прежней карточки, нужен её message_id;
 * прежняя версия возвращала только true/false и номер терялся.
 *
 * зачем не менять сигнатуру sendJarvisDigest: её зовут суточные кроны
 * Джарвиса, которым номер сообщения не нужен. Меняя общий контракт ради
 * одного места, я бы задел чужие вызовы.
 */
export async function sendJarvisDigestMessage(input: SendJarvisDigestInput): Promise<number | null> {
  if (!input.botToken || !input.chatId || !input.text.trim()) return null;

  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    text: input.text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (input.keyboard) body.reply_markup = input.keyboard;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${input.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logger.error('jarvis_digest: sendMessage failed', res.status, detail.slice(0, 300));
      return null;
    }
    // зачем 0 при неразобранном ответе: отправка УДАЛАСЬ, и вернуть null
    // значило бы соврать вызывающему, что письмо не ушло. Ноль означает
    // «отправлено, но номер неизвестен» — гасить будет нечего, не более.
    const payload = await res.json().catch(() => null) as { result?: { message_id?: unknown } } | null;
    const messageId = Number(payload?.result?.message_id ?? 0);
    return Number.isSafeInteger(messageId) && messageId > 0 ? messageId : 0;
  } catch (error) {
    logger.error('jarvis_digest: sendMessage threw', error);
    return null;
  }
}

/**
 * Снимает кнопки у прежней карточки и помечает её устаревшей.
 *
 * зачем править текст, а не удалять сообщение: удаление стирает историю —
 * владелец не увидит, что бот предлагал раньше. Приписка «версия устарела»
 * оставляет след и при этом убирает кнопки, на которые бесполезно жать.
 *
 * Никогда не бросает: не смогли погасить — это косметика, а не сбой отправки.
 */
export async function expireJarvisCardButtons(input: {
  readonly botToken: string;
  readonly chatId: string;
  readonly messageId: number;
  readonly note: string;
}): Promise<boolean> {
  if (!input.botToken || !input.chatId || !Number.isSafeInteger(input.messageId) || input.messageId <= 0) {
    return false;
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${input.botToken}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: input.chatId,
        message_id: input.messageId,
        reply_markup: { inline_keyboard: [] },
      }),
    });
    return res.ok;
  } catch (error) {
    logger.warn('jarvis_digest: expire buttons failed', error);
    return false;
  }
}
