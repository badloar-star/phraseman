#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

async function telegramRequest(token, method, payload) {
  if (!token) throw new Error('Missing bot token. Set PHRASEMAN_PREMIUM_BOT_TOKEN or local config botToken.');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ok !== true) {
    throw new Error(`Telegram ${method} failed: ${data?.description || `HTTP ${response.status}`}`);
  }
  return data.result;
}

async function main() {
  const config = readJson(path.join(process.cwd(), '.codex-tmp', 'telegram-premium-bot', 'config.json'));
  const token = process.env.PHRASEMAN_PREMIUM_BOT_TOKEN || config.botToken || '';
  const url = process.env.PHRASEMAN_PREMIUM_WEBHOOK_URL || process.argv[2] || '';
  const secretToken = process.env.PHRASEMAN_PREMIUM_WEBHOOK_SECRET || config.webhookSecret || '';
  if (!url) {
    throw new Error('Usage: node tools/telegram-premium-bot/set-webhook.cjs <firebase-function-url>');
  }
  const result = await telegramRequest(token, 'setWebhook', {
    url,
    secret_token: secretToken || undefined,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query'],
    drop_pending_updates: false,
  });
  console.log(JSON.stringify({ ok: true, result }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
