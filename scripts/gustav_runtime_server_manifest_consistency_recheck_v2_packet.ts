import * as crypto from 'node:crypto';
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

type ManifestEntry = JsonObject;

type EvaluationInput = {
  repoRoot: string;
  p34Ready: boolean;
  publishPreflightReady: boolean;
  adminRuntimePreflightReady: boolean;
  previewReady: boolean;
  cacheRollbackReady: boolean;
  languageIsolationPass: boolean;
  runValidatorPass: boolean;
  brainGatePass: boolean;
  manifestDraftPresent: boolean;
  targetManifestPresent: boolean;
  productionServerManifestExists: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
  activationApproved: boolean;
  readyForRuntimeDownloadActivation: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  inputHashes: JsonObject;
  manifest: JsonObject;
  targetManifest: JsonObject;
  manifestEntries: ManifestEntry[];
  inputHashTargets: Record<string, string>;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: string[];
  surfaces: string[];
  manifestConsistencyState: 'runtime_server_manifest_consistency_recheck_ready' | 'blocked_by_findings';
  p34Ready: boolean;
  publishPreflightReady: boolean;
  adminRuntimePreflightReady: boolean;
  previewReady: boolean;
  cacheRollbackReady: boolean;
  languageIsolationPass: boolean;
  runValidatorPass: boolean;
  brainGatePass: boolean;
  manifestDraftPresent: boolean;
  targetManifestPresent: boolean;
  manifestEntries: number;
  expectedManifestEntries: number;
  sourceLocalesCovered: number;
  surfacesCovered: number;
  completeSourceSurfaceMatrix: boolean;
  duplicateSourceSurfaceEntries: number;
  wrongStudyTargetEntries: number;
  wrongSourceLocaleEntries: number;
  wrongSurfaceEntries: number;
  entriesWithActualSha256: number;
  entriesWithActualByteSize: number;
  entriesWithPayloadHashMatch: number;
  entriesWithPayloadByteSizeMatch: number;
  entriesWithChecksumReportMatch: number;
  entriesWithGateReportRefs: number;
  gateReportRefs: number;
  gateReportRefsCurrentSha: number;
  gateReportRefsMissing: number;
  gateReportRefShaMismatches: number;
  manifestInputHashes: number;
  manifestInputHashesCurrent: number;
  manifestInputHashMismatches: number;
  serverPathScopedEntries: number;
  cacheKeyScopedEntries: number;
  serverPathsWithPayloadSha: number;
  cacheKeysWithPayloadSha: number;
  forbiddenUiLocaleRefs: number;
  forbiddenOpenFlags: number;
  topLevelUploadFlagsOpen: number;
  activationApprovedEntries: number;
  runtimeDownloadsEnabledEntries: number;
  readyForApplyEntries: number;
  productionServerManifestExists: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
  activationApproved: boolean;
  readyForRuntimeDownloadActivation: boolean;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  readyForNextNonProductionLanguageIsolationRegressionRecheck: boolean;
  fixtureProbesPassed: number;
  fixtureProbes: number;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-runtime-server-manifest-consistency-recheck-v2-packet-v0';
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
  summary: Evaluation;
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

const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'];
const EXPECTED_ENTRIES = SOURCE_LOCALES.length * SURFACES.length;
const INPUT_HASH_KEYS = [
  'serverDeliveryManifestPreviewV2Packet',
  'closedLocalPayloadMaterializationV2Packet',
  'targetPackManifestV2Draft',
];

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

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function resolveRepoPath(repoRoot: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
}

function countTextMatches(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
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

function isActualSha(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function isExpectedSourceLocale(value: string): boolean {
  return SOURCE_LOCALES.includes(value);
}

function isExpectedSurface(value: string): boolean {
  return SURFACES.includes(value);
}

function sourceSurfaceKey(entry: ManifestEntry): string {
  return `${s(entry, 'sourceLocale')}/${s(entry, 'surface')}`;
}

function computeManifestMetrics(input: EvaluationInput): Omit<Evaluation, 'manifestConsistencyState' | 'readyForNextNonProductionLanguageIsolationRegressionRecheck' | 'fixtureProbesPassed' | 'fixtureProbes' | 'blockers' | 'warnings'> {
  const entries = input.manifestEntries;
  const entryKeys = entries.map(sourceSurfaceKey);
  const expectedKeys: string[] = [];
  for (const sourceLocale of SOURCE_LOCALES) {
    for (const surface of SURFACES) expectedKeys.push(`${sourceLocale}/${surface}`);
  }
  const uniqueEntryKeys = new Set(entryKeys);
  const duplicateSourceSurfaceEntries = entryKeys.length - uniqueEntryKeys.size;
  const completeSourceSurfaceMatrix = expectedKeys.every((key) => uniqueEntryKeys.has(key)) && uniqueEntryKeys.size === expectedKeys.length;

  let entriesWithPayloadHashMatch = 0;
  let entriesWithPayloadByteSizeMatch = 0;
  let entriesWithChecksumReportMatch = 0;
  let entriesWithGateReportRefs = 0;
  let gateReportRefs = 0;
  let gateReportRefsCurrentSha = 0;
  let gateReportRefsMissing = 0;
  let gateReportRefShaMismatches = 0;

  for (const entry of entries) {
    const payloadShard = s(entry, 'payloadShard');
    const payloadPath = payloadShard ? resolveRepoPath(input.repoRoot, payloadShard) : '';
    if (payloadPath && fs.existsSync(payloadPath)) {
      const stats = fs.statSync(payloadPath);
      if (sha256File(payloadPath) === s(entry, 'payloadSha256')) entriesWithPayloadHashMatch += 1;
      if (stats.size === n(entry, 'payloadBytes')) entriesWithPayloadByteSizeMatch += 1;
    }

    const checksumReport = s(entry, 'checksumReport');
    const checksumPath = checksumReport ? resolveRepoPath(input.repoRoot, checksumReport) : '';
    if (checksumPath && fs.existsSync(checksumPath)) {
      const checksum = readJsonOrEmpty(checksumPath);
      const checksumMatches =
        s(checksum, 'studyTarget') === 'fr' &&
        s(checksum, 'sourceLocale') === s(entry, 'sourceLocale') &&
        s(checksum, 'surface') === s(entry, 'surface') &&
        s(checksum, 'payloadShard') === payloadShard &&
        s(checksum, 'payloadSha256') === s(entry, 'payloadSha256') &&
        n(checksum, 'payloadBytes') === n(entry, 'payloadBytes') &&
        s(checksum, 'cacheKey') === s(entry, 'cacheKey') &&
        s(checksum, 'serverPathPreview') === s(entry, 'serverPath');
      if (checksumMatches) entriesWithChecksumReportMatch += 1;
    }

    const refs = arr(entry, 'gateReportRefs').map(object);
    if (refs.length > 0) entriesWithGateReportRefs += 1;
    for (const ref of refs) {
      gateReportRefs += 1;
      const refPath = s(ref, 'path');
      const expectedSha = s(ref, 'sha256');
      const absoluteRefPath = refPath ? resolveRepoPath(input.repoRoot, refPath) : '';
      if (!absoluteRefPath || !fs.existsSync(absoluteRefPath)) {
        gateReportRefsMissing += 1;
      } else if (sha256File(absoluteRefPath) === expectedSha) {
        gateReportRefsCurrentSha += 1;
      } else {
        gateReportRefShaMismatches += 1;
      }
    }
  }

  let manifestInputHashes = 0;
  let manifestInputHashesCurrent = 0;
  let manifestInputHashMismatches = 0;
  for (const key of INPUT_HASH_KEYS) {
    const expectedSha = s(input.inputHashes, key);
    const targetPath = input.inputHashTargets[key];
    if (!expectedSha || !targetPath || !fs.existsSync(targetPath)) {
      manifestInputHashMismatches += 1;
      continue;
    }
    manifestInputHashes += 1;
    if (sha256File(targetPath) === expectedSha) manifestInputHashesCurrent += 1;
    else manifestInputHashMismatches += 1;
  }

  const manifestText = JSON.stringify(input.manifest);
  const forbiddenUiLocaleRefs = countTextMatches(manifestText, /"uiLocale"|"interfaceLocale"|"uiLanguage"|"interfaceLanguage"/g);
  const forbiddenOpenFlags = countTextMatches(manifestText, /"serverUploadAllowed"\s*:\s*true|"firebaseUploadAllowed"\s*:\s*true|"downloadablePacksPublished"\s*:\s*true|"runtimeDownloadsEnabled"\s*:\s*true|"activationApproved"\s*:\s*true|"readyForRuntimeDownloadActivation"\s*:\s*true|"readyForApply"\s*:\s*true|"mayModifyProductionAppFiles"\s*:\s*true/g);
  const topLevelUploadFlagsOpen = [
    input.serverUploadAllowed,
    input.firebaseUploadAllowed,
    input.downloadablePacksPublished,
    input.runtimeDownloadsEnabled,
    input.activationApproved,
    input.readyForRuntimeDownloadActivation,
    input.readyForApply,
    input.mayModifyProductionAppFiles,
  ].filter(Boolean).length;

  return {
    targetLocale: 'fr',
    sourceLocales: SOURCE_LOCALES,
    surfaces: SURFACES,
    p34Ready: input.p34Ready,
    publishPreflightReady: input.publishPreflightReady,
    adminRuntimePreflightReady: input.adminRuntimePreflightReady,
    previewReady: input.previewReady,
    cacheRollbackReady: input.cacheRollbackReady,
    languageIsolationPass: input.languageIsolationPass,
    runValidatorPass: input.runValidatorPass,
    brainGatePass: input.brainGatePass,
    manifestDraftPresent: input.manifestDraftPresent,
    targetManifestPresent: input.targetManifestPresent,
    manifestEntries: entries.length,
    expectedManifestEntries: EXPECTED_ENTRIES,
    sourceLocalesCovered: new Set(entries.map((entry) => s(entry, 'sourceLocale')).filter(isExpectedSourceLocale)).size,
    surfacesCovered: new Set(entries.map((entry) => s(entry, 'surface')).filter(isExpectedSurface)).size,
    completeSourceSurfaceMatrix,
    duplicateSourceSurfaceEntries,
    wrongStudyTargetEntries: entries.filter((entry) => s(entry, 'studyTarget') !== 'fr').length,
    wrongSourceLocaleEntries: entries.filter((entry) => !isExpectedSourceLocale(s(entry, 'sourceLocale'))).length,
    wrongSurfaceEntries: entries.filter((entry) => !isExpectedSurface(s(entry, 'surface'))).length,
    entriesWithActualSha256: entries.filter((entry) => isActualSha(s(entry, 'payloadSha256'))).length,
    entriesWithActualByteSize: entries.filter((entry) => n(entry, 'payloadBytes') > 0).length,
    entriesWithPayloadHashMatch,
    entriesWithPayloadByteSizeMatch,
    entriesWithChecksumReportMatch,
    entriesWithGateReportRefs,
    gateReportRefs,
    gateReportRefsCurrentSha,
    gateReportRefsMissing,
    gateReportRefShaMismatches,
    manifestInputHashes,
    manifestInputHashesCurrent,
    manifestInputHashMismatches,
    serverPathScopedEntries: entries.filter((entry) => s(entry, 'serverPath').startsWith(`course-packs/fr/${s(entry, 'sourceLocale')}/`)).length,
    cacheKeyScopedEntries: entries.filter((entry) => s(entry, 'cacheKey').startsWith(`fr/${s(entry, 'sourceLocale')}/`)).length,
    serverPathsWithPayloadSha: entries.filter((entry) => s(entry, 'serverPath').includes(s(entry, 'payloadSha256'))).length,
    cacheKeysWithPayloadSha: entries.filter((entry) => s(entry, 'cacheKey').includes(s(entry, 'payloadSha256'))).length,
    forbiddenUiLocaleRefs,
    forbiddenOpenFlags,
    topLevelUploadFlagsOpen,
    activationApprovedEntries: entries.filter((entry) => b(entry, 'activationApproved')).length,
    runtimeDownloadsEnabledEntries: entries.filter((entry) => b(entry, 'runtimeDownloadsEnabled')).length,
    readyForApplyEntries: entries.filter((entry) => b(entry, 'readyForApply')).length,
    productionServerManifestExists: input.productionServerManifestExists,
    serverUploadAllowed: input.serverUploadAllowed,
    firebaseUploadAllowed: input.firebaseUploadAllowed,
    downloadablePacksPublished: input.downloadablePacksPublished,
    runtimeDownloadsEnabled: input.runtimeDownloadsEnabled,
    activationApproved: input.activationApproved,
    readyForRuntimeDownloadActivation: input.readyForRuntimeDownloadActivation,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function evaluateInput(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const metrics = computeManifestMetrics(input);

  if (!input.p34Ready) addFinding(findings, 'blocker', 'P34_NOT_READY', 'P35 requires fresh LLM official-source evidence with legacy review residue removed.');
  if (!input.publishPreflightReady) addFinding(findings, 'blocker', 'PUBLISH_PREFLIGHT_NOT_READY', 'Server delivery publish preflight must be PASS and ready for admin/server delivery review.');
  if (!input.adminRuntimePreflightReady) addFinding(findings, 'blocker', 'ADMIN_RUNTIME_PREFLIGHT_NOT_READY', 'Admin/server delivery runtime preflight must be PASS and ready for activation blocker planning.');
  if (!input.previewReady) addFinding(findings, 'blocker', 'SERVER_MANIFEST_PREVIEW_NOT_READY', 'Server delivery manifest preview must remain PASS and ready for runtime cache integrity.');
  if (!input.cacheRollbackReady) addFinding(findings, 'blocker', 'CACHE_ROLLBACK_NOT_READY', 'Runtime cache integrity/rollback must remain PASS and ready for the next closed gate.');
  if (!input.languageIsolationPass) addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_NOT_PASSING', 'French language isolation audit must pass.');
  if (!input.runValidatorPass) addFinding(findings, 'blocker', 'RUN_VALIDATOR_NOT_PASSING', 'Run validator must pass.');
  if (!input.brainGatePass) addFinding(findings, 'blocker', 'BRAIN_GATE_NOT_PASSING', 'Latest Gustav brain gate must pass.');
  if (!input.manifestDraftPresent) addFinding(findings, 'blocker', 'SERVER_MANIFEST_DRAFT_MISSING', 'Local server_delivery_manifest_v2_draft.json is required.');
  if (!input.targetManifestPresent) addFinding(findings, 'blocker', 'TARGET_PACK_MANIFEST_DRAFT_MISSING', 'Target pack manifest V2 draft is required.');
  if (s(input.manifest, 'studyTarget') !== 'fr' || s(input.manifest, 'targetLocale') !== 'fr') addFinding(findings, 'blocker', 'SERVER_MANIFEST_TARGET_DRIFT', 'Server manifest draft must be scoped to studyTarget=fr and targetLocale=fr.');
  if (s(input.targetManifest, 'studyTarget') !== 'fr' || s(input.targetManifest, 'targetLocale') !== 'fr') addFinding(findings, 'blocker', 'TARGET_MANIFEST_TARGET_DRIFT', 'Target pack manifest must be scoped to studyTarget=fr and targetLocale=fr.');
  if (metrics.manifestEntries !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'SERVER_MANIFEST_ENTRY_COUNT_DRIFT', `Expected ${EXPECTED_ENTRIES} runtime/server manifest entries, found ${metrics.manifestEntries}.`);
  if (!metrics.completeSourceSurfaceMatrix) addFinding(findings, 'blocker', 'SOURCE_SURFACE_MATRIX_INCOMPLETE', 'Every ru/uk x runtime surface combination must exist exactly once.');
  if (metrics.duplicateSourceSurfaceEntries > 0) addFinding(findings, 'blocker', 'DUPLICATE_SOURCE_SURFACE_ENTRIES', `${metrics.duplicateSourceSurfaceEntries} duplicate sourceLocale/surface entrie(s).`);
  if (metrics.wrongStudyTargetEntries > 0) addFinding(findings, 'blocker', 'ENTRY_STUDY_TARGET_DRIFT', `${metrics.wrongStudyTargetEntries} manifest entrie(s) are not studyTarget=fr.`);
  if (metrics.wrongSourceLocaleEntries > 0) addFinding(findings, 'blocker', 'ENTRY_SOURCE_LOCALE_DRIFT', `${metrics.wrongSourceLocaleEntries} manifest entrie(s) are outside ru/uk.`);
  if (metrics.wrongSurfaceEntries > 0) addFinding(findings, 'blocker', 'ENTRY_SURFACE_DRIFT', `${metrics.wrongSurfaceEntries} manifest entrie(s) use unexpected runtime surfaces.`);
  if (metrics.entriesWithActualSha256 !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'MISSING_ACTUAL_SHA256', 'Every server manifest entry must have an actual sha256, not a placeholder.');
  if (metrics.entriesWithActualByteSize !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'MISSING_ACTUAL_BYTE_SIZE', 'Every server manifest entry must have an actual byte size.');
  if (metrics.entriesWithPayloadHashMatch !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'PAYLOAD_HASH_MISMATCH', 'Every server manifest entry must match the local payload shard sha256.');
  if (metrics.entriesWithPayloadByteSizeMatch !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'PAYLOAD_BYTE_SIZE_MISMATCH', 'Every server manifest entry must match the local payload shard byte size.');
  if (metrics.entriesWithChecksumReportMatch !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'CHECKSUM_REPORT_MISMATCH', 'Every server manifest entry must match its checksum report.');
  if (metrics.entriesWithGateReportRefs !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'MISSING_GATE_REPORT_REFS', 'Every server manifest entry must keep gate report refs.');
  if (metrics.gateReportRefsMissing > 0) addFinding(findings, 'blocker', 'GATE_REPORT_REF_MISSING', `${metrics.gateReportRefsMissing} gate report ref file(s) are missing.`);
  if (metrics.gateReportRefShaMismatches > 0) addFinding(findings, 'blocker', 'GATE_REPORT_REF_SHA_STALE', `${metrics.gateReportRefShaMismatches} gate report ref sha256 value(s) are stale.`);
  if (metrics.manifestInputHashes !== INPUT_HASH_KEYS.length || metrics.manifestInputHashMismatches > 0) addFinding(findings, 'blocker', 'SERVER_MANIFEST_INPUT_HASH_STALE', 'Server manifest inputHashes must match current preview, closed payload materialization and target manifest files.');
  if (metrics.serverPathScopedEntries !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'SERVER_PATH_SOURCE_SCOPE_DRIFT', 'Every serverPath must start with course-packs/fr/<sourceLocale>/...');
  if (metrics.cacheKeyScopedEntries !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'CACHE_KEY_SOURCE_SCOPE_DRIFT', 'Every cacheKey must start with fr/<sourceLocale>/...');
  if (metrics.serverPathsWithPayloadSha !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'SERVER_PATH_MISSING_PAYLOAD_SHA', 'Every serverPath must include the payload sha256.');
  if (metrics.cacheKeysWithPayloadSha !== EXPECTED_ENTRIES) addFinding(findings, 'blocker', 'CACHE_KEY_MISSING_PAYLOAD_SHA', 'Every cacheKey must include the payload sha256.');
  if (metrics.forbiddenUiLocaleRefs > 0) addFinding(findings, 'blocker', 'UI_LOCALE_IDENTITY_IN_SERVER_MANIFEST', `${metrics.forbiddenUiLocaleRefs} UI/interface locale reference(s) found in server manifest draft.`);
  if (metrics.forbiddenOpenFlags > 0 || metrics.topLevelUploadFlagsOpen > 0) addFinding(findings, 'blocker', 'FORBIDDEN_PUBLICATION_OR_APPLY_FLAG_OPEN', 'Server upload, Firebase upload, runtime download, activation, download publication and apply flags must remain closed.');
  if (metrics.activationApprovedEntries > 0) addFinding(findings, 'blocker', 'ENTRY_ACTIVATION_APPROVED_OPEN', `${metrics.activationApprovedEntries} manifest entrie(s) have activationApproved=true.`);
  if (metrics.runtimeDownloadsEnabledEntries > 0) addFinding(findings, 'blocker', 'ENTRY_RUNTIME_DOWNLOADS_OPEN', `${metrics.runtimeDownloadsEnabledEntries} manifest entrie(s) have runtimeDownloadsEnabled=true.`);
  if (metrics.readyForApplyEntries > 0) addFinding(findings, 'blocker', 'ENTRY_READY_FOR_APPLY_OPEN', `${metrics.readyForApplyEntries} manifest entrie(s) have readyForApply=true.`);
  if (metrics.productionServerManifestExists) addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_EXISTS', 'Production server_delivery_manifest_v2.json must not exist before explicit approval and publication.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;
  return {
    evaluation: {
      ...metrics,
      manifestConsistencyState: accepted ? 'runtime_server_manifest_consistency_recheck_ready' : 'blocked_by_findings',
      readyForNextNonProductionLanguageIsolationRegressionRecheck: accepted,
      fixtureProbesPassed: 0,
      fixtureProbes: 0,
      blockers,
      warnings,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedSafe: boolean; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_manifest_consistency_is_safe', expectedSafe: true, mutate: () => undefined },
    { id: 'p34_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.p34Ready = false; } },
    { id: 'publish_preflight_not_ready_is_rejected', expectedSafe: false, mutate: (input) => { input.publishPreflightReady = false; } },
    { id: 'admin_runtime_preflight_not_ready_is_rejected', expectedSafe: false, mutate: (input) => { input.adminRuntimePreflightReady = false; } },
    { id: 'missing_manifest_entry_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries.pop(); } },
    { id: 'wrong_study_target_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].studyTarget = 'en'; } },
    { id: 'wrong_source_locale_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].sourceLocale = 'ru-ui'; } },
    { id: 'wrong_server_path_scope_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].serverPath = 'course-packs/fr/uk/lesson/bad.json'; } },
    { id: 'wrong_cache_key_scope_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].cacheKey = 'fr/uk/lesson/bad'; } },
    { id: 'payload_sha_placeholder_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].payloadSha256 = 'sha256_placeholder'; } },
    { id: 'payload_byte_size_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].payloadBytes = 0; } },
    { id: 'stale_gate_ref_sha_is_rejected', expectedSafe: false, mutate: (input) => {
      const refs = arr(input.manifestEntries[0], 'gateReportRefs').map(object);
      if (refs[0]) refs[0].sha256 = '0'.repeat(64);
      input.manifestEntries[0].gateReportRefs = refs;
    } },
    { id: 'server_upload_flag_is_rejected', expectedSafe: false, mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_downloads_flag_is_rejected', expectedSafe: false, mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'entry_activation_approved_is_rejected', expectedSafe: false, mutate: (input) => { input.manifestEntries[0].activationApproved = true; } },
    { id: 'ready_for_apply_is_rejected', expectedSafe: false, mutate: (input) => { input.readyForApply = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    fixture.manifest.entries = fixture.manifestEntries;
    const blockers = evaluateInput(fixture).findings.filter((finding) => finding.severity === 'blocker').length;
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
    '# Gustav Runtime/Server Manifest Consistency Recheck V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Manifest consistency state: ${report.summary.manifestConsistencyState}`,
    `- P34 ready: ${report.summary.p34Ready ? 'yes' : 'no'}`,
    `- Publish/admin/preview/cache ready: ${report.summary.publishPreflightReady ? 'yes' : 'no'}/${report.summary.adminRuntimePreflightReady ? 'yes' : 'no'}/${report.summary.previewReady ? 'yes' : 'no'}/${report.summary.cacheRollbackReady ? 'yes' : 'no'}`,
    `- Language/validator/brain gates: ${report.summary.languageIsolationPass ? 'PASS' : 'BLOCK'}/${report.summary.runValidatorPass ? 'PASS' : 'BLOCK'}/${report.summary.brainGatePass ? 'PASS' : 'BLOCK'}`,
    `- Manifest entries: ${report.summary.manifestEntries}/${report.summary.expectedManifestEntries}`,
    `- Source locales/surfaces covered: ${report.summary.sourceLocalesCovered}/${report.summary.sourceLocales.length} and ${report.summary.surfacesCovered}/${report.summary.surfaces.length}`,
    `- Source-surface matrix complete: ${report.summary.completeSourceSurfaceMatrix ? 'yes' : 'no'}`,
    `- Actual sha/bytes: ${report.summary.entriesWithActualSha256}/${report.summary.entriesWithActualByteSize}`,
    `- Payload sha/bytes match: ${report.summary.entriesWithPayloadHashMatch}/${report.summary.entriesWithPayloadByteSizeMatch}`,
    `- Checksum report matches: ${report.summary.entriesWithChecksumReportMatch}`,
    `- Gate refs current: ${report.summary.gateReportRefsCurrentSha}/${report.summary.gateReportRefs}`,
    `- Manifest input hashes current: ${report.summary.manifestInputHashesCurrent}/${report.summary.manifestInputHashes}`,
    `- Server path/cache key scoped: ${report.summary.serverPathScopedEntries}/${report.summary.cacheKeyScopedEntries}`,
    `- Activation/runtime/apply entry flags: ${report.summary.activationApprovedEntries}/${report.summary.runtimeDownloadsEnabledEntries}/${report.summary.readyForApplyEntries}`,
    `- Top-level upload/open flags: ${report.summary.topLevelUploadFlagsOpen}`,
    `- Production server manifest exists: ${report.summary.productionServerManifestExists ? 'yes' : 'no'}`,
    `- Ready for next non-production language isolation regression recheck: ${report.summary.readyForNextNonProductionLanguageIsolationRegressionRecheck ? 'yes' : 'no'}`,
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
    '- It does not publish a server manifest, upload to Firebase/server, enable runtime downloads, import decisions, create approval receipts, create hash locks, change storage/cloud migration or approve apply.',
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

  const p34Path = path.join(auditsDir, 'nonproduction_evidence_refresh_v2_packet.json');
  const publishPath = path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json');
  const adminRuntimePath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const previewPath = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const cachePath = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const languagePath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const validatorPath = path.join(auditsDir, 'run_validator_report.json');
  const closedPayloadPath = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionServerManifestPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const outputJsonPath = path.join(auditsDir, 'runtime_server_manifest_consistency_recheck_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'runtime_server_manifest_consistency_recheck_v2_packet.md');

  const p34 = readJsonOrEmpty(p34Path);
  const publish = readJsonOrEmpty(publishPath);
  const adminRuntime = readJsonOrEmpty(adminRuntimePath);
  const preview = readJsonOrEmpty(previewPath);
  const cache = readJsonOrEmpty(cachePath);
  const language = readJsonOrEmpty(languagePath);
  const validator = readJsonOrEmpty(validatorPath);
  const latestBrain = latestBrainGateReport(repoRoot);
  const manifest = readJsonOrEmpty(serverManifestDraftPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);

  const p34Summary = summaryOf(p34);
  const publishSummary = summaryOf(publish);
  const adminRuntimeSummary = summaryOf(adminRuntime);
  const previewSummary = summaryOf(preview);
  const cacheSummary = summaryOf(cache);
  const languageSummary = summaryOf(language);
  const validatorSummary = summaryOf(validator);
  const manifestEntries = arr(manifest, 'entries').map(object);
  const brainGateDecision = s(latestBrain.report, 'decision');

  const input: EvaluationInput = {
    repoRoot,
    p34Ready:
      s(p34, 'status') === 'PASS' &&
      n(p34Summary, 'blockers') === 0 &&
      s(p34Summary, 'refreshState') === 'llm_official_source_evidence_fresh' &&
      b(p34Summary, 'readyForNextNonProductionManifestRecheck') &&
      !b(p34Summary, 'readyForApply') &&
      !b(p34Summary, 'mayModifyProductionAppFiles'),
    publishPreflightReady:
      s(publish, 'status') === 'PASS' &&
      n(publishSummary, 'blockers') === 0 &&
      s(publishSummary, 'publishPreflightState') === 'local_server_manifest_draft_ready' &&
      b(publishSummary, 'readyForAdminServerDeliveryReviewV2') &&
      !b(publishSummary, 'readyForApply'),
    adminRuntimePreflightReady:
      s(adminRuntime, 'status') === 'PASS' &&
      n(adminRuntimeSummary, 'blockers') === 0 &&
      s(adminRuntimeSummary, 'preflightState') === 'admin_server_runtime_preflight_ready' &&
      b(adminRuntimeSummary, 'readyForRuntimeActivationBlockerPlanningV2') &&
      !b(adminRuntimeSummary, 'readyForApply'),
    previewReady:
      s(preview, 'status') === 'PASS' &&
      n(previewSummary, 'blockers') === 0 &&
      b(previewSummary, 'readyForRuntimeCacheIntegrityGate') &&
      !b(previewSummary, 'readyForApply'),
    cacheRollbackReady:
      s(cache, 'status') === 'PASS' &&
      n(cacheSummary, 'blockers') === 0 &&
      b(cacheSummary, 'readyForReviewerDecisionImportOpeningGate') &&
      !b(cacheSummary, 'readyForApply'),
    languageIsolationPass: s(language, 'status') === 'PASS' && n(languageSummary, 'blockers') === 0 && n(languageSummary, 'warnings') === 0,
    runValidatorPass: s(validator, 'status') === 'PASS' && n(validatorSummary, 'blockers') === 0,
    brainGatePass: brainGateDecision === 'PASS' && !b(latestBrain.report, 'generationBlocked'),
    manifestDraftPresent: fs.existsSync(serverManifestDraftPath),
    targetManifestPresent: fs.existsSync(targetManifestPath),
    productionServerManifestExists: fs.existsSync(productionServerManifestPath),
    serverUploadAllowed: b(manifest, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(manifest, 'firebaseUploadAllowed'),
    downloadablePacksPublished: b(manifest, 'downloadablePacksPublished'),
    runtimeDownloadsEnabled: b(manifest, 'runtimeDownloadsEnabled'),
    activationApproved: b(manifest, 'activationApproved'),
    readyForRuntimeDownloadActivation: b(manifest, 'readyForRuntimeDownloadActivation'),
    readyForApply: b(manifest, 'readyForApply'),
    mayModifyProductionAppFiles: b(manifest, 'mayModifyProductionAppFiles'),
    inputHashes: object(manifest.inputHashes),
    manifest,
    targetManifest,
    manifestEntries,
    inputHashTargets: {
      serverDeliveryManifestPreviewV2Packet: previewPath,
      closedLocalPayloadMaterializationV2Packet: closedPayloadPath,
      targetPackManifestV2Draft: targetManifestPath,
    },
  };

  const result = evaluateInput(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  const findings = result.findings.slice();
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const report: Report = {
    schemaVersion: 'gustav-runtime-server-manifest-consistency-recheck-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      nonproductionEvidenceRefreshV2Packet: rel(repoRoot, p34Path),
      serverDeliveryPublishPreflightV2Packet: rel(repoRoot, publishPath),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, adminRuntimePath),
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, previewPath),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, cachePath),
      frenchLanguageIsolationAudit: rel(repoRoot, languagePath),
      runValidatorReport: rel(repoRoot, validatorPath),
      latestBrainGateReport: latestBrain.relativePath,
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...result.evaluation,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
      readyForNextNonProductionLanguageIsolationRegressionRecheck: blockers === 0,
      manifestConsistencyState: blockers === 0 ? 'runtime_server_manifest_consistency_recheck_ready' : 'blocked_by_findings',
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

  console.log(`GUSTAV runtime/server manifest consistency recheck V2 packet: ${report.status}`);
  console.log(`Manifest consistency state: ${report.summary.manifestConsistencyState}`);
  console.log(`Manifest entries: ${report.summary.manifestEntries}/${report.summary.expectedManifestEntries}`);
  console.log(`Gate refs current: ${report.summary.gateReportRefsCurrentSha}/${report.summary.gateReportRefs}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
