import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_admin_parity_isolation_gate_audit_v1.json');

const SOURCE_PATHS = {
  adminUiBible: path.join(ROOT, 'docs', 'design', 'ADMIN_UI_BIBLE.md'),
  adminParityPlan: path.join(ROOT, 'docs', 'gustav', 'GUSTAV_ADMIN_WEBSITE_PARITY_PLAN.md'),
  adminIndex: path.join(ROOT, 'admin', 'index.html'),
  adminAtlas: path.join(ROOT, 'docs', 'gustav', 'generated', 'admin_parity', 'admin_website_parity_atlas.json'),
  serverPackManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_gate_audit_v1.json'),
  runtimeDeliveryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  storageCloudIsolationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json'),
};

const REQUIRED_ADMIN_PACK_SURFACES = [
  {
    id: 'official_fr_course_pack_status',
    requiredForProduction: true,
    mustRead: ['studyTarget=fr', 'sourceLocale=ru|uk', 'server manifest entries', 'review/audio/runtime gates'],
    mustNotWriteNow: ['serverUploadAllowed', 'firebaseUploadAllowed', 'runtimeDownloadsEnabled', 'activationApproved'],
  },
  {
    id: 'fr_llm_reviewer_queue_status',
    requiredForProduction: true,
    mustRead: ['review queue rows', 'LLM official-source decisions', 'import dry-run status'],
    mustNotWriteNow: ['reviewerDecisionImportAllowed', 'activationApproved'],
  },
  {
    id: 'fr_audio_tts_status',
    requiredForProduction: true,
    mustRead: ['1600 TTS slots', 'audio checksum status', 'server upload readiness'],
    mustNotWriteNow: ['ttsGenerationAllowed', 'serverUploadAllowed'],
  },
  {
    id: 'fr_activation_rollback_control',
    requiredForProduction: true,
    mustRead: ['activationApproved=false', 'rollback plan', 'hash locks'],
    mustNotWriteNow: ['activationApproved', 'readyForApply', 'mayModifyProductionAppFiles'],
  },
  {
    id: 'fr_admin_diagnostics',
    requiredForProduction: true,
    mustRead: ['runtime readiness', 'storage/cloud isolation', 'server delivery status'],
    mustNotWriteNow: ['runtimeDownloadsEnabled', 'storageMigrationAllowed', 'cloudSyncMigrationAllowed'],
  },
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
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function count(source, pattern) {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

function lineOf(source, needle) {
  const index = source.indexOf(needle);
  if (index < 0) return null;
  return source.slice(0, index).split(/\r?\n/).length;
}

function hasAll(source, needles) {
  return needles.every((needle) => source.includes(needle));
}

function openFlagCountFromJsonString(jsonText) {
  return [
    '"serverUploadAllowed": true',
    '"firebaseUploadAllowed": true',
    '"downloadablePacksPublished": true',
    '"runtimeDownloadsEnabled": true',
    '"activationApproved": true',
    '"readyForApply": true',
    '"mayModifyProductionAppFiles": true',
    '"storageMigrationAllowed": true',
    '"cloudSyncMigrationAllowed": true',
  ].reduce((sum, marker) => sum + (jsonText.includes(marker) ? 1 : 0), 0);
}

function main() {
  const generatedAt = new Date().toISOString();
  const adminUiBible = readText(SOURCE_PATHS.adminUiBible);
  const adminPlan = readText(SOURCE_PATHS.adminParityPlan);
  const adminIndex = readText(SOURCE_PATHS.adminIndex);
  const atlas = readJson(SOURCE_PATHS.adminAtlas);
  const serverGate = readJson(SOURCE_PATHS.serverPackManifestGate);
  const runtimeGate = readJson(SOURCE_PATHS.runtimeDeliveryGate);
  const storageGate = readJson(SOURCE_PATHS.storageCloudIsolationGate);

  const blockers = [];
  const warnings = [];
  const productionBlockers = [];

  const adminIndexSha = sha256Text(adminIndex);
  const atlasMatchesCurrentAdmin = atlas.adminIndexSha256 === adminIndexSha;
  const adminMentions = {
    studyTarget: adminIndex.includes('studyTarget'),
    sourceLocale: adminIndex.includes('sourceLocale'),
    frenchOption: /<option\s+value=["']fr["'][^>]*>French/i.test(adminIndex),
    cpStudyTargetId: adminIndex.includes('cpStudyTargetId'),
    studyTargetFrLabel: adminIndex.includes('studyTarget: FR'),
    cardPackPreviewPassesStudyTarget: adminIndex.includes('openCpPackPreviewFromPayload') && adminIndex.includes('studyTarget: p.studyTarget'),
    officialCoursePackPath: /course-packs\/fr|course_pack_manifest|course-pack|downloadable pack/i.test(adminIndex),
    reviewerDecisionPath: /fr_lesson_llm_review|reviewer_decision|official-source reviewer|LLM official/i.test(adminIndex),
    activationApprovalPath: /activationApproved|readyForApply|rollback/i.test(adminIndex),
  };
  const adminEvidence = {
    frenchOptionLine: lineOf(adminIndex, '<option value="fr">French'),
    cpStudyTargetIdLine: lineOf(adminIndex, 'function cpStudyTargetId'),
    studyTargetFrLabelLine: lineOf(adminIndex, 'studyTarget: FR'),
    cardPackPreviewLine: lineOf(adminIndex, 'openCpPackPreviewFromPayload'),
    cardPackStatusToggleWrites: count(adminIndex, /toggleCardPackStatus/g),
    communityPackWrites: count(adminIndex, /communityAdminModeratePack|communityModerateSubmission|community_pack/g),
  };

  const dangerousOfficialFrenchAdminWrites = [
    /course-packs\/fr[\s\S]{0,240}\b(setDoc|updateDoc|addDoc|deleteDoc|runTransaction|writeBatch|uploadBytes|uploadString|deleteObject)\s*\(/i,
    /\b(setDoc|updateDoc|addDoc|deleteDoc|runTransaction|writeBatch|uploadBytes|uploadString|deleteObject)\s*\([\s\S]{0,240}course-packs\/fr/i,
    /course-packs\/fr[\s\S]{0,240}(activationApproved\s*:\s*true|runtimeDownloadsEnabled\s*:\s*true|serverUploadAllowed\s*:\s*true)/i,
    /(activationApproved\s*:\s*true|runtimeDownloadsEnabled\s*:\s*true|serverUploadAllowed\s*:\s*true)[\s\S]{0,240}course-packs\/fr/i,
  ].filter((pattern) => pattern.test(adminIndex)).length;

  const checks = {
    adminUiBiblePresent: adminUiBible.includes('Админка Phraseman должна быть') && adminUiBible.includes('Сначала безопасный черновик'),
    adminParityPlanRequiresFrenchMapping: adminPlan.includes('French remains `HOLD` until all rows are mapped'),
    adminAtlasCurrent: atlasMatchesCurrentAdmin,
    adminAtlasHoldsActivation: atlas.status === 'HOLD' && atlas.activationApproved === false,
    adminAtlasHasLearningSurfaces: atlas.summary?.learningRelevantSectionCount > 0 && atlas.summary?.learningRelevantButtonCount > 0,
    adminMentionsStudyTarget: adminMentions.studyTarget,
    adminMentionsFrenchOption: adminMentions.frenchOption,
    adminCardPackPreviewIsTargetAware: adminMentions.cpStudyTargetId && adminMentions.studyTargetFrLabel && adminMentions.cardPackPreviewPassesStudyTarget,
    noOfficialFrenchAdminWritesOpened: dangerousOfficialFrenchAdminWrites === 0,
    serverGateClosed: serverGate.status === 'HOLD' &&
      serverGate.summary?.serverUploadAllowedEntries === 0 &&
      serverGate.summary?.runtimeDownloadsEnabledEntries === 0 &&
      serverGate.summary?.activationApprovedEntries === 0,
    runtimeGateClosed: runtimeGate.status === 'HOLD' &&
      runtimeGate.summary?.runtimeDownloadAllowedRows === 0 &&
      runtimeGate.summary?.activationApprovedRows === 0 &&
      runtimeGate.summary?.readyForApply === false,
    storageGateClosed: storageGate.status === 'HOLD' &&
      storageGate.summary?.storageMigrationAllowed === false &&
      storageGate.summary?.cloudSyncMigrationAllowed === false &&
      storageGate.summary?.readyForApply === false,
  };

  for (const [name, ok] of Object.entries(checks)) {
    if (!ok) blockers.push(name);
  }

  const upstreamJsonText = [
    JSON.stringify(serverGate),
    JSON.stringify(runtimeGate),
    JSON.stringify(storageGate),
  ].join('\n');
  const upstreamOpenFlags = openFlagCountFromJsonString(upstreamJsonText);
  if (upstreamOpenFlags > 0) blockers.push(`upstream_open_flags_${upstreamOpenFlags}`);

  for (const surface of REQUIRED_ADMIN_PACK_SURFACES) {
    const observed =
      surface.id === 'official_fr_course_pack_status' ? adminMentions.officialCoursePackPath :
      surface.id === 'fr_llm_reviewer_queue_status' ? adminMentions.reviewerDecisionPath :
      surface.id === 'fr_audio_tts_status' ? /tts|audio checksum|audio manifest/i.test(adminIndex) :
      surface.id === 'fr_activation_rollback_control' ? adminMentions.activationApprovalPath :
      surface.id === 'fr_admin_diagnostics' ? hasAll(adminIndex, ['studyTarget', 'sourceLocale', 'French']) : false;
    const status = observed ? 'observed_generic_or_partial' : 'missing_or_not_proven';
    if (status !== 'observed_generic_or_partial') {
      productionBlockers.push({
        blockerId: `${surface.id}_not_ready`,
        area: 'admin',
        status: 'blocked',
        evidence: 'Current admin surface does not prove this French official language-pack workflow.',
        nextUnblockArtifact: 'admin_french_target_equivalence_matrix',
      });
    }
  }

  if (adminMentions.officialCoursePackPath) {
    warnings.push('admin mentions course-pack/downloadable concepts; official French writes still require a dedicated write-path isolation gate');
  }
  if (adminEvidence.cardPackStatusToggleWrites > 0) {
    warnings.push('card_packs publish/unpublish controls exist and are marketplace controls, not French official course-pack activation approval');
  }
  if (adminEvidence.communityPackWrites > 0) {
    warnings.push('community pack moderation controls exist and must stay separate from official French language-pack delivery');
  }
  if (!adminMentions.sourceLocale) {
    productionBlockers.push({
      blockerId: 'admin_source_locale_dimension_not_proven',
      area: 'admin',
      status: 'blocked',
      evidence: 'Current admin surface mentions studyTarget but does not prove sourceLocale=ru|uk handling for French server/reviewer workflows.',
      nextUnblockArtifact: 'admin_write_path_isolation_gate',
    });
  }

  const surfaceMatrix = REQUIRED_ADMIN_PACK_SURFACES.map((surface) => {
    const observed =
      surface.id === 'official_fr_course_pack_status' ? adminMentions.officialCoursePackPath :
      surface.id === 'fr_llm_reviewer_queue_status' ? adminMentions.reviewerDecisionPath :
      surface.id === 'fr_audio_tts_status' ? /tts|audio checksum|audio manifest/i.test(adminIndex) :
      surface.id === 'fr_activation_rollback_control' ? adminMentions.activationApprovalPath :
      surface.id === 'fr_admin_diagnostics' ? hasAll(adminIndex, ['studyTarget', 'sourceLocale', 'French']) : false;
    return {
      ...surface,
      observedInCurrentAdmin: observed,
      frenchSupportStatus: observed ? 'partial_or_generic_target_aware' : 'missing_or_not_proven',
      activationAllowedNow: false,
      writeAllowedNow: false,
      uploadAllowedNow: false,
      requiredBeforeProduction: [
        'admin_french_target_equivalence_matrix row accepted',
        'admin_write_path_isolation_gate PASS',
        'admin_activation_rollback_french_gate PASS',
        'explicit activation approval gate PASS',
      ],
    };
  });

  const audit = {
    schemaVersion: 'gustav-fr-admin-parity-isolation-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    sourceArtifacts: Object.fromEntries(
      Object.entries(SOURCE_PATHS).map(([key, filePath]) => [key, rel(filePath)]),
    ),
    hashes: Object.fromEntries(
      Object.entries(SOURCE_PATHS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)]),
    ),
    summary: {
      atlasLearningRelevantSections: atlas.summary?.learningRelevantSectionCount || 0,
      atlasLearningRelevantButtons: atlas.summary?.learningRelevantButtonCount || 0,
      atlasFrenchMentionSections: atlas.summary?.frenchMentionSectionCount || 0,
      atlasEnglishMentionSections: atlas.summary?.englishMentionSectionCount || 0,
      adminMentionsStudyTarget: adminMentions.studyTarget,
      adminMentionsSourceLocale: adminMentions.sourceLocale,
      adminMentionsFrenchOption: adminMentions.frenchOption,
      adminCardPackPreviewIsTargetAware: checks.adminCardPackPreviewIsTargetAware,
      officialFrenchCoursePackSurfaceObserved: adminMentions.officialCoursePackPath,
      reviewerDecisionSurfaceObserved: adminMentions.reviewerDecisionPath,
      activationRollbackSurfaceObserved: adminMentions.activationApprovalPath,
      dangerousOfficialFrenchAdminWrites,
      upstreamOpenFlags,
      requiredOfficialFrenchAdminSurfaces: REQUIRED_ADMIN_PACK_SURFACES.length,
      observedOfficialFrenchAdminSurfaces: surfaceMatrix.filter((row) => row.observedInCurrentAdmin).length,
      missingOfficialFrenchAdminSurfaces: surfaceMatrix.filter((row) => !row.observedInCurrentAdmin).length,
      productionBlockers: productionBlockers.length,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      blockers: blockers.length,
      warnings: warnings.length,
      adminUiModifiedByThisGate: false,
      adminWritesOpenedByThisGate: false,
      reviewerDecisionImportAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    checks,
    adminEvidence,
    surfaceMatrix,
    productionBlockers,
    blockers,
    warnings,
    nextRequiredGates: [
      'admin_french_target_equivalence_matrix',
      'admin_write_path_isolation_gate',
      'admin_activation_rollback_french_gate',
      'admin_reviewer_queue_parity_gate',
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
  console.log(`Gustav French admin parity/isolation gate: ${audit.status}`);
  console.log(`Checks: ${audit.summary.checksPassed}/${audit.summary.checksTotal}`);
  console.log(`Production blockers: ${productionBlockers.length}`);
  console.log(`Ready for apply: no`);
  console.log(rel(AUDIT_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
