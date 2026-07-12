import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { requireCodexOpenAiTtsOnly, requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';

// Heisenberg translation factory.
//
// Reads translation_blocks/*.jsonl work batches produced by
// `npm run heisenberg -- --lang <locale>` and fills them with machine
// translations that pass a fail-closed verification chain:
//   1. translate (LLM, structured output);
//   2. independent back-translation (LLM, source text hidden);
//   3. three-lens judge (accuracy / naturalness / integrity, LLM);
//   4. deterministic local checks (mojibake, placeholders, protected English,
//      language signal) from scripts/lib/heisenberg_translate_core.cjs.
// A row becomes GO only when every layer agrees; anything else is HOLD with
// explicit reasons. The factory NEVER writes app source, never generates
// reviewer/locale/product approvals, and never marks anything import-ready:
// its output feeds the existing external review + gate flow.
//
// Default mode is a dry-run cost plan. Live spend requires --execute plus
// PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 (see scripts/openai-dev-guard.mjs).

const require = createRequire(import.meta.url);
const translateCore = require('./lib/heisenberg_translate_core.cjs');
const heisenbergLocales = require('./lib/heisenberg_locales.cjs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const DEFAULT_MODEL = 'gpt-5-mini';
const CALLS_PER_ROW = 3;
const ESTIMATED_COST_PER_CALL_USD = 0.0025;
const MAX_ROWS_PER_LIVE_LAUNCH = 100;
const OPENAI_MAX_ATTEMPTS = 3;
const OPENAI_RETRY_BASE_DELAY_MS = 1500;

function parseArgs(argv) {
  const args = {
    blocks: '',
    locale: '',
    execute: false,
    limit: 0,
    startIndex: 1,
    model: process.env.HEISENBERG_TRANSLATE_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    outDir: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--blocks') args.blocks = argv[++i] || '';
    else if (arg === '--locale') args.locale = argv[++i] || '';
    else if (arg === '--execute') args.execute = true;
    else if (arg === '--limit') args.limit = Number(argv[++i] || 0);
    else if (arg === '--start-index') args.startIndex = Number(argv[++i] || 1);
    else if (arg === '--model') args.model = argv[++i] || args.model;
    else if (arg === '--out-dir') args.outDir = argv[++i] || '';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.blocks) throw new Error('--blocks <translation_blocks dir or .jsonl file> is required');
  if (!args.locale) throw new Error('--locale <target locale> is required');
  if (!Number.isInteger(args.limit) || args.limit < 0) throw new Error('--limit must be a non-negative integer');
  if (!Number.isInteger(args.startIndex) || args.startIndex < 1) throw new Error('--start-index must be a positive integer');
  return args;
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readEnvValue(name) {
  const direct = String(process.env[name] || '').trim();
  if (direct) return direct;
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, envFile);
    if (!fs.existsSync(envPath)) continue;
    const line = fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((candidate) => candidate.trim().startsWith(`${name}=`));
    if (!line) continue;
    return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function listBlockFiles(blocksPath) {
  const abs = path.isAbsolute(blocksPath) ? blocksPath : path.join(ROOT, blocksPath);
  if (!fs.existsSync(abs)) throw new Error(`Blocks path does not exist: ${blocksPath}`);
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];
  return fs.readdirSync(abs)
    .filter((name) => name.endsWith('.jsonl'))
    .sort()
    .map((name) => path.join(abs, name));
}

function parseJsonl(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadBlockRows(args) {
  const files = listBlockFiles(args.blocks);
  const rows = [];
  const invalid = [];
  for (const file of files) {
    for (const row of parseJsonl(file)) {
      const errors = translateCore.validateBlockRow(row);
      if (errors.length > 0) {
        invalid.push({ file: rel(file), id: row?.id ?? null, errors });
        continue;
      }
      if (row.targetLocale !== args.locale) continue;
      rows.push({ ...row, blockFile: rel(file) });
    }
  }
  return { rows, invalid, files: files.map(rel) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const text = data.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text || '')
    ?.join('\n')
    ?.trim();
  if (text) return text;
  throw new Error('OpenAI response did not include output text');
}

function parseModelJson(text) {
  const normalized = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(normalized);
}

function isRetryableOpenAiError(error) {
  const message = String(error?.message || '');
  return (
    message.includes('OpenAI responses API returned 408') ||
    message.includes('OpenAI responses API returned 409') ||
    message.includes('OpenAI responses API returned 429') ||
    /^OpenAI responses API returned 5\d\d/.test(message)
  );
}

async function callOpenAiOnce({ apiKey, model, instructions, input, schemaName, schema }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI responses API returned ${response.status}: ${body}`);
  }
  const data = await response.json();
  return parseModelJson(extractOutputText(data));
}

async function callOpenAi(request) {
  let lastError;
  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await callOpenAiOnce(request);
    } catch (error) {
      lastError = error;
      if (!isRetryableOpenAiError(error) || attempt === OPENAI_MAX_ATTEMPTS) break;
      await sleep(OPENAI_RETRY_BASE_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

const STRING_FIELD = { type: 'string' };
const TRANSLATE_SCHEMA = {
  type: 'object',
  properties: { translation: STRING_FIELD, translatorNotes: STRING_FIELD },
  required: ['translation', 'translatorNotes'],
  additionalProperties: false,
};
const BACK_TRANSLATE_SCHEMA = {
  type: 'object',
  properties: { backTranslation: STRING_FIELD },
  required: ['backTranslation'],
  additionalProperties: false,
};
const JUDGE_LENS_SCHEMA = {
  type: 'object',
  properties: { verdict: { type: 'string', enum: ['GO', 'HOLD'] }, note: STRING_FIELD },
  required: ['verdict', 'note'],
  additionalProperties: false,
};
const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    accuracy: JUDGE_LENS_SCHEMA,
    naturalness: JUDGE_LENS_SCHEMA,
    integrity: JUDGE_LENS_SCHEMA,
  },
  required: ['accuracy', 'naturalness', 'integrity'],
  additionalProperties: false,
};

function localeEnglishName(locale) {
  const entry = heisenbergLocales.getLocaleEntry(locale);
  if (!entry) throw new Error(`Locale ${locale} is not in the Heisenberg locale registry.`);
  return entry.englishName;
}

function translateInstructions(row) {
  const targetName = localeEnglishName(row.targetLocale);
  return [
    `You are a senior localization specialist for Phraseman, a mobile app that teaches ENGLISH to speakers of ${targetName}.`,
    `Translate the given source copy (language code: ${row.sourceLocale}) into natural ${targetName} for that learner.`,
    'Hard rules:',
    '- Rewrite pedagogically for the learner; do not translate word-for-word when it reads unnaturally.',
    '- NEVER invent, add, or drop facts, examples, or claims. The meaning must match the source exactly.',
    '- Preserve verbatim: English words/phrases in quotes (they are study material), placeholders like {name} or ${x} or %s, IDs, URLs, and the product name Phraseman.',
    '- English answer choices and English example sentences must stay in English.',
    `- Use the grammar terminology conventions natural for ${targetName} school teaching.`,
    '- If the source is a short UI label, keep the translation short enough for a mobile button.',
    'Return only JSON with fields translation and translatorNotes (one sentence on choices made).',
  ].join('\n');
}

function backTranslateInstructions(row) {
  const targetName = localeEnglishName(row.targetLocale);
  return [
    `You are a literal translator. Translate the given ${targetName} text into English as faithfully and literally as possible.`,
    'Do not improve, summarize, or explain. Preserve placeholders and quoted fragments verbatim.',
    'Return only JSON with field backTranslation.',
  ].join('\n');
}

function judgeInstructions(row) {
  const targetName = localeEnglishName(row.targetLocale);
  return [
    `You are an independent, strict reviewer for Phraseman localization into ${targetName}.`,
    'You receive: the source copy, a candidate translation, and an independent literal back-translation of that candidate.',
    'Evaluate three lenses and return GO or HOLD for each, with a concrete note when HOLD:',
    '- accuracy: the candidate adds nothing, drops nothing, and invents nothing relative to the source (use the back-translation as evidence).',
    `- naturalness: the candidate is grammatical, natural ${targetName} with correct plural forms, cases, and register for an educational app.`,
    '- integrity: quoted English study material, placeholders, IDs, URLs, and the product name survive verbatim; explanation still teaches the same English point.',
    'Be strict: when uncertain, return HOLD. Never return GO out of politeness.',
    'Return only JSON matching the schema.',
  ].join('\n');
}

async function processRow({ apiKey, model, row, generatedAt }) {
  const translated = await callOpenAi({
    apiKey,
    model,
    instructions: translateInstructions(row),
    input: JSON.stringify({ sourceLocale: row.sourceLocale, keyPath: row.keyPath, notes: row.notes ?? [], sourceText: row.sourceText }),
    schemaName: 'heisenberg_translation',
    schema: TRANSLATE_SCHEMA,
  });
  const backTranslated = await callOpenAi({
    apiKey,
    model,
    instructions: backTranslateInstructions(row),
    input: JSON.stringify({ text: translated.translation }),
    schemaName: 'heisenberg_back_translation',
    schema: BACK_TRANSLATE_SCHEMA,
  });
  const judge = await callOpenAi({
    apiKey,
    model,
    instructions: judgeInstructions(row),
    input: JSON.stringify({
      sourceLocale: row.sourceLocale,
      targetLocale: row.targetLocale,
      sourceText: row.sourceText,
      candidateTranslation: translated.translation,
      independentBackTranslation: backTranslated.backTranslation,
    }),
    schemaName: 'heisenberg_translation_judge',
    schema: JUDGE_SCHEMA,
  });
  return translateCore.buildFilledRow({
    blockRow: row,
    translation: translated.translation,
    translatorNotes: translated.translatorNotes,
    backTranslation: backTranslated.backTranslation,
    judge,
    model,
    generatedAt,
  });
}

function renderMarkdown(report) {
  const lines = [
    '# Heisenberg Translation Factory Run',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Mode: ${report.summary.mode}`,
    `- Locale: ${report.summary.locale}`,
    `- Model: ${report.summary.model}`,
    `- Block files: ${report.summary.blockFiles}`,
    `- Rows in scope: ${report.summary.rowsInScope}`,
    `- Rows processed: ${report.summary.rowsProcessed}`,
    `- GO: ${report.summary.go}`,
    `- HOLD: ${report.summary.hold}`,
    `- Errors: ${report.summary.errors}`,
    `- Estimated cost (USD): ${report.summary.estimatedCostUsd}`,
    '',
    '## Guarantees',
    '',
    '- machineGenerated=true on every filled row; this run is a content candidate, not a review.',
    '- reviewerImportAllowed / productionApplyAllowed / activationApproved stay false.',
    '- No app source file was modified.',
    '',
  ];
  if (Object.keys(report.holdReasonCounts || {}).length > 0) {
    lines.push('## HOLD reasons', '');
    for (const [code, count] of Object.entries(report.holdReasonCounts)) {
      lines.push(`- ${code}: ${count}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { rows, invalid, files } = loadBlockRows(args);
  const runId = timestampSlug();
  const outDir = args.outDir
    ? (path.isAbsolute(args.outDir) ? args.outDir : path.join(ROOT, args.outDir))
    : path.join(ROOT, 'docs', 'heisenberg', 'translations', runId);
  const filledPath = path.join(outDir, `filled_blocks_${heisenbergLocales.getLocaleEntry(args.locale) ? args.locale : 'unknown'}.jsonl`);
  const auditJsonPath = path.join(outDir, 'translation_run_audit.json');
  const auditMdPath = path.join(outDir, 'translation_run_audit.md');

  localeEnglishName(args.locale); // throws for unregistered locales

  const selected = rows.slice(args.startIndex - 1, args.limit > 0 ? args.startIndex - 1 + args.limit : undefined);
  const estimatedCostUsd = Number((selected.length * CALLS_PER_ROW * ESTIMATED_COST_PER_CALL_USD).toFixed(4));

  if (!args.execute) {
    const plan = {
      schema: 'heisenberg-translation-run-plan-v1',
      generatedAt: new Date().toISOString(),
      status: 'DRY_RUN',
      summary: {
        mode: 'dry-run',
        locale: args.locale,
        model: args.model,
        blockFiles: files.length,
        rowsInScope: rows.length,
        rowsSelected: selected.length,
        invalidRows: invalid.length,
        callsPlanned: 0,
        estimatedCostUsd: 0,
        apiKeyPresent: false,
        executionAvailable: false,
        executionBlockedBy: 'Phraseman Codex OpenAI API firewall: non-TTS API use is forbidden',
        maxRowsPerLiveLaunch: MAX_ROWS_PER_LIVE_LAUNCH,
      },
      invalid,
      nextStep: 'Use heisenberg_claude_translation_packets.mjs --emit, fill packet files with local agents, then --ingest and run heisenberg:review.',
    };
    writeJson(path.join(outDir, 'translation_run_plan.json'), plan);
    console.log(`[heisenberg-translate] DRY_RUN: ${selected.length} rows selected of ${rows.length} in scope; live API execution is blocked by the project firewall.`);
    console.log(`[heisenberg-translate] Plan: ${rel(path.join(outDir, 'translation_run_plan.json'))}`);
    return;
  }

  requireCodexOpenAiTtsOnly({ action: 'heisenberg translation factory', endpoint: 'responses' });
  const apiKey = readEnvValue('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for --execute (env or .env.local).');
  if (selected.length === 0) throw new Error('No rows selected. Check --blocks path, --locale, --start-index and --limit.');
  if (selected.length > MAX_ROWS_PER_LIVE_LAUNCH) {
    throw new Error(`Refusing to process ${selected.length} rows in one launch. Use --limit <= ${MAX_ROWS_PER_LIVE_LAUNCH} and repeat launches.`);
  }
  requireOpenAiDevSpendGuard({
    action: 'heisenberg translation factory live run',
    estimatedCostUsd,
    units: selected.length,
  });

  const existingIds = new Set(
    fs.existsSync(filledPath) ? parseJsonl(filledPath).map((row) => row.id) : [],
  );
  const generatedAt = new Date().toISOString();
  const filledRows = [];
  const errors = [];
  let skipped = 0;
  for (const row of selected) {
    if (existingIds.has(row.id)) {
      skipped += 1;
      continue;
    }
    try {
      const filled = await processRow({ apiKey, model: args.model, row, generatedAt });
      appendJsonl(filledPath, filled);
      filledRows.push(filled);
      console.log(`[heisenberg-translate] ${filled.status} ${row.id} (${row.keyPath})`);
    } catch (error) {
      errors.push({ id: row.id, keyPath: row.keyPath, message: String(error?.message || error) });
      console.error(`[heisenberg-translate] ERROR ${row.id}: ${String(error?.message || error)}`);
    }
  }

  const summaryStats = translateCore.summarizeFilledRows(filledRows);
  const report = {
    schema: 'heisenberg-translation-run-audit-v1',
    generatedAt,
    status: errors.length > 0 ? 'HOLD' : 'DONE',
    summary: {
      mode: 'execute',
      locale: args.locale,
      model: args.model,
      blockFiles: files.length,
      rowsInScope: rows.length,
      rowsProcessed: filledRows.length,
      rowsSkippedExisting: skipped,
      go: summaryStats.byStatus.GO || 0,
      hold: summaryStats.byStatus.HOLD || 0,
      errors: errors.length,
      estimatedCostUsd,
      filledPath: rel(filledPath),
      filledSha256: fs.existsSync(filledPath)
        ? crypto.createHash('sha256').update(fs.readFileSync(filledPath)).digest('hex')
        : '',
    },
    holdReasonCounts: summaryStats.holdReasonCounts,
    invalid,
    errors,
  };
  writeJson(auditJsonPath, report);
  fs.writeFileSync(auditMdPath, renderMarkdown(report), 'utf8');
  console.log(`[heisenberg-translate] ${report.status}: GO ${report.summary.go}, HOLD ${report.summary.hold}, errors ${errors.length}.`);
  console.log(`[heisenberg-translate] Audit: ${rel(auditJsonPath)}`);
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[heisenberg-translate] ${String(error?.message || error)}`);
  process.exitCode = 1;
});
