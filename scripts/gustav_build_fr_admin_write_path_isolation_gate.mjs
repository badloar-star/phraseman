import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_admin_write_path_isolation_gate_audit_v1.json');

const INPUTS = {
  adminIndex: path.join(ROOT, 'admin', 'index.html'),
  adminEquivalenceMatrix: path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_v1.json'),
  adminEquivalenceMatrixAudit: path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_audit_v1.json'),
  adminParityIsolationGate: path.join(OUT_DIR, 'fr_admin_parity_isolation_gate_audit_v1.json'),
  serverPackManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_gate_audit_v1.json'),
  runtimeDeliveryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  storageCloudIsolationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json'),
};

const WRITE_CALL_RE = /\b(?:setDoc|updateDoc|addDoc|deleteDoc|runTransaction|writeBatch)\s*\(/g;
const STORAGE_WRITE_RE = /\b(?:getStorage|uploadBytes|uploadString|deleteObject|ref)\s*\(/g;
const OFFICIAL_FR_WRITE_PATTERNS = [
  /course-packs\/fr[\s\S]{0,360}\b(?:setDoc|updateDoc|addDoc|deleteDoc|runTransaction|writeBatch|uploadBytes|uploadString|deleteObject)\s*\(/i,
  /\b(?:setDoc|updateDoc|addDoc|deleteDoc|runTransaction|writeBatch|uploadBytes|uploadString|deleteObject)\s*\([\s\S]{0,360}course-packs\/fr/i,
  /doc\s*\([^)]*['"]course[_-]?packs?['"][\s\S]{0,260}['"]fr['"]/i,
  /collection\s*\([^)]*['"]course[_-]?packs?['"][\s\S]{0,260}['"]fr['"]/i,
  /course-packs\/fr[\s\S]{0,360}(activationApproved\s*:\s*true|runtimeDownloadsEnabled\s*:\s*true|serverUploadAllowed\s*:\s*true)/i,
  /(activationApproved\s*:\s*true|runtimeDownloadsEnabled\s*:\s*true|serverUploadAllowed\s*:\s*true)[\s\S]{0,360}course-packs\/fr/i,
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function countMatches(source, re) {
  return [...source.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))].length;
}

function collectWriteInventory(source) {
  const rows = [];
  for (const match of source.matchAll(WRITE_CALL_RE)) {
    const index = match.index ?? 0;
    const contextStart = Math.max(0, index - 220);
    const contextEnd = Math.min(source.length, index + 420);
    const context = source.slice(contextStart, contextEnd);
    const collectionMatch = context.match(/(?:collection|doc)\s*\([^)]*['"]([a-zA-Z0-9_/-]+)['"]/);
    const collection = collectionMatch?.[1] || '';
    const lower = context.toLowerCase();
    const domain =
      lower.includes('card_packs') ? 'marketplace_card_packs' :
      lower.includes('community_pack') || lower.includes('community_packs') ? 'ugc_community_packs' :
      lower.includes('course-packs/fr') || lower.includes('course_pack') ? 'official_course_pack_candidate' :
      lower.includes('remote_config') ? 'remote_config' :
      lower.includes('app_messages') || lower.includes('global_broadcast_modals') ? 'app_messaging' :
      lower.includes('users') ? 'user_admin' :
      'other_admin';
    rows.push({
      call: match[0].replace(/\s*\($/, ''),
      line: lineNumber(source, index),
      collection,
      domain,
      officialFrenchRisk: domain === 'official_course_pack_candidate',
      sourceLocaleProvenInContext: /sourceLocale/.test(context),
      studyTargetProvenInContext: /studyTarget/.test(context),
      contextHash: crypto.createHash('sha256').update(context).digest('hex'),
    });
  }
  return rows;
}

function main() {
  const generatedAt = new Date().toISOString();
  const adminIndex = readText(INPUTS.adminIndex);
  const matrix = readJson(INPUTS.adminEquivalenceMatrix);
  const matrixAudit = readJson(INPUTS.adminEquivalenceMatrixAudit);
  const adminGate = readJson(INPUTS.adminParityIsolationGate);
  const serverGate = readJson(INPUTS.serverPackManifestGate);
  const runtimeGate = readJson(INPUTS.runtimeDeliveryGate);
  const storageGate = readJson(INPUTS.storageCloudIsolationGate);
  const writeInventory = collectWriteInventory(adminIndex);
  const officialFrenchWriteMatches = OFFICIAL_FR_WRITE_PATTERNS
    .map((pattern) => ({ pattern: String(pattern), count: countMatches(adminIndex, pattern) }))
    .filter((row) => row.count > 0);
  const storageWriteCalls = countMatches(adminIndex, STORAGE_WRITE_RE);
  const cardPackWriteRows = writeInventory.filter((row) => row.domain === 'marketplace_card_packs');
  const ugcWriteRows = writeInventory.filter((row) => row.domain === 'ugc_community_packs');
  const officialCandidateRows = writeInventory.filter((row) => row.domain === 'official_course_pack_candidate');
  const sourceLocaleFutureRequirement = {
    requiredForFutureOfficialFrenchWrites: true,
    requiredSegments: ['studyTarget=fr', 'sourceLocale=ru|uk'],
    deniedSegments: ['uiLocale-as-studyTarget', 'sourceLocale-missing', 'course-packs/fr/uiLocale', 'course-packs/fr/sourceLocale'],
    currentAdminMentionsSourceLocale: adminGate.summary?.adminMentionsSourceLocale === true,
    readOnlyAdminSurfaceProvesSourceLocale: adminGate.summary?.adminMentionsSourceLocale === true &&
      adminGate.summary?.officialFrenchCoursePackSurfaceObserved === true &&
      adminGate.summary?.reviewerDecisionSurfaceObserved === true,
  };

  const checks = {
    upstreamAdminMatrixHold: matrix.status === 'HOLD' && matrix.activationApproved === false,
    upstreamAdminMatrixAuditHold: matrixAudit.status === 'HOLD' && matrixAudit.activationApproved === false,
    upstreamAdminParityGateClosed: adminGate.status === 'HOLD' &&
      adminGate.summary?.adminWritesOpenedByThisGate === false &&
      adminGate.summary?.dangerousOfficialFrenchAdminWrites === 0,
    upstreamServerClosed: serverGate.status === 'HOLD' &&
      serverGate.summary?.serverUploadAllowedEntries === 0 &&
      serverGate.summary?.firebaseUploadAllowedEntries === 0 &&
      serverGate.summary?.runtimeDownloadsEnabledEntries === 0,
    upstreamRuntimeClosed: runtimeGate.status === 'HOLD' &&
      runtimeGate.summary?.runtimeDownloadAllowedRows === 0 &&
      runtimeGate.summary?.activationApprovedRows === 0,
    upstreamStorageClosed: storageGate.status === 'HOLD' &&
      storageGate.summary?.storageMigrationAllowed === false &&
      storageGate.summary?.cloudSyncMigrationAllowed === false,
    cardPackWritesAreMarketplaceOnly: cardPackWriteRows.length > 0 && cardPackWriteRows.every((row) => row.collection === 'card_packs' || row.domain === 'marketplace_card_packs'),
    communityPackWritesAreUgcOnly: ugcWriteRows.length > 0 && ugcWriteRows.every((row) => row.domain === 'ugc_community_packs'),
    officialFrenchWritePatternsAbsent: officialFrenchWriteMatches.length === 0,
    officialCoursePackCandidateRowsAbsent: officialCandidateRows.length === 0,
    storageUploadWritesAbsentFromAdmin: storageWriteCalls === 0,
    sourceLocaleReadOnlySurfaceProvenForFutureOfficialWrites: sourceLocaleFutureRequirement.requiredForFutureOfficialFrenchWrites === true &&
      sourceLocaleFutureRequirement.currentAdminMentionsSourceLocale === true &&
      sourceLocaleFutureRequirement.readOnlyAdminSurfaceProvesSourceLocale === true,
    noActivationUploadImportOpened: matrix.summary?.adminWritesOpened === 0 &&
      matrix.summary?.serverUploadsOpened === 0 &&
      matrix.summary?.reviewerImportsOpened === 0 &&
      matrix.summary?.runtimeDownloadsOpened === 0 &&
      matrix.summary?.activationApprovedRows === 0,
  };
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

  const productionBlockers = [
    {
      blockerId: 'official_fr_write_surface_absent',
      area: 'admin_write_path',
      status: 'blocked',
      evidence: 'No current admin write handler creates or publishes official course-packs/fr objects; future official French write path must be designed and gated.',
      nextUnblockArtifact: 'admin_write_path_isolation_gate_followup_with_explicit_sourceLocale_form',
    },
    ...(sourceLocaleFutureRequirement.readOnlyAdminSurfaceProvesSourceLocale ? [] : [{
      blockerId: 'admin_source_locale_dimension_not_proven',
      area: 'admin_write_path',
      status: 'blocked',
      evidence: 'Current admin gate reports adminMentionsSourceLocale=false; official French writes require sourceLocale=ru|uk.',
      nextUnblockArtifact: 'admin_source_locale_write_contract',
    }]),
  ];

  const audit = {
    schemaVersion: 'gustav-fr-admin-write-path-isolation-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    sourceArtifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [key, rel(filePath)])),
    hashes: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)])),
    summary: {
      writeCallsTotal: writeInventory.length,
      cardPackWriteRows: cardPackWriteRows.length,
      ugcCommunityPackWriteRows: ugcWriteRows.length,
      officialCoursePackCandidateRows: officialCandidateRows.length,
      officialFrenchWritePatternMatches: officialFrenchWriteMatches.reduce((sum, row) => sum + row.count, 0),
      storageUploadWriteCalls: storageWriteCalls,
      sourceLocaleRequiredForFutureOfficialWrites: true,
      adminMentionsSourceLocale: adminGate.summary?.adminMentionsSourceLocale === true,
      productionBlockers: productionBlockers.length,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      blockers: blockers.length,
      warnings: 0,
      adminUiModifiedByThisGate: false,
      adminWritesOpenedByThisGate: false,
      officialFrenchWritesOpened: false,
      reviewerDecisionImportAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    checks,
    sourceLocaleFutureRequirement,
    writeInventorySummary: {
      domains: [...new Set(writeInventory.map((row) => row.domain))].sort(),
      cardPackLines: cardPackWriteRows.map((row) => row.line),
      ugcCommunityPackLines: ugcWriteRows.map((row) => row.line).slice(0, 40),
      officialCoursePackCandidateLines: officialCandidateRows.map((row) => row.line),
      officialFrenchWriteMatches,
    },
    writeInventory,
    productionBlockers,
    blockers,
    nextRequiredGates: [
      'admin_source_locale_write_contract',
      'official_fr_course_pack_admin_status_surface',
      'fr_llm_reviewer_queue_admin_surface',
      'admin_activation_rollback_french_gate',
      'admin_ui_bible_compliance_check',
      'explicit_activation_approval_gate',
    ],
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(AUDIT_PATH, audit);
  console.log(`Gustav French admin write-path isolation gate: ${audit.status}`);
  console.log(`Write calls: ${audit.summary.writeCallsTotal}`);
  console.log(`Official French write matches: ${audit.summary.officialFrenchWritePatternMatches}`);
  console.log(`Production blockers: ${audit.summary.productionBlockers}`);
  console.log(rel(AUDIT_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
