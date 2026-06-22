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
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-batch-files-integrity-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    manifestFiles: number;
    jsonlBatchFiles: number;
    tsvBatchFiles: number;
    queueRows: number;
    batchRows: number;
    matchingJsonlRows: number;
    matchingTsvRows: number;
    hashMismatches: number;
    rowCountMismatches: number;
    duplicateBatchRows: number;
    missingQueueRows: number;
    extraBatchRows: number;
    rowsWithReviewerWorkspaceValues: number;
    rowsWithActivationViolations: number;
    batchPacketBlockers: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  hashes: {
    sourceQueueSha256: string;
    manifestSourceQueueSha256: string;
  };
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

function queueKey(row: Pick<QueueRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function tsvValue(row: QueueRow, header: string): string {
  const value = row[header as keyof QueueRow];
  if (Array.isArray(value)) return value.join(' | ');
  return String(value ?? '');
}

function parseTsv(filePath: string, findings: Finding[], repoRoot: string, batchId: string): QueueRow[] {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) {
    findings.push({
      severity: 'blocker',
      code: 'tsv_empty',
      message: 'Batch TSV file is empty.',
      batchId,
      path: artifactPath(repoRoot, filePath),
    });
    return [];
  }
  const headers = lines[0].split('\t');
  if (headers.join('\t') !== TSV_HEADERS.join('\t')) {
    findings.push({
      severity: 'blocker',
      code: 'tsv_header_mismatch',
      message: 'Batch TSV header does not match reviewer queue contract.',
      batchId,
      path: artifactPath(repoRoot, filePath),
    });
  }
  const rows: QueueRow[] = [];
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split('\t');
    if (cells.length !== TSV_HEADERS.length) {
      findings.push({
        severity: 'blocker',
        code: 'tsv_row_width_invalid',
        message: `Batch TSV row ${index + 2} has ${cells.length} cells, expected ${TSV_HEADERS.length}.`,
        batchId,
        path: artifactPath(repoRoot, filePath),
      });
      continue;
    }
    const record: Record<string, string> = {};
    TSV_HEADERS.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex];
    });
    rows.push({
      lessonId: Number(record.lessonId),
      phraseId: record.phraseId,
      englishBase: record.englishBase,
      russianMeaning: record.russianMeaning,
      ukrainianMeaning: record.ukrainianMeaning,
      proposedFrench: record.proposedFrench,
      quizBlank: record.quizBlank,
      quizCorrect: record.quizCorrect,
      quizDistractors: record.quizDistractors ? record.quizDistractors.split(' | ') : [],
      quizCategory: record.quizCategory,
      currentReviewerStatus: record.currentReviewerStatus,
      currentActivationStatus: record.currentActivationStatus,
      reviewerDecision: record.reviewerDecision,
      reviewerNotes: record.reviewerNotes,
    });
  }
  return rows;
}

function jsonRowsEqual(expected: QueueRow, actual: QueueRow): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function tsvRowsEqual(expected: QueueRow, actual: QueueRow): boolean {
  return TSV_HEADERS.every((header) => tsvValue(expected, header) === tsvValue(actual, header));
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Batch Files Integrity Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Manifest files: ${report.summary.manifestFiles}`,
    `- JSONL batch files: ${report.summary.jsonlBatchFiles}`,
    `- TSV batch files: ${report.summary.tsvBatchFiles}`,
    `- Queue rows: ${report.summary.queueRows}`,
    `- Batch rows: ${report.summary.batchRows}`,
    `- Matching JSONL rows: ${report.summary.matchingJsonlRows}`,
    `- Matching TSV rows: ${report.summary.matchingTsvRows}`,
    `- Hash mismatches: ${report.summary.hashMismatches}`,
    `- Row count mismatches: ${report.summary.rowCountMismatches}`,
    `- Duplicate batch rows: ${report.summary.duplicateBatchRows}`,
    `- Missing queue rows: ${report.summary.missingQueueRows}`,
    `- Extra batch rows: ${report.summary.extraBatchRows}`,
    `- Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`,
    `- Rows with activation violations: ${report.summary.rowsWithActivationViolations}`,
    `- Batch packet blockers: ${report.summary.batchPacketBlockers}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Hashes',
    '',
    `- Source queue sha256: \`${report.hashes.sourceQueueSha256}\``,
    `- Manifest source queue sha256: \`${report.hashes.manifestSourceQueueSha256}\``,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      const suffix = [
        finding.batchId ? `batch=${finding.batchId}` : null,
        finding.path ? `path=${finding.path}` : null,
      ].filter(Boolean).join(', ');
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${suffix ? ` (${suffix})` : ''}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_batch_files_integrity_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const queueJsonlPath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const manifestPath = path.join(reviewerDir, 'french_review_batch_files_manifest.json');
  const batchPacketPath = path.join(auditsDir, 'french_reviewer_batch_files_packet.json');
  const findings: Finding[] = [];

  const queueRows = parseJsonl<QueueRow>(queueJsonlPath);
  const queueByKey = new Map(queueRows.map((row) => [queueKey(row), row]));
  const manifest = readJson<Record<string, unknown>>(manifestPath);
  const manifestFiles = (manifest.files as BatchFile[] | undefined) ?? [];
  const batchPacket = asRecord(readJson<unknown>(batchPacketPath));
  const batchPacketSummary = asRecord(batchPacket.summary);
  const batchPacketBlockers = Number(batchPacketSummary.findingsBlockers ?? 0);
  if (batchPacketSummary.readyForReviewer !== true || batchPacketBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'batch_files_packet_not_ready',
      message: 'Batch files packet must be ready for reviewer before integrity can pass.',
      path: artifactPath(repoRoot, batchPacketPath),
    });
  }

  const sourceQueueSha256 = sha256(queueJsonlPath);
  const manifestSourceQueueSha256 = String(manifest.sourceQueueSha256 ?? '');
  if (sourceQueueSha256 !== manifestSourceQueueSha256) {
    findings.push({
      severity: 'blocker',
      code: 'source_queue_hash_mismatch',
      message: 'Manifest sourceQueueSha256 does not match current reviewer queue.',
      path: artifactPath(repoRoot, manifestPath),
    });
  }

  let jsonlBatchFiles = 0;
  let tsvBatchFiles = 0;
  let batchRows = 0;
  let matchingJsonlRows = 0;
  let matchingTsvRows = 0;
  let hashMismatches = 0;
  let rowCountMismatches = 0;
  let duplicateBatchRows = 0;
  let rowsWithReviewerWorkspaceValues = 0;
  let rowsWithActivationViolations = 0;
  const seenBatchKeys = new Set<string>();

  for (const file of manifestFiles) {
    const jsonlPath = path.resolve(repoRoot, file.jsonlPath);
    const tsvPath = path.resolve(repoRoot, file.tsvPath);
    if (!fs.existsSync(jsonlPath)) {
      findings.push({
        severity: 'blocker',
        code: 'jsonl_batch_file_missing',
        message: 'Manifest references missing JSONL batch file.',
        batchId: file.batchId,
        path: file.jsonlPath,
      });
      continue;
    }
    if (!fs.existsSync(tsvPath)) {
      findings.push({
        severity: 'blocker',
        code: 'tsv_batch_file_missing',
        message: 'Manifest references missing TSV batch file.',
        batchId: file.batchId,
        path: file.tsvPath,
      });
      continue;
    }
    jsonlBatchFiles += 1;
    tsvBatchFiles += 1;

    const jsonlHash = sha256(jsonlPath);
    const tsvHash = sha256(tsvPath);
    if (jsonlHash !== file.jsonlSha256) {
      hashMismatches += 1;
      findings.push({
        severity: 'blocker',
        code: 'jsonl_hash_mismatch',
        message: 'JSONL batch file hash does not match manifest.',
        batchId: file.batchId,
        path: file.jsonlPath,
      });
    }
    if (tsvHash !== file.tsvSha256) {
      hashMismatches += 1;
      findings.push({
        severity: 'blocker',
        code: 'tsv_hash_mismatch',
        message: 'TSV batch file hash does not match manifest.',
        batchId: file.batchId,
        path: file.tsvPath,
      });
    }

    const jsonlRows = parseJsonl<QueueRow>(jsonlPath);
    const tsvRows = parseTsv(tsvPath, findings, repoRoot, file.batchId);
    batchRows += jsonlRows.length;
    if (jsonlRows.length !== file.rowCount || tsvRows.length !== file.rowCount) {
      rowCountMismatches += 1;
      findings.push({
        severity: 'blocker',
        code: 'batch_row_count_mismatch',
        message: `Expected ${file.rowCount} rows, found JSONL=${jsonlRows.length}, TSV=${tsvRows.length}.`,
        batchId: file.batchId,
      });
    }
    if (jsonlRows[0]?.phraseId !== file.firstPhraseId || jsonlRows[jsonlRows.length - 1]?.phraseId !== file.lastPhraseId) {
      findings.push({
        severity: 'blocker',
        code: 'batch_boundary_mismatch',
        message: 'Batch first/last phrase ids do not match manifest.',
        batchId: file.batchId,
      });
    }

    for (const [index, row] of jsonlRows.entries()) {
      const key = queueKey(row);
      if (seenBatchKeys.has(key)) duplicateBatchRows += 1;
      seenBatchKeys.add(key);
      if (row.reviewerDecision !== '' || row.reviewerNotes !== '') rowsWithReviewerWorkspaceValues += 1;
      if (row.currentReviewerStatus !== 'needs_review' || row.currentActivationStatus !== 'blocked') rowsWithActivationViolations += 1;
      const expected = queueByKey.get(key);
      if (expected && jsonRowsEqual(expected, row)) {
        matchingJsonlRows += 1;
      } else {
        findings.push({
          severity: 'blocker',
          code: 'jsonl_batch_row_mismatch',
          message: 'Batch JSONL row does not match source reviewer queue.',
          batchId: file.batchId,
        });
      }
      const tsvRow = tsvRows[index];
      if (expected && tsvRow && tsvRowsEqual(expected, tsvRow)) {
        matchingTsvRows += 1;
      } else {
        findings.push({
          severity: 'blocker',
          code: 'tsv_batch_row_mismatch',
          message: 'Batch TSV row does not match source reviewer queue.',
          batchId: file.batchId,
        });
      }
    }
  }

  let missingQueueRows = 0;
  for (const key of queueByKey.keys()) {
    if (!seenBatchKeys.has(key)) missingQueueRows += 1;
  }
  let extraBatchRows = 0;
  for (const key of seenBatchKeys.keys()) {
    if (!queueByKey.has(key)) extraBatchRows += 1;
  }
  if (duplicateBatchRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'duplicate_batch_rows',
      message: `${duplicateBatchRows} batch rows are duplicated.`,
    });
  }
  if (missingQueueRows > 0 || extraBatchRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'batch_queue_coverage_mismatch',
      message: `Missing queue rows: ${missingQueueRows}; extra batch rows: ${extraBatchRows}.`,
    });
  }
  if (rowsWithReviewerWorkspaceValues > 0) {
    findings.push({
      severity: 'blocker',
      code: 'reviewer_workspace_not_empty',
      message: `${rowsWithReviewerWorkspaceValues} batch rows already contain reviewer workspace values.`,
    });
  }
  if (rowsWithActivationViolations > 0) {
    findings.push({
      severity: 'blocker',
      code: 'activation_lock_violation',
      message: `${rowsWithActivationViolations} batch rows are not locked for review.`,
    });
  }
  if (manifestFiles.length !== 32 || jsonlBatchFiles !== 32 || tsvBatchFiles !== 32) {
    findings.push({
      severity: 'blocker',
      code: 'batch_file_count_invalid',
      message: `Expected 32 manifest files with 32 JSONL and 32 TSV files, got manifest=${manifestFiles.length}, jsonl=${jsonlBatchFiles}, tsv=${tsvBatchFiles}.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    blockers === 0 &&
    queueRows.length === 1600 &&
    batchRows === 1600 &&
    matchingJsonlRows === 1600 &&
    matchingTsvRows === 1600 &&
    manifestFiles.length === 32 &&
    jsonlBatchFiles === 32 &&
    tsvBatchFiles === 32;

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-batch-files-integrity-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForReviewer ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      manifestFiles: manifestFiles.length,
      jsonlBatchFiles,
      tsvBatchFiles,
      queueRows: queueRows.length,
      batchRows,
      matchingJsonlRows,
      matchingTsvRows,
      hashMismatches,
      rowCountMismatches,
      duplicateBatchRows,
      missingQueueRows,
      extraBatchRows,
      rowsWithReviewerWorkspaceValues,
      rowsWithActivationViolations,
      batchPacketBlockers,
      blockers,
      warnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    hashes: {
      sourceQueueSha256,
      manifestSourceQueueSha256,
    },
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_reviewer_batch_files_integrity_audit.json');
  const outMd = path.join(auditsDir, 'french_reviewer_batch_files_integrity_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French reviewer batch files integrity audit: ${report.status}`);
  console.log(`Manifest files: ${report.summary.manifestFiles}`);
  console.log(`JSONL batch files: ${report.summary.jsonlBatchFiles}`);
  console.log(`TSV batch files: ${report.summary.tsvBatchFiles}`);
  console.log(`Queue rows: ${report.summary.queueRows}`);
  console.log(`Batch rows: ${report.summary.batchRows}`);
  console.log(`Matching JSONL rows: ${report.summary.matchingJsonlRows}`);
  console.log(`Matching TSV rows: ${report.summary.matchingTsvRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
