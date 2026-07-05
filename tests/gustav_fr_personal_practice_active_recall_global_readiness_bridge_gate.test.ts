import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'personal_practice',
  'fr_personal_practice_active_recall_global_readiness_bridge_gate_v1.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_personal_practice_active_recall_global_readiness_bridge_gate.mjs');

describe('Gustav French personal practice / active recall global readiness bridge gate', () => {
  it('closes the local active-recall/runtime bridge while keeping problem coach and production activation closed', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('FRENCH_PROBLEM_COACH_UNEXPECTEDLY_OPEN');
    expect(script).toContain('remotePersonalPracticeFrenchOnly');
    expect(script).toContain('NATIVE_BANK_CANDIDATE_NOT_READY_FOR_REVIEW');
    expect(script).toContain('server_upload_and_runtime_apply_approval');

    expect(gate.schemaVersion).toBe('gustav-fr-personal-practice-active-recall-global-readiness-bridge-gate-v1');
    expect(gate.status).toBe('PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.sourceLocales).toEqual(['ru', 'uk']);
    expect(gate.surface).toBe('personal_practice_active_recall');
    expect(gate.activationApproved).toBe(false);
    expect(gate.globalFrenchActivationApproved).toBe(false);
    expect(gate.readyForAppApply).toBe(false);
    expect(gate.readyForRuntimeEnable).toBe(false);
    expect(gate.blockers).toEqual([]);

    expect(gate.summary).toMatchObject({
      englishDiagnosisTrainingIds: 56,
      englishDiagnosisRegistryBranches: 56,
      runtimeChecks: 7,
      serverChecks: 5,
      adminStorageChecks: 5,
      handoffRequirements: 5,
      nativeBankCandidateRows: 56,
      nativeBankReadyForLlmReview: true,
      nativeBankRowsWithEnglishIdReuse: 0,
      nativeBankReviewRequestRows: 56,
      nativeBankReviewRequestsReady: true,
      nativeBankExternalReviewBatches: 3,
      nativeBankDecisionRows: 0,
      nativeBankMissingDecisionRows: 56,
      nativeBankImportDryRunReady: false,
      mistakeTaxonomyRows: 56,
      mistakeTaxonomyReadyForLlmReview: true,
      mistakeTaxonomyRowsWithEnglishIdReuse: 0,
      mistakeTaxonomyReviewRequestRows: 56,
      mistakeTaxonomyReviewRequestsReady: true,
      mistakeTaxonomyExternalReviewBatches: 3,
      mistakeTaxonomyDecisionRows: 0,
      mistakeTaxonomyMissingDecisionRows: 56,
      mistakeTaxonomyImportDryRunReady: false,
      problemCoachOpen: false,
      activeRecallOpenFromTargetScopedBucket: true,
      trainerSessionsOpenFromTargetScopedOrRemotePracticeBucket: true,
      serverPackSurfaceDeclared: true,
      activationApproved: false,
      globalFrenchStillHold: true,
    });

    expect(gate.invariants).toMatchObject({
      englishDiagnosisRegistryNotReusedForFrench: true,
      frenchProblemCoachStillClosedUntilNativeBankReview: true,
      frenchNativeBankCandidateExists: true,
      frenchNativeBankRequiresLlmTrustedSourceReview: true,
      frenchNativeBankReviewRequestsReady: true,
      frenchNativeBankExternalHandoffReady: true,
      frenchMistakeTaxonomyCandidateExists: true,
      frenchMistakeTaxonomyRequiresLlmTrustedSourceReview: true,
      frenchMistakeTaxonomyReviewRequestsReady: true,
      frenchMistakeTaxonomyExternalHandoffReady: true,
      activeRecallTargetScoped: true,
      remotePersonalPracticeFrenchOnly: true,
      serverPackCandidateOnly: true,
      sourceLocalePayloadsSeparated: true,
      adminWritesClosed: true,
      appBundleNotModified: true,
      runtimeActivationClosed: true,
      activationRemainsClosed: true,
    });
    expect(gate.remainingProductionHolds).toEqual([
      'french_personal_practice_native_bank_llm_review',
      'french_personal_practice_mistake_taxonomy_llm_review',
      'french_pos_workout_profile_review',
      'ru_uk_personal_practice_prompt_review',
      'server_upload_and_runtime_apply_approval',
    ]);
  });
});
