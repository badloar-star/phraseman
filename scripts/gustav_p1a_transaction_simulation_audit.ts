import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
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

type SimulatedFile = {
  sourcePath: string;
  targetPath: string;
  simulatedPath: string;
  expectedSha256: string;
  actualSha256: string;
  copied: boolean;
  hashVerified: boolean;
  rolledBack: boolean;
};

type Execution = {
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  logPath: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-transaction-simulation-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aApplyTransactionAudit: string;
    p1aBlueprintHashLockAudit: string;
    p1aImplementationBlueprintAudit: string;
  };
  summary: {
    simulatedFiles: number;
    copiedFiles: number;
    hashVerifiedFiles: number;
    compileCommands: number;
    runtimeCommands: number;
    rollbackActions: number;
    rolledBackFiles: number;
    remainingSimulatedTargetFiles: number;
    blockers: number;
    warnings: number;
    copySimulationPassed: boolean;
    hashSimulationPassed: boolean;
    compilePassed: boolean;
    runtimePassed: boolean;
    rollbackSimulationPassed: boolean;
    transactionSimulationPassed: boolean;
    productionFilesStillAbsent: boolean;
    productionTestsStillAbsent: boolean;
    dryRunOnly: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  simulationRoot: string;
  buildRoot: string;
  reportRoot: string;
  simulatedFiles: SimulatedFile[];
  compile: Execution;
  runtime: Execution;
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function runCommand(command: string[], cwd: string, logPath: string): Execution {
  const result = childProcess.spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: 'utf8',
  });
  fs.writeFileSync(logPath, [
    `$ ${command.join(' ')}`,
    '',
    '## stdout',
    result.stdout || '',
    '',
    '## stderr',
    result.stderr || '',
    '',
    `exitCode=${String(result.status)}`,
  ].join('\n'));
  return {
    command,
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    logPath,
  };
}

function runtimeCheckSource(): string {
  return `
import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
} from './app/study_target';
import {
  assertTargetKey,
  legacyEnglishKey,
  sourceTargetKey,
  targetKey,
} from './app/target_storage_keys';

function check(name: string, condition: boolean): void {
  if (!condition) throw new Error('P1A transaction simulation failed: ' + name);
}

function throws(name: string, fn: () => unknown, pattern: RegExp): void {
  try {
    fn();
  } catch (error) {
    check(name, pattern.test(String((error as Error).message)));
    return;
  }
  throw new Error('P1A transaction simulation did not throw: ' + name);
}

check('study targets are en/fr', JSON.stringify(STUDY_TARGETS) === JSON.stringify(['en', 'fr']));
check('source locales are ru/uk', JSON.stringify(SOURCE_LOCALES) === JSON.stringify(['ru', 'uk']));
check('default target is en', DEFAULT_STUDY_TARGET === 'en' && defaultStudyTarget() === 'en');
check('fr accepted', isStudyTarget('fr'));
check('es rejected', !isStudyTarget('es'));
throws('assertStudyTarget rejects es', () => assertStudyTarget('es'), /Unsupported StudyTarget/);
check('target en', targetKey('lesson_progress', 'en', '1') === 'lesson_progress_v2::en::1');
check('target fr', targetKey('lesson_progress', 'fr', '1') === 'lesson_progress_v2::fr::1');
check('target distinct', targetKey('lesson_progress', 'en', '1') !== targetKey('lesson_progress', 'fr', '1'));
check('source target ru', sourceTargetKey('personal_practice', 'fr', 'ru', 'diagnosis-1') === 'personal_practice_v2::fr::ru::diagnosis-1');
check('source target uk', sourceTargetKey('personal_practice', 'fr', 'uk', 'diagnosis-1') === 'personal_practice_v2::fr::uk::diagnosis-1');
check('legacy English', legacyEnglishKey('lesson_progress', '1') === 'lesson_progress_legacy_en::1');
check('legacy not fr', !legacyEnglishKey('lesson_progress', '1').includes('fr'));
const encoded = targetKey('lesson_progress', 'fr', 'lesson::1/a?b=c#d&e=%25');
check('reserved id encoded', encoded === 'lesson_progress_v2::fr::lesson%3A%3A1%2Fa%3Fb%3Dc%23d%26e%3D%2525');
check('separator not leaked', encoded.split('::').length === 3);
throws('empty id rejected', () => targetKey('lesson_progress', 'fr', ''), /Empty target key id/);
throws('raw key rejected', () => assertTargetKey('lesson_progress_v1'), /Raw target-sensitive key/);
check('v2 key allowed', assertTargetKey(targetKey('flashcards', 'fr')) === 'flashcards_v2::fr');

console.log('P1A transaction simulation runtime checks passed: 18');
`;
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Transaction Simulation Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Simulated files: ${audit.summary.simulatedFiles}`,
    `- Copied files: ${audit.summary.copiedFiles}`,
    `- Hash verified files: ${audit.summary.hashVerifiedFiles}`,
    `- Compile commands: ${audit.summary.compileCommands}`,
    `- Runtime commands: ${audit.summary.runtimeCommands}`,
    `- Rollback actions: ${audit.summary.rollbackActions}`,
    `- Rolled back files: ${audit.summary.rolledBackFiles}`,
    `- Remaining simulated target files: ${audit.summary.remainingSimulatedTargetFiles}`,
    `- Copy simulation passed: ${audit.summary.copySimulationPassed ? 'yes' : 'no'}`,
    `- Hash simulation passed: ${audit.summary.hashSimulationPassed ? 'yes' : 'no'}`,
    `- Compile passed: ${audit.summary.compilePassed ? 'yes' : 'no'}`,
    `- Runtime passed: ${audit.summary.runtimePassed ? 'yes' : 'no'}`,
    `- Rollback simulation passed: ${audit.summary.rollbackSimulationPassed ? 'yes' : 'no'}`,
    `- Transaction simulation passed: ${audit.summary.transactionSimulationPassed ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Production tests still absent: ${audit.summary.productionTestsStillAbsent ? 'yes' : 'no'}`,
    `- Dry-run only: ${audit.summary.dryRunOnly ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Simulated Files',
    '',
  ];

  for (const file of audit.simulatedFiles) {
    lines.push(`- \`${file.targetPath}\`: copied ${file.copied ? 'yes' : 'no'}, hash ${file.hashVerified ? 'yes' : 'no'}, rollback ${file.rolledBack ? 'yes' : 'no'}`);
  }

  lines.push('', '## Execution', '');
  lines.push(`- Simulation root: \`${audit.simulationRoot}\``);
  lines.push(`- Build root: \`${audit.buildRoot}\``);
  lines.push(`- Compile exit code: \`${String(audit.compile.exitCode)}\``);
  lines.push(`- Compile log: \`${audit.compile.logPath}\``);
  lines.push(`- Runtime exit code: \`${String(audit.runtime.exitCode)}\``);
  lines.push(`- Runtime log: \`${audit.runtime.logPath}\``);

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
    console.error('Usage: npx tsx scripts/gustav_p1a_transaction_simulation_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const transactionPath = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.json');
  const hashLockPath = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.json');
  const blueprintAuditPath = path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.json');
  const transaction = readJson<Record<string, unknown>>(transactionPath);
  const hashLock = readJson<Record<string, unknown>>(hashLockPath);
  const blueprintAudit = readJson<Record<string, unknown>>(blueprintAuditPath);
  const findings: Finding[] = [];

  const transactionSummary = object(transaction.summary);
  const hashSummary = object(hashLock.summary);
  const blueprintSummary = object(blueprintAudit.summary);
  if (transaction.status !== 'PASS' || transactionSummary.transactionReadyAfterExactApproval !== true || transactionSummary.canApplyNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'transaction_not_ready_for_simulation',
      message: 'P1A apply transaction must be PASS, locked and dry-run before simulation.',
      filePath: path.relative(repoRoot, transactionPath),
    });
  }
  if (hashLock.status !== 'PASS' || hashSummary.hashLockReadyAfterExactApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'hash_lock_not_ready_for_simulation',
      message: 'P1A hash lock must be PASS before transaction simulation.',
      filePath: path.relative(repoRoot, hashLockPath),
    });
  }
  if (blueprintAudit.status !== 'PASS' || blueprintSummary.blueprintReadyAfterExactApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'blueprint_not_ready_for_simulation',
      message: 'P1A implementation blueprint must be PASS before transaction simulation.',
      filePath: path.relative(repoRoot, blueprintAuditPath),
    });
  }

  const simulationRoot = path.join('/private/tmp', `gustav-p1a-transaction-sim-${runId}`);
  const buildRoot = path.join('/private/tmp', `gustav-p1a-transaction-sim-build-${runId}`);
  const reportRoot = path.join(runDir, 'audits', 'p1a_transaction_simulation');
  fs.rmSync(simulationRoot, { recursive: true, force: true });
  fs.rmSync(buildRoot, { recursive: true, force: true });
  ensureDir(simulationRoot);
  ensureDir(buildRoot);
  ensureDir(reportRoot);

  const copySteps = arr<Record<string, unknown>>(transaction.transactionSteps)
    .filter((step) => step.phase === 'copy');
  const simulatedFiles: SimulatedFile[] = [];
  for (const step of copySteps) {
    const sourcePath = str(step.sourcePath);
    const targetPath = str(step.targetPath);
    const expectedSha256 = str(step.expectedSha256);
    const sourceAbs = path.resolve(repoRoot, sourcePath);
    const simulatedPath = path.join(simulationRoot, targetPath);
    if (!fs.existsSync(sourceAbs)) {
      findings.push({
        severity: 'blocker',
        code: 'simulation_source_missing',
        message: `Simulation source is missing: ${sourcePath}`,
        filePath: sourcePath,
      });
      continue;
    }
    ensureDir(path.dirname(simulatedPath));
    fs.copyFileSync(sourceAbs, simulatedPath);
    const actualSha256 = sha256(simulatedPath);
    const hashVerified = actualSha256 === expectedSha256;
    if (!hashVerified) {
      findings.push({
        severity: 'blocker',
        code: 'simulation_hash_mismatch',
        message: `Simulated copy hash mismatch for ${targetPath}.`,
        filePath: targetPath,
      });
    }
    simulatedFiles.push({
      sourcePath,
      targetPath,
      simulatedPath,
      expectedSha256,
      actualSha256,
      copied: fs.existsSync(simulatedPath),
      hashVerified,
      rolledBack: false,
    });
  }

  const runtimeCheckPath = path.join(simulationRoot, 'transaction_runtime_check.ts');
  fs.writeFileSync(runtimeCheckPath, runtimeCheckSource().trimStart() + '\n');
  const tscBin = fs.existsSync(path.join(repoRoot, 'node_modules', '.bin', 'tsc'))
    ? path.join(repoRoot, 'node_modules', '.bin', 'tsc')
    : 'npx';
  const sourceFiles = simulatedFiles.map((file) => file.simulatedPath).concat(runtimeCheckPath);
  const tscArgs = tscBin === 'npx'
    ? ['tsc', '--target', 'es2018', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--esModuleInterop', '--skipLibCheck', '--types', 'jest', '--rootDir', simulationRoot, '--outDir', buildRoot, ...sourceFiles]
    : ['--target', 'es2018', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--esModuleInterop', '--skipLibCheck', '--types', 'jest', '--rootDir', simulationRoot, '--outDir', buildRoot, ...sourceFiles];
  const compileLog = path.join(reportRoot, 'compile.log');
  const compile = runCommand([tscBin, ...tscArgs], repoRoot, compileLog);
  if (compile.exitCode !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'simulation_compile_failed',
      message: 'P1A transaction simulation compile failed.',
      filePath: path.relative(repoRoot, compileLog),
    });
  }

  const runtimeLog = path.join(reportRoot, 'runtime.log');
  const runtime = compile.exitCode === 0
    ? runCommand(['node', path.join(buildRoot, 'transaction_runtime_check.js')], repoRoot, runtimeLog)
    : {
        command: ['node', path.join(buildRoot, 'transaction_runtime_check.js')],
        exitCode: null,
        stdout: '',
        stderr: 'Runtime skipped because compile failed.',
        logPath: runtimeLog,
      };
  if (runtime.exitCode !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'simulation_runtime_failed',
      message: 'P1A transaction simulation runtime check failed.',
      filePath: path.relative(repoRoot, runtimeLog),
    });
  }

  let rollbackActions = 0;
  for (const file of simulatedFiles) {
    if (fs.existsSync(file.simulatedPath)) {
      fs.unlinkSync(file.simulatedPath);
      rollbackActions += 1;
    }
    file.rolledBack = !fs.existsSync(file.simulatedPath);
  }
  const remainingSimulatedTargetFiles = simulatedFiles.filter((file) => fs.existsSync(file.simulatedPath)).length;
  if (remainingSimulatedTargetFiles > 0) {
    findings.push({
      severity: 'blocker',
      code: 'simulation_rollback_incomplete',
      message: `${remainingSimulatedTargetFiles} simulated target file(s) remain after rollback.`,
    });
  }

  const productionFilesStillAbsent = ['app/study_target.ts', 'app/target_storage_keys.ts']
    .every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  const productionTestsStillAbsent = ['tests/gustav_surface_target_switch.test.ts', 'tests/gustav_target_storage_keys.test.ts']
    .every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  if (!productionFilesStillAbsent || !productionTestsStillAbsent) {
    findings.push({
      severity: 'blocker',
      code: 'simulation_touched_production',
      message: 'P1A transaction simulation found planned production files in the real repo.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const copiedFiles = simulatedFiles.filter((file) => file.copied).length;
  const hashVerifiedFiles = simulatedFiles.filter((file) => file.hashVerified).length;
  const rolledBackFiles = simulatedFiles.filter((file) => file.rolledBack).length;
  const transactionSimulationPassed =
    blockers === 0 &&
    simulatedFiles.length === 4 &&
    copiedFiles === 4 &&
    hashVerifiedFiles === 4 &&
    compile.exitCode === 0 &&
    runtime.exitCode === 0 &&
    rollbackActions === 4 &&
    rolledBackFiles === 4 &&
    remainingSimulatedTargetFiles === 0 &&
    productionFilesStillAbsent &&
    productionTestsStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-transaction-simulation-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aApplyTransactionAudit: path.relative(repoRoot, transactionPath),
      p1aBlueprintHashLockAudit: path.relative(repoRoot, hashLockPath),
      p1aImplementationBlueprintAudit: path.relative(repoRoot, blueprintAuditPath),
    },
    summary: {
      simulatedFiles: simulatedFiles.length,
      copiedFiles,
      hashVerifiedFiles,
      compileCommands: 1,
      runtimeCommands: 1,
      rollbackActions,
      rolledBackFiles,
      remainingSimulatedTargetFiles,
      blockers,
      warnings,
      copySimulationPassed: copiedFiles === 4,
      hashSimulationPassed: hashVerifiedFiles === 4,
      compilePassed: compile.exitCode === 0,
      runtimePassed: runtime.exitCode === 0,
      rollbackSimulationPassed: rollbackActions === 4 && rolledBackFiles === 4 && remainingSimulatedTargetFiles === 0,
      transactionSimulationPassed,
      productionFilesStillAbsent,
      productionTestsStillAbsent,
      dryRunOnly: true,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    simulationRoot,
    buildRoot,
    reportRoot: path.relative(repoRoot, reportRoot),
    simulatedFiles,
    compile: {
      ...compile,
      command: compile.command.map((part) => part.startsWith(repoRoot) ? path.relative(repoRoot, part) : part),
      logPath: path.relative(repoRoot, compile.logPath),
    },
    runtime: {
      ...runtime,
      logPath: path.relative(repoRoot, runtime.logPath),
    },
    findings,
    notes: [
      'This audit simulates P1A apply in /private/tmp only; it does not copy files into the real app or tests folders.',
      'The simulation copies locked blueprint files, verifies SHA-256, compiles, runs runtime checks and rolls back simulated target files.',
      'canApplyNow remains false because exact approval is still absent.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.md');
  const simMd = path.join(reportRoot, 'README.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(simMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A transaction simulation audit: ${audit.status}`);
  console.log(`Simulated files: ${audit.summary.simulatedFiles}`);
  console.log(`Copied files: ${audit.summary.copiedFiles}`);
  console.log(`Hash verified files: ${audit.summary.hashVerifiedFiles}`);
  console.log(`Compile passed: ${audit.summary.compilePassed ? 'yes' : 'no'}`);
  console.log(`Runtime passed: ${audit.summary.runtimePassed ? 'yes' : 'no'}`);
  console.log(`Rolled back files: ${audit.summary.rolledBackFiles}`);
  console.log(`Transaction simulation passed: ${audit.summary.transactionSimulationPassed ? 'yes' : 'no'}`);
  console.log(`Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
