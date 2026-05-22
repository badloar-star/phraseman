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

type SampleKey = {
  kind: 'targetKey' | 'sourceTargetKey' | 'legacyEnglishKey';
  domain: string;
  studyTarget?: string;
  sourceLocale?: string;
  id?: string;
  encodedId?: string;
  key: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-key-collision-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aCoreContractSpec: string;
    p1aTestExecutionAudit: string;
  };
  summary: {
    targetDomains: number;
    studyTargets: number;
    sourceLocales: number;
    sampleIds: number;
    encodedIdSamples: number;
    generatedKeys: number;
    uniqueKeys: number;
    collisions: number;
    separatorLeakChecks: number;
    separatorLeaks: number;
    reservedPatterns: number;
    implementationRules: number;
    requiredTestAdditions: number;
    blockers: number;
    warnings: number;
    collisionSafeAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  encodingPolicy: {
    separator: '::';
    idEncoder: 'encodeURIComponent(String(id))';
    emptyIdPolicy: 'omit_optional_id_or_reject_empty_explicit_id';
    reservedRawPatterns: string[];
    implementationRules: string[];
  };
  sampleIds: string[];
  sampleKeys: SampleKey[];
  requiredTestAdditions: Array<{
    id: string;
    file: string;
    assertion: string;
  }>;
  findings: Finding[];
  notes: string[];
};

const STUDY_TARGETS = ['en', 'fr'];
const SOURCE_LOCALES = ['ru', 'uk'];
const SAMPLE_IDS = [
  '1',
  'lesson::1',
  'a/b',
  'query?x=1&y=2',
  ' spaced id ',
  'ru::fr',
  'level#A1',
  'percent%25',
];
const RESERVED_RAW_PATTERNS = ['::', '/', '\\', '?', '#', '&', '%', ' leading/trailing whitespace '];

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

function encodeKeyPart(value: string | number): string {
  return encodeURIComponent(String(value));
}

function targetKey(domain: string, studyTarget: string, id?: string): string {
  const base = `${domain}_v2::${studyTarget}`;
  return id === undefined ? base : `${base}::${encodeKeyPart(id)}`;
}

function sourceTargetKey(domain: string, studyTarget: string, sourceLocale: string, id: string): string {
  return `${domain}_v2::${studyTarget}::${sourceLocale}::${encodeKeyPart(id)}`;
}

function legacyEnglishKey(domain: string, id?: string): string {
  const base = `${domain}_legacy_en`;
  return id === undefined ? base : `${base}::${encodeKeyPart(id)}`;
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Key Collision Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target domains: ${audit.summary.targetDomains}`,
    `- Study targets: ${audit.summary.studyTargets}`,
    `- Source locales: ${audit.summary.sourceLocales}`,
    `- Sample ids: ${audit.summary.sampleIds}`,
    `- Encoded id samples: ${audit.summary.encodedIdSamples}`,
    `- Generated keys: ${audit.summary.generatedKeys}`,
    `- Unique keys: ${audit.summary.uniqueKeys}`,
    `- Collisions: ${audit.summary.collisions}`,
    `- Separator leak checks: ${audit.summary.separatorLeakChecks}`,
    `- Separator leaks: ${audit.summary.separatorLeaks}`,
    `- Reserved patterns: ${audit.summary.reservedPatterns}`,
    `- Implementation rules: ${audit.summary.implementationRules}`,
    `- Required test additions: ${audit.summary.requiredTestAdditions}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Collision safe after approval: ${audit.summary.collisionSafeAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Encoding Policy',
    '',
    `- Separator: \`${audit.encodingPolicy.separator}\``,
    `- ID encoder: \`${audit.encodingPolicy.idEncoder}\``,
    `- Empty id policy: \`${audit.encodingPolicy.emptyIdPolicy}\``,
    '',
    'Implementation rules:',
  ];

  for (const rule of audit.encodingPolicy.implementationRules) lines.push(`- ${rule}`);
  lines.push('', 'Reserved raw patterns:');
  for (const pattern of audit.encodingPolicy.reservedRawPatterns) lines.push(`- \`${pattern}\``);

  lines.push('', '## Sample IDs', '');
  for (const id of audit.sampleIds) lines.push(`- \`${id}\` -> \`${encodeKeyPart(id)}\``);

  lines.push('', '## Sample Keys', '');
  for (const sample of audit.sampleKeys.slice(0, 60)) {
    const dims = [
      sample.studyTarget ? `target=${sample.studyTarget}` : '',
      sample.sourceLocale ? `source=${sample.sourceLocale}` : '',
      sample.id !== undefined ? `id=${sample.id}` : '',
    ].filter(Boolean).join(', ');
    lines.push(`- \`${sample.kind}\` ${sample.domain}${dims ? ` (${dims})` : ''}: \`${sample.key}\``);
  }
  if (audit.sampleKeys.length > 60) lines.push(`- ...${audit.sampleKeys.length - 60} more`);

  lines.push('', '## Required Test Additions', '');
  for (const test of audit.requiredTestAdditions) {
    lines.push(`- \`${test.id}\` in \`${test.file}\`: ${test.assertion}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1a_key_collision_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const p1aPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const testExecutionPath = path.join(runDir, 'audits', 'p1a_test_execution_audit.json');
  const p1a = readJson<Record<string, unknown>>(p1aPath);
  const testExecution = readJson<Record<string, unknown>>(testExecutionPath);
  const findings: Finding[] = [];

  const keyBuilderContract = object(p1a.keyBuilderContract);
  const targetDomains = arr<string>(keyBuilderContract.allowedTargetDomains).map(String).sort();
  if (targetDomains.length < 1) {
    findings.push({
      severity: 'blocker',
      code: 'target_domains_missing',
      message: 'P1A key collision audit needs allowed target domains from the core contract.',
      filePath: path.relative(repoRoot, p1aPath),
    });
  }
  if (testExecution.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1a_tests_not_ready',
      message: 'P1A test execution audit must be PASS before key collision audit can extend its test contract.',
      filePath: path.relative(repoRoot, testExecutionPath),
    });
  }

  const sampleKeys: SampleKey[] = [];
  for (const domain of targetDomains) {
    for (const studyTarget of STUDY_TARGETS) {
      sampleKeys.push({ kind: 'targetKey', domain, studyTarget, key: targetKey(domain, studyTarget) });
      for (const id of SAMPLE_IDS) {
        sampleKeys.push({
          kind: 'targetKey',
          domain,
          studyTarget,
          id,
          encodedId: encodeKeyPart(id),
          key: targetKey(domain, studyTarget, id),
        });
      }
    }
    for (const id of SAMPLE_IDS.slice(0, 4)) {
      sampleKeys.push({
        kind: 'legacyEnglishKey',
        domain,
        id,
        encodedId: encodeKeyPart(id),
        key: legacyEnglishKey(domain, id),
      });
    }
  }
  for (const studyTarget of STUDY_TARGETS) {
    for (const sourceLocale of SOURCE_LOCALES) {
      for (const id of SAMPLE_IDS) {
        sampleKeys.push({
          kind: 'sourceTargetKey',
          domain: 'personal_practice',
          studyTarget,
          sourceLocale,
          id,
          encodedId: encodeKeyPart(id),
          key: sourceTargetKey('personal_practice', studyTarget, sourceLocale, id),
        });
      }
    }
  }

  const byKey = new Map<string, SampleKey[]>();
  for (const sample of sampleKeys) {
    byKey.set(sample.key, [...(byKey.get(sample.key) ?? []), sample]);
  }
  const collisions = Array.from(byKey.values()).filter((values) => values.length > 1);
  for (const collision of collisions) {
    findings.push({
      severity: 'blocker',
      code: 'sample_key_collision',
      message: `Key collision detected: ${collision[0].key}`,
    });
  }

  const encodedIds = SAMPLE_IDS.map(encodeKeyPart);
  const encodedIdSet = new Set(encodedIds);
  if (encodedIdSet.size !== encodedIds.length) {
    findings.push({
      severity: 'blocker',
      code: 'encoded_id_collision',
      message: 'Sample id encoding produced duplicate encoded values.',
    });
  }

  const separatorLeakChecks = sampleKeys.filter((sample) => sample.id !== undefined).length;
  const separatorLeaks = sampleKeys.filter((sample) => sample.encodedId && sample.encodedId.includes('::')).length;
  if (separatorLeaks > 0) {
    findings.push({
      severity: 'blocker',
      code: 'encoded_separator_leak',
      message: `${separatorLeaks} encoded id sample(s) still contain the key separator.`,
    });
  }

  const implementationRules = [
    "Use a single constant separator: '::'.",
    'Convert id with String(id) and encode with encodeURIComponent before appending to a storage key.',
    'Never concatenate raw user/content ids into target-sensitive keys.',
    'Treat undefined id as omitted; reject an explicit empty-string id before key creation.',
    'Keep studyTarget and sourceLocale as typed enum segments, not free-form encoded ids.',
    'Keep legacyEnglishKey output visibly English-only and migration-only.',
  ];
  const requiredTestAdditions = [
    {
      id: 'P1A-KEY-ID-ENCODING',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: "targetKey encodes ids containing '::', '/', '?', '#', '&', '%' and whitespace without leaking separators.",
    },
    {
      id: 'P1A-KEY-COLLISION-MATRIX',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: 'targetKey/sourceTargetKey/legacyEnglishKey produce unique keys across en/fr, ru/uk and reserved id samples.',
    },
    {
      id: 'P1A-KEY-EMPTY-ID-REJECTION',
      file: 'tests/gustav_target_storage_keys.test.ts',
      assertion: 'An explicit empty-string id is rejected instead of producing a key indistinguishable from an omitted id.',
    },
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const collisionSafeAfterApproval =
    blockers === 0 &&
    targetDomains.length === 10 &&
    encodedIdSet.size === SAMPLE_IDS.length &&
    sampleKeys.length > 0 &&
    byKey.size === sampleKeys.length &&
    separatorLeaks === 0 &&
    implementationRules.length >= 6 &&
    requiredTestAdditions.length >= 3;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-key-collision-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aCoreContractSpec: path.relative(repoRoot, p1aPath),
      p1aTestExecutionAudit: path.relative(repoRoot, testExecutionPath),
    },
    summary: {
      targetDomains: targetDomains.length,
      studyTargets: STUDY_TARGETS.length,
      sourceLocales: SOURCE_LOCALES.length,
      sampleIds: SAMPLE_IDS.length,
      encodedIdSamples: encodedIdSet.size,
      generatedKeys: sampleKeys.length,
      uniqueKeys: byKey.size,
      collisions: collisions.length,
      separatorLeakChecks,
      separatorLeaks,
      reservedPatterns: RESERVED_RAW_PATTERNS.length,
      implementationRules: implementationRules.length,
      requiredTestAdditions: requiredTestAdditions.length,
      blockers,
      warnings,
      collisionSafeAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    encodingPolicy: {
      separator: '::',
      idEncoder: 'encodeURIComponent(String(id))',
      emptyIdPolicy: 'omit_optional_id_or_reject_empty_explicit_id',
      reservedRawPatterns: RESERVED_RAW_PATTERNS,
      implementationRules,
    },
    sampleIds: SAMPLE_IDS,
    sampleKeys,
    requiredTestAdditions,
    findings,
    notes: [
      'This audit defines storage-key collision safety for P1A; it does not write app files.',
      'The required test additions extend the existing P1A target storage key test contract.',
      'French generation remains blocked until target isolation and content generation gates pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_key_collision_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_key_collision_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A key collision audit: ${audit.status}`);
  console.log(`Target domains: ${audit.summary.targetDomains}`);
  console.log(`Sample ids: ${audit.summary.sampleIds}`);
  console.log(`Generated keys: ${audit.summary.generatedKeys}`);
  console.log(`Collisions: ${audit.summary.collisions}`);
  console.log(`Separator leaks: ${audit.summary.separatorLeaks}`);
  console.log(`Collision safe after approval: ${audit.summary.collisionSafeAfterApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
