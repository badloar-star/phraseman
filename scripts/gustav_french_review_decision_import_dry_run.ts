import * as fs from 'node:fs';
import * as path from 'node:path';

type QueueRow = {
  lessonId: number;
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  quizBlank: string;
  quizCorrect: string;
  quizDistractors: string[];
  quizCategory: string;
  currentReviewerStatus: string;
  currentActivationStatus: string;
};

type DecisionRow = QueueRow & {
  sourceQueueIndex: number;
  batchId: string;
  reviewerDecision: string;
  correctedFrench: string;
  correctedQuizBlank: string;
  correctedQuizCorrect: string;
  correctedQuizDistractors: string;
  reviewerNotes: string;
  reviewerName: string;
  reviewedAt: string;
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  phraseId?: string;
  sourceQueueIndex?: number;
};

type Report = {
  schemaVersion: 'gustav-french-review-decision-import-dry-run-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  input: {
    decisionFilePath: string;
    defaultTemplateUsed: boolean;
  };
  summary: {
    sourceQueueRows: number;
    decisionRows: number;
    reviewedRows: number;
    blankDecisionRows: number;
    acceptAsIsRows: number;
    needsCorrectionRows: number;
    rejectRows: number;
    skipRows: number;
    invalidDecisionRows: number;
    rowsWithCorrectionPayload: number;
    rowsMissingReviewerMetadata: number;
    rowsMissingReviewerNotes: number;
    identityMismatchRows: number;
    contextMismatchRows: number;
    duplicateDecisionRows: number;
    missingDecisionRows: number;
    extraDecisionRows: number;
    importCandidateRows: number;
    noOpRows: number;
    contractBlockers: number;
    templateIntegrityBlockers: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    wouldModifyGeneratedLedgers: boolean;
    wouldCreateApplyApproval: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  allowedDecisions: string[];
  findings: Finding[];
};

const ALLOWED_DECISIONS = ['accept_as_is', 'needs_correction', 'reject', 'skip'];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseJsonl<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function safeOutName(value: string | null): string {
  if (!value) return '';
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
  if (!safe) throw new Error('Invalid --out-name value.');
  return safe;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function queueKey(row: Pick<QueueRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function hasCorrectionPayload(row: DecisionRow): boolean {
  return Boolean(
    row.correctedFrench.trim() ||
    row.correctedQuizBlank.trim() ||
    row.correctedQuizCorrect.trim() ||
    row.correctedQuizDistractors.trim(),
  );
}

function hasReviewerMetadata(row: DecisionRow): boolean {
  return Boolean(row.reviewerName.trim() && row.reviewedAt.trim());
}

function hasContextMismatch(queueRow: QueueRow, decisionRow: DecisionRow): boolean {
  return (
    queueRow.englishBase !== decisionRow.englishBase ||
    queueRow.russianMeaning !== decisionRow.russianMeaning ||
    queueRow.ukrainianMeaning !== decisionRow.ukrainianMeaning ||
    queueRow.proposedFrench !== decisionRow.proposedFrench ||
    queueRow.quizBlank !== decisionRow.quizBlank ||
    queueRow.quizCorrect !== decisionRow.quizCorrect ||
    JSON.stringify(queueRow.quizDistractors) !== JSON.stringify(decisionRow.quizDistractors) ||
    queueRow.quizCategory !== decisionRow.quizCategory
  );
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Review Decision Import Dry Run',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Input',
    '',
    `- Decision file: \`${report.input.decisionFilePath}\``,
    `- Default template used: ${report.input.defaultTemplateUsed ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    `- Source queue rows: ${report.summary.sourceQueueRows}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Reviewed rows: ${report.summary.reviewedRows}`,
    `- Blank decision rows: ${report.summary.blankDecisionRows}`,
    `- accept_as_is rows: ${report.summary.acceptAsIsRows}`,
    `- needs_correction rows: ${report.summary.needsCorrectionRows}`,
    `- reject rows: ${report.summary.rejectRows}`,
    `- skip rows: ${report.summary.skipRows}`,
    `- Invalid decision rows: ${report.summary.invalidDecisionRows}`,
    `- Rows with correction payload: ${report.summary.rowsWithCorrectionPayload}`,
    `- Rows missing reviewer metadata: ${report.summary.rowsMissingReviewerMetadata}`,
    `- Rows missing reviewer notes: ${report.summary.rowsMissingReviewerNotes}`,
    `- Identity mismatch rows: ${report.summary.identityMismatchRows}`,
    `- Context mismatch rows: ${report.summary.contextMismatchRows}`,
    `- Duplicate decision rows: ${report.summary.duplicateDecisionRows}`,
    `- Missing decision rows: ${report.summary.missingDecisionRows}`,
    `- Extra decision rows: ${report.summary.extraDecisionRows}`,
    `- Import candidate rows: ${report.summary.importCandidateRows}`,
    `- No-op rows: ${report.summary.noOpRows}`,
    `- Contract blockers: ${report.summary.contractBlockers}`,
    `- Template integrity blockers: ${report.summary.templateIntegrityBlockers}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Would modify generated ledgers: ${report.summary.wouldModifyGeneratedLedgers ? 'yes' : 'no'}`,
    `- Would create apply approval: ${report.summary.wouldCreateApplyApproval ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Allowed Decisions',
    '',
  ];
  for (const decision of report.allowedDecisions) {
    lines.push(`- \`${decision}\``);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      const suffix = [
        finding.sourceQueueIndex ? `index=${finding.sourceQueueIndex}` : null,
        finding.phraseId ? `phrase=${finding.phraseId}` : null,
      ].filter(Boolean).join(', ');
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${suffix ? ` (${suffix})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This is a dry run only.');
  lines.push('- It does not write review decisions into generated ledgers.');
  lines.push('- It does not accept rows for app apply.');
  lines.push('- It does not create production apply approval.');
  lines.push('- It does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_review_decision_import_dry_run.ts --run docs/gustav/runs/<runId> [--decisions path/to/decisions.jsonl]');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const defaultDecisionPath = path.join(reviewerDir, 'french_review_decision_template.jsonl');
  const decisionArg = argValue('--decisions');
  const outName = safeOutName(argValue('--out-name'));
  const decisionPath = decisionArg ? path.resolve(repoRoot, decisionArg) : defaultDecisionPath;
  const queuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const contractPath = path.join(auditsDir, 'french_review_decision_contract_packet.json');
  const templateIntegrityPath = path.join(auditsDir, 'french_review_decision_template_integrity_audit.json');
  const schemaPath = path.join(reviewerDir, 'french_review_decision_schema.json');
  const findings: Finding[] = [];

  const queueRows = parseJsonl<QueueRow>(queuePath);
  const decisionRows = parseJsonl<DecisionRow>(decisionPath);
  const contract = asRecord(readJson<unknown>(contractPath));
  const contractSummary = asRecord(contract.summary);
  const templateIntegrity = asRecord(readJson<unknown>(templateIntegrityPath));
  const templateIntegritySummary = asRecord(templateIntegrity.summary);
  const schema = asRecord(readJson<unknown>(schemaPath));
  const schemaAllowedDecisions = Array.isArray(schema.allowedReviewerDecisions) ? schema.allowedReviewerDecisions as string[] : [];
  const contractBlockers = Number(contractSummary.findingsBlockers ?? 0);
  const templateIntegrityBlockers = Number(templateIntegritySummary.blockers ?? 0);

  if (contractSummary.readyForReviewer !== true || contractSummary.readyForApply !== false || contractSummary.mayModifyProductionAppFiles !== false || contractBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'contract_not_ready',
      message: 'Decision contract packet must be ready for reviewer, not ready for apply, and have no blockers.',
    });
  }
  if (templateIntegritySummary.readyForReviewer !== true || templateIntegrityBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'template_integrity_not_ready',
      message: 'Decision template integrity audit must pass before import dry-run.',
    });
  }
  if (schemaAllowedDecisions.join('|') !== ALLOWED_DECISIONS.join('|')) {
    findings.push({
      severity: 'blocker',
      code: 'allowed_decisions_mismatch',
      message: 'Decision schema allowed decisions do not match import dry-run expectations.',
    });
  }

  const queueByKey = new Map(queueRows.map((row) => [queueKey(row), row]));
  const seenDecisionKeys = new Set<string>();
  let reviewedRows = 0;
  let blankDecisionRows = 0;
  let acceptAsIsRows = 0;
  let needsCorrectionRows = 0;
  let rejectRows = 0;
  let skipRows = 0;
  let invalidDecisionRows = 0;
  let rowsWithCorrectionPayload = 0;
  let rowsMissingReviewerMetadata = 0;
  let rowsMissingReviewerNotes = 0;
  let identityMismatchRows = 0;
  let contextMismatchRows = 0;
  let duplicateDecisionRows = 0;
  let extraDecisionRows = 0;

  for (const row of decisionRows) {
    const key = queueKey(row);
    const decision = row.reviewerDecision.trim();
    if (seenDecisionKeys.has(key)) duplicateDecisionRows += 1;
    seenDecisionKeys.add(key);
    const queueRow = queueByKey.get(key);
    if (!queueRow) {
      extraDecisionRows += 1;
      findings.push({
        severity: 'blocker',
        code: 'extra_decision_row',
        message: 'Decision row does not exist in source reviewer queue.',
        phraseId: row.phraseId,
        sourceQueueIndex: row.sourceQueueIndex,
      });
      continue;
    }
    const expectedQueueRow = queueRows[row.sourceQueueIndex - 1];
    if (!expectedQueueRow || queueKey(expectedQueueRow) !== key) {
      identityMismatchRows += 1;
      findings.push({
        severity: 'blocker',
        code: 'decision_identity_mismatch',
        message: 'Decision row sourceQueueIndex, lessonId, and phraseId do not match source queue.',
        phraseId: row.phraseId,
        sourceQueueIndex: row.sourceQueueIndex,
      });
    }
    if (hasContextMismatch(queueRow, row)) {
      contextMismatchRows += 1;
      findings.push({
        severity: 'blocker',
        code: 'decision_context_mismatch',
        message: 'Decision row source context does not match reviewer queue.',
        phraseId: row.phraseId,
        sourceQueueIndex: row.sourceQueueIndex,
      });
    }

    const correctionPayload = hasCorrectionPayload(row);
    if (correctionPayload) rowsWithCorrectionPayload += 1;
    if (!decision) {
      blankDecisionRows += 1;
      if (correctionPayload || row.reviewerNotes.trim() || row.reviewerName.trim() || row.reviewedAt.trim()) {
        invalidDecisionRows += 1;
        findings.push({
          severity: 'blocker',
          code: 'blank_decision_has_payload',
          message: 'Blank reviewerDecision rows must not contain corrections or reviewer metadata.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
      continue;
    }

    reviewedRows += 1;
    if (!ALLOWED_DECISIONS.includes(decision)) {
      invalidDecisionRows += 1;
      findings.push({
        severity: 'blocker',
        code: 'reviewer_decision_invalid',
        message: `reviewerDecision must be one of ${ALLOWED_DECISIONS.join(', ')}.`,
        phraseId: row.phraseId,
        sourceQueueIndex: row.sourceQueueIndex,
      });
      continue;
    }
    if (!hasReviewerMetadata(row)) {
      rowsMissingReviewerMetadata += 1;
      findings.push({
        severity: 'blocker',
        code: 'reviewer_metadata_missing',
        message: 'Reviewed rows must include reviewerName and reviewedAt.',
        phraseId: row.phraseId,
        sourceQueueIndex: row.sourceQueueIndex,
      });
    }

    if (decision === 'accept_as_is') {
      acceptAsIsRows += 1;
      if (correctionPayload) {
        invalidDecisionRows += 1;
        findings.push({
          severity: 'blocker',
          code: 'accept_as_is_has_corrections',
          message: 'accept_as_is rows must not include corrected fields.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
    } else if (decision === 'needs_correction') {
      needsCorrectionRows += 1;
      if (!row.reviewerNotes.trim()) {
        rowsMissingReviewerNotes += 1;
        findings.push({
          severity: 'blocker',
          code: 'needs_correction_notes_missing',
          message: 'needs_correction rows must include reviewerNotes.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
      if (!correctionPayload) {
        invalidDecisionRows += 1;
        findings.push({
          severity: 'blocker',
          code: 'needs_correction_payload_missing',
          message: 'needs_correction rows must include at least one corrected field.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
    } else if (decision === 'reject') {
      rejectRows += 1;
      if (!row.reviewerNotes.trim()) {
        rowsMissingReviewerNotes += 1;
        findings.push({
          severity: 'blocker',
          code: 'reject_notes_missing',
          message: 'reject rows must include reviewerNotes.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
      if (correctionPayload) {
        invalidDecisionRows += 1;
        findings.push({
          severity: 'blocker',
          code: 'reject_has_corrections',
          message: 'reject rows must not include corrected fields.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
    } else if (decision === 'skip') {
      skipRows += 1;
      if (!row.reviewerNotes.trim()) {
        rowsMissingReviewerNotes += 1;
        findings.push({
          severity: 'blocker',
          code: 'skip_notes_missing',
          message: 'skip rows must include reviewerNotes in reviewed decision files.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
      if (correctionPayload) {
        invalidDecisionRows += 1;
        findings.push({
          severity: 'blocker',
          code: 'skip_has_corrections',
          message: 'skip rows must not include corrected fields.',
          phraseId: row.phraseId,
          sourceQueueIndex: row.sourceQueueIndex,
        });
      }
    }
  }

  let missingDecisionRows = 0;
  for (const row of queueRows) {
    if (!seenDecisionKeys.has(queueKey(row))) missingDecisionRows += 1;
  }
  if (duplicateDecisionRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'duplicate_decision_rows',
      message: `${duplicateDecisionRows} decision rows are duplicated.`,
    });
  }
  if (missingDecisionRows > 0 || extraDecisionRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'decision_coverage_mismatch',
      message: `Missing decision rows: ${missingDecisionRows}; extra decision rows: ${extraDecisionRows}.`,
    });
  }
  if (decisionRows.length !== queueRows.length) {
    findings.push({
      severity: 'blocker',
      code: 'decision_row_count_invalid',
      message: `Expected ${queueRows.length} decision rows, found ${decisionRows.length}.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const importCandidateRows = acceptAsIsRows + needsCorrectionRows + rejectRows + skipRows;
  const noOpRows = blankDecisionRows;
  const readyForDecisionImport =
    blockers === 0 &&
    reviewedRows > 0 &&
    reviewedRows === importCandidateRows &&
    decisionRows.length === queueRows.length;
  const readyForReviewer =
    blockers === 0 &&
    decisionRows.length === queueRows.length;

  const report: Report = {
    schemaVersion: 'gustav-french-review-decision-import-dry-run-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    input: {
      decisionFilePath: artifactPath(repoRoot, decisionPath),
      defaultTemplateUsed: path.resolve(decisionPath) === path.resolve(defaultDecisionPath),
    },
    summary: {
      sourceQueueRows: queueRows.length,
      decisionRows: decisionRows.length,
      reviewedRows,
      blankDecisionRows,
      acceptAsIsRows,
      needsCorrectionRows,
      rejectRows,
      skipRows,
      invalidDecisionRows,
      rowsWithCorrectionPayload,
      rowsMissingReviewerMetadata,
      rowsMissingReviewerNotes,
      identityMismatchRows,
      contextMismatchRows,
      duplicateDecisionRows,
      missingDecisionRows,
      extraDecisionRows,
      importCandidateRows,
      noOpRows,
      contractBlockers,
      templateIntegrityBlockers,
      blockers,
      warnings,
      readyForReviewer,
      readyForDecisionImport,
      readyForApply: false,
      wouldModifyGeneratedLedgers: false,
      wouldCreateApplyApproval: false,
      mayModifyProductionAppFiles: false,
    },
    allowedDecisions: ALLOWED_DECISIONS,
    findings,
  };

  ensureDir(auditsDir);
  const outBase = outName ? `french_review_decision_import_dry_run_${outName}` : 'french_review_decision_import_dry_run';
  const outJson = path.join(auditsDir, `${outBase}.json`);
  const outMd = path.join(auditsDir, `${outBase}.md`);
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French review decision import dry-run: ${report.status}`);
  console.log(`Decision rows: ${report.summary.decisionRows}`);
  console.log(`Reviewed rows: ${report.summary.reviewedRows}`);
  console.log(`Import candidate rows: ${report.summary.importCandidateRows}`);
  console.log(`No-op rows: ${report.summary.noOpRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Would modify generated ledgers: ${report.summary.wouldModifyGeneratedLedgers ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
