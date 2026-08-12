import fs from "node:fs";
import path from "node:path";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
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
import {
  V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1,
  V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES,
  V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
  V2_ACTIVITY_SESSION_RENDER_MAX_BYTES,
  V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
  V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES,
  V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
  assembleV2ActivityEpisodeProjectionV1,
  buildV2ActivitySessionProjection,
  parseV2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";

const families = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;

const inputModeByFamily = {
  phrase_builder: "ordered_tokens",
  listen_choose: "single_choice",
  sound_contrast: "single_choice",
  listen_build_dictation: "ordered_tokens",
  context_gap_grammar: "single_choice",
  speed_match: "single_choice",
  scripted_repeat_compare: "scripted_speech",
} as const;

function fixture(sessionOrdinal = 1, targetLanguage = "en") {
  const episodeId = "episode-01";
  return {
    schemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
    episodeId,
    targetLanguage,
    normalizationLocale: targetLanguage,
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
      tasks: Array.from({ length: 12 }, (_, taskIndex) => {
        const slot = taskIndex + 1;
        const family =
          families[
            (sessionOrdinal - 1 + Math.floor(taskIndex / 3)) % families.length
          ];
        const independent = slot === 10 || slot === 12;
        const effectiveFamily =
          independent && family === "scripted_repeat_compare"
            ? families[(sessionOrdinal - 1) % families.length]
            : family;
        const inputKind = v2LocalEvaluatorInputKindForFamilyV1(effectiveFamily);
        const taskId = `task-e01-s${String(sessionOrdinal).padStart(2, "0")}-${String(slot).padStart(2, "0")}`;
        const responseOptions = ["a", "b", "c", "d"].map((suffix) => ({
          responseId: `${taskId}-response-${suffix}`,
          text: `${effectiveFamily} visible option ${suffix.toUpperCase()}`,
        }));
        const correctResponse =
          inputKind === "choice_token"
            ? responseOptions[1].responseId
            : `Expected learner response for ${taskId}`;
        return {
          taskId,
          slot,
          purpose: V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2[taskIndex].purpose,
          family: effectiveFamily,
          activityId: `activity-${taskId}`,
          contentItemId: `content-${taskId}`,
          objectiveId:
            slot === 10
              ? `objective-task-e01-s${String(sessionOrdinal).padStart(2, "0")}-04`
              : slot === 12
                ? `objective-task-e01-s${String(sessionOrdinal).padStart(2, "0")}-06`
                : slot === 11
                  ? `objective-task-e01-s${String(
                      sessionOrdinal === 1 ? 1 : sessionOrdinal - 1,
                    ).padStart(2, "0")}-08`
                  : `objective-${taskId}`,
          learningFunction: `Practice ${effectiveFamily} in slot ${slot}`,
          answerExposure: independent
            ? ("forbidden" as const)
            : ("allowed_after_attempt" as const),
          promptNovelty: independent
            ? ("novel" as const)
            : ("trained" as const),
          localEvaluatorCapsuleId: `capsule-${taskId}`,
          inputMode: inputModeByFamily[effectiveFamily],
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
                  coveredConceptIds: [`concept-s${sessionOrdinal}-${slot}`],
                }
              : null,
          reviewSource:
            slot === 11
              ? {
                  kind:
                    sessionOrdinal === 1
                      ? ("same_session_bootstrap" as const)
                      : ("prior_session" as const),
                  reviewOfTaskId: `task-e01-s${String(
                    sessionOrdinal === 1 ? 1 : sessionOrdinal - 1,
                  ).padStart(2, "0")}-08`,
                  sourceSessionOrdinal:
                    sessionOrdinal === 1 ? 1 : sessionOrdinal - 1,
                }
              : null,
          learner: {
            promptId: `${taskId}-prompt`,
            prompt: `Visible learner prompt for ${taskId}`,
            responseOptions,
            mediaIds: [`media-${taskId}`],
            audioTargetIds: effectiveFamily.includes("listen")
              ? [`audio-${taskId}`]
              : [],
            accessibilityLabel: `Task ${slot} of 12`,
          },
          scriptedAlternate: [
            "listen_choose",
            "sound_contrast",
            "listen_build_dictation",
            "scripted_repeat_compare",
          ].includes(effectiveFamily)
            ? {
                alternateId: `${taskId}-alternate`,
                instruction: `Accessible alternate for ${taskId}`,
                voiceEvidenceEquivalent: false as const,
                canAward: false as const,
              }
            : null,
          evaluator: {
            inputKind,
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

const trusted = (sessionOrdinal = 1, targetLanguage = "en") =>
  parseV2ActivitySessionProjectionSource(
    canonicalJsonV1(fixture(sessionOrdinal, targetLanguage)),
  );

function collectKeys(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, result));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      result.add(key);
      collectKeys(entry, result);
    }
  }
  return result;
}

describe("Learning V2 per-session projection boundary", () => {
  it("projects one exact 12-task shard and preserves the shared task contract", () => {
    const source = trusted();
    const projected = buildV2ActivitySessionProjection(source);

    expect(source.session.tasks).toHaveLength(12);
    expect(projected.renderSeed.schemaVersion).toBe(
      V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
    );
    expect(projected.renderSeed.session.tasks).toHaveLength(12);
    expect(projected.appLocalCapsuleEnvelope.schemaVersion).toBe(
      V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
    );
    expect(projected.appLocalCapsuleEnvelope.capsules).toHaveLength(12);
    expect(projected.serverSidecar.schemaVersion).toBe(
      V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
    );
    expect(projected.serverSidecar.tasks).toHaveLength(12);
    expect(projected.renderSeed.session.tasks[0]).toMatchObject({
      taskId: source.session.tasks[0].taskId,
      answerExposure: source.session.tasks[0].answerExposure,
      promptNovelty: source.session.tasks[0].promptNovelty,
    });
    expect(projected.renderSeed.session.tasks[9]).toMatchObject({
      support: "none",
      hintsAllowed: 0,
      answerExposure: "forbidden",
      promptNovelty: "novel",
    });
    expect(
      projected.renderSeed.session.tasks.filter(
        (task) => task.hintsAllowed === 0,
      ),
    ).toHaveLength(2);
  });

  it("aligns every persisted shard with 512/256/64/128 KiB limits", () => {
    const source = trusted();
    const projected = buildV2ActivitySessionProjection(source);
    expect(utf8ByteLengthV1(canonicalJsonV1(source))).toBeLessThanOrEqual(
      V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES,
    );
    expect(
      utf8ByteLengthV1(canonicalJsonV1(projected.renderSeed)),
    ).toBeLessThanOrEqual(V2_ACTIVITY_SESSION_RENDER_MAX_BYTES);
    expect(
      utf8ByteLengthV1(canonicalJsonV1(projected.appLocalCapsuleEnvelope)),
    ).toBeLessThanOrEqual(V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES);
    expect(
      utf8ByteLengthV1(canonicalJsonV1(projected.serverSidecar)),
    ).toBeLessThanOrEqual(V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES);
  });

  it("keeps plaintext evaluator fields out of render and capsule envelope", () => {
    const projected = buildV2ActivitySessionProjection(trusted());
    const forbidden = [
      "evaluator",
      "correctResponse",
      "acceptedResponses",
      "objectiveId",
      "contentItemId",
      "learningFunction",
      "introQuestionRef",
      "reviewSource",
      "semanticSurfaceFingerprint",
      "activityId",
      "localEvaluatorCapsuleId",
    ];
    for (const value of [
      projected.renderSeed,
      projected.appLocalCapsuleEnvelope,
    ]) {
      const keys = collectKeys(value);
      forbidden.forEach((key) => expect(keys).not.toContain(key));
    }
    expect(projected.appLocalCapsuleEnvelope.commitmentAggregate).toBe(
      projected.serverSidecar.commitmentAggregate,
    );
  });

  it("assembles only an exact ordered 12-session/144-task episode", () => {
    const sources = Array.from({ length: 12 }, (_, index) =>
      trusted(index + 1),
    );
    const assembled = assembleV2ActivityEpisodeProjectionV1(sources);
    expect(assembled.schemaVersion).toBe(
      V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1,
    );
    expect(assembled.sessionCount).toBe(12);
    expect(assembled.taskCount).toBe(144);
    expect(assembled.sessions).toHaveLength(12);
    expect(
      assembled.sessions.every(
        (entry) => entry.renderSeed.session.tasks.length === 12,
      ),
    ).toBe(true);
    expect(() =>
      assembleV2ActivityEpisodeProjectionV1(sources.slice(0, 11)),
    ).toThrow("v2_activity_episode_session_count_invalid");
    expect(() =>
      assembleV2ActivityEpisodeProjectionV1([
        sources[1],
        sources[0],
        ...sources.slice(2),
      ]),
    ).toThrow("v2_activity_episode_source_identity_invalid");
  });

  it("uses the single family response-kind matrix including grammar choices", () => {
    const source = trusted(2);
    const grammar = source.session.tasks.find(
      (task) => task.family === "context_gap_grammar",
    );
    expect(grammar).toMatchObject({
      inputMode: "single_choice",
      evaluator: { inputKind: "choice_token" },
    });
  });

  it("allows deliberate content and objective reuse without reusing execution IDs", () => {
    const reused = fixture();
    reused.session.tasks[1].contentItemId =
      reused.session.tasks[0].contentItemId;
    reused.session.tasks[1].objectiveId = reused.session.tasks[0].objectiveId;
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(reused)),
    ).not.toThrow();
  });

  it("rejects normalized choice-id collisions and normalized answer collisions", () => {
    const choiceCollision = fixture();
    const task = choiceCollision.session.tasks.find(
      (candidate) => candidate.evaluator.inputKind === "choice_token",
    );
    if (!task) throw new Error("missing choice fixture");
    task.learner.responseOptions[1].responseId =
      task.learner.responseOptions[0].responseId.toUpperCase();
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(choiceCollision)),
    ).toThrow("v2_activity_session_normalized_choice_id_collision");

    const answerCollision = fixture();
    const textTask = answerCollision.session.tasks.find(
      (candidate) => candidate.evaluator.inputKind === "text",
    );
    if (!textTask) throw new Error("missing text fixture");
    textTask.evaluator.correctResponse = "Hello";
    textTask.evaluator.acceptedResponses = ["Hello", "HELLO"];
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(answerCollision)),
    ).toThrow("v2_activity_session_normalized_responses_overlap");
  });

  it("enforces shared slot policy, normalization identity, canonical bytes and raw cap", () => {
    const brokenSlot = fixture();
    brokenSlot.session.tasks[9].answerExposure = "allowed_after_attempt";
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(brokenSlot)),
    ).toThrow("v2_activity_session_independent_check_invalid");

    const wrongProfile = fixture();
    wrongProfile.normalizationProfileHash = hashCanonicalBody("wrong");
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(wrongProfile)),
    ).toThrow("v2_activity_session_normalization_profile_invalid");
    expect(() =>
      parseV2ActivitySessionProjectionSource(JSON.stringify(fixture())),
    ).toThrow("v2_activity_session_source_noncanonical");
    expect(() =>
      parseV2ActivitySessionProjectionSource(
        " ".repeat(V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES + 1),
      ),
    ).toThrow("v2_activity_session_source_too_large");
  });

  it("binds the three intro checks to one artifact and distinct questions", () => {
    const wrongArtifact = fixture();
    wrongArtifact.session.tasks[1].introQuestionRef = {
      ...wrongArtifact.session.tasks[1].introQuestionRef!,
      introArtifactFingerprint: hashCanonicalBody("different-intro"),
    };
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(wrongArtifact)),
    ).toThrow("v2_activity_session_intro_question_ref_invalid");

    const duplicateQuestion = fixture();
    duplicateQuestion.session.tasks[1].introQuestionRef = {
      ...duplicateQuestion.session.tasks[1].introQuestionRef!,
      questionId:
        duplicateQuestion.session.tasks[0].introQuestionRef!.questionId,
    };
    expect(() =>
      parseV2ActivitySessionProjectionSource(
        canonicalJsonV1(duplicateQuestion),
      ),
    ).toThrow("v2_activity_session_intro_question_ref_invalid");
  });

  it("requires independent checks to reuse a taught objective without answer leakage", () => {
    const unbound = fixture();
    unbound.session.tasks[9].objectiveId = "objective-never-taught";
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(unbound)),
    ).toThrow("v2_activity_session_independent_objective_invalid");

    const leaked = fixture(4);
    leaked.session.tasks[9].learner.prompt =
      leaked.session.tasks[9].evaluator.correctResponse;
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(leaked)),
    ).toThrow("v2_activity_session_independent_answer_leak");

    const leakedThroughAlternate = fixture(4) as any;
    leakedThroughAlternate.session.tasks[9].scriptedAlternate.instruction =
      leakedThroughAlternate.session.tasks[9].evaluator.correctResponse;
    expect(() =>
      parseV2ActivitySessionProjectionSource(
        canonicalJsonV1(leakedThroughAlternate),
      ),
    ).toThrow("v2_activity_session_independent_answer_leak");

    const leakedThroughOption = fixture(4);
    leakedThroughOption.session.tasks[9].learner.responseOptions[0].text =
      leakedThroughOption.session.tasks[9].evaluator.correctResponse;
    expect(() =>
      parseV2ActivitySessionProjectionSource(
        canonicalJsonV1(leakedThroughOption),
      ),
    ).toThrow("v2_activity_session_independent_answer_leak");

    const scripted = fixture() as any;
    scripted.session.tasks[9].family = "scripted_repeat_compare";
    scripted.session.tasks[9].inputMode = "scripted_speech";
    scripted.session.tasks[9].scriptedAlternate = {
      alternateId: "independent-scripted-alternate",
      instruction: "Use the non-authoritative scripted fallback",
      voiceEvidenceEquivalent: false,
      canAward: false,
    };
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(scripted)),
    ).toThrow("v2_activity_session_independent_scripted_repeat_invalid");
  });

  it("allows a scripted alternate only for the exact audio-failure family policy", () => {
    const extra = fixture() as any;
    extra.session.tasks[0].scriptedAlternate = {
      alternateId: "unneeded-alternate",
      instruction: "This family does not require an audio fallback",
      voiceEvidenceEquivalent: false,
      canAward: false,
    };
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(extra)),
    ).toThrow("v2_activity_session_scripted_alternate_policy_invalid");

    const missing = fixture() as any;
    const required = missing.session.tasks.find((task: any) =>
      [
        "listen_choose",
        "sound_contrast",
        "listen_build_dictation",
        "scripted_repeat_compare",
      ].includes(task.family),
    );
    if (!required) throw new Error("missing alternate-policy fixture");
    required.scriptedAlternate = null;
    expect(() =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(missing)),
    ).toThrow("v2_activity_session_scripted_alternate_policy_invalid");
  });

  it("closes exact review links and duplicate semantic surfaces at episode assembly", () => {
    const linkedFixtures = Array.from({ length: 12 }, (_, index) =>
      fixture(index + 1),
    );
    const reviewSource = linkedFixtures[0].session.tasks[7];
    const explicitReview = linkedFixtures[1].session.tasks[10];
    explicitReview.learner.prompt = reviewSource.learner.prompt;
    explicitReview.learner.accessibilityLabel =
      reviewSource.learner.accessibilityLabel;
    explicitReview.learner.responseOptions.forEach((option, index) => {
      option.text = reviewSource.learner.responseOptions[index].text;
    });
    const linked = linkedFixtures.map((value) =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(value)),
    );
    expect(() => assembleV2ActivityEpisodeProjectionV1(linked)).not.toThrow();

    const duplicateFixtures = Array.from({ length: 12 }, (_, index) =>
      fixture(index + 1),
    );
    const original = duplicateFixtures[0].session.tasks[3];
    const clone = duplicateFixtures[1].session.tasks[0];
    clone.learner.prompt = original.learner.prompt;
    clone.learner.accessibilityLabel = original.learner.accessibilityLabel;
    clone.learner.responseOptions.forEach((option, index) => {
      option.text = original.learner.responseOptions[index].text;
    });
    const duplicates = duplicateFixtures.map((value) =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(value)),
    );
    expect(() => assembleV2ActivityEpisodeProjectionV1(duplicates)).toThrow(
      "v2_activity_episode_duplicate_semantic_surface",
    );

    const wrongObjectiveFixtures = Array.from({ length: 12 }, (_, index) =>
      fixture(index + 1),
    );
    wrongObjectiveFixtures[1].session.tasks[10].objectiveId =
      "objective-wrong-review-target";
    const wrongObjective = wrongObjectiveFixtures.map((value) =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(value)),
    );
    expect(() => assembleV2ActivityEpisodeProjectionV1(wrongObjective)).toThrow(
      "v2_activity_episode_review_source_invalid",
    );

    const duplicateAlternateFixtures = Array.from({ length: 12 }, (_, index) =>
      fixture(index + 1),
    );
    const firstAlternate = duplicateAlternateFixtures[0].session.tasks.find(
      (task) => task.scriptedAlternate !== null,
    )!.scriptedAlternate!;
    const secondAlternate = duplicateAlternateFixtures[1].session.tasks.find(
      (task) => task.scriptedAlternate !== null,
    )!.scriptedAlternate!;
    secondAlternate.alternateId = firstAlternate.alternateId;
    const duplicateAlternates = duplicateAlternateFixtures.map((value) =>
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(value)),
    );
    expect(() =>
      assembleV2ActivityEpisodeProjectionV1(duplicateAlternates),
    ).toThrow("v2_activity_episode_execution_identity_invalid");
  });

  it("requires parser capabilities and remains pure/non-live", () => {
    expect(() => buildV2ActivitySessionProjection(fixture() as never)).toThrow(
      "v2_activity_session_source_untrusted",
    );
    const source = fs.readFileSync(
      path.join(__dirname, "v2_activity_session_projection.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /firebase|firestore|fetch\(|https?:\/\/|from\s+["'][^"']*provider/i,
    );
  });
});
