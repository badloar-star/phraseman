import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type RuntimeSliceContract = {
  runtimeSliceId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  requiredManifestFields: string[];
  expectedManifestIdentity: {
    packIdPrefix: string;
    studyTarget: string;
    sourceLocale: string;
    surface: string;
    schemaVersion: string;
    contentVersion: string;
    entryIndexTemplate: string;
  };
  cacheKeyContract: {
    dimensions: string[];
    template: string;
  };
  futureArtifacts: {
    sliceManifest: string;
    entryIndex: string;
    payloadShard: string;
    checksumReport: string;
  };
  runtimeManifestAllowedNow: boolean;
  payloadShardCreated: boolean;
  cacheKeyCreated: boolean;
  loaderCanResolveNow: boolean;
  activationApproved: boolean;
  blockedBy: string[];
};

type RuntimeServerDeliveryContract = {
  schemaVersion: string;
  runId: string;
  targetLocale: string;
  studyTarget: string;
  sourceLocales: string[];
  targetPackManifest: {
    path: string;
    packId: string;
    contentVersion: string;
    sha256: string;
    readyForRuntimeServerDeliveryContractV2: boolean;
  };
  runtimeState: {
    coursePackSchemaVersion: string;
    manifestRequiredFields: string[];
    cacheKeyDimensions: string[];
    coursePackRemoteLoadingEnabled: boolean;
    startupImportsCoursePackRuntime: boolean;
    loaderNetworkOrFsImports: boolean;
  };
  requiredRuntimeSlices: RuntimeSliceContract[];
  serverDeliveryContract: {
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    downloadablePacksPublished: boolean;
    serverManifestCreated: boolean;
    approvedCoursePackUploadPath: boolean;
    firebaseStoragePathTemplate: string;
    requiredServerManifestFields: string[];
  };
  runtimeActivationPolicy: {
    activationApproved: boolean;
    runtimeDownloadsEnabled: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    requiredFutureGates: string[];
  };
};

type SliceMaterializationContract = {
  runtimeSliceId: string;
  materializationMode: 'dry_run_metadata_only';
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  futureArtifacts: RuntimeSliceContract['futureArtifacts'];
  artifactExistence: {
    sliceManifest: boolean;
    entryIndex: boolean;
    payloadShard: boolean;
    checksumReport: boolean;
  };
  manifestIdentity: {
    packIdPreview: string;
    packIdPrefix: string;
    studyTarget: string;
    sourceLocale: string;
    surface: string;
    schemaVersion: string;
    contentVersion: string;
    minAppVersion: 'blocked_until_payload_materialization_gate';
    sha256Dimension: '{sha256}';
    byteSizeDimension: '{byteSize}';
    entryIndex: string;
  };
  cacheKeyContract: RuntimeSliceContract['cacheKeyContract'];
  checksumContract: {
    algorithm: 'sha256';
    payloadSha256Required: true;
    payloadBytesRequiredBeforeActivation: true;
    sha256InManifestRequiredFields: boolean;
    sha256InServerManifestRequiredFields: boolean;
    sha256InCacheKeyDimensions: boolean;
    sha256InCacheKeyTemplate: boolean;
    dryRunCanonicalContractSha256: string;
  };
  serverPathPreview: string;
  isolationContract: {
    cacheKeyMustNotUseUiLocale: true;
    storagePathMustStartWith: string;
    entryIndexMustStartWith: string;
    targetAndSourceLocaleMustMatchRequest: true;
  };
  blockedBy: string[];
};

type MaterializationContract = {
  schemaVersion: 'gustav-payload-shard-materialization-checksum-v2';
  runId: string;
  targetLocale: string;
  studyTarget: string;
  sourceLocales: string[];
  materializationMode: 'dry_run_metadata_only';
  payloadCreationApprovalPresent: false;
  preExistingLocalMaterializationAccounted: boolean;
  runtimeServerDeliveryContractSha256: string;
  targetPackManifestSha256: string;
  prerequisiteGates: {
    runtimeServerDeliveryContractReady: boolean;
    reviewerDecisionImportV2DryRunReady: boolean;
    reviewerDecisionImportV2DryRunReadyForPayloadShardMaterializationGate: boolean;
  };
  requiredManifestFields: string[];
  requiredServerManifestFields: string[];
  requiredCacheKeyDimensions: string[];
  runtimeSlices: SliceMaterializationContract[];
  closedTransitions: {
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    serverManifestCreated: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  nextRequiredGate: 'server_delivery_manifest_preview_v2';
};

type Report = {
  schemaVersion: 'gustav-payload-shard-materialization-checksum-v2-packet-v0';
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
    targetLocale: string;
    sourceLocales: number;
    materializationMode: 'dry_run_metadata_only';
    payloadCreationApprovalPresent: false;
    prerequisiteRuntimeServerDeliveryContractReady: boolean;
    prerequisiteReviewerDecisionImportV2DryRunReady: boolean;
    runtimeSlices: number;
    expectedRuntimeSlices: number;
    materializationContracts: number;
    manifestIdentityContracts: number;
    checksumContracts: number;
    checksumContractsWithSha256Dimension: number;
    cacheKeyContractsWithSha256: number;
    serverPathPreviewsWithSha256: number;
    sourceLocaleScopedFuturePaths: number;
    uiLocaleIdentityDimensions: number;
    futureArtifactFilesPresent: number;
    preExistingLocalMaterializationAccounted: boolean;
    unaccountedFutureArtifactFilesPresent: number;
    sliceManifestFilesPresent: number;
    entryIndexFilesPresent: number;
    payloadShardsCreated: number;
    checksumReportsCreated: number;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    downloadablePacksPublished: boolean;
    serverManifestCreated: boolean;
    runtimeDownloadsEnabled: boolean;
    activationApprovedFlags: number;
    readyForServerManifestPreviewGate: boolean;
    readyForPayloadShardCreation: boolean;
    readyForRuntimeDownloadActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  contract: MaterializationContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    payloadShardFilesCreatedByThisScript: false;
    checksumFilesCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const REQUIRED_SOURCE_LOCALES = ['ru', 'uk'] as const;
const REQUIRED_SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'] as const;
const REQUIRED_CACHE_KEY_DIMENSIONS = ['studyTarget', 'sourceLocale', 'surface', 'schemaVersion', 'contentVersion', 'sha256'] as const;
const REQUIRED_MANIFEST_FIELDS = [
  'packId',
  'studyTarget',
  'sourceLocale',
  'surface',
  'schemaVersion',
  'contentVersion',
  'minAppVersion',
  'sha256',
  'byteSize',
  'createdAt',
  'dependencies',
  'entryIndex',
] as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(',')}}`;
}

function hashObject(value: unknown): string {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
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

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function expectedSliceIds(): Set<string> {
  return new Set(REQUIRED_SOURCE_LOCALES.flatMap((sourceLocale) =>
    REQUIRED_SURFACES.map((surface) => `fr-${sourceLocale}-${surface}`),
  ));
}

function serverPathPreview(template: string, slice: RuntimeSliceContract, contentVersion: string): string {
  return template
    .replace('{sourceLocale}', slice.sourceLocale)
    .replace('{surface}', slice.surface)
    .replace('{contentVersion}', contentVersion)
    .replace('{sha256}', '{sha256}');
}

function pathExists(runDir: string, relativePath: string): boolean {
  return fs.existsSync(path.join(runDir, relativePath));
}

function buildSliceContract(runDir: string, serverPathTemplate: string, slice: RuntimeSliceContract): SliceMaterializationContract {
  const identity = slice.expectedManifestIdentity;
  const artifactExistence = {
    sliceManifest: pathExists(runDir, slice.futureArtifacts.sliceManifest),
    entryIndex: pathExists(runDir, slice.futureArtifacts.entryIndex),
    payloadShard: pathExists(runDir, slice.futureArtifacts.payloadShard),
    checksumReport: pathExists(runDir, slice.futureArtifacts.checksumReport),
  };
  const manifestIdentity = {
    packIdPreview: `${identity.packIdPrefix}.${identity.contentVersion}`,
    packIdPrefix: identity.packIdPrefix,
    studyTarget: identity.studyTarget,
    sourceLocale: identity.sourceLocale,
    surface: identity.surface,
    schemaVersion: identity.schemaVersion,
    contentVersion: identity.contentVersion,
    minAppVersion: 'blocked_until_payload_materialization_gate' as const,
    sha256Dimension: '{sha256}' as const,
    byteSizeDimension: '{byteSize}' as const,
    entryIndex: identity.entryIndexTemplate,
  };
  const canonicalContract = {
    runtimeSliceId: slice.runtimeSliceId,
    manifestIdentity,
    futureArtifacts: slice.futureArtifacts,
    cacheKeyContract: slice.cacheKeyContract,
    serverPathPreview: serverPathPreview(serverPathTemplate, slice, identity.contentVersion),
  };
  return {
    runtimeSliceId: slice.runtimeSliceId,
    materializationMode: 'dry_run_metadata_only',
    studyTarget: slice.studyTarget,
    sourceLocale: slice.sourceLocale,
    surface: slice.surface,
    futureArtifacts: slice.futureArtifacts,
    artifactExistence,
    manifestIdentity,
    cacheKeyContract: slice.cacheKeyContract,
    checksumContract: {
      algorithm: 'sha256',
      payloadSha256Required: true,
      payloadBytesRequiredBeforeActivation: true,
      sha256InManifestRequiredFields: slice.requiredManifestFields.includes('sha256'),
      sha256InServerManifestRequiredFields: true,
      sha256InCacheKeyDimensions: slice.cacheKeyContract.dimensions.includes('sha256'),
      sha256InCacheKeyTemplate: slice.cacheKeyContract.template.includes('{sha256}'),
      dryRunCanonicalContractSha256: hashObject(canonicalContract),
    },
    serverPathPreview: canonicalContract.serverPathPreview,
    isolationContract: {
      cacheKeyMustNotUseUiLocale: true,
      storagePathMustStartWith: `pack_candidates/fr/runtime_slices/${slice.sourceLocale}/${slice.surface}/`,
      entryIndexMustStartWith: `fr/${slice.sourceLocale}/${slice.surface}/`,
      targetAndSourceLocaleMustMatchRequest: true,
    },
    blockedBy: [
      ...slice.blockedBy,
      'payload_materialization_not_approved',
      'server_manifest_preview_not_created',
    ],
  };
}

function buildContract(
  runDir: string,
  runtimeContract: RuntimeServerDeliveryContract,
  runtimeContractSha256: string,
  targetPackManifestSha256: string,
  runtimePacketSummary: JsonObject,
  reviewerDecisionImportSummary: JsonObject,
  preExistingLocalMaterializationAccounted: boolean,
): MaterializationContract {
  return {
    schemaVersion: 'gustav-payload-shard-materialization-checksum-v2',
    runId: runtimeContract.runId,
    targetLocale: runtimeContract.targetLocale,
    studyTarget: runtimeContract.studyTarget,
    sourceLocales: runtimeContract.sourceLocales,
    materializationMode: 'dry_run_metadata_only',
    payloadCreationApprovalPresent: false,
    preExistingLocalMaterializationAccounted,
    runtimeServerDeliveryContractSha256: runtimeContractSha256,
    targetPackManifestSha256,
    prerequisiteGates: {
      runtimeServerDeliveryContractReady:
        n(runtimePacketSummary, 'blockers') === 0 &&
        b(runtimePacketSummary, 'readyForStorageCloudTargetMapV2'),
      reviewerDecisionImportV2DryRunReady:
        n(reviewerDecisionImportSummary, 'blockers') === 0 &&
        b(reviewerDecisionImportSummary, 'readyForReviewerDecisionImportV2DryRun'),
      reviewerDecisionImportV2DryRunReadyForPayloadShardMaterializationGate:
        n(reviewerDecisionImportSummary, 'blockers') === 0 &&
        b(reviewerDecisionImportSummary, 'readyForPayloadShardMaterializationGate'),
    },
    requiredManifestFields: runtimeContract.runtimeState.manifestRequiredFields,
    requiredServerManifestFields: runtimeContract.serverDeliveryContract.requiredServerManifestFields,
    requiredCacheKeyDimensions: runtimeContract.runtimeState.cacheKeyDimensions,
    runtimeSlices: runtimeContract.requiredRuntimeSlices.map((slice) =>
      buildSliceContract(runDir, runtimeContract.serverDeliveryContract.firebaseStoragePathTemplate, slice),
    ),
    closedTransitions: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      serverManifestCreated: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    nextRequiredGate: 'server_delivery_manifest_preview_v2',
  };
}

function uiLocaleDimensionCount(contract: MaterializationContract): number {
  return contract.runtimeSlices.reduce((sum, slice) => {
    const dimensions = [
      ...slice.cacheKeyContract.dimensions,
      ...Object.keys(slice.manifestIdentity),
    ].map((dimension) => dimension.toLowerCase());
    return sum + dimensions.filter((dimension) => dimension === 'uilocale' || dimension === 'interface_locale' || dimension === 'interfaceuilocale').length;
  }, 0);
}

function futureArtifactFilesPresent(contract: MaterializationContract): number {
  return contract.runtimeSlices.reduce((sum, slice) =>
    sum + Object.values(slice.artifactExistence).filter(Boolean).length, 0);
}

function pathScoped(slice: SliceMaterializationContract): boolean {
  const runtimePrefix = `pack_candidates/fr/runtime_slices/${slice.sourceLocale}/${slice.surface}/`;
  const indexPrefix = `fr/${slice.sourceLocale}/${slice.surface}/`;
  const checksumPath = `audits/payload_checksum_fr_${slice.sourceLocale}_${slice.surface}.json`;
  return (
    normalizePath(slice.futureArtifacts.sliceManifest).startsWith(runtimePrefix) &&
    normalizePath(slice.futureArtifacts.entryIndex).startsWith(runtimePrefix) &&
    normalizePath(slice.futureArtifacts.payloadShard).startsWith(runtimePrefix) &&
    normalizePath(slice.futureArtifacts.checksumReport) === checksumPath &&
    normalizePath(slice.manifestIdentity.entryIndex).startsWith(indexPrefix)
  );
}

function validateContract(contract: MaterializationContract): Finding[] {
  const findings: Finding[] = [];
  if (contract.targetLocale !== 'fr' || contract.studyTarget !== 'fr') {
    addFinding(findings, 'blocker', 'target_identity_mismatch', 'P14 is scoped to studyTarget=fr only.');
  }
  if (contract.materializationMode !== 'dry_run_metadata_only') {
    addFinding(findings, 'blocker', 'materialization_mode_not_dry_run', 'P14 may only create dry-run metadata.');
  }
  if (contract.payloadCreationApprovalPresent) {
    addFinding(findings, 'blocker', 'payload_creation_approval_opened', 'Payload creation approval must remain false in P14.');
  }
  if (!contract.prerequisiteGates.runtimeServerDeliveryContractReady) {
    addFinding(findings, 'blocker', 'runtime_server_delivery_prerequisite_not_ready', 'Runtime/server delivery contract must be ready before P14.');
  }
  if (!contract.prerequisiteGates.reviewerDecisionImportV2DryRunReadyForPayloadShardMaterializationGate) {
    addFinding(findings, 'blocker', 'reviewer_import_v2_dry_run_prerequisite_not_ready', 'Reviewer Decision Import V2 dry-run must open the payload materialization gate.');
  }
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!contract.requiredManifestFields.includes(field)) {
      addFinding(findings, 'blocker', 'manifest_field_missing', `Required runtime manifest field missing: ${field}.`);
    }
  }
  for (const field of ['activationApproved:false', 'gateReportRefs']) {
    if (!contract.requiredServerManifestFields.includes(field)) {
      addFinding(findings, 'blocker', 'server_manifest_field_missing', `Required server manifest field missing: ${field}.`);
    }
  }
  for (const dimension of REQUIRED_CACHE_KEY_DIMENSIONS) {
    if (!contract.requiredCacheKeyDimensions.includes(dimension)) {
      addFinding(findings, 'blocker', 'contract_cache_dimension_missing', `Required cache key dimension missing: ${dimension}.`);
    }
  }
  const expectedIds = expectedSliceIds();
  const ids = contract.runtimeSlices.map((slice) => slice.runtimeSliceId);
  if (ids.length !== expectedIds.size) {
    addFinding(findings, 'blocker', 'runtime_slice_count_invalid', `Expected ${expectedIds.size} runtime slice materialization contracts.`);
  }
  for (const expectedId of expectedIds) {
    if (!ids.includes(expectedId)) {
      addFinding(findings, 'blocker', 'runtime_slice_missing', `Missing runtime slice materialization contract: ${expectedId}.`);
    }
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      addFinding(findings, 'blocker', 'runtime_slice_duplicate', `Duplicate runtime slice materialization contract: ${id}.`);
    }
    seen.add(id);
  }
  if (
    contract.closedTransitions.serverUploadAllowed ||
    contract.closedTransitions.firebaseUploadAllowed ||
    contract.closedTransitions.downloadablePacksPublished ||
    contract.closedTransitions.serverManifestCreated ||
    contract.closedTransitions.runtimeDownloadsEnabled ||
    contract.closedTransitions.activationApproved ||
    contract.closedTransitions.readyForApply ||
    contract.closedTransitions.mayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'production_transition_opened', 'P14 must not open upload, server manifest, runtime download, activation or apply transitions.');
  }
  for (const slice of contract.runtimeSlices) {
    const expectedId = `${slice.studyTarget}-${slice.sourceLocale}-${slice.surface}`;
    if (slice.runtimeSliceId !== expectedId) {
      addFinding(findings, 'blocker', 'slice_identity_id_mismatch', `Runtime slice id does not match target/source/surface: ${slice.runtimeSliceId}.`);
    }
    if (slice.studyTarget !== 'fr' || slice.manifestIdentity.studyTarget !== 'fr') {
      addFinding(findings, 'blocker', 'slice_target_mismatch', `Slice is not scoped to studyTarget=fr: ${slice.runtimeSliceId}.`);
    }
    if (!REQUIRED_SOURCE_LOCALES.includes(slice.sourceLocale as (typeof REQUIRED_SOURCE_LOCALES)[number])) {
      addFinding(findings, 'blocker', 'slice_source_locale_invalid', `Slice sourceLocale must be ru or uk: ${slice.runtimeSliceId}.`);
    }
    if (slice.sourceLocale !== slice.manifestIdentity.sourceLocale) {
      addFinding(findings, 'blocker', 'slice_manifest_source_locale_mismatch', `Manifest sourceLocale does not match slice request: ${slice.runtimeSliceId}.`);
    }
    if (slice.surface !== slice.manifestIdentity.surface) {
      addFinding(findings, 'blocker', 'slice_manifest_surface_mismatch', `Manifest surface does not match slice request: ${slice.runtimeSliceId}.`);
    }
    if (!pathScoped(slice)) {
      addFinding(findings, 'blocker', 'slice_future_path_not_source_scoped', `Future artifact or entry index path is not target/source/surface scoped: ${slice.runtimeSliceId}.`);
    }
    for (const dimension of REQUIRED_CACHE_KEY_DIMENSIONS) {
      if (!slice.cacheKeyContract.dimensions.includes(dimension)) {
        addFinding(findings, 'blocker', 'slice_cache_key_dimension_missing', `Slice cache key missing ${dimension}: ${slice.runtimeSliceId}.`);
      }
    }
    if (slice.cacheKeyContract.dimensions.includes('uiLocale') || slice.cacheKeyContract.dimensions.includes('interfaceLocale')) {
      addFinding(findings, 'blocker', 'slice_cache_key_uses_ui_locale', `Slice cache key must not use UI locale: ${slice.runtimeSliceId}.`);
    }
    if (!slice.cacheKeyContract.template.includes('{sha256}') || !slice.serverPathPreview.includes('{sha256}')) {
      addFinding(findings, 'blocker', 'slice_sha256_placeholder_missing', `Slice cache/server path must include sha256 placeholder: ${slice.runtimeSliceId}.`);
    }
    if (
      !slice.checksumContract.sha256InManifestRequiredFields ||
      !slice.checksumContract.sha256InServerManifestRequiredFields ||
      !slice.checksumContract.sha256InCacheKeyDimensions ||
      !slice.checksumContract.sha256InCacheKeyTemplate
    ) {
      addFinding(findings, 'blocker', 'slice_checksum_sha256_contract_incomplete', `Slice checksum contract is missing a sha256 requirement: ${slice.runtimeSliceId}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(slice.checksumContract.dryRunCanonicalContractSha256)) {
      addFinding(findings, 'blocker', 'slice_dry_run_contract_hash_invalid', `Slice dry-run canonical contract hash is invalid: ${slice.runtimeSliceId}.`);
    }
    if (!contract.preExistingLocalMaterializationAccounted && Object.values(slice.artifactExistence).some(Boolean)) {
      addFinding(findings, 'blocker', 'future_artifact_created_without_approval', `Future payload/manifest/checksum artifact exists before payload creation approval: ${slice.runtimeSliceId}.`);
    }
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbes(contract: MaterializationContract): Probe[] {
  const fixtures: Array<{ id: string; expectedAccept: boolean; mutate?: (draft: MaterializationContract) => void }> = [
    { id: 'canonical_payload_materialization_contract_accepts', expectedAccept: true },
    {
      id: 'missing_runtime_slice_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices.pop(); },
    },
    {
      id: 'duplicate_runtime_slice_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices.push(clone(draft.runtimeSlices[0])); },
    },
    {
      id: 'wrong_study_target_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices[0].manifestIdentity.studyTarget = 'en'; },
    },
    {
      id: 'wrong_source_locale_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices[0].manifestIdentity.sourceLocale = 'en'; },
    },
    {
      id: 'source_path_mismatch_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices[0].futureArtifacts.payloadShard = 'pack_candidates/fr/runtime_slices/uk/lesson/payload-drift.json'; },
    },
    {
      id: 'cache_key_missing_sha256_rejected',
      expectedAccept: false,
      mutate: (draft) => {
        draft.runtimeSlices[0].cacheKeyContract.dimensions = draft.runtimeSlices[0].cacheKeyContract.dimensions.filter((dimension) => dimension !== 'sha256');
      },
    },
    {
      id: 'ui_locale_dimension_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices[0].cacheKeyContract.dimensions.push('uiLocale'); },
    },
    {
      id: 'future_payload_present_without_approval_rejected',
      expectedAccept: false,
      mutate: (draft) => {
        draft.preExistingLocalMaterializationAccounted = false;
        draft.runtimeSlices[0].artifactExistence.payloadShard = true;
      },
    },
    {
      id: 'server_upload_open_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.closedTransitions.serverUploadAllowed = true as false; },
    },
    {
      id: 'activation_open_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.closedTransitions.activationApproved = true as false; },
    },
    {
      id: 'server_path_missing_sha256_rejected',
      expectedAccept: false,
      mutate: (draft) => { draft.runtimeSlices[0].serverPathPreview = draft.runtimeSlices[0].serverPathPreview.replace('/{sha256}.json', '/payload.json'); },
    },
  ];
  return fixtures.map((fixture) => {
    const draft = clone(contract);
    fixture.mutate?.(draft);
    const blockers = validateContract(draft).filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: fixture.id,
      expectedAccept: fixture.expectedAccept,
      accepted,
      blockers,
      passed: accepted === fixture.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Payload Shard Materialization/Checksum V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: ${report.summary.targetLocale}`,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- Materialization mode: ${report.summary.materializationMode}`,
    `- Payload creation approval present: ${report.summary.payloadCreationApprovalPresent ? 'yes' : 'no'}`,
    `- Runtime slices: ${report.summary.runtimeSlices}/${report.summary.expectedRuntimeSlices}`,
    `- Materialization contracts: ${report.summary.materializationContracts}`,
    `- Manifest identity contracts: ${report.summary.manifestIdentityContracts}`,
    `- Checksum contracts: ${report.summary.checksumContracts}`,
    `- Checksum contracts with sha256 dimension: ${report.summary.checksumContractsWithSha256Dimension}`,
    `- Cache key contracts with sha256: ${report.summary.cacheKeyContractsWithSha256}`,
    `- Server path previews with sha256: ${report.summary.serverPathPreviewsWithSha256}`,
    `- Source-locale scoped future paths: ${report.summary.sourceLocaleScopedFuturePaths}`,
    `- UI-locale identity dimensions: ${report.summary.uiLocaleIdentityDimensions}`,
    `- Future artifact files present: ${report.summary.futureArtifactFilesPresent}`,
    `- Pre-existing local materialization accounted: ${report.summary.preExistingLocalMaterializationAccounted ? 'yes' : 'no'}`,
    `- Unaccounted future artifact files present: ${report.summary.unaccountedFutureArtifactFilesPresent}`,
    `- Payload shards created: ${report.summary.payloadShardsCreated}`,
    `- Checksum reports created: ${report.summary.checksumReportsCreated}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved flags: ${report.summary.activationApprovedFlags}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for server manifest preview gate: ${report.summary.readyForServerManifestPreviewGate ? 'yes' : 'no'}`,
    `- Ready for payload shard creation: ${report.summary.readyForPayloadShardCreation ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Runtime Slice Contracts',
    '',
  ];
  for (const slice of report.contract.runtimeSlices) {
    lines.push(`- \`${slice.runtimeSliceId}\`: ${slice.serverPathPreview} | ${slice.cacheKeyContract.template}`);
  }
  lines.push('', '## Probes', '');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet writes only aggregate Gustav audit artifacts.',
    '- It does not create payload shard files.',
    '- It does not create per-slice checksum files.',
    '- It does not upload to Firebase/server.',
    '- It does not enable runtime downloads.',
    '- It does not approve activation or production apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_payload_shard_materialization_checksum_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P14 payload shard materialization/checksum gate is currently scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', target);
  ensureDir(auditsDir);

  const runtimeContractPath = path.join(packDir, 'runtime_server_delivery_contract_v2.json');
  const runtimePacketPath = path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.json');
  const reviewerDecisionImportPath = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const closedLocalPayloadMaterializationPath = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json');
  const targetPackManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const outJson = path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.json');
  const outMd = path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.md');

  for (const requiredPath of [runtimeContractPath, runtimePacketPath, reviewerDecisionImportPath, targetPackManifestPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required P14 input is missing: ${rel(repoRoot, requiredPath)}`);
    }
  }

  const runtimeContract = readJson<RuntimeServerDeliveryContract>(runtimeContractPath);
  const runtimePacketSummary = summaryOf(runtimePacketPath);
  const reviewerDecisionImportSummary = summaryOf(reviewerDecisionImportPath);
  const closedLocalPayloadMaterializationSummary = summaryOf(closedLocalPayloadMaterializationPath);
  const expectedRuntimeSlices = REQUIRED_SOURCE_LOCALES.length * REQUIRED_SURFACES.length;
  const preExistingLocalMaterializationAccounted =
    fs.existsSync(closedLocalPayloadMaterializationPath) &&
    n(closedLocalPayloadMaterializationSummary, 'blockers') === 0 &&
    n(closedLocalPayloadMaterializationSummary, 'runtimeSlices') === expectedRuntimeSlices &&
    n(closedLocalPayloadMaterializationSummary, 'localSlicePayloadsCreated') === expectedRuntimeSlices &&
    n(closedLocalPayloadMaterializationSummary, 'localSliceManifestsCreated') === expectedRuntimeSlices &&
    n(closedLocalPayloadMaterializationSummary, 'localEntryIndexesCreated') === expectedRuntimeSlices &&
    n(closedLocalPayloadMaterializationSummary, 'localChecksumReportsCreated') === expectedRuntimeSlices &&
    n(closedLocalPayloadMaterializationSummary, 'checksumMismatches') === 0 &&
    b(closedLocalPayloadMaterializationSummary, 'readyForServerDeliveryPublishPreflightV2') &&
    !b(closedLocalPayloadMaterializationSummary, 'serverUploadAllowed') &&
    !b(closedLocalPayloadMaterializationSummary, 'firebaseUploadAllowed') &&
    !b(closedLocalPayloadMaterializationSummary, 'runtimeDownloadsEnabled') &&
    !b(closedLocalPayloadMaterializationSummary, 'activationApproved') &&
    !b(closedLocalPayloadMaterializationSummary, 'readyForApply') &&
    !b(closedLocalPayloadMaterializationSummary, 'mayModifyProductionAppFiles');
  const contract = buildContract(
    runDir,
    runtimeContract,
    sha256(runtimeContractPath),
    sha256(targetPackManifestPath),
    runtimePacketSummary,
    reviewerDecisionImportSummary,
    preExistingLocalMaterializationAccounted,
  );
  const validationFindings = validateContract(contract);
  const probes = makeProbes(contract);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...validationFindings];
  for (const probe of failedProbes) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(
    findings,
    'info',
    'dry_run_metadata_only',
    'P14 maps materialization/checksum identity and future paths without creating payload shards, per-slice checksum reports, server manifests or runtime activation.',
  );
  addFinding(
    findings,
    'info',
    'next_gate_server_manifest_preview',
    'The next large pass should create a dry-run server delivery manifest preview gate using these 12 materialization contracts.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const futureArtifactFiles = futureArtifactFilesPresent(contract);
  const serverUploadAllowed = contract.closedTransitions.serverUploadAllowed;
  const firebaseUploadAllowed = contract.closedTransitions.firebaseUploadAllowed;
  const downloadablePacksPublished = contract.closedTransitions.downloadablePacksPublished;
  const serverManifestCreated = contract.closedTransitions.serverManifestCreated;
  const runtimeDownloadsEnabled = contract.closedTransitions.runtimeDownloadsEnabled;
  const activationApprovedFlags = contract.closedTransitions.activationApproved ? 1 : 0;

  const report: Report = {
    schemaVersion: 'gustav-payload-shard-materialization-checksum-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      runtimeServerDeliveryContractV2: rel(repoRoot, runtimeContractPath),
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimePacketPath),
      reviewerDecisionImportV2DryRun: rel(repoRoot, reviewerDecisionImportPath),
      closedLocalPayloadMaterializationV2Packet: rel(repoRoot, closedLocalPayloadMaterializationPath),
      targetPackManifestV2Draft: rel(repoRoot, targetPackManifestPath),
    },
    outputs: {
      payloadShardMaterializationChecksumV2PacketJson: rel(repoRoot, outJson),
      payloadShardMaterializationChecksumV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: target,
      sourceLocales: contract.sourceLocales.length,
      materializationMode: contract.materializationMode,
      payloadCreationApprovalPresent: contract.payloadCreationApprovalPresent,
      prerequisiteRuntimeServerDeliveryContractReady: contract.prerequisiteGates.runtimeServerDeliveryContractReady,
      prerequisiteReviewerDecisionImportV2DryRunReady: contract.prerequisiteGates.reviewerDecisionImportV2DryRunReadyForPayloadShardMaterializationGate,
      runtimeSlices: runtimeContract.requiredRuntimeSlices.length,
      expectedRuntimeSlices: expectedSliceIds().size,
      materializationContracts: contract.runtimeSlices.length,
      manifestIdentityContracts: contract.runtimeSlices.filter((slice) =>
        slice.manifestIdentity.studyTarget === 'fr' &&
        slice.manifestIdentity.sourceLocale === slice.sourceLocale &&
        slice.manifestIdentity.surface === slice.surface &&
        slice.manifestIdentity.sha256Dimension === '{sha256}',
      ).length,
      checksumContracts: contract.runtimeSlices.filter((slice) => slice.checksumContract.payloadSha256Required).length,
      checksumContractsWithSha256Dimension: contract.runtimeSlices.filter((slice) =>
        slice.checksumContract.sha256InManifestRequiredFields &&
        slice.checksumContract.sha256InServerManifestRequiredFields &&
        slice.checksumContract.sha256InCacheKeyDimensions &&
        slice.checksumContract.sha256InCacheKeyTemplate,
      ).length,
      cacheKeyContractsWithSha256: contract.runtimeSlices.filter((slice) =>
        slice.cacheKeyContract.dimensions.includes('sha256') && slice.cacheKeyContract.template.includes('{sha256}'),
      ).length,
      serverPathPreviewsWithSha256: contract.runtimeSlices.filter((slice) => slice.serverPathPreview.includes('{sha256}')).length,
      sourceLocaleScopedFuturePaths: contract.runtimeSlices.filter(pathScoped).length,
      uiLocaleIdentityDimensions: uiLocaleDimensionCount(contract),
      futureArtifactFilesPresent: futureArtifactFiles,
      preExistingLocalMaterializationAccounted: contract.preExistingLocalMaterializationAccounted,
      unaccountedFutureArtifactFilesPresent: contract.preExistingLocalMaterializationAccounted ? 0 : futureArtifactFiles,
      sliceManifestFilesPresent: contract.runtimeSlices.filter((slice) => slice.artifactExistence.sliceManifest).length,
      entryIndexFilesPresent: contract.runtimeSlices.filter((slice) => slice.artifactExistence.entryIndex).length,
      payloadShardsCreated: contract.preExistingLocalMaterializationAccounted ? 0 : contract.runtimeSlices.filter((slice) => slice.artifactExistence.payloadShard).length,
      checksumReportsCreated: contract.preExistingLocalMaterializationAccounted ? 0 : contract.runtimeSlices.filter((slice) => slice.artifactExistence.checksumReport).length,
      serverUploadAllowed,
      firebaseUploadAllowed,
      downloadablePacksPublished,
      serverManifestCreated,
      runtimeDownloadsEnabled,
      activationApprovedFlags,
      readyForServerManifestPreviewGate: blockers === 0,
      readyForPayloadShardCreation: false,
      readyForRuntimeDownloadActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    artifactHashes: {
      runtimeServerDeliveryContractV2: sha256(runtimeContractPath),
      runtimeServerDeliveryContractV2Packet: sha256(runtimePacketPath),
      reviewerDecisionImportV2DryRun: sha256(reviewerDecisionImportPath),
      targetPackManifestV2Draft: sha256(targetPackManifestPath),
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      payloadShardFilesCreatedByThisScript: false,
      checksumFilesCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV payload shard materialization/checksum V2 packet: ${report.status}`);
  console.log(`Runtime slices: ${report.summary.runtimeSlices}/${report.summary.expectedRuntimeSlices}`);
  console.log(`Materialization contracts: ${report.summary.materializationContracts}`);
  console.log(`Future artifact files present: ${report.summary.futureArtifactFilesPresent}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for server manifest preview gate: ${report.summary.readyForServerManifestPreviewGate ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
