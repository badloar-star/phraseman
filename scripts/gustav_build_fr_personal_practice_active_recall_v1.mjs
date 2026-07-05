import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const SPEC_PATH = path.join(ROOT, 'specs', 'gustav-french-personal-practice-active-recall-v1.md');
const GENERATED_AT = new Date().toISOString();

const SAFETY = Object.freeze({
  activationApproved: false,
  productionReady: false,
  serverUploadAllowed: false,
  runtimeApplyAllowed: false,
  adminWritesOpened: false,
  audioRequired: false,
  audioGenerated: false,
  lessonFilesModified: false,
});

const REQUIRED_EVIDENCE = Object.freeze([
  'french_personal_practice_training_bank',
  'french_personal_practice_mistake_taxonomy_review',
  'french_pos_workout_profile_review',
  'ru_uk_personal_practice_prompt_review',
]);

const FILES = Object.freeze({
  spec: 'specs/gustav-french-personal-practice-active-recall-v1.md',
  paritySpec: 'specs/gustav-french-english-blueprint-parity.md',
  state: 'docs/gustav/state.json',
  ids: 'app/personal_practice_training_ids.ts',
  diagnosisTrainings: 'app/diagnosis_trainings.ts',
  router: 'app/personal_practice_lesson_router.ts',
  personalGate: 'app/personal_practice_target_gate.ts',
  activeRecall: 'app/active_recall.ts',
  review: 'app/review.tsx',
  trainerStore: 'app/trainer_store.ts',
  trainerPrefetch: 'app/trainer_practice_prefetch.ts',
  trainerGate: 'app/trainer_target_gate.ts',
  remoteRuntime: 'app/french_personal_practice_remote_runtime.ts',
  remoteRegistration: 'app/french_target_remote_registration.ts',
  courseManifest: 'app/course_pack_manifest.ts',
  storageKeys: 'app/target_storage_keys.ts',
  cloudSync: 'app/cloud_sync.ts',
  adminSettings: 'app/_admin_settings_testers.tsx',
  adminPersonalTrainings: 'admin/personal-trainings.js',
  testPersonalIsolation: 'tests/gustav_personal_practice_target_isolation.test.ts',
  testSrsIsolation: 'tests/gustav_srs_review_target_isolation.test.ts',
  testTrainerGate: 'tests/gustav_french_trainer_target_gate.test.ts',
  testServerPrefetch: 'tests/study_target_server_prefetch_contract.test.ts',
});

function abs(relPath) {
  return path.join(ROOT, relPath);
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function read(relPath) {
  const filePath = abs(relPath);
  if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${relPath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeJson(fileName, value) {
  const filePath = path.join(OUT_DIR, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return rel(filePath);
}

function writeText(fileName, value) {
  const filePath = path.join(OUT_DIR, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
  return rel(filePath);
}

function includes(source, needle) {
  return source.includes(needle);
}

function pass(id, evidence, file) {
  return { id, status: 'PASS', evidence, file };
}

function hold(id, evidence, file) {
  return { id, status: 'HOLD', evidence, file };
}

function block(id, evidence, file) {
  return { id, status: 'BLOCK', evidence, file };
}

function extractDiagnosisIds(source) {
  const match = source.match(/DIAGNOSIS_TRAINING_IDS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function evidenceItem(id, condition, evidence, file, blockedEvidence) {
  return condition ? pass(id, evidence, file) : block(id, blockedEvidence || evidence, file);
}

function allPass(items) {
  return items.every((item) => item.status === 'PASS');
}

function assertNoActivationTrue(value) {
  const text = JSON.stringify(value);
  if (text.includes('"activationApproved":true') || text.includes('"activationApproved": true')) {
    throw new Error('Forbidden activationApproved=true in generated Personal Practice artifacts.');
  }
}

function build() {
  const sources = Object.fromEntries(Object.entries(FILES).map(([key, relPath]) => [key, read(relPath)]));
  const diagnosisIds = extractDiagnosisIds(sources.ids);
  const englishDiagnosisIfCount = [...sources.diagnosisTrainings.matchAll(/if \(id === '/g)].length;

  const blueprintAudit = {
    schemaVersion: 'gustav-fr-personal-practice-active-recall-blueprint-audit-v1',
    generatedAt: GENERATED_AT,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    status: 'PASS_BLUEPRINT_SURFACE_PARITY_HOLD_FOR_COACH_BANK',
    inspectedFiles: Object.values(FILES),
    englishBlueprintFacts: {
      diagnosisTrainingIds: diagnosisIds.length,
      diagnosisRegistryBranches: englishDiagnosisIfCount,
      diagnosisExamples: diagnosisIds.slice(0, 8),
      surfaces: [
        'problem_coach_diagnosis_training',
        'active_recall_srs_review',
        'trainer_sessions',
        'mistake_log',
        'pos_mastery',
        'cloud_sync',
        'admin_tester_gate',
        'server_pack_personal_practice',
      ],
    },
    frenchFacts: {
      diagnosisCoachOpen: false,
      activeRecallOpenFromTargetScopedBucket: true,
      trainerSessionsOpenFromTargetScopedOrRemotePracticeBucket: true,
      serverPackSurfaceDeclared: true,
      activationApproved: false,
    },
    checks: [
      evidenceItem(
        'english_diagnosis_id_inventory',
        diagnosisIds.length >= 50 && englishDiagnosisIfCount >= diagnosisIds.length,
        `${diagnosisIds.length} English diagnosis ids; ${englishDiagnosisIfCount} registry branches.`,
        FILES.ids,
      ),
      evidenceItem(
        'french_diagnosis_registry_reuse_blocked',
        includes(sources.diagnosisTrainings, "if (storageStudyTarget(studyTarget) === 'fr') return null;") &&
          includes(sources.diagnosisTrainings, "if (storageStudyTarget(studyTarget) === 'fr') return [];"),
        'French target returns null/[] for English diagnosis training registry.',
        FILES.diagnosisTrainings,
      ),
      evidenceItem(
        'personal_practice_coach_gate_closed',
        includes(sources.personalGate, "reason: 'french_personal_training_source_gate'") &&
          includes(sources.personalGate, "blockedRoutes: ['/problem_coach']") &&
          REQUIRED_EVIDENCE.every((needle) => includes(sources.personalGate, needle)),
        'French personal coach gate blocks /problem_coach and lists required evidence.',
        FILES.personalGate,
      ),
      evidenceItem(
        'english_blueprint_parity_spec_names_surface',
        includes(sources.paritySpec, 'personal practice') && includes(sources.paritySpec, 'active recall'),
        'Global French blueprint parity spec names personal practice and active recall.',
        FILES.paritySpec,
      ),
    ],
    safety: SAFETY,
  };

  const runtimeGate = {
    schemaVersion: 'gustav-fr-personal-practice-active-recall-runtime-gate-v1',
    generatedAt: GENERATED_AT,
    status: 'PASS_RUNTIME_TARGET_ISOLATION_WITH_COACH_HOLD',
    checks: [
      evidenceItem(
        'active_recall_target_scoped_storage',
        includes(sources.activeRecall, 'activeRecallItemsKey(studyTarget)'),
        'Active Recall reads/writes through activeRecallItemsKey(studyTarget).',
        FILES.activeRecall,
      ),
      evidenceItem(
        'review_route_passes_study_target',
        [
          'getDueItems(SESSION_LIMIT, { commitSessionOverflow: true }, studyTarget)',
          'getTrainerItems(trainerMode, SESSION_LIMIT, trainerLessonId, trainerCategory, studyTarget)',
          'markReviewed(item.phrase, ok, tokenMeta, studyTarget)',
          'removeItem(item.phrase, studyTarget)',
        ].every((needle) => includes(sources.review, needle)),
        'Review route passes studyTarget through SRS reads/writes.',
        FILES.review,
      ),
      evidenceItem(
        'french_skips_english_phrase_corrections',
        includes(sources.activeRecall, "storageStudyTarget(studyTarget) !== 'fr'"),
        'English phrase correction table is skipped for French recall state.',
        FILES.activeRecall,
      ),
      evidenceItem(
        'french_trainer_merges_remote_personal_practice',
        includes(sources.trainerStore, 'getCachedFrenchRemotePersonalPractice') &&
          includes(sources.trainerStore, 'mergeFrenchRemotePracticeItems'),
        'French trainer store merges cached remote personal_practice entries.',
        FILES.trainerStore,
      ),
      evidenceItem(
        'prefetch_loads_french_remote_practice',
        includes(sources.trainerPrefetch, 'ensureFrenchRemotePersonalPractice(normalizedSourceLocale)'),
        'Trainer prefetch asks for French remote personal practice by source locale.',
        FILES.trainerPrefetch,
      ),
      evidenceItem(
        'remote_payload_acceptance_is_french_only',
        [
          "entry.studyTarget !== 'fr'",
          "entry.surface !== 'personal_practice'",
          "entry.targetLanguageAnswerRequired !== 'fr'",
          "payload.studyTarget !== 'fr' || payload.sourceLocale !== sourceLocale || payload.surface !== 'personal_practice'",
        ].every((needle) => includes(sources.remoteRuntime, needle)),
        'Remote runtime rejects non-French, wrong-source-locale, wrong-surface, or non-French-answer payloads.',
        FILES.remoteRuntime,
      ),
      evidenceItem(
        'trainer_gate_open_for_remote_practice_not_problem_coach',
        includes(sources.trainerGate, "reason: 'french_trainer_remote_personal_practice_available'") &&
          includes(sources.personalGate, 'enabled: false'),
        'French trainer/SRS is available through remote/local practice buckets while personal coach stays closed.',
        FILES.trainerGate,
      ),
    ],
    safety: SAFETY,
  };

  const serverPackGate = {
    schemaVersion: 'gustav-fr-personal-practice-active-recall-server-pack-gate-v1',
    generatedAt: GENERATED_AT,
    status: 'PASS_DRY_RUN_SERVER_SURFACE_DECLARED_UPLOAD_CLOSED',
    surface: 'personal_practice',
    proposedObjectPrefixes: [
      'course-packs/fr/ru/personal_practice/{contentVersion}/',
      'course-packs/fr/uk/personal_practice/{contentVersion}/',
    ],
    checks: [
      evidenceItem(
        'course_pack_surface_declared',
        includes(sources.courseManifest, "'personal_practice'"),
        'Course pack manifest declares personal_practice surface.',
        FILES.courseManifest,
      ),
      evidenceItem(
        'french_remote_surface_declared',
        includes(sources.remoteRegistration, "'personal_practice'") &&
          includes(sources.remoteRegistration, 'course-packs/fr/${sourceLocale}/${surface}/${FRENCH_TARGET_CONTENT_VERSION}'),
        'French remote registrations include source-locale personal_practice path.',
        FILES.remoteRegistration,
      ),
      evidenceItem(
        'unsupported_source_locale_rejected',
        includes(sources.remoteRegistration, "normalized === 'ru' || normalized === 'uk' ? normalized : null"),
        'Only ru/uk source locales can resolve French remote registrations.',
        FILES.remoteRegistration,
      ),
      evidenceItem(
        'remote_payload_hash_checked',
        includes(sources.remoteRuntime, 'payloadSha256') &&
          includes(sources.remoteRuntime, 'const actualHash = (await sha256(payloadText)).toLowerCase();') &&
          includes(sources.remoteRuntime, 'if (actualHash !== expectedHash) continue;'),
        'Remote personal_practice runtime checks payload sha before accepting rows.',
        FILES.remoteRuntime,
      ),
      evidenceItem(
        'activation_approval_gate_exists',
        includes(sources.remoteRegistration, 'isFrenchStudyTargetServerPackActivationApproved') &&
          includes(sources.remoteRegistration, 'return ENABLE_DEV_STUDY_TARGET_LANG;'),
        'Remote registrations remain behind the Gustav activation/dev gate.',
        FILES.remoteRegistration,
      ),
    ],
    safety: SAFETY,
  };

  const adminStorageGate = {
    schemaVersion: 'gustav-fr-personal-practice-active-recall-admin-storage-cloud-gate-v1',
    generatedAt: GENERATED_AT,
    status: 'PASS_ADMIN_STORAGE_CLOUD_ISOLATION_WITH_ADMIN_WRITE_HOLD',
    checks: [
      evidenceItem(
        'admin_tester_blocks_french_diagnosis_dev_route',
        includes(sources.adminSettings, 'personalPracticeCoachEnabledForTarget(studyTarget)') &&
          includes(sources.adminSettings, 'testID="admin-french-personal-practice-source-gate"') &&
          includes(sources.adminSettings, 'if (diagnosisDevBlocked) {'),
        'Admin/tester route keeps French diagnosis dev actions behind source gate.',
        FILES.adminSettings,
      ),
      evidenceItem(
        'admin_personal_trainings_remains_english_registry',
        includes(sources.adminPersonalTrainings, 'window.PERSONAL_TRAININGS_MANIFEST') &&
          includes(sources.adminPersonalTrainings, 'app/diagnosis_trainings.ts') &&
          includes(sources.adminPersonalTrainings, '"sourceLocales"') &&
          !includes(sources.adminPersonalTrainings, '"fr"') &&
          !includes(sources.adminPersonalTrainings, 'studyTarget=fr'),
        'Admin personal trainings script is an English registry workflow, not a French write path.',
        FILES.adminPersonalTrainings,
      ),
      evidenceItem(
        'target_storage_keys_cover_recall_trainer_and_source_locale_practice',
        [
          "SOURCE_TARGET_KEY_DOMAINS = ['personal_practice']",
          "scopedOrLegacyKey('active_recall_items', 'trainer_practice', studyTarget)",
          "scopedOrLegacyKey('trainer_store_v1', 'trainer_practice', studyTarget)",
          "scopedOrLegacyKey('mistake_log_v1', 'trainer_practice', studyTarget)",
          "sourceTargetKey('personal_practice', target, storageSourceLocale(sourceLocale), id)",
          'personal_practice_v2::(?:en|fr)::(?:ru|uk)',
        ].every((needle) => includes(sources.storageKeys, needle)),
        'Storage key module scopes trainer/recall/mistake by target and personal practice by target+sourceLocale.',
        FILES.storageKeys,
      ),
      evidenceItem(
        'cloud_sync_includes_french_recall_and_personal_practice',
        [
          "activeRecallItemsKey('fr')",
          "activeRecallAchievementCorrectCountKey('fr')",
          "personalPracticeFreeAccessKey('fr', sourceLocale)",
          "resolvedPersonalTrainingsKey('fr', sourceLocale)",
          "personalPracticeTrainingProgressKey(id, 'fr', sourceLocale)",
        ].every((needle) => includes(sources.cloudSync, needle)),
        'Cloud sync includes French Active Recall and per-source-locale personal practice keys.',
        FILES.cloudSync,
      ),
      evidenceItem(
        'tests_cover_storage_and_runtime_boundaries',
        [
          'source-gates French diagnosis progress writes',
          'stores French recall, mistake analytics, and trainer queues outside legacy English keys',
        ].every((needle) => includes(sources.testPersonalIsolation, needle)) &&
          includes(sources.testSrsIsolation, 'blocks the English admin SRS bench') &&
          includes(sources.testTrainerGate, 'opens French trainer session reads from the isolated trainer bucket') &&
          includes(sources.testServerPrefetch, 'personal_practice'),
        'Focused tests already cover French storage/runtime/server registration boundaries.',
        'tests',
      ),
    ],
    safety: SAFETY,
  };

  const requirementMatrix = [
    {
      id: 'FR-PPAR-001',
      status: allPass(blueprintAudit.checks) ? 'PASS' : 'BLOCK',
      artifact: 'fr_personal_practice_active_recall_blueprint_audit_v1.json',
    },
    {
      id: 'FR-PPAR-002',
      status: allPass(runtimeGate.checks) ? 'PASS' : 'BLOCK',
      artifact: 'fr_personal_practice_active_recall_runtime_gate_v1.json',
    },
    {
      id: 'FR-PPAR-003',
      status: allPass(serverPackGate.checks) ? 'PASS_DRY_RUN' : 'BLOCK',
      artifact: 'fr_personal_practice_active_recall_server_pack_gate_v1.json',
    },
    {
      id: 'FR-PPAR-004',
      status: allPass(adminStorageGate.checks) ? 'PASS_WITH_ADMIN_WRITE_HOLD' : 'BLOCK',
      artifact: 'fr_personal_practice_active_recall_admin_storage_cloud_gate_v1.json',
    },
    {
      id: 'FR-PPAR-005',
      status: 'HOLD_PRODUCTION_ACTIVATION_NOT_APPROVED',
      artifact: 'fr_personal_practice_active_recall_readiness_handoff_v1.json',
    },
  ];

  const blockers = REQUIRED_EVIDENCE.map((id) => ({
    id,
    status: 'HOLD',
    reason: 'Required before French /problem_coach personal practice coach can open.',
  }));
  blockers.push(
    {
      id: 'server_upload_and_runtime_apply_approval',
      status: 'HOLD',
      reason: 'No upload/apply/activation may run without the broader Gustav production approval chain.',
    },
    {
      id: 'french_personal_practice_bank_payloads_not_materialized_here',
      status: 'HOLD',
      reason: 'This spec closes gates/readiness only; it does not generate French diagnosis coach lessons or audio.',
    },
  );

  const handoff = {
    schemaVersion: 'gustav-fr-personal-practice-active-recall-readiness-handoff-v1',
    generatedAt: GENERATED_AT,
    studyTarget: 'fr',
    section: 'personal_practice_active_recall',
    status: requirementMatrix.every((item) => item.status !== 'BLOCK')
      ? 'READY_HANDOFF_WITH_PRODUCTION_HOLD'
      : 'BLOCKED_BY_GATE_FAILURE',
    requirementMatrix,
    testsToRun: [
      'tests/gustav_fr_personal_practice_active_recall_v1.test.ts',
      'tests/gustav_personal_practice_target_isolation.test.ts',
      'tests/gustav_srs_review_target_isolation.test.ts',
      'tests/gustav_french_trainer_target_gate.test.ts',
      'tests/study_target_server_prefetch_contract.test.ts',
    ],
    blockers,
    safety: SAFETY,
  };

  for (const artifact of [blueprintAudit, runtimeGate, serverPackGate, adminStorageGate, handoff]) {
    assertNoActivationTrue(artifact);
  }

  const artifactPaths = {
    blueprintAudit: writeJson('fr_personal_practice_active_recall_blueprint_audit_v1.json', blueprintAudit),
    runtimeGate: writeJson('fr_personal_practice_active_recall_runtime_gate_v1.json', runtimeGate),
    serverPackGate: writeJson('fr_personal_practice_active_recall_server_pack_gate_v1.json', serverPackGate),
    adminStorageGate: writeJson('fr_personal_practice_active_recall_admin_storage_cloud_gate_v1.json', adminStorageGate),
    handoff: writeJson('fr_personal_practice_active_recall_readiness_handoff_v1.json', handoff),
  };

  const report = [
    '# French Personal Practice / Active Recall V1 Readiness',
    '',
    `Generated: ${GENERATED_AT}`,
    '',
    `Status: ${handoff.status}`,
    '',
    `English diagnosis ids: ${diagnosisIds.length}`,
    '',
    'Artifacts:',
    ...Object.values(artifactPaths).map((item) => `- ${item}`),
    '',
    'Production remains on HOLD:',
    ...blockers.map((item) => `- ${item.id}: ${item.reason}`),
    '',
    'Safety:',
    ...Object.entries(SAFETY).map(([key, value]) => `- ${key}: ${value}`),
    '',
  ].join('\n');
  artifactPaths.report = writeText('fr_personal_practice_active_recall_readiness_report_v1.md', report);

  return {
    status: handoff.status,
    generatedAt: GENERATED_AT,
    artifactPaths,
    diagnosisTrainingIds: diagnosisIds.length,
    requirementMatrix,
    safety: SAFETY,
    artifactHash: sha256Text(JSON.stringify({ artifactPaths, requirementMatrix, safety: SAFETY })),
  };
}

const result = build();
console.log(JSON.stringify(result, null, 2));
