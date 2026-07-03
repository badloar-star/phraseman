import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-french-post-remote-verify-transition-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: {
    targetLocale: 'fr';
    transitionState: 'ready_waiting_for_remote_verify_pass' | 'post_approval_remote_verify_complete_production_apply_locked' | 'blocked_by_findings';
    currentCompletionMissing: number;
    currentCompletionLocked: number;
    currentDirectMissingRequirement: string;
    remoteVerifyCurrentStatus: string;
    remoteVerifyCurrentFoundObjects: number;
    remoteVerifyCurrentHashChecks: number;
    remoteVerifyCurrentUnexpectedObjects: number;
    liveHandoffReady: boolean;
    passCompletionSimulationReady: boolean;
    simulatedRemoteFoundObjects: number;
    simulatedRemoteHashChecks: number;
    simulatedRequirementsMissing: number;
    simulatedRequirementsLocked: number;
    afterRemoteVerifyExpectedMissing: 0;
    afterRemoteVerifyExpectedLocked: 0 | 5;
    afterRemoteVerifyNextGate: 'exact_approval_artifacts' | 'production_apply_closed';
    activationMustRemainClosed: true;
    runtimeDownloadsMustRemainClosed: true;
    productionApplyMustRemainClosed: true;
    blockers: number;
    warnings: number;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  transitionRules: string[];
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

export function buildFrenchPostRemoteVerifyTransition(input: {
  repoRoot: string;
  runDir: string;
  generatedAt?: string;
}): Report {
  const auditsDir = path.join(input.runDir, 'audits');
  const completionPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const remoteVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const liveHandoffPath = path.join(auditsDir, 'french_remote_verify_live_handoff_v2_packet.json');
  const passCompletionSimulationPath = path.join(auditsDir, 'french_remote_verify_pass_completion_simulation_v2_packet.json');
  const finalBlockerMapPath = path.join(auditsDir, 'french_final_blocker_dependency_map_v2_packet.json');
  const completion = readJsonOrEmpty(completionPath);
  const remoteVerify = readJsonOrEmpty(remoteVerifyPath);
  const liveHandoff = readJsonOrEmpty(liveHandoffPath);
  const passCompletionSimulation = readJsonOrEmpty(passCompletionSimulationPath);
  const finalBlockerMap = readJsonOrEmpty(finalBlockerMapPath);
  const completionSummary = summaryOf(completion);
  const remoteVerifySummary = summaryOf(remoteVerify);
  const liveHandoffSummary = summaryOf(liveHandoff);
  const passCompletionSimulationSummary = summaryOf(passCompletionSimulation);
  const finalBlockerMapSummary = summaryOf(finalBlockerMap);
  const findings: Finding[] = [];

  for (const requiredPath of [completionPath, remoteVerifyPath, liveHandoffPath, passCompletionSimulationPath, finalBlockerMapPath]) {
    if (!fs.existsSync(requiredPath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Post-remote-verify transition requires this input artifact.', rel(input.repoRoot, requiredPath));
    }
  }

  const missingRequirements = arr<JsonObject>(completion.requirements).filter((item) => s(item, 'status') === 'missing');
  const lockedRequirements = arr<JsonObject>(completion.requirements).filter((item) => s(item, 'status') === 'production_locked');
  const currentDirectMissingRequirement = missingRequirements.map((item) => s(item, 'id')).join(',') || 'none';
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
  const liveHandoffReady =
    s(liveHandoff, 'status') === 'PASS' &&
    b(liveHandoffSummary, 'liveVerifyCommandReady') &&
    b(liveHandoffSummary, 'postVerifyChainReady') &&
    n(liveHandoffSummary, 'expectedRemoteObjects') === 36 &&
    n(liveHandoffSummary, 'expectedHashChecks') === 36 &&
    !b(liveHandoffSummary, 'activationApproved') &&
    !b(liveHandoffSummary, 'runtimeDownloadsEnabled') &&
    !b(liveHandoffSummary, 'readyForApply');
  const passCompletionSimulationReady =
    s(passCompletionSimulation, 'status') === 'PASS' &&
    n(passCompletionSimulationSummary, 'simulatedRemoteFoundObjects') === 36 &&
    n(passCompletionSimulationSummary, 'simulatedRemoteHashCheckedObjects') === 36 &&
    n(passCompletionSimulationSummary, 'simulatedRemoteUnexpectedObjects') === 0 &&
    n(passCompletionSimulationSummary, 'simulatedRemoteMissingObjects') === 0 &&
    n(passCompletionSimulationSummary, 'simulatedRemoteSizeMismatches') === 0 &&
    n(passCompletionSimulationSummary, 'simulatedRemoteHashMismatches') === 0 &&
    n(passCompletionSimulationSummary, 'simulatedRequirementsMissing') === 0 &&
    (postApprovalClosedMode
      ? n(passCompletionSimulationSummary, 'simulatedRequirementsProductionLocked') === 0 && s(passCompletionSimulationSummary, 'simulatedNextGate') === 'production_apply_closed'
      : n(passCompletionSimulationSummary, 'simulatedRequirementsProductionLocked') === 5 && s(passCompletionSimulationSummary, 'simulatedNextGate') === 'exact_approval_artifacts') &&
    (!b(passCompletionSimulationSummary, 'activationApproved') || postApprovalClosedMode) &&
    !b(passCompletionSimulationSummary, 'runtimeDownloadsEnabled') &&
    !b(passCompletionSimulationSummary, 'readyForApply') &&
    !b(passCompletionSimulationSummary, 'mayModifyProductionAppFiles');
  const finalBlockerMapPostApprovalTerminal =
    postApprovalClosedMode &&
    s(finalBlockerMapSummary, 'nextRootCauseToClose') === 'NONE-PRODUCTION-ACTIVATED' &&
    n(finalBlockerMapSummary, 'remoteVerifyFoundObjects') === 36 &&
    n(finalBlockerMapSummary, 'remoteVerifyHashCheckedObjects') === 36 &&
    !b(finalBlockerMapSummary, 'readyForApply') &&
    !b(finalBlockerMapSummary, 'runtimeDownloadsEnabled') &&
    !b(finalBlockerMapSummary, 'storageOrCloudMigrationStarted');

  if (!preRemoteVerifySingleGap && !postApprovalClosedMode) {
    addFinding(findings, 'blocker', 'completion_not_in_expected_remote_verify_hold', 'Completion audit must either have the single REQ-13 remote-verify hold or be in post-approval closed mode after remote verify PASS.', rel(input.repoRoot, completionPath));
  }
  if (!postApprovalClosedMode && currentDirectMissingRequirement !== 'REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY') {
    addFinding(findings, 'blocker', 'unexpected_missing_requirement_before_remote_verify', 'The only direct missing requirement before transition must be REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY.', rel(input.repoRoot, completionPath));
  }
  if (!postApprovalClosedMode && (lockedRequirements.length !== 5 || n(completionSummary, 'requirementsProductionLocked') !== 5)) {
    addFinding(findings, 'blocker', 'approval_lock_count_unexpected', 'Exactly five approval/apply requirements must remain production_locked before approval artifacts exist.', rel(input.repoRoot, completionPath));
  }
  if (!liveHandoffReady) {
    addFinding(findings, 'blocker', 'live_handoff_not_ready', 'Live handoff must be PASS and keep production flags closed before post-verify transition can be trusted.', rel(input.repoRoot, liveHandoffPath));
  }
  if (!passCompletionSimulationReady) {
    addFinding(findings, 'blocker', 'pass_completion_simulation_not_ready', 'Remote verify pass simulation must prove 36/36 found/hash, zero remote mismatches, zero missing completion requirements and five exact approval/apply locks.', rel(input.repoRoot, passCompletionSimulationPath));
  }
  if (!finalBlockerMapPostApprovalTerminal && (s(finalBlockerMap, 'status') !== 'PASS' || (!postApprovalClosedMode && s(finalBlockerMapSummary, 'nextRootCauseToClose') !== 'ROOT-01-REMOTE-SERVER-VERIFY'))) {
    addFinding(findings, 'blocker', 'final_blocker_map_not_remote_verify_focused', 'Final blocker map must point to ROOT-01-REMOTE-SERVER-VERIFY as the next root cause.', rel(input.repoRoot, finalBlockerMapPath));
  }
  if (
    (b(completionSummary, 'activationApproved') && !postApprovalClosedMode) ||
    b(completionSummary, 'readyForApply') ||
    b(completionSummary, 'runtimeDownloadsEnabled') ||
    b(completionSummary, 'storageMigrationAllowed') ||
    b(completionSummary, 'cloudSyncMigrationAllowed')
  ) {
    addFinding(findings, 'blocker', 'production_flag_open_before_transition', 'Activation/apply/runtime/storage/cloud flags must remain closed before and after remote verify.', rel(input.repoRoot, completionPath));
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const runArg = 'docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1';
  const afterRemoteVerifyExpectedLocked = postApprovalClosedMode ? 0 : 5;
  const afterRemoteVerifyNextGate = postApprovalClosedMode ? 'production_apply_closed' : 'exact_approval_artifacts';

  return {
    schemaVersion: 'gustav-french-post-remote-verify-transition-v2-packet-v0',
    runId: path.basename(input.runDir),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    summary: {
      targetLocale: 'fr',
      transitionState: blockers > 0 ? 'blocked_by_findings' : postApprovalClosedMode ? 'post_approval_remote_verify_complete_production_apply_locked' : 'ready_waiting_for_remote_verify_pass',
      currentCompletionMissing: n(completionSummary, 'requirementsMissing'),
      currentCompletionLocked: n(completionSummary, 'requirementsProductionLocked'),
      currentDirectMissingRequirement,
      remoteVerifyCurrentStatus: s(remoteVerify, 'status'),
      remoteVerifyCurrentFoundObjects: n(remoteVerifySummary, 'foundObjectCount'),
      remoteVerifyCurrentHashChecks: n(remoteVerifySummary, 'hashCheckedObjects') || n(remoteVerifySummary, 'hashCheckedCount'),
      remoteVerifyCurrentUnexpectedObjects: n(remoteVerifySummary, 'unexpectedObjects'),
      liveHandoffReady,
      passCompletionSimulationReady,
      simulatedRemoteFoundObjects: n(passCompletionSimulationSummary, 'simulatedRemoteFoundObjects'),
      simulatedRemoteHashChecks: n(passCompletionSimulationSummary, 'simulatedRemoteHashCheckedObjects'),
      simulatedRequirementsMissing: n(passCompletionSimulationSummary, 'simulatedRequirementsMissing'),
      simulatedRequirementsLocked: n(passCompletionSimulationSummary, 'simulatedRequirementsProductionLocked'),
      afterRemoteVerifyExpectedMissing: 0,
      afterRemoteVerifyExpectedLocked,
      afterRemoteVerifyNextGate,
      activationMustRemainClosed: true,
      runtimeDownloadsMustRemainClosed: true,
      productionApplyMustRemainClosed: true,
      blockers,
      warnings,
    },
    inputs: {
      productionReadinessCompletionAuditV2Packet: rel(input.repoRoot, completionPath),
      frenchServerObjectRemoteVerifyV2Packet: rel(input.repoRoot, remoteVerifyPath),
      frenchRemoteVerifyLiveHandoffV2Packet: rel(input.repoRoot, liveHandoffPath),
      frenchRemoteVerifyPassCompletionSimulationV2Packet: rel(input.repoRoot, passCompletionSimulationPath),
      frenchFinalBlockerDependencyMapV2Packet: rel(input.repoRoot, finalBlockerMapPath),
    },
    outputs: {},
    transitionRules: [
      'Before remote verify PASS, the only direct missing requirement must be REQ-13-FRENCH-SERVER-OBJECT-REMOTE-VERIFY.',
      'After remote verify PASS with found/hash=36/36, unexpectedObjects=0 and zero mismatches, completion missing requirements must become 0.',
      'After remote verify PASS, the five exact approval/apply requirements must remain production_locked until the exact approval source exists; after exact approval artifacts are active, the requirement locks may be resolved while production apply stays closed.',
      'Remote verify PASS must not open runtime downloads, production apply, storage migration or cloud sync migration; activationApproved is allowed only in post-approval closed mode.',
      'Only after refreshed completion/master prove 0 missing and exact approval locks only may the exact approval artifact chain proceed.',
    ],
    refreshCommandsAfterRemoteVerifyPass: [
      `npx tsx scripts\\gustav_french_remote_verify_pass_completion_simulation_v2_packet.ts --run ${runArg} --target fr`,
      `npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run ${runArg} --target fr`,
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
      'Do not publish or upload server objects from this transition.',
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
    '# Gustav French Post Remote Verify Transition V2',
    '',
    `- Status: ${report.status}`,
    `- Transition state: ${report.summary.transitionState}`,
    `- Current missing requirement: ${report.summary.currentDirectMissingRequirement}`,
    `- Current missing/locked: ${report.summary.currentCompletionMissing}/${report.summary.currentCompletionLocked}`,
    `- Remote current found/hash: ${report.summary.remoteVerifyCurrentFoundObjects}/${report.summary.remoteVerifyCurrentHashChecks}`,
    `- Live handoff ready: ${report.summary.liveHandoffReady ? 'yes' : 'no'}`,
    `- Pass completion simulation ready: ${report.summary.passCompletionSimulationReady ? 'yes' : 'no'}`,
    `- Simulated remote found/hash: ${report.summary.simulatedRemoteFoundObjects}/${report.summary.simulatedRemoteHashChecks}`,
    `- Simulated missing/locked: ${report.summary.simulatedRequirementsMissing}/${report.summary.simulatedRequirementsLocked}`,
    `- Expected after remote verify missing/locked: ${report.summary.afterRemoteVerifyExpectedMissing}/${report.summary.afterRemoteVerifyExpectedLocked}`,
    `- Next gate after remote verify: ${report.summary.afterRemoteVerifyNextGate}`,
    '',
    '## Transition Rules',
    '',
  ];
  for (const rule of report.transitionRules) lines.push(`- ${rule}`);
  lines.push('', '## Refresh Commands After Remote Verify PASS', '');
  for (const command of report.refreshCommandsAfterRemoteVerifyPass) lines.push(`- \`${command}\``);
  lines.push('', '## Denied Actions After Remote Verify PASS', '');
  for (const action of report.deniedActionsAfterRemoteVerifyPass) lines.push(`- ${action}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('', '## Safety', '', '- Read-only transition contract only. It does not upload, enable downloads, create approval artifacts, or apply production activation.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);
  const runDir = path.resolve(repoRoot, runArg);
  const outputJsonPath = path.join(runDir, 'audits', 'french_post_remote_verify_transition_v2_packet.json');
  const outputMdPath = path.join(runDir, 'audits', 'french_post_remote_verify_transition_v2_packet.md');
  const report = buildFrenchPostRemoteVerifyTransition({ repoRoot, runDir });
  report.outputs = {
    packet: rel(repoRoot, outputJsonPath),
    markdown: rel(repoRoot, outputMdPath),
  };
  ensureDir(path.dirname(outputJsonPath));
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  console.log(`GUSTAV French post remote verify transition V2 packet: ${report.status}`);
  console.log(`Transition state: ${report.summary.transitionState}`);
  console.log(`Current missing requirement: ${report.summary.currentDirectMissingRequirement}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

if (require.main === module) {
  main();
}
