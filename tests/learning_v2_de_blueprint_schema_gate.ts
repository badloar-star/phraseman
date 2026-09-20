import assert from "node:assert/strict";

import {
  GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
  canonicalGermanCourseBlueprintJsonDeV1,
  parseGermanCourseBlueprintDeV1,
  type GermanCourseBlueprintDeV1,
} from "../modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

const VALID_BLUEPRINT = {
  ...GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
  artifactPaths: {
    ...GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1.artifactPaths,
    blueprintContract: "modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts",
    validationModule: "modules/learning-v2/curriculum/de/course_blueprint_validation_de_v1.ts",
    approvalRegistry: "modules/learning-v2/curriculum/de/blueprint_approval_registry_de_v1.ts",
    ownerMapBuilder: "scripts/learning-v2-de-build-owner-map.mjs",
    ownerMapHtml: ".codex-tmp/learning-v2-curriculum-owner-map-de/index.html",
    ownerMapManifest: ".codex-tmp/learning-v2-curriculum-owner-map-de/manifest.json",
    blueprintOwnerApproval: "docs/v2/curriculum/de/BLUEPRINT_OWNER_APPROVAL.md",
  },
  sourceDigests: {
    researchDossier: null,
    sourceEvidenceLedger: null,
    ownerDecisions: null,
    taskPacketStage0: null,
    requirementManifest: null,
    designSpec: null,
    implementationPlan: null,
  },
  registryDigests: {
    lessons: null,
    chapters: null,
    grammarConstructs: null,
    lexicalSenses: null,
    communicativeOutcomes: null,
    pronunciationTargets: null,
    phraseFrames: null,
    forbiddenSurfaceForms: null,
    sessionPackets: null,
  },
  graphDigests: {
    prerequisiteDag: null,
    lexicalRetrievalGraph: null,
    reviewEdges: null,
  },
  matrixDigests: {
    grammarCoverage: null,
    lexicalCoverage: null,
    canDoCoverage: null,
    pronunciationCoverage: null,
    ruUkInterference: null,
  },
  candidateFingerprint: null,
  grammarConstructs: [
    {
      id: "de_gc_statement_v2_v1",
      form: "Vorfeld + finite verb + Mittelfeld",
      function: "make a neutral statement",
      scope: { receptive: true, productive: true },
      exclusions: ["introduced subordinate clauses"],
      prerequisiteIds: [],
      firstIntroductionPacketId: "de_l01_c01_s01",
      guidedTargetPacketIds: ["de_l01_c01_s01"],
      retrievalTargetPacketIds: ["de_l01_c02_s09"],
      productionTargetPacketIds: ["de_l01_c02_s09"],
      transferTargetPacketIds: ["de_l01_c02_s09"],
      delayedTargetPacketIds: ["de_l01_c02_s09"],
      evidenceStatus: "DIRECT_SOURCE",
      evidenceIds: ["DE-GRM-SYNTAX-002"],
    },
    {
      id: "de_gc_yes_no_verberst_v1",
      form: "finite verb + subject + Mittelfeld",
      function: "ask a yes-no question",
      scope: { receptive: true, productive: true },
      exclusions: ["W-questions", "introduced subordinate clauses"],
      prerequisiteIds: ["de_gc_statement_v2_v1"],
      firstIntroductionPacketId: "de_l01_c02_s10",
      guidedTargetPacketIds: ["de_l01_c02_s10"],
      retrievalTargetPacketIds: ["de_l01_c02_s10"],
      productionTargetPacketIds: ["de_l01_c02_s10"],
      transferTargetPacketIds: ["de_l01_c02_s10"],
      delayedTargetPacketIds: ["de_l01_c02_s10"],
      evidenceStatus: "DIRECT_SOURCE",
      evidenceIds: ["DE-GRM-SYNTAX-002"],
    },
  ],
  lexicalSenses: [
    {
      id: "de_lex_bahnhof_n_1",
      lemma: "Bahnhof",
      senseGloss: "railway station",
      partOfSpeech: "noun",
      nounGender: "der",
      nounPlural: "Bahnh\u00f6fe",
      verbValency: null,
      verbFrame: null,
      verbSeparability: null,
      verbAuxiliary: null,
      productionPolicy: "productive",
      region: null,
      evidenceIds: ["DE-RSCH-GOETHE-004"],
    },
    {
      id: "de_lex_helfen_v_1",
      lemma: "helfen",
      senseGloss: "help someone",
      partOfSpeech: "verb",
      nounGender: null,
      nounPlural: null,
      verbValency: ["Dativ"],
      verbFrame: "jemandem helfen",
      verbSeparability: "INSEPARABLE",
      verbAuxiliary: "haben",
      productionPolicy: "productive",
      region: null,
      evidenceIds: ["DE-GRM-CASE-001"],
    },
    {
      id: "de_lex_schnell_adj_1",
      lemma: "schnell",
      senseGloss: "fast",
      partOfSpeech: "adjective",
      nounGender: null,
      nounPlural: null,
      verbValency: null,
      verbFrame: null,
      verbSeparability: null,
      verbAuxiliary: null,
      productionPolicy: "receptive",
      region: null,
      evidenceIds: ["DE-RSCH-GOETHE-004"],
    },
    {
      id: "de_lex_paradeiser_n_1",
      lemma: "Paradeiser",
      senseGloss: "Austrian standard German: tomato",
      partOfSpeech: "noun",
      nounGender: "der",
      nounPlural: "Paradeiser",
      verbValency: null,
      verbFrame: null,
      verbSeparability: null,
      verbAuxiliary: null,
      productionPolicy: "regional_receptive",
      region: "AT",
      evidenceIds: ["DE-REG-VARIETY-001"],
    },
  ],
  communicativeOutcomes: [
    {
      id: "de_out_ask_for_travel_help_v1",
      cefrBand: "A1",
      canDo: "ask a short question for help at a station",
      evidenceIds: ["DE-RSCH-CEFR-004"],
    },
  ],
  pronunciationTargets: [
    {
      id: "de_pron_front_rounded_ue_v1",
      target: "front rounded \u00fc vowel",
      perceptionEvidenceIds: ["DE-PHON-RU-002", "DE-PHON-UK-002"],
      productionEvidenceIds: ["DE-PHON-RU-002", "DE-PHON-UK-002"],
      ruApplicability: {
        status: "APPLIES",
        correctiveRoute: "contrast and round the vowel before guided production",
        rationale: "RU-specific direct evidence supports an active corrective route",
        evidenceBindings: [
          {
            kind: "CANONICAL_BINDING",
            evidenceId: "DE-PHON-RU-002",
            evidenceStatus: "DIRECT_L2_RU",
          },
        ],
      },
      ukApplicability: {
        status: "DIAGNOSTIC_ONLY",
        correctiveRoute: "diagnose contrast before offering a corrective cue",
        rationale: "contrastive risk is diagnostic and is not presumed for every learner",
        evidenceBindings: [
          {
            kind: "CANONICAL_BINDING",
            evidenceId: "DE-PHON-UK-002",
            evidenceStatus: "CONTRASTIVE_RISK",
          },
        ],
      },
    },
  ],
  forbiddenSurfaceForms: [
    {
      id: "de_forbid_future_werden_v1",
      surface: "werden + Infinitiv",
      reason: "future reference with Pr\u00e4sens must be established first",
      unlockConstructIds: ["de_gc_yes_no_verberst_v1"],
      evidenceIds: ["DE-GRM-FUTURE-001", "DE-GRM-FUTURE-002"],
    },
  ],
  phraseFrames: [
    {
      id: "de_pf_station_question_v1",
      frame: "Ist der Bahnhof ...?",
      grammarConstructIds: ["de_gc_yes_no_verberst_v1"],
      lexicalSenseIds: ["de_lex_bahnhof_n_1"],
      communicativeOutcomeIds: ["de_out_ask_for_travel_help_v1"],
      forbiddenSurfaceFormIds: ["de_forbid_future_werden_v1"],
      evidenceIds: ["DE-GRM-SYNTAX-002"],
    },
  ],
  sessionPackets: [
    {
      id: "de_l01_c01_s01",
      lessonOrdinal: 1,
      chapterOrdinal: 1,
      sessionOrdinal: 1,
      sessionWithinChapter: 1,
      sourcePath: "content/learning-v2-course/curriculum/de/packets/l01/s01.json",
      grammarConstructId: "de_gc_statement_v2_v1",
      reviewConstructIds: [],
      communicativeOutcomeIds: ["de_out_ask_for_travel_help_v1"],
      prerequisiteOutcomeIds: [],
      prerequisiteConstructIds: [],
      prerequisitePacketIds: [],
      prohibitedConstructIds: ["de_gc_yes_no_verberst_v1"],
      forbiddenSurfaceFormIds: ["de_forbid_future_werden_v1"],
      situation: {
        id: "de_sit_station_information_v1",
        description: "requesting information at a railway station",
        contextSignature: "station_information_counter",
      },
      learningDelta: {
        kind: "new_operation",
        description: "produce a bounded neutral V2 statement",
      },
      newLexicalSenseIds: ["de_lex_bahnhof_n_1"],
      primaryLexicalSenseIds: ["de_lex_bahnhof_n_1"],
      wordFirstGroundingLexicalSenseIds: ["de_lex_bahnhof_n_1"],
      retrievalLexicalSenseIds: [],
      phraseFrameIds: ["de_pf_station_question_v1"],
      canonicalExamples: ["Der Bahnhof ist hier.", "Hier ist der Bahnhof."],
      allowedLexicalSlots: [
        {
          id: "de_slot_place_v1",
          lexicalSenseIds: ["de_lex_bahnhof_n_1"],
        },
      ],
      sessionRole: "grammar_introduction",
      modeFamilies: ["word_grounding", "guided_retrieval"],
      supportTrajectory: {
        guided: "high",
        retrieval: "medium",
        independent: "low",
      },
      independentProbe: {
        trainingContextSignature: "station_information_counter",
        probeContextSignature: "street_direction_request",
        changedContextRequired: true,
        support: "low",
        lexicalSenseIds: ["de_lex_bahnhof_n_1"],
      },
      delayedProbes: [
        {
          targetPacketId: "de_l01_c02_s09",
          retrievalKind: "cross_chapter",
          contextSignature: "later_station_transfer",
        },
      ],
      accessibilityAlternative: {
        modality: "text_non_speech",
        description: "typed production with the same grammar target",
      },
      audioSemanticsRequired: true,
      phoneticDistractorCheckRequired: true,
      reviewEdgeIds: [],
      pronunciationTargetIds: ["de_pron_front_rounded_ue_v1"],
      evidenceIds: ["DE-GRM-SYNTAX-002"],
      sourceHashes: [
        {
          path: "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
          sha256: SHA_A,
        },
        {
          path: "modules/learning-v2/curriculum/de/research_authority_de_v1.ts",
          sha256: SHA_B,
        },
      ],
    },
    {
      id: "de_l01_c02_s09",
      lessonOrdinal: 1,
      chapterOrdinal: 2,
      sessionOrdinal: 9,
      sessionWithinChapter: 1,
      sourcePath: "content/learning-v2-course/curriculum/de/packets/l01/s09.json",
      grammarConstructId: null,
      reviewConstructIds: ["de_gc_statement_v2_v1"],
      communicativeOutcomeIds: ["de_out_ask_for_travel_help_v1"],
      prerequisiteOutcomeIds: ["de_out_ask_for_travel_help_v1"],
      prerequisiteConstructIds: [],
      prerequisitePacketIds: [],
      prohibitedConstructIds: [],
      forbiddenSurfaceFormIds: ["de_forbid_future_werden_v1"],
      situation: {
        id: "de_sit_platform_change_v1",
        description: "responding to a platform change",
        contextSignature: "platform_change_announcement",
      },
      learningDelta: {
        kind: "changed_context",
        description: "retrieve the statement pattern in a changed travel context",
      },
      newLexicalSenseIds: ["de_lex_schnell_adj_1"],
      primaryLexicalSenseIds: ["de_lex_schnell_adj_1"],
      wordFirstGroundingLexicalSenseIds: ["de_lex_schnell_adj_1"],
      retrievalLexicalSenseIds: ["de_lex_bahnhof_n_1"],
      phraseFrameIds: ["de_pf_station_question_v1"],
      canonicalExamples: ["Der Bahnhof ist nah.", "Der Bahnhof ist nicht weit."],
      allowedLexicalSlots: [
        {
          id: "de_slot_place_retrieval_v1",
          lexicalSenseIds: ["de_lex_bahnhof_n_1", "de_lex_schnell_adj_1"],
        },
      ],
      sessionRole: "retrieval",
      modeFamilies: ["guided_retrieval", "changed_context_transfer"],
      supportTrajectory: {
        guided: "medium",
        retrieval: "low",
        independent: "none",
      },
      independentProbe: {
        trainingContextSignature: "platform_change_announcement",
        probeContextSignature: "hotel_direction_request",
        changedContextRequired: true,
        support: "none",
        lexicalSenseIds: ["de_lex_schnell_adj_1", "de_lex_bahnhof_n_1"],
      },
      delayedProbes: [],
      accessibilityAlternative: {
        modality: "visual_non_audio",
        description: "visual context cards with typed response",
      },
      audioSemanticsRequired: true,
      phoneticDistractorCheckRequired: false,
      reviewEdgeIds: ["de_edge_review_statement_v1"],
      pronunciationTargetIds: [],
      evidenceIds: ["DE-GRM-SYNTAX-002"],
      sourceHashes: [
        {
          path: "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
          sha256: SHA_A,
        },
      ],
    },
    {
      id: "de_l01_c02_s10",
      lessonOrdinal: 1,
      chapterOrdinal: 2,
      sessionOrdinal: 10,
      sessionWithinChapter: 2,
      sourcePath: "content/learning-v2-course/curriculum/de/packets/l01/s10.json",
      grammarConstructId: "de_gc_yes_no_verberst_v1",
      reviewConstructIds: [],
      communicativeOutcomeIds: ["de_out_ask_for_travel_help_v1"],
      prerequisiteOutcomeIds: ["de_out_ask_for_travel_help_v1"],
      prerequisiteConstructIds: ["de_gc_statement_v2_v1"],
      prerequisitePacketIds: ["de_l01_c01_s01"],
      prohibitedConstructIds: [],
      forbiddenSurfaceFormIds: ["de_forbid_future_werden_v1"],
      situation: {
        id: "de_sit_station_help_request_v1",
        description: "asking whether someone can help at a railway station",
        contextSignature: "station_help_request",
      },
      learningDelta: {
        kind: "new_operation",
        description: "produce a bounded yes-no question with verb-first order",
      },
      newLexicalSenseIds: ["de_lex_helfen_v_1"],
      primaryLexicalSenseIds: ["de_lex_helfen_v_1"],
      wordFirstGroundingLexicalSenseIds: ["de_lex_helfen_v_1"],
      retrievalLexicalSenseIds: [],
      phraseFrameIds: ["de_pf_station_question_v1"],
      canonicalExamples: ["Hilfst du mir?", "Helfen Sie mir?"],
      allowedLexicalSlots: [
        {
          id: "de_slot_help_request_v1",
          lexicalSenseIds: ["de_lex_helfen_v_1"],
        },
      ],
      sessionRole: "grammar_introduction",
      modeFamilies: ["word_grounding", "guided_retrieval"],
      supportTrajectory: {
        guided: "high",
        retrieval: "medium",
        independent: "low",
      },
      independentProbe: {
        trainingContextSignature: "station_help_request",
        probeContextSignature: "hotel_help_request",
        changedContextRequired: true,
        support: "low",
        lexicalSenseIds: ["de_lex_helfen_v_1"],
      },
      delayedProbes: [],
      accessibilityAlternative: {
        modality: "text_non_speech",
        description: "typed question production with the same grammar target",
      },
      audioSemanticsRequired: true,
      phoneticDistractorCheckRequired: false,
      reviewEdgeIds: [],
      pronunciationTargetIds: [],
      evidenceIds: ["DE-GRM-SYNTAX-002"],
      sourceHashes: [
        {
          path: "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
          sha256: SHA_A,
        },
      ],
    },
  ],
  graphs: {
    prerequisiteDag: [
      {
        id: "de_edge_prereq_statement_question_v1",
        prerequisiteId: "de_gc_statement_v2_v1",
        dependentId: "de_gc_yes_no_verberst_v1",
        evidenceIds: ["DE-GRM-SYNTAX-002"],
      },
    ],
    lexicalRetrievalGraph: [
      {
        id: "de_edge_lex_bahnhof_retrieval_v1",
        lexicalSenseId: "de_lex_bahnhof_n_1",
        fromPacketId: "de_l01_c01_s01",
        toPacketId: "de_l01_c02_s09",
        retrievalKind: "cross_chapter",
      },
    ],
    reviewEdges: [
      {
        id: "de_edge_review_statement_v1",
        fromPacketId: "de_l01_c01_s01",
        toPacketId: "de_l01_c02_s09",
        grammarConstructIds: ["de_gc_statement_v2_v1"],
        lexicalSenseIds: ["de_lex_bahnhof_n_1"],
        learningDelta: "changed_context",
      },
    ],
  },
  matrices: {
    grammarCoverage: [
      {
        grammarConstructId: "de_gc_statement_v2_v1",
        explainPacketIds: ["de_l01_c01_s01"],
        discriminatePacketIds: ["de_l01_c02_s09"],
        guidedRetrievePacketIds: ["de_l01_c01_s01"],
        independentProducePacketIds: ["de_l01_c02_s09"],
        changedContextTransferPacketIds: ["de_l01_c02_s09"],
        delayedRetrievePacketIds: ["de_l01_c02_s09"],
      },
    ],
    lexicalCoverage: [
      {
        lexicalSenseId: "de_lex_bahnhof_n_1",
        firstEncounterPacketId: "de_l01_c01_s01",
        meaningRetrievalPacketIds: ["de_l01_c02_s09"],
        formRetrievalPacketIds: ["de_l01_c02_s09"],
        phraseUsePacketIds: ["de_l01_c01_s01"],
        spokenUsePacketIds: ["de_l01_c02_s09"],
        crossSessionPacketIds: ["de_l01_c02_s09"],
        crossLessonPacketIds: [],
        delayedRetrievePacketIds: ["de_l01_c02_s09"],
      },
    ],
    canDoCoverage: [
      {
        communicativeOutcomeId: "de_out_ask_for_travel_help_v1",
        receptionPacketIds: ["de_l01_c01_s01"],
        productionOrInteractionPacketIds: ["de_l01_c02_s09"],
        transferPacketIds: ["de_l01_c02_s09"],
      },
    ],
    pronunciationCoverage: [
      {
        pronunciationTargetId: "de_pron_front_rounded_ue_v1",
        perceptionPacketIds: ["de_l01_c01_s01"],
        productionPacketIds: ["de_l01_c02_s09"],
      },
    ],
    ruUkInterference: [
      {
        pronunciationTargetId: "de_pron_front_rounded_ue_v1",
        ruPacketIds: ["de_l01_c01_s01"],
        ukPacketIds: ["de_l01_c02_s09"],
      },
    ],
  },
} satisfies GermanCourseBlueprintDeV1;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const expectFailure = (value: unknown, pattern: RegExp): void => {
  assert.throws(() => parseGermanCourseBlueprintDeV1(value), pattern);
};

const empty = parseGermanCourseBlueprintDeV1(
  GERMAN_COURSE_BLUEPRINT_EMPTY_SKELETON_DE_V1,
);
assert.deepEqual(empty.declaredCounts, {
  lessons: 32,
  chapters: 224,
  sessionPackets: 1792,
});
assert.deepEqual(empty.grammarConstructs, []);
assert.deepEqual(empty.lexicalSenses, []);
assert.deepEqual(empty.communicativeOutcomes, []);
assert.deepEqual(empty.pronunciationTargets, []);
assert.deepEqual(empty.phraseFrames, []);
assert.deepEqual(empty.forbiddenSurfaceForms, []);
assert.deepEqual(empty.sessionPackets, []);
assert.deepEqual(empty.graphs, {
  prerequisiteDag: [],
  lexicalRetrievalGraph: [],
  reviewEdges: [],
});
assert.deepEqual(empty.matrices, {
  grammarCoverage: [],
  lexicalCoverage: [],
  canDoCoverage: [],
  pronunciationCoverage: [],
  ruUkInterference: [],
});
assert.equal(empty.candidateFingerprint, null);

const parsed = parseGermanCourseBlueprintDeV1(VALID_BLUEPRINT);
assert.ok(Object.isFrozen(parsed));
assert.ok(Object.isFrozen(parsed.grammarConstructs));
assert.ok(Object.isFrozen(parsed.grammarConstructs[0].scope));
assert.ok(Object.isFrozen(parsed.sessionPackets[0].sourceHashes));
assert.ok(Object.isFrozen(parsed.sessionPackets[0].sourceHashes[0]));
assert.equal(parsed.sessionPackets[1].id, "de_l01_c02_s09");
assert.equal(parsed.sessionPackets[1].sessionOrdinal, 9);
assert.equal(
  parsed.sessionPackets[1].sourcePath,
  "content/learning-v2-course/curriculum/de/packets/l01/s09.json",
);
assert.equal(
  parsed.pronunciationTargets[0].ruApplicability.evidenceBindings[0].evidenceStatus,
  "DIRECT_L2_RU",
);
assert.equal(
  parsed.pronunciationTargets[0].ukApplicability.evidenceBindings[0].evidenceStatus,
  "CONTRASTIVE_RISK",
);
assert.equal(
  parsed.artifactPaths.ownerMapManifest,
  ".codex-tmp/learning-v2-curriculum-owner-map-de/manifest.json",
);

const pedagogicalInferenceBlueprint = parseGermanCourseBlueprintDeV1({
  ...VALID_BLUEPRINT,
  pronunciationTargets: [{
    ...VALID_BLUEPRINT.pronunciationTargets[0],
    ruApplicability: {
      status: "APPLIES",
      correctiveRoute: "use a rounded-vowel cue, then verify by perception before production",
      rationale: "the route is a bounded pedagogical inference, not a nationality prediction",
      evidenceBindings: [{
        kind: "PEDAGOGICAL_INFERENCE",
        evidenceStatus: "PEDAGOGICAL_INFERENCE",
        rationale: "system evidence plus RU-specific evidence justify testing this route",
        supportingEvidenceBindings: [
          {
            evidenceId: "DE-PHON-RU-002",
            evidenceStatus: "DIRECT_L2_RU",
          },
        ],
      }],
    },
  }],
});
assert.equal(
  pedagogicalInferenceBlueprint.pronunciationTargets[0]
    .ruApplicability.evidenceBindings[0].evidenceStatus,
  "PEDAGOGICAL_INFERENCE",
);

const notApplicableBlueprint = parseGermanCourseBlueprintDeV1({
  ...VALID_BLUEPRINT,
  pronunciationTargets: [{
    ...VALID_BLUEPRINT.pronunciationTargets[0],
    perceptionEvidenceIds: ["DE-PHON-RU-002"],
    productionEvidenceIds: ["DE-PHON-RU-002"],
    ukApplicability: {
      status: "NOT_APPLICABLE",
      correctiveRoute: null,
      rationale: "no UK-specific learner route is claimed for this bounded target",
      evidenceBindings: [],
    },
  }],
});
assert.equal(
  notApplicableBlueprint.pronunciationTargets[0].ukApplicability.correctiveRoute,
  null,
);
assert.equal(parsed.lexicalSenses[3].lemma, "Paradeiser");
assert.equal(parsed.lexicalSenses[3].productionPolicy, "regional_receptive");
assert.equal(parsed.lexicalSenses[3].region, "AT");

expectFailure(
  { ...VALID_BLUEPRINT, invented: true },
  /unknown_field:\$\.invented/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{ ...VALID_BLUEPRINT.grammarConstructs[0], invented: true }],
  },
  /unknown_field:\$\.grammarConstructs\[0\]\.invented/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{ ...VALID_BLUEPRINT.grammarConstructs[0], id: "en_gc_statement_v2_v1" }],
  },
  /german_id_invalid:\$\.grammarConstructs\[0\]\.id/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    artifactPaths: {
      ...VALID_BLUEPRINT.artifactPaths,
      grammarRegistry: "modules/learning-v2/curriculum/en/grammar_constructs_en_v1.json",
    },
  },
  /artifact_path_invalid:\$\.artifactPaths\.grammarRegistry/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    artifactPaths: {
      ...VALID_BLUEPRINT.artifactPaths,
      ownerMapBuilder: "scripts/learning-v2-en-build-owner-map.mjs",
    },
  },
  /artifact_path_invalid:\$\.artifactPaths\.ownerMapBuilder/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    artifactPaths: {
      ...VALID_BLUEPRINT.artifactPaths,
      blueprintContract: "modules/learning-v2/curriculum/en/course_blueprint_contract_en_v1.ts",
    },
  },
  /artifact_path_invalid:\$\.artifactPaths\.blueprintContract/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sourceDigests: { ...VALID_BLUEPRINT.sourceDigests, invented: null },
  },
  /unknown_field:\$\.sourceDigests\.invented/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    communicativeOutcomes: [{ ...VALID_BLUEPRINT.communicativeOutcomes[0], invented: true }],
  },
  /unknown_field:\$\.communicativeOutcomes\[0\]\.invented/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      prerequisiteDag: [{ ...VALID_BLUEPRINT.graphs.prerequisiteDag[0], invented: true }],
    },
  },
  /unknown_field:\$\.graphs\.prerequisiteDag\[0\]\.invented/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    matrices: {
      ...VALID_BLUEPRINT.matrices,
      grammarCoverage: [{ ...VALID_BLUEPRINT.matrices.grammarCoverage[0], invented: true }],
    },
  },
  /unknown_field:\$\.matrices\.grammarCoverage\[0\]\.invented/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      prerequisiteDag: [],
    },
  },
  /missing_prerequisite_edge:de_gc_statement_v2_v1->de_gc_yes_no_verberst_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      prerequisiteDag: [
        ...VALID_BLUEPRINT.graphs.prerequisiteDag,
        {
          id: "de_edge_extra_question_statement_v1",
          prerequisiteId: "de_gc_yes_no_verberst_v1",
          dependentId: "de_gc_statement_v2_v1",
          evidenceIds: ["DE-GRM-SYNTAX-002"],
        },
      ],
    },
  },
  /extra_prerequisite_edge:de_gc_yes_no_verberst_v1->de_gc_statement_v2_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      prerequisiteDag: [
        ...VALID_BLUEPRINT.graphs.prerequisiteDag,
        {
          ...VALID_BLUEPRINT.graphs.prerequisiteDag[0],
          id: "de_edge_duplicate_statement_question_v1",
        },
      ],
    },
  },
  /duplicate_prerequisite_edge:de_gc_statement_v2_v1->de_gc_yes_no_verberst_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [
      {
        ...VALID_BLUEPRINT.grammarConstructs[0],
        prerequisiteIds: ["de_gc_yes_no_verberst_v1"],
      },
      VALID_BLUEPRINT.grammarConstructs[1],
    ],
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      prerequisiteDag: [
        ...VALID_BLUEPRINT.graphs.prerequisiteDag,
        {
          id: "de_edge_cycle_question_statement_v1",
          prerequisiteId: "de_gc_yes_no_verberst_v1",
          dependentId: "de_gc_statement_v2_v1",
          evidenceIds: ["DE-GRM-SYNTAX-002"],
        },
      ],
    },
  },
  /prerequisite_graph_cycle/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [
      {
        ...VALID_BLUEPRINT.grammarConstructs[0],
        firstIntroductionPacketId: "de_l01_c02_s09",
      },
      VALID_BLUEPRINT.grammarConstructs[1],
    ],
  },
  /grammar_first_introduction_packet_mismatch:de_gc_statement_v2_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        grammarConstructId: "de_gc_statement_v2_v1",
        reviewConstructIds: [],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /grammar_construct_introduction_count_invalid:de_gc_statement_v2_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [
      {
        ...VALID_BLUEPRINT.grammarConstructs[0],
        firstIntroductionPacketId: "de_l01_c02_s10",
      },
      {
        ...VALID_BLUEPRINT.grammarConstructs[1],
        firstIntroductionPacketId: "de_l01_c01_s01",
      },
    ],
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        grammarConstructId: "de_gc_yes_no_verberst_v1",
      },
      VALID_BLUEPRINT.sessionPackets[1],
      {
        ...VALID_BLUEPRINT.sessionPackets[2],
        grammarConstructId: "de_gc_statement_v2_v1",
      },
    ],
  },
  /grammar_prerequisite_introduction_not_earlier:de_gc_statement_v2_v1->de_gc_yes_no_verberst_v1/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      lexicalRetrievalGraph: [{
        ...VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
        fromPacketId: "de_l01_c02_s09",
        toPacketId: "de_l01_c01_s01",
      }],
    },
  },
  /graph_edge_chronology_invalid:de_edge_lex_bahnhof_retrieval_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      lexicalRetrievalGraph: [{
        ...VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
        lexicalSenseId: "de_lex_schnell_adj_1",
      }],
    },
  },
  /lexical_retrieval_source_not_introduction:de_edge_lex_bahnhof_retrieval_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        retrievalLexicalSenseIds: [],
        independentProbe: {
          ...VALID_BLUEPRINT.sessionPackets[1].independentProbe,
          lexicalSenseIds: ["de_lex_schnell_adj_1"],
        },
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /lexical_retrieval_target_missing_sense:de_edge_lex_bahnhof_retrieval_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      lexicalRetrievalGraph: [{
        ...VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
        retrievalKind: "cross_session",
      }],
    },
  },
  /lexical_retrieval_scope_mismatch:de_edge_lex_bahnhof_retrieval_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      lexicalRetrievalGraph: [{
        ...VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
        retrievalKind: "delayed",
      }],
    },
  },
  /retrieval_kind_invalid:\$\.graphs\.lexicalRetrievalGraph\[0\]\.retrievalKind/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      lexicalRetrievalGraph: [
        VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
        {
          ...VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
          id: "de_edge_lex_bahnhof_retrieval_duplicate_v1",
        },
      ],
    },
  },
  /duplicate_lexical_retrieval_relationship/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      lexicalRetrievalGraph: [
        VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
        {
          ...VALID_BLUEPRINT.graphs.lexicalRetrievalGraph[0],
          id: "de_edge_lex_bahnhof_retrieval_different_kind_v1",
          retrievalKind: "cross_session",
        },
      ],
    },
  },
  /duplicate_lexical_retrieval_relationship/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      reviewEdges: [{
        ...VALID_BLUEPRINT.graphs.reviewEdges[0],
        fromPacketId: "de_l01_c02_s09",
        toPacketId: "de_l01_c01_s01",
      }],
    },
  },
  /graph_edge_chronology_invalid:de_edge_review_statement_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        reviewEdgeIds: ["de_edge_review_statement_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /review_edge_target_mismatch:de_edge_review_statement_v1->de_l01_c01_s01/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        reviewEdgeIds: [],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /missing_packet_review_edge_reference:de_edge_review_statement_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    graphs: {
      ...VALID_BLUEPRINT.graphs,
      reviewEdges: [
        VALID_BLUEPRINT.graphs.reviewEdges[0],
        {
          ...VALID_BLUEPRINT.graphs.reviewEdges[0],
          id: "de_edge_review_statement_duplicate_v1",
        },
      ],
    },
  },
  /duplicate_review_relationship/u,
);

for (const matrixKey of [
  "grammarCoverage",
  "lexicalCoverage",
  "canDoCoverage",
  "pronunciationCoverage",
  "ruUkInterference",
] as const) {
  const matrices = clone(VALID_BLUEPRINT.matrices) as unknown as Record<string, unknown>;
  const rows = matrices[matrixKey] as unknown[];
  matrices[matrixKey] = [...rows, clone(rows[0])];
  expectFailure(
    { ...VALID_BLUEPRINT, matrices },
    /duplicate_matrix_subject_id/u,
  );
}
expectFailure(
  {
    ...VALID_BLUEPRINT,
    matrices: {
      ...VALID_BLUEPRINT.matrices,
      grammarCoverage: [{
        ...VALID_BLUEPRINT.matrices.grammarCoverage[0],
        explainPacketIds: ["de_l01_c01_s01", "de_l01_c01_s01"],
      }],
    },
  },
  /duplicate_array_value:\$\.matrices\.grammarCoverage\[0\]\.explainPacketIds\[1\]/u,
);

for (const [key, value] of [
  ["lessons", 31],
  ["chapters", 223],
  ["sessionPackets", 1791],
] as const) {
  expectFailure(
    {
      ...VALID_BLUEPRINT,
      declaredCounts: { ...VALID_BLUEPRINT.declaredCounts, [key]: value },
    },
    new RegExp(`declared_count_invalid:\\\$\\.declaredCounts\\.${key}`, "u"),
  );
}

expectFailure(
  {
    ...VALID_BLUEPRINT,
    localePolicy: ["ru", "en"],
  },
  /locale_policy_invalid:\$\.localePolicy/u,
);

for (const invalidPacket of [
  { ...VALID_BLUEPRINT.sessionPackets[0], id: "de_l1_c01_s01" },
  {
    ...VALID_BLUEPRINT.sessionPackets[0],
    id: "de_l01_c08_s57",
    chapterOrdinal: 8,
    sessionOrdinal: 57,
  },
  {
    ...VALID_BLUEPRINT.sessionPackets[1],
    id: "de_l01_c01_s09",
    chapterOrdinal: 1,
  },
  {
    ...VALID_BLUEPRINT.sessionPackets[1],
    sessionWithinChapter: 2,
  },
  { ...VALID_BLUEPRINT.sessionPackets[0], id: "de_l02_c01_s01" },
]) {
  expectFailure(
    { ...VALID_BLUEPRINT, sessionPackets: [invalidPacket] },
    /session_identity_invalid:\$\.sessionPackets\[0\]/u,
  );
}
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      sourcePath: "content/learning-v2-course/curriculum/de/packets/l01/s02.json",
    }],
  },
  /session_source_path_invalid:\$\.sessionPackets\[0\]\.sourcePath/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      sourcePath: "content/learning-v2-course/curriculum/en/packets/l01/s01.json",
    }],
  },
  /session_source_path_invalid:\$\.sessionPackets\[0\]\.sourcePath/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{
      ...VALID_BLUEPRINT.grammarConstructs[0],
      evidenceIds: ["DE-GRM-UNKNOWN-999"],
    }],
  },
  /undeclared_evidence_id:DE-GRM-UNKNOWN-999/u,
);

for (const field of [
  "form",
  "function",
  "scope",
  "exclusions",
  "prerequisiteIds",
  "firstIntroductionPacketId",
  "guidedTargetPacketIds",
  "retrievalTargetPacketIds",
  "productionTargetPacketIds",
  "transferTargetPacketIds",
  "delayedTargetPacketIds",
  "evidenceStatus",
] as const) {
  const construct = clone(VALID_BLUEPRINT.grammarConstructs[0]) as Record<string, unknown>;
  delete construct[field];
  expectFailure(
    { ...VALID_BLUEPRINT, grammarConstructs: [construct] },
    new RegExp(`missing_field:\\\$\\.grammarConstructs\\[0\\]\\.${field}`, "u"),
  );
}
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{ ...VALID_BLUEPRINT.grammarConstructs[0], form: "" }],
  },
  /non_empty_string_required:\$\.grammarConstructs\[0\]\.form/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{
      ...VALID_BLUEPRINT.grammarConstructs[0],
      evidenceStatus: "UNREVIEWED",
    }],
  },
  /grammar_evidence_status_invalid:\$\.grammarConstructs\[0\]\.evidenceStatus/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{
      ...VALID_BLUEPRINT.grammarConstructs[0],
      transferTargetPacketIds: ["de_l01_c01_s02"],
    }],
  },
  /undeclared_session_packet_id:de_l01_c01_s02/u,
);

for (const field of [
  "lemma",
  "senseGloss",
  "partOfSpeech",
  "nounGender",
  "nounPlural",
  "verbValency",
  "verbFrame",
  "verbSeparability",
  "verbAuxiliary",
  "productionPolicy",
  "region",
] as const) {
  const sense = clone(VALID_BLUEPRINT.lexicalSenses[0]) as Record<string, unknown>;
  delete sense[field];
  expectFailure(
    { ...VALID_BLUEPRINT, lexicalSenses: [sense] },
    new RegExp(`missing_field:\\\$\\.lexicalSenses\\[0\\]\\.${field}`, "u"),
  );
}
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[0], nounGender: null }],
  },
  /noun_package_invalid:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[0], nounPlural: null }],
  },
  /noun_package_invalid:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[1], verbValency: null }],
  },
  /verb_package_invalid:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[1], verbFrame: null }],
  },
  /verb_package_invalid:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[1], verbSeparability: null }],
  },
  /verb_package_invalid:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[1], verbAuxiliary: null }],
  },
  /verb_package_invalid:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[2], verbAuxiliary: "haben" }],
  },
  /non_applicable_lexical_package_must_be_null:\$\.lexicalSenses\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{
      ...VALID_BLUEPRINT.lexicalSenses[3],
      region: null,
    }],
  },
  /regional_receptive_region_required:\$\.lexicalSenses\[0\]\.region/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{
      ...VALID_BLUEPRINT.lexicalSenses[0],
      region: "AT",
    }],
  },
  /nonregional_lexical_region_must_be_null:\$\.lexicalSenses\[0\]\.region/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{
      ...VALID_BLUEPRINT.lexicalSenses[3],
      productionPolicy: "productive",
    }],
  },
  /nonregional_lexical_region_must_be_null:\$\.lexicalSenses\[0\]\.region/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{
      ...VALID_BLUEPRINT.lexicalSenses[0],
      productionPolicy: "regional_productive",
    }],
  },
  /lexical_production_policy_invalid:\$\.lexicalSenses\[0\]\.productionPolicy/u,
);

for (const field of [
  "perceptionEvidenceIds",
  "productionEvidenceIds",
  "ruApplicability",
  "ukApplicability",
] as const) {
  const target = clone(VALID_BLUEPRINT.pronunciationTargets[0]) as Record<string, unknown>;
  delete target[field];
  expectFailure(
    { ...VALID_BLUEPRINT, pronunciationTargets: [target] },
    new RegExp(`missing_field:\\\$\\.pronunciationTargets\\[0\\]\\.${field}`, "u"),
  );
}
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: VALID_BLUEPRINT.pronunciationTargets[0].ruApplicability,
    }],
  },
  /pronunciation_locale_evidence_invalid:\$\.pronunciationTargets\[0\]\.ukApplicability/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ruApplicability: {
        status: "APPLIES",
        correctiveRoute: "apply an invalid risk route",
        rationale: "fixture reproduces an invalid APPLIES claim",
        evidenceBindings: [{
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-RU-002",
          evidenceStatus: "CONTRASTIVE_RISK",
        }],
      },
    }],
  },
  /pronunciation_evidence_status_mismatch:\$\.pronunciationTargets\[0\]\.ruApplicability\.evidenceBindings\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "DIAGNOSTIC_ONLY",
        correctiveRoute: "diagnose before correcting",
        rationale: "invalid status fixture",
        evidenceBindings: [{
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-UK-002",
          evidenceStatus: "MIXED_EVIDENCE",
        }],
      },
    }],
  },
  /pronunciation_evidence_status_invalid:\$\.pronunciationTargets\[0\]\.ukApplicability\.evidenceBindings\[0\]\.evidenceStatus/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ruApplicability: {
        status: "APPLIES",
        correctiveRoute: "bounded RU corrective route",
        rationale: "unknown nested field fixture",
        evidenceBindings: [{
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-RU-002",
          evidenceStatus: "DIRECT_L2_RU",
          invented: true,
        }],
      },
    }],
  },
  /unknown_field:\$\.pronunciationTargets\[0\]\.ruApplicability\.evidenceBindings\[0\]\.invented/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "APPLIES",
        correctiveRoute: "incorrectly apply a population risk as a learner fact",
        rationale: "reviewer reproduction",
        evidenceBindings: [{
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-UK-002",
          evidenceStatus: "CONTRASTIVE_RISK",
        }],
      },
    }],
  },
  /contrastive_risk_applicability_invalid:\$\.pronunciationTargets\[0\]\.ukApplicability/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "APPLIES",
        correctiveRoute: "incorrect route based only on system evidence",
        rationale: "reviewer reproduction",
        evidenceBindings: [{
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-UK-003",
          evidenceStatus: "DIRECT_SYSTEM",
        }],
      },
    }],
  },
  /direct_system_only_locale_applicability_invalid:\$\.pronunciationTargets\[0\]\.ukApplicability/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "APPLIES",
        correctiveRoute: "system-only inferred UK route",
        rationale: "reviewer reproduction for system-only inference",
        evidenceBindings: [{
          kind: "PEDAGOGICAL_INFERENCE",
          evidenceStatus: "PEDAGOGICAL_INFERENCE",
          rationale: "the inference has system support but no UK learner profile",
          supportingEvidenceBindings: [{
            evidenceId: "DE-PHON-UK-003",
            evidenceStatus: "DIRECT_SYSTEM",
          }],
        }],
      },
    }],
  },
  /pedagogical_inference_locale_support_required:\$\.pronunciationTargets\[0\]\.ukApplicability\.evidenceBindings\[0\]\.supportingEvidenceBindings/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ruApplicability: {
        status: "DIAGNOSTIC_ONLY",
        correctiveRoute: "system-only inferred RU diagnostic route",
        rationale: "reviewer reproduction for system-only inference",
        evidenceBindings: [{
          kind: "PEDAGOGICAL_INFERENCE",
          evidenceStatus: "PEDAGOGICAL_INFERENCE",
          rationale: "the inference has system support but no RU learner profile",
          supportingEvidenceBindings: [{
            evidenceId: "DE-PHON-UK-003",
            evidenceStatus: "DIRECT_SYSTEM",
          }],
        }],
      },
    }],
  },
  /pedagogical_inference_locale_support_required:\$\.pronunciationTargets\[0\]\.ruApplicability\.evidenceBindings\[0\]\.supportingEvidenceBindings/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "NOT_APPLICABLE",
        correctiveRoute: null,
        rationale: "",
        evidenceBindings: [],
      },
    }],
  },
  /pronunciation_not_applicable_rationale_required:\$\.pronunciationTargets\[0\]\.ukApplicability\.rationale/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "NOT_APPLICABLE",
        correctiveRoute: null,
        rationale: "the target has no claimed UK-specific route",
        evidenceBindings: [{
          kind: "CANONICAL_BINDING",
          evidenceId: "DE-PHON-UK-001",
          evidenceStatus: "DIRECT_L2_UK",
        }],
      },
    }],
  },
  /pronunciation_not_applicable_evidence_invalid:\$\.pronunciationTargets\[0\]\.ukApplicability\.evidenceBindings/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ukApplicability: {
        status: "NOT_APPLICABLE",
        correctiveRoute: null,
        rationale: "invalid because target evidence still includes a UK learner profile",
        evidenceBindings: [],
      },
    }],
  },
  /pronunciation_not_applicable_target_evidence_conflict:\$\.pronunciationTargets\[0\]\.ukApplicability/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      ruApplicability: {
        status: "APPLIES",
        correctiveRoute: "inference without auditable support",
        rationale: "invalid inference fixture",
        evidenceBindings: [{
          kind: "PEDAGOGICAL_INFERENCE",
          evidenceStatus: "PEDAGOGICAL_INFERENCE",
          rationale: "",
          supportingEvidenceBindings: [],
        }],
      },
    }],
  },
  /pedagogical_inference_rationale_required:\$\.pronunciationTargets\[0\]\.ruApplicability\.evidenceBindings\[0\]\.rationale/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    pronunciationTargets: [{
      ...VALID_BLUEPRINT.pronunciationTargets[0],
      perceptionEvidenceIds: [],
    }],
  },
  /non_empty_array_required:\$\.pronunciationTargets\[0\]\.perceptionEvidenceIds/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        grammarConstructId: "de_gc_undeclared_v1",
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_grammar_construct_id:de_gc_undeclared_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        newLexicalSenseIds: ["de_lex_undeclared_n_1"],
        primaryLexicalSenseIds: ["de_lex_undeclared_n_1"],
        wordFirstGroundingLexicalSenseIds: ["de_lex_undeclared_n_1"],
        independentProbe: {
          ...VALID_BLUEPRINT.sessionPackets[0].independentProbe,
          lexicalSenseIds: ["de_lex_undeclared_n_1"],
        },
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_lexical_sense_id:de_lex_undeclared_n_1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        pronunciationTargetIds: ["de_pron_undeclared_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_pronunciation_target_id:de_pron_undeclared_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    grammarConstructs: [{
      ...VALID_BLUEPRINT.grammarConstructs[0],
      prerequisiteIds: [VALID_BLUEPRINT.grammarConstructs[0].id],
    }],
    sessionPackets: [],
    graphs: { prerequisiteDag: [], lexicalRetrievalGraph: [], reviewEdges: [] },
    matrices: {
      grammarCoverage: [],
      lexicalCoverage: [],
      canDoCoverage: [],
      pronunciationCoverage: [],
      ruUkInterference: [],
    },
  },
  /self_prerequisite_forbidden:de_gc_statement_v2_v1/u,
);

const adjectiveWithoutExplicitNull = clone(VALID_BLUEPRINT.lexicalSenses[2]) as Record<string, unknown>;
delete adjectiveWithoutExplicitNull.nounGender;
expectFailure(
  { ...VALID_BLUEPRINT, lexicalSenses: [adjectiveWithoutExplicitNull] },
  /missing_field:\$\.lexicalSenses\[0\]\.nounGender/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [{ ...VALID_BLUEPRINT.lexicalSenses[2], nounGender: "der" }],
  },
  /non_applicable_lexical_package_must_be_null:\$\.lexicalSenses\[0\]/u,
);
const reviewPacketWithoutExplicitNull = clone(VALID_BLUEPRINT.sessionPackets[1]) as Record<string, unknown>;
delete reviewPacketWithoutExplicitNull.grammarConstructId;
expectFailure(
  { ...VALID_BLUEPRINT, sessionPackets: [reviewPacketWithoutExplicitNull] },
  /missing_field:\$\.sessionPackets\[0\]\.grammarConstructId/u,
);
for (const field of [
  "prerequisiteConstructIds",
  "communicativeOutcomeIds",
  "prerequisiteOutcomeIds",
  "prerequisitePacketIds",
  "prohibitedConstructIds",
  "forbiddenSurfaceFormIds",
  "situation",
  "learningDelta",
  "primaryLexicalSenseIds",
  "wordFirstGroundingLexicalSenseIds",
  "retrievalLexicalSenseIds",
  "phraseFrameIds",
  "canonicalExamples",
  "allowedLexicalSlots",
  "sessionRole",
  "modeFamilies",
  "supportTrajectory",
  "independentProbe",
  "delayedProbes",
  "accessibilityAlternative",
  "audioSemanticsRequired",
  "phoneticDistractorCheckRequired",
  "reviewEdgeIds",
] as const) {
  const packet = clone(VALID_BLUEPRINT.sessionPackets[0]) as Record<string, unknown>;
  delete packet[field];
  expectFailure(
    { ...VALID_BLUEPRINT, sessionPackets: [packet] },
    new RegExp(`missing_field:\\$\\.sessionPackets\\[0\\]\\.${field}`, "u"),
  );
}
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      situation: { ...VALID_BLUEPRINT.sessionPackets[0].situation, invented: true },
    }],
  },
  /unknown_field:\$\.sessionPackets\[0\]\.situation\.invented/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      canonicalExamples: ["Der Bahnhof ist hier."],
    }],
  },
  /packet_canonical_example_count_invalid:\$\.sessionPackets\[0\]\.canonicalExamples/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      modeFamilies: ["invented_mode"],
    }],
  },
  /mode_family_invalid:\$\.sessionPackets\[0\]\.modeFamilies\[0\]/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      independentProbe: {
        ...VALID_BLUEPRINT.sessionPackets[0].independentProbe,
        probeContextSignature: "station_information_counter",
      },
    }],
  },
  /independent_probe_changed_context_required:\$\.sessionPackets\[0\]\.independentProbe/u,
);
const independentProbeWithoutLexicalTargets = clone(
  VALID_BLUEPRINT.sessionPackets[0].independentProbe,
) as Record<string, unknown>;
delete independentProbeWithoutLexicalTargets.lexicalSenseIds;
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      independentProbe: independentProbeWithoutLexicalTargets,
    }],
  },
  /missing_field:\$\.sessionPackets\[0\]\.independentProbe\.lexicalSenseIds/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        primaryLexicalSenseIds: ["de_lex_bahnhof_n_1"],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /packet_primary_lexical_target_not_new:de_lex_bahnhof_n_1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        independentProbe: {
          ...VALID_BLUEPRINT.sessionPackets[1].independentProbe,
          lexicalSenseIds: ["de_lex_bahnhof_n_1"],
        },
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /independent_probe_retrieval_only:\$\.sessionPackets\[1\]\.independentProbe\.lexicalSenseIds/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        retrievalLexicalSenseIds: ["de_lex_bahnhof_n_1", "de_lex_helfen_v_1"],
        independentProbe: {
          ...VALID_BLUEPRINT.sessionPackets[1].independentProbe,
          lexicalSenseIds: [
            "de_lex_schnell_adj_1",
            "de_lex_bahnhof_n_1",
            "de_lex_helfen_v_1",
          ],
        },
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /independent_probe_retrieval_dominates:\$\.sessionPackets\[1\]\.independentProbe\.lexicalSenseIds/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        prerequisitePacketIds: ["de_l01_c02_s09"],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /packet_prerequisite_packets_mismatch:de_l01_c02_s09/u,
);
const cumulativeReviewPacket = {
  ...VALID_BLUEPRINT.sessionPackets[1],
  id: "de_l01_c02_s11",
  sessionOrdinal: 11,
  sessionWithinChapter: 3,
  sourcePath: "content/learning-v2-course/curriculum/de/packets/l01/s11.json",
  reviewConstructIds: ["de_gc_statement_v2_v1", "de_gc_yes_no_verberst_v1"],
  prerequisiteConstructIds: ["de_gc_statement_v2_v1"],
  prerequisitePacketIds: ["de_l01_c01_s01"],
  situation: {
    id: "de_sit_cumulative_market_review_v1",
    description: "reviewing statements and yes-no questions at a market",
    contextSignature: "cumulative_market_review",
  },
  newLexicalSenseIds: ["de_lex_paradeiser_n_1"],
  primaryLexicalSenseIds: ["de_lex_paradeiser_n_1"],
  wordFirstGroundingLexicalSenseIds: ["de_lex_paradeiser_n_1"],
  canonicalExamples: ["Der Paradeiser ist hier.", "Ist der Paradeiser hier?"],
  allowedLexicalSlots: [{
    id: "de_slot_cumulative_market_review_v1",
    lexicalSenseIds: ["de_lex_paradeiser_n_1", "de_lex_bahnhof_n_1"],
  }],
  independentProbe: {
    trainingContextSignature: "cumulative_market_review",
    probeContextSignature: "cumulative_shop_review",
    changedContextRequired: true as const,
    support: "none" as const,
    lexicalSenseIds: ["de_lex_paradeiser_n_1", "de_lex_bahnhof_n_1"],
  },
  reviewEdgeIds: [],
};
const cumulativeReviewParsed = parseGermanCourseBlueprintDeV1({
  ...VALID_BLUEPRINT,
  sessionPackets: [...VALID_BLUEPRINT.sessionPackets, cumulativeReviewPacket],
});
assert.deepEqual(
  cumulativeReviewParsed.sessionPackets[3].prerequisiteConstructIds,
  ["de_gc_statement_v2_v1"],
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      ...VALID_BLUEPRINT.sessionPackets,
      {
        ...cumulativeReviewPacket,
        prerequisiteConstructIds: [],
        prerequisitePacketIds: [],
      },
    ],
  },
  /packet_prerequisite_constructs_mismatch:de_l01_c02_s11/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      ...VALID_BLUEPRINT.sessionPackets,
      {
        ...cumulativeReviewPacket,
        prerequisiteConstructIds: [
          "de_gc_statement_v2_v1",
          "de_gc_yes_no_verberst_v1",
        ],
        prerequisitePacketIds: ["de_l01_c01_s01", "de_l01_c02_s10"],
      },
    ],
  },
  /packet_prerequisite_constructs_mismatch:de_l01_c02_s11/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      VALID_BLUEPRINT.sessionPackets[1],
      {
        ...VALID_BLUEPRINT.sessionPackets[2],
        prerequisiteConstructIds: ["de_gc_yes_no_verberst_v1"],
        prerequisitePacketIds: [],
      },
    ],
  },
  /packet_self_prerequisite_construct_forbidden:de_l01_c02_s10:de_gc_yes_no_verberst_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      VALID_BLUEPRINT.sessionPackets[1],
      {
        ...VALID_BLUEPRINT.sessionPackets[2],
        prerequisiteConstructIds: [],
        prerequisitePacketIds: [],
      },
    ],
  },
  /packet_prerequisite_constructs_mismatch:de_l01_c02_s10/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        prerequisiteConstructIds: ["de_gc_yes_no_verberst_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /packet_prerequisite_constructs_mismatch:de_l01_c01_s01/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      VALID_BLUEPRINT.sessionPackets[1],
      {
        ...VALID_BLUEPRINT.sessionPackets[2],
        prerequisitePacketIds: ["de_l01_c02_s09"],
      },
    ],
  },
  /packet_prerequisite_packets_mismatch:de_l01_c02_s10/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        prerequisiteConstructIds: ["de_gc_yes_no_verberst_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /packet_prerequisite_constructs_mismatch:de_l01_c02_s09/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        delayedProbes: [{
          ...VALID_BLUEPRINT.sessionPackets[0].delayedProbes[0],
          targetPacketId: "de_l01_c01_s01",
        }],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /delayed_probe_target_not_later:de_l01_c01_s01->de_l01_c01_s01/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        delayedProbes: [{
          targetPacketId: "de_l01_c01_s01",
          retrievalKind: "cross_chapter",
          contextSignature: "backward_probe_is_invalid",
        }],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /delayed_probe_target_not_later:de_l01_c02_s09->de_l01_c01_s01/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        delayedProbes: [{
          ...VALID_BLUEPRINT.sessionPackets[0].delayedProbes[0],
          retrievalKind: "cross_session",
        }],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /delayed_probe_scope_mismatch:de_l01_c01_s01->de_l01_c02_s09/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        retrievalLexicalSenseIds: ["de_lex_undeclared_retrieval_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_lexical_sense_id:de_lex_undeclared_retrieval_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        communicativeOutcomeIds: ["de_out_undeclared_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_communicative_outcome_id:de_out_undeclared_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        prohibitedConstructIds: ["de_gc_undeclared_prohibited_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_grammar_construct_id:de_gc_undeclared_prohibited_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      {
        ...VALID_BLUEPRINT.sessionPackets[0],
        phraseFrameIds: ["de_pf_undeclared_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[1],
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_phrase_frame_id:de_pf_undeclared_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [
      VALID_BLUEPRINT.sessionPackets[0],
      {
        ...VALID_BLUEPRINT.sessionPackets[1],
        reviewEdgeIds: ["de_edge_undeclared_review_v1"],
      },
      VALID_BLUEPRINT.sessionPackets[2],
    ],
  },
  /undeclared_review_edge_id:de_edge_undeclared_review_v1/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      wordFirstGroundingLexicalSenseIds: [],
    }],
  },
  /packet_word_first_grounding_incomplete:\$\.sessionPackets\[0\]\.wordFirstGroundingLexicalSenseIds/u,
);
const rootWithoutCandidateFingerprint = clone(VALID_BLUEPRINT) as Record<string, unknown>;
delete rootWithoutCandidateFingerprint.candidateFingerprint;
expectFailure(
  rootWithoutCandidateFingerprint,
  /missing_field:\$\.candidateFingerprint/u,
);

expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{ ...VALID_BLUEPRINT.sessionPackets[0], sourceHashes: [] }],
  },
  /packet_source_hashes_required:\$\.sessionPackets\[0\]\.sourceHashes/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      sourceHashes: [{ path: "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md", sha256: "not-a-hash" }],
    }],
  },
  /sha256_invalid:\$\.sessionPackets\[0\]\.sourceHashes\[0\]\.sha256/u,
);
expectFailure(
  {
    ...VALID_BLUEPRINT,
    sessionPackets: [{
      ...VALID_BLUEPRINT.sessionPackets[0],
      sourceHashes: [{
        path: "modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts",
        sha256: SHA_A,
      }],
    }],
  },
  /english_target_path_forbidden:\$\.sessionPackets\[0\]\.sourceHashes\[0\]\.path/u,
);
for (const invalidRepositoryPath of [
  "C:/appsprojects/phraseman/docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
  "C:docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
  "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md:stream",
]) {
  expectFailure(
    {
      ...VALID_BLUEPRINT,
      sessionPackets: [{
        ...VALID_BLUEPRINT.sessionPackets[0],
        sourceHashes: [{ path: invalidRepositoryPath, sha256: SHA_A }],
      }],
    },
    /source_path_invalid:\$\.sessionPackets\[0\]\.sourceHashes\[0\]\.path/u,
  );
}

expectFailure(
  {
    ...VALID_BLUEPRINT,
    lexicalSenses: [VALID_BLUEPRINT.lexicalSenses[0], VALID_BLUEPRINT.lexicalSenses[0]],
  },
  /duplicate_id:de_lex_bahnhof_n_1/u,
);

const reordered = {
  matrices: VALID_BLUEPRINT.matrices,
  graphs: VALID_BLUEPRINT.graphs,
  sessionPackets: VALID_BLUEPRINT.sessionPackets,
  forbiddenSurfaceForms: VALID_BLUEPRINT.forbiddenSurfaceForms,
  phraseFrames: VALID_BLUEPRINT.phraseFrames,
  pronunciationTargets: VALID_BLUEPRINT.pronunciationTargets,
  communicativeOutcomes: VALID_BLUEPRINT.communicativeOutcomes,
  lexicalSenses: VALID_BLUEPRINT.lexicalSenses,
  grammarConstructs: VALID_BLUEPRINT.grammarConstructs,
  candidateFingerprint: VALID_BLUEPRINT.candidateFingerprint,
  matrixDigests: VALID_BLUEPRINT.matrixDigests,
  graphDigests: VALID_BLUEPRINT.graphDigests,
  registryDigests: VALID_BLUEPRINT.registryDigests,
  sourceDigests: VALID_BLUEPRINT.sourceDigests,
  artifactPaths: VALID_BLUEPRINT.artifactPaths,
  declaredCounts: VALID_BLUEPRINT.declaredCounts,
  localePolicy: VALID_BLUEPRINT.localePolicy,
  targetLanguage: VALID_BLUEPRINT.targetLanguage,
  schemaVersion: VALID_BLUEPRINT.schemaVersion,
};
assert.equal(
  canonicalGermanCourseBlueprintJsonDeV1(VALID_BLUEPRINT),
  canonicalGermanCourseBlueprintJsonDeV1(reordered),
);
assert.match(
  canonicalGermanCourseBlueprintJsonDeV1(VALID_BLUEPRINT),
  /^\{"artifactPaths":/u,
);

process.stdout.write(
  "LEARNING V2 GERMAN BLUEPRINT SCHEMA GATE: PASS (closed schema; completeness intentionally separate)\n",
);
