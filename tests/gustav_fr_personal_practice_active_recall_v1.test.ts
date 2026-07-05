import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const SPEC_PATH = path.join(ROOT, 'specs', 'gustav-french-personal-practice-active-recall-v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_personal_practice_active_recall_v1.mjs');

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(OUT_DIR, fileName), 'utf8')) as T;
}

describe('Gustav French Personal Practice / Active Recall v1 readiness', () => {
  it('locks the no-audio French readiness handoff while production activation stays closed', () => {
    const spec = fs.readFileSync(SPEC_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const blueprint = readJson<any>('fr_personal_practice_active_recall_blueprint_audit_v1.json');
    const runtime = readJson<any>('fr_personal_practice_active_recall_runtime_gate_v1.json');
    const server = readJson<any>('fr_personal_practice_active_recall_server_pack_gate_v1.json');
    const adminStorage = readJson<any>('fr_personal_practice_active_recall_admin_storage_cloud_gate_v1.json');
    const handoff = readJson<any>('fr_personal_practice_active_recall_readiness_handoff_v1.json');
    const report = fs.readFileSync(path.join(OUT_DIR, 'fr_personal_practice_active_recall_readiness_report_v1.md'), 'utf8');

    expect(spec).toContain('FR-PPAR-001');
    expect(spec).toContain('FR-PPAR-005');
    expect(spec).toContain('Do not edit French lesson files');
    expect(spec).toContain('`activationApproved=true` appears nowhere');
    expect(script).toContain('lessonFilesModified: false');
    expect(script).toContain('audioRequired: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('assertNoActivationTrue');

    expect(blueprint.schemaVersion).toBe('gustav-fr-personal-practice-active-recall-blueprint-audit-v1');
    expect(blueprint.status).toBe('PASS_BLUEPRINT_SURFACE_PARITY_HOLD_FOR_COACH_BANK');
    expect(blueprint.englishBlueprintFacts.diagnosisTrainingIds).toBeGreaterThanOrEqual(50);
    expect(blueprint.englishBlueprintFacts.surfaces).toEqual(expect.arrayContaining([
      'problem_coach_diagnosis_training',
      'active_recall_srs_review',
      'trainer_sessions',
      'server_pack_personal_practice',
    ]));
    expect(blueprint.frenchFacts).toMatchObject({
      diagnosisCoachOpen: false,
      activeRecallOpenFromTargetScopedBucket: true,
      trainerSessionsOpenFromTargetScopedOrRemotePracticeBucket: true,
      serverPackSurfaceDeclared: true,
      activationApproved: false,
    });
    expect(blueprint.checks.every((check: any) => check.status === 'PASS')).toBe(true);

    expect(runtime.status).toBe('PASS_RUNTIME_TARGET_ISOLATION_WITH_COACH_HOLD');
    expect(runtime.checks.map((check: any) => check.id)).toEqual(expect.arrayContaining([
      'active_recall_target_scoped_storage',
      'review_route_passes_study_target',
      'french_skips_english_phrase_corrections',
      'french_trainer_merges_remote_personal_practice',
      'remote_payload_acceptance_is_french_only',
    ]));
    expect(runtime.checks.every((check: any) => check.status === 'PASS')).toBe(true);

    expect(server.status).toBe('PASS_DRY_RUN_SERVER_SURFACE_DECLARED_UPLOAD_CLOSED');
    expect(server.surface).toBe('personal_practice');
    expect(server.proposedObjectPrefixes).toEqual([
      'course-packs/fr/ru/personal_practice/{contentVersion}/',
      'course-packs/fr/uk/personal_practice/{contentVersion}/',
    ]);
    expect(server.checks.every((check: any) => check.status === 'PASS')).toBe(true);

    expect(adminStorage.status).toBe('PASS_ADMIN_STORAGE_CLOUD_ISOLATION_WITH_ADMIN_WRITE_HOLD');
    expect(adminStorage.checks.map((check: any) => check.id)).toEqual(expect.arrayContaining([
      'admin_tester_blocks_french_diagnosis_dev_route',
      'admin_personal_trainings_remains_english_registry',
      'target_storage_keys_cover_recall_trainer_and_source_locale_practice',
      'cloud_sync_includes_french_recall_and_personal_practice',
      'tests_cover_storage_and_runtime_boundaries',
    ]));
    expect(adminStorage.checks.every((check: any) => check.status === 'PASS')).toBe(true);

    expect(handoff.status).toBe('READY_HANDOFF_WITH_PRODUCTION_HOLD');
    expect(handoff.requirementMatrix).toEqual([
      expect.objectContaining({ id: 'FR-PPAR-001', status: 'PASS' }),
      expect.objectContaining({ id: 'FR-PPAR-002', status: 'PASS' }),
      expect.objectContaining({ id: 'FR-PPAR-003', status: 'PASS_DRY_RUN' }),
      expect.objectContaining({ id: 'FR-PPAR-004', status: 'PASS_WITH_ADMIN_WRITE_HOLD' }),
      expect.objectContaining({ id: 'FR-PPAR-005', status: 'HOLD_PRODUCTION_ACTIVATION_NOT_APPROVED' }),
    ]);
    expect(handoff.testsToRun).toEqual(expect.arrayContaining([
      'tests/gustav_fr_personal_practice_active_recall_v1.test.ts',
      'tests/gustav_personal_practice_target_isolation.test.ts',
      'tests/gustav_srs_review_target_isolation.test.ts',
      'tests/gustav_french_trainer_target_gate.test.ts',
      'tests/study_target_server_prefetch_contract.test.ts',
    ]));
    expect(handoff.blockers.map((item: any) => item.id)).toEqual(expect.arrayContaining([
      'french_personal_practice_training_bank',
      'french_personal_practice_mistake_taxonomy_review',
      'french_pos_workout_profile_review',
      'ru_uk_personal_practice_prompt_review',
      'server_upload_and_runtime_apply_approval',
    ]));

    for (const artifact of [blueprint, runtime, server, adminStorage, handoff]) {
      expect(artifact.safety).toMatchObject({
        activationApproved: false,
        productionReady: false,
        serverUploadAllowed: false,
        runtimeApplyAllowed: false,
        adminWritesOpened: false,
        audioRequired: false,
        audioGenerated: false,
        lessonFilesModified: false,
      });
      expect(JSON.stringify(artifact)).not.toContain('"activationApproved":true');
      expect(JSON.stringify(artifact)).not.toContain('"activationApproved": true');
    }

    expect(report).toContain('Status: READY_HANDOFF_WITH_PRODUCTION_HOLD');
    expect(report).toContain('french_personal_practice_training_bank');
    expect(report).toContain('audioRequired: false');
  });
});
