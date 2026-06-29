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
  args?: string[];
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
  schemaVersion: 'gustav-safe-preapproval-continuation-v2-packet-v0';
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
    generatedContentStatus: string;
    generatedRows: number;
    generatedRowsWithFrench: number;
    generatedReadyForReviewer: boolean;
    generatedReadyForApply: boolean;
    languageIsolationStatus: string;
    languageIsolationBlockers: number;
    languageIsolationWarnings: number;
    officialSourceCoverageStatus: string;
    officialSourceRows: number;
    officialSourceRowRefs: number;
    officialSourceAi: number;
    officialSourceAiRefs: number;
    officialSourceFixtureProbesPassed: number;
    officialSourceFixtureProbes: number;
    readinessDecision: string;
    readinessFailedChecks: number;
    generationBlockers: number;
    applyBlockers: number;
    canStartFrenchGeneration: boolean;
    orderedApprovalWaitStatus: string;
    orderedApprovalWaitStepsPassed: number;
    orderedApprovalWaitStepsFailed: number;
    nextStatus: string;
    nextGoalId: string;
    consistencyStatus: string;
    consistencyFixtureProbesPassed: number;
    consistencyFixtureProbes: number;
    masterStatus: string;
    masterBlockers: number;
    masterWarnings: number;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
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
    reportOnly: true;
    createsActiveApprovalArtifacts: false;
    executesProductionApply: false;
    uploadsServerOrFirebasePacks: false;
    enablesRuntimeDownloads: false;
    modifiesProductionAppFiles: false;
  };
};

const STEPS: Step[] = [
  {
    id: 'P66_GENERATED_CONTENT_AUDIT_REFRESH',
    script: 'scripts/gustav_generated_content_audit.ts',
    reason: 'Refresh generated French content evidence before closed-mode readiness checks.',
  },
  {
    id: 'P66_LANGUAGE_ISOLATION_AUDIT_REFRESH',
    script: 'scripts/gustav_french_language_isolation_audit.ts',
    reason: 'Refresh French language isolation evidence.',
  },
  {
    id: 'P66_OFFICIAL_SOURCE_COVERAGE_REFRESH',
    script: 'scripts/gustav_french_official_source_content_coverage_v2_packet.ts',
    reason: 'Refresh LLM official-source coverage and trusted-source probes.',
    args: ['--target', 'fr'],
  },
  {
    id: 'P66_READINESS_GATE_REFRESH',
    script: 'scripts/gustav_readiness_gate.ts',
    reason: 'Refresh readiness decision after content/source/isolation evidence.',
  },
  {
    id: 'P66_READINESS_BLOCKER_REDUCTION_REFRESH',
    script: 'scripts/gustav_readiness_blocker_reduction_packet.ts',
    reason: 'Refresh generation/apply blocker summary.',
  },
  {
    id: 'P66_ORDERED_APPROVAL_WAIT_REFRESH',
    script: 'scripts/gustav_ordered_approval_wait_refresh_v2_packet.ts',
    reason: 'End the evidence pass by re-locking P50-P65 without active approval artifacts.',
    args: ['--target', 'fr', '--execute'],
  },
  {
    id: 'P66_NEXT_PASS_REFRESH',
    script: 'scripts/gustav_next_pass_goal_contract_packet.ts',
    reason: 'Refresh next-pass planning after the ordered approval wait sequence.',
    args: ['--target', 'fr'],
  },
  {
    id: 'P66_MASTER_NEXT_CONSISTENCY_REFRESH',
    script: 'scripts/gustav_master_next_pass_consistency_refresh_v2_packet.ts',
    reason: 'Refresh master/next consistency after P66 planning.',
    args: ['--target', 'fr'],
  },
  {
    id: 'P66_FINAL_NEXT_PASS_REFRESH',
    script: 'scripts/gustav_next_pass_goal_contract_packet.ts',
    reason: 'Let next-pass absorb the fresh consistency refresh.',
    args: ['--target', 'fr'],
  },
  {
    id: 'P66_FINAL_MASTER_REFRESH',
    script: 'scripts/gustav_french_reviewer_master_manifest.ts',
    reason: 'End with a fresh master manifest.',
    args: ['--target', 'fr'],
  },
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

function arr(value: JsonObject, key: string): JsonObject[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
}

function previewOutput(stdout: string, stderr: string, errorMessage = ''): string[] {
  return `${stdout}\n${stderr}\n${errorMessage}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function runStep(repoRoot: string, runArg: string, execute: boolean, step: Step): StepResult {
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
  const result = spawnSync(process.execPath, [tsxCli, step.script, '--run', runArg, ...(step.args || [])], {
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

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Safe Preapproval Continuation V2 Packet',
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
    `- Generated content: ${report.summary.generatedContentStatus}, rows ${report.summary.generatedRows}, French rows ${report.summary.generatedRowsWithFrench}, reviewer ${report.summary.generatedReadyForReviewer ? 'yes' : 'no'}, apply ${report.summary.generatedReadyForApply ? 'yes' : 'no'}`,
    `- Language isolation: ${report.summary.languageIsolationStatus}, blockers ${report.summary.languageIsolationBlockers}, warnings ${report.summary.languageIsolationWarnings}`,
    `- Official-source coverage rows/AI/probes: ${report.summary.officialSourceRows}/${report.summary.officialSourceRowRefs}, ${report.summary.officialSourceAi}/${report.summary.officialSourceAiRefs}, ${report.summary.officialSourceFixtureProbesPassed}/${report.summary.officialSourceFixtureProbes}`,
    `- Readiness: ${report.summary.readinessDecision}, failed ${report.summary.readinessFailedChecks}, generation blockers ${report.summary.generationBlockers}, apply blockers ${report.summary.applyBlockers}`,
    `- Can start French generation: ${report.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Ordered approval wait: ${report.summary.orderedApprovalWaitStatus}, passed ${report.summary.orderedApprovalWaitStepsPassed}, failed ${report.summary.orderedApprovalWaitStepsFailed}`,
    `- Next pass: ${report.summary.nextStatus}, goal ${report.summary.nextGoalId}`,
    `- Consistency: ${report.summary.consistencyStatus}, probes ${report.summary.consistencyFixtureProbesPassed}/${report.summary.consistencyFixtureProbes}`,
    `- Master: ${report.summary.masterStatus}, blockers ${report.summary.masterBlockers}, warnings ${report.summary.masterWarnings}`,
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
    '- This packet refreshes evidence and planning reports only.',
    '- It does not create active approval artifacts.',
    '- It does not execute production apply, upload packs, enable runtime downloads, or modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_safe_preapproval_continuation_v2_packet.ts --run <run-dir> --target fr [--execute]');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const target = argValue('--target') || 'fr';
  const execute = process.argv.includes('--execute');
  const auditsDir = path.join(runDir, 'audits');
  const findings: Finding[] = [];
  ensureDir(auditsDir);

  if (target !== 'fr') {
    addFinding(findings, 'blocker', 'target_locale_not_fr', 'Safe preapproval continuation is only valid for studyTarget=fr.');
  }

  const steps: StepResult[] = [];
  if (findings.every((finding) => finding.severity !== 'blocker')) {
    for (const step of STEPS) {
      const result = runStep(repoRoot, runArg, execute, step);
      steps.push(result);
      if (result.status === 'FAIL') break;
    }
  }

  const generatedPath = path.join(auditsDir, 'generated_content_audit.json');
  const isolationPath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const officialSourcePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'gustav_readiness_gate.json');
  const blockerReductionPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const orderedPath = path.join(auditsDir, 'ordered_approval_wait_refresh_v2_packet.json');
  const nextPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const consistencyPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const activeApprovalReceiptPath = path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json');

  const generated = readJson(generatedPath);
  const generatedSummary = object(generated.summary);
  const isolation = readJson(isolationPath);
  const isolationSummary = object(isolation.summary);
  const officialSource = readJson(officialSourcePath);
  const officialSourceSummary = object(officialSource.summary);
  const readiness = readJson(readinessPath);
  const readinessSummary = object(readiness.summary);
  const blockerReductionSummary = summaryOf(blockerReductionPath);
  const ordered = readJson(orderedPath);
  const orderedSummary = object(ordered.summary);
  const next = readJson(nextPath);
  const nextSummary = object(next.summary);
  const consistency = readJson(consistencyPath);
  const consistencySummary = object(consistency.summary);
  const master = readJson(masterPath);
  const masterSummary = object(master.summary);
  const nextGoalId = s(arr(next, 'nextPassGoals')[0] || {}, 'id');

  const stepsFailed = steps.filter((step) => step.status === 'FAIL').length;
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);
  const generationBlockers = n(blockerReductionSummary, 'generationBlockers') || n(readinessSummary, 'generationBlockers');
  const applyBlockers = n(blockerReductionSummary, 'applyBlockers') || n(readinessSummary, 'applyBlockers');

  if (stepsFailed > 0) addFinding(findings, 'blocker', 'safe_preapproval_step_failed', 'A P66 safe preapproval continuation step failed.');
  if (execute && steps.length !== STEPS.length) addFinding(findings, 'blocker', 'safe_preapproval_incomplete', `Expected ${STEPS.length} steps, executed ${steps.length}.`);
  if (s(generated, 'status') === 'BLOCK' || !b(generatedSummary, 'readyForReviewer') || b(generatedSummary, 'readyForApply')) {
    addFinding(findings, 'blocker', 'generated_content_not_closed_ready', 'Generated content must be reviewer-ready and apply-closed.', rel(repoRoot, generatedPath));
  }
  if (s(isolation, 'status') !== 'PASS' || n(isolationSummary, 'blockers') !== 0 || n(isolationSummary, 'warnings') !== 0) {
    addFinding(findings, 'blocker', 'language_isolation_not_clean', 'French language isolation must stay PASS with zero blockers/warnings.', rel(repoRoot, isolationPath));
  }
  if (
    s(officialSource, 'status') !== 'PASS' ||
    n(officialSourceSummary, 'acceptedRowOfficialSourceDecisionRows') !== 1600 ||
    n(officialSourceSummary, 'rowDecisionsWithSourceRefs') !== 1600 ||
    n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows') !== 164 ||
    n(officialSourceSummary, 'aiDecisionsWithTrustedSourceRefUrls') !== 164 ||
    n(officialSourceSummary, 'fixtureProbesPassed') !== n(officialSourceSummary, 'fixtureProbes')
  ) {
    addFinding(findings, 'blocker', 'official_source_coverage_not_clean', 'Official-source coverage must stay complete for rows and AI with all probes passing.', rel(repoRoot, officialSourcePath));
  }
  if (s(readiness, 'decision') !== 'GO' || generationBlockers !== 0 || applyBlockers !== 1) {
    addFinding(findings, 'blocker', 'readiness_not_generation_go_apply_hold', 'Readiness must stay GO for generation with exactly one apply blocker.', rel(repoRoot, readinessPath));
  }
  if (!b(blockerReductionSummary, 'canStartFrenchGeneration') || b(blockerReductionSummary, 'mayModifyProductionAppFiles')) {
    addFinding(findings, 'blocker', 'blocker_reduction_not_closed', 'Blocker reduction must allow generation and deny production app file modification.', rel(repoRoot, blockerReductionPath));
  }
  if (s(ordered, 'status') !== 'PASS' || n(orderedSummary, 'stepsFailed') !== 0 || b(orderedSummary, 'readyForApply')) {
    addFinding(findings, 'blocker', 'ordered_approval_wait_not_clean', 'Ordered approval wait must pass with zero failed steps and readyForApply=false.', rel(repoRoot, orderedPath));
  }
  if (s(next, 'status') === 'BLOCK' || n(nextSummary, 'blockers') !== 0 || !['NEXT-PASS-P66-SAFE-PREAPPROVAL-CONTINUATION-V2', 'NEXT-PASS-P67-FINAL-PRODUCTION-READINESS-GAP-V2'].includes(nextGoalId)) {
    addFinding(findings, 'blocker', 'next_pass_not_p66_clean', 'Next-pass must remain non-BLOCK and point to P66/P67 while exact approval is absent.', rel(repoRoot, nextPath));
  }
  if (s(consistency, 'status') !== 'PASS' || n(consistencySummary, 'fixtureProbesPassed') !== n(consistencySummary, 'fixtureProbes')) {
    addFinding(findings, 'blocker', 'consistency_not_clean', 'Master/next consistency must pass all probes.', rel(repoRoot, consistencyPath));
  }
  if (s(master, 'status') !== 'HOLD' || n(masterSummary, 'blockers') !== 0) {
    addFinding(findings, 'blocker', 'master_not_clean_hold', 'Master must stay HOLD with zero blockers.', rel(repoRoot, masterPath));
  }
  if (activeApprovalReceiptExists || activeHashLockExists) {
    addFinding(findings, 'blocker', 'active_approval_artifacts_created', 'P66 must not create active approval receipt/hash-lock artifacts.');
  }
  if (
    b(masterSummary, 'readyForApply') ||
    b(masterSummary, 'mayModifyProductionAppFiles') ||
    b(masterSummary, 'serverUploadAllowed') ||
    b(masterSummary, 'firebaseUploadAllowed') ||
    b(masterSummary, 'runtimeDownloadsEnabled') ||
    b(masterSummary, 'activationApproved')
  ) {
    addFinding(findings, 'blocker', 'production_flag_open', 'P66 must keep apply/upload/runtime/activation flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-safe-preapproval-continuation-v2-packet-v0',
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
      generatedContentStatus: s(generated, 'status'),
      generatedRows: n(generatedSummary, 'rows'),
      generatedRowsWithFrench: n(generatedSummary, 'rowsWithFrench'),
      generatedReadyForReviewer: b(generatedSummary, 'readyForReviewer'),
      generatedReadyForApply: b(generatedSummary, 'readyForApply'),
      languageIsolationStatus: s(isolation, 'status'),
      languageIsolationBlockers: n(isolationSummary, 'blockers'),
      languageIsolationWarnings: n(isolationSummary, 'warnings'),
      officialSourceCoverageStatus: s(officialSource, 'status'),
      officialSourceRows: n(officialSourceSummary, 'acceptedRowOfficialSourceDecisionRows'),
      officialSourceRowRefs: n(officialSourceSummary, 'rowDecisionsWithSourceRefs'),
      officialSourceAi: n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows'),
      officialSourceAiRefs: n(officialSourceSummary, 'aiDecisionsWithTrustedSourceRefUrls'),
      officialSourceFixtureProbesPassed: n(officialSourceSummary, 'fixtureProbesPassed'),
      officialSourceFixtureProbes: n(officialSourceSummary, 'fixtureProbes'),
      readinessDecision: s(readiness, 'decision'),
      readinessFailedChecks: n(readinessSummary, 'failed'),
      generationBlockers,
      applyBlockers,
      canStartFrenchGeneration: b(blockerReductionSummary, 'canStartFrenchGeneration'),
      orderedApprovalWaitStatus: s(ordered, 'status'),
      orderedApprovalWaitStepsPassed: n(orderedSummary, 'stepsPassed'),
      orderedApprovalWaitStepsFailed: n(orderedSummary, 'stepsFailed'),
      nextStatus: s(next, 'status'),
      nextGoalId,
      consistencyStatus: s(consistency, 'status'),
      consistencyFixtureProbesPassed: n(consistencySummary, 'fixtureProbesPassed'),
      consistencyFixtureProbes: n(consistencySummary, 'fixtureProbes'),
      masterStatus: s(master, 'status'),
      masterBlockers: n(masterSummary, 'blockers'),
      masterWarnings: n(masterSummary, 'warnings'),
      readyForApply: b(masterSummary, 'readyForApply'),
      mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
      activeApprovalReceiptExists,
      activeHashLockExists,
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
      reportOnly: true,
      createsActiveApprovalArtifacts: false,
      executesProductionApply: false,
      uploadsServerOrFirebasePacks: false,
      enablesRuntimeDownloads: false,
      modifiesProductionAppFiles: false,
    },
  };

  const outJson = path.join(auditsDir, 'safe_preapproval_continuation_v2_packet.json');
  const outMd = path.join(auditsDir, 'safe_preapproval_continuation_v2_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV safe preapproval continuation V2 packet: ${report.status}`);
  console.log(`Executed: ${report.summary.executed ? 'yes' : 'no'}`);
  console.log(`Steps passed/failed: ${report.summary.stepsPassed}/${report.summary.stepsFailed}`);
  console.log(`Generated rows/French: ${report.summary.generatedRows}/${report.summary.generatedRowsWithFrench}`);
  console.log(`Isolation blockers/warnings: ${report.summary.languageIsolationBlockers}/${report.summary.languageIsolationWarnings}`);
  console.log(`Official-source rows/AI/probes: ${report.summary.officialSourceRows}/${report.summary.officialSourceAi}/${report.summary.officialSourceFixtureProbesPassed}/${report.summary.officialSourceFixtureProbes}`);
  console.log(`Generation/apply blockers: ${report.summary.generationBlockers}/${report.summary.applyBlockers}`);
  console.log(`Next goal: ${report.summary.nextGoalId}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
