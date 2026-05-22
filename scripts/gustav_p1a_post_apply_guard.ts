import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type GuardCommand = {
  id: string;
  command: string;
  purpose: string;
};

type GuardRule = {
  id: string;
  severity: Severity;
  rule: string;
  failureAction: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-post-apply-guard-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aMinimalApplyPacket: string;
    p1aTestExecutionAudit: string;
    readinessGate: string;
  };
  summary: {
    allowedFiles: number;
    allowedProductionFiles: number;
    allowedTestFiles: number;
    forbiddenWriteZones: number;
    guardRules: number;
    guardCommands: number;
    postApplyStatus: 'not_run';
    blockers: number;
    warnings: number;
    guardReadyAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  allowedFiles: string[];
  allowedProductionFiles: string[];
  allowedTestFiles: string[];
  forbiddenWriteZones: string[];
  guardRules: GuardRule[];
  commands: GuardCommand[];
  findings: Finding[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Post-Apply Guard',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Allowed files: ${audit.summary.allowedFiles}`,
    `- Allowed production files: ${audit.summary.allowedProductionFiles}`,
    `- Allowed test files: ${audit.summary.allowedTestFiles}`,
    `- Forbidden write zones: ${audit.summary.forbiddenWriteZones}`,
    `- Guard rules: ${audit.summary.guardRules}`,
    `- Guard commands: ${audit.summary.guardCommands}`,
    `- Post-apply status: \`${audit.summary.postApplyStatus}\``,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Guard ready after approval: ${audit.summary.guardReadyAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Allowed Files',
    '',
  ];

  for (const file of audit.allowedFiles) lines.push(`- \`${file}\``);

  lines.push('', '## Forbidden Write Zones', '');
  for (const zone of audit.forbiddenWriteZones) lines.push(`- \`${zone}\``);

  lines.push('', '## Guard Rules', '');
  for (const rule of audit.guardRules) {
    lines.push(`- \`${rule.id}\` (${rule.severity}): ${rule.rule}`);
    lines.push(`  - failure action: ${rule.failureAction}`);
  }

  lines.push('', '## Commands', '');
  for (const command of audit.commands) {
    lines.push(`- \`${command.id}\`: \`${command.command}\``);
    lines.push(`  - purpose: ${command.purpose}`);
  }

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
    }
  }

  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_post_apply_guard.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const testExecutionPath = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  const readinessPath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const testExecution = readJson<Record<string, unknown>>(testExecutionPath);
  const readiness = readJson<Record<string, unknown>>(readinessPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const testSummary = object(testExecution.summary);
  const readinessSummary = object(readiness.summary);
  const allowedFiles = arr<Record<string, unknown>>(packet.files).map((file) => str(file.path)).filter(Boolean).sort();
  const allowedProductionFiles = allowedFiles.filter((file) => file.startsWith('app/'));
  const allowedTestFiles = allowedFiles.filter((file) => file.startsWith('tests/'));

  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be PASS and readyForApproval before post-apply guard can be trusted.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (packet.approvalStatus !== 'not_requested') {
    findings.push({
      severity: 'warning',
      code: 'p1a_packet_approval_status_changed',
      message: `P1A post-apply guard was generated while approvalStatus=${String(packet.approvalStatus)}.`,
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (allowedFiles.length !== 4 || allowedProductionFiles.length !== 2 || allowedTestFiles.length !== 2) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_allowed_scope_invalid',
      message: `Expected 4 allowed files with 2 production and 2 test files, found ${allowedFiles.length}/${allowedProductionFiles.length}/${allowedTestFiles.length}.`,
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (testExecution.status !== 'PASS' || testSummary.testExecutableAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_tests_not_ready',
      message: 'P1A test execution audit must be PASS before post-apply guard can approve a future implementation.',
      filePath: path.relative(repoRoot, testExecutionPath),
    });
  }
  if (readinessSummary && Number(readinessSummary.failed) < 1) {
    findings.push({
      severity: 'warning',
      code: 'readiness_unexpectedly_open',
      message: 'Readiness no longer has failed checks; verify generation/apply gates before relying on this guard.',
      filePath: path.relative(repoRoot, readinessPath),
    });
  }

  const forbiddenWriteZones = [
    'generated/',
    'curriculum/',
    'research/',
    'source_graph/',
    'docs/gustav/runs/*/generated/',
    'app/lesson*_v2*',
    'app/lesson_words*',
    'app/quiz_data*',
    'app/cloud_sync.ts',
    'components/StudyTargetContext.tsx',
  ];

  const allowedArg = allowedFiles.join(' ');
  const guardRules: GuardRule[] = [
    {
      id: 'P1A-SCOPE-ONLY',
      severity: 'blocker',
      rule: 'A future P1A implementation may change only the four allowed packet files.',
      failureAction: 'Stop apply, record unexpected file list, and do not continue to P1B/P1C.',
    },
    {
      id: 'P1A-NO-FRENCH-GENERATION',
      severity: 'blocker',
      rule: 'No generated French content, lesson data, quiz data, source graph output or curriculum files may be created by P1A.',
      failureAction: 'Revert or isolate generated artifacts before any content workflow continues.',
    },
    {
      id: 'P1A-NO-DEV-BRIDGE',
      severity: 'blocker',
      rule: 'P1A may not modify StudyTargetContext, study_target_lang_dev, settings or spanish_content_gate; those belong to P1B.',
      failureAction: 'Move bridge changes into a separate reviewed P1B packet.',
    },
    {
      id: 'P1A-TESTS-MUST-RUN',
      severity: 'blocker',
      rule: 'P1A direct tests and dev-target companion regressions must pass before any later slice starts.',
      failureAction: 'Keep readiness HOLD and do not request generation approval.',
    },
    {
      id: 'P1A-BROAD-PLAN-STAYS-CLOSED',
      severity: 'blocker',
      rule: 'The broad 83-file apply plan remains unapproved; P1A approval cannot authorize it.',
      failureAction: 'Reject the apply transition and regenerate the minimal packet.',
    },
  ];

  const commands: GuardCommand[] = [
    {
      id: 'P1A_ALLOWED_STATUS',
      command: `git status --short -- ${allowedArg}`,
      purpose: 'Show status for the four allowed P1A files only.',
    },
    {
      id: 'P1A_UNEXPECTED_APP_TEST_CHANGES',
      command: 'git status --short -- app tests components hooks constants',
      purpose: 'List app/test/component changes; every returned path must be one of the four allowed P1A files before leaving the slice.',
    },
    {
      id: 'P1A_DIRECT_TESTS',
      command: 'npx jest --runTestsByPath tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts --no-cache --runInBand',
      purpose: 'Run direct P1A contract tests.',
    },
    {
      id: 'P1A_WITH_DEV_TARGET_REGRESSION',
      command: 'npx jest --runTestsByPath tests/gustav_surface_target_switch.test.ts tests/gustav_target_storage_keys.test.ts tests/study_target_lang_dev.test.ts tests/flashcard_content_lang.test.ts tests/storage.test.ts --no-cache --runInBand',
      purpose: 'Run P1A tests with dev en/es target and storage regressions.',
    },
    {
      id: 'P1A_READINESS_RECHECK',
      command: `node /private/tmp/gustav-build/gustav_readiness_gate.js --run docs/gustav/runs/${runId}`,
      purpose: 'Recompute Gustav readiness after P1A implementation.',
    },
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const guardReadyAfterApproval =
    blockers === 0 &&
    allowedFiles.length === 4 &&
    allowedProductionFiles.length === 2 &&
    allowedTestFiles.length === 2 &&
    guardRules.length >= 5 &&
    commands.length >= 5;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-post-apply-guard-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aMinimalApplyPacket: path.relative(repoRoot, packetPath),
      p1aTestExecutionAudit: path.relative(repoRoot, testExecutionPath),
      readinessGate: path.relative(repoRoot, readinessPath),
    },
    summary: {
      allowedFiles: allowedFiles.length,
      allowedProductionFiles: allowedProductionFiles.length,
      allowedTestFiles: allowedTestFiles.length,
      forbiddenWriteZones: forbiddenWriteZones.length,
      guardRules: guardRules.length,
      guardCommands: commands.length,
      postApplyStatus: 'not_run',
      blockers,
      warnings,
      guardReadyAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    allowedFiles,
    allowedProductionFiles,
    allowedTestFiles,
    forbiddenWriteZones,
    guardRules,
    commands,
    findings,
    notes: [
      'This guard is ready for a future approved P1A implementation, but it does not run post-apply checks yet.',
      'P1A implementation remains blocked until the minimal packet is explicitly approved.',
      'The guard intentionally keeps French generation and broad production apply closed.',
      'If the future implementation touches anything outside the four allowed files, Gustav must stop and audit the drift.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  const outMd = path.join(runDir, 'audits', 'p1a_post_apply_guard.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A post-apply guard: ${audit.status}`);
  console.log(`Allowed files: ${audit.summary.allowedFiles}`);
  console.log(`Forbidden write zones: ${audit.summary.forbiddenWriteZones}`);
  console.log(`Guard rules: ${audit.summary.guardRules}`);
  console.log(`Guard commands: ${audit.summary.guardCommands}`);
  console.log(`Guard ready after approval: ${audit.summary.guardReadyAfterApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
