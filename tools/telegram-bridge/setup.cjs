#!/usr/bin/env node

const { getMe, getUpdates, sendMessage } = require('./telegram-api.cjs');
const {
  buildTelegramCommandKeyboard,
  DEFAULT_CONFIG_PATH,
  DEFAULT_STATE_PATH,
  formatTelegramMessageWithHeader,
  loadConfig,
  writeJsonFile,
} = require('./core.cjs');

async function detectChat(config) {
  const updates = await getUpdates(config.botToken, { timeout: 3 });
  const messages = updates
    .map((update) => update.message || update.edited_message)
    .filter(Boolean)
    .map((message) => ({
      chatId: message.chat?.id,
      userId: message.from?.id,
      text: message.text || message.caption || '',
    }))
    .filter((message) => message.chatId && message.userId);
  return messages[messages.length - 1] || null;
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('Сначала задайте TELEGRAM_BOT_TOKEN. Создайте бота через @BotFather в Telegram Desktop и скопируйте токен.');
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  config.botToken = token;
  const bot = await getMe(token);
  const detected = await detectChat(config);

  const nextConfig = {
    botToken: '',
    allowedUserIds: detected ? [detected.userId] : [],
    defaultChatId: detected ? detected.chatId : null,
    projectRoot: process.cwd(),
    projectName: 'phraseman',
    statePath: DEFAULT_STATE_PATH,
    codexSessionsRoot: undefined,
    sessionIndexPath: undefined,
    pollIntervalMs: 1200,
    relayScanIntervalMs: 15000,
    relayAllSessions: true,
    desktopQueueDir: '.codex-tmp/codex-visible-queues',
    desktopQueueTargetTitle: 'phraseman',
    desktopQueueIntervalSeconds: 300,
    desktopQueueInputClickXRatio: 0.52,
    desktopQueueInputClickBottomOffset: 155,
    controlCenterDir: '.codex-tmp/codex-control-center',
    controlCenterPort: 3999,
    codexTimeoutMs: 1800000,
    codexFile: 'codex',
    codexArgs: [],
  };
  writeJsonFile(DEFAULT_CONFIG_PATH, nextConfig);

  console.log(`Telegram bot detected: @${bot.username || bot.first_name}`);
  if (detected) {
    const [text] = formatTelegramMessageWithHeader('Telegram-мост', 'Конфиг Telegram-моста создан. Локальный мост теперь может отправлять отчеты сюда.');
    await sendMessage(token, detected.chatId, text, {
      parse_mode: 'HTML',
      reply_markup: buildTelegramCommandKeyboard(false),
    });
    console.log(`Detected chat_id=${detected.chatId} user_id=${detected.userId}`);
    console.log(`Wrote ${DEFAULT_CONFIG_PATH}`);
    console.log('Токен не записан в config. Используйте TELEGRAM_BOT_TOKEN или вставьте токен в локальный config.json, если принимаете этот риск.');
  } else {
    console.log('Чат пока не найден. Отправьте /whoami боту в Telegram Desktop, затем запустите настройку еще раз.');
    console.log(`Wrote ${DEFAULT_CONFIG_PATH}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
