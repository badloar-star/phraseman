import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type ChainState =
  | 'blocked_by_findings'
  | 'runtime_delivery_evidence_chain_ready_no_writes';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: ChainState;
  accepted: boolean;
  chainState: ChainState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type EvaluationInput = {
  upstreamReports: number;
  upstreamReportsPass: number;
  upstreamReportBlockers: number;
  targetRuntimeSliceDrafts: number;
  targetGateReports: number;
  runtimeRequiredSlices: number;
  runtimeCacheKeyContracts: number;
  runtimeProductionStudyTargetHasFrench: boolean;
  runtimeServerUploadAllowed: boolean;
  runtimeLoaderNetworkOrFsImports: boolean;
  payloadRuntimeSlices: number;
  payloadFutureArtifactFilesPresent: number;
  payloadChecksumContractsWithSha256: number;
  previewEntries: number;
  previewExpectedEntries: number;
  previewShaPlaceholders: number;
  previewByteSizePlaceholders: number;
  previewSourceScopedPaths: number;
  previewUiLocaleIdentityDimensions: number;
  previewReadyForRuntimeCacheIntegrityGate: boolean;
  runtimeCacheContracts: number;
  runtimeReadyStateBlockedContracts: number;
  runtimeCacheWriteBlockedContracts: number;
  runtimeDownloadBlockedContracts: number;
  runtimeChecksumMismatchQuarantineContracts: number;
  runtimeByteSizeMismatchQuarantineContracts: number;
  runtimeSourceLocaleMismatchRejectContracts: number;
  runtimeStudyTargetMismatchRejectContracts: number;
  runtimeStaleVersionContracts: number;
  runtimeOfflineFallbackContracts: number;
  runtimeRollbackSimulationContracts: number;
  runtimeReadyForReviewerDecisionImportOpeningGate: boolean;
  closedRuntimeSlices: number;
  closedPayloadEntriesTotal: number;
  closedPayloadBytesTotal: number;
  closedSlicesWithStudyTargetFr: number;
  closedSlicesWithSourceLocaleScopedPaths: number;
  closedSlicesWithCacheKeySha256: number;
  closedChecksumMismatches: number;
  closedMaterializationState: string;
  closedReadyForServerDeliveryPublishPreflight: boolean;
  publishManifestEntries: number;
  publishActualShaEntries: number;
  publishActualByteSizeEntries: number;
  publishChecksumReports: number;
  publishSourceScopedServerPaths: number;
  publishCacheKeySha256: number;
  publishChecksumMismatches: number;
  publishMissingPreviewMatches: number;
  publishState: string;
  publishReadyForAdminReview: boolean;
  adminManifestEntries: number;
  adminManifestStudyTargetFr: number;
  adminManifestSourceScoped: number;
  adminReady: boolean;
  adminRuntimeReady: boolean;
  adminStorageReady: boolean;
  adminReadyForRuntimeActivationBlockerPlanning: boolean;
  activationPlanItems: number;
  activationPlannedTouches: number;
  activationReadyForExplicitApprovalReceiptGate: boolean;
  activationServerManifestDraftEntries: number;
  activationProductionServerManifestExists: boolean;
  manifestDraftPresent: boolean;
  manifestEntries: number;
  manifestStudyTargetFr: number;
  manifestSourceScoped: number;
  manifestActualShaEntries: number;
  manifestActualByteSizeEntries: number;
  manifestCacheKeySha256: number;
  manifestPayloadFilesChecked: number;
  manifestPayloadShaMatches: number;
  manifestPayloadByteSizeMatches: number;
  manifestIndexFilesChecked: number;
  manifestIndexShaMatches: number;
  manifestSliceManifestFilesChecked: number;
  manifestSliceManifestShaMatches: number;
  manifestSliceManifestIdentityMatches: number;
  manifestChecksumReportsChecked: number;
  manifestChecksumReportsPresent: number;
  manifestForbiddenUiLocaleRefs: number;
  manifestForbiddenOpenFlags: number;
  productionServerManifestExists: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
  runtimeCacheWritesOpened: boolean;
  runtimeReadyCacheStateOpened: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  activationApproved: boolean;
  readyForRuntimeDownloadActivation: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
};

type Evaluation = EvaluationInput & {
  targetLocale: 'fr';
  sourceLocales: number;
  surfaces: number;
  closedTransitions: boolean;
  readyForExactApprovalWaitState: boolean;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  runtimeDeliveryEvidenceChainReady: boolean;
  chainState: ChainState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-runtime-delivery-evidence-chain-v2-packet-v0';
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
  summary: Evaluation & {
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    productionServerManifestCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const SOURCE_LOCALES = ['ru', 'uk'] as const;
const SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'] as const;
const EXPECTED_SLICES = SOURCE_LOCALES.length * SURFACES.length;
const EXPECTED_UPSTREAM_REPORTS = 9;

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

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arrayOfObjects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(object) : [];
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function countUiLocaleRefs(filePath: string): number {
  const text = fs.readFileSync(filePath, 'utf8');
  return (text.match(/uiLocale/g) ?? []).length;
}

function countForbiddenOpenFlags(filePath: string): number {
  const text = fs.readFileSync(filePath, 'utf8');
  return [
    '"serverUploadAllowed": true',
    '"firebaseUploadAllowed": true',
    '"downloadablePacksPublished": true',
    '"runtimeDownloadsEnabled": true',
    '"activationApproved": true',
    '"readyForRuntimeDownloadActivation": true',
    '"readyForApply": true',
    '"mayModifyProductionAppFiles": true',
    '"storageMigrationAllowed": true',
    '"cloudSyncMigrationAllowed": true',
  ].reduce((sum, pattern) => sum + (text.includes(pattern) ? 1 : 0), 0);
}

function isSourceLocale(value: string): boolean {
  return SOURCE_LOCALES.includes(value as typeof SOURCE_LOCALES[number]);
}

function isSurface(value: string): boolean {
  return SURFACES.includes(value as typeof SURFACES[number]);
}

function resolveRepoPath(repoRoot: string, maybeRelative: string): string {
  return path.isAbsolute(maybeRelative) ? maybeRelative : path.resolve(repoRoot, maybeRelative);
}

function countTopOpenFlags(manifest: JsonObject): number {
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

function buildArtifactHashes(paths: Record<string, string>): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const key of Object.keys(paths)) {
    const filePath = paths[key];
    hashes[key] = fs.existsSync(filePath) ? sha256(filePath) : '';
  }
  return hashes;
}

function buildManifestIntegrity(repoRoot: string, entries: JsonObject[]): Pick<EvaluationInput,
  | 'manifestStudyTargetFr'
  | 'manifestSourceScoped'
  | 'manifestActualShaEntries'
  | 'manifestActualByteSizeEntries'
  | 'manifestCacheKeySha256'
  | 'manifestPayloadFilesChecked'
  | 'manifestPayloadShaMatches'
  | 'manifestPayloadByteSizeMatches'
  | 'manifestIndexFilesChecked'
  | 'manifestIndexShaMatches'
  | 'manifestSliceManifestFilesChecked'
  | 'manifestSliceManifestShaMatches'
  | 'manifestSliceManifestIdentityMatches'
  | 'manifestChecksumReportsChecked'
  | 'manifestChecksumReportsPresent'
> {
  let manifestStudyTargetFr = 0;
  let manifestSourceScoped = 0;
  let manifestActualShaEntries = 0;
  let manifestActualByteSizeEntries = 0;
  let manifestCacheKeySha256 = 0;
  let manifestPayloadFilesChecked = 0;
  let manifestPayloadShaMatches = 0;
  let manifestPayloadByteSizeMatches = 0;
  let manifestIndexFilesChecked = 0;
  let manifestIndexShaMatches = 0;
  let manifestSliceManifestFilesChecked = 0;
  let manifestSliceManifestShaMatches = 0;
  let manifestSliceManifestIdentityMatches = 0;
  let manifestChecksumReportsChecked = 0;
  let manifestChecksumReportsPresent = 0;

  for (const entry of entries) {
    const studyTarget = s(entry, 'studyTarget');
    const sourceLocale = s(entry, 'sourceLocale');
    const surface = s(entry, 'surface');
    const runtimeSliceId = s(entry, 'runtimeSliceId');
    const payloadSha256 = s(entry, 'payloadSha256');
    const payloadBytes = n(entry, 'payloadBytes');
    const entryIndexSha256 = s(entry, 'entryIndexSha256');
    const sliceManifestSha256 = s(entry, 'sliceManifestSha256');
    const cacheKey = s(entry, 'cacheKey');
    const serverPath = s(entry, 'serverPath');

    if (studyTarget === 'fr') manifestStudyTargetFr += 1;
    if (
      studyTarget === 'fr' &&
      isSourceLocale(sourceLocale) &&
      isSurface(surface) &&
      serverPath.includes(`/fr/${sourceLocale}/${surface}/`) &&
      cacheKey.includes(`fr/${sourceLocale}/${surface}/`)
    ) {
      manifestSourceScoped += 1;
    }
    if (/^[a-f0-9]{64}$/.test(payloadSha256)) manifestActualShaEntries += 1;
    if (payloadBytes > 0) manifestActualByteSizeEntries += 1;
    if (payloadSha256 !== '' && cacheKey.includes(payloadSha256)) manifestCacheKeySha256 += 1;

    const payloadPath = s(entry, 'payloadShard');
    if (payloadPath !== '') {
      manifestPayloadFilesChecked += 1;
      const absolutePayloadPath = resolveRepoPath(repoRoot, payloadPath);
      if (fs.existsSync(absolutePayloadPath) && sha256(absolutePayloadPath) === payloadSha256) manifestPayloadShaMatches += 1;
      if (fs.existsSync(absolutePayloadPath) && fs.statSync(absolutePayloadPath).size === payloadBytes) manifestPayloadByteSizeMatches += 1;
    }

    const indexPath = s(entry, 'entryIndex');
    if (indexPath !== '') {
      manifestIndexFilesChecked += 1;
      const absoluteIndexPath = resolveRepoPath(repoRoot, indexPath);
      if (fs.existsSync(absoluteIndexPath) && sha256(absoluteIndexPath) === entryIndexSha256) manifestIndexShaMatches += 1;
    }

    const sliceManifestPath = s(entry, 'sliceManifest');
    if (sliceManifestPath !== '') {
      manifestSliceManifestFilesChecked += 1;
      const absoluteSliceManifestPath = resolveRepoPath(repoRoot, sliceManifestPath);
      if (fs.existsSync(absoluteSliceManifestPath) && sha256(absoluteSliceManifestPath) === sliceManifestSha256) {
        manifestSliceManifestShaMatches += 1;
      }
      if (fs.existsSync(absoluteSliceManifestPath)) {
        const sliceManifest = readJson<JsonObject>(absoluteSliceManifestPath);
        const identityMatches =
          s(sliceManifest, 'runtimeSliceId') === runtimeSliceId &&
          s(sliceManifest, 'studyTarget') === studyTarget &&
          s(sliceManifest, 'sourceLocale') === sourceLocale &&
          s(sliceManifest, 'surface') === surface &&
          s(sliceManifest, 'payloadSha256') === payloadSha256 &&
          n(sliceManifest, 'payloadBytes') === payloadBytes &&
          s(sliceManifest, 'cacheKey') === cacheKey &&
          !b(sliceManifest, 'activationApproved') &&
          !b(sliceManifest, 'runtimeDownloadsEnabled') &&
          !b(sliceManifest, 'readyForApply') &&
          !b(sliceManifest, 'mayModifyProductionAppFiles');
        if (identityMatches) manifestSliceManifestIdentityMatches += 1;
      }
    }

    const checksumReportPath = s(entry, 'checksumReport');
    if (checksumReportPath !== '') {
      manifestChecksumReportsChecked += 1;
      if (fs.existsSync(resolveRepoPath(repoRoot, checksumReportPath))) manifestChecksumReportsPresent += 1;
    }
  }

  return {
    manifestStudyTargetFr,
    manifestSourceScoped,
    manifestActualShaEntries,
    manifestActualByteSizeEntries,
    manifestCacheKeySha256,
    manifestPayloadFilesChecked,
    manifestPayloadShaMatches,
    manifestPayloadByteSizeMatches,
    manifestIndexFilesChecked,
    manifestIndexShaMatches,
    manifestSliceManifestFilesChecked,
    manifestSliceManifestShaMatches,
    manifestSliceManifestIdentityMatches,
    manifestChecksumReportsChecked,
    manifestChecksumReportsPresent,
  };
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];

  if (input.upstreamReports !== EXPECTED_UPSTREAM_REPORTS) addFinding(findings, 'blocker', 'UPSTREAM_REPORT_COUNT_INVALID', `Expected ${EXPECTED_UPSTREAM_REPORTS} upstream reports, got ${input.upstreamReports}.`);
  if (input.upstreamReportsPass !== EXPECTED_UPSTREAM_REPORTS) addFinding(findings, 'blocker', 'UPSTREAM_REPORT_NOT_PASS', `Expected ${EXPECTED_UPSTREAM_REPORTS} PASS upstream reports, got ${input.upstreamReportsPass}.`);
  if (input.upstreamReportBlockers > 0) addFinding(findings, 'blocker', 'UPSTREAM_BLOCKERS_PRESENT', `${input.upstreamReportBlockers} upstream blocker(s) present.`);

  if (input.targetRuntimeSliceDrafts !== EXPECTED_SLICES || input.targetGateReports < 12) addFinding(findings, 'blocker', 'TARGET_PACK_MANIFEST_GAP', 'Target pack manifest must expose 12 runtime slice drafts and gate report refs.');
  if (input.runtimeRequiredSlices !== EXPECTED_SLICES || input.runtimeCacheKeyContracts !== EXPECTED_SLICES) addFinding(findings, 'blocker', 'RUNTIME_CONTRACT_GAP', 'Runtime delivery contract must cover 12 required slices and cache-key contracts.');
  if (input.runtimeProductionStudyTargetHasFrench || input.runtimeServerUploadAllowed || input.runtimeLoaderNetworkOrFsImports) addFinding(findings, 'blocker', 'RUNTIME_PRODUCTION_OPENED', 'French runtime must not be in production studyTarget, server upload, or loader network/fs mode.');

  if (input.payloadRuntimeSlices !== EXPECTED_SLICES || input.payloadFutureArtifactFilesPresent < 48 || input.payloadChecksumContractsWithSha256 !== EXPECTED_SLICES) addFinding(findings, 'blocker', 'PAYLOAD_MATERIALIZATION_CONTRACT_GAP', 'Payload materialization must account for 12 slices, 48 local files, and sha256 checksum contracts.');

  if (input.previewEntries !== EXPECTED_SLICES || input.previewExpectedEntries !== EXPECTED_SLICES) addFinding(findings, 'blocker', 'PREVIEW_ENTRY_COUNT_INVALID', `Preview manifest must have 12 entries, got ${input.previewEntries}/${input.previewExpectedEntries}.`);
  if (input.previewShaPlaceholders !== EXPECTED_SLICES || input.previewByteSizePlaceholders !== EXPECTED_SLICES) addFinding(findings, 'blocker', 'PREVIEW_PLACEHOLDERS_MISSING', 'Preview layer must keep sha256/byteSize as blocked placeholders until publish preflight.');
  if (input.previewSourceScopedPaths !== EXPECTED_SLICES || input.previewUiLocaleIdentityDimensions !== 0 || !input.previewReadyForRuntimeCacheIntegrityGate) addFinding(findings, 'blocker', 'PREVIEW_SCOPE_OR_READINESS_GAP', 'Preview manifest must be sourceLocale scoped, uiLocale-free, and ready for runtime cache gate.');

  const runtimeContractCounts = [
    input.runtimeCacheContracts,
    input.runtimeReadyStateBlockedContracts,
    input.runtimeCacheWriteBlockedContracts,
    input.runtimeDownloadBlockedContracts,
    input.runtimeChecksumMismatchQuarantineContracts,
    input.runtimeByteSizeMismatchQuarantineContracts,
    input.runtimeSourceLocaleMismatchRejectContracts,
    input.runtimeStudyTargetMismatchRejectContracts,
    input.runtimeStaleVersionContracts,
    input.runtimeOfflineFallbackContracts,
    input.runtimeRollbackSimulationContracts,
  ];
  if (runtimeContractCounts.some((count) => count !== EXPECTED_SLICES) || !input.runtimeReadyForReviewerDecisionImportOpeningGate) {
    addFinding(findings, 'blocker', 'RUNTIME_CACHE_ROLLBACK_CONTRACT_GAP', 'Runtime cache/rollback gate must cover all 12 slices and reject checksum, byte-size, sourceLocale, studyTarget, stale, and rollback mismatches.');
  }

  if (
    input.closedRuntimeSlices !== EXPECTED_SLICES ||
    input.closedPayloadEntriesTotal !== 16064 ||
    input.closedPayloadBytesTotal <= 0 ||
    input.closedSlicesWithStudyTargetFr !== EXPECTED_SLICES ||
    input.closedSlicesWithSourceLocaleScopedPaths !== EXPECTED_SLICES ||
    input.closedSlicesWithCacheKeySha256 !== EXPECTED_SLICES ||
    input.closedChecksumMismatches !== 0 ||
    input.closedMaterializationState !== 'local_payload_artifacts_materialized' ||
    !input.closedReadyForServerDeliveryPublishPreflight
  ) {
    addFinding(findings, 'blocker', 'CLOSED_LOCAL_PAYLOAD_MATERIALIZATION_GAP', 'Closed local materialization must be complete, scoped, checksummed, and ready for server publish preflight.');
  }

  if (
    input.publishManifestEntries !== EXPECTED_SLICES ||
    input.publishActualShaEntries !== EXPECTED_SLICES ||
    input.publishActualByteSizeEntries !== EXPECTED_SLICES ||
    input.publishChecksumReports !== EXPECTED_SLICES ||
    input.publishSourceScopedServerPaths !== EXPECTED_SLICES ||
    input.publishCacheKeySha256 !== EXPECTED_SLICES ||
    input.publishChecksumMismatches !== 0 ||
    input.publishMissingPreviewMatches !== 0 ||
    input.publishState !== 'local_server_manifest_draft_ready' ||
    !input.publishReadyForAdminReview
  ) {
    addFinding(findings, 'blocker', 'SERVER_PUBLISH_PREFLIGHT_GAP', 'Server publish preflight must bridge preview placeholders to actual local sha/bytes without mismatches.');
  }

  if (
    !input.manifestDraftPresent ||
    input.manifestEntries !== EXPECTED_SLICES ||
    input.manifestStudyTargetFr !== EXPECTED_SLICES ||
    input.manifestSourceScoped !== EXPECTED_SLICES ||
    input.manifestActualShaEntries !== EXPECTED_SLICES ||
    input.manifestActualByteSizeEntries !== EXPECTED_SLICES ||
    input.manifestCacheKeySha256 !== EXPECTED_SLICES
  ) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_DRAFT_IDENTITY_GAP', 'Server manifest draft must contain 12 fr/sourceLocale/surface-scoped entries with actual sha/bytes and cache keys.');
  }

  if (
    input.manifestPayloadFilesChecked !== EXPECTED_SLICES ||
    input.manifestPayloadShaMatches !== EXPECTED_SLICES ||
    input.manifestPayloadByteSizeMatches !== EXPECTED_SLICES ||
    input.manifestIndexFilesChecked !== EXPECTED_SLICES ||
    input.manifestIndexShaMatches !== EXPECTED_SLICES ||
    input.manifestSliceManifestFilesChecked !== EXPECTED_SLICES ||
    input.manifestSliceManifestShaMatches !== EXPECTED_SLICES ||
    input.manifestSliceManifestIdentityMatches !== EXPECTED_SLICES ||
    input.manifestChecksumReportsChecked !== EXPECTED_SLICES ||
    input.manifestChecksumReportsPresent !== EXPECTED_SLICES
  ) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_DRAFT_FILE_INTEGRITY_GAP', 'Server manifest draft entries must match local payload/index/slice manifest hashes and checksum reports.');
  }

  if (input.manifestForbiddenUiLocaleRefs > 0) addFinding(findings, 'blocker', 'SERVER_MANIFEST_UI_LOCALE_REFS', `${input.manifestForbiddenUiLocaleRefs} uiLocale reference(s) in server manifest draft.`);
  if (input.manifestForbiddenOpenFlags > 0) addFinding(findings, 'blocker', 'SERVER_MANIFEST_OPEN_FLAGS', `${input.manifestForbiddenOpenFlags} forbidden open flag(s) in server manifest draft.`);
  if (input.productionServerManifestExists || input.activationProductionServerManifestExists) addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_EXISTS', 'Production server manifest must not exist before upload gate.');

  if (
    input.adminManifestEntries !== EXPECTED_SLICES ||
    input.adminManifestStudyTargetFr !== EXPECTED_SLICES ||
    input.adminManifestSourceScoped !== EXPECTED_SLICES ||
    !input.adminReady ||
    !input.adminRuntimeReady ||
    !input.adminStorageReady ||
    !input.adminReadyForRuntimeActivationBlockerPlanning
  ) {
    addFinding(findings, 'blocker', 'ADMIN_RUNTIME_STORAGE_PREFLIGHT_GAP', 'Admin/server/runtime/storage preflight must all be ready for activation blocker planning.');
  }

  if (
    input.activationPlanItems < 9 ||
    input.activationPlannedTouches < 18 ||
    !input.activationReadyForExplicitApprovalReceiptGate ||
    input.activationServerManifestDraftEntries !== EXPECTED_SLICES
  ) {
    addFinding(findings, 'blocker', 'RUNTIME_ACTIVATION_BLOCKER_PLAN_GAP', 'Runtime activation blocker plan must map apply/upload/runtime/storage/admin touches before exact approval wait.');
  }

  if (
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.downloadablePacksPublished ||
    input.runtimeDownloadsEnabled ||
    input.runtimeCacheWritesOpened ||
    input.runtimeReadyCacheStateOpened ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed ||
    input.activationApproved ||
    input.readyForRuntimeDownloadActivation ||
    input.readyForApply ||
    input.mayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'PRODUCTION_TRANSITION_OPENED_TOO_EARLY', 'Delivery chain gate must remain no-write/no-upload/no-runtime/no-apply.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const closedTransitions =
    !input.serverUploadAllowed &&
    !input.firebaseUploadAllowed &&
    !input.downloadablePacksPublished &&
    !input.runtimeDownloadsEnabled &&
    !input.runtimeCacheWritesOpened &&
    !input.runtimeReadyCacheStateOpened &&
    !input.storageMigrationAllowed &&
    !input.cloudSyncMigrationAllowed &&
    !input.activationApproved &&
    !input.readyForRuntimeDownloadActivation &&
    !input.readyForApply &&
    !input.mayModifyProductionAppFiles;
  const accepted = blockers === 0;
  return {
    findings,
    evaluation: {
      ...input,
      targetLocale: 'fr',
      sourceLocales: SOURCE_LOCALES.length,
      surfaces: SURFACES.length,
      closedTransitions,
      readyForExactApprovalWaitState: accepted && input.activationReadyForExplicitApprovalReceiptGate,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      runtimeDeliveryEvidenceChainReady: accepted,
      chainState: accepted ? 'runtime_delivery_evidence_chain_ready_no_writes' : 'blocked_by_findings',
      blockers,
      warnings,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{
    id: string;
    expectedAccept: boolean;
    expectedState: ChainState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    { id: 'canonical_delivery_chain_is_accepted', expectedAccept: true, expectedState: 'runtime_delivery_evidence_chain_ready_no_writes', mutate: () => undefined },
    { id: 'upstream_blocker_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.upstreamReportBlockers = 1; } },
    { id: 'preview_placeholder_gap_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.previewShaPlaceholders = 11; } },
    { id: 'actual_sha_gap_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.publishActualShaEntries = 11; input.manifestActualShaEntries = 11; } },
    { id: 'payload_sha_mismatch_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.manifestPayloadShaMatches = 11; } },
    { id: 'source_locale_scope_gap_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.manifestSourceScoped = 11; input.publishSourceScopedServerPaths = 11; } },
    { id: 'runtime_download_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'admin_not_ready_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.adminReady = false; } },
    { id: 'storage_migration_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'activation_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.activationApproved = true; } },
    { id: 'production_server_manifest_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.productionServerManifestExists = true; } },
    { id: 'ui_locale_ref_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.manifestForbiddenUiLocaleRefs = 1; } },
    { id: 'rollback_contract_gap_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeRollbackSimulationContracts = 11; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.runtimeDeliveryEvidenceChainReady;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      chainState: result.chainState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.chainState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Runtime Delivery Evidence Chain V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Chain state: ${report.summary.chainState}`,
    `- Runtime delivery evidence chain ready: ${report.summary.runtimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Upstream PASS/blockers: ${report.summary.upstreamReportsPass}/${report.summary.upstreamReportBlockers}`,
    `- Preview entries/placeholders: ${report.summary.previewEntries}/${report.summary.previewShaPlaceholders}/${report.summary.previewByteSizePlaceholders}`,
    `- Publish manifest entries actual sha/bytes: ${report.summary.publishManifestEntries}/${report.summary.publishActualShaEntries}/${report.summary.publishActualByteSizeEntries}`,
    `- Manifest file integrity payload/index/manifest/checksum: ${report.summary.manifestPayloadShaMatches}/${report.summary.manifestIndexShaMatches}/${report.summary.manifestSliceManifestShaMatches}/${report.summary.manifestChecksumReportsPresent}`,
    `- Runtime mismatch/rollback contracts: ${report.summary.runtimeSourceLocaleMismatchRejectContracts}/${report.summary.runtimeStudyTargetMismatchRejectContracts}/${report.summary.runtimeRollbackSimulationContracts}`,
    `- Admin/runtime/storage ready: ${report.summary.adminReady ? 'yes' : 'no'}/${report.summary.adminRuntimeReady ? 'yes' : 'no'}/${report.summary.adminStorageReady ? 'yes' : 'no'}`,
    `- Activation blocker plan items/touches: ${report.summary.activationPlanItems}/${report.summary.activationPlannedTouches}`,
    `- Closed transitions: ${report.summary.closedTransitions ? 'yes' : 'no'}`,
    `- Ready for exact approval wait state: ${report.summary.readyForExactApprovalWaitState ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Closed Transitions',
    '',
    `- Server upload allowed: ${report.summary.serverUploadAllowed}`,
    `- Firebase upload allowed: ${report.summary.firebaseUploadAllowed}`,
    `- Downloadable packs published: ${report.summary.downloadablePacksPublished}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled}`,
    `- Storage/cloud migration allowed: ${report.summary.storageMigrationAllowed}/${report.summary.cloudSyncMigrationAllowed}`,
    `- Activation approved: ${report.summary.activationApproved}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const paths = {
    targetPackManifestV2Packet: path.join(auditsDir, 'target_pack_manifest_v2_packet.json'),
    runtimeServerDeliveryContractV2Packet: path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.json'),
    payloadShardMaterializationChecksumV2Packet: path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.json'),
    serverDeliveryManifestPreviewV2Packet: path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json'),
    runtimeCacheIntegrityRollbackV2Packet: path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json'),
    closedLocalPayloadMaterializationV2Packet: path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json'),
    serverDeliveryPublishPreflightV2Packet: path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json'),
    adminServerDeliveryRuntimePreflightV2Packet: path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json'),
    runtimeActivationBlockerPlanV2Packet: path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json'),
    serverDeliveryManifestV2Draft: path.join(packDir, 'server_delivery_manifest_v2_draft.json'),
    productionServerManifestV2: path.join(packDir, 'server_delivery_manifest_v2.json'),
  };
  const outputJsonPath = path.join(auditsDir, 'runtime_delivery_evidence_chain_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'runtime_delivery_evidence_chain_v2_packet.md');

  const targetPack = readJson<JsonObject>(paths.targetPackManifestV2Packet);
  const runtimeContract = readJson<JsonObject>(paths.runtimeServerDeliveryContractV2Packet);
  const payload = readJson<JsonObject>(paths.payloadShardMaterializationChecksumV2Packet);
  const preview = readJson<JsonObject>(paths.serverDeliveryManifestPreviewV2Packet);
  const runtimeCache = readJson<JsonObject>(paths.runtimeCacheIntegrityRollbackV2Packet);
  const closedMaterialization = readJson<JsonObject>(paths.closedLocalPayloadMaterializationV2Packet);
  const publish = readJson<JsonObject>(paths.serverDeliveryPublishPreflightV2Packet);
  const adminPreflight = readJson<JsonObject>(paths.adminServerDeliveryRuntimePreflightV2Packet);
  const activationPlan = readJson<JsonObject>(paths.runtimeActivationBlockerPlanV2Packet);

  const reports = [targetPack, runtimeContract, payload, preview, runtimeCache, closedMaterialization, publish, adminPreflight, activationPlan];
  const summaries = reports.map(summaryOf);
  const [
    targetSummary,
    runtimeSummary,
    payloadSummary,
    previewSummary,
    runtimeCacheSummary,
    closedSummary,
    publishSummary,
    adminSummary,
    activationSummary,
  ] = summaries;

  const manifestDraft = fs.existsSync(paths.serverDeliveryManifestV2Draft) ? readJson<JsonObject>(paths.serverDeliveryManifestV2Draft) : {};
  const manifestEntries = arrayOfObjects(manifestDraft.entries);
  const manifestIntegrity = buildManifestIntegrity(repoRoot, manifestEntries);
  const manifestForbiddenOpenFlags =
    fs.existsSync(paths.serverDeliveryManifestV2Draft)
      ? countForbiddenOpenFlags(paths.serverDeliveryManifestV2Draft) + countTopOpenFlags(manifestDraft)
      : 0;

  const input: EvaluationInput = {
    upstreamReports: reports.length,
    upstreamReportsPass: reports.filter((report) => s(report, 'status') === 'PASS').length,
    upstreamReportBlockers: summaries.reduce((sum, summary) => sum + n(summary, 'blockers'), 0),
    targetRuntimeSliceDrafts: n(targetSummary, 'runtimeSliceDrafts'),
    targetGateReports: n(targetSummary, 'gateReports'),
    runtimeRequiredSlices: n(runtimeSummary, 'requiredRuntimeSlices'),
    runtimeCacheKeyContracts: n(runtimeSummary, 'runtimeSlicesWithCacheKeyContract'),
    runtimeProductionStudyTargetHasFrench: b(runtimeSummary, 'productionStudyTargetHasFrench'),
    runtimeServerUploadAllowed: b(runtimeSummary, 'serverUploadAllowed'),
    runtimeLoaderNetworkOrFsImports: b(runtimeSummary, 'loaderNetworkOrFsImports'),
    payloadRuntimeSlices: n(payloadSummary, 'runtimeSlices'),
    payloadFutureArtifactFilesPresent: n(payloadSummary, 'futureArtifactFilesPresent'),
    payloadChecksumContractsWithSha256: n(payloadSummary, 'checksumContractsWithSha256Dimension'),
    previewEntries: n(previewSummary, 'previewEntries'),
    previewExpectedEntries: n(previewSummary, 'expectedPreviewEntries'),
    previewShaPlaceholders: n(previewSummary, 'entriesWithSha256Placeholder'),
    previewByteSizePlaceholders: n(previewSummary, 'entriesWithByteSizePlaceholder'),
    previewSourceScopedPaths: n(previewSummary, 'sourceLocaleScopedServerPaths'),
    previewUiLocaleIdentityDimensions: n(previewSummary, 'uiLocaleIdentityDimensions'),
    previewReadyForRuntimeCacheIntegrityGate: b(previewSummary, 'readyForRuntimeCacheIntegrityGate'),
    runtimeCacheContracts: n(runtimeCacheSummary, 'cacheIntegrityContracts'),
    runtimeReadyStateBlockedContracts: n(runtimeCacheSummary, 'readyStateBlockedContracts'),
    runtimeCacheWriteBlockedContracts: n(runtimeCacheSummary, 'cacheWriteBlockedContracts'),
    runtimeDownloadBlockedContracts: n(runtimeCacheSummary, 'runtimeDownloadBlockedContracts'),
    runtimeChecksumMismatchQuarantineContracts: n(runtimeCacheSummary, 'checksumMismatchQuarantineContracts'),
    runtimeByteSizeMismatchQuarantineContracts: n(runtimeCacheSummary, 'byteSizeMismatchQuarantineContracts'),
    runtimeSourceLocaleMismatchRejectContracts: n(runtimeCacheSummary, 'sourceLocaleMismatchRejectContracts'),
    runtimeStudyTargetMismatchRejectContracts: n(runtimeCacheSummary, 'studyTargetMismatchRejectContracts'),
    runtimeStaleVersionContracts: n(runtimeCacheSummary, 'staleVersionContracts'),
    runtimeOfflineFallbackContracts: n(runtimeCacheSummary, 'offlineFallbackRequiresPriorVersionContracts'),
    runtimeRollbackSimulationContracts: n(runtimeCacheSummary, 'rollbackSimulationContracts'),
    runtimeReadyForReviewerDecisionImportOpeningGate: b(runtimeCacheSummary, 'readyForReviewerDecisionImportOpeningGate'),
    closedRuntimeSlices: n(closedSummary, 'runtimeSlices'),
    closedPayloadEntriesTotal: n(closedSummary, 'payloadEntriesTotal'),
    closedPayloadBytesTotal: n(closedSummary, 'payloadBytesTotal'),
    closedSlicesWithStudyTargetFr: n(closedSummary, 'slicesWithStudyTargetFr'),
    closedSlicesWithSourceLocaleScopedPaths: n(closedSummary, 'slicesWithSourceLocaleScopedPaths'),
    closedSlicesWithCacheKeySha256: n(closedSummary, 'slicesWithCacheKeySha256'),
    closedChecksumMismatches: n(closedSummary, 'checksumMismatches'),
    closedMaterializationState: s(closedSummary, 'materializationState'),
    closedReadyForServerDeliveryPublishPreflight: b(closedSummary, 'readyForServerDeliveryPublishPreflightV2'),
    publishManifestEntries: n(publishSummary, 'manifestEntries'),
    publishActualShaEntries: n(publishSummary, 'manifestEntriesWithActualSha256'),
    publishActualByteSizeEntries: n(publishSummary, 'manifestEntriesWithActualByteSize'),
    publishChecksumReports: n(publishSummary, 'manifestEntriesWithChecksumReports'),
    publishSourceScopedServerPaths: n(publishSummary, 'manifestEntriesWithSourceLocaleScopedServerPaths'),
    publishCacheKeySha256: n(publishSummary, 'manifestEntriesWithCacheKeySha256'),
    publishChecksumMismatches: n(publishSummary, 'checksumMismatches'),
    publishMissingPreviewMatches: n(publishSummary, 'missingPreviewMatches'),
    publishState: s(publishSummary, 'publishPreflightState'),
    publishReadyForAdminReview: b(publishSummary, 'readyForAdminServerDeliveryReviewV2'),
    adminManifestEntries: n(adminSummary, 'manifestEntries'),
    adminManifestStudyTargetFr: n(adminSummary, 'manifestEntriesStudyTargetFr'),
    adminManifestSourceScoped: n(adminSummary, 'manifestEntriesSourceScoped'),
    adminReady: b(adminSummary, 'adminReady'),
    adminRuntimeReady: b(adminSummary, 'runtimeReady'),
    adminStorageReady: b(adminSummary, 'storageReady'),
    adminReadyForRuntimeActivationBlockerPlanning: b(adminSummary, 'readyForRuntimeActivationBlockerPlanningV2'),
    activationPlanItems: n(activationSummary, 'planItems'),
    activationPlannedTouches: n(activationSummary, 'plannedTouches'),
    activationReadyForExplicitApprovalReceiptGate: b(activationSummary, 'readyForExplicitApprovalReceiptGateV2'),
    activationServerManifestDraftEntries: n(activationSummary, 'serverManifestDraftEntries'),
    activationProductionServerManifestExists: b(activationSummary, 'productionServerManifestExists'),
    manifestDraftPresent: fs.existsSync(paths.serverDeliveryManifestV2Draft),
    manifestEntries: manifestEntries.length,
    ...manifestIntegrity,
    manifestForbiddenUiLocaleRefs: fs.existsSync(paths.serverDeliveryManifestV2Draft) ? countUiLocaleRefs(paths.serverDeliveryManifestV2Draft) : 0,
    manifestForbiddenOpenFlags,
    productionServerManifestExists: fs.existsSync(paths.productionServerManifestV2),
    serverUploadAllowed:
      b(runtimeSummary, 'serverUploadAllowed') ||
      b(payloadSummary, 'serverUploadAllowed') ||
      b(previewSummary, 'serverUploadAllowed') ||
      b(runtimeCacheSummary, 'serverUploadAllowed') ||
      b(closedSummary, 'serverUploadAllowed') ||
      b(publishSummary, 'serverUploadAllowed') ||
      b(adminSummary, 'serverUploadAllowed') ||
      b(activationSummary, 'serverUploadAllowed') ||
      b(manifestDraft, 'serverUploadAllowed'),
    firebaseUploadAllowed:
      b(runtimeSummary, 'firebaseUploadAllowed') ||
      b(payloadSummary, 'firebaseUploadAllowed') ||
      b(previewSummary, 'firebaseUploadAllowed') ||
      b(closedSummary, 'firebaseUploadAllowed') ||
      b(publishSummary, 'firebaseUploadAllowed') ||
      b(adminSummary, 'firebaseUploadAllowed') ||
      b(activationSummary, 'firebaseUploadAllowed') ||
      b(manifestDraft, 'firebaseUploadAllowed'),
    downloadablePacksPublished:
      b(runtimeSummary, 'downloadablePacksPublished') ||
      b(payloadSummary, 'downloadablePacksPublished') ||
      b(previewSummary, 'downloadablePacksPublished') ||
      b(closedSummary, 'downloadablePacksPublished') ||
      b(publishSummary, 'downloadablePacksPublished') ||
      b(adminSummary, 'downloadablePacksPublished') ||
      b(manifestDraft, 'downloadablePacksPublished'),
    runtimeDownloadsEnabled:
      b(runtimeSummary, 'runtimeDownloadsEnabled') ||
      b(payloadSummary, 'runtimeDownloadsEnabled') ||
      b(previewSummary, 'runtimeDownloadsEnabled') ||
      b(runtimeCacheSummary, 'runtimeDownloadsEnabled') ||
      b(closedSummary, 'runtimeDownloadsEnabled') ||
      b(publishSummary, 'runtimeDownloadsEnabled') ||
      b(adminSummary, 'runtimeDownloadsEnabled') ||
      b(activationSummary, 'runtimeDownloadsEnabled') ||
      b(manifestDraft, 'runtimeDownloadsEnabled'),
    runtimeCacheWritesOpened: b(runtimeCacheSummary, 'cacheWritesOpened') || b(adminSummary, 'runtimeCacheWritesOpened'),
    runtimeReadyCacheStateOpened: b(runtimeCacheSummary, 'readyCacheStateOpened') || b(adminSummary, 'runtimeReadyCacheStateOpened'),
    storageMigrationAllowed: b(adminSummary, 'storageMigrationAllowed') || b(activationSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(adminSummary, 'cloudSyncMigrationAllowed') || b(activationSummary, 'cloudSyncMigrationAllowed'),
    activationApproved:
      n(runtimeSummary, 'activationApprovedFlags') > 0 ||
      n(payloadSummary, 'activationApprovedFlags') > 0 ||
      n(previewSummary, 'activationApprovedFlags') > 0 ||
      n(runtimeCacheSummary, 'activationApprovedFlags') > 0 ||
      b(closedSummary, 'activationApproved') ||
      b(publishSummary, 'activationApproved') ||
      b(adminSummary, 'activationApproved') ||
      b(activationSummary, 'activationApproved') ||
      b(manifestDraft, 'activationApproved'),
    readyForRuntimeDownloadActivation:
      b(runtimeSummary, 'readyForRuntimeDownloadActivation') ||
      b(payloadSummary, 'readyForRuntimeDownloadActivation') ||
      b(previewSummary, 'readyForRuntimeDownloadActivation') ||
      b(runtimeCacheSummary, 'readyForRuntimeDownloadActivation') ||
      b(closedSummary, 'readyForRuntimeDownloadActivation') ||
      b(publishSummary, 'readyForRuntimeDownloadActivation') ||
      b(adminSummary, 'readyForRuntimeDownloadActivation') ||
      b(manifestDraft, 'readyForRuntimeDownloadActivation'),
    readyForApply:
      b(targetSummary, 'readyForApply') ||
      b(runtimeSummary, 'readyForApply') ||
      b(payloadSummary, 'readyForApply') ||
      b(previewSummary, 'readyForApply') ||
      b(runtimeCacheSummary, 'readyForApply') ||
      b(closedSummary, 'readyForApply') ||
      b(publishSummary, 'readyForApply') ||
      b(adminSummary, 'readyForApply') ||
      b(activationSummary, 'readyForApply') ||
      b(manifestDraft, 'readyForApply'),
    mayModifyProductionAppFiles:
      b(targetSummary, 'mayModifyProductionAppFiles') ||
      b(runtimeSummary, 'mayModifyProductionAppFiles') ||
      b(payloadSummary, 'mayModifyProductionAppFiles') ||
      b(previewSummary, 'mayModifyProductionAppFiles') ||
      b(runtimeCacheSummary, 'mayModifyProductionAppFiles') ||
      b(closedSummary, 'mayModifyProductionAppFiles') ||
      b(publishSummary, 'mayModifyProductionAppFiles') ||
      b(adminSummary, 'mayModifyProductionAppFiles') ||
      b(activationSummary, 'mayModifyProductionAppFiles') ||
      b(manifestDraft, 'mayModifyProductionAppFiles'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.chainState = 'blocked_by_findings';
    evaluation.runtimeDeliveryEvidenceChainReady = false;
    evaluation.readyForExactApprovalWaitState = false;
  }

  const status: Status = evaluation.blockers > 0 ? 'BLOCK' : evaluation.runtimeDeliveryEvidenceChainReady ? 'PASS' : 'HOLD';
  const report: Report = {
    schemaVersion: 'gustav-runtime-delivery-evidence-chain-v2-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      targetPackManifestV2Packet: rel(repoRoot, paths.targetPackManifestV2Packet),
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, paths.runtimeServerDeliveryContractV2Packet),
      payloadShardMaterializationChecksumV2Packet: rel(repoRoot, paths.payloadShardMaterializationChecksumV2Packet),
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, paths.serverDeliveryManifestPreviewV2Packet),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, paths.runtimeCacheIntegrityRollbackV2Packet),
      closedLocalPayloadMaterializationV2Packet: rel(repoRoot, paths.closedLocalPayloadMaterializationV2Packet),
      serverDeliveryPublishPreflightV2Packet: rel(repoRoot, paths.serverDeliveryPublishPreflightV2Packet),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, paths.adminServerDeliveryRuntimePreflightV2Packet),
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, paths.runtimeActivationBlockerPlanV2Packet),
      serverDeliveryManifestV2Draft: rel(repoRoot, paths.serverDeliveryManifestV2Draft),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      blockers: findings.filter((finding) => finding.severity === 'blocker').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: buildArtifactHashes(paths),
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      productionServerManifestCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');
  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
