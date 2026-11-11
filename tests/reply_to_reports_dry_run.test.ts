const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawnSync } = require('child_process');

const scriptPath = path.join(__dirname, '..', 'scripts', 'reply_to_reports.mjs');
const script = fs.readFileSync(scriptPath, 'utf8');
const rewards = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'reply_to_reports_rewards.mjs'), 'utf8');

const idOnlyRow = {
  reportId: 'report-id-only-1',
  title: 'Спасибо!',
  body: 'Мы получили ваше сообщение.',
  resolution: 'unconfirmed',
  rewardBundle: { version: 2, severity: 'none', coins: 0 },
};

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function guardedCli(rows: object[], args: string[] = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reply-id-only-'));
  const input = path.join(dir, 'replies.json');
  const guard = path.join(dir, 'dry-run-guard.cjs');
  fs.writeFileSync(input, JSON.stringify(rows));
  fs.writeFileSync(guard, `
    const Module = require('node:module');
    const fs = require('node:fs');
    const originalLoad = Module._load;
    const forbidden = new Set(['http', 'https', 'node:http', 'node:https', 'net', 'node:net', 'tls', 'node:tls']);
    Module._load = function(request, ...rest) {
      if (request === 'firebase-admin' || String(request).startsWith('firebase-admin/')) {
        throw new Error('DRY_RUN_FORBIDDEN_FIREBASE_ADMIN_LOAD');
      }
      if (forbidden.has(request)) throw new Error('DRY_RUN_FORBIDDEN_NETWORK_MODULE:' + request);
      return originalLoad.call(this, request, ...rest);
    };
    const originalRead = fs.readFileSync;
    fs.readFileSync = function(file, ...rest) {
      if (String(file).replace(/\\\\/g, '/').endsWith('/service-account.json')) {
        throw new Error('DRY_RUN_FORBIDDEN_SECRET_READ');
      }
      return originalRead.call(this, file, ...rest);
    };
  `);
  const beforeHash = sha256(input);
  const beforeFiles = fs.readdirSync(dir).sort();
  const nodeOptions = [process.env.NODE_OPTIONS, `--require=${guard}`].filter(Boolean).join(' ');
  const run = spawnSync(process.execPath, [scriptPath, input, ...args], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: nodeOptions },
  });
  return {
    run,
    beforeHash,
    afterHash: sha256(input),
    beforeFiles,
    afterFiles: fs.readdirSync(dir).sort(),
  };
}

test('report reply script keeps Firebase transport out of dry-run mode', () => {
  expect(script).toContain('let admin;');
  // D109 (04.10): предпросмотр по умолчанию, запись только с одним точным --send.
  expect(script).toContain('const runMode = resolveRunMode(process.argv.slice(3));');
  expect(script).toContain("const dryRun = runMode === 'dry-run';");
  expect(script).toContain('normalizeReplyRow(row, i, { mode: runMode })');
  expect(script).toContain('if (dryRun) {');
  expect(script).toContain("admin = require('firebase-admin');");
  expect(script.indexOf('if (dryRun) {')).toBeLessThan(script.indexOf("admin = require('firebase-admin');"));
  expect(script).toContain('Реальная отправка — только с флагом --send');
  expect(rewards).toContain('export function sanitizePreparedReplyBody');
  expect(rewards).toContain('const body = sanitizePreparedReplyBody(row?.body).slice(0, BODY_MAX)');
  expect(script).not.toContain("const admin = require('firebase-admin');");
});

test('reportId-only explicit dry-run succeeds without SDK, network, secret reads, or writes', () => {
  const result = guardedCli([idOnlyRow], ['--dry-run']);
  expect(result.run.status).toBe(0);
  expect(result.run.stderr).toBe('');
  expect(result.run.stdout).toContain('DRY-RUN: 1');
  expect(result.run.stdout).not.toContain('users/');
  expect(result.run.stdout).not.toContain('DRY_RUN_FORBIDDEN_');
  expect(result.afterHash).toBe(result.beforeHash);
  expect(result.afterFiles).toEqual(result.beforeFiles);
});

test('reportId-only default invocation is also an offline dry-run', () => {
  const result = guardedCli([idOnlyRow]);
  expect(result.run.status).toBe(0);
  expect(result.run.stderr).toBe('');
  expect(result.run.stdout).toContain('DRY-RUN: 1');
  expect(result.afterHash).toBe(result.beforeHash);
  expect(result.afterFiles).toEqual(result.beforeFiles);
});

test('dry-run never prints a supplied UID or users prefix', () => {
  const sentinel = 'uid-privacy-sentinel-123456789';
  const result = guardedCli([{ ...idOnlyRow, uid: sentinel }], ['--dry-run']);
  expect(result.run.status).toBe(0);
  expect(result.run.stdout).not.toContain(sentinel);
  expect(result.run.stdout).not.toContain(sentinel.slice(0, 10));
  expect(result.run.stdout).not.toContain('users/');
});

test('unknown CLI flags fail closed before SDK, network, or secret access', () => {
  const result = guardedCli([idOnlyRow], ['--wat']);
  expect(result.run.status).toBe(1);
  expect(`${result.run.stdout}\n${result.run.stderr}`).toMatch(/invalid.*flag|flag.*invalid|unknown/i);
  expect(`${result.run.stdout}\n${result.run.stderr}`).not.toContain('DRY_RUN_FORBIDDEN_');
  expect(result.afterHash).toBe(result.beforeHash);
  expect(result.afterFiles).toEqual(result.beforeFiles);
});
