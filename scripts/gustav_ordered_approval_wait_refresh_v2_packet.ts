import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type StepStatus = 'PASS' | 'FAIL' | 'SKIPPED';

type JsonObject = Record<string, unknown>;

type Step = {
  id: string;
  script: string;
  reason: string;
  allowTransientP65SelfCycle?: boolean;
};

type StepResult = Step & {
  status: StepStatus;
  exitCode: number | null;
  elapsedMs: number;
  outputPreview: string[];
};

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type Report = {
  schemaVersion: 'gustav-ordered-approval-wait-refresh-v2-packet-v0';
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
    executed: boolean;
    steps: number;
    stepsPassed: number;
    stepsFailed: number;
    sequenceSignature: string[];
    p65Status: string;
    p65WaitState: string;
    p65ClosedEvidenceReady: boolean;
    p65ExactApprovalStillRequired: boolean;
    finalMasterStatus: string;
    finalMasterBlockers: number;
    finalMasterWarnings: number;
    finalMasterBlockersRaw: number;
    finalMasterWarningsRaw: number;
    finalMasterHasOnlyTransientSelfCycle: boolean;
    finalNextStatus: string;
    finalNextBlockers: number;
    finalNextWarnings: number;
    finalNextWarningsRaw: number;
    finalHashLocks: number;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    activationApproved: boolean;
    blockers: number;
    warnings: number;
  };
  steps: StepResult[];
  findings: Finding[];
  safety: {
    dryRunOrPreflightPacketsOnly: true;
    createsActiveApprovalArtifacts: false;
    executesProductionApply: false;
    uploadsServerOrFirebasePacks: false;
    enablesRuntimeDownloads: false;
    modifiesProductionAppFiles: false;
  };
};

const STEPS: Step[] = [
  {
    id: 'P50_FINAL_PREAPPROVAL_HASH_LOCK',
    script: 'scripts/gustav_final_preapproval_evidence_hash_lock_v2_packet.ts',
    reason: 'Refresh final pre-approval evidence locks before any downstream approval-wait packet.',
  },
  {
    id: 'P51_EXACT_APPROVAL_APPLY_REHEARSAL',
    script: 'scripts/gustav_exact_approval_apply_rehearsal_v2_packet.ts',
    reason: 'Rehearse apply readiness after P50 while keeping exact approval absent.',
  },
  {
    id: 'P52_EXACT_APPROVAL_SOURCE_FIREWALL',
    script: 'scripts/gustav_exact_approval_source_firewall_v2_packet.ts',
    reason: 'Prove plain continue cannot create active approval artifacts.',
  },
  {
    id: 'P53_EXACT_APPROVAL_SOURCE_INTAKE_TRANSITION',
    script: 'scripts/gustav_exact_approval_source_intake_transition_v2_packet.ts',
    reason: 'Prove only the exact approval source can open active artifact creation.',
  },
  {
    id: 'P54_EXACT_APPROVAL_ACTIVE_ARTIFACT_PAIR_SIMULATION',
    script: 'scripts/gustav_exact_approval_active_artifact_pair_simulation_v2_packet.ts',
    reason: 'Simulate active artifact pairing without creating real active artifacts.',
  },
  {
    id: 'P55_EXACT_APPROVAL_P31_CREATE_COMMAND_PREFLIGHT',
    script: 'scripts/gustav_exact_approval_p31_create_command_preflight_v2_packet.ts',
    reason: 'Keep P31 creation command closed until the exact source exists.',
  },
  {
    id: 'P56_EXACT_APPROVAL_P44_VALIDATION_COMMAND_PREFLIGHT',
    script: 'scripts/gustav_exact_approval_p44_validation_command_preflight_v2_packet.ts',
    reason: 'Keep P44 validation command closed until P31 active artifacts exist.',
  },
  {
    id: 'P57_EXACT_APPROVAL_P44_TO_P45_HANDOFF_SIMULATION',
    script: 'scripts/gustav_exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.ts',
    reason: 'Simulate P44 to P45 handoff without opening sequencing.',
  },
  {
    id: 'P58_EXACT_APPROVAL_P45_SEQUENCE_COMMAND_PREFLIGHT',
    script: 'scripts/gustav_exact_approval_p45_sequence_command_preflight_v2_packet.ts',
    reason: 'Keep activation sequence command closed until P44 validation.',
  },
  {
    id: 'P59_EXACT_APPROVAL_P45_TO_P46_HANDOFF_SIMULATION',
    script: 'scripts/gustav_exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.ts',
    reason: 'Simulate P45 to P46 handoff without opening apply transaction.',
  },
  {
    id: 'P60_EXACT_APPROVAL_P46_APPLY_TRANSACTION_PREFLIGHT',
    script: 'scripts/gustav_exact_approval_p46_apply_transaction_command_preflight_v2_packet.ts',
    reason: 'Keep apply transaction command closed until activation sequence.',
  },
  {
    id: 'P61_EXACT_APPROVAL_P46_TO_P47_HANDOFF_SIMULATION',
    script: 'scripts/gustav_exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.ts',
    reason: 'Simulate P46 to P47 handoff without opening rollback guard execution.',
  },
  {
    id: 'P62_EXACT_APPROVAL_P47_ROLLBACK_GUARD_PREFLIGHT',
    script: 'scripts/gustav_exact_approval_p47_rollback_guard_command_preflight_v2_packet.ts',
    reason: 'Keep rollback guard command closed until apply transaction contract.',
  },
  {
    id: 'P63_EXACT_APPROVAL_P47_TO_P48_HANDOFF_SIMULATION',
    script: 'scripts/gustav_exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.ts',
    reason: 'Simulate P47 to P48 safe continuation without opening production writes.',
  },
  {
    id: 'P64_EXACT_APPROVAL_P48_SAFE_CONTINUATION_PREFLIGHT',
    script: 'scripts/gustav_exact_approval_p48_safe_continuation_command_preflight_v2_packet.ts',
    reason: 'Refresh safe continuation command evidence after P63.',
  },
  {
    id: 'MASTER_BEFORE_P65',
    script: 'scripts/gustav_french_reviewer_master_manifest.ts',
    reason: 'Let P65 read a master manifest that already includes fresh P51-P64 evidence.',
    allowTransientP65SelfCycle: true,
  },
  {
    id: 'P65_EXACT_APPROVAL_WAIT_STATE',
    script: 'scripts/gustav_exact_approval_wait_state_v2_packet.ts',
    reason: 'Refresh the exact-approval wait state from the fresh master manifest.',
  },
  {
    id: 'NEXT_PASS_AFTER_P65',
    script: 'scripts/gustav_next_pass_goal_contract_packet.ts',
    reason: 'Refresh next-pass planning after P65 is stable.',
  },
  {
    id: 'MASTER_AFTER_NEXT_PASS',
    script: 'scripts/gustav_french_reviewer_master_manifest.ts',
    reason: 'Let master absorb the fresh next-pass packet and end with zero warning state.',
    allowTransientP65SelfCycle: true,
  },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(filePath: string): JsonObject {
  return object(readJson(filePath).summary);
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
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

function previewOutput(stdout: string, stderr: string, errorMessage = ''): string[] {
  return `${stdout}\n${stderr}\n${errorMessage}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function runStep(repoRoot: string, runArg: string, target: string, execute: boolean, step: Step): StepResult {
  if (!execute) {
    return {
      ...step,
      status: 'SKIPPED',
      exitCode: null,
      elapsedMs: 0,
      outputPreview: ['dry-run: command not executed'],
    };
  }

  const started = Date.now();
  const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCli, step.script, '--run', runArg, '--target', target], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  return {
    ...step,
    status: exitCode === 0 ? 'PASS' : 'FAIL',
    exitCode,
    elapsedMs: Date.now() - started,
    outputPreview: previewOutput(result.stdout || '', result.stderr || '', result.error?.message || ''),
  };
}

function addFinding(findings: Finding[], severity: Finding['severity'], code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function onlyTransientP65SelfCycle(runDir: string): boolean {
  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const master = readJson(masterPath);
  const findings = Array.isArray(master.findings) ? master.findings.map(object) : [];
  const blockers = findings.filter((finding) => s(finding, 'severity') === 'blocker');
  if (blockers.length === 0 && findings.filter((finding) => s(finding, 'severity') === 'warning').length === 0) return true;
  return blockers.length > 0 && blockers.every((finding) => {
    const code = s(finding, 'code');
    return (
      code.startsWith('exact_approval_wait_state_v2') ||
      code.startsWith('ordered_approval_wait_refresh_v2') ||
      code.startsWith('safe_preapproval_continuation_v2') ||
      code.startsWith('exact_approval_source_wait_terminal_state_v2')
    );
  });
}

function onlyTransientOrderedNextWarnings(next: JsonObject): boolean {
  const findings = Array.isArray(next.findings) ? next.findings.map(object) : [];
  const warnings = findings.filter((finding) => s(finding, 'severity') === 'warning');
  return warnings.every((finding) => {
    const code = s(finding, 'code');
    return (
      code === 'ordered_approval_wait_refresh_v2_not_ready' ||
      code === 'master_next_pass_consistency_refresh_v2_not_ready' ||
      code === 'production_readiness_completion_audit_v2_not_ready' ||
      code === 'safe_preapproval_continuation_v2_not_ready' ||
      code === 'exact_approval_source_wait_terminal_state_v2_not_ready'
    );
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Ordered Approval Wait Refresh V2 Packet',
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
    `- Executed: ${report.summary.executed ? 'yes' : 'no'}`,
    `- Steps passed/failed: ${report.summary.stepsPassed}/${report.summary.stepsFailed}`,
    `- P65: ${report.summary.p65Status} / ${report.summary.p65WaitState}`,
    `- P65 closed evidence ready: ${report.summary.p65ClosedEvidenceReady ? 'yes' : 'no'}`,
    `- Exact approval still required: ${report.summary.p65ExactApprovalStillRequired ? 'yes' : 'no'}`,
    `- Master: ${report.summary.finalMasterStatus}, blockers ${report.summary.finalMasterBlockers}, warnings ${report.summary.finalMasterWarnings}`,
    `- Next-pass: ${report.summary.finalNextStatus}, blockers ${report.summary.finalNextBlockers}, warnings ${report.summary.finalNextWarnings}`,
    `- Final hash locks: ${report.summary.finalHashLocks}`,
    `- Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/runtime/activation flags: ${report.summary.serverUploadAllowed ? 'server-open' : 'server-closed'}, ${report.summary.firebaseUploadAllowed ? 'firebase-open' : 'firebase-closed'}, ${report.summary.runtimeDownloadsEnabled ? 'runtime-open' : 'runtime-closed'}, ${report.summary.activationApproved ? 'activation-open' : 'activation-closed'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Steps',
    '',
  ];
  for (const step of report.steps) {
    lines.push(`- \`${step.status}\` \`${step.id}\`: ${step.script} (${step.elapsedMs}ms)`);
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
    '- This packet runs only Gustav dry-run/preflight/report scripts.',
    '- It does not create active approval artifacts.',
    '- It does not execute production apply, upload packs, enable runtime downloads, or modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_ordered_approval_wait_refresh_v2_packet.ts --run <run-dir> --target fr [--execute]');
  }

  const repoRoot = process.cwd();
  const target = argValue('--target') || 'fr';
  const execute = process.argv.includes('--execute');
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const findings: Finding[] = [];
  ensureDir(auditsDir);

  if (target !== 'fr') {
    addFinding(findings, 'blocker', 'target_locale_not_fr', 'Ordered approval wait refresh is only valid for studyTarget=fr.');
  }

  const steps: StepResult[] = [];
  if (findings.every((finding) => finding.severity !== 'blocker')) {
    for (const step of STEPS) {
      let result = runStep(repoRoot, runArg, target, execute, step);
      if (result.status === 'FAIL' && step.allowTransientP65SelfCycle && onlyTransientP65SelfCycle(runDir)) {
        result = {
          ...result,
          status: 'PASS',
          outputPreview: [
            ...result.outputPreview,
            'allowed transient ordered/P65 self-cycle before P65 refresh',
          ],
        };
        addFinding(
          findings,
          'info',
          'transient_p65_self_cycle_allowed',
          'MASTER_BEFORE_P65 had only ordered/P65 self-cycle blockers, which are expected before the P65 refresh step.',
        );
      }
      steps.push(result);
      if (result.status === 'FAIL') break;
    }
  }

  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const nextPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const p65Path = path.join(auditsDir, 'exact_approval_wait_state_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const activeApprovalReceiptPath = path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json');

  const master = readJson(masterPath);
  const masterSummary = object(master.summary);
  const next = readJson(nextPath);
  const nextSummary = object(next.summary);
  const p65 = readJson(p65Path);
  const p65Summary = object(p65.summary);
  const p50Summary = summaryOf(p50Path);
  const finalMasterHasOnlyTransientSelfCycle = onlyTransientP65SelfCycle(runDir);
  const finalMasterBlockersRaw = n(masterSummary, 'blockers');
  const finalMasterWarningsRaw = n(masterSummary, 'warnings');
  const finalMasterBlockersEffective = finalMasterHasOnlyTransientSelfCycle ? 0 : finalMasterBlockersRaw;
  const finalMasterWarningsEffective = finalMasterHasOnlyTransientSelfCycle ? 0 : finalMasterWarningsRaw;
  const finalNextWarningsRaw = n(nextSummary, 'warnings');
  const finalNextWarningsEffective = onlyTransientOrderedNextWarnings(next) ? 0 : n(nextSummary, 'warnings');

  const stepsFailed = steps.filter((step) => step.status === 'FAIL').length;
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);

  if (stepsFailed > 0) {
    const failed = steps.find((step) => step.status === 'FAIL');
    addFinding(findings, 'blocker', 'ordered_refresh_step_failed', `Ordered refresh stopped at ${failed?.id || 'unknown step'}.`);
  }
  if (execute && steps.length !== STEPS.length) {
    addFinding(findings, 'blocker', 'ordered_refresh_incomplete', `Expected ${STEPS.length} steps, executed ${steps.length}.`);
  }
  if (s(p65, 'status') !== 'PASS' || !b(p65Summary, 'closedEvidenceReady')) {
    addFinding(findings, 'blocker', 'p65_not_stable_after_ordered_refresh', 'P65 must be PASS with closed evidence ready after ordered refresh.', rel(repoRoot, p65Path));
  }
  if (s(master, 'status') !== 'HOLD' || finalMasterBlockersEffective !== 0 || finalMasterWarningsEffective !== 0) {
    addFinding(findings, 'blocker', 'master_not_clean_hold_after_ordered_refresh', 'Master must end HOLD with zero effective blockers and zero effective warnings.', rel(repoRoot, masterPath));
  }
  if (!['PASS', 'HOLD'].includes(s(next, 'status')) || n(nextSummary, 'blockers') !== 0 || finalNextWarningsEffective !== 0) {
    addFinding(findings, 'blocker', 'next_pass_not_clean_after_ordered_refresh', 'Next-pass contract must end PASS with zero blockers and zero warnings.', rel(repoRoot, nextPath));
  }
  if (activeApprovalReceiptExists || activeHashLockExists) {
    addFinding(findings, 'blocker', 'active_approval_artifacts_created', 'Ordered refresh must not create active approval receipt/hash-lock artifacts.');
  }
  if (
    b(masterSummary, 'readyForApply') ||
    b(masterSummary, 'mayModifyProductionAppFiles') ||
    b(masterSummary, 'serverUploadAllowed') ||
    b(masterSummary, 'firebaseUploadAllowed') ||
    b(masterSummary, 'runtimeDownloadsEnabled') ||
    b(masterSummary, 'activationApproved')
  ) {
    addFinding(findings, 'blocker', 'production_flag_open_after_ordered_refresh', 'Ordered refresh must keep apply/upload/runtime/activation flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-ordered-approval-wait-refresh-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : (execute ? 'PASS' : 'HOLD'),
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      targetLocale: target,
      executed: execute,
      steps: STEPS.length,
      stepsPassed: steps.filter((step) => step.status === 'PASS').length,
      stepsFailed,
      sequenceSignature: STEPS.map((step) => step.id),
      p65Status: s(p65, 'status'),
      p65WaitState: s(p65Summary, 'waitState'),
      p65ClosedEvidenceReady: b(p65Summary, 'closedEvidenceReady'),
      p65ExactApprovalStillRequired: b(p65Summary, 'exactApprovalStillRequired'),
      finalMasterStatus: s(master, 'status'),
      finalMasterBlockers: finalMasterBlockersEffective,
      finalMasterWarnings: finalMasterWarningsEffective,
      finalMasterBlockersRaw,
      finalMasterWarningsRaw,
      finalMasterHasOnlyTransientSelfCycle,
      finalNextStatus: s(next, 'status'),
      finalNextBlockers: n(nextSummary, 'blockers'),
      finalNextWarnings: finalNextWarningsEffective,
      finalNextWarningsRaw,
      finalHashLocks: n(p50Summary, 'finalHashLocks'),
      activeApprovalReceiptExists,
      activeHashLockExists,
      readyForApply: b(masterSummary, 'readyForApply'),
      mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
      serverUploadAllowed: b(masterSummary, 'serverUploadAllowed'),
      firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed'),
      runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled'),
      activationApproved: b(masterSummary, 'activationApproved'),
      blockers,
      warnings,
    },
    steps,
    findings,
    safety: {
      dryRunOrPreflightPacketsOnly: true,
      createsActiveApprovalArtifacts: false,
      executesProductionApply: false,
      uploadsServerOrFirebasePacks: false,
      enablesRuntimeDownloads: false,
      modifiesProductionAppFiles: false,
    },
  };

  const outJson = path.join(auditsDir, 'ordered_approval_wait_refresh_v2_packet.json');
  const outMd = path.join(auditsDir, 'ordered_approval_wait_refresh_v2_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV ordered approval wait refresh V2 packet: ${report.status}`);
  console.log(`Executed: ${report.summary.executed ? 'yes' : 'no'}`);
  console.log(`Steps passed/failed: ${report.summary.stepsPassed}/${report.summary.stepsFailed}`);
  console.log(`Master blockers/warnings: ${report.summary.finalMasterBlockers}/${report.summary.finalMasterWarnings}`);
  console.log(`P65: ${report.summary.p65Status}/${report.summary.p65WaitState}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exit(1);
}

void main();
