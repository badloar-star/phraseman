const fs = require('fs');
const path = require('path');
const { stripTelegramHtml } = require('./core.cjs');

const TELEGRAM_API = 'https://api.telegram.org';

function assertBotToken(token) {
  if (!token) {
    throw new Error('Missing Telegram bot token. Set TELEGRAM_BOT_TOKEN or .codex-tmp/telegram-bridge/config.json.');
  }
}

async function telegramRequest(token, method, payload = {}) {
  assertBotToken(token);
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ok !== true) {
    const description = data && data.description ? data.description : `HTTP ${response.status}`;
    throw new Error(`Telegram ${method} failed: ${description}`);
  }
  return data.result;
}

async function telegramMultipartRequest(token, method, fields = {}, fileField, filePath) {
  assertBotToken(token);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  const bytes = fs.readFileSync(filePath);
  form.set(fileField, new Blob([bytes]), path.basename(filePath));
  const response = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: 'POST',
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ok !== true) {
    const description = data && data.description ? data.description : `HTTP ${response.status}`;
    throw new Error(`Telegram ${method} failed: ${description}`);
  }
  return data.result;
}

async function sendMessage(token, chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...options,
  };
  try {
    return await telegramRequest(token, 'sendMessage', payload);
  } catch (error) {
    if (payload.parse_mode === 'HTML' && /can't parse entities/i.test(error.message)) {
      const { parse_mode, ...fallbackPayload } = payload;
      return telegramRequest(token, 'sendMessage', {
        ...fallbackPayload,
        text: stripTelegramHtml(text),
      });
    }
    throw error;
  }
}

async function sendPhoto(token, chatId, filePath, options = {}) {
  const fields = {
    chat_id: chatId,
    ...options,
  };
  try {
    return await telegramMultipartRequest(token, 'sendPhoto', fields, 'photo', filePath);
  } catch (error) {
    if (fields.parse_mode === 'HTML' && /can't parse entities/i.test(error.message)) {
      const { parse_mode, ...fallbackFields } = fields;
      return telegramMultipartRequest(token, 'sendPhoto', {
        ...fallbackFields,
        caption: stripTelegramHtml(fields.caption || ''),
      }, 'photo', filePath);
    }
    throw error;
  }
}

async function sendDocument(token, chatId, filePath, options = {}) {
  const fields = {
    chat_id: chatId,
    ...options,
  };
  try {
    return await telegramMultipartRequest(token, 'sendDocument', fields, 'document', filePath);
  } catch (error) {
    if (fields.parse_mode === 'HTML' && /can't parse entities/i.test(error.message)) {
      const { parse_mode, ...fallbackFields } = fields;
      return telegramMultipartRequest(token, 'sendDocument', {
        ...fallbackFields,
        caption: stripTelegramHtml(fields.caption || ''),
      }, 'document', filePath);
    }
    throw error;
  }
}

async function getUpdates(token, options = {}) {
  return telegramRequest(token, 'getUpdates', {
    timeout: options.timeout ?? 20,
    offset: options.offset,
    allowed_updates: ['message', 'edited_message', 'callback_query'],
  });
}

async function getMe(token) {
  return telegramRequest(token, 'getMe', {});
}

async function answerCallbackQuery(token, callbackQueryId, options = {}) {
  return telegramRequest(token, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...options,
  });
}

async function editMessageReplyMarkup(token, chatId, messageId, replyMarkup) {
  return telegramRequest(token, 'editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: replyMarkup,
  });
}

module.exports = {
  answerCallbackQuery,
  editMessageReplyMarkup,
  getMe,
  getUpdates,
  sendDocument,
  sendMessage,
  sendPhoto,
  telegramRequest,
};
