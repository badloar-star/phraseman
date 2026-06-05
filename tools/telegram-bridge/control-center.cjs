#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  buildVisibleQueuePaths,
  escapeTelegramHtml,
  getPromptQueueDeliveryPlan,
  loadConfig,
  loadState,
  promptQueueCounts,
  promptQueueKey,
  saveState,
} = require('./core.cjs');

function escapeHtml(value) {
  return escapeTelegramHtml(value).replace(/'/g, '&#39;');
}

function readJsonFile(filePath, fallback = null) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function countQueueFileLines(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return 0;
    return fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .length;
  } catch {
    return 0;
  }
}

function readDesktopQueueStatus(config, queue, counts = {}) {
  const paths = buildVisibleQueuePaths(config, queue);
  const status = readJsonFile(paths.statusPath, {});
  const queueFileCount = countQueueFileLines(paths.queuePath);
  const stateQueued = Number(counts.queued || 0);
  const drift = stateQueued - queueFileCount;
  const shouldCompareDesktopFile = getPromptQueueDeliveryPlan(config).appendDesktopQueue;
  const warning = !shouldCompareDesktopFile || drift === 0
    ? ''
    : `State/file drift: state queued ${stateQueued}, queue file ${queueFileCount}.`;
  return {
    status: status.status || 'unknown',
    message: status.message || '',
    queueFileCount,
    queueRemaining: Number.isFinite(Number(status.queueRemaining)) ? Number(status.queueRemaining) : null,
    stateQueued,
    drift,
    warning,
    updatedAt: status.updatedAt || '',
    queuePath: paths.queuePath,
    statusPath: paths.statusPath,
  };
}

function buildControlCenterModel(state, config = {}) {
  const queues = Object.values(state.promptQueues || {})
    .map((queue) => {
      const counts = promptQueueCounts(queue);
      const items = Array.isArray(queue.items) ? queue.items : [];
      const desktop = readDesktopQueueStatus(config, queue, counts);
      return {
        queueKey: queue.queueKey,
        sessionId: queue.sessionId,
        title: queue.chatTitle || queue.projectName || queue.sessionId || 'Codex chat',
        projectName: queue.projectName || config.projectName || '',
        updatedAt: queue.updatedAt || queue.createdAt || '',
        counts,
        desktop,
        items: items.map((item) => ({
          id: item.id,
          position: item.position,
          status: item.status || 'queued',
          prompt: String(item.prompt || '').replace(/\s+/g, ' ').slice(0, 180),
          createdAt: item.createdAt,
          startedAt: item.startedAt,
          finishedAt: item.finishedAt,
          error: item.error,
        })),
      };
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  const latestRoutesBySession = new Map();
  Object.values(state.routes || {})
    .filter((route) => !isTechnicalRouteSummary(route.summary))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .forEach((route) => {
      const key = route.sessionId || `${route.telegramChatId}:${route.telegramMessageId}`;
      if (!latestRoutesBySession.has(key)) latestRoutesBySession.set(key, route);
    });

  const routes = Array.from(latestRoutesBySession.values())
    .slice(0, 20)
    .map((route) => ({
      sessionId: route.sessionId,
      title: route.chatTitle || route.projectName || route.sessionId || 'Codex chat',
      summary: route.summary || '',
      createdAt: route.createdAt || '',
      materialCount: Array.isArray(route.materials) ? route.materials.length : 0,
    }));

  const failedUpdates = Object.values(state.failedUpdates || {})
    .sort((a, b) => Number(b.updateId || 0) - Number(a.updateId || 0))
    .slice(0, 20)
    .map((item) => ({
      updateId: item.updateId,
      attempts: Number(item.attempts || 1),
      kind: item.kind || 'unknown',
      text: String(item.text || '').slice(0, 180),
      lastError: String(item.lastError || '').slice(0, 300),
      updatedAt: item.updatedAt || '',
    }));

  return {
    projectName: config.projectName || 'Codex',
    generatedAt: new Date().toISOString(),
    paused: Boolean(state.control?.paused),
    queueMode: state.control?.queueMode || 'normal',
    queues,
    routes,
    failedUpdates,
  };
}

function buildControlCenterUrl(config = {}) {
  return `http://127.0.0.1:${Number(config.controlCenterPort || 3999)}/`;
}

function isTechnicalRouteSummary(summary) {
  const value = String(summary || '').trim().toLowerCase();
  return value === 'опции отчета'
    || value === 'опции отчёта'
    || value.startsWith('материал codex:')
    || value.startsWith('material codex:');
}

function compactQueueItems(items, options = {}) {
  const queuedHead = Number(options.queuedHead || 10);
  const queuedTail = Number(options.queuedTail || 4);
  const safeItems = Array.isArray(items) ? items : [];
  const queuedItems = safeItems.filter((item) => (item.status || 'queued') === 'queued');
  if (queuedItems.length <= queuedHead + queuedTail) {
    return { items: safeItems, hiddenQueued: 0 };
  }

  const visibleQueuedIds = new Set([
    ...queuedItems.slice(0, queuedHead),
    ...queuedItems.slice(-queuedTail),
  ].map((item) => item.id));
  return {
    items: safeItems.filter((item) => (item.status || 'queued') !== 'queued' || visibleQueuedIds.has(item.id)),
    hiddenQueued: queuedItems.length - visibleQueuedIds.size,
  };
}

function renderControlCenterHtml(model) {
  const queueCards = model.queues.map((queue) => {
    const compact = compactQueueItems(queue.items);
    const items = compact.items.map((item) => `
      <tr class="status-${escapeHtml(item.status)}">
        <td>${escapeHtml(item.position || '')}</td>
        <td><span>${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.prompt)}</td>
        <td>${escapeHtml(item.error || item.finishedAt || item.startedAt || item.createdAt || '')}</td>
      </tr>`).join('');
    const hiddenRow = compact.hiddenQueued ? `
      <tr class="status-hidden">
        <td>...</td>
        <td><span>hidden</span></td>
        <td>${compact.hiddenQueued} more queued items hidden</td>
        <td>Use the queue file for the full list.</td>
      </tr>` : '';
    return `
      <section class="queue">
        <header>
          <div>
            <h2>${escapeHtml(queue.title)}</h2>
            <p>${escapeHtml(queue.sessionId || '')}</p>
          </div>
          <dl>
            <div><dt>Wait</dt><dd>${queue.counts.queued}</dd></div>
            <div><dt>Run</dt><dd>${queue.counts.running}</dd></div>
            <div><dt>Done</dt><dd>${queue.counts.done}</dd></div>
            <div><dt>Err</dt><dd>${queue.counts.error}</dd></div>
          </dl>
        </header>
        <div class="desktop">
          <strong>Sender: ${escapeHtml(queue.desktop?.status || 'unknown')}</strong>
          <span>Queue file: ${escapeHtml(queue.desktop?.queueFileCount ?? 0)}</span>
          ${queue.desktop?.queueRemaining !== null && queue.desktop?.queueRemaining !== undefined ? `<span>Remaining: ${escapeHtml(queue.desktop.queueRemaining)}</span>` : ''}
          ${queue.desktop?.message ? `<em>${escapeHtml(queue.desktop.message)}</em>` : ''}
          ${queue.desktop?.warning ? `<em>${escapeHtml(queue.desktop.warning)}</em>` : ''}
        </div>
        <div class="actions">
          <button data-action="clear-queue" data-queue="${escapeHtml(queue.queueKey)}">Clear this queue</button>
          <button data-action="clear-errors" data-queue="${escapeHtml(queue.queueKey)}">Clear errors</button>
          <button data-action="clear-finished" data-queue="${escapeHtml(queue.queueKey)}">Clear done</button>
        </div>
        <table>
          <thead><tr><th>#</th><th>Status</th><th>Prompt</th><th>Time / error</th></tr></thead>
          <tbody>${items || '<tr><td colspan="4">Queue is empty.</td></tr>'}${hiddenRow}</tbody>
        </table>
      </section>`;
  }).join('');

  const routes = model.routes.map((route) => `
    <li>
      <strong>${escapeHtml(route.title)}</strong>
      <span>${escapeHtml(route.summary)}</span>
      <em>${escapeHtml(route.createdAt)}${route.materialCount ? ` · materials ${route.materialCount}` : ''}</em>
    </li>`).join('');

  const failedUpdates = (model.failedUpdates || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.updateId || '')}</td>
      <td>${escapeHtml(item.attempts || 1)}</td>
      <td>${escapeHtml(item.kind || 'unknown')}</td>
      <td>${escapeHtml(item.text || '')}</td>
      <td>${escapeHtml(item.lastError || item.updatedAt || '')}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="10">
  <title>Codex Control Center</title>
  <style>
    :root { color-scheme: dark; font-family: Segoe UI, Arial, sans-serif; background: #101820; color: #f2f5f8; }
    body { margin: 0; padding: 24px; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 26px; }
    .badge { border: 1px solid #335; padding: 8px 10px; border-radius: 6px; background: #172331; }
    .controls, .actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
    button { color: #f2f5f8; background: #203244; border: 1px solid #3b5268; border-radius: 6px; padding: 8px 10px; font: inherit; cursor: pointer; }
    button:hover { background: #28445d; }
    .queue { border: 1px solid #273645; border-radius: 8px; margin: 16px 0; background: #14202b; overflow: hidden; }
    .queue header { display: flex; justify-content: space-between; gap: 16px; padding: 16px; border-bottom: 1px solid #273645; }
    .queue h2 { font-size: 18px; }
    .queue p, .routes em { color: #9fb1c1; font-size: 12px; }
    .desktop { display: flex; flex-wrap: wrap; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #22313f; color: #cbd5df; font-size: 13px; }
    .desktop em { color: #fb7185; font-style: normal; }
    dl { display: grid; grid-template-columns: repeat(4, 58px); gap: 8px; margin: 0; text-align: center; }
    dt { color: #9fb1c1; font-size: 11px; }
    dd { margin: 4px 0 0; font-size: 18px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #22313f; text-align: left; vertical-align: top; word-wrap: break-word; }
    th:first-child, td:first-child { width: 46px; }
    th:nth-child(2), td:nth-child(2) { width: 110px; }
    th:nth-child(4), td:nth-child(4) { width: 220px; }
    .status-running span { color: #facc15; font-weight: 700; }
    .status-done span { color: #22c55e; font-weight: 700; }
    .status-error span { color: #fb7185; font-weight: 700; }
    .status-hidden { color: #9fb1c1; background: #101923; }
    .status-hidden span { color: #9fb1c1; font-weight: 700; }
    .routes { margin-top: 24px; padding: 16px; border: 1px solid #273645; border-radius: 8px; background: #111c26; }
    .routes ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 10px; }
    .routes li { display: grid; gap: 4px; }
    .updates { margin-top: 24px; padding: 16px; border: 1px solid #273645; border-radius: 8px; background: #121b24; }
    .updates header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 10px; }
    .updates-empty { color: #22c55e; font-weight: 700; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <h1>Codex Control Center</h1>
      <p>${escapeHtml(model.projectName)} · ${escapeHtml(model.generatedAt)} · mode ${escapeHtml(model.queueMode)}</p>
    </div>
    <div class="badge">${model.paused ? 'Paused' : 'Running'}</div>
  </div>
  <div class="controls">
    <button data-action="pause">Pause all</button>
    <button data-action="resume">Resume all</button>
    <button data-action="clear-all">Clear all queues</button>
    <button data-action="set-mode" data-mode="normal">Mode normal</button>
    <button data-action="set-mode" data-mode="cautious">Mode cautious</button>
    <button data-action="set-mode" data-mode="fast">Mode fast</button>
    <button data-action="set-mode" data-mode="no_questions">Mode no questions</button>
    <button data-action="set-mode" data-mode="audit_only">Mode audit only</button>
  </div>
  <section class="updates">
    <header>
      <h2>Telegram updates</h2>
      <button data-action="clear-failed-updates">Clear update errors</button>
    </header>
    ${failedUpdates ? `
      <table>
        <thead><tr><th>Update</th><th>Try</th><th>Kind</th><th>Text</th><th>Error</th></tr></thead>
        <tbody>${failedUpdates}</tbody>
      </table>` : '<p class="updates-empty">No failed Telegram updates.</p>'}
  </section>
  ${queueCards || '<section class="queue"><header><h2>No queues yet</h2></header></section>'}
  <section class="routes">
    <h2>Latest reports</h2>
    <ul>${routes || '<li>No reports yet.</li>'}</ul>
  </section>
  <script>
    const actionUrl = ${JSON.stringify(model.actionUrl || 'http://127.0.0.1:3999/action')};
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      button.disabled = true;
      try {
        await fetch(actionUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: button.dataset.action, queueKey: button.dataset.queue || '', mode: button.dataset.mode || '' })
        });
        location.reload();
      } catch (error) {
        alert('Control Center server is not running: ' + error.message);
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

function setQueuePaused(config, state, paused) {
  if (!state.control || typeof state.control !== 'object') state.control = {};
  state.control.paused = Boolean(paused);
  state.control.updatedAt = new Date().toISOString();
  for (const queue of Object.values(state.promptQueues || {})) {
    const paths = buildVisibleQueuePaths(config, queue);
    if (paused) {
      fs.mkdirSync(path.dirname(paths.stopFile), { recursive: true });
      fs.writeFileSync(paths.stopFile, `paused ${state.control.updatedAt}\n`, 'utf8');
    } else {
      fs.rmSync(paths.stopFile, { force: true });
    }
  }
}

function clearQueues(config, state, queueKey = '') {
  const keys = queueKey ? [promptQueueKey(queueKey)] : Object.keys(state.promptQueues || {});
  let cleared = 0;
  for (const key of keys) {
    const queue = state.promptQueues?.[key];
    if (!queue) continue;
    const paths = buildVisibleQueuePaths(config, queue);
    fs.rmSync(paths.queuePath, { force: true });
    fs.rmSync(paths.statusPath, { force: true });
    queue.items = [];
    queue.replaceItems = true;
    queue.updatedAt = new Date().toISOString();
    cleared += 1;
  }
  return cleared;
}

function pruneQueueItems(config, state, queueKey = '', statuses = []) {
  const allowed = new Set(statuses);
  const keys = queueKey ? [promptQueueKey(queueKey)] : Object.keys(state.promptQueues || {});
  let cleared = 0;
  for (const key of keys) {
    const queue = state.promptQueues?.[key];
    if (!queue) continue;
    const before = Array.isArray(queue.items) ? queue.items : [];
    const after = before.filter((item) => !allowed.has(item.status || 'queued'));
    cleared += before.length - after.length;
    queue.items = after.map((item, index) => ({
      ...item,
      position: index + 1,
    }));
    queue.replaceItems = true;
    queue.updatedAt = new Date().toISOString();

    const paths = buildVisibleQueuePaths(config, queue);
    const queuedPrompts = queue.items
      .filter((item) => (item.status || 'queued') === 'queued')
      .map((item) => item.prompt)
      .filter(Boolean);
    if (queuedPrompts.length) {
      fs.mkdirSync(path.dirname(paths.queuePath), { recursive: true });
      fs.writeFileSync(paths.queuePath, `${queuedPrompts.join('\n')}\n`, 'utf8');
    } else {
      fs.rmSync(paths.queuePath, { force: true });
    }
  }
  return cleared;
}

function applyControlAction(config, state, input = {}) {
  const action = String(input.action || '').trim();
  if (action === 'pause') {
    setQueuePaused(config, state, true);
    return { ok: true, message: 'paused' };
  }
  if (action === 'resume') {
    setQueuePaused(config, state, false);
    return { ok: true, message: 'resumed' };
  }
  if (action === 'clear-all') {
    const cleared = clearQueues(config, state);
    return { ok: true, message: `cleared ${cleared} queues` };
  }
  if (action === 'clear-queue') {
    const cleared = clearQueues(config, state, input.queueKey);
    return { ok: true, message: `cleared ${cleared} queue` };
  }
  if (action === 'clear-errors') {
    const cleared = pruneQueueItems(config, state, input.queueKey, ['error']);
    return { ok: true, message: `cleared ${cleared} error items` };
  }
  if (action === 'clear-finished') {
    const cleared = pruneQueueItems(config, state, input.queueKey, ['done']);
    return { ok: true, message: `cleared ${cleared} finished items` };
  }
  if (action === 'clear-failed-updates') {
    const cleared = Object.keys(state.failedUpdates || {}).length;
    state.failedUpdates = {};
    return { ok: true, message: `cleared ${cleared} failed updates` };
  }
  if (action === 'set-mode') {
    if (!state.control || typeof state.control !== 'object') state.control = {};
    state.control.queueMode = String(input.mode || 'normal');
    state.control.updatedAt = new Date().toISOString();
    return { ok: true, message: `mode ${state.control.queueMode}` };
  }
  return { ok: false, message: `unknown action: ${action || 'empty'}` };
}

function writeControlCenter(config = loadConfig(), state = loadState(config.statePath)) {
  const paths = buildVisibleQueuePaths(config, 'control-center');
  const model = buildControlCenterModel(state, config);
  model.actionUrl = `${buildControlCenterUrl(config)}action`;
  fs.mkdirSync(path.dirname(paths.controlCenterPath), { recursive: true });
  fs.writeFileSync(paths.controlCenterPath, renderControlCenterHtml(model), 'utf8');
  fs.writeFileSync(paths.controlCenterStatePath, JSON.stringify(model, null, 2), 'utf8');
  return paths.controlCenterPath;
}

if (require.main === module) {
  const config = loadConfig();
  const state = loadState(config.statePath);
  const file = writeControlCenter(config, state);
  saveState(config.statePath, state);
  console.log(file);
}

module.exports = {
  applyControlAction,
  buildControlCenterModel,
  buildControlCenterUrl,
  compactQueueItems,
  countQueueFileLines,
  readDesktopQueueStatus,
  renderControlCenterHtml,
  writeControlCenter,
};
