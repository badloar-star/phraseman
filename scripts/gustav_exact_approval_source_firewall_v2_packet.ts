import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: string;
  firewallState: string;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p30Status: string;
  p30State: string;
  p30ReadyForReceiptCreation: boolean;
  requiredApprovalSentence: string;
  p31Status: string;
  p31State: string;
  p31CreateActiveReceiptRequested: boolean;
  p31ActiveApprovalReceiptCreated: boolean;
  p31ActiveHashLockCreated: boolean;
  p31ReadyForApply: boolean;
  p31MayModifyProductionAppFiles: boolean;
  p31ProbesPassed: number;
  p31Probes: number;
  p44Status: string;
  p44State: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p50Status: string;
  p50State: string;
  p51Status: string;
  p51State: string;
  p51Blockers: number;
  p51ReadinessApplyBlockers: number;
  p51ActiveApprovalReceiptExists: boolean;
  p51ActiveHashLockExists: boolean;
  p51WouldCreateActiveArtifactsNow: boolean;
  p51ReadyForApply: boolean;
  p51MayModifyProductionAppFiles: boolean;
  p51ProbesPassed: number;
  p51Probes: number;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceExists: boolean;
  approvalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  productionWritesAllowed: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
};

type Report = {
  schemaVersion: 'gustav-exact-approval-source-firewall-v2-packet-v0';
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
    firewallState: string;
    p30Ready: boolean;
    p31SafeHoldReady: boolean;
    p44WaitingForExactApproval: boolean;
    p50FinalHashLockReady: boolean;
    p51Ready: boolean;
    p51State: string;
    p51ReadinessApplyBlockers: number;
    requiredApprovalSentencePresent: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsDefaultPath: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    approvalSourceRequiredForActiveArtifacts: true;
    explicitCreateFlagRequiredForActiveArtifacts: true;
    createActiveReceiptRequested: boolean;
    plainContinueWouldCreateActiveArtifacts: false;
    wouldCreateActiveArtifactsNow: false;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    productionWritesAllowed: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    downloadablePacksPublished: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  nextRequiredActions: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    dryRunOnly: true;
    activeApprovalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    productionAppFilesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
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

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return readJson<JsonObject>(filePath);
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(value: JsonObject): JsonObject {
  return object(value.summary);
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sha256Text(value: string): string {
  if (value.trim() === '') return '';
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function evaluate(input: EvaluationInput): { state: string; findings: Finding[] } {
  const findings: Finding[] = [];
  const requiredSentencePresent = input.requiredApprovalSentence.trim() !== '';
  const p31ClosedState =
    input.p31State === 'approval_receipt_creation_waiting_for_exact_sentence' ||
    input.p31State === 'exact_sentence_present_creation_not_requested';
  const approvalSourceIsDefaultPath = path.resolve(input.approvalSourcePath) === path.resolve(input.defaultApprovalSourcePath);

  if (input.p30Status !== 'PASS' || input.p30State !== 'approval_request_presented' || !input.p30ReadyForReceiptCreation || !requiredSentencePresent) {
    addFinding(findings, 'blocker', 'P30_APPROVAL_REQUEST_NOT_READY', 'P30 must present the exact required approval sentence before the source firewall can be ready.');
  }
  if (
    input.p31Status !== 'HOLD' ||
    !p31ClosedState ||
    input.p31CreateActiveReceiptRequested ||
    input.p31ActiveApprovalReceiptCreated ||
    input.p31ActiveHashLockCreated ||
    input.p31ReadyForApply ||
    input.p31MayModifyProductionAppFiles ||
    input.p31Probes <= 0 ||
    input.p31ProbesPassed !== input.p31Probes
  ) {
    addFinding(findings, 'blocker', 'P31_NOT_CLOSED_SOURCE_WAIT', 'P31 must remain closed, require an explicit create flag and create no active artifacts.');
  }
  if (input.p44Status !== 'HOLD' || input.p44State !== 'waiting_for_exact_approval_artifacts' || input.p44ReadyForProductionActivationSequencing) {
    addFinding(findings, 'blocker', 'P44_NOT_WAITING_FOR_ACTIVE_ARTIFACTS', 'P44 must wait for active approval artifacts and keep production sequencing closed.');
  }
  if (input.p50Status !== 'PASS' || input.p50State !== 'final_preapproval_evidence_hash_lock_ready') {
    addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY', 'P50 must lock final pre-approval evidence before any approval source can be accepted.');
  }
  if (
    input.p51Status !== 'PASS' ||
    input.p51Blockers !== 0 ||
    input.p51State !== 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' ||
    input.p51ReadinessApplyBlockers !== 1 ||
    input.p51ActiveApprovalReceiptExists ||
    input.p51ActiveHashLockExists ||
    input.p51WouldCreateActiveArtifactsNow ||
    input.p51ReadyForApply ||
    input.p51MayModifyProductionAppFiles ||
    input.p51Probes <= 0 ||
    input.p51ProbesPassed !== input.p51Probes
  ) {
    addFinding(findings, 'blocker', 'P51_REHEARSAL_NOT_READY', 'P51 must be a closed dry-run rehearsal with only RDY-090 remaining.');
  }
  if (input.approvalSourceExists && !approvalSourceIsDefaultPath) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_OUTSIDE_RUN_APPLY_PLAN', 'Approval source must be the run-scoped default apply_plan input file.', input.approvalSourcePath);
  }
  if (input.approvalSourceExists && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_MISSING_EXACT_SENTENCE', 'Approval source exists but does not contain the exact required approval sentence.', input.approvalSourcePath);
  }
  if (!input.approvalSourceExists && input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SENTENCE_WITHOUT_SOURCE', 'Exact approval sentence cannot be true without a real approval source file.', input.approvalSourcePath);
  }
  if (input.p31CreateActiveReceiptRequested && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'CREATE_FLAG_WITHOUT_VALID_SOURCE', 'The explicit create flag is only legal after the approval source contains the exact required sentence.');
  }
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_ALREADY_EXIST', 'The source firewall is only valid before active receipt/hash-lock artifacts exist.');
  }
  if (
    input.activationApproved ||
    input.readyForApply ||
    input.mayModifyProductionAppFiles ||
    input.productionWritesAllowed ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'The source firewall must keep activation/apply/upload/download/storage/cloud flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  if (blockers > 0) return { state: 'blocked_by_findings', findings };
  if (input.approvalSourceContainsExactSentence) return { state: 'exact_approval_source_present_p31_create_required', findings };
  return { state: 'exact_approval_source_firewall_ready_waiting_for_approval_source', findings };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: string; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_source_firewall_ready', expectedState: 'exact_approval_source_firewall_ready_waiting_for_approval_source', mutate: () => undefined },
    { id: 'p51_not_ready_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p51State = 'blocked_by_findings'; } },
    { id: 'source_without_exact_sentence_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = false; } },
    { id: 'exact_source_without_create_flag_remains_closed', expectedState: 'exact_approval_source_present_p31_create_required', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = true; input.p31State = 'exact_sentence_present_creation_not_requested'; } },
    { id: 'create_flag_without_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p31CreateActiveReceiptRequested = true; } },
    { id: 'active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'p44_sequence_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ReadyForProductionActivationSequencing = true; } },
    { id: 'ready_for_apply_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readyForApply = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; input.cloudSyncMigrationAllowed = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const result = evaluate(fixture);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    return {
      id: test.id,
      expectedState: test.expectedState,
      firewallState: result.state,
      blockers,
      passed: result.state === test.expectedState,
    };
  });
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval Source Firewall V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Firewall state: ${report.summary.firewallState}`,
    `- P30/P31/P44/P50/P51 ready: ${report.summary.p30Ready ? 'yes' : 'no'}/${report.summary.p31SafeHoldReady ? 'yes' : 'no'}/${report.summary.p44WaitingForExactApproval ? 'yes' : 'no'}/${report.summary.p50FinalHashLockReady ? 'yes' : 'no'}/${report.summary.p51Ready ? 'yes' : 'no'}`,
    `- Required approval sentence present/hash: ${report.summary.requiredApprovalSentencePresent ? 'yes' : 'no'}/${report.summary.requiredApprovalSentenceSha256 || 'none'}`,
    `- Approval source exists/contains exact sentence: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`,
    `- Approval source path default: ${report.summary.approvalSourceIsDefaultPath ? 'yes' : 'no'}`,
    `- Create active receipt requested: ${report.summary.createActiveReceiptRequested ? 'yes' : 'no'}`,
    `- Plain continue would create active artifacts: ${report.summary.plainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Activation/apply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/download/storage/cloud flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Next Required Actions',
    '',
    ...report.nextRequiredActions.map((item) => `- ${item}`),
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  lines.push('', '## Safety', '');
  lines.push('- This packet is dry-run only.');
  lines.push('- It does not create active approval receipt or active hash-lock files.');
  lines.push('- It does not modify production app files, import reviewer decisions, publish server manifests, upload to Firebase/server, enable runtime downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const applyPlanDir = path.join(runDir, 'apply_plan');
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');

  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const p51Path = path.join(auditsDir, 'exact_approval_apply_rehearsal_v2_packet.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_source_firewall_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_source_firewall_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_source_firewall_v2_packet.md');

  const master = readJsonOrEmpty(masterPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p50 = readJsonOrEmpty(p50Path);
  const p51 = readJsonOrEmpty(p51Path);
  const masterSummary = summaryOf(master);
  const p30Summary = summaryOf(p30);
  const p31Summary = summaryOf(p31);
  const p44Summary = summaryOf(p44);
  const p50Summary = summaryOf(p50);
  const p51Summary = summaryOf(p51);

  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const approvalSourceContainsExactSentence = requiredApprovalSentence.trim() !== '' && approvalSourceText.includes(requiredApprovalSentence);

  const input: EvaluationInput = {
    p30Status: s(p30, 'status'),
    p30State: s(p30Summary, 'requestState'),
    p30ReadyForReceiptCreation: b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    requiredApprovalSentence,
    p31Status: s(p31, 'status'),
    p31State: s(p31Summary, 'receiptCreationState'),
    p31CreateActiveReceiptRequested: b(p31Summary, 'createActiveReceiptRequested'),
    p31ActiveApprovalReceiptCreated: b(p31Summary, 'activeApprovalReceiptCreated'),
    p31ActiveHashLockCreated: b(p31Summary, 'activeHashLockCreated'),
    p31ReadyForApply: b(p31Summary, 'readyForApply'),
    p31MayModifyProductionAppFiles: b(p31Summary, 'mayModifyProductionAppFiles'),
    p31ProbesPassed: n(p31Summary, 'fixtureProbesPassed'),
    p31Probes: n(p31Summary, 'fixtureProbes'),
    p44Status: s(p44, 'status'),
    p44State: s(p44Summary, 'validationState'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p50Status: s(p50, 'status'),
    p50State: s(p50Summary, 'lockState'),
    p51Status: s(p51, 'status'),
    p51State: s(p51Summary, 'rehearsalState'),
    p51Blockers: n(p51Summary, 'blockers'),
    p51ReadinessApplyBlockers: n(p51Summary, 'readinessApplyBlockers'),
    p51ActiveApprovalReceiptExists: b(p51Summary, 'activeApprovalReceiptExists'),
    p51ActiveHashLockExists: b(p51Summary, 'activeHashLockExists'),
    p51WouldCreateActiveArtifactsNow: b(p51Summary, 'wouldCreateActiveArtifactsNow'),
    p51ReadyForApply: b(p51Summary, 'readyForApply'),
    p51MayModifyProductionAppFiles: b(p51Summary, 'mayModifyProductionAppFiles'),
    p51ProbesPassed: n(p51Summary, 'fixtureProbesPassed'),
    p51Probes: n(p51Summary, 'fixtureProbes'),
    approvalSourcePath,
    defaultApprovalSourcePath,
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    activationApproved: b(p51Summary, 'activationApproved') || b(masterSummary, 'activationApproved'),
    readyForApply: b(p51Summary, 'readyForApply') || b(masterSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(p51Summary, 'mayModifyProductionAppFiles') || b(masterSummary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(p51Summary, 'productionWritesAllowed') || b(masterSummary, 'productionWritesAllowed'),
    serverUploadAllowed: b(p51Summary, 'serverUploadAllowed') || b(masterSummary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(p51Summary, 'firebaseUploadAllowed') || b(masterSummary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(p51Summary, 'runtimeDownloadsEnabled') || b(masterSummary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(p51Summary, 'storageMigrationAllowed') || b(masterSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(p51Summary, 'cloudSyncMigrationAllowed') || b(masterSummary, 'cloudSyncMigrationAllowed'),
  };

  const result = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(result.findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = result.findings.filter((finding) => finding.severity === 'warning').length;
  const firewallState = blockers > 0 ? 'blocked_by_findings' : result.state;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const nextRequiredActions = [
    'Plain continue prompts must never create active approval receipt/hash-lock artifacts.',
    'Only the run-scoped approval source file may carry the exact approval sentence.',
    'Even with the exact approval source present, P31 still requires the explicit create flag before active artifacts can be written.',
    'After P31 creates both active artifacts, P44 must validate them before P45-P47 can move toward any production apply transaction.',
    'Keep app apply, server/Firebase upload, runtime downloads and storage/cloud migrations closed until the production sequence explicitly opens them.',
  ];

  const dryRun = {
    schemaVersion: 'gustav-exact-approval-source-firewall-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    firewallState,
    requiredApprovalSentenceSha256: sha256Text(requiredApprovalSentence),
    approvalSourcePath: rel(repoRoot, approvalSourcePath),
    defaultApprovalSourcePath: rel(repoRoot, defaultApprovalSourcePath),
    approvalSourceExists: input.approvalSourceExists,
    approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
    approvalSourceRequiredForActiveArtifacts: true,
    explicitCreateFlagRequiredForActiveArtifacts: true,
    plainContinueWouldCreateActiveArtifacts: false,
    wouldCreateActiveArtifactsNow: false,
    activeApprovalReceiptExists: input.activeApprovalReceiptExists,
    activeHashLockExists: input.activeHashLockExists,
    productionWritesAllowed: false,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    p31PacketPath: rel(repoRoot, p31Path),
    p44PacketPath: rel(repoRoot, p44Path),
    p51PacketPath: rel(repoRoot, p51Path),
    nextRequiredActions,
  };
  writeJson(dryRunPath, dryRun);

  const p31ClosedState =
    input.p31Status === 'HOLD' &&
    (input.p31State === 'approval_receipt_creation_waiting_for_exact_sentence' ||
      input.p31State === 'exact_sentence_present_creation_not_requested') &&
    !input.p31CreateActiveReceiptRequested &&
    !input.p31ActiveApprovalReceiptCreated &&
    !input.p31ActiveHashLockCreated;
  const p51Ready =
    input.p51Status === 'PASS' &&
    input.p51Blockers === 0 &&
    input.p51State === 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' &&
    input.p51ReadinessApplyBlockers === 1 &&
    !input.p51ActiveApprovalReceiptExists &&
    !input.p51ActiveHashLockExists &&
    !input.p51WouldCreateActiveArtifactsNow &&
    !input.p51ReadyForApply &&
    !input.p51MayModifyProductionAppFiles &&
    input.p51Probes > 0 &&
    input.p51ProbesPassed === input.p51Probes;

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-source-firewall-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      masterManifest: rel(repoRoot, masterPath),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, p31Path),
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      exactApprovalApplyRehearsalV2Packet: rel(repoRoot, p51Path),
      approvalSource: rel(repoRoot, approvalSourcePath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      firewallDryRun: rel(repoRoot, dryRunPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      firewallState,
      p30Ready: input.p30Status === 'PASS' && input.p30State === 'approval_request_presented' && input.p30ReadyForReceiptCreation,
      p31SafeHoldReady: p31ClosedState,
      p44WaitingForExactApproval: input.p44Status === 'HOLD' && input.p44State === 'waiting_for_exact_approval_artifacts' && !input.p44ReadyForProductionActivationSequencing,
      p50FinalHashLockReady: input.p50Status === 'PASS' && input.p50State === 'final_preapproval_evidence_hash_lock_ready',
      p51Ready,
      p51State: input.p51State,
      p51ReadinessApplyBlockers: input.p51ReadinessApplyBlockers,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      requiredApprovalSentenceSha256: sha256Text(input.requiredApprovalSentence),
      approvalSourcePath: rel(repoRoot, input.approvalSourcePath),
      defaultApprovalSourcePath: rel(repoRoot, input.defaultApprovalSourcePath),
      approvalSourceIsDefaultPath: path.resolve(input.approvalSourcePath) === path.resolve(input.defaultApprovalSourcePath),
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
      approvalSourceRequiredForActiveArtifacts: true,
      explicitCreateFlagRequiredForActiveArtifacts: true,
      createActiveReceiptRequested: input.p31CreateActiveReceiptRequested,
      plainContinueWouldCreateActiveArtifacts: false,
      wouldCreateActiveArtifactsNow: false,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      downloadablePacksPublished: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    nextRequiredActions,
    probes,
    findings: result.findings,
    safety: {
      dryRunOnly: true,
      activeApprovalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      productionAppFilesModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval source firewall V2 packet: ${status}`);
  console.log(`Firewall state: ${report.summary.firewallState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`Plain continue would create active artifacts: ${report.summary.plainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
