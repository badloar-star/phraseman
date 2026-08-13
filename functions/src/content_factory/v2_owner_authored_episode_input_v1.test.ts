import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2,
  v2ActivitySessionIdV2,
} from "../../../modules/learning-v2/contracts/activity_session_package_v2";
import {
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  v2LocalEvaluatorInputKindForFamilyV1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import { V2_CANONICAL_INTERFACE_LOCALES } from "./v2_canonical_generation_plan";
import {
  buildV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
} from "./v2_canonical_generation_plan_v2";
import { V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2 } from "./v2_activity_session_projection";
import {
  V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1,
  getV2OwnerAuthoredEpisodeInputSummaryV1,
  isV2OwnerAuthoredEpisodeInputHandleV1,
  materializeV2OwnerAuthoredEpisodeDraftV1,
  parseV2OwnerAuthoredEpisodeInputV1,
  resolveV2OwnerAuthoredEpisodeInputMaterialV1,
} from "./v2_owner_authored_episode_input_v1";
import { coldResolveV2OwnerEpisodeStageV1 } from "./v2_owner_episode_confirmation_adapter_v1";
import type { V2RepositoryImmutableStoragePortV1 } from "./v2_firebase_repository_persistence_v1";
import { createHash } from "node:crypto";

const hash = (character: string) => character.repeat(64);
const families = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;
const inputMode = {
  phrase_builder: "ordered_tokens",
  listen_choose: "single_choice",
  sound_contrast: "single_choice",
  listen_build_dictation: "ordered_tokens",
  context_gap_grammar: "single_choice",
  speed_match: "single_choice",
  scripted_repeat_compare: "scripted_speech",
} as const;

function planRequest(authoringRevision = 7) {
  return {
    schemaVersion: "v2-canonical-plan-request.v2" as const,
    workspaceId: "workspace-1",
    jobId: "job-1",
    authoringRevision,
    seasonId: "season-1",
    scope: "vertical_slice" as const,
    episodeIds: ["episode-1"],
    recipes: [
      { episodeId: "episode-1", dialogue: true, speakingMission: true },
    ],
    languageProfileRef: {
      profileId: "english-general",
      targetLanguage: "en",
      version: 1,
      contentHash: hash("a"),
    },
    speechProfileRef: {
      profileId: "english-speech",
      targetLanguage: "en",
      speechLocale: "en-US",
      version: 1,
      contentHash: hash("b"),
    },
    voiceGenerationProfileRef: {
      profileId: "openai-tts-learning-v2",
      version: 1,
      contentHash: hash("c"),
    },
    decisionRegistryRef: {
      decisionId: "HYP-V2-007" as const,
      version: 1,
      contentHash: hash("7"),
    },
    templateBindings: [
      {
        episodeId: "episode-1",
        templateRefs: [
          { templateId: "phrase-builder", version: 2, contentHash: hash("d") },
        ],
      },
    ],
  };
}

function plan(authoringRevision = 7) {
  const request = planRequest(authoringRevision);
  return buildV2CanonicalSeasonPlanV2(
    parseV2CanonicalPlanRequestV2(canonicalJsonV1(request)),
  );
}

function source(sessionOrdinal: number, episodeId = "episode-1") {
  return {
    schemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
    episodeId,
    targetLanguage: "en",
    normalizationLocale: "en",
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    session: {
      sessionId: v2ActivitySessionIdV2(episodeId, sessionOrdinal),
      ordinal: sessionOrdinal,
      zone:
        sessionOrdinal <= 4
          ? ("understand" as const)
          : sessionOrdinal <= 8
            ? ("use" as const)
            : ("master" as const),
      targetSeconds: 240,
      tasks: Array.from({ length: 12 }, (_, index) => {
        const slot = index + 1;
        const selected =
          families[
            (sessionOrdinal - 1 + Math.floor(index / 3)) % families.length
          ];
        const family =
          slot === 10 || slot === 12
            ? selected === "scripted_repeat_compare"
              ? families[(sessionOrdinal - 1) % families.length]
              : selected
            : selected;
        const kind = v2LocalEvaluatorInputKindForFamilyV1(family);
        const taskId = `task-e01-s${String(sessionOrdinal).padStart(2, "0")}-${String(slot).padStart(2, "0")}`;
        const responseOptions = ["a", "b", "c", "d"].map((suffix) => ({
          responseId: `${taskId}-response-${suffix}`,
          text: `${family} visible option ${suffix.toUpperCase()}`,
        }));
        const independent = slot === 10 || slot === 12;
        const correctResponse =
          kind === "choice_token"
            ? responseOptions[1].responseId
            : `Expected response ${taskId}`;
        const reviewedSession = sessionOrdinal === 1 ? 1 : sessionOrdinal - 1;
        return {
          taskId,
          slot,
          purpose: V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2[index].purpose,
          family,
          activityId: `activity-${taskId}`,
          contentItemId: `content-${taskId}`,
          objectiveId:
            slot === 10
              ? `objective-task-e01-s${String(sessionOrdinal).padStart(2, "0")}-04`
              : slot === 12
                ? `objective-task-e01-s${String(sessionOrdinal).padStart(2, "0")}-06`
                : slot === 11
                  ? `objective-task-e01-s${String(reviewedSession).padStart(2, "0")}-08`
                  : `objective-${taskId}`,
          learningFunction: `Practice ${family} in slot ${slot}`,
          answerExposure: independent
            ? ("forbidden" as const)
            : ("allowed_after_attempt" as const),
          promptNovelty: independent
            ? ("novel" as const)
            : ("trained" as const),
          localEvaluatorCapsuleId: `capsule-${taskId}`,
          inputMode: inputMode[family],
          support: independent ? ("none" as const) : ("partial_cue" as const),
          hintsAllowed: independent ? (0 as const) : (2 as const),
          introQuestionRef:
            slot <= 3
              ? {
                  introArtifactFingerprint: hashCanonicalBody([
                    "intro",
                    sessionOrdinal,
                  ]),
                  questionId: `${taskId}-intro-question`,
                  coveredConceptIds: [`concept-${sessionOrdinal}-${slot}`],
                }
              : null,
          reviewSource:
            slot === 11
              ? {
                  kind:
                    sessionOrdinal === 1
                      ? ("same_session_bootstrap" as const)
                      : ("prior_session" as const),
                  reviewOfTaskId: `task-e01-s${String(reviewedSession).padStart(2, "0")}-08`,
                  sourceSessionOrdinal: reviewedSession,
                }
              : null,
          learner: {
            promptId: `${taskId}-prompt`,
            prompt: `Visible prompt ${taskId}`,
            responseOptions,
            mediaIds: [`media-${taskId}`],
            audioTargetIds: family.includes("listen")
              ? [`audio-${taskId}`]
              : [],
            accessibilityLabel: `Task ${slot} of 12`,
          },
          scriptedAlternate: [
            "listen_choose",
            "sound_contrast",
            "listen_build_dictation",
            "scripted_repeat_compare",
          ].includes(family)
            ? {
                alternateId: `${taskId}-alternate`,
                instruction: `Alternate ${taskId}`,
                voiceEvidenceEquivalent: false as const,
                canAward: false as const,
              }
            : null,
          evaluator: {
            inputKind: kind,
            normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
            correctResponse,
            acceptedResponses: [correctResponse],
            salt: hashCanonicalBody(["salt", sessionOrdinal, slot]),
          },
        };
      }),
    },
  };
}

function ownerRaw(
  currentPlan = plan(),
  contentClass:
    | "production_candidate"
    | "neutral_test_fixture" = "production_candidate",
) {
  const stage = currentPlan.stages.find(
    (entry) =>
      entry.kind === "v2_activity_instances" && entry.episodeId === "episode-1",
  );
  if (!stage) throw new Error("missing_activity_stage");
  const body = {
    schemaVersion: V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V1,
    contentClass,
    ownerInputId:
      contentClass === "production_candidate"
        ? "owner-episode-1-r7"
        : "neutral-fixture.episode-1-r7",
    claimedAuthorId:
      contentClass === "production_candidate" ? "root-owner" : "fixture.system",
    authoringRevision: currentPlan.authoringRevision,
    planFingerprint: currentPlan.planFingerprint,
    courseContractFingerprint:
      currentPlan.courseContract.courseContractFingerprint,
    stageId: stage.stageId,
    episodeId: "episode-1",
    targetLanguage: "en",
    requiredInterfaceLocales: V2_CANONICAL_INTERFACE_LOCALES,
    sessionSourceRaws: Array.from({ length: 12 }, (_, index) =>
      canonicalJsonV1(source(index + 1)),
    ),
    ownerInputOrigin:
      contentClass === "production_candidate"
        ? ("owner_authored_import" as const)
        : ("neutral_test_fixture" as const),
    ownerInputBytesOrigin: "caller_supplied_canonical_bytes" as const,
    authorIdentityAuthority: "unverified_input_claim" as const,
    repositoryAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    generatorMutationPolicy: "owner_content_immutable" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  return {
    stageId: stage.stageId,
    raw: canonicalJsonV1({
      ...body,
      inputFingerprint: hashCanonicalBody(body),
    }),
  };
}

describe("Learning V2 owner-authored episode import boundary", () => {
  it("derives every cryptographic owner-envelope field from 12 human-authored sessions", () => {
    const currentPlan = plan();
    const stage = currentPlan.stages.find(
      (entry) =>
        entry.kind === "v2_activity_instances" &&
        entry.episodeId === "episode-1",
    );
    expect(stage).toBeDefined();
    const draft = materializeV2OwnerAuthoredEpisodeDraftV1(
      {
        contentClass: "production_candidate",
        ownerInputId: "owner-episode-1-r7",
        claimedAuthorId: "root-owner",
        stageId: stage!.stageId,
        sessionSources: Array.from({ length: 12 }, (_, index) =>
          source(index + 1),
        ),
      },
      currentPlan,
    );
    expect(draft.summary).toMatchObject({
      planFingerprint: currentPlan.planFingerprint,
      courseContractFingerprint:
        currentPlan.courseContract.courseContractFingerprint,
      stageId: stage!.stageId,
      sessionCount: 12,
      taskCount: 144,
      humanApprovalAuthority: "none",
      releaseAuthority: false,
    });
    const parsed = JSON.parse(draft.raw);
    expect(parsed.sessionSourceRaws).toHaveLength(12);
    expect(parsed.inputFingerprint).toBe(draft.summary.inputFingerprint);
    expect(() =>
      materializeV2OwnerAuthoredEpisodeDraftV1(
        {
          contentClass: "production_candidate",
          ownerInputId: "owner-episode-1-r7",
          claimedAuthorId: "root-owner",
          stageId: stage!.stageId,
          sessionSources: Array.from({ length: 11 }, (_, index) =>
            source(index + 1),
          ),
        },
        currentPlan,
      ),
    ).toThrow("v2_owner_episode_draft_input_invalid");
  });

  it("binds one exact owner episode to plan-v2 and the canonical 12x12 Activity source", () => {
    const currentPlan = plan();
    const input = ownerRaw(currentPlan);
    const handle = parseV2OwnerAuthoredEpisodeInputV1(
      input.raw,
      currentPlan,
      input.stageId,
    );
    const summary = getV2OwnerAuthoredEpisodeInputSummaryV1(handle);
    expect(isV2OwnerAuthoredEpisodeInputHandleV1(handle)).toBe(true);
    expect(summary).toMatchObject({
      contentClass: "production_candidate",
      sessionCount: 12,
      taskCount: 144,
      ownerInputOriginAuthority: "unverified_canonical_input_claim",
      humanApprovalAuthority: "none",
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(summary.sourceFingerprints).toHaveLength(12);
    expect(
      resolveV2OwnerAuthoredEpisodeInputMaterialV1(handle).sources,
    ).toHaveLength(12);
    expect(Object.isFrozen(summary)).toBe(true);
  });

  it("keeps neutral fixtures non-production and rejects clone, drift and malformed episode topology", () => {
    const currentPlan = plan();
    const neutral = ownerRaw(currentPlan, "neutral_test_fixture");
    const handle = parseV2OwnerAuthoredEpisodeInputV1(
      neutral.raw,
      currentPlan,
      neutral.stageId,
    );
    expect(getV2OwnerAuthoredEpisodeInputSummaryV1(handle).contentClass).toBe(
      "neutral_test_fixture",
    );
    expect(isV2OwnerAuthoredEpisodeInputHandleV1({ ...handle })).toBe(false);
    expect(() =>
      getV2OwnerAuthoredEpisodeInputSummaryV1({ ...handle }),
    ).toThrow("v2_owner_episode_input_handle_invalid");

    const parsed = JSON.parse(neutral.raw);
    parsed.contentClass = "production_candidate";
    parsed.ownerInputOrigin = "owner_authored_import";
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV1(
        canonicalJsonV1(parsed),
        currentPlan,
        neutral.stageId,
      ),
    ).toThrow("v2_owner_episode_input_fingerprint_invalid");

    const eleven = JSON.parse(neutral.raw);
    eleven.sessionSourceRaws.pop();
    const { inputFingerprint: _old, ...body } = eleven;
    eleven.inputFingerprint = hashCanonicalBody(body);
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV1(
        canonicalJsonV1(eleven),
        currentPlan,
        neutral.stageId,
      ),
    ).toThrow("v2_owner_episode_input_value_invalid");

    const stage = currentPlan.stages.find(
      (entry) =>
        entry.kind === "v2_activity_instances" &&
        entry.episodeId === "episode-1",
    );
    expect(stage).toBeDefined();
    expect(() =>
      materializeV2OwnerAuthoredEpisodeDraftV1(
        {
          contentClass: "production_candidate",
          ownerInputId: "forged-neutral-fixture-as-production",
          claimedAuthorId: "root-owner",
          stageId: stage!.stageId,
          sessionSources: Array.from({ length: 12 }, (_, index) =>
            source(index + 1, "neutral-test-episode-never-release"),
          ),
        },
        currentPlan,
      ),
    ).toThrow("v2_owner_episode_input_activity_binding_invalid");
  });

  it("rejects cross-plan replay and any authority escalation", () => {
    const currentPlan = plan();
    const input = ownerRaw(currentPlan);
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV1(input.raw, plan(8), input.stageId),
    ).toThrow("v2_owner_episode_input_plan_binding_invalid");
    const escalated = JSON.parse(input.raw);
    escalated.humanApprovalAuthority = "owner_approved";
    const { inputFingerprint: _old, ...body } = escalated;
    escalated.inputFingerprint = hashCanonicalBody(body);
    expect(() =>
      parseV2OwnerAuthoredEpisodeInputV1(
        canonicalJsonV1(escalated),
        currentPlan,
        input.stageId,
      ),
    ).toThrow("v2_owner_episode_input_value_invalid");
  });

  it("cold-reloads the pinned canonical plan and exact 12x12 owner episode", async () => {
    const planRaw = canonicalJsonV1(planRequest());
    const currentPlan = buildV2CanonicalSeasonPlanV2(
      parseV2CanonicalPlanRequestV2(planRaw),
    );
    const input = ownerRaw(currentPlan);
    const encoder = new TextEncoder();
    const objects = new Map([
      ["plans/plan.json", { raw: planRaw, generation: "7" }],
      ["episodes/owner.json", { raw: input.raw, generation: "8" }],
    ]);
    const storage: V2RepositoryImmutableStoragePortV1 = {
      async readMetadataExact(path) {
        const item = objects.get(path);
        if (!item) return null;
        return Object.freeze({
          generation: item.generation,
          byteSize: encoder.encode(item.raw).byteLength,
          contentType: "application/json; charset=utf-8" as const,
          contentHash: createHash("sha256").update(item.raw).digest("hex"),
        });
      },
      async createExact() {
        throw new Error("unexpected_write");
      },
      async downloadGenerationExact(request) {
        const item = objects.get(request.objectPath);
        if (!item) return Object.freeze({ kind: "not_found" as const });
        if (item.generation !== request.ifGenerationMatch)
          return Object.freeze({ kind: "generation_mismatch" as const });
        return Object.freeze({
          kind: "downloaded" as const,
          bytes: encoder.encode(item.raw),
        });
      },
      async quarantineConflict() {},
    };
    const stage = Object.freeze({
      planRequestObjectPath: "plans/plan.json",
      planRequestObjectGeneration: "7",
      planRequestRawHash: createHash("sha256").update(planRaw).digest("hex"),
      planRequestByteSize: encoder.encode(planRaw).byteLength,
      objectPath: "episodes/owner.json",
      objectGeneration: "8",
      contentHash: createHash("sha256").update(input.raw).digest("hex"),
      byteSize: encoder.encode(input.raw).byteLength,
    });
    const summary = await coldResolveV2OwnerEpisodeStageV1({
      stage,
      stageId: input.stageId,
      storage,
    });
    expect(summary).toMatchObject({
      stageId: input.stageId,
      contentClass: "production_candidate",
      sessionCount: 12,
      taskCount: 144,
      planFingerprint: currentPlan.planFingerprint,
    });

    objects.set("episodes/owner.json", {
      raw: `${input.raw} `,
      generation: "8",
    });
    await expect(
      coldResolveV2OwnerEpisodeStageV1({
        stage,
        stageId: input.stageId,
        storage,
      }),
    ).rejects.toThrow("v2_owner_episode_confirmation_readback_invalid");
  });
});
