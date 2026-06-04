#!/usr/bin/env node

const { sendMessage } = require('./telegram-api.cjs');
const {
  buildReportText,
  buildTelegramSendOptions,
  findLatestCodexSessionId,
  formatTelegramMessageWithHeader,
  getSessionTitle,
  loadConfig,
  loadState,
  saveState,
  upsertRoute,
  withTelegramSendLock,
} = require('./core.cjs');

async function main() {
  const config = loadConfig();
  if (!config.botToken || !config.defaultChatId) {
    console.log('Telegram bridge не настроен. Задайте TELEGRAM_BOT_TOKEN и запустите npm run telegram:setup.');
    process.exitCode = 1;
    return;
  }

  const report = {
    projectName: config.projectName,
    sessionId: findLatestCodexSessionId({ sessionsRoot: config.codexSessionsRoot, cwd: config.projectRoot }) || 'latest',
    status: 'тест',
    summary: 'Это локальный тестовый отчет Telegram-моста из VS Code/Codex.',
    filesChanged: ['tools/telegram-bridge/*'],
    verification: ['npm run telegram:test-core'],
  };
  const chatTitle = getSessionTitle(report.sessionId, {
    sessionIndexPath: config.sessionIndexPath,
    projectName: report.projectName,
  });
  const state = loadState(config.statePath);
  let lastMessageId = null;
  await withTelegramSendLock(config, async () => {
    const chunks = formatTelegramMessageWithHeader(chatTitle, buildReportText(report));
    for (let index = 0; index < chunks.length; index += 1) {
      const sent = await sendMessage(
        config.botToken,
        config.defaultChatId,
        chunks[index],
        buildTelegramSendOptions(index, chunks.length, true)
      );
      lastMessageId = sent.message_id;
      upsertRoute(state, {
        telegramChatId: sent.chat.id,
        telegramMessageId: sent.message_id,
        sessionId: report.sessionId,
        projectRoot: config.projectRoot,
        projectName: config.projectName,
        chatTitle,
        summary: report.summary,
      });
    }
  });
  saveState(config.statePath, state);
  console.log(`Тестовый отчет отправлен в Telegram: message_id=${lastMessageId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
