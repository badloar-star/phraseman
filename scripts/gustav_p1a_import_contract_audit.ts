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

type ModuleContract = {
  filePath: string;
  role: 'study_target_model' | 'target_key_builder';
  importsFrom: string[];
  exports: string[];
  defaultRouteShim: string;
  forbiddenImports: string[];
};

type TestImportContract = {
  filePath: string;
  importPath: string;
  importedNames: string[];
  importedTypes: string[];
  mustNotImport: string[];
};

type DependencyEdge = {
  from: string;
  to: string;
  kind: 'runtime_import' | 'type_import' | 'test_import';
};

type CompileProbe = {
  dir: string;
  files: string[];
  command: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  logPath: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-import-contract-audit-v0';
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
    p1aTestExecutionAudit: string;
    p1aExpoRouteSafetyAudit: string;
    p1aKeyCollisionAudit: string;
    packageJson: string;
  };
  summary: {
    plannedModules: number;
    plannedTestFiles: number;
    importEdges: number;
    dependencyCycles: number;
    forbiddenCycles: number;
    routeShimContracts: number;
    probeFiles: number;
    compileCommands: number;
    blockers: number;
    warnings: number;
    compilePassed: boolean;
    jestImportPathCompatible: boolean;
    importSafeAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  moduleContracts: ModuleContract[];
  testImportContracts: TestImportContract[];
  dependencyEdges: DependencyEdge[];
  dependencyCycles: string[][];
  compileProbe: CompileProbe;
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function hasStatusPass(value: Record<string, unknown>, safetyFlag?: string): boolean {
  const summary = object(value.summary);
  return value.status === 'PASS' && (!safetyFlag || summary[safetyFlag] === true);
}

function writeProbeFile(root: string, relativePath: string, content: string): string {
  const outPath = path.join(root, relativePath);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, content.trimStart() + '\n');
  return outPath;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function findCycles(edges: DependencyEdge[]): string[][] {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.to]);
    if (!graph.has(edge.to)) graph.set(edge.to, []);
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(node: string): void {
    if (visiting.has(node)) {
      const index = stack.indexOf(node);
      if (index >= 0) cycles.push([...stack.slice(index), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const next of graph.get(node) ?? []) visit(next);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) visit(node);
  return cycles;
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Import Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Planned modules: ${audit.summary.plannedModules}`,
    `- Planned test files: ${audit.summary.plannedTestFiles}`,
    `- Import edges: ${audit.summary.importEdges}`,
    `- Dependency cycles: ${audit.summary.dependencyCycles}`,
    `- Forbidden cycles: ${audit.summary.forbiddenCycles}`,
    `- Route shim contracts: ${audit.summary.routeShimContracts}`,
    `- Probe files: ${audit.summary.probeFiles}`,
    `- Compile commands: ${audit.summary.compileCommands}`,
    `- Compile passed: ${audit.summary.compilePassed ? 'yes' : 'no'}`,
    `- Jest import path compatible: ${audit.summary.jestImportPathCompatible ? 'yes' : 'no'}`,
    `- Import safe after approval: ${audit.summary.importSafeAfterApproval ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Module Contracts',
    '',
  ];

  for (const contract of audit.moduleContracts) {
    lines.push(`### ${contract.filePath}`);
    lines.push('');
    lines.push(`- Role: \`${contract.role}\``);
    lines.push(`- Imports from: ${contract.importsFrom.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Exports: ${contract.exports.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`- Default route shim: \`${contract.defaultRouteShim}\``);
    lines.push(`- Forbidden imports: ${contract.forbiddenImports.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push('');
  }

  lines.push('## Test Import Contracts', '');
  for (const contract of audit.testImportContracts) {
    lines.push(`- \`${contract.filePath}\` imports \`${contract.importPath}\``);
    lines.push(`  - names: ${contract.importedNames.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`  - types: ${contract.importedTypes.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
    lines.push(`  - must not import: ${contract.mustNotImport.map((item) => `\`${item}\``).join(', ') || '`none`'}`);
  }

  lines.push('', '## Dependency Edges', '');
  for (const edge of audit.dependencyEdges) {
    lines.push(`- \`${edge.from}\` -> \`${edge.to}\` (${edge.kind})`);
  }

  lines.push('', '## Compile Probe', '');
  lines.push(`- Dir: \`${audit.compileProbe.dir}\``);
  lines.push(`- Exit code: \`${String(audit.compileProbe.exitCode)}\``);
  lines.push(`- Log: \`${audit.compileProbe.logPath}\``);
  lines.push(`- Command: \`${audit.compileProbe.command.join(' ')}\``);
  lines.push('');
  lines.push('Files:');
  for (const file of audit.compileProbe.files) lines.push(`- \`${file}\``);

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

function studyTargetProbeSource(): string {
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
  throw new Error('Unsupported StudyTarget');
}

export function defaultStudyTarget(): 'en' {
  return DEFAULT_STUDY_TARGET;
}

export default function __StudyTargetRouteShim() {
  return null;
}
`;
}

function targetStorageKeysProbeSource(domains: string[]): string {
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
const RAW_TARGET_KEY_PATTERNS = [
  'lesson_progress_v1',
  'trainer_store_v1',
  'mistake_log_v1',
  'flashcards_v1',
];

function assertMember<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error('Unsupported ' + label);
}

function encodeKeyPart(id: string | number): string {
  const raw = String(id);
  if (raw.length === 0) throw new Error('Empty key id is not allowed');
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
  if (RAW_TARGET_KEY_PATTERNS.some((pattern) => key.includes(pattern))) {
    throw new Error('Raw target-sensitive key is blocked: ' + key);
  }
  return key;
}

export default function __TargetStorageKeysRouteShim() {
  return null;
}
`;
}

function surfaceTestProbeSource(): string {
  return `
import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  STUDY_TARGET_STORAGE_KEY,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
  type SourceLocale,
  type StudyTarget,
} from '../app/study_target';

const target: StudyTarget = assertStudyTarget('fr');
const fallback: 'en' = defaultStudyTarget();
const source: SourceLocale = SOURCE_LOCALES[0];

if (!isStudyTarget(target)) throw new Error('fr must be a StudyTarget');
if (fallback !== DEFAULT_STUDY_TARGET) throw new Error('default target must stay English');
if (STUDY_TARGET_STORAGE_KEY !== 'study_target_v1') throw new Error('unexpected storage key');
void STUDY_TARGETS;
void source;
`;
}

function storageTestProbeSource(): string {
  return `
import {
  assertTargetKey,
  legacyEnglishKey,
  sourceTargetKey,
  targetKey,
  type SourceTargetKeyDomain,
  type TargetKeyDomain,
} from '../app/target_storage_keys';

const targetDomain: TargetKeyDomain = 'lesson_progress';
const sourceDomain: SourceTargetKeyDomain = 'personal_practice';
const targetScoped = targetKey(targetDomain, 'fr', 'lesson::1');
const sourceScoped = sourceTargetKey(sourceDomain, 'fr', 'ru', 'diagnosis::1');
const legacy = legacyEnglishKey(targetDomain, 'lesson::1');

assertTargetKey(targetScoped);
assertTargetKey(sourceScoped);
void legacy;
`;
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_import_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const p1aContractPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const testExecutionPath = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  const routeSafetyPath = path.join(runDir, 'audits', 'p1a_expo_route_safety_audit.json');
  const keyCollisionPath = path.join(runDir, 'audits', 'p1a_key_collision_audit.json');
  const packagePath = path.join(repoRoot, 'package.json');

  const packet = readJson<Record<string, unknown>>(packetPath);
  const p1aContract = readJson<Record<string, unknown>>(p1aContractPath);
  const testExecution = readJson<Record<string, unknown>>(testExecutionPath);
  const routeSafety = readJson<Record<string, unknown>>(routeSafetyPath);
  const keyCollision = readJson<Record<string, unknown>>(keyCollisionPath);
  const packageJson = readJson<Record<string, unknown>>(packagePath);
  const findings: Finding[] = [];

  if (!hasStatusPass(packet, 'readyForApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be PASS and ready before import contracts can be trusted.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (!hasStatusPass(testExecution, 'testExecutableAfterApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_tests_not_executable',
      message: 'P1A test execution audit must be PASS before import contracts can be trusted.',
      filePath: path.relative(repoRoot, testExecutionPath),
    });
  }
  if (!hasStatusPass(routeSafety, 'routeSafeAfterApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_route_safety_not_ready',
      message: 'P1A Expo route safety audit must be PASS before import contracts can be trusted.',
      filePath: path.relative(repoRoot, routeSafetyPath),
    });
  }
  if (!hasStatusPass(keyCollision, 'collisionSafeAfterApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_key_collision_not_ready',
      message: 'P1A key collision audit must be PASS before target_storage_keys import contracts can be trusted.',
      filePath: path.relative(repoRoot, keyCollisionPath),
    });
  }

  const packetFiles = arr<Record<string, unknown>>(packet.files).map((file) => str(file.path)).filter(Boolean);
  const plannedAppFiles = packetFiles.filter((file) => file.startsWith('app/') && file.endsWith('.ts'));
  const plannedTestFiles = arr<Record<string, unknown>>(testExecution.plannedTestFiles)
    .map((file) => str(file.filePath))
    .filter(Boolean);
  const keyBuilderContract = object(p1aContract.keyBuilderContract);
  const targetDomains = arr<string>(keyBuilderContract.allowedTargetDomains).map(String).filter(Boolean);

  for (const required of ['app/study_target.ts', 'app/target_storage_keys.ts']) {
    if (!plannedAppFiles.includes(required)) {
      findings.push({
        severity: 'blocker',
        code: 'planned_app_module_missing',
        message: `P1A import contract requires planned module ${required}.`,
        filePath: path.relative(repoRoot, packetPath),
      });
    }
  }
  for (const required of ['tests/gustav_surface_target_switch.test.ts', 'tests/gustav_target_storage_keys.test.ts']) {
    if (!plannedTestFiles.includes(required)) {
      findings.push({
        severity: 'blocker',
        code: 'planned_test_module_missing',
        message: `P1A import contract requires planned test file ${required}.`,
        filePath: path.relative(repoRoot, testExecutionPath),
      });
    }
  }
  if (targetDomains.length !== 10) {
    findings.push({
      severity: 'blocker',
      code: 'target_domain_contract_incomplete',
      message: `Expected 10 target domains for import probe, found ${targetDomains.length}.`,
      filePath: path.relative(repoRoot, p1aContractPath),
    });
  }

  const jestConfig = object(packageJson.jest);
  const testMatch = arr<string>(jestConfig.testMatch).map(String);
  const transform = object(jestConfig.transform);
  const jestImportPathCompatible =
    jestConfig.preset === 'ts-jest' &&
    testMatch.includes('<rootDir>/tests/**/*.test.ts') &&
    Object.keys(transform).some((key) => key.includes('tsx?'));
  if (!jestImportPathCompatible) {
    findings.push({
      severity: 'blocker',
      code: 'jest_import_path_contract_invalid',
      message: 'package.json Jest config must compile tests/**/*.test.ts through ts-jest.',
      filePath: 'package.json',
    });
  }

  const moduleContracts: ModuleContract[] = [
    {
      filePath: 'app/study_target.ts',
      role: 'study_target_model',
      importsFrom: [],
      exports: [
        'StudyTarget',
        'SourceLocale',
        'STUDY_TARGETS',
        'SOURCE_LOCALES',
        'DEFAULT_STUDY_TARGET',
        'STUDY_TARGET_STORAGE_KEY',
        'isStudyTarget',
        'assertStudyTarget',
        'defaultStudyTarget',
      ],
      defaultRouteShim: '__StudyTargetRouteShim',
      forbiddenImports: ['@react-native-async-storage/async-storage', 'react', 'react-native', 'expo-router', './target_storage_keys'],
    },
    {
      filePath: 'app/target_storage_keys.ts',
      role: 'target_key_builder',
      importsFrom: ['./study_target'],
      exports: [
        'TargetKeyDomain',
        'SourceTargetKeyDomain',
        'TARGET_KEY_DOMAINS',
        'SOURCE_TARGET_KEY_DOMAINS',
        'isStudyTarget',
        'assertStudyTarget',
        'defaultStudyTarget',
        'targetKey',
        'sourceTargetKey',
        'legacyEnglishKey',
        'assertTargetKey',
      ],
      defaultRouteShim: '__TargetStorageKeysRouteShim',
      forbiddenImports: ['@react-native-async-storage/async-storage', 'react', 'react-native', 'expo-router', './study_target_lang_dev'],
    },
  ];

  const testImportContracts: TestImportContract[] = [
    {
      filePath: 'tests/gustav_surface_target_switch.test.ts',
      importPath: '../app/study_target',
      importedNames: [
        'DEFAULT_STUDY_TARGET',
        'SOURCE_LOCALES',
        'STUDY_TARGETS',
        'STUDY_TARGET_STORAGE_KEY',
        'assertStudyTarget',
        'defaultStudyTarget',
        'isStudyTarget',
      ],
      importedTypes: ['SourceLocale', 'StudyTarget'],
      mustNotImport: ['../app/study_target_lang_dev', '../app/target_storage_keys'],
    },
    {
      filePath: 'tests/gustav_target_storage_keys.test.ts',
      importPath: '../app/target_storage_keys',
      importedNames: ['assertTargetKey', 'legacyEnglishKey', 'sourceTargetKey', 'targetKey'],
      importedTypes: ['SourceTargetKeyDomain', 'TargetKeyDomain'],
      mustNotImport: ['../app/study_target_lang_dev'],
    },
  ];

  const dependencyEdges: DependencyEdge[] = [
    { from: 'app/target_storage_keys.ts', to: 'app/study_target.ts', kind: 'runtime_import' },
    { from: 'tests/gustav_surface_target_switch.test.ts', to: 'app/study_target.ts', kind: 'test_import' },
    { from: 'tests/gustav_target_storage_keys.test.ts', to: 'app/target_storage_keys.ts', kind: 'test_import' },
  ];
  const dependencyCycles = findCycles(dependencyEdges);
  for (const cycle of dependencyCycles) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_import_cycle',
      message: `P1A import contract has a dependency cycle: ${cycle.join(' -> ')}`,
    });
  }

  const probeRoot = path.join(runDir, 'audits', 'p1a_import_contract_probe');
  const relativeProbeRoot = path.relative(repoRoot, probeRoot);
  const probeFilesAbs = [
    writeProbeFile(probeRoot, 'app/study_target.ts', studyTargetProbeSource()),
    writeProbeFile(probeRoot, 'app/target_storage_keys.ts', targetStorageKeysProbeSource(targetDomains)),
    writeProbeFile(probeRoot, 'tests/gustav_surface_target_switch.test.ts', surfaceTestProbeSource()),
    writeProbeFile(probeRoot, 'tests/gustav_target_storage_keys.test.ts', storageTestProbeSource()),
  ];

  const tscBin = fs.existsSync(path.join(repoRoot, 'node_modules', '.bin', 'tsc'))
    ? path.join(repoRoot, 'node_modules', '.bin', 'tsc')
    : 'npx';
  const tscArgs = tscBin === 'npx'
    ? ['tsc', '--target', 'es2018', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--esModuleInterop', '--skipLibCheck', '--noEmit', ...probeFilesAbs]
    : ['--target', 'es2018', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--esModuleInterop', '--skipLibCheck', '--noEmit', ...probeFilesAbs];
  const compile = childProcess.spawnSync(tscBin, tscArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const command = [path.relative(repoRoot, tscBin), ...tscArgs].map((item) => item || tscBin);
  const logPathAbs = path.join(probeRoot, 'compile.log');
  fs.writeFileSync(logPathAbs, [
    `$ ${command.join(' ')}`,
    '',
    '## stdout',
    compile.stdout || '',
    '',
    '## stderr',
    compile.stderr || '',
    '',
    `exitCode=${String(compile.status)}`,
  ].join('\n'));

  if (compile.error) {
    findings.push({
      severity: 'blocker',
      code: 'compile_probe_failed_to_start',
      message: compile.error.message,
      filePath: path.relative(repoRoot, logPathAbs),
    });
  } else if (compile.status !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'compile_probe_failed',
      message: 'The P1A import contract compile probe did not pass.',
      filePath: path.relative(repoRoot, logPathAbs),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const importSafeAfterApproval =
    blockers === 0 &&
    moduleContracts.length === 2 &&
    testImportContracts.length === 2 &&
    dependencyCycles.length === 0 &&
    compile.status === 0 &&
    jestImportPathCompatible;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-import-contract-audit-v0',
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
      p1aCoreContractSpec: path.relative(repoRoot, p1aContractPath),
      p1aTestExecutionAudit: path.relative(repoRoot, testExecutionPath),
      p1aExpoRouteSafetyAudit: path.relative(repoRoot, routeSafetyPath),
      p1aKeyCollisionAudit: path.relative(repoRoot, keyCollisionPath),
      packageJson: 'package.json',
    },
    summary: {
      plannedModules: moduleContracts.length,
      plannedTestFiles: testImportContracts.length,
      importEdges: dependencyEdges.length,
      dependencyCycles: dependencyCycles.length,
      forbiddenCycles: dependencyCycles.length,
      routeShimContracts: moduleContracts.filter((contract) => contract.defaultRouteShim).length,
      probeFiles: probeFilesAbs.length,
      compileCommands: 1,
      blockers,
      warnings,
      compilePassed: compile.status === 0,
      jestImportPathCompatible,
      importSafeAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    moduleContracts,
    testImportContracts,
    dependencyEdges,
    dependencyCycles,
    compileProbe: {
      dir: relativeProbeRoot,
      files: probeFilesAbs.map((file) => path.relative(repoRoot, file)),
      command,
      exitCode: compile.status,
      stdout: compile.stdout || '',
      stderr: compile.stderr || '',
      logPath: path.relative(repoRoot, logPathAbs),
    },
    findings,
    notes: [
      'This audit compiles only synthetic probe files inside docs/gustav/runs; it does not create app or test files.',
      'The approved P1A implementation must keep app/study_target.ts dependency-free and app/target_storage_keys.ts dependent only on ./study_target.',
      'P1A tests must import production contracts through ../app/study_target and ../app/target_storage_keys, never through the dev StudyTargetLang module.',
      'French generation remains blocked until target isolation and generated-content gates pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_import_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_import_contract_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A import contract audit: ${audit.status}`);
  console.log(`Planned modules: ${audit.summary.plannedModules}`);
  console.log(`Planned test files: ${audit.summary.plannedTestFiles}`);
  console.log(`Import edges: ${audit.summary.importEdges}`);
  console.log(`Dependency cycles: ${audit.summary.dependencyCycles}`);
  console.log(`Compile passed: ${audit.summary.compilePassed ? 'yes' : 'no'}`);
  console.log(`Import safe after approval: ${audit.summary.importSafeAfterApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
