import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'fr_non_lesson_surface_backlog_gate_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_non_lesson_surface_backlog_gate.mjs');

describe('Gustav French non-lesson surface backlog gate', () => {
  it('turns the English blueprint into an ordered French production backlog without opening activation', () => {
    const gate = JSON.parse(fs.readFileSync(GATE_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('noLessonRowFanoutAsFinalFeatureContent');
    expect(script).toContain('llmTrustedSourceReviewRequired');
    expect(script).toContain('MOJIBAKE_PATTERN');

    expect(gate.schemaVersion).toBe('gustav-fr-non-lesson-surface-backlog-gate-v1');
    expect(gate.status).toBe('HOLD');
    expect(gate.studyTarget).toBe('fr');
    expect(gate.sourceStudyTarget).toBe('en');
    expect(gate.activationApproved).toBe(false);
    expect(gate.readyForApply).toBe(false);
    expect(gate.summary.backlogItems).toBe(12);
    expect(gate.summary.coreLessonRowsBuiltLocally).toBe(1600);
    expect(gate.summary.firstPriority).toBe('core_lesson_delivery_closeout');
    expect(gate.summary.surfaceBridgeGatesPassed).toBe(10);
    expect(gate.summary.mojibakeHitFiles).toBe(0);
    expect(gate.summary.placeholderHitFiles).toBe(0);
    expect(gate.summary.productionBlockers).toBeGreaterThanOrEqual(17);

    expect(gate.invariants).toMatchObject({
      noHumanReview: true,
      llmTrustedSourceReviewInstead: true,
      noPlaceholdersAllowedInProduction: true,
      noMojibakeAllowedInProduction: true,
      noLessonRowFanoutAsFinalFeatureContent: true,
      everySurfaceUsesStudyTargetFrAndSourceLocaleSeparately: true,
      serverPackBeforeActivation: true,
    });

    const ids = gate.queue.map((item: { id: string }) => item.id);
    expect(ids).toEqual([
      'core_lesson_delivery_closeout',
      'lesson_theory_intro_vocab',
      'standard_quiz_banks',
      'arena_question_banks',
      'personal_practice_active_recall',
      'flashcards_and_marketplace_cards',
      'collectible_cards',
      'prepositions_and_conjugation_drills',
      'ai_prompt_surfaces',
      'admin_surfaces',
      'storage_cloud_runtime_isolation',
      'daily_phrases',
    ]);

    for (const item of gate.queue) {
      expect(item.readyForProduction).toBe(false);
      expect(item.activationApproved).toBe(false);
      expect(item.noHumanReviewGate).toBe(true);
      expect(item.llmTrustedSourceReviewRequired).toBe(true);
      expect(item.missingParitySurfaces).toEqual([]);
      expect(item.exactFiles.length).toBeGreaterThan(0);
      expect(item.exactScripts.length).toBeGreaterThan(0);
      expect(item.exactTests.length).toBeGreaterThan(0);
      expect(item.productionBlockers.length).toBeGreaterThan(0);
    }

    const coreLessons = gate.queue.find((item: { id: string }) => item.id === 'core_lesson_delivery_closeout');
    expect(coreLessons.bridgeGate).toMatchObject({
      status: 'HOLD_CORE_LESSON_DELIVERY_NOT_READY',
      localSurfaceReady: false,
      closedLocalBlockers: [],
    });
    expect(coreLessons.bridgeGate.remainingBlockers).toEqual(expect.arrayContaining([
      'LLM_REVIEW_DECISIONS_INCOMPLETE',
      'REVIEW_IMPORT_NOT_ACCEPTED_FOR_ALL_1600_ROWS',
      'AUDIO_FILES_MISSING',
      'SERVER_PAYLOADS_NOT_READY_FOR_MANIFEST',
      'RUNTIME_DELIVERY_NOT_READY',
    ]));

    const standardQuiz = gate.queue.find((item: { id: string }) => item.id === 'standard_quiz_banks');
    expect(standardQuiz.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_STANDARD_QUIZ_NATIVE_BANK_NOT_MATERIALIZED',
        'QUIZ_SERVER_PAYLOAD_UPLOAD_CLOSED',
      ],
    });
    expect(standardQuiz.productionBlockers).toEqual(['GLOBAL_FRENCH_ACTIVATION_STILL_HOLD']);
    const theoryVocabIntro = gate.queue.find((item: { id: string }) => item.id === 'lesson_theory_intro_vocab');
    expect(theoryVocabIntro.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_THEORY_32_NOT_PROVEN',
        'FRENCH_INTROS_32_NOT_PROVEN',
        'FRENCH_VOCAB_NATIVE_BANK_NOT_PROVEN',
      ],
    });
    expect(theoryVocabIntro.productionBlockers).toEqual([
      'THEORY_VOCAB_INTRO_RUNTIME_DELIVERY_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const arena = gate.queue.find((item: { id: string }) => item.id === 'arena_question_banks');
    expect(arena.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_ARENA_BANK_NOT_MATERIALIZED',
        'ARENA_LEVEL_DISTRIBUTION_NOT_PROVEN',
      ],
    });
    expect(arena.productionBlockers).toEqual([
      'FRENCH_ARENA_RUNTIME_LOADER_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const flashcards = gate.queue.find((item: { id: string }) => item.id === 'flashcards_and_marketplace_cards');
    expect(flashcards.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_FLASHCARD_PACKS_NOT_FULL_COVERAGE',
        'MARKETPLACE_TEXT_CLEAN_ENCODING_NOT_PROVEN',
      ],
    });
    expect(flashcards.productionBlockers).toEqual([
      'FRENCH_FLASHCARD_RUNTIME_LOADER_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const collectibles = gate.queue.find((item: { id: string }) => item.id === 'collectible_cards');
    expect(collectibles.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_CANDIDATE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: ['FRENCH_COLLECTIBLE_CARD_PACKS_NOT_PROVEN'],
    });
    expect(collectibles.productionBlockers).toEqual([
      'COLLECTIBLE_LIVE_SOURCE_CHECK_STILL_HOLD',
      'COLLECTIBLE_IMAGE_ASSETS_STILL_HOLD',
      'FRENCH_COLLECTIBLE_RUNTIME_LOADER_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const grammarDrills = gate.queue.find((item: { id: string }) => item.id === 'prepositions_and_conjugation_drills');
    expect(grammarDrills.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_PREPOSITION_DRILLS_NOT_MATERIALIZED',
        'FRENCH_CONJUGATION_DRILLS_NOT_MATERIALIZED',
      ],
    });
    expect(grammarDrills.productionBlockers).toEqual([
      'FRENCH_GRAMMAR_DRILL_RUNTIME_LOADER_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const aiPrompts = gate.queue.find((item: { id: string }) => item.id === 'ai_prompt_surfaces');
    expect(aiPrompts.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_AI_PROMPTS_NOT_ALL_MATERIALIZED',
        'REJECTED_FRESH_AI_TEXT_RETURN_NOT_PROVEN_BLOCKED_EVERYWHERE',
      ],
    });
    expect(aiPrompts.productionBlockers).toEqual([
      'AI_PROMPT_ADMIN_OBSERVABILITY_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const personalPractice = gate.queue.find((item: { id: string }) => item.id === 'personal_practice_active_recall');
    expect(personalPractice.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: ['FRENCH_PERSONAL_PRACTICE_ACTIVE_RECALL_NOT_BRIDGED'],
    });
    expect(personalPractice.productionBlockers).toEqual([
      'FRENCH_PERSONAL_PRACTICE_NATIVE_DIAGNOSIS_BANK_STILL_HOLD',
      'PROBLEM_COACH_ROUTE_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const adminSurfaces = gate.queue.find((item: { id: string }) => item.id === 'admin_surfaces');
    expect(adminSurfaces.bridgeGate).toMatchObject({
      status: 'PASS_ADMIN_SURFACES_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'OFFICIAL_FRENCH_ADMIN_SURFACES_NOT_OBSERVED',
        'ADMIN_SOURCE_LOCALE_DIMENSION_NOT_PROVEN',
        'ADMIN_EQUIVALENCE_BLOCKED_ROWS_REMAIN',
      ],
      missingSurfaces: [],
    });
    expect(adminSurfaces.bridgeGate.remainingBlockers).toEqual(expect.arrayContaining([
      'admin_official_fr_write_surface_still_absent',
      'official_fr_write_surface_absent',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]));
    expect(adminSurfaces.productionBlockers).toEqual([
      'ADMIN_ACTIVATION_ROLLBACK_NOT_READY',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const dailyPhrases = gate.queue.find((item: { id: string }) => item.id === 'daily_phrases');
    expect(dailyPhrases.bridgeGate).toMatchObject({
      status: 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: [
        'FRENCH_DAILY_PHRASES_NOT_PRODUCTION_PROVEN',
        'DAILY_PHRASE_ADMIN_RUNTIME_HOLD',
      ],
    });
    expect(dailyPhrases.productionBlockers).toEqual([
      'DAILY_PHRASE_LIVE_UPLOAD_STILL_HOLD',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    const storageCloud = gate.queue.find((item: { id: string }) => item.id === 'storage_cloud_runtime_isolation');
    expect(storageCloud.bridgeGate).toMatchObject({
      status: 'PASS_ISOLATION_READY_GLOBAL_FRENCH_HOLD',
      localSurfaceReady: true,
      closedLocalBlockers: ['STORAGE_CLOUD_FULL_ISOLATION_NOT_FINAL_APPROVED'],
    });
    expect(storageCloud.productionBlockers).toEqual([
      'RUNTIME_DOWNLOADS_STILL_CLOSED',
      'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD',
    ]);
    expect(gate.queue.find((item: { id: string }) => item.id === 'ai_prompt_surfaces').exactFiles)
      .toContain('functions/src/weekly_review.ts');
    expect(gate.qualityFindings.note).toContain('not permission to delete surfaces');
    expect(gate.qualityFindings.mojibakeHits).toEqual([]);
    expect(gate.qualityFindings.placeholderHits).toEqual([]);
    expect(gate.nextPassPlan[0]).toContain('Close core lesson delivery evidence');
    expect(gate.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    });
  });
});
