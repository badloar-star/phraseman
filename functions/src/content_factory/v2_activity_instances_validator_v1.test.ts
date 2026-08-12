import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_SESSION_TASK_PURPOSES_V2 } from "../../../modules/learning-v2/contracts/activity_session_package_v2";
import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import {
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  v2LocalEvaluatorInputKindForFamilyV1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
  buildV2ActivitySessionProjection,
  parseV2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";
import {
  V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2,
  materializeV2ActivityInstancesAuthoringRootV2,
  materializeV2GenerationCapabilitySnapshotV1,
  v2ActivitySessionId,
  type V2ActivitySessionCanonicalBytesInputV2,
  type V2GenerationCapabilitySnapshotV1,
} from "./v2_activity_instances_package_v2";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
  V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
  materializeV2GenerationStageWorkspaceV2,
  parseV2CanonicalStageCandidateV2,
  parseV2StageDependencySnapshotV2,
  type V2CanonicalStageCandidateV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import {
  isV2ActivityInstancesValidationResultV1,
  validateV2ActivityInstancesCandidateV1,
} from "./v2_activity_instances_validator_v1";

const hash = (value: unknown) => hashCanonicalBody(value);

function planInput(suffix = "one") {
  return {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: `workspace-${suffix}`,
    jobId: `job-${suffix}`,
    authoringRevision: 7,
    seasonId: `season-${suffix}`,
    scope: "vertical_slice" as const,
    episodeIds: [`episode-${suffix}`],
    recipes: [
      {
        episodeId: `episode-${suffix}`,
        dialogue: true,
        speakingMission: true,
      },
    ],
    languageProfileRef: {
      profileId: "english-general",
      targetLanguage: "en",
      version: 3,
      contentHash: hash("language-profile"),
    },
    speechProfileRef: {
      profileId: "english-speech-general",
      targetLanguage: "en",
      speechLocale: "en-US",
      version: 2,
      contentHash: hash("speech-profile"),
    },
    voiceGenerationProfileRef: {
      profileId: "openai-tts-learning-v2",
      version: 1,
      contentHash: hash("voice-profile"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007" as const,
      version: 1,
      contentHash: hash("decision"),
    },
    templateBindings: [
      {
        episodeId: `episode-${suffix}`,
        templateRefs: [
          {
            templateId: "template-01",
            version: 2,
            contentHash: hash("template-01"),
          },
        ],
      },
    ],
  };
}

function plan(suffix = "one") {
  return buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(canonicalJsonV1(planInput(suffix))),
  );
}

function capability(currentPlan: V2CanonicalSeasonPlanV2, suffix = "one") {
  const input = planInput(suffix);
  return materializeV2GenerationCapabilitySnapshotV1({
    languageProfileRef: {
      profileId: input.languageProfileRef.profileId,
      version: input.languageProfileRef.version,
      contentHash: input.languageProfileRef.contentHash,
    },
    familyCatalogRef: currentPlan.courseContract.familyCatalogRef,
    requiredSessionFamilyPolicyRef:
      currentPlan.courseContract.requiredSessionFamilyPolicyRef,
    templates: input.templateBindings[0]!.templateRefs.map((template) => ({
      ...template,
      kernelBindingFingerprint: hash("kernel"),
      policySetFingerprint: hash("policy"),
      projectorRulesFingerprint: hash("projector"),
      supportManifestFingerprint: hash("support"),
    })),
  });
}

function sessionBytes(
  episodeId: string,
  sessionOrdinal: number,
): V2ActivitySessionCanonicalBytesInputV2 {
  const sessionId = v2ActivitySessionId(episodeId, sessionOrdinal);
  const fallback = [0, 1, 2]
    .map(
      (offset) =>
        V2_REQUIRED_SESSION_FAMILIES_V2[
          (sessionOrdinal - 1 + offset) % V2_REQUIRED_SESSION_FAMILIES_V2.length
        ],
    )
    .find((family) => family !== "scripted_repeat_compare")!;
  const tasks = Array.from({ length: 12 }, (_, index) => {
    const slot = index + 1;
    const taskId = `task:${episodeId}:s${sessionOrdinal}:t${slot}`;
    const selected =
      V2_REQUIRED_SESSION_FAMILIES_V2[
        (sessionOrdinal - 1 + Math.floor(index / 3)) %
          V2_REQUIRED_SESSION_FAMILIES_V2.length
      ];
    const family =
      (slot === 10 || slot === 12) && selected === "scripted_repeat_compare"
        ? fallback
        : selected;
    const inputKind = v2LocalEvaluatorInputKindForFamilyV1(family);
    const responseOptions = [
      { responseId: `${taskId}:a`, text: "A" },
      { responseId: `${taskId}:b`, text: "B" },
    ];
    const correctResponse =
      inputKind === "choice_token"
        ? responseOptions[0]!.responseId
        : `answer ${sessionOrdinal} ${slot}`;
    const reviewSession = sessionOrdinal === 1 ? 1 : sessionOrdinal - 1;
    return {
      taskId,
      slot,
      purpose: V2_REQUIRED_SESSION_TASK_PURPOSES_V2[index],
      family,
      activityId: `activity:${episodeId}:s${sessionOrdinal}:t${slot}`,
      contentItemId: `content:${episodeId}:s${sessionOrdinal}:t${slot}`,
      objectiveId:
        slot === 10
          ? `objective:${episodeId}:s${sessionOrdinal}:t4`
          : slot === 12
            ? `objective:${episodeId}:s${sessionOrdinal}:t6`
            : slot === 11
              ? `objective:${episodeId}:s${reviewSession}:t8`
              : `objective:${episodeId}:s${sessionOrdinal}:t${slot}`,
      learningFunction: `Practice ${sessionOrdinal}/${slot}`,
      answerExposure:
        slot === 10 || slot === 12
          ? ("forbidden" as const)
          : ("allowed_after_attempt" as const),
      promptNovelty:
        slot === 10 || slot === 12 ? ("novel" as const) : ("trained" as const),
      localEvaluatorCapsuleId: `capsule:${episodeId}:s${sessionOrdinal}:t${slot}`,
      inputMode:
        inputKind === "choice_token"
          ? ("single_choice" as const)
          : inputKind === "transcript"
            ? ("scripted_speech" as const)
            : ("ordered_tokens" as const),
      support:
        slot === 10 || slot === 12
          ? ("none" as const)
          : ("partial_cue" as const),
      hintsAllowed: 0 as const,
      introQuestionRef:
        slot <= 3
          ? {
              introArtifactFingerprint: hash(["intro", sessionOrdinal]),
              questionId: `${taskId}:intro-question`,
              coveredConceptIds: [`concept:s${sessionOrdinal}:t${slot}`],
            }
          : null,
      reviewSource:
        slot === 11
          ? {
              kind:
                sessionOrdinal === 1
                  ? ("same_session_bootstrap" as const)
                  : ("prior_session" as const),
              reviewOfTaskId: `task:${episodeId}:s${reviewSession}:t8`,
              sourceSessionOrdinal: reviewSession,
            }
          : null,
      learner: {
        promptId: `prompt:${episodeId}:s${sessionOrdinal}:t${slot}`,
        prompt: `Prompt ${sessionOrdinal}/${slot}`,
        responseOptions,
        mediaIds: [],
        audioTargetIds: [],
        accessibilityLabel: `Task ${slot}`,
      },
      scriptedAlternate: [
        "listen_choose",
        "sound_contrast",
        "listen_build_dictation",
        "scripted_repeat_compare",
      ].includes(family)
        ? {
            alternateId: `${taskId}:alternate`,
            instruction: `Alternate ${sessionOrdinal}/${slot}`,
            voiceEvidenceEquivalent: false as const,
            canAward: false as const,
          }
        : null,
      evaluator: {
        inputKind,
        normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
        correctResponse,
        acceptedResponses: [correctResponse],
        salt: hash(["salt", sessionOrdinal, slot]),
      },
    };
  });
  const sourceRaw = canonicalJsonV1({
    schemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
    episodeId,
    targetLanguage: "en",
    normalizationLocale: "en",
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    session: {
      sessionId,
      ordinal: sessionOrdinal,
      zone:
        sessionOrdinal <= 4
          ? "understand"
          : sessionOrdinal <= 8
            ? "use"
            : "master",
      targetSeconds: 240,
      tasks,
    },
  });
  const projection = buildV2ActivitySessionProjection(
    parseV2ActivitySessionProjectionSource(sourceRaw),
  );
  return {
    sessionOrdinal,
    sessionId,
    sourceRaw,
    renderRaw: canonicalJsonV1(projection.renderSeed),
    capsuleEnvelopeRaw: canonicalJsonV1(projection.appLocalCapsuleEnvelope),
    sidecarRaw: canonicalJsonV1(projection.serverSidecar),
    objectGenerations: {
      source: `source-${sessionOrdinal}`,
      render: `render-${sessionOrdinal}`,
      capsule: `capsule-${sessionOrdinal}`,
      sidecar: `sidecar-${sessionOrdinal}`,
    },
  };
}

function dependencySnapshotRaw(
  currentPlan: V2CanonicalSeasonPlanV2,
  stageId: string,
) {
  const stage = currentPlan.stages.find((entry) => entry.stageId === stageId)!;
  const requirements = new Map(
    currentPlan.externalRequirementCatalog.map((entry) => [
      entry.requirementId,
      entry.requirement,
    ]),
  );
  const entries = [
    ...stage.dependsOn.map((dependency, index) => ({
      dependencyType: "stage" as const,
      stageId: dependency,
      candidateFingerprint: hash(["candidate", dependency]),
      machineReceiptFingerprint: hash(["receipt", dependency]),
      artifactRef: {
        objectPath: `objects/stage-${index}.json`,
        contentHash: hash(["artifact", dependency]),
        objectGeneration: "generation-1",
        byteSize: 100,
      },
      lifecycleFingerprint: hash(["lifecycle", dependency]),
    })),
    ...stage.externalRequirementIds.map((requirementId) => {
      const requirement = requirements.get(requirementId)!;
      return {
        dependencyType: "external" as const,
        requirementId,
        requirement,
        artifactRef: {
          objectPath: `objects/${requirementId}.json`,
          contentHash: requirement.contentHash,
          objectGeneration: "generation-1",
          byteSize: 100,
        },
        lifecycleFingerprint: hash(["lifecycle", requirementId]),
      };
    }),
  ].sort((left, right) => {
    const leftKey =
      left.dependencyType === "stage"
        ? `stage:${left.stageId}`
        : `external:${left.requirementId}`;
    const rightKey =
      right.dependencyType === "stage"
        ? `stage:${right.stageId}`
        : `external:${right.requirementId}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  const body = {
    schemaVersion: V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
    planFingerprint: currentPlan.planFingerprint,
    stageId,
    stageKind: stage.kind,
    entries,
    entryCount: entries.length,
    resolutionOrigin: "not_established" as const,
  };
  return canonicalJsonV1({
    ...body,
    snapshotFingerprint: hashCanonicalBody(body),
  });
}

function candidate(
  currentPlan: V2CanonicalSeasonPlanV2,
  workspace: V2GenerationStageWorkspaceV2,
  body: unknown,
  contentClass: "production_candidate" | "test_only" | "demo_content",
  bodySchemaVersion: string = V2_ACTIVITY_INSTANCES_AUTHORING_ROOT_SCHEMA_V2,
): V2CanonicalStageCandidateV2 {
  const provenanceRefs = [
    {
      provenanceType: "authoring_revision" as const,
      provenanceId: "revision-7",
      objectPath: "provenance/revision-7.json",
      contentHash: sha256Utf8("provenance"),
      objectGeneration: "generation-1",
      byteSize: 80,
    },
  ];
  const base = {
    schemaVersion: V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
    workspaceFingerprint: workspace.workspaceFingerprint,
    planFingerprint: currentPlan.planFingerprint,
    stageId: workspace.stage.stageId,
    stageKind: workspace.stage.kind,
    subjectFingerprint: workspace.subject.subjectFingerprint,
    bodySchemaVersion,
    body,
    bodyFingerprint: hashCanonicalBody(body),
    dependencySnapshotFingerprint: workspace.dependencySnapshotFingerprint,
    capabilityBindingFingerprint:
      workspace.capabilityBinding.kind === "activity_instances"
        ? workspace.capabilityBinding.bindingFingerprint
        : null,
    contentClass,
    provenanceRefs,
    provenanceFingerprint: hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-provenance.v2",
      provenanceRefs,
    }),
    producerFingerprint: hash("producer"),
    configurationFingerprint: hash("configuration"),
    candidateBytesOrigin: "caller_supplied_canonical_bytes" as const,
    candidateOriginAuthenticity: "not_established" as const,
    contentTrackAuthority: "unverified_candidate_claim" as const,
    artifactStorageAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  return parseV2CanonicalStageCandidateV2(
    workspace,
    canonicalJsonV1({
      ...base,
      candidateFingerprint: hashCanonicalBody({
        schemaVersion: "v2-stage-artifact-candidate-fingerprint.v2",
        candidate: base,
      }),
    }),
  );
}

function fixture(
  suffix = "one",
  contentClass:
    | "production_candidate"
    | "test_only"
    | "demo_content" = "production_candidate",
) {
  const currentPlan = plan(suffix);
  const stage = currentPlan.stages.find(
    (entry) => entry.kind === "v2_activity_instances",
  )!;
  const expectedCapabilitySnapshot = capability(currentPlan, suffix);
  const sessions = Array.from({ length: 12 }, (_, index) =>
    sessionBytes(stage.episodeId!, index + 1),
  );
  const root = materializeV2ActivityInstancesAuthoringRootV2({
    plan: currentPlan,
    stageId: stage.stageId,
    capabilitySnapshot: expectedCapabilitySnapshot,
    sessions,
  });
  const snapshot = parseV2StageDependencySnapshotV2(
    currentPlan,
    dependencySnapshotRaw(currentPlan, stage.stageId),
  );
  const workspace = materializeV2GenerationStageWorkspaceV2({
    plan: currentPlan,
    stageId: stage.stageId,
    dependencySnapshot: snapshot,
    capabilityBinding: {
      kind: "activity_instances",
      bindingFingerprint: hash("activity-binding"),
      resolutionOrigin: "not_established",
    },
  });
  return {
    plan: currentPlan,
    workspace,
    candidate: candidate(currentPlan, workspace, root, contentClass),
    sessionBytes: sessions,
    expectedCapabilitySnapshot,
    root,
  };
}

function validationInput(value: ReturnType<typeof fixture>) {
  return {
    plan: value.plan,
    workspace: value.workspace,
    candidate: value.candidate,
    sessionBytes: value.sessionBytes,
    expectedCapabilitySnapshot: value.expectedCapabilitySnapshot,
  };
}

describe("V2 Activity Instances validator foundation", () => {
  it("returns a deterministic branded human-review-only result for exact 12x12 bytes", () => {
    const input = fixture();
    const first = validateV2ActivityInstancesCandidateV1(
      validationInput(input),
    );
    const second = validateV2ActivityInstancesCandidateV1(
      validationInput(input),
    );
    expect(first).toMatchObject({
      packageFingerprint: input.root.packageFingerprint,
      validatedSessionCount: 12,
      validatedTaskCount: 144,
      blockingIssueCodes: [],
      outcome: "eligible_for_human_review_only",
      machineValidationAuthority:
        "deterministic_activity_instances_structural_semantic_checks_only",
      repositoryOriginAuthority: "none",
      artifactStorageAuthority: "none",
      humanReviewAuthority: "none",
      humanApprovalAuthority: "none",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      runtimeKernelAuthority: "none",
      publicationPolicy: "draft_only_no_consumer",
      runtimeConsumer: false,
      releaseAuthority: false,
    });
    expect(first.resultFingerprint).toBe(second.resultFingerprint);
    expect(isV2ActivityInstancesValidationResultV1(first)).toBe(true);
    expect(isV2ActivityInstancesValidationResultV1({ ...first })).toBe(false);
    expect(
      isV2ActivityInstancesValidationResultV1(
        JSON.parse(JSON.stringify(first)),
      ),
    ).toBe(false);
  });

  it.each(["test_only", "demo_content"] as const)(
    "blocks %s without changing machine authority",
    (contentClass) => {
      const input = fixture("one", contentClass);
      const result = validateV2ActivityInstancesCandidateV1(
        validationInput(input),
      );
      expect(result.outcome).toBe("blocked");
      expect(result.blockingIssueCodes).toEqual([
        "v2_activity_instances_nonproduction_content_forbidden",
      ]);
      expect(result.candidateClassification).toBe("nonproduction_candidate");
      expect(result.humanApprovalAuthority).toBe("none");
    },
  );

  it("blocks a wrong body schema and malformed session closure deterministically", () => {
    const input = fixture();
    const wrongSchema = candidate(
      input.plan,
      input.workspace,
      input.root,
      "production_candidate",
      "wrong-body.v1",
    );
    expect(
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        candidate: wrongSchema,
      }).blockingIssueCodes,
    ).toEqual(["v2_activity_instances_body_schema_invalid"]);

    const brokenSessions = input.sessionBytes.slice(0, 11);
    expect(
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        sessionBytes: brokenSessions,
      }).blockingIssueCodes,
    ).toEqual(["v2_activity_instances_package_invalid"]);
  });

  it("blocks capability substitution and authority escalation inside the root", () => {
    const input = fixture();
    const substituted = {
      ...input.expectedCapabilitySnapshot,
      snapshotFingerprint: hash("substituted-capability"),
    } as V2GenerationCapabilitySnapshotV1;
    expect(
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        expectedCapabilitySnapshot: substituted,
      }).blockingIssueCodes,
    ).toEqual(["v2_activity_instances_capability_snapshot_mismatch"]);

    const escalatedBody = {
      ...input.root,
      runtimeConsumer: true,
      packageFingerprint: hash("escalated-package"),
    };
    const escalatedCandidate = candidate(
      input.plan,
      input.workspace,
      escalatedBody,
      "production_candidate",
    );
    expect(
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        candidate: escalatedCandidate,
      }).blockingIssueCodes,
    ).toEqual(["v2_activity_instances_package_invalid"]);
  });

  it("rejects clones and cross-plan/workspace/candidate brand combinations", () => {
    const input = fixture("one");
    const other = fixture("two");
    expect(() =>
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        plan: JSON.parse(JSON.stringify(input.plan)),
      }),
    ).toThrow("v2_activity_instances_validator_input_untrusted");
    expect(() =>
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        workspace: JSON.parse(JSON.stringify(input.workspace)),
      }),
    ).toThrow("v2_activity_instances_validator_input_untrusted");
    expect(() =>
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        candidate: JSON.parse(JSON.stringify(input.candidate)),
      }),
    ).toThrow("v2_activity_instances_validator_input_untrusted");
    expect(() =>
      validateV2ActivityInstancesCandidateV1({
        ...validationInput(input),
        candidate: other.candidate,
      }),
    ).toThrow("v2_activity_instances_validator_binding_invalid");
  });
});
