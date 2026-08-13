import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

type Status = "PASS" | "HOLD" | "BLOCK";
type Severity = "blocker" | "warning" | "info";

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

type BlockerStatus = "blocked" | "resolved";

type AdminSurfaceFile = {
  path: string;
  bytes: number;
  sha256: string;
  mentionsStudyTarget: boolean;
  mentionsSourceLocale: boolean;
  mentionsFrench: boolean;
  mentionsCoursePack: boolean;
  mentionsReviewer: boolean;
  mentionsUpload: boolean;
  mentionsImport: boolean;
  mentionsActivation: boolean;
  mentionsApply: boolean;
  mentionsRollback: boolean;
  mentionsPreview: boolean;
  mentionsAudit: boolean;
};

type ApprovalContract = {
  requiredApprovalFields: string[];
  requiredIdentityValues: {
    studyTarget: "fr";
    sourceLocales: ["ru", "uk"];
    uiLocaleMustNotDriveStudyTarget: true;
    activationApprovedBeforeProductionGate: false;
  };
  disallowedTransitionsNow: {
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    reviewerDecisionImportAllowed: false;
    serverManifestPublishAllowed: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
};

type Contract = {
  schemaVersion: "gustav-admin-reviewer-delivery-surface-v2";
  runId: string;
  generatedAt: string;
  studyTarget: "fr";
  targetLocale: "fr";
  sourceLocales: ["ru", "uk"];
  sourceArtifacts: Record<string, string>;
  upstreamStorageCloudContract: {
    path: string;
    status: string;
    readyForAdminPackDeliverySurfaceV2: boolean;
    sha256: string;
  };
  adminSurfaceInventory: {
    adminUiBiblePath: string;
    adminUiBiblePresent: boolean;
    adminUiBibleSha256: string;
    adminIndexPresent: boolean;
    adminV2Files: number;
    adminSurfaceFilesScanned: number;
    adminDedicatedFrenchPackConsolePresent: boolean;
    adminMentionsStudyTarget: boolean;
    adminMentionsSourceLocale: boolean;
    adminMentionsFrench: boolean;
    adminPreviewRollbackModelPresent: boolean;
    adminPackUploadCandidates: string[];
    adminReviewerCandidates: string[];
    adminImportCandidates: string[];
    adminActivationCandidates: string[];
    files: AdminSurfaceFile[];
  };
  reviewerArtifactInventory: {
    reviewerDir: string;
    reviewerArtifacts: number;
    reviewerJsonlFiles: number;
    reviewerTsvFiles: number;
    reviewerWorkflowV2SchemaPresent: boolean;
    rowDecisionTemplateV2Present: boolean;
    aiDecisionTemplateV2Present: boolean;
    legacyDecisionTemplatePresent: boolean;
    rowDecisionTemplateRows: number;
    aiDecisionTemplateRows: number;
    legacyDecisionTemplateRows: number;
    dryRunFixtureFiles: number;
  };
  packArtifactInventory: {
    targetPackManifestDraftPresent: boolean;
    runtimeServerContractPresent: boolean;
    storageCloudMapPresent: boolean;
    targetPackManifestSha256: string;
    runtimeServerContractSha256: string;
    storageCloudMapSha256: string;
    runtimeSlicesRequired: number;
    runtimeCacheKeyContracts: number;
  };
  deliveryApprovalContract: ApprovalContract;
  isolationGateContract: {
    requiredAdminGates: string[];
    requiredReviewerImportGates: string[];
    requiredServerPreviewGates: string[];
    requiredRollbackGates: string[];
  };
  productionBlockerMap: {
    blockerId: string;
    area: string;
    status: BlockerStatus;
    evidence: string;
    nextUnblockArtifact: string;
  }[];
};

type Report = {
  schemaVersion: "gustav-admin-reviewer-delivery-surface-v2-packet-v0";
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
    targetLocale: "fr";
    sourceLocales: number;
    upstreamStorageCloudReady: boolean;
    adminUiBiblePresent: boolean;
    adminSurfaceFilesScanned: number;
    adminV2Files: number;
    adminIndexPresent: boolean;
    adminDedicatedFrenchPackConsolePresent: boolean;
    adminMentionsStudyTarget: boolean;
    adminMentionsSourceLocale: boolean;
    adminMentionsFrench: boolean;
    adminPreviewRollbackModelPresent: boolean;
    adminPackUploadCandidateFiles: number;
    adminReviewerCandidateFiles: number;
    adminImportCandidateFiles: number;
    adminActivationCandidateFiles: number;
    reviewerArtifacts: number;
    reviewerJsonlFiles: number;
    reviewerTsvFiles: number;
    rowDecisionTemplateRows: number;
    aiDecisionTemplateRows: number;
    legacyDecisionTemplateRows: number;
    reviewerWorkflowV2SchemaPresent: boolean;
    targetPackManifestDraftPresent: boolean;
    runtimeServerContractPresent: boolean;
    storageCloudMapPresent: boolean;
    runtimeSlicesRequired: number;
    runtimeCacheKeyContracts: number;
    requiredApprovalFields: number;
    requiredAdminGates: number;
    requiredReviewerImportGates: number;
    requiredServerPreviewGates: number;
    requiredRollbackGates: number;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    reviewerDecisionImportAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    activationApprovedFlags: number;
    readyForApplyOpenFlags: number;
    productionBlockers: number;
    productionBlockerMapItems: number;
    resolvedProductionBlockers: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    readyForReviewerDecisionImportV2DryRun: boolean;
    readyForPayloadShardMaterializationGate: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  artifactHashes: Record<string, string>;
  contract: Contract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    adminUiModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_ROW_DECISION_ROWS_V2 = 1600;
const EXPECTED_AI_DECISION_ROWS_V2 = 178;

type JsonObject = Record<string, unknown>;

const SOURCE_LOCALES = ["ru", "uk"] as const;

const SOURCE_FILES = {
  adminUiBible: "docs/design/ADMIN_UI_BIBLE.md",
  adminIndex: "admin/index.html",
  liveAdmin: "admin/legacy.html",
  adminV2Dir: "admin/v2",
  adminPersonalTrainings: "admin/personal-trainings.js",
  adminExtraSurfaceFiles: [
    "admin/support.html",
    "admin/testers.html",
    "functions/src/index.ts",
    "functions/src/admin_translate.ts",
    "functions/src/admin_grant.ts",
    "functions/src/admin_alerts.ts",
    "functions/src/remote_gates.ts",
    "functions/src/community_packs.ts",
    "app/course_pack_manifest.ts",
    "app/course_pack_loader.ts",
    "app/course_pack_index.ts",
    "app/course_pack_rollback_kill_switch.ts",
    "app/course_pack_activation_readiness.ts",
  ],
  storageCloudTargetMapV2Packet:
    "audits/storage_cloud_target_map_v2_packet.json",
  targetPackManifestV2Draft:
    "pack_candidates/fr/target_pack_manifest_v2_draft.json",
  runtimeServerDeliveryContractV2:
    "pack_candidates/fr/runtime_server_delivery_contract_v2.json",
  runtimeServerDeliveryContractV2Packet:
    "audits/runtime_server_delivery_contract_v2_packet.json",
  storageCloudTargetMapV2:
    "pack_candidates/fr/storage_cloud_target_map_v2.json",
  adminPackApprovalImportSchemaV2Packet:
    "audits/admin_pack_approval_import_schema_v2.json",
  llmOfficialSourcePromotedDecisionFileGenerationV2Packet:
    "audits/llm_official_source_promoted_decision_file_generation_v2_packet.json",
  officialSourceContentCoverageV2Packet:
    "audits/french_official_source_content_coverage_v2_packet.json",
  reviewerDecisionImportV2DryRun:
    "audits/reviewer_decision_import_v2_dry_run.json",
  payloadShardMaterializationChecksumV2Packet:
    "audits/payload_shard_materialization_checksum_v2_packet.json",
  serverDeliveryManifestPreviewV2Packet:
    "audits/server_delivery_manifest_preview_v2_packet.json",
  serverPackUploadPolicyV2Packet:
    "audits/server_pack_upload_policy_v2_packet.json",
  runtimeCacheIntegrityRollbackV2Packet:
    "audits/runtime_cache_integrity_rollback_v2_packet.json",
  runtimeDownloadActivationGateV2Packet:
    "audits/runtime_download_activation_gate_v2.json",
  runtimeDeliveryEvidenceChainV2Packet:
    "audits/runtime_delivery_evidence_chain_v2_packet.json",
  reviewerDir: "generated/fr/reviewer",
  reviewerWorkflowV2Schema:
    "generated/fr/reviewer/reviewer_workflow_v2_decision_schema.json",
  reviewerDecisionTemplateV2:
    "generated/fr/reviewer/reviewer_decision_template_v2.jsonl",
  reviewerAiDecisionTemplateV2:
    "generated/fr/reviewer/reviewer_ai_decision_template_v2.jsonl",
  legacyDecisionTemplate:
    "generated/fr/reviewer/french_review_decision_template.jsonl",
  reviewDecisionImportDryRunScript:
    "scripts/gustav_french_review_decision_import_dry_run.ts",
  reviewDecisionContractScript:
    "scripts/gustav_french_review_decision_contract_packet.ts",
  reviewerWorkflowV2Script: "scripts/gustav_reviewer_workflow_v2_packet.ts",
  targetPackManifestV2Script:
    "scripts/gustav_target_pack_manifest_v2_packet.ts",
} as const;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function runPath(runDir: string, relativePath: string): string {
  return path.join(runDir, ...relativePath.split("/"));
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto
        .createHash("sha256")
        .update(fs.readFileSync(filePath))
        .digest("hex")
    : "";
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (
    typeof raw === "string" &&
    raw.trim() !== "" &&
    Number.isFinite(Number(raw))
  )
    return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string")
    return raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === "string" ? raw : "";
}

function readPacketSummary(
  runDir: string,
  relativePath: string,
): { packet: JsonObject; summary: JsonObject; path: string } {
  const packetPath = runPath(runDir, relativePath);
  const packet = fs.existsSync(packetPath)
    ? object(readJson<unknown>(packetPath))
    : {};
  return { packet, summary: object(packet.summary), path: packetPath };
}

function isPass(packet: JsonObject): boolean {
  return s(packet, "status") === "PASS";
}

function noProductionOpen(summary: JsonObject): boolean {
  return (
    !b(summary, "readyForApply") &&
    !b(summary, "mayModifyProductionAppFiles") &&
    !b(summary, "serverUploadAllowed") &&
    !b(summary, "firebaseUploadAllowed") &&
    !b(summary, "runtimeDownloadsEnabled") &&
    !b(summary, "downloadablePacksPublished") &&
    !b(summary, "activationApproved") &&
    !b(summary, "reviewerDecisionsImported") &&
    !b(summary, "generatedLedgerWritesAllowed") &&
    !b(summary, "storageMigrationAllowed") &&
    !b(summary, "cloudSyncMigrationAllowed") &&
    n(summary, "activationApprovedFlags") === 0 &&
    n(summary, "productionApplyOpenFlags") === 0
  );
}

function packetSha(repoRoot: string, filePath: string): string {
  return fs.existsSync(filePath) ? sha256(filePath).slice(0, 12) : "missing";
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function countJsonlRows(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const text = readText(filePath).trim();
  if (!text) return 0;
  return text.split(/\r?\n/).filter(Boolean).length;
}

function isAdminSurfaceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".html", ".js", ".ts", ".css"].includes(ext);
}

function scanAdminFile(repoRoot: string, filePath: string): AdminSurfaceFile {
  const source = readText(filePath);
  const lower = source.toLowerCase();
  return {
    path: rel(repoRoot, filePath),
    bytes: fs.statSync(filePath).size,
    sha256: sha256(filePath),
    mentionsStudyTarget:
      /studytarget|study-target|targetlocale|target-locale/.test(lower),
    mentionsSourceLocale: /sourcelocale|source-locale|source locale/.test(
      lower,
    ),
    mentionsFrench: /french|francais|français|\bfr\b/.test(lower),
    mentionsCoursePack:
      /course[_ -]?pack|content pack|pack manifest|downloadable pack/.test(
        lower,
      ),
    mentionsReviewer: /reviewer|review queue|quality review|needs review/.test(
      lower,
    ),
    mentionsUpload: /upload|publish|firebase storage|storage path/.test(lower),
    mentionsImport: /import|csv|tsv|jsonl/.test(lower),
    mentionsActivation: /activation|activate|enabled|rollout/.test(lower),
    mentionsApply:
      /\bapply\b|applyboolpatch|applytextpatch|applynumberpatch/.test(lower),
    mentionsRollback: /rollback|roll back|restore previous/.test(lower),
    mentionsPreview: /preview/.test(lower),
    mentionsAudit: /audit|history|log/.test(lower),
  };
}

function collectAdminSurfaces(repoRoot: string): AdminSurfaceFile[] {
  const candidates = new Set<string>();
  const adminIndex = path.join(repoRoot, SOURCE_FILES.adminIndex);
  const personalTrainings = path.join(
    repoRoot,
    SOURCE_FILES.adminPersonalTrainings,
  );
  if (fs.existsSync(adminIndex)) candidates.add(adminIndex);
  if (fs.existsSync(personalTrainings)) candidates.add(personalTrainings);
  for (const relative of SOURCE_FILES.adminExtraSurfaceFiles) {
    const filePath = path.join(repoRoot, relative);
    if (fs.existsSync(filePath) && isAdminSurfaceFile(filePath))
      candidates.add(filePath);
  }
  for (const file of walkFiles(path.join(repoRoot, SOURCE_FILES.adminV2Dir))) {
    if (isAdminSurfaceFile(file)) candidates.add(file);
  }
  return [...candidates]
    .sort((a, bValue) => a.localeCompare(bValue))
    .map((file) => scanAdminFile(repoRoot, file));
}

function withAny(
  files: AdminSurfaceFile[],
  predicate: (file: AdminSurfaceFile) => boolean,
): boolean {
  return files.some(predicate);
}

function pathsWhere(
  files: AdminSurfaceFile[],
  predicate: (file: AdminSurfaceFile) => boolean,
): string[] {
  return files.filter(predicate).map((file) => file.path);
}

function approvalContract(): ApprovalContract {
  return {
    requiredApprovalFields: [
      "approvalRequestId",
      "requestedBy",
      "reviewerName",
      "reviewedAt",
      "studyTarget",
      "sourceLocales",
      "uiLocale",
      "targetPackManifestSha256",
      "runtimeServerDeliveryContractSha256",
      "storageCloudTargetMapSha256",
      "reviewerWorkflowV2Sha256",
      "reviewerDecisionImportDryRunSha256",
      "serverManifestPreviewSha256",
      "payloadChecksumReportSha256",
      "rollbackPlanSha256",
      "activationApproved",
    ],
    requiredIdentityValues: {
      studyTarget: "fr",
      sourceLocales: ["ru", "uk"],
      uiLocaleMustNotDriveStudyTarget: true,
      activationApprovedBeforeProductionGate: false,
    },
    disallowedTransitionsNow: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      reviewerDecisionImportAllowed: false,
      serverManifestPublishAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
  };
}

function isolationGateContract(): Contract["isolationGateContract"] {
  return {
    requiredAdminGates: [
      "Admin route state must carry studyTarget separately from uiLocale.",
      "Admin sourceLocale selector for French may only allow ru and uk until a new sourceLocale contract exists.",
      "French pack preview must render manifest identity before any upload action is visible.",
      "Admin upload action must require targetPackManifestSha256, runtimeServerDeliveryContractSha256 and storageCloudTargetMapSha256.",
      "Admin approval must show activationApproved=false until the production activation gate passes.",
      "Admin surface must not infer studyTarget from UI language, user country, browser locale or admin copy language.",
    ],
    requiredReviewerImportGates: [
      "Reviewer decision import must run as dry-run before any ledger mutation.",
      "Every reviewed row must match sourceQueueIndex, lessonId, phraseId, targetLocale and source context.",
      "AI reviewer decisions must bind contractId, gateIds, cache behavior and wrong-language rejection evidence.",
      "Decision import must reject sourceLocale outside ru and uk for studyTarget=fr.",
      "Blank templates remain no-op and must not unlock activation.",
    ],
    requiredServerPreviewGates: [
      "Server manifest preview must include studyTarget=fr and sourceLocale in ru or uk in every path.",
      "Payload sha256 and byteSize must be computed before any Firebase/server upload.",
      "Remote downloadable flag must remain false while server manifest preview is unapproved.",
      "Published manifest must require rollbackFromVersion and gateReportRefs.",
    ],
    requiredRollbackGates: [
      "Rollback plan must name the previous known-good contentVersion.",
      "Rollback plan must disable French remote loading before replacing any manifest.",
      "Rollback evidence must include cache invalidation and server manifest revert steps.",
      "Rollback cannot reuse English/sourceLocale storage keys for French recovery.",
    ],
  };
}

type ProductionBlockerEvidence = {
  adminDedicatedFrenchPackConsolePresent: boolean;
  adminApprovalImportSchemaReady: boolean;
  llmOfficialSourcePromotionReady: boolean;
  officialSourceCoverageReady: boolean;
  reviewerDecisionImportV2DryRunReady: boolean;
  payloadShardMaterialized: boolean;
  serverManifestPreviewReady: boolean;
  serverPackUploadPolicyReady: boolean;
  rollbackMetadataReady: boolean;
  runtimeDownloadActivationGateReady: boolean;
  runtimeDeliveryEvidenceChainReady: boolean;
  refs: Record<string, string>;
};

function blockerStatus(ready: boolean): BlockerStatus {
  return ready ? "resolved" : "blocked";
}

function buildProductionBlockers(
  evidence: ProductionBlockerEvidence,
): Contract["productionBlockerMap"] {
  return [
    {
      blockerId: "P12-ADMIN-001-dedicated-french-pack-console-missing",
      area: "admin",
      status: blockerStatus(evidence.adminDedicatedFrenchPackConsolePresent),
      evidence: evidence.adminDedicatedFrenchPackConsolePresent
        ? `Admin inventory maps a French pack console surface with studyTarget/sourceLocale/French/course-pack/reviewer dimensions (${evidence.refs.adminPackDeliverySurface}).`
        : "Current admin surfaces are preview/remote-config oriented; no dedicated French pack console is approved yet.",
      nextUnblockArtifact:
        "audits/admin_french_pack_console_design_contract_v2.json",
    },
    {
      blockerId: "P12-ADMIN-002-admin-approval-import-schema-missing",
      area: "admin",
      status: blockerStatus(evidence.adminApprovalImportSchemaReady),
      evidence: evidence.adminApprovalImportSchemaReady
        ? `Admin approval import schema V2 is PASS: 16 required approval fields, exact approval sentence bound, active receipt/hash-lock absent, and no production transitions opened (${evidence.refs.adminApprovalImportSchema}).`
        : "Admin approval fields are contracted, but no importable production approval document schema has been accepted.",
      nextUnblockArtifact: "audits/admin_pack_approval_import_schema_v2.json",
    },
    {
      blockerId:
        "P12-REVIEWER-001-v2-reviewer-decisions-not-llm-official-source-approved",
      area: "reviewer",
      status: blockerStatus(
        evidence.llmOfficialSourcePromotionReady &&
          evidence.officialSourceCoverageReady,
      ),
      evidence:
        evidence.llmOfficialSourcePromotionReady &&
        evidence.officialSourceCoverageReady
          ? `LLM official-source promoted decisions and coverage are PASS: ${EXPECTED_ROW_DECISION_ROWS_V2} row decisions and ${EXPECTED_AI_DECISION_ROWS_V2} AI decisions accepted, with no import/apply/activation flags opened (${evidence.refs.officialSourceCoverage}).`
          : "Reviewer V2 row and AI templates exist, but LLM official-source decisions are not fully covered yet.",
      nextUnblockArtifact: "audits/reviewer_decision_import_v2_dry_run.json",
    },
    {
      blockerId: "P12-REVIEWER-002-ai-reviewer-decision-import-not-dry-run",
      area: "reviewer_import",
      status: blockerStatus(evidence.reviewerDecisionImportV2DryRunReady),
      evidence: evidence.reviewerDecisionImportV2DryRunReady
        ? `Reviewer Decision Import V2 dry-run is PASS for ${EXPECTED_ROW_DECISION_ROWS_V2} row decisions and ${EXPECTED_AI_DECISION_ROWS_V2} AI decisions, ready for payload shard materialization gate, without production writes (${evidence.refs.reviewerDecisionImport}).`
        : "AI prompt reviewer decisions need their own dry-run before any cache/prompt activation.",
      nextUnblockArtifact: "audits/ai_reviewer_decision_import_v2_dry_run.json",
    },
    {
      blockerId: "P12-PAYLOAD-001-runtime-payload-shards-not-materialized",
      area: "pack_payload",
      status: blockerStatus(evidence.payloadShardMaterialized),
      evidence: evidence.payloadShardMaterialized
        ? `Payload shard materialization checksum packet is PASS: 12 runtime slices and 48 future/local artifacts accounted, still no upload/download/apply flags (${evidence.refs.payloadShard}).`
        : "Runtime slices are contracted but downloadable payload shards and checksum reports are missing.",
      nextUnblockArtifact: "pack_candidates/fr/runtime_slices/*",
    },
    {
      blockerId: "P12-SERVER-001-server-manifest-preview-missing",
      area: "server_delivery",
      status: blockerStatus(evidence.serverManifestPreviewReady),
      evidence: evidence.serverManifestPreviewReady
        ? `Server manifest preview packet is PASS with 12 preview entries, activationApproved=false entries and no published production manifest (${evidence.refs.serverPreview}).`
        : "No server/Firebase manifest preview has been created or reviewed for French packs.",
      nextUnblockArtifact: "audits/server_delivery_manifest_v2_packet.json",
    },
    {
      blockerId: "P12-UPLOAD-001-upload-policy-and-acl-not-approved",
      area: "server_delivery",
      status: blockerStatus(evidence.serverPackUploadPolicyReady),
      evidence: evidence.serverPackUploadPolicyReady
        ? `Server pack upload policy V2 is PASS: 12 source-scoped manifest entries, ACL/checksum/rollback guards present, and upload/download/apply flags remain closed (${evidence.refs.serverPackUploadPolicy}).`
        : "Firebase/server upload path, ACL and checksum policy remain unapproved.",
      nextUnblockArtifact: "audits/server_pack_upload_policy_v2_packet.json",
    },
    {
      blockerId: "P12-ROLLBACK-001-rollback-plan-not-materialized",
      area: "rollback",
      status: blockerStatus(
        evidence.rollbackMetadataReady &&
          evidence.runtimeDeliveryEvidenceChainReady,
      ),
      evidence:
        evidence.rollbackMetadataReady &&
        evidence.runtimeDeliveryEvidenceChainReady
          ? `Runtime cache integrity/rollback and delivery evidence chain are PASS: 12 rollback simulations, cache mismatch quarantine, source/studyTarget rejects, and no runtime activation (${evidence.refs.rollback}).`
          : "Rollback metadata is required before any runtime/server activation can be considered.",
      nextUnblockArtifact: "audits/french_pack_rollback_plan_v2_packet.json",
    },
    {
      blockerId: "P12-RUNTIME-001-runtime-downloads-still-disabled",
      area: "runtime_loader",
      status: blockerStatus(evidence.runtimeDownloadActivationGateReady),
      evidence: evidence.runtimeDownloadActivationGateReady
        ? `Runtime download activation gate V2 is PASS: production target/index/downloads remain closed now, but the future transaction, manifest checks and rollback guards are fully contracted (${evidence.refs.runtimeDownloadActivationGate}).`
        : "Runtime downloads remain intentionally disabled and no French cache activation is open.",
      nextUnblockArtifact: "audits/runtime_download_activation_gate_v2.json",
    },
    {
      blockerId: "P12-ACTIVATION-001-activation-not-approved",
      area: "activation",
      status: "blocked",
      evidence:
        "activationApproved remains false until all content, reviewer, server, runtime, rollback and apply gates pass.",
      nextUnblockArtifact: "apply_plan/APPLY_PLAN.md",
    },
  ];
}

function addFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  message: string,
  filePath?: string,
): void {
  findings.push({ severity, code, message, path: filePath });
}

function buildContract(repoRoot: string, runDir: string): Contract {
  const runId = path.basename(runDir);
  const adminFiles = collectAdminSurfaces(repoRoot);
  const adminV2Files = adminFiles.filter((file) =>
    file.path.startsWith("admin/v2/"),
  ).length;
  const adminBiblePath = path.join(repoRoot, SOURCE_FILES.adminUiBible);
  const storagePacketPath = runPath(
    runDir,
    SOURCE_FILES.storageCloudTargetMapV2Packet,
  );
  const storagePacket = fs.existsSync(storagePacketPath)
    ? object(readJson<unknown>(storagePacketPath))
    : {};
  const storageSummary = object(storagePacket.summary);
  const reviewerDir = runPath(runDir, SOURCE_FILES.reviewerDir);
  const reviewerFiles = walkFiles(reviewerDir);
  const reviewerJsonlFiles = reviewerFiles.filter((file) =>
    file.endsWith(".jsonl"),
  );
  const reviewerTsvFiles = reviewerFiles.filter((file) =>
    file.endsWith(".tsv"),
  );
  const targetPackManifestPath = runPath(
    runDir,
    SOURCE_FILES.targetPackManifestV2Draft,
  );
  const runtimeContractPath = runPath(
    runDir,
    SOURCE_FILES.runtimeServerDeliveryContractV2,
  );
  const runtimePacketPath = runPath(
    runDir,
    SOURCE_FILES.runtimeServerDeliveryContractV2Packet,
  );
  const storageCloudMapPath = runPath(
    runDir,
    SOURCE_FILES.storageCloudTargetMapV2,
  );
  const runtimePacket = fs.existsSync(runtimePacketPath)
    ? object(readJson<unknown>(runtimePacketPath))
    : {};
  const runtimeSummary = object(runtimePacket.summary);
  const adminApprovalImportSchema = readPacketSummary(
    runDir,
    SOURCE_FILES.adminPackApprovalImportSchemaV2Packet,
  );
  const llmOfficialSourcePromotion = readPacketSummary(
    runDir,
    SOURCE_FILES.llmOfficialSourcePromotedDecisionFileGenerationV2Packet,
  );
  const officialSourceCoverage = readPacketSummary(
    runDir,
    SOURCE_FILES.officialSourceContentCoverageV2Packet,
  );
  const reviewerDecisionImport = readPacketSummary(
    runDir,
    SOURCE_FILES.reviewerDecisionImportV2DryRun,
  );
  const payloadShard = readPacketSummary(
    runDir,
    SOURCE_FILES.payloadShardMaterializationChecksumV2Packet,
  );
  const serverPreview = readPacketSummary(
    runDir,
    SOURCE_FILES.serverDeliveryManifestPreviewV2Packet,
  );
  const serverPackUploadPolicy = readPacketSummary(
    runDir,
    SOURCE_FILES.serverPackUploadPolicyV2Packet,
  );
  const runtimeRollback = readPacketSummary(
    runDir,
    SOURCE_FILES.runtimeCacheIntegrityRollbackV2Packet,
  );
  const runtimeDownloadActivationGate = readPacketSummary(
    runDir,
    SOURCE_FILES.runtimeDownloadActivationGateV2Packet,
  );
  const runtimeDeliveryChain = readPacketSummary(
    runDir,
    SOURCE_FILES.runtimeDeliveryEvidenceChainV2Packet,
  );

  const approval = approvalContract();
  const isolation = isolationGateContract();
  const adminMentionsStudyTarget = withAny(
    adminFiles,
    (file) => file.mentionsStudyTarget,
  );
  const adminMentionsSourceLocale = withAny(
    adminFiles,
    (file) => file.mentionsSourceLocale,
  );
  const adminMentionsFrench = withAny(
    adminFiles,
    (file) => file.mentionsFrench,
  );
  const adminPreviewRollbackModelPresent =
    withAny(adminFiles, (file) => file.mentionsPreview) &&
    withAny(adminFiles, (file) => file.mentionsRollback) &&
    withAny(adminFiles, (file) => file.mentionsAudit);
  const adminDedicatedFrenchPackConsolePresent =
    adminMentionsFrench &&
    adminMentionsStudyTarget &&
    adminMentionsSourceLocale &&
    withAny(
      adminFiles,
      (file) => file.mentionsCoursePack && file.mentionsReviewer,
    );
  const adminApprovalImportSchemaReady =
    isPass(adminApprovalImportSchema.packet) &&
    b(adminApprovalImportSchema.summary, "approvalImportSchemaReady") &&
    b(adminApprovalImportSchema.summary, "exactApprovalSentencePresent") &&
    n(adminApprovalImportSchema.summary, "requiredApprovalFields") === 16 &&
    !b(adminApprovalImportSchema.summary, "activeApprovalReceiptExists") &&
    !b(adminApprovalImportSchema.summary, "activeHashLockManifestExists") &&
    !b(adminApprovalImportSchema.summary, "approvalDocumentImportAllowed") &&
    noProductionOpen(adminApprovalImportSchema.summary);
  const llmOfficialSourcePromotionReady =
    isPass(llmOfficialSourcePromotion.packet) &&
    n(llmOfficialSourcePromotion.summary, "acceptedRowDecisionRows") ===
      EXPECTED_ROW_DECISION_ROWS_V2 &&
    n(llmOfficialSourcePromotion.summary, "acceptedAiDecisionRows") >=
      EXPECTED_AI_DECISION_ROWS_V2 &&
    n(
      llmOfficialSourcePromotion.summary,
      "rejectedFreshAiReturnOrCacheOpenRows",
    ) === 0 &&
    n(
      llmOfficialSourcePromotion.summary,
      "targetOutputBeforeQualityOpenRows",
    ) === 0 &&
    b(
      llmOfficialSourcePromotion.summary,
      "readyForReviewerDecisionImportV2DryRunRefresh",
    ) &&
    noProductionOpen(llmOfficialSourcePromotion.summary);
  const officialSourceCoverageReady =
    isPass(officialSourceCoverage.packet) &&
    s(officialSourceCoverage.summary, "coverageState") ===
      "official_source_content_coverage_complete_no_import" &&
    n(
      officialSourceCoverage.summary,
      "acceptedRowOfficialSourceDecisionRows",
    ) === EXPECTED_ROW_DECISION_ROWS_V2 &&
    n(officialSourceCoverage.summary, "acceptedAiOfficialSourceDecisionRows") >=
      EXPECTED_AI_DECISION_ROWS_V2 &&
    n(
      officialSourceCoverage.summary,
      "rowDecisionsWithAllRequiredGatesPassed",
    ) === EXPECTED_ROW_DECISION_ROWS_V2 &&
    n(
      officialSourceCoverage.summary,
      "aiDecisionsWithCoreLanguageGatesPassed",
    ) >= EXPECTED_AI_DECISION_ROWS_V2 &&
    b(
      officialSourceCoverage.summary,
      "readyForReviewerDecisionImportDryRunRefresh",
    ) &&
    noProductionOpen(officialSourceCoverage.summary);
  const reviewerDecisionImportV2DryRunReady =
    isPass(reviewerDecisionImport.packet) &&
    n(reviewerDecisionImport.summary, "acceptedRowDecisionRows") ===
      EXPECTED_ROW_DECISION_ROWS_V2 &&
    n(reviewerDecisionImport.summary, "acceptedAiDecisionRows") >=
      EXPECTED_AI_DECISION_ROWS_V2 &&
    n(reviewerDecisionImport.summary, "rowWrongTargetRows") === 0 &&
    n(reviewerDecisionImport.summary, "aiWrongTargetRows") === 0 &&
    n(reviewerDecisionImport.summary, "rowWrongSourceLocaleRows") === 0 &&
    n(reviewerDecisionImport.summary, "aiWrongSourceLocaleRows") === 0 &&
    b(
      reviewerDecisionImport.summary,
      "readyForPayloadShardMaterializationGate",
    ) &&
    noProductionOpen(reviewerDecisionImport.summary);
  const payloadShardMaterialized =
    isPass(payloadShard.packet) &&
    b(payloadShard.summary, "readyForServerManifestPreviewGate") &&
    n(payloadShard.summary, "runtimeSlices") === 12 &&
    n(payloadShard.summary, "futureArtifactFilesPresent") >= 48 &&
    n(payloadShard.summary, "unaccountedFutureArtifactFilesPresent") === 0 &&
    noProductionOpen(payloadShard.summary);
  const serverManifestPreviewReady =
    isPass(serverPreview.packet) &&
    b(serverPreview.summary, "serverManifestPreviewCreated") &&
    !b(serverPreview.summary, "futureServerManifestExists") &&
    n(serverPreview.summary, "previewEntries") === 12 &&
    n(serverPreview.summary, "entriesWithActivationApprovedFalse") === 12 &&
    b(serverPreview.summary, "readyForRuntimeCacheIntegrityGate") &&
    noProductionOpen(serverPreview.summary);
  const serverPackUploadPolicyReady =
    isPass(serverPackUploadPolicy.packet) &&
    b(serverPackUploadPolicy.summary, "serverPackUploadPolicyReady") &&
    n(serverPackUploadPolicy.summary, "manifestEntries") === 12 &&
    n(serverPackUploadPolicy.summary, "sourceScopedServerPaths") === 12 &&
    n(serverPackUploadPolicy.summary, "payloadShaEntries") === 12 &&
    n(serverPackUploadPolicy.summary, "payloadByteSizeEntries") === 12 &&
    n(serverPackUploadPolicy.summary, "requiredAclGuards") >= 4 &&
    n(serverPackUploadPolicy.summary, "requiredChecksumGuards") >= 4 &&
    n(serverPackUploadPolicy.summary, "requiredRollbackGuards") >= 4 &&
    !b(serverPackUploadPolicy.summary, "serverUploadAllowed") &&
    !b(serverPackUploadPolicy.summary, "firebaseUploadAllowed") &&
    !b(serverPackUploadPolicy.summary, "downloadablePacksPublished") &&
    !b(serverPackUploadPolicy.summary, "runtimeDownloadsEnabled") &&
    !b(serverPackUploadPolicy.summary, "readyForApply") &&
    noProductionOpen(serverPackUploadPolicy.summary);
  const rollbackMetadataReady =
    isPass(runtimeRollback.packet) &&
    b(runtimeRollback.summary, "serverManifestPreviewReady") &&
    n(runtimeRollback.summary, "rollbackSimulationContracts") === 12 &&
    n(runtimeRollback.summary, "runtimeDownloadBlockedContracts") === 12 &&
    n(runtimeRollback.summary, "studyTargetMismatchRejectContracts") === 12 &&
    b(runtimeRollback.summary, "readyForReviewerDecisionImportOpeningGate") &&
    noProductionOpen(runtimeRollback.summary);
  const runtimeDownloadActivationGateReady =
    isPass(runtimeDownloadActivationGate.packet) &&
    b(
      runtimeDownloadActivationGate.summary,
      "runtimeDownloadActivationGateReady",
    ) &&
    b(
      runtimeDownloadActivationGate.summary,
      "runtimeActivationPreconditionsContracted",
    ) &&
    b(runtimeDownloadActivationGate.summary, "noActiveApprovalArtifacts") &&
    n(runtimeDownloadActivationGate.summary, "serverManifestDraftEntries") ===
      12 &&
    n(runtimeDownloadActivationGate.summary, "manifestStudyTargetFr") === 12 &&
    n(
      runtimeDownloadActivationGate.summary,
      "manifestRuntimeDownloadsEnabledFalse",
    ) === 12 &&
    n(
      runtimeDownloadActivationGate.summary,
      "manifestActivationApprovedFalse",
    ) === 12 &&
    n(runtimeDownloadActivationGate.summary, "manifestReadyForApplyFalse") ===
      12 &&
    n(runtimeDownloadActivationGate.summary, "frenchEmbeddedIndexEntries") ===
      0 &&
    !b(
      runtimeDownloadActivationGate.summary,
      "coursePackRemoteLoadingEnabled",
    ) &&
    !b(
      runtimeDownloadActivationGate.summary,
      "productionStudyTargetFrEnabled",
    ) &&
    !b(
      runtimeDownloadActivationGate.summary,
      "productionServerManifestExists",
    ) &&
    !b(runtimeDownloadActivationGate.summary, "p1aApprovalReceiptExists") &&
    !b(runtimeDownloadActivationGate.summary, "p1aActiveHashLockExists") &&
    !b(runtimeDownloadActivationGate.summary, "runtimeDownloadsEnabled") &&
    !b(runtimeDownloadActivationGate.summary, "activationApproved") &&
    !b(runtimeDownloadActivationGate.summary, "readyForApply") &&
    noProductionOpen(runtimeDownloadActivationGate.summary);
  const runtimeDeliveryEvidenceChainReady =
    isPass(runtimeDeliveryChain.packet) &&
    b(runtimeDeliveryChain.summary, "runtimeDeliveryEvidenceChainReady") &&
    b(runtimeDeliveryChain.summary, "closedTransitions") &&
    n(runtimeDeliveryChain.summary, "manifestEntries") === 12 &&
    n(runtimeDeliveryChain.summary, "manifestStudyTargetFr") === 12 &&
    n(runtimeDeliveryChain.summary, "manifestForbiddenOpenFlags") === 0 &&
    !b(runtimeDeliveryChain.summary, "productionServerManifestExists") &&
    noProductionOpen(runtimeDeliveryChain.summary);
  const productionBlockerEvidence: ProductionBlockerEvidence = {
    adminDedicatedFrenchPackConsolePresent,
    adminApprovalImportSchemaReady,
    llmOfficialSourcePromotionReady,
    officialSourceCoverageReady,
    reviewerDecisionImportV2DryRunReady,
    payloadShardMaterialized,
    serverManifestPreviewReady,
    serverPackUploadPolicyReady,
    rollbackMetadataReady,
    runtimeDownloadActivationGateReady,
    runtimeDeliveryEvidenceChainReady,
    refs: {
      adminPackDeliverySurface: "admin_pack_delivery_surface_v2:self",
      adminApprovalImportSchema: packetSha(
        repoRoot,
        adminApprovalImportSchema.path,
      ),
      llmOfficialSourcePromotion: packetSha(
        repoRoot,
        llmOfficialSourcePromotion.path,
      ),
      officialSourceCoverage: packetSha(repoRoot, officialSourceCoverage.path),
      reviewerDecisionImport: packetSha(repoRoot, reviewerDecisionImport.path),
      payloadShard: packetSha(repoRoot, payloadShard.path),
      serverPreview: packetSha(repoRoot, serverPreview.path),
      serverPackUploadPolicy: packetSha(repoRoot, serverPackUploadPolicy.path),
      rollback: packetSha(repoRoot, runtimeRollback.path),
      runtimeDownloadActivationGate: packetSha(
        repoRoot,
        runtimeDownloadActivationGate.path,
      ),
      runtimeDeliveryChain: packetSha(repoRoot, runtimeDeliveryChain.path),
    },
  };

  return {
    schemaVersion: "gustav-admin-reviewer-delivery-surface-v2",
    runId,
    generatedAt: new Date().toISOString(),
    studyTarget: "fr",
    targetLocale: "fr",
    sourceLocales: ["ru", "uk"],
    sourceArtifacts: {
      adminUiBible: SOURCE_FILES.adminUiBible,
      adminIndex: SOURCE_FILES.adminIndex,
      liveAdmin: SOURCE_FILES.liveAdmin,
      adminV2Dir: SOURCE_FILES.adminV2Dir,
      adminPersonalTrainings: SOURCE_FILES.adminPersonalTrainings,
      storageCloudTargetMapV2Packet: rel(repoRoot, storagePacketPath),
      targetPackManifestV2Draft: rel(repoRoot, targetPackManifestPath),
      runtimeServerDeliveryContractV2: rel(repoRoot, runtimeContractPath),
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimePacketPath),
      storageCloudTargetMapV2: rel(repoRoot, storageCloudMapPath),
      adminPackApprovalImportSchemaV2Packet: rel(
        repoRoot,
        adminApprovalImportSchema.path,
      ),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: rel(
        repoRoot,
        llmOfficialSourcePromotion.path,
      ),
      officialSourceContentCoverageV2Packet: rel(
        repoRoot,
        officialSourceCoverage.path,
      ),
      reviewerDecisionImportV2DryRun: rel(
        repoRoot,
        reviewerDecisionImport.path,
      ),
      payloadShardMaterializationChecksumV2Packet: rel(
        repoRoot,
        payloadShard.path,
      ),
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, serverPreview.path),
      serverPackUploadPolicyV2Packet: rel(
        repoRoot,
        serverPackUploadPolicy.path,
      ),
      runtimeCacheIntegrityRollbackV2Packet: rel(
        repoRoot,
        runtimeRollback.path,
      ),
      runtimeDownloadActivationGateV2Packet: rel(
        repoRoot,
        runtimeDownloadActivationGate.path,
      ),
      runtimeDeliveryEvidenceChainV2Packet: rel(
        repoRoot,
        runtimeDeliveryChain.path,
      ),
      reviewerDir: rel(repoRoot, reviewerDir),
      reviewDecisionImportDryRunScript:
        SOURCE_FILES.reviewDecisionImportDryRunScript,
      reviewDecisionContractScript: SOURCE_FILES.reviewDecisionContractScript,
      reviewerWorkflowV2Script: SOURCE_FILES.reviewerWorkflowV2Script,
      targetPackManifestV2Script: SOURCE_FILES.targetPackManifestV2Script,
    },
    upstreamStorageCloudContract: {
      path: rel(repoRoot, storagePacketPath),
      status: s(storagePacket, "status"),
      readyForAdminPackDeliverySurfaceV2: b(
        storageSummary,
        "readyForAdminPackDeliverySurfaceV2",
      ),
      sha256: sha256(storagePacketPath),
    },
    adminSurfaceInventory: {
      adminUiBiblePath: SOURCE_FILES.adminUiBible,
      adminUiBiblePresent: fs.existsSync(adminBiblePath),
      adminUiBibleSha256: sha256(adminBiblePath),
      adminIndexPresent: fs.existsSync(
        path.join(repoRoot, SOURCE_FILES.adminIndex),
      ),
      adminV2Files,
      adminSurfaceFilesScanned: adminFiles.length,
      adminDedicatedFrenchPackConsolePresent,
      adminMentionsStudyTarget,
      adminMentionsSourceLocale,
      adminMentionsFrench,
      adminPreviewRollbackModelPresent,
      adminPackUploadCandidates: pathsWhere(
        adminFiles,
        (file) =>
          file.mentionsCoursePack ||
          (file.mentionsUpload && file.mentionsImport) ||
          file.path === SOURCE_FILES.adminPersonalTrainings,
      ),
      adminReviewerCandidates: pathsWhere(
        adminFiles,
        (file) => file.mentionsReviewer || file.mentionsAudit,
      ),
      adminImportCandidates: pathsWhere(
        adminFiles,
        (file) => file.mentionsImport,
      ),
      adminActivationCandidates: pathsWhere(
        adminFiles,
        (file) => file.mentionsActivation || file.mentionsApply,
      ),
      files: adminFiles,
    },
    reviewerArtifactInventory: {
      reviewerDir: rel(repoRoot, reviewerDir),
      reviewerArtifacts: reviewerFiles.length,
      reviewerJsonlFiles: reviewerJsonlFiles.length,
      reviewerTsvFiles: reviewerTsvFiles.length,
      reviewerWorkflowV2SchemaPresent: fs.existsSync(
        runPath(runDir, SOURCE_FILES.reviewerWorkflowV2Schema),
      ),
      rowDecisionTemplateV2Present: fs.existsSync(
        runPath(runDir, SOURCE_FILES.reviewerDecisionTemplateV2),
      ),
      aiDecisionTemplateV2Present: fs.existsSync(
        runPath(runDir, SOURCE_FILES.reviewerAiDecisionTemplateV2),
      ),
      legacyDecisionTemplatePresent: fs.existsSync(
        runPath(runDir, SOURCE_FILES.legacyDecisionTemplate),
      ),
      rowDecisionTemplateRows: countJsonlRows(
        runPath(runDir, SOURCE_FILES.reviewerDecisionTemplateV2),
      ),
      aiDecisionTemplateRows: countJsonlRows(
        runPath(runDir, SOURCE_FILES.reviewerAiDecisionTemplateV2),
      ),
      legacyDecisionTemplateRows: countJsonlRows(
        runPath(runDir, SOURCE_FILES.legacyDecisionTemplate),
      ),
      dryRunFixtureFiles: walkFiles(path.join(reviewerDir, "dry_run_fixtures"))
        .length,
    },
    packArtifactInventory: {
      targetPackManifestDraftPresent: fs.existsSync(targetPackManifestPath),
      runtimeServerContractPresent: fs.existsSync(runtimeContractPath),
      storageCloudMapPresent: fs.existsSync(storageCloudMapPath),
      targetPackManifestSha256: sha256(targetPackManifestPath),
      runtimeServerContractSha256: sha256(runtimeContractPath),
      storageCloudMapSha256: sha256(storageCloudMapPath),
      runtimeSlicesRequired: n(runtimeSummary, "requiredRuntimeSlices"),
      runtimeCacheKeyContracts: n(
        runtimeSummary,
        "runtimeSlicesWithCacheKeyContract",
      ),
    },
    deliveryApprovalContract: approval,
    isolationGateContract: isolation,
    productionBlockerMap: buildProductionBlockers(productionBlockerEvidence),
  };
}

function validateContract(contract: Contract): Finding[] {
  const findings: Finding[] = [];
  if (contract.schemaVersion !== "gustav-admin-reviewer-delivery-surface-v2") {
    addFinding(
      findings,
      "blocker",
      "schema_version_invalid",
      "Admin/reviewer delivery surface schema is invalid.",
    );
  }
  if (contract.studyTarget !== "fr" || contract.targetLocale !== "fr") {
    addFinding(
      findings,
      "blocker",
      "target_not_fr",
      "P12 is scoped to studyTarget=fr only.",
    );
  }
  for (const locale of SOURCE_LOCALES) {
    if (!contract.sourceLocales.includes(locale)) {
      addFinding(
        findings,
        "blocker",
        "source_locale_missing",
        `Missing source locale: ${locale}.`,
      );
    }
  }
  if (
    !contract.upstreamStorageCloudContract.readyForAdminPackDeliverySurfaceV2
  ) {
    addFinding(
      findings,
      "blocker",
      "upstream_storage_cloud_not_ready",
      "P11 storage/cloud map is not ready for P12.",
    );
  }
  const admin = contract.adminSurfaceInventory;
  if (!admin.adminUiBiblePresent) {
    addFinding(
      findings,
      "blocker",
      "admin_ui_bible_missing",
      "Admin UI Bible must be present before admin surface planning.",
    );
  }
  if (
    !admin.adminIndexPresent ||
    (admin.adminV2Files > 0 && admin.adminV2Files < 3) ||
    admin.adminSurfaceFilesScanned < 5
  ) {
    addFinding(
      findings,
      "blocker",
      "admin_surface_inventory_too_small",
      "Admin surface inventory is unexpectedly small.",
    );
  }
  if (!admin.adminPreviewRollbackModelPresent) {
    addFinding(
      findings,
      "blocker",
      "admin_preview_rollback_model_missing",
      "Admin surfaces must expose preview, audit/history and rollback patterns before pack delivery planning.",
    );
  }
  if (admin.adminPackUploadCandidates.length < 1) {
    addFinding(
      findings,
      "blocker",
      "admin_pack_candidate_missing",
      "No admin pack/content delivery candidate surface was mapped.",
    );
  }
  const reviewer = contract.reviewerArtifactInventory;
  if (
    !reviewer.reviewerWorkflowV2SchemaPresent ||
    !reviewer.rowDecisionTemplateV2Present ||
    !reviewer.aiDecisionTemplateV2Present
  ) {
    addFinding(
      findings,
      "blocker",
      "reviewer_v2_artifacts_missing",
      "Reviewer Workflow V2 row and AI artifacts must exist before P12.",
    );
  }
  if (reviewer.rowDecisionTemplateRows !== EXPECTED_ROW_DECISION_ROWS_V2) {
    addFinding(
      findings,
      "blocker",
      "row_decision_template_v2_count_invalid",
      `Expected ${EXPECTED_ROW_DECISION_ROWS_V2} V2 row reviewer slots, found ${reviewer.rowDecisionTemplateRows}.`,
    );
  }
  if (reviewer.aiDecisionTemplateRows < EXPECTED_AI_DECISION_ROWS_V2) {
    addFinding(
      findings,
      "blocker",
      "ai_decision_template_v2_count_invalid",
      `Expected at least ${EXPECTED_AI_DECISION_ROWS_V2} AI reviewer slots, found ${reviewer.aiDecisionTemplateRows}.`,
    );
  }
  const pack = contract.packArtifactInventory;
  if (
    !pack.targetPackManifestDraftPresent ||
    !pack.runtimeServerContractPresent ||
    !pack.storageCloudMapPresent
  ) {
    addFinding(
      findings,
      "blocker",
      "pack_contract_artifacts_missing",
      "Target pack manifest, runtime/server contract and storage/cloud map must all be present.",
    );
  }
  if (pack.runtimeSlicesRequired < 12 || pack.runtimeCacheKeyContracts < 12) {
    addFinding(
      findings,
      "blocker",
      "runtime_slice_contract_incomplete",
      "Runtime slice/cache-key contract coverage is too small.",
    );
  }
  const approval = contract.deliveryApprovalContract;
  for (const required of [
    "studyTarget",
    "sourceLocales",
    "uiLocale",
    "rollbackPlanSha256",
    "activationApproved",
  ]) {
    if (!approval.requiredApprovalFields.includes(required)) {
      addFinding(
        findings,
        "blocker",
        "approval_field_missing",
        `Required approval field is missing: ${required}.`,
      );
    }
  }
  const transitions = approval.disallowedTransitionsNow;
  for (const [key, value] of Object.entries(transitions)) {
    if (value !== false) {
      addFinding(
        findings,
        "blocker",
        "dangerous_transition_opened",
        `Dangerous transition must remain false in P12: ${key}.`,
      );
    }
  }
  const isolation = contract.isolationGateContract;
  if (
    isolation.requiredAdminGates.length < 6 ||
    isolation.requiredReviewerImportGates.length < 5
  ) {
    addFinding(
      findings,
      "blocker",
      "isolation_gate_coverage_too_small",
      "Admin/reviewer isolation gates are not broad enough.",
    );
  }
  if (
    isolation.requiredServerPreviewGates.length < 4 ||
    isolation.requiredRollbackGates.length < 4
  ) {
    addFinding(
      findings,
      "blocker",
      "server_or_rollback_gate_coverage_too_small",
      "Server preview and rollback gates are not broad enough.",
    );
  }
  if (contract.productionBlockerMap.length < 9) {
    addFinding(
      findings,
      "blocker",
      "production_blocker_map_too_small",
      "P12 must enumerate admin/reviewer/payload/server/upload/rollback/runtime/activation blockers.",
    );
  }
  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeProbes(contract: Contract): Probe[] {
  const fixtures: {
    id: string;
    expectedAccept: boolean;
    mutate?: (draft: Contract) => void;
  }[] = [
    { id: "canonical_admin_reviewer_contract_accepts", expectedAccept: true },
    {
      id: "server_upload_allowed_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        (
          draft.deliveryApprovalContract.disallowedTransitionsNow as {
            serverUploadAllowed: boolean;
          }
        ).serverUploadAllowed = true;
      },
    },
    {
      id: "reviewer_import_allowed_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        (
          draft.deliveryApprovalContract.disallowedTransitionsNow as {
            reviewerDecisionImportAllowed: boolean;
          }
        ).reviewerDecisionImportAllowed = true;
      },
    },
    {
      id: "activation_approved_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        (
          draft.deliveryApprovalContract.disallowedTransitionsNow as {
            activationApproved: boolean;
          }
        ).activationApproved = true;
      },
    },
    {
      id: "ready_for_apply_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        (
          draft.deliveryApprovalContract.disallowedTransitionsNow as {
            readyForApply: boolean;
          }
        ).readyForApply = true;
      },
    },
    {
      id: "study_target_approval_field_missing_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        draft.deliveryApprovalContract.requiredApprovalFields =
          draft.deliveryApprovalContract.requiredApprovalFields.filter(
            (field) => field !== "studyTarget",
          );
      },
    },
    {
      id: "source_locales_approval_field_missing_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        draft.deliveryApprovalContract.requiredApprovalFields =
          draft.deliveryApprovalContract.requiredApprovalFields.filter(
            (field) => field !== "sourceLocales",
          );
      },
    },
    {
      id: "admin_surfaces_missing_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        draft.adminSurfaceInventory.files = [];
        draft.adminSurfaceInventory.adminSurfaceFilesScanned = 0;
        draft.adminSurfaceInventory.adminV2Files = 0;
      },
    },
    {
      id: "row_template_missing_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        draft.reviewerArtifactInventory.rowDecisionTemplateV2Present = false;
        draft.reviewerArtifactInventory.rowDecisionTemplateRows = 0;
      },
    },
    {
      id: "upstream_storage_not_ready_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        draft.upstreamStorageCloudContract.readyForAdminPackDeliverySurfaceV2 = false;
      },
    },
    {
      id: "rollback_gate_missing_rejected",
      expectedAccept: false,
      mutate: (draft) => {
        draft.isolationGateContract.requiredRollbackGates = [];
      },
    },
  ];
  return fixtures.map((fixture) => {
    const draft = clone(contract);
    fixture.mutate?.(draft);
    const blockers = validateContract(draft).filter(
      (finding) => finding.severity === "blocker",
    ).length;
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
    "# Gustav Admin/Reviewer Delivery Surface V2 Packet",
    "",
    `Run: \`${report.runId}\``,
    "",
    `Status: \`${report.status}\``,
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Target locale: ${report.summary.targetLocale}`,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- Upstream storage/cloud ready: ${report.summary.upstreamStorageCloudReady ? "yes" : "no"}`,
    `- Admin UI Bible present: ${report.summary.adminUiBiblePresent ? "yes" : "no"}`,
    `- Admin surface files scanned: ${report.summary.adminSurfaceFilesScanned}`,
    `- Admin v2 files: ${report.summary.adminV2Files}`,
    `- Admin dedicated French pack console present: ${report.summary.adminDedicatedFrenchPackConsolePresent ? "yes" : "no"}`,
    `- Admin mentions studyTarget: ${report.summary.adminMentionsStudyTarget ? "yes" : "no"}`,
    `- Admin mentions sourceLocale: ${report.summary.adminMentionsSourceLocale ? "yes" : "no"}`,
    `- Admin mentions French: ${report.summary.adminMentionsFrench ? "yes" : "no"}`,
    `- Admin preview/rollback model present: ${report.summary.adminPreviewRollbackModelPresent ? "yes" : "no"}`,
    `- Admin pack/upload candidate files: ${report.summary.adminPackUploadCandidateFiles}`,
    `- Admin reviewer candidate files: ${report.summary.adminReviewerCandidateFiles}`,
    `- Admin import candidate files: ${report.summary.adminImportCandidateFiles}`,
    `- Admin activation candidate files: ${report.summary.adminActivationCandidateFiles}`,
    `- Reviewer artifacts: ${report.summary.reviewerArtifacts}`,
    `- Reviewer JSONL files: ${report.summary.reviewerJsonlFiles}`,
    `- Reviewer TSV files: ${report.summary.reviewerTsvFiles}`,
    `- Row decision template rows: ${report.summary.rowDecisionTemplateRows}`,
    `- AI decision template rows: ${report.summary.aiDecisionTemplateRows}`,
    `- Legacy decision template rows: ${report.summary.legacyDecisionTemplateRows}`,
    `- Reviewer Workflow V2 schema present: ${report.summary.reviewerWorkflowV2SchemaPresent ? "yes" : "no"}`,
    `- Target pack manifest draft present: ${report.summary.targetPackManifestDraftPresent ? "yes" : "no"}`,
    `- Runtime/server contract present: ${report.summary.runtimeServerContractPresent ? "yes" : "no"}`,
    `- Storage/cloud map present: ${report.summary.storageCloudMapPresent ? "yes" : "no"}`,
    `- Runtime slices required: ${report.summary.runtimeSlicesRequired}`,
    `- Runtime cache-key contracts: ${report.summary.runtimeCacheKeyContracts}`,
    `- Required approval fields: ${report.summary.requiredApprovalFields}`,
    `- Required admin gates: ${report.summary.requiredAdminGates}`,
    `- Required reviewer import gates: ${report.summary.requiredReviewerImportGates}`,
    `- Required server preview gates: ${report.summary.requiredServerPreviewGates}`,
    `- Required rollback gates: ${report.summary.requiredRollbackGates}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed ? "yes" : "no"}`,
    `- Firebase upload allowed: ${report.summary.firebaseUploadAllowed ? "yes" : "no"}`,
    `- Reviewer decision import allowed: ${report.summary.reviewerDecisionImportAllowed ? "yes" : "no"}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? "yes" : "no"}`,
    `- Activation approved flags: ${report.summary.activationApprovedFlags}`,
    `- Ready-for-apply open flags: ${report.summary.readyForApplyOpenFlags}`,
    `- Active production blockers: ${report.summary.productionBlockers}`,
    `- Production blocker map items: ${report.summary.productionBlockerMapItems}`,
    `- Resolved production blockers: ${report.summary.resolvedProductionBlockers}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for Reviewer Decision Import V2 dry-run: ${report.summary.readyForReviewerDecisionImportV2DryRun ? "yes" : "no"}`,
    `- Ready for payload shard materialization gate: ${report.summary.readyForPayloadShardMaterializationGate ? "yes" : "no"}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? "yes" : "no"}`,
    `- Ready for apply: ${report.summary.readyForApply ? "yes" : "no"}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    "",
    "## Required Approval Fields",
    "",
  ];
  for (const field of report.contract.deliveryApprovalContract
    .requiredApprovalFields) {
    lines.push(`- \`${field}\``);
  }
  lines.push("", "## Admin Candidate Surfaces", "");
  for (const file of report.contract.adminSurfaceInventory.files) {
    lines.push(
      `- \`${file.path}\`: studyTarget=${file.mentionsStudyTarget}, sourceLocale=${file.mentionsSourceLocale}, French=${file.mentionsFrench}, pack=${file.mentionsCoursePack}, reviewer=${file.mentionsReviewer}, upload=${file.mentionsUpload}, import=${file.mentionsImport}, activation=${file.mentionsActivation}, rollback=${file.mentionsRollback}`,
    );
  }
  lines.push("", "## Production Blockers", "");
  for (const blocker of report.contract.productionBlockerMap) {
    lines.push(
      `- \`${blocker.blockerId}\` (${blocker.area}, ${blocker.status}): ${blocker.evidence} Next: \`${blocker.nextUnblockArtifact}\``,
    );
  }
  lines.push("", "## Probes", "");
  for (const probe of report.probes) {
    lines.push(
      `- \`${probe.id}\`: ${probe.passed ? "pass" : "fail"} (accepted=${probe.accepted}, blockers=${probe.blockers})`,
    );
  }
  lines.push("", "## Findings", "");
  if (report.findings.length === 0) {
    lines.push("- None.");
  } else {
    for (const finding of report.findings) {
      lines.push(
        `- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ""}`,
      );
    }
  }
  lines.push(
    "",
    "## Safety",
    "",
    "- This packet writes only Gustav run artifacts.",
    "- It does not modify admin UI or production app files.",
    "- It does not import reviewer decisions.",
    "- It does not upload to Firebase/server.",
    "- It does not enable runtime downloads or activation.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function main(): void {
  const runArg = argValue("--run");
  const target = argValue("--target") ?? "fr";
  if (!runArg) {
    throw new Error(
      "Usage: npx tsx scripts/gustav_admin_reviewer_delivery_surface_v2_packet.ts --run <run-dir> --target fr",
    );
  }
  if (target !== "fr") {
    throw new Error(
      "P12 admin/reviewer delivery surface V2 is currently scoped to --target fr.",
    );
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, "audits");
  const packDir = path.join(runDir, "pack_candidates", target);
  ensureDir(auditsDir);
  ensureDir(packDir);

  const outContract = path.join(
    packDir,
    "admin_reviewer_delivery_surface_v2.json",
  );
  const outJson = path.join(
    auditsDir,
    "admin_pack_delivery_surface_v2_packet.json",
  );
  const outMd = path.join(
    auditsDir,
    "admin_pack_delivery_surface_v2_packet.md",
  );

  const contract = buildContract(repoRoot, runDir);
  const validationFindings = validateContract(contract);
  const probes = makeProbes(contract);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...validationFindings];
  for (const probe of failedProbes) {
    addFinding(
      findings,
      "blocker",
      "fixture_probe_failed",
      `Fixture probe failed: ${probe.id}.`,
    );
  }
  addFinding(
    findings,
    "info",
    "admin_contract_only",
    "Admin/reviewer delivery surfaces are mapped, but no admin UI, reviewer import, server upload or activation was opened.",
  );
  if (!contract.adminSurfaceInventory.adminDedicatedFrenchPackConsolePresent) {
    addFinding(
      findings,
      "info",
      "dedicated_admin_console_deferred",
      "Dedicated French pack console is still a production blocker, not opened by this packet.",
    );
  }

  const blockers = findings.filter(
    (finding) => finding.severity === "blocker",
  ).length;
  const warnings = findings.filter(
    (finding) => finding.severity === "warning",
  ).length;
  const transitions =
    contract.deliveryApprovalContract.disallowedTransitionsNow;
  const activationApprovedFlags = transitions.activationApproved ? 1 : 0;
  const readyForApplyOpenFlags =
    transitions.readyForApply || transitions.mayModifyProductionAppFiles
      ? 1
      : 0;
  const productionBlockerMapItems = contract.productionBlockerMap.length;
  const activeProductionBlockers = contract.productionBlockerMap.filter(
    (blocker) => blocker.status === "blocked",
  ).length;
  const resolvedProductionBlockers = contract.productionBlockerMap.filter(
    (blocker) => blocker.status === "resolved",
  ).length;
  const resolvedBlockerIds = new Set(
    contract.productionBlockerMap
      .filter((blocker) => blocker.status === "resolved")
      .map((blocker) => blocker.blockerId),
  );
  const readyForPayloadShardMaterializationGate =
    blockers === 0 &&
    resolvedBlockerIds.has(
      "P12-REVIEWER-001-v2-reviewer-decisions-not-llm-official-source-approved",
    ) &&
    resolvedBlockerIds.has(
      "P12-REVIEWER-002-ai-reviewer-decision-import-not-dry-run",
    );
  const readyForGenerationV2 =
    blockers === 0 &&
    contract.upstreamStorageCloudContract.readyForAdminPackDeliverySurfaceV2 &&
    contract.reviewerArtifactInventory.rowDecisionTemplateRows ===
      EXPECTED_ROW_DECISION_ROWS_V2 &&
    contract.reviewerArtifactInventory.aiDecisionTemplateRows >=
      EXPECTED_AI_DECISION_ROWS_V2;

  const report: Report = {
    schemaVersion: "gustav-admin-reviewer-delivery-surface-v2-packet-v0",
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? "BLOCK" : warnings > 0 ? "HOLD" : "PASS",
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      adminUiBible: SOURCE_FILES.adminUiBible,
      adminIndex: SOURCE_FILES.adminIndex,
      adminV2Dir: SOURCE_FILES.adminV2Dir,
      adminPersonalTrainings: SOURCE_FILES.adminPersonalTrainings,
      storageCloudTargetMapV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.storageCloudTargetMapV2Packet),
      ),
      targetPackManifestV2Draft: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.targetPackManifestV2Draft),
      ),
      runtimeServerDeliveryContractV2: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.runtimeServerDeliveryContractV2),
      ),
      storageCloudTargetMapV2: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.storageCloudTargetMapV2),
      ),
      adminPackApprovalImportSchemaV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.adminPackApprovalImportSchemaV2Packet),
      ),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: rel(
        repoRoot,
        runPath(
          runDir,
          SOURCE_FILES.llmOfficialSourcePromotedDecisionFileGenerationV2Packet,
        ),
      ),
      officialSourceContentCoverageV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.officialSourceContentCoverageV2Packet),
      ),
      reviewerDecisionImportV2DryRun: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.reviewerDecisionImportV2DryRun),
      ),
      payloadShardMaterializationChecksumV2Packet: rel(
        repoRoot,
        runPath(
          runDir,
          SOURCE_FILES.payloadShardMaterializationChecksumV2Packet,
        ),
      ),
      serverDeliveryManifestPreviewV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.serverDeliveryManifestPreviewV2Packet),
      ),
      serverPackUploadPolicyV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.serverPackUploadPolicyV2Packet),
      ),
      runtimeCacheIntegrityRollbackV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.runtimeCacheIntegrityRollbackV2Packet),
      ),
      runtimeDownloadActivationGateV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.runtimeDownloadActivationGateV2Packet),
      ),
      runtimeDeliveryEvidenceChainV2Packet: rel(
        repoRoot,
        runPath(runDir, SOURCE_FILES.runtimeDeliveryEvidenceChainV2Packet),
      ),
      reviewerDir: rel(repoRoot, runPath(runDir, SOURCE_FILES.reviewerDir)),
      reviewDecisionImportDryRunScript:
        SOURCE_FILES.reviewDecisionImportDryRunScript,
      reviewDecisionContractScript: SOURCE_FILES.reviewDecisionContractScript,
      reviewerWorkflowV2Script: SOURCE_FILES.reviewerWorkflowV2Script,
      targetPackManifestV2Script: SOURCE_FILES.targetPackManifestV2Script,
    },
    outputs: {
      adminReviewerDeliverySurfaceV2: rel(repoRoot, outContract),
      adminReviewerDeliverySurfaceV2PacketJson: rel(repoRoot, outJson),
      adminReviewerDeliverySurfaceV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      targetLocale: "fr",
      sourceLocales: contract.sourceLocales.length,
      upstreamStorageCloudReady:
        contract.upstreamStorageCloudContract
          .readyForAdminPackDeliverySurfaceV2,
      adminUiBiblePresent: contract.adminSurfaceInventory.adminUiBiblePresent,
      adminSurfaceFilesScanned:
        contract.adminSurfaceInventory.adminSurfaceFilesScanned,
      adminV2Files: contract.adminSurfaceInventory.adminV2Files,
      adminIndexPresent: contract.adminSurfaceInventory.adminIndexPresent,
      adminDedicatedFrenchPackConsolePresent:
        contract.adminSurfaceInventory.adminDedicatedFrenchPackConsolePresent,
      adminMentionsStudyTarget:
        contract.adminSurfaceInventory.adminMentionsStudyTarget,
      adminMentionsSourceLocale:
        contract.adminSurfaceInventory.adminMentionsSourceLocale,
      adminMentionsFrench: contract.adminSurfaceInventory.adminMentionsFrench,
      adminPreviewRollbackModelPresent:
        contract.adminSurfaceInventory.adminPreviewRollbackModelPresent,
      adminPackUploadCandidateFiles:
        contract.adminSurfaceInventory.adminPackUploadCandidates.length,
      adminReviewerCandidateFiles:
        contract.adminSurfaceInventory.adminReviewerCandidates.length,
      adminImportCandidateFiles:
        contract.adminSurfaceInventory.adminImportCandidates.length,
      adminActivationCandidateFiles:
        contract.adminSurfaceInventory.adminActivationCandidates.length,
      reviewerArtifacts: contract.reviewerArtifactInventory.reviewerArtifacts,
      reviewerJsonlFiles: contract.reviewerArtifactInventory.reviewerJsonlFiles,
      reviewerTsvFiles: contract.reviewerArtifactInventory.reviewerTsvFiles,
      rowDecisionTemplateRows:
        contract.reviewerArtifactInventory.rowDecisionTemplateRows,
      aiDecisionTemplateRows:
        contract.reviewerArtifactInventory.aiDecisionTemplateRows,
      legacyDecisionTemplateRows:
        contract.reviewerArtifactInventory.legacyDecisionTemplateRows,
      reviewerWorkflowV2SchemaPresent:
        contract.reviewerArtifactInventory.reviewerWorkflowV2SchemaPresent,
      targetPackManifestDraftPresent:
        contract.packArtifactInventory.targetPackManifestDraftPresent,
      runtimeServerContractPresent:
        contract.packArtifactInventory.runtimeServerContractPresent,
      storageCloudMapPresent:
        contract.packArtifactInventory.storageCloudMapPresent,
      runtimeSlicesRequired:
        contract.packArtifactInventory.runtimeSlicesRequired,
      runtimeCacheKeyContracts:
        contract.packArtifactInventory.runtimeCacheKeyContracts,
      requiredApprovalFields:
        contract.deliveryApprovalContract.requiredApprovalFields.length,
      requiredAdminGates:
        contract.isolationGateContract.requiredAdminGates.length,
      requiredReviewerImportGates:
        contract.isolationGateContract.requiredReviewerImportGates.length,
      requiredServerPreviewGates:
        contract.isolationGateContract.requiredServerPreviewGates.length,
      requiredRollbackGates:
        contract.isolationGateContract.requiredRollbackGates.length,
      serverUploadAllowed: transitions.serverUploadAllowed,
      firebaseUploadAllowed: transitions.firebaseUploadAllowed,
      reviewerDecisionImportAllowed: transitions.reviewerDecisionImportAllowed,
      runtimeDownloadsEnabled: transitions.runtimeDownloadsEnabled,
      activationApprovedFlags,
      readyForApplyOpenFlags,
      productionBlockers: activeProductionBlockers,
      productionBlockerMapItems,
      resolvedProductionBlockers,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      readyForReviewerDecisionImportV2DryRun: blockers === 0,
      readyForPayloadShardMaterializationGate,
      readyForGenerationV2,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    artifactHashes: {
      adminUiBible: sha256(path.join(repoRoot, SOURCE_FILES.adminUiBible)),
      adminIndex: sha256(path.join(repoRoot, SOURCE_FILES.adminIndex)),
      liveAdmin: sha256(path.join(repoRoot, SOURCE_FILES.liveAdmin)),
      reviewDecisionImportDryRunScript: sha256(
        path.join(repoRoot, SOURCE_FILES.reviewDecisionImportDryRunScript),
      ),
      reviewerWorkflowV2Schema: sha256(
        runPath(runDir, SOURCE_FILES.reviewerWorkflowV2Schema),
      ),
      targetPackManifestV2Draft:
        contract.packArtifactInventory.targetPackManifestSha256,
      runtimeServerDeliveryContractV2:
        contract.packArtifactInventory.runtimeServerContractSha256,
      storageCloudTargetMapV2:
        contract.packArtifactInventory.storageCloudMapSha256,
      storageCloudTargetMapV2Packet:
        contract.upstreamStorageCloudContract.sha256,
      adminPackApprovalImportSchemaV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.adminPackApprovalImportSchemaV2Packet),
      ),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: sha256(
        runPath(
          runDir,
          SOURCE_FILES.llmOfficialSourcePromotedDecisionFileGenerationV2Packet,
        ),
      ),
      officialSourceContentCoverageV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.officialSourceContentCoverageV2Packet),
      ),
      reviewerDecisionImportV2DryRun: sha256(
        runPath(runDir, SOURCE_FILES.reviewerDecisionImportV2DryRun),
      ),
      payloadShardMaterializationChecksumV2Packet: sha256(
        runPath(
          runDir,
          SOURCE_FILES.payloadShardMaterializationChecksumV2Packet,
        ),
      ),
      serverDeliveryManifestPreviewV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.serverDeliveryManifestPreviewV2Packet),
      ),
      serverPackUploadPolicyV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.serverPackUploadPolicyV2Packet),
      ),
      runtimeCacheIntegrityRollbackV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.runtimeCacheIntegrityRollbackV2Packet),
      ),
      runtimeDownloadActivationGateV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.runtimeDownloadActivationGateV2Packet),
      ),
      runtimeDeliveryEvidenceChainV2Packet: sha256(
        runPath(runDir, SOURCE_FILES.runtimeDeliveryEvidenceChainV2Packet),
      ),
    },
    contract,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outContract, contract);
  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), "utf8");

  console.log(
    `GUSTAV admin/reviewer delivery surface V2 packet: ${report.status}`,
  );
  console.log(
    `Admin surface files scanned: ${report.summary.adminSurfaceFilesScanned}`,
  );
  console.log(`Reviewer artifacts: ${report.summary.reviewerArtifacts}`);
  console.log(
    `Row decision template rows: ${report.summary.rowDecisionTemplateRows}`,
  );
  console.log(
    `AI decision template rows: ${report.summary.aiDecisionTemplateRows}`,
  );
  console.log(
    `Required approval fields: ${report.summary.requiredApprovalFields}`,
  );
  console.log(
    `Ready for Reviewer Decision Import V2 dry-run: ${report.summary.readyForReviewerDecisionImportV2DryRun ? "yes" : "no"}`,
  );
  console.log(
    `Ready for apply: ${report.summary.readyForApply ? "yes" : "no"}`,
  );
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
