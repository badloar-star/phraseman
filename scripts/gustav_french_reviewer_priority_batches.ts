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

type PriorityRow = QueueRow & {
  sourceQueueIndex: number;
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
  batchId?: string;
  path?: string;
};

type PriorityBatchFile = {
  batchId: string;
  batchIndex: number;
  rowCount: number;
  highPriorityRows: number;
  mediumPriorityRows: number;
  lowPriorityRows: number;
  minPriorityScore: number;
  maxPriorityScore: number;
  firstPhraseId: string;
  lastPhraseId: string;
  firstSourceQueueIndex: number;
  lastSourceQueueIndex: number;
  jsonlPath: string;
  jsonlSha256: string;
  tsvPath: string;
  tsvSha256: string;
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-priority-batches-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    priorityRows: number;
    batches: number;
    batchSize: number;
    jsonlBatchFiles: number;
    tsvBatchFiles: number;
    rowsInBatchFiles: number;
    highPriorityRows: number;
    mediumPriorityRows: number;
    lowPriorityRows: number;
    priorityIntegrityBlockers: number;
    priorityIntegrityReadyForReviewer: boolean;
    rowsWithReviewerWorkspaceValues: number;
    rowsWithActivationViolations: number;
    findingsBlockers: number;
    findingsWarnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceArtifacts: {
    priorityQueueJsonl: string;
    priorityIntegrityAudit: string;
    priorityQueueSha256: string;
  };
  outputArtifacts: {
    priorityBatchDir: string;
    manifestJson: string;
    manifestMd: string;
    packetJson: string;
    packetMd: string;
  };
  files: PriorityBatchFile[];
  findings: Finding[];
};

const BATCH_SIZE = 50;

const TSV_HEADERS = [
  'sourceQueueIndex',
  'lessonId',
  'phraseId',
  'priorityTier',
  'priorityScore',
  'englishBase',
  'russianMeaning',
  'ukrainianMeaning',
  'proposedFrench',
  'quizBlank',
  'quizCorrect',
  'quizDistractors',
  'quizCategory',
  'priorityReasons',
  'reviewFocus',
  'duplicateDisposition',
  'duplicateReviewerNote',
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

function n(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function b(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : false;
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function renderTsv(rows: PriorityRow[]): string {
  const lines = [TSV_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push(TSV_HEADERS.map((header) => tsvCell(row[header as keyof PriorityRow])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function renderManifestMd(report: Report): string {
  const lines = [
    '# GUSTAV French Priority Review Batches Manifest',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    `Batches: ${report.summary.batches}`,
    '',
    `Rows: ${report.summary.priorityRows}`,
    '',
    '## Files',
    '',
  ];
  for (const file of report.files) {
    lines.push(`- \`${file.batchId}\`: rows ${file.rowCount}, high ${file.highPriorityRows}, medium ${file.mediumPriorityRows}, low ${file.lowPriorityRows}, score ${file.minPriorityScore}-${file.maxPriorityScore}, \`${file.jsonlPath}\`, \`${file.tsvPath}\``);
  }
  lines.push('', '## Safety', '');
  lines.push('- These files are reviewer workspace inputs only.');
  lines.push('- They preserve the priority queue order.');
  lines.push('- They do not write reviewer decisions.');
  lines.push('- They do not approve app apply.');
  lines.push('');
  return lines.join('\n');
}

function renderPacketMd(report: Report): string {
  const lines = [
    '# GUSTAV French Priority Review Batches Packet',
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
    `- Batches: ${report.summary.batches}`,
    `- Batch size: ${report.summary.batchSize}`,
    `- JSONL batch files: ${report.summary.jsonlBatchFiles}`,
    `- TSV batch files: ${report.summary.tsvBatchFiles}`,
    `- Rows in batch files: ${report.summary.rowsInBatchFiles}`,
    `- High priority rows: ${report.summary.highPriorityRows}`,
    `- Medium priority rows: ${report.summary.mediumPriorityRows}`,
    `- Low priority rows: ${report.summary.lowPriorityRows}`,
    `- Priority integrity blockers: ${report.summary.priorityIntegrityBlockers}`,
    `- Priority integrity ready for reviewer: ${report.summary.priorityIntegrityReadyForReviewer ? 'yes' : 'no'}`,
    `- Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`,
    `- Rows with activation violations: ${report.summary.rowsWithActivationViolations}`,
    `- Findings blockers: ${report.summary.findingsBlockers}`,
    `- Findings warnings: ${report.summary.findingsWarnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Output Artifacts',
    '',
    `- Priority batch dir: \`${report.outputArtifacts.priorityBatchDir}\``,
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
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.batchId ? ` (${finding.batchId})` : ''}${finding.path ? ` path=${finding.path}` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- Priority batches are derived from the checked priority queue.');
  lines.push('- No reviewer decisions are written.');
  lines.push('- No generated rows are accepted.');
  lines.push('- No production app files are modified.');
  lines.push('');
  return lines.join('\n');
}

function batchId(index: number): string {
  return `priority_review_batch_${String(index + 1).padStart(3, '0')}`;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_priority_batches.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const priorityBatchDir = path.join(reviewerDir, 'priority_batches');
  const priorityQueuePath = path.join(reviewerDir, 'french_reviewer_priority_queue.jsonl');
  const priorityIntegrityPath = path.join(auditsDir, 'french_reviewer_priority_integrity_audit.json');
  const findings: Finding[] = [];

  const rows = parseJsonl<PriorityRow>(priorityQueuePath);
  const priorityIntegrity = asRecord(readJson<unknown>(priorityIntegrityPath));
  const priorityIntegritySummary = asRecord(priorityIntegrity.summary);
  const priorityIntegrityBlockers = n(priorityIntegritySummary, 'blockers');
  const priorityIntegrityReadyForReviewer = b(priorityIntegritySummary, 'readyForReviewer');

  if (rows.length !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'priority_row_count_invalid',
      message: `Expected 1600 priority rows, found ${rows.length}.`,
      path: artifactPath(repoRoot, priorityQueuePath),
    });
  }
  if (priorityIntegrityBlockers > 0 || !priorityIntegrityReadyForReviewer) {
    findings.push({
      severity: 'blocker',
      code: 'priority_integrity_not_ready',
      message: `Priority integrity blockers=${priorityIntegrityBlockers}, readyForReviewer=${priorityIntegrityReadyForReviewer ? 'yes' : 'no'}.`,
      path: artifactPath(repoRoot, priorityIntegrityPath),
    });
  }

  let rowsWithReviewerWorkspaceValues = 0;
  let rowsWithActivationViolations = 0;
  for (const row of rows) {
    if (row.reviewerDecision || row.reviewerNotes) rowsWithReviewerWorkspaceValues += 1;
    if (row.currentReviewerStatus !== 'needs_review' || row.currentActivationStatus !== 'blocked') rowsWithActivationViolations += 1;
  }
  if (rowsWithReviewerWorkspaceValues > 0 || rowsWithActivationViolations > 0) {
    findings.push({
      severity: 'blocker',
      code: 'priority_batch_lock_violation',
      message: `Reviewer workspace rows=${rowsWithReviewerWorkspaceValues}, activation violations=${rowsWithActivationViolations}.`,
    });
  }

  ensureDir(priorityBatchDir);
  const files: PriorityBatchFile[] = [];
  let rowsInBatchFiles = 0;

  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const index = Math.floor(start / BATCH_SIZE);
    const id = batchId(index);
    const chunk = rows.slice(start, start + BATCH_SIZE);
    const jsonlPath = path.join(priorityBatchDir, `${id}.jsonl`);
    const tsvPath = path.join(priorityBatchDir, `${id}.tsv`);
    fs.writeFileSync(jsonlPath, `${chunk.map((row) => JSON.stringify(row)).join('\n')}\n`);
    fs.writeFileSync(tsvPath, renderTsv(chunk));
    rowsInBatchFiles += chunk.length;
    const scores = chunk.map((row) => row.priorityScore);
    files.push({
      batchId: id,
      batchIndex: index,
      rowCount: chunk.length,
      highPriorityRows: chunk.filter((row) => row.priorityTier === 'high').length,
      mediumPriorityRows: chunk.filter((row) => row.priorityTier === 'medium').length,
      lowPriorityRows: chunk.filter((row) => row.priorityTier === 'low').length,
      minPriorityScore: Math.min(...scores),
      maxPriorityScore: Math.max(...scores),
      firstPhraseId: chunk[0]?.phraseId ?? '',
      lastPhraseId: chunk[chunk.length - 1]?.phraseId ?? '',
      firstSourceQueueIndex: chunk[0]?.sourceQueueIndex ?? -1,
      lastSourceQueueIndex: chunk[chunk.length - 1]?.sourceQueueIndex ?? -1,
      jsonlPath: artifactPath(repoRoot, jsonlPath),
      jsonlSha256: sha256(jsonlPath),
      tsvPath: artifactPath(repoRoot, tsvPath),
      tsvSha256: sha256(tsvPath),
    });
  }

  const expectedBatches = Math.ceil(rows.length / BATCH_SIZE);
  const jsonlBatchFiles = files.filter((file) => file.jsonlPath.endsWith('.jsonl')).length;
  const tsvBatchFiles = files.filter((file) => file.tsvPath.endsWith('.tsv')).length;
  if (files.length !== expectedBatches || rowsInBatchFiles !== rows.length) {
    findings.push({
      severity: 'blocker',
      code: 'priority_batch_coverage_invalid',
      message: `Expected ${expectedBatches} batches covering ${rows.length} rows, found batches=${files.length}, rows=${rowsInBatchFiles}.`,
    });
  }

  const findingsBlockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const findingsWarnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    findingsBlockers === 0 &&
    rows.length === 1600 &&
    files.length === 32 &&
    jsonlBatchFiles === 32 &&
    tsvBatchFiles === 32 &&
    rowsInBatchFiles === 1600;

  const manifestJson = path.join(reviewerDir, 'french_priority_review_batches_manifest.json');
  const manifestMd = path.join(reviewerDir, 'french_priority_review_batches_manifest.md');
  const packetJson = path.join(auditsDir, 'french_reviewer_priority_batches_packet.json');
  const packetMd = path.join(auditsDir, 'french_reviewer_priority_batches_packet.md');

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-priority-batches-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      priorityRows: rows.length,
      batches: files.length,
      batchSize: BATCH_SIZE,
      jsonlBatchFiles,
      tsvBatchFiles,
      rowsInBatchFiles,
      highPriorityRows: rows.filter((row) => row.priorityTier === 'high').length,
      mediumPriorityRows: rows.filter((row) => row.priorityTier === 'medium').length,
      lowPriorityRows: rows.filter((row) => row.priorityTier === 'low').length,
      priorityIntegrityBlockers,
      priorityIntegrityReadyForReviewer,
      rowsWithReviewerWorkspaceValues,
      rowsWithActivationViolations,
      findingsBlockers,
      findingsWarnings,
      readyForReviewer,
      readyForDecisionImport: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceArtifacts: {
      priorityQueueJsonl: artifactPath(repoRoot, priorityQueuePath),
      priorityIntegrityAudit: artifactPath(repoRoot, priorityIntegrityPath),
      priorityQueueSha256: sha256(priorityQueuePath),
    },
    outputArtifacts: {
      priorityBatchDir: artifactPath(repoRoot, priorityBatchDir),
      manifestJson: artifactPath(repoRoot, manifestJson),
      manifestMd: artifactPath(repoRoot, manifestMd),
      packetJson: artifactPath(repoRoot, packetJson),
      packetMd: artifactPath(repoRoot, packetMd),
    },
    files,
    findings,
  };

  ensureDir(auditsDir);
  fs.writeFileSync(manifestJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(manifestMd, renderManifestMd(report));
  fs.writeFileSync(packetJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(packetMd, renderPacketMd(report));

  console.log(`GUSTAV French priority review batches: ${report.status}`);
  console.log(`Priority rows: ${report.summary.priorityRows}`);
  console.log(`Batches: ${report.summary.batches}`);
  console.log(`JSONL batch files: ${report.summary.jsonlBatchFiles}`);
  console.log(`TSV batch files: ${report.summary.tsvBatchFiles}`);
  console.log(`Rows in batch files: ${report.summary.rowsInBatchFiles}`);
  console.log(`High priority rows: ${report.summary.highPriorityRows}`);
  console.log(`Medium priority rows: ${report.summary.mediumPriorityRows}`);
  console.log(`Low priority rows: ${report.summary.lowPriorityRows}`);
  console.log(`Findings blockers: ${report.summary.findingsBlockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, packetJson)}`);

  if (findingsBlockers > 0) process.exit(1);
}

void main();
