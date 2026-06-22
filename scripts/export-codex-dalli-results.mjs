import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import sharp from 'sharp';

const ROOT = process.cwd();
const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

const args = parseArgs(process.argv.slice(2));

if (!args.rollout) {
  args.rollout = findLatestRollout();
}

if (!args.rollout) {
  console.error('Usage: node scripts/export-codex-dalli-results.mjs --rollout <rollout.jsonl> [--queue <queue.jsonl>] [--source-root <dir>] [--only-set <setId>] [--webp] [--width 1024] [--height 819] [--report <path>] [--stdout-records]');
  process.exit(1);
}

const rolloutPath = path.resolve(ROOT, args.rollout);
const queuePath = args.queue ? path.resolve(ROOT, args.queue) : null;
const sourceRoot = path.resolve(ROOT, args.sourceRoot || '.codex-tmp/collectibles-dalli/sources');
const webpRoot = path.resolve(ROOT, args.webpRoot || 'assets/images/collectibles/dalli');
const shouldWriteWebp = Boolean(args.webp);
const width = Number(args.width || 1024);
const height = Number(args.height || 819);
const queueById = queuePath ? loadQueue(queuePath) : new Map();
const reportPath = path.resolve(
  ROOT,
  args.report || path.join(
    '.codex-tmp',
    'collectibles-dalli',
    'reports',
    `${timestamp()}_${path.basename(rolloutPath).replace(/\.jsonl$/i, '')}.export.json`,
  ),
);

if (!fs.existsSync(rolloutPath)) {
  console.error(`rollout not found: ${rolloutPath}`);
  process.exit(1);
}

if (shouldWriteWebp && (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0)) {
  console.error('width and height must be positive integers');
  process.exit(1);
}

const seenCalls = new Set();
const latestById = new Map();
let fallbackImageIndex = 0;

const lines = readline.createInterface({
  input: fs.createReadStream(rolloutPath, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const line of lines) {
  if (!line.trim()) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  const payload = event.payload || {};
  if (payload.type !== 'image_generation_end' || !payload.result) continue;
  if (payload.call_id && seenCalls.has(payload.call_id)) continue;
  if (payload.call_id) seenCalls.add(payload.call_id);

  const prompt = payload.revised_prompt || '';
  const cardId = matchFirst(prompt, /Card id:\s*([^\n]+)/i);
  const id = cardId || payload.call_id || `image_${String(++fallbackImageIndex).padStart(4, '0')}`;

  const queueItem = queueById.get(id);
  const setId = queueItem?.setId || matchFirst(prompt, /Set:\s*[^\n(]*\(([^)\n]+)\)/i) || (cardId ? inferSetId(id) : 'uncategorized');
  if (args.onlySet && setId !== args.onlySet) continue;

  latestById.set(id, { id, cardId, payload, prompt });
}

const records = [];

for (const { id, cardId, payload, prompt } of latestById.values()) {
  const queueItem = queueById.get(id);
  const setId = queueItem?.setId || matchFirst(prompt, /Set:\s*[^\n(]*\(([^)\n]+)\)/i) || (cardId ? inferSetId(id) : 'uncategorized');
  if (args.onlySet && setId !== args.onlySet) continue;

  const sourcePath = queueItem?.sourcePath
    ? path.resolve(ROOT, queueItem.sourcePath)
    : path.join(sourceRoot, setId, `${safeFileName(id)}.png`);

  const png = Buffer.from(payload.result, 'base64');
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    records.push({ id, status: 'skipped', reason: 'result is not a PNG' });
    continue;
  }

  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, png);
  const promptPath = prompt
    ? sourcePath.replace(/\.png$/i, '.prompt.txt')
    : null;
  if (promptPath) {
    fs.writeFileSync(promptPath, `${prompt}\n`, 'utf8');
  }

  const record = {
    id,
    cardId: cardId || null,
    setId,
    sourcePath: path.relative(ROOT, sourcePath).replaceAll('\\', '/'),
    promptPath: promptPath ? path.relative(ROOT, promptPath).replaceAll('\\', '/') : null,
    promptPreview: prompt ? compact(prompt).slice(0, 220) : '',
    sourceBytes: png.length,
    sourceWidth: png.readUInt32BE(16),
    sourceHeight: png.readUInt32BE(20),
  };

  if (shouldWriteWebp) {
    const targetPath = queueItem?.targetPath
      ? path.resolve(ROOT, queueItem.targetPath)
      : path.join(webpRoot, setId, `${id}.webp`);

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    await sharp(sourcePath)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .webp({ quality: 92, effort: 5 })
      .toFile(targetPath);

    const metadata = await sharp(targetPath).metadata();
    record.targetPath = path.relative(ROOT, targetPath).replaceAll('\\', '/');
    record.targetBytes = fs.statSync(targetPath).size;
    record.targetWidth = metadata.width;
    record.targetHeight = metadata.height;
  }

  records.push(record);
}

const successfulRecords = records.filter((record) => record.status !== 'skipped');
const summary = {
  rollout: rolloutPath,
  queue: queuePath,
  sourceRoot,
  wroteWebp: shouldWriteWebp,
  count: successfulRecords.length,
  bySet: countBy(successfulRecords, 'setId'),
};

const report = { ...summary, records };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const stdoutSummary = {
  ...summary,
  reportPath: path.relative(ROOT, reportPath).replaceAll('\\', '/'),
  records: records.length,
  skipped: records.length - successfulRecords.length,
};

console.log(JSON.stringify(args.stdoutRecords ? report : stdoutSummary, null, 2));

function parseArgs(rawArgs) {
  const parsed = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === '--webp') {
      parsed.webp = true;
      continue;
    }
    if (arg === '--summary') {
      parsed.summary = true;
      continue;
    }
    if (arg === '--stdout-records') {
      parsed.stdoutRecords = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    parsed[key] = rawArgs[i + 1];
    i += 1;
  }
  return parsed;
}

function findLatestRollout() {
  const sessionsRoot = path.join(os.homedir(), '.codex', 'sessions');
  const files = [];
  walk(sessionsRoot, (file) => {
    if (/rollout-.*\.jsonl$/i.test(path.basename(file))) {
      files.push(file);
    }
  });

  return files
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file || null;
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, onFile);
    } else if (entry.isFile()) {
      onFile(full);
    }
  }
}

function loadQueue(file) {
  const map = new Map();
  if (!fs.existsSync(file)) {
    console.error(`queue not found: ${file}`);
    process.exit(1);
  }

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = JSON.parse(line);
    if (item.id) map.set(item.id, item);
  }

  return map;
}

function matchFirst(text, regex) {
  return text.match(regex)?.[1]?.trim() || '';
}

function inferSetId(id) {
  const prefix = id.split('_')[0] || 'unknown';
  return `unknown_${prefix}`;
}

function safeFileName(value) {
  return String(value)
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'image';
}

function compact(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    counts[item[key]] = (counts[item[key]] || 0) + 1;
    return counts;
  }, {});
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
}
