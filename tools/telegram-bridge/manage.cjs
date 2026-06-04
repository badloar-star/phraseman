#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { DEFAULT_DATA_DIR, ensureDirFor } = require('./core.cjs');

function getManagedProcessSpecs() {
  const rootDir = path.join(__dirname, '..', '..');
  return {
    bridge: {
      name: 'telegram bridge',
      scriptPath: path.join(__dirname, 'bridge.cjs'),
      pidPath: path.join(DEFAULT_DATA_DIR, 'bridge.pid.json'),
      logPath: path.join(DEFAULT_DATA_DIR, 'bridge.log'),
      errPath: path.join(DEFAULT_DATA_DIR, 'bridge.err.log'),
      cwd: rootDir,
    },
    control: {
      name: 'control server',
      scriptPath: path.join(__dirname, 'control-server.cjs'),
      pidPath: path.join(DEFAULT_DATA_DIR, 'control-server.pid.json'),
      logPath: path.join(DEFAULT_DATA_DIR, 'control-server.log'),
      errPath: path.join(DEFAULT_DATA_DIR, 'control-server.err.log'),
      cwd: rootDir,
    },
  };
}

function resolveManagedTargets(target = 'all') {
  if (!target || target === 'all') return ['bridge', 'control'];
  if (target === 'bridge' || target === 'control') return [target];
  throw new Error(`Unknown target: ${target}`);
}

function readPidFile(pidPath) {
  if (!fs.existsSync(pidPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pidPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  if (!pid || !Number.isSafeInteger(Number(pid))) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function writePidFile(spec, pid) {
  ensureDirFor(spec.pidPath);
  fs.writeFileSync(spec.pidPath, JSON.stringify({
    pid,
    startedAt: new Date().toISOString(),
    command: `${process.execPath} ${spec.scriptPath}`,
  }, null, 2), 'utf8');
}

function statusTarget(spec) {
  const pidFile = readPidFile(spec.pidPath);
  if (pidFile && isProcessAlive(pidFile.pid)) {
    console.log(`${spec.name} running pid=${pidFile.pid}`);
    return true;
  }
  console.log(`${spec.name} stopped`);
  return false;
}

async function waitForPidExit(pid, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 5000);
  const pollMs = Number(options.pollMs || 100);
  const startedAt = Date.now();
  const isAlive = options.isAlive || isProcessAlive;
  while (Date.now() - startedAt < timeoutMs) {
    if (!isAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return !isAlive(pid);
}

function startTarget(spec) {
  const pidFile = readPidFile(spec.pidPath);
  if (pidFile && isProcessAlive(pidFile.pid)) {
    console.log(`${spec.name} already running pid=${pidFile.pid}`);
    return;
  }

  ensureDirFor(spec.logPath);
  const out = fs.openSync(spec.logPath, 'a');
  const err = fs.openSync(spec.errPath, 'a');
  fs.appendFileSync(spec.logPath, `\n--- managed start ${new Date().toISOString()} ---\n`, 'utf8');
  const child = spawn(process.execPath, [spec.scriptPath], {
    cwd: spec.cwd,
    detached: true,
    stdio: ['ignore', out, err],
    windowsHide: true,
    env: process.env,
  });
  fs.closeSync(out);
  fs.closeSync(err);
  child.unref();
  writePidFile(spec, child.pid);
  console.log(`${spec.name} started pid=${child.pid}`);
}

function stopTarget(spec) {
  const pidFile = readPidFile(spec.pidPath);
  if (!pidFile || !isProcessAlive(pidFile.pid)) {
    console.log(`${spec.name} already stopped`);
    return null;
  }
  process.kill(Number(pidFile.pid), 'SIGTERM');
  console.log(`${spec.name} stopped pid=${pidFile.pid}`);
  return Number(pidFile.pid);
}

async function runCommand(command = 'status', target = 'all') {
  const specs = getManagedProcessSpecs();
  const targets = resolveManagedTargets(target);

  if (command === 'status') {
    return targets.every((name) => statusTarget(specs[name]));
  }
  if (command === 'start') {
    for (const name of targets.slice().reverse()) startTarget(specs[name]);
    return true;
  }
  if (command === 'stop') {
    for (const name of targets) stopTarget(specs[name]);
    return true;
  }
  if (command === 'restart') {
    const stoppedPids = [];
    for (const name of targets) {
      const pid = stopTarget(specs[name]);
      if (pid) stoppedPids.push({ name, pid });
    }
    for (const item of stoppedPids) {
      const stopped = await waitForPidExit(item.pid, { timeoutMs: 7000, pollMs: 150 });
      if (!stopped) {
        console.log(`${specs[item.name].name} did not exit within timeout pid=${item.pid}`);
      }
    }
    for (const name of targets.slice().reverse()) startTarget(specs[name]);
    return true;
  }
  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  (async () => {
    try {
      await runCommand(process.argv[2] || 'status', process.argv[3] || 'all');
    } catch (error) {
      console.error(error.message);
      console.error('Usage: node tools/telegram-bridge/manage.cjs <start|stop|restart|status> [all|bridge|control]');
      process.exit(1);
    }
  })();
}

module.exports = {
  getManagedProcessSpecs,
  isProcessAlive,
  readPidFile,
  resolveManagedTargets,
  runCommand,
  waitForPidExit,
};
