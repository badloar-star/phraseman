import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
  phraseId?: string;
};

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
  currentReviewerStatus: string;
  currentActivationStatus: string;
  reviewerDecision: string;
  reviewerNotes: string;
};

type Report = {
  schemaVersion: 'gustav-french-reviewer-handoff-integrity-audit-v0';
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
    generatedRows: number;
    jsonlRows: number;
    tsvRows: number;
    matchingJsonlRows: number;
    matchingTsvRows: number;
    duplicateQueueKeys: number;
    missingQueueRows: number;
    extraQueueRows: number;
    rowsWithReviewerWorkspaceValues: number;
    rowsWithActivationViolations: number;
    referencedArtifactsPresent: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  hashes: {
    reviewerQueueJsonlSha256: string;
    reviewerQueueTsvSha256: string;
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

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function lessonIdFromFile(filePath: string): number {
  const match = /lesson(\d+)_row_ledger\.json$/.exec(path.basename(filePath));
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function queueKey(row: Pick<QueueRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function queueRowFromLedger(ledger: LessonLedger, row: GeneratedRow): QueueRow {
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
}

function parseJsonl(filePath: string, findings: Finding[], repoRoot: string): QueueRow[] {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  const rows: QueueRow[] = [];
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    try {
      rows.push(JSON.parse(line) as QueueRow);
    } catch (error) {
      findings.push({
        severity: 'blocker',
        code: 'jsonl_parse_error',
        message: `Could not parse JSONL line ${index + 1}: ${String(error)}`,
        path: artifactPath(repoRoot, filePath),
      });
    }
  }
  return rows;
}

function parseTsv(filePath: string, findings: Finding[], repoRoot: string): Map<string, Record<string, string>> {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const rows = new Map<string, Record<string, string>>();
  if (lines.length === 0) {
    findings.push({
      severity: 'blocker',
      code: 'tsv_empty',
      message: 'Reviewer TSV is empty.',
      path: artifactPath(repoRoot, filePath),
    });
    return rows;
  }
  const headers = lines[0].split('\t');
  if (headers.join('\t') !== TSV_HEADERS.join('\t')) {
    findings.push({
      severity: 'blocker',
      code: 'tsv_header_mismatch',
      message: 'Reviewer TSV header does not match the handoff contract.',
      path: artifactPath(repoRoot, filePath),
    });
  }
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split('\t');
    if (cells.length !== TSV_HEADERS.length) {
      findings.push({
        severity: 'blocker',
        code: 'tsv_row_width_invalid',
        message: `TSV row ${index + 2} has ${cells.length} cells, expected ${TSV_HEADERS.length}.`,
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

function queueRowsEqual(expected: QueueRow, actual: QueueRow): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function tsvValue(row: QueueRow, header: string): string {
  const value = row[header as keyof QueueRow];
  if (Array.isArray(value)) return value.join(' | ');
  return String(value ?? '');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Reviewer Handoff Integrity Audit',
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
    `- Generated rows: ${report.summary.generatedRows}`,
    `- JSONL rows: ${report.summary.jsonlRows}`,
    `- TSV rows: ${report.summary.tsvRows}`,
    `- Matching JSONL rows: ${report.summary.matchingJsonlRows}`,
    `- Matching TSV rows: ${report.summary.matchingTsvRows}`,
    `- Duplicate queue keys: ${report.summary.duplicateQueueKeys}`,
    `- Missing queue rows: ${report.summary.missingQueueRows}`,
    `- Extra queue rows: ${report.summary.extraQueueRows}`,
    `- Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`,
    `- Rows with activation violations: ${report.summary.rowsWithActivationViolations}`,
    `- Referenced artifacts present: ${report.summary.referencedArtifactsPresent}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Hashes',
    '',
    `- reviewerQueueJsonlSha256: \`${report.hashes.reviewerQueueJsonlSha256}\``,
    `- reviewerQueueTsvSha256: \`${report.hashes.reviewerQueueTsvSha256}\``,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      const suffix = [
        finding.path ? `path=${finding.path}` : null,
        finding.phraseId ? `phrase=${finding.phraseId}` : null,
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
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_handoff_integrity_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const generatedDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const auditsDir = path.join(runDir, 'audits');
  const queueJsonlPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_queue.jsonl');
  const queueTsvPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_queue.tsv');
  const handoffPath = path.join(auditsDir, 'french_reviewer_handoff_packet.json');
  const findings: Finding[] = [];

  const ledgerFiles = fs.readdirSync(generatedDir)
    .filter((file) => file.endsWith('_row_ledger.json'))
    .map((file) => path.join(generatedDir, file))
    .sort((a, b) => lessonIdFromFile(a) - lessonIdFromFile(b));

  const expectedRows: QueueRow[] = [];
  let rowsWithActivationViolations = 0;
  for (const filePath of ledgerFiles) {
    const ledger = readJson<LessonLedger>(filePath);
    if (ledger.activationStatus !== 'blocked_pending_source_review' || ledger.activeAppSeedAllowed !== false) {
      rowsWithActivationViolations += ledger.rows.length;
      findings.push({
        severity: 'blocker',
        code: 'ledger_activation_lock_violation',
        message: 'Generated ledger is not locked for source review.',
        path: artifactPath(repoRoot, filePath),
      });
    }
    if (ledger.rows.length !== 50) {
      findings.push({
        severity: 'blocker',
        code: 'ledger_row_count_invalid',
        message: `Expected 50 rows in lesson ledger, found ${ledger.rows.length}.`,
        path: artifactPath(repoRoot, filePath),
      });
    }
    for (const row of ledger.rows) {
      if (row.reviewerStatus !== 'needs_review' || row.activationStatus !== 'blocked') {
        rowsWithActivationViolations += 1;
      }
      expectedRows.push(queueRowFromLedger(ledger, row));
    }
  }

  const expectedByKey = new Map(expectedRows.map((row) => [queueKey(row), row]));
  const jsonlRows = parseJsonl(queueJsonlPath, findings, repoRoot);
  const jsonlByKey = new Map<string, QueueRow>();
  let duplicateQueueKeys = 0;
  let rowsWithReviewerWorkspaceValues = 0;
  for (const row of jsonlRows) {
    const key = queueKey(row);
    if (jsonlByKey.has(key)) duplicateQueueKeys += 1;
    jsonlByKey.set(key, row);
    if (row.reviewerDecision !== '' || row.reviewerNotes !== '') rowsWithReviewerWorkspaceValues += 1;
    if (row.currentReviewerStatus !== 'needs_review' || row.currentActivationStatus !== 'blocked') {
      rowsWithActivationViolations += 1;
    }
  }

  const tsvRows = parseTsv(queueTsvPath, findings, repoRoot);
  let matchingJsonlRows = 0;
  let matchingTsvRows = 0;
  let missingQueueRows = 0;
  for (const expected of expectedRows) {
    const key = queueKey(expected);
    const jsonl = jsonlByKey.get(key);
    if (!jsonl) {
      missingQueueRows += 1;
      findings.push({
        severity: 'blocker',
        code: 'jsonl_queue_row_missing',
        message: 'Expected generated row is missing from reviewer JSONL queue.',
        phraseId: expected.phraseId,
      });
    } else if (queueRowsEqual(expected, jsonl)) {
      matchingJsonlRows += 1;
    } else {
      findings.push({
        severity: 'blocker',
        code: 'jsonl_queue_row_mismatch',
        message: 'Reviewer JSONL queue row does not match generated ledger row.',
        phraseId: expected.phraseId,
      });
    }

    const tsv = tsvRows.get(key);
    if (!tsv) {
      missingQueueRows += 1;
      findings.push({
        severity: 'blocker',
        code: 'tsv_queue_row_missing',
        message: 'Expected generated row is missing from reviewer TSV queue.',
        phraseId: expected.phraseId,
      });
    } else {
      const tsvMatches = TSV_HEADERS.every((header) => tsv[header] === tsvValue(expected, header));
      if (tsvMatches) {
        matchingTsvRows += 1;
      } else {
        findings.push({
          severity: 'blocker',
          code: 'tsv_queue_row_mismatch',
          message: 'Reviewer TSV queue row does not match generated ledger row.',
          phraseId: expected.phraseId,
        });
      }
    }
  }

  let extraQueueRows = 0;
  for (const key of jsonlByKey.keys()) {
    if (!expectedByKey.has(key)) extraQueueRows += 1;
  }
  for (const key of tsvRows.keys()) {
    if (!expectedByKey.has(key)) extraQueueRows += 1;
  }
  if (extraQueueRows > 0) {
    findings.push({
      severity: 'blocker',
      code: 'extra_queue_rows',
      message: `${extraQueueRows} reviewer queue rows do not exist in generated ledgers.`,
    });
  }
  if (rowsWithReviewerWorkspaceValues > 0) {
    findings.push({
      severity: 'blocker',
      code: 'reviewer_workspace_not_empty',
      message: `${rowsWithReviewerWorkspaceValues} reviewer queue rows already contain reviewer workspace values.`,
    });
  }
  if (rowsWithActivationViolations > 0) {
    findings.push({
      severity: 'blocker',
      code: 'activation_lock_violation',
      message: `${rowsWithActivationViolations} generated or queue rows are not locked for review.`,
    });
  }

  const handoff = readJson<Record<string, unknown>>(handoffPath);
  const outputArtifacts = handoff.outputArtifacts as Record<string, string> | undefined;
  const referencedArtifacts = [
    outputArtifacts?.reviewerQueueJsonl,
    outputArtifacts?.reviewerQueueTsv,
    outputArtifacts?.handoffJson,
    outputArtifacts?.handoffMd,
  ].filter((value): value is string => typeof value === 'string');
  let referencedArtifactsPresent = 0;
  for (const artifact of referencedArtifacts) {
    const artifactAbs = path.resolve(repoRoot, artifact);
    if (fs.existsSync(artifactAbs)) {
      referencedArtifactsPresent += 1;
    } else {
      findings.push({
        severity: 'blocker',
        code: 'referenced_artifact_missing',
        message: 'Handoff packet references a missing artifact.',
        path: artifact,
      });
    }
  }
  const handoffSummary = handoff.summary as Record<string, unknown> | undefined;
  if (!handoffSummary || handoffSummary.readyForReviewer !== true || handoffSummary.readyForApply !== false || handoffSummary.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'handoff_summary_state_invalid',
      message: 'Handoff summary must be ready for reviewer, not ready for apply, and production writes must remain disabled.',
      path: artifactPath(repoRoot, handoffPath),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    blockers === 0 &&
    expectedRows.length === 1600 &&
    jsonlRows.length === expectedRows.length &&
    tsvRows.size === expectedRows.length &&
    matchingJsonlRows === expectedRows.length &&
    matchingTsvRows === expectedRows.length;

  const report: Report = {
    schemaVersion: 'gustav-french-reviewer-handoff-integrity-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForReviewer ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      generatedLedgers: ledgerFiles.length,
      generatedRows: expectedRows.length,
      jsonlRows: jsonlRows.length,
      tsvRows: tsvRows.size,
      matchingJsonlRows,
      matchingTsvRows,
      duplicateQueueKeys,
      missingQueueRows,
      extraQueueRows,
      rowsWithReviewerWorkspaceValues,
      rowsWithActivationViolations,
      referencedArtifactsPresent,
      blockers,
      warnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    hashes: {
      reviewerQueueJsonlSha256: sha256(queueJsonlPath),
      reviewerQueueTsvSha256: sha256(queueTsvPath),
    },
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_reviewer_handoff_integrity_audit.json');
  const outMd = path.join(auditsDir, 'french_reviewer_handoff_integrity_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French reviewer handoff integrity audit: ${report.status}`);
  console.log(`Generated rows: ${report.summary.generatedRows}`);
  console.log(`JSONL rows: ${report.summary.jsonlRows}`);
  console.log(`TSV rows: ${report.summary.tsvRows}`);
  console.log(`Matching JSONL rows: ${report.summary.matchingJsonlRows}`);
  console.log(`Matching TSV rows: ${report.summary.matchingTsvRows}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
