import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const UPLOAD_EVIDENCE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const RUNTIME_DELIVERY_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');

const GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const MD_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const EXPECTED_SURFACES = ['lesson', 'audio_metadata'];
const DENIED_CACHE_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];

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

function buildExpectedCacheKey(entry) {
  return [
    entry.studyTarget,
    entry.sourceLocale,
    entry.surface,
    entry.schemaVersion,
    entry.contentVersion,
    String(entry.localArtifactSha256 || '').toLowerCase(),
  ].join('/');
}

function surfaceDeclaredInApp(surface, manifestSource) {
  return new RegExp(`['"]${surface}['"]`).test(manifestSource);
}

function inspectEntry(entry, manifestSource) {
  const cacheKey = buildExpectedCacheKey(entry);
  const segments = cacheKey.split('/');
  const deniedTokenHits = DENIED_CACHE_TOKENS.filter((token) => cacheKey.includes(token));
  const cacheKeyDimensions = {
    studyTarget: segments[0],
    sourceLocale: segments[1],
    surface: segments[2],
    schemaVersion: segments[3],
    contentVersion: segments[4],
    sha256: segments[5],
  };
  const appSurfaceDeclared = surfaceDeclaredInApp(entry.surface, manifestSource);
  const cacheKeyMatchesManifestDimensions =
    cacheKeyDimensions.studyTarget === entry.studyTarget &&
    cacheKeyDimensions.sourceLocale === entry.sourceLocale &&
    cacheKeyDimensions.surface === entry.surface &&
    cacheKeyDimensions.schemaVersion === entry.schemaVersion &&
    cacheKeyDimensions.contentVersion === entry.contentVersion &&
    cacheKeyDimensions.sha256 === String(entry.localArtifactSha256 || '').toLowerCase();
  const sourceLocaleScoped = entry.studyTarget === 'fr' && SOURCE_LOCALES.includes(entry.sourceLocale);
  const serverPathSourceScoped =
    typeof entry.serverPath === 'string' &&
    entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`);

  return {
    entryId: entry.entryId,
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    targetContentLang: entry.targetContentLang,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    appSurfaceDeclared,
    expectedCacheKey: cacheKey,
    cacheKeyDimensions,
    cacheKeyMatchesManifestDimensions,
    cacheKeySegmentCount: segments.length,
    sourceLocaleScoped,
    serverPathSourceScoped,
    deniedTokenHits,
    cacheLookupAllowedNow: false,
    cacheReadAllowedNow: false,
    cacheWriteAllowedNow: false,
    cacheRepairAllowedNow: false,
    offlineCacheReady: false,
    runtimeDownloadAllowedNow: false,
    rollbackCacheInvalidationAllowedNow: false,
    productionApplyApproved: false,
    activationApproved: false,
    blockers: [
      'blocked_pending_upload_evidence_payload_hash_lock_audio_checksums_runtime_index_activation',
    ],
  };
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Runtime Cache Integrity Gate',
    '',
    `Status: ${audit.status}`,
    `Cache rows: ${audit.summary.cacheRows}`,
    `Unique cache keys: ${audit.summary.uniqueCacheKeys}`,
    `Cache write allowed rows: ${audit.summary.cacheWriteAllowedRows}`,
    `Runtime download allowed rows: ${audit.summary.runtimeDownloadAllowedRows}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- cacheWritesStarted: ${audit.safety.cacheWritesStarted}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- rollbackCacheInvalidationAllowed: ${audit.safety.rollbackCacheInvalidationAllowed}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const uploadEvidenceAudit = readJson(UPLOAD_EVIDENCE_AUDIT_PATH);
  const rollbackAudit = readJson(ROLLBACK_AUDIT_PATH);
  const runtimeDeliveryAudit = readJson(RUNTIME_DELIVERY_AUDIT_PATH);
  const manifestSource = readText(COURSE_PACK_MANIFEST_PATH);
  const loaderSource = readText(COURSE_PACK_LOADER_PATH);
  const indexSource = readText(COURSE_PACK_INDEX_PATH);
  const blockers = [];

  if (serverManifest.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1') blockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  if (uploadEvidenceAudit.status !== 'HOLD_UPLOAD_EVIDENCE_MISSING') blockers.push('UPLOAD_EVIDENCE_GATE_NOT_HOLD_MISSING');
  if (rollbackAudit.status !== 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED') blockers.push('ROLLBACK_GATE_NOT_CLOSED_HOLD');
  if (runtimeDeliveryAudit.status !== 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED') blockers.push('RUNTIME_DELIVERY_GATE_NOT_CLOSED_HOLD');
  if (!/buildCoursePackCacheKey\(parts: CoursePackCacheKeyParts\)/.test(manifestSource)) blockers.push('APP_CACHE_KEY_BUILDER_NOT_FOUND');
  if (!/parts\.studyTarget[\s\S]*parts\.sourceLocale[\s\S]*parts\.surface[\s\S]*parts\.schemaVersion[\s\S]*parts\.contentVersion[\s\S]*parts\.sha256\.toLowerCase\(\)/.test(manifestSource)) {
    blockers.push('APP_CACHE_KEY_DIMENSION_ORDER_NOT_PROVEN');
  }
  if (!/COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource)) blockers.push('LEGACY_COURSE_PACK_REMOTE_LOADER_NOT_DISABLED');
  if ((indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length > 0) blockers.push('EMBEDDED_FRENCH_INDEX_ALREADY_EXISTS');

  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  if (entries.length !== 4) blockers.push('EXPECTED_4_SERVER_MANIFEST_ENTRIES');

  for (const locale of SOURCE_LOCALES) {
    for (const surface of EXPECTED_SURFACES) {
      if (!entries.some((entry) => entry.sourceLocale === locale && entry.surface === surface)) {
        blockers.push(`MISSING_SERVER_ENTRY_${locale}_${surface}`);
      }
    }
  }

  const cacheRows = entries.map((entry) => inspectEntry(entry, manifestSource));
  const uniqueCacheKeys = new Set(cacheRows.map((row) => row.expectedCacheKey));
  const duplicateCacheKeys = cacheRows
    .map((row) => row.expectedCacheKey)
    .filter((key, index, all) => all.indexOf(key) !== index);
  if (uniqueCacheKeys.size !== cacheRows.length) blockers.push('CACHE_KEYS_NOT_UNIQUE_PER_SOURCE_LOCALE_SURFACE_SHA');
  if (cacheRows.some((row) => row.cacheKeySegmentCount !== 6)) blockers.push('CACHE_KEY_SEGMENT_COUNT_INVALID');
  if (cacheRows.some((row) => !row.cacheKeyMatchesManifestDimensions)) blockers.push('CACHE_KEY_NOT_MANIFEST_DERIVED');
  if (cacheRows.some((row) => !row.sourceLocaleScoped || !row.serverPathSourceScoped)) blockers.push('CACHE_ROW_NOT_SOURCE_LOCALE_SCOPED');
  if (cacheRows.some((row) => row.deniedTokenHits.length > 0)) blockers.push('CACHE_KEY_CONTAINS_DENIED_TOKEN');

  const uploadEvidenceReady = uploadEvidenceAudit.summary?.uploadEvidenceReady === true;
  const runtimeDeliveryReady = runtimeDeliveryAudit.summary?.readyForRuntimeDelivery === true;
  const rollbackReady = rollbackAudit.summary?.readyForRollbackExecution === true;
  const cacheWriteAllowedRows = cacheRows.filter((row) => row.cacheWriteAllowedNow).length;
  const runtimeDownloadAllowedRows = cacheRows.filter((row) => row.runtimeDownloadAllowedNow).length;
  const rollbackCacheInvalidationAllowedRows = cacheRows.filter((row) => row.rollbackCacheInvalidationAllowedNow).length;
  const activationApprovedRows = cacheRows.filter((row) => row.activationApproved).length;

  const summary = {
    serverManifestEntries: entries.length,
    cacheRows: cacheRows.length,
    uniqueCacheKeys: uniqueCacheKeys.size,
    duplicateCacheKeys,
    sourceLocaleScopedRows: cacheRows.filter((row) => row.sourceLocaleScoped).length,
    serverPathSourceScopedRows: cacheRows.filter((row) => row.serverPathSourceScoped).length,
    appSurfaceDeclaredRows: cacheRows.filter((row) => row.appSurfaceDeclared).length,
    deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length > 0).length,
    uploadEvidenceReady,
    runtimeDeliveryReady,
    rollbackReady,
    cacheLookupAllowedRows: cacheRows.filter((row) => row.cacheLookupAllowedNow).length,
    cacheReadAllowedRows: cacheRows.filter((row) => row.cacheReadAllowedNow).length,
    cacheWriteAllowedRows,
    cacheRepairAllowedRows: cacheRows.filter((row) => row.cacheRepairAllowedNow).length,
    offlineCacheReadyRows: cacheRows.filter((row) => row.offlineCacheReady).length,
    runtimeDownloadAllowedRows,
    rollbackCacheInvalidationAllowedRows,
    activationApprovedRows,
    readyForRuntimeCacheUse: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    activationApproved: false,
  };

  const gate = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-runtime-cache-integrity-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED' : 'BLOCK_RUNTIME_CACHE_INTEGRITY_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      serverUploadEvidenceGateAudit: rel(UPLOAD_EVIDENCE_AUDIT_PATH),
      rollbackManifestGateAudit: rel(ROLLBACK_AUDIT_PATH),
      runtimeDeliveryGateAudit: rel(RUNTIME_DELIVERY_AUDIT_PATH),
      coursePackManifest: rel(COURSE_PACK_MANIFEST_PATH),
      coursePackLoader: rel(COURSE_PACK_LOADER_PATH),
      coursePackIndex: rel(COURSE_PACK_INDEX_PATH),
    },
    cacheKeyContract: {
      appBuilder: 'buildCoursePackCacheKey',
      dimensions: ['studyTarget', 'sourceLocale', 'surface', 'schemaVersion', 'contentVersion', 'sha256'],
      separator: '/',
      requiredStudyTarget: 'fr',
      requiredSourceLocales: SOURCE_LOCALES,
      requiredSurfaces: EXPECTED_SURFACES,
      sha256Lowercase: true,
      deniedCacheKeyTokens: DENIED_CACHE_TOKENS,
      cacheLookupAllowedNow: false,
      cacheReadAllowedNow: false,
      cacheWriteAllowedNow: false,
      cacheRepairAllowedNow: false,
      runtimeDownloadAllowedNow: false,
      rollbackCacheInvalidationAllowedNow: false,
      activationApproved: false,
    },
    cacheRows,
    summary,
    productionBlockers: [
      'UPLOAD_EVIDENCE_FILE_MISSING',
      'PAYLOAD_HASH_LOCK_NOT_READY',
      'AUDIO_CHECKSUMS_NOT_READY',
      'RUNTIME_DELIVERY_CLOSED',
      'RUNTIME_INDEX_ENTRY_NOT_APPROVED',
      'CACHE_WRITES_CLOSED',
      'ROLLBACK_CACHE_INVALIDATION_CLOSED',
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
    safety: {
      readOnly: true,
      appFilesModifiedByThisScript: false,
      cacheWritesStarted: false,
      cacheReadsStarted: false,
      cacheRepairStarted: false,
      runtimeDownloadsEnabled: false,
      rollbackCacheInvalidationAllowed: false,
      firebaseOrServerMutationStarted: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(GATE_PATH, gate);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1',
    generatedAt,
    status: gate.status,
    blockers: blockers.length === 0
      ? ['blocked_pending_upload_evidence_payload_audio_runtime_index_activation']
      : blockers,
    sourceArtifacts: gate.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256File(SERVER_MANIFEST_PATH),
      serverUploadEvidenceGateAuditSha256: sha256File(UPLOAD_EVIDENCE_AUDIT_PATH),
      rollbackManifestGateAuditSha256: sha256File(ROLLBACK_AUDIT_PATH),
      runtimeDeliveryGateAuditSha256: sha256File(RUNTIME_DELIVERY_AUDIT_PATH),
      coursePackManifestSha256: sha256File(COURSE_PACK_MANIFEST_PATH),
      coursePackLoaderSha256: sha256File(COURSE_PACK_LOADER_PATH),
      coursePackIndexSha256: sha256File(COURSE_PACK_INDEX_PATH),
      gateSha256: sha256File(GATE_PATH),
    },
    summary,
    productionBlockers: gate.productionBlockers,
    safety: gate.safety,
    nextRequiredGates: [
      'explicit_activation_receipt_schema_gate',
      'runtime_index_apply_gate_after_upload_evidence',
      'cache_write_enablement_gate_after_runtime_delivery',
      'lesson02_blueprint_rebuild',
    ],
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildRuntimeCacheIntegrityGate = rel(GATE_PATH);
    state.lesson01BlueprintRebuildRuntimeCacheIntegrityGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildRuntimeCacheIntegrityStatus = audit.status;
    state.lesson01BlueprintRebuildRuntimeCacheIntegritySummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 explicit activation receipt schema gate that remains closed until all evidence gates pass.',
      'Create runtime index apply gate template that can only open after upload evidence, cache integrity and activation receipt pass.',
      'Then continue French content with Lesson 2 blueprint-first rebuild instead of expanding placeholder material.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} cacheRows=${summary.cacheRows} uniqueKeys=${summary.uniqueCacheKeys} writes=0 downloads=0 activation=false blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_RUNTIME_CACHE_INTEGRITY_INVALID') process.exitCode = 1;
}

main();
