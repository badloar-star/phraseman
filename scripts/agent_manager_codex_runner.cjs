'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  exchangePairing,
  pollAndExecuteOnce,
  redactForSubmission,
} = require('./agent_manager_codex_runner_core.cjs');

const CONFIG_ENV = 'AGENT_MANAGER_RUNNER_CONFIG';
const SAFE_ENV_KEYS = Object.freeze(['APPDATA', 'HOME', 'LOCALAPPDATA', 'PATH', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERPROFILE']);

function safeEnv() {
  return SAFE_ENV_KEYS.reduce((result, key) => {
    if (process.env[key]) result[key] = process.env[key];
    return result;
  }, {});
}

function defaultConfigPath() {
  return path.join(os.homedir(), '.phraseman', 'agent-manager-runner.json');
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) throw new Error('runner argument is invalid');
    const key = token.slice(2);
    if (key === 'once' || key === 'dry-run') { options[key] = true; continue; }
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`runner argument ${token} requires a value`);
    options[key] = value;
    index += 1;
  }
  if (command !== 'pair' && command !== 'run') throw new Error('use pair or run');
  return Object.freeze({ command, options: Object.freeze(options) });
}

function writeConfig(configPath, config) {
  const target = path.resolve(configPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  try { fs.chmodSync(target, 0o600); } catch { /* Windows ACLs govern file access. */ }
  return target;
}

function readConfig(configPath) {
  return JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf8'));
}

function runProcess(command, args, options) {
  return spawnSync(command, args, {
    cwd: options && options.cwd,
    encoding: 'utf8',
    shell: false,
    env: safeEnv(),
    windowsHide: true,
  });
}

function codexAvailable() {
  const probe = runProcess('codex', ['--version']);
  return !probe.error && probe.status === 0;
}

function report(result) {
  const safe = redactForSubmission(JSON.stringify(result));
  process.stdout.write(`${safe}\n`);
}

async function runOnce(config, workspaceRoot, dryRun) {
  return pollAndExecuteOnce({
    config,
    workspaceRoot,
    dryRun,
    fetch: globalThis.fetch,
    commandExists: () => codexAvailable(),
    run: runProcess,
  });
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  const configPath = options.config || process.env[CONFIG_ENV] || defaultConfigPath();
  if (command === 'pair') {
    const config = await exchangePairing({
      exchangeUrl: options['exchange-url'] || process.env.AGENT_MANAGER_RUNNER_EXCHANGE_URL,
      pairingId: options['pairing-id'] || process.env.AGENT_MANAGER_RUNNER_PAIRING_ID,
      pairingCode: options['pairing-code'] || process.env.AGENT_MANAGER_RUNNER_PAIRING_CODE,
      claimUrl: options['claim-url'] || process.env.AGENT_MANAGER_RUNNER_CLAIM_URL,
      submitUrl: options['submit-url'] || process.env.AGENT_MANAGER_RUNNER_SUBMIT_URL,
      fetch: globalThis.fetch,
    });
    const target = writeConfig(configPath, config);
    process.stdout.write(`Local runner paired. Configuration saved to ${target}\n`);
    return;
  }

  const config = readConfig(configPath);
  const workspaceRoot = options.workspace || process.cwd();
  const dryRun = Boolean(options['dry-run']);
  const once = Boolean(options.once);
  do {
    const result = await runOnce(config, workspaceRoot, dryRun);
    report(result);
    if (once) return;
    await new Promise((resolve) => setTimeout(resolve, 30_000));
  } while (true);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Agent Manager runner failed: ${redactForSubmission(error && error.message)}\n`);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({ defaultConfigPath, main, parseArgs, readConfig, runOnce, runProcess, safeEnv, writeConfig });
