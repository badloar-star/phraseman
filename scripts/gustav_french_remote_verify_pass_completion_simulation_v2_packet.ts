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

type Report = {
  schemaVersion: 'gustav-french-remote-verify-pass-completion-simulation-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    simulationState: 'remote_verify_pass_completion_simulated' | 'remote_verify_already_proved_post_approval_locked' | 'blocked_by_findings';
    currentRequirementsProved: number;
    currentRequirementsMissing: number;
    currentRequirementsProductionLocked: number;
    currentDirectMissingRequirement: string;
    simulatedRemoteVerifyStatus: 'PASS';
    simulatedRemoteFoundObjects: 36;
    simulatedRemoteHashCheckedObjects: 36;
    simulatedRemoteUnexpectedObjects: 0;
    simulatedRemoteMissingObjects: 0;
    simulatedRemoteSizeMismatches: 0;
    simulatedRemoteHashMismatches: 0;
    simulatedRequirementsProved: number;
    simulatedRequirementsMissing: 0;
    simulatedRequirementsProductionLocked: 0 | 5;
    simulatedNextGate: 'exact_approval_artifacts' | 'production_apply_closed';
    activationApproved: boolean;
    runtimeDownloadsEnabled: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  simulatedRequirementDeltas: Array<{
    id: string;
    before: string;
    after: string;
    evidence: string[];
  }>;
  refreshCommandsAfterRemoteVerifyPass: string[];
  deniedActionsAfterRemoteVerifyPass: string[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    serverObjectsModifiedByThisScript: false;
    runtimeDownloadsEnabledByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
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

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

export function buildFrenchRemoteVerifyPassCompletionSimulation(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const completionPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const remoteVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const liveHandoffPath = path.join(auditsDir, 'french_remote_verify_live_handoff_v2_packet.json');
  const transitionPath = path.join(auditsDir, 'french_post_remote_verify_transition_v2_packet.json');
  const completion = readJsonOrEmpty(completionPath);
  const remoteVerify = readJsonOrEmpty(remoteVerifyPath);
  const liveHandoff = readJsonOrEmpty(liveHandoffPath);
  const transition = readJsonOrEmpty(transitionPath);
  const completionSummary = summaryOf(completion);
  const remoteVerifySummary = summaryOf(remoteVerify);
  const liveHandoffSummary = summaryOf(liveHandoff);
  const transitionSummary = summaryOf(transition);
  const findings: Finding[] = [];

  for (const requiredPath of [completionPath, remoteVerifyPath, liveHandoffPath, transitionPath]) {
    if (!fs.existsSync(requiredPath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Remote verify PASS completion simulation requires this input artifact.', rel(input.repoRoot, requiredPath));
    }
  }

  const requirements = arr<JsonObject>(completion.requirements);
  const missingRequirements = requirements.filter((item) => s(item, 'status') === 'missing');
  const lockedRequirements = requirements.filter((item) => s(item, 'status') === 'production_locked');
  const currentDirectMissingRequirement = missingRequirements.map((item) => s(item, 'id')).join(',') || 'none';
  const req13 = requirements.find((item) => s(item, 'id') === 'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY');
  const remoteVerifyAlreadyProved =
    s(remoteVerify, 'status') === 'PASS' &&
    n(remoteVerifySummary, 'foundObjectCount') === 36 &&
    (n(remoteVerifySummary, 'hashCheckedObjects') || n(remoteVerifySummary, 'hashCheckedCount')) === 36 &&
    n(remoteVerifySummary, 'unexpectedObjects') === 0 &&
    n(remoteVerifySummary, 'missingObjects') === 0 &&
    n(remoteVerifySummary, 'sizeMismatches') === 0 &&
    n(remoteVerifySummary, 'hashMismatches') === 0;
  const preRemoteVerifySingleGap =
    s(completion, 'status') === 'BLOCK' &&
    n(completionSummary, 'requirementsMissing') === 1 &&
    currentDirectMissingRequirement === 'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY' &&
    Boolean(req13) &&
    lockedRequirements.length === 5 &&
    n(completionSummary, 'requirementsProductionLocked') === 5;
  const postApprovalClosedMode =
    s(completion, 'status') === 'HOLD' &&
    n(completionSummary, 'requirementsMissing') === 0 &&
    n(completionSummary, 'requirementsProved') >= 22 &&
    n(completionSummary, 'requirementsProductionLocked') === 0 &&
    missingRequirements.length === 0 &&
    lockedRequirements.length === 0 &&
    remoteVerifyAlreadyProved &&
    b(completionSummary, 'activationApproved') &&
    !b(completionSummary, 'readyForApply') &&
    !b(completionSummary, 'mayModifyProductionAppFiles') &&
    !b(completionSummary, 'runtimeDownloadsEnabled') &&
    !b(completionSummary, 'storageMigrationAllowed') &&
    !b(completionSummary, 'cloudSyncMigrationAllowed');
  const productionFlagsClosed =
    (!b(completionSummary, 'activationApproved') || postApprovalClosedMode) &&
    !b(completionSummary, 'readyForApply') &&
    !b(completionSummary, 'mayModifyProductionAppFiles') &&
    !b(completionSummary, 'runtimeDownloadsEnabled') &&
    !b(completionSummary, 'storageMigrationAllowed') &&
    !b(completionSummary, 'cloudSyncMigrationAllowed') &&
    !b(liveHandoffSummary, 'activationApproved') &&
    !b(liveHandoffSummary, 'readyForApply') &&
    !b(liveHandoffSummary, 'runtimeDownloadsEnabled');

  if (!preRemoteVerifySingleGap && !postApprovalClosedMode) {
    addFinding(findings, 'blocker', 'completion_not_at_single_remote_verify_gap', 'Completion audit must either have the single REQ-13 remote-verify gap before simulation or be in post-approval closed mode after remote verify PASS.', rel(input.repoRoot, completionPath));
  }
  if (!postApprovalClosedMode && (currentDirectMissingRequirement !== 'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY' || !req13)) {
    addFinding(findings, 'blocker', 'req13_not_only_missing_requirement', 'REQ-13 remote server object verify must be the only current missing requirement.', rel(input.repoRoot, completionPath));
  }
  if (!postApprovalClosedMode && (lockedRequirements.length !== 5 || n(completionSummary, 'requirementsProductionLocked') !== 5)) {
    addFinding(findings, 'blocker', 'production_lock_count_unexpected', 'Exactly five exact-approval/apply requirements must remain production_locked before approval artifacts exist.', rel(input.repoRoot, completionPath));
  }
  if (s(liveHandoff, 'status') !== 'PASS' || !b(liveHandoffSummary, 'liveVerifyCommandReady') || !b(liveHandoffSummary, 'postVerifyChainReady')) {
    addFinding(findings, 'blocker', 'live_handoff_not_ready', 'Live handoff must be PASS and postVerifyChainReady before simulating the remote verify PASS transition.', rel(input.repoRoot, liveHandoffPath));
  }
  if (!postApprovalClosedMode && (s(transition, 'status') !== 'PASS' || n(transitionSummary, 'afterRemoteVerifyExpectedMissing') !== 0 || s(transitionSummary, 'afterRemoteVerifyNextGate') !== 'exact_approval_artifacts')) {
    addFinding(findings, 'blocker', 'transition_contract_not_ready', 'Post remote verify transition must expect missing=0 and exact_approval_artifacts as the next gate.', rel(input.repoRoot, transitionPath));
  }
  if (!productionFlagsClosed) {
    addFinding(findings, 'blocker', 'production_flags_open_during_simulation', 'Remote verify PASS simulation must keep activation/apply/runtime/storage/cloud flags closed.', rel(input.repoRoot, completionPath));
  }
  if (s(remoteVerify, 'status') === 'PASS' && n(remoteVerifySummary, 'hashCheckedCount') !== 36) {
    addFinding(findings, 'blocker', 'current_remote_verify_pass_not_36_hashes', 'If current remote verify is PASS, it must prove 36 hash checks.', rel(input.repoRoot, remoteVerifyPath));
  }

  const currentProved = n(completionSummary, 'requirementsProved');
  const simulatedRequirementsProved = currentProved + (req13 && s(req13, 'status') === 'missing' ? 1 : 0);
  const simulatedRequirementsProductionLocked = postApprovalClosedMode ? 0 : 5;
  const simulatedNextGate = postApprovalClosedMode ? 'production_apply_closed' : 'exact_approval_artifacts';
  const simulatedRequirementDeltas = [{
    id: 'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY',
    before: s(object(req13), 'status') || 'missing',
    after: 'proved',
    evidence: [
      'simulated remoteVerify.status=PASS',
      'simulated foundObjectCount=36',
      'simulated hashCheckedCount=36',
      'simulated unexpectedObjects=0',
      'simulated missingObjects=0',
      'simulated sizeMismatches=0',
      'simulated hashMismatches=0',
    ],
  }];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const runArg = 'docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1';

  return {
    schemaVersion: 'gustav-french-remote-verify-pass-completion-simulation-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    summary: {
      targetLocale: 'fr',
      simulationState: blockers > 0 ? 'blocked_by_findings' : postApprovalClosedMode ? 'remote_verify_already_proved_post_approval_locked' : 'remote_verify_pass_completion_simulated',
      currentRequirementsProved: currentProved,
      currentRequirementsMissing: n(completionSummary, 'requirementsMissing'),
      currentRequirementsProductionLocked: n(completionSummary, 'requirementsProductionLocked'),
      currentDirectMissingRequirement,
      simulatedRemoteVerifyStatus: 'PASS',
      simulatedRemoteFoundObjects: 36,
      simulatedRemoteHashCheckedObjects: 36,
      simulatedRemoteUnexpectedObjects: 0,
      simulatedRemoteMissingObjects: 0,
      simulatedRemoteSizeMismatches: 0,
      simulatedRemoteHashMismatches: 0,
      simulatedRequirementsProved,
      simulatedRequirementsMissing: 0,
      simulatedRequirementsProductionLocked,
      simulatedNextGate,
      activationApproved: b(completionSummary, 'activationApproved'),
      runtimeDownloadsEnabled: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    inputs: {
      productionReadinessCompletionAuditV2Packet: rel(input.repoRoot, completionPath),
      frenchServerObjectRemoteVerifyV2Packet: rel(input.repoRoot, remoteVerifyPath),
      frenchRemoteVerifyLiveHandoffV2Packet: rel(input.repoRoot, liveHandoffPath),
      frenchPostRemoteVerifyTransitionV2Packet: rel(input.repoRoot, transitionPath),
    },
    outputs: {},
    simulatedRequirementDeltas,
    refreshCommandsAfterRemoteVerifyPass: [
      `npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_french_post_remote_verify_transition_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_french_final_blocker_dependency_map_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_final_preapproval_evidence_hash_lock_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_exact_approval_apply_rehearsal_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_exact_approval_wait_state_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_master_next_pass_consistency_refresh_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run ${runArg} --target fr`,
    ],
    deniedActionsAfterRemoteVerifyPass: [
      'Do not create approval receipt/hash lock automatically.',
      'Do not enable runtime downloads automatically.',
      'Do not run production apply automatically.',
      'Do not upload or mutate server objects from this simulation.',
      'Do not change storage/cloud migration gates.',
    ],
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      serverObjectsModifiedByThisScript: false,
      runtimeDownloadsEnabledByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      productionApplyApproved: false,
    },
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav French Remote Verify PASS Completion Simulation V2',
    '',
    `- Status: ${report.status}`,
    `- Simulation state: ${report.summary.simulationState}`,
    `- Current missing: ${report.summary.currentRequirementsMissing}`,
    `- Current missing requirement: ${report.summary.currentDirectMissingRequirement}`,
    `- Simulated remote found/hash: ${report.summary.simulatedRemoteFoundObjects}/${report.summary.simulatedRemoteHashCheckedObjects}`,
    `- Simulated proved/missing/locked: ${report.summary.simulatedRequirementsProved}/${report.summary.simulatedRequirementsMissing}/${report.summary.simulatedRequirementsProductionLocked}`,
    `- Simulated next gate: ${report.summary.simulatedNextGate}`,
    '',
    '## Simulated Requirement Deltas',
    '',
  ];
  for (const delta of report.simulatedRequirementDeltas) lines.push(`- ${delta.id}: ${delta.before} -> ${delta.after}`);
  lines.push('', '## Refresh Commands After Remote Verify PASS', '');
  for (const command of report.refreshCommandsAfterRemoteVerifyPass) lines.push(`- \`${command}\``);
  lines.push('', '## Denied Actions', '');
  for (const action of report.deniedActionsAfterRemoteVerifyPass) lines.push(`- ${action}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_remote_verify_pass_completion_simulation_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_remote_verify_pass_completion_simulation_v2_packet.md');
  const report = buildFrenchRemoteVerifyPassCompletionSimulation({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French remote verify PASS completion simulation V2 packet: ${report.status}`);
  console.log(`Simulation state: ${report.summary.simulationState}`);
  console.log(`Simulated proved/missing/locked: ${report.summary.simulatedRequirementsProved}/${report.summary.simulatedRequirementsMissing}/${report.summary.simulatedRequirementsProductionLocked}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
