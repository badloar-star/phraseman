import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type WorkOrder = {
  schemaVersion: 'gustav-french-reviewer-execution-work-order-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    reviewerRows: number;
    reviewedRows: number;
    blankDecisionRows: number;
    highPriorityRows: number;
    mediumPriorityRows: number;
    lowPriorityRows: number;
    priorityBatches: number;
    decisionTemplateRows: number;
    languageIsolationBlockers: number;
    languageIsolationWarnings: number;
    rowsMissingTargetLocale: number;
    applyBlockers: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceArtifacts: Record<string, string>;
  sourceHashes: Record<string, string>;
  reviewerDecisionContract: {
    allowedDecisions: string[];
    writableFields: string[];
    requiredReviewedMetadata: string[];
  };
  reviewOrder: Array<{
    step: string;
    mode: 'llm-official-source-review' | 'dry-run' | 'gate' | 'blocked';
    inputArtifacts: string[];
    outputExpectation: string;
    mayModifyProductionAppFiles: false;
  }>;
  hardLocks: string[];
  nextAllowedActions: string[];
  nextBlockedActions: string[];
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

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function n(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function b(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

function s(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function readIfExists<T>(filePath: string, findings: Finding[], label: string): T | null {
  if (!fs.existsSync(filePath)) {
    findings.push({
      severity: 'blocker',
      code: 'required_artifact_missing',
      message: `${label} is missing.`,
      path: filePath,
    });
    return null;
  }
  return readJson<T>(filePath);
}

function renderMarkdown(report: WorkOrder): string {
  const lines = [
    '# GUSTAV French Reviewer Execution Work Order',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Reviewer rows: ${report.summary.reviewerRows}`,
    `- Reviewed rows: ${report.summary.reviewedRows}`,
    `- Blank decision rows: ${report.summary.blankDecisionRows}`,
    `- Priority rows: high ${report.summary.highPriorityRows}, medium ${report.summary.mediumPriorityRows}, low ${report.summary.lowPriorityRows}`,
    `- Priority batches: ${report.summary.priorityBatches}`,
    `- Decision template rows: ${report.summary.decisionTemplateRows}`,
    `- Language isolation blockers: ${report.summary.languageIsolationBlockers}`,
    `- Language isolation warnings: ${report.summary.languageIsolationWarnings}`,
    `- Rows missing targetLocale: ${report.summary.rowsMissingTargetLocale}`,
    `- Apply blockers: ${report.summary.applyBlockers}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Reviewer Decision Contract',
    '',
    `- Allowed decisions: ${report.reviewerDecisionContract.allowedDecisions.map((value) => `\`${value}\``).join(', ')}`,
    `- Writable fields: ${report.reviewerDecisionContract.writableFields.map((value) => `\`${value}\``).join(', ')}`,
    `- Required reviewed metadata: ${report.reviewerDecisionContract.requiredReviewedMetadata.map((value) => `\`${value}\``).join(', ')}`,
    '',
    '## Review Order',
    '',
  ];

  report.reviewOrder.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.step}`);
    lines.push(`   - Mode: \`${step.mode}\``);
    lines.push(`   - Inputs: ${step.inputArtifacts.map((value) => `\`${value}\``).join(', ')}`);
    lines.push(`   - Output expectation: ${step.outputExpectation}`);
    lines.push('   - May modify production app files: no');
  });

  lines.push('', '## Hard Locks', '');
  report.hardLocks.forEach((lock) => lines.push(`- ${lock}`));

  lines.push('', '## Next Allowed Actions', '');
  report.nextAllowedActions.forEach((action) => lines.push(`- ${action}`));

  lines.push('', '## Next Blocked Actions', '');
  report.nextBlockedActions.forEach((action) => lines.push(`- ${action}`));

  lines.push('', '## Source Artifacts', '');
  Object.entries(report.sourceArtifacts).forEach(([key, value]) => lines.push(`- ${key}: \`${value}\``));

  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    report.findings.forEach((finding) => {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    });
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_french_reviewer_execution_work_order.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  ensureDir(auditsDir);

  const findings: Finding[] = [];
  const artifactPaths = {
    reviewerQueueJsonl: path.join(reviewerDir, 'french_reviewer_queue.jsonl'),
    priorityQueueJsonl: path.join(reviewerDir, 'french_reviewer_priority_queue.jsonl'),
    priorityBatchesManifest: path.join(reviewerDir, 'french_priority_review_batches_manifest.json'),
    decisionSchema: path.join(reviewerDir, 'french_review_decision_schema.json'),
    decisionTemplateJsonl: path.join(reviewerDir, 'french_review_decision_template.jsonl'),
    reviewerMasterManifest: path.join(reviewerDir, 'french_reviewer_master_manifest.json'),
    languageIsolationAudit: path.join(auditsDir, 'french_language_isolation_audit.json'),
    decisionImportDryRun: path.join(auditsDir, 'french_review_decision_import_dry_run.json'),
    priorityAudit: path.join(auditsDir, 'french_reviewer_priority_audit.json'),
    priorityBatchesPacket: path.join(auditsDir, 'french_reviewer_priority_batches_packet.json'),
    readinessBlockerReduction: path.join(auditsDir, 'readiness_blocker_reduction_packet.json'),
  };

  const masterManifest = readIfExists<Record<string, unknown>>(artifactPaths.reviewerMasterManifest, findings, 'Reviewer master manifest');
  const languageIsolation = readIfExists<Record<string, unknown>>(artifactPaths.languageIsolationAudit, findings, 'French language isolation audit');
  const decisionDryRun = readIfExists<Record<string, unknown>>(artifactPaths.decisionImportDryRun, findings, 'Decision import dry-run');
  const priorityAudit = readIfExists<Record<string, unknown>>(artifactPaths.priorityAudit, findings, 'Reviewer priority audit');
  const priorityBatches = readIfExists<Record<string, unknown>>(artifactPaths.priorityBatchesPacket, findings, 'Reviewer priority batches packet');
  const readiness = readIfExists<Record<string, unknown>>(artifactPaths.readinessBlockerReduction, findings, 'Readiness blocker reduction packet');
  const decisionSchema = readIfExists<Record<string, unknown>>(artifactPaths.decisionSchema, findings, 'Decision schema');

  const masterSummary = object(masterManifest?.summary);
  const isolationSummary = object(languageIsolation?.summary);
  const decisionSummary = object(decisionDryRun?.summary);
  const prioritySummary = object(priorityAudit?.summary);
  const priorityBatchSummary = object(priorityBatches?.summary);
  const readinessSummary = object(readiness?.summary);

  if (masterManifest && !b(masterSummary, 'readyForReviewer')) {
    findings.push({
      severity: 'blocker',
      code: 'reviewer_manifest_not_ready',
      message: 'Reviewer master manifest is not ready for reviewer.',
      path: rel(repoRoot, artifactPaths.reviewerMasterManifest),
    });
  }
  if (n(isolationSummary, 'blockers') > 0 || n(isolationSummary, 'warnings') > 0 || n(isolationSummary, 'rowsMissingTargetLocale') > 0) {
    findings.push({
      severity: 'blocker',
      code: 'language_isolation_not_clean',
      message: 'Language isolation must be clean before reviewer execution.',
      path: rel(repoRoot, artifactPaths.languageIsolationAudit),
    });
  }
  if (decisionDryRun && n(decisionSummary, 'blankDecisionRows') !== n(decisionSummary, 'decisionRows')) {
    findings.push({
      severity: 'warning',
      code: 'decision_template_not_blank',
      message: 'Default decision dry-run is no longer a fully blank reviewer template.',
      path: rel(repoRoot, artifactPaths.decisionImportDryRun),
    });
  }

  const sourceArtifacts = Object.fromEntries(
    Object.entries(artifactPaths).map(([key, filePath]) => [key, rel(repoRoot, filePath)]),
  );
  const sourceHashes = Object.fromEntries(
    Object.entries(artifactPaths)
      .filter(([, filePath]) => fs.existsSync(filePath))
      .map(([key, filePath]) => [key, sha256(filePath)]),
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const allowedDecisions = Array.isArray(decisionSchema?.allowedReviewerDecisions)
    ? decisionSchema.allowedReviewerDecisions.map(String)
    : ['accept_as_is', 'needs_correction', 'reject', 'skip'];
  const writableFields = Array.isArray(decisionSchema?.writableReviewerFields)
    ? decisionSchema.writableReviewerFields.map(String)
    : ['reviewerDecision', 'correctedFrench', 'correctedQuizBlank', 'correctedQuizCorrect', 'correctedQuizDistractors', 'reviewerNotes', 'reviewerName', 'reviewedAt'];

  const report: WorkOrder = {
    schemaVersion: 'gustav-french-reviewer-execution-work-order-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'HOLD' : 'BLOCK',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      reviewerRows: n(masterSummary, 'queueRows') || n(decisionSummary, 'sourceQueueRows'),
      reviewedRows: n(decisionSummary, 'reviewedRows'),
      blankDecisionRows: n(decisionSummary, 'blankDecisionRows'),
      highPriorityRows: n(prioritySummary, 'highPriorityRows'),
      mediumPriorityRows: n(prioritySummary, 'mediumPriorityRows'),
      lowPriorityRows: n(prioritySummary, 'lowPriorityRows'),
      priorityBatches: n(priorityBatchSummary, 'batches'),
      decisionTemplateRows: n(masterSummary, 'decisionTemplateRows') || n(decisionSummary, 'decisionRows'),
      languageIsolationBlockers: n(isolationSummary, 'blockers'),
      languageIsolationWarnings: n(isolationSummary, 'warnings'),
      rowsMissingTargetLocale: n(isolationSummary, 'rowsMissingTargetLocale'),
      applyBlockers: n(masterSummary, 'applyBlockers') || n(readinessSummary, 'applyBlockers'),
      blockers,
      warnings,
      readyForReviewer: blockers === 0 && b(masterSummary, 'readyForReviewer'),
      readyForDecisionImport: b(decisionSummary, 'readyForDecisionImport'),
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceArtifacts,
    sourceHashes,
    reviewerDecisionContract: {
      allowedDecisions,
      writableFields,
      requiredReviewedMetadata: ['reviewerName', 'reviewedAt'],
    },
    reviewOrder: [
      {
        step: 'Review high-priority French rows first, preserving source identity fields exactly.',
        mode: 'llm-official-source-review',
        inputArtifacts: [sourceArtifacts.priorityQueueJsonl, sourceArtifacts.priorityBatchesManifest],
        outputExpectation: 'Reviewer decisions are written only into a separate reviewed decision file, never into generated ledgers.',
        mayModifyProductionAppFiles: false,
      },
      {
        step: 'Review medium-priority rows, then low-priority rows, keeping all targetLocale=fr rows isolated.',
        mode: 'llm-official-source-review',
        inputArtifacts: [sourceArtifacts.priorityQueueJsonl],
        outputExpectation: 'Every reviewed row uses one allowed reviewerDecision and includes reviewerName/reviewedAt.',
        mayModifyProductionAppFiles: false,
      },
      {
        step: 'Run decision import dry-run against the reviewed decision file.',
        mode: 'dry-run',
        inputArtifacts: [sourceArtifacts.decisionTemplateJsonl, sourceArtifacts.decisionImportDryRun],
        outputExpectation: 'Dry-run may become readyForDecisionImport only after reviewed rows are present and blockers remain zero.',
        mayModifyProductionAppFiles: false,
      },
      {
        step: 'Re-run language isolation, reviewer manifest, run validator, and brain gate after reviewed decisions are prepared.',
        mode: 'gate',
        inputArtifacts: [sourceArtifacts.languageIsolationAudit, sourceArtifacts.reviewerMasterManifest],
        outputExpectation: 'All gates remain PASS/HOLD with blockers=0 and production writes disabled.',
        mayModifyProductionAppFiles: false,
      },
      {
        step: 'Do not perform production apply.',
        mode: 'blocked',
        inputArtifacts: [sourceArtifacts.readinessBlockerReduction],
        outputExpectation: 'Apply stays blocked until exact P1A approval receipt, active hash-lock, reviewer import approval, and explicit apply approval exist.',
        mayModifyProductionAppFiles: false,
      },
    ],
    hardLocks: [
      'Short continuation commands such as DALSHE do not approve P1A, reviewer decision import, French activation, or production apply.',
      'Generated French rows stay reviewerStatus=needs_review and activationStatus=blocked until a reviewed decision import is explicitly approved.',
      'Production app files must not be modified by this work order.',
      'P1A approval receipt and active hash-lock are still absent; apply blockers remain intentional.',
    ],
    nextAllowedActions: [
      'LLM official-source reviewer can fill a separate decision file from french_review_decision_template.jsonl or TSV.',
      'Run gustav_french_review_decision_import_dry_run.ts with --decisions <reviewed-file> after reviewer decisions exist.',
      'Continue architecture-only audits and reviewer workflow hardening.',
      'Request exact P1A approval text only if the user explicitly wants to unlock P1A.',
    ],
    nextBlockedActions: [
      'Do not write reviewer decisions into generated lesson ledgers.',
      'Do not mark activationApproved=true.',
      'Do not run production apply or broad apply_plan/file_changes.json execution.',
      'Do not create approval receipts from DALSHE, OK, continue, approved, or any non-exact approval text.',
    ],
    findings,
  };

  const outJson = path.join(auditsDir, 'french_reviewer_execution_work_order.json');
  const outMd = path.join(auditsDir, 'french_reviewer_execution_work_order.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV French reviewer execution work order: ${report.status}`);
  console.log(`Reviewer rows: ${report.summary.reviewerRows}`);
  console.log(`Reviewed rows: ${report.summary.reviewedRows}`);
  console.log(`Blank decision rows: ${report.summary.blankDecisionRows}`);
  console.log(`Priority rows: high=${report.summary.highPriorityRows} medium=${report.summary.mediumPriorityRows} low=${report.summary.lowPriorityRows}`);
  console.log(`Language isolation blockers/warnings: ${report.summary.languageIsolationBlockers}/${report.summary.languageIsolationWarnings}`);
  console.log(`Apply blockers: ${report.summary.applyBlockers}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
