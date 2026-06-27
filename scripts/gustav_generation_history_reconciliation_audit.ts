import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type JsonObject = Record<string, unknown>;

type Report = {
  schemaVersion: 'gustav-generation-history-reconciliation-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  summary: {
    generatedLessonLedgers: number;
    generatedRows: number;
    researchPackPresent: boolean;
    realResearchPackStillMissing: boolean;
    translationStartBlocked: boolean;
    workOrderReady: boolean;
    generatedRowsWithEvidenceClaimIds: number;
    generatedRowsWithResearchEvidenceIds: number;
    generatedRowsMissingResearchEvidenceIds: number;
    generatedRowsMissingTransformationType: number;
    generatedRowsMissingGrammarClusterId: number;
    generatedRowsMissingPedagogyBlueprintId: number;
    legacyGeneratedWithoutResearchPackRows: number;
    reviewerNeedsReviewRows: number;
    activationBlockedRows: number;
    activationViolationRows: number;
    rowsAccepted: number;
    activationApprovedRows: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForEvidenceBackfill: boolean;
    readyForRegenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  reconciliationPolicy: string[];
  requiredNextSteps: string[];
  findings: Finding[];
  safety: {
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionAppFilesModifiedByThisScript: false;
    productionApplyApproved: false;
  };
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Generation History Reconciliation Audit',
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
    `- Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- Real research pack still missing: ${report.summary.realResearchPackStillMissing ? 'yes' : 'no'}`,
    `- Translation start blocked: ${report.summary.translationStartBlocked ? 'yes' : 'no'}`,
    `- Work order ready: ${report.summary.workOrderReady ? 'yes' : 'no'}`,
    `- Rows with legacy evidenceClaimIds: ${report.summary.generatedRowsWithEvidenceClaimIds}`,
    `- Rows with V2 researchEvidenceIds: ${report.summary.generatedRowsWithResearchEvidenceIds}`,
    `- Rows missing researchEvidenceIds: ${report.summary.generatedRowsMissingResearchEvidenceIds}`,
    `- Rows missing transformationType: ${report.summary.generatedRowsMissingTransformationType}`,
    `- Rows missing grammarClusterId: ${report.summary.generatedRowsMissingGrammarClusterId}`,
    `- Rows missing pedagogyBlueprintId: ${report.summary.generatedRowsMissingPedagogyBlueprintId}`,
    `- Legacy generated without research pack rows: ${report.summary.legacyGeneratedWithoutResearchPackRows}`,
    `- Reviewer needs-review rows: ${report.summary.reviewerNeedsReviewRows}`,
    `- Activation blocked rows: ${report.summary.activationBlockedRows}`,
    `- Activation violation rows: ${report.summary.activationViolationRows}`,
    `- Rows accepted: ${report.summary.rowsAccepted}`,
    `- Activation-approved rows: ${report.summary.activationApprovedRows}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for evidence backfill: ${report.summary.readyForEvidenceBackfill ? 'yes' : 'no'}`,
    `- Ready for V2 regeneration: ${report.summary.readyForRegenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Reconciliation Policy',
    '',
    ...report.reconciliationPolicy.map((item) => `- ${item}`),
    '',
    '## Required Next Steps',
    '',
    ...report.requiredNextSteps.map((item) => `- ${item}`),
    '',
    '## Findings',
    '',
  ];

  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- This audit did not modify generated French ledgers.',
    '- This audit did not write reviewer decisions.',
    '- This audit did not create activation approvals.',
    '- This audit did not modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_generation_history_reconciliation_audit.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const researchPackPath = path.join(runDir, 'research', 'fr_research_pack.json');
  ensureDir(auditsDir);

  const inputs = {
    translationStartGate: path.join(auditsDir, 'translation_start_gate_audit.json'),
    researchWorkOrder: path.join(auditsDir, 'french_research_work_order_audit.json'),
    researchPackContract: path.join(auditsDir, 'french_research_pack_contract_audit.json'),
    generatedContentAudit: path.join(auditsDir, 'generated_content_audit.json'),
    translationQaAudit: path.join(auditsDir, 'french_translation_qa_audit.json'),
    reviewerMasterManifest: path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json'),
    researchPack: researchPackPath,
  };

  const findings: Finding[] = [];
  for (const [id, filePath] of Object.entries(inputs)) {
    if (id !== 'researchPack' && !fs.existsSync(filePath)) {
      addFinding(findings, 'blocker', 'required_input_missing', `Required reconciliation input is missing: ${id}.`, rel(repoRoot, filePath));
    }
  }

  const lessonLedgers = walkFiles(lessonsDir)
    .filter((filePath) => /^lesson\d+_row_ledger\.json$/.test(path.basename(filePath)))
    .sort((a, bValue) => Number(path.basename(a).match(/\d+/)?.[0] ?? 0) - Number(path.basename(bValue).match(/\d+/)?.[0] ?? 0));

  let generatedRows = 0;
  let generatedRowsWithEvidenceClaimIds = 0;
  let generatedRowsWithResearchEvidenceIds = 0;
  let generatedRowsMissingTransformationType = 0;
  let generatedRowsMissingGrammarClusterId = 0;
  let generatedRowsMissingPedagogyBlueprintId = 0;
  let reviewerNeedsReviewRows = 0;
  let activationBlockedRows = 0;
  let activationViolationRows = 0;

  for (const ledgerPath of lessonLedgers) {
    const ledger = readJson<JsonObject>(ledgerPath);
    const rows = array<JsonObject>(ledger.rows);
    if (rows.length === 0) {
      addFinding(findings, 'blocker', 'ledger_rows_missing', 'Generated lesson ledger does not contain rows.', rel(repoRoot, ledgerPath));
      continue;
    }
    generatedRows += rows.length;
    for (const row of rows) {
      if (array(row.evidenceClaimIds).length > 0) generatedRowsWithEvidenceClaimIds += 1;
      if (array(row.researchEvidenceIds).length > 0) generatedRowsWithResearchEvidenceIds += 1;
      if (typeof row.transformationType !== 'string' || row.transformationType.trim() === '') generatedRowsMissingTransformationType += 1;
      if (typeof row.grammarClusterId !== 'string' || row.grammarClusterId.trim() === '') generatedRowsMissingGrammarClusterId += 1;
      if (typeof row.pedagogyBlueprintId !== 'string' || row.pedagogyBlueprintId.trim() === '') generatedRowsMissingPedagogyBlueprintId += 1;
      if (row.reviewerStatus === 'needs_review') reviewerNeedsReviewRows += 1;
      if (row.activationStatus === 'blocked') activationBlockedRows += 1;
      if (row.activationStatus !== 'blocked' || row.activationApproved === true) activationViolationRows += 1;
    }
  }

  const translationStartSummary = summaryOf(inputs.translationStartGate);
  const researchWorkOrderSummary = summaryOf(inputs.researchWorkOrder);
  const researchContractSummary = summaryOf(inputs.researchPackContract);
  const generatedContentSummary = summaryOf(inputs.generatedContentAudit);
  const masterSummary = summaryOf(inputs.reviewerMasterManifest);

  const canonicalResearchPackPresent = fs.existsSync(researchPackPath);
  const researchPackPresent = canonicalResearchPackPresent || b(researchWorkOrderSummary, 'researchPackPresent') || b(researchContractSummary, 'researchPackPresent');
  const realResearchPackStillMissing = !canonicalResearchPackPresent;
  const generatedRowsMissingResearchEvidenceIds = generatedRows - generatedRowsWithResearchEvidenceIds;
  const legacyGeneratedWithoutResearchPackRows = Math.max(
    !canonicalResearchPackPresent ? generatedRows : 0,
    generatedRowsMissingResearchEvidenceIds,
    generatedRowsMissingTransformationType,
    generatedRowsMissingGrammarClusterId,
    generatedRowsMissingPedagogyBlueprintId,
  );
  const rowsAccepted = n(generatedContentSummary, 'rowsAccepted');
  const activationApprovedRows = n(generatedContentSummary, 'activationApprovedRows');

  if (legacyGeneratedWithoutResearchPackRows > 0) {
    addFinding(
      findings,
      'warning',
      'legacy_generated_without_research_pack',
      `${legacyGeneratedWithoutResearchPackRows} generated French row(s) are legacy V1 rows: the real pack was absent when they were created or V2 evidence fields are still missing. They are reviewer candidates, not app-ready content.`,
    );
  }
  if (generatedRowsMissingResearchEvidenceIds > 0 || generatedRowsMissingTransformationType > 0 || generatedRowsMissingGrammarClusterId > 0 || generatedRowsMissingPedagogyBlueprintId > 0) {
    addFinding(
      findings,
      'warning',
      'generation_schema_v2_fields_missing',
      'Generated rows do not yet satisfy Generation Schema V2 evidence/pedagogy fields.',
    );
  }
  if (activationViolationRows > 0 || activationApprovedRows > 0 || rowsAccepted > 0) {
    addFinding(
      findings,
      'blocker',
      'legacy_rows_cannot_be_activation_approved',
      'Rows generated before a real research pack cannot be accepted or activation-approved.',
    );
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForReviewer =
    blockers === 0 &&
    generatedRows > 0 &&
    reviewerNeedsReviewRows === generatedRows &&
    activationBlockedRows === generatedRows &&
    (b(generatedContentSummary, 'readyForReviewer') || b(masterSummary, 'readyForReviewer'));

  const report: Report = {
    schemaVersion: 'gustav-generation-history-reconciliation-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : (warnings > 0 ? 'HOLD' : 'PASS'),
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: Object.fromEntries(Object.entries(inputs).map(([key, filePath]) => [key, rel(repoRoot, filePath)])),
    summary: {
      generatedLessonLedgers: lessonLedgers.length,
      generatedRows,
      researchPackPresent,
      realResearchPackStillMissing,
      translationStartBlocked: b(translationStartSummary, 'translationStartBlocked'),
      workOrderReady: b(researchWorkOrderSummary, 'workOrderReady'),
      generatedRowsWithEvidenceClaimIds,
      generatedRowsWithResearchEvidenceIds,
      generatedRowsMissingResearchEvidenceIds,
      generatedRowsMissingTransformationType,
      generatedRowsMissingGrammarClusterId,
      generatedRowsMissingPedagogyBlueprintId,
      legacyGeneratedWithoutResearchPackRows,
      reviewerNeedsReviewRows,
      activationBlockedRows,
      activationViolationRows,
      rowsAccepted,
      activationApprovedRows,
      blockers,
      warnings,
      readyForReviewer,
      readyForDecisionImport: false,
      readyForEvidenceBackfill: blockers === 0 && legacyGeneratedWithoutResearchPackRows > 0 && b(researchWorkOrderSummary, 'workOrderReady'),
      readyForRegenerationV2: researchPackPresent && generatedRowsMissingResearchEvidenceIds === 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    reconciliationPolicy: [
      'Existing French rows may remain in the reviewer workflow as legacy candidates.',
      'Existing French rows cannot become activation-approved until real research evidence is backfilled or the rows are regenerated through V2.',
      'Legacy evidenceClaimIds do not satisfy V2 researchEvidenceIds.',
      'Reviewer import and production apply remain blocked until evidence coverage, reviewer decisions, and explicit apply approval all pass.',
    ],
    requiredNextSteps: [
      'Build and verify the canonical French research pack.',
      'Build the French pedagogy blueprint from the source graph and research pack.',
      'Backfill or regenerate rows with researchEvidenceIds, grammarClusterId, pedagogyBlueprintId and transformationType.',
      'Upgrade reviewer decisions so acceptance requires reviewerEvidenceChecked and anti-calque/naturalness decisions.',
    ],
    findings,
    safety: {
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionAppFilesModifiedByThisScript: false,
      productionApplyApproved: false,
    },
  };

  const outJson = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const outMd = path.join(auditsDir, 'generation_history_reconciliation_audit.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV generation history reconciliation audit: ${report.status}`);
  console.log(`Generated rows: ${report.summary.generatedRows}`);
  console.log(`Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`);
  console.log(`Legacy generated without research pack rows: ${report.summary.legacyGeneratedWithoutResearchPackRows}`);
  console.log(`Rows missing V2 researchEvidenceIds: ${report.summary.generatedRowsMissingResearchEvidenceIds}`);
  console.log(`Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
