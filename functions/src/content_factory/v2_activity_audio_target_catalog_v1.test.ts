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
import {
  V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
  parseV2ActivitySessionProjectionSource,
  type V2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";
import {
  V2_SPEECH_PROFILE_BODY_SCHEMA_V1,
  V2_SPEECH_SCRIPT_POLICY_V1,
  V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1,
  V2_WORD_SEGMENTATION_POLICY_V1,
  parseV2SpeechProfileBodyV1,
} from "./v2_voice_profile_contracts_v1";
import {
  V2_ACTIVITY_AUDIO_TARGET_CATALOG_MAX_BYTES_V1,
  V2_ACTIVITY_AUDIO_TARGET_MAX_PER_EPISODE_V1,
  V2_ACTIVITY_AUDIO_TARGET_SESSION_SHARD_MAX_BYTES_V1,
  isV2ActivityAudioTargetCatalogV1,
  materializeV2ActivityAudioTargetCatalogV1,
  v2ActivityAudioTargetIdV1,
  type V2ActivityAudioTargetDeclarationV1,
  type V2ActivityAudioTargetSourceRefV1,
} from "./v2_activity_audio_target_catalog_v1";

const FAMILIES = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;

function speechProfile() {
  return parseV2SpeechProfileBodyV1(
    canonicalJsonV1({
      schemaVersion: V2_SPEECH_PROFILE_BODY_SCHEMA_V1,
      profileId: "speech-en-us",
      version: 1,
      targetLanguage: "en",
      speechLocale: "en-US",
      sourceNormalizationRef: V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1.ref,
      wordSegmentationRef: V2_WORD_SEGMENTATION_POLICY_V1.ref,
      scriptPolicyRef: V2_SPEECH_SCRIPT_POLICY_V1.ref,
      profileAuthority: "none",
      repositoryAuthority: "none",
      lifecycleAuthority: "none",
      executionAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    }),
  );
}

function sources(): readonly V2ActivitySessionProjectionSource[] {
  const episodeId = "episode-01";
  return Array.from({ length: 12 }, (_, sessionIndex) => {
    const sessionOrdinal = sessionIndex + 1;
    const sessionId = v2ActivitySessionIdV2(episodeId, sessionOrdinal);
    const independentFallbackFamily = Array.from(
      { length: 4 },
      (_, offset) => FAMILIES[(sessionIndex + offset) % FAMILIES.length],
    ).find((family) => family !== "scripted_repeat_compare")!;
    return parseV2ActivitySessionProjectionSource(
      canonicalJsonV1({
        schemaVersion: V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2,
        episodeId,
        targetLanguage: "en",
        normalizationLocale: "en",
        normalizationProfileHash:
          V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
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
          tasks: Array.from({ length: 12 }, (_, taskIndex) => {
            const slot = taskIndex + 1;
            const selectedFamily =
              FAMILIES[
                (sessionIndex + Math.floor(taskIndex / 3)) % FAMILIES.length
              ];
            const family =
              (slot === 10 || slot === 12) &&
              selectedFamily === "scripted_repeat_compare"
                ? independentFallbackFamily
                : selectedFamily;
            const taskId = `task-e01-s${sessionOrdinal}-t${slot}`;
            const responseOptions = ["alpha", "beta", "gamma"].map((text) => ({
              responseId: `${taskId}-${text}`,
              text,
            }));
            const inputKind = v2LocalEvaluatorInputKindForFamilyV1(family);
            const correctResponse =
              inputKind === "choice_token"
                ? responseOptions[0].responseId
                : `expected response ${sessionOrdinal} ${slot}`;
            return {
              taskId,
              slot,
              purpose:
                V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2[taskIndex].purpose,
              family,
              activityId: `activity-${taskId}`,
              contentItemId: `content-${taskId}`,
              objectiveId:
                slot === 10
                  ? `objective-task-e01-s${sessionOrdinal}-t4`
                  : slot === 12
                    ? `objective-task-e01-s${sessionOrdinal}-t6`
                    : slot === 11
                      ? `objective-task-e01-s${sessionOrdinal === 1 ? 1 : sessionOrdinal - 1}-t8`
                      : `objective-${taskId}`,
              learningFunction: `Practice ${family} ${sessionOrdinal}/${slot}`,
              answerExposure:
                slot === 10 || slot === 12
                  ? "forbidden"
                  : "allowed_after_attempt",
              promptNovelty: slot === 10 || slot === 12 ? "novel" : "trained",
              localEvaluatorCapsuleId: `capsule-${taskId}`,
              inputMode:
                family === "scripted_repeat_compare"
                  ? "scripted_speech"
                  : inputKind === "choice_token"
                    ? "single_choice"
                    : "ordered_tokens",
              support: slot === 10 || slot === 12 ? "none" : "partial_cue",
              hintsAllowed: slot === 10 || slot === 12 ? 0 : 2,
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
                          ? "same_session_bootstrap"
                          : "prior_session",
                      reviewOfTaskId: `task-e01-s${sessionOrdinal === 1 ? 1 : sessionOrdinal - 1}-t8`,
                      sourceSessionOrdinal:
                        sessionOrdinal === 1 ? 1 : sessionOrdinal - 1,
                    }
                  : null,
              learner: {
                promptId: `${taskId}-prompt`,
                prompt: `Prompt ${sessionOrdinal}/${slot}`,
                responseOptions,
                mediaIds: [],
                audioTargetIds:
                  family === "phrase_builder"
                    ? []
                    : [
                          "listen_choose",
                          "sound_contrast",
                          "listen_build_dictation",
                          "scripted_repeat_compare",
                        ].includes(family)
                      ? [`learner-audio-${taskId}`]
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
                    instruction: `Accessible alternate ${taskId}`,
                    voiceEvidenceEquivalent: false,
                    canAward: false,
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
      }),
    );
  });
}

function declarations(
  trustedSources: readonly V2ActivitySessionProjectionSource[],
): V2ActivityAudioTargetDeclarationV1[] {
  const result: V2ActivityAudioTargetDeclarationV1[] = [];
  for (const source of trustedSources) {
    for (const task of source.session.tasks) {
      const refsAndText: readonly Readonly<{
        sourceRef: V2ActivityAudioTargetSourceRefV1;
        text: string;
      }>[] =
        task.family === "phrase_builder"
          ? task.learner.responseOptions.map((option) => ({
              sourceRef: {
                kind: "phrase_builder_response_option" as const,
                responseId: option.responseId,
              },
              text: option.text,
            }))
          : task.learner.audioTargetIds.map((learnerAudioTargetId) => ({
              sourceRef: {
                kind: "learner_audio_target" as const,
                learnerAudioTargetId,
              },
              text: `audio ${task.slot}`,
            }));
      refsAndText.forEach(({ sourceRef, text }) => {
        result.push({
          audioTargetId: v2ActivityAudioTargetIdV1({
            episodeId: source.episodeId,
            sessionId: source.session.sessionId,
            taskId: task.taskId,
            sourceRef,
          }),
          sessionOrdinal: source.session.ordinal,
          sessionId: source.session.sessionId,
          taskId: task.taskId,
          family: task.family,
          sourceRef,
          spokenText: text,
          pronunciationHint: null,
          speakerId: null,
          words: text
            .split(" ")
            .map((word, index) => ({ wordOrdinal: index + 1, text: word })),
        });
      });
    }
  }
  return result;
}

describe("Learning V2 source-owned activity audio target catalog", () => {
  it("binds every Phrase Builder chip as its own one-word target", () => {
    const trustedSources = sources();
    const catalog = materializeV2ActivityAudioTargetCatalogV1({
      sources: trustedSources,
      speechProfile: speechProfile(),
      declarations: declarations(trustedSources),
    });
    const phraseBuilderTasks = trustedSources.flatMap((source) =>
      source.session.tasks.filter((task) => task.family === "phrase_builder"),
    );
    const phraseBuilderTargets = catalog.sessions.flatMap((session) =>
      session.targets.filter((target) => target.family === "phrase_builder"),
    );
    expect(isV2ActivityAudioTargetCatalogV1(catalog)).toBe(true);
    expect(isV2ActivityAudioTargetCatalogV1({ ...catalog })).toBe(false);
    expect(phraseBuilderTargets).toHaveLength(
      phraseBuilderTasks.reduce(
        (sum, task) => sum + task.learner.responseOptions.length,
        0,
      ),
    );
    expect(phraseBuilderTargets.every((target) => target.wordCount === 1)).toBe(
      true,
    );
    expect(
      phraseBuilderTargets.every(
        (target) =>
          target.taskVoicePolicy === "one_voice_for_all_task_targets_and_words",
      ),
    ).toBe(true);
    expect(
      catalog.sessions
        .flatMap((session) => session.taskVoiceGroups)
        .every(
          (group) =>
            group.selectionScope === "once_per_task_attempt" &&
            group.orderedAudioTargetIds.length > 0,
        ),
    ).toBe(true);
    expect(catalog.activityBindingAuthority).toBe(
      "exact_branded_activity_coordinates_and_render_fingerprints_only",
    );
    expect(catalog.declarationOriginAuthority).toBe("none");
    expect(catalog.audioByteAuthority).toBe("none");
    expect(catalog.runtimeConsumer).toBe(false);
    expect(catalog.releaseEligible).toBe(false);
    expect(
      canonicalJsonV1(catalog).length <
        V2_ACTIVITY_AUDIO_TARGET_CATALOG_MAX_BYTES_V1,
    ).toBe(true);
    expect(
      catalog.sessions.every(
        (session) =>
          canonicalJsonV1(session).length <
          V2_ACTIVITY_AUDIO_TARGET_SESSION_SHARD_MAX_BYTES_V1,
      ),
    ).toBe(true);
  });

  it("keeps declaration coordinates collision-free even when legal ids contain colons", () => {
    const trustedSources = sources();
    const valid = declarations(trustedSources);
    const first = valid[0];
    const collisionPair = [
      {
        ...first,
        audioTargetId: "c".repeat(64),
        taskId: "a",
        sourceRef: {
          kind: "phrase_builder_response_option" as const,
          responseId: "b:phrase_builder_response_option:c",
        },
      },
      {
        ...first,
        audioTargetId: "d".repeat(64),
        taskId: "a:phrase_builder_response_option:b",
        sourceRef: {
          kind: "phrase_builder_response_option" as const,
          responseId: "c",
        },
      },
    ];
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: [...valid, ...collisionPair],
      }),
    ).toThrow("v2_activity_audio_target_extra");
  });

  it("enforces the code-owned audio-family policy", () => {
    const trustedSources = sources();
    const requiredRaw = JSON.parse(canonicalJsonV1(trustedSources[0])) as {
      session: {
        tasks: { family: string; learner: { audioTargetIds: string[] } }[];
      };
    };
    requiredRaw.session.tasks.find(
      (task) => task.family === "listen_choose",
    )!.learner.audioTargetIds = [];
    const missingRequired = [
      parseV2ActivitySessionProjectionSource(canonicalJsonV1(requiredRaw)),
      ...trustedSources.slice(1),
    ];
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: missingRequired,
        speechProfile: speechProfile(),
        declarations: declarations(missingRequired),
      }),
    ).toThrow("v2_activity_audio_target_required_family_missing");

    const forbiddenSource = trustedSources.find((source) =>
      source.session.tasks.some((task) => task.family === "speed_match"),
    )!;
    const forbiddenRaw = JSON.parse(canonicalJsonV1(forbiddenSource)) as {
      session: {
        tasks: { family: string; learner: { audioTargetIds: string[] } }[];
      };
    };
    forbiddenRaw.session.tasks.find(
      (task) => task.family === "speed_match",
    )!.learner.audioTargetIds = ["forbidden-audio"];
    const forbidden = trustedSources.map((source) =>
      source === forbiddenSource
        ? parseV2ActivitySessionProjectionSource(canonicalJsonV1(forbiddenRaw))
        : source,
    );
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: forbidden,
        speechProfile: speechProfile(),
        declarations: declarations(forbidden),
      }),
    ).toThrow("v2_activity_audio_target_forbidden_family_present");
  });

  it("rejects missing, extra, duplicate and coordinate-forged declarations", () => {
    const trustedSources = sources();
    const valid = declarations(trustedSources);
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: valid.slice(1),
      }),
    ).toThrow("v2_activity_audio_target_missing");
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: [...valid, valid[0]],
      }),
    ).toThrow("v2_activity_audio_target_id_duplicate");
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: [
          ...valid.slice(0, -1),
          {
            ...valid.at(-1)!,
            audioTargetId: "a".repeat(64),
          },
        ],
      }),
    ).toThrow("v2_activity_audio_target_id_invalid");
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: [
          ...valid,
          {
            ...valid[0],
            audioTargetId: "b".repeat(64),
            sourceRef: {
              kind: "learner_audio_target",
              learnerAudioTargetId: "not-in-source",
            },
          },
        ],
      }),
    ).toThrow("v2_activity_audio_target_extra");
  });

  it("rejects Phrase Builder text drift, multi-word chips and word reorder", () => {
    const trustedSources = sources();
    const valid = declarations(trustedSources);
    const phraseIndex = valid.findIndex(
      (value) => value.family === "phrase_builder",
    );
    const drift = valid.map((entry, index) =>
      index === phraseIndex
        ? {
            ...entry,
            spokenText: "wrong",
            words: [{ wordOrdinal: 1, text: "wrong" }],
          }
        : entry,
    );
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: drift,
      }),
    ).toThrow("v2_activity_audio_target_phrase_builder_text_invalid");
    const multiword = valid.map((entry, index) =>
      index === phraseIndex
        ? {
            ...entry,
            spokenText: `${entry.spokenText} extra`,
            words: [
              { wordOrdinal: 1, text: entry.spokenText },
              { wordOrdinal: 2, text: "extra" },
            ],
          }
        : entry,
    );
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: multiword,
      }),
    ).toThrow();
    const audioIndex = valid.findIndex(
      (value) => value.family !== "phrase_builder" && value.words.length === 2,
    );
    const reordered = valid.map((entry, index) =>
      index === audioIndex
        ? {
            ...entry,
            words: [
              { ...entry.words[1], wordOrdinal: 1 },
              { ...entry.words[0], wordOrdinal: 2 },
            ],
          }
        : entry,
    );
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: speechProfile(),
        declarations: reordered,
      }),
    ).toThrow("v2_activity_audio_target_word_join_invalid");
  });

  it("rejects a genuinely multi-word visible Phrase Builder chip", () => {
    const trustedSources = sources();
    const raw = JSON.parse(canonicalJsonV1(trustedSources[0])) as {
      session: {
        tasks: {
          family: string;
          learner: { responseOptions: { text: string }[] };
        }[];
      };
    };
    const phrase = raw.session.tasks.find(
      (task) => task.family === "phrase_builder",
    )!;
    phrase.learner.responseOptions[0].text = "New York";
    const mutatedFirst = parseV2ActivitySessionProjectionSource(
      canonicalJsonV1(raw),
    );
    const mutatedSources = [mutatedFirst, ...trustedSources.slice(1)];
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: mutatedSources,
        speechProfile: speechProfile(),
        declarations: declarations(mutatedSources),
      }),
    ).toThrow("v2_activity_audio_target_phrase_builder_word_count_invalid");
  });

  it("rejects cross-language profiles, untrusted sources and count cap before source work", () => {
    const trustedSources = sources();
    const frenchProfile = parseV2SpeechProfileBodyV1(
      canonicalJsonV1({
        ...speechProfile(),
        profileId: "speech-fr-fr",
        targetLanguage: "fr",
        speechLocale: "fr-FR",
      }),
    );
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources,
        speechProfile: frenchProfile,
        declarations: declarations(trustedSources),
      }),
    ).toThrow("v2_activity_audio_target_catalog_profile_mismatch");
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: trustedSources.map((source) => ({ ...source })),
        speechProfile: speechProfile(),
        declarations: [],
      }),
    ).toThrow("v2_activity_episode_source_untrusted");
    expect(() =>
      materializeV2ActivityAudioTargetCatalogV1({
        sources: [],
        speechProfile: speechProfile(),
        declarations: Array.from({
          length: V2_ACTIVITY_AUDIO_TARGET_MAX_PER_EPISODE_V1 + 1,
        }) as never,
      }),
    ).toThrow("v2_activity_audio_target_catalog_count_invalid");
  });
});
