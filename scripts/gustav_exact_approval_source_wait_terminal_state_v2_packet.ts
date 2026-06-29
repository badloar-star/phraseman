import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  passed: boolean;
  detail: string;
};

type Report = {
  schemaVersion: 'gustav-exact-approval-source-wait-terminal-state-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    targetLocale: string;
    terminalState: string;
    p68Ready: boolean;
    p68Status: string;
    p68HandoffState: string;
    p68ApprovalSourceExists: boolean;
    p68ApprovalSourceContainsExactSentence: boolean;
    approvalSourcePath: string;
    approvalSourceLiveChecked: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    nextAllowedStepWhileAbsent: string;
    nextAllowedStepWhenPresent: string;
    nextPassGoalId: string;
    nextPassIsTerminalWait: boolean;
    consistencyStatus: string;
    consistencyGoalId: string;
    consistencyAcceptsTerminalWait: boolean;
    masterStatus: string;
    masterBlockers: number;
    masterReadyForApply: boolean;
    masterMayModifyProductionAppFiles: boolean;
    masterActivationApproved: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    activationApproved: boolean;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    storageMigrationAllowed: boolean;
    cloudSyncMigrationAllowed: boolean;
    productionHardBlockers: number;
    canStartProductionApply: boolean;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  probes: Probe[];
  findings: Finding[];
  safety: {
    reportOnly: true;
    createsActiveApprovalArtifacts: false;
    executesProductionApply: false;
    uploadsServerOrFirebasePacks: false;
    enablesRuntimeDownloads: false;
    modifiesProductionAppFiles: false;
  };
};

const TERMINAL_WAIT_GOAL_ID = 'NEXT-PASS-P69-EXACT-APPROVAL-SOURCE-WAIT-TERMINAL-STATE-V2';
const P31_GOAL_ID = 'NEXT-PASS-P31-EXPLICIT-APPROVAL-RECEIPT-CREATION-GATE-V2';

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

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function readJson(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function summaryOf(filePath: string): JsonObject {
  return object(readJson(filePath).summary);
}

function arr(value: JsonObject, key: string): JsonObject[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
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

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function addFinding(findings: Finding[], severity: Finding['severity'], code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function probe(id: string, passed: boolean, detail: string): Probe {
  return { id, passed, detail };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval Source Wait Terminal State V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: \`${report.summary.targetLocale}\``,
    `- Terminal state: \`${report.summary.terminalState}\``,
    `- P68 status/ready/state: ${report.summary.p68Status}/${report.summary.p68Ready ? 'yes' : 'no'}/${report.summary.p68HandoffState}`,
    `- Approval source path: \`${report.summary.approvalSourcePath}\``,
    `- Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`,
    `- Next allowed while absent/present: \`${report.summary.nextAllowedStepWhileAbsent}\` / \`${report.summary.nextAllowedStepWhenPresent}\``,
    `- Next pass goal: \`${report.summary.nextPassGoalId}\``,
    `- Consistency goal: \`${report.summary.consistencyGoalId}\``,
    `- Master status/blockers: ${report.summary.masterStatus}/${report.summary.masterBlockers}`,
    `- Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Ready/apply/modify/activation: ${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}/${report.summary.activationApproved ? 'yes' : 'no'}`,
    `- Upload/runtime/storage/cloud: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Production hard blockers: ${report.summary.productionHardBlockers}`,
    `- Can start production apply: ${report.summary.canStartProductionApply ? 'yes' : 'no'}`,
    `- Probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Probes',
    '',
  ];
  for (const item of report.probes) {
    lines.push(`- ${item.passed ? 'PASS' : 'FAIL'} \`${item.id}\`: ${item.detail}`);
  }
  lines.push('', '## Findings', '');
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
    '- This packet is report-only.',
    '- It does not create active approval artifacts.',
    '- It does not execute production apply, upload packs, enable runtime downloads, or modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_exact_approval_source_wait_terminal_state_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const target = argValue('--target') || 'fr';
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const findings: Finding[] = [];
  const p68Path = path.join(auditsDir, 'exact_approval_source_handoff_firewall_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const nextPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const consistencyPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const activeApprovalReceiptPath = path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json');

  const p68 = readJson(p68Path);
  const p68Summary = object(p68.summary);
  const p31 = readJson(p31Path);
  const next = readJson(nextPath);
  const nextSummary = object(next.summary);
  const consistencySummary = summaryOf(consistencyPath);
  const masterSummary = summaryOf(masterPath);

  const approvalSourcePath = path.resolve(repoRoot, s(p68Summary, 'approvalSourcePath'));
  const requiredApprovalSentence = s(p31, 'requiredApprovalSentence');
  const p68ApprovalSourceExists = b(p68Summary, 'approvalSourceExists');
  const p68ApprovalSourceContainsExactSentence = b(p68Summary, 'approvalSourceContainsExactSentence');
  const approvalSourceLiveChecked = approvalSourcePath !== repoRoot && s(p68Summary, 'approvalSourcePath') !== '';
  const approvalSourceExists = approvalSourceLiveChecked && fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const approvalSourceContainsExactSentence =
    approvalSourceExists &&
    requiredApprovalSentence !== '' &&
    approvalSourceText.includes(requiredApprovalSentence);
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);
  const nextGoalId = s(arr(next, 'nextPassGoals')[0] || {}, 'id');
  const consistencyGoalId = s(consistencySummary, 'nextPassGoalId');
  const nextAllowedStepWhileAbsent = s(p68Summary, 'nextAllowedStepWhileAbsent');
  const nextAllowedStepWhenPresent = s(p68Summary, 'nextAllowedStepWhenPresent');
  const p68Ready =
    s(p68, 'status') === 'PASS' &&
    s(p68Summary, 'handoffState') === 'waiting_for_exact_approval_source_file' &&
    b(p68Summary, 'finalGapReady') &&
    b(p68Summary, 'exactApprovalWaitStateReady') &&
    b(p68Summary, 'p31CreationGateReady') &&
    b(p68Summary, 'approvalSourceIsCanonical') &&
    !p68ApprovalSourceExists &&
    !p68ApprovalSourceContainsExactSentence &&
    !b(p68Summary, 'activeApprovalReceiptExists') &&
    !b(p68Summary, 'activeHashLockExists') &&
    !b(p68Summary, 'readyForApply') &&
    !b(p68Summary, 'mayModifyProductionAppFiles') &&
    !b(p68Summary, 'activationApproved') &&
    n(p68Summary, 'fixtureProbes') > 0 &&
    n(p68Summary, 'fixtureProbesPassed') === n(p68Summary, 'fixtureProbes') &&
    n(p68Summary, 'blockers') === 0;

  const masterReadyForApply = b(masterSummary, 'readyForApply');
  const masterMayModifyProductionAppFiles = b(masterSummary, 'mayModifyProductionAppFiles');
  const masterActivationApproved = b(masterSummary, 'activationApproved');
  const readyForApply = masterReadyForApply || b(p68Summary, 'readyForApply') || b(nextSummary, 'readyForApply');
  const mayModifyProductionAppFiles =
    masterMayModifyProductionAppFiles ||
    b(p68Summary, 'mayModifyProductionAppFiles') ||
    b(nextSummary, 'mayModifyProductionAppFiles');
  const activationApproved = masterActivationApproved || b(p68Summary, 'activationApproved') || b(nextSummary, 'activationApproved');
  const serverUploadAllowed = b(masterSummary, 'serverUploadAllowed') || b(p68Summary, 'serverUploadAllowed');
  const firebaseUploadAllowed = b(masterSummary, 'firebaseUploadAllowed') || b(p68Summary, 'firebaseUploadAllowed');
  const runtimeDownloadsEnabled = b(masterSummary, 'runtimeDownloadsEnabled') || b(p68Summary, 'runtimeDownloadsEnabled');
  const storageMigrationAllowed = b(masterSummary, 'storageMigrationAllowed') || b(p68Summary, 'storageMigrationAllowed');
  const cloudSyncMigrationAllowed = b(masterSummary, 'cloudSyncMigrationAllowed') || b(p68Summary, 'cloudSyncMigrationAllowed');
  const terminalState = approvalSourceContainsExactSentence
    ? 'exact_approval_source_present_route_to_p31'
    : 'exact_approval_source_absent_terminal_wait';
  const nextPassIsTerminalWait = nextGoalId === TERMINAL_WAIT_GOAL_ID;
  const consistencyAcceptsTerminalWait = consistencyGoalId === TERMINAL_WAIT_GOAL_ID && s(readJson(consistencyPath), 'status') === 'PASS';
  const canStartProductionApply =
    approvalSourceContainsExactSentence &&
    activeApprovalReceiptExists &&
    activeHashLockExists &&
    readyForApply &&
    activationApproved;
  const productionHardBlockers = canStartProductionApply ? 0 : 1;
  const simulatedSourcePresentRoutesP31WithoutApply =
    nextAllowedStepWhenPresent === 'P31_EXPLICIT_APPROVAL_RECEIPT_CREATION_GATE_V2' &&
    !activeApprovalReceiptExists &&
    !activeHashLockExists &&
    !readyForApply &&
    !mayModifyProductionAppFiles &&
    !activationApproved &&
    !serverUploadAllowed &&
    !firebaseUploadAllowed &&
    !runtimeDownloadsEnabled &&
    !storageMigrationAllowed &&
    !cloudSyncMigrationAllowed;

  const probes: Probe[] = [
    probe('target-locale-fr', target === 'fr', target),
    probe('p68-ready-terminal-source-absent', p68Ready, `${s(p68, 'status')}/${s(p68Summary, 'handoffState')}/${p68ApprovalSourceExists}/${p68ApprovalSourceContainsExactSentence}`),
    probe('approval-source-live-checked', approvalSourceLiveChecked, rel(repoRoot, approvalSourcePath)),
    probe('p68-source-snapshot-matches-live-source', p68ApprovalSourceExists === approvalSourceExists && p68ApprovalSourceContainsExactSentence === approvalSourceContainsExactSentence, `${p68ApprovalSourceExists}/${p68ApprovalSourceContainsExactSentence} -> ${approvalSourceExists}/${approvalSourceContainsExactSentence}`),
    probe('terminal-wait-next-goal-selected', nextPassIsTerminalWait, nextGoalId),
    probe('consistency-accepts-terminal-wait', consistencyAcceptsTerminalWait, `${s(readJson(consistencyPath), 'status')}/${consistencyGoalId}`),
    probe('source-absent-or-routes-p31-only', !approvalSourceContainsExactSentence || nextAllowedStepWhenPresent === 'P31_EXPLICIT_APPROVAL_RECEIPT_CREATION_GATE_V2', `${approvalSourceContainsExactSentence}/${nextAllowedStepWhenPresent}`),
    probe('simulated-source-present-routes-p31-without-apply', simulatedSourcePresentRoutesP31WithoutApply, `${nextAllowedStepWhenPresent}/${activeApprovalReceiptExists}/${activeHashLockExists}/${readyForApply}/${activationApproved}`),
    probe('source-absent-waits', approvalSourceContainsExactSentence || nextAllowedStepWhileAbsent === 'wait_for_exact_approval_source_file', `${approvalSourceContainsExactSentence}/${nextAllowedStepWhileAbsent}`),
    probe('active-artifacts-absent', !activeApprovalReceiptExists && !activeHashLockExists, `${activeApprovalReceiptExists}/${activeHashLockExists}`),
    probe('master-hold-zero-blockers', s(readJson(masterPath), 'status') === 'HOLD' && n(masterSummary, 'blockers') === 0, `${s(readJson(masterPath), 'status')}/${n(masterSummary, 'blockers')}`),
    probe('production-flags-closed', !readyForApply && !mayModifyProductionAppFiles && !activationApproved, `${readyForApply}/${mayModifyProductionAppFiles}/${activationApproved}`),
    probe('delivery-migration-flags-closed', !serverUploadAllowed && !firebaseUploadAllowed && !runtimeDownloadsEnabled && !storageMigrationAllowed && !cloudSyncMigrationAllowed, `${serverUploadAllowed}/${firebaseUploadAllowed}/${runtimeDownloadsEnabled}/${storageMigrationAllowed}/${cloudSyncMigrationAllowed}`),
    probe('cannot-start-production-apply', !canStartProductionApply, String(canStartProductionApply)),
  ];

  if (target !== 'fr') addFinding(findings, 'blocker', 'target_locale_not_fr', 'Terminal wait-state is scoped to studyTarget=fr.');
  if (!p68Ready) addFinding(findings, 'blocker', 'p68_not_ready_for_terminal_wait', 'P68 must prove source-absent P31-only handoff before terminal wait.', rel(repoRoot, p68Path));
  if (!approvalSourceLiveChecked) addFinding(findings, 'blocker', 'approval_source_not_live_checked', 'P69 must live-check the canonical approval source path.', rel(repoRoot, p68Path));
  if (p68ApprovalSourceExists !== approvalSourceExists || p68ApprovalSourceContainsExactSentence !== approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'approval_source_snapshot_drift', 'P68 source snapshot no longer matches the live canonical approval source; refresh P68/P31 routing before continuing.', rel(repoRoot, approvalSourcePath));
  }
  if (approvalSourceContainsExactSentence) addFinding(findings, 'warning', 'approval_source_present_route_to_p31', 'Exact approval source is present; next run must route to P31 instead of terminal wait.', rel(repoRoot, approvalSourcePath));
  if (!nextPassIsTerminalWait) addFinding(findings, 'blocker', 'next_goal_not_terminal_wait', 'Next-pass contract must select P69 while exact approval source is absent.', rel(repoRoot, nextPath));
  if (!consistencyAcceptsTerminalWait) addFinding(findings, 'blocker', 'consistency_not_terminal_wait', 'Consistency report must accept P69 terminal wait-state.', rel(repoRoot, consistencyPath));
  if (activeApprovalReceiptExists || activeHashLockExists) addFinding(findings, 'blocker', 'active_artifacts_exist', 'Active approval artifacts must not exist during terminal wait.');
  if (readyForApply || mayModifyProductionAppFiles || activationApproved || serverUploadAllowed || firebaseUploadAllowed || runtimeDownloadsEnabled || storageMigrationAllowed || cloudSyncMigrationAllowed) {
    addFinding(findings, 'blocker', 'production_flag_open', 'Production/apply/upload/runtime/migration flags must stay closed during terminal wait.');
  }
  for (const item of probes) {
    if (!item.passed) addFinding(findings, 'blocker', `probe_failed_${item.id}`, item.detail);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((item) => item.passed).length;
  const report: Report = {
    schemaVersion: 'gustav-exact-approval-source-wait-terminal-state-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      targetLocale: target,
      terminalState,
      p68Ready,
      p68Status: s(p68, 'status'),
      p68HandoffState: s(p68Summary, 'handoffState'),
      p68ApprovalSourceExists,
      p68ApprovalSourceContainsExactSentence,
      approvalSourcePath: rel(repoRoot, approvalSourcePath),
      approvalSourceLiveChecked,
      approvalSourceExists,
      approvalSourceContainsExactSentence,
      nextAllowedStepWhileAbsent,
      nextAllowedStepWhenPresent,
      nextPassGoalId: nextGoalId,
      nextPassIsTerminalWait,
      consistencyStatus: s(readJson(consistencyPath), 'status'),
      consistencyGoalId,
      consistencyAcceptsTerminalWait,
      masterStatus: s(readJson(masterPath), 'status'),
      masterBlockers: n(masterSummary, 'blockers'),
      masterReadyForApply,
      masterMayModifyProductionAppFiles,
      masterActivationApproved,
      activeApprovalReceiptExists,
      activeHashLockExists,
      readyForApply,
      mayModifyProductionAppFiles,
      activationApproved,
      serverUploadAllowed,
      firebaseUploadAllowed,
      runtimeDownloadsEnabled,
      storageMigrationAllowed,
      cloudSyncMigrationAllowed,
      productionHardBlockers,
      canStartProductionApply,
      blockers,
      warnings,
      fixtureProbesPassed,
      fixtureProbes: probes.length,
    },
    probes,
    findings,
    safety: {
      reportOnly: true,
      createsActiveApprovalArtifacts: false,
      executesProductionApply: false,
      uploadsServerOrFirebasePacks: false,
      enablesRuntimeDownloads: false,
      modifiesProductionAppFiles: false,
    },
  };

  const outJson = path.join(auditsDir, 'exact_approval_source_wait_terminal_state_v2_packet.json');
  const outMd = path.join(auditsDir, 'exact_approval_source_wait_terminal_state_v2_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval source wait terminal state V2 packet: ${report.status}`);
  console.log(`Terminal state: ${report.summary.terminalState}`);
  console.log(`P68 ready/state: ${report.summary.p68Ready ? 'yes' : 'no'}/${report.summary.p68HandoffState}`);
  console.log(`Next/consistency goals: ${report.summary.nextPassGoalId}/${report.summary.consistencyGoalId}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Can start production apply: ${report.summary.canStartProductionApply ? 'yes' : 'no'}`);
  console.log(`Probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
