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
  jsonPath?: string;
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

type RuntimeSliceDraft = {
  studyTarget: 'fr';
  sourceLocale: 'ru' | 'uk';
  surface:
    | 'lesson'
    | 'lesson_intro'
    | 'quiz'
    | 'audio_metadata'
    | 'flashcard'
    | 'personal_practice';
  runtimeManifestStatus: 'not_created' | 'local_materialized';
  cacheKeyStatus: 'not_created' | 'local_cache_key_materialized';
  loaderStatus: 'blocked_runtime_contract_missing' | 'blocked_until_upload_activation_gate';
  activationApproved: false;
  payloadShard?: string;
  payloadSha256?: string;
  payloadBytes?: number;
  entryIndex?: string;
  sliceManifest?: string;
};

type BlockerMapEntry = {
  blockerId: string;
  area:
    | 'runtime_loader'
    | 'server_delivery'
    | 'storage_cloud'
    | 'admin'
    | 'reviewer_import'
    | 'pack_payload'
    | 'activation';
  status: 'blocked';
  evidence: string;
  nextUnblockArtifact: string;
};

type TargetPackManifestV2Draft = {
  schemaVersion: 'gustav-target-pack-manifest-v2-draft';
  runId: string;
  generatedAt: string;
  packId: string;
  packType: 'downloadable_target_pack_candidate';
  studyTarget: 'fr';
  targetLocale: 'fr';
  sourceLocales: ('ru' | 'uk')[];
  runtimeCoursePackSchemaVersion: 'course-pack-v1';
  contentVersion: string;
  minAppVersion: 'blocked_until_runtime_delivery_contract_v2';
  sourceGraphHash: string;
  researchPackHash: string;
  pedagogyBlueprintHash: string;
  generationSchemaV2Hash: string;
  domainRegistryV2Hash: string;
  aiPromptContractV2Hash: string;
  contentQualityGatesV2Hash: string;
  reviewerWorkflowV2Hash: string;
  reviewerDecisionTemplateV2Hash: string;
  reviewerAiDecisionTemplateV2Hash: string;
  itemCounts: {
    sourceLocales: 2;
    lessonLedgers: number;
    lessonRows: number;
    rowDecisionSlotsV2: number;
    aiPromptContracts: number;
    aiDecisionSlotsV2: number;
    highRiskAiDecisionSlotsV2: number;
    qualityGateCatalog: number;
    gateReports: number;
  };
  gateReports: GateReportRef[];
  runtimeDelivery: {
    productionStudyTargetHasFrench: false;
    embeddedIndexHasFrenchEntries: false;
    runtimeDownloadsEnabled: false;
    coursePackRemoteLoadingEnabled: false;
    targetLevelManifestSupportedByAppRuntime: false;
    requiredRuntimeSlices: RuntimeSliceDraft[];
  };
  serverDelivery: {
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    downloadablePacksPublished: false;
    serverManifestPath: null;
  };
  storageCloud: {
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    targetScopedStorageGateAccepted: false;
    cloudSyncGateAccepted: false;
  };
  adminReview: {
    readyForLlmOfficialSourceReviewV2: true;
    readyForDecisionImportV2: false;
    reviewerDecisionsImported: false;
    adminApprovalImported: false;
  };
  activation: {
    activationApproved: false;
    productionReady: false;
    readyForRuntimeDelivery: false;
    readyForServerUpload: false;
    readyForStorageCloudMigration: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  blockerMap: BlockerMapEntry[];
  nextRequiredGates: string[];
};

type Metrics = {
  gateReports: number;
  gateReportsWithHashes: number;
  lessonLedgers: number;
  lessonRows: number;
  rowDecisionSlotsV2: number;
  aiPromptContracts: number;
  aiDecisionSlotsV2: number;
  highRiskAiDecisionSlotsV2: number;
  runtimeSliceDrafts: number;
  runtimeSliceDraftsBlocked: number;
  productionBlockers: number;
  activationApprovedFlags: number;
  serverUploadOpenFlags: number;
  firebaseUploadOpenFlags: number;
  runtimeDownloadsOpenFlags: number;
  storageCloudMigrationOpenFlags: number;
  readyForApplyOpenFlags: number;
};

type Report = {
  schemaVersion: 'gustav-target-pack-manifest-v2-packet-v0';
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
  summary: Metrics & {
    targetLocale: 'fr';
    sourceLocales: number;
    manifestDraftCreated: boolean;
    manifestIdentityValid: boolean;
    manifestHashesValid: boolean;
    manifestItemCountsValid: boolean;
    runtimeDeliveryBlocked: boolean;
    serverDeliveryBlocked: boolean;
    storageCloudBlocked: boolean;
    activationBlocked: boolean;
    readyForRuntimeServerDeliveryContractV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const EXPECTED_ROWS = 1600;
const EXPECTED_LESSON_LEDGERS = 32;
const SOURCE_LOCALES: ('ru' | 'uk')[] = ['ru', 'uk'];
const RUNTIME_SURFACES: RuntimeSliceDraft['surface'][] = [
  'lesson',
  'lesson_intro',
  'quiz',
  'audio_metadata',
  'flashcard',
  'personal_practice',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
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

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function addFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  message: string,
  filePath?: string,
  jsonPath?: string,
): void {
  findings.push({ severity, code, message, path: filePath, jsonPath });
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function readAppRuntimeState(repoRoot: string): {
  productionStudyTargetHasFrench: boolean;
  embeddedIndexHasFrenchEntries: boolean;
  coursePackRemoteLoadingEnabled: boolean;
} {
  const studyTargetSource = fs.readFileSync(path.join(repoRoot, 'app', 'study_target.ts'), 'utf8');
  const indexSource = fs.readFileSync(path.join(repoRoot, 'app', 'course_pack_index.ts'), 'utf8');
  const loaderSource = fs.readFileSync(path.join(repoRoot, 'app', 'course_pack_loader.ts'), 'utf8');
  return {
    productionStudyTargetHasFrench: /ProductionStudyTarget\s*=\s*[^;\n]*'fr'/.test(studyTargetSource),
    embeddedIndexHasFrenchEntries: /studyTarget:\s*['"]fr['"]/.test(indexSource),
    coursePackRemoteLoadingEnabled: /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*true/.test(loaderSource),
  };
}

function countLessonRows(lessonLedgerPaths: string[]): number {
  let count = 0;
  for (const filePath of lessonLedgerPaths) {
    const body = object(readJson<unknown>(filePath));
    const rows = body.rows;
    if (Array.isArray(rows)) count += rows.length;
  }
  return count;
}

function gateReport(
  repoRoot: string,
  gateId: string,
  filePath: string,
  summaryReadyField?: string,
): GateReportRef {
  const body = object(readJson<unknown>(filePath));
  return {
    gateId,
    path: rel(repoRoot, filePath),
    sha256: sha256(filePath),
    status: s(body, 'status') || s(body, 'decision') || 'UNKNOWN',
    summaryReadyField,
  };
}

function runtimeSliceDrafts(repoRoot: string, runDir: string): RuntimeSliceDraft[] {
  return SOURCE_LOCALES.flatMap((sourceLocale) =>
    RUNTIME_SURFACES.map((surface) => {
      const sliceDir = path.join(runDir, 'pack_candidates', 'fr', 'runtime_slices', sourceLocale, surface);
      const indexPath = path.join(sliceDir, 'index.json');
      const manifestPath = path.join(sliceDir, 'manifest.json');
      const payloadPath = path.join(sliceDir, `payload-${path.basename(runDir)}.json`);
      const materialized = fs.existsSync(indexPath) && fs.existsSync(manifestPath) && fs.existsSync(payloadPath);
      if (!materialized) {
        return {
          studyTarget: 'fr',
          sourceLocale,
          surface,
          runtimeManifestStatus: 'not_created',
          cacheKeyStatus: 'not_created',
          loaderStatus: 'blocked_runtime_contract_missing',
          activationApproved: false,
        };
      }
      return {
        studyTarget: 'fr',
        sourceLocale,
        surface,
        runtimeManifestStatus: 'local_materialized',
        cacheKeyStatus: 'local_cache_key_materialized',
        loaderStatus: 'blocked_until_upload_activation_gate',
        activationApproved: false,
        payloadShard: rel(repoRoot, payloadPath),
        payloadSha256: sha256(payloadPath),
        payloadBytes: fs.statSync(payloadPath).size,
        entryIndex: rel(repoRoot, indexPath),
        sliceManifest: rel(repoRoot, manifestPath),
      };
    }),
  );
}

function blockerMap(runtimeSlices: RuntimeSliceDraft[]): BlockerMapEntry[] {
  const materializedRuntimeSlices = runtimeSlices.filter((slice) => slice.runtimeManifestStatus === 'local_materialized').length;
  return [
    {
      blockerId: 'P9-RUNTIME-001-fr-not-production-study-target',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'app/study_target.ts keeps ProductionStudyTarget limited to en.',
      nextUnblockArtifact: 'audits/runtime_server_delivery_contract_v2_packet.json',
    },
    {
      blockerId: 'P9-RUNTIME-002-remote-loader-disabled',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'app/course_pack_loader.ts exports COURSE_PACK_REMOTE_LOADING_ENABLED=false.',
      nextUnblockArtifact: 'audits/runtime_server_delivery_contract_v2_packet.json',
    },
    {
      blockerId: 'P9-RUNTIME-003-no-french-embedded-index-entry',
      area: 'runtime_loader',
      status: 'blocked',
      evidence: 'app/course_pack_index.ts embedded index has bundled compatibility entries for studyTarget=en only.',
      nextUnblockArtifact: 'audits/runtime_server_delivery_contract_v2_packet.json',
    },
    {
      blockerId: 'P9-SERVER-001-no-server-pack-manifest',
      area: 'server_delivery',
      status: 'blocked',
      evidence: 'No Firebase/server delivery manifest is approved or uploaded for studyTarget=fr.',
      nextUnblockArtifact: 'audits/server_delivery_manifest_v2_packet.json',
    },
    {
      blockerId: 'P9-STORAGE-001-storage-cloud-map-not-accepted',
      area: 'storage_cloud',
      status: 'blocked',
      evidence: 'GUSTAV_TARGET_STORAGE_PLAN and GUSTAV_CLOUD_SYNC_IMPACT_PLAN are design contracts; no approved migration exists.',
      nextUnblockArtifact: 'audits/storage_cloud_target_map_v2_packet.json',
    },
    {
      blockerId: 'P9-ADMIN-001-admin-delivery-surfaces-not-approved',
      area: 'admin',
      status: 'blocked',
      evidence: 'Admin/reviewer upload/preview/import surfaces are not yet mapped to target pack manifest V2.',
      nextUnblockArtifact: 'audits/admin_pack_delivery_surface_v2_packet.json',
    },
    {
      blockerId: 'P9-REVIEWER-001-v2-decisions-not-imported',
      area: 'reviewer_import',
      status: 'blocked',
      evidence: 'Reviewer Workflow V2 has blank decision slots and readyForDecisionImportV2=false.',
      nextUnblockArtifact: 'audits/reviewer_decision_import_v2_dry_run.json',
    },
    {
      blockerId: 'P9-PAYLOAD-001-runtime-payload-shards-not-materialized',
      area: 'pack_payload',
      status: 'blocked',
      evidence: materializedRuntimeSlices === SOURCE_LOCALES.length * RUNTIME_SURFACES.length
        ? 'Runtime payload shards are materialized locally for all required slices, but remain blocked from upload/download/activation.'
        : `Runtime payload shards are incomplete: ${materializedRuntimeSlices}/${SOURCE_LOCALES.length * RUNTIME_SURFACES.length} local slices materialized.`,
      nextUnblockArtifact: materializedRuntimeSlices === SOURCE_LOCALES.length * RUNTIME_SURFACES.length
        ? 'audits/server_pack_upload_policy_v2_packet.json'
        : 'pack_candidates/fr/runtime_slices/*',
    },
    {
      blockerId: 'P9-ACTIVATION-001-activation-not-approved',
      area: 'activation',
      status: 'blocked',
      evidence: 'GUSTAV_APPLY_GATE requires explicit apply approval, rollback plan, dirty-worktree overlap audit and tests before activation.',
      nextUnblockArtifact: 'apply_plan/APPLY_PLAN.md',
    },
  ];
}

function buildManifest(
  repoRoot: string,
  runDir: string,
  runId: string,
  paths: Record<string, string>,
): TargetPackManifestV2Draft {
  const appRuntime = readAppRuntimeState(repoRoot);
  const aiPromptSummary = summaryOf(paths.aiPromptContractV2Packet);
  const contentQualitySummary = summaryOf(paths.contentQualityGatesV2Packet);
  const reviewerWorkflowSummary = summaryOf(paths.reviewerWorkflowV2Packet);
  const lessonLedgers = walkFiles(path.join(runDir, 'generated', 'fr', 'lessons'))
    .filter((filePath) => /^lesson\d+_row_ledger\.json$/.test(path.basename(filePath)));
  const gateReports = [
    gateReport(repoRoot, 'generation_history_reconciliation', paths.generationHistory, 'generationHistoryReconciled'),
    gateReport(repoRoot, 'app_atlas_refresh', paths.appAtlasRefresh, 'readyForDomainRegistryV2'),
    gateReport(repoRoot, 'domain_registry_v2', paths.domainRegistryV2, 'readyForResearchPackBuilder'),
    gateReport(repoRoot, 'research_pack_verify', paths.targetResearchPackVerify, 'readyForPedagogyBlueprint'),
    gateReport(repoRoot, 'pedagogy_blueprint', paths.targetPedagogyBlueprint, 'readyForGenerationSchemaV2'),
    gateReport(repoRoot, 'generation_schema_v2', paths.generationSchemaV2Packet, 'readyForAiPromptContractV2'),
    gateReport(repoRoot, 'ai_prompt_contract_v2', paths.aiPromptContractV2Packet, 'readyForContentQualityGatesV2'),
    gateReport(repoRoot, 'content_quality_gates_v2', paths.contentQualityGatesV2Packet, 'readyForReviewerWorkflowV2'),
    gateReport(repoRoot, 'reviewer_workflow_v2', paths.reviewerWorkflowV2Packet, 'readyForLlmOfficialSourceReviewV2'),
    gateReport(repoRoot, 'language_isolation', paths.languageIsolation, 'readyForReviewer'),
    gateReport(repoRoot, 'research_json_firewall', paths.researchFirewall, 'noFrenchContentGenerated'),
    gateReport(repoRoot, 'run_validator', paths.runValidator),
  ];
  const requiredRuntimeSlices = runtimeSliceDrafts(repoRoot, runDir);

  return {
    schemaVersion: 'gustav-target-pack-manifest-v2-draft',
    runId,
    generatedAt: new Date().toISOString(),
    packId: `target.fr.ru-uk.v2.${runId}`,
    packType: 'downloadable_target_pack_candidate',
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    runtimeCoursePackSchemaVersion: 'course-pack-v1',
    contentVersion: `2026.06.26.${runId}.draft`,
    minAppVersion: 'blocked_until_runtime_delivery_contract_v2',
    sourceGraphHash: sha256(paths.sourceGraph),
    researchPackHash: sha256(paths.researchPack),
    pedagogyBlueprintHash: sha256(paths.pedagogyBlueprint),
    generationSchemaV2Hash: sha256(paths.generationSchemaV2),
    domainRegistryV2Hash: sha256(paths.domainRegistryV2),
    aiPromptContractV2Hash: sha256(paths.aiPromptContractV2),
    contentQualityGatesV2Hash: sha256(paths.contentQualityGatesV2),
    reviewerWorkflowV2Hash: sha256(paths.reviewerWorkflowV2Packet),
    reviewerDecisionTemplateV2Hash: sha256(paths.reviewerDecisionTemplateV2),
    reviewerAiDecisionTemplateV2Hash: sha256(paths.reviewerAiDecisionTemplateV2),
    itemCounts: {
      sourceLocales: 2,
      lessonLedgers: lessonLedgers.length,
      lessonRows: countLessonRows(lessonLedgers),
      rowDecisionSlotsV2: n(reviewerWorkflowSummary, 'rowTemplateRows'),
      aiPromptContracts: n(aiPromptSummary, 'aiPromptEntrypointContracts'),
      aiDecisionSlotsV2: n(reviewerWorkflowSummary, 'aiTemplateRows'),
      highRiskAiDecisionSlotsV2: n(reviewerWorkflowSummary, 'highRiskAiTemplateRows'),
      qualityGateCatalog: n(contentQualitySummary, 'qualityGatesCatalog'),
      gateReports: gateReports.length,
    },
    gateReports,
    runtimeDelivery: {
      productionStudyTargetHasFrench: false,
      embeddedIndexHasFrenchEntries: false,
      runtimeDownloadsEnabled: false,
      coursePackRemoteLoadingEnabled: false,
      targetLevelManifestSupportedByAppRuntime: false,
      requiredRuntimeSlices,
    },
    serverDelivery: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      serverManifestPath: null,
    },
    storageCloud: {
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      targetScopedStorageGateAccepted: false,
      cloudSyncGateAccepted: false,
    },
    adminReview: {
      readyForLlmOfficialSourceReviewV2: true,
      readyForDecisionImportV2: false,
      reviewerDecisionsImported: false,
      adminApprovalImported: false,
    },
    activation: {
      activationApproved: false,
      productionReady: false,
      readyForRuntimeDelivery: false,
      readyForServerUpload: false,
      readyForStorageCloudMigration: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    blockerMap: blockerMap(requiredRuntimeSlices).map((entry) => {
      if (entry.blockerId === 'P9-RUNTIME-001-fr-not-production-study-target' && appRuntime.productionStudyTargetHasFrench) {
        return { ...entry, evidence: 'Runtime source currently mentions fr in ProductionStudyTarget; explicit production approval is still required before activation.' };
      }
      if (entry.blockerId === 'P9-RUNTIME-002-remote-loader-disabled' && appRuntime.coursePackRemoteLoadingEnabled) {
        return { ...entry, evidence: 'Runtime remote loader appears enabled; Gustav still requires explicit pack delivery and activation gates before use.' };
      }
      if (entry.blockerId === 'P9-RUNTIME-003-no-french-embedded-index-entry' && appRuntime.embeddedIndexHasFrenchEntries) {
        return { ...entry, evidence: 'Embedded index appears to mention fr; Gustav still requires delivery approval and runtime gates before activation.' };
      }
      return entry;
    }),
    nextRequiredGates: [
      'P10 runtime/server delivery contract V2',
      'P11 storage/cloud target namespace map V2',
      'P12 admin/reviewer delivery surface map V2',
      'P13 reviewer decision import V2 dry-run',
      'P14 payload shard materialization and checksum audit',
      'P15 production activation gate V2 with rollback and explicit approval',
    ],
  };
}

function emptyMetrics(): Metrics {
  return {
    gateReports: 0,
    gateReportsWithHashes: 0,
    lessonLedgers: 0,
    lessonRows: 0,
    rowDecisionSlotsV2: 0,
    aiPromptContracts: 0,
    aiDecisionSlotsV2: 0,
    highRiskAiDecisionSlotsV2: 0,
    runtimeSliceDrafts: 0,
    runtimeSliceDraftsBlocked: 0,
    productionBlockers: 0,
    activationApprovedFlags: 0,
    serverUploadOpenFlags: 0,
    firebaseUploadOpenFlags: 0,
    runtimeDownloadsOpenFlags: 0,
    storageCloudMigrationOpenFlags: 0,
    readyForApplyOpenFlags: 0,
  };
}

function jsonPathJoin(base: string, key: string | number): string {
  return typeof key === 'number' ? `${base}[${key}]` : `${base}.${key}`;
}

function inspectSafetyFlags(value: unknown, filePath: string, jsonPath: string, findings: Finding[], metrics: Metrics): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectSafetyFlags(entry, filePath, jsonPathJoin(jsonPath, index), findings, metrics));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value as JsonObject)) {
    const currentPath = jsonPathJoin(jsonPath, key);
    if (key === 'activationApproved' && entry !== false) {
      metrics.activationApprovedFlags += 1;
      addFinding(findings, 'blocker', 'activation_approved_open', 'Target pack manifest draft must keep activationApproved=false.', filePath, currentPath);
    }
    if (key === 'serverUploadAllowed' && entry !== false) {
      metrics.serverUploadOpenFlags += 1;
      addFinding(findings, 'blocker', 'server_upload_open', 'Target pack manifest draft must keep serverUploadAllowed=false.', filePath, currentPath);
    }
    if (key === 'firebaseUploadAllowed' && entry !== false) {
      metrics.firebaseUploadOpenFlags += 1;
      addFinding(findings, 'blocker', 'firebase_upload_open', 'Target pack manifest draft must keep firebaseUploadAllowed=false.', filePath, currentPath);
    }
    if (key === 'runtimeDownloadsEnabled' && entry !== false) {
      metrics.runtimeDownloadsOpenFlags += 1;
      addFinding(findings, 'blocker', 'runtime_downloads_open', 'Target pack manifest draft must keep runtimeDownloadsEnabled=false.', filePath, currentPath);
    }
    if ((key === 'storageMigrationAllowed' || key === 'cloudSyncMigrationAllowed') && entry !== false) {
      metrics.storageCloudMigrationOpenFlags += 1;
      addFinding(findings, 'blocker', 'storage_cloud_migration_open', 'Target pack manifest draft must keep storage/cloud migration closed.', filePath, currentPath);
    }
    if (key === 'readyForApply' && entry !== false) {
      metrics.readyForApplyOpenFlags += 1;
      addFinding(findings, 'blocker', 'ready_for_apply_open', 'Target pack manifest draft must keep readyForApply=false.', filePath, currentPath);
    }
    inspectSafetyFlags(entry, filePath, currentPath, findings, metrics);
  }
}

function validateManifest(manifest: TargetPackManifestV2Draft, filePath: string): { findings: Finding[]; metrics: Metrics } {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();
  metrics.gateReports = manifest.gateReports.length;
  metrics.gateReportsWithHashes = manifest.gateReports.filter((entry) => isSha256(entry.sha256)).length;
  metrics.lessonLedgers = manifest.itemCounts.lessonLedgers;
  metrics.lessonRows = manifest.itemCounts.lessonRows;
  metrics.rowDecisionSlotsV2 = manifest.itemCounts.rowDecisionSlotsV2;
  metrics.aiPromptContracts = manifest.itemCounts.aiPromptContracts;
  metrics.aiDecisionSlotsV2 = manifest.itemCounts.aiDecisionSlotsV2;
  metrics.highRiskAiDecisionSlotsV2 = manifest.itemCounts.highRiskAiDecisionSlotsV2;
  metrics.runtimeSliceDrafts = manifest.runtimeDelivery.requiredRuntimeSlices.length;
  metrics.runtimeSliceDraftsBlocked = manifest.runtimeDelivery.requiredRuntimeSlices.filter((entry) =>
    (entry.runtimeManifestStatus === 'not_created' || entry.runtimeManifestStatus === 'local_materialized') &&
    (entry.cacheKeyStatus === 'not_created' || entry.cacheKeyStatus === 'local_cache_key_materialized') &&
    (entry.loaderStatus === 'blocked_runtime_contract_missing' || entry.loaderStatus === 'blocked_until_upload_activation_gate') &&
    entry.activationApproved === false
  ).length;
  metrics.productionBlockers = manifest.blockerMap.length;

  if (manifest.schemaVersion !== 'gustav-target-pack-manifest-v2-draft') addFinding(findings, 'blocker', 'schema_version_invalid', 'Target Pack Manifest V2 draft schemaVersion is invalid.', filePath, '$.schemaVersion');
  if (manifest.studyTarget !== 'fr' || manifest.targetLocale !== 'fr') addFinding(findings, 'blocker', 'study_target_invalid', 'Target Pack Manifest V2 draft must use studyTarget=fr.', filePath);
  if (JSON.stringify(manifest.sourceLocales) !== JSON.stringify(['ru', 'uk'])) addFinding(findings, 'blocker', 'source_locales_invalid', 'Target Pack Manifest V2 draft sourceLocales must be ru,uk.', filePath, '$.sourceLocales');
  for (const [key, value] of Object.entries({
    sourceGraphHash: manifest.sourceGraphHash,
    researchPackHash: manifest.researchPackHash,
    pedagogyBlueprintHash: manifest.pedagogyBlueprintHash,
    generationSchemaV2Hash: manifest.generationSchemaV2Hash,
    domainRegistryV2Hash: manifest.domainRegistryV2Hash,
    aiPromptContractV2Hash: manifest.aiPromptContractV2Hash,
    contentQualityGatesV2Hash: manifest.contentQualityGatesV2Hash,
    reviewerWorkflowV2Hash: manifest.reviewerWorkflowV2Hash,
    reviewerDecisionTemplateV2Hash: manifest.reviewerDecisionTemplateV2Hash,
    reviewerAiDecisionTemplateV2Hash: manifest.reviewerAiDecisionTemplateV2Hash,
  })) {
    if (!isSha256(value)) addFinding(findings, 'blocker', 'artifact_hash_invalid', `${key} must be a sha256 digest.`, filePath, `$.${key}`);
  }
  if (manifest.itemCounts.lessonLedgers !== EXPECTED_LESSON_LEDGERS) addFinding(findings, 'blocker', 'lesson_ledger_count_invalid', `Expected ${EXPECTED_LESSON_LEDGERS} lesson ledgers.`, filePath, '$.itemCounts.lessonLedgers');
  if (manifest.itemCounts.lessonRows !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'lesson_row_count_invalid', `Expected ${EXPECTED_ROWS} lesson rows.`, filePath, '$.itemCounts.lessonRows');
  if (manifest.itemCounts.rowDecisionSlotsV2 !== EXPECTED_ROWS) addFinding(findings, 'blocker', 'row_decision_slots_invalid', `Expected ${EXPECTED_ROWS} row decision slots.`, filePath, '$.itemCounts.rowDecisionSlotsV2');
  if (manifest.itemCounts.aiPromptContracts <= 0 || manifest.itemCounts.aiDecisionSlotsV2 !== manifest.itemCounts.aiPromptContracts) {
    addFinding(findings, 'blocker', 'ai_prompt_decision_slots_invalid', 'AI prompt contracts and AI decision slots must be present and equal.', filePath, '$.itemCounts');
  }
  if (metrics.gateReports < 12 || metrics.gateReports !== manifest.itemCounts.gateReports || metrics.gateReportsWithHashes !== metrics.gateReports) {
    addFinding(findings, 'blocker', 'gate_report_refs_invalid', 'Gate report refs must be present and hashed.', filePath, '$.gateReports');
  }
  if (metrics.runtimeSliceDrafts !== SOURCE_LOCALES.length * RUNTIME_SURFACES.length || metrics.runtimeSliceDraftsBlocked !== metrics.runtimeSliceDrafts) {
    addFinding(findings, 'blocker', 'runtime_slice_drafts_invalid', 'Every required runtime slice must be declared and remain blocked from activation/runtime use.', filePath, '$.runtimeDelivery.requiredRuntimeSlices');
  }
  if (manifest.blockerMap.length < 8 || !manifest.blockerMap.every((entry) => entry.status === 'blocked')) {
    addFinding(findings, 'blocker', 'production_blocker_map_invalid', 'Target Pack Manifest V2 must carry explicit production blockers.', filePath, '$.blockerMap');
  }
  if (
    manifest.runtimeDelivery.runtimeDownloadsEnabled !== false ||
    manifest.runtimeDelivery.coursePackRemoteLoadingEnabled !== false ||
    manifest.serverDelivery.serverUploadAllowed !== false ||
    manifest.serverDelivery.firebaseUploadAllowed !== false ||
    manifest.storageCloud.storageMigrationAllowed !== false ||
    manifest.storageCloud.cloudSyncMigrationAllowed !== false ||
    manifest.activation.activationApproved !== false ||
    manifest.activation.readyForApply !== false ||
    manifest.activation.mayModifyProductionAppFiles !== false
  ) {
    addFinding(findings, 'blocker', 'production_delivery_or_apply_open', 'Target Pack Manifest V2 draft must not open runtime, server, storage, cloud, activation, apply, or app writes.', filePath);
  }
  inspectSafetyFlags(manifest, filePath, '$', findings, metrics);
  return { findings, metrics };
}

function cloneManifest(manifest: TargetPackManifestV2Draft): TargetPackManifestV2Draft {
  return JSON.parse(JSON.stringify(manifest)) as TargetPackManifestV2Draft;
}

function runProbes(manifest: TargetPackManifestV2Draft, filePath: string): Probe[] {
  const probes: { id: string; expectedAccept: boolean; manifest: TargetPackManifestV2Draft }[] = [];
  probes.push({ id: 'canonical_target_pack_manifest_accepts', expectedAccept: true, manifest: cloneManifest(manifest) });

  const activationOpen = cloneManifest(manifest);
  activationOpen.activation.activationApproved = true as false;
  probes.push({ id: 'activation_approved_rejected', expectedAccept: false, manifest: activationOpen });

  const serverOpen = cloneManifest(manifest);
  serverOpen.serverDelivery.serverUploadAllowed = true as false;
  probes.push({ id: 'server_upload_allowed_rejected', expectedAccept: false, manifest: serverOpen });

  const runtimeOpen = cloneManifest(manifest);
  runtimeOpen.runtimeDelivery.runtimeDownloadsEnabled = true as false;
  probes.push({ id: 'runtime_downloads_enabled_rejected', expectedAccept: false, manifest: runtimeOpen });

  const storageOpen = cloneManifest(manifest);
  storageOpen.storageCloud.cloudSyncMigrationAllowed = true as false;
  probes.push({ id: 'cloud_sync_migration_allowed_rejected', expectedAccept: false, manifest: storageOpen });

  const badRows = cloneManifest(manifest);
  badRows.itemCounts.lessonRows -= 1;
  probes.push({ id: 'item_count_mismatch_rejected', expectedAccept: false, manifest: badRows });

  const missingGate = cloneManifest(manifest);
  missingGate.gateReports = missingGate.gateReports.slice(0, -1);
  probes.push({ id: 'missing_gate_report_rejected', expectedAccept: false, manifest: missingGate });

  return probes.map((probe) => {
    const result = validateManifest(probe.manifest, filePath);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: probe.id,
      expectedAccept: probe.expectedAccept,
      accepted,
      blockers,
      passed: accepted === probe.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Target Pack Manifest V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Manifest draft created: ${report.summary.manifestDraftCreated ? 'yes' : 'no'}`,
    `- Manifest identity valid: ${report.summary.manifestIdentityValid ? 'yes' : 'no'}`,
    `- Manifest hashes valid: ${report.summary.manifestHashesValid ? 'yes' : 'no'}`,
    `- Manifest item counts valid: ${report.summary.manifestItemCountsValid ? 'yes' : 'no'}`,
    `- Gate reports: ${report.summary.gateReports}`,
    `- Lesson ledgers: ${report.summary.lessonLedgers}`,
    `- Lesson rows: ${report.summary.lessonRows}`,
    `- Row decision slots V2: ${report.summary.rowDecisionSlotsV2}`,
    `- AI prompt contracts: ${report.summary.aiPromptContracts}`,
    `- AI decision slots V2: ${report.summary.aiDecisionSlotsV2}`,
    `- High-risk AI decision slots V2: ${report.summary.highRiskAiDecisionSlotsV2}`,
    `- Runtime slice drafts: ${report.summary.runtimeSliceDrafts}`,
    `- Runtime slice drafts blocked: ${report.summary.runtimeSliceDraftsBlocked}`,
    `- Production blockers mapped: ${report.summary.productionBlockers}`,
    `- Runtime delivery blocked: ${report.summary.runtimeDeliveryBlocked ? 'yes' : 'no'}`,
    `- Server delivery blocked: ${report.summary.serverDeliveryBlocked ? 'yes' : 'no'}`,
    `- Storage/cloud blocked: ${report.summary.storageCloudBlocked ? 'yes' : 'no'}`,
    `- Activation blocked: ${report.summary.activationBlocked ? 'yes' : 'no'}`,
    `- Ready for Runtime/Server Delivery Contract V2: ${report.summary.readyForRuntimeServerDeliveryContractV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Output Artifacts',
    '',
  ];
  for (const [key, value] of Object.entries(report.outputs)) lines.push(`- ${key}: \`${value}\``);
  lines.push('', '## Probes', '');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (expected accept=${probe.expectedAccept ? 'yes' : 'no'}, actual accept=${probe.accepted ? 'yes' : 'no'}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path}${finding.jsonPath ? ` ${finding.jsonPath}` : ''})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet creates a target pack manifest draft only.',
    '- It does not create runtime payload shards.',
    '- It does not upload Firebase/server packs.',
    '- It does not enable runtime downloads.',
    '- It does not modify production app files.',
    '- It does not approve activation.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const targetArg = argValue('--target') ?? 'fr';
  if (!runArg || targetArg !== 'fr') {
    throw new Error('Usage: npx tsx scripts/gustav_target_pack_manifest_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const paths = {
    sourceGraph: path.join(runDir, 'source_graph', 'source_graph.json'),
    researchPack: path.join(researchDir, 'fr_research_pack.json'),
    pedagogyBlueprint: path.join(researchDir, 'fr_pedagogy_blueprint.json'),
    generationSchemaV2: path.join(researchDir, 'fr_generation_schema_v2.json'),
    generationSchemaV2Packet: path.join(auditsDir, 'generation_schema_v2_packet.json'),
    domainRegistryV2: path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json'),
    aiPromptContractV2: path.join(researchDir, 'fr_ai_prompt_contract_v2.json'),
    aiPromptContractV2Packet: path.join(auditsDir, 'ai_prompt_contract_v2_packet.json'),
    contentQualityGatesV2: path.join(researchDir, 'fr_content_quality_gates_v2.json'),
    contentQualityGatesV2Packet: path.join(auditsDir, 'content_quality_gates_v2_packet.json'),
    reviewerWorkflowV2Packet: path.join(auditsDir, 'reviewer_workflow_v2_packet.json'),
    reviewerDecisionTemplateV2: path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl'),
    reviewerAiDecisionTemplateV2: path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl'),
    generationHistory: path.join(auditsDir, 'generation_history_reconciliation_audit.json'),
    appAtlasRefresh: path.join(auditsDir, 'app_atlas_refresh_audit.json'),
    targetResearchPackVerify: path.join(auditsDir, 'target_research_pack_verify_audit.json'),
    targetPedagogyBlueprint: path.join(auditsDir, 'target_pedagogy_blueprint_packet.json'),
    languageIsolation: path.join(auditsDir, 'french_language_isolation_audit.json'),
    researchFirewall: path.join(auditsDir, 'french_research_json_firewall_audit.json'),
    runValidator: path.join(auditsDir, 'run_validator_report.json'),
  };
  const outManifest = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const outJson = path.join(auditsDir, 'target_pack_manifest_v2_packet.json');
  const outMd = path.join(auditsDir, 'target_pack_manifest_v2_packet.md');
  ensureDir(auditsDir);
  ensureDir(packDir);

  const findings: Finding[] = [];
  for (const filePath of Object.values(paths)) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'required_input_missing', 'Target Pack Manifest V2 input is missing.', rel(repoRoot, filePath));
  }

  let manifest: TargetPackManifestV2Draft | null = null;
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let probes: Probe[] = [];
  if (findings.filter((finding) => finding.severity === 'blocker').length === 0) {
    manifest = buildManifest(repoRoot, runDir, runId, paths);
    validation = validateManifest(manifest, rel(repoRoot, outManifest));
    probes = runProbes(manifest, rel(repoRoot, outManifest));
    findings.push(...validation.findings);
    for (const probe of probes) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Target Pack Manifest V2 fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const probesPassed = probes.filter((probe) => probe.passed).length;
  const manifestDraft = manifest;
  const manifestIdentityValid =
    manifestDraft !== null &&
    manifestDraft.studyTarget === 'fr' &&
    JSON.stringify(manifestDraft.sourceLocales) === JSON.stringify(['ru', 'uk']);
  const manifestHashesValid = manifestDraft !== null && [
    manifestDraft.sourceGraphHash,
    manifestDraft.researchPackHash,
    manifestDraft.pedagogyBlueprintHash,
    manifestDraft.generationSchemaV2Hash,
    manifestDraft.domainRegistryV2Hash,
    manifestDraft.aiPromptContractV2Hash,
    manifestDraft.contentQualityGatesV2Hash,
    manifestDraft.reviewerWorkflowV2Hash,
    manifestDraft.reviewerDecisionTemplateV2Hash,
    manifestDraft.reviewerAiDecisionTemplateV2Hash,
  ].every(isSha256);
  const manifestItemCountsValid =
    metrics.lessonLedgers === EXPECTED_LESSON_LEDGERS &&
    metrics.lessonRows === EXPECTED_ROWS &&
    metrics.rowDecisionSlotsV2 === EXPECTED_ROWS &&
    metrics.aiPromptContracts > 0 &&
    metrics.aiDecisionSlotsV2 === metrics.aiPromptContracts;
  const readyForRuntimeServerDeliveryContractV2 =
    manifestDraft !== null &&
    blockers === 0 &&
    probesPassed === probes.length &&
    manifestIdentityValid &&
    manifestHashesValid &&
    manifestItemCountsValid &&
    metrics.productionBlockers >= 8 &&
    metrics.runtimeSliceDraftsBlocked === metrics.runtimeSliceDrafts;

  if (manifestDraft && blockers === 0) {
    fs.writeFileSync(outManifest, `${JSON.stringify(manifestDraft, null, 2)}\n`, 'utf8');
  }

  const artifactHashes: Record<string, string> = {};
  if (manifestDraft) {
    for (const [key, filePath] of Object.entries(paths)) artifactHashes[key] = sha256(filePath);
  }
  if (fs.existsSync(outManifest)) artifactHashes.targetPackManifestV2Draft = sha256(outManifest);

  const report: Report = {
    schemaVersion: 'gustav-target-pack-manifest-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: Object.fromEntries(Object.entries(paths).map(([key, filePath]) => [key, rel(repoRoot, filePath)])),
    outputs: {
      targetPackManifestV2Draft: rel(repoRoot, outManifest),
      targetPackManifestV2PacketJson: rel(repoRoot, outJson),
      targetPackManifestV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      manifestDraftCreated: manifestDraft !== null && blockers === 0,
      manifestIdentityValid,
      manifestHashesValid,
      manifestItemCountsValid,
      runtimeDeliveryBlocked: manifestDraft !== null && manifestDraft.runtimeDelivery.runtimeDownloadsEnabled === false,
      serverDeliveryBlocked:
        manifestDraft !== null &&
        manifestDraft.serverDelivery.serverUploadAllowed === false &&
        manifestDraft.serverDelivery.firebaseUploadAllowed === false,
      storageCloudBlocked:
        manifestDraft !== null &&
        manifestDraft.storageCloud.storageMigrationAllowed === false &&
        manifestDraft.storageCloud.cloudSyncMigrationAllowed === false,
      activationBlocked:
        manifestDraft !== null &&
        manifestDraft.activation.activationApproved === false &&
        manifestDraft.activation.readyForApply === false,
      readyForRuntimeServerDeliveryContractV2,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    artifactHashes,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV Target Pack Manifest V2 packet: ${report.status}`);
  console.log(`Manifest draft created: ${report.summary.manifestDraftCreated ? 'yes' : 'no'}`);
  console.log(`Lesson rows: ${report.summary.lessonRows}`);
  console.log(`Row decision slots V2: ${report.summary.rowDecisionSlotsV2}`);
  console.log(`AI decision slots V2: ${report.summary.aiDecisionSlotsV2}`);
  console.log(`Production blockers mapped: ${report.summary.productionBlockers}`);
  console.log(`Runtime downloads enabled: ${report.safety.runtimeDownloadsEnabled ? 'yes' : 'no'}`);
  console.log(`Ready for Runtime/Server Delivery Contract V2: ${report.summary.readyForRuntimeServerDeliveryContractV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
