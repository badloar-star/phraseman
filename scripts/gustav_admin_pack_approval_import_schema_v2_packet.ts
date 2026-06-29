import * as crypto from 'node:crypto';
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

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type ApprovalField = {
  name: string;
  type: 'string' | 'boolean' | 'string[]';
  required: true;
  expectedValue?: string | boolean | string[];
};

type ApprovalImportSchema = {
  schemaVersion: 'gustav-admin-pack-approval-import-schema-v2';
  runId: string;
  studyTarget: 'fr';
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  importMode: 'schema_only_no_import';
  requiredApprovalFields: ApprovalField[];
  requiredExactApprovalSentence: string;
  requiredExactApprovalSentenceSha256: string;
  requiredEvidenceArtifacts: string[];
  activeApprovalReceiptPath: string;
  activeHashLockManifestPath: string;
  disallowedTransitionsNow: {
    approvalDocumentImportAllowed: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
  };
};

type Report = {
  schemaVersion: 'gustav-admin-pack-approval-import-schema-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    importMode: 'schema_only_no_import';
    approvalImportSchemaReady: boolean;
    activationApprovalRequestReady: boolean;
    exactApprovalSentencePresent: boolean;
    requiredApprovalFields: number;
    requiredEvidenceArtifacts: number;
    activeApprovalReceiptExists: boolean;
    activeHashLockManifestExists: boolean;
    approvalDocumentImportAllowed: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    readyForAdminPackDeliverySurfaceRefresh: boolean;
    readyForExplicitApprovalReceiptCreationGateV2: boolean;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  contract: ApprovalImportSchema;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    adminStateModifiedByThisScript: false;
    approvalDocumentImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_APPROVAL_FIELDS: ApprovalField[] = [
  { name: 'approvalRequestId', type: 'string', required: true },
  { name: 'requestedBy', type: 'string', required: true },
  { name: 'reviewerName', type: 'string', required: true, expectedValue: 'llm_official_source_reviewer' },
  { name: 'reviewedAt', type: 'string', required: true },
  { name: 'studyTarget', type: 'string', required: true, expectedValue: 'fr' },
  { name: 'sourceLocales', type: 'string[]', required: true, expectedValue: ['ru', 'uk'] },
  { name: 'uiLocale', type: 'string', required: true },
  { name: 'targetPackManifestSha256', type: 'string', required: true },
  { name: 'runtimeServerDeliveryContractSha256', type: 'string', required: true },
  { name: 'storageCloudTargetMapSha256', type: 'string', required: true },
  { name: 'reviewerWorkflowV2Sha256', type: 'string', required: true },
  { name: 'reviewerDecisionImportDryRunSha256', type: 'string', required: true },
  { name: 'serverManifestPreviewSha256', type: 'string', required: true },
  { name: 'payloadChecksumReportSha256', type: 'string', required: true },
  { name: 'rollbackPlanSha256', type: 'string', required: true },
  { name: 'activationApproved', type: 'boolean', required: true, expectedValue: false },
];

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

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256Text(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function exactApprovalSentenceForRun(runId: string): string {
  return `I approve PhraseMan French activation apply for run ${runId} after reviewing docs/gustav/runs/${runId}/apply_plan/hash_lock_manifest_dry_run_v2.json, docs/gustav/runs/${runId}/apply_plan/final_preapproval_evidence_hash_lock_dry_run_v2.json, docs/gustav/runs/${runId}/audits/runtime_activation_blocker_plan_v2_packet.json, and docs/gustav/runs/${runId}/audits/production_readiness_completion_audit_v2_packet.json. I understand this permits only the listed future-gated production changes, keeps studyTarget=fr isolated from sourceLocale/uiLocale/cloud/cache/prompts, and does not allow unlisted writes, uploads, runtime downloads, migrations or activation flags.`;
}

function buildContract(input: {
  runId: string;
  activeApprovalReceiptPath: string;
  activeHashLockManifestPath: string;
}): ApprovalImportSchema {
  const requiredExactApprovalSentence = exactApprovalSentenceForRun(input.runId);
  return {
    schemaVersion: 'gustav-admin-pack-approval-import-schema-v2',
    runId: input.runId,
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    importMode: 'schema_only_no_import',
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    requiredExactApprovalSentence,
    requiredExactApprovalSentenceSha256: requiredExactApprovalSentence ? sha256Text(requiredExactApprovalSentence) : '',
    requiredEvidenceArtifacts: [
      'audits/activation_approval_request_presentation_v2_packet.json',
      'audits/runtime_activation_blocker_plan_v2_packet.json',
      'audits/production_readiness_completion_audit_v2_packet.json',
      'apply_plan/hash_lock_manifest_dry_run_v2.json',
      'apply_plan/final_preapproval_evidence_hash_lock_dry_run_v2.json',
      'apply_plan/explicit_approval_receipt_template_v2.md',
      'apply_plan/activation_approval_request_v2.md',
    ],
    activeApprovalReceiptPath: input.activeApprovalReceiptPath,
    activeHashLockManifestPath: input.activeHashLockManifestPath,
    disallowedTransitionsNow: {
      approvalDocumentImportAllowed: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
    },
  };
}

function validateContract(input: {
  contract: ApprovalImportSchema;
  activeApprovalReceiptExists: boolean;
  activeHashLockManifestExists: boolean;
}): Finding[] {
  const findings: Finding[] = [];
  const contract = input.contract;
  if (contract.schemaVersion !== 'gustav-admin-pack-approval-import-schema-v2') {
    addFinding(findings, 'blocker', 'schema_version_invalid', 'Approval import schema version is invalid.');
  }
  if (contract.studyTarget !== 'fr' || contract.targetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'target_not_fr', 'Approval import schema must be scoped to studyTarget=fr.');
  }
  if (contract.sourceLocales.join(',') !== 'ru,uk') {
    addFinding(findings, 'blocker', 'source_locales_invalid', 'Approval import schema must be scoped to sourceLocales ru and uk.');
  }
  if (!contract.requiredExactApprovalSentence || contract.requiredExactApprovalSentence !== exactApprovalSentenceForRun(contract.runId)) {
    addFinding(findings, 'blocker', 'exact_approval_sentence_invalid', 'Approval import schema must bind the deterministic run-scoped exact approval sentence.');
  }
  if (contract.requiredApprovalFields.length !== 16) {
    addFinding(findings, 'blocker', 'required_field_count_invalid', `Expected 16 required approval fields, got ${contract.requiredApprovalFields.length}.`);
  }
  for (const field of REQUIRED_APPROVAL_FIELDS) {
    if (!contract.requiredApprovalFields.some((candidate) => candidate.name === field.name && candidate.type === field.type)) {
      addFinding(findings, 'blocker', 'required_field_missing', `Missing required approval field: ${field.name}.`);
    }
  }
  for (const [key, value] of Object.entries(contract.disallowedTransitionsNow)) {
    if (value !== false) {
      addFinding(findings, 'blocker', 'dangerous_transition_opened', `Dangerous transition must stay false: ${key}.`);
    }
  }
  if (input.activeApprovalReceiptExists || input.activeHashLockManifestExists) {
    addFinding(findings, 'blocker', 'active_approval_artifacts_present', 'Approval import schema is schema-only and must not see active receipt/hash-lock artifacts.');
  }
  return findings;
}

function makeProbes(contract: ApprovalImportSchema, baseInput: Parameters<typeof validateContract>[0]): Probe[] {
  const fixtures: { id: string; expectedAccept: boolean; mutate?: (draft: ApprovalImportSchema, input: Parameters<typeof validateContract>[0]) => void }[] = [
    { id: 'canonical_schema_accepts', expectedAccept: true },
    { id: 'wrong_target_rejected', expectedAccept: false, mutate: (draft) => { (draft as { studyTarget: string }).studyTarget = 'en'; } },
    { id: 'missing_exact_sentence_rejected', expectedAccept: false, mutate: (draft) => { draft.requiredExactApprovalSentence = ''; } },
    { id: 'activation_approved_true_rejected', expectedAccept: false, mutate: (draft) => { (draft.disallowedTransitionsNow as { activationApproved: boolean }).activationApproved = true; } },
    { id: 'required_field_missing_rejected', expectedAccept: false, mutate: (draft) => { draft.requiredApprovalFields = draft.requiredApprovalFields.filter((field) => field.name !== 'studyTarget'); } },
    { id: 'active_receipt_present_rejected', expectedAccept: false, mutate: (_draft, input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_present_rejected', expectedAccept: false, mutate: (_draft, input) => { input.activeHashLockManifestExists = true; } },
  ];
  return fixtures.map((fixture) => {
    const draft = JSON.parse(JSON.stringify(contract)) as ApprovalImportSchema;
    const input = JSON.parse(JSON.stringify(baseInput)) as Parameters<typeof validateContract>[0];
    input.contract = draft;
    fixture.mutate?.(draft, input);
    const blockers = validateContract(input).filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: fixture.id,
      expectedAccept: fixture.expectedAccept,
      accepted,
      blockers,
      passed: accepted === fixture.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Admin Pack Approval Import Schema V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Import mode: ${report.summary.importMode}`,
    `- Approval import schema ready: ${report.summary.approvalImportSchemaReady ? 'yes' : 'no'}`,
    `- Approval request schema ready: ${report.summary.activationApprovalRequestReady ? 'yes' : 'no'}`,
    `- Exact approval sentence present: ${report.summary.exactApprovalSentencePresent ? 'yes' : 'no'}`,
    `- Required approval fields: ${report.summary.requiredApprovalFields}`,
    `- Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockManifestExists ? 'yes' : 'no'}`,
    `- Ready for admin pack delivery surface refresh: ${report.summary.readyForAdminPackDeliverySurfaceRefresh ? 'yes' : 'no'}`,
    `- Ready for explicit approval receipt creation gate V2: ${report.summary.readyForExplicitApprovalReceiptCreationGateV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    '',
    '## Required Fields',
    '',
  ];
  for (const field of report.contract.requiredApprovalFields) {
    lines.push(`- \`${field.name}\` (${field.type})`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet is schema-only and imports no approval document.');
  lines.push('- It creates no active approval receipt or active hash lock.');
  lines.push('- It does not upload, enable runtime downloads, migrate storage/cloud, modify app files or approve activation.');
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) throw new Error('Usage: npx tsx scripts/gustav_admin_pack_approval_import_schema_v2_packet.ts --run <run-dir> --target fr');
  if (target !== 'fr') throw new Error('Approval import schema V2 is currently scoped to --target fr.');

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const applyPlanDir = path.join(runDir, 'apply_plan');
  const outJson = path.join(auditsDir, 'admin_pack_approval_import_schema_v2.json');
  const outMd = path.join(auditsDir, 'admin_pack_approval_import_schema_v2.md');

  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockManifestPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockManifestExists = fs.existsSync(activeHashLockManifestPath);
  const contract = buildContract({
    runId,
    activeApprovalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
    activeHashLockManifestPath: rel(repoRoot, activeHashLockManifestPath),
  });
  const validationInput = {
    contract,
    activeApprovalReceiptExists,
    activeHashLockManifestExists,
  };
  const validationFindings = validateContract(validationInput);
  const probes = makeProbes(contract, validationInput);
  const findings = [...validationFindings];
  for (const probe of probes.filter((candidate) => !candidate.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'schema_only_no_import', 'Approval import schema is ready, but no approval document was imported and no active approval artifacts were created.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const approvalImportSchemaReady = blockers === 0;
  const report: Report = {
    schemaVersion: 'gustav-admin-pack-approval-import-schema-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      activeApprovalReceipt: rel(repoRoot, activeApprovalReceiptPath),
      activeHashLockManifest: rel(repoRoot, activeHashLockManifestPath),
    },
    outputs: {
      adminPackApprovalImportSchemaV2Json: rel(repoRoot, outJson),
      adminPackApprovalImportSchemaV2Md: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      importMode: 'schema_only_no_import',
      approvalImportSchemaReady,
      activationApprovalRequestReady: contract.requiredExactApprovalSentence === exactApprovalSentenceForRun(runId),
      exactApprovalSentencePresent: contract.requiredExactApprovalSentence === exactApprovalSentenceForRun(runId),
      requiredApprovalFields: contract.requiredApprovalFields.length,
      requiredEvidenceArtifacts: contract.requiredEvidenceArtifacts.length,
      activeApprovalReceiptExists,
      activeHashLockManifestExists,
      approvalDocumentImportAllowed: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      readyForAdminPackDeliverySurfaceRefresh: approvalImportSchemaReady,
      readyForExplicitApprovalReceiptCreationGateV2: approvalImportSchemaReady,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      activeApprovalReceipt: sha256(activeApprovalReceiptPath),
      activeHashLockManifest: sha256(activeHashLockManifestPath),
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      approvalDocumentImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV admin pack approval import schema V2 packet: ${report.status}`);
  console.log(`Approval import schema ready: ${report.summary.approvalImportSchemaReady ? 'yes' : 'no'}`);
  console.log(`Required approval fields: ${report.summary.requiredApprovalFields}`);
  console.log(`Active approval receipt/hash-lock: ${activeApprovalReceiptExists ? 'yes' : 'no'}/${activeHashLockManifestExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
