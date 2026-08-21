import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'closeout', 'fr_full_surface_closeout_work_order_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_full_surface_closeout_work_order.mjs');

describe('Gustav French full surface closeout work order', () => {
  it('tracks every French production section without opening activation', () => {
    const workOrder = JSON.parse(fs.readFileSync(WORK_ORDER_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('llmTrustedSourceReviewInstead');
    expect(script).toContain('noLessonRowFanoutAsFinalFeatureContent');
    expect(script).toContain('readyForRuntimeDownloads: false');

    expect(workOrder.schemaVersion).toBe('gustav-fr-full-surface-closeout-work-order-v1');
    expect(workOrder.status).toBe('HOLD');
    expect(workOrder.studyTarget).toBe('fr');
    expect(workOrder.sourceStudyTarget).toBe('en');
    expect(workOrder.sourceLocales).toEqual(['ru', 'uk']);
    expect(workOrder.activationApproved).toBe(false);
    expect(workOrder.readyForAppApply).toBe(false);
    expect(workOrder.readyForServerUpload).toBe(false);
    expect(workOrder.readyForRuntimeDownloads).toBe(false);

    expect(workOrder.summary).toMatchObject({
      surfacesTotal: 12,
      localReadySurfaces: 11,
      hardHoldSurfaces: 1,
      globalHoldSurfaces: 12,
      backlogItems: 12,
      surfaceBridgeGatesPassed: 10,
      coreAcceptedRows: 870,
      coreMissingDecisionRows: 337,
      coreNonAcceptedRows: 393,
      missingReviewBatchArtifacts: 14,
      correctionCandidateReviewRequestRows: 290,
      correctionCandidateReviewBatches: 12,
      correctionCandidateReviewExternalBatches: 12,
      correctionCandidateDecisionRows: 0,
      correctionCandidateMissingDecisionRows: 290,
      theorySectionsTotal: 160,
      vocabularyItemsTotal: 2941,
      standardQuizRowsTotal: 1680,
      arenaRowsTotal: 8684,
      grammarRuntimeItems: 640,
      flashcardCards: 100,
      collectibleRows: 330,
      dailyPhraseRowsPerLocale: 176,
      aiPromptSurfacesPassing: 9,
      storageIsolationChecksPassed: 25,
    });
    expect(workOrder.summary.uniqueProductionBlockers).toBeGreaterThanOrEqual(30);

    expect(workOrder.invariants).toMatchObject({
      everySectionRepresented: true,
      noHumanReviewGate: true,
      llmTrustedSourceReviewInstead: true,
      noLessonRowFanoutAsFinalFeatureContent: true,
      noServerUpload: true,
      noRuntimeDownloads: true,
      noAppApply: true,
      noActivationApproval: true,
      sourceLocaleSeparatedRuUk: true,
      studyTargetFrIsolatedFromEnglishAndUiLocale: true,
    });

    const ids = workOrder.surfaces.map((surface: { id: string }) => surface.id);
    expect(ids).toEqual([
      'core_lessons_32',
      'theory_intro_vocabulary',
      'standard_quizzes',
      'arena_questions',
      'prepositions_conjugation',
      'flashcards_marketplace',
      'collectible_cards',
      'daily_phrases',
      'ai_prompt_surfaces',
      'admin_surfaces',
      'storage_cloud_runtime_isolation',
    ]);

    for (const surface of workOrder.surfaces) {
      expect(surface.readyForRuntimeEnable).toBe(false);
      expect(surface.readyForServerUpload).toBe(false);
      expect(surface.readyForAppApply).toBe(false);
      expect(surface.activationApproved).toBe(false);
      expect(surface.evidence.length).toBeGreaterThan(0);
      expect(surface.doneMeans.length).toBeGreaterThan(0);
      expect(surface.nextWork.length).toBeGreaterThan(0);
      expect(surface.nextCommands.length).toBeGreaterThan(0);
    }

    const core = workOrder.surfaces.find((surface: { id: string }) => surface.id === 'core_lessons_32');
    expect(core.state).toBe('HOLD');
    expect(core.localEvidenceReady).toBe(false);
    expect(core.counts).toMatchObject({
      requestRows: 1600,
      decisionRows: 1263,
      missingDecisionRows: 337,
      acceptedRows: 870,
      regenerationRows: 303,
      skippedRows: 90,
      nonAcceptedRows: 393,
      missingDecisionBatches: 14,
      missingReviewBatchArtifacts: 14,
      firstMissingReviewBatchStartIndex: 1264,
      reviewCanExecuteInCurrentProcess: false,
      reviewExternalTerminalRequired: true,
      reviewPlannedBatches: 14,
      reviewExternalHandoffReady: true,
      reviewExternalHandoffRunner: 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_external_handoff_run_next_batch.ps1',
      nonAcceptedFixWorkOrderReady: true,
      nonAcceptedFixRegenerationRows: 303,
      nonAcceptedFixSourceRecheckRows: 90,
      nonAcceptedFixCorrectionPayloadRows: 290,
      correctionCandidateRows: 290,
      correctionCandidatesReadyForReviewRequestBuild: true,
      correctionCandidateReviewRequestRows: 290,
      correctionCandidateReviewBatches: 12,
      correctionCandidateReviewRequestsReady: true,
      correctionCandidateReviewExternalHandoffReady: true,
      correctionCandidateReviewExternalBatches: 12,
      correctionCandidateReviewExternalRunner: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_external_handoff_run_next_batch.ps1',
      correctionCandidateDecisionRows: 0,
      correctionCandidateMissingDecisionRows: 290,
      correctionCandidateDecisionSchemaReady: false,
      correctionCandidateImportDryRunReady: false,
      correctionCandidateAcceptedRows: 0,
    });
    expect(core.evidence).toEqual(expect.arrayContaining([
      'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_execution_readiness_gate_audit_v1.json',
      'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_batch_plan_audit_v1.json',
      'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_external_handoff_v1.json',
      'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_non_accepted_fix_work_order_audit_v1.json',
      'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_work_order_audit_v1.json',
      'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_requests_audit_v1.json',
      'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_external_handoff_v1.json',
      'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_decision_schema_gate_audit_v1.json',
      'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_import_dry_run_audit_v1.json',
    ]));
    expect(core.remainingBlockers).toEqual(expect.arrayContaining([
      'LLM_REVIEW_DECISIONS_INCOMPLETE',
      'NON_ACCEPTED_ROWS_BLOCK_AUDIO',
      'AUDIO_FILES_MISSING',
      'RUNTIME_DELIVERY_NOT_READY',
    ]));

    const theory = workOrder.surfaces.find((surface: { id: string }) => surface.id === 'theory_intro_vocabulary');
    expect(theory.localEvidenceReady).toBe(true);
    expect(theory.counts).toMatchObject({
      lessonsTotal: 32,
      lessonsPassing: 32,
      theorySectionsTotal: 160,
      vocabularyItemsTotal: 2941,
      introScreensTotal: 96,
    });

    const grammar = workOrder.surfaces.find((surface: { id: string }) => surface.id === 'prepositions_conjugation');
    expect(grammar.counts).toMatchObject({
      prepositionLessonPacks: 32,
      conjugationLessonPacks: 32,
      totalRuntimeItems: 640,
      conjugationVerbs: 32,
    });

    const ai = workOrder.surfaces.find((surface: { id: string }) => surface.id === 'ai_prompt_surfaces');
    expect(ai.counts).toMatchObject({
      surfacesChecked: 9,
      surfacesPassing: 9,
      failedSurfaces: 0,
    });

    expect(workOrder.nextPassPlan[0]).toContain('14 missing LLM review batches');
    expect(workOrder.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      reviewerDecisionsImportedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });
  });
});
