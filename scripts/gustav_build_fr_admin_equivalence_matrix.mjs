import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');
const MATRIX_PATH = path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_v1.md');

const INPUTS = {
  adminParityIsolationGate: path.join(OUT_DIR, 'fr_admin_parity_isolation_gate_audit_v1.json'),
  adminWebsiteParityAtlas: path.join(ROOT, 'docs', 'gustav', 'generated', 'admin_parity', 'admin_website_parity_atlas.json'),
  adminIndex: path.join(ROOT, 'admin', 'index.html'),
  adminUiBible: path.join(ROOT, 'docs', 'design', 'ADMIN_UI_BIBLE.md'),
  adminParityPlan: path.join(ROOT, 'docs', 'gustav', 'GUSTAV_ADMIN_WEBSITE_PARITY_PLAN.md'),
};

const CLASSIFICATION = {
  TARGET_SPECIFIC: 'target_specific',
  GENERIC_TARGET_AWARE: 'generic_target_aware',
  GLOBAL_ONLY: 'global_only',
  BLOCKED: 'blocked',
};

const SURFACE_REQUIREMENTS = [
  {
    surfaceId: 'official_fr_course_pack_status',
    label: 'Official French course-pack status',
    requiredClassification: CLASSIFICATION.TARGET_SPECIFIC,
    sourceLocaleRequired: true,
    writePathRisk: 'server_upload',
    blockerId: 'official_fr_course_pack_status_not_ready',
    currentEvidenceNeedles: ['course-packs/fr', 'sourceLocale', 'serverUploadAllowed', 'runtimeDownloadsEnabled'],
    requiredAdminCapabilities: [
      'Show source-locale scoped server manifest entries for fr/ru and fr/uk.',
      'Show review/audio/runtime gate status without allowing upload.',
      'Show payload hashes and pack IDs before any publish action.',
    ],
  },
  {
    surfaceId: 'fr_llm_reviewer_queue_status',
    label: 'French LLM reviewer queue status',
    requiredClassification: CLASSIFICATION.TARGET_SPECIFIC,
    sourceLocaleRequired: true,
    writePathRisk: 'reviewer_import',
    blockerId: 'fr_llm_reviewer_queue_status_not_ready',
    currentEvidenceNeedles: ['fr_lesson_llm_review', 'reviewer_decision', 'sourceLocale'],
    requiredAdminCapabilities: [
      'Show 1600 French lesson review requests and decision counts.',
      'Separate RU and UK sourceLocale review/import status.',
      'Keep import disabled until schema gate and import dry-run pass.',
    ],
  },
  {
    surfaceId: 'fr_audio_tts_status',
    label: 'French audio/TTS status',
    requiredClassification: CLASSIFICATION.GENERIC_TARGET_AWARE,
    sourceLocaleRequired: false,
    writePathRisk: 'server_upload',
    blockerId: null,
    currentEvidenceNeedles: ['audio', 'tts', 'French'],
    requiredAdminCapabilities: [
      'Show 1600 future TTS slots and checksum status.',
      'Show that TTS generation/upload is closed until LLM review accepts rows.',
      'Keep audio upload separated from activation approval.',
    ],
  },
  {
    surfaceId: 'fr_activation_rollback_control',
    label: 'French activation and rollback control',
    requiredClassification: CLASSIFICATION.GENERIC_TARGET_AWARE,
    sourceLocaleRequired: true,
    writePathRisk: 'activation',
    blockerId: null,
    currentEvidenceNeedles: ['activationApproved', 'readyForApply', 'rollback'],
    requiredAdminCapabilities: [
      'Require explicit activation approval receipt.',
      'Show hash locks and rollback plan before activation.',
      'Keep activationApproved=false until every gate is PASS.',
    ],
  },
  {
    surfaceId: 'fr_admin_diagnostics',
    label: 'French admin diagnostics',
    requiredClassification: CLASSIFICATION.TARGET_SPECIFIC,
    sourceLocaleRequired: true,
    writePathRisk: 'diagnostics',
    blockerId: 'fr_admin_diagnostics_not_ready',
    currentEvidenceNeedles: ['studyTarget', 'sourceLocale', 'runtime readiness', 'storage/cloud isolation'],
    requiredAdminCapabilities: [
      'Show runtime delivery, storage/cloud isolation and server delivery together.',
      'Expose sourceLocale=ru|uk diagnostics distinctly.',
      'Fail closed when admin sees studyTarget=fr without sourceLocale evidence.',
    ],
  },
  {
    surfaceId: 'admin_source_locale_dimension',
    label: 'Admin sourceLocale dimension',
    requiredClassification: CLASSIFICATION.TARGET_SPECIFIC,
    sourceLocaleRequired: true,
    writePathRisk: 'cross_language_leak',
    blockerId: 'admin_source_locale_dimension_not_proven',
    currentEvidenceNeedles: ['sourceLocale'],
    requiredAdminCapabilities: [
      'Every French official pack/reviewer/admin diagnostic row must carry sourceLocale.',
      'RU and UK reviewer/import/upload state must be rendered as separate rows.',
      'uiLocale must never drive studyTarget or sourceLocale decisions.',
    ],
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
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hasNeedles(source, needles) {
  return needles.filter((needle) => source.includes(needle));
}

function classifySurface(surface, gate, adminIndex) {
  const gateSurface = (gate.surfaceMatrix || []).find((row) => row.id === surface.surfaceId);
  const observedNeedles = hasNeedles(adminIndex, surface.currentEvidenceNeedles);
  const blockedByGate = (gate.productionBlockers || []).some((blocker) => blocker.blockerId === surface.blockerId);
  const sourceLocaleDimensionObserved = surface.surfaceId === 'admin_source_locale_dimension' &&
    adminIndex.includes('sourceLocale=ru|uk') &&
    adminIndex.includes('course-packs/fr/ru/') &&
    adminIndex.includes('course-packs/fr/uk/');
  const observedByGate = !!gateSurface?.observedInCurrentAdmin || sourceLocaleDimensionObserved;
  const sourceLocaleProven = surface.sourceLocaleRequired ? adminIndex.includes('sourceLocale') : true;
  const targetAwareEvidence = [
    gate.summary?.adminMentionsStudyTarget === true ? 'adminMentionsStudyTarget' : null,
    gate.summary?.adminMentionsFrenchOption === true ? 'adminMentionsFrenchOption' : null,
    gate.summary?.adminCardPackPreviewIsTargetAware === true ? 'adminCardPackPreviewIsTargetAware' : null,
    ...observedNeedles,
  ].filter(Boolean);

  let frenchSupportStatus = CLASSIFICATION.BLOCKED;
  if (!blockedByGate && observedByGate && sourceLocaleProven) {
    frenchSupportStatus = surface.requiredClassification === CLASSIFICATION.TARGET_SPECIFIC
      ? CLASSIFICATION.TARGET_SPECIFIC
      : CLASSIFICATION.GENERIC_TARGET_AWARE;
  } else if (!blockedByGate && observedByGate) {
    frenchSupportStatus = CLASSIFICATION.GENERIC_TARGET_AWARE;
  }

  return {
    surfaceId: surface.surfaceId,
    label: surface.label,
    requiredClassification: surface.requiredClassification,
    frenchSupportStatus,
    sourceLocaleRequired: surface.sourceLocaleRequired,
    sourceLocaleProven,
    observedByGate,
    blockedByGate,
    blockerId: surface.blockerId,
    writePathRisk: surface.writePathRisk,
    targetAwareEvidence,
    observedNeedles,
    missingNeedles: surface.currentEvidenceNeedles.filter((needle) => !observedNeedles.includes(needle)),
    requiredAdminCapabilities: surface.requiredAdminCapabilities,
    requiredBeforeProduction: [
      'admin_write_path_isolation_gate PASS',
      'admin_activation_rollback_french_gate PASS',
      'admin_reviewer_queue_parity_gate PASS',
      'admin_ui_bible_compliance_check PASS',
      'explicit_activation_approval_gate PASS',
    ],
    adminWriteAllowedNow: false,
    serverUploadAllowedNow: false,
    reviewerImportAllowedNow: false,
    runtimeDownloadsAllowedNow: false,
    activationAllowedNow: false,
    readyForApply: false,
  };
}

function renderMarkdown(matrix, audit) {
  const lines = [
    '# French Admin Target Equivalence Matrix',
    '',
    `Status: \`${matrix.status}\``,
    '',
    `Study target: \`${matrix.studyTarget}\``,
    '',
    `Source locales: \`${matrix.sourceLocales.join(', ')}\``,
    '',
    '## Summary',
    '',
    `- Rows: ${matrix.summary.rows}`,
    `- Target-specific rows: ${matrix.summary.targetSpecificRows}`,
    `- Generic target-aware rows: ${matrix.summary.genericTargetAwareRows}`,
    `- Blocked rows: ${matrix.summary.blockedRows}`,
    `- Source-locale rows: ${matrix.summary.sourceLocaleRequiredRows}`,
    `- Source-locale proven rows: ${matrix.summary.sourceLocaleProvenRows}`,
    `- Production blockers: ${matrix.summary.productionBlockers}`,
    `- Writes opened: ${matrix.summary.adminWritesOpened}`,
    '',
    '## Rows',
    '',
  ];
  for (const row of matrix.rows) {
    lines.push(`- \`${row.surfaceId}\`: \`${row.frenchSupportStatus}\`; sourceLocale=${row.sourceLocaleProven ? 'proven' : 'missing'}; blocker=${row.blockerId || '-'}`);
  }
  lines.push('', '## Audit', '', `- Audit status: \`${audit.status}\``);
  lines.push(`- Checks: ${audit.summary.checksPassed}/${audit.summary.checksTotal}`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const gate = readJson(INPUTS.adminParityIsolationGate);
  const atlas = readJson(INPUTS.adminWebsiteParityAtlas);
  const adminIndex = readText(INPUTS.adminIndex);
  const adminUiBible = readText(INPUTS.adminUiBible);
  const adminPlan = readText(INPUTS.adminParityPlan);
  const rows = SURFACE_REQUIREMENTS.map((surface) => classifySurface(surface, gate, adminIndex));
  const productionBlockers = rows
    .filter((row) => row.frenchSupportStatus === CLASSIFICATION.BLOCKED || (row.sourceLocaleRequired && !row.sourceLocaleProven))
    .map((row) => ({
      blockerId: row.blockerId || `${row.surfaceId}_equivalence_not_ready`,
      surfaceId: row.surfaceId,
      status: 'blocked',
      reason: row.sourceLocaleRequired && !row.sourceLocaleProven
        ? 'sourceLocale dimension is not proven in current admin UI'
        : 'French admin equivalence is missing or not proven',
      nextUnblockArtifact: row.surfaceId === 'admin_source_locale_dimension'
        ? 'admin_write_path_isolation_gate'
        : 'admin_french_target_equivalence_matrix_v1_followup',
    }));

  const matrix = {
    schemaVersion: 'gustav-admin-french-target-equivalence-matrix-v1',
    generatedAt,
    status: 'HOLD',
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    sourceArtifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [key, rel(filePath)])),
    hashes: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)])),
    summary: {
      rows: rows.length,
      targetSpecificRows: rows.filter((row) => row.frenchSupportStatus === CLASSIFICATION.TARGET_SPECIFIC).length,
      genericTargetAwareRows: rows.filter((row) => row.frenchSupportStatus === CLASSIFICATION.GENERIC_TARGET_AWARE).length,
      globalOnlyRows: rows.filter((row) => row.frenchSupportStatus === CLASSIFICATION.GLOBAL_ONLY).length,
      blockedRows: rows.filter((row) => row.frenchSupportStatus === CLASSIFICATION.BLOCKED).length,
      sourceLocaleRequiredRows: rows.filter((row) => row.sourceLocaleRequired).length,
      sourceLocaleProvenRows: rows.filter((row) => row.sourceLocaleRequired && row.sourceLocaleProven).length,
      productionBlockers: productionBlockers.length,
      adminWritesOpened: 0,
      serverUploadsOpened: 0,
      reviewerImportsOpened: 0,
      runtimeDownloadsOpened: 0,
      activationApprovedRows: 0,
      readyForApplyRows: 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    upstreamGateSummary: gate.summary,
    rows,
    productionBlockers,
    nextRequiredGates: [
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

  const checks = {
    upstreamAdminGateHold: gate.status === 'HOLD' && gate.activationApproved === false,
    atlasHold: atlas.status === 'HOLD' && atlas.activationApproved === false,
    adminUiBibleLoaded: adminUiBible.includes('Админка Phraseman должна быть') && adminUiBible.includes('Сначала безопасный черновик'),
    adminPlanRequiresFrenchHold: adminPlan.includes('French remains `HOLD` until all rows are mapped'),
    rowsCoverRequiredSurfaces: rows.length === SURFACE_REQUIREMENTS.length,
    everyRowStudyTargetClosed: rows.every((row) => row.adminWriteAllowedNow === false && row.activationAllowedNow === false),
    sourceLocaleRequiredRowsProven: rows.filter((row) => row.sourceLocaleRequired && !row.sourceLocaleProven).length === 0,
    officialPackReadOnlySurfaceObserved: rows.some((row) => row.surfaceId === 'official_fr_course_pack_status' && row.frenchSupportStatus === CLASSIFICATION.TARGET_SPECIFIC),
    reviewerQueueReadOnlySurfaceObserved: rows.some((row) => row.surfaceId === 'fr_llm_reviewer_queue_status' && row.frenchSupportStatus === CLASSIFICATION.TARGET_SPECIFIC),
    diagnosticsReadOnlySurfaceObserved: rows.some((row) => row.surfaceId === 'fr_admin_diagnostics' && row.frenchSupportStatus === CLASSIFICATION.TARGET_SPECIFIC),
    noWritesOpened: matrix.summary.adminWritesOpened === 0 &&
      matrix.summary.serverUploadsOpened === 0 &&
      matrix.summary.reviewerImportsOpened === 0 &&
      matrix.summary.runtimeDownloadsOpened === 0 &&
      matrix.summary.activationApprovedRows === 0,
    readyForApplyClosed: matrix.summary.readyForApply === false && matrix.summary.mayModifyProductionAppFiles === false,
  };
  const blockers = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
  const audit = {
    schemaVersion: 'gustav-admin-french-target-equivalence-matrix-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: matrix.sourceArtifacts,
    hashes: matrix.hashes,
    summary: {
      ...matrix.summary,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      blockers: blockers.length,
      warnings: 0,
    },
    checks,
    blockers,
    safety: matrix.safety,
  };

  writeJson(MATRIX_PATH, matrix);
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, renderMarkdown(matrix, audit), 'utf8');
  console.log(`Gustav French admin equivalence matrix: ${audit.status}`);
  console.log(`Rows: ${matrix.summary.rows}`);
  console.log(`Blocked rows: ${matrix.summary.blockedRows}`);
  console.log(`Production blockers: ${matrix.summary.productionBlockers}`);
  console.log(rel(MATRIX_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
