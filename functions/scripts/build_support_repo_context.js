#!/usr/bin/env node

/*
 * Builds a read-only, allow-listed repository snapshot for support replies.
 * The Cloud Functions deployment contains only functions/, so runtime code
 * cannot inspect the checkout. This artifact is rebuilt before every Functions
 * build and records the exact source fingerprint that the reply was grounded in.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const childProcess = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(__dirname, '..', 'src', 'generated', 'support_repo_context.json');
const MAX_FILE_BYTES = 180_000;
const CHUNK_CHARS = 1_600;
const CHUNK_OVERLAP = 240;
const MAX_CHUNKS = 12_000;
const MAX_CHUNKS_PER_FILE = 6;

const exactFiles = [
  'specs/gmail-support-inbox.md',
  'package.json',
  'app.config.js',
  'knowly-www/PRODUCT.md',
  'knowly-www/premium/index.html',
  'knowly-www/download/index.html',
  'knowly-www/legal/privacy/index.html',
  'knowly-www/legal/terms/index.html',
  'knowly-www/legal/data-deletion/index.html',
  'functions/src/support_auto_reply_policy.ts',
  'functions/src/support_repository_context.ts',
  'functions/src/support_reply_delivery.ts',
];

const roots = ['app', 'components', 'constants', 'functions/src'];
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.html']);
const excluded = /(?:^|\/)(?:node_modules|lib|generated|__snapshots__|fixtures|test-results)(?:\/|$)|(?:\.test|\.spec)\.[^.]+$|(?:^|\/)(?:admin|scripts\/ai-pr-reviewer)(?:\/|$)|(?:^|\/)app\/(?:plan_content_|dictionary_|phrase_db|diagnosis_training_|.*_content_bank)/;

function walk(relativeDir, out) {
  const absolute = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.posix.join(relativeDir.replaceAll(path.sep, '/'), entry.name);
    if (excluded.test(relative)) continue;
    if (entry.isDirectory()) walk(relative, out);
    else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) out.push(relative);
  }
}

function git(command, fallback) {
  try {
    return childProcess.execFileSync('git', command, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function normalizeSource(raw, extension) {
  const withoutMarkup = extension === '.html'
    ? raw.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
    : raw;
  return withoutMarkup
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function chunkFile(relative, text) {
  const lines = text.split('\n');
  const chunks = [];
  let startLine = 1;
  let buffer = '';
  for (let index = 0; index < lines.length; index += 1) {
    const next = `${buffer}${buffer ? '\n' : ''}${lines[index]}`;
    if (next.length > CHUNK_CHARS && buffer) {
      chunks.push({ path: relative, line: startLine, text: buffer });
      const overlap = buffer.slice(-CHUNK_OVERLAP);
      buffer = `${overlap}\n${lines[index]}`;
      startLine = Math.max(1, index + 1 - overlap.split('\n').length);
    } else {
      buffer = next;
    }
  }
  if (buffer.trim()) chunks.push({ path: relative, line: startLine, text: buffer });
  return chunks;
}

const discovered = [];
for (const root of roots) walk(root, discovered);
const uniqueFiles = [...new Set([...exactFiles, ...discovered])]
  .filter((relative) => fs.existsSync(path.join(ROOT, relative)))
  .sort();
const chunksByFile = new Map();
for (const relative of uniqueFiles) {
  const absolute = path.join(ROOT, relative);
  const stat = fs.statSync(absolute);
  if (stat.size > MAX_FILE_BYTES) continue;
  const raw = fs.readFileSync(absolute, 'utf8');
  const normalized = normalizeSource(raw, path.extname(relative));
  if (!normalized) continue;
  chunksByFile.set(relative, chunkFile(relative, normalized).slice(0, MAX_CHUNKS_PER_FILE));
}

// Exact product/support contracts always win. Remaining files are emitted in
// rounds (first chunk of every file, then the second, etc.), so an early large
// app file can never starve components or server code.
const orderedFiles = [
  ...exactFiles.filter((relative) => chunksByFile.has(relative)),
  ...uniqueFiles.filter((relative) => !exactFiles.includes(relative) && chunksByFile.has(relative)),
];
const chunks = [];
for (let round = 0; round < MAX_CHUNKS_PER_FILE && chunks.length < MAX_CHUNKS; round += 1) {
  for (const relative of orderedFiles) {
    const chunk = chunksByFile.get(relative)?.[round];
    if (chunk) chunks.push(chunk);
    if (chunks.length >= MAX_CHUNKS) break;
  }
}
const indexedPaths = [...new Set(chunks.map((chunk) => chunk.path))];
const requiredFilesIncluded = exactFiles.filter((relative) => indexedPaths.includes(relative));
if (requiredFilesIncluded.length !== exactFiles.length) {
  const missing = exactFiles.filter((relative) => !requiredFilesIncluded.includes(relative));
  throw new Error(`support context is missing required files: ${missing.join(', ')}`);
}
const rootsIncluded = Object.fromEntries(roots.map((root) => [
  root,
  indexedPaths.filter((relative) => relative === root || relative.startsWith(`${root}/`)).length,
]));
for (const [root, count] of Object.entries(rootsIncluded)) {
  if (count === 0) throw new Error(`support context root is empty: ${root}`);
}

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const commit = git(['rev-parse', 'HEAD'], 'unknown');
const dirty = git(['status', '--porcelain', '--untracked-files=normal'], '') !== '';
const sourceFingerprint = crypto.createHash('sha256').update(JSON.stringify(chunks)).digest('hex');
const artifact = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  repository: 'badloar-star/phraseman',
  commit,
  dirty,
  appVersion: String(appJson.expo?.version || 'unknown'),
  appBuild: String(appJson.expo?.ios?.buildNumber || appJson.expo?.android?.versionCode || 'unknown'),
  sourceFingerprint,
  filesDiscovered: uniqueFiles.length,
  filesIndexed: indexedPaths.length,
  requiredFilesIncluded,
  rootsIncluded,
  chunks,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact));
console.log(`[support-context] ${artifact.chunks.length} chunks, ${artifact.filesIndexed} files, ${artifact.sourceFingerprint.slice(0, 12)}`);
