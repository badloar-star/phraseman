import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const MD_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const EXPECTED_SURFACES = ['lesson', 'audio_metadata'];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function hasRuntimeNetworkAccess(loaderSource) {
  return /fetch\s*\(|XMLHttpRequest|firebase|firestore|storage\s*\(|expo-file-system/i.test(loaderSource);
}

function surfaceDeclaredInApp(surface, manifestSource) {
  return new RegExp(`['"]${surface}['"]`).test(manifestSource);
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Runtime Delivery Gate',
    '',
    `Status: ${audit.status}`,
    `Readiness rows: ${audit.summary.readinessRows}`,
    `Runtime allowed rows: ${audit.summary.runtimeDownloadAllowedRows}`,
    `Cache-key allowed rows: ${audit.summary.cacheKeyAllowedRows}`,
    `Activation-approved rows: ${audit.summary.activationApprovedRows}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- appFilesModifiedByThisScript: ${audit.safety.appFilesModifiedByThisScript}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- productionApplyApproved: ${audit.safety.productionApplyApproved}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const serverGate = readJson(SERVER_GATE_AUDIT_PATH);
  const loaderSource = readText(COURSE_PACK_LOADER_PATH);
  const indexSource = readText(COURSE_PACK_INDEX_PATH);
  const manifestSource = readText(COURSE_PACK_MANIFEST_PATH);
  const studyTargetSource = readText(STUDY_TARGET_PATH);
  const blockers = [];
  const warnings = [];

  if (serverManifest.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1') blockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  if (serverGate.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-gate-audit-v1') blockers.push('SERVER_GATE_SCHEMA_MISMATCH');
  if (serverGate.status !== 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED') blockers.push('SERVER_GATE_NOT_UPLOAD_CLOSED_HOLD');
  if (!Array.isArray(serverManifest.entries) || serverManifest.entries.length !== 4) blockers.push('EXPECTED_4_SERVER_MANIFEST_ENTRIES');

  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const loaderHasNetworkAccess = hasRuntimeNetworkAccess(loaderSource);
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);

  if (!legacyRemoteLoaderDisabled) blockers.push('LEGACY_COURSE_PACK_REMOTE_LOADER_NOT_PROVEN_DISABLED');
  if (embeddedFrenchIndexEntries > 0) blockers.push('EMBEDDED_INDEX_ALREADY_HAS_FRENCH_ENTRIES');
  if (loaderHasNetworkAccess) blockers.push('COURSE_PACK_LOADER_HAS_DIRECT_NETWORK_ACCESS');
  if (!productionStudyTargetsAreEnglishOnly) blockers.push('PRODUCTION_STUDY_TARGETS_NOT_ENGLISH_ONLY');
  if (!internalFrenchDeclared) warnings.push('INTERNAL_FRENCH_STUDY_TARGET_NOT_DECLARED');

  for (const surface of EXPECTED_SURFACES) {
    if (!surfaceDeclaredInApp(surface, manifestSource)) blockers.push(`APP_SURFACE_NOT_DECLARED_${surface}`);
  }

  const openServerEntries = serverManifest.entries.filter((entry) =>
    entry.serverUploadAllowed ||
    entry.firebaseUploadAllowed ||
    entry.downloadablePacksPublished ||
    entry.runtimeDownloadsEnabled ||
    entry.productionApplyApproved ||
    entry.activationApproved,
  );

  if (openServerEntries.length > 0) blockers.push(`SERVER_ENTRIES_OPENED_BEFORE_RUNTIME_GATE_${openServerEntries.length}`);

  const readinessMatrix = serverManifest.entries.map((entry) => ({
    studyTarget: entry.studyTarget,
    targetContentLang: entry.targetContentLang,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    selectionConfirmed: true,
    appSurfaceDeclared: surfaceDeclaredInApp(entry.surface, manifestSource),
    serverPath: entry.serverPath,
    expectedReadinessState: 'missing',
    expectedReadinessReason: 'no_index_entry',
    serverUploadEvidenceRequired: true,
    serverUploadEvidenceReady: false,
    runtimeIndexEntryAllowedNow: false,
    cacheKeyAllowedNow: false,
    runtimeDownloadAllowedNow: false,
    productionApplyApproved: false,
    activationApproved: false,
    blockers: ['blocked_pending_server_upload_evidence_runtime_index_activation'],
  }));

  for (const locale of SOURCE_LOCALES) {
    for (const surface of EXPECTED_SURFACES) {
      if (!readinessMatrix.some((row) => row.sourceLocale === locale && row.surface === surface)) {
        blockers.push(`MISSING_READINESS_ROW_${locale}_${surface}`);
      }
    }
  }

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-runtime-delivery-gate-audit-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED' : 'BLOCK_RUNTIME_DELIVERY_DRY_RUN_INVALID',
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      serverManifestGate: rel(SERVER_GATE_AUDIT_PATH),
      coursePackLoader: rel(COURSE_PACK_LOADER_PATH),
      coursePackIndex: rel(COURSE_PACK_INDEX_PATH),
      coursePackManifest: rel(COURSE_PACK_MANIFEST_PATH),
      studyTarget: rel(STUDY_TARGET_PATH),
    },
    hashes: {
      serverManifestSha256: sha256File(SERVER_MANIFEST_PATH),
      serverManifestGateSha256: sha256File(SERVER_GATE_AUDIT_PATH),
      coursePackLoaderSha256: sha256File(COURSE_PACK_LOADER_PATH),
      coursePackIndexSha256: sha256File(COURSE_PACK_INDEX_PATH),
      coursePackManifestSha256: sha256File(COURSE_PACK_MANIFEST_PATH),
      studyTargetSha256: sha256File(STUDY_TARGET_PATH),
    },
    summary: {
      serverManifestEntries: serverManifest.entries?.length || 0,
      sourceLocaleScopedEntries: serverManifest.entries?.filter((entry) => entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/`)).length || 0,
      openServerManifestEntries: openServerEntries.length,
      readinessRows: readinessMatrix.length,
      appKnownRuntimeSurfaceRows: readinessMatrix.filter((row) => row.appSurfaceDeclared).length,
      embeddedFrenchIndexEntries,
      legacyRemoteLoaderDisabled,
      loaderHasNetworkAccess,
      productionStudyTargetsAreEnglishOnly,
      internalFrenchDeclared,
      serverUploadEvidenceReadyRows: readinessMatrix.filter((row) => row.serverUploadEvidenceReady).length,
      runtimeIndexEntryAllowedRows: readinessMatrix.filter((row) => row.runtimeIndexEntryAllowedNow).length,
      cacheKeyAllowedRows: readinessMatrix.filter((row) => row.cacheKeyAllowedNow).length,
      runtimeDownloadAllowedRows: readinessMatrix.filter((row) => row.runtimeDownloadAllowedNow).length,
      productionApplyApprovedRows: readinessMatrix.filter((row) => row.productionApplyApproved).length,
      activationApprovedRows: readinessMatrix.filter((row) => row.activationApproved).length,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      activationApproved: false,
    },
    readinessMatrix,
    blockers: blockers.length === 0 ? ['blocked_pending_server_upload_evidence_runtime_index_activation'] : blockers,
    warnings,
    productionBlockers: [
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_INDEX_ENTRY_NOT_APPROVED',
      'CACHE_KEYS_NOT_ALLOWED',
      'RUNTIME_DOWNLOADS_DISABLED',
      'EXPLICIT_ACTIVATION_APPROVAL_NOT_GRANTED',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: {
      dryRunOnly: true,
      appFilesModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeIndexEntriesWritten: false,
      cacheKeysWritten: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildRuntimeDeliveryGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildRuntimeDeliveryStatus = audit.status;
    state.lesson01BlueprintRebuildRuntimeDeliverySummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 payload materialization/hash-lock gate that remains closed until audio checksums exist.',
      'Create Lesson 1 rollback manifest draft gate.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} readiness=${readinessMatrix.length} downloads=0 activation=false blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_RUNTIME_DELIVERY_DRY_RUN_INVALID') process.exitCode = 1;
}

main();
