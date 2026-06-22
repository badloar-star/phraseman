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

type ReviewBatch = {
  batchId: string;
  phraseIds: string[];
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  phraseId?: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-french-review-decision-template-integrity-audit-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    queueRows: number;
    templateJsonlRows: number;
    templateTsvRows: number;
    matchingJsonlRows: number;
    matchingTsvRows: number;
    duplicatePhraseIds: number;
    duplicateSourceQueueIndexes: number;
    rowsWithReviewerDecision: number;
    rowsWithCorrectionValues: number;
    rowsWithReviewerMetadata: number;
    rowsNeedingReview: number;
    rowsBlocked: number;
    allowedDecisionCount: number;
    schemaHashMatchesContract: boolean;
    templateJsonlHashMatchesContract: boolean;
    templateTsvHashMatchesContract: boolean;
    contractBlockers: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  hashes: {
    decisionSchemaSha256: string;
    contractDecisionSchemaSha256: string;
    decisionTemplateJsonlSha256: string;
    contractDecisionTemplateJsonlSha256: string;
    decisionTemplateTsvSha256: string;
    contractDecisionTemplateTsvSha256: string;
  };
  findings: Finding[];
};

const ALLOWED_DECISIONS = ['accept_as_is', 'needs_correction', 'reject', 'skip'];

const TSV_HEADERS = [
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

function templateKey(row: Pick<DecisionTemplateRow, 'lessonId' | 'phraseId'>): string {
  return `${row.lessonId}:${row.phraseId}`;
}

function parseTsv(filePath: string, findings: Finding[], repoRoot: string): DecisionTemplateRow[] {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) {
    findings.push({
      severity: 'blocker',
      code: 'template_tsv_empty',
      message: 'Decision template TSV is empty.',
      path: artifactPath(repoRoot, filePath),
    });
    return [];
  }
  const headers = lines[0].split('\t');
  if (headers.join('\t') !== TSV_HEADERS.join('\t')) {
    findings.push({
      severity: 'blocker',
      code: 'template_tsv_header_mismatch',
      message: 'Decision template TSV header does not match contract.',
      path: artifactPath(repoRoot, filePath),
    });
  }
  const rows: DecisionTemplateRow[] = [];
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split('\t');
    if (cells.length !== TSV_HEADERS.length) {
      findings.push({
        severity: 'blocker',
        code: 'template_tsv_row_width_invalid',
        message: `TSV row ${index + 2} has ${cells.length} cells, expected ${TSV_HEADERS.length}.`,
        path: artifactPath(repoRoot, filePath),
      });
      continue;
    }
    const record: Record<string, string> = {};
    TSV_HEADERS.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex];
    });
    rows.push({
      sourceQueueIndex: Number(record.sourceQueueIndex),
      batchId: record.batchId,
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
      correctedFrench: record.correctedFrench,
      correctedQuizBlank: record.correctedQuizBlank,
      correctedQuizCorrect: record.correctedQuizCorrect,
      correctedQuizDistractors: record.correctedQuizDistractors,
      reviewerNotes: record.reviewerNotes,
      reviewerName: record.reviewerName,
      reviewedAt: record.reviewedAt,
    });
  }
  return rows;
}

function expectedTemplateRow(queueRow: QueueRow, index: number, batchId: string): DecisionTemplateRow {
  return {
    sourceQueueIndex: index + 1,
    batchId,
    lessonId: queueRow.lessonId,
    phraseId: queueRow.phraseId,
    englishBase: queueRow.englishBase,
    russianMeaning: queueRow.russianMeaning,
    ukrainianMeaning: queueRow.ukrainianMeaning,
    proposedFrench: queueRow.proposedFrench,
    quizBlank: queueRow.quizBlank,
    quizCorrect: queueRow.quizCorrect,
    quizDistractors: queueRow.quizDistractors,
    quizCategory: queueRow.quizCategory,
    currentReviewerStatus: 'needs_review',
    currentActivationStatus: 'blocked',
    reviewerDecision: '',
    correctedFrench: '',
    correctedQuizBlank: '',
    correctedQuizCorrect: '',
    correctedQuizDistractors: '',
    reviewerNotes: '',
    reviewerName: '',
    reviewedAt: '',
  };
}

function templateRowsEqual(expected: DecisionTemplateRow, actual: DecisionTemplateRow): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Review Decision Template Integrity Audit',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Queue rows: ${report.summary.queueRows}`,
    `- Template JSONL rows: ${report.summary.templateJsonlRows}`,
    `- Template TSV rows: ${report.summary.templateTsvRows}`,
    `- Matching JSONL rows: ${report.summary.matchingJsonlRows}`,
    `- Matching TSV rows: ${report.summary.matchingTsvRows}`,
    `- Duplicate phrase ids: ${report.summary.duplicatePhraseIds}`,
    `- Duplicate source queue indexes: ${report.summary.duplicateSourceQueueIndexes}`,
    `- Rows with reviewerDecision: ${report.summary.rowsWithReviewerDecision}`,
    `- Rows with correction values: ${report.summary.rowsWithCorrectionValues}`,
    `- Rows with reviewer metadata: ${report.summary.rowsWithReviewerMetadata}`,
    `- Rows needing review: ${report.summary.rowsNeedingReview}`,
    `- Rows blocked: ${report.summary.rowsBlocked}`,
    `- Allowed decision count: ${report.summary.allowedDecisionCount}`,
    `- Schema hash matches contract: ${report.summary.schemaHashMatchesContract ? 'yes' : 'no'}`,
    `- Template JSONL hash matches contract: ${report.summary.templateJsonlHashMatchesContract ? 'yes' : 'no'}`,
    `- Template TSV hash matches contract: ${report.summary.templateTsvHashMatchesContract ? 'yes' : 'no'}`,
    `- Contract blockers: ${report.summary.contractBlockers}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Hashes',
    '',
    `- Decision schema sha256: \`${report.hashes.decisionSchemaSha256}\``,
    `- Contract decision schema sha256: \`${report.hashes.contractDecisionSchemaSha256}\``,
    `- Decision template JSONL sha256: \`${report.hashes.decisionTemplateJsonlSha256}\``,
    `- Contract decision template JSONL sha256: \`${report.hashes.contractDecisionTemplateJsonlSha256}\``,
    `- Decision template TSV sha256: \`${report.hashes.decisionTemplateTsvSha256}\``,
    `- Contract decision template TSV sha256: \`${report.hashes.contractDecisionTemplateTsvSha256}\``,
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
    console.error('Usage: npx tsx scripts/gustav_french_review_decision_template_integrity_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const queuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const batchPacketPath = path.join(auditsDir, 'french_reviewer_batch_packet.json');
  const contractPath = path.join(auditsDir, 'french_review_decision_contract_packet.json');
  const schemaPath = path.join(reviewerDir, 'french_review_decision_schema.json');
  const templateJsonlPath = path.join(reviewerDir, 'french_review_decision_template.jsonl');
  const templateTsvPath = path.join(reviewerDir, 'french_review_decision_template.tsv');
  const findings: Finding[] = [];

  const queueRows = parseJsonl<QueueRow>(queuePath);
  const templateRows = parseJsonl<DecisionTemplateRow>(templateJsonlPath);
  const tsvRows = parseTsv(templateTsvPath, findings, repoRoot);
  const batchPacket = asRecord(readJson<unknown>(batchPacketPath));
  const contract = asRecord(readJson<unknown>(contractPath));
  const schema = asRecord(readJson<unknown>(schemaPath));
  const contractSummary = asRecord(contract.summary);
  const contractHashes = asRecord(contract.hashes);
  const contractBlockers = Number(contractSummary.findingsBlockers ?? 0);
  const batches = (batchPacket.batches as ReviewBatch[] | undefined) ?? [];
  const batchByPhraseId = new Map<string, string>();
  for (const batch of batches) {
    for (const phraseId of batch.phraseIds) batchByPhraseId.set(phraseId, batch.batchId);
  }

  if (contractSummary.readyForReviewer !== true || contractSummary.readyForApply !== false || contractSummary.mayModifyProductionAppFiles !== false || contractBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'contract_packet_state_invalid',
      message: 'Decision contract packet must be ready for reviewer, not ready for apply, and have no blockers.',
      path: artifactPath(repoRoot, contractPath),
    });
  }

  const allowedDecisions = Array.isArray(schema.allowedReviewerDecisions) ? schema.allowedReviewerDecisions as string[] : [];
  if (allowedDecisions.join('|') !== ALLOWED_DECISIONS.join('|')) {
    findings.push({
      severity: 'blocker',
      code: 'allowed_decisions_mismatch',
      message: 'Decision schema allowedReviewerDecisions do not match expected contract.',
      path: artifactPath(repoRoot, schemaPath),
    });
  }
  const generatedRowsRemain = asRecord(schema.generatedRowsRemain);
  if (generatedRowsRemain.readyForApply !== false || generatedRowsRemain.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'schema_apply_state_invalid',
      message: 'Decision schema must keep readyForApply=false and mayModifyProductionAppFiles=false.',
      path: artifactPath(repoRoot, schemaPath),
    });
  }

  const schemaHash = sha256(schemaPath);
  const templateJsonlHash = sha256(templateJsonlPath);
  const templateTsvHash = sha256(templateTsvPath);
  const contractSchemaHash = String(contractHashes.decisionSchemaSha256 ?? '');
  const contractTemplateJsonlHash = String(contractHashes.decisionTemplateJsonlSha256 ?? '');
  const contractTemplateTsvHash = String(contractHashes.decisionTemplateTsvSha256 ?? '');
  if (schemaHash !== contractSchemaHash) {
    findings.push({
      severity: 'blocker',
      code: 'schema_hash_mismatch',
      message: 'Decision schema hash does not match contract packet.',
      path: artifactPath(repoRoot, schemaPath),
    });
  }
  if (templateJsonlHash !== contractTemplateJsonlHash) {
    findings.push({
      severity: 'blocker',
      code: 'template_jsonl_hash_mismatch',
      message: 'Decision template JSONL hash does not match contract packet.',
      path: artifactPath(repoRoot, templateJsonlPath),
    });
  }
  if (templateTsvHash !== contractTemplateTsvHash) {
    findings.push({
      severity: 'blocker',
      code: 'template_tsv_hash_mismatch',
      message: 'Decision template TSV hash does not match contract packet.',
      path: artifactPath(repoRoot, templateTsvPath),
    });
  }

  const seenPhraseIds = new Set<string>();
  const seenIndexes = new Set<number>();
  let duplicatePhraseIds = 0;
  let duplicateSourceQueueIndexes = 0;
  let rowsWithReviewerDecision = 0;
  let rowsWithCorrectionValues = 0;
  let rowsWithReviewerMetadata = 0;
  let rowsNeedingReview = 0;
  let rowsBlocked = 0;
  let matchingJsonlRows = 0;
  let matchingTsvRows = 0;

  for (const [index, queueRow] of queueRows.entries()) {
    const batchId = batchByPhraseId.get(queueRow.phraseId) ?? '';
    const expected = expectedTemplateRow(queueRow, index, batchId);
    const jsonlRow = templateRows[index];
    const tsvRow = tsvRows[index];

    if (!batchId) {
      findings.push({
        severity: 'blocker',
        code: 'batch_mapping_missing',
        message: 'Queue row has no batch mapping.',
        phraseId: queueRow.phraseId,
      });
    }
    if (!jsonlRow || !templateRowsEqual(expected, jsonlRow)) {
      findings.push({
        severity: 'blocker',
        code: 'template_jsonl_row_mismatch',
        message: 'Decision template JSONL row does not match reviewer queue and batch mapping.',
        phraseId: queueRow.phraseId,
      });
    } else {
      matchingJsonlRows += 1;
    }
    if (!tsvRow || !templateRowsEqual(expected, tsvRow)) {
      findings.push({
        severity: 'blocker',
        code: 'template_tsv_row_mismatch',
        message: 'Decision template TSV row does not match reviewer queue and batch mapping.',
        phraseId: queueRow.phraseId,
      });
    } else {
      matchingTsvRows += 1;
    }
  }

  for (const row of templateRows) {
    if (seenPhraseIds.has(row.phraseId)) duplicatePhraseIds += 1;
    seenPhraseIds.add(row.phraseId);
    if (seenIndexes.has(row.sourceQueueIndex)) duplicateSourceQueueIndexes += 1;
    seenIndexes.add(row.sourceQueueIndex);
    if (row.reviewerDecision !== '') rowsWithReviewerDecision += 1;
    if (row.correctedFrench !== '' || row.correctedQuizBlank !== '' || row.correctedQuizCorrect !== '' || row.correctedQuizDistractors !== '') {
      rowsWithCorrectionValues += 1;
    }
    if (row.reviewerNotes !== '' || row.reviewerName !== '' || row.reviewedAt !== '') rowsWithReviewerMetadata += 1;
    if (row.currentReviewerStatus === 'needs_review') rowsNeedingReview += 1;
    if (row.currentActivationStatus === 'blocked') rowsBlocked += 1;
  }

  if (queueRows.length !== 1600 || templateRows.length !== 1600 || tsvRows.length !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'template_row_count_invalid',
      message: `Expected 1600 queue, JSONL, and TSV rows; found queue=${queueRows.length}, jsonl=${templateRows.length}, tsv=${tsvRows.length}.`,
    });
  }
  if (rowsWithReviewerDecision > 0 || rowsWithCorrectionValues > 0 || rowsWithReviewerMetadata > 0) {
    findings.push({
      severity: 'blocker',
      code: 'template_not_empty',
      message: 'Decision template must not contain reviewer decisions, corrections, notes, names, or timestamps.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    blockers === 0 &&
    queueRows.length === 1600 &&
    templateRows.length === 1600 &&
    tsvRows.length === 1600 &&
    matchingJsonlRows === 1600 &&
    matchingTsvRows === 1600 &&
    rowsWithReviewerDecision === 0 &&
    rowsWithCorrectionValues === 0 &&
    rowsWithReviewerMetadata === 0 &&
    rowsNeedingReview === 1600 &&
    rowsBlocked === 1600;

  const report: Report = {
    schemaVersion: 'gustav-french-review-decision-template-integrity-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: readyForReviewer ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      queueRows: queueRows.length,
      templateJsonlRows: templateRows.length,
      templateTsvRows: tsvRows.length,
      matchingJsonlRows,
      matchingTsvRows,
      duplicatePhraseIds,
      duplicateSourceQueueIndexes,
      rowsWithReviewerDecision,
      rowsWithCorrectionValues,
      rowsWithReviewerMetadata,
      rowsNeedingReview,
      rowsBlocked,
      allowedDecisionCount: allowedDecisions.length,
      schemaHashMatchesContract: schemaHash === contractSchemaHash,
      templateJsonlHashMatchesContract: templateJsonlHash === contractTemplateJsonlHash,
      templateTsvHashMatchesContract: templateTsvHash === contractTemplateTsvHash,
      contractBlockers,
      blockers,
      warnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    hashes: {
      decisionSchemaSha256: schemaHash,
      contractDecisionSchemaSha256: contractSchemaHash,
      decisionTemplateJsonlSha256: templateJsonlHash,
      contractDecisionTemplateJsonlSha256: contractTemplateJsonlHash,
      decisionTemplateTsvSha256: templateTsvHash,
      contractDecisionTemplateTsvSha256: contractTemplateTsvHash,
    },
    findings,
  };

  ensureDir(auditsDir);
  const outJson = path.join(auditsDir, 'french_review_decision_template_integrity_audit.json');
  const outMd = path.join(auditsDir, 'french_review_decision_template_integrity_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV French review decision template integrity audit: ${report.status}`);
  console.log(`Queue rows: ${report.summary.queueRows}`);
  console.log(`Template JSONL rows: ${report.summary.templateJsonlRows}`);
  console.log(`Template TSV rows: ${report.summary.templateTsvRows}`);
  console.log(`Matching JSONL rows: ${report.summary.matchingJsonlRows}`);
  console.log(`Matching TSV rows: ${report.summary.matchingTsvRows}`);
  console.log(`Rows with reviewerDecision: ${report.summary.rowsWithReviewerDecision}`);
  console.log(`Rows with correction values: ${report.summary.rowsWithCorrectionValues}`);
  console.log(`Blockers: ${report.summary.blockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
