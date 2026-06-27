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

type GateReportRef = {
  gateId: string;
  path: string;
  sha256: string;
  status: string;
  summaryReadyField?: string;
};

type SliceMaterializationContract = {
  runtimeSliceId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  futureArtifacts: {
    sliceManifest: string;
    entryIndex: string;
    payloadShard: string;
    checksumReport: string;
  };
  manifestIdentity: {
    packIdPreview: string;
    packIdPrefix: string;
    studyTarget: string;
    sourceLocale: string;
    surface: string;
    schemaVersion: string;
    contentVersion: string;
    minAppVersion: string;
    sha256Dimension: '{sha256}';
    byteSizeDimension: '{byteSize}';
    entryIndex: string;
  };
  cacheKeyContract: {
    dimensions: string[];
    template: string;
  };
  checksumContract: {
    algorithm: 'sha256';
    payloadSha256Required: true;
    payloadBytesRequiredBeforeActivation: true;
    dryRunCanonicalContractSha256: string;
  };
  serverPathPreview: string;
};

type PayloadMaterializationPacket = {
  schemaVersion: 'gustav-payload-shard-materialization-checksum-v2-packet-v0';
  status: Status;
  summary: {
    blockers: number;
    readyForServerManifestPreviewGate: boolean;
  };
  contract: {
    schemaVersion: 'gustav-payload-shard-materialization-checksum-v2';
    runId: string;
    targetLocale: string;
    studyTarget: string;
    sourceLocales: string[];
    materializationMode: 'dry_run_metadata_only';
    requiredServerManifestFields: string[];
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
  };
};

type TargetPackManifestDraft = {
  schemaVersion: string;
  runId: string;
  studyTarget: string;
  targetLocale: string;
  sourceLocales: string[];
  contentVersion: string;
  minAppVersion: string;
  gateReports: GateReportRef[];
  serverDelivery: {
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    downloadablePacksPublished: boolean;
    serverManifestPath: null | string;
  };
  activation: {
    activationApproved: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
};

type ServerManifestPreviewEntry = {
  previewEntryId: string;
  runtimeSliceId: string;
  serverPath: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  schemaVersion: string;
  contentVersion: string;
  minAppVersion: 'blocked_until_server_manifest_preview_gate';
  sha256: '{sha256}';
  byteSize: '{byteSize}';
  createdAt: string;
  publishedAt: 'blocked_until_upload_gate';
  activationApproved: false;
  dependencies: {
    payloadMaterializationContractSha256: string;
    sliceChecksumContractSha256: string;
    targetPackManifestSha256: string;
  };
  entryIndex: string;
  payloadShard: string;
  checksumReport: string;
  cacheKey: string;
  gateReportRefs: GateReportRef[];
  rollbackFromVersion: string;
  rollbackPolicy: {
    priorKnownGoodContentVersion: null;
    rollbackRequiredBeforeActivation: true;
    rollbackTargetReason: 'first_fr_pack_has_no_prior_published_version';
  };
  previewEntrySha256: string;
};

type ServerManifestPreviewContract = {
  schemaVersion: 'gustav-server-delivery-manifest-preview-v2';
  runId: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  previewMode: 'dry_run_only';
  futureServerManifestPath: 'pack_candidates/fr/server_delivery_manifest_v2.json';
  futureServerManifestExists: boolean;
  payloadMaterializationPacketSha256: string;
  targetPackManifestSha256: string;
  gateReportRefs: GateReportRef[];
  sourceManifestGateRefHashDrifts: number;
  serverManifestPreviewEntries: ServerManifestPreviewEntry[];
  closedTransitions: {
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    serverManifestCreated: false;
    embeddedIndexInsertionAllowed: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  nextRequiredGate: 'runtime_cache_integrity_rollback_v2';
};

type Report = {
  schemaVersion: 'gustav-server-delivery-manifest-preview-v2-packet-v0';
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
    sourceLocales: number;
    previewMode: 'dry_run_only';
    payloadMaterializationReady: boolean;
    serverManifestPreviewCreated: boolean;
    futureServerManifestExists: boolean;
    previewEntries: number;
    expectedPreviewEntries: number;
    entriesWithGateReportRefs: number;
    gateReportRefsPerEntryMin: number;
    gateReportRefsTotal: number;
    gateReportRefsCurrentSha: number;
    sourceManifestGateRefHashDrifts: number;
    entriesWithRollbackFromVersion: number;
    entriesWithActivationApprovedFalse: number;
    entriesWithSha256Placeholder: number;
    entriesWithByteSizePlaceholder: number;
    entriesWithPublishedAtBlocked: number;
    entriesWithChecksumLinkage: number;
    sourceLocaleScopedServerPaths: number;
    uiLocaleIdentityDimensions: number;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    downloadablePacksPublished: boolean;
    serverManifestCreated: boolean;
    embeddedIndexInsertionAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    activationApprovedFlags: number;
    readyForRuntimeCacheIntegrityGate: boolean;
    readyForServerUpload: boolean;
    readyForRuntimeDownloadActivation: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  contract: ServerManifestPreviewContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    serverManifestFilesCreatedByThisScript: false;
    embeddedIndexModifiedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const REQUIRED_SOURCE_LOCALES = ['ru', 'uk'] as const;
const REQUIRED_SURFACES = ['lesson', 'lesson_intro', 'quiz', 'audio_metadata', 'flashcard', 'personal_practice'] as const;
const REQUIRED_SERVER_FIELDS = [
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
  'activationApproved:false',
  'publishedAt',
  'rollbackFromVersion',
  'gateReportRefs',
] as const;

const EXTRA_GATE_REPORTS: Array<{ gateId: string; path: string; summaryReadyField?: string }> = [
  { gateId: 'runtime_server_delivery_contract_v2', path: 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/runtime_server_delivery_contract_v2_packet.json', summaryReadyField: 'readyForStorageCloudTargetMapV2' },
  { gateId: 'storage_cloud_target_map_v2', path: 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/storage_cloud_target_map_v2_packet.json', summaryReadyField: 'readyForAdminPackDeliverySurfaceV2' },
  { gateId: 'admin_pack_delivery_surface_v2', path: 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/admin_pack_delivery_surface_v2_packet.json', summaryReadyField: 'readyForReviewerDecisionImportV2DryRun' },
  { gateId: 'reviewer_decision_import_v2_dry_run', path: 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/reviewer_decision_import_v2_dry_run.json', summaryReadyField: 'readyForPayloadShardMaterializationGate' },
  { gateId: 'payload_shard_materialization_checksum_v2', path: 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/payload_shard_materialization_checksum_v2_packet.json', summaryReadyField: 'readyForServerManifestPreviewGate' },
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function rel(repoRoot: string, filePath: string): string {
  return normalizePath(path.relative(repoRoot, filePath));
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

function statusOf(filePath: string): string {
  const doc = readJson<JsonObject>(filePath);
  const status = doc.status;
  if (typeof status === 'string') return status;
  const summaryStatus = object(doc.summary).status;
  return typeof summaryStatus === 'string' ? summaryStatus : 'UNKNOWN';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function expectedSliceIds(): Set<string> {
  return new Set(REQUIRED_SOURCE_LOCALES.flatMap((sourceLocale) =>
    REQUIRED_SURFACES.map((surface) => `fr-${sourceLocale}-${surface}`),
  ));
}

function rehydrateGateReportRef(ref: GateReportRef): GateReportRef {
  if (!fs.existsSync(ref.path)) return { ...ref };
  return {
    gateId: ref.gateId,
    path: normalizePath(ref.path),
    sha256: sha256(ref.path),
    status: statusOf(ref.path),
    ...(ref.summaryReadyField ? { summaryReadyField: ref.summaryReadyField } : {}),
  };
}

function buildGateReportRefs(targetManifest: TargetPackManifestDraft): { refs: GateReportRef[]; sourceManifestGateRefHashDrifts: number } {
  const sourceRefs = targetManifest.gateReports.map((ref) => rehydrateGateReportRef(ref));
  const sourceManifestGateRefHashDrifts = targetManifest.gateReports.filter((ref, index) => sourceRefs[index]?.sha256 !== ref.sha256).length;
  const extras = EXTRA_GATE_REPORTS.map((ref) => rehydrateGateReportRef({
    gateId: ref.gateId,
    path: ref.path,
    sha256: '',
    status: 'UNKNOWN',
    summaryReadyField: ref.summaryReadyField,
  }));
  const deduped = new Map<string, GateReportRef>();
  for (const ref of [...sourceRefs, ...extras]) {
    deduped.set(`${ref.gateId}:${normalizePath(ref.path)}`, ref);
  }
  return { refs: Array.from(deduped.values()), sourceManifestGateRefHashDrifts };
}

function buildPreviewEntry(
  generatedAt: string,
  slice: SliceMaterializationContract,
  gateReportRefs: GateReportRef[],
  payloadMaterializationPacketSha256: string,
  targetPackManifestSha256: string,
): ServerManifestPreviewEntry {
  const base = {
    runtimeSliceId: slice.runtimeSliceId,
    serverPath: slice.serverPathPreview,
    packId: slice.manifestIdentity.packIdPreview,
    studyTarget: slice.studyTarget,
    sourceLocale: slice.sourceLocale,
    surface: slice.surface,
    schemaVersion: slice.manifestIdentity.schemaVersion,
    contentVersion: slice.manifestIdentity.contentVersion,
    sha256: '{sha256}' as const,
    byteSize: '{byteSize}' as const,
    entryIndex: slice.manifestIdentity.entryIndex,
    payloadShard: slice.futureArtifacts.payloadShard,
    checksumReport: slice.futureArtifacts.checksumReport,
    cacheKey: slice.cacheKeyContract.template,
    rollbackFromVersion: 'none:first_fr_pack_not_published',
  };
  return {
    previewEntryId: `server-preview-${slice.runtimeSliceId}`,
    ...base,
    minAppVersion: 'blocked_until_server_manifest_preview_gate',
    createdAt: generatedAt,
    publishedAt: 'blocked_until_upload_gate',
    activationApproved: false,
    dependencies: {
      payloadMaterializationContractSha256: payloadMaterializationPacketSha256,
      sliceChecksumContractSha256: slice.checksumContract.dryRunCanonicalContractSha256,
      targetPackManifestSha256,
    },
    gateReportRefs,
    rollbackPolicy: {
      priorKnownGoodContentVersion: null,
      rollbackRequiredBeforeActivation: true,
      rollbackTargetReason: 'first_fr_pack_has_no_prior_published_version',
    },
    previewEntrySha256: hashObject(base),
  };
}

function buildContract(
  generatedAt: string,
  runDir: string,
  payloadPacket: PayloadMaterializationPacket,
  targetManifest: TargetPackManifestDraft,
  payloadPacketSha256: string,
  targetPackManifestSha256: string,
): ServerManifestPreviewContract {
  const { refs, sourceManifestGateRefHashDrifts } = buildGateReportRefs(targetManifest);
  return {
    schemaVersion: 'gustav-server-delivery-manifest-preview-v2',
    runId: payloadPacket.contract.runId,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    previewMode: 'dry_run_only',
    futureServerManifestPath: 'pack_candidates/fr/server_delivery_manifest_v2.json',
    futureServerManifestExists: fs.existsSync(path.join(runDir, 'pack_candidates', 'fr', 'server_delivery_manifest_v2.json')),
    payloadMaterializationPacketSha256: payloadPacketSha256,
    targetPackManifestSha256,
    gateReportRefs: refs,
    sourceManifestGateRefHashDrifts,
    serverManifestPreviewEntries: payloadPacket.contract.runtimeSlices.map((slice) =>
      buildPreviewEntry(generatedAt, slice, refs, payloadPacketSha256, targetPackManifestSha256),
    ),
    closedTransitions: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      serverManifestCreated: false,
      embeddedIndexInsertionAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    nextRequiredGate: 'runtime_cache_integrity_rollback_v2',
  };
}

function entryServerPathScoped(entry: ServerManifestPreviewEntry): boolean {
  const expectedPrefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/${entry.contentVersion}/`;
  return entry.serverPath.startsWith(expectedPrefix) && entry.serverPath.endsWith('/{sha256}.json');
}

function entryHasUiLocaleDimension(entry: ServerManifestPreviewEntry): boolean {
  const fields = [
    entry.serverPath,
    entry.packId,
    entry.cacheKey,
    entry.entryIndex,
    ...Object.keys(entry),
  ].map((value) => value.toLowerCase());
  return fields.some((value) => value.includes('uilocale') || value.includes('interface_locale') || value.includes('interfaceuilocale'));
}

function gateRefsCurrent(refs: GateReportRef[]): number {
  return refs.filter((ref) => fs.existsSync(ref.path) && sha256(ref.path) === ref.sha256).length;
}

function validateContract(contract: ServerManifestPreviewContract): Finding[] {
  const findings: Finding[] = [];
  if (contract.targetLocale !== 'fr' || contract.studyTarget !== 'fr') {
    addFinding(findings, 'blocker', 'target_identity_mismatch', 'P15 is scoped to studyTarget=fr only.');
  }
  if (contract.previewMode !== 'dry_run_only') {
    addFinding(findings, 'blocker', 'preview_mode_not_dry_run', 'Server manifest preview must be dry-run only.');
  }
  if (contract.futureServerManifestExists) {
    addFinding(findings, 'blocker', 'future_server_manifest_exists_without_approval', 'Future server manifest file exists before upload/apply approval.', contract.futureServerManifestPath);
  }
  if (
    contract.closedTransitions.serverUploadAllowed ||
    contract.closedTransitions.firebaseUploadAllowed ||
    contract.closedTransitions.downloadablePacksPublished ||
    contract.closedTransitions.serverManifestCreated ||
    contract.closedTransitions.embeddedIndexInsertionAllowed ||
    contract.closedTransitions.runtimeDownloadsEnabled ||
    contract.closedTransitions.activationApproved ||
    contract.closedTransitions.readyForApply ||
    contract.closedTransitions.mayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'production_transition_opened', 'P15 must not open server upload, runtime download, embedded index, activation or apply transitions.');
  }
  if (contract.gateReportRefs.length < 12) {
    addFinding(findings, 'blocker', 'gate_report_refs_too_few', 'Server manifest preview must carry gate report refs.');
  }
  for (const ref of contract.gateReportRefs) {
    if (!fs.existsSync(ref.path)) {
      addFinding(findings, 'blocker', 'gate_report_ref_missing_file', `Gate report ref file is missing: ${ref.gateId}.`, ref.path);
    } else if (sha256(ref.path) !== ref.sha256) {
      addFinding(findings, 'blocker', 'gate_report_ref_sha_mismatch', `Gate report ref sha is stale: ${ref.gateId}.`, ref.path);
    }
    if (!/^[a-f0-9]{64}$/.test(ref.sha256)) {
      addFinding(findings, 'blocker', 'gate_report_ref_sha_invalid', `Gate report ref sha is invalid: ${ref.gateId}.`, ref.path);
    }
  }
  const expectedIds = expectedSliceIds();
  const entryIds = contract.serverManifestPreviewEntries.map((entry) => entry.runtimeSliceId);
  if (entryIds.length !== expectedIds.size) {
    addFinding(findings, 'blocker', 'preview_entry_count_invalid', `Expected ${expectedIds.size} server manifest preview entries.`);
  }
  for (const expectedId of expectedIds) {
    if (!entryIds.includes(expectedId)) {
      addFinding(findings, 'blocker', 'preview_entry_missing', `Missing server manifest preview entry: ${expectedId}.`);
    }
  }
  const seen = new Set<string>();
  for (const id of entryIds) {
    if (seen.has(id)) addFinding(findings, 'blocker', 'preview_entry_duplicate', `Duplicate server manifest preview entry: ${id}.`);
    seen.add(id);
  }
  for (const entry of contract.serverManifestPreviewEntries) {
    const expectedId = `${entry.studyTarget}-${entry.sourceLocale}-${entry.surface}`;
    if (entry.runtimeSliceId !== expectedId) {
      addFinding(findings, 'blocker', 'entry_identity_id_mismatch', `Preview entry id does not match target/source/surface: ${entry.runtimeSliceId}.`);
    }
    if (entry.studyTarget !== 'fr') {
      addFinding(findings, 'blocker', 'entry_target_mismatch', `Preview entry is not scoped to studyTarget=fr: ${entry.runtimeSliceId}.`);
    }
    if (!REQUIRED_SOURCE_LOCALES.includes(entry.sourceLocale as (typeof REQUIRED_SOURCE_LOCALES)[number])) {
      addFinding(findings, 'blocker', 'entry_source_locale_invalid', `Preview entry sourceLocale must be ru or uk: ${entry.runtimeSliceId}.`);
    }
    if (!REQUIRED_SURFACES.includes(entry.surface as (typeof REQUIRED_SURFACES)[number])) {
      addFinding(findings, 'blocker', 'entry_surface_invalid', `Preview entry surface is invalid: ${entry.runtimeSliceId}.`);
    }
    if (!entryServerPathScoped(entry)) {
      addFinding(findings, 'blocker', 'entry_server_path_not_source_scoped', `Server path is not fr/sourceLocale/surface/contentVersion scoped: ${entry.runtimeSliceId}.`);
    }
    if (entryHasUiLocaleDimension(entry)) {
      addFinding(findings, 'blocker', 'entry_uses_ui_locale_dimension', `Preview entry must not use UI locale as an identity/cache dimension: ${entry.runtimeSliceId}.`);
    }
    if (entry.sha256 !== '{sha256}' || !entry.serverPath.includes('{sha256}') || !entry.cacheKey.includes('{sha256}')) {
      addFinding(findings, 'blocker', 'entry_sha256_placeholder_missing', `Preview entry must keep sha256 as a required placeholder: ${entry.runtimeSliceId}.`);
    }
    if (entry.byteSize !== '{byteSize}') {
      addFinding(findings, 'blocker', 'entry_byte_size_placeholder_missing', `Preview entry must keep byteSize as a required placeholder: ${entry.runtimeSliceId}.`);
    }
    if (entry.activationApproved !== false) {
      addFinding(findings, 'blocker', 'entry_activation_approved_open', `Preview entry activationApproved must stay false: ${entry.runtimeSliceId}.`);
    }
    if (entry.publishedAt !== 'blocked_until_upload_gate') {
      addFinding(findings, 'blocker', 'entry_published_at_open', `Preview entry must not publish: ${entry.runtimeSliceId}.`);
    }
    if (!entry.rollbackFromVersion || !entry.rollbackPolicy.rollbackRequiredBeforeActivation) {
      addFinding(findings, 'blocker', 'entry_rollback_metadata_missing', `Preview entry must include rollback metadata: ${entry.runtimeSliceId}.`);
    }
    if (
      !/^[a-f0-9]{64}$/.test(entry.dependencies.payloadMaterializationContractSha256) ||
      !/^[a-f0-9]{64}$/.test(entry.dependencies.sliceChecksumContractSha256) ||
      !/^[a-f0-9]{64}$/.test(entry.dependencies.targetPackManifestSha256)
    ) {
      addFinding(findings, 'blocker', 'entry_checksum_linkage_missing', `Preview entry checksum linkage is incomplete: ${entry.runtimeSliceId}.`);
    }
    if (entry.gateReportRefs.length !== contract.gateReportRefs.length || entry.gateReportRefs.length < 12) {
      addFinding(findings, 'blocker', 'entry_gate_report_refs_missing', `Preview entry must include gate report refs: ${entry.runtimeSliceId}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(entry.previewEntrySha256)) {
      addFinding(findings, 'blocker', 'entry_preview_hash_invalid', `Preview entry hash is invalid: ${entry.runtimeSliceId}.`);
    }
  }
  for (const field of REQUIRED_SERVER_FIELDS) {
    const ok = contract.serverManifestPreviewEntries.every((entry) => {
      if (field === 'activationApproved:false') return entry.activationApproved === false;
      return Object.prototype.hasOwnProperty.call(entry, field);
    });
    if (!ok) addFinding(findings, 'blocker', 'required_server_manifest_field_missing', `Preview entries are missing required server manifest field: ${field}.`);
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbes(contract: ServerManifestPreviewContract): Probe[] {
  const fixtures: Array<{ id: string; expectedAccept: boolean; mutate?: (draft: ServerManifestPreviewContract) => void }> = [
    { id: 'canonical_server_manifest_preview_accepts', expectedAccept: true },
    { id: 'missing_preview_entry_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries.pop(); } },
    { id: 'duplicate_preview_entry_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries.push(clone(draft.serverManifestPreviewEntries[0])); } },
    { id: 'wrong_target_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].studyTarget = 'en'; } },
    { id: 'wrong_source_locale_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].sourceLocale = 'en'; } },
    { id: 'server_path_drift_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].serverPath = draft.serverManifestPreviewEntries[0].serverPath.replace('/ru/', '/uk/'); } },
    { id: 'missing_sha256_placeholder_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].sha256 = 'abc' as '{sha256}'; } },
    { id: 'missing_byte_size_placeholder_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].byteSize = '123' as '{byteSize}'; } },
    { id: 'missing_gate_refs_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].gateReportRefs = []; } },
    { id: 'stale_gate_ref_sha_rejected', expectedAccept: false, mutate: (draft) => { draft.gateReportRefs[0].sha256 = '0'.repeat(64); draft.serverManifestPreviewEntries[0].gateReportRefs[0].sha256 = '0'.repeat(64); } },
    { id: 'missing_rollback_metadata_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].rollbackFromVersion = ''; } },
    { id: 'activation_open_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].activationApproved = true as false; } },
    { id: 'server_upload_open_rejected', expectedAccept: false, mutate: (draft) => { draft.closedTransitions.serverUploadAllowed = true as false; } },
    { id: 'runtime_downloads_open_rejected', expectedAccept: false, mutate: (draft) => { draft.closedTransitions.runtimeDownloadsEnabled = true as false; } },
    { id: 'embedded_index_insertion_open_rejected', expectedAccept: false, mutate: (draft) => { draft.closedTransitions.embeddedIndexInsertionAllowed = true as false; } },
    { id: 'ui_locale_dimension_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestPreviewEntries[0].cacheKey += '/{uiLocale}'; } },
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

function uiLocaleIdentityDimensions(entries: ServerManifestPreviewEntry[]): number {
  return entries.filter(entryHasUiLocaleDimension).length;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Server Delivery Manifest Preview V2 Packet',
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
    `- Preview mode: ${report.summary.previewMode}`,
    `- Payload materialization ready: ${report.summary.payloadMaterializationReady ? 'yes' : 'no'}`,
    `- Future server manifest exists: ${report.summary.futureServerManifestExists ? 'yes' : 'no'}`,
    `- Preview entries: ${report.summary.previewEntries}/${report.summary.expectedPreviewEntries}`,
    `- Entries with gate report refs: ${report.summary.entriesWithGateReportRefs}`,
    `- Gate report refs per entry min: ${report.summary.gateReportRefsPerEntryMin}`,
    `- Gate report refs current sha: ${report.summary.gateReportRefsCurrentSha}/${report.summary.gateReportRefsTotal}`,
    `- Source manifest gate ref hash drifts rehydrated: ${report.summary.sourceManifestGateRefHashDrifts}`,
    `- Entries with rollbackFromVersion: ${report.summary.entriesWithRollbackFromVersion}`,
    `- Entries with activationApproved=false: ${report.summary.entriesWithActivationApprovedFalse}`,
    `- Entries with sha256 placeholder: ${report.summary.entriesWithSha256Placeholder}`,
    `- Entries with byteSize placeholder: ${report.summary.entriesWithByteSizePlaceholder}`,
    `- Source-locale scoped server paths: ${report.summary.sourceLocaleScopedServerPaths}`,
    `- UI-locale identity dimensions: ${report.summary.uiLocaleIdentityDimensions}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved flags: ${report.summary.activationApprovedFlags}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for runtime cache integrity gate: ${report.summary.readyForRuntimeCacheIntegrityGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Preview Entries',
    '',
  ];
  for (const entry of report.contract.serverManifestPreviewEntries) {
    lines.push(`- \`${entry.runtimeSliceId}\`: ${entry.serverPath} | rollback=${entry.rollbackFromVersion}`);
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
    '- It does not create a server manifest file.',
    '- It does not upload to Firebase/server.',
    '- It does not insert French entries into the embedded runtime index.',
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
    throw new Error('Usage: npx tsx scripts/gustav_server_delivery_manifest_preview_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P15 server delivery manifest preview is currently scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', target);
  ensureDir(auditsDir);

  const payloadPacketPath = path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.json');
  const targetPackManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const outJson = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const outMd = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.md');

  for (const requiredPath of [payloadPacketPath, targetPackManifestPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required P15 input is missing: ${rel(repoRoot, requiredPath)}`);
    }
  }

  const payloadPacket = readJson<PayloadMaterializationPacket>(payloadPacketPath);
  const targetManifest = readJson<TargetPackManifestDraft>(targetPackManifestPath);
  const generatedAt = new Date().toISOString();
  const payloadPacketSha256 = sha256(payloadPacketPath);
  const targetPackManifestSha256 = sha256(targetPackManifestPath);
  const contract = buildContract(generatedAt, runDir, payloadPacket, targetManifest, payloadPacketSha256, targetPackManifestSha256);
  const validationFindings = validateContract(contract);
  const probes = makeProbes(contract);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...validationFindings];
  for (const probe of failedProbes) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  if (payloadPacket.summary.blockers !== 0 || !payloadPacket.summary.readyForServerManifestPreviewGate) {
    addFinding(findings, 'blocker', 'payload_materialization_prerequisite_not_ready', 'P14 payload materialization/checksum gate must be ready before P15.', payloadPacketPath);
  }
  if (targetManifest.serverDelivery.serverUploadAllowed || targetManifest.serverDelivery.firebaseUploadAllowed || targetManifest.serverDelivery.downloadablePacksPublished || targetManifest.serverDelivery.serverManifestPath !== null) {
    addFinding(findings, 'blocker', 'target_manifest_server_delivery_open', 'Target pack manifest server delivery must remain closed before P15.');
  }
  if (targetManifest.activation.activationApproved || targetManifest.activation.readyForApply || targetManifest.activation.mayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'target_manifest_activation_open', 'Target pack manifest activation/apply must remain closed before P15.');
  }
  addFinding(
    findings,
    'info',
    'server_manifest_preview_dry_run_only',
    'P15 creates a dry-run server manifest preview contract only; no server manifest, Firebase upload, runtime download or embedded index entry is created.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const entries = contract.serverManifestPreviewEntries;
  const gateRefTotals = entries.map((entry) => entry.gateReportRefs.length);
  const gateReportRefsTotal = contract.gateReportRefs.length;
  const serverUploadAllowed = contract.closedTransitions.serverUploadAllowed;
  const firebaseUploadAllowed = contract.closedTransitions.firebaseUploadAllowed;
  const downloadablePacksPublished = contract.closedTransitions.downloadablePacksPublished;
  const serverManifestCreated = contract.closedTransitions.serverManifestCreated;
  const embeddedIndexInsertionAllowed = contract.closedTransitions.embeddedIndexInsertionAllowed;
  const runtimeDownloadsEnabled = contract.closedTransitions.runtimeDownloadsEnabled;
  const activationApprovedFlags =
    (contract.closedTransitions.activationApproved ? 1 : 0) +
    entries.filter((entry) => entry.activationApproved).length;

  const report: Report = {
    schemaVersion: 'gustav-server-delivery-manifest-preview-v2-packet-v0',
    runId,
    generatedAt,
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      payloadShardMaterializationChecksumV2Packet: rel(repoRoot, payloadPacketPath),
      targetPackManifestV2Draft: rel(repoRoot, targetPackManifestPath),
    },
    outputs: {
      serverDeliveryManifestPreviewV2PacketJson: rel(repoRoot, outJson),
      serverDeliveryManifestPreviewV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: contract.sourceLocales.length,
      previewMode: contract.previewMode,
      payloadMaterializationReady: payloadPacket.summary.blockers === 0 && payloadPacket.summary.readyForServerManifestPreviewGate,
      serverManifestPreviewCreated: true,
      futureServerManifestExists: contract.futureServerManifestExists,
      previewEntries: entries.length,
      expectedPreviewEntries: expectedSliceIds().size,
      entriesWithGateReportRefs: entries.filter((entry) => entry.gateReportRefs.length === gateReportRefsTotal && gateReportRefsTotal >= 12).length,
      gateReportRefsPerEntryMin: gateRefTotals.length > 0 ? Math.min(...gateRefTotals) : 0,
      gateReportRefsTotal,
      gateReportRefsCurrentSha: gateRefsCurrent(contract.gateReportRefs),
      sourceManifestGateRefHashDrifts: contract.sourceManifestGateRefHashDrifts,
      entriesWithRollbackFromVersion: entries.filter((entry) => Boolean(entry.rollbackFromVersion)).length,
      entriesWithActivationApprovedFalse: entries.filter((entry) => entry.activationApproved === false).length,
      entriesWithSha256Placeholder: entries.filter((entry) => entry.sha256 === '{sha256}' && entry.serverPath.includes('{sha256}') && entry.cacheKey.includes('{sha256}')).length,
      entriesWithByteSizePlaceholder: entries.filter((entry) => entry.byteSize === '{byteSize}').length,
      entriesWithPublishedAtBlocked: entries.filter((entry) => entry.publishedAt === 'blocked_until_upload_gate').length,
      entriesWithChecksumLinkage: entries.filter((entry) =>
        /^[a-f0-9]{64}$/.test(entry.dependencies.payloadMaterializationContractSha256) &&
        /^[a-f0-9]{64}$/.test(entry.dependencies.sliceChecksumContractSha256) &&
        /^[a-f0-9]{64}$/.test(entry.dependencies.targetPackManifestSha256),
      ).length,
      sourceLocaleScopedServerPaths: entries.filter(entryServerPathScoped).length,
      uiLocaleIdentityDimensions: uiLocaleIdentityDimensions(entries),
      serverUploadAllowed,
      firebaseUploadAllowed,
      downloadablePacksPublished,
      serverManifestCreated,
      embeddedIndexInsertionAllowed,
      runtimeDownloadsEnabled,
      activationApprovedFlags,
      readyForRuntimeCacheIntegrityGate: blockers === 0,
      readyForServerUpload: false,
      readyForRuntimeDownloadActivation: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    artifactHashes: {
      payloadShardMaterializationChecksumV2Packet: payloadPacketSha256,
      targetPackManifestV2Draft: targetPackManifestSha256,
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      serverManifestFilesCreatedByThisScript: false,
      embeddedIndexModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV server delivery manifest preview V2 packet: ${report.status}`);
  console.log(`Preview entries: ${report.summary.previewEntries}/${report.summary.expectedPreviewEntries}`);
  console.log(`Gate refs current sha: ${report.summary.gateReportRefsCurrentSha}/${report.summary.gateReportRefsTotal}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for runtime cache integrity gate: ${report.summary.readyForRuntimeCacheIntegrityGate ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
