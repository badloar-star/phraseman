import * as childProcess from 'node:child_process';
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

type BlueprintFile = {
  filePath: string;
  role: 'planned_production_file' | 'planned_test_file' | 'dry_run_runner';
  bytes: number;
  lineCount: number;
};

type Execution = {
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  logPath: string;
};

type AssertionGroup = {
  id: string;
  assertions: string[];
};

type Audit = {
  schemaVersion: 'gustav-p1a-implementation-blueprint-audit-v0';
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
    p1aCoreContractSpec: string;
    p1aKeyCollisionAudit: string;
    p1aImportContractAudit: string;
    p1aApprovalLockAudit: string;
  };
  summary: {
    blueprintFiles: number;
    plannedProductionFiles: number;
    plannedTestFiles: number;
    dryRunRunners: number;
    assertionGroups: number;
    assertions: number;
    compileCommands: number;
    runtimeCommands: number;
    blockers: number;
    warnings: number;
    compilePassed: boolean;
    runtimePassed: boolean;
    productionFilesStillAbsent: boolean;
    productionTestsStillAbsent: boolean;
    blueprintReadyAfterExactApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  blueprintRoot: string;
  buildRoot: string;
  blueprintFiles: BlueprintFile[];
  assertionGroups: AssertionGroup[];
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

function writeFile(root: string, relativePath: string, content: string): BlueprintFile {
  const outPath = path.join(root, relativePath);
  const normalized = content.trimStart() + '\n';
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, normalized);
  return {
    filePath: relativePath,
    role: relativePath.startsWith('app/')
      ? 'planned_production_file'
      : relativePath.startsWith('tests/')
        ? 'planned_test_file'
        : 'dry_run_runner',
    bytes: Buffer.byteLength(normalized, 'utf8'),
    lineCount: normalized.split('\n').length,
  };
}

function studyTargetSource(): string {
  return `
export type StudyTarget = 'en' | 'fr';
export type SourceLocale = 'ru' | 'uk';

export const STUDY_TARGETS = ['en', 'fr'] as const;
export const SOURCE_LOCALES = ['ru', 'uk'] as const;
export const DEFAULT_STUDY_TARGET = 'en' as const;
export const STUDY_TARGET_STORAGE_KEY = 'study_target_v1';

export function isStudyTarget(value: unknown): value is StudyTarget {
  return value === 'en' || value === 'fr';
}

export function assertStudyTarget(value: unknown): StudyTarget {
  if (isStudyTarget(value)) return value;
  throw new Error('Unsupported StudyTarget: ' + String(value));
}

export function defaultStudyTarget(): typeof DEFAULT_STUDY_TARGET {
  return DEFAULT_STUDY_TARGET;
}

export default function __StudyTargetRouteShim() {
  return null;
}
`;
}

function targetStorageKeysSource(domains: string[]): string {
  const domainList = domains.map((domain) => `'${domain}'`).join(', ');
  return `
import {
  SOURCE_LOCALES,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
  type SourceLocale,
  type StudyTarget,
} from './study_target';

export { assertStudyTarget, defaultStudyTarget, isStudyTarget };

export const TARGET_KEY_DOMAINS = [${domainList}] as const;
export type TargetKeyDomain = typeof TARGET_KEY_DOMAINS[number];

export const SOURCE_TARGET_KEY_DOMAINS = ['personal_practice'] as const;
export type SourceTargetKeyDomain = typeof SOURCE_TARGET_KEY_DOMAINS[number];

const SEP = '::';
const RAW_TARGET_SENSITIVE_PATTERNS = [
  'lesson_progress_v1',
  'lesson_words_v1',
  'unlocked_lessons',
  'lesson_session_v1',
  'trainer_store_v1',
  'mistake_log_v1',
  'active_recall_v1',
  'flashcards_v1',
  'level_exam_v1',
  'certificate_v1',
  'personal_practice_v1',
  'achievements_state',
  'daily_stats',
  'user_stats_v1',
];

function assertMember<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error('Unsupported ' + label + ': ' + value);
}

function encodeKeyPart(id: string | number): string {
  const raw = String(id);
  if (raw.length === 0) throw new Error('Empty target key id is not allowed');
  return encodeURIComponent(raw);
}

export function targetKey(domain: TargetKeyDomain, studyTarget: StudyTarget, id?: string | number): string {
  const safeDomain = assertMember(domain, TARGET_KEY_DOMAINS, 'TargetKeyDomain');
  const safeTarget = assertStudyTarget(studyTarget);
  const base = safeDomain + '_v2' + SEP + safeTarget;
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function sourceTargetKey(
  domain: SourceTargetKeyDomain,
  studyTarget: StudyTarget,
  sourceLocale: SourceLocale,
  id?: string | number,
): string {
  const safeDomain = assertMember(domain, SOURCE_TARGET_KEY_DOMAINS, 'SourceTargetKeyDomain');
  const safeTarget = assertStudyTarget(studyTarget);
  const safeSource = assertMember(sourceLocale, SOURCE_LOCALES, 'SourceLocale');
  const base = safeDomain + '_v2' + SEP + safeTarget + SEP + safeSource;
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function legacyEnglishKey(domain: TargetKeyDomain, id?: string | number): string {
  const safeDomain = assertMember(domain, TARGET_KEY_DOMAINS, 'TargetKeyDomain');
  const base = safeDomain + '_legacy_en';
  return id === undefined ? base : base + SEP + encodeKeyPart(id);
}

export function assertTargetKey(key: string): string {
  if (RAW_TARGET_SENSITIVE_PATTERNS.some((pattern) => key.includes(pattern))) {
    throw new Error('Raw target-sensitive key is blocked: ' + key);
  }
  return key;
}

export default function __TargetStorageKeysRouteShim() {
  return null;
}
`;
}

function surfaceTargetSwitchTestSource(): string {
  return `
import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  STUDY_TARGET_STORAGE_KEY,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
} from '../app/study_target';

describe('P1A production StudyTarget contract', () => {
  it('accepts only English and French production study targets', () => {
    expect(STUDY_TARGETS).toEqual(['en', 'fr']);
    expect(isStudyTarget('en')).toBe(true);
    expect(isStudyTarget('fr')).toBe(true);
    expect(isStudyTarget('es')).toBe(false);
    expect(() => assertStudyTarget('es')).toThrow(/Unsupported StudyTarget/);
  });

  it('keeps sourceLocale separate from studyTarget', () => {
    expect(SOURCE_LOCALES).toEqual(['ru', 'uk']);
    expect(DEFAULT_STUDY_TARGET).toBe('en');
    expect(defaultStudyTarget()).toBe('en');
    expect(STUDY_TARGET_STORAGE_KEY).toBe('study_target_v1');
  });
});
`;
}

function targetStorageKeysTestSource(): string {
  return `
import {
  assertTargetKey,
  legacyEnglishKey,
  sourceTargetKey,
  targetKey,
  type TargetKeyDomain,
} from '../app/target_storage_keys';

describe('P1A target storage key contract', () => {
  it('produces distinct target keys for English and French', () => {
    expect(targetKey('lesson_progress', 'en', '1')).toBe('lesson_progress_v2::en::1');
    expect(targetKey('lesson_progress', 'fr', '1')).toBe('lesson_progress_v2::fr::1');
    expect(targetKey('lesson_progress', 'en', '1')).not.toBe(targetKey('lesson_progress', 'fr', '1'));
  });

  it('keeps sourceLocale as a separate key segment only where required', () => {
    expect(sourceTargetKey('personal_practice', 'fr', 'ru', 'diagnosis-1')).toBe('personal_practice_v2::fr::ru::diagnosis-1');
    expect(sourceTargetKey('personal_practice', 'fr', 'uk', 'diagnosis-1')).toBe('personal_practice_v2::fr::uk::diagnosis-1');
  });

  it('keeps legacy English keys visibly English-only', () => {
    expect(legacyEnglishKey('lesson_progress', '1')).toBe('lesson_progress_legacy_en::1');
    expect(legacyEnglishKey('lesson_progress', '1')).not.toContain('fr');
  });

  it('encodes reserved id characters without leaking separators', () => {
    const key = targetKey('lesson_progress', 'fr', 'lesson::1/a?b=c#d&e=%25');
    expect(key).toBe('lesson_progress_v2::fr::lesson%3A%3A1%2Fa%3Fb%3Dc%23d%26e%3D%2525');
    expect(key.split('::')).toHaveLength(3);
  });

  it('rejects empty ids and raw target-sensitive keys', () => {
    expect(() => targetKey('lesson_progress', 'fr', '')).toThrow(/Empty target key id/);
    expect(() => assertTargetKey('lesson_progress_v1')).toThrow(/Raw target-sensitive key/);
    expect(assertTargetKey(targetKey('flashcards' as TargetKeyDomain, 'fr'))).toBe('flashcards_v2::fr');
  });
});
`;
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
  if (!condition) throw new Error('P1A blueprint assertion failed: ' + name);
}

function throws(name: string, fn: () => unknown, pattern: RegExp): void {
  try {
    fn();
  } catch (error) {
    check(name, pattern.test(String((error as Error).message)));
    return;
  }
  throw new Error('P1A blueprint assertion did not throw: ' + name);
}

check('study targets are en/fr', JSON.stringify(STUDY_TARGETS) === JSON.stringify(['en', 'fr']));
check('source locales are ru/uk', JSON.stringify(SOURCE_LOCALES) === JSON.stringify(['ru', 'uk']));
check('default target is en', DEFAULT_STUDY_TARGET === 'en' && defaultStudyTarget() === 'en');
check('fr is StudyTarget', isStudyTarget('fr'));
check('es is not StudyTarget', !isStudyTarget('es'));
throws('assertStudyTarget rejects es', () => assertStudyTarget('es'), /Unsupported StudyTarget/);

check('target key en', targetKey('lesson_progress', 'en', '1') === 'lesson_progress_v2::en::1');
check('target key fr', targetKey('lesson_progress', 'fr', '1') === 'lesson_progress_v2::fr::1');
check('target key distinct', targetKey('lesson_progress', 'en', '1') !== targetKey('lesson_progress', 'fr', '1'));
check('source target ru', sourceTargetKey('personal_practice', 'fr', 'ru', 'diagnosis-1') === 'personal_practice_v2::fr::ru::diagnosis-1');
check('source target uk', sourceTargetKey('personal_practice', 'fr', 'uk', 'diagnosis-1') === 'personal_practice_v2::fr::uk::diagnosis-1');
check('legacy English key', legacyEnglishKey('lesson_progress', '1') === 'lesson_progress_legacy_en::1');
check('legacy does not contain fr', !legacyEnglishKey('lesson_progress', '1').includes('fr'));

const encoded = targetKey('lesson_progress', 'fr', 'lesson::1/a?b=c#d&e=%25');
check('reserved id encoded', encoded === 'lesson_progress_v2::fr::lesson%3A%3A1%2Fa%3Fb%3Dc%23d%26e%3D%2525');
check('encoded id does not leak separator', encoded.split('::').length === 3);
throws('empty id rejected', () => targetKey('lesson_progress', 'fr', ''), /Empty target key id/);
throws('raw key rejected', () => assertTargetKey('lesson_progress_v1'), /Raw target-sensitive key/);
check('target key guard allows v2', assertTargetKey(targetKey('flashcards', 'fr')) === 'flashcards_v2::fr');

console.log('P1A blueprint runtime checks passed: 18');
`;
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

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Implementation Blueprint Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Blueprint files: ${audit.summary.blueprintFiles}`,
    `- Planned production files: ${audit.summary.plannedProductionFiles}`,
    `- Planned test files: ${audit.summary.plannedTestFiles}`,
    `- Dry-run runners: ${audit.summary.dryRunRunners}`,
    `- Assertion groups: ${audit.summary.assertionGroups}`,
    `- Assertions: ${audit.summary.assertions}`,
    `- Compile commands: ${audit.summary.compileCommands}`,
    `- Runtime commands: ${audit.summary.runtimeCommands}`,
    `- Compile passed: ${audit.summary.compilePassed ? 'yes' : 'no'}`,
    `- Runtime passed: ${audit.summary.runtimePassed ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Production tests still absent: ${audit.summary.productionTestsStillAbsent ? 'yes' : 'no'}`,
    `- Blueprint ready after exact approval: ${audit.summary.blueprintReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Blueprint Files',
    '',
  ];

  for (const file of audit.blueprintFiles) {
    lines.push(`- \`${file.filePath}\` (${file.role}, ${file.lineCount} lines)`);
  }

  lines.push('', '## Assertion Groups', '');
  for (const group of audit.assertionGroups) {
    lines.push(`### ${group.id}`);
    lines.push('');
    for (const assertion of group.assertions) lines.push(`- ${assertion}`);
    lines.push('');
  }

  lines.push('## Execution', '');
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
    console.error('Usage: npx tsx scripts/gustav_p1a_implementation_blueprint_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const coreContractPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const keyCollisionPath = path.join(runDir, 'audits', 'p1a_key_collision_audit.json');
  const importContractPath = path.join(runDir, 'audits', 'p1a_import_contract_audit.json');
  const approvalLockPath = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');

  const packet = readJson<Record<string, unknown>>(packetPath);
  const coreContract = readJson<Record<string, unknown>>(coreContractPath);
  const keyCollision = readJson<Record<string, unknown>>(keyCollisionPath);
  const importContract = readJson<Record<string, unknown>>(importContractPath);
  const approvalLock = readJson<Record<string, unknown>>(approvalLockPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const coreSummary = object(coreContract.summary);
  const keyCollisionSummary = object(keyCollision.summary);
  const importSummary = object(importContract.summary);
  const approvalSummary = object(approvalLock.summary);
  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true || packetSummary.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be ready and still locked before blueprint dry-run.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (coreContract.status !== 'PASS' || coreSummary.canImplementP1AContractsAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_core_contract_not_ready',
      message: 'P1A core contract must pass before implementation blueprint.',
      filePath: path.relative(repoRoot, coreContractPath),
    });
  }
  if (keyCollision.status !== 'PASS' || keyCollisionSummary.collisionSafeAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_collision_contract_not_ready',
      message: 'P1A key collision audit must pass before implementation blueprint.',
      filePath: path.relative(repoRoot, keyCollisionPath),
    });
  }
  if (importContract.status !== 'PASS' || importSummary.importSafeAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_import_contract_not_ready',
      message: 'P1A import contract must pass before implementation blueprint.',
      filePath: path.relative(repoRoot, importContractPath),
    });
  }
  if (approvalLock.status !== 'PASS' || approvalSummary.accidentalApplyBlocked !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_approval_lock_not_ready',
      message: 'P1A approval lock must pass before implementation blueprint.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }

  const targetDomains = arr<string>(object(coreContract.keyBuilderContract).allowedTargetDomains).map(String);
  const blueprintRoot = path.join(runDir, 'apply_plan', 'p1a_implementation_blueprint');
  const buildRoot = path.join('/private/tmp', `gustav-p1a-blueprint-${runId}`);
  fs.rmSync(buildRoot, { recursive: true, force: true });
  ensureDir(blueprintRoot);
  ensureDir(buildRoot);

  const blueprintFiles = [
    writeFile(blueprintRoot, 'app/study_target.ts', studyTargetSource()),
    writeFile(blueprintRoot, 'app/target_storage_keys.ts', targetStorageKeysSource(targetDomains)),
    writeFile(blueprintRoot, 'tests/gustav_surface_target_switch.test.ts', surfaceTargetSwitchTestSource()),
    writeFile(blueprintRoot, 'tests/gustav_target_storage_keys.test.ts', targetStorageKeysTestSource()),
    writeFile(blueprintRoot, 'blueprint_runtime_check.ts', runtimeCheckSource()),
  ];

  const sourceFiles = blueprintFiles.map((file) => path.join(blueprintRoot, file.filePath));
  const tscBin = fs.existsSync(path.join(repoRoot, 'node_modules', '.bin', 'tsc'))
    ? path.join(repoRoot, 'node_modules', '.bin', 'tsc')
    : 'npx';
  const tscArgs = tscBin === 'npx'
    ? ['tsc', '--target', 'es2018', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--esModuleInterop', '--skipLibCheck', '--types', 'jest', '--rootDir', blueprintRoot, '--outDir', buildRoot, ...sourceFiles]
    : ['--target', 'es2018', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--esModuleInterop', '--skipLibCheck', '--types', 'jest', '--rootDir', blueprintRoot, '--outDir', buildRoot, ...sourceFiles];
  const compileLog = path.join(blueprintRoot, 'compile.log');
  const compile = runCommand([tscBin, ...tscArgs], repoRoot, compileLog);
  if (compile.exitCode !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'blueprint_compile_failed',
      message: 'P1A implementation blueprint did not compile.',
      filePath: path.relative(repoRoot, compileLog),
    });
  }

  const runtimeLog = path.join(blueprintRoot, 'runtime.log');
  const runtime = compile.exitCode === 0
    ? runCommand(['node', path.join(buildRoot, 'blueprint_runtime_check.js')], repoRoot, runtimeLog)
    : {
        command: ['node', path.join(buildRoot, 'blueprint_runtime_check.js')],
        exitCode: null,
        stdout: '',
        stderr: 'Runtime skipped because compile failed.',
        logPath: runtimeLog,
      };
  if (runtime.exitCode !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'blueprint_runtime_failed',
      message: 'P1A implementation blueprint runtime checks did not pass.',
      filePath: path.relative(repoRoot, runtimeLog),
    });
  }

  const plannedProductionPaths = ['app/study_target.ts', 'app/target_storage_keys.ts'];
  const plannedTestPaths = ['tests/gustav_surface_target_switch.test.ts', 'tests/gustav_target_storage_keys.test.ts'];
  const productionFilesStillAbsent = plannedProductionPaths.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  const productionTestsStillAbsent = plannedTestPaths.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  if (!productionFilesStillAbsent || !productionTestsStillAbsent) {
    findings.push({
      severity: 'blocker',
      code: 'production_files_created_outside_blueprint',
      message: 'P1A blueprint audit found planned production files already created outside docs/gustav.',
    });
  }

  const assertionGroups: AssertionGroup[] = [
    {
      id: 'P1A-STUDY-TARGET-BLUEPRINT',
      assertions: [
        'StudyTarget accepts en/fr only.',
        'StudyTarget rejects es and missing unsupported values.',
        'sourceLocale remains ru/uk and does not replace StudyTarget.',
        'Default production target remains en.',
      ],
    },
    {
      id: 'P1A-TARGET-KEY-BLUEPRINT',
      assertions: [
        'targetKey creates distinct en/fr keys.',
        'sourceTargetKey includes target and sourceLocale.',
        'legacyEnglishKey remains visibly English-only.',
        'reserved id characters are encoded with no separator leaks.',
        'empty ids and raw v1 target-sensitive keys are rejected.',
      ],
    },
    {
      id: 'P1A-RUNTIME-BLUEPRINT',
      assertions: [
        'Compiled blueprint runtime executes 18 direct checks.',
        'Blueprint files remain in docs/gustav only.',
        'Production app and test files remain absent before exact approval.',
      ],
    },
  ];
  const assertions = assertionGroups.reduce((sum, group) => sum + group.assertions.length, 0);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const blueprintReadyAfterExactApproval =
    blockers === 0 &&
    compile.exitCode === 0 &&
    runtime.exitCode === 0 &&
    productionFilesStillAbsent &&
    productionTestsStillAbsent &&
    blueprintFiles.length === 5;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-implementation-blueprint-audit-v0',
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
      p1aCoreContractSpec: path.relative(repoRoot, coreContractPath),
      p1aKeyCollisionAudit: path.relative(repoRoot, keyCollisionPath),
      p1aImportContractAudit: path.relative(repoRoot, importContractPath),
      p1aApprovalLockAudit: path.relative(repoRoot, approvalLockPath),
    },
    summary: {
      blueprintFiles: blueprintFiles.length,
      plannedProductionFiles: blueprintFiles.filter((file) => file.role === 'planned_production_file').length,
      plannedTestFiles: blueprintFiles.filter((file) => file.role === 'planned_test_file').length,
      dryRunRunners: blueprintFiles.filter((file) => file.role === 'dry_run_runner').length,
      assertionGroups: assertionGroups.length,
      assertions,
      compileCommands: 1,
      runtimeCommands: 1,
      blockers,
      warnings,
      compilePassed: compile.exitCode === 0,
      runtimePassed: runtime.exitCode === 0,
      productionFilesStillAbsent,
      productionTestsStillAbsent,
      blueprintReadyAfterExactApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    blueprintRoot: path.relative(repoRoot, blueprintRoot),
    buildRoot,
    blueprintFiles: blueprintFiles.map((file) => ({
      ...file,
      filePath: path.join(path.relative(repoRoot, blueprintRoot), file.filePath),
    })),
    assertionGroups,
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
      'This audit writes exact P1A implementation blueprints only inside docs/gustav/runs.',
      'The production app/study_target.ts, app/target_storage_keys.ts and tests remain absent until exact approval.',
      'The blueprint compiles Jest-shaped future tests and executes a direct runtime check outside production.',
      'French generation remains blocked until target isolation and generated-content gates pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_implementation_blueprint_audit.md');
  const blueprintMd = path.join(blueprintRoot, 'README.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(blueprintMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A implementation blueprint audit: ${audit.status}`);
  console.log(`Blueprint files: ${audit.summary.blueprintFiles}`);
  console.log(`Compile passed: ${audit.summary.compilePassed ? 'yes' : 'no'}`);
  console.log(`Runtime passed: ${audit.summary.runtimePassed ? 'yes' : 'no'}`);
  console.log(`Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`);
  console.log(`Blueprint ready after exact approval: ${audit.summary.blueprintReadyAfterExactApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
