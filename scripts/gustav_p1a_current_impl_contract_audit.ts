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
  evidence?: string[];
};

type P1ACoreContractSpec = {
  schemaVersion: 'gustav-p1a-core-contract-spec-audit-v0';
  runId: string;
  status: Status;
  studyTargetContract: {
    values: string[];
    defaultTarget: string;
    storageKey: string;
    mustNotDependOnSourceLocale: boolean;
    mustNotUseDevStudyTargetLang: boolean;
  };
  sourceLocaleContract: {
    values: string[];
    mustNotChangeStudyTarget: boolean;
  };
  keyBuilderContract: {
    allowedTargetDomains: string[];
    blockedDomains: string[];
    publicApis: Array<{ name: string; signature: string; purpose: string }>;
  };
  testContract: {
    files: string[];
    assertions: Array<{ id: string; file: string; assertion: string }>;
  };
};

type ReconciliationPacket = {
  schemaVersion: 'gustav-p1a-reconciliation-packet-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  p1aFiles: Array<{
    targetPath: string;
    currentGitStatus: string;
    currentSha256: string | null;
    currentNewlineStableSha256: string | null;
    candidateForReplacementBaseline: boolean;
  }>;
};

type FileProof = {
  path: string;
  exists: boolean;
  sha256: string | null;
  newlineStableSha256: string | null;
};

type Audit = {
  schemaVersion: 'gustav-p1a-current-impl-contract-audit-v0';
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
    p1aReconciliationPacket: string;
  };
  summary: {
    filesChecked: number;
    filesPresent: number;
    publicApisExpected: number;
    publicApisPresent: number;
    expectedTargetDomains: number;
    implementedTargetDomains: number;
    missingSpecDomains: number;
    extraImplementationDomains: number;
    sourceTargetDomainsExpected: number;
    sourceTargetDomainsPresent: number;
    testAssertionsExpected: number;
    testAssertionsCovered: number;
    blockers: number;
    warnings: number;
    coreSemanticsPass: boolean;
    oldSpecDomainStrictPass: boolean;
    canCreateReplacementBaselineHashLock: boolean;
    canCreateReplacementBaselineApprovalReceipt: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  fileProofs: FileProof[];
  studyTargetProof: {
    expectedValues: string[];
    internalValuesPresent: string[];
    productionValuesPresent: string[];
    sourceLocalesPresent: string[];
    defaultTargetPresent: string | null;
    storageKeyPresent: string | null;
    esRejectedByStudyTarget: boolean;
    sourceLocaleDoesNotSelectTarget: boolean;
    productionFrenchPersistenceDisabled: boolean;
  };
  keyBuilderProof: {
    expectedPublicApis: string[];
    presentPublicApis: string[];
    missingPublicApis: string[];
    expectedTargetDomains: string[];
    implementedTargetDomains: string[];
    missingSpecDomains: string[];
    extraImplementationDomains: string[];
    expectedSourceTargetDomains: string[];
    implementedSourceTargetDomains: string[];
    rawGuardExamplesCovered: string[];
    keyFormatEvidence: string[];
  };
  testProof: {
    files: Array<{
      path: string;
      exists: boolean;
      coveredAssertionIds: string[];
      missingAssertionIds: string[];
    }>;
  };
  findings: Finding[];
  decision: {
    decision: 'contract_amendment_required' | 'replacement_baseline_hash_lock_allowed';
    reason: string;
    nextRequiredArtifact: string;
  };
  allowedNextWork: string[];
  forbiddenActions: string[];
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

function sha256(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeNewlines(source: Buffer): string {
  return source.toString('utf8').replace(/\r\n/g, '\n');
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function setDiff(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value)).sort();
}

function parseConstStringArray(source: string, constName: string): string[] {
  const match = new RegExp(`export\\s+const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as\\s+const`).exec(source);
  if (!match) return [];
  return unique(Array.from(match[1].matchAll(/['"]([^'"]+)['"]/g)).map((entry) => entry[1]));
}

function fileProof(repoRoot: string, relativePath: string): FileProof {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    return {
      path: relativePath,
      exists: false,
      sha256: null,
      newlineStableSha256: null,
    };
  }
  const buffer = fs.readFileSync(fullPath);
  return {
    path: relativePath,
    exists: true,
    sha256: sha256(buffer),
    newlineStableSha256: sha256(normalizeNewlines(buffer)),
  };
}

function pushFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  message: string,
  filePath?: string,
  evidence?: string[],
): void {
  findings.push({ severity, code, message, filePath, evidence });
}

function covered(source: string, needles: string[]): boolean {
  return needles.every((needle) => source.includes(needle));
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Current Implementation Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Files checked: ${audit.summary.filesChecked}`,
    `- Files present: ${audit.summary.filesPresent}`,
    `- Public APIs expected: ${audit.summary.publicApisExpected}`,
    `- Public APIs present: ${audit.summary.publicApisPresent}`,
    `- Expected target domains: ${audit.summary.expectedTargetDomains}`,
    `- Implemented target domains: ${audit.summary.implementedTargetDomains}`,
    `- Missing spec domains: ${audit.summary.missingSpecDomains}`,
    `- Extra implementation domains: ${audit.summary.extraImplementationDomains}`,
    `- Test assertions expected: ${audit.summary.testAssertionsExpected}`,
    `- Test assertions covered: ${audit.summary.testAssertionsCovered}`,
    `- Core semantics pass: ${audit.summary.coreSemanticsPass ? 'yes' : 'no'}`,
    `- Old spec domain strict pass: ${audit.summary.oldSpecDomainStrictPass ? 'yes' : 'no'}`,
    `- Can create replacement baseline hash lock: ${audit.summary.canCreateReplacementBaselineHashLock ? 'yes' : 'no'}`,
    `- Can create replacement baseline approval receipt: ${audit.summary.canCreateReplacementBaselineApprovalReceipt ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${audit.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Decision',
    '',
    `Decision: \`${audit.decision.decision}\``,
    '',
    audit.decision.reason,
    '',
    `Next required artifact: \`${audit.decision.nextRequiredArtifact}\``,
    '',
    '## Study Target Proof',
    '',
    `- Expected values: ${audit.studyTargetProof.expectedValues.map((value) => `\`${value}\``).join(', ')}`,
    `- Internal values present: ${audit.studyTargetProof.internalValuesPresent.map((value) => `\`${value}\``).join(', ')}`,
    `- Production values present: ${audit.studyTargetProof.productionValuesPresent.map((value) => `\`${value}\``).join(', ')}`,
    `- Source locales present: ${audit.studyTargetProof.sourceLocalesPresent.map((value) => `\`${value}\``).join(', ')}`,
    `- Default target present: \`${audit.studyTargetProof.defaultTargetPresent || 'missing'}\``,
    `- Storage key present: \`${audit.studyTargetProof.storageKeyPresent || 'missing'}\``,
    `- es rejected by StudyTarget: ${audit.studyTargetProof.esRejectedByStudyTarget ? 'yes' : 'no'}`,
    `- Source locale does not select target: ${audit.studyTargetProof.sourceLocaleDoesNotSelectTarget ? 'yes' : 'no'}`,
    `- Production French persistence disabled: ${audit.studyTargetProof.productionFrenchPersistenceDisabled ? 'yes' : 'no'}`,
    '',
    '## Key Builder Proof',
    '',
    `- Present public APIs: ${audit.keyBuilderProof.presentPublicApis.map((value) => `\`${value}\``).join(', ') || 'none'}`,
    `- Missing public APIs: ${audit.keyBuilderProof.missingPublicApis.map((value) => `\`${value}\``).join(', ') || 'none'}`,
    `- Expected target domains: ${audit.keyBuilderProof.expectedTargetDomains.map((value) => `\`${value}\``).join(', ')}`,
    `- Implemented target domains: ${audit.keyBuilderProof.implementedTargetDomains.map((value) => `\`${value}\``).join(', ')}`,
    `- Missing spec domains: ${audit.keyBuilderProof.missingSpecDomains.map((value) => `\`${value}\``).join(', ') || 'none'}`,
    `- Extra implementation domains: ${audit.keyBuilderProof.extraImplementationDomains.map((value) => `\`${value}\``).join(', ') || 'none'}`,
    `- Source-target domains: ${audit.keyBuilderProof.implementedSourceTargetDomains.map((value) => `\`${value}\``).join(', ')}`,
    `- Raw guard examples covered: ${audit.keyBuilderProof.rawGuardExamplesCovered.map((value) => `\`${value}\``).join(', ')}`,
    '',
    'Key format evidence:',
    ...audit.keyBuilderProof.keyFormatEvidence.map((item) => `- ${item}`),
    '',
    '## Test Proof',
    '',
    ...audit.testProof.files.flatMap((file) => [
      `### ${file.path}`,
      '',
      `- Exists: ${file.exists ? 'yes' : 'no'}`,
      `- Covered assertion ids: ${file.coveredAssertionIds.map((value) => `\`${value}\``).join(', ') || 'none'}`,
      `- Missing assertion ids: ${file.missingAssertionIds.map((value) => `\`${value}\``).join(', ') || 'none'}`,
      '',
    ]),
    '## Findings',
    '',
    ...(audit.findings.length > 0
      ? audit.findings.map((finding) => {
          const evidence = finding.evidence?.length ? ` Evidence: ${finding.evidence.map((item) => `\`${item}\``).join(', ')}.` : '';
          return `- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.filePath ? ` (${finding.filePath})` : ''}.${evidence}`;
        })
      : ['No findings.']),
    '',
    '## Allowed Next Work',
    '',
    ...audit.allowedNextWork.map((item) => `- ${item}`),
    '',
    '## Forbidden Actions',
    '',
    ...audit.forbiddenActions.map((item) => `- ${item}`),
    '',
    '## Notes',
    '',
    ...audit.notes.map((item) => `- ${item}`),
    '',
  ];
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_current_impl_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const specPath = path.join(runDir, 'audits', 'p1a_core_contract_spec.json');
  const reconciliationPath = path.join(runDir, 'audits', 'p1a_reconciliation_packet.json');

  const spec = readJson<P1ACoreContractSpec>(specPath);
  const reconciliation = readJson<ReconciliationPacket>(reconciliationPath);
  const studyTargetPath = 'app/study_target.ts';
  const keyBuilderPath = 'app/target_storage_keys.ts';
  const surfaceTestPath = 'tests/gustav_surface_target_switch.test.ts';
  const keyTestPath = 'tests/gustav_target_storage_keys.test.ts';

  const filesToCheck = [studyTargetPath, keyBuilderPath, surfaceTestPath, keyTestPath];
  const fileProofs = filesToCheck.map((file) => fileProof(repoRoot, file));
  const studyTargetSource = fs.readFileSync(path.join(repoRoot, studyTargetPath), 'utf8');
  const keyBuilderSource = fs.readFileSync(path.join(repoRoot, keyBuilderPath), 'utf8');
  const surfaceTestSource = fs.readFileSync(path.join(repoRoot, surfaceTestPath), 'utf8');
  const keyTestSource = fs.readFileSync(path.join(repoRoot, keyTestPath), 'utf8');
  const findings: Finding[] = [];

  const internalValuesPresent = parseConstStringArray(studyTargetSource, 'INTERNAL_STUDY_TARGETS');
  const productionValuesPresent = parseConstStringArray(studyTargetSource, 'STUDY_TARGETS');
  const sourceLocalesPresent = parseConstStringArray(studyTargetSource, 'SOURCE_LOCALES');
  const defaultTargetPresent = /export\s+const\s+DEFAULT_STUDY_TARGET\s*=\s*['"]([^'"]+)['"]/.exec(studyTargetSource)?.[1] ?? null;
  const storageKeyPresent = /export\s+const\s+STUDY_TARGET_STORAGE_KEY\s*=\s*['"]([^'"]+)['"]/.exec(studyTargetSource)?.[1] ?? null;
  const esRejectedByStudyTarget =
    !/export\s+type\s+StudyTarget\s*=\s*[^;]*['"]es['"]/.test(studyTargetSource) &&
    covered(surfaceTestSource, ["isStudyTarget('es')", "assertStudyTarget('es')"]);
  const sourceLocaleDoesNotSelectTarget =
    covered(studyTargetSource, ['isStudyTargetSourceLocale(uiLang)', 'STUDY_TARGETS', '[DEFAULT_STUDY_TARGET]']) &&
    covered(surfaceTestSource, ['SOURCE_LOCALES', 'DEFAULT_STUDY_TARGET']);
  const productionFrenchPersistenceDisabled =
    productionValuesPresent.length === 1 &&
    productionValuesPresent[0] === 'en' &&
    covered(studyTargetSource, ['isProductionStudyTarget(target)', 'setStoredStudyTarget(target: StudyTarget']);

  if (setDiff(spec.studyTargetContract.values, internalValuesPresent).length > 0) {
    pushFinding(
      findings,
      'blocker',
      'study_target_values_missing',
      'Current StudyTarget implementation does not expose every value required by the P1A contract.',
      studyTargetPath,
      setDiff(spec.studyTargetContract.values, internalValuesPresent),
    );
  }
  if (setDiff(sourceLocalesPresent, spec.sourceLocaleContract.values).length > 0 || setDiff(spec.sourceLocaleContract.values, sourceLocalesPresent).length > 0) {
    pushFinding(
      findings,
      'blocker',
      'source_locale_values_mismatch',
      'Current source locale implementation must match the P1A source locale contract exactly.',
      studyTargetPath,
      [`expected=${spec.sourceLocaleContract.values.join(',')}`, `actual=${sourceLocalesPresent.join(',')}`],
    );
  }
  if (defaultTargetPresent !== spec.studyTargetContract.defaultTarget) {
    pushFinding(
      findings,
      'blocker',
      'default_study_target_mismatch',
      `Default target must be ${spec.studyTargetContract.defaultTarget}.`,
      studyTargetPath,
      [`actual=${String(defaultTargetPresent)}`],
    );
  }
  if (storageKeyPresent !== spec.studyTargetContract.storageKey) {
    pushFinding(
      findings,
      'blocker',
      'study_target_storage_key_mismatch',
      `Study target storage key must be ${spec.studyTargetContract.storageKey}.`,
      studyTargetPath,
      [`actual=${String(storageKeyPresent)}`],
    );
  }
  if (!esRejectedByStudyTarget) {
    pushFinding(
      findings,
      'blocker',
      'dev_es_not_rejected',
      'Production StudyTarget must reject dev-only es.',
      studyTargetPath,
    );
  }
  if (productionFrenchPersistenceDisabled) {
    pushFinding(
      findings,
      'info',
      'production_fr_disabled_by_gate',
      'Current implementation supports fr internally but keeps production persisted studyTarget at en. This is stricter than the old P1A spec and must remain explicit in any replacement baseline.',
      studyTargetPath,
    );
  }

  const expectedPublicApis = spec.keyBuilderContract.publicApis.map((api) => api.name).sort();
  const presentPublicApis = expectedPublicApis.filter((apiName) => {
    if (new RegExp(`export\\s+function\\s+${apiName}\\s*\\(`).test(keyBuilderSource)) return true;
    if (new RegExp(`export\\s*\\{[^}]*\\b${apiName}\\b[^}]*\\}`).test(keyBuilderSource)) return true;
    return new RegExp(`export\\s+function\\s+${apiName}\\s*\\(`).test(studyTargetSource);
  });
  const missingPublicApis = setDiff(expectedPublicApis, presentPublicApis);
  if (missingPublicApis.length > 0) {
    pushFinding(
      findings,
      'blocker',
      'public_api_missing',
      'Current implementation is missing P1A public APIs.',
      keyBuilderPath,
      missingPublicApis,
    );
  }

  const implementedTargetDomains = parseConstStringArray(keyBuilderSource, 'TARGET_KEY_DOMAINS');
  const expectedTargetDomains = unique(spec.keyBuilderContract.allowedTargetDomains);
  const missingSpecDomains = setDiff(expectedTargetDomains, implementedTargetDomains);
  const extraImplementationDomains = setDiff(implementedTargetDomains, expectedTargetDomains);
  if (missingSpecDomains.length > 0) {
    pushFinding(
      findings,
      'blocker',
      'target_domain_missing_from_impl',
      'Current implementation does not include every target domain from the old P1A contract.',
      keyBuilderPath,
      missingSpecDomains,
    );
  }
  if (extraImplementationDomains.length > 0) {
    pushFinding(
      findings,
      'blocker',
      'target_domain_outside_old_spec',
      'Current implementation includes target domains outside the old P1A contract. This may be correct product progress, but it requires a contract amendment before replacement baseline approval.',
      keyBuilderPath,
      extraImplementationDomains,
    );
  }

  const implementedSourceTargetDomains = parseConstStringArray(keyBuilderSource, 'SOURCE_TARGET_KEY_DOMAINS');
  const expectedSourceTargetDomains = ['personal_practice'];
  if (setDiff(expectedSourceTargetDomains, implementedSourceTargetDomains).length > 0 || setDiff(implementedSourceTargetDomains, expectedSourceTargetDomains).length > 0) {
    pushFinding(
      findings,
      'blocker',
      'source_target_domain_mismatch',
      'Current source-target domains must remain limited to reviewed source-locale-sensitive domains.',
      keyBuilderPath,
      [`expected=${expectedSourceTargetDomains.join(',')}`, `actual=${implementedSourceTargetDomains.join(',')}`],
    );
  }

  const rawGuardExamples = [
    'lesson_progress_v1',
    'active_recall_items',
    'diagnosis_training_progress_v1:article_a_an',
    'custom_flashcards_v2',
    'achievement_quiz_total_count',
  ];
  const rawGuardExamplesCovered = rawGuardExamples.filter((needle) => keyTestSource.includes(needle));
  if (rawGuardExamplesCovered.length !== rawGuardExamples.length || !keyBuilderSource.includes('RAW_TARGET_SENSITIVE_PATTERNS')) {
    pushFinding(
      findings,
      'blocker',
      'raw_key_guard_incomplete',
      'Current implementation/tests do not prove raw target-sensitive key rejection for the P1A surface.',
      keyBuilderPath,
      setDiff(rawGuardExamples, rawGuardExamplesCovered),
    );
  }

  const targetKeyFormatEvidence = [
    keyBuilderSource.includes("const SEP = '::'") ? "target keys use '::' separator" : 'missing target key separator proof',
    keyBuilderSource.includes("safeDomain + '_v2' + SEP + safeTarget") ? 'targetKey emits <domain>_v2::{studyTarget}' : 'missing targetKey v2 format proof',
    keyBuilderSource.includes('encodeURIComponent(raw)') ? 'targetKey/sourceTargetKey encode id segments' : 'missing id encoding proof',
    keyBuilderSource.includes("safeDomain + '_legacy_en'") ? 'legacyEnglishKey emits *_legacy_en metadata keys' : 'missing legacy English format proof',
  ];
  if (targetKeyFormatEvidence.some((item) => item.startsWith('missing'))) {
    pushFinding(
      findings,
      'blocker',
      'key_format_proof_missing',
      'Current key builder format proof is incomplete.',
      keyBuilderPath,
      targetKeyFormatEvidence.filter((item) => item.startsWith('missing')),
    );
  }

  const assertionNeedles: Record<string, string[]> = {
    'P1A-STUDY-TARGET-VALUES': ["isStudyTarget('en')", "isStudyTarget('fr')", "isStudyTarget('es')", "assertStudyTarget('es')"],
    'P1A-SOURCE-LOCALE-SEPARATION': ['SOURCE_LOCALES', 'DEFAULT_STUDY_TARGET', 'defaultStudyTarget()'],
    'P1A-TARGET-KEY-DISTINCTNESS': ["targetKey('lesson_progress', 'en'", "targetKey('lesson_progress', 'fr'"],
    'P1A-SOURCE-TARGET-KEY-SHAPE': ["sourceTargetKey('personal_practice', 'fr', 'ru'", "sourceTargetKey('personal_practice', 'fr', 'uk'"],
    'P1A-LEGACY-ENGLISH-FALLBACK-LIMIT': ["legacyEnglishKey('lesson_progress'", "not.toContain('fr')"],
    'P1A-RAW-KEY-GUARD': ["assertTargetKey('lesson_progress_v1')", "assertTargetKey('active_recall_items')"],
  };
  const testsByPath = new Map<string, string>([
    [surfaceTestPath, surfaceTestSource],
    [keyTestPath, keyTestSource],
  ]);
  const testProof = spec.testContract.files.map((file) => {
    const source = testsByPath.get(file) || '';
    const assertionIds = spec.testContract.assertions.filter((assertion) => assertion.file === file).map((assertion) => assertion.id);
    const coveredAssertionIds = assertionIds.filter((id) => covered(source, assertionNeedles[id] || []));
    const missingAssertionIds = setDiff(assertionIds, coveredAssertionIds);
    if (missingAssertionIds.length > 0) {
      pushFinding(
        findings,
        'blocker',
        'test_contract_assertion_missing',
        'Current P1A test files do not cover every old P1A contract assertion.',
        file,
        missingAssertionIds,
      );
    }
    return {
      path: file,
      exists: fs.existsSync(path.join(repoRoot, file)),
      coveredAssertionIds,
      missingAssertionIds,
    };
  });

  for (const proof of fileProofs) {
    if (!proof.exists) {
      pushFinding(findings, 'blocker', 'p1a_file_missing', `Missing P1A file ${proof.path}.`, proof.path);
    }
  }
  if (reconciliation.summary.canCreateReplacementBaselineWithoutApproval !== false) {
    pushFinding(
      findings,
      'blocker',
      'reconciliation_permission_invalid',
      'Reconciliation packet must not allow replacement baseline without approval.',
      reconciliationPath,
    );
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const oldSpecDomainStrictPass = missingSpecDomains.length === 0 && extraImplementationDomains.length === 0;
  const coreSemanticsPass =
    blockers === 0 ||
    findings.every((finding) => finding.code === 'target_domain_missing_from_impl' || finding.code === 'target_domain_outside_old_spec' || finding.severity !== 'blocker');
  const canCreateReplacementBaselineHashLock = blockers === 0 && oldSpecDomainStrictPass;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-current-impl-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'HOLD' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aCoreContractSpec: artifactPath(repoRoot, specPath),
      p1aReconciliationPacket: artifactPath(repoRoot, reconciliationPath),
    },
    summary: {
      filesChecked: fileProofs.length,
      filesPresent: fileProofs.filter((proof) => proof.exists).length,
      publicApisExpected: expectedPublicApis.length,
      publicApisPresent: presentPublicApis.length,
      expectedTargetDomains: expectedTargetDomains.length,
      implementedTargetDomains: implementedTargetDomains.length,
      missingSpecDomains: missingSpecDomains.length,
      extraImplementationDomains: extraImplementationDomains.length,
      sourceTargetDomainsExpected: expectedSourceTargetDomains.length,
      sourceTargetDomainsPresent: implementedSourceTargetDomains.length,
      testAssertionsExpected: spec.testContract.assertions.length,
      testAssertionsCovered: testProof.reduce((sum, file) => sum + file.coveredAssertionIds.length, 0),
      blockers,
      warnings,
      coreSemanticsPass,
      oldSpecDomainStrictPass,
      canCreateReplacementBaselineHashLock,
      canCreateReplacementBaselineApprovalReceipt: false,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    fileProofs,
    studyTargetProof: {
      expectedValues: spec.studyTargetContract.values,
      internalValuesPresent,
      productionValuesPresent,
      sourceLocalesPresent,
      defaultTargetPresent,
      storageKeyPresent,
      esRejectedByStudyTarget,
      sourceLocaleDoesNotSelectTarget,
      productionFrenchPersistenceDisabled,
    },
    keyBuilderProof: {
      expectedPublicApis,
      presentPublicApis,
      missingPublicApis,
      expectedTargetDomains,
      implementedTargetDomains,
      missingSpecDomains,
      extraImplementationDomains,
      expectedSourceTargetDomains,
      implementedSourceTargetDomains,
      rawGuardExamplesCovered,
      keyFormatEvidence: targetKeyFormatEvidence,
    },
    testProof: {
      files: testProof,
    },
    findings,
    decision: canCreateReplacementBaselineHashLock
      ? {
          decision: 'replacement_baseline_hash_lock_allowed',
          reason: 'Current implementation satisfies the old P1A contract and may be hash-locked as a replacement baseline. Exact user approval is still required before any approval receipt.',
          nextRequiredArtifact: `docs/gustav/runs/${runId}/audits/p1a_replacement_baseline_hash_lock_audit.json`,
        }
      : {
          decision: 'contract_amendment_required',
          reason: 'Current implementation preserves the core P1A direction but does not strictly match the old P1A domain contract. A replacement baseline hash-lock would hide contract drift, so Gustav must create an amendment or rework packet first.',
          nextRequiredArtifact: `docs/gustav/runs/${runId}/audits/p1a_contract_amendment_packet.json`,
        },
    allowedNextWork: canCreateReplacementBaselineHashLock
      ? [
          'Create replacement P1A hash-lock artifact from the current clean P1A files.',
          'Request exact approval text from the reconciliation packet before creating any approval receipt.',
          'Rerun P1A current apply state, run validator and readiness gate after approval receipt exists.',
        ]
      : [
          'Create a P1A contract amendment packet that reconciles analytics_stats vs target_stats and the extra daily/quiz domains.',
          'Decide whether the extra implementation domains are approved expansion or must be moved to a later slice.',
          'Do not hash-lock the current implementation until the amended contract is explicit.',
        ],
    forbiddenActions: [
      'Do not create p1a_apply_completion_receipt.json from the old stale blueprint.',
      'Do not create p1a_replacement_baseline_approval_receipt.json without exact user approval.',
      'Do not start P1B or French generation from this audit.',
      'Do not modify production app files in this contract audit.',
    ],
    notes: [
      'This audit is read-only and writes only run artifacts.',
      'Current implementation appears to include product progress beyond the old P1A spec; that may be useful, but Gustav must make it explicit before baselining.',
      'The production UI still exposes only English as a persisted study target while French remains internally represented. This is an intentional gate until readiness allows French.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_current_impl_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_current_impl_contract_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A current implementation contract audit: ${audit.status}`);
  console.log(`Core semantics pass: ${audit.summary.coreSemanticsPass ? 'yes' : 'no'}`);
  console.log(`Old spec domain strict pass: ${audit.summary.oldSpecDomainStrictPass ? 'yes' : 'no'}`);
  console.log(`Can create replacement baseline hash lock: ${audit.summary.canCreateReplacementBaselineHashLock ? 'yes' : 'no'}`);
  console.log(`Decision: ${audit.decision.decision}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
