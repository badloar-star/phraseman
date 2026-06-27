import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedSafe: boolean;
  safe: boolean;
  blockers: number;
  passed: boolean;
};

type RegressionInput = {
  p35Ready: boolean;
  languageIsolationPass: boolean;
  runValidatorPass: boolean;
  brainGatePass: boolean;
  aiPromptContractPass: boolean;
  contentQualityGatesPass: boolean;
  storageCloudMapPass: boolean;
  adminSurfacePass: boolean;
  adminRuntimePreflightPass: boolean;
  runtimeServerDeliveryContractPass: boolean;
  serverManifestDraftPresent: boolean;
  targetManifestDraftPresent: boolean;
  scannedRows: number;
  scannedTargetFields: number;
  cyrillicTargetFields: number;
  mojibakeTargetFields: number;
  sourceLanguageLeakFields: number;
  targetEqualsSourceFields: number;
  frenchSignalMissingFields: number;
  rowsMissingTargetLocale: number;
  promptEntrypointsExpected: number;
  promptContractsWithTargetLocale: number;
  promptContractsWithSourceLocales: number;
  promptContractsWithUiLocale: number;
  promptRejectBeforeReturn: number;
  promptRejectBeforeCache: number;
  promptActivationOpenFlags: number;
  promptFalseApprovalFlags: number;
  rowQualityGateRequirements: number;
  rowsWithLanguageIsolationGate: number;
  rowsWithResearchEvidenceGate: number;
  rowsActivationBlocked: number;
  aiQualityGateRequirements: number;
  aiRejectBeforeReturn: number;
  aiRejectBeforeCache: number;
  aiActivationBlocked: number;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  firebaseWritesOpened: boolean;
  asyncStorageWritesOpened: boolean;
  storageActivationApprovedFlags: number;
  storageReadyForApplyOpenFlags: number;
  adminMentionsStudyTarget: boolean;
  adminMentionsSourceLocale: boolean;
  adminRequiredAdminGates: number;
  adminRequiredApprovalFields: number;
  adminServerUploadAllowed: boolean;
  adminFirebaseUploadAllowed: boolean;
  adminReviewerDecisionImportAllowed: boolean;
  adminRuntimeDownloadsEnabled: boolean;
  adminActivationApprovedFlags: number;
  adminReadyForApplyOpenFlags: number;
  adminRuntimeCacheWritesOpened: boolean;
  adminRuntimeReadyCacheStateOpened: boolean;
  adminRuntimeStorageMigrationAllowed: boolean;
  adminRuntimeCloudSyncMigrationAllowed: boolean;
  manifestEntries: number;
  manifestWrongStudyTargetEntries: number;
  manifestWrongSourceLocaleEntries: number;
  manifestServerPathScopedEntries: number;
  manifestCacheKeyScopedEntries: number;
  manifestForbiddenUiLocaleRefs: number;
  manifestTopLevelUploadFlagsOpen: number;
  manifestActivationApprovedEntries: number;
  manifestRuntimeDownloadsEnabledEntries: number;
  manifestReadyForApplyEntries: number;
  productionServerManifestExists: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
};

type Report = {
  schemaVersion: 'gustav-language-isolation-regression-recheck-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    languageIsolationRegressionRecheckState: 'language_isolation_regression_recheck_ready' | 'blocked_by_findings';
    p35Ready: boolean;
    languageIsolationPass: boolean;
    runValidatorPass: boolean;
    brainGatePass: boolean;
    aiPromptContractPass: boolean;
    contentQualityGatesPass: boolean;
    storageCloudMapPass: boolean;
    adminSurfacePass: boolean;
    adminRuntimePreflightPass: boolean;
    runtimeServerDeliveryContractPass: boolean;
    serverManifestDraftPresent: boolean;
    targetManifestDraftPresent: boolean;
    scannedRows: number;
    scannedTargetFields: number;
    cyrillicTargetFields: number;
    mojibakeTargetFields: number;
    sourceLanguageLeakFields: number;
    targetEqualsSourceFields: number;
    frenchSignalMissingFields: number;
    rowsMissingTargetLocale: number;
    promptEntrypointsExpected: number;
    promptContractsWithTargetLocale: number;
    promptContractsWithSourceLocales: number;
    promptContractsWithUiLocale: number;
    promptRejectBeforeReturn: number;
    promptRejectBeforeCache: number;
    promptActivationOpenFlags: number;
    promptFalseApprovalFlags: number;
    rowQualityGateRequirements: number;
    rowsWithLanguageIsolationGate: number;
    rowsWithResearchEvidenceGate: number;
    rowsActivationBlocked: number;
    aiQualityGateRequirements: number;
    aiRejectBeforeReturn: number;
    aiRejectBeforeCache: number;
    aiActivationBlocked: number;
    storageMigrationAllowed: boolean;
    cloudSyncMigrationAllowed: boolean;
    firebaseWritesOpened: boolean;
    asyncStorageWritesOpened: boolean;
    storageActivationApprovedFlags: number;
    storageReadyForApplyOpenFlags: number;
    adminMentionsStudyTarget: boolean;
    adminMentionsSourceLocale: boolean;
    adminRequiredAdminGates: number;
    adminRequiredApprovalFields: number;
    adminServerUploadAllowed: boolean;
    adminFirebaseUploadAllowed: boolean;
    adminReviewerDecisionImportAllowed: boolean;
    adminRuntimeDownloadsEnabled: boolean;
    adminActivationApprovedFlags: number;
    adminReadyForApplyOpenFlags: number;
    adminRuntimeCacheWritesOpened: boolean;
    adminRuntimeReadyCacheStateOpened: boolean;
    adminRuntimeStorageMigrationAllowed: boolean;
    adminRuntimeCloudSyncMigrationAllowed: boolean;
    manifestEntries: number;
    manifestWrongStudyTargetEntries: number;
    manifestWrongSourceLocaleEntries: number;
    manifestServerPathScopedEntries: number;
    manifestCacheKeyScopedEntries: number;
    manifestForbiddenUiLocaleRefs: number;
    manifestTopLevelUploadFlagsOpen: number;
    manifestActivationApprovedEntries: number;
    manifestRuntimeDownloadsEnabledEntries: number;
    manifestReadyForApplyEntries: number;
    productionServerManifestExists: boolean;
    readyForNextNonProductionReadinessApplyBlockerMapRefresh: boolean;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES = ['ru', 'uk'] as const;
const EXPECTED_MANIFEST_ENTRIES = 12;

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return readJson<JsonObject>(filePath);
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr(value: JsonObject, key: string): unknown[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw : [];
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

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function latestBrainGateReport(repoRoot: string): { relativePath: string; report: JsonObject } {
  const docsDir = path.join(repoRoot, 'docs', 'gustav');
  if (!fs.existsSync(docsDir)) return { relativePath: '', report: {} };
  const entries = fs.readdirSync(docsDir)
    .filter((name) => /^GUSTAV_BRAIN_GATE_REPORT_.*\.json$/.test(name))
    .map((name) => {
      const filePath = path.join(docsDir, name);
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, bEntry) => bEntry.mtimeMs - a.mtimeMs);
  if (entries.length === 0) return { relativePath: '', report: {} };
  return {
    relativePath: rel(repoRoot, entries[0].filePath),
    report: readJson<JsonObject>(entries[0].filePath),
  };
}

function countManifestUiLocaleRefs(manifest: JsonObject): number {
  const matches = JSON.stringify(manifest).match(/"uiLocale"|"interfaceLocale"|"uiLanguage"|"interfaceLanguage"/g);
  return matches ? matches.length : 0;
}

function manifestTopLevelOpenFlags(manifest: JsonObject): number {
  return [
    b(manifest, 'serverUploadAllowed'),
    b(manifest, 'firebaseUploadAllowed'),
    b(manifest, 'downloadablePacksPublished'),
    b(manifest, 'runtimeDownloadsEnabled'),
    b(manifest, 'activationApproved'),
    b(manifest, 'readyForRuntimeDownloadActivation'),
    b(manifest, 'readyForApply'),
    b(manifest, 'mayModifyProductionAppFiles'),
  ].filter(Boolean).length;
}

function evaluate(input: RegressionInput): Finding[] {
  const findings: Finding[] = [];

  if (!input.p35Ready) addFinding(findings, 'blocker', 'P35_NOT_READY', 'P36 requires runtime/server manifest consistency recheck V2 to be ready.');
  if (!input.languageIsolationPass) addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_NOT_PASSING', 'French language isolation audit must pass with zero blockers and warnings.');
  if (!input.runValidatorPass) addFinding(findings, 'blocker', 'RUN_VALIDATOR_NOT_PASSING', 'Run validator must pass after the refreshed artifact set.');
  if (!input.brainGatePass) addFinding(findings, 'blocker', 'BRAIN_GATE_NOT_PASSING', 'Latest Gustav brain gate must pass and generation must not be blocked.');
  if (!input.aiPromptContractPass) addFinding(findings, 'blocker', 'AI_PROMPT_CONTRACT_NOT_PASSING', 'AI prompt contract V2 must pass before language isolation regression can advance.');
  if (!input.contentQualityGatesPass) addFinding(findings, 'blocker', 'CONTENT_QUALITY_GATES_NOT_PASSING', 'Content quality gates V2 must pass before language isolation regression can advance.');
  if (!input.storageCloudMapPass) addFinding(findings, 'blocker', 'STORAGE_CLOUD_MAP_NOT_PASSING', 'Storage/cloud target map V2 must pass before language isolation regression can advance.');
  if (!input.adminSurfacePass) addFinding(findings, 'blocker', 'ADMIN_SURFACE_NOT_PASSING', 'Admin delivery surface V2 must pass before language isolation regression can advance.');
  if (!input.adminRuntimePreflightPass) addFinding(findings, 'blocker', 'ADMIN_RUNTIME_PREFLIGHT_NOT_PASSING', 'Admin/server runtime preflight must pass before language isolation regression can advance.');
  if (!input.runtimeServerDeliveryContractPass) addFinding(findings, 'blocker', 'RUNTIME_SERVER_DELIVERY_CONTRACT_NOT_PASSING', 'Runtime/server delivery contract V2 must pass before language isolation regression can advance.');
  if (!input.serverManifestDraftPresent) addFinding(findings, 'blocker', 'SERVER_MANIFEST_DRAFT_MISSING', 'Local server delivery manifest draft must exist.');
  if (!input.targetManifestDraftPresent) addFinding(findings, 'blocker', 'TARGET_MANIFEST_DRAFT_MISSING', 'Target pack manifest draft must exist.');

  if (input.scannedRows <= 0 || input.scannedTargetFields <= 0) addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_SCAN_EMPTY', 'Language isolation audit must scan generated/reviewer target rows and fields.');
  if (input.cyrillicTargetFields > 0) addFinding(findings, 'blocker', 'CYRILLIC_TARGET_FIELDS', `${input.cyrillicTargetFields} French target field(s) contain Cyrillic.`);
  if (input.mojibakeTargetFields > 0) addFinding(findings, 'blocker', 'MOJIBAKE_TARGET_FIELDS', `${input.mojibakeTargetFields} French target field(s) contain mojibake.`);
  if (input.sourceLanguageLeakFields > 0) addFinding(findings, 'blocker', 'SOURCE_LANGUAGE_LEAK_FIELDS', `${input.sourceLanguageLeakFields} target field(s) leak source language.`);
  if (input.targetEqualsSourceFields > 0) addFinding(findings, 'blocker', 'TARGET_EQUALS_SOURCE_FIELDS', `${input.targetEqualsSourceFields} target field(s) equal source text.`);
  if (input.frenchSignalMissingFields > 0) addFinding(findings, 'blocker', 'FRENCH_SIGNAL_MISSING_FIELDS', `${input.frenchSignalMissingFields} target field(s) miss French signal.`);
  if (input.rowsMissingTargetLocale > 0) addFinding(findings, 'blocker', 'ROWS_MISSING_TARGET_LOCALE', `${input.rowsMissingTargetLocale} row(s) are missing targetLocale.`);

  if (input.promptEntrypointsExpected <= 0) addFinding(findings, 'blocker', 'AI_PROMPT_ENTRYPOINTS_EMPTY', 'AI prompt contract must include prompt entrypoints.');
  if (input.promptContractsWithTargetLocale < input.promptEntrypointsExpected) addFinding(findings, 'blocker', 'PROMPT_TARGET_LOCALE_CONTRACT_MISSING', 'Every AI prompt entrypoint must include targetLocale.');
  if (input.promptContractsWithSourceLocales < input.promptEntrypointsExpected) addFinding(findings, 'blocker', 'PROMPT_SOURCE_LOCALE_CONTRACT_MISSING', 'Every AI prompt entrypoint must include sourceLocales.');
  if (input.promptContractsWithUiLocale < input.promptEntrypointsExpected) addFinding(findings, 'blocker', 'PROMPT_UI_LOCALE_CONTRACT_MISSING', 'Every AI prompt entrypoint must distinguish UI locale from study target/source locale.');
  if (input.promptRejectBeforeReturn < input.promptEntrypointsExpected) addFinding(findings, 'blocker', 'PROMPT_REJECT_BEFORE_RETURN_MISSING', 'Every AI prompt entrypoint must reject wrong language before return.');
  if (input.promptRejectBeforeCache < input.promptEntrypointsExpected) addFinding(findings, 'blocker', 'PROMPT_REJECT_BEFORE_CACHE_MISSING', 'Every AI prompt entrypoint must reject wrong language before cache.');
  if (input.promptActivationOpenFlags > 0 || input.promptFalseApprovalFlags > 0) addFinding(findings, 'blocker', 'PROMPT_APPROVAL_FLAGS_OPEN', 'AI prompt contract must not open activation or false approval flags.');

  if (input.rowQualityGateRequirements <= 0) addFinding(findings, 'blocker', 'ROW_QUALITY_GATE_REQUIREMENTS_EMPTY', 'Content quality gate row requirements must be present.');
  if (input.rowsWithLanguageIsolationGate < input.rowQualityGateRequirements) addFinding(findings, 'blocker', 'ROW_LANGUAGE_ISOLATION_GATE_MISSING', 'Every row quality requirement must include language isolation gate.');
  if (input.rowsWithResearchEvidenceGate < input.rowQualityGateRequirements) addFinding(findings, 'blocker', 'ROW_RESEARCH_EVIDENCE_GATE_MISSING', 'Every row quality requirement must include research evidence gate.');
  if (input.rowsActivationBlocked < input.rowQualityGateRequirements) addFinding(findings, 'blocker', 'ROW_ACTIVATION_NOT_BLOCKED', 'Every row quality requirement must keep activation blocked.');
  if (input.aiQualityGateRequirements <= 0) addFinding(findings, 'blocker', 'AI_QUALITY_GATE_REQUIREMENTS_EMPTY', 'AI quality gate requirements must be present.');
  if (input.aiRejectBeforeReturn < input.aiQualityGateRequirements) addFinding(findings, 'blocker', 'AI_REJECT_BEFORE_RETURN_MISSING', 'Every AI quality requirement must reject wrong language before return.');
  if (input.aiRejectBeforeCache < input.aiQualityGateRequirements) addFinding(findings, 'blocker', 'AI_REJECT_BEFORE_CACHE_MISSING', 'Every AI quality requirement must reject wrong language before cache.');
  if (input.aiActivationBlocked < input.aiQualityGateRequirements) addFinding(findings, 'blocker', 'AI_ACTIVATION_NOT_BLOCKED', 'Every AI quality requirement must keep activation blocked.');

  if (input.storageMigrationAllowed || input.cloudSyncMigrationAllowed || input.firebaseWritesOpened || input.asyncStorageWritesOpened) addFinding(findings, 'blocker', 'STORAGE_OR_CLOUD_WRITES_OPEN', 'Storage/cloud migrations and writes must remain closed.');
  if (input.storageActivationApprovedFlags > 0 || input.storageReadyForApplyOpenFlags > 0) addFinding(findings, 'blocker', 'STORAGE_APPLY_OR_ACTIVATION_OPEN', 'Storage/cloud map must not open activation or apply flags.');
  if (!input.adminMentionsStudyTarget || !input.adminMentionsSourceLocale) addFinding(findings, 'blocker', 'ADMIN_LANGUAGE_DIMENSIONS_MISSING', 'Admin surface must expose studyTarget and sourceLocale as separate dimensions.');
  if (input.adminRequiredAdminGates <= 0 || input.adminRequiredApprovalFields <= 0) addFinding(findings, 'blocker', 'ADMIN_REQUIRED_GATES_MISSING', 'Admin surface must keep required approval/admin gates.');
  if (input.adminServerUploadAllowed || input.adminFirebaseUploadAllowed || input.adminReviewerDecisionImportAllowed || input.adminRuntimeDownloadsEnabled) addFinding(findings, 'blocker', 'ADMIN_PUBLICATION_OR_IMPORT_OPEN', 'Admin surface must not open import, upload or runtime downloads.');
  if (input.adminActivationApprovedFlags > 0 || input.adminReadyForApplyOpenFlags > 0) addFinding(findings, 'blocker', 'ADMIN_APPLY_OR_ACTIVATION_OPEN', 'Admin surface must not open activation or apply flags.');
  if (input.adminRuntimeDownloadsEnabled || input.adminRuntimeCacheWritesOpened || input.adminRuntimeReadyCacheStateOpened) addFinding(findings, 'blocker', 'RUNTIME_CACHE_OR_DOWNLOAD_OPEN', 'Runtime downloads/cache writes/ready cache state must remain closed.');
  if (input.adminRuntimeStorageMigrationAllowed || input.adminRuntimeCloudSyncMigrationAllowed) addFinding(findings, 'blocker', 'ADMIN_RUNTIME_STORAGE_CLOUD_MIGRATION_OPEN', 'Admin/runtime preflight must not open storage/cloud migration.');

  if (input.manifestEntries !== EXPECTED_MANIFEST_ENTRIES) addFinding(findings, 'blocker', 'MANIFEST_ENTRY_COUNT_DRIFT', `Expected ${EXPECTED_MANIFEST_ENTRIES} manifest entries, found ${input.manifestEntries}.`);
  if (input.manifestWrongStudyTargetEntries > 0) addFinding(findings, 'blocker', 'MANIFEST_STUDY_TARGET_DRIFT', `${input.manifestWrongStudyTargetEntries} manifest entrie(s) are not studyTarget=fr.`);
  if (input.manifestWrongSourceLocaleEntries > 0) addFinding(findings, 'blocker', 'MANIFEST_SOURCE_LOCALE_DRIFT', `${input.manifestWrongSourceLocaleEntries} manifest entrie(s) are outside ru/uk.`);
  if (input.manifestServerPathScopedEntries !== EXPECTED_MANIFEST_ENTRIES) addFinding(findings, 'blocker', 'MANIFEST_SERVER_PATH_SCOPE_DRIFT', 'Every manifest serverPath must be source-locale scoped.');
  if (input.manifestCacheKeyScopedEntries !== EXPECTED_MANIFEST_ENTRIES) addFinding(findings, 'blocker', 'MANIFEST_CACHE_KEY_SCOPE_DRIFT', 'Every manifest cacheKey must be source-locale scoped.');
  if (input.manifestForbiddenUiLocaleRefs > 0) addFinding(findings, 'blocker', 'MANIFEST_UI_LOCALE_IDENTITY_PRESENT', 'Server manifest must not use UI locale as identity dimension.');
  if (input.manifestTopLevelUploadFlagsOpen > 0 || input.manifestActivationApprovedEntries > 0 || input.manifestRuntimeDownloadsEnabledEntries > 0 || input.manifestReadyForApplyEntries > 0) addFinding(findings, 'blocker', 'MANIFEST_PUBLICATION_OR_APPLY_OPEN', 'Server manifest must not open upload, runtime download, activation or apply flags.');
  if (input.productionServerManifestExists) addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_EXISTS', 'Production server manifest must not exist before explicit approval/publication.');
  if (input.readyForApply || input.mayModifyProductionAppFiles) addFinding(findings, 'blocker', 'APPLY_OR_PRODUCTION_FILE_WRITE_OPEN', 'P36 must not open apply or production app file modification.');

  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: RegressionInput): Probe[] {
  const cases: Array<{ id: string; expectedSafe: boolean; mutate: (input: RegressionInput) => void }> = [
    { id: 'current_language_isolation_regression_is_safe', expectedSafe: true, mutate: () => undefined },
    { id: 'p35_not_ready_is_rejected', expectedSafe: false, mutate: (input) => { input.p35Ready = false; } },
    { id: 'language_isolation_blocked_is_rejected', expectedSafe: false, mutate: (input) => { input.languageIsolationPass = false; } },
    { id: 'cyrillic_target_field_is_rejected', expectedSafe: false, mutate: (input) => { input.cyrillicTargetFields = 1; } },
    { id: 'source_language_leak_is_rejected', expectedSafe: false, mutate: (input) => { input.sourceLanguageLeakFields = 1; } },
    { id: 'missing_target_locale_is_rejected', expectedSafe: false, mutate: (input) => { input.rowsMissingTargetLocale = 1; } },
    { id: 'prompt_target_locale_contract_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.promptContractsWithTargetLocale = Math.max(0, input.promptEntrypointsExpected - 1); } },
    { id: 'prompt_reject_before_return_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.promptRejectBeforeReturn = Math.max(0, input.promptEntrypointsExpected - 1); } },
    { id: 'row_language_gate_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.rowsWithLanguageIsolationGate = Math.max(0, input.rowQualityGateRequirements - 1); } },
    { id: 'ai_reject_before_cache_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.aiRejectBeforeCache = Math.max(0, input.aiQualityGateRequirements - 1); } },
    { id: 'storage_migration_allowed_is_rejected', expectedSafe: false, mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'cloud_sync_migration_allowed_is_rejected', expectedSafe: false, mutate: (input) => { input.cloudSyncMigrationAllowed = true; } },
    { id: 'admin_runtime_download_enabled_is_rejected', expectedSafe: false, mutate: (input) => { input.adminRuntimeDownloadsEnabled = true; } },
    { id: 'manifest_activation_approved_entry_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestActivationApprovedEntries = 1; } },
    { id: 'ready_for_apply_is_rejected', expectedSafe: false, mutate: (input) => { input.readyForApply = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const blockers = evaluate(fixture).filter((finding) => finding.severity === 'blocker').length;
    const safe = blockers === 0;
    return {
      id: test.id,
      expectedSafe: test.expectedSafe,
      safe,
      blockers,
      passed: safe === test.expectedSafe,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Language Isolation Regression Recheck V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Regression state: ${report.summary.languageIsolationRegressionRecheckState}`,
    `- P35 ready: ${report.summary.p35Ready ? 'yes' : 'no'}`,
    `- Language/validator/brain: ${report.summary.languageIsolationPass ? 'PASS' : 'BLOCK'}/${report.summary.runValidatorPass ? 'PASS' : 'BLOCK'}/${report.summary.brainGatePass ? 'PASS' : 'BLOCK'}`,
    `- AI prompt/content/storage/admin/runtime contracts: ${report.summary.aiPromptContractPass ? 'PASS' : 'BLOCK'}/${report.summary.contentQualityGatesPass ? 'PASS' : 'BLOCK'}/${report.summary.storageCloudMapPass ? 'PASS' : 'BLOCK'}/${report.summary.adminSurfacePass ? 'PASS' : 'BLOCK'}/${report.summary.adminRuntimePreflightPass ? 'PASS' : 'BLOCK'}`,
    `- Scanned rows/target fields: ${report.summary.scannedRows}/${report.summary.scannedTargetFields}`,
    `- Cyrillic/mojibake/source leaks/equal-source/missing French signal: ${report.summary.cyrillicTargetFields}/${report.summary.mojibakeTargetFields}/${report.summary.sourceLanguageLeakFields}/${report.summary.targetEqualsSourceFields}/${report.summary.frenchSignalMissingFields}`,
    `- Rows missing targetLocale: ${report.summary.rowsMissingTargetLocale}`,
    `- Prompt target/source/ui/reject-return/reject-cache: ${report.summary.promptContractsWithTargetLocale}/${report.summary.promptContractsWithSourceLocales}/${report.summary.promptContractsWithUiLocale}/${report.summary.promptRejectBeforeReturn}/${report.summary.promptRejectBeforeCache} of ${report.summary.promptEntrypointsExpected}`,
    `- Row language/research/activation-blocked gates: ${report.summary.rowsWithLanguageIsolationGate}/${report.summary.rowsWithResearchEvidenceGate}/${report.summary.rowsActivationBlocked} of ${report.summary.rowQualityGateRequirements}`,
    `- AI reject-return/reject-cache/activation-blocked gates: ${report.summary.aiRejectBeforeReturn}/${report.summary.aiRejectBeforeCache}/${report.summary.aiActivationBlocked} of ${report.summary.aiQualityGateRequirements}`,
    `- Storage/cloud migration/write flags: ${report.summary.storageMigrationAllowed ? 'open' : 'closed'}/${report.summary.cloudSyncMigrationAllowed ? 'open' : 'closed'}/${report.summary.firebaseWritesOpened ? 'open' : 'closed'}/${report.summary.asyncStorageWritesOpened ? 'open' : 'closed'}`,
    `- Admin studyTarget/sourceLocale: ${report.summary.adminMentionsStudyTarget ? 'yes' : 'no'}/${report.summary.adminMentionsSourceLocale ? 'yes' : 'no'}`,
    `- Admin upload/import/runtime/activation/apply flags: ${report.summary.adminServerUploadAllowed ? 'open' : 'closed'}/${report.summary.adminReviewerDecisionImportAllowed ? 'open' : 'closed'}/${report.summary.adminRuntimeDownloadsEnabled ? 'open' : 'closed'}/${report.summary.adminActivationApprovedFlags}/${report.summary.adminReadyForApplyOpenFlags}`,
    `- Manifest entries/server scoped/cache scoped: ${report.summary.manifestEntries}/${report.summary.manifestServerPathScopedEntries}/${report.summary.manifestCacheKeyScopedEntries}`,
    `- Manifest target/source drift: ${report.summary.manifestWrongStudyTargetEntries}/${report.summary.manifestWrongSourceLocaleEntries}`,
    `- Manifest UI refs/open flags/activation/runtime/apply entries: ${report.summary.manifestForbiddenUiLocaleRefs}/${report.summary.manifestTopLevelUploadFlagsOpen}/${report.summary.manifestActivationApprovedEntries}/${report.summary.manifestRuntimeDownloadsEnabledEntries}/${report.summary.manifestReadyForApplyEntries}`,
    `- Ready for next non-production readiness/apply blocker map refresh: ${report.summary.readyForNextNonProductionReadinessApplyBlockerMapRefresh ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is audit-only.',
    '- It does not publish server manifests, upload to Firebase/server, enable runtime downloads, import reviewer decisions, change storage/cloud migration, create approval receipts/hash locks or approve apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');

  const p35Path = path.join(auditsDir, 'runtime_server_manifest_consistency_recheck_v2_packet.json');
  const languagePath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const validatorPath = path.join(auditsDir, 'run_validator_report.json');
  const aiPromptPath = path.join(auditsDir, 'ai_prompt_contract_v2_packet.json');
  const contentQualityPath = path.join(auditsDir, 'content_quality_gates_v2_packet.json');
  const storageCloudPath = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const adminSurfacePath = path.join(auditsDir, 'admin_pack_delivery_surface_v2_packet.json');
  const adminRuntimePath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimeServerContractPath = path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionServerManifestPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const targetManifestDraftPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const outputJsonPath = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.md');

  const p35 = readJsonOrEmpty(p35Path);
  const language = readJsonOrEmpty(languagePath);
  const validator = readJsonOrEmpty(validatorPath);
  const aiPrompt = readJsonOrEmpty(aiPromptPath);
  const contentQuality = readJsonOrEmpty(contentQualityPath);
  const storageCloud = readJsonOrEmpty(storageCloudPath);
  const adminSurface = readJsonOrEmpty(adminSurfacePath);
  const adminRuntime = readJsonOrEmpty(adminRuntimePath);
  const runtimeServerContract = readJsonOrEmpty(runtimeServerContractPath);
  const manifest = readJsonOrEmpty(serverManifestDraftPath);
  const latestBrain = latestBrainGateReport(repoRoot);

  const p35Summary = summaryOf(p35);
  const languageSummary = summaryOf(language);
  const validatorSummary = summaryOf(validator);
  const aiPromptSummary = summaryOf(aiPrompt);
  const contentQualitySummary = summaryOf(contentQuality);
  const storageCloudSummary = summaryOf(storageCloud);
  const adminSurfaceSummary = summaryOf(adminSurface);
  const adminRuntimeSummary = summaryOf(adminRuntime);
  const runtimeServerContractSummary = summaryOf(runtimeServerContract);
  const manifestEntries = arr(manifest, 'entries').map(object);
  const brainDecision = s(latestBrain.report, 'decision');

  const p35Ready =
    s(p35, 'status') === 'PASS' &&
    n(p35Summary, 'blockers') === 0 &&
    s(p35Summary, 'manifestConsistencyState') === 'runtime_server_manifest_consistency_recheck_ready' &&
    b(p35Summary, 'readyForNextNonProductionLanguageIsolationRegressionRecheck') &&
    n(p35Summary, 'gateReportRefs') > 0 &&
    n(p35Summary, 'gateReportRefsCurrentSha') === n(p35Summary, 'gateReportRefs') &&
    n(p35Summary, 'topLevelUploadFlagsOpen') === 0 &&
    n(p35Summary, 'activationApprovedEntries') === 0 &&
    n(p35Summary, 'runtimeDownloadsEnabledEntries') === 0 &&
    n(p35Summary, 'readyForApplyEntries') === 0 &&
    !b(p35Summary, 'readyForApply') &&
    !b(p35Summary, 'mayModifyProductionAppFiles');

  const input: RegressionInput = {
    p35Ready,
    languageIsolationPass: s(language, 'status') === 'PASS' && n(languageSummary, 'blockers') === 0 && n(languageSummary, 'warnings') === 0 && !b(languageSummary, 'readyForApply') && !b(languageSummary, 'mayModifyProductionAppFiles'),
    runValidatorPass: s(validator, 'status') === 'PASS' && n(validatorSummary, 'blockers') === 0,
    brainGatePass: brainDecision === 'PASS' && !b(latestBrain.report, 'generationBlocked'),
    aiPromptContractPass: s(aiPrompt, 'status') === 'PASS' && n(aiPromptSummary, 'blockers') === 0 && !b(aiPromptSummary, 'readyForApply') && !b(aiPromptSummary, 'mayModifyProductionAppFiles'),
    contentQualityGatesPass: s(contentQuality, 'status') === 'PASS' && n(contentQualitySummary, 'blockers') === 0 && !b(contentQualitySummary, 'readyForApply') && !b(contentQualitySummary, 'mayModifyProductionAppFiles'),
    storageCloudMapPass: s(storageCloud, 'status') === 'PASS' && n(storageCloudSummary, 'blockers') === 0 && !b(storageCloudSummary, 'readyForApply') && !b(storageCloudSummary, 'mayModifyProductionAppFiles'),
    adminSurfacePass: s(adminSurface, 'status') === 'PASS' && n(adminSurfaceSummary, 'blockers') === 0 && !b(adminSurfaceSummary, 'readyForApply') && !b(adminSurfaceSummary, 'mayModifyProductionAppFiles'),
    adminRuntimePreflightPass: s(adminRuntime, 'status') === 'PASS' && n(adminRuntimeSummary, 'blockers') === 0 && !b(adminRuntimeSummary, 'readyForApply') && !b(adminRuntimeSummary, 'mayModifyProductionAppFiles'),
    runtimeServerDeliveryContractPass: s(runtimeServerContract, 'status') === 'PASS' && n(runtimeServerContractSummary, 'blockers') === 0 && !b(runtimeServerContractSummary, 'readyForApply') && !b(runtimeServerContractSummary, 'mayModifyProductionAppFiles'),
    serverManifestDraftPresent: fs.existsSync(serverManifestDraftPath),
    targetManifestDraftPresent: fs.existsSync(targetManifestDraftPath),
    scannedRows: n(languageSummary, 'scannedRows'),
    scannedTargetFields: n(languageSummary, 'scannedTargetFields'),
    cyrillicTargetFields: n(languageSummary, 'cyrillicTargetFields'),
    mojibakeTargetFields: n(languageSummary, 'mojibakeTargetFields'),
    sourceLanguageLeakFields: n(languageSummary, 'sourceLanguageLeakFields'),
    targetEqualsSourceFields: n(languageSummary, 'targetEqualsSourceFields'),
    frenchSignalMissingFields: n(languageSummary, 'frenchSignalMissingFields'),
    rowsMissingTargetLocale: n(languageSummary, 'rowsMissingTargetLocale'),
    promptEntrypointsExpected: n(aiPromptSummary, 'aiPromptEntrypointsExpected'),
    promptContractsWithTargetLocale: n(aiPromptSummary, 'contractsWithTargetLocale'),
    promptContractsWithSourceLocales: n(aiPromptSummary, 'contractsWithSourceLocales'),
    promptContractsWithUiLocale: n(aiPromptSummary, 'contractsWithUiLocale'),
    promptRejectBeforeReturn: n(aiPromptSummary, 'contractsWithRejectBeforeReturn'),
    promptRejectBeforeCache: n(aiPromptSummary, 'contractsWithRejectBeforeCache'),
    promptActivationOpenFlags: n(aiPromptSummary, 'activationOpenFlags'),
    promptFalseApprovalFlags: n(aiPromptSummary, 'falseApprovalFlags'),
    rowQualityGateRequirements: n(contentQualitySummary, 'rowQualityGateRequirements'),
    rowsWithLanguageIsolationGate: n(contentQualitySummary, 'rowsWithLanguageIsolationGate'),
    rowsWithResearchEvidenceGate: n(contentQualitySummary, 'rowsWithResearchEvidenceGate'),
    rowsActivationBlocked: n(contentQualitySummary, 'rowsActivationBlocked'),
    aiQualityGateRequirements: n(contentQualitySummary, 'aiQualityGateRequirements'),
    aiRejectBeforeReturn: n(contentQualitySummary, 'aiRejectBeforeReturn'),
    aiRejectBeforeCache: n(contentQualitySummary, 'aiRejectBeforeCache'),
    aiActivationBlocked: n(contentQualitySummary, 'aiActivationBlocked'),
    storageMigrationAllowed: b(storageCloudSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(storageCloudSummary, 'cloudSyncMigrationAllowed'),
    firebaseWritesOpened: b(storageCloudSummary, 'firebaseWritesOpenedByThisPacket'),
    asyncStorageWritesOpened: b(storageCloudSummary, 'asyncStorageWritesOpenedByThisPacket'),
    storageActivationApprovedFlags: n(storageCloudSummary, 'activationApprovedFlags'),
    storageReadyForApplyOpenFlags: n(storageCloudSummary, 'readyForApplyOpenFlags'),
    adminMentionsStudyTarget: b(adminSurfaceSummary, 'adminMentionsStudyTarget'),
    adminMentionsSourceLocale: b(adminSurfaceSummary, 'adminMentionsSourceLocale'),
    adminRequiredAdminGates: n(adminSurfaceSummary, 'requiredAdminGates'),
    adminRequiredApprovalFields: n(adminSurfaceSummary, 'requiredApprovalFields'),
    adminServerUploadAllowed: b(adminSurfaceSummary, 'serverUploadAllowed'),
    adminFirebaseUploadAllowed: b(adminSurfaceSummary, 'firebaseUploadAllowed'),
    adminReviewerDecisionImportAllowed: b(adminSurfaceSummary, 'reviewerDecisionImportAllowed'),
    adminRuntimeDownloadsEnabled: b(adminSurfaceSummary, 'runtimeDownloadsEnabled') || b(adminRuntimeSummary, 'runtimeDownloadsEnabled'),
    adminActivationApprovedFlags: n(adminSurfaceSummary, 'activationApprovedFlags'),
    adminReadyForApplyOpenFlags: n(adminSurfaceSummary, 'readyForApplyOpenFlags'),
    adminRuntimeCacheWritesOpened: b(adminRuntimeSummary, 'runtimeCacheWritesOpened'),
    adminRuntimeReadyCacheStateOpened: b(adminRuntimeSummary, 'runtimeReadyCacheStateOpened'),
    adminRuntimeStorageMigrationAllowed: b(adminRuntimeSummary, 'storageMigrationAllowed'),
    adminRuntimeCloudSyncMigrationAllowed: b(adminRuntimeSummary, 'cloudSyncMigrationAllowed'),
    manifestEntries: manifestEntries.length,
    manifestWrongStudyTargetEntries: manifestEntries.filter((entry) => s(entry, 'studyTarget') !== 'fr').length,
    manifestWrongSourceLocaleEntries: manifestEntries.filter((entry) => !SOURCE_LOCALES.includes(s(entry, 'sourceLocale') as 'ru' | 'uk')).length,
    manifestServerPathScopedEntries: manifestEntries.filter((entry) => s(entry, 'serverPath').startsWith(`course-packs/fr/${s(entry, 'sourceLocale')}/`)).length,
    manifestCacheKeyScopedEntries: manifestEntries.filter((entry) => s(entry, 'cacheKey').startsWith(`fr/${s(entry, 'sourceLocale')}/`)).length,
    manifestForbiddenUiLocaleRefs: countManifestUiLocaleRefs(manifest),
    manifestTopLevelUploadFlagsOpen: manifestTopLevelOpenFlags(manifest),
    manifestActivationApprovedEntries: manifestEntries.filter((entry) => b(entry, 'activationApproved')).length,
    manifestRuntimeDownloadsEnabledEntries: manifestEntries.filter((entry) => b(entry, 'runtimeDownloadsEnabled')).length,
    manifestReadyForApplyEntries: manifestEntries.filter((entry) => b(entry, 'readyForApply')).length,
    productionServerManifestExists: fs.existsSync(productionServerManifestPath),
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };

  const findings = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;

  const report: Report = {
    schemaVersion: 'gustav-language-isolation-regression-recheck-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: accepted ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      runtimeServerManifestConsistencyRecheckV2Packet: rel(repoRoot, p35Path),
      frenchLanguageIsolationAudit: rel(repoRoot, languagePath),
      runValidatorReport: rel(repoRoot, validatorPath),
      latestBrainGateReport: latestBrain.relativePath,
      aiPromptContractV2Packet: rel(repoRoot, aiPromptPath),
      contentQualityGatesV2Packet: rel(repoRoot, contentQualityPath),
      storageCloudTargetMapV2Packet: rel(repoRoot, storageCloudPath),
      adminPackDeliverySurfaceV2Packet: rel(repoRoot, adminSurfacePath),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, adminRuntimePath),
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimeServerContractPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestDraftPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      languageIsolationRegressionRecheckState: accepted ? 'language_isolation_regression_recheck_ready' : 'blocked_by_findings',
      ...input,
      readyForNextNonProductionReadinessApplyBlockerMapRefresh: accepted,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV language isolation regression recheck V2 packet: ${report.status}`);
  console.log(`Regression state: ${report.summary.languageIsolationRegressionRecheckState}`);
  console.log(`Scanned rows/target fields: ${report.summary.scannedRows}/${report.summary.scannedTargetFields}`);
  console.log(`Prompt contracts: ${report.summary.promptContractsWithTargetLocale}/${report.summary.promptEntrypointsExpected}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
