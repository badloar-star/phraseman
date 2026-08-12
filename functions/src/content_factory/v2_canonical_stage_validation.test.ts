import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2CanonicalSeasonPlan,
  parseV2CanonicalPlanRequest,
  V2_CANONICAL_STAGE_KINDS,
  type V2CanonicalSeasonPlanV1,
  type V2CanonicalStageNode,
} from "./v2_canonical_generation_plan";
import {
  parseV2ImmutableDependencySnapshot,
  v2DependencyFingerprint,
} from "./v2_generation_workspace_contract";
import {
  V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES,
  V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION,
  bindV2ValidatedStageDependency,
  parseV2CanonicalStageArtifactRaw,
  validateV2CanonicalStageArtifact,
  type V2CanonicalStageArtifactCandidateHandle,
  type V2MachineStageValidationReceiptV1,
} from "./v2_canonical_stage_validation";

const hash = (char: string) => char.repeat(64);

function sourceFilesUnder(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(absolute);
    return entry.isFile() &&
      [".ts", ".tsx", ".mts", ".cts", ".js", ".mjs", ".cjs"].includes(
        path.extname(entry.name),
      )
      ? [absolute]
      : [];
  });
}
const sourceRef = (provenanceId: string, char: string) => ({
  provenanceType: "authoritative_source",
  provenanceId,
  objectPath: `learning-v2/sources/${provenanceId}.json`,
  contentHash: hash(char),
  objectGeneration: "1",
  byteSize: 512,
});
const decisionRef = (provenanceId: string, char: string) => ({
  provenanceType: "decision_registry",
  provenanceId,
  objectPath: `learning-v2/decisions/${provenanceId}.json`,
  contentHash: hash(char),
  objectGeneration: "1",
  byteSize: 512,
});
const consentSourceRefs = () =>
  ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"].map((locale, index) =>
    sourceRef(`voice-consent-copy-${locale}`, "01234567"[index]),
  );
const provenanceObjectRef = (provenanceId: string, char: string) => ({
  provenanceId,
  objectPath: `learning-v2/sources/${provenanceId}.json`,
  objectGeneration: "1",
  contentHash: hash(char),
});

function trainingPromptRow(sessionOrdinal: number, outcomeId: string) {
  const purpose =
    sessionOrdinal === 1
      ? "teaching"
      : sessionOrdinal === 3
        ? "retrieval"
        : "practice";
  const promptText = `Training prompt ${sessionOrdinal} for ${outcomeId}`;
  const contentBody = `Canonical training content ${sessionOrdinal} for ${outcomeId}`;
  const outcomeIds = [outcomeId];
  const linguisticUnitIds = [`unit-${Number(outcomeId.split("-")[1])}`];
  return {
    promptId: `training-${sessionOrdinal}`,
    purpose,
    phase:
      purpose === "teaching"
        ? "introduce"
        : purpose === "retrieval"
          ? "retrieval"
          : "practice",
    promptText,
    contentBody,
    outcomeIds,
    linguisticUnitIds,
    promptSemanticHash: hashCanonicalBody({
      schemaVersion: "v2-training-prompt-semantics.v1",
      sourceContentHash: hash("4"),
      promptText,
      outcomeIds,
      linguisticUnitIds,
      phase:
        purpose === "teaching"
          ? "introduce"
          : purpose === "retrieval"
            ? "retrieval"
            : "practice",
    }),
    contentSemanticHash: hashCanonicalBody({
      schemaVersion: "v2-training-content-semantics.v1",
      sourceContentHash: hash("4"),
      contentBody,
      outcomeIds,
      linguisticUnitIds,
    }),
    sourceRefId: "scenario-source",
  };
}

function rephaseTrainingPrompt(
  prompt: ReturnType<typeof trainingPromptRow>,
  purpose: "teaching" | "practice" | "retrieval",
) {
  const phase =
    purpose === "teaching"
      ? "introduce"
      : purpose === "retrieval"
        ? "retrieval"
        : "practice";
  return {
    ...prompt,
    purpose,
    phase,
    promptSemanticHash: hashCanonicalBody({
      schemaVersion: "v2-training-prompt-semantics.v1",
      sourceContentHash: hash("4"),
      promptText: prompt.promptText,
      outcomeIds: prompt.outcomeIds,
      linguisticUnitIds: prompt.linguisticUnitIds,
      phase,
    }),
  };
}

function trainingSurfaceHash(sessionOrdinal: number, outcomeId: string) {
  const prompt = trainingPromptRow(sessionOrdinal, outcomeId);
  return hashCanonicalBody({
    schemaVersion: "v2-learning-surface-semantics.v1",
    targetLanguage: "en",
    promptText: prompt.promptText,
    contextBody: prompt.contentBody,
    outcomeIds: prompt.outcomeIds,
    linguisticUnitIds: prompt.linguisticUnitIds,
    sourceContentHashes: [hash("4")],
  });
}

function visibleSurfaceHash(
  promptText: string,
  contextBody: string,
  outcomeIds: readonly string[],
  linguisticUnitIds: readonly string[],
) {
  return hashCanonicalBody({
    schemaVersion: "v2-visible-learning-surface.v1",
    targetLanguage: "en",
    promptText,
    contextBody,
    outcomeIds,
    linguisticUnitIds,
  });
}
function trainingVisibleSurfaceHash(sessionOrdinal: number, outcomeId: string) {
  const prompt = trainingPromptRow(sessionOrdinal, outcomeId);
  return visibleSurfaceHash(
    prompt.promptText,
    prompt.contentBody,
    prompt.outcomeIds,
    prompt.linguisticUnitIds,
  );
}

const speakingPromptText =
  "Greet a new neighbor and complete the short conversation.";
const speakingContextBody = (episodeOrdinal: number) =>
  `A new neighbor greets you in hallway context ${episodeOrdinal} before entering the building.`;
function speakingSurfaceHash(episodeOrdinal: number, outcomeId: string) {
  return hashCanonicalBody({
    schemaVersion: "v2-learning-surface-semantics.v1",
    targetLanguage: "en",
    promptText: speakingPromptText,
    contextBody: speakingContextBody(episodeOrdinal),
    outcomeIds: [outcomeId],
    linguisticUnitIds: [`unit-${episodeOrdinal}`],
    sourceContentHashes: [hash("4")],
  });
}
function speakingVisibleSurfaceHash(episodeOrdinal: number, outcomeId: string) {
  return visibleSurfaceHash(
    speakingPromptText,
    speakingContextBody(episodeOrdinal),
    [outcomeId],
    [`unit-${episodeOrdinal}`],
  );
}

const independentPromptHash = (episodeOrdinal: number) =>
  sha256Utf8(`independent-prompt-${episodeOrdinal}`);
const independentContentHash = (episodeOrdinal: number) =>
  sha256Utf8(`independent-content-${episodeOrdinal}`);
const delayedPromptHash = (episodeOrdinal: number) =>
  sha256Utf8(`delayed-prompt-${episodeOrdinal}`);
const delayedContentHash = (episodeOrdinal: number) =>
  sha256Utf8(`delayed-content-${episodeOrdinal}`);

function plan(
  scope:
    | "vertical_slice"
    | "chapter_internal"
    | "full_season" = "vertical_slice",
): V2CanonicalSeasonPlanV1 {
  const count =
    scope === "vertical_slice" ? 1 : scope === "chapter_internal" ? 8 : 32;
  const episodeIds = Array.from(
    { length: count },
    (_, index) => `episode-${index + 1}`,
  );
  const request = {
    schemaVersion: "v2-canonical-plan-request.v1",
    workspaceId: "workspace-b1",
    jobId: "job-b1",
    authoringRevision: 1,
    seasonId: "season-b1",
    scope,
    episodeIds,
    recipes: episodeIds.map((episodeId) => ({
      episodeId,
      dialogue: true,
      speakingMission: true,
    })),
    languageProfileRef: {
      profileId: "english-general",
      targetLanguage: "en",
      version: 1,
      contentHash: hash("a"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007",
      version: 1,
      contentHash: hash("7"),
    },
    templateBindings: episodeIds.map((episodeId) => ({
      episodeId,
      templateRefs: [
        { templateId: "phrase-builder", version: 1, contentHash: hash("b") },
      ],
    })),
  };
  return buildV2CanonicalSeasonPlan(
    parseV2CanonicalPlanRequest(canonicalJsonV1(request)),
  );
}

const bands = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

function bandFor(index: number, total: number) {
  return bands[
    Math.min(bands.length - 1, Math.floor((index * bands.length) / total))
  ];
}

function seasonBody(compiledPlan = plan()) {
  const episodeRows = compiledPlan.episodeIds.map((episodeId, index) => ({
    episodeId,
    ordinal: index + 1,
    sectorOrdinal: Math.ceil((index + 1) / 8),
    cefrBand: bandFor(index, compiledPlan.episodeIds.length),
    primaryOutcomeIds: [`outcome-${index + 1}`],
  }));
  return {
    schemaVersion: "v2-season-outline-artifact.v1",
    claimKind: "curriculum_alignment_not_learner_attainment",
    coverageClaim:
      compiledPlan.scope === "full_season"
        ? "full_season_sampled_descriptor_alignment"
        : "scoped_partial_curriculum",
    certificationClaim: false,
    entryBand: "PRE_A1",
    cefrLadder: ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"],
    targetLanguage: "en",
    episodeRows,
    checkpoints: (compiledPlan.episodeIds.length === 1
      ? []
      : compiledPlan.episodeIds.length === 8
        ? [8]
        : [8, 16, 24, 32]
    ).map((ordinal) => ({
      checkpointId: `checkpoint-${ordinal}`,
      afterEpisodeOrdinal: ordinal,
      coveredOutcomeIds: episodeRows
        .slice(0, ordinal)
        .map((row) => row.primaryOutcomeIds[0]),
      heldOutPromptPolicy: "novel_unseen_only",
      certificationClaim: false,
    })),
    outcomes: episodeRows.map((row, index) => ({
      outcomeId: row.primaryOutcomeIds[0],
      cefrBand: row.cefrBand,
      cefrSourceRefIds: ["cefr-2020"],
      scaleKey: "spoken-interaction",
      descriptorLocator: "pre-a1-basic-greeting",
      activity: "interaction",
      modality: "spoken",
      domain: "personal",
      function: "exchange a basic greeting",
      context: "first meeting with one supportive partner",
      textType: "short spoken exchange",
      successCriteriaIds: ["meaning-clear", "greeting-appropriate"],
      prerequisiteOutcomeIds: [],
      enablingUnitIds: [`unit-${index + 1}`],
      requiredCapabilityKeys: ["speaking_mission"],
    })),
    linguisticUnits: episodeRows.map((row, index) => ({
      unitId: `unit-${index + 1}`,
      kind: "pragmatics",
      languageProfileRef: {
        profileId: "english-general",
        version: 1,
        contentHash: hash("a"),
      },
      sourceRefIds: ["english-pragmatics"],
      prerequisiteUnitIds: [],
      outcomeIds: [row.primaryOutcomeIds[0]],
      introducedAtEpisodeOrdinal: index + 1,
      revisitEpisodeOrdinals: [],
    })),
    promptHistoryCommitments: episodeRows.map((row, episodeIndex) => {
      const training = Array.from({ length: 12 }, (_, index) =>
        trainingPromptRow(index + 1, row.primaryOutcomeIds[0]),
      );
      return {
        episodeId: row.episodeId,
        trainingPromptSemanticHashes: training.map(
          (prompt) => prompt.promptSemanticHash,
        ),
        trainingContentSemanticHashes: training.map(
          (prompt) => prompt.contentSemanticHash,
        ),
        trainingSurfaceSemanticHashes: training.map((_, index) =>
          trainingSurfaceHash(index + 1, row.primaryOutcomeIds[0]),
        ),
        trainingVisibleSurfaceSemanticHashes: training.map((_, index) =>
          trainingVisibleSurfaceHash(index + 1, row.primaryOutcomeIds[0]),
        ),
        transferSurfaceSemanticHashes: [
          speakingSurfaceHash(episodeIndex + 1, row.primaryOutcomeIds[0]),
        ],
        transferVisibleSurfaceSemanticHashes: [
          speakingVisibleSurfaceHash(
            episodeIndex + 1,
            row.primaryOutcomeIds[0],
          ),
        ],
        independentPromptSemanticHashes: [
          independentPromptHash(episodeIndex + 1),
        ],
        independentContentSemanticHashes: [
          independentContentHash(episodeIndex + 1),
        ],
        delayedPromptSemanticHashes: [delayedPromptHash(episodeIndex + 1)],
        delayedContentSemanticHashes: [delayedContentHash(episodeIndex + 1)],
      };
    }),
  };
}

function intro(sessionOrdinal: number) {
  const claims = [1, 2, 3].map((ordinal) => ({
    claimId: `s${sessionOrdinal}-claim-${ordinal}`,
    blockId: `s${sessionOrdinal}-block-${ordinal}`,
    semanticAssertionId: `s${sessionOrdinal}-assertion-${ordinal}`,
    sourceHash: hashCanonicalBody({
      schemaVersion: "v2-intro-claim-source-binding.v1",
      sourceContentHash: hash("3"),
      blockBodyHash: hashCanonicalBody({
        schemaVersion: "v2-intro-block-semantics.v1",
        kind: ordinal === 1 ? "meaning" : ordinal === 2 ? "structure" : "usage",
        title: `Concept ${ordinal}`,
        body: `This block teaches a concrete greeting fact number ${ordinal}.`,
      }),
      semanticAssertionId: `s${sessionOrdinal}-assertion-${ordinal}`,
      expectedAnswerSemanticId: `s${sessionOrdinal}-correct-${ordinal}`,
      misconceptionIds: [
        `s${sessionOrdinal}-mis-${ordinal}-a`,
        `s${sessionOrdinal}-mis-${ordinal}-b`,
      ],
    }),
    expectedAnswerSemanticId: `s${sessionOrdinal}-correct-${ordinal}`,
    misconceptionIds: [
      `s${sessionOrdinal}-mis-${ordinal}-a`,
      `s${sessionOrdinal}-mis-${ordinal}-b`,
    ],
    sourceRefIds: ["intro-source"],
  }));
  return {
    introId: `intro-session-${sessionOrdinal}`,
    title: `Greeting concept ${sessionOrdinal}`,
    summary: "A complete explanation of one small greeting concept.",
    learningGoal:
      "Understand the meaning and use it in the following practice.",
    blocks: [1, 2, 3].map((ordinal) => ({
      blockId: `s${sessionOrdinal}-block-${ordinal}`,
      kind: ordinal === 1 ? "meaning" : ordinal === 2 ? "structure" : "usage",
      title: `Concept ${ordinal}`,
      body: `This block teaches a concrete greeting fact number ${ordinal}.`,
    })),
    claims,
    questions: claims.map((claim, index) => {
      const prompt = `Which meaning matches concept ${index + 1}?`;
      const choices = [
        {
          semanticId: claim.expectedAnswerSemanticId,
          text: `The taught meaning ${index + 1}`,
          misconceptionId: null,
          misconceptionRationale: null,
        },
        {
          semanticId: `s${sessionOrdinal}-wrong-${index + 1}-a`,
          text: `A plausible wrong meaning ${index + 1}A`,
          misconceptionId: claim.misconceptionIds[0],
          misconceptionRationale:
            "This reflects the first typical misunderstanding.",
        },
        {
          semanticId: `s${sessionOrdinal}-wrong-${index + 1}-b`,
          text: `Another plausible wrong meaning ${index + 1}B`,
          misconceptionId: claim.misconceptionIds[1],
          misconceptionRationale:
            "This reflects the second typical misunderstanding.",
        },
      ];
      const explanation = `The correct option ${index + 1} follows directly from the teaching block.`;
      return {
        questionId: `s${sessionOrdinal}-question-${index + 1}`,
        requiredTaskSlot: index + 1,
        assessmentClass: "intro_comprehension",
        learningEvidenceEligible: false,
        introClaimId: claim.claimId,
        prompt,
        choices,
        correctChoiceSemanticId: claim.expectedAnswerSemanticId,
        explanation,
        questionSemanticHash: hashCanonicalBody({
          schemaVersion: "v2-intro-question-semantics.v1",
          claimSourceHash: claim.sourceHash,
          prompt,
          choices,
          correctChoiceSemanticId: claim.expectedAnswerSemanticId,
          explanation,
        }),
      };
    }),
  };
}

function episodeBody(compiledPlan = plan(), episodeOrdinal = 1) {
  const episodeId = compiledPlan.episodeIds[episodeOrdinal - 1];
  const outcomeId = `outcome-${episodeOrdinal}`;
  const unitId = `unit-${episodeOrdinal}`;
  return {
    schemaVersion: "v2-episode-outline-artifact.v1",
    episodeId,
    episodeOrdinal,
    cefrBand: bandFor(episodeOrdinal - 1, compiledPlan.episodeIds.length),
    scenario: {
      scenarioId: "scenario-first-greeting",
      domain: "personal",
      function: "exchange a greeting",
      context: "first meeting",
      textType: "short spoken exchange",
      sourceRefIds: ["scenario-source"],
    },
    primaryOutcomeIds: [outcomeId],
    supportingOutcomeIds: [],
    outcomeConstraintBindings: [
      {
        outcomeId,
        semanticSlotIds: ["closing-slot", "greeting-slot"],
        constraintIds: ["greeting-appropriate", "meaning-clear"],
      },
    ],
    priorTrainingSurfaceSemanticHashes: compiledPlan.episodeIds
      .slice(0, episodeOrdinal - 1)
      .flatMap((_, priorIndex) =>
        Array.from({ length: 12 }, (__, sessionIndex) =>
          trainingSurfaceHash(sessionIndex + 1, `outcome-${priorIndex + 1}`),
        ),
      )
      .sort(),
    plannedTransferSurfaceSemanticHashes: [
      speakingSurfaceHash(episodeOrdinal, outcomeId),
    ],
    plannedTransferVisibleSurfaceSemanticHashes: [
      speakingVisibleSurfaceHash(episodeOrdinal, outcomeId),
    ],
    priorTransferSurfaceSemanticHashes: compiledPlan.episodeIds
      .slice(0, episodeOrdinal - 1)
      .map((_, priorIndex) =>
        speakingSurfaceHash(priorIndex + 1, `outcome-${priorIndex + 1}`),
      )
      .sort(),
    priorVisibleSurfaceSemanticHashes: compiledPlan.episodeIds
      .slice(0, episodeOrdinal - 1)
      .flatMap((_, priorIndex) => [
        ...Array.from({ length: 12 }, (__, sessionIndex) =>
          trainingVisibleSurfaceHash(
            sessionIndex + 1,
            `outcome-${priorIndex + 1}`,
          ),
        ),
        speakingVisibleSurfaceHash(priorIndex + 1, `outcome-${priorIndex + 1}`),
      ])
      .sort(),
    sessions: Array.from({ length: 12 }, (_, index) => {
      const ordinal = index + 1;
      return {
        ordinal,
        sessionTemplateId: `${episodeId}:session-${String(ordinal).padStart(2, "0")}`,
        zone: ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master",
        primaryOutcomeIds: [outcomeId],
        focusUnitIds: [unitId],
        prerequisiteOutcomeIds: [],
        teachingBrief:
          "Teach the greeting meaning before asking the learner to use it.",
        practiceBrief:
          "Practice the greeting across a gradually varied context.",
        assessmentBrief:
          "Check meaning independently without exposing the answer.",
        intro: intro(ordinal),
        evidencePlan: {
          introduceOutcomeIds: ordinal === 1 ? [outcomeId] : [],
          retrievalOutcomeIds: ordinal === 3 ? [outcomeId] : [],
          nearTransferOutcomeIds: ordinal === 6 ? [outcomeId] : [],
          delayedPracticeOutcomeIds: ordinal === 11 ? [outcomeId] : [],
        },
        trainingPromptRefs: [trainingPromptRow(ordinal, outcomeId)],
        independentCandidates:
          ordinal === 10
            ? [
                {
                  outcomeId,
                  support: "none",
                  maxHints: 0,
                  answerExposure: "forbidden",
                  promptNovelty: "novel",
                  promptSemanticHash: independentPromptHash(episodeOrdinal),
                  contentSemanticHash: independentContentHash(episodeOrdinal),
                },
              ]
            : [],
      };
    }),
    delayedProbeDefinitions: [
      {
        probeId: `${episodeId}:delayed:${outcomeId}`,
        outcomeId,
        decisionRegistryRef: {
          decisionId: "HYP-V2-007",
          version: 1,
          contentHash: hash("7"),
        },
        minimumDelayDays: 3,
        maximumDelayDays: 7,
        novelPromptSemanticHash: delayedPromptHash(episodeOrdinal),
        novelContentSemanticHash: delayedContentHash(episodeOrdinal),
        sourceRefId: "scenario-source",
        newSurfaceForm: true,
        support: "none",
        maxHints: 0,
        answerExposure: "forbidden",
        learningEvidenceClass: "external_delayed_candidate",
        requiredTimingReceipt: true,
      },
    ],
    checkpointBlueprint:
      episodeOrdinal % 8 === 0
        ? {
            checkpointId: `checkpoint-${episodeOrdinal}`,
            coveredOutcomeIds: compiledPlan.episodeIds
              .slice(0, episodeOrdinal)
              .map((_, index) => `outcome-${index + 1}`),
            heldOutPromptRefs: compiledPlan.episodeIds
              .slice(0, episodeOrdinal)
              .map((_, index) => ({
                promptSemanticHash: sha256Utf8(
                  `held-out-prompt-${episodeOrdinal}-${index + 1}`,
                ),
                contentSemanticHash: sha256Utf8(
                  `held-out-content-${episodeOrdinal}-${index + 1}`,
                ),
                sourceRefId: "scenario-source",
                outcomeIds: [`outcome-${index + 1}`],
                constructIds: ["spoken-interaction"],
                criticalTargetIds: [`critical-target-${index + 1}`],
              })),
            criticalTargets: compiledPlan.episodeIds
              .slice(0, episodeOrdinal)
              .map((_, index) => ({
                criticalTargetId: `critical-target-${index + 1}`,
                outcomeId: `outcome-${index + 1}`,
                semanticSlotIds: [`critical-slot-${index + 1}`],
                constraintIds: ["meaning-clear"],
                alternate: {
                  mode: "deterministic_non_ai",
                  semanticSlotIds: [`critical-slot-${index + 1}`],
                },
                repair: {
                  targetOutcomeId: `outcome-${index + 1}`,
                  issueCode: "meaning_not_clear",
                  activityPlanId: `repair-${index + 1}`,
                },
                reassessment: {
                  targetOutcomeId: `outcome-${index + 1}`,
                  policyId: `reassessment-${index + 1}`,
                  heldOutRequired: true,
                },
              })),
            support: "none",
            maxHints: 0,
            answerExposure: "forbidden",
            certificationClaim: false,
          }
        : null,
  };
}

type BuiltCandidate = Readonly<{
  handle: V2CanonicalStageArtifactCandidateHandle;
  raw: string;
  refRaw: string;
  dependencyRaw: string;
}>;

function dependencyRawFor(
  stage: V2CanonicalStageNode,
  prior: ReadonlyMap<string, BuiltCandidate>,
  receipts: ReadonlyMap<string, V2MachineStageValidationReceiptV1> = new Map(),
  overrides: Partial<Record<string, unknown>> = {},
): string {
  const dependencies = [
    ...stage.dependsOn.map((stageId) => {
      const candidate = prior.get(stageId);
      if (!candidate) throw new Error(`missing test dependency ${stageId}`);
      const receipt = receipts.get(stageId);
      const artifactRef = receipt?.artifactRef;
      return {
        dependencyType: "stage",
        stageId,
        artifactHash: sha256Utf8(candidate.raw),
        reviewFingerprint: receipt?.receiptFingerprint ?? hash("9"),
        objectPath:
          artifactRef?.objectPath ?? `learning-v2/artifacts/${stageId}.json`,
        objectGeneration: artifactRef?.objectGeneration ?? "1",
        lifecycleFingerprint: receipt
          ? hashCanonicalBody({
              schemaVersion: "v2-stage-dependency-machine-lifecycle.v1",
              receiptFingerprint: receipt.receiptFingerprint,
              artifactRef: receipt.artifactRef,
            })
          : hash("8"),
        ...overrides,
      };
    }),
    ...stage.externalRequirements.map((requirement) =>
      requirement.dependencyType === "language_profile"
        ? {
            dependencyType: "language_profile",
            profileId: requirement.profileId,
            version: requirement.version,
            contentHash: requirement.contentHash,
            objectPath: `learning-v2/profiles/${requirement.profileId}.json`,
            objectGeneration: "1",
            lifecycleFingerprint: hash("7"),
          }
        : {
            dependencyType: "published_template",
            templateId: requirement.templateId,
            version: requirement.version,
            contentHash: requirement.contentHash,
            objectPath: `learning-v2/templates/${requirement.templateId}.json`,
            objectGeneration: "1",
            lifecycleFingerprint: hash("6"),
          },
    ),
  ];
  return canonicalJsonV1(dependencies);
}

function buildCandidate(
  input: Readonly<{
    plan: V2CanonicalSeasonPlanV1;
    stage: V2CanonicalStageNode;
    body: unknown;
    bodySchemaVersion: string;
    dependencyRaw: string;
    provenanceRefs?: readonly (
      | ReturnType<typeof sourceRef>
      | ReturnType<typeof decisionRef>
    )[];
    contentClass?: "production_candidate" | "test_only";
  }>,
): BuiltCandidate {
  const provenanceRefs = [
    ...(input.provenanceRefs ?? [sourceRef("default-source", "c")]),
  ].sort((left, right) =>
    canonicalJsonV1([
      left.provenanceType,
      left.provenanceId,
      left.objectPath,
      left.objectGeneration,
    ]).localeCompare(
      canonicalJsonV1([
        right.provenanceType,
        right.provenanceId,
        right.objectPath,
        right.objectGeneration,
      ]),
    ),
  );
  const subjectWithoutFingerprint = {
    workspaceId: input.stage.workspaceId,
    jobId: input.stage.jobId,
    seasonId: input.stage.seasonId,
    episodeId: input.stage.episodeId,
    locale: input.stage.locale,
    authoringRevision: input.stage.authoringRevision,
  };
  const subject = {
    ...subjectWithoutFingerprint,
    subjectFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-subject.v1",
      planFingerprint: input.plan.planFingerprint,
      stageId: input.stage.stageId,
      stageKind: input.stage.kind,
      ...subjectWithoutFingerprint,
    }),
  };
  const dependencyFingerprint = v2DependencyFingerprint(
    parseV2ImmutableDependencySnapshot(input.dependencyRaw),
  );
  const candidate = {
    schemaVersion: "v2-canonical-stage-artifact-candidate.v1",
    planFingerprint: input.plan.planFingerprint,
    stageId: input.stage.stageId,
    stageKind: input.stage.kind,
    subject,
    bodySchemaVersion: input.bodySchemaVersion,
    body: input.body,
    bodyFingerprint: hashCanonicalBody(input.body),
    dependencyFingerprint,
    contentClass: input.contentClass ?? "production_candidate",
    provenanceRefs,
    provenanceFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-provenance.v1",
      provenanceRefs,
    }),
    producerFingerprint: hash("4"),
    configurationFingerprint: hash("5"),
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  };
  const complete = {
    ...candidate,
    candidateFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-candidate-fingerprint.v1",
      candidate,
    }),
  };
  const raw = canonicalJsonV1(complete);
  const refRaw = canonicalJsonV1({
    objectPath: `learning-v2/candidates/${input.stage.stageId}.json`,
    contentHash: sha256Utf8(raw),
    objectGeneration: "unpersisted",
    byteSize: utf8ByteLengthV1(raw),
  });
  return Object.freeze({
    handle: parseV2CanonicalStageArtifactRaw(raw),
    raw,
    refRaw,
    dependencyRaw: input.dependencyRaw,
  });
}

function validSeasonAndEpisode() {
  const compiledPlan = plan();
  const prior = new Map<string, BuiltCandidate>();
  const receipts = new Map<string, V2MachineStageValidationReceiptV1>();
  const seasonStage = compiledPlan.stages.find(
    (stage) => stage.kind === "v2_season_outline",
  )!;
  const seasonDependencyRaw = dependencyRawFor(seasonStage, prior);
  const season = buildCandidate({
    plan: compiledPlan,
    stage: seasonStage,
    body: seasonBody(),
    bodySchemaVersion: "v2-season-outline-artifact.v1",
    dependencyRaw: seasonDependencyRaw,
    provenanceRefs: [
      sourceRef("cefr-2020", "1"),
      sourceRef("english-pragmatics", "2"),
    ],
  });
  prior.set(seasonStage.stageId, season);
  const seasonReceipt = validateV2CanonicalStageArtifact(
    compiledPlan,
    season.handle,
    season.dependencyRaw,
    season.refRaw,
  );
  receipts.set(seasonStage.stageId, seasonReceipt);
  const seasonDependencyHandle = bindV2ValidatedStageDependency(
    season.handle,
    seasonReceipt,
  );
  const episodeStage = compiledPlan.stages.find(
    (stage) => stage.kind === "v2_episode_outline",
  )!;
  const episodeDependencyRaw = dependencyRawFor(episodeStage, prior, receipts);
  const episode = buildCandidate({
    plan: compiledPlan,
    stage: episodeStage,
    body: episodeBody(),
    bodySchemaVersion: "v2-episode-outline-artifact.v1",
    dependencyRaw: episodeDependencyRaw,
    provenanceRefs: [
      sourceRef("intro-source", "3"),
      sourceRef("scenario-source", "4"),
      sourceRef("voice-data-policy", "d"),
      ...consentSourceRefs(),
      sourceRef("voice-deletion-policy", "f"),
      sourceRef("minor-safety-policy", "5"),
      sourceRef("voice-network-egress", "6"),
      decisionRef("HYP-V2-007", "7"),
    ],
  });
  prior.set(episodeStage.stageId, episode);
  return {
    compiledPlan,
    prior,
    receipts,
    seasonStage,
    season,
    seasonReceipt,
    seasonDependencyHandle,
    episodeStage,
    episode,
  };
}

function validatedEpisodeFixture() {
  const fixture = validSeasonAndEpisode();
  const episodeReceipt = validateV2CanonicalStageArtifact(
    fixture.compiledPlan,
    fixture.episode.handle,
    fixture.episode.dependencyRaw,
    fixture.episode.refRaw,
    fixture.seasonDependencyHandle,
  );
  fixture.receipts.set(fixture.episodeStage.stageId, episodeReceipt);
  return {
    ...fixture,
    episodeReceipt,
    episodeDependencyHandle: bindV2ValidatedStageDependency(
      fixture.episode.handle,
      episodeReceipt,
    ),
  };
}

function b2Atom(
  contentUnitId: string,
  text: string,
  usageRole:
    | "scene_line"
    | "counterpart_line"
    | "learner_variant"
    | "useful_phrase"
    | "branch_choice",
  semanticSlotIds = ["greeting-slot"],
  constraintIds = ["greeting-appropriate"],
) {
  const outcomeIds = ["outcome-1"];
  const linguisticUnitIds = ["unit-1"];
  const sourceContentHashes = [hash("4")];
  return {
    contentUnitId,
    semanticId: `${contentUnitId}-semantic`,
    usageRole,
    text,
    outcomeIds,
    linguisticUnitIds,
    semanticSlotIds,
    constraintIds,
    sourceRefIds: ["scenario-source"],
    semanticHash: hashCanonicalBody({
      schemaVersion: "v2-target-language-content-unit-semantics.v1",
      targetLanguage: "en",
      contentUnitId,
      semanticId: `${contentUnitId}-semantic`,
      usageRole,
      text,
      outcomeIds,
      linguisticUnitIds,
      semanticSlotIds,
      constraintIds,
      sourceContentHashes,
    }),
  };
}

function b2Scaffold(
  contentUnitId: string,
  purpose: string,
  sourceText: string,
) {
  const sourceContentHashes = [hash("4")];
  return {
    contentUnitId,
    semanticId: `${contentUnitId}-semantic`,
    purpose,
    sourceLocale: "en",
    sourceText,
    sourceRefIds: ["scenario-source"],
    semanticHash: hashCanonicalBody({
      schemaVersion: "v2-localizable-scaffolding-semantics.v1",
      contentUnitId,
      semanticId: `${contentUnitId}-semantic`,
      purpose,
      sourceLocale: "en",
      sourceText,
      sourceContentHashes,
    }),
  };
}

function b2Boundary(
  targetLanguageAtoms: readonly ReturnType<typeof b2Atom>[],
  localizableScaffolding: readonly ReturnType<typeof b2Scaffold>[],
) {
  const targetIds = targetLanguageAtoms.map((row) => row.contentUnitId).sort();
  const scaffoldIds = localizableScaffolding
    .map((row) => row.contentUnitId)
    .sort();
  return {
    requiredInterfaceLocales: [
      "ru",
      "uk",
      "es",
      "pt-BR",
      "vi",
      "id",
      "tr",
      "pl",
    ],
    targetLanguageOnlyContentUnitIds: targetIds,
    localizableScaffoldingContentUnitIds: scaffoldIds,
    learnerVisibleContentUnitIds: [...targetIds, ...scaffoldIds].sort(),
  };
}

function b2OutlineBinding(fixture: ReturnType<typeof validatedEpisodeFixture>) {
  return {
    stageId: fixture.episodeStage.stageId,
    bodyFingerprint: fixture.episode.handle.bodyFingerprint,
    candidateFingerprint: fixture.episode.handle.candidateFingerprint,
    scenarioId: "scenario-first-greeting",
  };
}

function sceneBody(fixture: ReturnType<typeof validatedEpisodeFixture>) {
  const targetLanguageAtoms = [
    b2Atom("scene-line-1", "Hello, I am Alex.", "scene_line"),
    b2Atom("scene-line-2", "Nice to meet you.", "scene_line"),
    b2Atom(
      "scene-line-3",
      "How are you today?",
      "scene_line",
      ["closing-slot"],
      ["meaning-clear"],
    ),
  ];
  const localizableScaffolding = [
    b2Scaffold(
      "scene-a11y",
      "accessibility",
      "A person greets a new neighbor near the entrance.",
    ),
    b2Scaffold(
      "scene-progress",
      "progress",
      "Complete the three greeting actions.",
    ),
    b2Scaffold(
      "scene-repair-1",
      "repair",
      "Try the first greeting action again.",
    ),
    b2Scaffold(
      "scene-repair-2",
      "repair",
      "Check who is speaking before choosing.",
    ),
    b2Scaffold(
      "scene-repair-3",
      "repair",
      "Use the final greeting action to finish.",
    ),
    b2Scaffold(
      "scene-fallback",
      "fallback",
      "Use the text list to complete the same greeting goal.",
    ),
  ];
  return {
    schemaVersion: "v2-scene-set-artifact.v1",
    episodeOutlineBinding: b2OutlineBinding(fixture),
    episodeId: "episode-1",
    sceneSetId: "scene-set-episode-1",
    targetLanguage: "en",
    scenarioId: "scenario-first-greeting",
    objectives: [
      {
        objectiveId: "greet-person",
        outcomeIds: ["outcome-1"],
        semanticSlotIds: ["greeting-slot"],
        criticalConstraintIds: ["greeting-appropriate"],
      },
      {
        objectiveId: "close-greeting",
        outcomeIds: ["outcome-1"],
        semanticSlotIds: ["closing-slot"],
        criticalConstraintIds: ["meaning-clear"],
      },
    ],
    contentBoundary: b2Boundary(targetLanguageAtoms, localizableScaffolding),
    targetLanguageAtoms,
    localizableScaffolding,
    entrySceneId: "scene-1",
    scenes: [
      {
        sceneId: "scene-1",
        ordinal: 1,
        settingSemanticId: "building-entrance",
        objectiveIds: ["close-greeting", "greet-person"],
        outcomeIds: ["outcome-1"],
        linguisticUnitIds: ["unit-1"],
        targetLanguageContentUnitIds: [
          "scene-line-1",
          "scene-line-2",
          "scene-line-3",
        ],
        sourceRefIds: ["scenario-source"],
        hotspots: [1, 2, 3].map((ordinal) => ({
          actionId: `action-${ordinal}`,
          ordinal,
          objectiveIds: ordinal === 3 ? ["close-greeting"] : ["greet-person"],
          resultSemanticId: `scene-line-${ordinal}-semantic`,
          repairContentUnitId: `scene-repair-${ordinal}`,
        })),
        nextSceneId: null,
        terminal: true,
        listActionIds: ["action-1", "action-2", "action-3"],
        accessibilityDescriptionContentUnitId: "scene-a11y",
        progressContentUnitId: "scene-progress",
        interactionContract: {
          coordinateOnly: false,
          colorOnly: false,
          dragRequired: false,
          hoverRequired: false,
        },
        motionContract: {
          infiniteMotion: false,
          reducedMotion: "static_or_crossfade",
        },
        completionContract: {
          mode: "all_actions_required",
          requiredActionIds: ["action-1", "action-2", "action-3"],
          requiredObjectiveIds: ["close-greeting", "greet-person"],
        },
      },
    ],
    fallbackContract: {
      mode: "deterministic_text_script",
      contentUnitId: "scene-fallback",
      objectiveIds: ["close-greeting", "greet-person"],
      outcomeIds: ["outcome-1"],
      semanticSlotIds: ["closing-slot", "greeting-slot"],
      criticalConstraintIds: ["greeting-appropriate", "meaning-clear"],
      actionIds: ["action-1", "action-2", "action-3"],
      parityVerificationStage: "v2_activity_instances",
      runtimeParityAuthority: "none",
      voiceEvidenceEquivalent: false,
      assetRequired: false,
    },
  };
}

function dialogueBody(fixture: ReturnType<typeof validatedEpisodeFixture>) {
  const targetLanguageAtoms = [
    b2Atom("dialogue-partner-1", "Hello, I am Sam.", "counterpart_line"),
    b2Atom("dialogue-partner-2", "Nice to meet you.", "counterpart_line"),
    b2Atom(
      "dialogue-partner-3",
      "How are you today?",
      "counterpart_line",
      ["closing-slot"],
      ["meaning-clear"],
    ),
  ];
  const evaluatorOnlyTargetLanguageAtoms = [
    b2Atom("dialogue-learner-1", "Hello, I am Alex.", "learner_variant"),
    b2Atom("dialogue-learner-2", "Nice to meet you too.", "learner_variant"),
    b2Atom(
      "dialogue-learner-3",
      "I am well, thank you.",
      "learner_variant",
      ["closing-slot"],
      ["meaning-clear"],
    ),
  ];
  const localizableScaffolding = [
    b2Scaffold(
      "dialogue-goal-1",
      "instruction",
      "Greet the new neighbor naturally.",
    ),
    b2Scaffold(
      "dialogue-goal-2",
      "instruction",
      "Respond politely to the introduction.",
    ),
    b2Scaffold(
      "dialogue-goal-3",
      "instruction",
      "Close the greeting exchange clearly.",
    ),
    b2Scaffold(
      "dialogue-repair-1",
      "repair",
      "Use the greeting pattern from the lesson.",
    ),
    b2Scaffold(
      "dialogue-repair-2",
      "repair",
      "Respond politely to the partner.",
    ),
    b2Scaffold(
      "dialogue-repair-3",
      "repair",
      "Answer the final greeting question.",
    ),
    b2Scaffold(
      "dialogue-fallback",
      "fallback",
      "Complete the same conversation with text choices.",
    ),
  ];
  const turn = (ordinal: number, learner: boolean) => {
    const pair = Math.ceil(ordinal / 2);
    const semanticSlotIds = pair === 3 ? ["closing-slot"] : ["greeting-slot"];
    const constraintIds =
      pair === 3 ? ["meaning-clear"] : ["greeting-appropriate"];
    const acceptedVariantContentUnitIds = learner
      ? [`dialogue-learner-${pair}`]
      : [];
    return {
      turnId: `turn-${ordinal}`,
      ordinal,
      speakerId: learner ? "learner" : "counterpart",
      targetLanguageContentUnitId: learner ? null : `dialogue-partner-${pair}`,
      learnerGoalContentUnitId: learner ? `dialogue-goal-${pair}` : null,
      outcomeIds: ["outcome-1"],
      semanticSlotIds,
      constraintIds,
      evidenceRole: learner && pair === 3 ? "near_transfer" : "guided_practice",
      support: learner ? "partial" : "full",
      maxHints: learner ? 1 : 0,
      answerExposure: learner ? "forbidden" : "allowed",
      captionRequired: true,
      replayAllowed: true,
      slowerAllowed: true,
      acceptedVariantContentUnitIds,
      repairContentUnitIds: learner ? [`dialogue-repair-${pair}`] : [],
      voiceTaskSpec: learner
        ? {
            schemaVersion: "v2-voice-task.v1",
            taskType: "scripted",
            objectiveIds: ["outcome-1"],
            speechLocale: "en-US",
            learningConstructs: ["communicative_objective"],
            referenceText: evaluatorOnlyTargetLanguageAtoms[pair - 1].text,
            acceptedSpokenVariants: [
              evaluatorOnlyTargetLanguageAtoms[pair - 1].text,
            ],
            transcriptConfirmation: "not_required",
          }
        : null,
    };
  };
  const turns = [
    turn(1, false),
    turn(2, true),
    turn(3, false),
    turn(4, true),
    turn(5, false),
    turn(6, true),
  ];
  return {
    schemaVersion: "v2-dialogue-script-artifact.v1",
    episodeOutlineBinding: b2OutlineBinding(fixture),
    episodeId: "episode-1",
    dialogueId: "dialogue-episode-1",
    targetLanguage: "en",
    dialogueKind: "scripted",
    scenarioId: "scenario-first-greeting",
    outcomeIds: ["outcome-1"],
    linguisticUnitIds: ["unit-1"],
    contentBoundary: b2Boundary(targetLanguageAtoms, localizableScaffolding),
    targetLanguageAtoms,
    evaluatorOnlyTargetLanguageAtoms,
    localizableScaffolding,
    speechProfileBinding: {
      profileId: "english-general",
      profileVersion: 1,
      profileContentHash: hash("a"),
      targetLanguage: "en",
      speechLocale: "en-US",
    },
    registerContract: {
      relationshipSemanticId: "new-acquaintances",
      formalityPolicyId: "neutral-polite",
      consistencyRequired: true,
    },
    speakers: [
      {
        speakerId: "counterpart",
        roleSemanticId: "new-neighbor",
        role: "counterpart",
      },
      { speakerId: "learner", roleSemanticId: "learner-self", role: "learner" },
    ],
    turns,
    branches: [],
    fullTranscriptTurnIds: turns.map((row) => row.turnId),
    fallbackContract: {
      mode: "deterministic_choice_or_text",
      contentUnitId: "dialogue-fallback",
      outcomeIds: ["outcome-1"],
      semanticSlotIds: ["closing-slot", "greeting-slot"],
      criticalConstraintIds: ["greeting-appropriate", "meaning-clear"],
      parityVerificationStage: "v2_activity_instances",
      runtimeParityAuthority: "none",
      voiceSpecificEvidence: false,
      networkRequired: false,
      microphoneRequired: false,
    },
  };
}

function speakingBody(fixture: ReturnType<typeof validatedEpisodeFixture>) {
  const targetLanguageAtoms = [
    b2Atom("speaking-phrase-1", "Hello, I am Alex.", "useful_phrase"),
    b2Atom(
      "speaking-phrase-2",
      "Nice to meet you.",
      "useful_phrase",
      ["closing-slot"],
      ["meaning-clear"],
    ),
  ];
  const localizableScaffolding = [
    b2Scaffold("speaking-prompt", "instruction", speakingPromptText),
    b2Scaffold(
      "speaking-fallback-1",
      "fallback",
      "Choose a suitable opening for the greeting.",
    ),
    b2Scaffold(
      "speaking-fallback-2",
      "fallback",
      "Choose a polite closing for the greeting.",
    ),
  ];
  const outcomeIds = ["outcome-1"];
  const linguisticUnitIds = ["unit-1"];
  const semanticSlotIds = ["closing-slot", "greeting-slot"];
  const criticalConstraintIds = ["greeting-appropriate", "meaning-clear"];
  const promptText = localizableScaffolding[0].sourceText;
  const contextBody = speakingContextBody(1);
  const sourceContentHashes = [hash("4")];
  const surfaceSemanticHash = hashCanonicalBody({
    schemaVersion: "v2-learning-surface-semantics.v1",
    targetLanguage: "en",
    promptText,
    contextBody,
    outcomeIds,
    linguisticUnitIds,
    sourceContentHashes,
  });
  const visibleSurfaceSemanticHash = speakingVisibleSurfaceHash(1, "outcome-1");
  const contentSemanticHash = hashCanonicalBody({
    schemaVersion: "v2-training-content-semantics.v1",
    sourceContentHash: hash("4"),
    contentBody: contextBody,
    outcomeIds,
    linguisticUnitIds,
  });
  const training = [
    trainingPromptRow(1, "outcome-1"),
    trainingPromptRow(2, "outcome-1"),
  ];
  return {
    schemaVersion: "v2-speaking-mission-artifact.v1",
    episodeOutlineBinding: b2OutlineBinding(fixture),
    episodeId: "episode-1",
    missionId: "speaking-mission-episode-1",
    targetLanguage: "en",
    taskType: "spontaneous",
    phase: "transfer_capstone",
    introducesNewMaterial: false,
    scenarioId: "scenario-first-greeting",
    outcomeIds,
    linguisticUnitIds,
    objectives: [
      {
        objectiveId: "open-conversation",
        outcomeIds,
        semanticSlotIds: ["greeting-slot"],
        criticalConstraintIds: ["greeting-appropriate"],
      },
      {
        objectiveId: "respond-politely",
        outcomeIds,
        semanticSlotIds: ["greeting-slot"],
        criticalConstraintIds: ["greeting-appropriate"],
      },
      {
        objectiveId: "close-conversation",
        outcomeIds,
        semanticSlotIds: ["closing-slot"],
        criticalConstraintIds: ["meaning-clear"],
      },
    ],
    semanticSlotIds,
    criticalConstraintIds,
    contentBoundary: b2Boundary(targetLanguageAtoms, localizableScaffolding),
    targetLanguageAtoms,
    localizableScaffolding,
    usefulPhraseRefs: training.map((row) => ({
      contentUnitId: `speaking-phrase-${training.indexOf(row) + 1}`,
      promptSemanticHash: row.promptSemanticHash,
      contentSemanticHash: row.contentSemanticHash,
      outcomeIds,
    })),
    prompt: {
      contentUnitId: "speaking-prompt",
      promptText,
      contextBody,
      surfaceSemanticHash,
      visibleSurfaceSemanticHash,
      contentSemanticHash,
      sourceRefIds: ["scenario-source"],
      newSurfaceForm: true,
    },
    speechProfileBinding: {
      profileId: "english-general",
      profileVersion: 1,
      profileContentHash: hash("a"),
      targetLanguage: "en",
      speechLocale: "en-US",
    },
    voiceTaskSpec: {
      schemaVersion: "v2-voice-task.v1",
      taskType: "spontaneous",
      objectiveIds: [
        "close-conversation",
        "open-conversation",
        "respond-politely",
      ],
      speechLocale: "en-US",
      learningConstructs: ["communicative_objective"],
      semanticVariantIds: [
        "close-conversation",
        "open-conversation",
        "respond-politely",
      ],
      transcriptConfirmation: "required",
    },
    turnContract: {
      minimumTargetTurns: 3,
      maximumTargetTurns: 6,
      transcriptConfirmation: "required_before_network_send",
    },
    supportContract: {
      answerExposure: "forbidden",
      requiredAnswerText: null,
      mandatoryHints: 0,
    },
    evidenceDeclaration: {
      allowedKinds: ["acoustic_pronunciation", "dialogue_objectives"],
      voiceTranscriptMatchAllowed: false,
      editedTranscriptAuthority: "semantic_neutral_only",
      typedRouteAuthority: "semantic_neutral_only",
      uncertainResultAuthority: "no_pass_fail_mastery_or_stars",
    },
    networkContract: {
      coreCompletionRequiresNetwork: false,
      cancelRequired: true,
      timeoutSeconds: 30,
      providerConfigAllowed: false,
    },
    fallbackContract: {
      mode: "deterministic_non_ai",
      routeId: "speaking-fallback-route",
      entryStepId: "fallback-step-1",
      objectiveIds: [
        "close-conversation",
        "open-conversation",
        "respond-politely",
      ],
      outcomeIds,
      semanticSlotIds,
      criticalConstraintIds,
      steps: [
        {
          stepId: "fallback-step-1",
          ordinal: 1,
          instructionContentUnitId: "speaking-fallback-1",
          objectiveIds: ["open-conversation", "respond-politely"],
          outcomeIds,
          semanticSlotIds: ["greeting-slot"],
          criticalConstraintIds: ["greeting-appropriate"],
          nextStepId: "fallback-step-2",
          terminal: false,
        },
        {
          stepId: "fallback-step-2",
          ordinal: 2,
          instructionContentUnitId: "speaking-fallback-2",
          objectiveIds: ["close-conversation"],
          outcomeIds,
          semanticSlotIds: ["closing-slot"],
          criticalConstraintIds: ["meaning-clear"],
          nextStepId: null,
          terminal: true,
        },
      ],
      parityVerificationStage: "v2_activity_instances",
      runtimeParityAuthority: "none",
      voiceEvidenceEquivalent: false,
    },
    retryPolicy: {
      mandatoryLearningRetriesMax: 2,
      technicalFailureConsumesLearningRetry: false,
      alternateAfterTechnicalFailure: true,
    },
    rewardPolicyRef: {
      policyId: "learning-v2-voice-third-star.v1",
      version: 1,
      authority: "code_owned_runtime_only",
      requiredOutcome: "PASS_CONFIDENT",
      requiredEvidenceKind: "eligible_voice_evidence",
      minimumConfidentUneditedAttempts: 2,
      contentMayAward: false,
      policyFingerprint: hashCanonicalBody({
        schemaVersion: "v2-code-owned-reward-policy.v1",
        policyId: "learning-v2-voice-third-star.v1",
        version: 1,
        authority: "code_owned_runtime_only",
        requiredOutcome: "PASS_CONFIDENT",
        requiredEvidenceKind: "eligible_voice_evidence",
        minimumConfidentUneditedAttempts: 2,
        contentMayAward: false,
      }),
    },
    privacyRequirements: {
      personalDisclosure: "fictional_ephemeral_skippable_only",
      rawAudioRetention: "runtime_policy_only",
      transcriptRetention: "runtime_policy_only",
      providerTraining: "forbidden",
      genericAnalyticsPayload: "none",
      consentDecision: "runtime_only",
      minorSafetyReviewRequired: true,
    },
    governanceRefs: {
      voiceDataPolicyRef: {
        policyId: "voice-data-policy",
        version: 1,
        contentHash: hash("d"),
      },
      voiceDataPolicyObjectRef: provenanceObjectRef("voice-data-policy", "d"),
      voiceConsentCopyRefs: [
        "ru",
        "uk",
        "es",
        "pt-BR",
        "vi",
        "id",
        "tr",
        "pl",
      ].map((locale, index) => ({
        copyId: `voice-consent-copy-${locale}`,
        version: 1,
        locale,
        contentHash: hash("01234567"[index]),
      })),
      voiceConsentCopyObjectRefs: consentSourceRefs().map((ref, index) =>
        provenanceObjectRef(ref.provenanceId, "01234567"[index]),
      ),
      voiceDeletionRouteRef: {
        deletionRouteId: "voice-deletion-policy",
        version: 1,
        contentHash: hash("f"),
      },
      voiceDeletionRouteObjectRef: provenanceObjectRef(
        "voice-deletion-policy",
        "f",
      ),
      voiceMinorsPolicyRef: {
        minorsPolicyId: "minor-safety-policy",
        version: 1,
        contentHash: hash("5"),
      },
      voiceMinorsPolicyObjectRef: provenanceObjectRef(
        "minor-safety-policy",
        "5",
      ),
      voiceNetworkEgressRef: {
        gatewayId: "voice-network-egress",
        version: 1,
        contentHash: hash("6"),
      },
      voiceNetworkEgressObjectRef: provenanceObjectRef(
        "voice-network-egress",
        "6",
      ),
    },
  };
}

function buildB2Candidate(
  fixture: ReturnType<typeof validatedEpisodeFixture>,
  kind: "v2_scene_set" | "v2_dialogue_script" | "v2_speaking_mission",
  body: unknown,
  bodySchemaVersion: string,
  provenanceRefs?: readonly ReturnType<typeof sourceRef>[],
) {
  const stage = fixture.compiledPlan.stages.find(
    (row) => row.kind === kind && row.episodeId === "episode-1",
  )!;
  const dependencyRaw = dependencyRawFor(
    stage,
    fixture.prior,
    fixture.receipts,
  );
  const inheritedProvenance =
    provenanceRefs ??
    (kind === "v2_speaking_mission"
      ? [
          sourceRef("scenario-source", "4"),
          sourceRef("voice-data-policy", "d"),
          ...consentSourceRefs(),
          sourceRef("voice-deletion-policy", "f"),
          sourceRef("minor-safety-policy", "5"),
          sourceRef("voice-network-egress", "6"),
        ]
      : [sourceRef("scenario-source", "4")]);
  return {
    stage,
    candidate: buildCandidate({
      plan: fixture.compiledPlan,
      stage,
      body,
      bodySchemaVersion,
      dependencyRaw,
      provenanceRefs: inheritedProvenance,
    }),
  };
}

function scopeFixture(
  scope: "chapter_internal" | "full_season",
  episodeOrdinal: number,
) {
  const compiledPlan = plan(scope);
  const prior = new Map<string, BuiltCandidate>();
  const receipts = new Map<string, V2MachineStageValidationReceiptV1>();
  const seasonStage = compiledPlan.stages.find(
    (stage) => stage.kind === "v2_season_outline",
  )!;
  const season = buildCandidate({
    plan: compiledPlan,
    stage: seasonStage,
    body: seasonBody(compiledPlan),
    bodySchemaVersion: "v2-season-outline-artifact.v1",
    dependencyRaw: dependencyRawFor(seasonStage, prior),
    provenanceRefs: [
      sourceRef("cefr-2020", "1"),
      sourceRef("english-pragmatics", "2"),
    ],
  });
  prior.set(seasonStage.stageId, season);
  const seasonReceipt = validateV2CanonicalStageArtifact(
    compiledPlan,
    season.handle,
    season.dependencyRaw,
    season.refRaw,
  );
  receipts.set(seasonStage.stageId, seasonReceipt);
  const seasonDependencyHandle = bindV2ValidatedStageDependency(
    season.handle,
    seasonReceipt,
  );
  const episodeId = compiledPlan.episodeIds[episodeOrdinal - 1];
  const episodeStage = compiledPlan.stages.find(
    (stage) =>
      stage.kind === "v2_episode_outline" && stage.episodeId === episodeId,
  )!;
  const episode = buildCandidate({
    plan: compiledPlan,
    stage: episodeStage,
    body: episodeBody(compiledPlan, episodeOrdinal),
    bodySchemaVersion: "v2-episode-outline-artifact.v1",
    dependencyRaw: dependencyRawFor(episodeStage, prior, receipts),
    provenanceRefs: [
      sourceRef("intro-source", "3"),
      sourceRef("scenario-source", "4"),
      decisionRef("HYP-V2-007", "7"),
    ],
  });
  return {
    compiledPlan,
    prior,
    receipts,
    seasonStage,
    season,
    seasonReceipt,
    seasonDependencyHandle,
    episodeStage,
    episode,
  };
}

describe("canonical V2 stage validation B1+B2a", () => {
  it("has an exhaustive exact-13 registry with exactly five installed validators", () => {
    expect(Object.keys(V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION)).toEqual(
      V2_CANONICAL_STAGE_KINDS,
    );
    expect(
      Object.values(V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION).filter(
        (row) => row.state === "installed",
      ),
    ).toHaveLength(5);
    expect(
      V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION.v2_season_outline.state,
    ).toBe("installed");
    expect(
      V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION.v2_episode_outline.state,
    ).toBe("installed");
    expect(V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION.v2_scene_set.state).toBe(
      "installed",
    );
    expect(
      V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION.v2_dialogue_script.state,
    ).toBe("installed");
    expect(
      V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION.v2_speaking_mission.state,
    ).toBe("installed");
  });

  it("makes valid season and episode outlines eligible only for human review", () => {
    const fixture = validSeasonAndEpisode();
    const seasonReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      fixture.season.handle,
      fixture.season.dependencyRaw,
      fixture.season.refRaw,
    );
    expect(seasonReceipt).toMatchObject({
      outcome: "eligible_for_human_review",
      blockingIssueCodes: [],
      humanReviewState: "not_evaluated",
      humanApprovalAuthority: "none",
      executionAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(seasonReceipt.requiredHumanEvidence).toEqual([
      "curriculum_scientist",
      "target_language_linguist",
    ]);

    const episodeReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      fixture.episode.handle,
      fixture.episode.dependencyRaw,
      fixture.episode.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(episodeReceipt).toMatchObject({
      outcome: "eligible_for_human_review",
      blockingIssueCodes: [],
      specialistEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(Object.isFrozen(episodeReceipt)).toBe(true);
  });

  it("validates chapter and full-season checkpoint scopes without granting release authority", () => {
    for (const [scope, ordinal] of [
      ["chapter_internal", 8],
      ["full_season", 32],
    ] as const) {
      const fixture = scopeFixture(scope, ordinal);
      expect(fixture.seasonReceipt).toMatchObject({
        outcome: "eligible_for_human_review",
        releaseEligible: false,
        releaseAuthority: false,
      });
      const episodeReceipt = validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        fixture.episode.handle,
        fixture.episode.dependencyRaw,
        fixture.episode.refRaw,
        fixture.seasonDependencyHandle,
      );
      expect(episodeReceipt).toMatchObject({
        outcome: "eligible_for_human_review",
        blockingIssueCodes: [],
        releaseAuthority: false,
      });
    }
  });

  it("binds every episode to the season-planned current and prior transfer surfaces", () => {
    const fixture = scopeFixture("chapter_internal", 8);
    const body = episodeBody(fixture.compiledPlan, 8);
    const drifted = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: {
        ...body,
        priorTransferSurfaceSemanticHashes:
          body.priorTransferSurfaceSemanticHashes.slice(1),
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const receipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      drifted.handle,
      drifted.dependencyRaw,
      drifted.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(receipt.blockingIssueCodes).toContain(
      "v2_episode_outline_transfer_surface_history_invalid",
    );

    const visibleDrift = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: {
        ...body,
        priorVisibleSurfaceSemanticHashes:
          body.priorVisibleSurfaceSemanticHashes.slice(1),
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const visibleReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      visibleDrift.handle,
      visibleDrift.dependencyRaw,
      visibleDrift.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(visibleReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_transfer_surface_history_invalid",
    );
  });

  it("recomputes visible training history instead of trusting a season commitment", () => {
    const compiledPlan = plan();
    const prior = new Map<string, BuiltCandidate>();
    const receipts = new Map<string, V2MachineStageValidationReceiptV1>();
    const seasonStage = compiledPlan.stages.find(
      (stage) => stage.kind === "v2_season_outline",
    )!;
    const originalSeasonBody = seasonBody(compiledPlan);
    const forgedSeasonBody = {
      ...originalSeasonBody,
      promptHistoryCommitments: originalSeasonBody.promptHistoryCommitments.map(
        (row, index) =>
          index === 0
            ? {
                ...row,
                trainingVisibleSurfaceSemanticHashes:
                  row.trainingVisibleSurfaceSemanticHashes.map(
                    (value, hashIndex) => (hashIndex === 0 ? hash("9") : value),
                  ),
              }
            : row,
      ),
    };
    const season = buildCandidate({
      plan: compiledPlan,
      stage: seasonStage,
      body: forgedSeasonBody,
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: dependencyRawFor(seasonStage, prior),
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
    });
    const seasonReceipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      season.handle,
      season.dependencyRaw,
      season.refRaw,
    );
    expect(seasonReceipt.outcome).toBe("eligible_for_human_review");
    prior.set(seasonStage.stageId, season);
    receipts.set(seasonStage.stageId, seasonReceipt);
    const seasonDependencyHandle = bindV2ValidatedStageDependency(
      season.handle,
      seasonReceipt,
    );
    const episodeStage = compiledPlan.stages.find(
      (stage) => stage.kind === "v2_episode_outline",
    )!;
    const episodeDependencyRaw = dependencyRawFor(
      episodeStage,
      prior,
      receipts,
    );
    const episode = buildCandidate({
      plan: compiledPlan,
      stage: episodeStage,
      body: episodeBody(compiledPlan),
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: episodeDependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        sourceRef("voice-data-policy", "d"),
        ...consentSourceRefs(),
        sourceRef("voice-deletion-policy", "f"),
        sourceRef("minor-safety-policy", "5"),
        sourceRef("voice-network-egress", "6"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const episodeReceipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      episode.handle,
      episode.dependencyRaw,
      episode.refRaw,
      seasonDependencyHandle,
    );
    expect(episodeReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_prompt_history_mismatch",
    );
  });

  it("blocks B2 use when an outcome-unit pair was practiced before it was introduced", () => {
    const compiledPlan = plan();
    const baseEpisode = episodeBody(compiledPlan);
    const reversedSessions = baseEpisode.sessions.map((session, index) => {
      if (index > 1) return session;
      const purpose = index === 0 ? "practice" : "teaching";
      return {
        ...session,
        evidencePlan: {
          ...session.evidencePlan,
          introduceOutcomeIds: index === 1 ? ["outcome-1"] : [],
        },
        trainingPromptRefs: [
          rephaseTrainingPrompt(session.trainingPromptRefs[0], purpose),
        ],
      };
    });
    const reversedEpisodeBody = { ...baseEpisode, sessions: reversedSessions };
    const baseSeason = seasonBody(compiledPlan);
    const reversedPromptHashes = reversedSessions.map(
      (session) => session.trainingPromptRefs[0].promptSemanticHash,
    );
    const reversedSeasonBody = {
      ...baseSeason,
      promptHistoryCommitments: baseSeason.promptHistoryCommitments.map(
        (row, index) =>
          index === 0
            ? { ...row, trainingPromptSemanticHashes: reversedPromptHashes }
            : row,
      ),
    };
    const prior = new Map<string, BuiltCandidate>();
    const receipts = new Map<string, V2MachineStageValidationReceiptV1>();
    const seasonStage = compiledPlan.stages.find(
      (stage) => stage.kind === "v2_season_outline",
    )!;
    const season = buildCandidate({
      plan: compiledPlan,
      stage: seasonStage,
      body: reversedSeasonBody,
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: dependencyRawFor(seasonStage, prior),
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
    });
    const seasonReceipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      season.handle,
      season.dependencyRaw,
      season.refRaw,
    );
    prior.set(seasonStage.stageId, season);
    receipts.set(seasonStage.stageId, seasonReceipt);
    const seasonDependencyHandle = bindV2ValidatedStageDependency(
      season.handle,
      seasonReceipt,
    );
    const episodeStage = compiledPlan.stages.find(
      (stage) => stage.kind === "v2_episode_outline",
    )!;
    const episode = buildCandidate({
      plan: compiledPlan,
      stage: episodeStage,
      body: reversedEpisodeBody,
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: dependencyRawFor(episodeStage, prior, receipts),
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        sourceRef("voice-data-policy", "d"),
        ...consentSourceRefs(),
        sourceRef("voice-deletion-policy", "f"),
        sourceRef("minor-safety-policy", "5"),
        sourceRef("voice-network-egress", "6"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const episodeReceipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      episode.handle,
      episode.dependencyRaw,
      episode.refRaw,
      seasonDependencyHandle,
    );
    expect(episodeReceipt.outcome).toBe("eligible_for_human_review");
    prior.set(episodeStage.stageId, episode);
    receipts.set(episodeStage.stageId, episodeReceipt);
    const fixture = {
      compiledPlan,
      prior,
      receipts,
      seasonStage,
      season,
      seasonReceipt,
      seasonDependencyHandle,
      episodeStage,
      episode,
      episodeReceipt,
      episodeDependencyHandle: bindV2ValidatedStageDependency(
        episode.handle,
        episodeReceipt,
      ),
    } as ReturnType<typeof validatedEpisodeFixture>;
    const sceneStage = compiledPlan.stages.find(
      (stage) => stage.kind === "v2_scene_set",
    )!;
    const scene = buildCandidate({
      plan: compiledPlan,
      stage: sceneStage,
      body: sceneBody(fixture),
      bodySchemaVersion: "v2-scene-set-artifact.v1",
      dependencyRaw: dependencyRawFor(sceneStage, prior, receipts),
      provenanceRefs: [sourceRef("scenario-source", "4")],
    });
    const sceneReceipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      scene.handle,
      scene.dependencyRaw,
      scene.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(sceneReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_outline_binding_invalid",
    );
  });

  it("requires an exact branded successful predecessor receipt and propagates test-only blocking", () => {
    const fixture = validSeasonAndEpisode();
    const testOnlySeason = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.seasonStage,
      body: seasonBody(fixture.compiledPlan),
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: fixture.season.dependencyRaw,
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
      contentClass: "test_only",
    });
    const blockedReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      testOnlySeason.handle,
      testOnlySeason.dependencyRaw,
      testOnlySeason.refRaw,
    );
    expect(blockedReceipt.outcome).toBe("blocked");
    expect(() =>
      bindV2ValidatedStageDependency(testOnlySeason.handle, blockedReceipt),
    ).toThrow("v2_stage_dependency_receipt_invalid");

    const directCandidateReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      fixture.episode.handle,
      fixture.episode.dependencyRaw,
      fixture.episode.refRaw,
      fixture.season.handle as never,
    );
    expect(directCandidateReceipt.outcome).toBe("blocked");
    expect(directCandidateReceipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_stage_dependency_receipt_untrusted",
        "v2_episode_outline_season_dependency_invalid",
      ]),
    );
    expect(() =>
      validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        fixture.episode.handle,
        fixture.episode.dependencyRaw,
        fixture.episode.refRaw,
        ...Array.from({ length: 33 }, () => fixture.seasonDependencyHandle),
      ),
    ).toThrow("v2_stage_dependency_receipt_count_invalid");
  });

  it("blocks dishonest season claims, broken progression and test-only provenance", () => {
    const fixture = validSeasonAndEpisode();
    const body = seasonBody();
    const broken = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.seasonStage,
      body: {
        ...body,
        certificationClaim: true,
        checkpoints: [
          {
            checkpointId: "fake",
            afterEpisodeOrdinal: 1,
            coveredOutcomeIds: ["outcome-greeting"],
            heldOutPromptPolicy: "trained",
            certificationClaim: true,
          },
        ],
      },
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: fixture.season.dependencyRaw,
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
      contentClass: "test_only",
    });
    const receipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      broken.handle,
      broken.dependencyRaw,
      broken.refRaw,
    );
    expect(receipt.outcome).toBe("blocked");
    expect(receipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_season_outline_claim_invalid",
        "v2_season_outline_checkpoint_count_invalid",
        "v2_stage_test_content_forbidden",
      ]),
    );
  });

  it("blocks unbound intro questions, missing sessions and fake same-session independence", () => {
    const fixture = validSeasonAndEpisode();
    const body = episodeBody();
    const sessions = body.sessions.slice(0, 11);
    const first = sessions[0];
    sessions[0] = {
      ...first,
      intro: { ...first.intro, questions: first.intro.questions.slice(0, 2) },
      independentCandidates: [
        {
          outcomeId: "outcome-1",
          support: "full_text",
          maxHints: 1,
          answerExposure: "shown",
          promptNovelty: "trained",
          promptSemanticHash: sha256Utf8("training-prompt-1"),
          contentSemanticHash: sha256Utf8("training-content-1"),
        },
      ],
    };
    const broken = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: { ...body, sessions },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const receipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      broken.handle,
      broken.dependencyRaw,
      broken.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(receipt.outcome).toBe("blocked");
    expect(receipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_episode_outline_session_count_invalid",
        "v2_episode_outline_intro_question_count_invalid",
        "v2_episode_outline_independent_invalid",
        "v2_episode_outline_intro_question_coverage_invalid",
      ]),
    );
  });

  it("binds the episode to the exact season row and derives novelty from real training prompts", () => {
    const fixture = scopeFixture("chapter_internal", 1);
    const swapped = episodeBody(fixture.compiledPlan, 1);
    const swappedSessions = swapped.sessions.map((session) => ({
      ...session,
      primaryOutcomeIds: ["outcome-2"],
      focusUnitIds: ["unit-2"],
      evidencePlan: {
        introduceOutcomeIds: session.evidencePlan.introduceOutcomeIds.length
          ? ["outcome-2"]
          : [],
        retrievalOutcomeIds: session.evidencePlan.retrievalOutcomeIds.length
          ? ["outcome-2"]
          : [],
        nearTransferOutcomeIds: session.evidencePlan.nearTransferOutcomeIds
          .length
          ? ["outcome-2"]
          : [],
        delayedPracticeOutcomeIds: session.evidencePlan
          .delayedPracticeOutcomeIds.length
          ? ["outcome-2"]
          : [],
      },
      independentCandidates: session.independentCandidates.map((item) => ({
        ...item,
        outcomeId: "outcome-2",
      })),
    }));
    const swappedCandidate = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: {
        ...swapped,
        primaryOutcomeIds: ["outcome-2"],
        sessions: swappedSessions,
        delayedProbeDefinitions: swapped.delayedProbeDefinitions.map((row) => ({
          ...row,
          outcomeId: "outcome-2",
        })),
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const swappedReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      swappedCandidate.handle,
      swappedCandidate.dependencyRaw,
      swappedCandidate.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(swappedReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_outcome_binding_invalid",
    );

    const rehearsal = episodeBody(fixture.compiledPlan, 1);
    const firstTraining = trainingPromptRow(1, "outcome-1");
    const rehearsalSessions = rehearsal.sessions.map((session, index) =>
      index === 9
        ? {
            ...session,
            independentCandidates: [
              {
                ...session.independentCandidates[0],
                promptSemanticHash: firstTraining.promptSemanticHash,
                contentSemanticHash: firstTraining.contentSemanticHash,
              },
            ],
          }
        : session,
    );
    const rehearsalCandidate = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: { ...rehearsal, sessions: rehearsalSessions },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const rehearsalReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      rehearsalCandidate.handle,
      rehearsalCandidate.dependencyRaw,
      rehearsalCandidate.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(rehearsalReceipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_episode_outline_independent_invalid",
        "v2_episode_outline_evidence_role_closure_invalid",
      ]),
    );
  });

  it("blocks independent and delayed reuse from any earlier episode even when season commitments collude", () => {
    const compiledPlan = plan("chapter_internal");
    const prior = new Map<string, BuiltCandidate>();
    const receipts = new Map<string, V2MachineStageValidationReceiptV1>();
    const seasonStage = compiledPlan.stages.find(
      (stage) => stage.kind === "v2_season_outline",
    )!;
    const season = seasonBody(compiledPlan);
    const priorIndependent = trainingPromptRow(1, "outcome-1");
    const priorDelayed = trainingPromptRow(2, "outcome-1");
    const commitments = season.promptHistoryCommitments.map((row, index) =>
      index === 1
        ? {
            ...row,
            independentPromptSemanticHashes: [
              priorIndependent.promptSemanticHash,
            ],
            independentContentSemanticHashes: [
              priorIndependent.contentSemanticHash,
            ],
            delayedPromptSemanticHashes: [priorDelayed.promptSemanticHash],
            delayedContentSemanticHashes: [priorDelayed.contentSemanticHash],
          }
        : row,
    );
    const seasonCandidate = buildCandidate({
      plan: compiledPlan,
      stage: seasonStage,
      body: { ...season, promptHistoryCommitments: commitments },
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: dependencyRawFor(seasonStage, prior),
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
    });
    prior.set(seasonStage.stageId, seasonCandidate);
    const seasonReceipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      seasonCandidate.handle,
      seasonCandidate.dependencyRaw,
      seasonCandidate.refRaw,
    );
    expect(seasonReceipt.outcome).toBe("eligible_for_human_review");
    receipts.set(seasonStage.stageId, seasonReceipt);
    const seasonHandle = bindV2ValidatedStageDependency(
      seasonCandidate.handle,
      seasonReceipt,
    );
    const episodeStage = compiledPlan.stages.find(
      (stage) =>
        stage.kind === "v2_episode_outline" && stage.episodeId === "episode-2",
    )!;
    const episode = episodeBody(compiledPlan, 2);
    const sessions = episode.sessions.map((session, index) =>
      index === 9
        ? {
            ...session,
            independentCandidates: [
              {
                ...session.independentCandidates[0],
                promptSemanticHash: priorIndependent.promptSemanticHash,
                contentSemanticHash: priorIndependent.contentSemanticHash,
              },
            ],
          }
        : session,
    );
    const delayed = episode.delayedProbeDefinitions.map((row) => ({
      ...row,
      novelPromptSemanticHash: priorDelayed.promptSemanticHash,
      novelContentSemanticHash: priorDelayed.contentSemanticHash,
    }));
    const dependencyRaw = dependencyRawFor(episodeStage, prior, receipts);
    const candidate = buildCandidate({
      plan: compiledPlan,
      stage: episodeStage,
      body: { ...episode, sessions, delayedProbeDefinitions: delayed },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const receipt = validateV2CanonicalStageArtifact(
      compiledPlan,
      candidate.handle,
      candidate.dependencyRaw,
      candidate.refRaw,
      seasonHandle,
    );
    expect(receipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_episode_outline_independent_invalid",
        "v2_episode_outline_delayed_probe_invalid",
      ]),
    );
  });

  it("binds target language and every intro claim to distinct immutable source semantics", () => {
    const fixture = validSeasonAndEpisode();
    const foreignSeason = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.seasonStage,
      body: { ...seasonBody(fixture.compiledPlan), targetLanguage: "fr" },
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: fixture.season.dependencyRaw,
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
    });
    const foreignReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      foreignSeason.handle,
      foreignSeason.dependencyRaw,
      foreignSeason.refRaw,
    );
    expect(foreignReceipt.blockingIssueCodes).toContain(
      "v2_season_outline_target_language_invalid",
    );

    const body = episodeBody(fixture.compiledPlan, 1);
    const firstIntro = body.sessions[0].intro;
    const claims = firstIntro.claims.map((claim, index) =>
      index === 0 ? { ...claim, sourceHash: hash("0") } : claim,
    );
    const sessions = body.sessions.map((session, index) =>
      index === 0 ? { ...session, intro: { ...firstIntro, claims } } : session,
    );
    const broken = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: { ...body, sessions },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const brokenReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      broken.handle,
      broken.dependencyRaw,
      broken.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(brokenReceipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_episode_outline_intro_claim_invalid",
        "v2_episode_outline_intro_question_invalid",
      ]),
    );

    const duplicateBody = episodeBody(fixture.compiledPlan, 1);
    const duplicateIntro = duplicateBody.sessions[0].intro;
    const firstQuestion = duplicateIntro.questions[0];
    const secondQuestion = duplicateIntro.questions[1];
    const copiedChoices = secondQuestion.choices.map((choice, index) => ({
      ...choice,
      text: firstQuestion.choices[index].text,
    }));
    const copiedQuestion = {
      ...secondQuestion,
      prompt: firstQuestion.prompt,
      choices: copiedChoices,
      explanation: firstQuestion.explanation,
      questionSemanticHash: hashCanonicalBody({
        schemaVersion: "v2-intro-question-semantics.v1",
        claimSourceHash: duplicateIntro.claims[1].sourceHash,
        prompt: firstQuestion.prompt,
        choices: copiedChoices,
        correctChoiceSemanticId: secondQuestion.correctChoiceSemanticId,
        explanation: firstQuestion.explanation,
      }),
    };
    const duplicateSessions = duplicateBody.sessions.map((session, index) =>
      index === 0
        ? {
            ...session,
            intro: {
              ...duplicateIntro,
              questions: [
                firstQuestion,
                copiedQuestion,
                duplicateIntro.questions[2],
              ],
            },
          }
        : session,
    );
    const duplicate = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: { ...duplicateBody, sessions: duplicateSessions },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const duplicateReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      duplicate.handle,
      duplicate.dependencyRaw,
      duplicate.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(duplicateReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_intro_question_invalid",
    );

    const wrongPolicyBody = episodeBody(fixture.compiledPlan, 1);
    const wrongPolicy = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: {
        ...wrongPolicyBody,
        delayedProbeDefinitions: wrongPolicyBody.delayedProbeDefinitions.map(
          (row) => ({
            ...row,
            decisionRegistryRef: {
              ...row.decisionRegistryRef,
              contentHash: hash("0"),
            },
          }),
        ),
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: fixture.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "0"),
      ],
    });
    const wrongPolicyReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      wrongPolicy.handle,
      wrongPolicy.dependencyRaw,
      wrongPolicy.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(wrongPolicyReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_delayed_probe_invalid",
    );
  });

  it("blocks impossible CEFR jumps and checkpoint coverage of future or missing outcomes", () => {
    const full = plan("full_season");
    const prior = new Map<string, BuiltCandidate>();
    const seasonStage = full.stages.find(
      (stage) => stage.kind === "v2_season_outline",
    )!;
    const futureBody = seasonBody(full);
    const futureCheckpoints = futureBody.checkpoints.map((checkpoint, index) =>
      index === 0
        ? {
            ...checkpoint,
            coveredOutcomeIds: [...checkpoint.coveredOutcomeIds, "outcome-9"],
          }
        : checkpoint,
    );
    const futureCandidate = buildCandidate({
      plan: full,
      stage: seasonStage,
      body: { ...futureBody, checkpoints: futureCheckpoints },
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: dependencyRawFor(seasonStage, prior),
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
    });
    const futureReceipt = validateV2CanonicalStageArtifact(
      full,
      futureCandidate.handle,
      futureCandidate.dependencyRaw,
      futureCandidate.refRaw,
    );
    expect(futureReceipt.blockingIssueCodes).toContain(
      "v2_season_outline_checkpoint_invalid",
    );

    const allC2Rows = futureBody.episodeRows.map((row) => ({
      ...row,
      cefrBand: "C2",
    }));
    const allC2Outcomes = futureBody.outcomes.map((row) => ({
      ...row,
      cefrBand: "C2",
    }));
    const allC2 = buildCandidate({
      plan: full,
      stage: seasonStage,
      body: { ...futureBody, episodeRows: allC2Rows, outcomes: allC2Outcomes },
      bodySchemaVersion: "v2-season-outline-artifact.v1",
      dependencyRaw: futureCandidate.dependencyRaw,
      provenanceRefs: [
        sourceRef("cefr-2020", "1"),
        sourceRef("english-pragmatics", "2"),
      ],
    });
    const allC2Receipt = validateV2CanonicalStageArtifact(
      full,
      allC2.handle,
      allC2.dependencyRaw,
      allC2.refRaw,
    );
    expect(allC2Receipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_season_outline_episode_invalid",
        "v2_season_outline_cefr_coverage_invalid",
      ]),
    );

    const chapter = scopeFixture("chapter_internal", 8);
    const episode = episodeBody(chapter.compiledPlan, 8);
    const missingCoverage = buildCandidate({
      plan: chapter.compiledPlan,
      stage: chapter.episodeStage,
      body: {
        ...episode,
        checkpointBlueprint: {
          ...episode.checkpointBlueprint!,
          coveredOutcomeIds:
            episode.checkpointBlueprint!.coveredOutcomeIds.slice(1),
        },
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: chapter.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const missingReceipt = validateV2CanonicalStageArtifact(
      chapter.compiledPlan,
      missingCoverage.handle,
      missingCoverage.dependencyRaw,
      missingCoverage.refRaw,
      chapter.seasonDependencyHandle,
    );
    expect(missingReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_checkpoint_invalid",
    );

    const leakedTraining = trainingPromptRow(1, "outcome-1");
    const leakedHeldOut = buildCandidate({
      plan: chapter.compiledPlan,
      stage: chapter.episodeStage,
      body: {
        ...episode,
        checkpointBlueprint: {
          ...episode.checkpointBlueprint!,
          heldOutPromptRefs: [
            {
              promptSemanticHash: leakedTraining.promptSemanticHash,
              contentSemanticHash: leakedTraining.contentSemanticHash,
              sourceRefId: "scenario-source",
              outcomeIds: ["outcome-1"],
              constructIds: ["spoken-interaction"],
              criticalTargetIds: ["critical-target-1"],
            },
          ],
        },
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: chapter.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const leakedReceipt = validateV2CanonicalStageArtifact(
      chapter.compiledPlan,
      leakedHeldOut.handle,
      leakedHeldOut.dependencyRaw,
      leakedHeldOut.refRaw,
      chapter.seasonDependencyHandle,
    );
    expect(leakedReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_checkpoint_invalid",
    );

    const swappedTargetRefs =
      episode.checkpointBlueprint!.heldOutPromptRefs.map((row, index) => {
        if (index === 0)
          return { ...row, criticalTargetIds: ["critical-target-2"] };
        if (index === 1)
          return { ...row, criticalTargetIds: ["critical-target-1"] };
        return row;
      });
    const swappedTargets = buildCandidate({
      plan: chapter.compiledPlan,
      stage: chapter.episodeStage,
      body: {
        ...episode,
        checkpointBlueprint: {
          ...episode.checkpointBlueprint!,
          heldOutPromptRefs: swappedTargetRefs,
        },
      },
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: chapter.episode.dependencyRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const swappedTargetsReceipt = validateV2CanonicalStageArtifact(
      chapter.compiledPlan,
      swappedTargets.handle,
      swappedTargets.dependencyRaw,
      swappedTargets.refRaw,
      chapter.seasonDependencyHandle,
    );
    expect(swappedTargetsReceipt.blockingIssueCodes).toContain(
      "v2_episode_outline_checkpoint_invalid",
    );
  });

  it("blocks stale resolved dependencies and a forged object reference", () => {
    const fixture = validSeasonAndEpisode();
    const staleRaw = dependencyRawFor(
      fixture.episodeStage,
      fixture.prior,
      fixture.receipts,
      { artifactHash: hash("0") },
    );
    const stale = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: episodeBody(),
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: staleRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const receipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      stale.handle,
      stale.dependencyRaw,
      stale.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(receipt.blockingIssueCodes).toContain(
      "v2_stage_dependency_candidate_stale",
    );
    const forgedReviewRaw = dependencyRawFor(
      fixture.episodeStage,
      fixture.prior,
      fixture.receipts,
      { reviewFingerprint: hash("0") },
    );
    const forgedReview = buildCandidate({
      plan: fixture.compiledPlan,
      stage: fixture.episodeStage,
      body: episodeBody(fixture.compiledPlan, 1),
      bodySchemaVersion: "v2-episode-outline-artifact.v1",
      dependencyRaw: forgedReviewRaw,
      provenanceRefs: [
        sourceRef("intro-source", "3"),
        sourceRef("scenario-source", "4"),
        decisionRef("HYP-V2-007", "7"),
      ],
    });
    const forgedReviewReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      forgedReview.handle,
      forgedReview.dependencyRaw,
      forgedReview.refRaw,
      fixture.seasonDependencyHandle,
    );
    expect(forgedReviewReceipt.blockingIssueCodes).toContain(
      "v2_stage_dependency_candidate_stale",
    );
    const forgedRef = canonicalJsonV1({
      objectPath: "learning-v2/candidates/forged.json",
      contentHash: hash("0"),
      objectGeneration: "unpersisted",
      byteSize: utf8ByteLengthV1(stale.raw),
    });
    expect(() =>
      validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        stale.handle,
        stale.dependencyRaw,
        forgedRef,
        fixture.seasonDependencyHandle,
      ),
    ).toThrow("v2_stage_artifact_ref_invalid");
  });

  it("validates scene, dialogue, and speaking artifacts only for human review", () => {
    const fixture = validatedEpisodeFixture();
    const cases = [
      ["v2_scene_set", sceneBody(fixture), "v2-scene-set-artifact.v1"],
      [
        "v2_dialogue_script",
        dialogueBody(fixture),
        "v2-dialogue-script-artifact.v1",
      ],
      [
        "v2_speaking_mission",
        speakingBody(fixture),
        "v2-speaking-mission-artifact.v1",
      ],
    ] as const;
    for (const [kind, body, schema] of cases) {
      const built = buildB2Candidate(fixture, kind, body, schema);
      const receipt = validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        built.candidate.handle,
        built.candidate.dependencyRaw,
        built.candidate.refRaw,
        fixture.episodeDependencyHandle,
      );
      expect(receipt).toMatchObject({
        stageKind: kind,
        outcome: "eligible_for_human_review",
        blockingIssueCodes: [],
        humanReviewState: "not_evaluated",
        specialistEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        listeningEvidenceAuthority: "none",
        artifactStorageAuthority: "none",
        sourceEvidenceAuthority: "unverified_external_refs",
        evidenceAuthority: "machine_validation_only",
        externalDependencyAuthority: "unverified_external_refs",
        humanApprovalAuthority: "none",
        executionAuthority: "none",
        runtimeConsumer: false,
        releaseEligible: false,
        releaseAuthority: false,
        publicationPolicy: "draft_only_no_consumer",
      });
      expect(receipt.requiredHumanEvidence.length).toBeGreaterThan(0);
      if (kind === "v2_scene_set") {
        expect(receipt.requiredHumanEvidence).toEqual([
          "accessibility_specialist",
          "cultural_safety_reviewer",
          "curriculum_scientist",
          "product_ux_reviewer",
          "target_language_linguist",
        ]);
      } else if (kind === "v2_dialogue_script") {
        expect(receipt.requiredHumanEvidence).toEqual([
          "accessibility_specialist",
          "assessment_specialist",
          "cultural_safety_reviewer",
          "curriculum_scientist",
          "plain_language_copy_reviewer",
          "pragmatics_reviewer",
          "product_ux_reviewer",
          "target_language_linguist",
        ]);
        expect(receipt.requiredDeviceEvidence).toEqual([
          "android_dialogue_offline_accessibility",
          "android_talkback_dialogue",
          "ios_dialogue_offline_accessibility",
          "ios_voiceover_dialogue",
          "large_text_100_150_200_dialogue",
          "low_end_dialogue_performance",
          "reduced_motion_dialogue",
        ]);
        expect(receipt.requiredListeningEvidence).toEqual([
          "dialogue_tempo_intelligibility",
          "dialogue_text_audio_parity",
        ]);
      } else {
        expect(receipt.requiredHumanEvidence).toEqual([
          "accessibility_specialist",
          "assessment_specialist",
          "cultural_safety_reviewer",
          "curriculum_scientist",
          "minor_safety_reviewer",
          "plain_language_copy_reviewer",
          "privacy_reviewer",
          "product_ux_reviewer",
          "pronunciation_specialist",
          "speech_pedagogy_reviewer",
          "target_language_linguist",
          "voice_privacy_reviewer",
        ]);
        expect(receipt.requiredDeviceEvidence).toEqual([
          "android_audio_interruption_recovery",
          "android_speaking_fallback_accessibility",
          "android_talkback_speaking",
          "ios_audio_interruption_recovery",
          "ios_speaking_fallback_accessibility",
          "ios_voiceover_speaking",
          "large_text_100_150_200_speaking",
          "low_end_speaking_performance",
          "offline_speaking_fallback",
          "reduced_motion_speaking",
        ]);
        expect(receipt.requiredListeningEvidence).toEqual([
          "speaking_construct_listening_review",
        ]);
      }
    }
  });

  it("blocks source laundering and unsafe learner-visible text before semantic approval", () => {
    const fixture = validatedEpisodeFixture();
    const injected = buildB2Candidate(
      fixture,
      "v2_scene_set",
      sceneBody(fixture),
      "v2-scene-set-artifact.v1",
      [sourceRef("foreign-source", "f")],
    );
    const injectedReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      injected.candidate.handle,
      injected.candidate.dependencyRaw,
      injected.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(injectedReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_provenance_not_inherited",
    );

    const unsafe = sceneBody(fixture);
    const unsafeAtoms = unsafe.targetLanguageAtoms.map((row, index) =>
      index === 0 ? { ...row, text: "Hello\u202ethere" } : row,
    );
    const unsafeCandidate = buildB2Candidate(
      fixture,
      "v2_scene_set",
      {
        ...unsafe,
        targetLanguageAtoms: unsafeAtoms,
      },
      "v2-scene-set-artifact.v1",
    );
    const unsafeReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      unsafeCandidate.candidate.handle,
      unsafeCandidate.candidate.dependencyRaw,
      unsafeCandidate.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(unsafeReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_target_content_invalid",
    );
  });

  it("blocks non-equivalent fallbacks and voice-evidence laundering", () => {
    const fixture = validatedEpisodeFixture();
    const dialogue = dialogueBody(fixture);
    const badDialogue = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        fallbackContract: {
          ...dialogue.fallbackContract,
          voiceSpecificEvidence: true,
        },
      },
      "v2-dialogue-script-artifact.v1",
    );
    const dialogueReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      badDialogue.candidate.handle,
      badDialogue.candidate.dependencyRaw,
      badDialogue.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(dialogueReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_fallback_parity_invalid",
    );

    const speaking = speakingBody(fixture);
    const badSpeaking = buildB2Candidate(
      fixture,
      "v2_speaking_mission",
      {
        ...speaking,
        evidenceDeclaration: {
          ...speaking.evidenceDeclaration,
          voiceTranscriptMatchAllowed: true,
        },
        fallbackContract: {
          ...speaking.fallbackContract,
          voiceEvidenceEquivalent: true,
        },
      },
      "v2-speaking-mission-artifact.v1",
    );
    const speakingReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      badSpeaking.candidate.handle,
      badSpeaking.candidate.dependencyRaw,
      badSpeaking.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(speakingReceipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_speaking_mission_evidence_claim_invalid",
        "v2_speaking_mission_fallback_parity_invalid",
      ]),
    );
  });

  it("blocks malformed scene topology and dialogue transcript drift", () => {
    const fixture = validatedEpisodeFixture();
    const scene = sceneBody(fixture);
    const badScene = buildB2Candidate(
      fixture,
      "v2_scene_set",
      {
        ...scene,
        scenes: scene.scenes.map((row) => ({
          ...row,
          nextSceneId: "missing-scene",
          terminal: false,
          listActionIds: ["action-1", "action-2"],
        })),
      },
      "v2-scene-set-artifact.v1",
    );
    const sceneReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      badScene.candidate.handle,
      badScene.candidate.dependencyRaw,
      badScene.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(sceneReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_scene_graph_invalid",
    );

    const swappedScene = buildB2Candidate(
      fixture,
      "v2_scene_set",
      {
        ...scene,
        scenes: scene.scenes.map((row) => ({
          ...row,
          hotspots: row.hotspots.map((hotspot, index) =>
            index === 0
              ? { ...hotspot, resultSemanticId: "scene-line-3-semantic" }
              : hotspot,
          ),
        })),
      },
      "v2-scene-set-artifact.v1",
    );
    const swappedSceneReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      swappedScene.candidate.handle,
      swappedScene.candidate.dependencyRaw,
      swappedScene.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(swappedSceneReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_scene_graph_invalid",
    );

    const dialogue = dialogueBody(fixture);
    const badDialogue = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        fullTranscriptTurnIds: dialogue.fullTranscriptTurnIds.slice(1),
      },
      "v2-dialogue-script-artifact.v1",
    );
    const dialogueReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      badDialogue.candidate.handle,
      badDialogue.candidate.dependencyRaw,
      badDialogue.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(dialogueReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_turns_invalid",
    );

    const collidingScaffold = b2Scaffold(
      dialogue.evaluatorOnlyTargetLanguageAtoms[0].contentUnitId,
      "instruction",
      "Produce a natural greeting without seeing the expected answer.",
    );
    const collidedScaffolds = [
      ...dialogue.localizableScaffolding,
      collidingScaffold,
    ];
    const collision = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        localizableScaffolding: collidedScaffolds,
        contentBoundary: b2Boundary(
          dialogue.targetLanguageAtoms,
          collidedScaffolds,
        ),
      },
      "v2-dialogue-script-artifact.v1",
    );
    const collisionReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      collision.candidate.handle,
      collision.candidate.dependencyRaw,
      collision.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(collisionReceipt.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "v2_dialogue_script_scaffolding_invalid",
        "v2_dialogue_script_content_boundary_invalid",
      ]),
    );

    const leakedAnswerScaffold = b2Scaffold(
      "visible-answer-leak",
      "instruction",
      dialogue.evaluatorOnlyTargetLanguageAtoms[0].text,
    );
    const leakedScaffolds = [
      ...dialogue.localizableScaffolding,
      leakedAnswerScaffold,
    ];
    const leak = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        localizableScaffolding: leakedScaffolds,
        contentBoundary: b2Boundary(
          dialogue.targetLanguageAtoms,
          leakedScaffolds,
        ),
      },
      "v2-dialogue-script-artifact.v1",
    );
    const leakReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      leak.candidate.handle,
      leak.candidate.dependencyRaw,
      leak.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(leakReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_evaluator_content_leak",
    );
  });

  it("binds every bounded dialogue choice to the exact next learner semantics", () => {
    const fixture = validatedEpisodeFixture();
    const valid = dialogueBody(fixture);
    const branchChoices = [
      b2Atom(
        "dialogue-choice-1-greeting",
        "Continue the greeting.",
        "branch_choice",
      ),
      b2Atom(
        "dialogue-choice-2-closing",
        "Close the exchange.",
        "branch_choice",
        ["closing-slot"],
        ["meaning-clear"],
      ),
    ];
    const targetLanguageAtoms = [
      ...valid.targetLanguageAtoms,
      ...branchChoices,
    ];
    const branching = {
      ...valid,
      dialogueKind: "bounded_branching",
      targetLanguageAtoms,
      contentBoundary: b2Boundary(
        targetLanguageAtoms,
        valid.localizableScaffolding,
      ),
      branches: [
        {
          branchId: "branch-after-opening",
          fromTurnId: "turn-3",
          choiceContentUnitIds: [
            "dialogue-choice-1-greeting",
            "dialogue-choice-2-closing",
          ],
          nextTurnIds: ["turn-4", "turn-6"],
          terminalGoalIds: ["outcome-1"],
        },
      ],
    };
    const validate = (body: unknown) => {
      const built = buildB2Candidate(
        fixture,
        "v2_dialogue_script",
        body,
        "v2-dialogue-script-artifact.v1",
      );
      return validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        built.candidate.handle,
        built.candidate.dependencyRaw,
        built.candidate.refRaw,
        fixture.episodeDependencyHandle,
      );
    };
    expect(validate(branching)).toMatchObject({
      outcome: "eligible_for_human_review",
      blockingIssueCodes: [],
    });
    const semanticallySwappedChoices = [
      b2Atom(
        "dialogue-choice-1-greeting",
        "Continue the greeting.",
        "branch_choice",
        ["closing-slot"],
        ["meaning-clear"],
      ),
      b2Atom(
        "dialogue-choice-2-closing",
        "Close the exchange.",
        "branch_choice",
        ["greeting-slot"],
        ["greeting-appropriate"],
      ),
    ];
    const semanticallySwappedAtoms = [
      ...valid.targetLanguageAtoms,
      ...semanticallySwappedChoices,
    ];
    expect(
      validate({
        ...branching,
        targetLanguageAtoms: semanticallySwappedAtoms,
        contentBoundary: b2Boundary(
          semanticallySwappedAtoms,
          valid.localizableScaffolding,
        ),
      }).blockingIssueCodes,
    ).toContain("v2_dialogue_script_branching_invalid");
    expect(
      validate({
        ...branching,
        branches: [{ ...branching.branches[0], terminalGoalIds: [] }],
      }).blockingIssueCodes,
    ).toContain("v2_dialogue_script_branching_invalid");
    expect(
      validate({
        ...branching,
        branches: [{ ...branching.branches[0], fromTurnId: "turn-1" }],
      }).blockingIssueCodes,
    ).toContain("v2_dialogue_script_branching_invalid");
  });

  it("keeps evaluator answers outside learner-visible content and binds scene/dialogue semantics exactly", () => {
    const fixture = validatedEpisodeFixture();
    const dialogue = dialogueBody(fixture);
    const evaluatorIds = dialogue.evaluatorOnlyTargetLanguageAtoms.map(
      (row) => row.contentUnitId,
    );
    expect(dialogue.contentBoundary.learnerVisibleContentUnitIds).toEqual(
      expect.not.arrayContaining(evaluatorIds),
    );

    const clonedEvaluator = {
      ...dialogue.evaluatorOnlyTargetLanguageAtoms[0],
      contentUnitId: "dialogue-learner-clone",
    };
    const cloned = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        evaluatorOnlyTargetLanguageAtoms: [
          ...dialogue.evaluatorOnlyTargetLanguageAtoms,
          clonedEvaluator,
        ],
      },
      "v2-dialogue-script-artifact.v1",
    );
    const clonedReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      cloned.candidate.handle,
      cloned.candidate.dependencyRaw,
      cloned.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(clonedReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_evaluator_content_invalid",
    );

    const scene = sceneBody(fixture);
    const forgedScene = buildB2Candidate(
      fixture,
      "v2_scene_set",
      {
        ...scene,
        scenes: scene.scenes.map((row) => ({
          ...row,
          hotspots: row.hotspots.map((hotspot, index) =>
            index === 0
              ? { ...hotspot, resultSemanticId: "forged-result-semantic" }
              : hotspot,
          ),
        })),
      },
      "v2-scene-set-artifact.v1",
    );
    const sceneReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      forgedScene.candidate.handle,
      forgedScene.candidate.dependencyRaw,
      forgedScene.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(sceneReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_scene_graph_invalid",
    );

    const driftedDialogue = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        turns: dialogue.turns.map((turn, index) =>
          index === 1 ? { ...turn, semanticSlotIds: ["closing-slot"] } : turn,
        ),
      },
      "v2-dialogue-script-artifact.v1",
    );
    const dialogueReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      driftedDialogue.candidate.handle,
      driftedDialogue.candidate.dependencyRaw,
      driftedDialogue.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(dialogueReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_turns_invalid",
    );
  });

  it("recomputes speaking novelty and rejects forged voice, governance, reward, and fallback claims", () => {
    const fixture = validatedEpisodeFixture();
    const valid = speakingBody(fixture);
    const validateMutation = (body: unknown) => {
      const built = buildB2Candidate(
        fixture,
        "v2_speaking_mission",
        body,
        "v2-speaking-mission-artifact.v1",
      );
      return validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        built.candidate.handle,
        built.candidate.dependencyRaw,
        built.candidate.refRaw,
        fixture.episodeDependencyHandle,
      );
    };

    expect(
      validateMutation({
        ...valid,
        prompt: { ...valid.prompt, contentSemanticHash: hash("9") },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_prompt_commitment_invalid");

    expect(
      validateMutation({
        ...valid,
        voiceTaskSpec: { ...valid.voiceTaskSpec, taskType: "scripted" },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_evidence_claim_invalid");

    expect(
      validateMutation({
        ...valid,
        voiceTaskSpec: {
          ...valid.voiceTaskSpec,
          referenceSemanticId: "forbidden-scripted-field",
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_evidence_claim_invalid");

    expect(
      validateMutation({
        ...valid,
        targetLanguageAtoms: valid.targetLanguageAtoms.map((atom, index) =>
          index === 0 ? { ...atom, injectedApproval: true } : atom,
        ),
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_target_content_invalid");

    expect(
      validateMutation({
        ...valid,
        localizableScaffolding: valid.localizableScaffolding.map(
          (scaffold, index) =>
            index === 0 ? { ...scaffold, injectedApproval: true } : scaffold,
        ),
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_scaffolding_invalid");

    expect(
      validateMutation({
        ...valid,
        governanceRefs: {
          ...valid.governanceRefs,
          voiceDataPolicyRef: {
            policyId: "scenario-source",
            version: 1,
            contentHash: hash("4"),
          },
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_privacy_invalid");

    expect(
      validateMutation({
        ...valid,
        governanceRefs: {
          ...valid.governanceRefs,
          voiceDataPolicyObjectRef: {
            ...valid.governanceRefs.voiceDataPolicyObjectRef,
            objectGeneration: "2",
          },
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_privacy_invalid");

    expect(
      validateMutation({
        ...valid,
        governanceRefs: {
          ...valid.governanceRefs,
          voiceDataPolicyRef: {
            ...valid.governanceRefs.voiceDataPolicyRef,
            version: 2,
            injectedApproval: true,
          },
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_privacy_invalid");

    expect(
      validateMutation({
        ...valid,
        rewardPolicyRef: { ...valid.rewardPolicyRef, contentMayAward: true },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_evidence_claim_invalid");

    expect(
      validateMutation({
        ...valid,
        rewardPolicyRef: { ...valid.rewardPolicyRef, version: 2 },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_evidence_claim_invalid");

    expect(
      validateMutation({
        ...valid,
        rewardPolicyRef: {
          ...valid.rewardPolicyRef,
          policyFingerprint: hash("9"),
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_evidence_claim_invalid");

    expect(
      validateMutation({
        ...valid,
        fallbackContract: {
          ...valid.fallbackContract,
          steps: valid.fallbackContract.steps.slice(0, 1),
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_fallback_parity_invalid");

    expect(
      validateMutation({
        ...valid,
        fallbackContract: {
          ...valid.fallbackContract,
          steps: valid.fallbackContract.steps.map((step, index) =>
            index === 0
              ? {
                  ...step,
                  objectiveIds: ["close-conversation"],
                  injectedApproval: true,
                }
              : step,
          ),
        },
      }).blockingIssueCodes,
    ).toContain("v2_speaking_mission_fallback_parity_invalid");
  });

  it("requires complete semantic coverage from every deterministic fallback blueprint", () => {
    const fixture = validatedEpisodeFixture();
    const scene = sceneBody(fixture);
    const sceneCandidate = buildB2Candidate(
      fixture,
      "v2_scene_set",
      {
        ...scene,
        fallbackContract: {
          ...scene.fallbackContract,
          actionIds: ["action-1", "action-2"],
        },
      },
      "v2-scene-set-artifact.v1",
    );
    const sceneReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      sceneCandidate.candidate.handle,
      sceneCandidate.candidate.dependencyRaw,
      sceneCandidate.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(sceneReceipt.blockingIssueCodes).toContain(
      "v2_scene_set_fallback_parity_invalid",
    );

    const dialogue = dialogueBody(fixture);
    const dialogueCandidate = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        fallbackContract: {
          ...dialogue.fallbackContract,
          semanticSlotIds: ["greeting-slot"],
        },
      },
      "v2-dialogue-script-artifact.v1",
    );
    const dialogueReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      dialogueCandidate.candidate.handle,
      dialogueCandidate.candidate.dependencyRaw,
      dialogueCandidate.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(dialogueReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_fallback_parity_invalid",
    );

    const exposedDialogue = buildB2Candidate(
      fixture,
      "v2_dialogue_script",
      {
        ...dialogue,
        turns: dialogue.turns.map((turn, index) =>
          index === 5 ? { ...turn, answerExposure: "allowed" } : turn,
        ),
      },
      "v2-dialogue-script-artifact.v1",
    );
    const exposedReceipt = validateV2CanonicalStageArtifact(
      fixture.compiledPlan,
      exposedDialogue.candidate.handle,
      exposedDialogue.candidate.dependencyRaw,
      exposedDialogue.candidate.refRaw,
      fixture.episodeDependencyHandle,
    );
    expect(exposedReceipt.blockingIssueCodes).toContain(
      "v2_dialogue_script_turns_invalid",
    );
  });

  it("enforces the smaller 128/96/64 KiB stage-body budgets before any future adapter", () => {
    const fixture = validatedEpisodeFixture();
    const paddedAtoms = Array.from({ length: 96 }, (_, index) =>
      b2Atom(
        `padding-atom-${index + 1}`,
        `${"A".repeat(470)} ${index + 1}`,
        "scene_line",
      ),
    );
    const paddedScaffolds = Array.from({ length: 64 }, (_, index) =>
      b2Scaffold(
        `padding-scaffold-${index + 1}`,
        "explanation",
        `${"B".repeat(470)} ${index + 1}`,
      ),
    );
    const cases = [
      {
        kind: "v2_scene_set" as const,
        schema: "v2-scene-set-artifact.v1",
        cap: 128 * 1024,
        body: sceneBody(fixture),
        issue: "v2_scene_set_schema_invalid",
      },
      {
        kind: "v2_dialogue_script" as const,
        schema: "v2-dialogue-script-artifact.v1",
        cap: 96 * 1024,
        body: dialogueBody(fixture),
        issue: "v2_dialogue_script_schema_invalid",
      },
      {
        kind: "v2_speaking_mission" as const,
        schema: "v2-speaking-mission-artifact.v1",
        cap: 64 * 1024,
        body: speakingBody(fixture),
        issue: "v2_speaking_mission_schema_invalid",
      },
    ];
    for (const row of cases) {
      const inflated = {
        ...row.body,
        targetLanguageAtoms: paddedAtoms,
        localizableScaffolding: paddedScaffolds,
        contentBoundary: b2Boundary(paddedAtoms, paddedScaffolds),
      };
      expect(utf8ByteLengthV1(canonicalJsonV1(inflated))).toBeGreaterThan(
        row.cap,
      );
      const built = buildB2Candidate(fixture, row.kind, inflated, row.schema);
      const receipt = validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        built.candidate.handle,
        built.candidate.dependencyRaw,
        built.candidate.refRaw,
        fixture.episodeDependencyHandle,
      );
      expect(receipt.blockingIssueCodes).toContain(row.issue);
    }
  });

  it("returns the exact not-installed blocker for every remaining stage kind", () => {
    const fixture = validatedEpisodeFixture();
    const prior = fixture.prior;
    const visitedKinds = new Set<string>();
    for (const stage of fixture.compiledPlan.stages) {
      if (
        V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION[stage.kind].state ===
        "installed"
      ) {
        if (stage.kind === "v2_scene_set") {
          prior.set(
            stage.stageId,
            buildB2Candidate(
              fixture,
              stage.kind,
              sceneBody(fixture),
              "v2-scene-set-artifact.v1",
            ).candidate,
          );
        } else if (stage.kind === "v2_dialogue_script") {
          prior.set(
            stage.stageId,
            buildB2Candidate(
              fixture,
              stage.kind,
              dialogueBody(fixture),
              "v2-dialogue-script-artifact.v1",
            ).candidate,
          );
        } else if (stage.kind === "v2_speaking_mission") {
          prior.set(
            stage.stageId,
            buildB2Candidate(
              fixture,
              stage.kind,
              speakingBody(fixture),
              "v2-speaking-mission-artifact.v1",
            ).candidate,
          );
        }
        continue;
      }
      const dependencyRaw = dependencyRawFor(stage, prior);
      const candidate = buildCandidate({
        plan: fixture.compiledPlan,
        stage,
        body: {
          schemaVersion: `placeholder-${stage.kind}.v1`,
          stageKind: stage.kind,
        },
        bodySchemaVersion: `placeholder-${stage.kind}.v1`,
        dependencyRaw,
      });
      prior.set(stage.stageId, candidate);
      if (visitedKinds.has(stage.kind)) continue;
      visitedKinds.add(stage.kind);
      const receipt = validateV2CanonicalStageArtifact(
        fixture.compiledPlan,
        candidate.handle,
        dependencyRaw,
        candidate.refRaw,
      );
      expect(receipt.outcome).toBe("blocked");
      expect(receipt.blockingIssueCodes).toEqual([
        "v2_stage_validator_not_installed",
      ]);
    }
    expect(visitedKinds).toEqual(new Set(V2_CANONICAL_STAGE_KINDS.slice(5)));
  });

  it("accepts only bounded canonical bytes and never executes caller accessors", () => {
    let traps = 0;
    const hostile = new Proxy(
      {},
      {
        get() {
          traps += 1;
          return undefined;
        },
        ownKeys() {
          traps += 1;
          return [];
        },
      },
    );
    expect(() => parseV2CanonicalStageArtifactRaw(hostile as never)).toThrow(
      "v2_stage_artifact_too_large",
    );
    expect(traps).toBe(0);
    expect(() =>
      parseV2CanonicalStageArtifactRaw(
        " ".repeat(V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES + 1),
      ),
    ).toThrow("v2_stage_artifact_too_large");
    const multibyteOversize = JSON.stringify({ value: "ж".repeat(300_000) });
    expect(multibyteOversize.length).toBeLessThan(
      V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES,
    );
    expect(() => parseV2CanonicalStageArtifactRaw(multibyteOversize)).toThrow(
      "v2_stage_artifact_too_large",
    );
    expect(() => parseV2CanonicalStageArtifactRaw('{"fraction":1.5}')).toThrow(
      "v2_stage_artifact_number_invalid",
    );
    const fixture = validSeasonAndEpisode();
    expect(() =>
      parseV2CanonicalStageArtifactRaw(
        JSON.stringify(JSON.parse(fixture.season.raw), null, 2),
      ),
    ).toThrow("v2_stage_artifact_noncanonical");
    const injected = {
      ...JSON.parse(fixture.season.raw),
      approved: true,
      releaseReady: true,
    };
    expect(() =>
      parseV2CanonicalStageArtifactRaw(canonicalJsonV1(injected)),
    ).toThrow("v2_stage_artifact_fields_invalid");
    expect(() =>
      buildCandidate({
        plan: fixture.compiledPlan,
        stage: fixture.seasonStage,
        body: seasonBody(fixture.compiledPlan),
        bodySchemaVersion: "v2-season-outline-artifact.v1",
        dependencyRaw: fixture.season.dependencyRaw,
        provenanceRefs: [
          sourceRef("cefr-2020", "1"),
          {
            ...sourceRef("cefr-2020", "2"),
            objectPath: "learning-v2/sources/cefr-2020-copy.json",
          },
        ],
      }),
    ).toThrow("v2_stage_artifact_provenance_duplicate");
  });

  it("has no live writer/provider/callable consumer or unsafe dependency", () => {
    const root = path.resolve(__dirname);
    const validatorSource = fs.readFileSync(
      path.join(root, "v2_canonical_stage_validation.ts"),
      "utf8",
    );
    const imports = [...validatorSource.matchAll(/from\s+['"]([^'"]+)['"]/g)]
      .map((match) => match[1])
      .sort();
    expect(imports).toEqual([
      "../../../modules/learning-v2/policies/decision_registry",
      "./v2_canonical_generation_plan",
      "./v2_canonical_stage_validation_b2",
      "./v2_generation_workspace_contract",
    ]);
    const b2InternalFiles = [
      "v2_canonical_stage_validation_b2.ts",
      "v2_canonical_stage_validation_b2_common.ts",
      "v2_canonical_stage_validation_b2_contract.ts",
      "v2_canonical_stage_validation_b2_dialogue.ts",
      "v2_canonical_stage_validation_b2_scene.ts",
      "v2_canonical_stage_validation_b2_speaking.ts",
    ] as const;
    for (const source of [
      validatorSource,
      ...b2InternalFiles.map((file) =>
        fs.readFileSync(path.join(root, file), "utf8"),
      ),
    ]) {
      expect(source).not.toMatch(
        /firebase-admin|@google-cloud|httpsCallable|process\.env|admin\/|\bfetch\b|node:https|child_process/i,
      );
      expect(source).not.toMatch(
        /\b(?:import|require)(?:\s|\/\*[\s\S]*?\*\/)*\(|\bimport(?:\s|\/\*[\s\S]*?\*\/)+['"]/u,
      );
    }
    const allowedInternalConsumers = new Set(
      ["v2_canonical_stage_validation.ts", ...b2InternalFiles].map((file) =>
        path.resolve(root, file),
      ),
    );
    const consumers = sourceFilesUnder(path.resolve(root, ".."))
      .filter((file) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(file))
      .filter((file) => !allowedInternalConsumers.has(path.resolve(file)))
      .filter((file) =>
        fs.readFileSync(file, "utf8").includes("v2_canonical_stage_validation"),
      );
    expect(consumers).toEqual([]);
  });
});
