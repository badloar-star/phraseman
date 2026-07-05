import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Claude-translator packet harness for the Heisenberg translation factory.
//
// The OpenAI-based factory (heisenberg_translate_blocks.mjs) needs an API key
// and paid calls. This harness runs the same fail-closed verification chain,
// but the translation itself is produced by Claude agents working on packet
// files, so no external API spend is involved:
//   --emit   slice translation_blocks rows into packet_NNNN.jsonl work files
//            (product surfaces only; admin/QA/dead files are excluded);
//   --ingest validate filled packets row-by-row with the same deterministic
//            checks as the factory (mojibake, placeholders, protected quoted
//            English, language signal, Cyrillic leakage) and merge accepted
//            rows into a resumable ledger.
// Filled rows stay machine-generated candidates: approvals remain false and
// nothing is written into app source by this harness.

const require = createRequire(import.meta.url);
const translateCore = require('./lib/heisenberg_translate_core.cjs');
const heisenbergLocales = require('./lib/heisenberg_locales.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_PACKET_SIZE = 150;
// Operator/QA/dead surfaces that must not burn translation effort.
const EXCLUDED_FILE_PATTERNS = [
  /^admin\//,
  /^qa-artifacts\//,
  /__cp_preview/,
  /^docs\//,
  /^scripts\//,
  /^tests\//,
  /^\.superpowers\//,
  // In-app operator/dev screens (testers admin, dev marketplaces) stay Russian.
  /^app\/_admin/,
  /_dev\.(ts|tsx)$/,
];

function parseArgs(argv) {
  const args = {
    mode: '',
    blocks: '',
    locale: '',
    outDir: '',
    packetSize: DEFAULT_PACKET_SIZE,
    limit: 0,
    sample: 0,
    filledDir: '',
    excludeDone: [],
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--emit') args.mode = 'emit';
    else if (arg === '--ingest') args.mode = 'ingest';
    else if (arg === '--blocks') args.blocks = argv[++i] || '';
    else if (arg === '--locale') args.locale = argv[++i] || '';
    else if (arg === '--out-dir') args.outDir = argv[++i] || '';
    else if (arg === '--packet-size') args.packetSize = Number(argv[++i] || DEFAULT_PACKET_SIZE);
    else if (arg === '--limit') args.limit = Number(argv[++i] || 0);
    else if (arg === '--sample') args.sample = Number(argv[++i] || 0);
    else if (arg === '--filled-dir') args.filledDir = argv[++i] || '';
    else if (arg === '--exclude-done') args.excludeDone.push(argv[++i] || '');
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.mode) throw new Error('Pass --emit or --ingest');
  if (!args.locale) throw new Error('--locale <target locale> is required');
  if (!heisenbergLocales.getLocaleEntry(args.locale)) {
    throw new Error(`Locale ${args.locale} is not in the Heisenberg locale registry.`);
  }
  if (args.mode === 'emit' && !args.blocks) throw new Error('--blocks <dir or .jsonl> is required for --emit');
  if (!args.outDir) throw new Error('--out-dir is required');
  if (!Number.isInteger(args.packetSize) || args.packetSize < 1) throw new Error('--packet-size must be a positive integer');
  return args;
}

function absFromRoot(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function parseJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function isExcludedFile(file) {
  return EXCLUDED_FILE_PATTERNS.some((re) => re.test(file));
}

function listBlockFiles(blocksPath) {
  const abs = absFromRoot(blocksPath);
  if (!fs.existsSync(abs)) throw new Error(`Blocks path does not exist: ${blocksPath}`);
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  return fs.readdirSync(abs)
    .filter((name) => name.endsWith('.jsonl'))
    .sort()
    .map((name) => path.join(abs, name));
}

// Extraction noise: source rows that are actually code expressions, not copy.
const CODE_NOISE_RE = /typeof\s|===|!==|\?\.|\bundefined\b/;

function loadRows(args) {
  const rows = [];
  let excluded = 0;
  let codeNoise = 0;
  for (const file of listBlockFiles(args.blocks)) {
    for (const row of parseJsonl(file)) {
      if (translateCore.validateBlockRow(row).length > 0) continue;
      if (row.targetLocale !== args.locale) continue;
      if (isExcludedFile(row.file)) {
        excluded += 1;
        continue;
      }
      if (CODE_NOISE_RE.test(String(row.sourceText))) {
        codeNoise += 1;
        continue;
      }
      rows.push(row);
    }
  }
  return { rows, excluded, codeNoise };
}

function strideSample(rows, sample) {
  if (!sample || sample >= rows.length) return rows;
  const step = rows.length / sample;
  const out = [];
  for (let i = 0; i < sample; i += 1) out.push(rows[Math.floor(i * step)]);
  return out;
}

function emit(args) {
  const { rows: loadedRows, excluded, codeNoise } = loadRows(args);
  // Resume support: skip rows already accepted in earlier runs (ledgers of
  // GO/PENDING rows passed via --exclude-done, repeatable).
  const doneIds = new Set();
  for (const ledger of args.excludeDone) {
    const abs = absFromRoot(ledger);
    if (!fs.existsSync(abs)) throw new Error(`--exclude-done ledger not found: ${ledger}`);
    for (const row of parseJsonl(abs)) if (row?.id) doneIds.add(row.id);
  }
  const allRows = doneIds.size > 0 ? loadedRows.filter((row) => !doneIds.has(row.id)) : loadedRows;
  let rows = strideSample(allRows, args.sample);
  if (args.limit > 0) rows = rows.slice(0, args.limit);
  const outDir = absFromRoot(args.outDir);
  const packetsDir = path.join(outDir, 'packets');
  fs.mkdirSync(packetsDir, { recursive: true });
  const packets = [];
  for (let i = 0; i < rows.length; i += args.packetSize) {
    const packetRows = rows.slice(i, i + args.packetSize);
    const name = `packet_${String(packets.length + 1).padStart(4, '0')}.jsonl`;
    writeJsonl(path.join(packetsDir, name), packetRows);
    packets.push({ name, rows: packetRows.length, ids: packetRows.map((row) => row.id) });
  }
  const manifest = {
    schema: 'heisenberg-claude-translation-packets-v1',
    generatedAt: new Date().toISOString(),
    locale: args.locale,
    blocks: args.blocks,
    rowsTotalInScope: allRows.length,
    rowsExcludedOperatorSurfaces: excluded,
    rowsExcludedCodeNoise: codeNoise,
    rowsExcludedAlreadyDone: doneIds.size,
    rowsEmitted: rows.length,
    packetSize: args.packetSize,
    sample: args.sample || null,
    packets,
  };
  writeJson(path.join(outDir, 'packets_manifest.json'), manifest);
  console.log(`[claude-packets] emitted ${rows.length} rows into ${packets.length} packets (${excluded} operator-surface rows excluded).`);
  console.log(`[claude-packets] manifest: ${rel(path.join(outDir, 'packets_manifest.json'))}`);
}

function ingest(args) {
  const outDir = absFromRoot(args.outDir);
  const manifestPath = path.join(outDir, 'packets_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`No packets manifest at ${rel(manifestPath)}; run --emit first.`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const filledDir = absFromRoot(args.filledDir || path.join(outDir, 'filled'));
  if (!fs.existsSync(filledDir)) throw new Error(`Filled dir does not exist: ${rel(filledDir)}`);

  const sourceById = new Map();
  for (const packet of manifest.packets) {
    for (const row of parseJsonl(path.join(outDir, 'packets', packet.name))) {
      sourceById.set(row.id, row);
    }
  }

  // Judge verdicts arrive as separate files (judged/*.jsonl) written by
  // independent reviewer agents; join them to filled rows by id.
  const judgedById = new Map();
  const judgedDir = path.join(outDir, 'judged');
  if (fs.existsSync(judgedDir)) {
    for (const name of fs.readdirSync(judgedDir).filter((n) => n.endsWith('.jsonl')).sort()) {
      for (const verdict of parseJsonl(path.join(judgedDir, name))) {
        if (verdict && verdict.id && verdict.judge) judgedById.set(verdict.id, verdict.judge);
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const accepted = [];
  const held = [];
  const problems = [];
  const seenIds = new Set();
  for (const name of fs.readdirSync(filledDir).filter((n) => n.endsWith('.jsonl')).sort()) {
    for (const filled of parseJsonl(path.join(filledDir, name))) {
      const source = sourceById.get(filled.id);
      if (!source) {
        problems.push({ packetFile: name, id: filled.id ?? null, code: 'unknown-id' });
        continue;
      }
      if (seenIds.has(filled.id)) {
        problems.push({ packetFile: name, id: filled.id, code: 'duplicate-id' });
        continue;
      }
      seenIds.add(filled.id);
      const row = translateCore.buildFilledRow({
        blockRow: source,
        translation: String(filled.targetText || ''),
        translatorNotes: filled.translatorNotes ?? null,
        backTranslation: filled.backTranslation ?? null,
        judge: filled.judge ?? judgedById.get(filled.id) ?? null,
        model: filled.model || 'claude-agent',
        generatedAt,
      });
      (row.status === 'HOLD' ? held : accepted).push(row);
    }
  }

  const missingIds = [...sourceById.keys()].filter((id) => !seenIds.has(id));
  const summary = translateCore.summarizeFilledRows([...accepted, ...held]);
  const report = {
    schema: 'heisenberg-claude-translation-ingest-v1',
    generatedAt,
    locale: args.locale,
    rowsExpected: sourceById.size,
    rowsReceived: seenIds.size,
    rowsMissing: missingIds.length,
    accepted: accepted.length,
    byStatus: accepted.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {}),
    held: held.length,
    holdReasonCounts: summary.holdReasonCounts,
    problems,
    missingIdsSample: missingIds.slice(0, 20),
  };
  writeJsonl(path.join(outDir, 'accepted_rows.jsonl'), accepted);
  writeJsonl(path.join(outDir, 'held_rows.jsonl'), held);
  writeJson(path.join(outDir, 'ingest_report.json'), report);
  console.log(`[claude-packets] ingest: expected ${report.rowsExpected}, received ${report.rowsReceived}, accepted ${report.accepted} (${JSON.stringify(report.byStatus)}), held ${report.held}, missing ${report.rowsMissing}.`);
  console.log(`[claude-packets] report: ${rel(path.join(outDir, 'ingest_report.json'))}`);
  if (held.length > 0 || missingIds.length > 0 || problems.length > 0) process.exitCode = 1;
}

const args = parseArgs(process.argv.slice(2));
if (args.mode === 'emit') emit(args);
else ingest(args);
