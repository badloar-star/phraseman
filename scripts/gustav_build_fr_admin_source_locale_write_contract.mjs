import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');
const CONTRACT_PATH = path.join(OUT_DIR, 'admin_source_locale_write_contract_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'admin_source_locale_write_contract_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'admin_source_locale_write_contract_v1.md');

const INPUTS = {
  adminIndex: path.join(ROOT, 'admin', 'index.html'),
  adminWritePathIsolationGate: path.join(OUT_DIR, 'fr_admin_write_path_isolation_gate_audit_v1.json'),
  adminEquivalenceMatrix: path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_v1.json'),
  serverPackManifest: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_v1.json'),
  serverPackManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_gate_audit_v1.json'),
  runtimeDeliveryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  storageCloudIsolationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json'),
};

const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACES = ['lesson', 'audio_metadata'];
const ALLOWED_PREFIXES = ['course-packs/fr/ru/', 'course-packs/fr/uk/'];
const DENIED_PREFIXES = ['course-packs/en/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', 'course-packs/fr/*/../../'];

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

function isAllowedAdminWriteCandidate(candidate) {
  const errors = [];
  if (candidate.studyTarget !== 'fr') errors.push('studyTarget must be fr');
  if (!SOURCE_LOCALES.includes(candidate.sourceLocale)) errors.push('sourceLocale must be ru|uk');
  if (!SURFACES.includes(candidate.surface)) errors.push('surface must be an approved French server-pack surface');
  if (candidate.uiLocale && candidate.uiLocale === candidate.sourceLocale) {
    errors.push('uiLocale must not be used as sourceLocale evidence');
  }
  if (typeof candidate.serverPath !== 'string') errors.push('serverPath must be a string');
  const expectedPrefix = `course-packs/fr/${candidate.sourceLocale}/${candidate.surface}/`;
  if (typeof candidate.serverPath === 'string' && !candidate.serverPath.startsWith(expectedPrefix)) {
    errors.push(`serverPath must start with ${expectedPrefix}`);
  }
  if (typeof candidate.serverPath === 'string') {
    for (const denied of ['course-packs/en/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', '..']) {
      if (candidate.serverPath.includes(denied)) errors.push(`serverPath contains denied segment ${denied}`);
    }
  }
  if (candidate.serverUploadAllowed !== false) errors.push('serverUploadAllowed must remain false until upload gate PASS');
  if (candidate.firebaseUploadAllowed !== false) errors.push('firebaseUploadAllowed must remain false until upload gate PASS');
  if (candidate.reviewerDecisionImportAllowed !== false) errors.push('reviewerDecisionImportAllowed must remain false until import gate PASS');
  if (candidate.runtimeDownloadsEnabled !== false) errors.push('runtimeDownloadsEnabled must remain false until runtime gate PASS');
  if (candidate.activationApproved !== false) errors.push('activationApproved must remain false until explicit activation gate PASS');
  if (candidate.readyForApply !== false) errors.push('readyForApply must remain false until apply gate PASS');
  return { accepted: errors.length === 0, errors };
}

function makeProbes() {
  const base = {
    studyTarget: 'fr',
    sourceLocale: 'ru',
    uiLocale: 'ru',
    surface: 'lesson',
    serverPath: 'course-packs/fr/ru/lesson/fr-lessons-core32-v1.pending/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json',
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    reviewerDecisionImportAllowed: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForApply: false,
  };
  const fixtures = [
    { id: 'canonical_ru_lesson_closed_candidate_accepts', expectedAccept: true, mutate: (draft) => { draft.uiLocale = 'uk'; } },
    { id: 'canonical_uk_audio_closed_candidate_accepts', expectedAccept: true, mutate: (draft) => { draft.sourceLocale = 'uk'; draft.uiLocale = 'ru'; draft.surface = 'audio_metadata'; draft.serverPath = 'course-packs/fr/uk/audio_metadata/fr-lessons-core32-v1.pending/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.json'; } },
    { id: 'missing_source_locale_rejected', expectedAccept: false, mutate: (draft) => { delete draft.sourceLocale; } },
    { id: 'unsupported_source_locale_rejected', expectedAccept: false, mutate: (draft) => { draft.sourceLocale = 'es'; draft.serverPath = 'course-packs/fr/es/lesson/x/hash.json'; } },
    { id: 'ui_locale_path_rejected', expectedAccept: false, mutate: (draft) => { draft.serverPath = 'course-packs/fr/uiLocale/lesson/x/hash.json'; } },
    { id: 'source_locale_literal_path_rejected', expectedAccept: false, mutate: (draft) => { draft.serverPath = 'course-packs/fr/sourceLocale/lesson/x/hash.json'; } },
    { id: 'english_path_rejected', expectedAccept: false, mutate: (draft) => { draft.studyTarget = 'en'; draft.serverPath = 'course-packs/en/ru/lesson/x/hash.json'; } },
    { id: 'path_traversal_rejected', expectedAccept: false, mutate: (draft) => { draft.serverPath = 'course-packs/fr/ru/lesson/../../rogue.json'; } },
    { id: 'upload_open_rejected', expectedAccept: false, mutate: (draft) => { draft.serverUploadAllowed = true; } },
    { id: 'runtime_open_rejected', expectedAccept: false, mutate: (draft) => { draft.runtimeDownloadsEnabled = true; } },
    { id: 'activation_open_rejected', expectedAccept: false, mutate: (draft) => { draft.activationApproved = true; } },
  ];
  return fixtures.map((fixture) => {
    const draft = { ...base };
    fixture.mutate?.(draft);
    const result = isAllowedAdminWriteCandidate(draft);
    return {
      id: fixture.id,
      expectedAccept: fixture.expectedAccept,
      accepted: result.accepted,
      passed: result.accepted === fixture.expectedAccept,
      errors: result.errors,
    };
  });
}

function renderMarkdown(contract, audit) {
  return [
    '# Admin SourceLocale Write Contract',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Study target: \`${contract.studyTarget}\``,
    '',
    `Source locales: \`${contract.sourceLocales.join(', ')}\``,
    '',
    '## Allowed Prefixes',
    '',
    ...contract.allowedStoragePathPrefixes.map((prefix) => `- \`${prefix}\``),
    '',
    '## Denied Prefixes',
    '',
    ...contract.deniedStoragePathPrefixes.map((prefix) => `- \`${prefix}\``),
    '',
    '## Closed Flags',
    '',
    ...Object.entries(contract.disallowedTransitionsNow).map(([key, value]) => `- \`${key}\`: \`${value}\``),
    '',
    '## Probe Summary',
    '',
    `- Passed: ${audit.summary.fixtureProbesPassed}/${audit.summary.fixtureProbes}`,
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const adminIndex = readText(INPUTS.adminIndex);
  const writeGate = readJson(INPUTS.adminWritePathIsolationGate);
  const matrix = readJson(INPUTS.adminEquivalenceMatrix);
  const manifest = readJson(INPUTS.serverPackManifest);
  const serverGate = readJson(INPUTS.serverPackManifestGate);
  const runtimeGate = readJson(INPUTS.runtimeDeliveryGate);
  const storageGate = readJson(INPUTS.storageCloudIsolationGate);
  const probes = makeProbes();
  const contract = {
    schemaVersion: 'gustav-admin-source-locale-write-contract-v1',
    generatedAt,
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: SOURCE_LOCALES,
    surfaces: SURFACES,
    allowedStoragePathPrefixes: ALLOWED_PREFIXES,
    deniedStoragePathPrefixes: DENIED_PREFIXES,
    identityRules: [
      'Admin official French write candidates must include studyTarget=fr.',
      'Admin official French write candidates must include sourceLocale in ru|uk.',
      'uiLocale is display language only and must not drive studyTarget, sourceLocale, serverPath, upload or activation.',
      'serverPath must start with course-packs/fr/<sourceLocale>/<surface>/',
      'sourceLocale must be a concrete value, not the literal path segment sourceLocale.',
    ],
    disallowedTransitionsNow: {
      adminOfficialWriteAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      reviewerDecisionImportAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
    },
    requiredBeforeAnyFutureWrite: [
      'llm_review_decision_schema_gate PASS',
      'review_decision_import_dry_run_gate PASS',
      'audio_tts_generation_and_checksum_gate PASS',
      'server_pack_upload_policy_gate PASS',
      'admin_write_path_isolation_gate PASS',
      'admin_activation_rollback_french_gate PASS',
      'explicit_activation_approval_gate PASS',
    ],
  };

  const checks = {
    upstreamWriteGateHold: writeGate.status === 'HOLD' && writeGate.activationApproved === false,
    upstreamWriteGateOfficialWritesAbsent: writeGate.summary?.officialCoursePackCandidateRows === 0 &&
      writeGate.summary?.officialFrenchWritePatternMatches === 0 &&
      writeGate.summary?.storageUploadWriteCalls === 0,
    upstreamMatrixHold: matrix.status === 'HOLD' && matrix.activationApproved === false,
    serverManifestPolicyMatches: JSON.stringify(manifest.uploadPolicy?.allowedStoragePathPrefixes) === JSON.stringify(ALLOWED_PREFIXES) &&
      DENIED_PREFIXES.every((prefix) => manifest.uploadPolicy?.deniedStoragePathPrefixes?.includes(prefix)),
    serverManifestEntriesSourceScoped: (manifest.entries || []).every((entry) =>
      SOURCE_LOCALES.includes(entry.sourceLocale) &&
      SURFACES.includes(entry.surface) &&
      entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`) &&
      !entry.serverPath.includes('uiLocale') &&
      !entry.serverPath.includes('sourceLocale')),
    upstreamServerGateClosed: serverGate.status === 'HOLD' &&
      serverGate.summary?.serverUploadAllowedEntries === 0 &&
      serverGate.summary?.runtimeDownloadsEnabledEntries === 0 &&
      serverGate.summary?.activationApprovedEntries === 0,
    upstreamRuntimeGateClosed: runtimeGate.status === 'HOLD' &&
      runtimeGate.summary?.runtimeDownloadAllowedRows === 0 &&
      runtimeGate.summary?.activationApprovedRows === 0,
    upstreamStorageGateClosed: storageGate.status === 'HOLD' &&
      storageGate.summary?.storageMigrationAllowed === false &&
      storageGate.summary?.cloudSyncMigrationAllowed === false,
    contractRequiresRuUkOnly: contract.sourceLocales.join(',') === 'ru,uk',
    contractDeniesUiLocalePaths: contract.deniedStoragePathPrefixes.includes('course-packs/fr/uiLocale/') &&
      contract.deniedStoragePathPrefixes.includes('course-packs/fr/sourceLocale/'),
    contractKeepsAllWritesClosed: Object.values(contract.disallowedTransitionsNow).every((value) => value === false),
    adminSourceLocaleReadOnlySurfacePresent: adminIndex.includes('data-gustav-admin-surface="official_fr_course_pack_status fr_llm_reviewer_queue_status fr_admin_diagnostics"') &&
      adminIndex.includes('sourceLocale=ru|uk') &&
      adminIndex.includes('course-packs/fr/ru/') &&
      adminIndex.includes('course-packs/fr/uk/'),
    fixtureProbesPass: probes.every((probe) => probe.passed),
  };
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  const audit = {
    schemaVersion: 'gustav-admin-source-locale-write-contract-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [key, rel(filePath)])),
    hashes: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)])),
    summary: {
      sourceLocales: contract.sourceLocales.length,
      surfaces: contract.surfaces.length,
      allowedStoragePathPrefixes: contract.allowedStoragePathPrefixes.length,
      deniedStoragePathPrefixes: contract.deniedStoragePathPrefixes.length,
      manifestEntries: manifest.entries?.length || 0,
      manifestEntriesSourceScoped: (manifest.entries || []).filter((entry) => entry.serverPath?.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`)).length,
      adminSourceLocaleReadOnlySurfacePresent: checks.adminSourceLocaleReadOnlySurfacePresent,
      adminOfficialWriteAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      reviewerDecisionImportAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      blockers: blockers.length,
      warnings: 0,
    },
    checks,
    probes,
    blockers,
    productionBlockers: [
      {
        blockerId: 'admin_official_fr_write_surface_still_absent',
        status: 'blocked',
        evidence: 'This contract defines future official write identity, but current admin has no official French course-pack write surface.',
        nextUnblockArtifact: 'official_fr_course_pack_admin_status_surface',
      },
      ...(checks.adminSourceLocaleReadOnlySurfacePresent ? [] : [{
        blockerId: 'admin_source_locale_form_control_missing',
        status: 'blocked',
        evidence: 'Current admin does not expose/prove sourceLocale=ru|uk for official French writes.',
        nextUnblockArtifact: 'admin_source_locale_form_or_manifest_row_contract',
      }]),
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

  writeJson(CONTRACT_PATH, contract);
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, renderMarkdown(contract, audit), 'utf8');
  console.log(`Gustav admin sourceLocale write contract: ${audit.status}`);
  console.log(`Probes: ${audit.summary.fixtureProbesPassed}/${audit.summary.fixtureProbes}`);
  console.log(`Allowed prefixes: ${contract.allowedStoragePathPrefixes.join(', ')}`);
  console.log(rel(CONTRACT_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
