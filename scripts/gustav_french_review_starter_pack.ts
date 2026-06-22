import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type DecisionTemplateRow = {
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
  currentReviewerStatus: 'needs_review';
  currentActivationStatus: 'blocked';
  reviewerDecision: '';
  correctedFrench: '';
  correctedQuizBlank: '';
  correctedQuizCorrect: '';
  correctedQuizDistractors: '';
  reviewerNotes: '';
  reviewerName: '';
  reviewedAt: '';
};

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
  priorityTier: 'high' | 'medium' | 'low';
  priorityScore: number;
  priorityReasons: string[];
  reviewFocus: string[];
  duplicateDisposition: string;
  duplicateReviewerNote: string;
  evidenceClaimIds: string[];
  requiredEvidence: string[];
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  phraseId?: string;
};

type Report = {
  schemaVersion: 'gustav-french-review-starter-pack-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    sourceDecisionRows: number;
    sourcePriorityRows: number;
    priorityOrderedDecisionRows: number;
    focusRows: number;
    highPriorityRows: number;
    mediumPriorityRows: number;
    lowPriorityRows: number;
    blankReviewerDecisionRows: number;
    rowsWithReviewerMetadata: number;
    rowsWithCorrectionPayload: number;
    duplicateDecisionRows: number;
    missingPriorityRows: number;
    focusHighRows: number;
    focusMediumRows: number;
    focusLowRows: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  hashes: Record<string, string>;
  safety: {
    reviewerDecisionsWritten: false;
    generatedLedgersModified: false;
    productionAppFilesModified: false;
    applyApprovalCreated: false;
    activationApprovedRowsCreated: false;
  };
  instructions: string[];
  findings: Finding[];
};

const DECISION_HEADERS = [
  'sourceQueueIndex',
  'batchId',
  'lessonId',
  'phraseId',
  'englishBase',
  'russianMeaning',
  'ukrainianMeaning',
  'proposedFrench',
  'quizBlank',
  'quizCorrect',
  'quizDistractors',
  'quizCategory',
  'currentReviewerStatus',
  'currentActivationStatus',
  'reviewerDecision',
  'correctedFrench',
  'correctedQuizBlank',
  'correctedQuizCorrect',
  'correctedQuizDistractors',
  'reviewerNotes',
  'reviewerName',
  'reviewedAt',
] as const;

const FOCUS_HEADERS = [
  'rank',
  'priorityTier',
  'priorityScore',
  'priorityReasons',
  'reviewFocus',
  'sourceQueueIndex',
  'batchId',
  'lessonId',
  'phraseId',
  'englishBase',
  'russianMeaning',
  'ukrainianMeaning',
  'proposedFrench',
  'quizBlank',
  'quizCorrect',
  'quizDistractors',
  'quizCategory',
  'duplicateDisposition',
  'duplicateReviewerNote',
  'requiredEvidence',
  'reviewerDecision',
  'correctedFrench',
  'correctedQuizBlank',
  'correctedQuizCorrect',
  'correctedQuizDistractors',
  'reviewerNotes',
  'reviewerName',
  'reviewedAt',
] as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
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

function key(row: Pick<DecisionTemplateRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function hasCorrectionPayload(row: DecisionTemplateRow): boolean {
  return Boolean(
    row.correctedFrench.trim() ||
    row.correctedQuizBlank.trim() ||
    row.correctedQuizCorrect.trim() ||
    row.correctedQuizDistractors.trim(),
  );
}

function hasReviewerMetadata(row: DecisionTemplateRow): boolean {
  return Boolean(row.reviewerNotes.trim() || row.reviewerName.trim() || row.reviewedAt.trim());
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function renderDecisionTsv(rows: DecisionTemplateRow[]): string {
  const lines = [DECISION_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push(DECISION_HEADERS.map((header) => tsvCell(row[header])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function focusRow(priority: PriorityRow, decision: DecisionTemplateRow, rank: number): Record<string, unknown> {
  return {
    rank,
    priorityTier: priority.priorityTier,
    priorityScore: priority.priorityScore,
    priorityReasons: priority.priorityReasons,
    reviewFocus: priority.reviewFocus,
    sourceQueueIndex: decision.sourceQueueIndex,
    batchId: decision.batchId,
    lessonId: decision.lessonId,
    phraseId: decision.phraseId,
    englishBase: decision.englishBase,
    russianMeaning: decision.russianMeaning,
    ukrainianMeaning: decision.ukrainianMeaning,
    proposedFrench: decision.proposedFrench,
    quizBlank: decision.quizBlank,
    quizCorrect: decision.quizCorrect,
    quizDistractors: decision.quizDistractors,
    quizCategory: decision.quizCategory,
    duplicateDisposition: priority.duplicateDisposition,
    duplicateReviewerNote: priority.duplicateReviewerNote,
    evidenceClaimIds: priority.evidenceClaimIds,
    requiredEvidence: priority.requiredEvidence,
    reviewerDecision: '',
    correctedFrench: '',
    correctedQuizBlank: '',
    correctedQuizCorrect: '',
    correctedQuizDistractors: '',
    reviewerNotes: '',
    reviewerName: '',
    reviewedAt: '',
    notImportableAsPartialFile: true,
  };
}

function renderFocusTsv(rows: Record<string, unknown>[]): string {
  const lines = [FOCUS_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push(FOCUS_HEADERS.map((header) => tsvCell(row[header])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(report: Report, focusRows: Record<string, unknown>[]): string {
  const lines = [
    '# GUSTAV French Review Starter Pack',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Source decision rows: ${report.summary.sourceDecisionRows}`,
    `- Source priority rows: ${report.summary.sourcePriorityRows}`,
    `- Priority-ordered decision rows: ${report.summary.priorityOrderedDecisionRows}`,
    `- Focus rows: ${report.summary.focusRows}`,
    `- High / medium / low rows: ${report.summary.highPriorityRows} / ${report.summary.mediumPriorityRows} / ${report.summary.lowPriorityRows}`,
    `- Blank reviewerDecision rows: ${report.summary.blankReviewerDecisionRows}`,
    `- Rows with reviewer metadata: ${report.summary.rowsWithReviewerMetadata}`,
    `- Rows with correction payload: ${report.summary.rowsWithCorrectionPayload}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## How To Use',
    '',
    ...report.instructions.map((instruction) => `- ${instruction}`),
    '',
    '## Focus Preview',
    '',
  ];

  for (const row of focusRows.slice(0, 12)) {
    lines.push(`- #${row.rank} \`${row.priorityTier}\` score ${row.priorityScore}: ${row.englishBase} -> ${row.proposedFrench} (${row.phraseId})`);
  }

  lines.push('', '## Outputs', '');
  Object.entries(report.outputs).forEach(([name, filePath]) => lines.push(`- ${name}: \`${filePath}\``));

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    report.findings.forEach((finding) => {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    });
  }

  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_french_review_starter_pack.ts --run <run-dir>');
  }
  const focusLimit = Number(argValue('--focus-limit') ?? '50');
  if (!Number.isInteger(focusLimit) || focusLimit < 1 || focusLimit > 500) {
    throw new Error('--focus-limit must be an integer between 1 and 500.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const outDir = path.join(reviewerDir, 'starter_pack');
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(outDir);
  ensureDir(auditsDir);

  const priorityPath = path.join(reviewerDir, 'french_reviewer_priority_queue.jsonl');
  const decisionTemplatePath = path.join(reviewerDir, 'french_review_decision_template.jsonl');
  const workOrderPath = path.join(auditsDir, 'french_reviewer_execution_work_order.json');
  const priorityOrderedJsonlPath = path.join(outDir, 'french_review_decision_template_priority_ordered.jsonl');
  const priorityOrderedTsvPath = path.join(outDir, 'french_review_decision_template_priority_ordered.tsv');
  const focusJsonlPath = path.join(outDir, `french_review_focus_top_${focusLimit}.jsonl`);
  const focusTsvPath = path.join(outDir, `french_review_focus_top_${focusLimit}.tsv`);
  const manifestJsonPath = path.join(outDir, 'french_review_starter_pack_manifest.json');
  const manifestMdPath = path.join(outDir, 'french_review_starter_pack_manifest.md');
  const auditJsonPath = path.join(auditsDir, 'french_review_starter_pack.json');
  const auditMdPath = path.join(auditsDir, 'french_review_starter_pack.md');

  const findings: Finding[] = [];
  for (const filePath of [priorityPath, decisionTemplatePath, workOrderPath]) {
    if (!fs.existsSync(filePath)) {
      findings.push({ severity: 'blocker', code: 'required_input_missing', message: 'Required starter-pack input is missing.', path: rel(repoRoot, filePath) });
    }
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    throw new Error(findings.map((finding) => finding.message).join('; '));
  }

  const priorityRows = parseJsonl<PriorityRow>(priorityPath);
  const decisionRows = parseJsonl<DecisionTemplateRow>(decisionTemplatePath);
  const decisionByKey = new Map(decisionRows.map((row) => [key(row), row]));
  const priorityOrderedDecisionRows: DecisionTemplateRow[] = [];
  const seenDecisionKeys = new Set<string>();
  let missingPriorityRows = 0;

  for (const priority of priorityRows) {
    const decision = decisionByKey.get(key(priority));
    if (!decision) {
      missingPriorityRows += 1;
      findings.push({ severity: 'blocker', code: 'priority_row_missing_decision_template', message: 'Priority row is missing from decision template.', phraseId: priority.phraseId });
      continue;
    }
    priorityOrderedDecisionRows.push(decision);
    seenDecisionKeys.add(key(decision));
  }

  const duplicateDecisionRows = priorityOrderedDecisionRows.length - new Set(priorityOrderedDecisionRows.map(key)).size;
  if (duplicateDecisionRows > 0) {
    findings.push({ severity: 'blocker', code: 'duplicate_priority_decision_rows', message: `${duplicateDecisionRows} priority-ordered decision rows are duplicated.` });
  }
  if (priorityOrderedDecisionRows.length !== decisionRows.length || seenDecisionKeys.size !== decisionRows.length) {
    findings.push({ severity: 'blocker', code: 'priority_ordered_coverage_mismatch', message: 'Priority-ordered decision template must cover all decision rows exactly once.' });
  }

  const focusRows = priorityRows.slice(0, focusLimit)
    .map((priority, index) => {
      const decision = decisionByKey.get(key(priority));
      return decision ? focusRow(priority, decision, index + 1) : null;
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));

  const blankReviewerDecisionRows = priorityOrderedDecisionRows.filter((row) => row.reviewerDecision === '').length;
  const rowsWithReviewerMetadata = priorityOrderedDecisionRows.filter(hasReviewerMetadata).length;
  const rowsWithCorrectionPayload = priorityOrderedDecisionRows.filter(hasCorrectionPayload).length;
  if (blankReviewerDecisionRows !== priorityOrderedDecisionRows.length || rowsWithReviewerMetadata > 0 || rowsWithCorrectionPayload > 0) {
    findings.push({ severity: 'blocker', code: 'starter_pack_not_blank', message: 'Starter pack must not contain reviewer decisions, metadata, or correction payload.' });
  }

  fs.writeFileSync(priorityOrderedJsonlPath, `${priorityOrderedDecisionRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  fs.writeFileSync(priorityOrderedTsvPath, renderDecisionTsv(priorityOrderedDecisionRows), 'utf8');
  fs.writeFileSync(focusJsonlPath, `${focusRows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
  fs.writeFileSync(focusTsvPath, renderFocusTsv(focusRows), 'utf8');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-french-review-starter-pack-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      sourceDecisionRows: decisionRows.length,
      sourcePriorityRows: priorityRows.length,
      priorityOrderedDecisionRows: priorityOrderedDecisionRows.length,
      focusRows: focusRows.length,
      highPriorityRows: priorityRows.filter((row) => row.priorityTier === 'high').length,
      mediumPriorityRows: priorityRows.filter((row) => row.priorityTier === 'medium').length,
      lowPriorityRows: priorityRows.filter((row) => row.priorityTier === 'low').length,
      blankReviewerDecisionRows,
      rowsWithReviewerMetadata,
      rowsWithCorrectionPayload,
      duplicateDecisionRows,
      missingPriorityRows,
      focusHighRows: focusRows.filter((row) => row.priorityTier === 'high').length,
      focusMediumRows: focusRows.filter((row) => row.priorityTier === 'medium').length,
      focusLowRows: focusRows.filter((row) => row.priorityTier === 'low').length,
      blockers,
      warnings,
      readyForReviewer: blockers === 0,
      readyForDecisionImport: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    inputs: {
      priorityQueueJsonl: rel(repoRoot, priorityPath),
      decisionTemplateJsonl: rel(repoRoot, decisionTemplatePath),
      reviewerExecutionWorkOrder: rel(repoRoot, workOrderPath),
    },
    outputs: {
      priorityOrderedDecisionJsonl: rel(repoRoot, priorityOrderedJsonlPath),
      priorityOrderedDecisionTsv: rel(repoRoot, priorityOrderedTsvPath),
      focusJsonl: rel(repoRoot, focusJsonlPath),
      focusTsv: rel(repoRoot, focusTsvPath),
      manifestJson: rel(repoRoot, manifestJsonPath),
      manifestMd: rel(repoRoot, manifestMdPath),
      auditJson: rel(repoRoot, auditJsonPath),
      auditMd: rel(repoRoot, auditMdPath),
    },
    hashes: {
      priorityQueueJsonl: sha256(priorityPath),
      decisionTemplateJsonl: sha256(decisionTemplatePath),
      priorityOrderedDecisionJsonl: sha256(priorityOrderedJsonlPath),
      priorityOrderedDecisionTsv: sha256(priorityOrderedTsvPath),
      focusJsonl: sha256(focusJsonlPath),
      focusTsv: sha256(focusTsvPath),
    },
    safety: {
      reviewerDecisionsWritten: false,
      generatedLedgersModified: false,
      productionAppFilesModified: false,
      applyApprovalCreated: false,
      activationApprovedRowsCreated: false,
    },
    instructions: [
      'Use the priority-ordered decision template as a safer review working copy when human review starts.',
      'Use the focus top-N files only as a reviewer guide; they are partial and intentionally not importable as a full decision file.',
      'Do not write reviewer decisions into generated ledgers or production app files.',
      'After real reviewer decisions are added to a full 1600-row decision file, run the decision import dry-run with --decisions.',
      'This starter pack keeps every reviewerDecision blank and does not approve decision import or app apply.',
    ],
    findings,
  };

  fs.writeFileSync(manifestJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(manifestMdPath, renderMarkdown(report, focusRows), 'utf8');
  fs.writeFileSync(auditJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(auditMdPath, renderMarkdown(report, focusRows), 'utf8');

  console.log(`GUSTAV French review starter pack: ${report.status}`);
  console.log(`Priority-ordered decision rows: ${report.summary.priorityOrderedDecisionRows}`);
  console.log(`Focus rows: ${report.summary.focusRows}`);
  console.log(`Priority rows high/medium/low: ${report.summary.highPriorityRows}/${report.summary.mediumPriorityRows}/${report.summary.lowPriorityRows}`);
  console.log(`Blank reviewerDecision rows: ${report.summary.blankReviewerDecisionRows}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, auditJsonPath)}`);

  if (report.status !== 'PASS') process.exitCode = 1;
}

main();
