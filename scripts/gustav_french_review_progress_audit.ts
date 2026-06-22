import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type PriorityTier = 'high' | 'medium' | 'low';
type ReviewerDecision = '' | 'accept_as_is' | 'needs_correction' | 'reject' | 'skip';

type PriorityRow = {
  sourceQueueIndex: number;
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
  priorityTier: PriorityTier;
  priorityScore: number;
  priorityReasons: string[];
};

type DecisionRow = {
  sourceQueueIndex: number;
  batchId: string;
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

type TierProgress = {
  tier: PriorityTier;
  rows: number;
  reviewedRows: number;
  blankRows: number;
  acceptAsIsRows: number;
  needsCorrectionRows: number;
  rejectRows: number;
  skipRows: number;
  invalidRows: number;
  percentReviewed: number;
};

type Report = {
  schemaVersion: 'gustav-french-review-progress-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  input: {
    priorityQueueJsonl: string;
    decisionFilePath: string;
    defaultDecisionTemplateUsed: boolean;
  };
  hashes: {
    priorityQueueSha256: string;
    decisionFileSha256: string;
  };
  summary: {
    priorityRows: number;
    decisionRows: number;
    reviewedRows: number;
    blankRows: number;
    acceptAsIsRows: number;
    needsCorrectionRows: number;
    rejectRows: number;
    skipRows: number;
    invalidDecisionRows: number;
    rowsMissingReviewerMetadata: number;
    rowsMissingReviewerNotes: number;
    rowsWithCorrectionPayload: number;
    duplicateDecisionRows: number;
    missingDecisionRows: number;
    extraDecisionRows: number;
    identityMismatchRows: number;
    contextMismatchRows: number;
    activationStatusViolations: number;
    highPriorityReviewedRows: number;
    mediumPriorityReviewedRows: number;
    lowPriorityReviewedRows: number;
    percentReviewed: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    wouldModifyGeneratedLedgers: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  tierProgress: TierProgress[];
  topUnreviewedRows: Array<{
    rank: number;
    sourceQueueIndex: number;
    lessonId: number;
    phraseId: string;
    priorityTier: PriorityTier;
    priorityScore: number;
    englishBase: string;
    proposedFrench: string;
    priorityReasons: string[];
  }>;
  safety: {
    dryRunOnly: true;
    reviewerDecisionsWrittenByThisScript: false;
    generatedLedgersModifiedByThisScript: false;
    productionAppFilesModifiedByThisScript: false;
    applyApprovalCreatedByThisScript: false;
  };
  findings: Finding[];
};

const ALLOWED_DECISIONS: ReviewerDecision[] = ['', 'accept_as_is', 'needs_correction', 'reject', 'skip'];
const REVIEWED_DECISIONS = new Set<ReviewerDecision>(['accept_as_is', 'needs_correction', 'reject', 'skip']);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function safeOutName(value: string | null): string {
  if (!value) return '';
  if (!/^[a-z0-9_-]+$/i.test(value)) throw new Error('Invalid --out-name value.');
  return value;
}

function parseJsonl<T>(filePath: string): T[] {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function rowKey(row: Pick<PriorityRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function normalizeArray(values: string[]): string {
  return values.map((value) => value.trim()).join('|');
}

function hasContextMismatch(priority: PriorityRow, decision: DecisionRow): boolean {
  return priority.englishBase !== decision.englishBase ||
    priority.russianMeaning !== decision.russianMeaning ||
    priority.ukrainianMeaning !== decision.ukrainianMeaning ||
    priority.proposedFrench !== decision.proposedFrench ||
    priority.quizBlank !== decision.quizBlank ||
    priority.quizCorrect !== decision.quizCorrect ||
    normalizeArray(priority.quizDistractors) !== normalizeArray(decision.quizDistractors) ||
    priority.quizCategory !== decision.quizCategory;
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

function hasReviewerNotes(row: DecisionRow): boolean {
  return Boolean(row.reviewerNotes.trim());
}

function percent(part: number, total: number): number {
  if (total === 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Review Progress Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Priority rows: ${report.summary.priorityRows}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Reviewed rows: ${report.summary.reviewedRows}`,
    `- Blank rows: ${report.summary.blankRows}`,
    `- Percent reviewed: ${report.summary.percentReviewed}%`,
    `- Decisions: accept_as_is ${report.summary.acceptAsIsRows}, needs_correction ${report.summary.needsCorrectionRows}, reject ${report.summary.rejectRows}, skip ${report.summary.skipRows}`,
    `- Invalid decision rows: ${report.summary.invalidDecisionRows}`,
    `- Missing reviewer metadata: ${report.summary.rowsMissingReviewerMetadata}`,
    `- Missing reviewer notes: ${report.summary.rowsMissingReviewerNotes}`,
    `- Coverage mismatch: missing ${report.summary.missingDecisionRows}, extra ${report.summary.extraDecisionRows}, duplicate ${report.summary.duplicateDecisionRows}`,
    `- Identity/context mismatch: ${report.summary.identityMismatchRows}/${report.summary.contextMismatchRows}`,
    `- Activation status violations: ${report.summary.activationStatusViolations}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Tier Progress',
    '',
  ];

  for (const tier of report.tierProgress) {
    lines.push(`- ${tier.tier}: ${tier.reviewedRows}/${tier.rows} reviewed (${tier.percentReviewed}%), blank ${tier.blankRows}, invalid ${tier.invalidRows}`);
  }

  lines.push('', '## Top Unreviewed Rows', '');
  for (const row of report.topUnreviewedRows) {
    lines.push(`- #${row.rank} \`${row.priorityTier}\` score ${row.priorityScore}: ${row.englishBase} -> ${row.proposedFrench} (${row.phraseId})`);
  }

  lines.push('', '## Safety', '');
  lines.push('- This audit is read-only over reviewer decision files.');
  lines.push('- It does not write reviewer decisions into generated ledgers.');
  lines.push('- It does not approve decision import.');
  lines.push('- It does not approve production apply.');
  lines.push('- It does not modify production app files.');

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings.slice(0, 80)) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`${finding.phraseId ? ` row \`${finding.phraseId}\`` : ''}: ${finding.message}`);
    }
    if (report.findings.length > 80) {
      lines.push(`- ... ${report.findings.length - 80} more findings omitted from markdown; see JSON.`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_french_review_progress_audit.ts --run <run-dir> [--decisions path] [--out-name name]');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const auditsDir = path.join(runDir, 'audits');
  const priorityPath = path.join(reviewerDir, 'french_reviewer_priority_queue.jsonl');
  const defaultDecisionPath = path.join(reviewerDir, 'french_review_decision_template.jsonl');
  const decisionArg = argValue('--decisions');
  const decisionPath = decisionArg ? path.resolve(repoRoot, decisionArg) : defaultDecisionPath;
  const outName = safeOutName(argValue('--out-name'));
  const findings: Finding[] = [];

  const priorityRows = parseJsonl<PriorityRow>(priorityPath);
  const decisionRows = parseJsonl<DecisionRow>(decisionPath);
  const priorityByKey = new Map(priorityRows.map((row) => [rowKey(row), row]));
  const seenDecisionKeys = new Set<string>();

  let reviewedRows = 0;
  let blankRows = 0;
  let acceptAsIsRows = 0;
  let needsCorrectionRows = 0;
  let rejectRows = 0;
  let skipRows = 0;
  let invalidDecisionRows = 0;
  let rowsMissingReviewerMetadata = 0;
  let rowsMissingReviewerNotes = 0;
  let rowsWithCorrectionPayload = 0;
  let duplicateDecisionRows = 0;
  let extraDecisionRows = 0;
  let identityMismatchRows = 0;
  let contextMismatchRows = 0;
  let activationStatusViolations = 0;

  const tierStats = new Map<PriorityTier, TierProgress>([
    ['high', { tier: 'high', rows: 0, reviewedRows: 0, blankRows: 0, acceptAsIsRows: 0, needsCorrectionRows: 0, rejectRows: 0, skipRows: 0, invalidRows: 0, percentReviewed: 0 }],
    ['medium', { tier: 'medium', rows: 0, reviewedRows: 0, blankRows: 0, acceptAsIsRows: 0, needsCorrectionRows: 0, rejectRows: 0, skipRows: 0, invalidRows: 0, percentReviewed: 0 }],
    ['low', { tier: 'low', rows: 0, reviewedRows: 0, blankRows: 0, acceptAsIsRows: 0, needsCorrectionRows: 0, rejectRows: 0, skipRows: 0, invalidRows: 0, percentReviewed: 0 }],
  ]);
  priorityRows.forEach((row) => {
    tierStats.get(row.priorityTier)!.rows += 1;
  });

  for (const row of decisionRows) {
    const decision = row.reviewerDecision.trim() as ReviewerDecision;
    const key = rowKey(row);
    const priority = priorityByKey.get(key);
    const tier = priority ? tierStats.get(priority.priorityTier)! : null;
    if (seenDecisionKeys.has(key)) duplicateDecisionRows += 1;
    seenDecisionKeys.add(key);

    if (!priority) {
      extraDecisionRows += 1;
      findings.push({ severity: 'blocker', code: 'extra_decision_row', message: 'Decision row does not exist in priority queue.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      continue;
    }
    if (priority.sourceQueueIndex + 1 !== row.sourceQueueIndex) {
      identityMismatchRows += 1;
      findings.push({ severity: 'blocker', code: 'decision_identity_mismatch', message: 'sourceQueueIndex does not match priority queue identity.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
    }
    if (hasContextMismatch(priority, row)) {
      contextMismatchRows += 1;
      findings.push({ severity: 'blocker', code: 'decision_context_mismatch', message: 'Decision source context differs from priority queue.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
    }
    if (row.currentReviewerStatus !== 'needs_review' || row.currentActivationStatus !== 'blocked') {
      activationStatusViolations += 1;
      findings.push({ severity: 'blocker', code: 'decision_activation_state_invalid', message: 'Decision rows must preserve currentReviewerStatus=needs_review and currentActivationStatus=blocked.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
    }

    const correctionPayload = hasCorrectionPayload(row);
    if (correctionPayload) rowsWithCorrectionPayload += 1;

    if (!ALLOWED_DECISIONS.includes(decision)) {
      invalidDecisionRows += 1;
      if (tier) tier.invalidRows += 1;
      findings.push({ severity: 'blocker', code: 'reviewer_decision_invalid', message: `reviewerDecision must be one of ${ALLOWED_DECISIONS.join(', ')}.`, phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      continue;
    }

    if (!decision) {
      blankRows += 1;
      if (tier) tier.blankRows += 1;
      if (correctionPayload || row.reviewerNotes.trim() || row.reviewerName.trim() || row.reviewedAt.trim()) {
        invalidDecisionRows += 1;
        if (tier) tier.invalidRows += 1;
        findings.push({ severity: 'blocker', code: 'blank_decision_has_payload', message: 'Blank reviewerDecision rows must not contain corrections or reviewer metadata.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
      continue;
    }

    reviewedRows += 1;
    if (tier) tier.reviewedRows += 1;
    if (!hasReviewerMetadata(row)) {
      rowsMissingReviewerMetadata += 1;
      findings.push({ severity: 'blocker', code: 'reviewer_metadata_missing', message: 'Reviewed rows must include reviewerName and reviewedAt.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
    }

    if (decision === 'accept_as_is') {
      acceptAsIsRows += 1;
      if (tier) tier.acceptAsIsRows += 1;
      if (correctionPayload) {
        invalidDecisionRows += 1;
        if (tier) tier.invalidRows += 1;
        findings.push({ severity: 'blocker', code: 'accept_as_is_has_corrections', message: 'accept_as_is rows must not include corrected fields.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
    }
    if (decision === 'needs_correction') {
      needsCorrectionRows += 1;
      if (tier) tier.needsCorrectionRows += 1;
      if (!hasReviewerNotes(row)) {
        rowsMissingReviewerNotes += 1;
        findings.push({ severity: 'blocker', code: 'needs_correction_notes_missing', message: 'needs_correction rows must include reviewerNotes.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
      if (!correctionPayload) {
        invalidDecisionRows += 1;
        if (tier) tier.invalidRows += 1;
        findings.push({ severity: 'blocker', code: 'needs_correction_payload_missing', message: 'needs_correction rows must include at least one corrected field.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
    }
    if (decision === 'reject') {
      rejectRows += 1;
      if (tier) tier.rejectRows += 1;
      if (!hasReviewerNotes(row)) {
        rowsMissingReviewerNotes += 1;
        findings.push({ severity: 'blocker', code: 'reject_notes_missing', message: 'reject rows must include reviewerNotes.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
      if (correctionPayload) {
        invalidDecisionRows += 1;
        if (tier) tier.invalidRows += 1;
        findings.push({ severity: 'blocker', code: 'reject_has_corrections', message: 'reject rows must not include corrected fields.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
    }
    if (decision === 'skip') {
      skipRows += 1;
      if (tier) tier.skipRows += 1;
      if (!hasReviewerNotes(row)) {
        rowsMissingReviewerNotes += 1;
        findings.push({ severity: 'blocker', code: 'skip_notes_missing', message: 'skip rows must include reviewerNotes.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
      if (correctionPayload) {
        invalidDecisionRows += 1;
        if (tier) tier.invalidRows += 1;
        findings.push({ severity: 'blocker', code: 'skip_has_corrections', message: 'skip rows must not include corrected fields.', phraseId: row.phraseId, sourceQueueIndex: row.sourceQueueIndex });
      }
    }
  }

  let missingDecisionRows = 0;
  for (const row of priorityRows) {
    if (!seenDecisionKeys.has(rowKey(row))) missingDecisionRows += 1;
  }
  if (decisionRows.length !== priorityRows.length || missingDecisionRows > 0 || extraDecisionRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'decision_coverage_mismatch',
      message: `Decision file must contain exactly ${priorityRows.length} rows; found ${decisionRows.length}, missing ${missingDecisionRows}, extra ${extraDecisionRows}.`,
    });
  }
  if (duplicateDecisionRows > 0) {
    findings.push({ severity: 'blocker', code: 'duplicate_decision_rows', message: `${duplicateDecisionRows} decision rows are duplicated.` });
  }

  const tierProgress = Array.from(tierStats.values()).map((tier) => ({
    ...tier,
    percentReviewed: percent(tier.reviewedRows, tier.rows),
  }));
  const topUnreviewedRows = priorityRows
    .filter((row) => {
      const decision = decisionRows.find((candidate) => rowKey(candidate) === rowKey(row));
      return !decision || !decision.reviewerDecision.trim();
    })
    .slice(0, 25)
    .map((row, index) => ({
      rank: index + 1,
      sourceQueueIndex: row.sourceQueueIndex,
      lessonId: row.lessonId,
      phraseId: row.phraseId,
      priorityTier: row.priorityTier,
      priorityScore: row.priorityScore,
      englishBase: row.englishBase,
      proposedFrench: row.proposedFrench,
      priorityReasons: row.priorityReasons,
    }));

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForDecisionImport =
    blockers === 0 &&
    reviewedRows === priorityRows.length &&
    decisionRows.length === priorityRows.length &&
    blankRows === 0 &&
    invalidDecisionRows === 0;
  const report: Report = {
    schemaVersion: 'gustav-french-review-progress-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'HOLD' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    input: {
      priorityQueueJsonl: rel(repoRoot, priorityPath),
      decisionFilePath: rel(repoRoot, decisionPath),
      defaultDecisionTemplateUsed: path.resolve(decisionPath) === path.resolve(defaultDecisionPath),
    },
    hashes: {
      priorityQueueSha256: sha256(priorityPath),
      decisionFileSha256: sha256(decisionPath),
    },
    summary: {
      priorityRows: priorityRows.length,
      decisionRows: decisionRows.length,
      reviewedRows,
      blankRows,
      acceptAsIsRows,
      needsCorrectionRows,
      rejectRows,
      skipRows,
      invalidDecisionRows,
      rowsMissingReviewerMetadata,
      rowsMissingReviewerNotes,
      rowsWithCorrectionPayload,
      duplicateDecisionRows,
      missingDecisionRows,
      extraDecisionRows,
      identityMismatchRows,
      contextMismatchRows,
      activationStatusViolations,
      highPriorityReviewedRows: tierStats.get('high')!.reviewedRows,
      mediumPriorityReviewedRows: tierStats.get('medium')!.reviewedRows,
      lowPriorityReviewedRows: tierStats.get('low')!.reviewedRows,
      percentReviewed: percent(reviewedRows, priorityRows.length),
      blockers,
      warnings,
      readyForReviewer: blockers === 0,
      readyForDecisionImport,
      readyForApply: false,
      wouldModifyGeneratedLedgers: false,
      mayModifyProductionAppFiles: false,
    },
    tierProgress,
    topUnreviewedRows,
    safety: {
      dryRunOnly: true,
      reviewerDecisionsWrittenByThisScript: false,
      generatedLedgersModifiedByThisScript: false,
      productionAppFilesModifiedByThisScript: false,
      applyApprovalCreatedByThisScript: false,
    },
    findings,
  };

  ensureDir(auditsDir);
  const base = outName ? `french_review_progress_audit_${outName}` : 'french_review_progress_audit';
  const outJson = path.join(auditsDir, `${base}.json`);
  const outMd = path.join(auditsDir, `${base}.md`);
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV French review progress audit: ${report.status}`);
  console.log(`Reviewed rows: ${report.summary.reviewedRows}/${report.summary.priorityRows} (${report.summary.percentReviewed}%)`);
  console.log(`Tier reviewed high/medium/low: ${report.summary.highPriorityReviewedRows}/${report.summary.mediumPriorityReviewedRows}/${report.summary.lowPriorityReviewedRows}`);
  console.log(`Blank rows: ${report.summary.blankRows}`);
  console.log(`Invalid decision rows: ${report.summary.invalidDecisionRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
