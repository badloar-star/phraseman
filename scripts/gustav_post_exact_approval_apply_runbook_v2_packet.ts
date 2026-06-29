import * as crypto from 'node:crypto';
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

type RunbookStep = {
  id: string;
  command: string;
  allowedNow: boolean;
  allowedAfter: string;
  writesReservedApprovalArtifacts: boolean;
  writesProductionStateNow: boolean;
};

type Report = {
  schemaVersion: 'gustav-post-exact-approval-apply-runbook-v2-packet-v0';
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
    runbookState: string;
    requiredApprovalSentencePresent: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourcePath: string;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    masterBlockers: number;
    masterReadyForApply: boolean;
    p49ClosedModeEvidenceComplete: boolean;
    p69TerminalWaitReady: boolean;
    p31CreateAllowedNow: boolean;
    p31CreateAllowedWhenExactSourcePresent: boolean;
    p44ValidationAllowedNow: boolean;
    p44ValidationAllowedAfterP31Create: boolean;
    p45SequenceAllowedNow: boolean;
    p45SequenceAllowedAfterP44Validation: boolean;
    p46ContractAllowedNow: boolean;
    p46ContractAllowedAfterP45Sequence: boolean;
    p47GuardAllowedNow: boolean;
    p47GuardAllowedAfterP46Contract: boolean;
    p48RefreshAllowedNow: boolean;
    runbookSteps: number;
    productionWritesAllowedNow: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    canStartProductionApplyNow: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    activationApproved: boolean;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  steps: RunbookStep[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    reportOnly: true;
    createsApprovalSource: false;
    createsActiveApprovalArtifacts: false;
    executesProductionApply: false;
    uploadsServerOrFirebasePacks: false;
    enablesRuntimeDownloads: false;
    modifiesProductionAppFiles: false;
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

function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function addFinding(findings: Finding[], severity: Finding['severity'], code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function probe(id: string, passed: boolean, detail: string): Probe {
  return { id, passed, detail };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Post Exact Approval Apply Runbook V2 Packet',
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
    `- Runbook state: \`${report.summary.runbookState}\``,
    `- Approval source path: \`${report.summary.approvalSourcePath}\``,
    `- Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`,
    `- Required approval sentence SHA-256: \`${report.summary.requiredApprovalSentenceSha256}\``,
    `- Master blockers/apply: ${report.summary.masterBlockers}/${report.summary.masterReadyForApply ? 'yes' : 'no'}`,
    `- P49/P69 ready: ${report.summary.p49ClosedModeEvidenceComplete ? 'yes' : 'no'}/${report.summary.p69TerminalWaitReady ? 'yes' : 'no'}`,
    `- Can start production apply now: ${report.summary.canStartProductionApplyNow ? 'yes' : 'no'}`,
    `- Production writes allowed now: ${report.summary.productionWritesAllowedNow ? 'yes' : 'no'}`,
    `- Probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Ordered Runbook',
    '',
  ];
  for (const step of report.steps) {
    lines.push(`- \`${step.id}\`: \`${step.command}\``);
    lines.push(`  - allowed now: ${step.allowedNow ? 'yes' : 'no'}; allowed after: ${step.allowedAfter}; writes now: ${step.writesProductionStateNow ? 'yes' : 'no'}`);
  }
  lines.push('', '## Probes', '');
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
    '- It does not create the approval source.',
    '- It does not create active approval artifacts.',
    '- It does not execute production apply, upload packs, enable runtime downloads, or modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_post_exact_approval_apply_runbook_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const target = argValue('--target') || 'fr';
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const approvalPresentationPath = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const p49Path = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const p55Path = path.join(auditsDir, 'exact_approval_p31_create_command_preflight_v2_packet.json');
  const p56Path = path.join(auditsDir, 'exact_approval_p44_validation_command_preflight_v2_packet.json');
  const p58Path = path.join(auditsDir, 'exact_approval_p45_sequence_command_preflight_v2_packet.json');
  const p60Path = path.join(auditsDir, 'exact_approval_p46_apply_transaction_command_preflight_v2_packet.json');
  const p62Path = path.join(auditsDir, 'exact_approval_p47_rollback_guard_command_preflight_v2_packet.json');
  const p64Path = path.join(auditsDir, 'exact_approval_p48_safe_continuation_command_preflight_v2_packet.json');
  const p69Path = path.join(auditsDir, 'exact_approval_source_wait_terminal_state_v2_packet.json');
  const activeApprovalReceiptPath = path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json');

  const approvalPresentation = readJson(approvalPresentationPath);
  const approvalPresentationSummary = object(approvalPresentation.summary);
  const master = readJson(masterPath);
  const masterSummary = object(master.summary);
  const p49 = readJson(p49Path);
  const p49Summary = object(p49.summary);
  const p55Summary = summaryOf(p55Path);
  const p56Summary = summaryOf(p56Path);
  const p58Summary = summaryOf(p58Path);
  const p60Summary = summaryOf(p60Path);
  const p62Summary = summaryOf(p62Path);
  const p64Summary = summaryOf(p64Path);
  const p69Summary = summaryOf(p69Path);

  const approvalSourcePath = path.resolve(repoRoot, s(approvalPresentationSummary, 'approvalSourcePath') || path.join(runDir, 'apply_plan', 'explicit_approval_input_v2.txt'));
  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const requiredApprovalSentence = s(approvalPresentation, 'requiredApprovalSentence');
  const approvalSourceContainsExactSentence = requiredApprovalSentence !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);

  const steps: RunbookStep[] = [
    {
      id: 'P31_CREATE_ACTIVE_APPROVAL_ARTIFACTS',
      command: `npx tsx scripts/gustav_explicit_approval_receipt_creation_gate_v2_packet.ts --run ${rel(repoRoot, runDir)} --target fr --approval-source ${rel(repoRoot, approvalSourcePath)} --create-active-receipt`,
      allowedNow: b(p55Summary, 'p31CreateCommandAllowedByPreflightNow'),
      allowedAfter: 'canonical approval source exists and contains the exact required sentence',
      writesReservedApprovalArtifacts: true,
      writesProductionStateNow: false,
    },
    {
      id: 'P44_VALIDATE_ACTIVE_APPROVAL_ARTIFACTS',
      command: `npx tsx scripts/gustav_exact_approval_validation_gate_v2_packet.ts --run ${rel(repoRoot, runDir)} --target fr`,
      allowedNow: b(p56Summary, 'p44ValidationCommandAllowedNow'),
      allowedAfter: 'P31 creates both active approval artifacts atomically',
      writesReservedApprovalArtifacts: false,
      writesProductionStateNow: false,
    },
    {
      id: 'P45_SEQUENCE_PREFLIGHT',
      command: `npx tsx scripts/gustav_production_activation_sequence_preflight_v2_packet.ts --run ${rel(repoRoot, runDir)} --target fr`,
      allowedNow: b(p58Summary, 'p45SequenceCommandAllowedNow'),
      allowedAfter: 'P44 validates active approval artifacts',
      writesReservedApprovalArtifacts: false,
      writesProductionStateNow: false,
    },
    {
      id: 'P46_APPLY_TRANSACTION_CONTRACT',
      command: `npx tsx scripts/gustav_production_apply_transaction_contract_v2_packet.ts --run ${rel(repoRoot, runDir)} --target fr`,
      allowedNow: b(p60Summary, 'p46ApplyTransactionCommandAllowedNow'),
      allowedAfter: 'P45 activation sequence preflight passes',
      writesReservedApprovalArtifacts: false,
      writesProductionStateNow: false,
    },
    {
      id: 'P47_POST_APPLY_ROLLBACK_GUARD',
      command: `npx tsx scripts/gustav_post_apply_rollback_guard_contract_v2_packet.ts --run ${rel(repoRoot, runDir)} --target fr`,
      allowedNow: b(p62Summary, 'p47RollbackGuardCommandAllowedNow'),
      allowedAfter: 'P46 apply transaction contract passes',
      writesReservedApprovalArtifacts: false,
      writesProductionStateNow: false,
    },
    {
      id: 'P48_SAFE_CONTINUATION_REFRESH',
      command: `npx tsx scripts/gustav_approval_wait_safe_continuation_v2_packet.ts --run ${rel(repoRoot, runDir)} --target fr`,
      allowedNow: b(p64Summary, 'p48SafeContinuationCommandAllowedNow'),
      allowedAfter: 'P47 rollback guard contract passes',
      writesReservedApprovalArtifacts: false,
      writesProductionStateNow: false,
    },
  ];

  const findings: Finding[] = [];
  const p49Closed =
    s(p49, 'status') === 'HOLD' &&
    s(p49Summary, 'completionState') === 'closed_mode_evidence_complete_production_locked' &&
    b(p49Summary, 'closedModeEvidenceComplete') &&
    n(p49Summary, 'requirementsMissing') === 0 &&
    n(p49Summary, 'requirementsContradicted') === 0;
  const p69Ready =
    s(readJson(p69Path), 'status') === 'PASS' &&
    s(p69Summary, 'terminalState') === 'exact_approval_source_absent_terminal_wait' &&
    !b(p69Summary, 'canStartProductionApply');
  const productionWritesAllowedNow =
    steps.some((step) => step.writesProductionStateNow) ||
    b(masterSummary, 'readyForApply') ||
    b(masterSummary, 'mayModifyProductionAppFiles') ||
    b(masterSummary, 'activationApproved') ||
    activeApprovalReceiptExists ||
    activeHashLockExists;

  if (target !== 'fr') addFinding(findings, 'blocker', 'TARGET_NOT_FR', 'Runbook is only valid for studyTarget=fr.');
  if (requiredApprovalSentence === '') addFinding(findings, 'blocker', 'REQUIRED_APPROVAL_SENTENCE_MISSING', 'Activation approval presentation must expose the exact required approval sentence.', rel(repoRoot, approvalPresentationPath));
  if (n(masterSummary, 'blockers') !== 0) addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', 'Master must have zero blockers before exact approval runbook can be trusted.', rel(repoRoot, masterPath));
  if (!p49Closed) addFinding(findings, 'blocker', 'P49_NOT_CLOSED', 'P49 closed-mode production readiness evidence must be complete before the post-approval runbook.');
  if (!p69Ready) addFinding(findings, 'blocker', 'P69_TERMINAL_WAIT_NOT_READY', 'P69 terminal wait must be ready and deny production apply while the exact source is absent.', rel(repoRoot, p69Path));
  if (!b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent')) addFinding(findings, 'blocker', 'P31_FUTURE_CREATE_NOT_ALLOWED', 'P31 create command must become allowed when exact source exists.', rel(repoRoot, p55Path));
  if (!b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create')) addFinding(findings, 'blocker', 'P44_FUTURE_VALIDATION_NOT_ALLOWED', 'P44 validation must become allowed after P31 creates active artifacts.', rel(repoRoot, p56Path));
  if (!b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation')) addFinding(findings, 'blocker', 'P45_FUTURE_SEQUENCE_NOT_ALLOWED', 'P45 sequence must become allowed after P44 validation.', rel(repoRoot, p58Path));
  if (!b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence')) addFinding(findings, 'blocker', 'P46_FUTURE_CONTRACT_NOT_ALLOWED', 'P46 contract must become allowed after P45 sequence.', rel(repoRoot, p60Path));
  if (!b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract')) addFinding(findings, 'blocker', 'P47_FUTURE_GUARD_NOT_ALLOWED', 'P47 rollback guard must become allowed after P46 contract.', rel(repoRoot, p62Path));
  if (!b(p64Summary, 'p48SafeContinuationCommandAllowedNow')) addFinding(findings, 'blocker', 'P48_SAFE_REFRESH_NOT_READY', 'P48 safe continuation refresh must remain available without opening production writes.', rel(repoRoot, p64Path));
  if (productionWritesAllowedNow) addFinding(findings, 'blocker', 'PRODUCTION_WRITES_OPEN_NOW', 'Runbook must not open production writes or active artifacts while exact source is absent.');
  if (approvalSourceExists && !approvalSourceContainsExactSentence) addFinding(findings, 'blocker', 'APPROVAL_SOURCE_EXISTS_WITHOUT_EXACT_SENTENCE', 'Existing approval source must contain the exact required sentence.', rel(repoRoot, approvalSourcePath));

  const probes = [
    probe('required-approval-sentence-present', requiredApprovalSentence !== '', sha256Text(requiredApprovalSentence)),
    probe('master-zero-blockers', n(masterSummary, 'blockers') === 0, String(n(masterSummary, 'blockers'))),
    probe('p49-closed-production-locked', p49Closed, `${s(p49, 'status')}/${s(p49Summary, 'completionState')}/${n(p49Summary, 'requirementsMissing')}/${n(p49Summary, 'requirementsContradicted')}`),
    probe('p69-terminal-wait-ready', p69Ready, `${s(readJson(p69Path), 'status')}/${s(p69Summary, 'terminalState')}/${b(p69Summary, 'canStartProductionApply')}`),
    probe('approval-source-absent-or-exact', !approvalSourceExists || approvalSourceContainsExactSentence, `${approvalSourceExists}/${approvalSourceContainsExactSentence}`),
    probe('p31-disabled-now-enabled-after-source', !b(p55Summary, 'p31CreateCommandAllowedByPreflightNow') && b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent'), `${b(p55Summary, 'p31CreateCommandAllowedByPreflightNow')}/${b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent')}`),
    probe('p44-disabled-now-enabled-after-p31', !b(p56Summary, 'p44ValidationCommandAllowedNow') && b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create'), `${b(p56Summary, 'p44ValidationCommandAllowedNow')}/${b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create')}`),
    probe('p45-disabled-now-enabled-after-p44', !b(p58Summary, 'p45SequenceCommandAllowedNow') && b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation'), `${b(p58Summary, 'p45SequenceCommandAllowedNow')}/${b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation')}`),
    probe('p46-disabled-now-enabled-after-p45', !b(p60Summary, 'p46ApplyTransactionCommandAllowedNow') && b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence'), `${b(p60Summary, 'p46ApplyTransactionCommandAllowedNow')}/${b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence')}`),
    probe('p47-disabled-now-enabled-after-p46', !b(p62Summary, 'p47RollbackGuardCommandAllowedNow') && b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract'), `${b(p62Summary, 'p47RollbackGuardCommandAllowedNow')}/${b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract')}`),
    probe('p48-safe-refresh-available', b(p64Summary, 'p48SafeContinuationCommandAllowedNow') && !b(p64Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript'), `${b(p64Summary, 'p48SafeContinuationCommandAllowedNow')}/${b(p64Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript')}`),
    probe('no-production-writes-now', !productionWritesAllowedNow, String(productionWritesAllowedNow)),
    probe('runbook-steps-complete', steps.length === 6 && steps.every((step) => step.command.includes('--run') && step.command.includes('--target fr')), String(steps.length)),
  ];

  for (const item of probes) {
    if (!item.passed) addFinding(findings, 'blocker', `probe_failed_${item.id}`, item.detail);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const runbookState = status === 'PASS' ? 'post_exact_approval_runbook_ready_waiting_for_canonical_source' : 'blocked_by_findings';
  const outputJsonPath = path.join(auditsDir, 'post_exact_approval_apply_runbook_v2_packet.json');
  const report: Report = {
    schemaVersion: 'gustav-post-exact-approval-apply-runbook-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      targetLocale: target,
      runbookState,
      requiredApprovalSentencePresent: requiredApprovalSentence !== '',
      requiredApprovalSentenceSha256: sha256Text(requiredApprovalSentence),
      approvalSourcePath: rel(repoRoot, approvalSourcePath),
      approvalSourceExists,
      approvalSourceContainsExactSentence,
      masterBlockers: n(masterSummary, 'blockers'),
      masterReadyForApply: b(masterSummary, 'readyForApply'),
      p49ClosedModeEvidenceComplete: p49Closed,
      p69TerminalWaitReady: p69Ready,
      p31CreateAllowedNow: b(p55Summary, 'p31CreateCommandAllowedByPreflightNow'),
      p31CreateAllowedWhenExactSourcePresent: b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent'),
      p44ValidationAllowedNow: b(p56Summary, 'p44ValidationCommandAllowedNow'),
      p44ValidationAllowedAfterP31Create: b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create'),
      p45SequenceAllowedNow: b(p58Summary, 'p45SequenceCommandAllowedNow'),
      p45SequenceAllowedAfterP44Validation: b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation'),
      p46ContractAllowedNow: b(p60Summary, 'p46ApplyTransactionCommandAllowedNow'),
      p46ContractAllowedAfterP45Sequence: b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence'),
      p47GuardAllowedNow: b(p62Summary, 'p47RollbackGuardCommandAllowedNow'),
      p47GuardAllowedAfterP46Contract: b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract'),
      p48RefreshAllowedNow: b(p64Summary, 'p48SafeContinuationCommandAllowedNow'),
      runbookSteps: steps.length,
      productionWritesAllowedNow,
      activeApprovalReceiptExists,
      activeHashLockExists,
      canStartProductionApplyNow: b(p69Summary, 'canStartProductionApply'),
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      activationApproved: false,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((item) => item.passed).length,
      fixtureProbes: probes.length,
    },
    steps,
    probes,
    findings,
    safety: {
      reportOnly: true,
      createsApprovalSource: false,
      createsActiveApprovalArtifacts: false,
      executesProductionApply: false,
      uploadsServerOrFirebasePacks: false,
      enablesRuntimeDownloads: false,
      modifiesProductionAppFiles: false,
    },
  };

  fs.writeFileSync(outputJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outputJsonPath.replace(/\.json$/, '.md'), renderMarkdown(report));

  console.log(`GUSTAV post exact approval apply runbook V2 packet: ${report.status}`);
  console.log(`Runbook state: ${report.summary.runbookState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`P31 allowed now/after exact source: ${report.summary.p31CreateAllowedNow ? 'yes' : 'no'}/${report.summary.p31CreateAllowedWhenExactSourcePresent ? 'yes' : 'no'}`);
  console.log(`Production writes now: ${report.summary.productionWritesAllowedNow ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status !== 'PASS') process.exitCode = 1;
}

main();
