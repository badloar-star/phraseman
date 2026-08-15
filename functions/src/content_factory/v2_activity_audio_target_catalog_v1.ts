import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_FOUR_VOICE_PLAYBACK_POLICY_V1 } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
  assembleV2ActivityEpisodeProjectionV1,
  type V2ActivityFamily,
  type V2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";
import {
  isV2SpeechProfileBodyV1,
  v2SpeechProfileRefV1,
  type V2SpeechProfileBodyV1,
  type V2VoiceProfileRefV1,
} from "./v2_voice_profile_contracts_v1";

export const V2_ACTIVITY_AUDIO_TARGET_CATALOG_SCHEMA_V1 =
  "v2-activity-audio-target-catalog.v1" as const;
export const V2_ACTIVITY_AUDIO_TARGET_SESSION_SHARD_MAX_BYTES_V1 = 1024 * 1024;
export const V2_ACTIVITY_AUDIO_TARGET_CATALOG_MAX_BYTES_V1 = 16 * 1024 * 1024;
export const V2_ACTIVITY_AUDIO_TARGET_MAX_PER_TASK_V1 = 6;
export const V2_ACTIVITY_AUDIO_TARGET_MAX_PER_SESSION_V1 = 72;
export const V2_ACTIVITY_AUDIO_TARGET_MAX_PER_EPISODE_V1 = 864;
export const V2_ACTIVITY_AUDIO_WORD_MAX_PER_TARGET_V1 = 12;
export const V2_ACTIVITY_AUDIO_WORD_MAX_UTF8_BYTES_V1 = 256;

const audioEligibilityPolicyBody = Object.freeze({
  schemaVersion: "v2-activity-audio-eligibility-policy.v1" as const,
  policyId: "required-learning-audio-by-family" as const,
  version: 1 as const,
  phraseBuilder: "all_response_option_chips_exactly_one_word" as const,
  requiredLearnerAudioFamilies: Object.freeze([
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "scripted_repeat_compare",
  ] as const),
  forbiddenLearnerAudioFamilies: Object.freeze([
    "context_gap_grammar",
    "speed_match",
  ] as const),
  requiredLearnerAudioTargetCount: Object.freeze({ minimum: 1, maximum: 4 }),
  interfaceLocaleIsDuplicationAxis: false as const,
});

export const V2_ACTIVITY_AUDIO_ELIGIBILITY_POLICY_V1 = Object.freeze({
  body: audioEligibilityPolicyBody,
  ref: Object.freeze({
    policyId: audioEligibilityPolicyBody.policyId,
    version: audioEligibilityPolicyBody.version,
    contentHash: hashCanonicalBody(audioEligibilityPolicyBody),
  }),
});

export interface V2ActivityAudioWordDeclarationV1 {
  readonly wordOrdinal: number;
  readonly text: string;
}

export type V2ActivityAudioTargetSourceRefV1 =
  | Readonly<{
      kind: "phrase_builder_response_option";
      responseId: string;
    }>
  | Readonly<{
      kind: "learner_audio_target";
      learnerAudioTargetId: string;
    }>;

export interface V2ActivityAudioTargetDeclarationV1 {
  readonly audioTargetId: string;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly taskId: string;
  readonly family: V2ActivityFamily;
  readonly sourceRef: V2ActivityAudioTargetSourceRefV1;
  readonly spokenText: string;
  readonly pronunciationHint: string | null;
  readonly speakerId: string | null;
  readonly words: readonly V2ActivityAudioWordDeclarationV1[];
}

export interface V2ActivityAudioWordTargetV1 {
  readonly wordOrdinal: number;
  readonly wordId: string;
  readonly text: string;
  readonly textHash: string;
  readonly sourceHash: string;
}

export interface V2ActivityAudioTargetV1 {
  readonly audioTargetId: string;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly taskId: string;
  readonly family: V2ActivityFamily;
  readonly sourceRef: V2ActivityAudioTargetSourceRefV1;
  readonly spokenText: string;
  readonly spokenTextHash: string;
  readonly pronunciationHint: string | null;
  readonly speakerId: string | null;
  readonly sourceHash: string;
  readonly words: readonly V2ActivityAudioWordTargetV1[];
  readonly wordCount: number;
  readonly taskVoicePolicy: "one_voice_for_all_task_targets_and_words";
  readonly taskVoiceGroupFingerprint: string;
  readonly targetFingerprint: string;
}

export interface V2ActivityAudioTaskVoiceGroupV1 {
  readonly taskId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly orderedAudioTargetIds: readonly string[];
  readonly orderedWordIds: readonly string[];
  readonly playbackPolicyRef: typeof V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref;
  readonly selectionScope: "once_per_task_attempt";
  readonly taskVoiceGroupFingerprint: string;
}

export interface V2ActivityAudioTargetCatalogSessionV1 {
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly targetCount: number;
  readonly targets: readonly V2ActivityAudioTargetV1[];
  readonly taskVoiceGroups: readonly V2ActivityAudioTaskVoiceGroupV1[];
  readonly sessionTargetAggregateFingerprint: string;
}

export interface V2ActivityAudioTargetCatalogV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_AUDIO_TARGET_CATALOG_SCHEMA_V1;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly speechLocale: string;
  readonly speechProfileRef: V2VoiceProfileRefV1;
  readonly audioEligibilityPolicyRef: typeof V2_ACTIVITY_AUDIO_ELIGIBILITY_POLICY_V1.ref;
  readonly playbackPolicyRef: typeof V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref;
  readonly activityProjectionAssemblyFingerprint: string;
  readonly activitySourceAggregateFingerprint: string;
  readonly activityRenderAggregateFingerprint: string;
  readonly sessionCount: 12;
  readonly taskCount: 144;
  readonly targetCount: number;
  readonly wordTargetCount: number;
  readonly sessions: readonly V2ActivityAudioTargetCatalogSessionV1[];
  readonly activityBindingAuthority: "exact_branded_activity_coordinates_and_render_fingerprints_only";
  readonly declarationOriginAuthority: "none";
  readonly spokenTextOriginAuthority: "phrase_builder_exact_visible_chip_other_targets_unverified_declaration";
  readonly speechProfileResolutionAuthority: "unverified_external_ref";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly runtimeAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly catalogFingerprint: string;
}

const ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const CONTROL_OR_BIDI_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const catalogHandles = new WeakSet<object>();
const REQUIRED_LEARNER_AUDIO_FAMILIES = new Set<V2ActivityFamily>(
  audioEligibilityPolicyBody.requiredLearnerAudioFamilies,
);
const FORBIDDEN_LEARNER_AUDIO_FAMILIES = new Set<V2ActivityFamily>(
  audioEligibilityPolicyBody.forbiddenLearnerAudioFamilies,
);

function fail(code: string): never {
  throw new Error(code);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function exactId(value: unknown, code: string): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail(code);
  return value;
}

function exactText(value: unknown, maximumBytes: number, code: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value ||
    value.normalize("NFC") !== value ||
    CONTROL_OR_BIDI_RE.test(value) ||
    utf8ByteLengthV1(value) > maximumBytes
  )
    fail(code);
  return value;
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function declarationKey(input: {
  readonly sessionOrdinal: number;
  readonly taskId: string;
  readonly sourceRef: V2ActivityAudioTargetSourceRefV1;
}): string {
  return hashCanonicalBody({
    schemaVersion: "v2-activity-audio-declaration-coordinate.v1",
    ...input,
  });
}

function exactSourceRef(
  value: unknown,
): asserts value is V2ActivityAudioTargetSourceRefV1 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("v2_activity_audio_target_source_ref_invalid");
  const ref = value as Record<string, unknown>;
  if (
    ref.kind === "phrase_builder_response_option" &&
    Object.keys(ref).sort().join("|") === "kind|responseId"
  ) {
    exactId(ref.responseId, "v2_activity_audio_target_source_ref_invalid");
    return;
  }
  if (
    ref.kind === "learner_audio_target" &&
    Object.keys(ref).sort().join("|") === "kind|learnerAudioTargetId"
  ) {
    exactId(
      ref.learnerAudioTargetId,
      "v2_activity_audio_target_source_ref_invalid",
    );
    return;
  }
  fail("v2_activity_audio_target_source_ref_invalid");
}

export function v2ActivityAudioTargetIdV1(
  input: Readonly<{
    episodeId: string;
    sessionId: string;
    taskId: string;
    sourceRef: V2ActivityAudioTargetSourceRefV1;
  }>,
): string {
  exactId(input.episodeId, "v2_activity_audio_target_coordinate_invalid");
  exactId(input.sessionId, "v2_activity_audio_target_coordinate_invalid");
  exactId(input.taskId, "v2_activity_audio_target_coordinate_invalid");
  exactSourceRef(input.sourceRef);
  return hashCanonicalBody({
    schemaVersion: "v2-activity-audio-target-coordinate.v1",
    episodeId: input.episodeId,
    sessionId: input.sessionId,
    taskId: input.taskId,
    sourceRef: input.sourceRef,
  });
}

function wordId(input: {
  readonly audioTargetId: string;
  readonly wordOrdinal: number;
}): string {
  return hashCanonicalBody({
    schemaVersion: "v2-activity-audio-word-coordinate.v1",
    audioTargetId: input.audioTargetId,
    wordOrdinal: input.wordOrdinal,
  });
}

function sourceHash(input: {
  readonly targetLanguage: string;
  readonly speechLocale: string;
  readonly speechProfileRef: V2VoiceProfileRefV1;
  readonly audioTargetId: string;
  readonly sourceRef: V2ActivityAudioTargetSourceRefV1;
  readonly spokenText: string;
  readonly pronunciationHint: string | null;
  readonly speakerId: string | null;
}): string {
  return hashCanonicalBody({
    schemaVersion: "v2-activity-audio-source-hash.v1",
    ...input,
  });
}

function validateWords(
  declaration: V2ActivityAudioTargetDeclarationV1,
  targetLanguage: string,
  speechLocale: string,
  speechProfileRef: V2VoiceProfileRefV1,
): readonly V2ActivityAudioWordTargetV1[] {
  if (
    !Array.isArray(declaration.words) ||
    declaration.words.length < 1 ||
    declaration.words.length > V2_ACTIVITY_AUDIO_WORD_MAX_PER_TARGET_V1
  )
    fail("v2_activity_audio_target_words_invalid");
  const targetSourceHash = sourceHash({
    targetLanguage,
    speechLocale,
    speechProfileRef,
    audioTargetId: declaration.audioTargetId,
    sourceRef: declaration.sourceRef,
    spokenText: declaration.spokenText,
    pronunciationHint: declaration.pronunciationHint,
    speakerId: declaration.speakerId,
  });
  const words = declaration.words.map((word, index) => {
    if (
      !word ||
      typeof word !== "object" ||
      Array.isArray(word) ||
      Object.keys(word).sort().join("|") !== "text|wordOrdinal" ||
      word.wordOrdinal !== index + 1
    )
      fail("v2_activity_audio_target_word_ordinal_invalid");
    const text = exactText(
      word.text,
      V2_ACTIVITY_AUDIO_WORD_MAX_UTF8_BYTES_V1,
      "v2_activity_audio_target_word_text_invalid",
    );
    const id = wordId({
      audioTargetId: declaration.audioTargetId,
      wordOrdinal: index + 1,
    });
    return Object.freeze({
      wordOrdinal: index + 1,
      wordId: id,
      text,
      textHash: hashCanonicalBody({
        schemaVersion: "v2-activity-audio-word-text.v1",
        text,
      }),
      sourceHash: hashCanonicalBody({
        schemaVersion: "v2-activity-audio-word-source.v1",
        targetSourceHash,
        wordId: id,
        wordOrdinal: index + 1,
        text,
      }),
    });
  });
  const reconstructed = words.map((word) => word.text).join(" ");
  if (reconstructed !== declaration.spokenText)
    fail("v2_activity_audio_target_word_join_invalid");
  if (
    declaration.family === "phrase_builder" &&
    words.some((word) => /\s/u.test(word.text))
  )
    fail("v2_activity_audio_target_phrase_builder_word_text_invalid");
  if (declaration.family === "phrase_builder" && words.length !== 1)
    fail("v2_activity_audio_target_phrase_builder_word_count_invalid");
  return Object.freeze(words);
}

export function materializeV2ActivityAudioTargetCatalogV1(
  input: Readonly<{
    sources: readonly V2ActivitySessionProjectionSource[];
    speechProfile: V2SpeechProfileBodyV1;
    declarations: readonly V2ActivityAudioTargetDeclarationV1[];
  }>,
): V2ActivityAudioTargetCatalogV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join("|") !==
      "declarations|sources|speechProfile" ||
    !isV2SpeechProfileBodyV1(input.speechProfile)
  )
    fail("v2_activity_audio_target_catalog_input_invalid");
  if (
    !Array.isArray(input.declarations) ||
    input.declarations.length > V2_ACTIVITY_AUDIO_TARGET_MAX_PER_EPISODE_V1
  )
    fail("v2_activity_audio_target_catalog_count_invalid");
  const assembly = assembleV2ActivityEpisodeProjectionV1(input.sources);
  if (
    assembly.targetLanguage !== input.speechProfile.targetLanguage ||
    input.sources.length !== 12
  )
    fail("v2_activity_audio_target_catalog_profile_mismatch");

  const speechProfileRef = v2SpeechProfileRefV1(input.speechProfile);
  const declarationByKey = new Map<
    string,
    V2ActivityAudioTargetDeclarationV1
  >();
  const audioTargetIds = new Set<string>();
  for (const declaration of input.declarations) {
    if (
      !declaration ||
      typeof declaration !== "object" ||
      Array.isArray(declaration)
    )
      fail("v2_activity_audio_target_declaration_invalid");
    if (
      Object.keys(declaration).sort().join("|") !==
      [
        "audioTargetId",
        "family",
        "pronunciationHint",
        "sessionId",
        "sessionOrdinal",
        "sourceRef",
        "speakerId",
        "spokenText",
        "taskId",
        "words",
      ]
        .sort()
        .join("|")
    )
      fail("v2_activity_audio_target_declaration_invalid");
    exactId(declaration.audioTargetId, "v2_activity_audio_target_id_invalid");
    exactSourceRef(declaration.sourceRef);
    if (audioTargetIds.has(declaration.audioTargetId))
      fail("v2_activity_audio_target_id_duplicate");
    audioTargetIds.add(declaration.audioTargetId);
    const key = declarationKey({
      sessionOrdinal: declaration.sessionOrdinal,
      taskId: declaration.taskId,
      sourceRef: declaration.sourceRef,
    });
    if (declarationByKey.has(key))
      fail("v2_activity_audio_target_source_duplicate");
    declarationByKey.set(key, declaration);
  }

  const sessions: V2ActivityAudioTargetCatalogSessionV1[] = [];
  const consumed = new Set<string>();
  let wordTargetCount = 0;
  for (
    let sessionIndex = 0;
    sessionIndex < input.sources.length;
    sessionIndex += 1
  ) {
    const source = input.sources[sessionIndex];
    const projection = assembly.sessions[sessionIndex];
    const expectedSourceFingerprint = hashCanonicalBody(source);
    if (
      projection.renderSeed.schemaVersion !==
        V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2 ||
      projection.renderSeed.sourceFingerprint !== expectedSourceFingerprint
    )
      fail("v2_activity_audio_target_source_render_mismatch");
    const targets: V2ActivityAudioTargetV1[] = [];
    const taskVoiceGroups: V2ActivityAudioTaskVoiceGroupV1[] = [];
    for (const task of source.session.tasks) {
      if (
        task.family !== "phrase_builder" &&
        REQUIRED_LEARNER_AUDIO_FAMILIES.has(task.family) &&
        (task.learner.audioTargetIds.length < 1 ||
          task.learner.audioTargetIds.length > 4)
      )
        fail("v2_activity_audio_target_required_family_missing");
      if (
        FORBIDDEN_LEARNER_AUDIO_FAMILIES.has(task.family) &&
        task.learner.audioTargetIds.length !== 0
      )
        fail("v2_activity_audio_target_forbidden_family_present");
      const expectedRefs: V2ActivityAudioTargetSourceRefV1[] =
        task.family === "phrase_builder"
          ? task.learner.responseOptions.map((option) => ({
              kind: "phrase_builder_response_option" as const,
              responseId: option.responseId,
            }))
          : task.learner.audioTargetIds.map((learnerAudioTargetId) => ({
              kind: "learner_audio_target" as const,
              learnerAudioTargetId,
            }));
      if (expectedRefs.length > V2_ACTIVITY_AUDIO_TARGET_MAX_PER_TASK_V1)
        fail("v2_activity_audio_target_task_count_invalid");
      const taskTargets: Omit<
        V2ActivityAudioTargetV1,
        "taskVoiceGroupFingerprint" | "targetFingerprint"
      >[] = [];
      for (const sourceRef of expectedRefs) {
        const key = declarationKey({
          sessionOrdinal: source.session.ordinal,
          taskId: task.taskId,
          sourceRef,
        });
        const declaration = declarationByKey.get(key);
        if (!declaration) fail("v2_activity_audio_target_missing");
        if (
          declaration.sessionOrdinal !== source.session.ordinal ||
          declaration.sessionId !== source.session.sessionId ||
          declaration.taskId !== task.taskId ||
          declaration.family !== task.family ||
          canonicalJsonV1(declaration.sourceRef) !== canonicalJsonV1(sourceRef)
        )
          fail("v2_activity_audio_target_binding_invalid");
        if (
          declaration.audioTargetId !==
          v2ActivityAudioTargetIdV1({
            episodeId: source.episodeId,
            sessionId: source.session.sessionId,
            taskId: task.taskId,
            sourceRef,
          })
        )
          fail("v2_activity_audio_target_id_invalid");
        if (sourceRef.kind === "phrase_builder_response_option") {
          const option = task.learner.responseOptions.find(
            (candidate) => candidate.responseId === sourceRef.responseId,
          );
          if (!option || declaration.spokenText !== option.text)
            fail("v2_activity_audio_target_phrase_builder_text_invalid");
        }
        const spokenText = exactText(
          declaration.spokenText,
          1000,
          "v2_activity_audio_target_spoken_text_invalid",
        );
        const pronunciationHint =
          declaration.pronunciationHint === null
            ? null
            : exactText(
                declaration.pronunciationHint,
                300,
                "v2_activity_audio_target_pronunciation_hint_invalid",
              );
        const speakerId =
          declaration.speakerId === null
            ? null
            : exactId(
                declaration.speakerId,
                "v2_activity_audio_target_speaker_id_invalid",
              );
        const normalizedDeclaration = {
          ...declaration,
          spokenText,
          pronunciationHint,
          speakerId,
        };
        const targetSourceHash = sourceHash({
          targetLanguage: source.targetLanguage,
          speechLocale: input.speechProfile.speechLocale,
          speechProfileRef,
          audioTargetId: declaration.audioTargetId,
          sourceRef,
          spokenText,
          pronunciationHint,
          speakerId,
        });
        const words = validateWords(
          normalizedDeclaration,
          source.targetLanguage,
          input.speechProfile.speechLocale,
          speechProfileRef,
        );
        const targetWithoutVoiceGroup = {
          audioTargetId: declaration.audioTargetId,
          sessionOrdinal: source.session.ordinal,
          sessionId: source.session.sessionId,
          taskId: task.taskId,
          family: task.family,
          sourceRef,
          spokenText,
          spokenTextHash: hashCanonicalBody({
            schemaVersion: "v2-activity-audio-spoken-text.v1",
            spokenText,
          }),
          pronunciationHint,
          speakerId,
          sourceHash: targetSourceHash,
          words,
          wordCount: words.length,
          taskVoicePolicy: "one_voice_for_all_task_targets_and_words" as const,
        };
        taskTargets.push(targetWithoutVoiceGroup);
        wordTargetCount += words.length;
        consumed.add(key);
      }
      const orderedTaskTargets = [...taskTargets].sort((left, right) =>
        codePointCompare(left.audioTargetId, right.audioTargetId),
      );
      if (orderedTaskTargets.length > 0) {
        const voiceGroupBody = {
          taskId: task.taskId,
          sessionId: source.session.sessionId,
          sessionOrdinal: source.session.ordinal,
          orderedAudioTargetIds: Object.freeze(
            orderedTaskTargets.map((target) => target.audioTargetId),
          ),
          orderedWordIds: Object.freeze(
            orderedTaskTargets.flatMap((target) =>
              target.words.map((word) => word.wordId),
            ),
          ),
          playbackPolicyRef: V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref,
          selectionScope: "once_per_task_attempt" as const,
        };
        const taskVoiceGroupFingerprint = hashCanonicalBody(voiceGroupBody);
        taskVoiceGroups.push(
          Object.freeze({ ...voiceGroupBody, taskVoiceGroupFingerprint }),
        );
        orderedTaskTargets.forEach((target) => {
          const targetBody = {
            ...target,
            taskVoiceGroupFingerprint,
          };
          targets.push(
            Object.freeze({
              ...targetBody,
              targetFingerprint: hashCanonicalBody(targetBody),
            }),
          );
        });
      }
    }
    if (targets.length > V2_ACTIVITY_AUDIO_TARGET_MAX_PER_SESSION_V1)
      fail("v2_activity_audio_target_session_count_invalid");
    targets.sort((left, right) =>
      codePointCompare(left.audioTargetId, right.audioTargetId),
    );
    const sessionBody = {
      sessionOrdinal: source.session.ordinal,
      sessionId: source.session.sessionId,
      sourceFingerprint: expectedSourceFingerprint,
      renderFingerprint: hashCanonicalBody(projection.renderSeed),
      targetCount: targets.length,
      targets: Object.freeze(targets),
      taskVoiceGroups: Object.freeze(taskVoiceGroups),
    };
    const sessionShard = Object.freeze({
      ...sessionBody,
      sessionTargetAggregateFingerprint: hashCanonicalBody(sessionBody),
    });
    if (
      utf8ByteLengthV1(canonicalJsonV1(sessionShard)) >
      V2_ACTIVITY_AUDIO_TARGET_SESSION_SHARD_MAX_BYTES_V1
    )
      fail("v2_activity_audio_target_session_too_large");
    sessions.push(sessionShard);
  }
  if (consumed.size !== input.declarations.length)
    fail("v2_activity_audio_target_extra");
  const targetCount = sessions.reduce(
    (count, session) => count + session.targetCount,
    0,
  );
  const body = {
    schemaVersion: V2_ACTIVITY_AUDIO_TARGET_CATALOG_SCHEMA_V1,
    episodeId: assembly.episodeId,
    targetLanguage: assembly.targetLanguage,
    speechLocale: input.speechProfile.speechLocale,
    speechProfileRef,
    audioEligibilityPolicyRef: V2_ACTIVITY_AUDIO_ELIGIBILITY_POLICY_V1.ref,
    playbackPolicyRef: V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref,
    activityProjectionAssemblyFingerprint: assembly.assemblyFingerprint,
    activitySourceAggregateFingerprint: hashCanonicalBody(
      sessions.map((session) => session.sourceFingerprint),
    ),
    activityRenderAggregateFingerprint: hashCanonicalBody(
      sessions.map((session) => session.renderFingerprint),
    ),
    sessionCount: 12 as const,
    taskCount: 144 as const,
    targetCount,
    wordTargetCount,
    sessions: Object.freeze(sessions),
    activityBindingAuthority:
      "exact_branded_activity_coordinates_and_render_fingerprints_only" as const,
    declarationOriginAuthority: "none" as const,
    spokenTextOriginAuthority:
      "phrase_builder_exact_visible_chip_other_targets_unverified_declaration" as const,
    speechProfileResolutionAuthority: "unverified_external_ref" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    runtimeAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const catalog = deepFreeze({
    ...body,
    catalogFingerprint: hashCanonicalBody(body),
  }) as V2ActivityAudioTargetCatalogV1;
  if (
    utf8ByteLengthV1(canonicalJsonV1(catalog)) >
    V2_ACTIVITY_AUDIO_TARGET_CATALOG_MAX_BYTES_V1
  )
    fail("v2_activity_audio_target_catalog_too_large");
  catalogHandles.add(catalog);
  return catalog;
}

export const isV2ActivityAudioTargetCatalogV1 = (
  value: unknown,
): value is V2ActivityAudioTargetCatalogV1 =>
  typeof value === "object" && value !== null && catalogHandles.has(value);
