import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  phraseId?: string;
  lessonId?: number;
};

type SourcePhrase = {
  id: string;
  lessonId: number;
  targetText: string;
  sourcePrompts?: {
    ru?: string;
    uk?: string;
    [locale: string]: string | undefined;
  };
};

type SourceGraph = {
  runId?: string;
  phrases: SourcePhrase[];
};

type WordFr = {
  text?: unknown;
  correct?: unknown;
  distractors?: unknown;
  category?: unknown;
};

type GeneratedRow = {
  phraseId?: unknown;
  englishBase?: unknown;
  russianMeaning?: unknown;
  ukrainianMeaning?: unknown;
  proposedFrench?: unknown;
  wordsFr?: unknown;
  reviewerStatus?: unknown;
  activationStatus?: unknown;
};

type LessonLedger = {
  runId?: unknown;
  lessonId?: unknown;
  activationStatus?: unknown;
  activeAppSeedAllowed?: unknown;
  rows?: unknown;
};

type Report = {
  schemaVersion: 'gustav-french-translation-qa-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    sourceLessons: number;
    generatedLedgers: number;
    rows: number;
    sourceRows: number;
    rowsMatchingSource: number;
    rowsWithFrench: number;
    rowsWithValidWordsFr: number;
    rowsWithReviewerNeedsReview: number;
    duplicatePhraseIds: number;
    ledgerActivationViolations: number;
    rowActivationViolations: number;
    englishMismatchRows: number;
    meaningMismatchRows: number;
    placeholderRows: number;
    mojibakeRows: number;
    wordsFrIssues: number;
    blockers: number;
    warnings: number;
    llmOfficialSourceBridgeReady: boolean;
    llmOfficialSourceReviewedRows: number;
    llmOfficialSourceRowsWithAllRequiredGatesPassed: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  ledgers: Array<{
    path: string;
    lessonId: number;
    rows: number;
    activationStatus: string;
    activeAppSeedAllowed: boolean;
  }>;
  findings: Finding[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function n(value: Record<string, unknown>, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: Record<string, unknown>, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function summaryOf(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<Record<string, unknown>>(filePath).summary);
}

function normalized(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u02BC`\u00B4]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr');
}

function countBlanks(value: string): number {
  return (value.match(/___/g) || []).length;
}

function phraseNumber(phraseId: string): number {
  const match = /^lesson\d+_phrase_(\d+)$/.exec(phraseId);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function lessonIdFromLedgerPath(filePath: string): number {
  const match = /lesson(\d+)_row_ledger\.json$/.exec(path.basename(filePath));
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function hasMojibake(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /[\uFFFD]|\u00C3[\u0080-\u00BF\u00A0-\u00BF]?|\u00C2[\u0080-\u00BF]?|\u00D0|\u00D1|\u00E2\u20AC/.test(value);
}

function hasPlaceholder(value: string): boolean {
  return /___|TODO|TBD|FIXME|TRANSLATE|\?\?\?/i.test(value);
}

function pushFinding(findings: Finding[], finding: Finding): void {
  findings.push(finding);
}

function pushCappedFinding(findings: Finding[], finding: Finding, caps: Map<string, number>, limit = 25): void {
  const count = caps.get(finding.code) ?? 0;
  caps.set(finding.code, count + 1);
  if (count < limit) findings.push(finding);
}

function validateWordsFr(row: GeneratedRow, filePath: string, repoRoot: string, caps: Map<string, number>, findings: Finding[]): boolean {
  const phraseId = asString(row.phraseId) || 'unknown';
  const words = asArray<WordFr>(row.wordsFr);
  let valid = true;

  if (words.length === 0) {
    valid = false;
    pushCappedFinding(findings, {
      severity: 'blocker',
      code: 'words_fr_missing',
      message: 'wordsFr must contain at least one quiz item.',
      path: artifactPath(repoRoot, filePath),
      phraseId,
    }, caps);
    return false;
  }

  for (const [index, word] of words.entries()) {
    const text = asString(word.text);
    const correct = asString(word.correct);
    const distractors = asArray<unknown>(word.distractors).map(asString);
    const category = asString(word.category);
    const distinctDistractors = new Set(distractors.map(normalized));
    const correctNorm = normalized(correct);

    if (!text.trim() || countBlanks(text) !== 1) {
      valid = false;
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'words_fr_blank_invalid',
        message: `wordsFr[${index}].text must contain exactly one ___.`,
        path: artifactPath(repoRoot, filePath),
        phraseId,
      }, caps);
    }
    if (!correct.trim()) {
      valid = false;
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'words_fr_correct_missing',
        message: `wordsFr[${index}].correct is empty.`,
        path: artifactPath(repoRoot, filePath),
        phraseId,
      }, caps);
    }
    if (distractors.length !== 3 || distractors.some((item) => !item.trim()) || distinctDistractors.size !== distractors.length) {
      valid = false;
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'words_fr_distractors_invalid',
        message: `wordsFr[${index}].distractors must contain exactly 3 distinct non-empty values.`,
        path: artifactPath(repoRoot, filePath),
        phraseId,
      }, caps);
    }
    if (correctNorm && distinctDistractors.has(correctNorm)) {
      valid = false;
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'words_fr_correct_repeated_in_distractors',
        message: `wordsFr[${index}].correct is repeated in distractors.`,
        path: artifactPath(repoRoot, filePath),
        phraseId,
      }, caps);
    }
    if (!category.trim()) {
      valid = false;
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'words_fr_category_missing',
        message: `wordsFr[${index}].category is empty.`,
        path: artifactPath(repoRoot, filePath),
        phraseId,
      }, caps);
    }
    if ([text, correct, category, ...distractors].some(hasMojibake)) {
      valid = false;
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'words_fr_mojibake',
        message: `wordsFr[${index}] contains mojibake markers.`,
        path: artifactPath(repoRoot, filePath),
        phraseId,
      }, caps);
    }
  }

  return valid;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Translation QA Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Source lessons: ${report.summary.sourceLessons}`,
    `- Generated ledgers: ${report.summary.generatedLedgers}`,
    `- Rows: ${report.summary.rows}`,
    `- Source rows: ${report.summary.sourceRows}`,
    `- Rows matching source: ${report.summary.rowsMatchingSource}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows with valid wordsFr: ${report.summary.rowsWithValidWordsFr}`,
    `- Rows needing review: ${report.summary.rowsWithReviewerNeedsReview}`,
    `- Duplicate phrase ids: ${report.summary.duplicatePhraseIds}`,
    `- Ledger activation violations: ${report.summary.ledgerActivationViolations}`,
    `- Row activation violations: ${report.summary.rowActivationViolations}`,
    `- English mismatch rows: ${report.summary.englishMismatchRows}`,
    `- Meaning mismatch rows: ${report.summary.meaningMismatchRows}`,
    `- Placeholder rows: ${report.summary.placeholderRows}`,
    `- Mojibake rows: ${report.summary.mojibakeRows}`,
    `- wordsFr issues: ${report.summary.wordsFrIssues}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- LLM official-source bridge ready: ${report.summary.llmOfficialSourceBridgeReady ? 'yes' : 'no'}`,
    `- LLM official-source reviewed rows: ${report.summary.llmOfficialSourceReviewedRows}`,
    `- LLM official-source rows with all required gates passed: ${report.summary.llmOfficialSourceRowsWithAllRequiredGatesPassed}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Ledgers',
    '',
  ];

  for (const ledger of report.ledgers) {
    lines.push(`- \`${ledger.path}\`: lesson ${ledger.lessonId}, rows ${ledger.rows}, activation \`${ledger.activationStatus}\`, app seed ${ledger.activeAppSeedAllowed ? 'yes' : 'no'}`);
  }

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      const location = [
        finding.path ? `path=${finding.path}` : null,
        finding.lessonId ? `lesson=${finding.lessonId}` : null,
        finding.phraseId ? `phrase=${finding.phraseId}` : null,
      ].filter(Boolean).join(', ');
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${location ? ` (${location})` : ''}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_translation_qa_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const graphPath = path.join(runDir, 'source_graph', 'source_graph.json');
  const generatedDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const auditsDir = path.join(runDir, 'audits');
  const findings: Finding[] = [];
  const caps = new Map<string, number>();

  if (!fs.existsSync(graphPath)) {
    throw new Error(`Source graph not found: ${artifactPath(repoRoot, graphPath)}`);
  }

  const graph = readJson<SourceGraph>(graphPath);
  const sourcePhrases = asArray<SourcePhrase>(graph.phrases);
  const sourceById = new Map(sourcePhrases.map((phrase) => [phrase.id, phrase]));
  const sourceLessonIds = Array.from(new Set(sourcePhrases.map((phrase) => phrase.lessonId))).sort((a, b) => a - b);

  const ledgerFiles = fs.existsSync(generatedDir)
    ? fs.readdirSync(generatedDir)
        .filter((file) => file.endsWith('_row_ledger.json'))
        .map((file) => path.join(generatedDir, file))
        .sort((a, b) => lessonIdFromLedgerPath(a) - lessonIdFromLedgerPath(b))
    : [];

  const generatedLessonIds = new Set<number>();
  const ledgers: Report['ledgers'] = [];
  const generatedPhraseIds = new Set<string>();
  const proposedFrenchByValue = new Map<string, Array<{ phraseId: string; englishBase: string }>>();

  let rows = 0;
  let rowsMatchingSource = 0;
  let rowsWithFrench = 0;
  let rowsWithValidWordsFr = 0;
  let rowsWithReviewerNeedsReview = 0;
  let duplicatePhraseIds = 0;
  let ledgerActivationViolations = 0;
  let rowActivationViolations = 0;
  let englishMismatchRows = 0;
  let meaningMismatchRows = 0;
  let placeholderRows = 0;
  let mojibakeRows = 0;
  let wordsFrIssues = 0;

  for (const lessonId of sourceLessonIds) {
    const hasLedger = ledgerFiles.some((file) => lessonIdFromLedgerPath(file) === lessonId);
    if (!hasLedger) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'generated_lesson_ledger_missing',
        message: `Missing generated French ledger for lesson ${lessonId}.`,
        lessonId,
      });
    }
  }

  for (const filePath of ledgerFiles) {
    const ledger = readJson<LessonLedger>(filePath);
    const ledgerRows = asArray<GeneratedRow>(ledger.rows);
    const fileLessonId = lessonIdFromLedgerPath(filePath);
    const ledgerLessonId = typeof ledger.lessonId === 'number' ? ledger.lessonId : fileLessonId;
    generatedLessonIds.add(ledgerLessonId);

    ledgers.push({
      path: artifactPath(repoRoot, filePath),
      lessonId: ledgerLessonId,
      rows: ledgerRows.length,
      activationStatus: asString(ledger.activationStatus),
      activeAppSeedAllowed: ledger.activeAppSeedAllowed === true,
    });

    if (ledger.runId !== runId) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'ledger_run_id_mismatch',
        message: `Ledger runId must be ${runId}.`,
        path: artifactPath(repoRoot, filePath),
        lessonId: ledgerLessonId,
      });
    }
    if (ledgerLessonId !== fileLessonId) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'ledger_lesson_id_mismatch',
        message: `Ledger lessonId ${ledgerLessonId} does not match filename lesson ${fileLessonId}.`,
        path: artifactPath(repoRoot, filePath),
        lessonId: ledgerLessonId,
      });
    }
    if (ledgerRows.length !== 50) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'lesson_ledger_row_count_invalid',
        message: `Expected 50 rows, found ${ledgerRows.length}.`,
        path: artifactPath(repoRoot, filePath),
        lessonId: ledgerLessonId,
      });
    }
    if (ledger.activationStatus !== 'blocked_pending_source_review' || ledger.activeAppSeedAllowed !== false) {
      ledgerActivationViolations += 1;
      pushFinding(findings, {
        severity: 'blocker',
        code: 'ledger_activation_lock_violation',
        message: 'Ledger must remain blocked_pending_source_review with activeAppSeedAllowed=false.',
        path: artifactPath(repoRoot, filePath),
        lessonId: ledgerLessonId,
      });
    }

    ledgerRows
      .slice()
      .sort((a, b) => phraseNumber(asString(a.phraseId)) - phraseNumber(asString(b.phraseId)))
      .forEach((row) => {
        rows += 1;
        const phraseId = asString(row.phraseId);
        const englishBase = asString(row.englishBase);
        const russianMeaning = asString(row.russianMeaning);
        const ukrainianMeaning = asString(row.ukrainianMeaning);
        const proposedFrench = asString(row.proposedFrench);
        const expectedPhrasePattern = new RegExp(`^lesson${ledgerLessonId}_phrase_\\d+$`);
        const sourcePhrase = sourceById.get(phraseId);

        if (!phraseId || !expectedPhrasePattern.test(phraseId)) {
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'phrase_id_invalid',
            message: `Phrase id does not match lesson ${ledgerLessonId} pattern.`,
            path: artifactPath(repoRoot, filePath),
            phraseId: phraseId || 'missing',
            lessonId: ledgerLessonId,
          }, caps);
        }
        if (generatedPhraseIds.has(phraseId)) {
          duplicatePhraseIds += 1;
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'duplicate_phrase_id',
            message: 'Phrase id appears more than once in generated ledgers.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        }
        generatedPhraseIds.add(phraseId);

        if (!sourcePhrase) {
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'source_phrase_missing',
            message: 'Generated phrase id is not present in source graph.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        } else {
          let sourceMatches = true;
          if (englishBase !== sourcePhrase.targetText) {
            sourceMatches = false;
            englishMismatchRows += 1;
            pushCappedFinding(findings, {
              severity: 'blocker',
              code: 'english_base_mismatch',
              message: `Generated English base does not match source graph targetText.`,
              path: artifactPath(repoRoot, filePath),
              phraseId,
              lessonId: ledgerLessonId,
            }, caps);
          }
          if (russianMeaning !== sourcePhrase.sourcePrompts?.ru || ukrainianMeaning !== sourcePhrase.sourcePrompts?.uk) {
            sourceMatches = false;
            meaningMismatchRows += 1;
            pushCappedFinding(findings, {
              severity: 'blocker',
              code: 'source_meaning_mismatch',
              message: 'Generated RU/UK meanings must match source graph prompts.',
              path: artifactPath(repoRoot, filePath),
              phraseId,
              lessonId: ledgerLessonId,
            }, caps);
          }
          if (sourceMatches) rowsMatchingSource += 1;
        }

        if (proposedFrench.trim()) rowsWithFrench += 1;
        if (!proposedFrench.trim()) {
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'proposed_french_missing',
            message: 'proposedFrench is empty.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        }
        if (proposedFrench && [englishBase, russianMeaning, ukrainianMeaning].map(normalized).includes(normalized(proposedFrench))) {
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'proposed_french_not_translated',
            message: 'proposedFrench matches an English/RU/UK source string.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        }
        if (hasPlaceholder(proposedFrench)) {
          placeholderRows += 1;
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'proposed_french_placeholder',
            message: 'proposedFrench contains placeholder text.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        }
        if ([proposedFrench, russianMeaning, ukrainianMeaning].some(hasMojibake)) {
          mojibakeRows += 1;
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'row_mojibake',
            message: 'Generated row contains mojibake markers.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        }

        if (validateWordsFr(row, filePath, repoRoot, caps, findings)) {
          rowsWithValidWordsFr += 1;
        } else {
          wordsFrIssues += 1;
        }

        if (row.reviewerStatus === 'needs_review') rowsWithReviewerNeedsReview += 1;
        if (row.reviewerStatus !== 'needs_review' || row.activationStatus !== 'blocked') {
          rowActivationViolations += 1;
          pushCappedFinding(findings, {
            severity: 'blocker',
            code: 'row_review_activation_lock_violation',
            message: 'Generated row must remain reviewerStatus=needs_review and activationStatus=blocked.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps);
        }

        if (englishBase.trim().endsWith('?') && proposedFrench.trim() && !proposedFrench.trim().endsWith('?')) {
          pushCappedFinding(findings, {
            severity: 'warning',
            code: 'question_mark_missing_in_french',
            message: 'English question does not end with a French question mark.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps, 10);
        }
        if (proposedFrench.length > 180) {
          pushCappedFinding(findings, {
            severity: 'warning',
            code: 'proposed_french_long',
            message: `proposedFrench is long (${proposedFrench.length} characters).`,
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps, 10);
        }
        if (/[()]/.test(proposedFrench)) {
          pushCappedFinding(findings, {
            severity: 'warning',
            code: 'proposed_french_parentheses',
            message: 'proposedFrench contains parentheses and may need reviewer attention.',
            path: artifactPath(repoRoot, filePath),
            phraseId,
            lessonId: ledgerLessonId,
          }, caps, 10);
        }

        const proposedKey = normalized(proposedFrench);
        if (proposedKey) {
          const bucket = proposedFrenchByValue.get(proposedKey) ?? [];
          bucket.push({ phraseId, englishBase });
          proposedFrenchByValue.set(proposedKey, bucket);
        }
      });
  }

  for (const phrase of sourcePhrases) {
    if (!generatedPhraseIds.has(phrase.id)) {
      pushCappedFinding(findings, {
        severity: 'blocker',
        code: 'source_phrase_not_generated',
        message: 'Source graph phrase is missing from generated French ledgers.',
        phraseId: phrase.id,
        lessonId: phrase.lessonId,
      }, caps);
    }
  }

  const legacyBridgeSummary = summaryOf(path.join(auditsDir, 'legacy_generated_research_evidence_bridge_v2_packet.json'));
  const llmOfficialSourceReviewedRows = n(legacyBridgeSummary, 'rowsAcceptedByLlmOfficialSource');
  const llmOfficialSourceRowsWithAllRequiredGatesPassed = n(legacyBridgeSummary, 'rowsWithAllRequiredGatesPassed');
  const llmOfficialSourceBridgeReady =
    rows > 0 &&
    n(legacyBridgeSummary, 'legacyQueueRows') === rows &&
    llmOfficialSourceReviewedRows === rows &&
    llmOfficialSourceRowsWithAllRequiredGatesPassed === rows &&
    n(legacyBridgeSummary, 'rowActivationBlockedRows') === rows &&
    n(legacyBridgeSummary, 'rowProductionApplyOpenFlags') === 0 &&
    n(legacyBridgeSummary, 'rowActivationApprovedFlags') === 0 &&
    b(legacyBridgeSummary, 'dryRunReady') &&
    !b(legacyBridgeSummary, 'readyForApply') &&
    !b(legacyBridgeSummary, 'mayModifyProductionAppFiles');

  const duplicateFrench = Array.from(proposedFrenchByValue.entries())
    .filter(([, bucket]) => new Set(bucket.map((item) => item.englishBase)).size > 1);
  if (duplicateFrench.length > 0) {
    const samples = duplicateFrench.slice(0, 5).map(([value, bucket]) => {
      const ids = bucket.slice(0, 3).map((item) => item.phraseId).join(', ');
      return `"${value}" in ${ids}`;
    }).join('; ');
    pushFinding(findings, {
      severity: llmOfficialSourceBridgeReady ? 'info' : 'warning',
      code: llmOfficialSourceBridgeReady ? 'duplicate_proposed_french_values_llm_covered' : 'duplicate_proposed_french_values',
      message: llmOfficialSourceBridgeReady
        ? `${duplicateFrench.length} proposedFrench values are reused across different English phrases, and LLM official-source bridge covers all rows. Samples: ${samples}.`
        : `${duplicateFrench.length} proposedFrench values are reused across different English phrases. Samples: ${samples}.`,
    });
  }

  pushFinding(findings, {
    severity: llmOfficialSourceBridgeReady ? 'info' : 'warning',
    code: llmOfficialSourceBridgeReady ? 'rows_llm_official_source_review_promoted_no_apply' : 'rows_need_llm_official_source_review',
    message: llmOfficialSourceBridgeReady
      ? 'All generated rows remain reviewerStatus=needs_review in ledgers, while LLM official-source bridge covers all rows and keeps app apply closed.'
      : 'All generated rows intentionally remain reviewerStatus=needs_review and are not approved for app apply.',
  });

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    blockers === 0 &&
    rows === sourcePhrases.length &&
    rowsMatchingSource === sourcePhrases.length &&
    rowsWithFrench === rows &&
    rowsWithValidWordsFr === rows &&
    rowsWithReviewerNeedsReview === rows;

  const report: Report = {
    schemaVersion: 'gustav-french-translation-qa-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForReviewer ? 'HOLD' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      sourceLessons: sourceLessonIds.length,
      generatedLedgers: ledgerFiles.length,
      rows,
      sourceRows: sourcePhrases.length,
      rowsMatchingSource,
      rowsWithFrench,
      rowsWithValidWordsFr,
      rowsWithReviewerNeedsReview,
      duplicatePhraseIds,
      ledgerActivationViolations,
      rowActivationViolations,
      englishMismatchRows,
      meaningMismatchRows,
      placeholderRows,
      mojibakeRows,
      wordsFrIssues,
      blockers,
      warnings,
      llmOfficialSourceBridgeReady,
      llmOfficialSourceReviewedRows,
      llmOfficialSourceRowsWithAllRequiredGatesPassed,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    ledgers,
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_translation_qa_audit.json');
  const outMd = path.join(auditsDir, 'french_translation_qa_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French translation QA audit: ${report.status}`);
  console.log(`Rows: ${report.summary.rows}`);
  console.log(`Rows with French: ${report.summary.rowsWithFrench}`);
  console.log(`Rows with valid wordsFr: ${report.summary.rowsWithValidWordsFr}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) {
    process.exit(1);
  }
}

void main();
