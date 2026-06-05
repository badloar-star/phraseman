#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { answerCallbackQuery, getMe, getUpdates, sendMessage } = require('./telegram-api.cjs');
const {
  DEFAULT_NEXT_PROMPT,
  addPromptQueueItems,
  buildSessionInboxKeyboard,
  buildCodexResumeCommand,
  buildTelegramSendOptions,
  buildQueuedPromptForMode,
  buildVisibleQueuePaths,
  collectTelegramAttachments,
  ensureDirFor,
  findLatestRouteForChat,
  findLatestRouteBySessionKey,
  formatSessionInboxForTelegram,
  formatPromptQueueForTelegram,
  formatRoutesForChat,
  formatTelegramMessageWithHeader,
  getNextQueuedPromptItem,
  getPromptQueueDeliveryPlan,
  getPromptQueue,
  getSessionInboxRoutes,
  getSessionTitle,
  getTelegramCallback,
  getTelegramMessage,
  isAuthorizedTelegramUser,
  loadConfig,
  loadState,
  normalizeQueueMode,
  resolveReplyRoute,
  resolveMessageRoute,
  saveState,
  upsertRoute,
  promptQueueCounts,
  updatePromptQueueItem,
  promptQueueKey,
  withCodexSessionLock,
  withTelegramSendLock,
} = require('./core.cjs');
const { sendCleanSessionReport, sendTelegramAttachments } = require('./delivery.cjs');
const { buildControlCenterUrl, writeControlCenter } = require('./control-center.cjs');
const { relayFreshFinalMessages } = require('./relay-latest.cjs');
const { renderReportScreenshot } = require('./report-screenshot.cjs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const activePromptQueues = new Set();
const activeCodexChildren = new Map();
const MAX_PENDING_QUEUE_ITEMS_PER_SESSION = 100;

function textFromCodepoints(codepoints) {
  return String.fromCodePoint(...codepoints);
}

const TEXT_STOP = textFromCodepoints([0x0441, 0x0442, 0x043e, 0x043f]);
const TEXT_PAUSE = textFromCodepoints([0x043f, 0x0430, 0x0443, 0x0437, 0x0430]);
const TEXT_RESUME = textFromCodepoints([0x043f, 0x0440, 0x043e, 0x0434, 0x043e, 0x043b, 0x0436, 0x0438, 0x0442, 0x044c]);
const TEXT_CLEAR_QUEUE = textFromCodepoints([0x043e, 0x0447, 0x0438, 0x0441, 0x0442, 0x0438, 0x0442, 0x044c, 0x0020, 0x043e, 0x0447, 0x0435, 0x0440, 0x0435, 0x0434, 0x044c]);

function recordFailedUpdate(state, update, error) {
  if (!state.failedUpdates || typeof state.failedUpdates !== 'object') state.failedUpdates = {};
  const key = String(update.update_id);
  const previous = state.failedUpdates[key];
  state.failedUpdates[key] = {
    updateId: update.update_id,
    attempts: Number(previous?.attempts || 0) + 1,
    lastError: error.message || String(error),
    updatedAt: new Date().toISOString(),
    kind: update.callback_query ? 'callback_query' : update.message ? 'message' : update.edited_message ? 'edited_message' : 'unknown',
    text: update.message?.text || update.edited_message?.text || update.callback_query?.data || '',
  };
  return state.failedUpdates[key];
}

function clearFailedUpdate(state, updateId) {
  if (!state.failedUpdates || typeof state.failedUpdates !== 'object') state.failedUpdates = {};
  delete state.failedUpdates[String(updateId)];
}

function formatFailedUpdatesForTelegram(state) {
  const failed = Object.values(state.failedUpdates || {})
    .sort((a, b) => Number(b.updateId || 0) - Number(a.updateId || 0))
    .slice(0, 10);
  if (!failed.length) return 'Ошибок Telegram update сейчас нет.';
  return [
    `Ошибки Telegram update: ${Object.keys(state.failedUpdates || {}).length}`,
    '',
    ...failed.map((item) => [
      `update=${item.updateId} attempts=${item.attempts || 1} kind=${item.kind || 'unknown'}`,
      item.text ? `text=${String(item.text).slice(0, 160)}` : '',
      `error=${String(item.lastError || '').slice(0, 300)}`,
    ].filter(Boolean).join('\n')),
    '',
    'Команды: /errors показать, /clearerrors очистить после проверки.',
  ].join('\n\n');
}

function clearFailedUpdates(state) {
  const count = Object.keys(state.failedUpdates || {}).length;
  state.failedUpdates = {};
  return count;
}

function normalizeBotCommand(text) {
  return String(text || '').trim().replace(/^\/([a-z0-9_]+)@[a-z0-9_]+/i, '/$1');
}

function probeControlCenterServer(config, timeoutMs = 600) {
  const url = new URL('health', buildControlCenterUrl(config));
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function ensureControlCenterServer(config) {
  const alreadyRunning = await probeControlCenterServer(config);
  if (alreadyRunning) return { running: true, started: false, url: buildControlCenterUrl(config) };

  const script = path.resolve(config.projectRoot || process.cwd(), 'tools', 'telegram-bridge', 'control-server.cjs');
  if (!fs.existsSync(script)) return { running: false, started: false, url: buildControlCenterUrl(config) };

  const child = spawn(process.execPath, [script], {
    cwd: config.projectRoot || process.cwd(),
    shell: false,
    windowsHide: true,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  await sleep(500);
  return {
    running: await probeControlCenterServer(config),
    started: true,
    pid: child.pid,
    url: buildControlCenterUrl(config),
  };
}

function runCodexPrompt(route, prompt, config) {
  if (config.allowCodexExec !== true) {
    return Promise.resolve({
      ok: false,
      output: 'Telegram bridge Codex execution is disabled. Set allowCodexExec=true or TELEGRAM_BRIDGE_ALLOW_CODEX_EXEC=1 only when the bridge is intentionally allowed to run codex exec.',
    });
  }

  const sessionLockConfig = {
    ...config,
    codexSessionLockStaleMs: Math.max(
      Number(config.codexSessionLockStaleMs) || 0,
      (Number(config.codexTimeoutMs) || 0) + 5 * 60 * 1000
    ),
  };

  return withCodexSessionLock(sessionLockConfig, route.sessionId, async () => {
    const outputLastMessagePath = path.join(
      path.dirname(config.statePath),
      `last-message-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
    );
    ensureDirFor(outputLastMessagePath);
    const command = buildCodexResumeCommand({
      sessionId: route.sessionId,
      prompt,
      config,
      outputLastMessagePath,
    });

    return new Promise((resolve) => {
      let settled = false;
      const child = spawn(command.file, command.args, {
        cwd: route.projectRoot || config.projectRoot,
        shell: false,
        windowsHide: true,
        env: {
          ...process.env,
          TELEGRAM_BRIDGE_SUPPRESS_RELAY: '1',
        },
      });
      const childKey = promptQueueKey(route);
      if (!activeCodexChildren.has(childKey)) activeCodexChildren.set(childKey, new Set());
      activeCodexChildren.get(childKey).add(child);
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGTERM');
        resolve({ ok: false, output: `Codex command timed out after ${config.codexTimeoutMs} ms.` });
      }, config.codexTimeoutMs);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      child.on('error', (error) => {
        activeCodexChildren.get(childKey)?.delete(child);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, output: error.message });
      });
      child.on('close', (code) => {
        activeCodexChildren.get(childKey)?.delete(child);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const lastMessage = fs.existsSync(outputLastMessagePath)
          ? fs.readFileSync(outputLastMessagePath, 'utf8').replace(/^\uFEFF/, '').trim()
          : '';
        try { fs.unlinkSync(outputLastMessagePath); } catch { /* best effort cleanup */ }
        const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n\n').trim();
        resolve({ ok: code === 0, code, output: lastMessage || output || `(codex exited with ${code})` });
      });
    });
  });
}

async function sendLinkedText(config, state, chatId, text, route) {
  return withTelegramSendLock(config, async () => {
    const chatTitle = getSessionTitle(route?.sessionId, {
      chatTitle: route?.chatTitle,
      sessionIndexPath: config.sessionIndexPath,
      projectName: route?.projectName || config.projectName,
    });
    let screenshot = null;
    if (route && config.telegramReportScreenshots === true) {
      screenshot = await renderReportScreenshot({
        chatTitle,
        sessionId: route.sessionId,
        text,
        outputDir: path.join(path.dirname(config.statePath), 'report-screenshots'),
      });
    }
    const materials = route ? collectTelegramAttachments({
      projectRoot: route.projectRoot || config.projectRoot,
      text,
      includeRecentArtifacts: true,
      artifactRoots: config.telegramArtifactScanRoots,
      recentWindowMs: config.telegramArtifactScanWindowMs,
      recentMaxFiles: config.telegramArtifactScanMaxFiles,
      maxBytes: config.telegramAttachmentMaxBytes,
      photoMaxBytes: config.telegramPhotoMaxBytes,
      limit: config.telegramAttachmentLimit,
    }).filter((attachment) => attachment.path !== screenshot?.path) : [];
    const sent = await sendCleanSessionReport(config, state, chatId, {
      text,
      screenshotPath: screenshot?.path,
      route,
      chatTitle,
      summary: 'Краткий отчет Codex',
      materials,
    });
    writeControlCenter(config, state);
    return sent ? [sent] : [];
  });
}

async function sendCommandText(config, chatId, text) {
  return withTelegramSendLock(config, async () => {
    const chunks = formatTelegramMessageWithHeader('Telegram-мост', text);
    for (let index = 0; index < chunks.length; index += 1) {
      await sendMessage(
        config.botToken,
        chatId,
        chunks[index],
        buildTelegramSendOptions(index, chunks.length, false)
      );
    }
  });
}

async function sendVisiblePrompt(config, chatId, route, prompt, options = {}) {
  const chatTitle = getSessionTitle(route?.sessionId, {
    chatTitle: route?.chatTitle,
    sessionIndexPath: config.sessionIndexPath,
    projectName: route?.projectName || config.projectName,
  });
  const prefix = options.prefix || 'Промпт физически отправлен';
  await sendCommandText(
    config,
    chatId,
    `${prefix} в Codex-чат "${chatTitle}":\n\n${prompt}`
  );
}

function appendDesktopPromptQueue(config, route, prompt, count) {
  const paths = buildVisibleQueuePaths(config, route);
  const queuePath = paths.queuePath;
  ensureDirFor(queuePath);
  const safeCount = Math.max(1, Math.min(100, Number(count) || 1));
  const lines = Array.from({ length: safeCount }, () => prompt);
  fs.appendFileSync(queuePath, `${lines.join('\n')}\n`, 'utf8');
  fs.writeFileSync(paths.statusPath, JSON.stringify({
    queueKey: paths.key,
    sessionId: route?.sessionId,
    chatTitle: route?.chatTitle,
    status: 'queued',
    count: safeCount,
    updatedAt: new Date().toISOString(),
  }, null, 2), 'utf8');
  return { ...paths, count: safeCount };
}

function startDesktopPromptSender(config, route) {
  const script = path.resolve(config.projectRoot || process.cwd(), 'scripts', 'codex-chat-queue-sender.ps1');
  if (!fs.existsSync(script)) return null;
  const paths = buildVisibleQueuePaths(config, route);
  const existingPid = Number(fs.existsSync(paths.pidPath) ? fs.readFileSync(paths.pidPath, 'utf8').trim() : '');
  if (Number.isInteger(existingPid) && existingPid > 0) {
    try {
      process.kill(existingPid, 0);
      process.kill(existingPid);
      fs.appendFileSync(paths.outLogPath, `\n--- bridge stopped sleeping sender pid=${existingPid} ${new Date().toISOString()} ---\n`, 'utf8');
      fs.rmSync(paths.pidPath, { force: true });
      fs.rmSync(paths.stopFile, { force: true });
    } catch {
      fs.rmSync(paths.pidPath, { force: true });
    }
  }
  fs.rmSync(paths.stopFile, { force: true });
  ensureDirFor(paths.outLogPath);
  const out = fs.openSync(paths.outLogPath, 'a');
  const err = fs.openSync(paths.errLogPath, 'a');
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const child = spawn(powershell, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    '-TargetTitle',
    config.desktopQueueTargetTitle || 'phraseman',
    '-IntervalSeconds',
    String(config.desktopQueueIntervalSeconds || 300),
    '-QueuePath',
    paths.queuePath,
    '-PromptPath',
    path.resolve(config.projectRoot || process.cwd(), '.codex-tmp', 'codex-next-prompt.txt'),
    '-StopFile',
    paths.stopFile,
    '-StatusPath',
    paths.statusPath,
    '-LastPromptHashPath',
    path.join(paths.queueDir, 'last-prompt.sha256'),
    '-InputClickXRatio',
    String(config.desktopQueueInputClickXRatio || 0.52),
    '-InputClickBottomOffset',
    String(config.desktopQueueInputClickBottomOffset || 155),
    '-AllowRepeatedTokenPrompt',
  ], {
    cwd: config.projectRoot || process.cwd(),
    shell: false,
    windowsHide: true,
    detached: true,
    stdio: ['ignore', out, err],
  });
  fs.closeSync(out);
  fs.closeSync(err);
  child.unref();
  fs.writeFileSync(paths.pidPath, `${child.pid}\n`, 'utf8');
  fs.appendFileSync(paths.outLogPath, `\n--- bridge started sender pid=${child.pid} ${new Date().toISOString()} ---\n`, 'utf8');
  return child.pid;
}

function buildCodexErrorText(result) {
  return `Codex завершился с ошибкой${result.code !== undefined ? `, код ${result.code}` : ''}\n\n${result.output}`;
}

async function enqueueRoutePrompts(config, state, chatId, route, count, sourceTelegramMessageId) {
  if (state.control?.paused) {
    await sendCommandText(config, chatId, 'Bridge is paused. Send /resume only when you want to allow new queue work.');
    return;
  }
  const mode = normalizeQueueMode(state.control?.queueMode || 'normal');
  const prompt = buildQueuedPromptForMode(DEFAULT_NEXT_PROMPT, mode);
  const currentCounts = promptQueueCounts(getPromptQueue(state, route));
  const activeCount = currentCounts.queued + currentCounts.running;
  const requestedCount = Math.max(1, Math.min(100, Number(count) || 1));
  const allowedCount = Math.max(0, Math.min(requestedCount, MAX_PENDING_QUEUE_ITEMS_PER_SESSION - activeCount));
  if (allowedCount <= 0) {
    await sendCommandText(config, chatId, `Queue limit reached for this session: ${activeCount}/${MAX_PENDING_QUEUE_ITEMS_PER_SESSION}. Send /stop to clear or wait for items to finish.`);
    return;
  }
  addPromptQueueItems(state, route, prompt, allowedCount, { sourceTelegramMessageId });
  const deliveryPlan = getPromptQueueDeliveryPlan(config);
  const desktopQueue = deliveryPlan.appendDesktopQueue
    ? appendDesktopPromptQueue(config, route, prompt, allowedCount)
    : { ...buildVisibleQueuePaths(config, route), count: allowedCount };
  const senderPid = deliveryPlan.startDesktopSender ? startDesktopPromptSender(config, route) : null;
  saveState(config.statePath, state);
  writeControlCenter(config, state);
  if (deliveryPlan.processViaCodexExec) {
    processRoutePromptQueue(config, chatId, route).catch((error) => {
      console.log(`[telegram-bridge] exact session queue failed: ${error.message}`);
    });
    await sendCommandText(
      config,
      chatId,
      [
        `Отправляю в точную Codex-сессию: Дальше x${desktopQueue.count}.`,
        `Session: ${route.sessionId || 'latest'}.`,
        `Режим: ${mode}.`,
        'Метод: codex exec resume <session_id>. Desktop paste отключен, чтобы prompt не ушел в другой чат.',
        `Control Center: ${buildVisibleQueuePaths(config, route).controlCenterPath}`,
      ].join('\n')
    );
    return;
  }
  if (!deliveryPlan.startDesktopSender) {
    await sendCommandText(
      config,
      chatId,
      [
        `Queued for this Codex session: Next x${desktopQueue.count}.`,
        `Session: ${route.sessionId || 'latest'}.`,
        `Mode: ${mode}.`,
        'No execution backend is enabled, so items stay queued instead of being marked error immediately.',
        'Enable allowCodexExec=true for automatic exact-session execution.',
        `Control Center: ${buildVisibleQueuePaths(config, route).controlCenterPath}`,
      ].join('\n')
    );
    return;
  }
  await sendCommandText(
    config,
    chatId,
    [
      `Отправляю в VS Code: Дальше x${desktopQueue.count}.`,
      `Режим: ${mode}.`,
      senderPid ? 'Sender started. It waits for the configured interval before pasting, so it will not instantly overwrite manual input.' : 'Sender не запущен: не найден стартовый скрипт.',
      `Control Center: ${buildVisibleQueuePaths(config, route).controlCenterPath}`,
    ].join('\n')
  );
}

function setQueuePaused(config, state, paused) {
  if (!state.control || typeof state.control !== 'object') state.control = {};
  state.control.paused = Boolean(paused);
  state.control.updatedAt = new Date().toISOString();
  if (paused) {
    for (const children of activeCodexChildren.values()) {
      for (const child of children) {
        try { child.kill('SIGTERM'); } catch { /* best effort emergency pause */ }
      }
      children.clear();
    }
  }
  for (const queue of Object.values(state.promptQueues || {})) {
    const paths = buildVisibleQueuePaths(config, queue);
    if (paused) {
      ensureDirFor(paths.stopFile);
      fs.writeFileSync(paths.stopFile, `paused ${state.control.updatedAt}\n`, 'utf8');
    } else {
      fs.rmSync(paths.stopFile, { force: true });
    }
  }
  saveState(config.statePath, state);
  writeControlCenter(config, state);
}

function emergencyStopQueues(config, state) {
  setQueuePaused(config, state, true);
  return clearQueues(config, state, null);
}

function setSelectedSession(state, chatId, route) {
  if (!state.selectedSessions || typeof state.selectedSessions !== 'object') state.selectedSessions = {};
  const key = promptQueueKey(route);
  state.selectedSessions[String(chatId)] = {
    sessionKey: key,
    sessionId: route.sessionId,
    chatTitle: route.chatTitle,
    selectedAt: new Date().toISOString(),
  };
  return state.selectedSessions[String(chatId)];
}

function clearSelectedSession(state, chatId) {
  if (!state.selectedSessions || typeof state.selectedSessions !== 'object') state.selectedSessions = {};
  delete state.selectedSessions[String(chatId)];
}

function resolveSelectedRoute(state, chatId) {
  const selected = state.selectedSessions?.[String(chatId)];
  if (!selected?.sessionKey) return null;
  return findLatestRouteBySessionKey(state, chatId, selected.sessionKey);
}

function resolveCommandRoute(state, message) {
  return resolveMessageRoute(state, message) || resolveSelectedRoute(state, message.chatId);
}

function clearQueues(config, state, route = null) {
  const keys = route ? [promptQueueKey(route)] : Object.keys(state.promptQueues || {});
  for (const key of keys) {
    const queue = state.promptQueues?.[key];
    if (!queue) continue;
    const paths = buildVisibleQueuePaths(config, queue);
    fs.rmSync(paths.queuePath, { force: true });
    fs.rmSync(paths.statusPath, { force: true });
    state.promptQueues[key].items = [];
    state.promptQueues[key].replaceItems = true;
    state.promptQueues[key].updatedAt = new Date().toISOString();
  }
  saveState(config.statePath, state);
  writeControlCenter(config, state);
  return keys.length;
}

async function sendInbox(config, state, chatId) {
  const keyboard = buildSessionInboxKeyboard(state, chatId);
  await withTelegramSendLock(config, async () => {
    await sendMessage(config.botToken, chatId, formatSessionInboxForTelegram(state, chatId), {
      parse_mode: 'HTML',
      ...(keyboard ? { reply_markup: keyboard } : {}),
    });
  });
}

async function sendLastReportSummary(config, state, chatId) {
  const route = findLatestRouteForChat(state, chatId);
  if (!route) {
    await sendCommandText(config, chatId, 'Последний отчет не найден.');
    return;
  }
  await sendCommandText(config, chatId, [
    `Последний отчет: ${route.chatTitle || route.sessionId}`,
    route.summary || 'Сводка не сохранена.',
    Array.isArray(route.materials) && route.materials.length ? `Материалы: ${route.materials.length}` : '',
  ].filter(Boolean).join('\n'));
}

async function sendRouteMaterials(config, state, chatId, route) {
  const materials = Array.isArray(route?.materials) ? route.materials : [];
  if (materials.length === 0) {
    await sendCommandText(config, chatId, 'Для этого отчета материалы не сохранены.');
    return;
  }
  await sendTelegramAttachments(config, state, chatId, materials, route, { includeKeyboard: false });
}

async function sendQueueStatus(config, state, chatId, route = null) {
  if (route) {
    await sendCommandText(config, chatId, formatPromptQueueForTelegram(state, route));
    return;
  }
  const queues = Object.values(state.promptQueues || {});
  if (queues.length === 0) {
    await sendCommandText(config, chatId, 'Пока нет физических очередей prompt-задач.');
    return;
  }
  const lines = ['Физические очереди prompt-задач:'];
  for (const queue of queues) {
    const counts = promptQueueCounts(queue);
    lines.push(`${queue.chatTitle || queue.sessionId}: всего ${counts.total}, ждут ${counts.queued}, выполняется ${counts.running}, готово ${counts.done}, ошибок ${counts.error}`);
  }
  await sendCommandText(config, chatId, lines.join('\n'));
}

async function sendControlCenterStatus(config, state, chatId) {
  writeControlCenter(config, state);
  const server = await ensureControlCenterServer(config);
  const queueCount = Object.keys(state.promptQueues || {}).length;
  const mode = normalizeQueueMode(state.control?.queueMode || 'normal');
  await sendCommandText(config, chatId, [
    'Панель Codex Control Center готова.',
    `Ссылка на этом ПК: ${server.url}`,
    server.running
      ? `Сервер работает${server.started && server.pid ? `, pid ${server.pid}` : ''}.`
      : 'Сервер не поднялся автоматически. Запустите npm run telegram:control-server.',
    state.control?.paused ? 'Очередь сейчас на паузе.' : 'Очередь активна.',
    `Режим очереди: ${mode}.`,
    `Очередей в памяти: ${queueCount}.`,
  ].join('\n'));
}

async function processRoutePromptQueue(config, chatId, route) {
  const key = promptQueueKey(route);
  if (activePromptQueues.has(key)) return;
  activePromptQueues.add(key);
  try {
    while (true) {
      const state = loadState(config.statePath);
      if (state.control?.paused) return;
      const item = getNextQueuedPromptItem(state, route);
      if (!item) return;
      const countsBefore = promptQueueCounts(state.promptQueues?.[key]);
      updatePromptQueueItem(state, route, item.id, {
        status: 'running',
        startedAt: new Date().toISOString(),
      });
      saveState(config.statePath, state);

      await sendVisiblePrompt(config, chatId, route, item.prompt, {
        prefix: `Очередь ${item.position}/${countsBefore.total}: prompt физически отправлен`,
      });

      const result = await runCodexPrompt(route, item.prompt, config);
      const latestState = loadState(config.statePath);
      updatePromptQueueItem(latestState, route, item.id, {
        status: result.ok ? 'done' : 'error',
        finishedAt: new Date().toISOString(),
        error: result.ok ? undefined : result.output,
      });
      saveState(config.statePath, latestState);

      await sendLinkedText(
        config,
        latestState,
        chatId,
        result.ok ? result.output : buildCodexErrorText(result),
        route
      );
    }
  } finally {
    activePromptQueues.delete(key);
  }
}

async function sendCommandHelp(config, chatId) {
  await sendCommandText(config, chatId, [
    'Команды Telegram-моста:',
    '',
    '/inbox или /menu - открыть список Codex-сессий. Нажми сессию, потом отправь обычное сообщение, и оно уйдет именно туда.',
    '/select N - выбрать сессию из последнего списка /inbox по номеру, если кнопки Telegram не сработали.',
    '/selected - показать выбранную сессию.',
    '/unselect - сбросить выбранную сессию.',
    '/queue - показать состояние очереди.',
    '/status - проверить, что мост работает.',
    '/control - открыть Codex Control Center.',
    '/last - показать последний отчет.',
    '/errors - показать последние ошибки Telegram update.',
    '/clearerrors - очистить список ошибок после проверки.',
    '/pause - поставить очередь на паузу.',
    '/resume - продолжить очередь.',
    '/stop - аварийно остановить и очистить очереди.',
    '/clearqueue - очистить очередь текущей сессии, если команда отправлена reply на отчет.',
    '/mode normal|cautious|fast|no_questions|audit_only - сменить режим очереди.',
    '',
    'Кнопки под отчетом:',
    'Дальше - добавить 1 следующий шаг в эту же Codex-сессию.',
    'Дальше 10 - добавить 10 шагов в эту же сессию.',
    'Дальше 100 - добавить большую очередь в эту же сессию.',
    'Материалы - прислать файлы и изображения отчета, если они есть.',
    'Команды - показать эту справку.',
  ].join('\n'));
}

async function handleMessage(message, config, state) {
  const commandText = normalizeBotCommand(message.text);

  if (!isAuthorizedTelegramUser(message, config)) {
    if (commandText === '/whoami' && (config.allowedUserIds || []).length === 0) {
      await sendCommandText(config, message.chatId, `chat_id=${message.chatId}\nuser_id=${message.fromUserId}`);
      return;
    }
    console.log(`[telegram-bridge] Rejected unauthorized user ${message.fromUserId}.`);
    return;
  }

  if (commandText === '/whoami') {
    await sendCommandText(config, message.chatId, `chat_id=${message.chatId}\nuser_id=${message.fromUserId}`);
    return;
  }

  if (commandText === '/start') {
    await sendInbox(config, state, message.chatId);
    return;
  }

  const normalizedText = message.text.toLowerCase().trim();

  if (commandText === '/help' || commandText === '/commands' || normalizedText === 'команды' || normalizedText === 'помощь') {
    await sendCommandHelp(config, message.chatId);
    return;
  }

  if (normalizedText === TEXT_STOP || commandText === '/stop') {
    const cleared = emergencyStopQueues(config, state);
    await sendCommandText(config, message.chatId, `Emergency stop: queues cleared=${cleared}. Bridge is paused.`);
    return;
  }

  if (normalizedText === TEXT_PAUSE || commandText === '/pause') {
    setQueuePaused(config, state, true);
    await sendCommandText(config, message.chatId, 'Queue paused. Active Codex process was stopped if one was running.');
    return;
  }

  if (normalizedText === TEXT_RESUME || commandText === '/resume') {
    setQueuePaused(config, state, false);
    await sendCommandText(config, message.chatId, 'Queue resumed.');
    return;
  }

  if (normalizedText === TEXT_CLEAR_QUEUE || commandText === '/clearqueue') {
    const route = resolveCommandRoute(state, message);
    const cleared = clearQueues(config, state, route);
    await sendCommandText(config, message.chatId, route ? 'Session queue cleared.' : `Queues cleared: ${cleared}.`);
    return;
  }

  if (commandText === '/inbox' || normalizedText === 'инбокс' || commandText === '/menu' || normalizedText === 'меню') {
    await sendInbox(config, state, message.chatId);
    return;
  }

  const selectMatch = commandText.match(/^\/select\s+(\d+)$/i) || normalizedText.match(/^выбрать\s+(\d+)$/i);
  if (selectMatch) {
    const sessions = getSessionInboxRoutes(state, message.chatId);
    const item = sessions[Number(selectMatch[1]) - 1];
    if (!item) {
      await sendCommandText(config, message.chatId, `Сессия #${selectMatch[1]} не найдена. Отправьте /inbox, чтобы увидеть актуальный список.`);
      return;
    }
    const selected = setSelectedSession(state, message.chatId, item.route);
    saveState(config.statePath, state);
    await sendCommandText(config, message.chatId, [
      `Выбрана сессия: ${item.route.chatTitle || item.route.sessionId}`,
      `Session: ${selected.sessionId}`,
      '',
      'Теперь отправьте обычное сообщение, и оно уйдет именно в эту Codex-сессию.',
      'Сброс выбора: /unselect',
    ].join('\n'));
    return;
  }

  if (commandText === '/routes') {
    await sendCommandText(config, message.chatId, formatRoutesForChat(state, message.chatId));
    return;
  }

  if (commandText === '/selected') {
    const selectedRoute = resolveSelectedRoute(state, message.chatId);
    await sendCommandText(
      config,
      message.chatId,
      selectedRoute
        ? `Selected session: ${selectedRoute.chatTitle || selectedRoute.sessionId}\nSession: ${selectedRoute.sessionId}`
        : 'No selected session. Send /inbox and tap a session button.'
    );
    return;
  }

  if (commandText === '/unselect') {
    clearSelectedSession(state, message.chatId);
    saveState(config.statePath, state);
    await sendCommandText(config, message.chatId, 'Selected session cleared.');
    return;
  }

  if (commandText === '/control' || normalizedText === 'панель' || normalizedText === 'контроль') {
    await sendControlCenterStatus(config, state, message.chatId);
    return;
  }

  if (commandText === '/queue' || normalizedText === 'очередь') {
    await sendQueueStatus(config, state, message.chatId, resolveCommandRoute(state, message));
    return;
  }

  if (commandText === '/status' || normalizedText === 'статус') {
    const controlUrl = buildControlCenterUrl(config);
    await sendCommandText(config, message.chatId, [
      'Процесс моста работает и читает обновления Telegram.',
      `Control Center: ${controlUrl}`,
      state.control?.paused ? 'Очередь на паузе.' : 'Очередь активна.',
    ].join('\n'));
    return;
  }

  if (normalizedText === 'стоп' || normalizedText === 'пауза' || commandText === '/pause') {
    setQueuePaused(config, state, true);
    await sendCommandText(config, message.chatId, 'Очередь поставлена на паузу. Sender остановится через stop-файлы.');
    return;
  }

  if (normalizedText === 'продолжить' || commandText === '/resume') {
    setQueuePaused(config, state, false);
    await sendCommandText(config, message.chatId, 'Пауза снята. Нажмите Дальше/Дальше 10/Дальше 100 под нужным отчетом, чтобы запустить sender.');
    return;
  }

  if (normalizedText === 'очистить очередь' || commandText === '/clearqueue') {
    const route = resolveCommandRoute(state, message);
    const cleared = clearQueues(config, state, route);
    await sendCommandText(config, message.chatId, route ? 'Очередь этой сессии очищена.' : `Очищены очереди: ${cleared}.`);
    return;
  }

  if (normalizedText === 'последний отчет' || commandText === '/last') {
    await sendLastReportSummary(config, state, message.chatId);
    return;
  }

  if (commandText === '/errors') {
    await sendCommandText(config, message.chatId, formatFailedUpdatesForTelegram(state));
    return;
  }

  if (commandText === '/clearerrors') {
    const cleared = clearFailedUpdates(state);
    saveState(config.statePath, state);
    await sendCommandText(config, message.chatId, `Ошибки Telegram update очищены: ${cleared}.`);
    return;
  }

  const modeMatch = normalizedText.match(/^режим\s+(.+)$/);
  if (modeMatch || commandText.startsWith('/mode')) {
    const rawMode = modeMatch ? modeMatch[1] : commandText.replace(/^\/mode\s*/i, '');
    if (!state.control || typeof state.control !== 'object') state.control = {};
    state.control.queueMode = normalizeQueueMode(rawMode);
    state.control.updatedAt = new Date().toISOString();
    saveState(config.statePath, state);
    writeControlCenter(config, state);
    await sendCommandText(config, message.chatId, `Режим очереди: ${state.control.queueMode}.`);
    return;
  }

  const enqueueMatch = normalizedText.match(/^(?:далее|дальше)(?:\s*x?(\d+))?$/);
  if (enqueueMatch) {
    const route = resolveCommandRoute(state, message);
    if (!route) {
      await sendCommandText(config, message.chatId, 'Чтобы физически добавить очередь в нужный Codex-чат, выберите сессию через /inbox, отправьте "дальше 100" реплаем на конкретный отчет или нажмите кнопку под этим отчетом.');
      return;
    }
    await enqueueRoutePrompts(config, state, message.chatId, route, enqueueMatch[1] || 1, message.messageId);
    return;
  }

  const replyRoute = resolveMessageRoute(state, message);
  const selectedRoute = replyRoute ? null : resolveSelectedRoute(state, message.chatId);
  const route = replyRoute || selectedRoute;
  if (!route) {
    const text = message.replyToMessageId
      ? 'Это сообщение, на которое вы ответили, не привязано к Codex-сессии. Ответьте реплаем именно на отчет или ответ нужной задачи.'
      : 'Select a session first: send /inbox and tap a session button. Then send one prompt as a normal message.';
    await sendCommandText(config, message.chatId, text);
    return;
  }

  if (selectedRoute) {
    clearSelectedSession(state, message.chatId);
    saveState(config.statePath, state);
    await sendCommandText(config, message.chatId, `Sending to selected session: ${route.chatTitle || route.sessionId}\nSession: ${route.sessionId}`);
  }

  runCodexPrompt(route, message.text, config)
    .then(async (result) => {
      const responseText = result.ok ? result.output : `Codex завершился с ошибкой${result.code !== undefined ? `, код ${result.code}` : ''}\n\n${result.output}`;
      await sendLinkedText(config, state, message.chatId, responseText, route);
    })
    .catch(async (error) => {
      await sendLinkedText(config, state, message.chatId, `Codex завершился с ошибкой\n\n${error.message}`, route);
    });
}

async function handleCallback(callback, config, state) {
  if (!isAuthorizedTelegramUser(callback, config)) {
    await answerCallbackQuery(config.botToken, callback.callbackId, { text: 'Нет доступа.' }).catch(() => null);
    console.log(`[telegram-bridge] Rejected unauthorized callback user ${callback.fromUserId}.`);
    return;
  }

  await answerCallbackQuery(config.botToken, callback.callbackId, { text: 'Принял.' }).catch(() => null);

  const route = resolveReplyRoute(state, {
    chatId: callback.chatId,
    replyToMessageId: callback.messageId,
  });

  const sessionMatch = callback.data.match(/^session:(.+)$/);
  if (sessionMatch) {
    const selectedRoute = findLatestRouteBySessionKey(state, callback.chatId, sessionMatch[1]);
    if (!selectedRoute) {
      await sendCommandText(config, callback.chatId, 'Сессия из inbox больше не найдена.');
      return;
    }
    const selected = setSelectedSession(state, callback.chatId, selectedRoute);
    saveState(config.statePath, state);
    await sendCommandText(config, callback.chatId, [
      `Selected: ${selectedRoute.chatTitle || selectedRoute.sessionId}`,
      `Session: ${selected.sessionId}`,
      selectedRoute.summary || 'Сводка не сохранена.',
      Array.isArray(selectedRoute.materials) && selectedRoute.materials.length ? `Материалы: ${selectedRoute.materials.length}` : '',
      '',
      'Now send one normal Telegram message. It will be sent to this exact Codex session.',
      'Use /unselect to clear selection.',
    ].filter(Boolean).join('\n'));
    return;
  }

  if (callback.data === 'cmd:queue') {
    await sendQueueStatus(config, state, callback.chatId, route);
    return;
  }

  if (callback.data === 'cmd:status') {
    await sendControlCenterStatus(config, state, callback.chatId);
    return;
  }

  if (callback.data === 'cmd:routes') {
    await sendCommandText(config, callback.chatId, formatRoutesForChat(state, callback.chatId));
    return;
  }

  if (callback.data === 'cmd:help') {
    await sendCommandHelp(config, callback.chatId);
    return;
  }

  if (callback.data === 'cmd:materials') {
    await sendRouteMaterials(config, state, callback.chatId, route);
    return;
  }

  const enqueueMatch = callback.data.match(/^enqueue:(\d+)$/);
  if (enqueueMatch) {
    if (!route) {
      await sendCommandText(config, callback.chatId, 'Эта кнопка очереди не привязана к Codex-сессии. Нажмите "далее x100" под конкретным отчетом.');
      return;
    }
    await answerCallbackQuery(config.botToken, callback.callbackId, { text: `Добавляю ${enqueueMatch[1]} prompt-задач в эту сессию.` }).catch(() => null);
    await enqueueRoutePrompts(config, state, callback.chatId, route, enqueueMatch[1], callback.messageId);
    return;
  }

  if (callback.data === 'route:next') {
    if (!route) {
      await sendCommandText(config, callback.chatId, 'Эта старая кнопка не привязана к Codex-сессии. Откройте /inbox и выберите сессию заново.');
      return;
    }
    await enqueueRoutePrompts(config, state, callback.chatId, route, 1, callback.messageId);
    return;
  }

  if (callback.data === 'route:audit') {
    if (!route) {
      await sendCommandText(config, callback.chatId, 'Эта старая кнопка аудита не привязана к Codex-сессии. Откройте /inbox и выберите сессию заново.');
      return;
    }
    await sendVisiblePrompt(config, callback.chatId, route, 'Проведи аудит этой Codex-сессии: найди, что не работает, исправь ошибки, улучши стабильность и после завершения пришли отчет на русском языке.');
    runCodexPrompt(route, 'Проведи аудит этой Codex-сессии: найди, что не работает, исправь ошибки, улучши стабильность и после завершения пришли отчет на русском языке.', config)
      .then(async (result) => {
        await sendLinkedText(config, state, callback.chatId, result.ok ? result.output : buildCodexErrorText(result), route);
      })
      .catch(async (error) => {
        await sendLinkedText(config, state, callback.chatId, `Codex завершился с ошибкой\n\n${error.message}`, route);
      });
    return;
  }

  await sendCommandText(config, callback.chatId, `Неизвестная команда кнопки: ${callback.data}`);
}

async function loop() {
  const config = loadConfig();
  if (!config.botToken) throw new Error('Missing Telegram bot token.');

  const me = await getMe(config.botToken);
  console.log(`[telegram-bridge] Connected as @${me.username || me.first_name}.`);
  let state = loadState(config.statePath);
  writeControlCenter(config, state);
  ensureControlCenterServer(config).then((server) => {
    console.log(`[telegram-bridge] Control Center ${server.running ? 'ready' : 'not ready'} at ${server.url}${server.pid ? ` pid=${server.pid}` : ''}.`);
  }).catch((error) => {
    console.log(`[telegram-bridge] Control Center start failed: ${error.message}`);
  });
  let lastRelayScanAt = 0;

  while (true) {
    try {
      if (Date.now() - lastRelayScanAt >= config.relayScanIntervalMs) {
        lastRelayScanAt = Date.now();
        await relayFreshFinalMessages(config).catch((error) => {
          console.log(`[telegram-bridge] relay scan failed: ${error.message}`);
        });
        state = loadState(config.statePath);
      }

      const updates = await getUpdates(config.botToken, {
        offset: state.lastUpdateId ? state.lastUpdateId + 1 : undefined,
        timeout: 20,
      });

      for (const update of updates) {
        state = loadState(config.statePath);
        state.lastUpdateId = Math.max(state.lastUpdateId || 0, update.update_id);
        try {
          const message = getTelegramMessage(update);
          if (message) await handleMessage(message, config, state);
          const callback = getTelegramCallback(update);
          if (callback) await handleCallback(callback, config, state);
          clearFailedUpdate(state, update.update_id);
        } catch (updateError) {
          const failure = recordFailedUpdate(state, update, updateError);
          console.log(`[telegram-bridge] update ${update.update_id} failed attempt=${failure.attempts}: ${updateError.message}`);
        } finally {
          saveState(config.statePath, state);
        }
      }
    } catch (error) {
      console.log(`[telegram-bridge] ${error.message}`);
      await sleep(Math.max(config.pollIntervalMs, 3000));
    }
  }
}

loop().catch((error) => {
  console.error(`[telegram-bridge] ${error.message}`);
  process.exit(1);
});
