import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
};

type PublicApi = {
  name: string;
  signature: string;
  purpose: string;
  forbiddenBehavior: string[];
};

type DomainContract = {
  domain: string;
  status: 'allowed_target_domain' | 'non_target_contract_domain' | 'blocked_until_classified';
  storageShapes: string[];
  sourceArtifactDomain: string;
  requiresStudyTarget: boolean;
  allowsSourceLocaleDimension: boolean;
  legacyEnglishFallbackAllowedOnlyInMigration: boolean;
};

type TestAssertion = {
  id: string;
  file: string;
  assertion: string;
  covers: string[];
};

type Audit = {
  schemaVersion: 'gustav-p1a-core-contract-spec-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    manifest: string;
    targetKeyIntegrationPlan: string;
    p1ExecutionSliceAudit: string;
    applyPlan: string;
  };
  summary: {
    studyTargets: number;
    sourceLocales: number;
    publicApis: number;
    domainContracts: number;
    allowedTargetDomains: number;
    blockedDomains: number;
    storageShapes: number;
    firstSliceFiles: number;
    firstSliceDirtyOverlaps: number;
    testAssertions: number;
    blockers: number;
    warnings: number;
    canImplementP1AContractsAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  studyTargetContract: {
    typeName: 'StudyTarget';
    values: string[];
    defaultTarget: string;
    requestedTarget: string;
    storageKey: string;
    mustNotDependOnSourceLocale: boolean;
    mustNotUseDevStudyTargetLang: boolean;
    notes: string[];
  };
  sourceLocaleContract: {
    values: string[];
    mustNotChangeStudyTarget: boolean;
    notes: string[];
  };
  keyBuilderContract: {
    modulePath: string;
    allowedTargetDomains: string[];
    blockedDomains: string[];
    publicApis: PublicApi[];
    keyFormats: string[];
  };
  domainContracts: DomainContract[];
  firstSlice: {
    id: string;
    files: string[];
    dirtyWorktreeOverlaps: string[];
    mayModifyProductionAppFiles: boolean;
  };
  testContract: {
    files: string[];
    assertions: TestAssertion[];
  };
  findings: Finding[];
  notes: string[];
};

const NON_TARGET_CONTRACT_DOMAINS = new Set([
  'study_target_model',
  'target_key_builder',
  'source_locale_preferences',
]);
const BLOCKED_DOMAINS = new Set(['unknown_target_storage']);
const SOURCE_TARGET_DOMAINS = new Set(['personal_practice']);

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

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Core Contract Spec Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Study targets: ${audit.summary.studyTargets}`,
    `- Source locales: ${audit.summary.sourceLocales}`,
    `- Public APIs: ${audit.summary.publicApis}`,
    `- Domain contracts: ${audit.summary.domainContracts}`,
    `- Allowed target domains: ${audit.summary.allowedTargetDomains}`,
    `- Blocked domains: ${audit.summary.blockedDomains}`,
    `- Storage shapes: ${audit.summary.storageShapes}`,
    `- First slice files: ${audit.summary.firstSliceFiles}`,
    `- First slice dirty overlaps: ${audit.summary.firstSliceDirtyOverlaps}`,
    `- Test assertions: ${audit.summary.testAssertions}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Can implement P1A after approval: ${audit.summary.canImplementP1AContractsAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Study Target Contract',
    '',
    `- Type: \`${audit.studyTargetContract.typeName}\``,
    `- Values: ${audit.studyTargetContract.values.map((item) => `\`${item}\``).join(', ')}`,
    `- Default: \`${audit.studyTargetContract.defaultTarget}\``,
    `- Requested target: \`${audit.studyTargetContract.requestedTarget}\``,
    `- Storage key: \`${audit.studyTargetContract.storageKey}\``,
    `- Must not depend on sourceLocale: ${audit.studyTargetContract.mustNotDependOnSourceLocale ? 'yes' : 'no'}`,
    `- Must not use dev StudyTargetLang: ${audit.studyTargetContract.mustNotUseDevStudyTargetLang ? 'yes' : 'no'}`,
    '',
    '## Key Builder APIs',
    '',
  ];

  for (const api of audit.keyBuilderContract.publicApis) {
    lines.push(`- \`${api.signature}\`: ${api.purpose}`);
  }

  lines.push('', '## Allowed Target Domains', '');
  for (const domain of audit.keyBuilderContract.allowedTargetDomains) lines.push(`- \`${domain}\``);
  lines.push('', '## Blocked Domains', '');
  for (const domain of audit.keyBuilderContract.blockedDomains) lines.push(`- \`${domain}\``);

  lines.push('', '## First Slice Files', '');
  for (const file of audit.firstSlice.files) lines.push(`- \`${file}\``);

  lines.push('', '## Test Assertions', '');
  for (const assertion of audit.testContract.assertions) {
    lines.push(`- \`${assertion.id}\` in \`${assertion.file}\`: ${assertion.assertion}`);
  }

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1a_core_contract_spec_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const manifestPath = path.join(runDir, 'manifest.json');
  const targetPlanPath = path.join(runDir, 'audits', 'target_key_integration_plan.json');
  const p1SlicePath = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');

  const manifest = readJson<Record<string, unknown>>(manifestPath);
  const targetPlan = readJson<Record<string, unknown>>(targetPlanPath);
  const p1Slice = readJson<Record<string, unknown>>(p1SlicePath);
  const applyPlan = readJson<Record<string, unknown>>(applyPlanPath);

  const findings: Finding[] = [];
  const requestedTarget = str(manifest.requestedStudyTarget) || 'fr';
  const allowedSourceLocales = arr<string>(manifest.allowedSourceLocales).map(String).filter(Boolean);
  const p1a = arr<Record<string, unknown>>(p1Slice.slices).find((slice) => slice.id === 'P1A_CORE_CONTRACTS');
  const firstSliceFiles = p1a ? arr<string>(p1a.files).map(String) : [];
  const firstSliceDirty = p1a ? arr<string>(p1a.dirtyWorktreeOverlaps).map(String) : [];
  const targetDomains = arr<Record<string, unknown>>(targetPlan.domains);

  const domainContracts: DomainContract[] = targetDomains.map((domain) => {
    const domainId = str(domain.domain);
    const storageShapes = arr<string>(domain.storageShape).map(String);
    const status = BLOCKED_DOMAINS.has(domainId)
      ? 'blocked_until_classified'
      : NON_TARGET_CONTRACT_DOMAINS.has(domainId)
        ? 'non_target_contract_domain'
        : 'allowed_target_domain';
    return {
      domain: domainId,
      status,
      storageShapes,
      sourceArtifactDomain: domainId,
      requiresStudyTarget: status === 'allowed_target_domain',
      allowsSourceLocaleDimension: SOURCE_TARGET_DOMAINS.has(domainId) || storageShapes.some((shape) => shape.includes('{sourceLocale}')),
      legacyEnglishFallbackAllowedOnlyInMigration: status === 'allowed_target_domain',
    };
  });

  const allowedTargetDomains = domainContracts
    .filter((domain) => domain.status === 'allowed_target_domain')
    .map((domain) => domain.domain);
  const blockedDomains = domainContracts
    .filter((domain) => domain.status === 'blocked_until_classified')
    .map((domain) => domain.domain);
  const storageShapes = unique(domainContracts.flatMap((domain) => domain.storageShapes));

  const publicApis: PublicApi[] = [
    {
      name: 'isStudyTarget',
      signature: "isStudyTarget(value: unknown): value is StudyTarget",
      purpose: "Accept only 'en' and 'fr' production study targets.",
      forbiddenBehavior: ["Must not accept 'es' from dev StudyTargetLang.", 'Must not infer target from sourceLocale.'],
    },
    {
      name: 'assertStudyTarget',
      signature: 'assertStudyTarget(value: unknown): StudyTarget',
      purpose: 'Fail closed when target is missing or unsupported.',
      forbiddenBehavior: ['Must not silently default French requests to English.'],
    },
    {
      name: 'defaultStudyTarget',
      signature: "defaultStudyTarget(): 'en'",
      purpose: 'Keep existing English behavior as the default compatibility target.',
      forbiddenBehavior: ['Must not change sourceLocale preferences.'],
    },
    {
      name: 'targetKey',
      signature: 'targetKey(domain: TargetKeyDomain, studyTarget: StudyTarget, id?: string | number): string',
      purpose: 'Build target-scoped keys for learning state.',
      forbiddenBehavior: ['Must not emit raw legacy keys.', 'Must not accept blocked unknown_target_storage domain.'],
    },
    {
      name: 'sourceTargetKey',
      signature: 'sourceTargetKey(domain: SourceTargetKeyDomain, studyTarget: StudyTarget, sourceLocale: SourceLocale, id?: string | number): string',
      purpose: 'Build keys where feedback/copy state needs both target and sourceLocale dimensions.',
      forbiddenBehavior: ['Must not let sourceLocale replace studyTarget.'],
    },
    {
      name: 'legacyEnglishKey',
      signature: 'legacyEnglishKey(domain: TargetKeyDomain, id?: string | number): string',
      purpose: 'Name legacy English fallback keys for migration/read-compat modules only.',
      forbiddenBehavior: ['Must not be used for French reads.', 'Must not delete legacy English keys.'],
    },
    {
      name: 'assertTargetKey',
      signature: 'assertTargetKey(key: string): string',
      purpose: 'Reject new target-sensitive raw storage keys outside migration adapters.',
      forbiddenBehavior: ['Must not approve lesson/trainer/quiz/flashcard raw v1 keys.'],
    },
  ];

  const testAssertions: TestAssertion[] = [
    {
      id: 'P1A-STUDY-TARGET-VALUES',
      file: 'tests/gustav_surface_target_switch.test.ts',
      assertion: "StudyTarget accepts 'en' and 'fr', rejects dev-only 'es', and defaults to 'en'.",
      covers: ['StudyTarget', 'dev StudyTargetLang isolation'],
    },
    {
      id: 'P1A-SOURCE-LOCALE-SEPARATION',
      file: 'tests/gustav_surface_target_switch.test.ts',
      assertion: 'Switching sourceLocale ru -> uk does not change studyTarget=fr.',
      covers: ['sourceLocale separation', 'requested target fr'],
    },
    {
      id: 'P1A-TARGET-KEY-DISTINCTNESS',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: 'targetKey returns distinct en/fr keys for every allowed target domain.',
      covers: ['targetKey', 'target domains'],
    },
    {
      id: 'P1A-SOURCE-TARGET-KEY-SHAPE',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: 'sourceTargetKey includes studyTarget and sourceLocale dimensions without swapping them.',
      covers: ['sourceTargetKey', 'personal practice sourceLocale feedback'],
    },
    {
      id: 'P1A-LEGACY-ENGLISH-FALLBACK-LIMIT',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: 'legacyEnglishKey is English-only migration metadata and never produces a French target key.',
      covers: ['legacy English compatibility', 'French clean state'],
    },
    {
      id: 'P1A-RAW-KEY-GUARD',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: 'assertTargetKey rejects raw lesson/trainer/quiz/flashcard v1 keys.',
      covers: ['raw storage guard', 'target isolation'],
    },
  ];

  for (const expected of ['app/study_target.ts', 'app/target_storage_keys.ts', 'tests/gustav_surface_target_switch.test.ts', 'tests/gustav_target_storage_keys.test.ts']) {
    if (!firstSliceFiles.includes(expected)) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_expected_file_missing',
        message: `P1A first slice is missing ${expected}.`,
      });
    }
  }
  if (firstSliceDirty.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_dirty_overlap',
      message: `P1A first slice must have zero dirty overlaps, found ${firstSliceDirty.join(', ')}.`,
    });
  }
  if (requestedTarget !== 'fr') {
    findings.push({
      severity: 'blocker',
      code: 'p1a_requested_target_unexpected',
      message: `Expected requestedStudyTarget=fr, found ${requestedTarget}.`,
    });
  }
  for (const locale of ['ru', 'uk']) {
    if (!allowedSourceLocales.includes(locale)) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_source_locale_missing',
        message: `P1A contract requires source locale ${locale}.`,
      });
    }
  }
  if (!blockedDomains.includes('unknown_target_storage')) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_unknown_domain_not_blocked',
      message: 'unknown_target_storage must remain blocked, not part of the allowed key builder domain set.',
    });
  }
  if (applyPlan.mayModifyProductionAppFiles !== false || applyPlan.mayStartFrenchGeneration !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_safety_flags_open',
      message: 'P1A contract spec requires apply plan safety flags to stay closed.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const canImplementP1AContractsAfterApproval =
    blockers === 0 &&
    firstSliceFiles.length === 4 &&
    firstSliceDirty.length === 0 &&
    allowedTargetDomains.length > 0 &&
    publicApis.length >= 6 &&
    testAssertions.length >= 6;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-core-contract-spec-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: canImplementP1AContractsAfterApproval ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      manifest: path.relative(repoRoot, manifestPath),
      targetKeyIntegrationPlan: path.relative(repoRoot, targetPlanPath),
      p1ExecutionSliceAudit: path.relative(repoRoot, p1SlicePath),
      applyPlan: path.relative(repoRoot, applyPlanPath),
    },
    summary: {
      studyTargets: 2,
      sourceLocales: allowedSourceLocales.length,
      publicApis: publicApis.length,
      domainContracts: domainContracts.length,
      allowedTargetDomains: allowedTargetDomains.length,
      blockedDomains: blockedDomains.length,
      storageShapes: storageShapes.length,
      firstSliceFiles: firstSliceFiles.length,
      firstSliceDirtyOverlaps: firstSliceDirty.length,
      testAssertions: testAssertions.length,
      blockers,
      warnings,
      canImplementP1AContractsAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    studyTargetContract: {
      typeName: 'StudyTarget',
      values: ['en', 'fr'],
      defaultTarget: 'en',
      requestedTarget,
      storageKey: 'study_target_v1',
      mustNotDependOnSourceLocale: true,
      mustNotUseDevStudyTargetLang: true,
      notes: [
        'Production StudyTarget is the language being learned.',
        'sourceLocale remains the explanation/interface language.',
        'Existing dev StudyTargetLang en/es must not drive production French.',
      ],
    },
    sourceLocaleContract: {
      values: allowedSourceLocales,
      mustNotChangeStudyTarget: true,
      notes: [
        'Russian and Ukrainian are source locales for studying French.',
        'Switching source locale changes explanations/copy only.',
      ],
    },
    keyBuilderContract: {
      modulePath: 'app/target_storage_keys.ts',
      allowedTargetDomains,
      blockedDomains,
      publicApis,
      keyFormats: [
        '<domain>_v2::{studyTarget}',
        '<domain>_v2::{studyTarget}::{id}',
        '<domain>_v2::{studyTarget}::{sourceLocale}::{id}',
        'progress/targets/{studyTarget}/*',
      ],
    },
    domainContracts,
    firstSlice: {
      id: 'P1A_CORE_CONTRACTS',
      files: firstSliceFiles,
      dirtyWorktreeOverlaps: firstSliceDirty,
      mayModifyProductionAppFiles: false,
    },
    testContract: {
      files: ['tests/gustav_surface_target_switch.test.ts', 'tests/gustav_target_storage_keys.test.ts'],
      assertions: testAssertions,
    },
    findings,
    notes: [
      'This contract spec is a planning artifact only; it does not write product files.',
      'P1A remains blocked until the apply plan is explicitly approved.',
      'French generation remains blocked until target-isolation implementation and generated-content audit pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const outMd = path.join(runDir, 'audits', 'p1a_core_contract_spec.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A core contract spec audit: ${audit.status}`);
  console.log(`Public APIs: ${audit.summary.publicApis}`);
  console.log(`Allowed target domains: ${audit.summary.allowedTargetDomains}`);
  console.log(`First slice files: ${audit.summary.firstSliceFiles}`);
  console.log(`Test assertions: ${audit.summary.testAssertions}`);
  console.log(`Blockers: ${audit.summary.blockers}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (blockers > 0) process.exit(1);
}

void main();
