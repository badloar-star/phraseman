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

type PlannedTestFile = {
  filePath: string;
  existsNow: boolean;
  matchesJestPattern: boolean;
  assertionIds: string[];
  requiredMocks: string[];
};

type TestCommand = {
  id: string;
  command: string;
  purpose: string;
  requiredBefore: 'p1a_implementation' | 'p1a_bridge' | 'full_regression';
};

type Audit = {
  schemaVersion: 'gustav-p1a-test-execution-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    packageJson: string;
    p1aCoreContractSpec: string;
    p1aPreflightAudit: string;
  };
  summary: {
    jestConfigured: boolean;
    packageTestScriptPresent: boolean;
    tsJestPresent: boolean;
    plannedTestFiles: number;
    plannedAssertions: number;
    plannedTestsMatchingJest: number;
    directCommands: number;
    companionRegressionTests: number;
    requiredMocksPresent: number;
    requiredMocksMissing: number;
    blockers: number;
    warnings: number;
    testExecutableAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  jestContract: {
    preset: string;
    testEnvironment: string;
    testMatch: string[];
    transformKeys: string[];
    moduleMocks: Record<string, string>;
  };
  plannedTestFiles: PlannedTestFile[];
  companionRegressionTests: string[];
  commands: TestCommand[];
  findings: Finding[];
  notes: string[];
};

const REQUIRED_MOCKS: Record<string, string> = {
  '@react-native-async-storage/async-storage': 'tests/__mocks__/async-storage.js',
  'react-native': 'tests/__mocks__/react-native.js',
};

const COMPANION_REGRESSION_TESTS = [
  'tests/study_target_lang_dev.test.ts',
  'tests/flashcard_content_lang.test.ts',
  'tests/storage.test.ts',
];

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

function testMatchesJest(filePath: string): boolean {
  return /^tests\/.+\.test\.ts$/.test(filePath);
}

function mappedModulePath(moduleNameMapper: Record<string, unknown>, moduleName: string): string {
  for (const [key, value] of Object.entries(moduleNameMapper)) {
    if (key === moduleName || key === `^${moduleName}$`) return str(value);
  }
  return '';
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Test Execution Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Jest configured: ${audit.summary.jestConfigured ? 'yes' : 'no'}`,
    `- Package test script present: ${audit.summary.packageTestScriptPresent ? 'yes' : 'no'}`,
    `- ts-jest present: ${audit.summary.tsJestPresent ? 'yes' : 'no'}`,
    `- Planned test files: ${audit.summary.plannedTestFiles}`,
    `- Planned assertions: ${audit.summary.plannedAssertions}`,
    `- Planned tests matching Jest: ${audit.summary.plannedTestsMatchingJest}`,
    `- Direct commands: ${audit.summary.directCommands}`,
    `- Companion regression tests: ${audit.summary.companionRegressionTests}`,
    `- Required mocks present: ${audit.summary.requiredMocksPresent}`,
    `- Required mocks missing: ${audit.summary.requiredMocksMissing}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Test executable after approval: ${audit.summary.testExecutableAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Jest Contract',
    '',
    `- Preset: \`${audit.jestContract.preset || '<missing>'}\``,
    `- Test environment: \`${audit.jestContract.testEnvironment || '<missing>'}\``,
    `- Test match: ${audit.jestContract.testMatch.map((item) => `\`${item}\``).join(', ') || '`none`'}`,
    `- Transform keys: ${audit.jestContract.transformKeys.map((item) => `\`${item}\``).join(', ') || '`none`'}`,
    '',
    'Module mocks:',
  ];

  for (const [moduleName, mockPath] of Object.entries(audit.jestContract.moduleMocks)) {
    lines.push(`- \`${moduleName}\` -> \`${mockPath}\``);
  }

  lines.push('', '## Planned Test Files', '');
  for (const file of audit.plannedTestFiles) {
    lines.push(`- \`${file.filePath}\`: matches Jest ${file.matchesJestPattern ? 'yes' : 'no'}, exists now ${file.existsNow ? 'yes' : 'no'}`);
    lines.push(`  - assertions: ${file.assertionIds.map((id) => `\`${id}\``).join(', ') || '`none`'}`);
  }

  lines.push('', '## Companion Regression Tests', '');
  for (const file of audit.companionRegressionTests) lines.push(`- \`${file}\``);

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
    console.error('Usage: npx tsx scripts/gustav_p1a_test_execution_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const p1aPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const preflightPath = path.join(runDir, 'audits', 'p1a_preflight_audit.json');

  const pkg = readJson<Record<string, unknown>>(packageJsonPath);
  const p1a = readJson<Record<string, unknown>>(p1aPath);
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const findings: Finding[] = [];

  const jestConfig = object(pkg.jest);
  const scripts = object(pkg.scripts);
  const devDependencies = object(pkg.devDependencies);
  const moduleNameMapper = object(jestConfig.moduleNameMapper);
  const transform = object(jestConfig.transform);
  const testMatch = arr<string>(jestConfig.testMatch).map(String);
  const transformKeys = Object.keys(transform);
  const packageTestScript = str(scripts.test);
  const tsJestPresent = typeof devDependencies['ts-jest'] === 'string';
  const jestConfigured =
    jestConfig.preset === 'ts-jest' &&
    jestConfig.testEnvironment === 'node' &&
    testMatch.includes('<rootDir>/tests/**/*.test.ts') &&
    transformKeys.some((key) => key.includes('tsx?'));

  if (!jestConfigured) {
    findings.push({
      severity: 'blocker',
      code: 'jest_contract_invalid',
      message: 'Jest must use ts-jest, node environment and tests/**/*.test.ts before P1A tests are executable.',
      filePath: 'package.json',
    });
  }
  if (!packageTestScript.includes('jest') || !packageTestScript.includes('tests/')) {
    findings.push({
      severity: 'blocker',
      code: 'package_test_script_invalid',
      message: 'package.json test script must run Jest against tests/.',
      filePath: 'package.json',
    });
  }
  if (!tsJestPresent) {
    findings.push({
      severity: 'blocker',
      code: 'ts_jest_missing',
      message: 'ts-jest is required for planned .test.ts files.',
      filePath: 'package.json',
    });
  }

  const testAssertions = p1a.testContract && typeof p1a.testContract === 'object'
    ? arr<Record<string, unknown>>((p1a.testContract as Record<string, unknown>).assertions)
    : [];
  const assertionsByFile = new Map<string, string[]>();
  for (const assertion of testAssertions) {
    const file = str(assertion.file);
    const id = str(assertion.id);
    if (!file || !id) continue;
    assertionsByFile.set(file, [...(assertionsByFile.get(file) ?? []), id]);
  }
  const plannedFiles = Array.from(assertionsByFile.keys()).sort();
  const plannedTestFiles: PlannedTestFile[] = plannedFiles.map((filePath) => ({
    filePath,
    existsNow: fs.existsSync(path.join(repoRoot, filePath)),
    matchesJestPattern: testMatchesJest(filePath),
    assertionIds: assertionsByFile.get(filePath) ?? [],
    requiredMocks: Object.values(REQUIRED_MOCKS),
  }));

  for (const file of plannedTestFiles) {
    if (!file.matchesJestPattern) {
      findings.push({
        severity: 'blocker',
        code: 'planned_test_not_matched_by_jest',
        message: 'Planned P1A test file is not matched by Jest testMatch.',
        filePath: file.filePath,
      });
    }
    if (file.existsNow) {
      findings.push({
        severity: 'warning',
        code: 'planned_test_already_exists',
        message: 'Planned P1A test already exists and must be re-read before edit.',
        filePath: file.filePath,
      });
    }
  }
  if (plannedTestFiles.length !== 2 || testAssertions.length < 6) {
    findings.push({
      severity: 'blocker',
      code: 'planned_test_contract_incomplete',
      message: `Expected 2 planned P1A test files and at least 6 assertions, found ${plannedTestFiles.length} files and ${testAssertions.length} assertions.`,
      filePath: path.relative(repoRoot, p1aPath),
    });
  }

  const requiredMocksPresent = Object.entries(REQUIRED_MOCKS).filter(([moduleName, mockPath]) => (
    mappedModulePath(moduleNameMapper, moduleName) === `<rootDir>/${mockPath}` && fs.existsSync(path.join(repoRoot, mockPath))
  ));
  const requiredMocksMissing = Object.entries(REQUIRED_MOCKS).filter(([moduleName, mockPath]) => (
    mappedModulePath(moduleNameMapper, moduleName) !== `<rootDir>/${mockPath}` || !fs.existsSync(path.join(repoRoot, mockPath))
  ));
  for (const [moduleName, mockPath] of requiredMocksMissing) {
    findings.push({
      severity: 'blocker',
      code: 'required_mock_missing',
      message: `Required Jest mock for ${moduleName} is missing or not mapped to ${mockPath}.`,
      filePath: 'package.json',
    });
  }

  const companionRegressionTests = COMPANION_REGRESSION_TESTS.filter((file) => fs.existsSync(path.join(repoRoot, file)));
  for (const file of COMPANION_REGRESSION_TESTS) {
    if (!fs.existsSync(path.join(repoRoot, file))) {
      findings.push({
        severity: 'blocker',
        code: 'companion_regression_missing',
        message: 'Companion regression test is required for P1A target/storage safety.',
        filePath: file,
      });
    }
  }

  const commandTestFiles = plannedFiles.join(' ');
  const commandRegressionFiles = [...plannedFiles, ...companionRegressionTests].join(' ');
  const commands: TestCommand[] = [
    {
      id: 'P1A_DIRECT_TESTS',
      command: `npx jest --runTestsByPath ${commandTestFiles} --no-cache --runInBand`,
      purpose: 'Run only the new P1A StudyTarget and target storage key tests.',
      requiredBefore: 'p1a_implementation',
    },
    {
      id: 'P1A_WITH_DEV_TARGET_REGRESSION',
      command: `npx jest --runTestsByPath ${commandRegressionFiles} --no-cache --runInBand`,
      purpose: 'Run P1A tests plus existing dev StudyTargetLang, flashcard language and storage regressions.',
      requiredBefore: 'p1a_bridge',
    },
    {
      id: 'FULL_TEST_SUITE_AFTER_P1',
      command: 'npm test',
      purpose: 'Run the repo test suite after broader P1 consumer integration.',
      requiredBefore: 'full_regression',
    },
  ];

  const preflightSummary = object(preflight.summary);
  if (preflight.status !== 'PASS' || preflightSummary.preflightReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_preflight_not_ready',
      message: 'P1A preflight must be PASS before test execution can be considered ready.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const plannedTestsMatchingJest = plannedTestFiles.filter((file) => file.matchesJestPattern).length;
  const testExecutableAfterApproval =
    blockers === 0 &&
    jestConfigured &&
    tsJestPresent &&
    plannedTestFiles.length === 2 &&
    plannedTestsMatchingJest === plannedTestFiles.length &&
    testAssertions.length >= 6 &&
    companionRegressionTests.length === COMPANION_REGRESSION_TESTS.length &&
    requiredMocksMissing.length === 0;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-test-execution-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      packageJson: 'package.json',
      p1aCoreContractSpec: path.relative(repoRoot, p1aPath),
      p1aPreflightAudit: path.relative(repoRoot, preflightPath),
    },
    summary: {
      jestConfigured,
      packageTestScriptPresent: packageTestScript.includes('jest'),
      tsJestPresent,
      plannedTestFiles: plannedTestFiles.length,
      plannedAssertions: testAssertions.length,
      plannedTestsMatchingJest,
      directCommands: commands.length,
      companionRegressionTests: companionRegressionTests.length,
      requiredMocksPresent: requiredMocksPresent.length,
      requiredMocksMissing: requiredMocksMissing.length,
      blockers,
      warnings,
      testExecutableAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    jestContract: {
      preset: str(jestConfig.preset),
      testEnvironment: str(jestConfig.testEnvironment),
      testMatch,
      transformKeys,
      moduleMocks: Object.fromEntries(Object.entries(REQUIRED_MOCKS).map(([moduleName, mockPath]) => [
        moduleName,
        mappedModulePath(moduleNameMapper, moduleName) || `<missing expected ${mockPath}>`,
      ])),
    },
    plannedTestFiles,
    companionRegressionTests,
    commands,
    findings,
    notes: [
      'This audit proves test executability only; it does not create production test files.',
      'P1A tests must be added with the P1A implementation slice after explicit apply approval.',
      'The companion regression command keeps the existing dev en/es StudyTargetLang path separate from production en/fr StudyTarget.',
      'French generation remains blocked until target-isolation implementation and generated-content audits pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_test_execution_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A test execution audit: ${audit.status}`);
  console.log(`Jest configured: ${audit.summary.jestConfigured ? 'yes' : 'no'}`);
  console.log(`Planned test files: ${audit.summary.plannedTestFiles}`);
  console.log(`Planned assertions: ${audit.summary.plannedAssertions}`);
  console.log(`Companion regressions: ${audit.summary.companionRegressionTests}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
