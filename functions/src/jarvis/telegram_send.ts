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
  if (!input.botToken || !input.chatId || !input.text.trim()) return false;

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
      return false;
    }
    return true;
  } catch (error) {
    logger.error('jarvis_digest: sendMessage threw', error);
    return false;
  }
}
