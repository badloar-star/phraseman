const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  messageHash,
  relayRecord,
} = require('../tools/telegram-bridge/relay-latest.cjs');

const MOJIBAKE_SESSION_AUDIT_TITLE = 'ÐÑÐ¾Ð²ÐµÑÑÐ¸ Ð°ÑÐ´Ð¸Ñ';

const {
  buildCodexResumeCommand,
  addPromptQueueItems,
  buildReportText,
  buildQueuedPromptForMode,
  buildSessionInboxKeyboard,
  buildTelegramCommandKeyboard,
  buildTelegramSendOptions,
  buildVisibleQueuePaths,
  collectRecentTelegramArtifacts,
  collectTelegramAttachments,
  collectFreshFinalAgentMessages,
  escapeTelegramHtml,
  extractShortReportSummary,
  findLatestCodexSessionId,
  findLatestCodexSessionFile,
  formatSessionInboxForTelegram,
  formatTelegramBodyHtml,
  formatRoutesForChat,
  formatPromptQueueForTelegram,
  formatTelegramMessageWithHeader,
  formatTelegramReportCaption,
  getTelegramCallback,
  getTelegramMessage,
  getSessionInboxRoutes,
  getSessionTitle,
  getNextQueuedPromptItem,
  getPromptQueueDeliveryPlan,
  getPromptQueue,
  isGenericReportSummary,
  isAuthorizedTelegramUser,
  loadConfig,
  loadState,
  loadSessionTitles,
  normalizeQueueMode,
  repairMojibake,
  readLatestAgentMessage,
  readLatestFinalAgentMessage,
  readLatestFinalAgentMessageRecord,
  readSessionMeta,
  resolveMessageRoute,
  resolveReplyRoute,
  saveState,
  splitTelegramText,
  stripTelegramHtml,
  promptQueueCounts,
  upsertRoute,
  updatePromptQueueItem,
  withCodexSessionLock,
  withTelegramSendLock,
} = require('../tools/telegram-bridge/core.cjs');
const {
  applyControlAction,
  buildControlCenterModel,
  buildControlCenterUrl,
  renderControlCenterHtml,
} = require('../tools/telegram-bridge/control-center.cjs');
const {
  renderReportScreenshot,
  wrapReportText,
} = require('../tools/telegram-bridge/report-screenshot.cjs');

describe('telegram bridge core', () => {
  test('builds a full task report with session identity', () => {
    const text = buildReportText({
      projectName: 'phraseman',
      sessionId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'done',
      summary: 'Updated the local bridge.',
      filesChanged: ['tools/telegram-bridge/core.cjs', 'tests/telegram_bridge_core.test.ts'],
      verification: ['npm test -- --runTestsByPath tests/telegram_bridge_core.test.ts'],
    });

    expect(text).toContain('Phraseman');
    expect(text).toContain('Отчёт по задаче');
    expect(text).toContain('Статус: done');
    expect(text).toContain('Сессия: 123e4567-e89b-12d3-a456-426614174000');
    expect(text).toContain('Сводка:');
    expect(text).toContain('Updated the local bridge.');
    expect(text).toContain('Файлы и материалы:');
    expect(text).toContain('tools/telegram-bridge/core.cjs');
    expect(text).toContain('npm test -- --runTestsByPath');
    expect(text).toContain('Ответьте на это сообщение');
  });

  test('stores telegram message to codex session route and resolves replies', () => {
    const state = loadState(null);

    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 44,
      sessionId: 'session-abc',
      projectRoot: 'C:/appsprojects/phraseman',
      chatTitle: 'Phraseman chat',
    });

    const route = resolveReplyRoute(state, {
      chatId: 777,
      replyToMessageId: 44,
    });

    expect(route).toMatchObject({
      sessionId: 'session-abc',
      projectRoot: 'C:/appsprojects/phraseman',
      chatTitle: 'Phraseman chat',
    });
  });

  test('loads codex session titles and repairs mojibake when needed', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-session-index-'));
    const indexPath = path.join(tempDir, 'session_index.jsonl');
    fs.writeFileSync(indexPath, [
      JSON.stringify({ id: 'session-1', thread_name: 'Проверить Telegram bridge' }),
      JSON.stringify({ id: 'session-2', thread_name: MOJIBAKE_SESSION_AUDIT_TITLE }),
    ].join('\n'), 'utf8');

    const titles = loadSessionTitles(indexPath);

    expect(titles['session-1']).toBe('Проверить Telegram bridge');
    expect(titles['session-2']).toBe('Провести аудит');
    expect(repairMojibake('Ð¢ÐµÑÑ')).toBe('Тест');
  });

  test('formats telegram messages with a bold escaped chat title header', () => {
    const chunks = formatTelegramMessageWithHeader('Чат <Audit>', 'Ответ 1 < 2 & готово', 200);

    expect(chunks).toEqual([
      '<b>Чат &lt;Audit&gt;</b>\n\nОтвет 1 &lt; 2 &amp; готово',
    ]);
    expect(escapeTelegramHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  test('renders report markdown as telegram HTML with paragraphs and emphasis', () => {
    const html = formatTelegramBodyHtml([
      'Summary:',
      '**Done** and *checked*',
      '',
      '- first item',
      '- `second` item',
      '',
      '```',
      '<raw>',
      '```',
    ].join('\n'));

    expect(html).toContain('<b>Summary:</b>');
    expect(html).toContain('<b>Done</b> and <i>checked</i>');
    expect(html).toContain('- first item');
    expect(html).toContain('- <code>second</code> item');
    expect(html).toContain('<pre>&lt;raw&gt;</pre>');
  });

  test('does not apply italic or bold formatting inside inline code', () => {
    const html = formatTelegramBodyHtml('Use `file_name_with_parts.md` and **bold** text.');

    expect(html).toBe('Use <code>file_name_with_parts.md</code> and <b>bold</b> text.');
    expect(html).not.toContain('<i>with');
  });

  test('strips telegram HTML to readable fallback text', () => {
    const text = stripTelegramHtml('<b>Chat &amp; title</b>\n\nUse <code>file_name.md</code>\n<pre>&lt;raw&gt;</pre>');

    expect(text).toBe('Chat & title\n\nUse file_name.md\n<raw>');
  });

  test('splits telegram HTML messages without losing body text', () => {
    const body = `${'a'.repeat(30)}\n${'b'.repeat(30)}`;
    const chunks = formatTelegramMessageWithHeader('Chat', body, 45);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk: string) => chunk.startsWith('<b>Chat</b>\n\n'))).toBe(true);
    expect(chunks.map((chunk: string) => chunk.replace('<b>Chat</b>\n\n', '')).join('')).toBe(body);
  });

  test('keeps formatted telegram HTML chunks under the message limit', () => {
    const text = Array.from({ length: 500 }, (_, index) => `**bold-${index}**`).join('\n');
    const chunks = formatTelegramMessageWithHeader('Chat', text, 500);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk: string) => chunk.length <= 500)).toBe(true);
    expect(chunks.join('\n')).toContain('<b>bold-499</b>');
  });

  test('collects generated images and material files for telegram delivery', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-attachments-'));
    const imagePath = path.join(tempDir, 'exports', 'preview image.png');
    const docPath = path.join(tempDir, 'docs', 'lesson pack.docx');
    const sourcePath = path.join(tempDir, 'tools', 'script.js');
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(imagePath, 'image-bytes', 'utf8');
    fs.writeFileSync(docPath, 'doc-bytes', 'utf8');
    fs.writeFileSync(sourcePath, 'source-code', 'utf8');

    const attachments = collectTelegramAttachments({
      projectRoot: tempDir,
      files: ['exports/preview image.png', 'docs/lesson pack.docx', 'tools/script.js'],
      text: `Generated files:\n- ${imagePath}\n- docs/lesson pack.docx`,
    });

    expect(attachments.map((item: any) => item.name).sort()).toEqual(['lesson pack.docx', 'preview image.png']);
    expect(attachments.find((item: any) => item.name === 'preview image.png').kind).toBe('photo');
    expect(attachments.find((item: any) => item.name === 'lesson pack.docx').kind).toBe('document');
  });

  test('renders telegram report screenshots as png attachments', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-report-screenshot-'));
    const attachment = await renderReportScreenshot({
      chatTitle: 'Audit Chat',
      sessionId: 'session-abc',
      text: [
        'Summary:',
        '**Done** and checked',
        '',
        '- generated material',
      ].join('\n'),
      outputDir: tempDir,
    });

    expect(attachment).toMatchObject({
      kind: 'photo',
      name: expect.stringMatching(/session-abc-.+\.png$/),
    });
    expect(fs.existsSync(attachment.path)).toBe(true);
    expect(fs.statSync(attachment.path).size).toBeGreaterThan(1000);
    expect(wrapReportText('one two three', 7)).toEqual(['one two', 'three']);
  });

  test('skips oversized and sensitive telegram attachments', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-attachment-safety-'));
    const largePath = path.join(tempDir, 'big.pdf');
    const configPath = path.join(tempDir, '.codex-tmp', 'telegram-bridge', 'config.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(largePath, 'too-large', 'utf8');
    fs.writeFileSync(configPath, '{"botToken":"secret"}', 'utf8');

    const attachments = collectTelegramAttachments({
      projectRoot: tempDir,
      files: ['big.pdf', '.codex-tmp/telegram-bridge/config.json'],
      maxBytes: 4,
    });

    expect(attachments).toEqual([]);
  });

  test('collects recent generated artifacts even when the report does not mention them', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-recent-artifacts-'));
    const recentImage = path.join(tempDir, 'exports', 'fresh-preview.png');
    const oldDoc = path.join(tempDir, 'docs', 'reports', 'old-report.pdf');
    const cacheJson = path.join(tempDir, 'exports', 'cache', 'fresh-cache.json');
    const sourceFile = path.join(tempDir, 'exports', 'source.js');
    fs.mkdirSync(path.dirname(recentImage), { recursive: true });
    fs.mkdirSync(path.dirname(oldDoc), { recursive: true });
    fs.mkdirSync(path.dirname(cacheJson), { recursive: true });
    fs.writeFileSync(recentImage, 'image-bytes', 'utf8');
    fs.writeFileSync(oldDoc, 'pdf-bytes', 'utf8');
    fs.writeFileSync(cacheJson, '{"cache":true}', 'utf8');
    fs.writeFileSync(sourceFile, 'source-code', 'utf8');
    const now = Date.parse('2026-05-31T21:00:00.000Z');
    fs.utimesSync(recentImage, new Date(now - 60 * 1000), new Date(now - 60 * 1000));
    fs.utimesSync(oldDoc, new Date(now - 60 * 60 * 1000), new Date(now - 60 * 60 * 1000));
    fs.utimesSync(cacheJson, new Date(now - 30 * 1000), new Date(now - 30 * 1000));
    fs.utimesSync(sourceFile, new Date(now - 60 * 1000), new Date(now - 60 * 1000));

    const artifacts = collectRecentTelegramArtifacts({
      projectRoot: tempDir,
      nowMs: now,
      windowMs: 10 * 60 * 1000,
      roots: ['exports', 'docs/reports'],
    });

    expect(artifacts.map((item: any) => item.name)).toEqual(['fresh-preview.png']);
    expect(artifacts[0].kind).toBe('photo');
  });

  test('requires exact telegram reply metadata for session routing', () => {
    const state = loadState(null);

    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 44,
      sessionId: 'older-session',
      projectRoot: 'C:/appsprojects/phraseman',
      createdAt: '2026-05-31T20:00:00.000Z',
    });
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 45,
      sessionId: 'latest-session',
      projectRoot: 'C:/appsprojects/phraseman',
      createdAt: '2026-05-31T20:10:00.000Z',
    });
    upsertRoute(state, {
      telegramChatId: 888,
      telegramMessageId: 46,
      sessionId: 'other-chat-session',
      projectRoot: 'C:/appsprojects/phraseman',
      createdAt: '2026-05-31T20:20:00.000Z',
    });

    expect(resolveMessageRoute(state, { chatId: 777, replyToMessageId: 45 }).sessionId).toBe('latest-session');
    expect(resolveMessageRoute(state, { chatId: 777, replyToMessageId: 46 })).toBe(null);
    expect(resolveMessageRoute(state, { chatId: 777, replyToMessageId: null })).toBe(null);
  });

  test('stores visible prompt queues per exact codex session route', () => {
    const state = loadState(null);
    const route = {
      telegramChatId: 777,
      telegramMessageId: 44,
      sessionId: 'session-queue',
      projectRoot: 'C:/appsprojects/phraseman',
      projectName: 'phraseman',
      chatTitle: 'Queue Chat',
    };

    const result = addPromptQueueItems(state, route, 'дальше', 3, { sourceTelegramMessageId: 44 });

    expect(result.items).toHaveLength(3);
    expect(getPromptQueue(state, route).items.map((item: any) => item.status)).toEqual(['queued', 'queued', 'queued']);
    expect(getNextQueuedPromptItem(state, route).prompt).toBe('дальше');
    updatePromptQueueItem(state, route, result.items[0].id, { status: 'running' });
    expect(promptQueueCounts(getPromptQueue(state, route))).toMatchObject({ total: 3, queued: 2, running: 1 });
    expect(formatPromptQueueForTelegram(state, route)).toContain('Queue Chat');
    expect(formatPromptQueueForTelegram(state, route)).toContain('1: running - дальше');
  });

  test('persists visible prompt queues in telegram bridge state', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-prompt-queue-state-'));
    const statePath = path.join(tempDir, 'state.json');
    const state = loadState(statePath);
    const route = { sessionId: 'session-persist-queue', chatTitle: 'Persist Queue' };

    addPromptQueueItems(state, route, 'next visible prompt', 2);
    saveState(statePath, state);

    const restored = loadState(statePath);
    expect(getPromptQueue(restored, route).items).toHaveLength(2);
    expect(formatPromptQueueForTelegram(restored, route)).toContain('next visible prompt');
  });

  test('keeps prompt queue items waiting when no execution backend is configured', () => {
    expect(getPromptQueueDeliveryPlan({ allowCodexExec: false, desktopQueueUnsafePaste: false })).toMatchObject({
      appendDesktopQueue: true,
      processViaCodexExec: false,
      startDesktopSender: false,
      mode: 'visible-hold',
    });
  });

  test('uses a single prompt queue execution backend when execution is enabled', () => {
    expect(getPromptQueueDeliveryPlan({ allowCodexExec: true, desktopQueueUnsafePaste: true })).toMatchObject({
      appendDesktopQueue: false,
      processViaCodexExec: true,
      startDesktopSender: false,
      mode: 'codex-exec',
    });
    expect(getPromptQueueDeliveryPlan({ allowCodexExec: false, desktopQueueUnsafePaste: true })).toMatchObject({
      appendDesktopQueue: true,
      processViaCodexExec: false,
      startDesktopSender: true,
      mode: 'desktop-paste',
    });
  });

  test('desktop sender is not launched with immediate paste from the bridge', () => {
    const bridgeSource = fs.readFileSync(path.join(__dirname, '..', 'tools', 'telegram-bridge', 'bridge.cjs'), 'utf8');
    expect(bridgeSource).not.toContain("'-SendImmediately'");
  });

  test('persists state without writing outside requested file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-bridge-'));
    const statePath = path.join(tempDir, 'state.json');
    const state = loadState(statePath);

    upsertRoute(state, {
      telegramChatId: 1,
      telegramMessageId: 2,
      sessionId: 'session-persisted',
      projectRoot: 'C:/appsprojects/phraseman',
    });
    saveState(statePath, state);

    const restored = loadState(statePath);
    expect(resolveReplyRoute(restored, { chatId: 1, replyToMessageId: 2 }).sessionId).toBe('session-persisted');
  });

  test('writes state atomically without leaving temporary files behind', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-atomic-state-'));
    const statePath = path.join(tempDir, 'state.json');
    const state = loadState(null);

    upsertRoute(state, {
      telegramChatId: 10,
      telegramMessageId: 20,
      sessionId: 'atomic-session',
      projectRoot: 'C:/appsprojects/phraseman',
    });
    saveState(statePath, state);

    expect(JSON.parse(fs.readFileSync(statePath, 'utf8')).routes['10:20'].sessionId).toBe('atomic-session');
    expect(fs.readdirSync(tempDir).filter((file: string) => file.endsWith('.tmp'))).toEqual([]);
    expect(fs.existsSync(`${statePath}.bak`)).toBe(true);
  });

  test('restores state from backup when the main state json is corrupt', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-state-backup-'));
    const statePath = path.join(tempDir, 'state.json');
    const state = loadState(null);

    upsertRoute(state, {
      telegramChatId: 11,
      telegramMessageId: 22,
      sessionId: 'backup-session',
      projectRoot: 'C:/appsprojects/phraseman',
    });
    saveState(statePath, state);
    fs.writeFileSync(statePath, '{broken-json', 'utf8');

    const restored = loadState(statePath);
    expect(resolveReplyRoute(restored, { chatId: 11, replyToMessageId: 22 }).sessionId).toBe('backup-session');
  });

  test('merges existing route state instead of overwriting concurrent writers', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-state-merge-'));
    const statePath = path.join(tempDir, 'state.json');
    const existing = loadState(statePath);
    upsertRoute(existing, {
      telegramChatId: 1,
      telegramMessageId: 10,
      sessionId: 'external-route',
      projectRoot: 'C:/appsprojects/phraseman',
    });
    saveState(statePath, existing);

    const bridgeMemory = loadState(null);
    bridgeMemory.lastUpdateId = 5;
    saveState(statePath, bridgeMemory);

    const restored = loadState(statePath);
    expect(resolveReplyRoute(restored, { chatId: 1, replyToMessageId: 10 }).sessionId).toBe('external-route');
    expect(restored.lastUpdateId).toBe(5);
  });

  test('merges relayed message hashes instead of overwriting concurrent dedupe state', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-dedupe-merge-'));
    const statePath = path.join(tempDir, 'state.json');
    saveState(statePath, {
      ...loadState(null),
      relayedAgentMessages: { existingHash: '2026-05-31T20:00:00.000Z' },
    });

    saveState(statePath, {
      ...loadState(null),
      relayedAgentMessages: { newHash: '2026-05-31T20:01:00.000Z' },
    });

    const restored = loadState(statePath);
    expect(restored.relayedAgentMessages).toMatchObject({
      existingHash: '2026-05-31T20:00:00.000Z',
      newHash: '2026-05-31T20:01:00.000Z',
    });
  });

  test('merges prompt queue items instead of dropping concurrently added prompts', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-queue-merge-'));
    const statePath = path.join(tempDir, 'state.json');
    const route = { sessionId: 'session-queue-merge', chatTitle: 'Queue Merge' };
    const existing = loadState(null);
    const first = addPromptQueueItems(existing, route, 'first prompt', 1).items[0];
    saveState(statePath, existing);

    const runnerState = loadState(statePath);
    updatePromptQueueItem(runnerState, route, first.id, { status: 'running', startedAt: '2026-06-04T10:00:00.000Z' });

    const enqueueState = loadState(statePath);
    addPromptQueueItems(enqueueState, route, 'second prompt', 1);
    saveState(statePath, enqueueState);
    saveState(statePath, runnerState);

    const queue = getPromptQueue(loadState(statePath), route);
    expect(queue.items.map((item: any) => item.prompt)).toEqual(['first prompt', 'second prompt']);
    expect(queue.items.map((item: any) => item.status)).toEqual(['running', 'queued']);
  });

  test('explicit prompt queue clear is not undone by state merging', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-queue-clear-'));
    const statePath = path.join(tempDir, 'state.json');
    const route = { sessionId: 'session-queue-clear', chatTitle: 'Queue Clear' };
    const state = loadState(null);
    addPromptQueueItems(state, route, 'first prompt', 2);
    saveState(statePath, state);

    const clearState = loadState(statePath);
    getPromptQueue(clearState, route).items = [];
    saveState(statePath, clearState);

    expect(getPromptQueue(loadState(statePath), route).items).toEqual([]);
  });

  test('clears selected sessions instead of resurrecting stale selections', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-selected-clear-'));
    const statePath = path.join(tempDir, 'state.json');
    saveState(statePath, {
      ...loadState(null),
      selectedSessions: {
        777: {
          sessionKey: 'session-a',
          sessionId: 'session-a',
          chatTitle: 'Old selection',
          selectedAt: '2026-06-01T10:00:00.000Z',
        },
      },
    });

    const state = loadState(statePath);
    state.selectedSessions = {};
    saveState(statePath, state);

    expect(loadState(statePath).selectedSessions).toEqual({});
  });

  test('telegram bridge queue commands use the selected inbox session', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'tools', 'telegram-bridge', 'bridge.cjs'), 'utf8');

    expect(source).toContain('function resolveCommandRoute(state, message)');
    expect(source).toContain('return resolveMessageRoute(state, message) || resolveSelectedRoute(state, message.chatId);');
    expect(source).toContain('const route = resolveCommandRoute(state, message);');
    expect(source).not.toContain('Чтобы физически добавить очередь в нужный Codex-чат, отправьте "дальше 100" реплаем');
  });

  test('persists failed telegram updates for audit visibility and allows clearing them', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-failed-updates-'));
    const statePath = path.join(tempDir, 'state.json');
    saveState(statePath, {
      ...loadState(null),
      failedUpdates: {
        101: {
          updateId: 101,
          attempts: 1,
          lastError: 'send failed',
          updatedAt: '2026-06-01T10:00:00.000Z',
          kind: 'message',
          text: '/inbox',
        },
      },
    });

    expect(loadState(statePath).failedUpdates['101']).toMatchObject({
      updateId: 101,
      attempts: 1,
      lastError: 'send failed',
    });

    const state = loadState(statePath);
    state.failedUpdates = {};
    saveState(statePath, state);
    expect(loadState(statePath).failedUpdates).toEqual({});
  });

  test('skips relay inside the send lock when another process already stored the hash', async () => {
    jest.resetModules();
    const sendMessage = jest.fn();
    jest.doMock('../tools/telegram-bridge/telegram-api.cjs', () => ({
      editMessageReplyMarkup: jest.fn(),
      sendDocument: jest.fn(),
      sendMessage,
      sendPhoto: jest.fn(),
    }));
    const { relayRecord: freshRelayRecord, messageHash: freshMessageHash } = require('../tools/telegram-bridge/relay-latest.cjs');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-relay-lock-dedupe-'));
    const statePath = path.join(tempDir, 'state.json');
    const record = {
      sessionId: 'session-race',
      timestamp: '2026-05-31T20:10:00.000Z',
      text: 'already sent',
      chatTitle: 'Race Chat',
      projectRoot: tempDir,
      projectName: 'phraseman',
      attachments: [],
    };
    saveState(statePath, {
      ...loadState(null),
      relayedAgentMessages: {
        [freshMessageHash(record.sessionId, record.timestamp, record.text)]: '2026-05-31T20:11:00.000Z',
      },
    });

    const sent = await freshRelayRecord({
      botToken: 'token',
      defaultChatId: 777,
      statePath,
      projectRoot: tempDir,
      projectName: 'phraseman',
      sessionIndexPath: path.join(tempDir, 'missing-index.jsonl'),
    }, loadState(null), record);

    expect(sent).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
    jest.dontMock('../tools/telegram-bridge/telegram-api.cjs');
  });

  test('saves relay dedupe state before releasing the send lock', async () => {
    jest.resetModules();
    const sendMessage = jest.fn(async (_token: string, chatId: number) => ({
      chat: { id: chatId },
      message_id: 70,
    }));
    jest.doMock('../tools/telegram-bridge/telegram-api.cjs', () => ({
      editMessageReplyMarkup: jest.fn(),
      sendDocument: jest.fn(),
      sendMessage,
      sendPhoto: jest.fn(),
    }));
    const { relayRecord: freshRelayRecord, messageHash: freshMessageHash } = require('../tools/telegram-bridge/relay-latest.cjs');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-relay-lock-save-'));
    const statePath = path.join(tempDir, 'state.json');
    const record = {
      sessionId: 'session-save',
      timestamp: '2026-05-31T20:12:00.000Z',
      text: 'fresh answer',
      chatTitle: 'Save Chat',
      projectRoot: tempDir,
      projectName: 'phraseman',
      attachments: [],
    };

    const sent = await freshRelayRecord({
      botToken: 'token',
      defaultChatId: 777,
      statePath,
      projectRoot: tempDir,
      projectName: 'phraseman',
      sessionIndexPath: path.join(tempDir, 'missing-index.jsonl'),
    }, loadState(null), record);

    const restored = loadState(statePath);
    expect(sent).toBe(true);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(restored.relayedAgentMessages[freshMessageHash(record.sessionId, record.timestamp, record.text)]).toBeTruthy();
    expect(resolveReplyRoute(restored, { chatId: 777, replyToMessageId: 70 }).sessionId).toBe('session-save');
    jest.dontMock('../tools/telegram-bridge/telegram-api.cjs');
  });

  test('loads JSON config files with a UTF-8 BOM', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-config-'));
    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(configPath, `\uFEFF${JSON.stringify({
      botToken: 'token',
      allowedUserIds: [123],
      defaultChatId: 777,
      projectRoot: 'C:/appsprojects/phraseman',
    })}`, 'utf8');

    const config = loadConfig(configPath);
    expect(config.botToken).toBe('token');
    expect(config.allowedUserIds).toEqual([123]);
    expect(config.defaultChatId).toBe(777);
  });

  test('falls back to safe defaults for invalid numeric config values', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-config-numbers-'));
    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      botToken: 'token',
      defaultChatId: 777,
      projectRoot: 'C:/appsprojects/phraseman',
      pollIntervalMs: 'bad',
      relayScanIntervalMs: 0,
      codexTimeoutMs: -1,
      relayMaxAgeMs: null,
      telegramSendLockStaleMs: 'NaN',
      codexSessionLockStaleMs: false,
      telegramAttachmentMaxBytes: 'oops',
      telegramPhotoMaxBytes: -100,
      telegramAttachmentLimit: 0,
      telegramArtifactScanWindowMs: 'broken',
      telegramArtifactScanMaxFiles: -5,
    }), 'utf8');

    const config = loadConfig(configPath);
    expect(config.pollIntervalMs).toBe(1200);
    expect(config.relayScanIntervalMs).toBe(15000);
    expect(config.codexTimeoutMs).toBe(30 * 60 * 1000);
    expect(config.relayMaxAgeMs).toBe(10 * 60 * 1000);
    expect(config.telegramSendLockStaleMs).toBe(2 * 60 * 1000);
    expect(config.codexSessionLockStaleMs).toBe(35 * 60 * 1000);
    expect(config.telegramAttachmentMaxBytes).toBe(49 * 1024 * 1024);
    expect(config.telegramPhotoMaxBytes).toBe(10 * 1024 * 1024);
    expect(config.telegramAttachmentLimit).toBe(10);
    expect(config.telegramArtifactScanWindowMs).toBe(20 * 60 * 1000);
    expect(config.telegramArtifactScanMaxFiles).toBe(2000);
  });

  test('splits long telegram messages without dropping content', () => {
    const text = `${'a'.repeat(3900)}\n${'b'.repeat(3900)}\n${'c'.repeat(200)}`;
    const chunks = splitTelegramText(text, 3900);

    expect(chunks.length).toBe(3);
    expect(chunks.join('')).toBe(text);
    expect(chunks.every((chunk: string) => chunk.length <= 3900)).toBe(true);
  });

  test('formats route diagnostics for a specific telegram chat', () => {
    const state = loadState(null);
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 44,
      sessionId: 'session-abc',
      projectRoot: 'C:/appsprojects/phraseman',
      chatTitle: 'Audit Chat',
      createdAt: '2026-05-31T20:00:00.000Z',
    });
    upsertRoute(state, {
      telegramChatId: 888,
      telegramMessageId: 55,
      sessionId: 'session-other',
      projectRoot: 'C:/appsprojects/phraseman',
      createdAt: '2026-05-31T21:00:00.000Z',
    });

    const text = formatRoutesForChat(state, 777);
    expect(text).toContain('Привязанные сообщения этого Telegram-чата');
    expect(text).toContain('message_id=44');
    expect(text).toContain('session-abc');
    expect(text).toContain('Audit Chat');
    expect(text).not.toContain('session-other');
  });

  test('finds the latest Codex session id for the current project', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-'));
    const oldDir = path.join(tempDir, '2026', '05', '30');
    const newDir = path.join(tempDir, '2026', '05', '31');
    fs.mkdirSync(oldDir, { recursive: true });
    fs.mkdirSync(newDir, { recursive: true });
    const oldFile = path.join(oldDir, 'old.jsonl');
    const newFile = path.join(newDir, 'new.jsonl');
    fs.writeFileSync(oldFile, JSON.stringify({
      type: 'session_meta',
      payload: { id: 'old-session', cwd: 'C:/appsprojects/phraseman' },
    }), 'utf8');
    fs.writeFileSync(newFile, JSON.stringify({
      type: 'session_meta',
      payload: { id: 'new-session', cwd: 'C:/appsprojects/phraseman' },
    }), 'utf8');
    const now = new Date();
    fs.utimesSync(oldFile, new Date(now.getTime() - 10000), new Date(now.getTime() - 10000));
    fs.utimesSync(newFile, now, now);

    expect(findLatestCodexSessionId({
      sessionsRoot: tempDir,
      cwd: 'C:/appsprojects/phraseman',
    })).toBe('new-session');
    expect(findLatestCodexSessionFile({
      sessionsRoot: tempDir,
      cwd: 'C:/appsprojects/phraseman',
    })).toBe(newFile);
  });

  test('reads the latest assistant message from a Codex session jsonl file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-agent-message-'));
    const filePath = path.join(tempDir, 'session.jsonl');
    fs.writeFileSync(filePath, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-1', cwd: 'C:/appsprojects/phraseman' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'agent_message', message: 'first answer' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'agent_message', message: 'final answer' } }),
    ].join('\n'), 'utf8');

    expect(readSessionMeta(filePath).id).toBe('session-1');
    expect(readLatestAgentMessage(filePath)).toBe('final answer');
  });

  test('reads only the final assistant answer for Telegram relay', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-final-message-'));
    const filePath = path.join(tempDir, 'session.jsonl');
    fs.writeFileSync(filePath, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-1', cwd: 'C:/appsprojects/phraseman' } }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'commentary', message: 'working update' },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'final_answer', message: 'exact final answer' },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'commentary', message: 'later working update' },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: { type: 'task_complete', last_agent_message: 'exact final answer' },
      }),
    ].join('\n'), 'utf8');

    expect(readLatestAgentMessage(filePath)).toBe('later working update');
    expect(readLatestFinalAgentMessage(filePath)).toBe('exact final answer');
    expect(readLatestFinalAgentMessageRecord(filePath).message).toBe('exact final answer');
  });

  test('reads latest final answer from the jsonl tail without loading old history', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-final-tail-'));
    const filePath = path.join(tempDir, 'large-session.jsonl');
    const filler = JSON.stringify({
      type: 'event_msg',
      payload: { type: 'agent_message', phase: 'analysis', message: 'x'.repeat(1024) },
    });
    fs.writeFileSync(filePath, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-tail', cwd: tempDir } }),
      ...Array.from({ length: 9000 }, () => filler),
      JSON.stringify({
        timestamp: '2026-06-01T12:00:00.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'final_answer', message: 'tail final answer' },
      }),
    ].join('\n'), 'utf8');

    expect(readLatestFinalAgentMessageRecord(filePath)).toEqual({
      message: 'tail final answer',
      timestamp: '2026-06-01T12:00:00.000Z',
    });
  });

  test('reads session metadata from the jsonl head of a large session file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-meta-head-'));
    const filePath = path.join(tempDir, 'large-session.jsonl');
    const filler = JSON.stringify({
      type: 'event_msg',
      payload: { type: 'agent_message', phase: 'analysis', message: 'x'.repeat(1024) },
    });
    fs.writeFileSync(filePath, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-head', cwd: 'C:/appsprojects/phraseman' } }),
      ...Array.from({ length: 9000 }, () => filler),
      JSON.stringify({
        timestamp: '2026-06-01T12:00:00.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'final_answer', message: 'tail final answer' },
      }),
    ].join('\n'), 'utf8');

    expect(readSessionMeta(filePath)).toEqual({
      id: 'session-head',
      cwd: 'C:/appsprojects/phraseman',
    });
  });

  test('reads latest assistant message from the jsonl tail of a large session file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-agent-tail-'));
    const filePath = path.join(tempDir, 'large-session.jsonl');
    const filler = JSON.stringify({
      type: 'event_msg',
      payload: { type: 'agent_message', phase: 'analysis', message: 'x'.repeat(1024) },
    });
    fs.writeFileSync(filePath, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-agent-tail', cwd: tempDir } }),
      ...Array.from({ length: 9000 }, () => filler),
      JSON.stringify({
        timestamp: '2026-06-01T12:00:00.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'commentary', message: 'latest assistant tail message' },
      }),
    ].join('\n'), 'utf8');

    expect(readLatestAgentMessage(filePath)).toBe('latest assistant tail message');
  });

  test('collects fresh final assistant answers from all codex chats', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-all-sessions-'));
    const indexPath = path.join(tempDir, 'session_index.jsonl');
    const sessionsRoot = path.join(tempDir, 'sessions');
    const dayDir = path.join(sessionsRoot, '2026', '05', '31');
    fs.mkdirSync(dayDir, { recursive: true });
    fs.writeFileSync(indexPath, [
      JSON.stringify({ id: 'session-a', thread_name: 'Первый чат' }),
      JSON.stringify({ id: 'session-b', thread_name: 'Второй чат' }),
    ].join('\n'), 'utf8');

    fs.writeFileSync(path.join(dayDir, 'a.jsonl'), [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-a', cwd: 'C:/one' } }),
      JSON.stringify({
        timestamp: '2026-05-31T20:00:00.000Z',
        type: 'event_msg',
        payload: { type: 'task_complete', last_agent_message: 'answer a\nFile: artifact.pdf' },
      }),
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(dayDir, 'artifact.pdf'), 'pdf-bytes', 'utf8');
    fs.writeFileSync(path.join(dayDir, 'b.jsonl'), [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-b', cwd: 'C:/two' } }),
      JSON.stringify({
        timestamp: '2026-05-31T20:00:01.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'commentary', message: 'working' },
      }),
      JSON.stringify({
        timestamp: '2026-05-31T20:00:02.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'final_answer', message: 'answer b' },
      }),
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(dayDir, 'old.jsonl'), [
      JSON.stringify({ type: 'session_meta', payload: { id: 'session-old', cwd: 'C:/old' } }),
      JSON.stringify({
        timestamp: '2026-05-31T19:00:00.000Z',
        type: 'event_msg',
        payload: { type: 'task_complete', last_agent_message: 'old answer' },
      }),
    ].join('\n'), 'utf8');

    const records = collectFreshFinalAgentMessages({
      sessionsRoot,
      sessionIndexPath: indexPath,
      nowMs: Date.parse('2026-05-31T20:05:00.000Z'),
      maxAgeMs: 10 * 60 * 1000,
    });

    expect(records.map((record: any) => record.sessionId).sort()).toEqual(['session-a', 'session-b']);
    expect(records.find((record: any) => record.sessionId === 'session-a').chatTitle).toBe('Первый чат');
    expect(records.find((record: any) => record.sessionId === 'session-a').attachments[0].name).toBe('artifact.pdf');
    expect(records.find((record: any) => record.sessionId === 'session-b').text).toBe('answer b');
  });

  test('collects fresh final answers only from recently touched session files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-fresh-mtime-'));
    const oldFile = path.join(tempDir, 'old.jsonl');
    const recentFile = path.join(tempDir, 'recent.jsonl');
    fs.writeFileSync(oldFile, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'old-session', cwd: tempDir } }),
      JSON.stringify({
        timestamp: '2026-06-01T11:58:00.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'final_answer', message: 'old final' },
      }),
    ].join('\n'), 'utf8');
    fs.writeFileSync(recentFile, [
      JSON.stringify({ type: 'session_meta', payload: { id: 'recent-session', cwd: tempDir } }),
      JSON.stringify({
        timestamp: '2026-06-01T12:00:00.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', phase: 'final_answer', message: 'recent final' },
      }),
    ].join('\n'), 'utf8');
    fs.utimesSync(oldFile, new Date('2026-06-01T11:00:00.000Z'), new Date('2026-06-01T11:00:00.000Z'));
    fs.utimesSync(recentFile, new Date('2026-06-01T12:00:00.000Z'), new Date('2026-06-01T12:00:00.000Z'));

    const records = collectFreshFinalAgentMessages({
      sessionsRoot: tempDir,
      nowMs: Date.parse('2026-06-01T12:01:00.000Z'),
      maxAgeMs: 10 * 60 * 1000,
      artifactRoots: [],
      attachmentLimit: 0,
    });

    expect(records.map((record: any) => record.sessionId)).toEqual(['recent-session']);
  });

  test('extracts telegram text messages and rejects unauthorized senders', () => {
    const message = getTelegramMessage({
      update_id: 10,
      message: {
        message_id: 99,
        from: { id: 12345 },
        chat: { id: 777 },
        text: 'next prompt',
        reply_to_message: { message_id: 44 },
      },
    });

    expect(message).toMatchObject({
      chatId: 777,
      fromUserId: 12345,
      messageId: 99,
      replyToMessageId: 44,
      text: 'next prompt',
    });
    expect(isAuthorizedTelegramUser(message, { allowedUserIds: [12345] })).toBe(true);
    expect(isAuthorizedTelegramUser(message, { allowedUserIds: [999] })).toBe(false);
  });

  test('extracts telegram callback commands from inline buttons', () => {
    const callback = getTelegramCallback({
      update_id: 11,
      callback_query: {
        id: 'callback-1',
        from: { id: 12345 },
        data: 'route:audit',
        message: {
          message_id: 44,
          chat: { id: 777 },
        },
      },
    });

    expect(callback).toMatchObject({
      updateId: 11,
      callbackId: 'callback-1',
      chatId: 777,
      fromUserId: 12345,
      messageId: 44,
      data: 'route:audit',
    });
  });

  test('builds inline command buttons for route messages', () => {
    const routeKeyboard = buildTelegramCommandKeyboard(true);
    expect(routeKeyboard.inline_keyboard.flat()).toEqual([
      { text: 'Дальше', callback_data: 'enqueue:1' },
      { text: 'Дальше 10', callback_data: 'enqueue:10' },
      { text: 'Дальше 100', callback_data: 'enqueue:100' },
      { text: 'Команды', callback_data: 'cmd:help' },
    ]);
    expect(buildTelegramCommandKeyboard(false)).toBeUndefined();
  });

  test('adds material button only when report has material attachments', () => {
    expect(buildTelegramCommandKeyboard(true, { hasMaterials: true }).inline_keyboard.flat()).toEqual([
      { text: 'Дальше', callback_data: 'enqueue:1' },
      { text: 'Дальше 10', callback_data: 'enqueue:10' },
      { text: 'Дальше 100', callback_data: 'enqueue:100' },
      { text: 'Команды', callback_data: 'cmd:help' },
      { text: 'Материалы', callback_data: 'cmd:materials' },
    ]);
    expect(buildTelegramCommandKeyboard(true, { hasMaterials: false }).inline_keyboard.flat()).not.toContainEqual(
      { text: 'Материалы', callback_data: 'cmd:materials' }
    );
  });

  test('builds short session inbox buttons from latest routes', () => {
    const state = loadState(null);
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 10,
      sessionId: 'session-lingman',
      chatTitle: 'Lingman thumbnails',
      summary: 'latest lingman',
      createdAt: '2026-06-01T10:00:00Z',
    });
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 11,
      sessionId: 'session-telegram',
      chatTitle: 'Telegram bridge',
      summary: 'latest telegram',
      createdAt: '2026-06-01T11:00:00Z',
    });

    const keyboard = buildSessionInboxKeyboard(state, 777);
    expect(keyboard.inline_keyboard.flat()).toEqual(expect.arrayContaining([
      { text: 'Telegram bridge', callback_data: 'session:session-telegram' },
      { text: 'Lingman thumbnails', callback_data: 'session:session-lingman' },
    ]));
  });

  test('formats session inbox with numbered fallback selection', () => {
    const state = loadState(null);
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 10,
      sessionId: 'session-old',
      chatTitle: 'Old work',
      summary: 'older report',
      createdAt: '2026-06-01T10:00:00Z',
    });
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 11,
      sessionId: 'session-new',
      chatTitle: 'Telegram inbox',
      summary: 'newest report summary',
      createdAt: '2026-06-01T11:00:00Z',
    });

    const routes = getSessionInboxRoutes(state, 777);
    expect(routes.map((item: any) => item.sessionKey)).toEqual(['session-new', 'session-old']);

    const text = formatSessionInboxForTelegram(state, 777);
    expect(text).toContain('/select N');
    expect(text).toContain('1. Telegram inbox');
    expect(text).toContain('2. Old work');
  });

  test('hides generic session summaries in inbox', () => {
    const state = loadState(null);
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 10,
      sessionId: 'session-generic',
      chatTitle: 'Telegram bridge',
      summary: 'Финальный ответ Codex',
      createdAt: '2026-06-01T10:00:00Z',
    });

    const text = formatSessionInboxForTelegram(state, 777);
    expect(text).toContain('1. Telegram bridge');
    expect(text).not.toContain('Финальный ответ Codex');
  });

  test('builds per-session visible queue paths', () => {
    const paths = buildVisibleQueuePaths({
      projectRoot: 'C:/repo',
      desktopQueueDir: '.codex-tmp/codex-visible-queues',
    }, {
      sessionId: 'session/abc',
      chatTitle: 'Telegram bridge',
    });

    expect(paths.queuePath.replace(/\\/g, '/')).toContain('.codex-tmp/codex-visible-queues/session_abc/queue.txt');
    expect(paths.stopFile.replace(/\\/g, '/')).toContain('.codex-tmp/codex-visible-queues/session_abc/stop.flag');
    expect(paths.controlCenterPath.replace(/\\/g, '/')).toContain('.codex-tmp/codex-control-center/control-center.html');
  });

  test('formats report caption with material count without dumping files', () => {
    const caption = formatTelegramReportCaption('Telegram bridge', 'Summary:\nUpdated report delivery.', 1000, { materialCount: 3 });
    expect(caption).toContain('<b>Telegram bridge</b>');
    expect(caption).toContain('Updated report delivery.');
    expect(caption).toContain('Материалы: 3');
    expect(caption).not.toContain('codex-next-prompt.txt');
  });

  test('replaces generic report summaries with useful extracted text', () => {
    expect(isGenericReportSummary('Финальный ответ Codex')).toBe(true);
    expect(isGenericReportSummary('Краткий отчет Codex')).toBe(true);
    expect(isGenericReportSummary('Исправлен inbox fallback')).toBe(false);
    expect(extractShortReportSummary([
      'Summary:',
      'Исправил выбор сессии через /select N.',
      'Добавил проверку скорости relay.',
    ].join('\n'))).toContain('Исправил выбор сессии');
  });

  test('renders control center queue timeline html', () => {
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'дальше', 2);
    const queue = getPromptQueue(state, { sessionId: 'session-a' });
    updatePromptQueueItem(state, { sessionId: 'session-a' }, queue.items[0].id, { status: 'running' });
    const model = buildControlCenterModel(state, {
      projectName: 'phraseman',
    });
    const html = renderControlCenterHtml(model);
    expect(html).toContain('Codex Control Center');
    expect(html).toContain('Telegram bridge');
    expect(html).toContain('running');
  });

  test('renders large control center queues as a compact timeline', () => {
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-long', chatTitle: 'Long Queue' }, 'next prompt', 60);
    const model = buildControlCenterModel(state, {
      projectName: 'phraseman',
    });
    const html = renderControlCenterHtml(model);

    expect(html).toContain('Long Queue');
    expect(html).toContain('46 more queued items hidden');
    expect((html.match(/status-queued/g) || []).length).toBeLessThan(30);
  });

  test('shows desktop sender status and queue file count in control center', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-control-desktop-status-'));
    const config = {
      projectRoot: tempDir,
      desktopQueueDir: '.queues',
      controlCenterDir: '.center',
      projectName: 'phraseman',
    };
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'next prompt', 3);
    const paths = buildVisibleQueuePaths(config, { sessionId: 'session-a' });
    fs.mkdirSync(path.dirname(paths.queuePath), { recursive: true });
    fs.writeFileSync(paths.queuePath, 'next prompt\nnext prompt\n', 'utf8');
    fs.writeFileSync(paths.statusPath, JSON.stringify({
      status: 'paused',
      message: "foreground mismatch: process='Telegram'",
      queueRemaining: 2,
      updatedAt: '2026-06-01T14:55:00.000Z',
    }), 'utf8');

    const model = buildControlCenterModel(state, config);
    expect(model.queues[0].desktop).toEqual(expect.objectContaining({
      status: 'paused',
      queueFileCount: 2,
      queueRemaining: 2,
      message: "foreground mismatch: process='Telegram'",
    }));

    const html = renderControlCenterHtml(model);
    expect(html).toContain('Sender: paused');
    expect(html).toContain('Queue file: 2');
    expect(html).toContain('foreground mismatch');
  });

  test('warns when state queue and desktop queue file are out of sync', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-control-drift-'));
    const config = {
      projectRoot: tempDir,
      desktopQueueDir: '.queues',
      controlCenterDir: '.center',
      projectName: 'phraseman',
    };
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'next prompt', 5);
    const paths = buildVisibleQueuePaths(config, { sessionId: 'session-a' });
    fs.mkdirSync(path.dirname(paths.queuePath), { recursive: true });
    fs.writeFileSync(paths.queuePath, 'next prompt\nnext prompt\n', 'utf8');

    const model = buildControlCenterModel(state, config);

    expect(model.queues[0].desktop.drift).toBe(3);
    expect(model.queues[0].desktop.warning).toBe('State/file drift: state queued 5, queue file 2.');
    expect(renderControlCenterHtml(model)).toContain('State/file drift: state queued 5, queue file 2.');
  });

  test('does not warn about missing desktop queue file for codex exec queues', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-center-codex-exec-'));
    const config = {
      projectRoot: tempDir,
      desktopQueueDir: '.queues',
      allowCodexExec: true,
    };
    const state = loadState(null);

    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'next prompt', 2);

    const model = buildControlCenterModel(state, config);
    expect(model.queues[0].desktop.queueFileCount).toBe(0);
    expect(model.queues[0].desktop.warning).toBe('');
  });

  test('control center shows and clears failed telegram updates', () => {
    const state = loadState(null);
    state.failedUpdates = {
      101: {
        updateId: 101,
        attempts: 3,
        kind: 'callback_query',
        text: 'enqueue:100',
        lastError: 'Telegram rejected reply markup',
        updatedAt: '2026-06-02T10:00:00Z',
      },
    };

    const model = buildControlCenterModel(state, { projectName: 'phraseman' });
    expect(model.failedUpdates).toEqual([
      expect.objectContaining({
        updateId: 101,
        attempts: 3,
        kind: 'callback_query',
        text: 'enqueue:100',
        lastError: 'Telegram rejected reply markup',
      }),
    ]);
    const html = renderControlCenterHtml(model);
    expect(html).toContain('Telegram updates');
    expect(html).toContain('enqueue:100');
    expect(html).toContain('Clear update errors');

    const result = applyControlAction({}, state, { action: 'clear-failed-updates' });
    expect(result).toEqual({ ok: true, message: 'cleared 1 failed updates' });
    expect(state.failedUpdates).toEqual({});
  });

  test('builds local control center url from config port', () => {
    expect(buildControlCenterUrl({ controlCenterPort: 4999 })).toBe('http://127.0.0.1:4999/');
    expect(buildControlCenterUrl({})).toBe('http://127.0.0.1:3999/');
  });

  test('control center latest reports filters old technical noise and dedupes sessions', () => {
    const state = loadState(null);
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 1,
      sessionId: 'session-a',
      chatTitle: 'Telegram bridge',
      summary: 'Опции отчета',
      createdAt: '2026-06-01T10:00:00Z',
    });
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 2,
      sessionId: 'session-a',
      chatTitle: 'Telegram bridge',
      summary: 'Финальный ответ Codex',
      createdAt: '2026-06-01T11:00:00Z',
    });
    upsertRoute(state, {
      telegramChatId: 777,
      telegramMessageId: 3,
      sessionId: 'session-a',
      chatTitle: 'Telegram bridge',
      summary: 'Материал Codex: old.txt',
      createdAt: '2026-06-01T12:00:00Z',
    });

    const model = buildControlCenterModel(state, { projectName: 'phraseman' });
    expect(model.routes).toEqual([
      expect.objectContaining({
        sessionId: 'session-a',
        summary: 'Финальный ответ Codex',
      }),
    ]);
  });

  test('control center actions pause resume and clear visible queues', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-control-actions-'));
    const config = {
      projectRoot: tempDir,
      desktopQueueDir: '.queues',
      controlCenterDir: '.center',
    };
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'дальше', 2);
    const paths = buildVisibleQueuePaths(config, { sessionId: 'session-a' });

    let result = applyControlAction(config, state, { action: 'pause' });
    expect(result.ok).toBe(true);
    expect(state.control.paused).toBe(true);
    expect(fs.existsSync(paths.stopFile)).toBe(true);

    result = applyControlAction(config, state, { action: 'resume' });
    expect(result.ok).toBe(true);
    expect(state.control.paused).toBe(false);
    expect(fs.existsSync(paths.stopFile)).toBe(false);

    fs.mkdirSync(path.dirname(paths.queuePath), { recursive: true });
    fs.writeFileSync(paths.queuePath, 'дальше\n', 'utf8');
    result = applyControlAction(config, state, { action: 'clear-queue', queueKey: 'session-a' });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(paths.queuePath)).toBe(false);
    expect(getPromptQueue(state, { sessionId: 'session-a' }).items).toEqual([]);
  });

  test('control center clears only error or finished queue items', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-control-prune-'));
    const config = {
      projectRoot: tempDir,
      desktopQueueDir: '.queues',
      controlCenterDir: '.center',
    };
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'дальше', 4);
    const queue = getPromptQueue(state, { sessionId: 'session-a' });
    updatePromptQueueItem(state, { sessionId: 'session-a' }, queue.items[0].id, { status: 'error', error: 'wrong window' });
    updatePromptQueueItem(state, { sessionId: 'session-a' }, queue.items[1].id, { status: 'done' });
    updatePromptQueueItem(state, { sessionId: 'session-a' }, queue.items[2].id, { status: 'running' });

    let result = applyControlAction(config, state, { action: 'clear-errors', queueKey: 'session-a' });
    expect(result).toEqual({ ok: true, message: 'cleared 1 error items' });
    expect(getPromptQueue(state, { sessionId: 'session-a' }).items.map((item: any) => item.status)).toEqual(['done', 'running', 'queued']);

    result = applyControlAction(config, state, { action: 'clear-finished', queueKey: 'session-a' });
    expect(result).toEqual({ ok: true, message: 'cleared 1 finished items' });
    expect(getPromptQueue(state, { sessionId: 'session-a' }).items.map((item: any) => item.status)).toEqual(['running', 'queued']);
  });

  test('persisted control center prune does not resurrect removed queue items', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'control-center-prune-persist-'));
    const config = {
      projectRoot: tempDir,
      statePath: path.join(tempDir, 'state.json'),
      desktopQueueDir: '.queues',
    };
    const state = loadState(null);
    addPromptQueueItems(state, { sessionId: 'session-a', chatTitle: 'Telegram bridge' }, 'next prompt', 3);
    const queue = getPromptQueue(state, { sessionId: 'session-a' });
    updatePromptQueueItem(state, { sessionId: 'session-a' }, queue.items[0].id, { status: 'error', error: 'wrong window' });
    updatePromptQueueItem(state, { sessionId: 'session-a' }, queue.items[1].id, { status: 'done' });
    saveState(config.statePath, state);

    const prunedState = loadState(config.statePath);
    applyControlAction(config, prunedState, { action: 'clear-errors', queueKey: 'session-a' });
    saveState(config.statePath, prunedState);

    expect(getPromptQueue(loadState(config.statePath), { sessionId: 'session-a' }).items.map((item: any) => item.status)).toEqual(['done', 'queued']);
  });

  test('builds queued prompts for hidden queue modes', () => {
    expect(normalizeQueueMode('быстро')).toBe('fast');
    expect(normalizeQueueMode('без вопросов')).toBe('no_questions');
    expect(buildQueuedPromptForMode('base prompt', 'audit_only')).toContain('только аудит');
    expect(buildQueuedPromptForMode('base prompt', 'normal')).toBe('base prompt');
  });

  test('attaches telegram buttons only to the final chunk options', () => {
    expect(buildTelegramSendOptions(0, 3, true)).toEqual({ parse_mode: 'HTML' });
    expect(buildTelegramSendOptions(1, 3, true)).toEqual({ parse_mode: 'HTML' });
    expect(buildTelegramSendOptions(2, 3, true)).toEqual({
      parse_mode: 'HTML',
      reply_markup: buildTelegramCommandKeyboard(true),
    });
    expect(buildTelegramSendOptions(1, 2, null)).toEqual({ parse_mode: 'HTML' });
    expect(buildTelegramSendOptions(1, 2, false)).toEqual({
      parse_mode: 'HTML',
      reply_markup: buildTelegramCommandKeyboard(false),
    });
  });

  test('serializes telegram report sends with a filesystem lock', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-send-lock-'));
    const config = { statePath: path.join(tempDir, 'state.json'), telegramSendLockStaleMs: 1000 };
    const events: string[] = [];
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const first = withTelegramSendLock(config, async () => {
      events.push('first:start');
      await wait(80);
      events.push('first:end');
    });
    await wait(10);
    const second = withTelegramSendLock(config, async () => {
      events.push('second:start');
      events.push('second:end');
    });

    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
    expect(fs.existsSync(path.join(tempDir, 'send.lock'))).toBe(false);
  });

  test('keeps waiting for an active telegram send lock beyond one stale interval', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-send-lock-active-'));
    const config = { statePath: path.join(tempDir, 'state.json'), telegramSendLockStaleMs: 100 };
    const events: string[] = [];
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const first = withTelegramSendLock(config, async () => {
      events.push('first:start');
      await wait(260);
      events.push('first:end');
    });
    await wait(10);
    const second = withTelegramSendLock(config, async () => {
      events.push('second:start');
      events.push('second:end');
    });

    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
    expect(fs.existsSync(path.join(tempDir, 'send.lock'))).toBe(false);
  });

  test('serializes codex prompts for the same session only', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-codex-session-lock-'));
    const config = { statePath: path.join(tempDir, 'state.json'), codexSessionLockStaleMs: 1000 };
    const events: string[] = [];
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const first = withCodexSessionLock(config, 'session-a', async () => {
      events.push('a1:start');
      await wait(80);
      events.push('a1:end');
    });
    await wait(10);
    const second = withCodexSessionLock(config, 'session-a', async () => {
      events.push('a2:start');
      events.push('a2:end');
    });
    const other = withCodexSessionLock(config, 'session-b', async () => {
      events.push('b:start');
      events.push('b:end');
    });

    await Promise.all([first, second, other]);
    expect(events.indexOf('a2:start')).toBeGreaterThan(events.indexOf('a1:end'));
    expect(events.indexOf('b:start')).toBeGreaterThan(events.indexOf('a1:start'));
    expect(events.indexOf('b:start')).toBeLessThan(events.indexOf('a1:end'));
    expect(fs.existsSync(path.join(tempDir, 'codex-session-locks'))).toBe(true);
    expect(fs.readdirSync(path.join(tempDir, 'codex-session-locks'))).toEqual([]);
  });

  test('attaches final route buttons to the last material without standalone options', async () => {
    jest.resetModules();
    let nextMessageId = 1;
    const sendDocument = jest.fn(async (_token: string, chatId: number, _filePath: string, _options: any) => ({
      chat: { id: chatId },
      message_id: nextMessageId++,
    }));
    const editMessageReplyMarkup = jest.fn(async () => ({}));
    const sendMessage = jest.fn(async (_token: string, chatId: number, _text: string, _options: any) => ({
      chat: { id: chatId },
      message_id: nextMessageId++,
    }));
    jest.doMock('../tools/telegram-bridge/telegram-api.cjs', () => ({
      editMessageReplyMarkup,
      sendDocument,
      sendMessage,
      sendPhoto: jest.fn(),
    }));
    const { sendTelegramAttachments } = require('../tools/telegram-bridge/delivery.cjs');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-material-buttons-'));
    const state = loadState(null);

    await sendTelegramAttachments(
      {
        botToken: 'token',
        statePath: path.join(tempDir, 'state.json'),
        sessionIndexPath: path.join(tempDir, 'missing-index.jsonl'),
        projectName: 'phraseman',
      },
      state,
      777,
      [
        { kind: 'document', path: path.join(tempDir, 'first.pdf'), name: 'first.pdf' },
        { kind: 'document', path: path.join(tempDir, 'second.pdf'), name: 'second.pdf' },
      ],
      {
        sessionId: 'session-abc',
        projectRoot: tempDir,
        projectName: 'phraseman',
        chatTitle: 'Report Chat',
      },
      { includeKeyboard: true }
    );

    expect(sendDocument).toHaveBeenCalledTimes(2);
    expect(sendDocument.mock.calls[0][3].reply_markup).toBeUndefined();
    expect(sendDocument.mock.calls[1][3].reply_markup).toBeUndefined();
    expect(editMessageReplyMarkup).toHaveBeenCalledWith(
      'token',
      777,
      2,
      buildTelegramCommandKeyboard(true)
    );
    expect(sendMessage).not.toHaveBeenCalled();
    expect(resolveReplyRoute(state, { chatId: 777, replyToMessageId: 2 }).sessionId).toBe('session-abc');
    jest.dontMock('../tools/telegram-bridge/telegram-api.cjs');
  });

  test('attaches final route buttons after a material upload failure', async () => {
    jest.resetModules();
    const sendDocument = jest
      .fn()
      .mockResolvedValueOnce({ chat: { id: 777 }, message_id: 10 })
      .mockRejectedValueOnce(new Error('upload failed'));
    const editMessageReplyMarkup = jest.fn(async () => ({}));
    const sendMessage = jest.fn(async (_token: string, chatId: number) => ({ chat: { id: chatId }, message_id: 11 }));
    jest.doMock('../tools/telegram-bridge/telegram-api.cjs', () => ({
      editMessageReplyMarkup,
      sendDocument,
      sendMessage,
      sendPhoto: jest.fn(),
    }));
    const { sendTelegramAttachments } = require('../tools/telegram-bridge/delivery.cjs');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-material-fallback-'));

    await sendTelegramAttachments(
      {
        botToken: 'token',
        statePath: path.join(tempDir, 'state.json'),
        sessionIndexPath: path.join(tempDir, 'missing-index.jsonl'),
        projectName: 'phraseman',
      },
      loadState(null),
      777,
      [
        { kind: 'document', path: path.join(tempDir, 'first.pdf'), name: 'first.pdf' },
        { kind: 'document', path: path.join(tempDir, 'second.pdf'), name: 'second.pdf' },
      ],
      {
        sessionId: 'session-abc',
        projectRoot: tempDir,
        projectName: 'phraseman',
        chatTitle: 'Report Chat',
      },
      { includeKeyboard: true }
    );

    expect(editMessageReplyMarkup).toHaveBeenCalledWith(
      'token',
      777,
      10,
      buildTelegramCommandKeyboard(true)
    );
    expect(sendMessage).not.toHaveBeenCalled();
    jest.dontMock('../tools/telegram-bridge/telegram-api.cjs');
  });

  test('does not send standalone options when every material fails', async () => {
    jest.resetModules();
    const sendDocument = jest.fn(async () => {
      throw new Error('upload failed');
    });
    const editMessageReplyMarkup = jest.fn(async () => ({}));
    const sendMessage = jest.fn(async (_token: string, chatId: number) => ({ chat: { id: chatId }, message_id: 30 }));
    jest.doMock('../tools/telegram-bridge/telegram-api.cjs', () => ({
      editMessageReplyMarkup,
      sendDocument,
      sendMessage,
      sendPhoto: jest.fn(),
    }));
    const { sendTelegramAttachments } = require('../tools/telegram-bridge/delivery.cjs');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telegram-material-text-fallback-'));

    await sendTelegramAttachments(
      {
        botToken: 'token',
        statePath: path.join(tempDir, 'state.json'),
        sessionIndexPath: path.join(tempDir, 'missing-index.jsonl'),
        projectName: 'phraseman',
      },
      loadState(null),
      777,
      [{ kind: 'document', path: path.join(tempDir, 'missing.pdf'), name: 'missing.pdf' }],
      {
        sessionId: 'session-abc',
        projectRoot: tempDir,
        projectName: 'phraseman',
        chatTitle: 'Report Chat',
      },
      {
        includeKeyboard: true,
        fallbackKeyboardMessage: { chat: { id: 777 }, message_id: 5 },
      }
    );

    expect(editMessageReplyMarkup).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
    jest.dontMock('../tools/telegram-bridge/telegram-api.cjs');
  });

  test('builds codex exec resume command with exact last-message output capture', () => {
    const command = buildCodexResumeCommand({
      sessionId: 'session-abc',
      prompt: 'next step',
      outputLastMessagePath: 'C:/tmp/last-message.txt',
    });

    expect(command.file).toBe('codex');
    expect(command.args).toEqual(['exec', 'resume', '-o', 'C:/tmp/last-message.txt', 'session-abc', 'next step']);
  });
});
