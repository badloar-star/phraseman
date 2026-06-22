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
  phraseIds: string[];
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

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  phraseId?: string;
};

type Report = {
  schemaVersion: 'gustav-french-review-decision-contract-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    sourceRows: number;
    templateRows: number;
    batches: number;
    blankReviewerDecisionRows: number;
    rowsWithReviewerWorkspaceValues: number;
    rowsBlocked: number;
    rowsNeedingReview: number;
    allowedReviewerDecisions: number;
    batchFilesIntegrityBlockers: number;
    translationQaBlockers: number;
    findingsBlockers: number;
    findingsWarnings: number;
    readyForReviewer: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceArtifacts: {
    reviewerQueueJsonl: string;
    reviewerBatchPacket: string;
    batchFilesIntegrityAudit: string;
    translationQaAudit: string;
    sourceQueueSha256: string;
  };
  outputArtifacts: {
    decisionSchemaJson: string;
    decisionTemplateJsonl: string;
    decisionTemplateTsv: string;
    contractPacketJson: string;
    contractPacketMd: string;
  };
  hashes: {
    decisionSchemaSha256: string;
    decisionTemplateJsonlSha256: string;
    decisionTemplateTsvSha256: string;
  };
  allowedDecisions: string[];
  requiredReviewerFields: string[];
  findings: Finding[];
};

const ALLOWED_DECISIONS = ['accept_as_is', 'needs_correction', 'reject', 'skip'];

const TEMPLATE_HEADERS = [
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

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function renderTemplateTsv(rows: DecisionTemplateRow[]): string {
  const lines = [TEMPLATE_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push(TEMPLATE_HEADERS.map((header) => tsvCell(row[header as keyof DecisionTemplateRow])).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function buildDecisionSchema(runId: string): Record<string, unknown> {
  return {
    schemaVersion: 'gustav-french-review-decision-schema-v0',
    runId,
    purpose: 'Human review decision import contract for generated French rows. This schema does not approve app apply.',
    allowedReviewerDecisions: ALLOWED_DECISIONS,
    requiredIdentityFields: ['sourceQueueIndex', 'batchId', 'lessonId', 'phraseId'],
    requiredContextFields: [
      'englishBase',
      'russianMeaning',
      'ukrainianMeaning',
      'proposedFrench',
      'quizBlank',
      'quizCorrect',
      'quizDistractors',
      'quizCategory',
    ],
    writableReviewerFields: [
      'reviewerDecision',
      'correctedFrench',
      'correctedQuizBlank',
      'correctedQuizCorrect',
      'correctedQuizDistractors',
      'reviewerNotes',
      'reviewerName',
      'reviewedAt',
    ],
    rules: [
      'reviewerDecision must be one of allowedReviewerDecisions when a row is reviewed.',
      'accept_as_is must not contain correctedFrench or corrected quiz fields.',
      'needs_correction must include reviewerNotes and at least one corrected field.',
      'reject must include reviewerNotes.',
      'skip leaves the row blocked and must include reviewerNotes if used after review starts.',
      'This schema never changes reviewerStatus or activationStatus in generated ledgers.',
      'Production apply requires a separate explicit approval and transaction.',
    ],
    generatedRowsRemain: {
      currentReviewerStatus: 'needs_review',
      currentActivationStatus: 'blocked',
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV French Review Decision Contract Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Source rows: ${report.summary.sourceRows}`,
    `- Template rows: ${report.summary.templateRows}`,
    `- Batches: ${report.summary.batches}`,
    `- Blank reviewerDecision rows: ${report.summary.blankReviewerDecisionRows}`,
    `- Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`,
    `- Rows blocked: ${report.summary.rowsBlocked}`,
    `- Rows needing review: ${report.summary.rowsNeedingReview}`,
    `- Allowed reviewer decisions: ${report.summary.allowedReviewerDecisions}`,
    `- Batch files integrity blockers: ${report.summary.batchFilesIntegrityBlockers}`,
    `- Translation QA blockers: ${report.summary.translationQaBlockers}`,
    `- Findings blockers: ${report.summary.findingsBlockers}`,
    `- Findings warnings: ${report.summary.findingsWarnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Output Artifacts',
    '',
    `- Decision schema: \`${report.outputArtifacts.decisionSchemaJson}\``,
    `- Decision template JSONL: \`${report.outputArtifacts.decisionTemplateJsonl}\``,
    `- Decision template TSV: \`${report.outputArtifacts.decisionTemplateTsv}\``,
    `- Contract packet JSON: \`${report.outputArtifacts.contractPacketJson}\``,
    `- Contract packet MD: \`${report.outputArtifacts.contractPacketMd}\``,
    '',
    '## Allowed Decisions',
    '',
  ];
  for (const decision of report.allowedDecisions) {
    lines.push(`- \`${decision}\``);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.phraseId ? ` (${finding.phraseId})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet defines a future human-review decision format only.');
  lines.push('- It does not write reviewer decisions.');
  lines.push('- It does not accept generated rows.');
  lines.push('- It does not approve or perform app apply.');
  lines.push('- It does not modify production app files.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_review_decision_contract_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const queueJsonlPath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const batchPacketPath = path.join(auditsDir, 'french_reviewer_batch_packet.json');
  const batchIntegrityPath = path.join(auditsDir, 'french_reviewer_batch_files_integrity_audit.json');
  const translationQaPath = path.join(auditsDir, 'french_translation_qa_audit.json');
  const findings: Finding[] = [];

  const queueRows = parseJsonl<QueueRow>(queueJsonlPath);
  const batchPacket = asRecord(readJson<unknown>(batchPacketPath));
  const batchIntegrity = asRecord(readJson<unknown>(batchIntegrityPath));
  const translationQa = asRecord(readJson<unknown>(translationQaPath));
  const batchPacketSummary = asRecord(batchPacket.summary);
  const batchIntegritySummary = asRecord(batchIntegrity.summary);
  const translationSummary = asRecord(translationQa.summary);
  const batches = (batchPacket.batches as ReviewBatch[] | undefined) ?? [];
  const batchByPhraseId = new Map<string, ReviewBatch>();
  for (const batch of batches) {
    for (const phraseId of batch.phraseIds) batchByPhraseId.set(phraseId, batch);
  }

  const batchFilesIntegrityBlockers = Number(batchIntegritySummary.blockers ?? 0);
  const translationQaBlockers = Number(translationSummary.blockers ?? 0);
  if (batchIntegritySummary.readyForReviewer !== true || batchFilesIntegrityBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'batch_files_integrity_not_ready',
      message: 'Batch files integrity audit must pass before review decision contract generation.',
    });
  }
  if (batchPacketSummary.readyForReviewer !== true) {
    findings.push({
      severity: 'blocker',
      code: 'reviewer_batch_packet_not_ready',
      message: 'Reviewer batch packet must be ready before review decision contract generation.',
    });
  }
  if (translationQaBlockers !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'translation_qa_blockers_present',
      message: `Translation QA has ${translationQaBlockers} blockers.`,
    });
  }

  const templateRows: DecisionTemplateRow[] = queueRows.map((row, index) => {
    const batch = batchByPhraseId.get(row.phraseId);
    if (!batch) {
      findings.push({
        severity: 'blocker',
        code: 'batch_mapping_missing',
        message: 'Queue row does not have a batch mapping.',
        phraseId: row.phraseId,
      });
    }
    return {
      sourceQueueIndex: index + 1,
      batchId: batch?.batchId ?? '',
      lessonId: row.lessonId,
      phraseId: row.phraseId,
      englishBase: row.englishBase,
      russianMeaning: row.russianMeaning,
      ukrainianMeaning: row.ukrainianMeaning,
      proposedFrench: row.proposedFrench,
      quizBlank: row.quizBlank,
      quizCorrect: row.quizCorrect,
      quizDistractors: row.quizDistractors,
      quizCategory: row.quizCategory,
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
  });

  const blankReviewerDecisionRows = templateRows.filter((row) => row.reviewerDecision === '').length;
  const rowsWithReviewerWorkspaceValues = templateRows.filter((row) =>
    row.reviewerDecision !== '' ||
    row.correctedFrench !== '' ||
    row.correctedQuizBlank !== '' ||
    row.correctedQuizCorrect !== '' ||
    row.correctedQuizDistractors !== '' ||
    row.reviewerNotes !== '' ||
    row.reviewerName !== '' ||
    row.reviewedAt !== '',
  ).length;
  const rowsBlocked = templateRows.filter((row) => row.currentActivationStatus === 'blocked').length;
  const rowsNeedingReview = templateRows.filter((row) => row.currentReviewerStatus === 'needs_review').length;
  if (queueRows.length !== 1600 || templateRows.length !== 1600) {
    findings.push({
      severity: 'blocker',
      code: 'template_row_count_invalid',
      message: `Expected 1600 queue/template rows, found queue=${queueRows.length}, template=${templateRows.length}.`,
    });
  }
  if (rowsWithReviewerWorkspaceValues > 0) {
    findings.push({
      severity: 'blocker',
      code: 'template_contains_reviewer_decisions',
      message: `${rowsWithReviewerWorkspaceValues} template rows already contain reviewer workspace values.`,
    });
  }

  ensureDir(reviewerDir);
  ensureDir(auditsDir);
  const outSchemaJson = path.join(reviewerDir, 'french_review_decision_schema.json');
  const outTemplateJsonl = path.join(reviewerDir, 'french_review_decision_template.jsonl');
  const outTemplateTsv = path.join(reviewerDir, 'french_review_decision_template.tsv');
  const outPacketJson = path.join(auditsDir, 'french_review_decision_contract_packet.json');
  const outPacketMd = path.join(auditsDir, 'french_review_decision_contract_packet.md');

  fs.writeFileSync(outSchemaJson, `${JSON.stringify(buildDecisionSchema(runId), null, 2)}\n`);
  fs.writeFileSync(outTemplateJsonl, `${templateRows.map((row) => JSON.stringify(row)).join('\n')}\n`);
  fs.writeFileSync(outTemplateTsv, renderTemplateTsv(templateRows));

  const findingsBlockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const findingsWarnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    findingsBlockers === 0 &&
    templateRows.length === 1600 &&
    blankReviewerDecisionRows === 1600 &&
    rowsWithReviewerWorkspaceValues === 0 &&
    rowsBlocked === 1600 &&
    rowsNeedingReview === 1600;

  const report: Report = {
    schemaVersion: 'gustav-french-review-decision-contract-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      sourceRows: queueRows.length,
      templateRows: templateRows.length,
      batches: batches.length,
      blankReviewerDecisionRows,
      rowsWithReviewerWorkspaceValues,
      rowsBlocked,
      rowsNeedingReview,
      allowedReviewerDecisions: ALLOWED_DECISIONS.length,
      batchFilesIntegrityBlockers,
      translationQaBlockers,
      findingsBlockers,
      findingsWarnings,
      readyForReviewer,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceArtifacts: {
      reviewerQueueJsonl: artifactPath(repoRoot, queueJsonlPath),
      reviewerBatchPacket: artifactPath(repoRoot, batchPacketPath),
      batchFilesIntegrityAudit: artifactPath(repoRoot, batchIntegrityPath),
      translationQaAudit: artifactPath(repoRoot, translationQaPath),
      sourceQueueSha256: sha256(queueJsonlPath),
    },
    outputArtifacts: {
      decisionSchemaJson: artifactPath(repoRoot, outSchemaJson),
      decisionTemplateJsonl: artifactPath(repoRoot, outTemplateJsonl),
      decisionTemplateTsv: artifactPath(repoRoot, outTemplateTsv),
      contractPacketJson: artifactPath(repoRoot, outPacketJson),
      contractPacketMd: artifactPath(repoRoot, outPacketMd),
    },
    hashes: {
      decisionSchemaSha256: sha256(outSchemaJson),
      decisionTemplateJsonlSha256: sha256(outTemplateJsonl),
      decisionTemplateTsvSha256: sha256(outTemplateTsv),
    },
    allowedDecisions: ALLOWED_DECISIONS,
    requiredReviewerFields: [
      'reviewerDecision',
      'reviewerNotes',
      'reviewerName',
      'reviewedAt',
    ],
    findings,
  };

  fs.writeFileSync(outPacketJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outPacketMd, renderMarkdown(report));

  console.log(`GUSTAV French review decision contract packet: ${report.status}`);
  console.log(`Template rows: ${report.summary.templateRows}`);
  console.log(`Blank reviewerDecision rows: ${report.summary.blankReviewerDecisionRows}`);
  console.log(`Rows with reviewer workspace values: ${report.summary.rowsWithReviewerWorkspaceValues}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Findings blockers: ${report.summary.findingsBlockers}`);
  console.log(`Report: ${artifactPath(repoRoot, outPacketJson)}`);

  if (findingsBlockers > 0) process.exit(1);
}

void main();
