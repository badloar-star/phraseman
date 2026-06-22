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
};

type BatchFile = {
  batchId: string;
  lessonId: number;
  rowCount: number;
  firstPhraseId: string;
  lastPhraseId: string;
  jsonlPath: string;
  jsonlSha256: string;
  tsvPath: string;
  tsvSha256: string;
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  batchId?: string;
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-batch-files-v0';
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
    jsonlBatchFiles: number;
    tsvBatchFiles: number;
    rowsInBatchFiles: number;
    rowsWithFrench: number;
    rowsWithValidQuiz: number;
    rowsNeedingReview: number;
    rowsBlocked: number;
    batchPacketBlockers: number;
    findingsBlockers: number;
    findingsWarnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceArtifacts: {
    reviewerQueueJsonl: string;
    reviewerBatchPacket: string;
    sourceQueueSha256: string;
  };
  outputArtifacts: {
    batchFilesDir: string;
    manifestJson: string;
    manifestMd: string;
    packetJson: string;
    packetMd: string;
  };
  files: BatchFile[];
  findings: Finding[];
};

const TSV_HEADERS = [
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

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function renderTsv(rows: QueueRow[]): string {
  const lines = [TSV_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push(TSV_HEADERS.map((header) => tsvCell(row[header as keyof QueueRow])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function hasValidQuiz(row: QueueRow): boolean {
  return Boolean(
    row.quizBlank.includes('___') &&
    row.quizCorrect.trim() &&
    row.quizDistractors.length === 3 &&
    row.quizCategory.trim(),
  );
}

function renderManifestMd(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Batch Files Manifest',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    `Batches: ${report.summary.batches}`,
    '',
    `Rows: ${report.summary.rows}`,
    '',
    '## Files',
    '',
  ];
  for (const file of report.files) {
    lines.push(`- \`${file.batchId}\`: rows ${file.rowCount}, \`${file.jsonlPath}\`, \`${file.tsvPath}\``);
  }
  lines.push('', '## Safety', '');
  lines.push('- These files are reviewer workspace inputs only.');
  lines.push('- They do not accept rows and do not approve app apply.');
  lines.push('');
  return lines.join('\n');
}

function renderPacketMd(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Batch Files Packet',
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
    `- JSONL batch files: ${report.summary.jsonlBatchFiles}`,
    `- TSV batch files: ${report.summary.tsvBatchFiles}`,
    `- Rows in batch files: ${report.summary.rowsInBatchFiles}`,
    `- Rows with French: ${report.summary.rowsWithFrench}`,
    `- Rows with valid quiz: ${report.summary.rowsWithValidQuiz}`,
    `- Rows needing review: ${report.summary.rowsNeedingReview}`,
    `- Rows blocked: ${report.summary.rowsBlocked}`,
    `- Batch packet blockers: ${report.summary.batchPacketBlockers}`,
    `- Findings blockers: ${report.summary.findingsBlockers}`,
    `- Findings warnings: ${report.summary.findingsWarnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Output Artifacts',
    '',
    `- Batch files dir: \`${report.outputArtifacts.batchFilesDir}\``,
    `- Manifest JSON: \`${report.outputArtifacts.manifestJson}\``,
    `- Manifest MD: \`${report.outputArtifacts.manifestMd}\``,
    `- Packet JSON: \`${report.outputArtifacts.packetJson}\``,
    `- Packet MD: \`${report.outputArtifacts.packetMd}\``,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.batchId ? ` (${finding.batchId})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- Batch files are derived from the checked reviewer queue.');
  lines.push('- No reviewer decisions are written.');
  lines.push('- No generated rows are accepted.');
  lines.push('- No production app files are modified.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_batch_files.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const batchFilesDir = path.join(reviewerDir, 'batches');
  const queueJsonlPath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const batchPacketPath = path.join(auditsDir, 'french_reviewer_batch_packet.json');
  const findings: Finding[] = [];

  const batchPacket = asRecord(readJson<unknown>(batchPacketPath));
  const batchPacketSummary = asRecord(batchPacket.summary);
  const batchPacketBlockers = Number(batchPacketSummary.findingsBlockers ?? 0);
  if (batchPacketSummary.readyForReviewer !== true || batchPacketBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'reviewer_batch_packet_not_ready',
      message: 'Reviewer batch packet must be ready before writing per-batch files.',
    });
  }

  const batches = (batchPacket.batches as ReviewBatch[] | undefined) ?? [];
  const queueRows = parseJsonl<QueueRow>(queueJsonlPath);
  const rowsByPhraseId = new Map(queueRows.map((row) => [row.phraseId, row]));
  const files: BatchFile[] = [];
  let rowsInBatchFiles = 0;
  let rowsWithFrench = 0;
  let rowsWithValidQuiz = 0;
  let rowsNeedingReview = 0;
  let rowsBlocked = 0;

  ensureDir(batchFilesDir);

  for (const batch of batches) {
    const batchRows = batch.phraseIds.map((phraseId) => rowsByPhraseId.get(phraseId)).filter((row): row is QueueRow => Boolean(row));
    const expectedBatchRows = queueRows.slice(batch.queueStartIndex - 1, batch.queueEndIndex);
    const expectedPhraseIds = expectedBatchRows.map((row) => row.phraseId);
    if (batchRows.length !== batch.rowCount || expectedPhraseIds.join('|') !== batch.phraseIds.join('|')) {
      findings.push({
        severity: 'blocker',
        code: 'batch_phrase_mapping_mismatch',
        message: 'Batch phrase ids do not match queue range.',
        batchId: batch.batchId,
      });
    }
    if (batchRows.length !== 50) {
      findings.push({
        severity: 'blocker',
        code: 'batch_row_count_invalid',
        message: `Expected 50 rows, found ${batchRows.length}.`,
        batchId: batch.batchId,
      });
    }

    const jsonlPath = path.join(batchFilesDir, `${batch.batchId}.jsonl`);
    const tsvPath = path.join(batchFilesDir, `${batch.batchId}.tsv`);
    fs.writeFileSync(jsonlPath, `${batchRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
    fs.writeFileSync(tsvPath, renderTsv(batchRows));

    rowsInBatchFiles += batchRows.length;
    rowsWithFrench += batchRows.filter((row) => row.proposedFrench.trim()).length;
    rowsWithValidQuiz += batchRows.filter(hasValidQuiz).length;
    rowsNeedingReview += batchRows.filter((row) => row.currentReviewerStatus === 'needs_review').length;
    rowsBlocked += batchRows.filter((row) => row.currentActivationStatus === 'blocked').length;
    files.push({
      batchId: batch.batchId,
      lessonId: batch.lessonId,
      rowCount: batchRows.length,
      firstPhraseId: batchRows[0]?.phraseId ?? '',
      lastPhraseId: batchRows[batchRows.length - 1]?.phraseId ?? '',
      jsonlPath: artifactPath(repoRoot, jsonlPath),
      jsonlSha256: sha256(jsonlPath),
      tsvPath: artifactPath(repoRoot, tsvPath),
      tsvSha256: sha256(tsvPath),
    });
  }

  if (batches.length !== 32) {
    findings.push({
      severity: 'blocker',
      code: 'batch_count_invalid',
      message: `Expected 32 batches, found ${batches.length}.`,
    });
  }
  if (queueRows.length !== 1600 || rowsInBatchFiles !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'batch_file_total_rows_invalid',
      message: `Expected 1600 queue rows and 1600 batch rows, found queue=${queueRows.length}, batchFiles=${rowsInBatchFiles}.`,
    });
  }

  const findingsBlockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const findingsWarnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    findingsBlockers === 0 &&
    files.length === 32 &&
    rowsInBatchFiles === 1600 &&
    rowsWithFrench === 1600 &&
    rowsWithValidQuiz === 1600 &&
    rowsNeedingReview === 1600 &&
    rowsBlocked === 1600;

  const outManifestJson = path.join(reviewerDir, 'french_review_batch_files_manifest.json');
  const outManifestMd = path.join(reviewerDir, 'french_review_batch_files_manifest.md');
  const outPacketJson = path.join(auditsDir, 'french_reviewer_batch_files_packet.json');
  const outPacketMd = path.join(auditsDir, 'french_reviewer_batch_files_packet.md');

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-batch-files-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      batches: files.length,
      rows: queueRows.length,
      jsonlBatchFiles: files.length,
      tsvBatchFiles: files.length,
      rowsInBatchFiles,
      rowsWithFrench,
      rowsWithValidQuiz,
      rowsNeedingReview,
      rowsBlocked,
      batchPacketBlockers,
      findingsBlockers,
      findingsWarnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceArtifacts: {
      reviewerQueueJsonl: artifactPath(repoRoot, queueJsonlPath),
      reviewerBatchPacket: artifactPath(repoRoot, batchPacketPath),
      sourceQueueSha256: sha256(queueJsonlPath),
    },
    outputArtifacts: {
      batchFilesDir: artifactPath(repoRoot, batchFilesDir),
      manifestJson: artifactPath(repoRoot, outManifestJson),
      manifestMd: artifactPath(repoRoot, outManifestMd),
      packetJson: artifactPath(repoRoot, outPacketJson),
      packetMd: artifactPath(repoRoot, outPacketMd),
    },
    files,
    findings,
  };

  fs.writeFileSync(outManifestJson, `${JSON.stringify({
    schemaVersion: 'gustav-french-review-batch-files-manifest-v0',
    runId,
    generatedAt: report.generatedAt,
    sourceQueueSha256: report.sourceArtifacts.sourceQueueSha256,
    files,
  }, null, 2)}\n`);
  fs.writeFileSync(outManifestMd, renderManifestMd(report));
  fs.writeFileSync(outPacketJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outPacketMd, renderPacketMd(report));

  console.log(`GUSTAV French reviewer batch files packet: ${report.status}`);
  console.log(`Batches: ${report.summary.batches}`);
  console.log(`JSONL batch files: ${report.summary.jsonlBatchFiles}`);
  console.log(`TSV batch files: ${report.summary.tsvBatchFiles}`);
  console.log(`Rows in batch files: ${report.summary.rowsInBatchFiles}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Findings blockers: ${report.summary.findingsBlockers}`);
  console.log(`Report: ${artifactPath(repoRoot, outPacketJson)}`);

  if (findingsBlockers > 0) process.exit(1);
}

void main();
