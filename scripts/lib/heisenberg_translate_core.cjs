'use strict';

// Pure, deterministic helpers for the Heisenberg translation factory
// (scripts/heisenberg_translate_blocks.mjs). Everything here runs without
// network access so tests can lock the fail-closed behavior.

const semanticCore = require('./heisenberg_semantic_core.cjs');
const heisenbergLocales = require('./heisenberg_locales.cjs');

const FILLED_ROW_SCHEMA_VERSION = 'heisenberg-translated-block-row-v1';
const PLACEHOLDER_RE = /\{[^{}\s]{1,60}\}|\$\{[^{}]{1,60}\}|%[sd]/g;
// English snippets the source text protects with quotes: answer choices,
// study-target words, idiom anchors. They must survive translation verbatim.
const QUOTED_SNIPPET_RE = /["'«»“”‘’]([A-Za-z][A-Za-z0-9'’\- ]{1,60}?)["'«»“”‘’]/g;
const MIN_SIGNAL_TEXT_LENGTH = 40;

function extractPlaceholders(text) {
  const found = String(text || '').match(PLACEHOLDER_RE) || [];
  return [...new Set(found)].sort();
}

function quotedEnglishSnippets(text) {
  const out = new Set();
  const raw = String(text || '');
  let match;
  QUOTED_SNIPPET_RE.lastIndex = 0;
  while ((match = QUOTED_SNIPPET_RE.exec(raw)) !== null) {
    const snippet = match[1].trim();
    if (!snippet) continue;
    // Only protect snippets that look like English (ASCII letters, real word).
    if (!/^[A-Za-z][A-Za-z0-9'’\- ]*$/.test(snippet)) continue;
    if (!/[a-z]/.test(snippet)) continue;
    out.add(snippet);
  }
  return [...out].sort();
}

// Deterministic quality gates for one translated row.
//
// severity 'hard' = unquestionable defect, blocks the row on its own.
// severity 'soft' = heuristic suspicion the LLM judge must resolve — needed
// because es→pt-BR cognates are legitimately identical, quoted source-language
// words look like "protected English", and the stop-word language signal
// under-fires on ordinary UI sentences.
function runDeterministicChecks({ sourceText, targetLocale, translation }) {
  const reasons = [];
  const text = String(translation || '').trim();
  const source = String(sourceText || '').trim();

  if (!text) {
    reasons.push({ code: 'empty-translation', severity: 'hard', message: 'Translation is empty.' });
    return { ok: false, reasons };
  }
  if (semanticCore.hasMojibake(text)) {
    reasons.push({ code: 'mojibake', severity: 'hard', message: 'Translation contains broken encoding.' });
  }
  if (text === source) {
    reasons.push({
      code: 'identical-to-source',
      severity: 'soft',
      message: 'Translation is identical to the source text (may be a cognate or an untranslated copy).',
    });
  }

  const sourcePlaceholders = extractPlaceholders(source);
  const targetPlaceholders = extractPlaceholders(text);
  if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
    reasons.push({
      code: 'placeholder-mismatch',
      severity: 'hard',
      message: `Placeholders differ: source ${JSON.stringify(sourcePlaceholders)} vs translation ${JSON.stringify(targetPlaceholders)}.`,
    });
  }

  for (const snippet of quotedEnglishSnippets(source)) {
    if (!semanticCore.containsTerm(text, snippet)) {
      reasons.push({
        code: 'protected-english-missing',
        severity: 'soft',
        message: `Quoted ASCII snippet "${snippet}" is missing from the translation (verify it was not English study material).`,
      });
    }
  }

  const entry = heisenbergLocales.getLocaleEntry(targetLocale);
  if (entry && entry.languageSignal && text.length >= MIN_SIGNAL_TEXT_LENGTH) {
    const signal = semanticCore.localeLanguageSignal(targetLocale, text);
    if (signal && signal.ok === false) {
      reasons.push({
        code: 'weak-language-signal',
        severity: 'soft',
        message: `Text does not look like ${targetLocale} (no diacritics/stop-word evidence).`,
      });
    }
  }
  if ((targetLocale === 'ru' || targetLocale === 'uk') === false && semanticCore.hasCyrillic(text)) {
    // Cyrillic inside a non-Cyrillic target locale means source-language leakage,
    // unless the source itself intentionally quotes Cyrillic.
    if (!semanticCore.hasCyrillic(source)) {
      reasons.push({ code: 'unexpected-cyrillic', severity: 'hard', message: 'Translation leaked Cyrillic text.' });
    }
  }

  const hardReasons = reasons.filter((reason) => reason.severity === 'hard');
  return { ok: hardReasons.length === 0, reasons, hardReasons };
}

const JUDGE_LENSES = ['accuracy', 'naturalness', 'integrity'];
const JUDGE_VERDICTS = new Set(['GO', 'HOLD']);

// Validate the structured judge answer; malformed output = HOLD, never GO.
function validateJudgeResult(judge) {
  const errors = [];
  if (!judge || typeof judge !== 'object' || Array.isArray(judge)) {
    return { ok: false, errors: ['judge-result-not-object'] };
  }
  for (const lens of JUDGE_LENSES) {
    const item = judge[lens];
    if (!item || typeof item !== 'object' || !JUDGE_VERDICTS.has(item.verdict)) {
      errors.push(`judge-lens-invalid:${lens}`);
      continue;
    }
    if (item.verdict === 'HOLD' && !String(item.note || '').trim()) {
      errors.push(`judge-hold-without-note:${lens}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function judgeOverall(judge) {
  const validation = validateJudgeResult(judge);
  if (!validation.ok) return 'HOLD';
  return JUDGE_LENSES.every((lens) => judge[lens].verdict === 'GO') ? 'GO' : 'HOLD';
}

// Final row assembly. A row may become GO only when the deterministic checks
// find no hard defect AND every judge lens agrees; without a judge the best a
// row can reach is PENDING_JUDGE. The factory can never emit approvals.
function buildFilledRow({ blockRow, translation, translatorNotes, backTranslation, judge, model, generatedAt }) {
  const deterministic = runDeterministicChecks({
    sourceText: blockRow.sourceText,
    targetLocale: blockRow.targetLocale,
    translation,
  });
  const softFlags = deterministic.reasons.filter((reason) => reason.severity === 'soft');
  const holdReasons = [...deterministic.hardReasons];
  let status;
  if (judge) {
    if (judgeOverall(judge) === 'HOLD') {
      holdReasons.push(
        ...JUDGE_LENSES.filter((lens) => judge?.[lens]?.verdict !== 'GO').map((lens) => ({
          code: `judge-hold:${lens}`,
          severity: 'hard',
          message: String(judge?.[lens]?.note || 'judge returned invalid output'),
        })),
      );
    }
    status = holdReasons.length > 0 ? 'HOLD' : 'GO';
  } else {
    status = holdReasons.length > 0 ? 'HOLD' : 'PENDING_JUDGE';
  }
  return {
    schema: FILLED_ROW_SCHEMA_VERSION,
    id: blockRow.id,
    file: blockRow.file,
    line: blockRow.line,
    keyPath: blockRow.keyPath,
    surface: blockRow.surface ?? null,
    sourceLocale: blockRow.sourceLocale,
    targetLocale: blockRow.targetLocale,
    targetSlot: blockRow.targetSlot ?? null,
    sourceText: blockRow.sourceText,
    targetText: translation,
    backTranslation: backTranslation ?? null,
    translatorNotes: translatorNotes ?? null,
    judge: judge ?? null,
    status,
    holdReasons,
    softFlags,
    machineGenerated: true,
    model,
    generatedAt,
    // The factory produces content candidates only. Review/import/activation
    // stay external and fail-closed, matching every other Heisenberg gate.
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  };
}

function validateBlockRow(row) {
  const errors = [];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return ['row-not-object'];
  for (const key of ['id', 'file', 'keyPath', 'sourceLocale', 'targetLocale', 'sourceText']) {
    if (row[key] === undefined || row[key] === null || String(row[key]).length === 0) {
      errors.push(`row-missing-${key}`);
    }
  }
  return errors;
}

function summarizeFilledRows(rows) {
  const byStatus = { GO: 0, HOLD: 0 };
  const holdReasonCounts = {};
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    for (const reason of row.holdReasons || []) {
      holdReasonCounts[reason.code] = (holdReasonCounts[reason.code] || 0) + 1;
    }
  }
  return { total: rows.length, byStatus, holdReasonCounts };
}

module.exports = {
  FILLED_ROW_SCHEMA_VERSION,
  JUDGE_LENSES,
  extractPlaceholders,
  quotedEnglishSnippets,
  runDeterministicChecks,
  validateJudgeResult,
  judgeOverall,
  buildFilledRow,
  validateBlockRow,
  summarizeFilledRows,
};
