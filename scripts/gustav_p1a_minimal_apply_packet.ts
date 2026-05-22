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

type PacketFile = {
  path: string;
  action: 'add';
  role: 'study_target_model' | 'target_key_builder' | 'test_contract';
  phase: 'P1A';
  dirtyWorktreeOverlap: boolean;
  reason: string;
  exitCriteria: string[];
  rollbackAction: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-minimal-apply-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  approvalStatus: 'not_requested' | 'approved' | 'rejected';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aCoreContractSpec: string;
    p1aPreflightAudit: string;
    p1aTestExecutionAudit: string;
    broadApplyPlan: string;
  };
  summary: {
    files: number;
    productionFiles: number;
    testFiles: number;
    dirtyWorktreeOverlaps: number;
    commands: number;
    blockers: number;
    warnings: number;
    readyForApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  requiredApprovalText: string;
  files: PacketFile[];
  commands: Array<{
    id: string;
    command: string;
  }>;
  blockers: string[];
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

function roleForPath(filePath: string): PacketFile['role'] {
  if (filePath === 'app/study_target.ts') return 'study_target_model';
  if (filePath === 'app/target_storage_keys.ts') return 'target_key_builder';
  return 'test_contract';
}

function reasonForRole(role: PacketFile['role']): string {
  switch (role) {
    case 'study_target_model':
      return 'Add the production StudyTarget en/fr contract without touching the existing dev StudyTargetLang en/es path.';
    case 'target_key_builder':
      return 'Add target-safe storage key builders and raw key guard before any target-sensitive storage migration.';
    case 'test_contract':
      return 'Add direct P1A tests that prove target/sourceLocale separation, key distinctness, legacy English fallback limits and raw key rejection.';
  }
}

function exitCriteriaForRole(role: PacketFile['role']): string[] {
  switch (role) {
    case 'study_target_model':
      return [
        'StudyTarget accepts en/fr only.',
        'Default production target remains en.',
        'sourceLocale ru/uk cannot change studyTarget.',
        'dev StudyTargetLang es is not accepted as production French.',
      ];
    case 'target_key_builder':
      return [
        'Every allowed target domain produces distinct en/fr keys.',
        'sourceTargetKey includes both studyTarget and sourceLocale where required.',
        'legacyEnglishKey cannot produce French keys.',
        'assertTargetKey rejects raw target-sensitive v1 keys outside migration adapters.',
      ];
    case 'test_contract':
      return [
        'P1A direct Jest command passes.',
        'P1A with dev target regression command passes.',
        'No production route or storage consumer is modified in this packet.',
      ];
  }
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Minimal Apply Packet',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Approval: \`${audit.approvalStatus}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Files: ${audit.summary.files}`,
    `- Production files: ${audit.summary.productionFiles}`,
    `- Test files: ${audit.summary.testFiles}`,
    `- Dirty worktree overlaps: ${audit.summary.dirtyWorktreeOverlaps}`,
    `- Commands: ${audit.summary.commands}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Ready for approval: ${audit.summary.readyForApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Required Approval Text',
    '',
    `> ${audit.requiredApprovalText}`,
    '',
    '## Files',
    '',
  ];

  for (const file of audit.files) {
    lines.push(`### ${file.path}`);
    lines.push('');
    lines.push(`- Action: \`${file.action}\``);
    lines.push(`- Role: \`${file.role}\``);
    lines.push(`- Phase: \`${file.phase}\``);
    lines.push(`- Dirty worktree overlap: ${file.dirtyWorktreeOverlap ? 'yes' : 'no'}`);
    lines.push(`- Reason: ${file.reason}`);
    lines.push('- Exit criteria:');
    for (const criterion of file.exitCriteria) lines.push(`  - ${criterion}`);
    lines.push(`- Rollback: ${file.rollbackAction}`);
    lines.push('');
  }

  lines.push('## Commands', '');
  for (const command of audit.commands) lines.push(`- \`${command.id}\`: \`${command.command}\``);

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
    console.error('Usage: npx tsx scripts/gustav_p1a_minimal_apply_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const p1aPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const preflightPath = path.join(runDir, 'audits', 'p1a_preflight_audit.json');
  const testExecutionPath = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  const broadApplyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');

  const p1a = readJson<Record<string, unknown>>(p1aPath);
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const testExecution = readJson<Record<string, unknown>>(testExecutionPath);
  const broadApplyPlan = readJson<Record<string, unknown>>(broadApplyPlanPath);
  const findings: Finding[] = [];

  const firstSlice = object(p1a.firstSlice);
  const firstSliceFiles = arr<string>(firstSlice.files).map(String);
  const preflightSummary = object(preflight.summary);
  const testExecutionSummary = object(testExecution.summary);
  const broadApplyFiles = arr<Record<string, unknown>>(broadApplyPlan.files);
  const broadByPath = new Map(broadApplyFiles.map((file) => [str(file.path), file]));

  if (p1a.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1a_contract_not_pass',
      message: `P1A core contract spec must be PASS, found ${String(p1a.status)}.`,
      filePath: path.relative(repoRoot, p1aPath),
    });
  }
  if (preflight.status !== 'PASS' || preflightSummary.preflightReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_preflight_not_ready',
      message: 'P1A preflight must be PASS and ready for approval.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (testExecution.status !== 'PASS' || testExecutionSummary.testExecutableAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_tests_not_executable',
      message: 'P1A test execution audit must be PASS and executable after approval.',
      filePath: path.relative(repoRoot, testExecutionPath),
    });
  }
  if (firstSliceFiles.length !== 4) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_first_slice_size_invalid',
      message: `Expected exactly 4 first-slice files, found ${firstSliceFiles.length}.`,
      filePath: path.relative(repoRoot, p1aPath),
    });
  }

  const files: PacketFile[] = firstSliceFiles.map((filePath) => {
    const broadFile = broadByPath.get(filePath);
    const role = roleForPath(filePath);
    const dirtyWorktreeOverlap = broadFile?.dirtyWorktreeOverlap === true;
    if (!broadFile) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_file_missing_from_broad_apply_plan',
        message: 'P1A file is missing from the broad apply plan.',
        filePath,
      });
    }
    if (dirtyWorktreeOverlap) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_file_dirty_overlap',
        message: 'P1A minimal packet may not include dirty worktree overlaps.',
        filePath,
      });
    }
    if (broadFile && str(broadFile.action) !== 'add') {
      findings.push({
        severity: 'blocker',
        code: 'p1a_file_not_additive',
        message: `P1A minimal packet only permits add actions, found ${str(broadFile.action)}.`,
        filePath,
      });
    }
    return {
      path: filePath,
      action: 'add',
      role,
      phase: 'P1A',
      dirtyWorktreeOverlap,
      reason: reasonForRole(role),
      exitCriteria: exitCriteriaForRole(role),
      rollbackAction: 'Remove the newly added P1A file; no existing production state is migrated or deleted in this packet.',
    };
  });

  const commands = arr<Record<string, unknown>>(testExecution.commands).map((command) => ({
    id: str(command.id),
    command: str(command.command),
  })).filter((command) => command.id && command.command);

  if (!commands.some((command) => command.id === 'P1A_DIRECT_TESTS')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_direct_command_missing',
      message: 'P1A minimal packet must include P1A_DIRECT_TESTS command.',
      filePath: path.relative(repoRoot, testExecutionPath),
    });
  }
  if (!commands.some((command) => command.id === 'P1A_WITH_DEV_TARGET_REGRESSION')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_dev_regression_command_missing',
      message: 'P1A minimal packet must include P1A_WITH_DEV_TARGET_REGRESSION command.',
      filePath: path.relative(repoRoot, testExecutionPath),
    });
  }
  if (broadApplyPlan.mayModifyProductionAppFiles !== false || broadApplyPlan.mayStartFrenchGeneration !== false) {
    findings.push({
      severity: 'blocker',
      code: 'broad_apply_safety_flags_open',
      message: 'Broad apply plan safety flags must stay closed while creating a minimal packet.',
      filePath: path.relative(repoRoot, broadApplyPlanPath),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const productionFiles = files.filter((file) => file.path.startsWith('app/')).length;
  const testFiles = files.filter((file) => file.path.startsWith('tests/')).length;
  const dirtyWorktreeOverlaps = files.filter((file) => file.dirtyWorktreeOverlap).length;
  const readyForApproval =
    blockers === 0 &&
    files.length === 4 &&
    productionFiles === 2 &&
    testFiles === 2 &&
    dirtyWorktreeOverlaps === 0 &&
    commands.length >= 2;
  const requiredApprovalText = `User approved P1A minimal apply packet ${runId} on 2026-05-19. Approved file list: docs/gustav/runs/${runId}/apply_plan/p1a_minimal_apply_packet.json.`;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-minimal-apply-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    approvalStatus: 'not_requested',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aCoreContractSpec: path.relative(repoRoot, p1aPath),
      p1aPreflightAudit: path.relative(repoRoot, preflightPath),
      p1aTestExecutionAudit: path.relative(repoRoot, testExecutionPath),
      broadApplyPlan: path.relative(repoRoot, broadApplyPlanPath),
    },
    summary: {
      files: files.length,
      productionFiles,
      testFiles,
      dirtyWorktreeOverlaps,
      commands: commands.length,
      blockers,
      warnings,
      readyForApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    requiredApprovalText,
    files,
    commands,
    blockers: [
      'Approval has not been requested yet.',
      'Production app files must not be modified until approvalStatus becomes approved.',
    ],
    findings,
    notes: [
      'This packet narrows approval to the P1A first slice only.',
      'It does not approve the broad 83-file apply plan.',
      'It does not write product files, test files or French content.',
      'After approval, only the four packet files may be edited for P1A.',
    ],
  };

  const outJson = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const outMd = path.join(runDir, 'apply_plan', 'P1A_MINIMAL_APPLY_PACKET.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A minimal apply packet: ${audit.status}`);
  console.log(`Files: ${audit.summary.files}`);
  console.log(`Production files: ${audit.summary.productionFiles}`);
  console.log(`Test files: ${audit.summary.testFiles}`);
  console.log(`Dirty overlaps: ${audit.summary.dirtyWorktreeOverlaps}`);
  console.log(`Ready for approval: ${audit.summary.readyForApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
