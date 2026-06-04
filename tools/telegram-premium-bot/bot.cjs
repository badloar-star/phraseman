#!/usr/bin/env node

const {
  createFileStorage,
  handleTelegramUpdate,
  loadConfig,
  loadState,
  saveState,
} = require('./core.cjs');

const TELEGRAM_API = 'https://api.telegram.org';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertBotToken(token) {
  if (!token) {
    throw new Error('Missing bot token. Set PHRASEMAN_PREMIUM_BOT_TOKEN or .codex-tmp/telegram-premium-bot/config.json.');
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

function createTelegramApi(token) {
  return {
    sendMessage: (chatId, text, options = {}) => telegramRequest(token, 'sendMessage', {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...options,
    }),
    sendPhoto: (chatId, input) => telegramRequest(token, 'sendPhoto', {
      chat_id: chatId,
      ...input,
    }),
    sendInvoice: (_chatId, invoice) => telegramRequest(token, 'sendInvoice', invoice),
    createInvoiceLink: (invoice) => telegramRequest(token, 'createInvoiceLink', invoice),
    answerCallbackQuery: (callbackQueryId, options = {}) => telegramRequest(token, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...options,
    }),
    answerPreCheckoutQuery: (preCheckoutQueryId, options = {}) => telegramRequest(token, 'answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ...options,
    }),
  };
}

async function getUpdates(config, offset) {
  return telegramRequest(config.botToken, 'getUpdates', {
    offset,
    timeout: config.pollTimeoutSeconds,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
  });
}

async function run() {
  const config = loadConfig();
  assertBotToken(config.botToken);

  const state = loadState(config.statePath);
  const api = createTelegramApi(config.botToken);
  const storage = createFileStorage(config);

  console.log('Phraseman Premium Telegram bot started.');
  console.log(`Monthly: ${config.monthlyStars} Stars; yearly: ${config.yearlyStars} Stars.`);

  while (true) {
    try {
      const updates = await getUpdates(config, state.lastUpdateId ? state.lastUpdateId + 1 : undefined);
      for (const update of updates) {
        state.lastUpdateId = Math.max(state.lastUpdateId || 0, Number(update.update_id || 0));
        await handleTelegramUpdate(update, { config, state, api, storage });
        saveState(config.statePath, state);
      }
    } catch (error) {
      console.error(`[telegram-premium-bot] ${error.message}`);
      await sleep(2500);
    }
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createTelegramApi,
  telegramRequest,
};
