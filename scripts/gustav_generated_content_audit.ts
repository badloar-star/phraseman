import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-generated-content-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    generatedLedgers: number;
    lessonLedgers: number;
    rows: number;
    rowsWithFrench: number;
    rowsWithWordsFr: number;
    rowsWithReviewerNeedsReview: number;
    rowsAccepted: number;
    activationApprovedRows: number;
    activeAppSeedAllowedLedgers: number;
    missingRequiredFields: number;
    mojibakeMeaningFields: number;
    duplicatePhraseIds: number;
    blockers: number;
    warnings: number;
    shapeValid: boolean;
    llmOfficialSourceBridgeReady: boolean;
    llmOfficialSourceReviewedRows: number;
    llmOfficialSourceRowsWithAllRequiredGatesPassed: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayStartFrenchGeneration: boolean;
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

const REQUIRED_ROW_FIELDS = [
  'phraseId',
  'englishBase',
  'russianMeaning',
  'ukrainianMeaning',
  'proposedFrench',
  'wordsFr',
  'evidenceClaimIds',
  'requiredEvidence',
  'reviewerStatus',
  'activationStatus',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
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

function hasMojibake(value: unknown): boolean {
  return typeof value === 'string' && /[ÐÑ][\u0080-\u00BF]|Ã[©ª¨]|Â/.test(value);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Generated Content Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Generated ledgers: ${report.summary.generatedLedgers}`,
    `- Lesson ledgers: ${report.summary.lessonLedgers}`,
    `- Rows: ${report.summary.rows}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows with wordsFr: ${report.summary.rowsWithWordsFr}`,
    `- Rows needing review: ${report.summary.rowsWithReviewerNeedsReview}`,
    `- Rows accepted: ${report.summary.rowsAccepted}`,
    `- Activation approved rows: ${report.summary.activationApprovedRows}`,
    `- Active app seed allowed ledgers: ${report.summary.activeAppSeedAllowedLedgers}`,
    `- Missing required fields: ${report.summary.missingRequiredFields}`,
    `- Mojibake meaning fields: ${report.summary.mojibakeMeaningFields}`,
    `- Duplicate phrase ids: ${report.summary.duplicatePhraseIds}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Shape valid: ${report.summary.shapeValid ? 'yes' : 'no'}`,
    `- LLM official-source bridge ready: ${report.summary.llmOfficialSourceBridgeReady ? 'yes' : 'no'}`,
    `- LLM official-source reviewed rows: ${report.summary.llmOfficialSourceReviewedRows}`,
    `- LLM official-source rows with all required gates passed: ${report.summary.llmOfficialSourceRowsWithAllRequiredGatesPassed}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May start French generation: ${report.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
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
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_generated_content_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const findings: Finding[] = [];
  const ledgerFiles = fs.existsSync(generatedDir)
    ? fs.readdirSync(generatedDir)
        .filter((file) => file.endsWith('_row_ledger.json'))
        .map((file) => path.join(generatedDir, file))
    : [];

  const ledgers: Report['ledgers'] = [];
  let rows = 0;
  let rowsWithFrench = 0;
  let rowsWithWordsFr = 0;
  let rowsWithReviewerNeedsReview = 0;
  let rowsAccepted = 0;
  let activationApprovedRows = 0;
  let activeAppSeedAllowedLedgers = 0;
  let missingRequiredFields = 0;
  let mojibakeMeaningFields = 0;
  let duplicatePhraseIds = 0;
  const phraseIds = new Set<string>();

  for (const filePath of ledgerFiles) {
    const ledger = readJson<Record<string, unknown>>(filePath);
    const ledgerRows = arr<Record<string, unknown>>(ledger.rows);
    ledgers.push({
      path: artifactPath(repoRoot, filePath),
      lessonId: typeof ledger.lessonId === 'number' ? ledger.lessonId : 0,
      rows: ledgerRows.length,
      activationStatus: String(ledger.activationStatus || ''),
      activeAppSeedAllowed: ledger.activeAppSeedAllowed === true,
    });
    if (ledger.activeAppSeedAllowed === true) activeAppSeedAllowedLedgers += 1;
    if (ledgerRows.length !== 50) {
      findings.push({
        severity: 'blocker',
        code: 'lesson_ledger_row_count_invalid',
        message: `Expected 50 rows, found ${ledgerRows.length}.`,
        path: artifactPath(repoRoot, filePath),
      });
    }
    for (const row of ledgerRows) {
      rows += 1;
      const rowMissing = REQUIRED_ROW_FIELDS.filter((field) => !(field in row));
      missingRequiredFields += rowMissing.length;
      if (rowMissing.length > 0) {
        findings.push({
          severity: 'blocker',
          code: 'row_required_fields_missing',
          message: `${String(row.phraseId || 'unknown')} missing ${rowMissing.join(', ')}.`,
          path: artifactPath(repoRoot, filePath),
        });
      }
      const phraseId = String(row.phraseId || '');
      if (phraseIds.has(phraseId)) duplicatePhraseIds += 1;
      phraseIds.add(phraseId);
      if (typeof row.proposedFrench === 'string' && row.proposedFrench.trim()) rowsWithFrench += 1;
      if (arr(row.wordsFr).length > 0) rowsWithWordsFr += 1;
      if (row.reviewerStatus === 'needs_review') rowsWithReviewerNeedsReview += 1;
      if (row.reviewerStatus === 'accepted') rowsAccepted += 1;
      if (row.activationStatus === 'approved_for_apply') activationApprovedRows += 1;
      if (hasMojibake(row.russianMeaning) || hasMojibake(row.ukrainianMeaning)) mojibakeMeaningFields += 1;
    }
  }

  const legacyBridgeSummary = summaryOf(path.join(runDir, 'audits', 'legacy_generated_research_evidence_bridge_v2_packet.json'));
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

  if (ledgerFiles.length === 0) {
    findings.push({
      severity: 'blocker',
      code: 'generated_lesson_ledgers_missing',
      message: 'No generated French lesson ledgers found.',
    });
  }
  if (activeAppSeedAllowedLedgers > 0 || activationApprovedRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'generated_content_activation_open',
      message: 'Generated content must remain blocked until review and apply approval.',
    });
  }
  if (rowsWithReviewerNeedsReview > 0) {
    findings.push({
      severity: llmOfficialSourceBridgeReady ? 'info' : 'warning',
      code: llmOfficialSourceBridgeReady ? 'rows_llm_official_source_review_promoted_no_apply' : 'rows_need_llm_official_source_review',
      message: llmOfficialSourceBridgeReady
        ? `${rowsWithReviewerNeedsReview} generated rows remain ledger-locked, but LLM official-source bridge covers all rows with required gates and keeps apply closed.`
        : `${rowsWithReviewerNeedsReview} generated rows need LLM official-source review before apply.`,
    });
  }
  if (mojibakeMeaningFields > 0) {
    findings.push({
      severity: 'blocker',
      code: 'mojibake_meaning_fields',
      message: `${mojibakeMeaningFields} rows still contain mojibake in RU/UK meaning fields.`,
    });
  }
  if (duplicatePhraseIds > 0) {
    findings.push({
      severity: 'blocker',
      code: 'duplicate_phrase_ids',
      message: `${duplicatePhraseIds} duplicate phrase ids found.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const shapeValid =
    ledgerFiles.length > 0 &&
    rows > 0 &&
    rowsWithFrench === rows &&
    rowsWithWordsFr === rows &&
    missingRequiredFields === 0 &&
    mojibakeMeaningFields === 0 &&
    duplicatePhraseIds === 0 &&
    activeAppSeedAllowedLedgers === 0 &&
    activationApprovedRows === 0;
  const readyForReviewer = shapeValid && blockers === 0;
  const readyForApply = readyForReviewer && warnings === 0 && rowsAccepted === rows;

  const report: Report = {
    schemaVersion: 'gustav-generated-content-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForApply ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      generatedLedgers: ledgerFiles.length,
      lessonLedgers: ledgerFiles.length,
      rows,
      rowsWithFrench,
      rowsWithWordsFr,
      rowsWithReviewerNeedsReview,
      rowsAccepted,
      activationApprovedRows,
      activeAppSeedAllowedLedgers,
      missingRequiredFields,
      mojibakeMeaningFields,
      duplicatePhraseIds,
      blockers,
      warnings,
      shapeValid,
      llmOfficialSourceBridgeReady,
      llmOfficialSourceReviewedRows,
      llmOfficialSourceRowsWithAllRequiredGatesPassed,
      readyForReviewer,
      readyForApply,
      mayStartFrenchGeneration: true,
      mayModifyProductionAppFiles: false,
    },
    ledgers,
    findings,
  };

  const outJson = path.join(runDir, 'audits', 'generated_content_audit.json');
  const outMd = path.join(runDir, 'audits', 'generated_content_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV generated content audit: ${report.status}`);
  console.log(`Rows: ${report.summary.rows}`);
  console.log(`Rows with French: ${report.summary.rowsWithFrench}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
