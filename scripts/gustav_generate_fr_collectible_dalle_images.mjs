import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  requireCodexOpenAiTtsOnly,
  requireOpenAiDevSpendGuard,
} from './openai-dev-guard.mjs';

const root = process.cwd();
const defaultQueuePath = path.join(
  root,
  'docs',
  'gustav',
  'generated',
  'fr',
  'collectibles',
  'fr_collectible_dalle_queue_v1.jsonl',
);
const defaultReportPath = path.join(
  root,
  '.codex-tmp',
  'collectibles-dalli',
  'reports',
  'fr_collectible_dalle_generation_report_v1.json',
);

function argValue(name, fallback = null) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

async function readDotEnv(file) {
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^['"]|['"]$/g, '');
  }
}

async function pathExists(file) {
  return fs.stat(file).then(() => true).catch(() => false);
}

async function readJsonl(file) {
  const text = await fs.readFile(file, 'utf8');
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`Invalid JSONL at ${file}:${index + 1}: ${String(err)}`);
      }
    });
}

function absoluteFromProject(relativeOrAbsolute) {
  if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
  return path.join(root, relativeOrAbsolute);
}

function ensureInsideAllowedOutput(file) {
  const resolved = path.resolve(file);
  const allowedRoots = [
    path.resolve(root, '.codex-tmp', 'collectibles-dalli'),
    path.resolve(root, 'assets', 'images', 'collectibles', 'dalli'),
  ];
  if (!allowedRoots.some((allowed) => resolved === allowed || resolved.startsWith(`${allowed}${path.sep}`))) {
    throw new Error(`Refusing to write outside collectible image outputs: ${resolved}`);
  }
}

async function generatePng(apiKey, item) {
  const body = {
    model: 'gpt-image-1',
    prompt: item.prompt,
    size: '1024x1024',
    quality: 'low',
    output_format: 'png',
  };
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`image_api_${response.status}:${item.cardId}:${text.slice(0, 700)}`);
  }
  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`image_api_no_b64:${item.cardId}`);
  return Buffer.from(b64, 'base64');
}

async function writeImageOutputs(item, rawPng) {
  const sourcePath = absoluteFromProject(item.sourcePath);
  const targetPath = absoluteFromProject(item.targetPath);
  ensureInsideAllowedOutput(sourcePath);
  ensureInsideAllowedOutput(targetPath);
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(sourcePath, rawPng);
  await fs.writeFile(`${sourcePath}.prompt.txt`, `${item.prompt}\n`);
  await sharp(rawPng)
    .resize(1024, 819, { fit: 'cover', position: 'center' })
    .webp({ quality: 82, effort: 5 })
    .toFile(targetPath);
}

function validateQueueItem(item, index) {
  const required = ['schemaVersion', 'cardId', 'setId', 'fr', 'prompt', 'sourcePath', 'targetPath'];
  for (const key of required) {
    if (!item[key]) throw new Error(`Queue item ${index + 1} is missing ${key}`);
  }
  if (!item.cardId.startsWith('fr_')) throw new Error(`Queue item ${index + 1} is not French: ${item.cardId}`);
  if (!item.prompt.includes('matching the approved PhraseMan Collectibles raster style guide')) {
    throw new Error(`Queue item ${item.cardId} is missing approved collectible raster style clause`);
  }
  if (/No text, no letters, no numbers/.test(item.prompt) === false) {
    throw new Error(`Queue item ${item.cardId} is missing no-text art safety clause`);
  }
  if (!item.prompt.includes('1024x819 landscape collectible art frame')) {
    throw new Error(`Queue item ${item.cardId} is missing 1024x819 collectible frame clause`);
  }
  if (/transparent background|Flat children-book vector-like/i.test(item.prompt)) {
    throw new Error(`Queue item ${item.cardId} still contains obsolete flat/transparent prompt language`);
  }
  ensureInsideAllowedOutput(absoluteFromProject(item.sourcePath));
  ensureInsideAllowedOutput(absoluteFromProject(item.targetPath));
}

async function main() {
  const queuePath = path.resolve(argValue('--queue', defaultQueuePath));
  const reportPath = path.resolve(argValue('--report', defaultReportPath));
  const limitRaw = argValue('--limit');
  const limit = limitRaw == null ? null : Number(limitRaw);
  const execute = hasArg('--execute');
  const dryRun = hasArg('--dry-run') || !execute;
  const resume = hasArg('--resume') || !hasArg('--force');
  const force = hasArg('--force');

  if (limit != null && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error(`--limit must be a positive integer, got ${limitRaw}`);
  }

  const queue = await readJsonl(queuePath);
  if (queue.length !== 330) {
    throw new Error(`Expected 330 French collectible DALL-E queue items, got ${queue.length}`);
  }
  queue.forEach(validateQueueItem);
  const selected = limit == null ? queue : queue.slice(0, limit);

  await fs.mkdir(path.dirname(reportPath), { recursive: true });

  const report = {
    schemaVersion: 'gustav-fr-collectible-dalle-generation-report-v1',
    generatedAt: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'execute',
    queuePath,
    totalQueueItems: queue.length,
    selectedItems: selected.length,
    model: 'gpt-image-1',
    imageRequest: {
      size: '1024x1024',
      quality: 'low',
      output_format: 'png',
      finalWebp: {
        width: 1024,
        height: 819,
        quality: 82,
        fit: 'cover',
      },
    },
    safety: {
      codexImageApiBlocked: Boolean(process.env.CODEX_THREAD_ID),
      requiresExecuteFlag: true,
      requiresOpenAiKey: true,
      requiresSpendGuard: true,
      writesOnlyCodexTmpAndCollectibleDalliAssets: true,
      englishCatalogModified: false,
      lessonFilesModified: false,
      activationApproved: false,
    },
    results: [],
  };

  if (dryRun) {
    for (const item of selected) {
      report.results.push({
        cardId: item.cardId,
        setId: item.setId,
        status: 'dry_run_ready',
        sourcePath: item.sourcePath,
        targetPath: item.targetPath,
        promptPreview: item.prompt.slice(0, 240),
      });
    }
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    process.stdout.write(`dry-run ready ${selected.length}/${queue.length} items -> ${reportPath}\n`);
    return;
  }

  await readDotEnv(path.join(root, '.env.local'));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing. Run --dry-run first or provide the key outside Codex.');
  requireOpenAiDevSpendGuard({
    action: 'French collectible DALL-E image generation',
    units: selected.length,
  });
  requireCodexOpenAiTtsOnly({
    action: 'French collectible DALL-E image generation',
    endpoint: 'images/generations',
  });

  let done = 0;
  for (const item of selected) {
    const targetPath = absoluteFromProject(item.targetPath);
    const alreadyDone = resume && !force && await pathExists(targetPath);
    if (alreadyDone) {
      report.results.push({
        cardId: item.cardId,
        setId: item.setId,
        status: 'kept_existing',
        targetPath: item.targetPath,
      });
      continue;
    }
    const rawPng = await generatePng(apiKey, item);
    await writeImageOutputs(item, rawPng);
    done += 1;
    report.results.push({
      cardId: item.cardId,
      setId: item.setId,
      status: 'generated',
      sourcePath: item.sourcePath,
      targetPath: item.targetPath,
    });
    if (done % 5 === 0 || done === selected.length) {
      process.stdout.write(`generated ${done}/${selected.length}\n`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    }
  }

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(`done ${report.results.length} records -> ${reportPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
