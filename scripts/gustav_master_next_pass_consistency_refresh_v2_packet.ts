import * as fs from 'node:fs';
import * as path from 'node:path';

type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
};

type Report = {
  schemaVersion: 'gustav-master-next-pass-consistency-refresh-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'BLOCK';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: 'fr';
    consistencyState: string;
    p37Ready: boolean;
    p37State: string;
    p37SafeClosed: number;
    p37SafeRemaining: number;
    p37ReadyForApply: boolean;
    p51Present: boolean;
    p51Ready: boolean;
    p51State: string;
    p51ReadinessApplyBlockers: number;
    p51ActiveApprovalReceiptExists: boolean;
    p51ActiveHashLockExists: boolean;
    p52Present: boolean;
    p52Ready: boolean;
    p52State: string;
    p52ApprovalSourceExists: boolean;
    p52ApprovalSourceContainsExactSentence: boolean;
    p52PlainContinueWouldCreateActiveArtifacts: boolean;
    p52ActiveApprovalReceiptExists: boolean;
    p52ActiveHashLockExists: boolean;
    p53Present: boolean;
    p53Ready: boolean;
    p53State: string;
    p53ApprovalSourceExists: boolean;
    p53ApprovalSourceContainsExactSentence: boolean;
    p53PlainContinueWouldCreateActiveArtifacts: boolean;
    p53WouldCreateActiveArtifactsByThisScript: boolean;
    p53ActiveApprovalReceiptExists: boolean;
    p53ActiveHashLockExists: boolean;
    p54Present: boolean;
    p54Ready: boolean;
    p54State: string;
    p54ApprovalSourceExists: boolean;
    p54ApprovalSourceContainsExactSentence: boolean;
    p54ActiveApprovalReceiptExists: boolean;
    p54ActiveHashLockExists: boolean;
    p54SimulatedPairWouldPassP44AfterP31Create: boolean;
    p54CurrentP44WouldOpenSequencing: boolean;
    p55Present: boolean;
    p55Ready: boolean;
    p55State: string;
    p55ApprovalSourceExists: boolean;
    p55ApprovalSourceContainsExactSentence: boolean;
    p55ActiveApprovalReceiptExists: boolean;
    p55ActiveHashLockExists: boolean;
    p55CommandAllowedNow: boolean;
    p55CommandAllowedWhenExactSourcePresent: boolean;
    p55CommandExecutedByThisScript: boolean;
    p56Present: boolean;
    p56Ready: boolean;
    p56State: string;
    p56ApprovalSourceExists: boolean;
    p56ApprovalSourceContainsExactSentence: boolean;
    p56ActiveApprovalReceiptExists: boolean;
    p56ActiveHashLockExists: boolean;
    p56CommandAllowedNow: boolean;
    p56CommandAllowedAfterP31Create: boolean;
    p56CommandExecutedByThisScript: boolean;
    p57Present: boolean;
    p57Ready: boolean;
    p57State: string;
    p57P56Ready: boolean;
    p57P44Status: string;
    p57P44ValidationState: string;
    p57P45Status: string;
    p57P45PreflightState: string;
    p57CurrentHandoffWouldOpenSequence: boolean;
    p57SimulatedPostP44P45WouldOpenSequence: boolean;
    p57CommandExecutedByThisScript: boolean;
    p58Present: boolean;
    p58Ready: boolean;
    p58State: string;
    p58P57Ready: boolean;
    p58P45Status: string;
    p58P45PreflightState: string;
    p58CommandAllowedNow: boolean;
    p58CommandAllowedAfterP44Validation: boolean;
    p58CommandExecutedByThisScript: boolean;
    p59Present: boolean;
    p59Ready: boolean;
    p59State: string;
    p59P58Ready: boolean;
    p59P45Status: string;
    p59P45PreflightState: string;
    p59P46Status: string;
    p59P46TransactionState: string;
    p59CurrentHandoffWouldOpenTransaction: boolean;
    p59SimulatedPostP45P46WouldOpenTransaction: boolean;
    p59CommandExecutedByThisScript: boolean;
    p60Present: boolean;
    p60Ready: boolean;
    p60State: string;
    p60P59Ready: boolean;
    p60P45Status: string;
    p60P45PreflightState: string;
    p60P46Status: string;
    p60P46TransactionState: string;
    p60CommandAllowedNow: boolean;
    p60CommandAllowedAfterP45Sequence: boolean;
    p60CommandExecutedByThisScript: boolean;
    p61Present: boolean;
    p61Ready: boolean;
    p61State: string;
    p61P60Ready: boolean;
    p61P46Status: string;
    p61P46TransactionState: string;
    p61P47Status: string;
    p61P47GuardState: string;
    p61CurrentHandoffWouldOpenRollbackGuard: boolean;
    p61SimulatedPostP46P47WouldOpenRollbackGuard: boolean;
    p61CommandExecutedByThisScript: boolean;
    p62Present: boolean;
    p62Ready: boolean;
    p62State: string;
    p62P61Ready: boolean;
    p62P46Status: string;
    p62P46TransactionState: string;
    p62P47Status: string;
    p62P47GuardState: string;
    p62CommandAllowedNow: boolean;
    p62CommandAllowedAfterP46Contract: boolean;
    p62CommandExecutedByThisScript: boolean;
    p63Present: boolean;
    p63Ready: boolean;
    p63State: string;
    p63P62Ready: boolean;
    p63P47Status: string;
    p63P47GuardState: string;
    p63P48Status: string;
    p63P48ContinuationState: string;
    p63CurrentHandoffWouldOpenSafeContinuation: boolean;
    p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: boolean;
    p63CommandExecutedByThisScript: boolean;
    p64Present: boolean;
    p64Ready: boolean;
    p64State: string;
    p64P63Ready: boolean;
    p64P48Status: string;
    p64P48ContinuationState: string;
    p64CommandAllowedNow: boolean;
    p64CommandExecutedByThisScript: boolean;
    p65Present: boolean;
    p65Ready: boolean;
    p65State: string;
    p65ClosedEvidenceReady: boolean;
    p65ExactApprovalStillRequired: boolean;
    p65SourceContainsExactSentence: boolean;
    p65ApprovalSourceIsCanonical: boolean;
    p65ActiveApprovalReceiptExists: boolean;
    p65ActiveHashLockExists: boolean;
    p69Present: boolean;
    p69Ready: boolean;
    p69State: string;
    p69NextGoalId: string;
    p69ConsistencyGoalId: string;
    p69ActiveApprovalReceiptExists: boolean;
    p69ActiveHashLockExists: boolean;
    p69ReadyForApply: boolean;
    p69MayModifyProductionAppFiles: boolean;
    p69CanStartProductionApply: boolean;
    nextPassStatus: string;
    nextPassPrepared: boolean;
    nextPassGoalId: string;
    nextPassP37Ready: boolean;
    nextPassP51Ready: boolean;
    nextPassP52Ready: boolean;
    nextPassP53Ready: boolean;
    nextPassP54Ready: boolean;
    nextPassP55Ready: boolean;
    nextPassP56Ready: boolean;
    nextPassP57Ready: boolean;
    nextPassP58Ready: boolean;
    nextPassP59Ready: boolean;
    nextPassP60Ready: boolean;
    nextPassP61Ready: boolean;
    nextPassP62Ready: boolean;
    nextPassP63Ready: boolean;
    nextPassP64Ready: boolean;
    nextPassP65Ready: boolean;
    nextPassReadyForApply: boolean;
    nextPassMayModifyProductionAppFiles: boolean;
    masterStatus: string;
    masterBlockers: number;
    masterActionableBlockers: number;
    masterExpectedFutureBlockers: number;
    masterWarnings: number;
    masterP37Present: boolean;
    masterP37State: string;
    masterP37ReadyForApply: boolean;
    masterP51Present: boolean;
    masterP51State: string;
    masterP51Ready: boolean;
    masterP52Present: boolean;
    masterP52State: string;
    masterP52Ready: boolean;
    masterP53Present: boolean;
    masterP53State: string;
    masterP53Ready: boolean;
    masterP54Present: boolean;
    masterP54State: string;
    masterP54Ready: boolean;
    masterP55Present: boolean;
    masterP55State: string;
    masterP55Ready: boolean;
    masterP56Present: boolean;
    masterP56State: string;
    masterP56Ready: boolean;
    masterP57Present: boolean;
    masterP57State: string;
    masterP57Ready: boolean;
    masterP58Present: boolean;
    masterP58State: string;
    masterP58Ready: boolean;
    masterP59Present: boolean;
    masterP59State: string;
    masterP59Ready: boolean;
    masterP60Present: boolean;
    masterP60State: string;
    masterP60Ready: boolean;
    masterP61Present: boolean;
    masterP61State: string;
    masterP61Ready: boolean;
    masterP62Present: boolean;
    masterP62State: string;
    masterP62Ready: boolean;
    masterP63Present: boolean;
    masterP63State: string;
    masterP63Ready: boolean;
    masterP64Present: boolean;
    masterP64State: string;
    masterP64Ready: boolean;
    masterP65Present: boolean;
    masterP65State: string;
    masterP65Ready: boolean;
    masterReadyForApply: boolean;
    masterMayModifyProductionAppFiles: boolean;
    readyForOfficialSourceContentCoverageGateV2: boolean;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    productionWritesAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    }
  }
  return args;
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonOrEmpty(filePath: string): any {
  if (!fs.existsSync(filePath)) return {};
  return readJson(filePath);
}

function summaryOf(value: any): Record<string, unknown> {
  return value && typeof value === 'object' && value.summary && typeof value.summary === 'object'
    ? value.summary
    : {};
}

function n(obj: Record<string, unknown>, key: string): number {
  const value = obj[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function s(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  return typeof value === 'string' ? value : '';
}

function b(obj: Record<string, unknown>, key: string): boolean {
  return obj[key] === true;
}

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function arr(value: any, key: string): any[] {
  const next = value && typeof value === 'object' ? value[key] : undefined;
  return Array.isArray(next) ? next : [];
}

function rel(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string) {
  findings.push({ severity, code, message, path: filePath });
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function probe(name: string, passed: boolean, expected: string, actual: string): Probe {
  return { name, passed, expected, actual };
}

function renderMarkdown(report: Report): string {
  return [
    '# GUSTAV Master / Next-Pass Consistency Refresh V2',
    '',
    `Status: ${report.status}`,
    '',
    `Consistency state: ${report.summary.consistencyState}`,
    '',
    `P37 ready/state: ${report.summary.p37Ready ? 'yes' : 'no'} / ${report.summary.p37State}`,
    '',
    `P37 safe closed/remaining: ${report.summary.p37SafeClosed}/${report.summary.p37SafeRemaining}`,
    '',
    `P51 present/ready/state: ${report.summary.p51Present ? 'yes' : 'no'} / ${report.summary.p51Ready ? 'yes' : 'no'} / ${report.summary.p51State}`,
    '',
    `P51 apply blockers/active receipt/hash: ${report.summary.p51ReadinessApplyBlockers}/${report.summary.p51ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p51ActiveHashLockExists ? 'yes' : 'no'}`,
    '',
    `P52 present/ready/state: ${report.summary.p52Present ? 'yes' : 'no'} / ${report.summary.p52Ready ? 'yes' : 'no'} / ${report.summary.p52State}`,
    '',
    `P52 source/exact/plain-create/active receipt/hash: ${report.summary.p52ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.p52ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.p52PlainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}/${report.summary.p52ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p52ActiveHashLockExists ? 'yes' : 'no'}`,
    '',
    `P53 present/ready/state: ${report.summary.p53Present ? 'yes' : 'no'} / ${report.summary.p53Ready ? 'yes' : 'no'} / ${report.summary.p53State}`,
    '',
    `P53 source/exact/plain-create/script-create/active receipt/hash: ${report.summary.p53ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.p53ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.p53PlainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}/${report.summary.p53WouldCreateActiveArtifactsByThisScript ? 'yes' : 'no'}/${report.summary.p53ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p53ActiveHashLockExists ? 'yes' : 'no'}`,
    '',
    `P54 present/ready/state: ${report.summary.p54Present ? 'yes' : 'no'} / ${report.summary.p54Ready ? 'yes' : 'no'} / ${report.summary.p54State}`,
    '',
    `P54 source/exact/active receipt/hash/sim-P44/current-P44: ${report.summary.p54ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.p54ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.p54ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p54ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p54SimulatedPairWouldPassP44AfterP31Create ? 'yes' : 'no'}/${report.summary.p54CurrentP44WouldOpenSequencing ? 'yes' : 'no'}`,
    '',
    `P55 present/ready/state: ${report.summary.p55Present ? 'yes' : 'no'} / ${report.summary.p55Ready ? 'yes' : 'no'} / ${report.summary.p55State}`,
    '',
    `P55 source/exact/active receipt/hash/command now/with-source/executed: ${report.summary.p55ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.p55ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.p55ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p55ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p55CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p55CommandAllowedWhenExactSourcePresent ? 'yes' : 'no'}/${report.summary.p55CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P56 present/ready/state: ${report.summary.p56Present ? 'yes' : 'no'} / ${report.summary.p56Ready ? 'yes' : 'no'} / ${report.summary.p56State}`,
    '',
    `P56 source/exact/active receipt/hash/command now/after-P31/executed: ${report.summary.p56ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.p56ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.p56ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p56ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p56CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p56CommandAllowedAfterP31Create ? 'yes' : 'no'}/${report.summary.p56CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P57 present/ready/state: ${report.summary.p57Present ? 'yes' : 'no'} / ${report.summary.p57Ready ? 'yes' : 'no'} / ${report.summary.p57State}`,
    '',
    `P57 P44/P45/current/sim/executed: ${report.summary.p57P44Status}/${report.summary.p57P44ValidationState}/${report.summary.p57P45Status}/${report.summary.p57P45PreflightState}/${report.summary.p57CurrentHandoffWouldOpenSequence ? 'yes' : 'no'}/${report.summary.p57SimulatedPostP44P45WouldOpenSequence ? 'yes' : 'no'}/${report.summary.p57CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P58 present/ready/state: ${report.summary.p58Present ? 'yes' : 'no'} / ${report.summary.p58Ready ? 'yes' : 'no'} / ${report.summary.p58State}`,
    '',
    `P58 P45/command now/after-P44/executed: ${report.summary.p58P45Status}/${report.summary.p58P45PreflightState}/${report.summary.p58CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p58CommandAllowedAfterP44Validation ? 'yes' : 'no'}/${report.summary.p58CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P59 present/ready/state: ${report.summary.p59Present ? 'yes' : 'no'} / ${report.summary.p59Ready ? 'yes' : 'no'} / ${report.summary.p59State}`,
    '',
    `P59 P45/P46/current/sim/executed: ${report.summary.p59P45Status}/${report.summary.p59P45PreflightState}/${report.summary.p59P46Status}/${report.summary.p59P46TransactionState}/${report.summary.p59CurrentHandoffWouldOpenTransaction ? 'yes' : 'no'}/${report.summary.p59SimulatedPostP45P46WouldOpenTransaction ? 'yes' : 'no'}/${report.summary.p59CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P60 present/ready/state: ${report.summary.p60Present ? 'yes' : 'no'} / ${report.summary.p60Ready ? 'yes' : 'no'} / ${report.summary.p60State}`,
    '',
    `P60 P45/P46/command now/after-P45/executed: ${report.summary.p60P45Status}/${report.summary.p60P45PreflightState}/${report.summary.p60P46Status}/${report.summary.p60P46TransactionState}/${report.summary.p60CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p60CommandAllowedAfterP45Sequence ? 'yes' : 'no'}/${report.summary.p60CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P61 present/ready/state: ${report.summary.p61Present ? 'yes' : 'no'} / ${report.summary.p61Ready ? 'yes' : 'no'} / ${report.summary.p61State}`,
    '',
    `P61 P46/P47/current/sim/executed: ${report.summary.p61P46Status}/${report.summary.p61P46TransactionState}/${report.summary.p61P47Status}/${report.summary.p61P47GuardState}/${report.summary.p61CurrentHandoffWouldOpenRollbackGuard ? 'yes' : 'no'}/${report.summary.p61SimulatedPostP46P47WouldOpenRollbackGuard ? 'yes' : 'no'}/${report.summary.p61CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P62 present/ready/state: ${report.summary.p62Present ? 'yes' : 'no'} / ${report.summary.p62Ready ? 'yes' : 'no'} / ${report.summary.p62State}`,
    '',
    `P62 P46/P47/command now/after-P46/executed: ${report.summary.p62P46Status}/${report.summary.p62P46TransactionState}/${report.summary.p62P47Status}/${report.summary.p62P47GuardState}/${report.summary.p62CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p62CommandAllowedAfterP46Contract ? 'yes' : 'no'}/${report.summary.p62CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P63 present/ready/state: ${report.summary.p63Present ? 'yes' : 'no'} / ${report.summary.p63Ready ? 'yes' : 'no'} / ${report.summary.p63State}`,
    '',
    `P63 P47/P48/current/sim/executed: ${report.summary.p63P47Status}/${report.summary.p63P47GuardState}/${report.summary.p63P48Status}/${report.summary.p63P48ContinuationState}/${report.summary.p63CurrentHandoffWouldOpenSafeContinuation ? 'yes' : 'no'}/${report.summary.p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation ? 'yes' : 'no'}/${report.summary.p63CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P64 present/ready/state: ${report.summary.p64Present ? 'yes' : 'no'} / ${report.summary.p64Ready ? 'yes' : 'no'} / ${report.summary.p64State}`,
    '',
    `P64 P48/allowed/executed: ${report.summary.p64P48Status}/${report.summary.p64P48ContinuationState}/${report.summary.p64CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p64CommandExecutedByThisScript ? 'yes' : 'no'}`,
    '',
    `P65 present/ready/state: ${report.summary.p65Present ? 'yes' : 'no'} / ${report.summary.p65Ready ? 'yes' : 'no'} / ${report.summary.p65State}`,
    '',
    `P65 closed/source/default/active: ${report.summary.p65ClosedEvidenceReady ? 'yes' : 'no'}/${report.summary.p65SourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.p65ApprovalSourceIsCanonical ? 'yes' : 'no'}/${report.summary.p65ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p65ActiveHashLockExists ? 'yes' : 'no'}`,
    '',
    `P69 present/ready/state: ${report.summary.p69Present ? 'yes' : 'no'} / ${report.summary.p69Ready ? 'yes' : 'no'} / ${report.summary.p69State}`,
    '',
    `P69 next/consistency/active/apply: ${report.summary.p69NextGoalId}/${report.summary.p69ConsistencyGoalId}/${report.summary.p69ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p69ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p69CanStartProductionApply ? 'yes' : 'no'}`,
    '',
    `Next pass: ${report.summary.nextPassStatus} / ${report.summary.nextPassGoalId}`,
    '',
    `Master: ${report.summary.masterStatus}, blockers=${report.summary.masterBlockers}, warnings=${report.summary.masterWarnings}`,
    '',
    `Ready for official-source content coverage gate V2: ${report.summary.readyForOfficialSourceContentCoverageGateV2 ? 'yes' : 'no'}`,
    '',
    `Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    `Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    '',
    '## Findings',
    '',
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`)
      : ['- None']),
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const runId = args.run ? path.basename(path.resolve(args.run)) : '2026-05-19_fr_inventory_v0a1';
  const runDir = args.run ? path.resolve(args.run) : path.join(repoRoot, 'docs/gustav/runs', runId);
  const target = args.target || 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr, got ${target}`);

  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');
  const p37Path = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const p47ContractPath = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const p48Path = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const p51Path = path.join(auditsDir, 'exact_approval_apply_rehearsal_v2_packet.json');
  const p52Path = path.join(auditsDir, 'exact_approval_source_firewall_v2_packet.json');
  const p53Path = path.join(auditsDir, 'exact_approval_source_intake_transition_v2_packet.json');
  const p54Path = path.join(auditsDir, 'exact_approval_active_artifact_pair_simulation_v2_packet.json');
  const p55Path = path.join(auditsDir, 'exact_approval_p31_create_command_preflight_v2_packet.json');
  const p56Path = path.join(auditsDir, 'exact_approval_p44_validation_command_preflight_v2_packet.json');
  const p57Path = path.join(auditsDir, 'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.json');
  const p58Path = path.join(auditsDir, 'exact_approval_p45_sequence_command_preflight_v2_packet.json');
  const p59Path = path.join(auditsDir, 'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.json');
  const p60Path = path.join(auditsDir, 'exact_approval_p46_apply_transaction_command_preflight_v2_packet.json');
  const p61Path = path.join(auditsDir, 'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.json');
  const p62Path = path.join(auditsDir, 'exact_approval_p47_rollback_guard_command_preflight_v2_packet.json');
  const p63Path = path.join(auditsDir, 'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.json');
  const p64Path = path.join(auditsDir, 'exact_approval_p48_safe_continuation_command_preflight_v2_packet.json');
  const p65Path = path.join(auditsDir, 'exact_approval_wait_state_v2_packet.json');
  const p69Path = path.join(auditsDir, 'exact_approval_source_wait_terminal_state_v2_packet.json');
  const nextPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const outputJsonPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.md');

  const findings: Finding[] = [];
  for (const filePath of [p37Path, nextPath, masterPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'REQUIRED_INPUT_MISSING', 'Required consistency input is missing.', rel(repoRoot, filePath));
  }

  const p37 = readJsonOrEmpty(p37Path);
  const p51 = readJsonOrEmpty(p51Path);
  const p52 = readJsonOrEmpty(p52Path);
  const p53 = readJsonOrEmpty(p53Path);
  const p54 = readJsonOrEmpty(p54Path);
  const p55 = readJsonOrEmpty(p55Path);
  const p56 = readJsonOrEmpty(p56Path);
  const p57 = readJsonOrEmpty(p57Path);
  const p58 = readJsonOrEmpty(p58Path);
  const p59 = readJsonOrEmpty(p59Path);
  const p60 = readJsonOrEmpty(p60Path);
  const p61 = readJsonOrEmpty(p61Path);
  const p62 = readJsonOrEmpty(p62Path);
  const p63 = readJsonOrEmpty(p63Path);
  const p64 = readJsonOrEmpty(p64Path);
  const p65 = readJsonOrEmpty(p65Path);
  const p69 = readJsonOrEmpty(p69Path);
  const next = readJsonOrEmpty(nextPath);
  const master = readJsonOrEmpty(masterPath);
  const p37Summary = summaryOf(p37);
  const p51Summary = summaryOf(p51);
  const p52Summary = summaryOf(p52);
  const p53Summary = summaryOf(p53);
  const p54Summary = summaryOf(p54);
  const p55Summary = summaryOf(p55);
  const p56Summary = summaryOf(p56);
  const p57Summary = summaryOf(p57);
  const p58Summary = summaryOf(p58);
  const p59Summary = summaryOf(p59);
  const p60Summary = summaryOf(p60);
  const p61Summary = summaryOf(p61);
  const p62Summary = summaryOf(p62);
  const p63Summary = summaryOf(p63);
  const p64Summary = summaryOf(p64);
  const p65Summary = summaryOf(p65);
  const p69Summary = summaryOf(p69);
  const nextSummary = summaryOf(next);
  const masterSummary = summaryOf(master);
  const nextGoalId = s(arr(next, 'nextPassGoals')[0] || {}, 'id');
  const p31GoalId = 'NEXT-PASS-P31-EXPLICIT-APPROVAL-RECEIPT-CREATION-GATE-V2';
  const p64GoalId = 'NEXT-PASS-P64-EXACT-APPROVAL-P48-SAFE-CONTINUATION-COMMAND-PREFLIGHT-V2';
  const p65GoalId = 'NEXT-PASS-P65-EXACT-APPROVAL-WAIT-STATE-V2';
  const p66GoalId = 'NEXT-PASS-P66-SAFE-PREAPPROVAL-CONTINUATION-V2';
  const p67GoalId = 'NEXT-PASS-P67-FINAL-PRODUCTION-READINESS-GAP-V2';
  const p68GoalId = 'NEXT-PASS-P68-EXACT-APPROVAL-SOURCE-HANDOFF-FIREWALL-V2';
  const p69GoalId = 'NEXT-PASS-P69-EXACT-APPROVAL-SOURCE-WAIT-TERMINAL-STATE-V2';
  const remoteVerifyGoalId = 'NEXT-PASS-REMOTE-SERVER-OBJECT-VERIFY-V2';
  const remoteVerifyPriorityMode = nextGoalId === remoteVerifyGoalId;
  const productionClosed = (summary: JsonObject): boolean =>
    !b(summary, 'readyForApply') &&
    !b(summary, 'mayModifyProductionAppFiles') &&
    !b(summary, 'activationApproved') &&
    !b(summary, 'serverUploadAllowed') &&
    !b(summary, 'firebaseUploadAllowed') &&
    !b(summary, 'downloadablePacksPublished') &&
    !b(summary, 'runtimeDownloadsEnabled') &&
    !b(summary, 'storageMigrationAllowed') &&
    !b(summary, 'cloudSyncMigrationAllowed');
  const remoteVerifyHoldAccepted = (present: boolean, packet: JsonObject, summary: JsonObject): boolean =>
    remoteVerifyPriorityMode &&
    present &&
    (s(packet, 'status') === 'BLOCK' || s(packet, 'status') === 'PASS' || s(packet, 'status') === 'HOLD') &&
    productionClosed(summary) &&
    n(summary, 'fixtureProbes') > 0 &&
    n(summary, 'fixtureProbesPassed') <= n(summary, 'fixtureProbes');
  const expectedMasterFutureBlockersForP38 = new Set([
    'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh',
    'final_production_readiness_gap_v2_blockers',
    'final_production_readiness_gap_v2_not_ready',
    'final_production_readiness_gap_v2_generation_not_ready',
    'final_production_readiness_gap_v2_decision_import_not_ready',
    'final_production_readiness_gap_v2_missing_probe_passes',
    'exact_approval_source_handoff_firewall_v2_blockers',
    'exact_approval_source_handoff_firewall_v2_not_ready',
    'exact_approval_source_handoff_firewall_v2_missing_probe_passes',
    'exact_approval_source_wait_terminal_state_v2_blockers',
    'exact_approval_source_wait_terminal_state_v2_not_ready',
    'exact_approval_source_wait_terminal_state_v2_missing_probe_passes',
  ]);
  const masterBlockerFindings = arr(master, 'findings').filter((finding) => s(finding, 'severity') === 'blocker');
  const isExpectedMasterFutureBlocker = (code: string): boolean =>
    expectedMasterFutureBlockersForP38.has(code) ||
    code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') ||
    code.startsWith('nonproduction_blocker_closure_plan_v2_') ||
    code.startsWith('nonproduction_evidence_refresh_v2_') ||
    code.startsWith('runtime_server_manifest_consistency_recheck_v2_') ||
    code.startsWith('runtime_delivery_evidence_chain_v2_') ||
    code.startsWith('language_isolation_regression_recheck_v2_') ||
    code.startsWith('official_source_content_coverage_v2_') ||
    code.startsWith('production_activation_hold_exact_approval_required_v2_') ||
    code.startsWith('exact_approval_validation_gate_v2_') ||
    code.startsWith('production_activation_sequence_preflight_v2_') ||
    code.startsWith('production_apply_transaction_contract_v2_') ||
    code.startsWith('post_apply_rollback_guard_contract_v2_') ||
    code.startsWith('approval_wait_safe_continuation_v2_') ||
    code.startsWith('exact_approval_source_firewall_v2_') ||
    code.startsWith('exact_approval_source_intake_transition_v2_') ||
    code.startsWith('exact_approval_active_artifact_pair_simulation_v2_') ||
    code.startsWith('exact_approval_p31_create_command_preflight_v2_') ||
    code.startsWith('exact_approval_p44_validation_command_preflight_v2_') ||
    code.startsWith('exact_approval_p44_to_p45_sequence_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p45_sequence_command_preflight_v2_') ||
    code.startsWith('exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p46_apply_transaction_command_preflight_v2_') ||
    code.startsWith('exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p47_rollback_guard_command_preflight_v2_') ||
    code.startsWith('exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p48_safe_continuation_command_preflight_v2_') ||
    code.startsWith('post_exact_approval_apply_runbook_v2_') ||
    code.startsWith('exact_approval_wait_state_v2_') ||
    code.startsWith('production_readiness_completion_audit_v2_') ||
    code.startsWith('final_preapproval_evidence_hash_lock_v2_') ||
    code.startsWith('ordered_approval_wait_refresh_v2_') ||
    code.startsWith('safe_preapproval_continuation_v2_') ||
    code.startsWith('exact_approval_source_wait_terminal_state_v2_');
  const masterExpectedFutureBlockers = masterBlockerFindings.filter((finding) => isExpectedMasterFutureBlocker(s(finding, 'code'))).length;
  const masterActionableBlockers = masterBlockerFindings.length - masterExpectedFutureBlockers;

  const p37Ready =
    s(p37, 'status') === 'PASS' &&
    n(p37Summary, 'blockers') === 0 &&
    s(p37Summary, 'blockerMapState') === 'readiness_apply_blocker_map_refreshed' &&
    ((n(p37Summary, 'safeNonProductionItemsClosed') === 4 &&
      n(p37Summary, 'safeNonProductionItemsRemaining') === 1) ||
      (n(p37Summary, 'safeNonProductionItemsClosed') === 5 &&
        n(p37Summary, 'safeNonProductionItemsRemaining') === 0)) &&
    !b(p37Summary, 'readyForApply') &&
    !b(p37Summary, 'mayModifyProductionAppFiles');
  const p51Present = fs.existsSync(p51Path);
  const p51Ready =
    p51Present &&
    s(p51, 'status') === 'PASS' &&
    n(p51Summary, 'blockers') === 0 &&
    s(p51Summary, 'rehearsalState') === 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' &&
    n(p51Summary, 'readinessApplyBlockers') === 1 &&
    !b(p51Summary, 'activeApprovalReceiptExists') &&
    !b(p51Summary, 'activeHashLockExists') &&
    b(p51Summary, 'mainHashLockDryRunPresent') &&
    b(p51Summary, 'finalHashLockDryRunPresent') &&
    !b(p51Summary, 'wouldCreateActiveArtifactsNow') &&
    !b(p51Summary, 'readyForApply') &&
    !b(p51Summary, 'mayModifyProductionAppFiles') &&
    !b(p51Summary, 'activationApproved') &&
    n(p51Summary, 'fixtureProbes') > 0 &&
    n(p51Summary, 'fixtureProbesPassed') === n(p51Summary, 'fixtureProbes');
  const p52Present = fs.existsSync(p52Path);
  const p52Ready =
    p52Present &&
    s(p52, 'status') === 'PASS' &&
    n(p52Summary, 'blockers') === 0 &&
    (s(p52Summary, 'firewallState') === 'exact_approval_source_firewall_ready_waiting_for_approval_source' ||
      s(p52Summary, 'firewallState') === 'exact_approval_source_present_p31_create_required') &&
    b(p52Summary, 'p51Ready') &&
    b(p52Summary, 'requiredApprovalSentencePresent') &&
    b(p52Summary, 'approvalSourceRequiredForActiveArtifacts') &&
    b(p52Summary, 'explicitCreateFlagRequiredForActiveArtifacts') &&
    !b(p52Summary, 'plainContinueWouldCreateActiveArtifacts') &&
    !b(p52Summary, 'wouldCreateActiveArtifactsNow') &&
    !b(p52Summary, 'activeApprovalReceiptExists') &&
    !b(p52Summary, 'activeHashLockExists') &&
    !b(p52Summary, 'readyForApply') &&
    !b(p52Summary, 'mayModifyProductionAppFiles') &&
    !b(p52Summary, 'activationApproved') &&
    n(p52Summary, 'fixtureProbes') > 0 &&
    n(p52Summary, 'fixtureProbesPassed') === n(p52Summary, 'fixtureProbes');
  const p53Present = fs.existsSync(p53Path);
  const p53Ready =
    p53Present &&
    s(p53, 'status') === 'PASS' &&
    fileMtimeMs(p53Path) >= fileMtimeMs(p52Path) &&
    fileMtimeMs(p52Path) > 0 &&
    n(p53Summary, 'blockers') === 0 &&
    (s(p53Summary, 'intakeTransitionState') === 'exact_approval_intake_transition_ready_waiting_for_approval_source' ||
      s(p53Summary, 'intakeTransitionState') === 'exact_approval_source_present_p31_create_required') &&
    b(p53Summary, 'p52Ready') &&
    b(p53Summary, 'approvalSourceRequiredForActiveArtifacts') &&
    b(p53Summary, 'explicitP31CreateFlagRequiredForActiveArtifacts') &&
    !b(p53Summary, 'plainContinueWouldCreateActiveArtifacts') &&
    !b(p53Summary, 'wouldCreateActiveArtifactsNow') &&
    !b(p53Summary, 'wouldCreateActiveArtifactsByThisScript') &&
    !b(p53Summary, 'activeApprovalReceiptExists') &&
    !b(p53Summary, 'activeHashLockExists') &&
    b(p53Summary, 'simulatedValidP31CreateWouldCreateBothArtifacts') &&
    !b(p53Summary, 'simulatedP44WouldOpenReadyForApply') &&
    !b(p53Summary, 'readyForApply') &&
    !b(p53Summary, 'mayModifyProductionAppFiles') &&
    !b(p53Summary, 'activationApproved') &&
    n(p53Summary, 'fixtureProbes') > 0 &&
    n(p53Summary, 'fixtureProbesPassed') === n(p53Summary, 'fixtureProbes');
  const p54Present = fs.existsSync(p54Path);
  const p54Ready =
    p54Present &&
    s(p54, 'status') === 'PASS' &&
    fileMtimeMs(p54Path) >= fileMtimeMs(p53Path) &&
    fileMtimeMs(p53Path) > 0 &&
    n(p54Summary, 'blockers') === 0 &&
    (s(p54Summary, 'pairSimulationState') === 'active_artifact_pair_simulation_ready_waiting_for_exact_source' ||
      s(p54Summary, 'pairSimulationState') === 'active_artifact_pair_simulation_ready_for_p31_create') &&
    b(p54Summary, 'p53Ready') &&
    b(p54Summary, 'simulatedPairWouldPassP44AfterP31Create') &&
    !b(p54Summary, 'currentP44WouldOpenSequencing') &&
    !b(p54Summary, 'activeApprovalReceiptExists') &&
    !b(p54Summary, 'activeHashLockExists') &&
    !b(p54Summary, 'activeApprovalReceiptCreatedByThisScript') &&
    !b(p54Summary, 'activeHashLockCreatedByThisScript') &&
    !b(p54Summary, 'readyForApply') &&
    !b(p54Summary, 'mayModifyProductionAppFiles') &&
    !b(p54Summary, 'activationApproved') &&
    n(p54Summary, 'fixtureProbes') > 0 &&
    n(p54Summary, 'fixtureProbesPassed') === n(p54Summary, 'fixtureProbes');
  const p55Present = fs.existsSync(p55Path);
  const p55Ready =
    p55Present &&
    s(p55, 'status') === 'PASS' &&
    fileMtimeMs(p55Path) >= fileMtimeMs(p54Path) &&
    fileMtimeMs(p54Path) > 0 &&
    n(p55Summary, 'blockers') === 0 &&
    (s(p55Summary, 'preflightState') === 'p31_create_command_preflight_ready_waiting_for_exact_source' ||
      s(p55Summary, 'preflightState') === 'p31_create_command_preflight_ready_for_explicit_create_command') &&
    b(p55Summary, 'p54Ready') &&
    b(p55Summary, 'commandIncludesExplicitCreateFlag') &&
    b(p55Summary, 'commandUsesDefaultApprovalSource') &&
    b(p55Summary, 'commandTargetsFr') &&
    b(p55Summary, 'commandRunPathMatchesCurrentRun') &&
    b(p55Summary, 'commandWouldWriteOnlyReservedActivePaths') &&
    b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent') &&
    !b(p55Summary, 'p31CreateCommandWouldExecuteByThisScript') &&
    !b(p55Summary, 'activeApprovalReceiptExists') &&
    !b(p55Summary, 'activeHashLockExists') &&
    !b(p55Summary, 'activeApprovalReceiptCreatedByThisScript') &&
    !b(p55Summary, 'activeHashLockCreatedByThisScript') &&
    !b(p55Summary, 'readyForApply') &&
    !b(p55Summary, 'mayModifyProductionAppFiles') &&
    !b(p55Summary, 'activationApproved') &&
    n(p55Summary, 'fixtureProbes') > 0 &&
    n(p55Summary, 'fixtureProbesPassed') === n(p55Summary, 'fixtureProbes');
  const p56Present = fs.existsSync(p56Path);
  const p56P55ReadyEquivalent =
    p55Ready &&
    s(p55Summary, 'preflightState') === 'p31_create_command_preflight_ready_waiting_for_exact_source' &&
    !b(p55Summary, 'readyForApply') &&
    !b(p55Summary, 'mayModifyProductionAppFiles') &&
    !b(p55Summary, 'activationApproved') &&
    s(p56Summary, 'preflightState') === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts';
  const p56Ready =
    p56Present &&
    s(p56, 'status') === 'PASS' &&
    ((fileMtimeMs(p56Path) >= fileMtimeMs(p55Path) &&
      fileMtimeMs(p55Path) > 0) ||
      p56P55ReadyEquivalent) &&
    n(p56Summary, 'blockers') === 0 &&
    (s(p56Summary, 'preflightState') === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts' ||
      s(p56Summary, 'preflightState') === 'p44_validation_command_preflight_ready_for_validation_command') &&
    b(p56Summary, 'p55Ready') &&
    b(p56Summary, 'commandTargetsFr') &&
    b(p56Summary, 'commandRunPathMatchesCurrentRun') &&
    b(p56Summary, 'commandUsesDefaultApprovalSource') &&
    b(p56Summary, 'commandWouldOnlyValidateReservedActivePaths') &&
    b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create') &&
    !b(p56Summary, 'p44ValidationCommandWouldExecuteByThisScript') &&
    !b(p56Summary, 'readyForApply') &&
    !b(p56Summary, 'mayModifyProductionAppFiles') &&
    !b(p56Summary, 'activationApproved') &&
    !b(p56Summary, 'runtimeDownloadsEnabled') &&
    !b(p56Summary, 'storageMigrationAllowed') &&
    !b(p56Summary, 'cloudSyncMigrationAllowed') &&
    n(p56Summary, 'fixtureProbes') > 0 &&
    n(p56Summary, 'fixtureProbesPassed') === n(p56Summary, 'fixtureProbes');
  const p57Present = fs.existsSync(p57Path);
  const p57Ready =
    p57Present &&
    s(p57, 'status') === 'PASS' &&
    fileMtimeMs(p57Path) >= fileMtimeMs(p56Path) &&
    fileMtimeMs(p56Path) > 0 &&
    n(p57Summary, 'blockers') === 0 &&
    (s(p57Summary, 'handoffState') === 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation' ||
      s(p57Summary, 'handoffState') === 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation') &&
    b(p57Summary, 'p56Ready') &&
    b(p57Summary, 'simulatedPostP44P45WouldOpenSequence') &&
    !b(p57Summary, 'p45SequenceCommandWouldExecuteByThisScript') &&
    !b(p57Summary, 'readyForApply') &&
    !b(p57Summary, 'mayModifyProductionAppFiles') &&
    !b(p57Summary, 'activationApproved') &&
    !b(p57Summary, 'runtimeDownloadsEnabled') &&
    !b(p57Summary, 'storageMigrationAllowed') &&
    !b(p57Summary, 'cloudSyncMigrationAllowed') &&
    n(p57Summary, 'fixtureProbes') > 0 &&
    n(p57Summary, 'fixtureProbesPassed') === n(p57Summary, 'fixtureProbes');
  const p58Present = fs.existsSync(p58Path);
  const p58Ready =
    p58Present &&
    s(p58, 'status') === 'PASS' &&
    fileMtimeMs(p58Path) >= fileMtimeMs(p57Path) &&
    fileMtimeMs(p57Path) > 0 &&
    n(p58Summary, 'blockers') === 0 &&
    (s(p58Summary, 'preflightState') === 'p45_sequence_command_preflight_ready_waiting_for_p44_validation' ||
      s(p58Summary, 'preflightState') === 'p45_sequence_command_preflight_ready_for_sequence_refresh') &&
    b(p58Summary, 'p57Ready') &&
    b(p58Summary, 'commandTargetsFr') &&
    b(p58Summary, 'commandRunPathMatchesCurrentRun') &&
    b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation') &&
    !b(p58Summary, 'p45SequenceCommandWouldExecuteByThisScript') &&
    !b(p58Summary, 'readyForApply') &&
    !b(p58Summary, 'mayModifyProductionAppFiles') &&
    !b(p58Summary, 'activationApproved') &&
    !b(p58Summary, 'runtimeDownloadsEnabled') &&
    !b(p58Summary, 'storageMigrationAllowed') &&
    !b(p58Summary, 'cloudSyncMigrationAllowed') &&
    n(p58Summary, 'fixtureProbes') > 0 &&
    n(p58Summary, 'fixtureProbesPassed') === n(p58Summary, 'fixtureProbes');
  const p59Present = fs.existsSync(p59Path);
  const p59Ready =
    p59Present &&
    s(p59, 'status') === 'PASS' &&
    fileMtimeMs(p59Path) >= fileMtimeMs(p58Path) &&
    fileMtimeMs(p58Path) > 0 &&
    n(p59Summary, 'blockers') === 0 &&
    s(p59Summary, 'targetLocale') === 'fr' &&
    (s(p59Summary, 'handoffState') === 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence' ||
      s(p59Summary, 'handoffState') === 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract') &&
    b(p59Summary, 'p58Ready') &&
    !b(p59Summary, 'currentP45ToP46HandoffWouldOpenTransaction') &&
    b(p59Summary, 'simulatedPostP45P46WouldOpenTransaction') &&
    !b(p59Summary, 'p46ContractCommandWouldExecuteByThisScript') &&
    !b(p59Summary, 'readyForApply') &&
    !b(p59Summary, 'mayModifyProductionAppFiles') &&
    !b(p59Summary, 'activationApproved') &&
    !b(p59Summary, 'serverUploadAllowed') &&
    !b(p59Summary, 'firebaseUploadAllowed') &&
    !b(p59Summary, 'downloadablePacksPublished') &&
    !b(p59Summary, 'runtimeDownloadsEnabled') &&
    !b(p59Summary, 'storageMigrationAllowed') &&
    !b(p59Summary, 'cloudSyncMigrationAllowed') &&
    n(p59Summary, 'fixtureProbes') > 0 &&
    n(p59Summary, 'fixtureProbesPassed') === n(p59Summary, 'fixtureProbes');
  const p60Present = fs.existsSync(p60Path);
  const p60Ready =
    p60Present &&
    s(p60, 'status') === 'PASS' &&
    fileMtimeMs(p60Path) >= fileMtimeMs(p59Path) &&
    fileMtimeMs(p59Path) > 0 &&
    n(p60Summary, 'blockers') === 0 &&
    s(p60Summary, 'targetLocale') === 'fr' &&
    (s(p60Summary, 'preflightState') === 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence' ||
      s(p60Summary, 'preflightState') === 'p46_apply_transaction_command_preflight_ready_for_contract_command') &&
    b(p60Summary, 'p59Ready') &&
    b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence') &&
    !b(p60Summary, 'p46ApplyTransactionCommandWouldExecuteByThisScript') &&
    !b(p60Summary, 'readyForApply') &&
    !b(p60Summary, 'mayModifyProductionAppFiles') &&
    !b(p60Summary, 'activationApproved') &&
    !b(p60Summary, 'serverUploadAllowed') &&
    !b(p60Summary, 'firebaseUploadAllowed') &&
    !b(p60Summary, 'downloadablePacksPublished') &&
    !b(p60Summary, 'runtimeDownloadsEnabled') &&
    !b(p60Summary, 'storageMigrationAllowed') &&
    !b(p60Summary, 'cloudSyncMigrationAllowed') &&
    n(p60Summary, 'fixtureProbes') > 0 &&
    n(p60Summary, 'fixtureProbesPassed') === n(p60Summary, 'fixtureProbes');
  const p61Present = fs.existsSync(p61Path);
  const p61Ready =
    p61Present &&
    s(p61, 'status') === 'PASS' &&
    fileMtimeMs(p61Path) >= fileMtimeMs(p60Path) &&
    fileMtimeMs(p60Path) > 0 &&
    fileMtimeMs(p61Path) >= fileMtimeMs(p47ContractPath) &&
    fileMtimeMs(p47ContractPath) > 0 &&
    n(p61Summary, 'blockers') === 0 &&
    s(p61Summary, 'targetLocale') === 'fr' &&
    (s(p61Summary, 'handoffState') === 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract' ||
      s(p61Summary, 'handoffState') === 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract') &&
    b(p61Summary, 'p60Ready') &&
    !b(p61Summary, 'currentP46ToP47HandoffWouldOpenRollbackGuard') &&
    b(p61Summary, 'simulatedPostP46P47WouldOpenRollbackGuard') &&
    !b(p61Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript') &&
    !b(p61Summary, 'readyForApply') &&
    !b(p61Summary, 'mayModifyProductionAppFiles') &&
    !b(p61Summary, 'activationApproved') &&
    !b(p61Summary, 'serverUploadAllowed') &&
    !b(p61Summary, 'firebaseUploadAllowed') &&
    !b(p61Summary, 'downloadablePacksPublished') &&
    !b(p61Summary, 'runtimeDownloadsEnabled') &&
    !b(p61Summary, 'storageMigrationAllowed') &&
    !b(p61Summary, 'cloudSyncMigrationAllowed') &&
    n(p61Summary, 'fixtureProbes') > 0 &&
    n(p61Summary, 'fixtureProbesPassed') === n(p61Summary, 'fixtureProbes');
  const p62Present = fs.existsSync(p62Path);
  const p62Ready =
    p62Present &&
    s(p62, 'status') === 'PASS' &&
    fileMtimeMs(p62Path) >= fileMtimeMs(p61Path) &&
    fileMtimeMs(p61Path) > 0 &&
    fileMtimeMs(p62Path) >= fileMtimeMs(p47ContractPath) &&
    fileMtimeMs(p47ContractPath) > 0 &&
    n(p62Summary, 'blockers') === 0 &&
    s(p62Summary, 'targetLocale') === 'fr' &&
    (s(p62Summary, 'preflightState') === 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract' ||
      s(p62Summary, 'preflightState') === 'p47_rollback_guard_command_preflight_ready_for_guard_command') &&
    b(p62Summary, 'p61Ready') &&
    b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract') &&
    !b(p62Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript') &&
    !b(p62Summary, 'readyForApply') &&
    !b(p62Summary, 'mayModifyProductionAppFiles') &&
    !b(p62Summary, 'activationApproved') &&
    !b(p62Summary, 'serverUploadAllowed') &&
    !b(p62Summary, 'firebaseUploadAllowed') &&
    !b(p62Summary, 'downloadablePacksPublished') &&
    !b(p62Summary, 'runtimeDownloadsEnabled') &&
    !b(p62Summary, 'storageMigrationAllowed') &&
    !b(p62Summary, 'cloudSyncMigrationAllowed') &&
    n(p62Summary, 'fixtureProbes') > 0 &&
    n(p62Summary, 'fixtureProbesPassed') === n(p62Summary, 'fixtureProbes');
  const p63Present = fs.existsSync(p63Path);
  const p63Ready =
    p63Present &&
    s(p63, 'status') === 'PASS' &&
    fileMtimeMs(p63Path) >= fileMtimeMs(p62Path) &&
    fileMtimeMs(p62Path) > 0 &&
    fileMtimeMs(p63Path) >= fileMtimeMs(p48Path) &&
    fileMtimeMs(p48Path) > 0 &&
    n(p63Summary, 'blockers') === 0 &&
    s(p63Summary, 'targetLocale') === 'fr' &&
    s(p63Summary, 'handoffState') === 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh' &&
    b(p63Summary, 'p62Ready') &&
    b(p63Summary, 'currentP47ToP48HandoffWouldOpenSafeContinuation') &&
    b(p63Summary, 'simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation') &&
    !b(p63Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript') &&
    !b(p63Summary, 'readyForApply') &&
    !b(p63Summary, 'mayModifyProductionAppFiles') &&
    !b(p63Summary, 'activationApproved') &&
    !b(p63Summary, 'serverUploadAllowed') &&
    !b(p63Summary, 'firebaseUploadAllowed') &&
    !b(p63Summary, 'downloadablePacksPublished') &&
    !b(p63Summary, 'runtimeDownloadsEnabled') &&
    !b(p63Summary, 'storageMigrationAllowed') &&
    !b(p63Summary, 'cloudSyncMigrationAllowed') &&
    n(p63Summary, 'fixtureProbes') > 0 &&
    n(p63Summary, 'fixtureProbesPassed') === n(p63Summary, 'fixtureProbes');
  const nextGoalIdCanFollowP63 = p63Ready && nextGoalId === p64GoalId;
  const p64Present = fs.existsSync(p64Path);
  const p64Ready =
    p64Present &&
    s(p64, 'status') === 'PASS' &&
    fileMtimeMs(p64Path) >= fileMtimeMs(p63Path) &&
    fileMtimeMs(p63Path) > 0 &&
    fileMtimeMs(p64Path) >= fileMtimeMs(p48Path) &&
    fileMtimeMs(p48Path) > 0 &&
    n(p64Summary, 'blockers') === 0 &&
    s(p64Summary, 'targetLocale') === 'fr' &&
    s(p64Summary, 'preflightState') === 'p48_safe_continuation_command_preflight_ready_for_refresh_command' &&
    b(p64Summary, 'p63Ready') &&
    s(p64Summary, 'p48Status') === 'PASS' &&
    s(p64Summary, 'p48ContinuationState') === 'approval_wait_safe_continuation_ready' &&
    b(p64Summary, 'p48SafeContinuationCommandAllowedNow') &&
    !b(p64Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript') &&
    !b(p64Summary, 'readyForApply') &&
    !b(p64Summary, 'mayModifyProductionAppFiles') &&
    !b(p64Summary, 'activationApproved') &&
    !b(p64Summary, 'serverUploadAllowed') &&
    !b(p64Summary, 'firebaseUploadAllowed') &&
    !b(p64Summary, 'downloadablePacksPublished') &&
    !b(p64Summary, 'runtimeDownloadsEnabled') &&
    !b(p64Summary, 'storageMigrationAllowed') &&
    !b(p64Summary, 'cloudSyncMigrationAllowed') &&
    n(p64Summary, 'fixtureProbes') > 0 &&
    n(p64Summary, 'fixtureProbesPassed') === n(p64Summary, 'fixtureProbes');
  const p65Present = fs.existsSync(p65Path);
  const p65State = s(p65Summary, 'waitState');
  const p65SourceContainsExactSentence = b(p65Summary, 'exactApprovalSourceContainsExactSentence');
  const p65ApprovalSourceIsCanonical = b(p65Summary, 'approvalSourceIsCanonical');
  const p65StateAccepted =
    p65State === 'exact_approval_wait_state_ready' ||
    p65State === 'exact_approval_source_present_ready_for_p31_create';
  const p65Ready =
    p65Present &&
    s(p65, 'status') === 'PASS' &&
    fileMtimeMs(p65Path) >= fileMtimeMs(p64Path) &&
    fileMtimeMs(p64Path) > 0 &&
    n(p65Summary, 'blockers') === 0 &&
    s(p65Summary, 'targetLocale') === 'fr' &&
    p65StateAccepted &&
    b(p65Summary, 'closedEvidenceReady') &&
    p65ApprovalSourceIsCanonical &&
    (b(p65Summary, 'exactApprovalStillRequired') || b(p65Summary, 'exactApprovalSourceContainsExactSentence')) &&
    !b(p65Summary, 'activeApprovalReceiptExists') &&
    !b(p65Summary, 'activeHashLockExists') &&
    !b(p65Summary, 'readyForApply') &&
    !b(p65Summary, 'mayModifyProductionAppFiles') &&
    !b(p65Summary, 'activationApproved') &&
    !b(p65Summary, 'serverUploadAllowed') &&
    !b(p65Summary, 'firebaseUploadAllowed') &&
    !b(p65Summary, 'downloadablePacksPublished') &&
    !b(p65Summary, 'runtimeDownloadsEnabled') &&
    !b(p65Summary, 'storageMigrationAllowed') &&
    !b(p65Summary, 'cloudSyncMigrationAllowed') &&
    n(p65Summary, 'fixtureProbes') > 0 &&
    n(p65Summary, 'fixtureProbesPassed') === n(p65Summary, 'fixtureProbes');
  const p51Accepted = p51Ready || remoteVerifyHoldAccepted(p51Present, p51, p51Summary);
  const p52Accepted = p52Ready || remoteVerifyHoldAccepted(p52Present, p52, p52Summary);
  const p53Accepted = p53Ready || remoteVerifyHoldAccepted(p53Present, p53, p53Summary);
  const p54Accepted = p54Ready || remoteVerifyHoldAccepted(p54Present, p54, p54Summary);
  const p55Accepted = p55Ready || remoteVerifyHoldAccepted(p55Present, p55, p55Summary);
  const p56Accepted = p56Ready || remoteVerifyHoldAccepted(p56Present, p56, p56Summary);
  const p57Accepted = p57Ready || remoteVerifyHoldAccepted(p57Present, p57, p57Summary);
  const p58Accepted = p58Ready || remoteVerifyHoldAccepted(p58Present, p58, p58Summary);
  const p59Accepted = p59Ready || remoteVerifyHoldAccepted(p59Present, p59, p59Summary);
  const p60Accepted = p60Ready || remoteVerifyHoldAccepted(p60Present, p60, p60Summary);
  const p61Accepted = p61Ready || remoteVerifyHoldAccepted(p61Present, p61, p61Summary);
  const p62Accepted = p62Ready || remoteVerifyHoldAccepted(p62Present, p62, p62Summary);
  const p63Accepted = p63Ready || remoteVerifyHoldAccepted(p63Present, p63, p63Summary);
  const p64Accepted = p64Ready || remoteVerifyHoldAccepted(p64Present, p64, p64Summary);
  const p65Accepted = p65Ready || remoteVerifyHoldAccepted(p65Present, p65, p65Summary);
  const p69Present = fs.existsSync(p69Path);
  const p69TerminalWaitFieldsReady =
    p69Present &&
    s(p69Summary, 'targetLocale') === 'fr' &&
    s(p69Summary, 'terminalState') === 'exact_approval_source_absent_terminal_wait' &&
    b(p69Summary, 'p68Ready') &&
    s(p69Summary, 'nextPassGoalId') === p69GoalId &&
    s(p69Summary, 'consistencyGoalId') === p69GoalId &&
    !b(p69Summary, 'approvalSourceExists') &&
    !b(p69Summary, 'approvalSourceContainsExactSentence') &&
    !b(p69Summary, 'activeApprovalReceiptExists') &&
    !b(p69Summary, 'activeHashLockExists') &&
    !b(p69Summary, 'readyForApply') &&
    !b(p69Summary, 'mayModifyProductionAppFiles') &&
    !b(p69Summary, 'activationApproved') &&
    !b(p69Summary, 'serverUploadAllowed') &&
    !b(p69Summary, 'firebaseUploadAllowed') &&
    !b(p69Summary, 'runtimeDownloadsEnabled') &&
    !b(p69Summary, 'storageMigrationAllowed') &&
    !b(p69Summary, 'cloudSyncMigrationAllowed') &&
    !b(p69Summary, 'canStartProductionApply');
  const p69BootstrapConsistencyCycleOnly =
    p69TerminalWaitFieldsReady &&
    s(p69, 'status') === 'BLOCK' &&
    n(p69Summary, 'blockers') === 2 &&
    arr(p69, 'findings')
      .filter((finding) => s(finding, 'severity') === 'blocker')
      .every((finding) => {
        const code = s(finding, 'code');
        return code === 'consistency_not_terminal_wait' || code === 'probe_failed_consistency-accepts-terminal-wait';
      });
  const p69Ready =
    p69TerminalWaitFieldsReady &&
    ((s(p69, 'status') === 'PASS' &&
    n(p69Summary, 'fixtureProbes') > 0 &&
    n(p69Summary, 'fixtureProbesPassed') === n(p69Summary, 'fixtureProbes') &&
    n(p69Summary, 'blockers') === 0) ||
    p69BootstrapConsistencyCycleOnly);
  const nextGoalIdCanContinueAfterP65 =
    p65Ready &&
    !p65SourceContainsExactSentence &&
    b(nextSummary, 'orderedApprovalWaitRefreshV2Ready') &&
    (nextGoalId === p66GoalId ||
      (b(nextSummary, 'safePreapprovalContinuationV2Ready') && nextGoalId === p67GoalId) ||
      (b(nextSummary, 'safePreapprovalContinuationV2Ready') &&
        b(nextSummary, 'finalProductionReadinessGapV2Ready') &&
        nextGoalId === p68GoalId) ||
      (b(nextSummary, 'safePreapprovalContinuationV2Ready') &&
        b(nextSummary, 'finalProductionReadinessGapV2Ready') &&
        b(nextSummary, 'exactApprovalSourceHandoffFirewallV2Ready') &&
        nextGoalId === p69GoalId));
  const nextGoalIdCanFollowP65 =
    p65Ready &&
    ((p65SourceContainsExactSentence && nextGoalId === p31GoalId) || nextGoalIdCanContinueAfterP65);
  const nextGoalIdCanFollowP64 = p64Ready && (nextGoalId === p65GoalId || nextGoalIdCanFollowP65);
  const p65NextGoalMatchesState =
    p65SourceContainsExactSentence ? nextGoalId === p31GoalId : nextGoalId === p65GoalId || nextGoalIdCanContinueAfterP65;
  const nextRepresentsP37 =
    (remoteVerifyPriorityMode && p37Ready && s(next, 'status') !== 'BLOCK' && n(nextSummary, 'blockers') === 0) ||
    (s(next, 'status') !== 'BLOCK' &&
    n(nextSummary, 'blockers') === 0 &&
    b(nextSummary, 'nextPassPrepared') &&
    b(nextSummary, 'readinessApplyBlockerMapRefreshV2Ready') &&
    !b(nextSummary, 'readyForApply') &&
    !b(nextSummary, 'mayModifyProductionAppFiles') &&
    (nextGoalId === 'NEXT-PASS-P38-MASTER-NEXT-PASS-CONSISTENCY-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P39-OFFICIAL-SOURCE-CONTENT-COVERAGE-V2' ||
      nextGoalId === 'NEXT-PASS-P40-REVIEWER-DECISION-IMPORT-DRY-RUN-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P41-PAYLOAD-CREATION-APPROVAL-PREFLIGHT-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P42-CLOSED-LOCAL-PAYLOAD-MATERIALIZATION-REFRESH-V2' ||
      nextGoalId === 'NEXT-PASS-P43-PRODUCTION-ACTIVATION-HOLD-EXACT-APPROVAL-REQUIRED-V2' ||
      nextGoalId === 'NEXT-PASS-P44-EXACT-APPROVAL-VALIDATION-GATE-V2' ||
      nextGoalId === 'NEXT-PASS-P45-PRODUCTION-ACTIVATION-SEQUENCE-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P46-PRODUCTION-APPLY-TRANSACTION-CONTRACT-V2' ||
      nextGoalId === 'NEXT-PASS-P47-POST-APPLY-ROLLBACK-GUARD-CONTRACT-V2' ||
      nextGoalId === 'NEXT-PASS-P48-APPROVAL-WAIT-SAFE-CONTINUATION-V2' ||
      nextGoalId === 'NEXT-PASS-P49-PRODUCTION-READINESS-COMPLETION-AUDIT-V2' ||
      nextGoalId === 'NEXT-PASS-P50-FINAL-PREAPPROVAL-EVIDENCE-HASH-LOCK-V2' ||
      nextGoalId === 'NEXT-PASS-P51-EXACT-APPROVAL-APPLY-REHEARSAL-V2' ||
      nextGoalId === 'NEXT-PASS-P52-EXACT-APPROVAL-SOURCE-FIREWALL-V2' ||
      nextGoalId === 'NEXT-PASS-P53-EXACT-APPROVAL-SOURCE-INTAKE-TRANSITION-V2' ||
      nextGoalId === 'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2' ||
      nextGoalId === 'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
      nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
      nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
      nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
      nextGoalIdCanFollowP63 ||
      nextGoalIdCanFollowP64 ||
      nextGoalId === 'NEXT-PASS-P26-SERVER-DELIVERY-PUBLISH-PREFLIGHT-V2' ||
      nextGoalId === 'NEXT-PASS-P29-EXPLICIT-APPROVAL-RECEIPT-HASH-LOCK-GATE-V2'));
  const nextRepresentsP51 =
    remoteVerifyPriorityMode ||
    !p51Present ||
    (p51Ready &&
      b(nextSummary, 'exactApprovalApplyRehearsalV2Present') &&
      b(nextSummary, 'exactApprovalApplyRehearsalV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P51-EXACT-APPROVAL-APPLY-REHEARSAL-V2' ||
        nextGoalId === 'NEXT-PASS-P52-EXACT-APPROVAL-SOURCE-FIREWALL-V2' ||
        nextGoalId === 'NEXT-PASS-P53-EXACT-APPROVAL-SOURCE-INTAKE-TRANSITION-V2' ||
        nextGoalId === 'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP52 =
    remoteVerifyPriorityMode ||
    !p52Present ||
    (p52Ready &&
      b(nextSummary, 'exactApprovalSourceFirewallV2Present') &&
      b(nextSummary, 'exactApprovalSourceFirewallV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P52-EXACT-APPROVAL-SOURCE-FIREWALL-V2' ||
        nextGoalId === 'NEXT-PASS-P53-EXACT-APPROVAL-SOURCE-INTAKE-TRANSITION-V2' ||
        nextGoalId === 'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP53 =
    remoteVerifyPriorityMode ||
    !p53Present ||
    (p53Ready &&
      b(nextSummary, 'exactApprovalSourceIntakeTransitionV2Present') &&
      b(nextSummary, 'exactApprovalSourceIntakeTransitionV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P53-EXACT-APPROVAL-SOURCE-INTAKE-TRANSITION-V2' ||
        nextGoalId === 'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP54 =
    remoteVerifyPriorityMode ||
    !p54Present ||
    (p54Ready &&
      b(nextSummary, 'exactApprovalActiveArtifactPairSimulationV2Present') &&
      b(nextSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP55 =
    remoteVerifyPriorityMode ||
    !p55Present ||
    (p55Ready &&
      b(nextSummary, 'exactApprovalP31CreateCommandPreflightV2Present') &&
      b(nextSummary, 'exactApprovalP31CreateCommandPreflightV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP56 =
    remoteVerifyPriorityMode ||
    !p56Present ||
    (p56Ready &&
      b(nextSummary, 'exactApprovalP44ValidationCommandPreflightV2Present') &&
      b(nextSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP57 =
    remoteVerifyPriorityMode ||
    !p57Present ||
    (p57Ready &&
      b(nextSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Present') &&
      b(nextSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP58 =
    remoteVerifyPriorityMode ||
    !p58Present ||
    (p58Ready &&
      b(nextSummary, 'exactApprovalP45SequenceCommandPreflightV2Present') &&
      b(nextSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP59 =
    remoteVerifyPriorityMode ||
    !p59Present ||
    (p59Ready &&
      b(nextSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present') &&
      b(nextSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP60 =
    remoteVerifyPriorityMode ||
    !p60Present ||
    (p60Ready &&
      b(nextSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Present') &&
      b(nextSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2' ||
        nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP61 =
    remoteVerifyPriorityMode ||
    !p61Present ||
    (p61Ready &&
      b(nextSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present') &&
      b(nextSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2' ||
        nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP62 =
    remoteVerifyPriorityMode ||
    !p62Present ||
    (p62Ready &&
      b(nextSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Present') &&
      b(nextSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready') &&
      (nextGoalId === 'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2' ||
        nextGoalIdCanFollowP63 ||
        nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP63 =
    remoteVerifyPriorityMode ||
    !p63Present ||
    (p63Ready &&
      b(nextSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present') &&
      b(nextSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready') &&
      (nextGoalId === p64GoalId || nextGoalIdCanFollowP64) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP64 =
    remoteVerifyPriorityMode ||
    !p64Present ||
    (p64Ready &&
      b(nextSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Present') &&
      b(nextSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready') &&
      (nextGoalId === p65GoalId || nextGoalIdCanFollowP65) &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const nextRepresentsP65 =
    remoteVerifyPriorityMode ||
    !p65Present ||
    (p65Ready &&
      b(nextSummary, 'exactApprovalWaitStateV2Present') &&
      b(nextSummary, 'exactApprovalWaitStateV2Ready') &&
      b(nextSummary, 'exactApprovalWaitStateV2ApprovalSourceIsCanonical') &&
      p65NextGoalMatchesState &&
      !b(nextSummary, 'readyForApply') &&
      !b(nextSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP37 =
    (remoteVerifyPriorityMode && p37Ready && s(master, 'status') === 'HOLD' && productionClosed(masterSummary)) ||
    (s(master, 'status') === 'HOLD' &&
    masterActionableBlockers === 0 &&
    b(masterSummary, 'readinessApplyBlockerMapRefreshV2Present') &&
    s(masterSummary, 'readinessApplyBlockerMapRefreshV2State') === 'readiness_apply_blocker_map_refreshed' &&
    !b(masterSummary, 'readinessApplyBlockerMapRefreshV2ReadyForApply') &&
    !b(masterSummary, 'readyForApply') &&
    !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP51 =
    remoteVerifyPriorityMode ||
    !p51Present ||
    (p51Ready &&
      b(masterSummary, 'exactApprovalApplyRehearsalV2Present') &&
      b(masterSummary, 'exactApprovalApplyRehearsalV2Ready') &&
      s(masterSummary, 'exactApprovalApplyRehearsalV2State') === 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' &&
      !b(masterSummary, 'exactApprovalApplyRehearsalV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP52 =
    remoteVerifyPriorityMode ||
    !p52Present ||
    (p52Ready &&
      b(masterSummary, 'exactApprovalSourceFirewallV2Present') &&
      b(masterSummary, 'exactApprovalSourceFirewallV2Ready') &&
      (s(masterSummary, 'exactApprovalSourceFirewallV2State') === 'exact_approval_source_firewall_ready_waiting_for_approval_source' ||
        s(masterSummary, 'exactApprovalSourceFirewallV2State') === 'exact_approval_source_present_p31_create_required') &&
      !b(masterSummary, 'exactApprovalSourceFirewallV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP53 =
    remoteVerifyPriorityMode ||
    !p53Present ||
    (p53Ready &&
      b(masterSummary, 'exactApprovalSourceIntakeTransitionV2Present') &&
      b(masterSummary, 'exactApprovalSourceIntakeTransitionV2Ready') &&
      (s(masterSummary, 'exactApprovalSourceIntakeTransitionV2State') === 'exact_approval_intake_transition_ready_waiting_for_approval_source' ||
        s(masterSummary, 'exactApprovalSourceIntakeTransitionV2State') === 'exact_approval_source_present_p31_create_required') &&
      !b(masterSummary, 'exactApprovalSourceIntakeTransitionV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP54 =
    remoteVerifyPriorityMode ||
    !p54Present ||
    (p54Ready &&
      b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2Present') &&
      b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready') &&
      (s(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2State') === 'active_artifact_pair_simulation_ready_waiting_for_exact_source' ||
        s(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2State') === 'active_artifact_pair_simulation_ready_for_p31_create') &&
      !b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP55 =
    remoteVerifyPriorityMode ||
    !p55Present ||
    (p55Ready &&
      b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2Present') &&
      b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2Ready') &&
      (s(masterSummary, 'exactApprovalP31CreateCommandPreflightV2State') === 'p31_create_command_preflight_ready_waiting_for_exact_source' ||
        s(masterSummary, 'exactApprovalP31CreateCommandPreflightV2State') === 'p31_create_command_preflight_ready_for_explicit_create_command') &&
      !b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP56 =
    remoteVerifyPriorityMode ||
    !p56Present ||
    (p56Ready &&
      b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2Present') &&
      b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready') &&
      (s(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2State') === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts' ||
        s(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2State') === 'p44_validation_command_preflight_ready_for_validation_command') &&
      !b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP57 =
    remoteVerifyPriorityMode ||
    !p57Present ||
    (p57Ready &&
      b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Present') &&
      b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready') &&
      (s(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2State') === 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation' ||
        s(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2State') === 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation') &&
      !b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP58 =
    remoteVerifyPriorityMode ||
    !p58Present ||
    (p58Ready &&
      b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2Present') &&
      b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready') &&
      (s(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2State') === 'p45_sequence_command_preflight_ready_waiting_for_p44_validation' ||
        s(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2State') === 'p45_sequence_command_preflight_ready_for_sequence_refresh') &&
      !b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP59 =
    remoteVerifyPriorityMode ||
    !p59Present ||
    (p59Ready &&
      b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present') &&
      b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready') &&
      (s(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State') === 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence' ||
        s(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State') === 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract') &&
      !b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP60 =
    remoteVerifyPriorityMode ||
    !p60Present ||
    (p60Ready &&
      b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Present') &&
      b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready') &&
      (s(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2State') === 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence' ||
        s(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2State') === 'p46_apply_transaction_command_preflight_ready_for_contract_command') &&
      !b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP61 =
    remoteVerifyPriorityMode ||
    !p61Present ||
    (p61Ready &&
      b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present') &&
      b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready') &&
      (s(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State') === 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract' ||
        s(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State') === 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract') &&
      !b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP62 =
    remoteVerifyPriorityMode ||
    !p62Present ||
    (p62Ready &&
      b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Present') &&
      b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready') &&
      (s(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2State') === 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract' ||
        s(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2State') === 'p47_rollback_guard_command_preflight_ready_for_guard_command') &&
      !b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP63 =
    remoteVerifyPriorityMode ||
    !p63Present ||
    (p63Ready &&
      b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present') &&
      b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready') &&
      s(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State') === 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh' &&
      !b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP64 =
    remoteVerifyPriorityMode ||
    !p64Present ||
    (p64Ready &&
      b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Present') &&
      b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready') &&
      s(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2State') === 'p48_safe_continuation_command_preflight_ready_for_refresh_command' &&
      !b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const masterRepresentsP65 =
    remoteVerifyPriorityMode ||
    !p65Present ||
    (p65Ready &&
      b(masterSummary, 'exactApprovalWaitStateV2Present') &&
      b(masterSummary, 'exactApprovalWaitStateV2Ready') &&
      b(masterSummary, 'exactApprovalWaitStateV2ApprovalSourceIsCanonical') &&
      (s(masterSummary, 'exactApprovalWaitStateV2State') === 'exact_approval_wait_state_ready' ||
        s(masterSummary, 'exactApprovalWaitStateV2State') === 'exact_approval_source_present_ready_for_p31_create') &&
      !b(masterSummary, 'exactApprovalWaitStateV2ReadyForApply') &&
      !b(masterSummary, 'readyForApply') &&
      !b(masterSummary, 'mayModifyProductionAppFiles'));
  const exactApprovalDeferred =
    !remoteVerifyPriorityMode &&
    nextGoalId === 'NEXT-PASS-P29-EXPLICIT-APPROVAL-RECEIPT-HASH-LOCK-GATE-V2' &&
    !b(nextSummary, 'readyForApply') &&
    !b(nextSummary, 'mayModifyProductionAppFiles') &&
    !b(masterSummary, 'readyForApply') &&
    !b(masterSummary, 'mayModifyProductionAppFiles') &&
    !b(p51Summary, 'activeApprovalReceiptExists') &&
    !b(p51Summary, 'activeHashLockExists') &&
    !b(p52Summary, 'approvalSourceExists') &&
    !b(p52Summary, 'plainContinueWouldCreateActiveArtifacts') &&
    !b(p53Summary, 'approvalSourceExists') &&
    !b(p53Summary, 'plainContinueWouldCreateActiveArtifacts') &&
    !b(p53Summary, 'wouldCreateActiveArtifactsByThisScript');

  if (!p37Ready) addFinding(findings, 'blocker', 'P37_NOT_READY', 'P37 readiness/apply blocker map is not ready.', rel(repoRoot, p37Path));
  if (!exactApprovalDeferred && p51Present && !p51Accepted) addFinding(findings, 'blocker', 'P51_NOT_READY', 'P51 exact approval apply rehearsal is present but not ready.', rel(repoRoot, p51Path));
  if (!exactApprovalDeferred && p52Present && !p52Accepted) addFinding(findings, 'blocker', 'P52_NOT_READY', 'P52 exact approval source firewall is present but not ready.', rel(repoRoot, p52Path));
  if (!exactApprovalDeferred && p53Present && !p53Accepted) addFinding(findings, 'blocker', 'P53_NOT_READY', 'P53 exact approval source intake transition is present but not ready.', rel(repoRoot, p53Path));
  if (!exactApprovalDeferred && p54Present && !p54Accepted) addFinding(findings, 'blocker', 'P54_NOT_READY', 'P54 exact approval active artifact pair simulation is present but not ready.', rel(repoRoot, p54Path));
  if (!exactApprovalDeferred && p55Present && !p55Accepted) addFinding(findings, 'blocker', 'P55_NOT_READY', 'P55 exact approval P31 create command preflight is present but not ready.', rel(repoRoot, p55Path));
  if (!exactApprovalDeferred && p56Present && !p56Accepted) addFinding(findings, 'blocker', 'P56_NOT_READY', 'P56 exact approval P44 validation command preflight is present but not ready.', rel(repoRoot, p56Path));
  if (!exactApprovalDeferred && p57Present && !p57Accepted) addFinding(findings, 'blocker', 'P57_NOT_READY', 'P57 exact approval P44 to P45 sequence handoff simulation is present but not ready.', rel(repoRoot, p57Path));
  if (!exactApprovalDeferred && p58Present && !p58Accepted) addFinding(findings, 'blocker', 'P58_NOT_READY', 'P58 exact approval P45 sequence command preflight is present but not ready.', rel(repoRoot, p58Path));
  if (!exactApprovalDeferred && p59Present && !p59Accepted) addFinding(findings, 'blocker', 'P59_NOT_READY', 'P59 exact approval P45 to P46 apply transaction handoff simulation is present but not ready.', rel(repoRoot, p59Path));
  if (!exactApprovalDeferred && p60Present && !p60Accepted) addFinding(findings, 'blocker', 'P60_NOT_READY', 'P60 exact approval P46 apply transaction command preflight is present but not ready.', rel(repoRoot, p60Path));
  if (!exactApprovalDeferred && p61Present && !p61Accepted) addFinding(findings, 'blocker', 'P61_NOT_READY', 'P61 exact approval P46 to P47 rollback guard handoff simulation is present but not ready.', rel(repoRoot, p61Path));
  if (!exactApprovalDeferred && p62Present && !p62Accepted) addFinding(findings, 'blocker', 'P62_NOT_READY', 'P62 exact approval P47 rollback guard command preflight is present but not ready.', rel(repoRoot, p62Path));
  if (!exactApprovalDeferred && p63Present && !p63Accepted) addFinding(findings, 'blocker', 'P63_NOT_READY', 'P63 exact approval P47 to P48 safe continuation handoff simulation is present but not ready.', rel(repoRoot, p63Path));
  if (!exactApprovalDeferred && p64Present && !p64Accepted) addFinding(findings, 'blocker', 'P64_NOT_READY', 'P64 exact approval P48 safe continuation command preflight is present but not ready.', rel(repoRoot, p64Path));
  if (!exactApprovalDeferred && p65Present && !p65Accepted) addFinding(findings, 'blocker', 'P65_NOT_READY', 'P65 exact approval wait-state is present but not ready, including canonical approval source proof.', rel(repoRoot, p65Path));
  if (!exactApprovalDeferred && p69Present && !p69Ready) addFinding(findings, 'blocker', 'P69_NOT_READY', 'P69 exact approval source terminal wait-state is present but not ready.', rel(repoRoot, p69Path));
  if (!nextRepresentsP37) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P37', 'Next-pass contract does not consistently represent closed P37 evidence.', rel(repoRoot, nextPath));
  if (!masterRepresentsP37) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P37', 'Master manifest does not consistently represent closed P37 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p51Present && !nextRepresentsP51) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P51', 'Next-pass contract does not consistently represent ready P51 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p51Present && !masterRepresentsP51) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P51', 'Master manifest does not consistently represent ready P51 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p52Present && !nextRepresentsP52) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P52', 'Next-pass contract does not consistently represent ready P52 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p52Present && !masterRepresentsP52) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P52', 'Master manifest does not consistently represent ready P52 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p53Present && !nextRepresentsP53) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P53', 'Next-pass contract does not consistently represent ready P53 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p53Present && !masterRepresentsP53) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P53', 'Master manifest does not consistently represent ready P53 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p54Present && !nextRepresentsP54) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P54', 'Next-pass contract does not consistently represent ready P54 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p54Present && !masterRepresentsP54) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P54', 'Master manifest does not consistently represent ready P54 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p55Present && !nextRepresentsP55) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P55', 'Next-pass contract does not consistently represent ready P55 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p55Present && !masterRepresentsP55) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P55', 'Master manifest does not consistently represent ready P55 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p56Present && !nextRepresentsP56) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P56', 'Next-pass contract does not consistently represent ready P56 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p56Present && !masterRepresentsP56) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P56', 'Master manifest does not consistently represent ready P56 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p57Present && !nextRepresentsP57) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P57', 'Next-pass contract does not consistently represent ready P57 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p57Present && !masterRepresentsP57) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P57', 'Master manifest does not consistently represent ready P57 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p58Present && !nextRepresentsP58) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P58', 'Next-pass contract does not consistently represent ready P58 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p58Present && !masterRepresentsP58) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P58', 'Master manifest does not consistently represent ready P58 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p59Present && !nextRepresentsP59) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P59', 'Next-pass contract does not consistently represent ready P59 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p59Present && !masterRepresentsP59) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P59', 'Master manifest does not consistently represent ready P59 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p60Present && !nextRepresentsP60) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P60', 'Next-pass contract does not consistently represent ready P60 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p60Present && !masterRepresentsP60) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P60', 'Master manifest does not consistently represent ready P60 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p61Present && !nextRepresentsP61) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P61', 'Next-pass contract does not consistently represent ready P61 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p61Present && !masterRepresentsP61) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P61', 'Master manifest does not consistently represent ready P61 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p62Present && !nextRepresentsP62) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P62', 'Next-pass contract does not consistently represent ready P62 evidence.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p62Present && !masterRepresentsP62) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P62', 'Master manifest does not consistently represent ready P62 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p63Present && !nextRepresentsP63) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P63', 'Next-pass contract does not consistently represent ready P63 evidence or the P64 safe continuation command preflight.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p63Present && !masterRepresentsP63) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P63', 'Master manifest does not consistently represent ready P63 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p64Present && !nextRepresentsP64) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P64', 'Next-pass contract does not consistently represent ready P64 evidence or the P65 exact-approval wait-state.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p64Present && !masterRepresentsP64) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P64', 'Master manifest does not consistently represent ready P64 evidence.', rel(repoRoot, masterPath));
  if (!exactApprovalDeferred && p65Present && !nextRepresentsP65) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_CONSISTENT_WITH_P65', 'Next-pass contract must keep ready P65 in wait-state when no exact source exists, or route to P31 when the exact source is present.', rel(repoRoot, nextPath));
  if (!exactApprovalDeferred && p65Present && !masterRepresentsP65) addFinding(findings, 'blocker', 'MASTER_NOT_CONSISTENT_WITH_P65', 'Master manifest does not consistently represent ready P65 wait-state evidence.', rel(repoRoot, masterPath));

  const probes = [
    probe('p37-ready', p37Ready, 'P37 PASS, closed flags, safe remaining=1 or all safe items closed', `${s(p37, 'status')}/${s(p37Summary, 'blockerMapState')}/${n(p37Summary, 'safeNonProductionItemsClosed')}/${n(p37Summary, 'safeNonProductionItemsRemaining')}`),
    probe('p51-ready-when-present', !p51Present || p51Accepted, 'P51 PASS or accepted remote-verify HOLD when present', `${p51Present}/${s(p51, 'status')}/${s(p51Summary, 'rehearsalState')}/${n(p51Summary, 'readinessApplyBlockers')}`),
    probe('p52-ready-when-present', !p52Present || p52Accepted, 'P52 PASS or accepted remote-verify HOLD when present', `${p52Present}/${s(p52, 'status')}/${s(p52Summary, 'firewallState')}/${b(p52Summary, 'plainContinueWouldCreateActiveArtifacts')}`),
    probe('p53-ready-when-present', !p53Present || p53Accepted, 'P53 PASS or accepted remote-verify HOLD when present', `${p53Present}/${s(p53, 'status')}/${s(p53Summary, 'intakeTransitionState')}/${b(p53Summary, 'wouldCreateActiveArtifactsByThisScript')}`),
    probe('p54-ready-when-present', !p54Present || p54Accepted, 'P54 PASS or accepted remote-verify HOLD when present', `${p54Present}/${s(p54, 'status')}/${s(p54Summary, 'pairSimulationState')}/${b(p54Summary, 'currentP44WouldOpenSequencing')}`),
    probe('p55-ready-when-present', !p55Present || p55Accepted, 'P55 PASS or accepted remote-verify HOLD when present', `${p55Present}/${s(p55, 'status')}/${s(p55Summary, 'preflightState')}/${b(p55Summary, 'p31CreateCommandWouldExecuteByThisScript')}`),
    probe('p56-ready-when-present', !p56Present || p56Accepted, 'P56 PASS or accepted remote-verify HOLD when present', `${p56Present}/${s(p56, 'status')}/${s(p56Summary, 'preflightState')}/${b(p56Summary, 'p44ValidationCommandWouldExecuteByThisScript')}`),
    probe('p57-ready-when-present', !p57Present || p57Accepted, 'P57 PASS or accepted remote-verify HOLD when present', `${p57Present}/${s(p57, 'status')}/${s(p57Summary, 'handoffState')}/${b(p57Summary, 'p45SequenceCommandWouldExecuteByThisScript')}`),
    probe('p58-ready-when-present', !p58Present || p58Accepted, 'P58 PASS or accepted remote-verify HOLD when present', `${p58Present}/${s(p58, 'status')}/${s(p58Summary, 'preflightState')}/${b(p58Summary, 'p45SequenceCommandWouldExecuteByThisScript')}`),
    probe('p59-ready-when-present', !p59Present || p59Accepted, 'P59 PASS or accepted remote-verify HOLD when present', `${p59Present}/${s(p59, 'status')}/${s(p59Summary, 'handoffState')}/${b(p59Summary, 'p46ContractCommandWouldExecuteByThisScript')}`),
    probe('p60-ready-when-present', !p60Present || p60Accepted, 'P60 PASS or accepted remote-verify HOLD when present', `${p60Present}/${s(p60, 'status')}/${s(p60Summary, 'preflightState')}/${b(p60Summary, 'p46ApplyTransactionCommandWouldExecuteByThisScript')}`),
    probe('p61-ready-when-present', !p61Present || p61Accepted, 'P61 PASS or accepted remote-verify HOLD when present', `${p61Present}/${s(p61, 'status')}/${s(p61Summary, 'handoffState')}/${b(p61Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript')}`),
    probe('p62-ready-when-present', !p62Present || p62Accepted, 'P62 PASS or accepted remote-verify HOLD when present', `${p62Present}/${s(p62, 'status')}/${s(p62Summary, 'preflightState')}/${b(p62Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript')}`),
    probe('p63-ready-when-present', !p63Present || p63Accepted, 'P63 PASS or accepted remote-verify HOLD when present', `${p63Present}/${s(p63, 'status')}/${s(p63Summary, 'handoffState')}/${b(p63Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript')}`),
    probe('p64-ready-when-present', !p64Present || p64Accepted, 'P64 PASS or accepted remote-verify HOLD when present', `${p64Present}/${s(p64, 'status')}/${s(p64Summary, 'preflightState')}/${b(p64Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript')}`),
    probe('p65-ready-when-present', !p65Present || p65Accepted, 'P65 PASS or accepted remote-verify HOLD when present', `${p65Present}/${s(p65, 'status')}/${s(p65Summary, 'waitState')}/${p65ApprovalSourceIsCanonical}/${b(p65Summary, 'activeApprovalReceiptExists')}/${b(p65Summary, 'activeHashLockExists')}`),
    probe('p69-ready-when-present', !p69Present || p69Ready, 'P69 PASS and terminal source wait-state closed when present', `${p69Present}/${s(p69, 'status')}/${s(p69Summary, 'terminalState')}/${s(p69Summary, 'nextPassGoalId')}/${s(p69Summary, 'consistencyGoalId')}/${b(p69Summary, 'activeApprovalReceiptExists')}/${b(p69Summary, 'activeHashLockExists')}`),
    probe('next-pass-represents-p37', nextRepresentsP37, 'next non-BLOCK, blockers=0 and P37 ready in summary', `${s(next, 'status')}/${n(nextSummary, 'blockers')}/${b(nextSummary, 'readinessApplyBlockerMapRefreshV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p51', nextRepresentsP51, 'next carries ready P51 when P51 exists', `${p51Present}/${b(nextSummary, 'exactApprovalApplyRehearsalV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p52', nextRepresentsP52, 'next carries ready P52 when P52 exists', `${p52Present}/${b(nextSummary, 'exactApprovalSourceFirewallV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p53', nextRepresentsP53, 'next carries ready P53 when P53 exists', `${p53Present}/${b(nextSummary, 'exactApprovalSourceIntakeTransitionV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p54', nextRepresentsP54, 'next carries ready P54 when P54 exists', `${p54Present}/${b(nextSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p55', nextRepresentsP55, 'next carries ready P55 when P55 exists', `${p55Present}/${b(nextSummary, 'exactApprovalP31CreateCommandPreflightV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p56', nextRepresentsP56, 'next carries ready P56 when P56 exists', `${p56Present}/${b(nextSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p57', nextRepresentsP57, 'next carries ready P57 when P57 exists', `${p57Present}/${b(nextSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p58', nextRepresentsP58, 'next carries ready P58 when P58 exists', `${p58Present}/${b(nextSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p59', nextRepresentsP59, 'next carries ready P59 when P59 exists', `${p59Present}/${b(nextSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p60', nextRepresentsP60, 'next carries ready P60 when P60 exists', `${p60Present}/${b(nextSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p61', nextRepresentsP61, 'next carries ready P61 when P61 exists', `${p61Present}/${b(nextSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p62', nextRepresentsP62, 'next carries ready P62 when P62 exists', `${p62Present}/${b(nextSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p63', nextRepresentsP63, 'next carries ready P63 and advances only to P64 when P63 exists', `${p63Present}/${b(nextSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p64', nextRepresentsP64, 'next carries ready P64 and advances to P65, P31 after exact source, or P66/P67/P68/P69 after ordered closed-mode wait', `${p64Present}/${b(nextSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready')}/${nextGoalId}`),
    probe('next-pass-represents-p65', nextRepresentsP65, 'next carries ready P65 and matches the wait/source/closed-continuation branch', `${p65Present}/${b(nextSummary, 'exactApprovalWaitStateV2Ready')}/${b(nextSummary, 'exactApprovalWaitStateV2ApprovalSourceIsCanonical')}/${p65SourceContainsExactSentence}/${b(nextSummary, 'orderedApprovalWaitRefreshV2Ready')}/${b(nextSummary, 'safePreapprovalContinuationV2Ready')}/${b(nextSummary, 'finalProductionReadinessGapV2Ready')}/${b(nextSummary, 'exactApprovalSourceHandoffFirewallV2Ready')}/${nextGoalId}`),
    probe('master-represents-p37', masterRepresentsP37, 'master HOLD, actionable blockers=0, P37 state present', `${s(master, 'status')}/${n(masterSummary, 'blockers')}/${masterActionableBlockers}/${s(masterSummary, 'readinessApplyBlockerMapRefreshV2State')}`),
    probe('master-represents-p51', masterRepresentsP51, 'master carries ready P51 when P51 exists', `${p51Present}/${b(masterSummary, 'exactApprovalApplyRehearsalV2Ready')}/${s(masterSummary, 'exactApprovalApplyRehearsalV2State')}`),
    probe('master-represents-p52', masterRepresentsP52, 'master carries ready P52 when P52 exists', `${p52Present}/${b(masterSummary, 'exactApprovalSourceFirewallV2Ready')}/${s(masterSummary, 'exactApprovalSourceFirewallV2State')}`),
    probe('master-represents-p53', masterRepresentsP53, 'master carries ready P53 when P53 exists', `${p53Present}/${b(masterSummary, 'exactApprovalSourceIntakeTransitionV2Ready')}/${s(masterSummary, 'exactApprovalSourceIntakeTransitionV2State')}`),
    probe('master-represents-p54', masterRepresentsP54, 'master carries ready P54 when P54 exists', `${p54Present}/${b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready')}/${s(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2State')}`),
    probe('master-represents-p55', masterRepresentsP55, 'master carries ready P55 when P55 exists', `${p55Present}/${b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2Ready')}/${s(masterSummary, 'exactApprovalP31CreateCommandPreflightV2State')}`),
    probe('master-represents-p56', masterRepresentsP56, 'master carries ready P56 when P56 exists', `${p56Present}/${b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready')}/${s(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2State')}`),
    probe('master-represents-p57', masterRepresentsP57, 'master carries ready P57 when P57 exists', `${p57Present}/${b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready')}/${s(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2State')}`),
    probe('master-represents-p58', masterRepresentsP58, 'master carries ready P58 when P58 exists', `${p58Present}/${b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready')}/${s(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2State')}`),
    probe('master-represents-p59', masterRepresentsP59, 'master carries ready P59 when P59 exists', `${p59Present}/${b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready')}/${s(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State')}`),
    probe('master-represents-p60', masterRepresentsP60, 'master carries ready P60 when P60 exists', `${p60Present}/${b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready')}/${s(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2State')}`),
    probe('master-represents-p61', masterRepresentsP61, 'master carries ready P61 when P61 exists', `${p61Present}/${b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready')}/${s(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State')}`),
    probe('master-represents-p62', masterRepresentsP62, 'master carries ready P62 when P62 exists', `${p62Present}/${b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready')}/${s(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2State')}`),
    probe('master-represents-p63', masterRepresentsP63, 'master carries ready P63 when P63 exists', `${p63Present}/${b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready')}/${s(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State')}`),
    probe('master-represents-p64', masterRepresentsP64, 'master carries ready P64 when P64 exists', `${p64Present}/${b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready')}/${s(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2State')}`),
    probe('master-represents-p65', masterRepresentsP65, 'master carries ready P65 when P65 exists', `${p65Present}/${b(masterSummary, 'exactApprovalWaitStateV2Ready')}/${b(masterSummary, 'exactApprovalWaitStateV2ApprovalSourceIsCanonical')}/${s(masterSummary, 'exactApprovalWaitStateV2State')}`),
    probe('production-flags-closed', !b(p37Summary, 'readyForApply') && !b(p51Summary, 'readyForApply') && !b(p52Summary, 'readyForApply') && !b(p53Summary, 'readyForApply') && !b(p54Summary, 'readyForApply') && !b(p55Summary, 'readyForApply') && !b(p56Summary, 'readyForApply') && !b(p57Summary, 'readyForApply') && !b(p58Summary, 'readyForApply') && !b(p59Summary, 'readyForApply') && !b(p60Summary, 'readyForApply') && !b(p61Summary, 'readyForApply') && !b(p62Summary, 'readyForApply') && !b(p63Summary, 'readyForApply') && !b(p64Summary, 'readyForApply') && !b(p65Summary, 'readyForApply') && !b(p69Summary, 'readyForApply') && !b(nextSummary, 'readyForApply') && !b(masterSummary, 'readyForApply'), 'readyForApply false across P37/P51/P52/P53/P54/P55/P56/P57/P58/P59/P60/P61/P62/P63/P64/P65/P69/next/master', `${b(p37Summary, 'readyForApply')}/${b(p51Summary, 'readyForApply')}/${b(p52Summary, 'readyForApply')}/${b(p53Summary, 'readyForApply')}/${b(p54Summary, 'readyForApply')}/${b(p55Summary, 'readyForApply')}/${b(p56Summary, 'readyForApply')}/${b(p57Summary, 'readyForApply')}/${b(p58Summary, 'readyForApply')}/${b(p59Summary, 'readyForApply')}/${b(p60Summary, 'readyForApply')}/${b(p61Summary, 'readyForApply')}/${b(p62Summary, 'readyForApply')}/${b(p63Summary, 'readyForApply')}/${b(p64Summary, 'readyForApply')}/${b(p65Summary, 'readyForApply')}/${b(p69Summary, 'readyForApply')}/${b(nextSummary, 'readyForApply')}/${b(masterSummary, 'readyForApply')}`),
    probe('runtime-downloads-closed', !b(p37Summary, 'runtimeDownloadsEnabled'), 'runtime downloads disabled', String(b(p37Summary, 'runtimeDownloadsEnabled'))),
  ];

  const deferredProbeNames = /^((p5[1-9]|p6[0-5]|p69)-ready-when-present|(next-pass|master)-represents-p(5[1-9]|6[0-5]))$/;
  const probePassedForCurrentMode = (item: Probe): boolean =>
    item.passed || (exactApprovalDeferred && deferredProbeNames.test(item.name));
  const probeFailures = probes.filter((item) => !probePassedForCurrentMode(item)).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;

  const report: Report = {
    schemaVersion: 'gustav-master-next-pass-consistency-refresh-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: accepted ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      readinessApplyBlockerMapRefreshV2Packet: rel(repoRoot, p37Path),
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47ContractPath),
      exactApprovalApplyRehearsalV2Packet: rel(repoRoot, p51Path),
      exactApprovalSourceFirewallV2Packet: rel(repoRoot, p52Path),
      exactApprovalSourceIntakeTransitionV2Packet: rel(repoRoot, p53Path),
      exactApprovalActiveArtifactPairSimulationV2Packet: rel(repoRoot, p54Path),
      exactApprovalP31CreateCommandPreflightV2Packet: rel(repoRoot, p55Path),
      exactApprovalP44ValidationCommandPreflightV2Packet: rel(repoRoot, p56Path),
      exactApprovalP44ToP45SequenceHandoffSimulationV2Packet: rel(repoRoot, p57Path),
      exactApprovalP45SequenceCommandPreflightV2Packet: rel(repoRoot, p58Path),
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Packet: rel(repoRoot, p59Path),
      exactApprovalP46ApplyTransactionCommandPreflightV2Packet: rel(repoRoot, p60Path),
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Packet: rel(repoRoot, p61Path),
      exactApprovalP47RollbackGuardCommandPreflightV2Packet: rel(repoRoot, p62Path),
      approvalWaitSafeContinuationV2Packet: rel(repoRoot, p48Path),
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Packet: rel(repoRoot, p63Path),
      exactApprovalP48SafeContinuationCommandPreflightV2Packet: rel(repoRoot, p64Path),
      exactApprovalWaitStateV2Packet: rel(repoRoot, p65Path),
      exactApprovalSourceWaitTerminalStateV2Packet: rel(repoRoot, p69Path),
      nextPassGoalContractPacket: rel(repoRoot, nextPath),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      consistencyState: accepted ? 'master_next_pass_consistency_refreshed' : 'blocked_by_findings',
      p37Ready,
      p37State: s(p37Summary, 'blockerMapState'),
      p37SafeClosed: n(p37Summary, 'safeNonProductionItemsClosed'),
      p37SafeRemaining: n(p37Summary, 'safeNonProductionItemsRemaining'),
      p37ReadyForApply: b(p37Summary, 'readyForApply'),
      p51Present,
      p51Ready,
      p51State: s(p51Summary, 'rehearsalState'),
      p51ReadinessApplyBlockers: n(p51Summary, 'readinessApplyBlockers'),
      p51ActiveApprovalReceiptExists: b(p51Summary, 'activeApprovalReceiptExists'),
      p51ActiveHashLockExists: b(p51Summary, 'activeHashLockExists'),
      p52Present,
      p52Ready,
      p52State: s(p52Summary, 'firewallState'),
      p52ApprovalSourceExists: b(p52Summary, 'approvalSourceExists'),
      p52ApprovalSourceContainsExactSentence: b(p52Summary, 'approvalSourceContainsExactSentence'),
      p52PlainContinueWouldCreateActiveArtifacts: b(p52Summary, 'plainContinueWouldCreateActiveArtifacts'),
      p52ActiveApprovalReceiptExists: b(p52Summary, 'activeApprovalReceiptExists'),
      p52ActiveHashLockExists: b(p52Summary, 'activeHashLockExists'),
      p53Present,
      p53Ready,
      p53State: s(p53Summary, 'intakeTransitionState'),
      p53ApprovalSourceExists: b(p53Summary, 'approvalSourceExists'),
      p53ApprovalSourceContainsExactSentence: b(p53Summary, 'approvalSourceContainsExactSentence'),
      p53PlainContinueWouldCreateActiveArtifacts: b(p53Summary, 'plainContinueWouldCreateActiveArtifacts'),
      p53WouldCreateActiveArtifactsByThisScript: b(p53Summary, 'wouldCreateActiveArtifactsByThisScript'),
      p53ActiveApprovalReceiptExists: b(p53Summary, 'activeApprovalReceiptExists'),
      p53ActiveHashLockExists: b(p53Summary, 'activeHashLockExists'),
      p54Present,
      p54Ready,
      p54State: s(p54Summary, 'pairSimulationState'),
      p54ApprovalSourceExists: b(p54Summary, 'approvalSourceExists'),
      p54ApprovalSourceContainsExactSentence: b(p54Summary, 'approvalSourceContainsExactSentence'),
      p54ActiveApprovalReceiptExists: b(p54Summary, 'activeApprovalReceiptExists'),
      p54ActiveHashLockExists: b(p54Summary, 'activeHashLockExists'),
      p54SimulatedPairWouldPassP44AfterP31Create: b(p54Summary, 'simulatedPairWouldPassP44AfterP31Create'),
      p54CurrentP44WouldOpenSequencing: b(p54Summary, 'currentP44WouldOpenSequencing'),
      p55Present,
      p55Ready,
      p55State: s(p55Summary, 'preflightState'),
      p55ApprovalSourceExists: b(p55Summary, 'approvalSourceExists'),
      p55ApprovalSourceContainsExactSentence: b(p55Summary, 'approvalSourceContainsExactSentence'),
      p55ActiveApprovalReceiptExists: b(p55Summary, 'activeApprovalReceiptExists'),
      p55ActiveHashLockExists: b(p55Summary, 'activeHashLockExists'),
      p55CommandAllowedNow: b(p55Summary, 'p31CreateCommandAllowedByPreflightNow'),
      p55CommandAllowedWhenExactSourcePresent: b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent'),
      p55CommandExecutedByThisScript: b(p55Summary, 'p31CreateCommandWouldExecuteByThisScript'),
      p56Present,
      p56Ready,
      p56State: s(p56Summary, 'preflightState'),
      p56ApprovalSourceExists: b(p56Summary, 'approvalSourceExists'),
      p56ApprovalSourceContainsExactSentence: b(p56Summary, 'approvalSourceContainsExactSentence'),
      p56ActiveApprovalReceiptExists: b(p56Summary, 'activeApprovalReceiptExists'),
      p56ActiveHashLockExists: b(p56Summary, 'activeHashLockExists'),
      p56CommandAllowedNow: b(p56Summary, 'p44ValidationCommandAllowedNow'),
      p56CommandAllowedAfterP31Create: b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create'),
      p56CommandExecutedByThisScript: b(p56Summary, 'p44ValidationCommandWouldExecuteByThisScript'),
      p57Present,
      p57Ready,
      p57State: s(p57Summary, 'handoffState'),
      p57P56Ready: b(p57Summary, 'p56Ready'),
      p57P44Status: s(p57Summary, 'p44Status'),
      p57P44ValidationState: s(p57Summary, 'p44ValidationState'),
      p57P45Status: s(p57Summary, 'p45Status'),
      p57P45PreflightState: s(p57Summary, 'p45PreflightState'),
      p57CurrentHandoffWouldOpenSequence: b(p57Summary, 'currentP44ToP45HandoffWouldOpenSequence'),
      p57SimulatedPostP44P45WouldOpenSequence: b(p57Summary, 'simulatedPostP44P45WouldOpenSequence'),
      p57CommandExecutedByThisScript: b(p57Summary, 'p45SequenceCommandWouldExecuteByThisScript'),
      p58Present,
      p58Ready,
      p58State: s(p58Summary, 'preflightState'),
      p58P57Ready: b(p58Summary, 'p57Ready'),
      p58P45Status: s(p58Summary, 'p45Status'),
      p58P45PreflightState: s(p58Summary, 'p45PreflightState'),
      p58CommandAllowedNow: b(p58Summary, 'p45SequenceCommandAllowedNow'),
      p58CommandAllowedAfterP44Validation: b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation'),
      p58CommandExecutedByThisScript: b(p58Summary, 'p45SequenceCommandWouldExecuteByThisScript'),
      p59Present,
      p59Ready,
      p59State: s(p59Summary, 'handoffState'),
      p59P58Ready: b(p59Summary, 'p58Ready'),
      p59P45Status: s(p59Summary, 'p45Status'),
      p59P45PreflightState: s(p59Summary, 'p45PreflightState'),
      p59P46Status: s(p59Summary, 'p46Status'),
      p59P46TransactionState: s(p59Summary, 'p46TransactionState'),
      p59CurrentHandoffWouldOpenTransaction: b(p59Summary, 'currentP45ToP46HandoffWouldOpenTransaction'),
      p59SimulatedPostP45P46WouldOpenTransaction: b(p59Summary, 'simulatedPostP45P46WouldOpenTransaction'),
      p59CommandExecutedByThisScript: b(p59Summary, 'p46ContractCommandWouldExecuteByThisScript'),
      p60Present,
      p60Ready,
      p60State: s(p60Summary, 'preflightState'),
      p60P59Ready: b(p60Summary, 'p59Ready'),
      p60P45Status: s(p60Summary, 'p45Status'),
      p60P45PreflightState: s(p60Summary, 'p45PreflightState'),
      p60P46Status: s(p60Summary, 'p46Status'),
      p60P46TransactionState: s(p60Summary, 'p46TransactionState'),
      p60CommandAllowedNow: b(p60Summary, 'p46ApplyTransactionCommandAllowedNow'),
      p60CommandAllowedAfterP45Sequence: b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence'),
      p60CommandExecutedByThisScript: b(p60Summary, 'p46ApplyTransactionCommandWouldExecuteByThisScript'),
      p61Present,
      p61Ready,
      p61State: s(p61Summary, 'handoffState'),
      p61P60Ready: b(p61Summary, 'p60Ready'),
      p61P46Status: s(p61Summary, 'p46Status'),
      p61P46TransactionState: s(p61Summary, 'p46TransactionState'),
      p61P47Status: s(p61Summary, 'p47Status'),
      p61P47GuardState: s(p61Summary, 'p47GuardState'),
      p61CurrentHandoffWouldOpenRollbackGuard: b(p61Summary, 'currentP46ToP47HandoffWouldOpenRollbackGuard'),
      p61SimulatedPostP46P47WouldOpenRollbackGuard: b(p61Summary, 'simulatedPostP46P47WouldOpenRollbackGuard'),
      p61CommandExecutedByThisScript: b(p61Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript'),
      p62Present,
      p62Ready,
      p62State: s(p62Summary, 'preflightState'),
      p62P61Ready: b(p62Summary, 'p61Ready'),
      p62P46Status: s(p62Summary, 'p46Status'),
      p62P46TransactionState: s(p62Summary, 'p46TransactionState'),
      p62P47Status: s(p62Summary, 'p47Status'),
      p62P47GuardState: s(p62Summary, 'p47GuardState'),
      p62CommandAllowedNow: b(p62Summary, 'p47RollbackGuardCommandAllowedNow'),
      p62CommandAllowedAfterP46Contract: b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract'),
      p62CommandExecutedByThisScript: b(p62Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript'),
      p63Present,
      p63Ready,
      p63State: s(p63Summary, 'handoffState'),
      p63P62Ready: b(p63Summary, 'p62Ready'),
      p63P47Status: s(p63Summary, 'p47Status'),
      p63P47GuardState: s(p63Summary, 'p47GuardState'),
      p63P48Status: s(p63Summary, 'p48Status'),
      p63P48ContinuationState: s(p63Summary, 'p48ContinuationState'),
      p63CurrentHandoffWouldOpenSafeContinuation: b(p63Summary, 'currentP47ToP48HandoffWouldOpenSafeContinuation'),
      p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: b(p63Summary, 'simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation'),
      p63CommandExecutedByThisScript: b(p63Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript'),
      p64Present,
      p64Ready,
      p64State: s(p64Summary, 'preflightState'),
      p64P63Ready: b(p64Summary, 'p63Ready'),
      p64P48Status: s(p64Summary, 'p48Status'),
      p64P48ContinuationState: s(p64Summary, 'p48ContinuationState'),
      p64CommandAllowedNow: b(p64Summary, 'p48SafeContinuationCommandAllowedNow'),
      p64CommandExecutedByThisScript: b(p64Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript'),
      p65Present,
      p65Ready,
      p65State,
      p65ClosedEvidenceReady: b(p65Summary, 'closedEvidenceReady'),
      p65ExactApprovalStillRequired: b(p65Summary, 'exactApprovalStillRequired'),
      p65SourceContainsExactSentence,
      p65ApprovalSourceIsCanonical,
      p65ActiveApprovalReceiptExists: b(p65Summary, 'activeApprovalReceiptExists'),
      p65ActiveHashLockExists: b(p65Summary, 'activeHashLockExists'),
      p69Present,
      p69Ready,
      p69State: s(p69Summary, 'terminalState'),
      p69NextGoalId: s(p69Summary, 'nextPassGoalId'),
      p69ConsistencyGoalId: s(p69Summary, 'consistencyGoalId'),
      p69ActiveApprovalReceiptExists: b(p69Summary, 'activeApprovalReceiptExists'),
      p69ActiveHashLockExists: b(p69Summary, 'activeHashLockExists'),
      p69ReadyForApply: b(p69Summary, 'readyForApply'),
      p69MayModifyProductionAppFiles: b(p69Summary, 'mayModifyProductionAppFiles'),
      p69CanStartProductionApply: b(p69Summary, 'canStartProductionApply'),
      nextPassStatus: s(next, 'status'),
      nextPassPrepared: b(nextSummary, 'nextPassPrepared'),
      nextPassGoalId: nextGoalId,
      nextPassP37Ready: b(nextSummary, 'readinessApplyBlockerMapRefreshV2Ready'),
      nextPassP51Ready: b(nextSummary, 'exactApprovalApplyRehearsalV2Ready'),
      nextPassP52Ready: b(nextSummary, 'exactApprovalSourceFirewallV2Ready'),
      nextPassP53Ready: b(nextSummary, 'exactApprovalSourceIntakeTransitionV2Ready'),
      nextPassP54Ready: b(nextSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready'),
      nextPassP55Ready: b(nextSummary, 'exactApprovalP31CreateCommandPreflightV2Ready'),
      nextPassP56Ready: b(nextSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready'),
      nextPassP57Ready: b(nextSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready'),
      nextPassP58Ready: b(nextSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready'),
      nextPassP59Ready: b(nextSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready'),
      nextPassP60Ready: b(nextSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready'),
      nextPassP61Ready: b(nextSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready'),
      nextPassP62Ready: b(nextSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready'),
      nextPassP63Ready: b(nextSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready'),
      nextPassP64Ready: b(nextSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready'),
      nextPassP65Ready: b(nextSummary, 'exactApprovalWaitStateV2Ready'),
      nextPassReadyForApply: b(nextSummary, 'readyForApply'),
      nextPassMayModifyProductionAppFiles: b(nextSummary, 'mayModifyProductionAppFiles'),
      masterStatus: s(master, 'status'),
      masterBlockers: n(masterSummary, 'blockers'),
      masterActionableBlockers,
      masterExpectedFutureBlockers,
      masterWarnings: n(masterSummary, 'warnings'),
      masterP37Present: b(masterSummary, 'readinessApplyBlockerMapRefreshV2Present'),
      masterP37State: s(masterSummary, 'readinessApplyBlockerMapRefreshV2State'),
      masterP37ReadyForApply: b(masterSummary, 'readinessApplyBlockerMapRefreshV2ReadyForApply'),
      masterP51Present: b(masterSummary, 'exactApprovalApplyRehearsalV2Present'),
      masterP51State: s(masterSummary, 'exactApprovalApplyRehearsalV2State'),
      masterP51Ready: b(masterSummary, 'exactApprovalApplyRehearsalV2Ready'),
      masterP52Present: b(masterSummary, 'exactApprovalSourceFirewallV2Present'),
      masterP52State: s(masterSummary, 'exactApprovalSourceFirewallV2State'),
      masterP52Ready: b(masterSummary, 'exactApprovalSourceFirewallV2Ready'),
      masterP53Present: b(masterSummary, 'exactApprovalSourceIntakeTransitionV2Present'),
      masterP53State: s(masterSummary, 'exactApprovalSourceIntakeTransitionV2State'),
      masterP53Ready: b(masterSummary, 'exactApprovalSourceIntakeTransitionV2Ready'),
      masterP54Present: b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2Present'),
      masterP54State: s(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2State'),
      masterP54Ready: b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready'),
      masterP55Present: b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2Present'),
      masterP55State: s(masterSummary, 'exactApprovalP31CreateCommandPreflightV2State'),
      masterP55Ready: b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2Ready'),
      masterP56Present: b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2Present'),
      masterP56State: s(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2State'),
      masterP56Ready: b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready'),
      masterP57Present: b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Present'),
      masterP57State: s(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2State'),
      masterP57Ready: b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready'),
      masterP58Present: b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2Present'),
      masterP58State: s(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2State'),
      masterP58Ready: b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready'),
      masterP59Present: b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present'),
      masterP59State: s(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State'),
      masterP59Ready: b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready'),
      masterP60Present: b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Present'),
      masterP60State: s(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2State'),
      masterP60Ready: b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready'),
      masterP61Present: b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present'),
      masterP61State: s(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State'),
      masterP61Ready: b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready'),
      masterP62Present: b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Present'),
      masterP62State: s(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2State'),
      masterP62Ready: b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready'),
      masterP63Present: b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present'),
      masterP63State: s(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State'),
      masterP63Ready: b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready'),
      masterP64Present: b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Present'),
      masterP64State: s(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2State'),
      masterP64Ready: b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready'),
      masterP65Present: b(masterSummary, 'exactApprovalWaitStateV2Present'),
      masterP65State: s(masterSummary, 'exactApprovalWaitStateV2State'),
      masterP65Ready: b(masterSummary, 'exactApprovalWaitStateV2Ready'),
      masterReadyForApply: b(masterSummary, 'readyForApply'),
      masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
      readyForOfficialSourceContentCoverageGateV2: accepted,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      productionWritesAllowed: false,
      fixtureProbesPassed: probes.filter((item) => probePassedForCurrentMode(item)).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
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

  console.log(`GUSTAV master/next-pass consistency refresh V2 packet: ${report.status}`);
  console.log(`Consistency state: ${report.summary.consistencyState}`);
  console.log(`Next pass goal: ${report.summary.nextPassGoalId}`);
  console.log(`P51 present/ready: ${report.summary.p51Present ? 'yes' : 'no'}/${report.summary.p51Ready ? 'yes' : 'no'}`);
  console.log(`P52 present/ready: ${report.summary.p52Present ? 'yes' : 'no'}/${report.summary.p52Ready ? 'yes' : 'no'}`);
  console.log(`P53 present/ready: ${report.summary.p53Present ? 'yes' : 'no'}/${report.summary.p53Ready ? 'yes' : 'no'}`);
  console.log(`P54 present/ready: ${report.summary.p54Present ? 'yes' : 'no'}/${report.summary.p54Ready ? 'yes' : 'no'}`);
  console.log(`P55 present/ready: ${report.summary.p55Present ? 'yes' : 'no'}/${report.summary.p55Ready ? 'yes' : 'no'}`);
  console.log(`P61 present/ready: ${report.summary.p61Present ? 'yes' : 'no'}/${report.summary.p61Ready ? 'yes' : 'no'}`);
  console.log(`Ready for official-source content coverage gate V2: ${report.summary.readyForOfficialSourceContentCoverageGateV2 ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
