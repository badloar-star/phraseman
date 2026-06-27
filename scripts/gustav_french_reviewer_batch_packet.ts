import * as crypto from 'node:crypto';
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
  reviewerDecision: string;
  reviewerNotes: string;
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  batchId?: string;
};

type ReviewBatch = {
  batchId: string;
  lessonId: number;
  queueStartIndex: number;
  queueEndIndex: number;
  rowCount: number;
  firstPhraseId: string;
  lastPhraseId: string;
  phraseIds: string[];
  rowsWithFrench: number;
  rowsWithValidQuiz: number;
  rowsNeedingReview: number;
  rowsBlocked: number;
  reviewerStatus: 'ready_for_llm_official_source_review';
  activationStatus: 'blocked';
  reviewerDecisionRequired: true;
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-batch-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    batches: number;
    rows: number;
    minRowsPerBatch: number;
    maxRowsPerBatch: number;
    rowsWithFrench: number;
    rowsWithValidQuiz: number;
    rowsNeedingReview: number;
    rowsBlocked: number;
    qaBlockers: number;
    integrityBlockers: number;
    applyBlockers: number;
    findingsBlockers: number;
    findingsWarnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceArtifacts: {
    reviewerQueueJsonl: string;
    reviewerQueueTsv: string;
    reviewerHandoffPacket: string;
    reviewerHandoffIntegrityAudit: string;
    queueJsonlSha256: string;
  };
  outputArtifacts: {
    reviewBatchesJson: string;
    reviewBatchesMd: string;
    batchPacketJson: string;
    batchPacketMd: string;
  };
  batches: ReviewBatch[];
  reviewerInstructions: string[];
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

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function parseJsonl<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  return content.split(/\r?\n/).map((line) => JSON.parse(line) as T);
}

function phraseOrder(phraseId: string): number {
  const match = /^lesson\d+_phrase_(\d+)$/.exec(phraseId);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function hasValidQuiz(row: QueueRow): boolean {
  return Boolean(
    row.quizBlank.includes('___') &&
    row.quizCorrect.trim() &&
    row.quizDistractors.length === 3 &&
    row.quizCategory.trim(),
  );
}

function renderBatchesMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Review Batches',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    `Batches: ${report.summary.batches}`,
    '',
    `Rows: ${report.summary.rows}`,
    '',
    '## Batches',
    '',
  ];
  for (const batch of report.batches) {
    lines.push(`- \`${batch.batchId}\`: lesson ${batch.lessonId}, rows ${batch.rowCount}, queue ${batch.queueStartIndex}-${batch.queueEndIndex}, ${batch.firstPhraseId}..${batch.lastPhraseId}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- These batches are navigation for LLM official-source review only.');
  lines.push('- They do not accept rows and do not approve app apply.');
  lines.push('');
  return lines.join('\n');
}

function renderPacketMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Batch Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Batches: ${report.summary.batches}`,
    `- Rows: ${report.summary.rows}`,
    `- Min rows per batch: ${report.summary.minRowsPerBatch}`,
    `- Max rows per batch: ${report.summary.maxRowsPerBatch}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows with valid quiz: ${report.summary.rowsWithValidQuiz}`,
    `- Rows needing review: ${report.summary.rowsNeedingReview}`,
    `- Rows blocked: ${report.summary.rowsBlocked}`,
    `- QA blockers: ${report.summary.qaBlockers}`,
    `- Integrity blockers: ${report.summary.integrityBlockers}`,
    `- Apply blockers: ${report.summary.applyBlockers}`,
    `- Findings blockers: ${report.summary.findingsBlockers}`,
    `- Findings warnings: ${report.summary.findingsWarnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Output Artifacts',
    '',
    `- Review batches JSON: \`${report.outputArtifacts.reviewBatchesJson}\``,
    `- Review batches MD: \`${report.outputArtifacts.reviewBatchesMd}\``,
    `- Batch packet JSON: \`${report.outputArtifacts.batchPacketJson}\``,
    `- Batch packet MD: \`${report.outputArtifacts.batchPacketMd}\``,
    '',
    '## Instructions',
    '',
  ];
  for (const instruction of report.reviewerInstructions) {
    lines.push(`- ${instruction}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.batchId ? ` (${finding.batchId})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- Batch packet is reviewer workflow metadata only.');
  lines.push('- No reviewer decisions are written.');
  lines.push('- No generated rows are accepted.');
  lines.push('- No production app files are modified.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_batch_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const queueJsonlPath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const queueTsvPath = path.join(reviewerDir, 'french_reviewer_queue.tsv');
  const handoffPath = path.join(auditsDir, 'french_reviewer_handoff_packet.json');
  const integrityPath = path.join(auditsDir, 'french_reviewer_handoff_integrity_audit.json');
  const translationQaPath = path.join(auditsDir, 'french_translation_qa_audit.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const findings: Finding[] = [];

  const handoff = asRecord(readJson<unknown>(handoffPath));
  const integrity = asRecord(readJson<unknown>(integrityPath));
  const translationQa = asRecord(readJson<unknown>(translationQaPath));
  const readiness = asRecord(readJson<unknown>(readinessPath));
  const handoffSummary = asRecord(handoff.summary);
  const integritySummary = asRecord(integrity.summary);
  const translationSummary = asRecord(translationQa.summary);
  const readinessSummary = asRecord(readiness.summary);

  const qaBlockers = Number(translationSummary.blockers ?? 0);
  const integrityBlockers = Number(integritySummary.blockers ?? 0);
  const applyBlockers = Number(readinessSummary.applyBlockers ?? 0);
  if (handoffSummary.readyForReviewer !== true) {
    findings.push({
      severity: 'blocker',
      code: 'handoff_not_ready_for_reviewer',
      message: 'Reviewer handoff packet is not ready for reviewer.',
    });
  }
  if (integritySummary.readyForReviewer !== true || integrityBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'handoff_integrity_not_ready',
      message: 'Reviewer handoff integrity audit is not ready for reviewer.',
    });
  }
  if (qaBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'translation_qa_blockers_present',
      message: `Translation QA has ${qaBlockers} blockers.`,
    });
  }

  const rows = parseJsonl<QueueRow>(queueJsonlPath);
  const byLesson = new Map<number, QueueRow[]>();
  rows.forEach((row) => {
    const lessonRows = byLesson.get(row.lessonId) ?? [];
    lessonRows.push(row);
    byLesson.set(row.lessonId, lessonRows);
  });

  const batches: ReviewBatch[] = [];
  let queueIndex = 1;
  for (const lessonId of Array.from(byLesson.keys()).sort((a, b) => a - b)) {
    const lessonRows = (byLesson.get(lessonId) ?? []).sort((a, b) => phraseOrder(a.phraseId) - phraseOrder(b.phraseId));
    const batchId = `fr_lesson_${String(lessonId).padStart(2, '0')}_review_batch`;
    if (lessonRows.length !== 50) {
      findings.push({
        severity: 'blocker',
        code: 'review_batch_row_count_invalid',
        message: `Expected 50 rows for lesson ${lessonId}, found ${lessonRows.length}.`,
        batchId,
      });
    }
    batches.push({
      batchId,
      lessonId,
      queueStartIndex: queueIndex,
      queueEndIndex: queueIndex + lessonRows.length - 1,
      rowCount: lessonRows.length,
      firstPhraseId: lessonRows[0]?.phraseId ?? '',
      lastPhraseId: lessonRows[lessonRows.length - 1]?.phraseId ?? '',
      phraseIds: lessonRows.map((row) => row.phraseId),
      rowsWithFrench: lessonRows.filter((row) => row.proposedFrench.trim()).length,
      rowsWithValidQuiz: lessonRows.filter(hasValidQuiz).length,
      rowsNeedingReview: lessonRows.filter((row) => row.currentReviewerStatus === 'needs_review').length,
      rowsBlocked: lessonRows.filter((row) => row.currentActivationStatus === 'blocked').length,
      reviewerStatus: 'ready_for_llm_official_source_review',
      activationStatus: 'blocked',
      reviewerDecisionRequired: true,
    });
    queueIndex += lessonRows.length;
  }

  const rowsWithFrench = batches.reduce((sum, batch) => sum + batch.rowsWithFrench, 0);
  const rowsWithValidQuiz = batches.reduce((sum, batch) => sum + batch.rowsWithValidQuiz, 0);
  const rowsNeedingReview = batches.reduce((sum, batch) => sum + batch.rowsNeedingReview, 0);
  const rowsBlocked = batches.reduce((sum, batch) => sum + batch.rowsBlocked, 0);
  if (batches.length !== 32) {
    findings.push({
      severity: 'blocker',
      code: 'review_batch_count_invalid',
      message: `Expected 32 lesson batches, found ${batches.length}.`,
    });
  }
  if (rows.length !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'review_queue_row_count_invalid',
      message: `Expected 1600 reviewer queue rows, found ${rows.length}.`,
    });
  }

  const findingsBlockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const findingsWarnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    findingsBlockers === 0 &&
    batches.length === 32 &&
    rows.length === 1600 &&
    rowsWithFrench === rows.length &&
    rowsWithValidQuiz === rows.length &&
    rowsNeedingReview === rows.length &&
    rowsBlocked === rows.length;

  const outBatchesJson = path.join(reviewerDir, 'french_review_batches.json');
  const outBatchesMd = path.join(reviewerDir, 'french_review_batches.md');
  const outPacketJson = path.join(auditsDir, 'french_reviewer_batch_packet.json');
  const outPacketMd = path.join(auditsDir, 'french_reviewer_batch_packet.md');

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-batch-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      batches: batches.length,
      rows: rows.length,
      minRowsPerBatch: Math.min(...batches.map((batch) => batch.rowCount)),
      maxRowsPerBatch: Math.max(...batches.map((batch) => batch.rowCount)),
      rowsWithFrench,
      rowsWithValidQuiz,
      rowsNeedingReview,
      rowsBlocked,
      qaBlockers,
      integrityBlockers,
      applyBlockers,
      findingsBlockers,
      findingsWarnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceArtifacts: {
      reviewerQueueJsonl: artifactPath(repoRoot, queueJsonlPath),
      reviewerQueueTsv: artifactPath(repoRoot, queueTsvPath),
      reviewerHandoffPacket: artifactPath(repoRoot, handoffPath),
      reviewerHandoffIntegrityAudit: artifactPath(repoRoot, integrityPath),
      queueJsonlSha256: sha256(queueJsonlPath),
    },
    outputArtifacts: {
      reviewBatchesJson: artifactPath(repoRoot, outBatchesJson),
      reviewBatchesMd: artifactPath(repoRoot, outBatchesMd),
      batchPacketJson: artifactPath(repoRoot, outPacketJson),
      batchPacketMd: artifactPath(repoRoot, outPacketMd),
    },
    batches,
    reviewerInstructions: [
      'Review one lesson batch at a time.',
      'For each row, check proposedFrench against English and RU/UK meanings.',
      'For each row, check quizBlank, quizCorrect, quizDistractors, and quizCategory.',
      'Write reviewer decisions only in a separate reviewed copy or future explicit review artifact.',
      'Do not treat this batch packet as app apply approval.',
    ],
    findings,
  };

  ensureDir(reviewerDir);
  ensureDir(auditsDir);
  fs.writeFileSync(outBatchesJson, `${JSON.stringify({ runId, generatedAt: report.generatedAt, batches }, null, 2)}\n`);
  fs.writeFileSync(outBatchesMd, renderBatchesMarkdown(report));
  fs.writeFileSync(outPacketJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outPacketMd, renderPacketMarkdown(report));

  console.log(`GUSTAV French reviewer batch packet: ${report.status}`);
  console.log(`Batches: ${report.summary.batches}`);
  console.log(`Rows: ${report.summary.rows}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Findings blockers: ${report.summary.findingsBlockers}`);
  console.log(`Apply blockers: ${report.summary.applyBlockers}`);
  console.log(`Report: ${artifactPath(repoRoot, outPacketJson)}`);

  if (findingsBlockers > 0) process.exit(1);
}

void main();
