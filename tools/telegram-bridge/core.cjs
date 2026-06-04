const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(process.cwd(), '.codex-tmp', 'telegram-bridge');
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_DATA_DIR, 'config.json');
const DEFAULT_STATE_PATH = path.join(DEFAULT_DATA_DIR, 'state.json');
const DEFAULT_SESSION_INDEX_PATH = path.join(os.homedir(), '.codex', 'session_index.jsonl');
const DEFAULT_SEND_LOCK_STALE_MS = 2 * 60 * 1000;
const DEFAULT_SEND_LOCK_POLL_MS = 250;
const DEFAULT_CODEX_SESSION_LOCK_STALE_MS = 35 * 60 * 1000;
const DEFAULT_AUDIT_PROMPT = 'Проведи полный аудит этого чата и задачи: найди ошибки, исправь их, улучши решение и доведи до стабильной рабочей версии. После завершения пришли полный отчет на русском языке.';
const DEFAULT_NEXT_PROMPT = 'Проанализируй именно этот чат и задачу. Определи лучший следующий маршрут, напиши полный практический план, выбери оптимальный путь и сразу продолжай выполнение задачи. После завершения пришли полный отчет на русском языке: что изменено, какие файлы и материалы созданы, как проверено, что делать дальше.';
const QUEUE_MODES = {
  normal: '',
  cautious: 'Режим: осторожно. Перед изменениями проверь риски, не делай широких правок без необходимости, обязательно проверяй результат.',
  fast: 'Режим: быстро. Выбери самый короткий надежный путь, не расписывай лишнюю теорию, сразу делай полезное действие и проверку.',
  no_questions: 'Режим: без вопросов. Не задавай уточняющих вопросов, если можно принять разумное безопасное решение самостоятельно.',
  audit_only: 'Режим: только аудит. Не меняй файлы без отдельной команды; найди проблемы, риски и предложи конкретный план исправлений.',
};
const DEFAULT_ATTACHMENT_MAX_BYTES = 49 * 1024 * 1024;
const DEFAULT_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_ATTACHMENT_LIMIT = 10;
const DEFAULT_ARTIFACT_SCAN_WINDOW_MS = 20 * 60 * 1000;
const DEFAULT_ARTIFACT_SCAN_MAX_FILES = 2000;
const DEFAULT_ARTIFACT_SCAN_ROOTS = [
  'exports',
  'qa-artifacts',
  'docs/reports',
  '.codex-tmp',
  'lingman-scenarist-pipeline',
  'lingman-montazher',
];
const TELEGRAM_PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const TELEGRAM_DOCUMENT_EXTENSIONS = new Set([
  '.gif', '.svg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.md', '.csv', '.srt', '.vtt', '.zip', '.mp4', '.mov', '.m4v',
  '.mp3', '.wav', '.json',
]);

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTelegramSendLockDir(config = {}) {
  const stateDir = config.statePath ? path.dirname(config.statePath) : DEFAULT_DATA_DIR;
  return path.join(stateDir, 'send.lock');
}

function normalizeLockName(value) {
  return String(value || 'latest').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 160) || 'latest';
}

function getCodexSessionLockDir(config = {}, sessionId = 'latest') {
  const stateDir = config.statePath ? path.dirname(config.statePath) : DEFAULT_DATA_DIR;
  return path.join(stateDir, 'codex-session-locks', `${normalizeLockName(sessionId)}.lock`);
}

async function acquireDirectoryLock(lockDir, staleMs = DEFAULT_SEND_LOCK_STALE_MS) {
  const pollMs = Math.max(25, Math.min(DEFAULT_SEND_LOCK_POLL_MS, Math.floor(staleMs / 4) || DEFAULT_SEND_LOCK_POLL_MS));
  const heartbeatMs = Math.max(25, Math.min(10000, Math.floor(staleMs / 4) || 10000));
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });
  while (true) {
    try {
      fs.mkdirSync(lockDir);
      const ownerPath = path.join(lockDir, 'owner.json');
      const acquiredAt = new Date().toISOString();
      const touchLock = () => {
        const now = new Date();
        fs.writeFileSync(ownerPath, JSON.stringify({
          pid: process.pid,
          acquiredAt,
          refreshedAt: now.toISOString(),
        }, null, 2), 'utf8');
        try { fs.utimesSync(lockDir, now, now); } catch { /* best effort heartbeat */ }
      };
      touchLock();
      const heartbeat = setInterval(touchLock, heartbeatMs);
      if (typeof heartbeat.unref === 'function') heartbeat.unref();
      return () => {
        clearInterval(heartbeat);
        try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort cleanup */ }
      };
    } catch (error) {
      if (error && error.code !== 'EEXIST') throw error;
      try {
        const stat = fs.statSync(lockDir);
        if (Date.now() - stat.mtimeMs > staleMs) {
          fs.rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      await sleep(pollMs);
    }
  }
}

async function acquireTelegramSendLock(config = {}) {
  return acquireDirectoryLock(
    getTelegramSendLockDir(config),
    Number(config.telegramSendLockStaleMs || DEFAULT_SEND_LOCK_STALE_MS)
  );
}

async function withTelegramSendLock(config, task) {
  const release = await acquireTelegramSendLock(config);
  try {
    return await task();
  } finally {
    release();
  }
}

async function withCodexSessionLock(config, sessionId, task) {
  const release = await acquireDirectoryLock(
    getCodexSessionLockDir(config, sessionId),
    Number(config.codexSessionLockStaleMs || DEFAULT_CODEX_SESSION_LOCK_STALE_MS)
  );
  try {
    return await task();
  } finally {
    release();
  }
}

function readJsonFile(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    const backupPath = `${filePath}.bak`;
    if (!fs.existsSync(backupPath)) return fallback;
    try {
      return JSON.parse(fs.readFileSync(backupPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch {
      return fallback;
    }
  }
}

function writeJsonFile(filePath, value) {
  ensureDirFor(filePath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
    try { fs.copyFileSync(filePath, `${filePath}.bak`); } catch { /* backup is best effort */ }
  } catch (error) {
    try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort cleanup */ }
    throw error;
  }
}

function positiveNumber(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  const fileConfig = readJsonFile(configPath, {});
  const token = process.env.TELEGRAM_BOT_TOKEN || fileConfig.botToken || '';
  const allowedUserIds = parseIdList(process.env.TELEGRAM_ALLOWED_USER_IDS || fileConfig.allowedUserIds);
  const defaultChatId = normalizeId(process.env.TELEGRAM_DEFAULT_CHAT_ID || fileConfig.defaultChatId);
  const projectRoot = fileConfig.projectRoot || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  return {
    botToken: token,
    allowedUserIds,
    defaultChatId,
    projectRoot,
    projectName: fileConfig.projectName || path.basename(projectRoot),
    statePath: fileConfig.statePath || DEFAULT_STATE_PATH,
    codexSessionsRoot: fileConfig.codexSessionsRoot || path.join(os.homedir(), '.codex', 'sessions'),
    sessionIndexPath: fileConfig.sessionIndexPath || process.env.CODEX_SESSION_INDEX_PATH || DEFAULT_SESSION_INDEX_PATH,
    pollIntervalMs: positiveNumber(fileConfig.pollIntervalMs || process.env.TELEGRAM_POLL_INTERVAL_MS, 1200),
    relayScanIntervalMs: positiveNumber(fileConfig.relayScanIntervalMs || process.env.TELEGRAM_RELAY_SCAN_INTERVAL_MS, 15000),
    codexTimeoutMs: positiveNumber(fileConfig.codexTimeoutMs || process.env.CODEX_TIMEOUT_MS, 30 * 60 * 1000),
    allowCodexExec: fileConfig.allowCodexExec === true || process.env.TELEGRAM_BRIDGE_ALLOW_CODEX_EXEC === '1',
    relayMaxAgeMs: positiveNumber(fileConfig.relayMaxAgeMs || process.env.TELEGRAM_RELAY_MAX_AGE_MS, 10 * 60 * 1000),
    relayAllSessions: fileConfig.relayAllSessions !== false,
    desktopQueueDir: fileConfig.desktopQueueDir || process.env.CODEX_DESKTOP_QUEUE_DIR || path.join('.codex-tmp', 'codex-visible-queues'),
    desktopQueueTargetTitle: fileConfig.desktopQueueTargetTitle || process.env.CODEX_DESKTOP_QUEUE_TARGET_TITLE || fileConfig.projectName || path.basename(projectRoot),
    desktopQueueIntervalSeconds: positiveNumber(fileConfig.desktopQueueIntervalSeconds || process.env.CODEX_DESKTOP_QUEUE_INTERVAL_SECONDS, 300),
    desktopQueueInputClickXRatio: positiveNumber(fileConfig.desktopQueueInputClickXRatio || process.env.CODEX_DESKTOP_QUEUE_INPUT_CLICK_X_RATIO, 0.52),
    desktopQueueInputClickBottomOffset: positiveNumber(fileConfig.desktopQueueInputClickBottomOffset || process.env.CODEX_DESKTOP_QUEUE_INPUT_CLICK_BOTTOM_OFFSET, 155),
    desktopQueueUnsafePaste: fileConfig.desktopQueueUnsafePaste === true || process.env.CODEX_DESKTOP_QUEUE_UNSAFE_PASTE === '1',
    controlCenterDir: fileConfig.controlCenterDir || process.env.CODEX_CONTROL_CENTER_DIR || path.join('.codex-tmp', 'codex-control-center'),
    controlCenterPort: positiveNumber(fileConfig.controlCenterPort || process.env.CODEX_CONTROL_CENTER_PORT, 3999),
    telegramSendLockStaleMs: positiveNumber(fileConfig.telegramSendLockStaleMs || process.env.TELEGRAM_SEND_LOCK_STALE_MS, DEFAULT_SEND_LOCK_STALE_MS),
    codexSessionLockStaleMs: positiveNumber(fileConfig.codexSessionLockStaleMs || process.env.CODEX_SESSION_LOCK_STALE_MS, DEFAULT_CODEX_SESSION_LOCK_STALE_MS),
    telegramAttachmentMaxBytes: positiveNumber(fileConfig.telegramAttachmentMaxBytes || process.env.TELEGRAM_ATTACHMENT_MAX_BYTES, DEFAULT_ATTACHMENT_MAX_BYTES),
    telegramPhotoMaxBytes: positiveNumber(fileConfig.telegramPhotoMaxBytes || process.env.TELEGRAM_PHOTO_MAX_BYTES, DEFAULT_PHOTO_MAX_BYTES),
    telegramAttachmentLimit: positiveNumber(fileConfig.telegramAttachmentLimit || process.env.TELEGRAM_ATTACHMENT_LIMIT, DEFAULT_ATTACHMENT_LIMIT),
    telegramArtifactScanWindowMs: positiveNumber(fileConfig.telegramArtifactScanWindowMs || process.env.TELEGRAM_ARTIFACT_SCAN_WINDOW_MS, DEFAULT_ARTIFACT_SCAN_WINDOW_MS),
    telegramArtifactScanMaxFiles: positiveNumber(fileConfig.telegramArtifactScanMaxFiles || process.env.TELEGRAM_ARTIFACT_SCAN_MAX_FILES, DEFAULT_ARTIFACT_SCAN_MAX_FILES),
    telegramArtifactScanRoots: Array.isArray(fileConfig.telegramArtifactScanRoots) ? fileConfig.telegramArtifactScanRoots : DEFAULT_ARTIFACT_SCAN_ROOTS,
    telegramReportScreenshots: fileConfig.telegramReportScreenshots !== false,
    codexFile: fileConfig.codexFile || process.env.CODEX_FILE || 'codex',
    codexArgs: Array.isArray(fileConfig.codexArgs) ? fileConfig.codexArgs : [],
  };
}

function parseIdList(value) {
  if (Array.isArray(value)) return value.map(normalizeId).filter((id) => id !== null);
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map((part) => normalizeId(part.trim()))
    .filter((id) => id !== null);
}

function normalizeId(value) {
  if (value === undefined || value === null || value === '') return null;
  const numberValue = Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : String(value);
}

function loadState(statePath = DEFAULT_STATE_PATH) {
  const state = readJsonFile(statePath, null);
  if (!state || typeof state !== 'object') {
    return { routes: {}, lastUpdateId: 0, createdAt: new Date().toISOString() };
  }
  return {
    routes: state.routes && typeof state.routes === 'object' ? state.routes : {},
    lastUpdateId: Number(state.lastUpdateId || 0),
    createdAt: state.createdAt || new Date().toISOString(),
    updatedAt: state.updatedAt,
    promptQueues: state.promptQueues && typeof state.promptQueues === 'object'
      ? state.promptQueues
      : {},
    control: state.control && typeof state.control === 'object'
      ? state.control
      : {},
    selectedSessions: state.selectedSessions && typeof state.selectedSessions === 'object'
      ? state.selectedSessions
      : {},
    relayedAgentMessages: state.relayedAgentMessages && typeof state.relayedAgentMessages === 'object'
      ? state.relayedAgentMessages
      : {},
    failedUpdates: state.failedUpdates && typeof state.failedUpdates === 'object'
      ? state.failedUpdates
      : {},
  };
}

function saveState(statePath, state) {
  const existing = readJsonFile(statePath || DEFAULT_STATE_PATH, {});
  writeJsonFile(statePath || DEFAULT_STATE_PATH, {
    ...existing,
    ...state,
    routes: {
      ...(existing.routes && typeof existing.routes === 'object' ? existing.routes : {}),
      ...(state.routes && typeof state.routes === 'object' ? state.routes : {}),
    },
    relayedAgentMessages: {
      ...(existing.relayedAgentMessages && typeof existing.relayedAgentMessages === 'object' ? existing.relayedAgentMessages : {}),
      ...(state.relayedAgentMessages && typeof state.relayedAgentMessages === 'object' ? state.relayedAgentMessages : {}),
    },
    promptQueues: {
      ...(existing.promptQueues && typeof existing.promptQueues === 'object' ? existing.promptQueues : {}),
      ...(state.promptQueues && typeof state.promptQueues === 'object' ? state.promptQueues : {}),
    },
    control: {
      ...(existing.control && typeof existing.control === 'object' ? existing.control : {}),
      ...(state.control && typeof state.control === 'object' ? state.control : {}),
    },
    selectedSessions: state.selectedSessions && typeof state.selectedSessions === 'object'
      ? state.selectedSessions
      : {},
    failedUpdates: state.failedUpdates && typeof state.failedUpdates === 'object'
      ? state.failedUpdates
      : {},
    lastUpdateId: Math.max(Number(existing.lastUpdateId || 0), Number(state.lastUpdateId || 0)),
    updatedAt: new Date().toISOString(),
  });
}

function promptQueueKey(routeOrSessionId) {
  const value = typeof routeOrSessionId === 'string'
    ? routeOrSessionId
    : routeOrSessionId?.sessionId;
  return normalizeLockName(value || 'latest');
}

function buildVisibleQueuePaths(config = {}, routeOrSessionId = 'latest') {
  const projectRoot = config.projectRoot || process.cwd();
  const key = promptQueueKey(routeOrSessionId);
  const queueRoot = path.resolve(projectRoot, config.desktopQueueDir || path.join('.codex-tmp', 'codex-visible-queues'), key);
  const controlRoot = path.resolve(projectRoot, config.controlCenterDir || path.join('.codex-tmp', 'codex-control-center'));
  return {
    key,
    queueDir: queueRoot,
    queuePath: path.join(queueRoot, 'queue.txt'),
    statusPath: path.join(queueRoot, 'status.json'),
    stopFile: path.join(queueRoot, 'stop.flag'),
    pidPath: path.join(queueRoot, 'sender.pid'),
    outLogPath: path.join(queueRoot, 'sender.out.log'),
    errLogPath: path.join(queueRoot, 'sender.err.log'),
    controlCenterPath: path.join(controlRoot, 'control-center.html'),
    controlCenterStatePath: path.join(controlRoot, 'control-center.json'),
  };
}

function ensurePromptQueue(state, route) {
  if (!state.promptQueues || typeof state.promptQueues !== 'object') state.promptQueues = {};
  const key = promptQueueKey(route);
  if (!state.promptQueues[key]) {
    state.promptQueues[key] = {
      queueKey: key,
      sessionId: route?.sessionId || 'latest',
      projectRoot: route?.projectRoot,
      projectName: route?.projectName,
      chatTitle: route?.chatTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }
  return state.promptQueues[key];
}

function addPromptQueueItems(state, route, prompt, count = 1, options = {}) {
  const queue = ensurePromptQueue(state, route);
  const safeCount = Math.max(1, Math.min(100, Number(count) || 1));
  const now = new Date().toISOString();
  const startIndex = queue.items.length;
  const items = [];
  for (let index = 0; index < safeCount; index += 1) {
    const item = {
      id: `${Date.now()}-${startIndex + index + 1}-${Math.random().toString(36).slice(2, 8)}`,
      prompt,
      status: 'queued',
      position: startIndex + index + 1,
      createdAt: now,
      sourceTelegramMessageId: options.sourceTelegramMessageId,
    };
    queue.items.push(item);
    items.push(item);
  }
  queue.sessionId = route?.sessionId || queue.sessionId;
  queue.projectRoot = route?.projectRoot || queue.projectRoot;
  queue.projectName = route?.projectName || queue.projectName;
  queue.chatTitle = route?.chatTitle || queue.chatTitle;
  queue.updatedAt = now;
  return { queueKey: queue.queueKey, queue, items };
}

function getPromptQueue(state, routeOrSessionId) {
  const key = promptQueueKey(routeOrSessionId);
  return state.promptQueues?.[key] || null;
}

function getNextQueuedPromptItem(state, routeOrSessionId) {
  const queue = getPromptQueue(state, routeOrSessionId);
  if (!queue || !Array.isArray(queue.items)) return null;
  return queue.items.find((item) => item.status === 'queued') || null;
}

function updatePromptQueueItem(state, routeOrSessionId, itemId, patch) {
  const queue = getPromptQueue(state, routeOrSessionId);
  if (!queue || !Array.isArray(queue.items)) return null;
  const item = queue.items.find((candidate) => candidate.id === itemId);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  queue.updatedAt = item.updatedAt;
  return item;
}

function promptQueueCounts(queue) {
  const items = Array.isArray(queue?.items) ? queue.items : [];
  return {
    total: items.length,
    queued: items.filter((item) => item.status === 'queued').length,
    running: items.filter((item) => item.status === 'running').length,
    done: items.filter((item) => item.status === 'done').length,
    error: items.filter((item) => item.status === 'error').length,
  };
}

function formatPromptQueueForTelegram(state, routeOrSessionId, options = {}) {
  const queue = getPromptQueue(state, routeOrSessionId);
  if (!queue) return 'Для этого Codex-чата пока нет физической очереди prompt-задач.';
  const counts = promptQueueCounts(queue);
  const title = queue.chatTitle || queue.sessionId || 'Codex-чат';
  const lines = [
    `Физическая очередь prompt-задач для "${title}":`,
    `Всего: ${counts.total}; ждут: ${counts.queued}; выполняется: ${counts.running}; готово: ${counts.done}; ошибок: ${counts.error}`,
    '',
    'Prompt каждого шага физически добавляется в видимую очередь VS Code и отправляется в окно Codex через Ctrl+V + Enter.',
    '',
    'Очередь:',
  ];
  const limit = Math.max(1, Math.min(120, Number(options.limit || 100)));
  const items = (queue.items || []).slice(-limit);
  for (const item of items) {
    const promptPreview = String(item.prompt || '').replace(/\s+/g, ' ').slice(0, 90);
    lines.push(`${item.position || '?'}: ${item.status} - ${promptPreview}`);
  }
  return lines.join('\n');
}

function routeKey(chatId, messageId) {
  return `${chatId}:${messageId}`;
}

function upsertRoute(state, route) {
  if (!state.routes) state.routes = {};
  const key = routeKey(route.telegramChatId, route.telegramMessageId);
  state.routes[key] = {
    telegramChatId: route.telegramChatId,
    telegramMessageId: route.telegramMessageId,
    sessionId: route.sessionId,
    projectRoot: route.projectRoot,
    projectName: route.projectName,
    chatTitle: route.chatTitle,
    createdAt: route.createdAt || new Date().toISOString(),
    summary: route.summary || '',
    materials: Array.isArray(route.materials) ? route.materials : [],
  };
  return state.routes[key];
}

function resolveReplyRoute(state, message) {
  if (!message || message.replyToMessageId === undefined || message.replyToMessageId === null) return null;
  return state.routes?.[routeKey(message.chatId, message.replyToMessageId)] || null;
}

function findLatestRouteForChat(state, chatId) {
  const routes = Object.values(state.routes || {})
    .filter((route) => route.telegramChatId === chatId)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return routes[0] || null;
}

function resolveMessageRoute(state, message) {
  return resolveReplyRoute(state, message);
}

function getTelegramMessage(update) {
  const message = update && (update.message || update.edited_message);
  if (!message || !message.chat || !message.from) return null;
  const text = typeof message.text === 'string' ? message.text : (typeof message.caption === 'string' ? message.caption : '');
  if (!text.trim()) return null;

  return {
    updateId: update.update_id,
    chatId: message.chat.id,
    fromUserId: message.from.id,
    messageId: message.message_id,
    replyToMessageId: message.reply_to_message ? message.reply_to_message.message_id : null,
    text: text.trim(),
  };
}

function getTelegramCallback(update) {
  const callback = update && update.callback_query;
  if (!callback || !callback.from || !callback.message || !callback.message.chat || typeof callback.data !== 'string') {
    return null;
  }
  return {
    updateId: update.update_id,
    callbackId: callback.id,
    chatId: callback.message.chat.id,
    fromUserId: callback.from.id,
    messageId: callback.message.message_id,
    data: callback.data,
  };
}

function isAuthorizedTelegramUser(message, config) {
  const allowed = config.allowedUserIds || [];
  return allowed.length > 0 && allowed.includes(message.fromUserId);
}

function titleCaseProject(projectName) {
  const name = String(projectName || 'project').replace(/[-_]+/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function buildReportText(input) {
  const lines = [];
  const projectName = titleCaseProject(input.projectName);
  lines.push(`${projectName}: Отчёт по задаче`);
  lines.push(`Статус: ${input.status || 'завершено'}`);
  if (input.sessionId) lines.push(`Сессия: ${input.sessionId}`);
  if (input.summary) {
    lines.push('');
    lines.push('Сводка:');
    lines.push(String(input.summary).trim());
  }
  if (Array.isArray(input.filesChanged) && input.filesChanged.length > 0) {
    lines.push('');
    lines.push('Файлы и материалы:');
    for (const file of input.filesChanged.slice(0, 30)) lines.push(`- ${file}`);
  }
  if (Array.isArray(input.verification) && input.verification.length > 0) {
    lines.push('');
    lines.push('Проверка:');
    for (const item of input.verification.slice(0, 20)) lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('Ответьте на это сообщение в Telegram, чтобы отправить следующий промпт именно в эту сессию.');
  return lines.join('\n');
}

function repairMojibake(value) {
  const text = String(value || '');
  if (!/[ÐÑÂ]/.test(text)) return text;
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    const repairedScore = countCyrillic(repaired) - countReplacementChars(repaired);
    const originalScore = countCyrillic(text) - countReplacementChars(text);
    return repairedScore > originalScore ? repaired : text;
  } catch {
    return text;
  }
}

function countCyrillic(value) {
  const match = String(value || '').match(/[\u0400-\u04FF]/g);
  return match ? match.length : 0;
}

function countReplacementChars(value) {
  const match = String(value || '').match(/\uFFFD/g);
  return match ? match.length : 0;
}

function loadSessionTitles(indexPath = DEFAULT_SESSION_INDEX_PATH) {
  const titles = {};
  if (!indexPath || !fs.existsSync(indexPath)) return titles;
  try {
    const lines = fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const item = JSON.parse(line);
      const id = item.id || item.session_id || item.sessionId;
      const title = item.thread_name || item.threadName || item.title || item.name;
      if (id && title) titles[id] = repairMojibake(String(title).trim());
    }
  } catch {
    return titles;
  }
  return titles;
}

function getSessionTitle(sessionId, options = {}) {
  if (options.chatTitle) return options.chatTitle;
  const titles = options.sessionTitles || loadSessionTitles(options.sessionIndexPath);
  if (sessionId && titles[sessionId]) return titles[sessionId];
  if (options.projectName) return titleCaseProject(options.projectName);
  if (sessionId) return `Codex chat ${String(sessionId).slice(0, 8)}`;
  return 'Codex chat';
}

function escapeTelegramHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripTelegramHtml(value) {
  return String(value || '')
    .replace(/<\/?(?:b|strong|i|em|u|ins|s|strike|del|code|pre|a|blockquote|span)[^>]*>/gi, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function formatTelegramInlineHtml(value) {
  const codeSegments = [];
  const protectedText = String(value || '').replace(/`([^`\n]+)`/g, (_, code) => {
    const index = codeSegments.push(`<code>${escapeTelegramHtml(code)}</code>`) - 1;
    return `\uE000${index}\uE001`;
  });
  return escapeTelegramHtml(protectedText)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .replace(/__([^_\n]+)__/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<i>$2</i>')
    .replace(/\uE000(\d+)\uE001/g, (_, index) => codeSegments[Number(index)] || '');
}

function formatTelegramBodyHtml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCodeBlock = false;
  let codeLines = [];

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inCodeBlock) {
        out.push(`<pre>${escapeTelegramHtml(codeLines.join('\n'))}</pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }

    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      out.push(`<b>${formatTelegramInlineHtml(heading[1])}</b>`);
      continue;
    }

    if (/^[^:]{1,60}:\s*$/.test(trimmed)) {
      out.push(`<b>${formatTelegramInlineHtml(trimmed)}</b>`);
      continue;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bullet) {
      out.push(`${bullet[1]}- ${formatTelegramInlineHtml(bullet[2])}`);
      continue;
    }

    out.push(formatTelegramInlineHtml(line));
  }

  if (inCodeBlock) {
    out.push(`<pre>${escapeTelegramHtml(codeLines.join('\n'))}</pre>`);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function splitRawTextForFormattedHtml(rawText, maxFormattedLength) {
  const raw = String(rawText || '');
  if (raw.length === 0) return [''];
  const chunks = [];
  let remaining = raw;
  while (remaining.length > 0) {
    let low = 1;
    let high = remaining.length;
    let best = 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (formatTelegramBodyHtml(remaining.slice(0, mid)).length <= maxFormattedLength) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    let splitAt = best;
    if (best < remaining.length) {
      const newlineAt = remaining.lastIndexOf('\n', best);
      const spaceAt = remaining.lastIndexOf(' ', best);
      const boundary = Math.max(newlineAt, spaceAt);
      if (boundary > 0) splitAt = boundary;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  return chunks;
}

function formatTelegramMessageWithHeader(chatTitle, text, maxLength = 3900) {
  const title = chatTitle || 'Codex chat';
  const header = `<b>${escapeTelegramHtml(title)}</b>\n\n`;
  const maxBodyLength = Math.max(1, maxLength - header.length);
  return splitRawTextForFormattedHtml(text, maxBodyLength)
    .map((chunk) => `${header}${formatTelegramBodyHtml(chunk)}`);
}

function buildTelegramCommandKeyboard(hasRoute = false, options = {}) {
  if (!hasRoute) return undefined;
  const promptRow = [
    { text: 'Дальше', callback_data: 'enqueue:1' },
    { text: 'Дальше 10', callback_data: 'enqueue:10' },
    { text: 'Дальше 100', callback_data: 'enqueue:100' },
  ];
  const commandRow = [{ text: 'Команды', callback_data: 'cmd:help' }];
  if (options.hasMaterials) commandRow.push({ text: 'Материалы', callback_data: 'cmd:materials' });
  return { inline_keyboard: [promptRow, commandRow] };
}

function normalizeQueueMode(value) {
  const raw = String(value || 'normal').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    'обычный': 'normal',
    'нормальный': 'normal',
    'осторожно': 'cautious',
    'осторожный': 'cautious',
    'быстро': 'fast',
    'быстрый': 'fast',
    'без_вопросов': 'no_questions',
    'безвопросов': 'no_questions',
    'только_аудит': 'audit_only',
    'аудит': 'audit_only',
  };
  const key = aliases[raw] || raw;
  return Object.prototype.hasOwnProperty.call(QUEUE_MODES, key) ? key : 'normal';
}

function buildQueuedPromptForMode(basePrompt = DEFAULT_NEXT_PROMPT, mode = 'normal') {
  const normalized = normalizeQueueMode(mode);
  const suffix = QUEUE_MODES[normalized];
  return suffix ? `${basePrompt}\n\n${suffix}` : basePrompt;
}

function buildTelegramSendOptions(index, total, hasRoute = null) {
  const options = { parse_mode: 'HTML' };
  if (index === total - 1 && hasRoute !== null) {
    const keyboard = buildTelegramCommandKeyboard(Boolean(hasRoute));
    if (keyboard) options.reply_markup = keyboard;
  }
  return options;
}

function extractShortReportSummary(text, maxLength = 650) {
  const raw = String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\r\n/g, '\n');
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/^[-*+]\s+/, '').trim())
    .filter(Boolean);
  const summaryIndex = lines.findIndex((line) => /^(summary|сводка|итог|что сделано|результат)\s*:?$/i.test(line));
  const picked = summaryIndex >= 0 ? lines.slice(summaryIndex + 1, summaryIndex + 5) : lines.slice(0, 5);
  let summary = picked.join(' ').replace(/\s+/g, ' ').trim();
  if (!summary) summary = 'Отчет готов. Полный текст находится на скриншоте.';
  if (summary.length > maxLength) summary = `${summary.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
  return summary;
}

function isGenericReportSummary(summary) {
  const value = String(summary || '').trim().toLowerCase();
  return !value
    || value === 'краткий отчет codex'
    || value === 'финальный ответ codex'
    || value === 'codex final answer'
    || value === 'codex report';
}

function formatTelegramReportCaption(chatTitle, text, maxLength = 1000, options = {}) {
  const title = chatTitle || 'Codex chat';
  const header = `<b>${escapeTelegramHtml(title)}</b>\n\n`;
  const materialLine = Number(options.materialCount || 0) > 0
    ? `\nМатериалы: ${Number(options.materialCount)}`
    : '';
  const footer = `${materialLine}\n\n<i>Полный отчет на скриншоте.</i>`;
  const room = Math.max(80, maxLength - header.length - footer.length);
  const summary = escapeTelegramHtml(extractShortReportSummary(text, room));
  return `${header}${summary}${footer}`;
}

function shortSessionLabel(title, fallback = 'Session') {
  const words = String(title || fallback)
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words.slice(0, 2).join(' ') || fallback).slice(0, 32);
}

function getSessionInboxRoutes(state, chatId, options = {}) {
  const maxSessions = Math.max(1, Math.min(20, Number(options.limit || 8)));
  const latestBySession = new Map();
  for (const route of Object.values(state.routes || {})) {
    if (route.telegramChatId !== chatId) continue;
    if (!route.sessionId) continue;
    const key = promptQueueKey(route.sessionId);
    const prev = latestBySession.get(key);
    if (!prev || String(route.createdAt || '').localeCompare(String(prev.createdAt || '')) > 0) {
      latestBySession.set(key, route);
    }
  }
  return Array.from(latestBySession.entries())
    .sort(([, a], [, b]) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, maxSessions)
    .map(([key, route], index) => ({
      index: index + 1,
      sessionKey: key,
      route,
    }));
}

function buildSessionInboxKeyboard(state, chatId, options = {}) {
  const rows = getSessionInboxRoutes(state, chatId, options)
    .map(({ sessionKey, route }) => ([{
      text: shortSessionLabel(route.chatTitle || route.projectName || route.sessionId),
      callback_data: `session:${sessionKey}`,
    }]));
  return rows.length > 0 ? { inline_keyboard: rows } : undefined;
}

function formatSessionInboxForTelegram(state, chatId, options = {}) {
  const sessions = getSessionInboxRoutes(state, chatId, options);
  if (sessions.length === 0) {
    return [
      '<b>Codex Inbox</b>',
      '',
      'Пока нет привязанных Codex-сессий для этого Telegram-чата.',
      'Новый отчет из Codex автоматически появится здесь.',
    ].join('\n');
  }
  const lines = [
    '<b>Codex Inbox</b>',
    '',
    'Выбери сессию кнопкой или командой /select N.',
    'После выбора отправь обычное сообщение, и оно уйдет именно в эту Codex-сессию.',
    '',
  ];
  for (const item of sessions) {
    const route = item.route;
    const title = route.chatTitle || route.projectName || route.sessionId || `Session ${item.index}`;
    const summary = route.summary && !isGenericReportSummary(route.summary)
      ? ` - ${String(route.summary).replace(/\s+/g, ' ').slice(0, 90)}`
      : '';
    lines.push(`${item.index}. ${escapeTelegramHtml(title)}${escapeTelegramHtml(summary)}`);
  }
  return lines.join('\n');
}

function findLatestRouteBySessionKey(state, chatId, sessionKey) {
  return Object.values(state.routes || {})
    .filter((route) => route.telegramChatId === chatId && promptQueueKey(route.sessionId) === sessionKey)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
}

function isTelegramAttachmentExtension(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return TELEGRAM_PHOTO_EXTENSIONS.has(ext) || TELEGRAM_DOCUMENT_EXTENSIONS.has(ext);
}

function getTelegramAttachmentKind(filePath, sizeBytes = 0, photoMaxBytes = DEFAULT_PHOTO_MAX_BYTES) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (TELEGRAM_PHOTO_EXTENSIONS.has(ext) && Number(sizeBytes) <= photoMaxBytes) return 'photo';
  if (TELEGRAM_PHOTO_EXTENSIONS.has(ext) || TELEGRAM_DOCUMENT_EXTENSIONS.has(ext)) return 'document';
  return null;
}

function normalizeAttachmentCandidate(value) {
  return String(value || '')
    .trim()
    .replace(/^file:\/\//i, '')
    .replace(/^["'`(<\[]+/, '')
    .replace(/[)"'`>\].,;:]+$/, '')
    .trim();
}

function extractAttachmentCandidatesFromText(text) {
  const value = String(text || '');
  const extPattern = [
    ...Array.from(TELEGRAM_PHOTO_EXTENSIONS),
    ...Array.from(TELEGRAM_DOCUMENT_EXTENSIONS),
  ].map((ext) => ext.slice(1)).join('|');
  const candidates = [];
  const patterns = [
    new RegExp('\\[[^\\]]+\\]\\(([^)]+\\.(' + extPattern + '))\\)', 'gi'),
    new RegExp('`([^`]+\\.(' + extPattern + '))`', 'gi'),
    new RegExp('"([^"]+\\.(' + extPattern + '))"', 'gi'),
    new RegExp("'([^']+\\.(" + extPattern + "))'", 'gi'),
    new RegExp('[A-Za-z]:[\\\\/][^\\r\\n<>|?*]+?\\.(' + extPattern + ')(?=$|[\\s)\"' + "'" + '\\],;])', 'gi'),
    new RegExp('(?:^|[\\s(])((?:\\.{1,2}[\\\\/]|[A-Za-z0-9_. -]+[\\\\/])[^\\r\\n<>|?*]+?\\.(' + extPattern + '))(?=$|[\\s)\"' + "'" + '\\],;])', 'gi'),
    new RegExp('(?:^|[\\s(])([A-Za-z0-9_. -]+\\.(' + extPattern + '))(?=$|[\\s)\"' + "'" + '\\],;])', 'gi'),
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(value)) !== null) {
      candidates.push(match[1] || match[0]);
    }
  }
  return candidates;
}

function resolveAttachmentPath(candidate, projectRoot) {
  const normalized = normalizeAttachmentCandidate(candidate);
  if (!normalized || !isTelegramAttachmentExtension(normalized)) return null;
  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(projectRoot || process.cwd(), normalized);
}

function isSensitiveAttachmentPath(filePath) {
  const normalized = path.normalize(String(filePath || '')).toLowerCase().replace(/\\/g, '/');
  if (normalized.includes('/.git/')) return true;
  if (normalized.includes('/node_modules/')) return true;
  if (normalized.includes('/.codex-tmp/telegram-bridge/')) return true;
  if (normalized.endsWith('/.env') || normalized.includes('/.env.')) return true;
  return false;
}

function isIgnoredRecentArtifactPath(filePath) {
  const normalized = path.normalize(String(filePath || '')).toLowerCase().replace(/\\/g, '/');
  if (normalized.includes('/cache/')) return true;
  if (normalized.endsWith('.json')) return true;
  return false;
}

function buildTelegramAttachment(filePath, options = {}) {
  if (!filePath || isSensitiveAttachmentPath(filePath)) return null;
  const maxBytes = Number(options.maxBytes || DEFAULT_ATTACHMENT_MAX_BYTES);
  const photoMaxBytes = Number(options.photoMaxBytes || DEFAULT_PHOTO_MAX_BYTES);
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return null;
  }
  if (!stat.isFile() || stat.size <= 0 || stat.size > maxBytes) return null;
  const kind = getTelegramAttachmentKind(filePath, stat.size, photoMaxBytes);
  if (!kind) return null;
  return {
    path: filePath,
    name: path.basename(filePath),
    kind,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
  };
}

function collectRecentTelegramArtifacts(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const roots = Array.isArray(options.roots) ? options.roots : DEFAULT_ARTIFACT_SCAN_ROOTS;
  const nowMs = Number(options.nowMs || Date.now());
  const windowMs = Number(options.windowMs || DEFAULT_ARTIFACT_SCAN_WINDOW_MS);
  const sinceMs = Number.isFinite(Number(options.sinceMs)) ? Number(options.sinceMs) : nowMs - windowMs;
  const limit = Number(options.limit || DEFAULT_ATTACHMENT_LIMIT);
  const maxFiles = Number(options.maxFiles || DEFAULT_ARTIFACT_SCAN_MAX_FILES);
  const seen = new Set();
  const candidates = [];
  let visitedFiles = 0;

  for (const root of roots) {
    const rootPath = path.isAbsolute(root) ? path.normalize(root) : path.resolve(projectRoot, root);
    if (!fs.existsSync(rootPath)) continue;
    const queue = [rootPath];
    while (queue.length > 0 && visitedFiles < maxFiles) {
      const current = queue.shift();
      if (isSensitiveAttachmentPath(current) || isIgnoredRecentArtifactPath(current)) continue;
      let entries;
      try {
        entries = fs.readdirSync(current, { withFileTypes: true })
          .map((entry) => {
            const fullPath = path.join(current, entry.name);
            let mtimeMs = 0;
            try { mtimeMs = fs.statSync(fullPath).mtimeMs; } catch { /* best effort ordering */ }
            return { entry, fullPath, mtimeMs };
          })
          .sort((a, b) => b.mtimeMs - a.mtimeMs);
      } catch {
        continue;
      }
      for (const { entry, fullPath } of entries) {
        if (entry.isDirectory()) {
          if (!isSensitiveAttachmentPath(fullPath) && !isIgnoredRecentArtifactPath(fullPath)) queue.push(fullPath);
          continue;
        }
        if (!entry.isFile()) continue;
        visitedFiles += 1;
        if (!isTelegramAttachmentExtension(fullPath)) continue;
        if (isIgnoredRecentArtifactPath(fullPath)) continue;
        const attachment = buildTelegramAttachment(fullPath, options);
        if (!attachment || attachment.mtimeMs < sinceMs || attachment.mtimeMs > nowMs + 1000) continue;
        const key = attachment.path.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(attachment);
      }
    }
  }

  return candidates
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ mtimeMs, ...attachment }) => attachment);
}

function collectTelegramAttachments(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();
  const extraRoots = Array.isArray(options.extraRoots) ? options.extraRoots.filter(Boolean) : [];
  const maxBytes = Number(options.maxBytes || DEFAULT_ATTACHMENT_MAX_BYTES);
  const photoMaxBytes = Number(options.photoMaxBytes || DEFAULT_PHOTO_MAX_BYTES);
  const limit = Number(options.limit || DEFAULT_ATTACHMENT_LIMIT);
  const candidates = [
    ...(Array.isArray(options.files) ? options.files : []),
    ...extractAttachmentCandidatesFromText(options.text || ''),
  ];
  const seen = new Set();
  const attachments = [];
  for (const candidate of candidates) {
    const candidatePaths = [
      resolveAttachmentPath(candidate, projectRoot),
      ...extraRoots.map((root) => resolveAttachmentPath(candidate, root)),
    ].filter(Boolean);
    const filePath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath)) || candidatePaths[0];
    if (!filePath) continue;
    const key = filePath.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const attachment = buildTelegramAttachment(filePath, { maxBytes, photoMaxBytes });
    if (!attachment) continue;
    const { mtimeMs, ...safeAttachment } = attachment;
    attachments.push(safeAttachment);
    if (attachments.length >= limit) break;
  }

  if (options.includeRecentArtifacts && attachments.length < limit) {
    const recent = collectRecentTelegramArtifacts({
      projectRoot,
      roots: options.artifactRoots,
      nowMs: options.recentNowMs,
      sinceMs: options.recentSinceMs,
      windowMs: options.recentWindowMs,
      maxBytes,
      photoMaxBytes,
      limit: limit - attachments.length,
      maxFiles: options.recentMaxFiles,
    });
    for (const attachment of recent) {
      const key = attachment.path.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      attachments.push(attachment);
      if (attachments.length >= limit) break;
    }
  }
  return attachments;
}

function splitTelegramText(text, maxLength = 3900) {
  const value = String(text || '');
  if (value.length <= maxLength) return [value];
  const chunks = [];
  let remaining = value;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf('\n', maxLength);
    if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', maxLength);
    if (splitAt <= 0) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function formatRoutesForChat(state, chatId, limit = 10) {
  const routes = Object.values(state.routes || {})
    .filter((route) => route.telegramChatId === chatId)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, limit);
  if (routes.length === 0) return 'Пока нет сообщений Telegram, привязанных к Codex-сессиям.';
  const lines = ['Привязанные сообщения этого Telegram-чата:'];
  for (const route of routes) {
    const title = route.chatTitle ? ` title="${route.chatTitle}"` : '';
    lines.push(`message_id=${route.telegramMessageId} session=${route.sessionId}${title}`);
  }
  return lines.join('\n');
}

function inferSessionId(input, fallback = 'latest') {
  return input?.session_id
    || input?.sessionId
    || input?.conversation_id
    || input?.conversationId
    || input?.transcript_path
    || input?.cwd
    || fallback;
}

function listJsonlFiles(rootDir) {
  const files = [];
  if (!rootDir || !fs.existsSync(rootDir)) return files;
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) files.push(fullPath);
    }
  }
  return files;
}

function readJsonlHeadLines(filePath, maxBytes = 256 * 1024) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const bytesToRead = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buffer, 0, bytesToRead, 0);
    return buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
  } finally {
    fs.closeSync(fd);
  }
}

function readSessionMeta(filePath) {
  try {
    const lines = readJsonlHeadLines(filePath).slice(0, 30);
    for (const line of lines) {
      if (!line.trim()) continue;
      let item;
      try {
        item = JSON.parse(line);
      } catch {
        continue;
      }
      if (item.type === 'session_meta' && item.payload) return item.payload;
    }
  } catch {
    return null;
  }
  return null;
}

function readLatestAgentMessage(filePath) {
  try {
    const lines = readJsonlTailLines(filePath).reverse();
    for (const line of lines) {
      if (!line.trim()) continue;
      let item;
      try {
        item = JSON.parse(line);
      } catch {
        continue;
      }
      if (item.type === 'event_msg' && item.payload?.type === 'agent_message') {
        return item.payload.message || '';
      }
      if (item.type === 'response_item' && item.payload?.type === 'message' && item.payload.role === 'assistant') {
        const content = item.payload.content || [];
        return content
          .map((part) => part.text || part.output_text || '')
          .filter(Boolean)
          .join('');
      }
    }
  } catch {
    return '';
  }
  return '';
}

function readLatestFinalAgentMessage(filePath) {
  const result = readLatestFinalAgentMessageRecord(filePath);
  return result ? result.message : '';
}

function readJsonlTailLines(filePath, maxBytes = 8 * 1024 * 1024) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const stat = fs.fstatSync(fd);
    const bytesToRead = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buffer, 0, bytesToRead, stat.size - bytesToRead);
    return buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
  } finally {
    fs.closeSync(fd);
  }
}

function readLatestFinalAgentMessageRecord(filePath) {
  try {
    const lines = readJsonlTailLines(filePath).reverse();
    for (const line of lines) {
      if (!line.trim()) continue;
      let item;
      try {
        item = JSON.parse(line);
      } catch {
        continue;
      }
      if (item.type === 'event_msg' && item.payload?.type === 'task_complete' && item.payload.last_agent_message) {
        return { message: item.payload.last_agent_message, timestamp: item.timestamp || null };
      }
      if (
        item.type === 'event_msg'
        && item.payload?.type === 'agent_message'
        && item.payload.phase === 'final_answer'
      ) {
        return { message: item.payload.message || '', timestamp: item.timestamp || null };
      }
      if (
        item.type === 'response_item'
        && item.payload?.type === 'message'
        && item.payload.role === 'assistant'
        && item.payload.phase === 'final'
      ) {
        const content = item.payload.content || [];
        const message = content
          .map((part) => part.text || part.output_text || '')
          .filter(Boolean)
          .join('');
        return { message, timestamp: item.timestamp || null };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function findLatestCodexSessionFile(options = {}) {
  const rootDir = options.sessionsRoot || path.join(os.homedir(), '.codex', 'sessions');
  const cwd = options.cwd;
  const files = listJsonlFiles(rootDir)
    .map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const file of files) {
    const meta = readSessionMeta(file.filePath);
    if (!meta || !meta.id) continue;
    if (!cwd || samePath(meta.cwd, cwd)) return file.filePath;
  }
  return null;
}

function collectFreshFinalAgentMessages(options = {}) {
  const rootDir = options.sessionsRoot || path.join(os.homedir(), '.codex', 'sessions');
  const nowMs = Number(options.nowMs || Date.now());
  const maxAgeMs = Number(options.maxAgeMs || 10 * 60 * 1000);
  const recentMtimeFloor = nowMs - maxAgeMs - 60 * 1000;
  const sessionTitles = options.sessionTitles || loadSessionTitles(options.sessionIndexPath);
  return listJsonlFiles(rootDir)
    .map((filePath) => {
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .filter((file) => file.mtimeMs >= recentMtimeFloor)
    .map((filePath) => {
      const meta = readSessionMeta(filePath.filePath);
      const record = readLatestFinalAgentMessageRecord(filePath.filePath);
      const text = record?.message?.trim() || '';
      const timestampMs = record?.timestamp ? Date.parse(record.timestamp) : NaN;
      if (!meta?.id || !text || !Number.isFinite(timestampMs)) return null;
      const ageMs = nowMs - timestampMs;
      if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > maxAgeMs) return null;
      return {
        filePath: filePath.filePath,
        sessionId: meta.id,
        projectRoot: meta.cwd || '',
        projectName: meta.cwd ? path.basename(meta.cwd) : '',
        chatTitle: getSessionTitle(meta.id, { sessionTitles, projectName: meta.cwd ? path.basename(meta.cwd) : '' }),
        text,
        attachments: collectTelegramAttachments({
          projectRoot: meta.cwd || path.dirname(filePath.filePath),
          extraRoots: [path.dirname(filePath.filePath)],
          text,
          includeRecentArtifacts: true,
          artifactRoots: options.artifactRoots,
          recentNowMs: timestampMs,
          recentWindowMs: options.artifactScanWindowMs,
          recentMaxFiles: options.artifactScanMaxFiles,
          maxBytes: options.maxAttachmentBytes,
          photoMaxBytes: options.photoMaxBytes,
          limit: options.attachmentLimit,
        }),
        timestamp: record.timestamp,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function samePath(a, b) {
  if (!a || !b) return false;
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}

function findLatestCodexSessionId(options = {}) {
  const filePath = findLatestCodexSessionFile(options);
  const meta = filePath ? readSessionMeta(filePath) : null;
  return meta?.id || null;
}

function normalizeHookInput(input, config) {
  const sessionId = inferSessionId(
    input,
    findLatestCodexSessionId({ sessionsRoot: config.codexSessionsRoot, cwd: config.projectRoot }) || 'latest'
  );
  const summary = input?.message || input?.notification || input?.prompt || input?.reason || input?.event || 'Task finished in the local IDE session.';
  return {
    projectName: config.projectName,
    projectRoot: config.projectRoot,
    sessionId,
    status: input?.status || input?.hook_event_name || input?.event || 'finished',
    summary,
    filesChanged: Array.isArray(input?.filesChanged) ? input.filesChanged : [],
    verification: Array.isArray(input?.verification) ? input.verification : [],
  };
}

function buildCodexResumeCommand({ sessionId, prompt, config = {}, outputLastMessagePath = null }) {
  const file = config.codexFile || 'codex';
  const baseArgs = Array.isArray(config.codexArgs) ? config.codexArgs : [];
  const normalizedSessionId = sessionId && sessionId !== 'latest' ? sessionId : '--last';
  const outputArgs = outputLastMessagePath ? ['-o', outputLastMessagePath] : [];
  const args = ['exec', 'resume', ...outputArgs, ...baseArgs, normalizedSessionId, prompt];
  return { file, args };
}

module.exports = {
  DEFAULT_AUDIT_PROMPT,
  DEFAULT_CODEX_SESSION_LOCK_STALE_MS,
  DEFAULT_CONFIG_PATH,
  DEFAULT_DATA_DIR,
  DEFAULT_NEXT_PROMPT,
  QUEUE_MODES,
  DEFAULT_SESSION_INDEX_PATH,
  DEFAULT_STATE_PATH,
  addPromptQueueItems,
  buildCodexResumeCommand,
  buildReportText,
  buildQueuedPromptForMode,
  buildSessionInboxKeyboard,
  buildTelegramCommandKeyboard,
  buildTelegramSendOptions,
  buildVisibleQueuePaths,
  collectRecentTelegramArtifacts,
  collectTelegramAttachments,
  collectFreshFinalAgentMessages,
  ensureDirFor,
  escapeTelegramHtml,
  findLatestRouteForChat,
  findLatestCodexSessionId,
  findLatestCodexSessionFile,
  findLatestRouteBySessionKey,
  extractShortReportSummary,
  formatSessionInboxForTelegram,
  formatPromptQueueForTelegram,
  formatTelegramBodyHtml,
  formatRoutesForChat,
  formatTelegramMessageWithHeader,
  formatTelegramReportCaption,
  getSessionInboxRoutes,
  getSessionTitle,
  getNextQueuedPromptItem,
  getPromptQueue,
  getTelegramCallback,
  getTelegramMessage,
  inferSessionId,
  isGenericReportSummary,
  isAuthorizedTelegramUser,
  loadConfig,
  loadSessionTitles,
  loadState,
  normalizeHookInput,
  normalizeQueueMode,
  parseIdList,
  readLatestAgentMessage,
  readLatestFinalAgentMessage,
  readLatestFinalAgentMessageRecord,
  readSessionMeta,
  resolveMessageRoute,
  resolveReplyRoute,
  repairMojibake,
  saveState,
  splitTelegramText,
  stripTelegramHtml,
  promptQueueCounts,
  promptQueueKey,
  upsertRoute,
  updatePromptQueueItem,
  writeJsonFile,
  withCodexSessionLock,
  withTelegramSendLock,
};
