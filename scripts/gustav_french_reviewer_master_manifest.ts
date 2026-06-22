import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type ArtifactEntry = {
  category: 'generated_lesson_ledger' | 'reviewer_artifact' | 'audit_artifact';
  kind: string;
  path: string;
  bytes: number;
  sha256: string;
};

type SourceReportEntry = {
  name: string;
  path: string;
  status: string;
  decision: string;
  bytes: number;
  sha256: string;
  summary: Record<string, unknown>;
};

type MasterManifest = {
  schemaVersion: 'gustav-french-reviewer-master-manifest-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    generatedLessonLedgers: number;
    generatedRows: number;
    reviewerSourceFiles: number;
    reviewerSourceFilesByExtension: Record<string, number>;
    auditArtifactFiles: number;
    batchJsonlFiles: number;
    batchTsvFiles: number;
    queueRows: number;
    decisionTemplateRows: number;
    translationQaBlockers: number;
    generatedContentBlockers: number;
    handoffIntegrityBlockers: number;
    batchFilesIntegrityBlockers: number;
    decisionTemplateIntegrityBlockers: number;
    decisionImportDryRunBlockers: number;
    starterNoopDryRunBlockers: number;
    fixtureQaBlockers: number;
    priorityAuditBlockers: number;
    priorityIntegrityBlockers: number;
    priorityBatchesBlockers: number;
    languageIsolationBlockers: number;
    languageIsolationWarnings: number;
    rowsMissingTargetLocale: number;
    reviewerExecutionWorkOrderBlockers: number;
    reviewStarterPackBlockers: number;
    reviewProgressBlockers: number;
    runValidatorBlockers: number;
    generationBlockers: number;
    applyBlockers: number;
    criticalArtifactsMissing: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceReports: SourceReportEntry[];
  artifacts: ArtifactEntry[];
  outputArtifacts: {
    manifestJson: string;
    manifestMd: string;
    packetJson: string;
    packetMd: string;
  };
  findings: Finding[];
};

const EXPECTED_LESSON_LEDGER_COUNT = 32;
const EXPECTED_ROW_COUNT = 1600;
const EXPECTED_BATCH_FILE_COUNT = 32;

const CRITICAL_REPORTS = [
  'audits/french_language_isolation_audit.json',
  'audits/french_translation_qa_audit.json',
  'audits/generated_content_audit.json',
  'audits/french_duplicate_translation_review_packet.json',
  'audits/french_reviewer_handoff_packet.json',
  'audits/french_reviewer_handoff_integrity_audit.json',
  'audits/french_reviewer_batch_packet.json',
  'audits/french_reviewer_batch_files_packet.json',
  'audits/french_reviewer_batch_files_integrity_audit.json',
  'audits/french_review_decision_contract_packet.json',
  'audits/french_review_decision_template_integrity_audit.json',
  'audits/french_review_decision_import_dry_run.json',
  'audits/french_review_decision_import_dry_run_starter_priority_ordered_noop.json',
  'audits/french_review_decision_import_fixture_qa.json',
  'audits/french_reviewer_priority_audit.json',
  'audits/french_reviewer_priority_integrity_audit.json',
  'audits/french_reviewer_priority_batches_packet.json',
  'audits/french_reviewer_execution_work_order.json',
  'audits/french_review_starter_pack.json',
  'audits/french_review_progress_audit_starter_priority_ordered.json',
  'audits/readiness_blocker_reduction_packet.json',
  'audits/gustav_readiness_gate.json',
  'audits/run_validator_report.json',
];

const CRITICAL_REVIEWER_ARTIFACTS = [
  'generated/fr/reviewer/french_reviewer_queue.jsonl',
  'generated/fr/reviewer/french_reviewer_queue.tsv',
  'generated/fr/reviewer/french_review_batches.json',
  'generated/fr/reviewer/french_review_batch_files_manifest.json',
  'generated/fr/reviewer/french_review_decision_schema.json',
  'generated/fr/reviewer/french_review_decision_template.jsonl',
  'generated/fr/reviewer/french_review_decision_template.tsv',
  'generated/fr/reviewer/french_reviewer_priority_queue.jsonl',
  'generated/fr/reviewer/french_reviewer_priority_queue.tsv',
  'generated/fr/reviewer/french_priority_review_batches_manifest.json',
  'generated/fr/reviewer/french_priority_review_batches_manifest.md',
  'generated/fr/reviewer/starter_pack/french_review_decision_template_priority_ordered.jsonl',
  'generated/fr/reviewer/starter_pack/french_review_decision_template_priority_ordered.tsv',
  'generated/fr/reviewer/starter_pack/french_review_focus_top_50.jsonl',
  'generated/fr/reviewer/starter_pack/french_review_focus_top_50.tsv',
  'generated/fr/reviewer/starter_pack/french_review_starter_pack_manifest.json',
  'generated/fr/reviewer/starter_pack/french_review_starter_pack_manifest.md',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function runPath(runDir: string, relativePath: string): string {
  return path.join(runDir, ...relativePath.split('/'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function n(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function b(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
  return false;
}

function s(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function extensionOf(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext || '(none)';
}

function countByExtension(files: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const ext = extensionOf(file);
    counts[ext] = (counts[ext] ?? 0) + 1;
  }
  return counts;
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function artifactEntry(repoRoot: string, filePath: string, category: ArtifactEntry['category'], kind: string): ArtifactEntry {
  const stat = fs.statSync(filePath);
  return {
    category,
    kind,
    path: artifactPath(repoRoot, filePath),
    bytes: stat.size,
    sha256: sha256(filePath),
  };
}

function sourceReport(repoRoot: string, filePath: string): SourceReportEntry {
  const body = asRecord(readJson<unknown>(filePath));
  const stat = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    path: artifactPath(repoRoot, filePath),
    status: s(body, 'status'),
    decision: s(body, 'decision'),
    bytes: stat.size,
    sha256: sha256(filePath),
    summary: asRecord(body.summary),
  };
}

function reportSummary(reports: SourceReportEntry[], name: string): Record<string, unknown> {
  const found = reports.find((report) => report.name === name);
  return found ? found.summary : {};
}

function countLedgerRows(filePath: string, findings: Finding[], repoRoot: string): number {
  try {
    const body = asRecord(readJson<unknown>(filePath));
    const rows = body.rows;
    if (!Array.isArray(rows)) {
      findings.push({
        severity: 'blocker',
        code: 'ledger_rows_missing',
        message: 'Generated lesson ledger does not contain a rows array.',
        path: artifactPath(repoRoot, filePath),
      });
      return 0;
    }
    return rows.length;
  } catch (error) {
    findings.push({
      severity: 'blocker',
      code: 'ledger_parse_error',
      message: `Could not parse generated lesson ledger: ${String(error)}`,
      path: artifactPath(repoRoot, filePath),
    });
    return 0;
  }
}

function isMasterManifestOutput(filePath: string): boolean {
  const name = path.basename(filePath);
  return name === 'french_reviewer_master_manifest.json' || name === 'french_reviewer_master_manifest.md';
}

function isMasterPacketOutput(filePath: string): boolean {
  const name = path.basename(filePath);
  return name === 'french_reviewer_master_manifest_packet.json' || name === 'french_reviewer_master_manifest_packet.md';
}

function addBlocker(findings: Finding[], code: string, message: string, filePath?: string, repoRoot?: string): void {
  findings.push({
    severity: 'blocker',
    code,
    message,
    path: filePath && repoRoot ? artifactPath(repoRoot, filePath) : undefined,
  });
}

function renderMarkdown(report: MasterManifest): string {
  const lines = [
    '# GUSTAV French Reviewer Master Manifest',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Generated lesson ledgers: ${report.summary.generatedLessonLedgers}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Reviewer source files: ${report.summary.reviewerSourceFiles}`,
    `- Audit artifact files: ${report.summary.auditArtifactFiles}`,
    `- Batch JSONL files: ${report.summary.batchJsonlFiles}`,
    `- Batch TSV files: ${report.summary.batchTsvFiles}`,
    `- Queue rows: ${report.summary.queueRows}`,
    `- Decision template rows: ${report.summary.decisionTemplateRows}`,
    `- Translation QA blockers: ${report.summary.translationQaBlockers}`,
    `- Generated content blockers: ${report.summary.generatedContentBlockers}`,
    `- Handoff integrity blockers: ${report.summary.handoffIntegrityBlockers}`,
    `- Batch files integrity blockers: ${report.summary.batchFilesIntegrityBlockers}`,
    `- Decision template integrity blockers: ${report.summary.decisionTemplateIntegrityBlockers}`,
    `- Decision import dry-run blockers: ${report.summary.decisionImportDryRunBlockers}`,
    `- Starter no-op dry-run blockers: ${report.summary.starterNoopDryRunBlockers}`,
    `- Fixture QA blockers: ${report.summary.fixtureQaBlockers}`,
    `- Priority audit blockers: ${report.summary.priorityAuditBlockers}`,
    `- Priority integrity blockers: ${report.summary.priorityIntegrityBlockers}`,
    `- Priority batches blockers: ${report.summary.priorityBatchesBlockers}`,
    `- Language isolation blockers: ${report.summary.languageIsolationBlockers}`,
    `- Language isolation warnings: ${report.summary.languageIsolationWarnings}`,
    `- Rows missing targetLocale: ${report.summary.rowsMissingTargetLocale}`,
    `- Reviewer execution work-order blockers: ${report.summary.reviewerExecutionWorkOrderBlockers}`,
    `- Review starter pack blockers: ${report.summary.reviewStarterPackBlockers}`,
    `- Review progress blockers: ${report.summary.reviewProgressBlockers}`,
    `- Run validator blockers: ${report.summary.runValidatorBlockers}`,
    `- Generation blockers: ${report.summary.generationBlockers}`,
    `- Apply blockers: ${report.summary.applyBlockers}`,
    `- Critical artifacts missing: ${report.summary.criticalArtifactsMissing}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Reviewer Files By Extension',
    '',
  ];
  for (const ext of Object.keys(report.summary.reviewerSourceFilesByExtension).sort()) {
    lines.push(`- \`${ext}\`: ${report.summary.reviewerSourceFilesByExtension[ext]}`);
  }
  lines.push('', '## Source Reports', '');
  for (const sourceReportEntry of report.sourceReports) {
    const statusText = sourceReportEntry.status || sourceReportEntry.decision || 'n/a';
    lines.push(`- \`${sourceReportEntry.path}\`: ${statusText}, sha256 \`${sourceReportEntry.sha256}\``);
  }
  lines.push('', '## Output Artifacts', '');
  lines.push(`- Manifest JSON: \`${report.outputArtifacts.manifestJson}\``);
  lines.push(`- Manifest MD: \`${report.outputArtifacts.manifestMd}\``);
  lines.push(`- Packet JSON: \`${report.outputArtifacts.packetJson}\``);
  lines.push(`- Packet MD: \`${report.outputArtifacts.packetMd}\``);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This manifest is a read-only inventory of generated French reviewer artifacts.');
  lines.push('- It does not modify generated lesson ledgers.');
  lines.push('- It does not write reviewer decisions.');
  lines.push('- It does not create production apply approval.');
  lines.push('- It does not modify production app files.');
  lines.push('- French rows remain blocked pending human source review.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_master_manifest.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const findings: Finding[] = [];

  for (const relativePath of [...CRITICAL_REPORTS, ...CRITICAL_REVIEWER_ARTIFACTS]) {
    const fullPath = runPath(runDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      addBlocker(findings, 'critical_artifact_missing', 'A critical French reviewer package artifact is missing.', fullPath, repoRoot);
    }
  }

  const sourceReports: SourceReportEntry[] = [];
  for (const relativePath of CRITICAL_REPORTS) {
    const fullPath = runPath(runDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    try {
      sourceReports.push(sourceReport(repoRoot, fullPath));
    } catch (error) {
      addBlocker(findings, 'source_report_parse_error', `Could not parse critical report: ${String(error)}`, fullPath, repoRoot);
    }
  }

  const lessonLedgers = walkFiles(lessonsDir)
    .filter((file) => /^lesson\d+_row_ledger\.json$/.test(path.basename(file)))
    .sort((a, bValue) => Number(path.basename(a).match(/\d+/)?.[0] ?? 0) - Number(path.basename(bValue).match(/\d+/)?.[0] ?? 0));
  const generatedRows = lessonLedgers.reduce((sum, file) => sum + countLedgerRows(file, findings, repoRoot), 0);

  const reviewerSourceFiles = walkFiles(reviewerDir).filter((file) => !isMasterManifestOutput(file));
  const auditArtifactFiles = walkFiles(auditsDir).filter((file) => !isMasterPacketOutput(file));
  const reviewerSourceFilesByExtension = countByExtension(reviewerSourceFiles);

  const batchJsonlFiles = reviewerSourceFiles.filter((file) => path.basename(path.dirname(file)) === 'batches' && extensionOf(file) === '.jsonl').length;
  const batchTsvFiles = reviewerSourceFiles.filter((file) => path.basename(path.dirname(file)) === 'batches' && extensionOf(file) === '.tsv').length;

  if (lessonLedgers.length !== EXPECTED_LESSON_LEDGER_COUNT) {
    addBlocker(
      findings,
      'generated_lesson_ledger_count_invalid',
      `Expected ${EXPECTED_LESSON_LEDGER_COUNT} generated lesson ledgers, found ${lessonLedgers.length}.`,
    );
  }
  if (generatedRows !== EXPECTED_ROW_COUNT) {
    addBlocker(findings, 'generated_row_count_invalid', `Expected ${EXPECTED_ROW_COUNT} generated rows, found ${generatedRows}.`);
  }
  if (batchJsonlFiles !== EXPECTED_BATCH_FILE_COUNT || batchTsvFiles !== EXPECTED_BATCH_FILE_COUNT) {
    addBlocker(
      findings,
      'review_batch_file_count_invalid',
      `Expected ${EXPECTED_BATCH_FILE_COUNT} JSONL and ${EXPECTED_BATCH_FILE_COUNT} TSV batch files, found jsonl=${batchJsonlFiles}, tsv=${batchTsvFiles}.`,
    );
  }

  const languageIsolation = reportSummary(sourceReports, 'french_language_isolation_audit.json');
  const translationQa = reportSummary(sourceReports, 'french_translation_qa_audit.json');
  const generatedContent = reportSummary(sourceReports, 'generated_content_audit.json');
  const handoffIntegrity = reportSummary(sourceReports, 'french_reviewer_handoff_integrity_audit.json');
  const batchFilesIntegrity = reportSummary(sourceReports, 'french_reviewer_batch_files_integrity_audit.json');
  const decisionTemplateIntegrity = reportSummary(sourceReports, 'french_review_decision_template_integrity_audit.json');
  const decisionImportDryRun = reportSummary(sourceReports, 'french_review_decision_import_dry_run.json');
  const starterNoopDryRun = reportSummary(sourceReports, 'french_review_decision_import_dry_run_starter_priority_ordered_noop.json');
  const fixtureQa = reportSummary(sourceReports, 'french_review_decision_import_fixture_qa.json');
  const priorityAudit = reportSummary(sourceReports, 'french_reviewer_priority_audit.json');
  const priorityIntegrity = reportSummary(sourceReports, 'french_reviewer_priority_integrity_audit.json');
  const priorityBatches = reportSummary(sourceReports, 'french_reviewer_priority_batches_packet.json');
  const reviewerExecutionWorkOrder = reportSummary(sourceReports, 'french_reviewer_execution_work_order.json');
  const reviewStarterPack = reportSummary(sourceReports, 'french_review_starter_pack.json');
  const reviewProgress = reportSummary(sourceReports, 'french_review_progress_audit_starter_priority_ordered.json');
  const readinessBlockers = reportSummary(sourceReports, 'readiness_blocker_reduction_packet.json');
  const runValidator = reportSummary(sourceReports, 'run_validator_report.json');

  const languageIsolationBlockers = n(languageIsolation, 'blockers');
  const languageIsolationWarnings = n(languageIsolation, 'warnings');
  const rowsMissingTargetLocale = n(languageIsolation, 'rowsMissingTargetLocale');
  const translationQaBlockers = n(translationQa, 'blockers');
  const generatedContentBlockers = n(generatedContent, 'blockers');
  const handoffIntegrityBlockers = n(handoffIntegrity, 'blockers');
  const batchFilesIntegrityBlockers = n(batchFilesIntegrity, 'blockers');
  const decisionTemplateIntegrityBlockers = n(decisionTemplateIntegrity, 'blockers');
  const decisionImportDryRunBlockers = n(decisionImportDryRun, 'blockers');
  const starterNoopDryRunBlockers = n(starterNoopDryRun, 'blockers');
  const fixtureQaBlockers = n(fixtureQa, 'blockers');
  const priorityAuditBlockers = n(priorityAudit, 'blockers');
  const priorityIntegrityBlockers = n(priorityIntegrity, 'blockers');
  const priorityBatchesBlockers = n(priorityBatches, 'findingsBlockers') || n(priorityBatches, 'blockers');
  const reviewerExecutionWorkOrderBlockers = n(reviewerExecutionWorkOrder, 'blockers');
  const reviewStarterPackBlockers = n(reviewStarterPack, 'blockers');
  const reviewProgressBlockers = n(reviewProgress, 'blockers');
  const runValidatorBlockers = n(runValidator, 'blockers');
  const generationBlockers = n(readinessBlockers, 'generationBlockers');
  const applyBlockers = n(readinessBlockers, 'applyBlockers');
  const queueRows = n(batchFilesIntegrity, 'queueRows') || n(decisionTemplateIntegrity, 'queueRows');
  const decisionTemplateRows = n(decisionTemplateIntegrity, 'templateJsonlRows') || n(decisionImportDryRun, 'decisionRows');
  const readyForDecisionImport = b(decisionImportDryRun, 'readyForDecisionImport');

  const gateBlockers: Array<[string, number]> = [
    ['language_isolation_blockers', languageIsolationBlockers],
    ['language_isolation_missing_target_locale', rowsMissingTargetLocale],
    ['translation_qa_blockers', translationQaBlockers],
    ['generated_content_blockers', generatedContentBlockers],
    ['handoff_integrity_blockers', handoffIntegrityBlockers],
    ['batch_files_integrity_blockers', batchFilesIntegrityBlockers],
    ['decision_template_integrity_blockers', decisionTemplateIntegrityBlockers],
    ['decision_import_dry_run_blockers', decisionImportDryRunBlockers],
    ['starter_noop_dry_run_blockers', starterNoopDryRunBlockers],
    ['fixture_qa_blockers', fixtureQaBlockers],
    ['priority_audit_blockers', priorityAuditBlockers],
    ['priority_integrity_blockers', priorityIntegrityBlockers],
    ['priority_batches_blockers', priorityBatchesBlockers],
    ['reviewer_execution_work_order_blockers', reviewerExecutionWorkOrderBlockers],
    ['review_starter_pack_blockers', reviewStarterPackBlockers],
    ['review_progress_blockers', reviewProgressBlockers],
    ['run_validator_blockers', runValidatorBlockers],
    ['generation_blockers', generationBlockers],
  ];

  for (const [code, count] of gateBlockers) {
    if (count > 0) {
      addBlocker(findings, String(code), `Critical source report contains ${count} blocker(s).`);
    }
  }

  const criticalArtifactsMissing = findings.filter((finding) => finding.code === 'critical_artifact_missing').length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const reportWarnings = [
    languageIsolationWarnings,
    n(translationQa, 'warnings'),
    n(generatedContent, 'warnings'),
    n(handoffIntegrity, 'warnings'),
    n(batchFilesIntegrity, 'warnings'),
    n(decisionTemplateIntegrity, 'warnings'),
    n(decisionImportDryRun, 'warnings'),
    n(starterNoopDryRun, 'warnings'),
    n(fixtureQa, 'warnings'),
    n(priorityAudit, 'warnings'),
    n(priorityIntegrity, 'warnings'),
    n(priorityBatches, 'findingsWarnings') || n(priorityBatches, 'warnings'),
    n(reviewerExecutionWorkOrder, 'warnings'),
    n(reviewStarterPack, 'warnings'),
    n(reviewProgress, 'warnings'),
    n(runValidator, 'warnings'),
  ].reduce((sum, value) => sum + value, 0);
  const warnings = findings.filter((finding) => finding.severity === 'warning').length + reportWarnings;
  const readyForReviewer =
    blockers === 0 &&
    lessonLedgers.length === EXPECTED_LESSON_LEDGER_COUNT &&
    generatedRows === EXPECTED_ROW_COUNT &&
    queueRows === EXPECTED_ROW_COUNT &&
    decisionTemplateRows === EXPECTED_ROW_COUNT &&
    batchJsonlFiles === EXPECTED_BATCH_FILE_COUNT &&
    batchTsvFiles === EXPECTED_BATCH_FILE_COUNT &&
    languageIsolationBlockers === 0 &&
    languageIsolationWarnings === 0 &&
    rowsMissingTargetLocale === 0 &&
    b(translationQa, 'readyForReviewer') &&
    b(generatedContent, 'readyForReviewer') &&
    b(handoffIntegrity, 'readyForReviewer') &&
    b(batchFilesIntegrity, 'readyForReviewer') &&
    b(decisionTemplateIntegrity, 'readyForReviewer') &&
    b(starterNoopDryRun, 'readyForReviewer') &&
    b(fixtureQa, 'readyForReviewer') &&
    b(priorityAudit, 'readyForReviewer') &&
    b(priorityIntegrity, 'readyForReviewer') &&
    b(priorityBatches, 'readyForReviewer') &&
    b(reviewerExecutionWorkOrder, 'readyForReviewer') &&
    b(reviewStarterPack, 'readyForReviewer') &&
    b(reviewProgress, 'readyForReviewer');

  const artifacts: ArtifactEntry[] = [
    ...lessonLedgers.map((file) => artifactEntry(repoRoot, file, 'generated_lesson_ledger', 'lesson_row_ledger')),
    ...reviewerSourceFiles.map((file) => artifactEntry(repoRoot, file, 'reviewer_artifact', extensionOf(file))),
    ...auditArtifactFiles.map((file) => artifactEntry(repoRoot, file, 'audit_artifact', extensionOf(file))),
  ];

  const manifestJson = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const manifestMd = path.join(reviewerDir, 'french_reviewer_master_manifest.md');
  const packetJson = path.join(auditsDir, 'french_reviewer_master_manifest_packet.json');
  const packetMd = path.join(auditsDir, 'french_reviewer_master_manifest_packet.md');

  const manifest: MasterManifest = {
    schemaVersion: 'gustav-french-reviewer-master-manifest-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      generatedLessonLedgers: lessonLedgers.length,
      generatedRows,
      reviewerSourceFiles: reviewerSourceFiles.length,
      reviewerSourceFilesByExtension,
      auditArtifactFiles: auditArtifactFiles.length,
      batchJsonlFiles,
      batchTsvFiles,
      queueRows,
      decisionTemplateRows,
      translationQaBlockers,
      generatedContentBlockers,
      handoffIntegrityBlockers,
      batchFilesIntegrityBlockers,
      decisionTemplateIntegrityBlockers,
      decisionImportDryRunBlockers,
      starterNoopDryRunBlockers,
      fixtureQaBlockers,
      priorityAuditBlockers,
      priorityIntegrityBlockers,
      priorityBatchesBlockers,
      languageIsolationBlockers,
      languageIsolationWarnings,
      rowsMissingTargetLocale,
      reviewerExecutionWorkOrderBlockers,
      reviewStarterPackBlockers,
      reviewProgressBlockers,
      runValidatorBlockers,
      generationBlockers,
      applyBlockers,
      criticalArtifactsMissing,
      blockers,
      warnings,
      readyForReviewer,
      readyForDecisionImport,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceReports,
    artifacts,
    outputArtifacts: {
      manifestJson: artifactPath(repoRoot, manifestJson),
      manifestMd: artifactPath(repoRoot, manifestMd),
      packetJson: artifactPath(repoRoot, packetJson),
      packetMd: artifactPath(repoRoot, packetMd),
    },
    findings,
  };

  ensureDir(reviewerDir);
  ensureDir(auditsDir);
  fs.writeFileSync(manifestJson, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(manifestMd, renderMarkdown(manifest));
  fs.writeFileSync(packetJson, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(packetMd, renderMarkdown(manifest));

  console.log(`GUSTAV French reviewer master manifest: ${manifest.status}`);
  console.log(`Generated lesson ledgers: ${manifest.summary.generatedLessonLedgers}`);
  console.log(`Generated rows: ${manifest.summary.generatedRows}`);
  console.log(`Reviewer source files: ${manifest.summary.reviewerSourceFiles}`);
  console.log(`Audit artifact files: ${manifest.summary.auditArtifactFiles}`);
  console.log(`Batch JSONL files: ${manifest.summary.batchJsonlFiles}`);
  console.log(`Batch TSV files: ${manifest.summary.batchTsvFiles}`);
  console.log(`Blockers: ${manifest.summary.blockers}`);
  console.log(`Ready for reviewer: ${manifest.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${manifest.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${manifest.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${manifest.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Manifest: ${artifactPath(repoRoot, manifestJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
