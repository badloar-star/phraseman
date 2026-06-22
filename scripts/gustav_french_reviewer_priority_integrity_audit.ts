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
  phraseId?: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-priority-integrity-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    sourceQueueRows: number;
    priorityJsonlRows: number;
    priorityTsvRows: number;
    matchedSourceRows: number;
    matchedTsvRows: number;
    duplicatePriorityKeys: number;
    duplicateSourceQueueIndexes: number;
    missingSourceRows: number;
    extraPriorityRows: number;
    rowOrderViolations: number;
    priorityTierViolations: number;
    rowsWithReviewerWorkspaceValues: number;
    rowsWithActivationViolations: number;
    priorityAuditBlockers: number;
    priorityAuditReadyForReviewer: boolean;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  hashes: {
    sourceQueueSha256: string;
    priorityQueueJsonlSha256: string;
    priorityQueueTsvSha256: string;
    priorityAuditPriorityQueueJsonlSha256: string;
    priorityAuditPriorityQueueTsvSha256: string;
  };
  findings: Finding[];
};

const TSV_HEADERS = [
  'sourceQueueIndex',
  'lessonId',
  'phraseId',
  'priorityTier',
  'priorityScore',
  'englishBase',
  'proposedFrench',
  'quizCategory',
  'priorityReasons',
  'reviewFocus',
  'duplicateDisposition',
  'currentReviewerStatus',
  'currentActivationStatus',
];

const SOURCE_FIELDS: Array<keyof QueueRow> = [
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

function n(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function b(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : false;
}

function queueKey(row: Pick<QueueRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function parseTsv(filePath: string, findings: Finding[], repoRoot: string): Map<string, Record<string, string>> {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const rows = new Map<string, Record<string, string>>();
  if (lines.length === 0) {
    findings.push({
      severity: 'blocker',
      code: 'priority_tsv_empty',
      message: 'Priority TSV is empty.',
      path: artifactPath(repoRoot, filePath),
    });
    return rows;
  }
  const headers = lines[0].split('\t');
  if (headers.join('\t') !== TSV_HEADERS.join('\t')) {
    findings.push({
      severity: 'blocker',
      code: 'priority_tsv_header_mismatch',
      message: 'Priority TSV header does not match the priority queue contract.',
      path: artifactPath(repoRoot, filePath),
    });
  }
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split('\t');
    if (cells.length !== TSV_HEADERS.length) {
      findings.push({
        severity: 'blocker',
        code: 'priority_tsv_row_width_invalid',
        message: `Priority TSV row ${index + 2} has ${cells.length} cells, expected ${TSV_HEADERS.length}.`,
        path: artifactPath(repoRoot, filePath),
      });
      continue;
    }
    const record: Record<string, string> = {};
    TSV_HEADERS.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex];
    });
    rows.set(`${record.lessonId}:${record.phraseId}`, record);
  }
  return rows;
}

function sourceRowsEqual(source: QueueRow, priority: PriorityRow): boolean {
  return SOURCE_FIELDS.every((field) => JSON.stringify(source[field]) === JSON.stringify(priority[field]));
}

function tsvRowsEqual(priority: PriorityRow, tsvRow: Record<string, string>): boolean {
  return TSV_HEADERS.every((header) => tsvCell(priority[header as keyof PriorityRow]) === tsvRow[header]);
}

function expectedTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Priority Integrity Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Source queue rows: ${report.summary.sourceQueueRows}`,
    `- Priority JSONL rows: ${report.summary.priorityJsonlRows}`,
    `- Priority TSV rows: ${report.summary.priorityTsvRows}`,
    `- Matched source rows: ${report.summary.matchedSourceRows}`,
    `- Matched TSV rows: ${report.summary.matchedTsvRows}`,
    `- Duplicate priority keys: ${report.summary.duplicatePriorityKeys}`,
    `- Duplicate source queue indexes: ${report.summary.duplicateSourceQueueIndexes}`,
    `- Missing source rows: ${report.summary.missingSourceRows}`,
    `- Extra priority rows: ${report.summary.extraPriorityRows}`,
    `- Row order violations: ${report.summary.rowOrderViolations}`,
    `- Priority tier violations: ${report.summary.priorityTierViolations}`,
    `- Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`,
    `- Rows with activation violations: ${report.summary.rowsWithActivationViolations}`,
    `- Priority audit blockers: ${report.summary.priorityAuditBlockers}`,
    `- Priority audit ready for reviewer: ${report.summary.priorityAuditReadyForReviewer ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Hashes',
    '',
    `- Source queue sha256: \`${report.hashes.sourceQueueSha256}\``,
    `- Priority JSONL sha256: \`${report.hashes.priorityQueueJsonlSha256}\``,
    `- Priority TSV sha256: \`${report.hashes.priorityQueueTsvSha256}\``,
    `- Priority audit JSONL sha256: \`${report.hashes.priorityAuditPriorityQueueJsonlSha256}\``,
    `- Priority audit TSV sha256: \`${report.hashes.priorityAuditPriorityQueueTsvSha256}\``,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.phraseId ? ` (${finding.phraseId})` : ''}${finding.path ? ` path=${finding.path}` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This audit validates priority reviewer support files only.');
  lines.push('- It does not create reviewer decisions.');
  lines.push('- It does not modify generated lesson ledgers.');
  lines.push('- It does not approve decision import or app apply.');
  lines.push('- It does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_priority_integrity_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const sourceQueuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const priorityJsonlPath = path.join(reviewerDir, 'french_reviewer_priority_queue.jsonl');
  const priorityTsvPath = path.join(reviewerDir, 'french_reviewer_priority_queue.tsv');
  const priorityAuditPath = path.join(auditsDir, 'french_reviewer_priority_audit.json');
  const findings: Finding[] = [];

  const sourceRows = parseJsonl<QueueRow>(sourceQueuePath);
  const priorityRows = parseJsonl<PriorityRow>(priorityJsonlPath);
  const tsvRows = parseTsv(priorityTsvPath, findings, repoRoot);
  const priorityAudit = asRecord(readJson<unknown>(priorityAuditPath));
  const priorityAuditSummary = asRecord(priorityAudit.summary);
  const priorityAuditHashes = asRecord(priorityAudit.hashes);

  const sourceByKey = new Map<string, QueueRow>();
  sourceRows.forEach((row) => sourceByKey.set(queueKey(row), row));

  const seenPriorityKeys = new Set<string>();
  const seenIndexes = new Set<number>();
  let matchedSourceRows = 0;
  let matchedTsvRows = 0;
  let duplicatePriorityKeys = 0;
  let duplicateSourceQueueIndexes = 0;
  let rowOrderViolations = 0;
  let priorityTierViolations = 0;
  let rowsWithReviewerWorkspaceValues = 0;
  let rowsWithActivationViolations = 0;

  for (const [index, row] of priorityRows.entries()) {
    const key = queueKey(row);
    const sourceRow = sourceByKey.get(key);
    if (seenPriorityKeys.has(key)) duplicatePriorityKeys += 1;
    seenPriorityKeys.add(key);
    if (seenIndexes.has(row.sourceQueueIndex)) duplicateSourceQueueIndexes += 1;
    seenIndexes.add(row.sourceQueueIndex);

    if (sourceRow && sourceRows[row.sourceQueueIndex] && queueKey(sourceRows[row.sourceQueueIndex]) === key) {
      matchedSourceRows += sourceRowsEqual(sourceRow, row) ? 1 : 0;
    } else {
      findings.push({
        severity: 'blocker',
        code: 'source_queue_index_mismatch',
        message: 'Priority row sourceQueueIndex does not point to the matching source reviewer queue row.',
        phraseId: row.phraseId,
      });
    }

    const tsvRow = tsvRows.get(key);
    if (tsvRow && tsvRowsEqual(row, tsvRow)) matchedTsvRows += 1;

    if (index > 0) {
      const previous = priorityRows[index - 1];
      const orderOk =
        previous.priorityScore > row.priorityScore ||
        (previous.priorityScore === row.priorityScore && previous.lessonId < row.lessonId) ||
        (previous.priorityScore === row.priorityScore && previous.lessonId === row.lessonId && previous.sourceQueueIndex <= row.sourceQueueIndex);
      if (!orderOk) rowOrderViolations += 1;
    }

    if (row.priorityTier !== expectedTier(row.priorityScore)) priorityTierViolations += 1;
    if (row.reviewerDecision || row.reviewerNotes) rowsWithReviewerWorkspaceValues += 1;
    if (row.currentReviewerStatus !== 'needs_review' || row.currentActivationStatus !== 'blocked') rowsWithActivationViolations += 1;
  }

  let missingSourceRows = 0;
  for (const key of sourceByKey.keys()) {
    if (!seenPriorityKeys.has(key)) missingSourceRows += 1;
  }
  let extraPriorityRows = 0;
  for (const key of seenPriorityKeys) {
    if (!sourceByKey.has(key)) extraPriorityRows += 1;
  }

  if (sourceRows.length !== 1600 || priorityRows.length !== 1600 || tsvRows.size !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'priority_row_count_invalid',
      message: `Expected 1600 rows in source/JSONL/TSV, got source=${sourceRows.length}, jsonl=${priorityRows.length}, tsv=${tsvRows.size}.`,
    });
  }
  if (matchedSourceRows !== priorityRows.length) {
    findings.push({
      severity: 'blocker',
      code: 'priority_source_row_mismatch',
      message: `Priority rows matching source rows: ${matchedSourceRows}/${priorityRows.length}.`,
    });
  }
  if (matchedTsvRows !== priorityRows.length) {
    findings.push({
      severity: 'blocker',
      code: 'priority_tsv_row_mismatch',
      message: `Priority TSV rows matching JSONL rows: ${matchedTsvRows}/${priorityRows.length}.`,
    });
  }
  if (duplicatePriorityKeys > 0 || duplicateSourceQueueIndexes > 0 || missingSourceRows > 0 || extraPriorityRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'priority_coverage_mismatch',
      message: `Duplicate keys=${duplicatePriorityKeys}, duplicate sourceQueueIndex=${duplicateSourceQueueIndexes}, missing=${missingSourceRows}, extra=${extraPriorityRows}.`,
    });
  }
  if (rowOrderViolations > 0) {
    findings.push({
      severity: 'blocker',
      code: 'priority_order_violation',
      message: `${rowOrderViolations} priority row(s) are not sorted by score, lesson, and source queue index.`,
    });
  }
  if (priorityTierViolations > 0) {
    findings.push({
      severity: 'blocker',
      code: 'priority_tier_violation',
      message: `${priorityTierViolations} row(s) have priorityTier values that do not match their priorityScore.`,
    });
  }
  if (rowsWithReviewerWorkspaceValues > 0 || rowsWithActivationViolations > 0) {
    findings.push({
      severity: 'blocker',
      code: 'priority_lock_violation',
      message: `Reviewer workspace rows=${rowsWithReviewerWorkspaceValues}, activation violations=${rowsWithActivationViolations}.`,
    });
  }

  const priorityJsonlSha = sha256(priorityJsonlPath);
  const priorityTsvSha = sha256(priorityTsvPath);
  const priorityAuditJsonlSha = String(priorityAuditHashes.priorityQueueJsonlSha256 ?? '');
  const priorityAuditTsvSha = String(priorityAuditHashes.priorityQueueTsvSha256 ?? '');
  if (priorityAuditJsonlSha !== priorityJsonlSha || priorityAuditTsvSha !== priorityTsvSha) {
    findings.push({
      severity: 'blocker',
      code: 'priority_audit_hash_mismatch',
      message: 'Priority audit recorded hashes do not match current priority queue files.',
    });
  }

  const priorityAuditBlockers = n(priorityAuditSummary, 'blockers');
  const priorityAuditReadyForReviewer = b(priorityAuditSummary, 'readyForReviewer');
  if (priorityAuditBlockers > 0 || !priorityAuditReadyForReviewer) {
    findings.push({
      severity: 'blocker',
      code: 'priority_audit_not_ready',
      message: `Priority audit blockers=${priorityAuditBlockers}, readyForReviewer=${priorityAuditReadyForReviewer ? 'yes' : 'no'}.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    blockers === 0 &&
    sourceRows.length === 1600 &&
    priorityRows.length === 1600 &&
    tsvRows.size === 1600 &&
    matchedSourceRows === 1600 &&
    matchedTsvRows === 1600;

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-priority-integrity-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForReviewer ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      sourceQueueRows: sourceRows.length,
      priorityJsonlRows: priorityRows.length,
      priorityTsvRows: tsvRows.size,
      matchedSourceRows,
      matchedTsvRows,
      duplicatePriorityKeys,
      duplicateSourceQueueIndexes,
      missingSourceRows,
      extraPriorityRows,
      rowOrderViolations,
      priorityTierViolations,
      rowsWithReviewerWorkspaceValues,
      rowsWithActivationViolations,
      priorityAuditBlockers,
      priorityAuditReadyForReviewer,
      blockers,
      warnings,
      readyForReviewer,
      readyForDecisionImport: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    hashes: {
      sourceQueueSha256: sha256(sourceQueuePath),
      priorityQueueJsonlSha256: priorityJsonlSha,
      priorityQueueTsvSha256: priorityTsvSha,
      priorityAuditPriorityQueueJsonlSha256: priorityAuditJsonlSha,
      priorityAuditPriorityQueueTsvSha256: priorityAuditTsvSha,
    },
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_reviewer_priority_integrity_audit.json');
  const outMd = path.join(auditsDir, 'french_reviewer_priority_integrity_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French reviewer priority integrity audit: ${report.status}`);
  console.log(`Source queue rows: ${report.summary.sourceQueueRows}`);
  console.log(`Priority JSONL rows: ${report.summary.priorityJsonlRows}`);
  console.log(`Priority TSV rows: ${report.summary.priorityTsvRows}`);
  console.log(`Matched source rows: ${report.summary.matchedSourceRows}`);
  console.log(`Matched TSV rows: ${report.summary.matchedTsvRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
