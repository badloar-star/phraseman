#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const {
  collectFreshFinalAgentMessages,
  DEFAULT_CONFIG_PATH,
  DEFAULT_DATA_DIR,
  loadConfig,
  loadState,
} = require('./core.cjs');
const { buildControlCenterUrl } = require('./control-center.cjs');

const PID_PATH = path.join(DEFAULT_DATA_DIR, 'bridge.pid.json');
const CONTROL_PID_PATH = path.join(DEFAULT_DATA_DIR, 'control-server.pid.json');

function check(name, ok, detail = '') {
  console.log(`${ok ? 'OK' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`);
  return ok;
}

function ageMs(filePath) {
  try {
    return Date.now() - fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

function lockCheck(lockPath, staleMs) {
  if (!fs.existsSync(lockPath)) return { ok: true, detail: 'absent' };
  const age = ageMs(lockPath);
  if (age === null) return { ok: true, detail: 'disappeared' };
  const ok = age <= staleMs;
  return { ok, detail: `${ok ? 'active' : 'stale'} ageMs=${Math.round(age)} path=${lockPath}` };
}

function listTempFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tmp'))
    .map((entry) => path.join(dirPath, entry.name));
}

function listStaleCodexLocks(dirPath, staleMs) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.lock'))
    .map((entry) => path.join(dirPath, entry.name))
    .filter((lockPath) => {
      const age = ageMs(lockPath);
      return age !== null && age > staleMs;
    });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function fileContains(filePath, needle) {
  try {
    return fs.readFileSync(filePath, 'utf8').includes(needle);
  } catch {
    return false;
  }
}

function probeControlHealth(config, timeoutMs = 1200) {
  const url = new URL('health', buildControlCenterUrl(config));
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode === 200, detail: `HTTP ${res.statusCode}` });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, detail: `timeout ${timeoutMs}ms` });
    });
    req.on('error', (error) => resolve({ ok: false, detail: error.message }));
  });
}

async function main() {
  let ok = true;
  const config = loadConfig();
  const minSessionLockStaleMs = Number(config.codexTimeoutMs || 0) + 5 * 60 * 1000;
  const sessionLockStaleMs = Number(config.codexSessionLockStaleMs || 0);
  ok = check(
    'codexSessionLockStaleMs safe',
    sessionLockStaleMs >= minSessionLockStaleMs,
    sessionLockStaleMs >= minSessionLockStaleMs
      ? `${sessionLockStaleMs}ms >= ${minSessionLockStaleMs}ms`
      : `${sessionLockStaleMs}ms < ${minSessionLockStaleMs}ms`
  ) && ok;
  const state = loadState(config.statePath);
  const pidFile = readJson(PID_PATH);
  const controlPidFile = readJson(CONTROL_PID_PATH);

  ok = check('config file exists', fs.existsSync(DEFAULT_CONFIG_PATH), DEFAULT_CONFIG_PATH) && ok;
  ok = check('bot token configured', Boolean(config.botToken), config.botToken ? 'redacted' : 'missing') && ok;
  ok = check('default chat configured', Boolean(config.defaultChatId), String(config.defaultChatId || 'missing')) && ok;
  ok = check('allowlist configured', (config.allowedUserIds || []).length > 0, (config.allowedUserIds || []).join(',')) && ok;
  ok = check('state file exists', fs.existsSync(config.statePath), config.statePath) && ok;
  ok = check('state backup exists', fs.existsSync(`${config.statePath}.bak`), `${config.statePath}.bak`) && ok;
  ok = check('state backup parses', Boolean(readJson(`${config.statePath}.bak`)), `${config.statePath}.bak`) && ok;
  ok = check('routes exist', Object.keys(state.routes || {}).length > 0, `${Object.keys(state.routes || {}).length} routes`) && ok;
  const failedUpdates = Object.values(state.failedUpdates || {});
  ok = check(
    'no failed telegram updates',
    failedUpdates.length === 0,
    failedUpdates.length
      ? failedUpdates.map((item) => `update=${item.updateId} attempts=${item.attempts} error=${item.lastError}`).join('; ')
      : 'none'
  ) && ok;
  const tempFiles = listTempFiles(path.dirname(config.statePath));
  ok = check('no temporary state files', tempFiles.length === 0, tempFiles.length ? tempFiles.join(', ') : 'none') && ok;
  const sendLock = lockCheck(path.join(path.dirname(config.statePath), 'send.lock'), config.telegramSendLockStaleMs);
  ok = check('telegram send lock healthy', sendLock.ok, sendLock.detail) && ok;
  const staleCodexLocks = listStaleCodexLocks(
    path.join(path.dirname(config.statePath), 'codex-session-locks'),
    config.codexSessionLockStaleMs
  );
  ok = check(
    'codex session locks healthy',
    staleCodexLocks.length === 0,
    staleCodexLocks.length ? staleCodexLocks.join(', ') : 'none stale'
  ) && ok;
  ok = check('managed pid file exists', Boolean(pidFile?.pid), PID_PATH) && ok;
  ok = check('managed bridge process alive', Boolean(pidFile?.pid && isProcessAlive(pidFile.pid)), pidFile?.pid ? `pid=${pidFile.pid}` : 'missing pid') && ok;
  ok = check('control server pid file exists', Boolean(controlPidFile?.pid), CONTROL_PID_PATH) && ok;
  ok = check(
    'control server process alive',
    Boolean(controlPidFile?.pid && isProcessAlive(controlPidFile.pid)),
    controlPidFile?.pid ? `pid=${controlPidFile.pid}` : 'missing pid'
  ) && ok;
  const controlHealth = await probeControlHealth(config);
  ok = check('control server health responds', controlHealth.ok, controlHealth.detail) && ok;

  const codexHooks = path.join(process.cwd(), '.codex', 'hooks.json');
  ok = check('codex relay hook wired', fileContains(codexHooks, 'relay-latest.cjs'), codexHooks) && ok;
  ok = check('codex notification hook wired', fileContains(codexHooks, 'hook.cjs'), codexHooks) && ok;
  ok = check('codex hooks use project dir', fileContains(codexHooks, '%CLAUDE_PROJECT_DIR%'), codexHooks) && ok;
  ok = check('all-session relay enabled', config.relayAllSessions === true, `relayAllSessions=${config.relayAllSessions}`) && ok;
  ok = check('session index configured', Boolean(config.sessionIndexPath), config.sessionIndexPath || 'missing') && ok;

  const relayScanStartedAt = Date.now();
  const freshRecords = collectFreshFinalAgentMessages({
    sessionsRoot: config.codexSessionsRoot,
    sessionIndexPath: config.sessionIndexPath,
    maxAgeMs: config.relayMaxAgeMs,
    attachmentLimit: 0,
    artifactRoots: [],
    artifactScanMaxFiles: 0,
  });
  const relayScanMs = Date.now() - relayScanStartedAt;
  ok = check(
    'fresh relay scan responsive',
    relayScanMs < 5000,
    `${relayScanMs}ms, ${freshRecords.length} fresh final record(s)`
  ) && ok;

  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
