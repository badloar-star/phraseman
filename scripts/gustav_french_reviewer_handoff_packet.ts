import * as fs from 'node:fs';
import * as path from 'node:path';

type GeneratedRow = {
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  wordsFr: Array<{
    text: string;
    correct: string;
    distractors: string[];
    category: string;
  }>;
  reviewerStatus: string;
  activationStatus: string;
};

type LessonLedger = {
  lessonId: number;
  activationStatus: string;
  activeAppSeedAllowed: boolean;
  rows: GeneratedRow[];
};

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
  currentReviewerStatus: 'needs_review';
  currentActivationStatus: 'blocked';
  reviewerDecision: '';
  reviewerNotes: '';
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-handoff-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    sourceLessons: number;
    generatedLedgers: number;
    rows: number;
    rowsWithFrench: number;
    rowsWithValidWordsFr: number;
    rowsNeedingReview: number;
    activationApprovedRows: number;
    duplicateFrenchValues: number;
    duplicateReviewerAttentionValues: number;
    qaBlockers: number;
    qaWarnings: number;
    generationBlockers: number;
    applyBlockers: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  inputReports: Array<{
    path: string;
    status: string;
  }>;
  outputArtifacts: {
    reviewerQueueJsonl: string;
    reviewerQueueTsv: string;
    handoffJson: string;
    handoffMd: string;
  };
  perLesson: Array<{
    lessonId: number;
    rows: number;
    rowsWithFrench: number;
    rowsWithValidWordsFr: number;
    rowsNeedingReview: number;
  }>;
  reviewerInstructions: string[];
  remainingBlockers: string[];
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

function lessonIdFromFile(filePath: string): number {
  const match = /lesson(\d+)_row_ledger\.json$/.exec(path.basename(filePath));
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function queueRowsFromLedger(ledger: LessonLedger): QueueRow[] {
  return ledger.rows.map((row) => {
    const firstWord = row.wordsFr[0] ?? {
      text: '',
      correct: '',
      distractors: [],
      category: '',
    };
    return {
      lessonId: ledger.lessonId,
      phraseId: row.phraseId,
      englishBase: row.englishBase,
      russianMeaning: row.russianMeaning,
      ukrainianMeaning: row.ukrainianMeaning,
      proposedFrench: row.proposedFrench,
      quizBlank: firstWord.text,
      quizCorrect: firstWord.correct,
      quizDistractors: firstWord.distractors,
      quizCategory: firstWord.category,
      currentReviewerStatus: 'needs_review',
      currentActivationStatus: 'blocked',
      reviewerDecision: '',
      reviewerNotes: '',
    };
  });
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function renderQueueTsv(rows: QueueRow[]): string {
  const headers = [
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
    'reviewerNotes',
  ];
  const lines = [headers.join('\t')];
  for (const row of rows) {
    lines.push(headers.map((header) => tsvCell(row[header as keyof QueueRow])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Handoff Packet',
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
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows with valid wordsFr: ${report.summary.rowsWithValidWordsFr}`,
    `- Rows needing review: ${report.summary.rowsNeedingReview}`,
    `- Activation approved rows: ${report.summary.activationApprovedRows}`,
    `- Duplicate French values: ${report.summary.duplicateFrenchValues}`,
    `- Duplicate reviewer attention values: ${report.summary.duplicateReviewerAttentionValues}`,
    `- QA blockers: ${report.summary.qaBlockers}`,
    `- QA warnings: ${report.summary.qaWarnings}`,
    `- Generation blockers: ${report.summary.generationBlockers}`,
    `- Apply blockers: ${report.summary.applyBlockers}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Reviewer Queue',
    '',
    `- JSONL: \`${report.outputArtifacts.reviewerQueueJsonl}\``,
    `- TSV: \`${report.outputArtifacts.reviewerQueueTsv}\``,
    '',
    '## Instructions',
    '',
  ];

  for (const instruction of report.reviewerInstructions) {
    lines.push(`- ${instruction}`);
  }

  lines.push('', '## Remaining Blockers', '');
  for (const blocker of report.remainingBlockers) {
    lines.push(`- ${blocker}`);
  }

  lines.push('', '## Per Lesson', '');
  for (const lesson of report.perLesson) {
    lines.push(`- Lesson ${lesson.lessonId}: rows ${lesson.rows}, French ${lesson.rowsWithFrench}, valid wordsFr ${lesson.rowsWithValidWordsFr}, needs review ${lesson.rowsNeedingReview}`);
  }

  lines.push('', '## Input Reports', '');
  for (const input of report.inputReports) {
    lines.push(`- \`${input.path}\`: \`${input.status}\``);
  }

  lines.push('', '## Safety', '');
  lines.push('- This handoff packet is reviewer evidence only.');
  lines.push('- It does not accept generated rows.');
  lines.push('- It does not approve or perform app apply.');
  lines.push('- It does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_handoff_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const generatedDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');

  const translationQaPath = path.join(auditsDir, 'french_translation_qa_audit.json');
  const generatedContentPath = path.join(auditsDir, 'generated_content_audit.json');
  const duplicatePacketPath = path.join(auditsDir, 'french_duplicate_translation_review_packet.json');
  const readinessPacketPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const runValidatorPath = path.join(auditsDir, 'run_validator_report.json');

  const translationQa = asRecord(readJson<unknown>(translationQaPath));
  const generatedContent = asRecord(readJson<unknown>(generatedContentPath));
  const duplicatePacket = asRecord(readJson<unknown>(duplicatePacketPath));
  const readinessPacket = asRecord(readJson<unknown>(readinessPacketPath));
  const runValidator = asRecord(readJson<unknown>(runValidatorPath));

  const translationSummary = asRecord(translationQa.summary);
  const generatedSummary = asRecord(generatedContent.summary);
  const duplicateSummary = asRecord(duplicatePacket.summary);
  const readinessSummary = asRecord(readinessPacket.summary);
  const validatorSummary = asRecord(runValidator.summary);

  const ledgerFiles = fs.readdirSync(generatedDir)
    .filter((file) => file.endsWith('_row_ledger.json'))
    .map((file) => path.join(generatedDir, file))
    .sort((a, b) => lessonIdFromFile(a) - lessonIdFromFile(b));

  const queueRows: QueueRow[] = [];
  const perLesson: Report['perLesson'] = [];
  let activationApprovedRows = 0;

  for (const filePath of ledgerFiles) {
    const ledger = readJson<LessonLedger>(filePath);
    const rows = queueRowsFromLedger(ledger);
    queueRows.push(...rows);
    activationApprovedRows += ledger.rows.filter((row) => row.activationStatus !== 'blocked' || row.reviewerStatus !== 'needs_review').length;
    perLesson.push({
      lessonId: ledger.lessonId,
      rows: ledger.rows.length,
      rowsWithFrench: ledger.rows.filter((row) => row.proposedFrench.trim()).length,
      rowsWithValidWordsFr: ledger.rows.filter((row) => row.wordsFr.length > 0).length,
      rowsNeedingReview: ledger.rows.filter((row) => row.reviewerStatus === 'needs_review').length,
    });
  }

  const qaBlockers = Number(translationSummary.blockers ?? 0);
  const duplicateReviewerAttentionValues = Number(duplicateSummary.reviewerAttentionValues ?? 0);
  const generationBlockers = Number(readinessSummary.generationBlockers ?? 0);
  const applyBlockers = Number(readinessSummary.applyBlockers ?? 0);
  const readyForReviewer =
    translationSummary.readyForReviewer === true &&
    generatedSummary.readyForReviewer === true &&
    duplicateSummary.readyForReviewer === true &&
    Number(validatorSummary.blockers ?? 0) === 0 &&
    qaBlockers === 0 &&
    duplicateReviewerAttentionValues === 0 &&
    generationBlockers === 0 &&
    activationApprovedRows === 0;

  const outJson = path.join(auditsDir, 'french_reviewer_handoff_packet.json');
  const outMd = path.join(auditsDir, 'french_reviewer_handoff_packet.md');
  const outQueueJsonl = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const outQueueTsv = path.join(reviewerDir, 'french_reviewer_queue.tsv');

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-handoff-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      sourceLessons: Number(translationSummary.sourceLessons ?? 0),
      generatedLedgers: ledgerFiles.length,
      rows: queueRows.length,
      rowsWithFrench: Number(translationSummary.rowsWithFrench ?? 0),
      rowsWithValidWordsFr: Number(translationSummary.rowsWithValidWordsFr ?? 0),
      rowsNeedingReview: Number(translationSummary.rowsWithReviewerNeedsReview ?? 0),
      activationApprovedRows,
      duplicateFrenchValues: Number(duplicateSummary.duplicateFrenchValues ?? 0),
      duplicateReviewerAttentionValues,
      qaBlockers,
      qaWarnings: Number(translationSummary.warnings ?? 0),
      generationBlockers,
      applyBlockers,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    inputReports: [
      { path: artifactPath(repoRoot, translationQaPath), status: String(translationQa.status ?? 'unknown') },
      { path: artifactPath(repoRoot, generatedContentPath), status: String(generatedContent.status ?? 'unknown') },
      { path: artifactPath(repoRoot, duplicatePacketPath), status: String(duplicatePacket.status ?? 'unknown') },
      { path: artifactPath(repoRoot, readinessPacketPath), status: String(readinessPacket.status ?? 'unknown') },
      { path: artifactPath(repoRoot, runValidatorPath), status: String(runValidator.status ?? 'unknown') },
    ],
    outputArtifacts: {
      reviewerQueueJsonl: artifactPath(repoRoot, outQueueJsonl),
      reviewerQueueTsv: artifactPath(repoRoot, outQueueTsv),
      handoffJson: artifactPath(repoRoot, outJson),
      handoffMd: artifactPath(repoRoot, outMd),
    },
    perLesson,
    reviewerInstructions: [
      'Review proposedFrench against englishBase and RU/UK meanings.',
      'Review the first wordsFr quiz item for blank placement, correct answer, distractor quality, and category.',
      'Use reviewerDecision and reviewerNotes in the queue as reviewer workspace only; this packet does not activate rows.',
      'Do not treat this packet as production apply approval.',
    ],
    remainingBlockers: [
      'All rows remain reviewerStatus=needs_review.',
      'All rows remain activationStatus=blocked.',
      'Production apply still requires explicit approval and a separate apply transaction.',
      `Current apply blockers reported by readiness packet: ${applyBlockers}.`,
    ],
  };

  ensureDir(auditsDir);
  ensureDir(reviewerDir);
  fs.writeFileSync(outQueueJsonl, `${queueRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  fs.writeFileSync(outQueueTsv, renderQueueTsv(queueRows));
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French reviewer handoff packet: ${report.status}`);
  console.log(`Rows: ${report.summary.rows}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`QA blockers: ${report.summary.qaBlockers}`);
  console.log(`Generation blockers: ${report.summary.generationBlockers}`);
  console.log(`Apply blockers: ${report.summary.applyBlockers}`);
  console.log(`Queue: ${artifactPath(repoRoot, outQueueTsv)}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (!readyForReviewer) {
    process.exit(1);
  }
}

void main();
