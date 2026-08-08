import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'closeout');
const OUT_JSON = path.join(OUT_DIR, 'fr_full_surface_closeout_work_order_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_full_surface_closeout_work_order_v1.md');

const INPUTS = {
  backlog: 'docs/gustav/generated/fr/english_blueprint/fr_non_lesson_surface_backlog_gate_v1.json',
  core: 'docs/gustav/generated/fr/core_lessons_32/fr_core_lesson_delivery_closeout_bridge_gate_v1.json',
  missingReview: 'docs/gustav/generated/fr/reviewer/fr_lesson_missing_review_batch_work_order_audit_v1.json',
  reviewReadiness: 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_execution_readiness_gate_audit_v1.json',
  reviewBatchPlan: 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_batch_plan_audit_v1.json',
  reviewExternalHandoff: 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_external_handoff_v1.json',
  nonAcceptedFixWorkOrder: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_non_accepted_fix_work_order_audit_v1.json',
  correctionCandidateWorkOrder: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_work_order_audit_v1.json',
  correctionCandidateReviewRequests: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_requests_audit_v1.json',
  correctionCandidateReviewExternalHandoff: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_external_handoff_v1.json',
  correctionCandidateDecisionSchemaGate: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_decision_schema_gate_audit_v1.json',
  correctionCandidateImportDryRun: 'docs/gustav/generated/fr/reviewer/work_orders/fr_lesson_correction_candidate_review_import_dry_run_audit_v1.json',
  theory: 'docs/gustav/generated/fr/theory/fr_theory_vocab_intro_parity_gate_v1.json',
  grammar: 'docs/gustav/generated/fr/grammar/fr_grammar_drill_global_readiness_bridge_gate_v1.json',
  personalPractice: 'docs/gustav/generated/fr/personal_practice/fr_personal_practice_active_recall_global_readiness_bridge_gate_v1.json',
  flashcards: 'docs/gustav/generated/fr/flashcards/fr_flashcard_global_readiness_bridge_gate_v1.json',
  collectibles: 'docs/gustav/generated/fr/collectibles/fr_collectible_candidate_bridge_gate_v1.json',
  dailyPhrases: 'docs/gustav/generated/fr/daily_phrases/fr_daily_phrase_global_readiness_bridge_gate_v1.json',
  aiPrompts: 'docs/gustav/generated/fr/ai_prompts/fr_ai_prompt_parity_gate_v1.json',
  admin: 'docs/gustav/generated/fr/admin/fr_admin_global_readiness_bridge_gate_v1.json',
  storageCloud: 'docs/gustav/generated/fr/storage/fr_storage_cloud_isolation_bridge_gate_v1.json',
};

function abs(relPath) {
  return path.join(ROOT, relPath);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(abs(relPath), 'utf8'));
}

function compactBlockers(...lists) {
  return [...new Set(lists.flat().filter(Boolean))];
}

function pickSummary(summary, keys) {
  const out = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(summary ?? {}, key)) out[key] = summary[key];
  }
  return out;
}

function statusKind(status) {
  if (typeof status !== 'string') return 'UNKNOWN';
  if (status.startsWith('PASS_')) return 'LOCAL_PASS_GLOBAL_HOLD';
  if (status.startsWith('HOLD_')) return 'HOLD';
  if (status.startsWith('BLOCK')) return 'BLOCK';
  return status;
}

function makeSurface({
  id,
  name,
  priority,
  gate,
  evidence,
  counts,
  doneMeans,
  nextWork,
  blockers = [],
  commands = [],
}) {
  return {
    id,
    name,
    priority,
    gateStatus: gate.status,
    state: statusKind(gate.status),
    localEvidenceReady: gate.status?.startsWith('PASS_') ?? false,
    readyForRuntimeEnable: false,
    readyForServerUpload: false,
    readyForAppApply: false,
    activationApproved: false,
    evidence,
    counts,
    doneMeans,
    remainingBlockers: compactBlockers(blockers, gate.blockers, gate.productionBlockers, gate.remainingProductionHolds),
    nextWork,
    nextCommands: commands,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const backlog = readJson(INPUTS.backlog);
  const core = readJson(INPUTS.core);
  const missingReview = readJson(INPUTS.missingReview);
  const reviewReadiness = readJson(INPUTS.reviewReadiness);
  const reviewBatchPlan = readJson(INPUTS.reviewBatchPlan);
  const reviewExternalHandoff = readJson(INPUTS.reviewExternalHandoff);
  const nonAcceptedFixWorkOrder = readJson(INPUTS.nonAcceptedFixWorkOrder);
  const correctionCandidateWorkOrder = readJson(INPUTS.correctionCandidateWorkOrder);
  const correctionCandidateReviewRequests = readJson(INPUTS.correctionCandidateReviewRequests);
  const correctionCandidateReviewExternalHandoff = readJson(INPUTS.correctionCandidateReviewExternalHandoff);
  const correctionCandidateDecisionSchemaGate = readJson(INPUTS.correctionCandidateDecisionSchemaGate);
  const correctionCandidateImportDryRun = readJson(INPUTS.correctionCandidateImportDryRun);
  const theory = readJson(INPUTS.theory);
  const grammar = readJson(INPUTS.grammar);
  const personalPractice = readJson(INPUTS.personalPractice);
  const flashcards = readJson(INPUTS.flashcards);
  const collectibles = readJson(INPUTS.collectibles);
  const dailyPhrases = readJson(INPUTS.dailyPhrases);
  const aiPrompts = readJson(INPUTS.aiPrompts);
  const admin = readJson(INPUTS.admin);
  const storageCloud = readJson(INPUTS.storageCloud);

  const surfaces = [
    makeSurface({
      id: 'core_lessons_32',
      name: '32 core lessons',
      priority: 1,
      gate: core,
      evidence: [
        INPUTS.core,
        INPUTS.missingReview,
        INPUTS.reviewReadiness,
        INPUTS.reviewBatchPlan,
        INPUTS.reviewExternalHandoff,
        INPUTS.nonAcceptedFixWorkOrder,
        INPUTS.correctionCandidateWorkOrder,
        INPUTS.correctionCandidateReviewRequests,
        INPUTS.correctionCandidateReviewExternalHandoff,
        INPUTS.correctionCandidateDecisionSchemaGate,
        INPUTS.correctionCandidateImportDryRun,
      ],
      counts: {
        ...pickSummary(core.summary, [
          'requestRows',
          'decisionRows',
          'missingDecisionRows',
          'acceptedRows',
          'regenerationRows',
          'skippedRows',
          'nonAcceptedRows',
          'missingDecisionBatches',
          'missingReviewBatchArtifacts',
          'audioSlots',
          'existingAudioFiles',
        ]),
        firstMissingReviewBatchStartIndex: missingReview.summary.firstBatchStartIndex,
        missingReviewRows: missingReview.summary.missingReviewRows,
        reviewCanExecuteInCurrentProcess: reviewReadiness.summary.canExecuteLiveBatchNow,
        reviewExternalTerminalRequired: reviewReadiness.summary.liveExecutionEnvironment.externalTerminalExecutionRequired,
        reviewPlannedBatches: reviewBatchPlan.summary.plannedBatches,
        reviewExternalHandoffReady: reviewExternalHandoff.status === 'HOLD_EXTERNAL_REVIEW_HANDOFF_READY',
        reviewExternalHandoffRunner: reviewExternalHandoff.outputs.runNextBatchPowerShell,
        nonAcceptedFixWorkOrderReady: nonAcceptedFixWorkOrder.status === 'HOLD_NON_ACCEPTED_FIX_WORK_ORDER_READY',
        nonAcceptedFixRegenerationRows: nonAcceptedFixWorkOrder.summary.regenerationRows,
        nonAcceptedFixSourceRecheckRows: nonAcceptedFixWorkOrder.summary.sourceRecheckRows,
        nonAcceptedFixCorrectionPayloadRows: nonAcceptedFixWorkOrder.summary.correctionPayloadRows,
        correctionCandidateRows: correctionCandidateWorkOrder.summary.correctionCandidateRows,
        correctionCandidatesReadyForReviewRequestBuild: correctionCandidateWorkOrder.summary.readyForReviewRequestBuild,
        correctionCandidateReviewRequestRows: correctionCandidateReviewRequests.summary.reviewRequestRows,
        correctionCandidateReviewBatches: correctionCandidateReviewRequests.summary.plannedBatches,
        correctionCandidateReviewRequestsReady: correctionCandidateReviewRequests.summary.readyForExternalReview,
        correctionCandidateReviewExternalHandoffReady: correctionCandidateReviewExternalHandoff.status === 'HOLD_EXTERNAL_CORRECTION_REVIEW_HANDOFF_READY',
        correctionCandidateReviewExternalBatches: correctionCandidateReviewExternalHandoff.summary.plannedBatches,
        correctionCandidateReviewExternalRunner: correctionCandidateReviewExternalHandoff.outputs.runNextBatchPowerShell,
        correctionCandidateDecisionRows: correctionCandidateDecisionSchemaGate.summary.decisionRows,
        correctionCandidateMissingDecisionRows: correctionCandidateDecisionSchemaGate.summary.missingDecisionRows,
        correctionCandidateDecisionSchemaReady: correctionCandidateDecisionSchemaGate.summary.readyForAcceptOnlyImportDryRun,
        correctionCandidateImportDryRunReady: correctionCandidateImportDryRun.summary.schemaGateReady,
        correctionCandidateAcceptedRows: correctionCandidateImportDryRun.summary.acceptedCorrectionRows,
      },
      doneMeans: [
        'All 1600 French lesson rows accepted by LLM trusted-source review.',
        'No regeneration/skipped/non-accepted rows remain.',
        'All 1600 audio files and checksums are locked.',
        'Server payloads, manifests, runtime loader and rollback are ready before activation.',
      ],
      nextWork: [
        'Execute/import the 14 missing LLM review batches from a normal terminal when live OpenAI/spend guard is available; Codex then validates the resulting decisions.',
        'Regenerate or fix 393 non-accepted rows after review decisions are complete.',
        'Execute/import the 12 correction-candidate LLM review batches into the separate correction decision queue before any accepted correction can be staged.',
        'Only then open audio TTS/checksum planning.',
      ],
      blockers: core.blockers,
      commands: [
        'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index 1264 --limit 25 --execute --validate-after',
        'node scripts/gustav_build_fr_lesson_non_accepted_rows_gate.mjs',
        'node scripts/gustav_build_fr_core_lesson_delivery_closeout_bridge_gate.mjs',
      ],
    }),
    makeSurface({
      id: 'theory_intro_vocabulary',
      name: 'Theory, intro screens and lesson vocabulary',
      priority: 2,
      gate: theory,
      evidence: [INPUTS.theory],
      counts: pickSummary(theory.summary, ['lessonsTotal', 'lessonsPassing', 'theorySectionsTotal', 'vocabularyItemsTotal', 'introScreensTotal', 'serverPackCandidateWritten']),
      doneMeans: [
        'All 32 lessons have French-native theory sections, intro screens and vocabulary payloads.',
        'Runtime/server delivery is target-scoped and not written into app bundle as final French production content.',
      ],
      nextWork: theory.nextRequiredGlobalSteps,
      blockers: ['THEORY_VOCAB_INTRO_RUNTIME_DELIVERY_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_theory_vocab_intro_parity_gate.mjs'],
    }),
    makeSurface({
      id: 'prepositions_conjugation',
      name: 'Preposition and conjugation drills',
      priority: 5,
      gate: grammar,
      evidence: [INPUTS.grammar],
      counts: pickSummary(grammar.summary, ['prepositionLessonPacks', 'conjugationLessonPacks', 'prepositionRuntimeItems', 'conjugationRuntimeItems', 'totalRuntimeItems', 'conjugationVerbs', 'trustedSources']),
      doneMeans: [
        'English prepositions/irregular verbs are replaced by French-native preposition contractions and conjugation practice.',
        'The drills remain server-pack candidates until runtime activation is approved.',
      ],
      nextWork: grammar.nextRequiredGlobalSteps,
      blockers: ['FRENCH_GRAMMAR_DRILL_RUNTIME_LOADER_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_grammar_drill_global_readiness_bridge_gate.mjs'],
    }),
    makeSurface({
      id: 'personal_practice_active_recall',
      name: 'Personal practice and active recall',
      priority: 6,
      gate: personalPractice,
      evidence: [INPUTS.personalPractice],
      counts: pickSummary(personalPractice.summary, [
        'englishDiagnosisTrainingIds',
        'englishDiagnosisRegistryBranches',
        'nativeBankCandidateRows',
        'nativeBankReadyForLlmReview',
        'nativeBankRowsWithEnglishIdReuse',
        'nativeBankReviewRequestRows',
        'nativeBankReviewRequestsReady',
        'nativeBankExternalReviewBatches',
        'nativeBankDecisionRows',
        'nativeBankMissingDecisionRows',
        'nativeBankImportDryRunReady',
        'mistakeTaxonomyRows',
        'mistakeTaxonomyReadyForLlmReview',
        'mistakeTaxonomyRowsWithEnglishIdReuse',
        'mistakeTaxonomyReviewRequestRows',
        'mistakeTaxonomyReviewRequestsReady',
        'mistakeTaxonomyExternalReviewBatches',
        'mistakeTaxonomyDecisionRows',
        'mistakeTaxonomyMissingDecisionRows',
        'mistakeTaxonomyImportDryRunReady',
        'runtimeChecks',
        'serverChecks',
        'adminStorageChecks',
        'handoffRequirements',
      ]),
      doneMeans: [
        'French has its own diagnosis bank and mistake taxonomy, shaped like English but not copied from it.',
        'Problem coach prompts are ported for studyTarget=fr with RU/UK language contracts.',
      ],
      nextWork: personalPractice.nextRequiredGlobalSteps,
      blockers: personalPractice.remainingProductionHolds,
      commands: [],
    }),
    makeSurface({
      id: 'flashcards_marketplace',
      name: 'Flashcards and marketplace card packs',
      priority: 7,
      gate: flashcards,
      evidence: [INPUTS.flashcards],
      counts: pickSummary(flashcards.summary, ['packCount', 'cardCount', 'ruPayloadPacks', 'ukPayloadPacks', 'ruPayloadCards', 'ukPayloadCards', 'sourceEvidenceRows', 'sourceCount']),
      doneMeans: [
        'French card packs are native French reality/context packs with source evidence.',
        'RU and UK payloads are separate and target-scoped.',
      ],
      nextWork: flashcards.nextRequiredGlobalSteps,
      blockers: ['FRENCH_FLASHCARD_RUNTIME_LOADER_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_flashcard_packs_activation_readiness.mjs'],
    }),
    makeSurface({
      id: 'collectible_cards',
      name: 'Collectible cards',
      priority: 8,
      gate: collectibles,
      evidence: [INPUTS.collectibles],
      counts: pickSummary(collectibles.summary, ['sets', 'rows', 'regularCards', 'secretCards', 'sourceEvidenceRows', 'dalleQueueItems', 'generatedWebpAssets', 'liveSourceFetchedRows']),
      doneMeans: [
        'French collectibles match English collection shape but use French-native cultural/learning content.',
        'All 330 live source checks and image assets are complete before runtime/apply.',
      ],
      nextWork: collectibles.nextRequiredGlobalSteps,
      blockers: ['COLLECTIBLE_LIVE_SOURCE_CHECK_STILL_HOLD', 'COLLECTIBLE_IMAGE_ASSETS_STILL_HOLD', 'FRENCH_COLLECTIBLE_RUNTIME_LOADER_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_collectible_cards_v1.mjs'],
    }),
    makeSurface({
      id: 'daily_phrases',
      name: 'Daily phrases',
      priority: 9,
      gate: dailyPhrases,
      evidence: [INPUTS.dailyPhrases],
      counts: pickSummary(dailyPhrases.summary, ['acceptedRows', 'strictSourceBackedRows', 'ruPayloadRows', 'ukPayloadRows', 'duplicateCount', 'runtimeWired', 'uploadRehearsalPerformed', 'liveUploadPerformed']),
      doneMeans: [
        'French daily phrase bank is source-backed and target-scoped.',
        'Live upload remains closed until global French activation.',
      ],
      nextWork: dailyPhrases.nextRequiredGlobalSteps,
      blockers: ['DAILY_PHRASE_LIVE_UPLOAD_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_daily_phrases_production_v1.mjs'],
    }),
    makeSurface({
      id: 'ai_prompt_surfaces',
      name: 'AI explanations, coach prompts and generated text guards',
      priority: 10,
      gate: aiPrompts,
      evidence: [INPUTS.aiPrompts],
      counts: pickSummary(aiPrompts.summary, ['surfacesChecked', 'surfacesPassing', 'failedSurfaces', 'placeholderHitFiles', 'mojibakeHitFiles']),
      doneMeans: [
        'Every learner-facing AI path separates studyTarget, sourceLocale and UI/output language.',
        'Wrong-language fresh or cached AI text is rejected before return/cache replay.',
      ],
      nextWork: aiPrompts.nextRequiredGlobalSteps,
      blockers: ['AI_PROMPT_ADMIN_OBSERVABILITY_STILL_HOLD', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_ai_prompt_parity_gate.mjs'],
    }),
    makeSurface({
      id: 'admin_surfaces',
      name: 'Admin surfaces and rollback',
      priority: 11,
      gate: admin,
      evidence: [INPUTS.admin],
      counts: pickSummary(admin.summary, ['equivalenceRows', 'sourceLocaleRequiredRows', 'sourceLocaleProvenRows', 'officialFrenchAdminSurfacesRequired', 'officialFrenchAdminSurfacesObserved', 'dangerousOfficialFrenchAdminWrites', 'upstreamReadyCount', 'upstreamGateCount']),
      doneMeans: [
        'Admin can observe French pack readiness by source locale without opening writes early.',
        'Activation/rollback requires explicit approval receipt and hash-lock manifest.',
      ],
      nextWork: admin.nextRequiredWork,
      blockers: admin.productionBlockers,
      commands: ['node scripts/gustav_build_fr_admin_global_readiness_bridge_gate.mjs'],
    }),
    makeSurface({
      id: 'storage_cloud_runtime_isolation',
      name: 'Storage, cloud sync and runtime isolation',
      priority: 12,
      gate: storageCloud,
      evidence: [INPUTS.storageCloud],
      counts: pickSummary(storageCloud.summary, ['checksPassed', 'checksTotal', 'targetKeyDomains', 'exportedStorageKeyFactories', 'requiredFrenchFactoryRefs', 'frenchFactoryRefs', 'missingFrenchFactoryRefs']),
      doneMeans: [
        'French state never shares English cache/cloud/storage keys.',
        'Runtime downloads stay closed until all content/server/admin gates pass.',
      ],
      nextWork: storageCloud.nextRequiredGlobalSteps,
      blockers: ['RUNTIME_DOWNLOADS_STILL_CLOSED', 'GLOBAL_FRENCH_ACTIVATION_STILL_HOLD'],
      commands: ['node scripts/gustav_build_fr_storage_cloud_isolation_gate.mjs'],
    }),
  ];

  const localReadySurfaces = surfaces.filter((surface) => surface.localEvidenceReady).length;
  const hardHoldSurfaces = surfaces.filter((surface) => surface.state === 'HOLD').length;
  const allBlockers = compactBlockers(surfaces.flatMap((surface) => surface.remainingBlockers));

  const workOrder = {
    schemaVersion: 'gustav-fr-full-surface-closeout-work-order-v1',
    generatedAt,
    status: 'HOLD',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForAppApply: false,
    readyForServerUpload: false,
    readyForRuntimeDownloads: false,
    inputs: INPUTS,
    summary: {
      surfacesTotal: surfaces.length,
      localReadySurfaces,
      hardHoldSurfaces,
      globalHoldSurfaces: surfaces.length,
      uniqueProductionBlockers: allBlockers.length,
      backlogItems: backlog.summary.backlogItems,
      surfaceBridgeGatesPassed: backlog.summary.surfaceBridgeGatesPassed,
      coreAcceptedRows: core.summary.acceptedRows,
      coreMissingDecisionRows: core.summary.missingDecisionRows,
      coreNonAcceptedRows: core.summary.nonAcceptedRows,
      missingReviewBatchArtifacts: missingReview.summary.batchArtifacts,
      correctionCandidateReviewRequestRows: correctionCandidateReviewRequests.summary.reviewRequestRows,
      correctionCandidateReviewBatches: correctionCandidateReviewRequests.summary.plannedBatches,
      correctionCandidateReviewExternalBatches: correctionCandidateReviewExternalHandoff.summary.plannedBatches,
      correctionCandidateDecisionRows: correctionCandidateDecisionSchemaGate.summary.decisionRows,
      correctionCandidateMissingDecisionRows: correctionCandidateDecisionSchemaGate.summary.missingDecisionRows,
      theorySectionsTotal: theory.summary.theorySectionsTotal,
      vocabularyItemsTotal: theory.summary.vocabularyItemsTotal,
      grammarRuntimeItems: grammar.summary.totalRuntimeItems,
      flashcardCards: flashcards.summary.cardCount,
      collectibleRows: collectibles.summary.rows,
      dailyPhraseRowsPerLocale: dailyPhrases.summary.acceptedRows,
      aiPromptSurfacesPassing: aiPrompts.summary.surfacesPassing,
      storageIsolationChecksPassed: storageCloud.summary.checksPassed,
    },
    invariants: {
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
    },
    surfaces,
    nextPassPlan: [
      'Start with core lesson review closeout: execute the 14 missing LLM review batches when live credentials/spend guard are available.',
        'After decisions are complete, regenerate/fix all non-accepted rows and rerun the non-accepted row gate.',
        'Use the isolated non-accepted fix work order; do not write fixed rows into app/server/runtime before fresh trusted-source review passes.',
        'Execute the 12 fresh LLM review batches for the 290 isolated correction candidates before any import.',
      'Only after all 1600 rows are accepted, open audio TTS/checksum planning in dry-run first.',
      'Keep all non-lesson surfaces in global HOLD until core lesson delivery, server manifests, runtime loaders, admin approval and storage/cloud gates are green together.',
    ],
    safety: {
      productionAppFilesModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      reviewerDecisionsImportedByThisScript: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
  };

  const md = [
    '# French Full Surface Closeout Work Order',
    '',
    `Status: ${workOrder.status}`,
    `studyTarget: ${workOrder.studyTarget}`,
    `activationApproved: ${workOrder.activationApproved}`,
    '',
    '## Summary',
    '',
    `- Surfaces: ${workOrder.summary.surfacesTotal}`,
    `- Local evidence ready: ${workOrder.summary.localReadySurfaces}/${workOrder.summary.surfacesTotal}`,
    `- Core accepted rows: ${workOrder.summary.coreAcceptedRows}/1600`,
    `- Missing review rows: ${workOrder.summary.coreMissingDecisionRows}`,
    `- Non-accepted rows: ${workOrder.summary.coreNonAcceptedRows}`,
    `- Missing review batch artifacts: ${workOrder.summary.missingReviewBatchArtifacts}`,
    '',
    '## Surfaces',
    '',
    ...surfaces.flatMap((surface) => [
      `### ${surface.priority}. ${surface.name}`,
      '',
      `- id: ${surface.id}`,
      `- gate: ${surface.gateStatus}`,
      `- localEvidenceReady: ${surface.localEvidenceReady}`,
      `- blockers: ${surface.remainingBlockers.join(', ') || 'none'}`,
      `- next: ${surface.nextWork[0] ?? 'none'}`,
      '',
    ]),
  ].join('\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(workOrder, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, `${md}\n`, 'utf8');
  console.log(`HOLD ${path.relative(ROOT, OUT_JSON).replace(/\\/g, '/')} surfaces=${surfaces.length} localReady=${localReadySurfaces}/${surfaces.length} blockers=${allBlockers.length}`);
}

main();
