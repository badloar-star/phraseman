#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (!args.command.length) {
  console.error('Usage: node scripts/codex-safe-run.mjs [--name <label>] [--log-dir <dir>] [--status-interval-ms 15000] [--tail-lines 20] [--max-line-chars 240] -- <command> [args...]');
  process.exit(1);
}

const label = sanitizeName(args.name || path.basename(args.command[0]) || 'command');
const runDir = path.resolve(ROOT, args.logDir || path.join('.codex-tmp', 'codex-safe-run', `${timestamp()}_${label}`));
const stdoutPath = path.join(runDir, 'stdout.log');
const stderrPath = path.join(runDir, 'stderr.log');
const metaPath = path.join(runDir, 'meta.json');
const statusIntervalMs = numberArg(args.statusIntervalMs, 15000);
const tailLines = numberArg(args.tailLines, 20);
const maxLineChars = numberArg(args.maxLineChars, 240);

fs.mkdirSync(runDir, { recursive: true });

const meta = {
  startedAt: new Date().toISOString(),
  cwd: ROOT,
  command: args.command,
  stdoutPath: rel(stdoutPath),
  stderrPath: rel(stderrPath),
};
fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

let stdoutBytes = 0;
let stderrBytes = 0;
const stdoutTail = createTail(tailLines);
const stderrTail = createTail(tailLines);
const stdoutStream = fs.createWriteStream(stdoutPath, { flags: 'a' });
const stderrStream = fs.createWriteStream(stderrPath, { flags: 'a' });

console.log(`codex-safe-run: started ${args.command.map(shellQuote).join(' ')}`);
console.log(`codex-safe-run: logs ${rel(runDir)}`);

const child = spawn(args.command[0], args.command.slice(1), {
  cwd: ROOT,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let finished = false;
let lastStatusAt = Date.now();
const statusTimer = setInterval(() => {
  if (finished) return;
  lastStatusAt = Date.now();
  console.log(`codex-safe-run: still running, stdout=${formatBytes(stdoutBytes)}, stderr=${formatBytes(stderrBytes)}, logs=${rel(runDir)}`);
}, statusIntervalMs);

child.stdout.on('data', (chunk) => {
  stdoutBytes += chunk.length;
  stdoutStream.write(chunk);
  stdoutTail.push(chunk.toString('utf8'));
});

child.stderr.on('data', (chunk) => {
  stderrBytes += chunk.length;
  stderrStream.write(chunk);
  stderrTail.push(chunk.toString('utf8'));
});

child.on('error', (error) => {
  stderrBytes += Buffer.byteLength(String(error));
  stderrStream.write(`${String(error.stack || error)}\n`);
});

child.on('close', (code, signal) => {
  finished = true;
  clearInterval(statusTimer);
  stdoutStream.end();
  stderrStream.end();

  const doneMeta = {
    ...meta,
    finishedAt: new Date().toISOString(),
    exitCode: code,
    signal,
    stdoutBytes,
    stderrBytes,
  };
  fs.writeFileSync(metaPath, `${JSON.stringify(doneMeta, null, 2)}\n`, 'utf8');

  console.log(`codex-safe-run: finished exit=${code ?? 'null'} signal=${signal ?? 'none'} stdout=${formatBytes(stdoutBytes)} stderr=${formatBytes(stderrBytes)}`);
  printTail('stderr tail', stderrTail.lines(), maxLineChars);
  printTail('stdout tail', stdoutTail.lines(), maxLineChars);
  console.log(`codex-safe-run: meta ${rel(metaPath)}`);

  if (code && code !== 0) process.exitCode = code;
  else if (signal) process.exitCode = 1;
});

process.on('SIGINT', () => {
  console.log('codex-safe-run: SIGINT received, forwarding to child');
  child.kill('SIGINT');
  setTimeout(() => {
    if (!finished) child.kill('SIGTERM');
  }, 5000).unref();
});

function parseArgs(raw) {
  const parsed = { command: [] };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === '--') {
      parsed.command = raw.slice(i + 1);
      break;
    }
    if (!arg.startsWith('--')) {
      parsed.command = raw.slice(i);
      break;
    }
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const next = raw[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      i += 1;
    }
  }
  return parsed;
}

function createTail(limit) {
  let pending = '';
  let lines = [];
  return {
    push(text) {
      pending += text;
      const parts = pending.split(/\r?\n/);
      pending = parts.pop() || '';
      lines.push(...parts);
      if (lines.length > limit) lines = lines.slice(-limit);
    },
    lines() {
      const out = pending ? [...lines, pending] : lines;
      return out.slice(-limit);
    },
  };
}

function printTail(title, lines, limit) {
  if (!lines.length) return;
  console.log(`codex-safe-run: ${title}`);
  for (const line of lines) {
    const clean = line.replace(/\r/g, '').trimEnd();
    console.log(clean.length > limit ? `${clean.slice(0, limit)}...` : clean);
  }
}

function numberArg(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeName(value) {
  return String(value).replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'command';
}

function rel(file) {
  return path.relative(ROOT, file).replaceAll('\\', '/');
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
}

function formatBytes(value) {
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function shellQuote(value) {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}
