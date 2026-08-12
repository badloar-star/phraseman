import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_AUDIO_PREFETCH_POLICY_V1,
  V2_FOUR_VOICE_PLAYBACK_POLICY_V1,
  V2_REQUIRED_VOICE_IDS,
} from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  isV2GenerationStageWorkspaceV2,
  type V2GenerationStageWorkspaceV2,
} from "./v2_generation_workspace_contract_v2";
import {
  isV2ActivityAudioTargetCatalogV1,
  type V2ActivityAudioTargetCatalogV1,
  type V2ActivityAudioTargetV1,
} from "./v2_activity_audio_target_catalog_v1";
import {
  isV2VoiceGenerationProfileBodyV1,
  v2VoiceGenerationProfileRefV1,
  type V2VoiceGenerationProfileBodyV1,
  type V2VoiceProfileRefV1,
} from "./v2_voice_profile_contracts_v1";

export const V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2 =
  "v2-voice-targets-artifact.v2" as const;
export const V2_VOICE_TARGETS_SESSION_SHARD_SCHEMA_V2 =
  "v2-voice-targets-session-shard.v2" as const;
export const V2_VOICE_TARGETS_SESSION_SHARD_MAX_BYTES_V2 = 2 * 1024 * 1024;
export const V2_VOICE_TARGETS_ARTIFACT_MAX_BYTES_V2 = 64 * 1024;

export interface V2VoiceTargetWordGenerationV2 {
  readonly wordId: string;
  readonly wordOrdinal: number;
  readonly sourceWordHash: string;
  readonly voiceId: (typeof V2_REQUIRED_VOICE_IDS)[number];
  readonly generationTargetFingerprint: string;
}

export interface V2VoiceTargetVariantV2 {
  readonly voiceId: (typeof V2_REQUIRED_VOICE_IDS)[number];
  readonly taskVoiceGroupFingerprint: string;
  readonly fullUtteranceGenerationTargetFingerprint: string;
  readonly words: readonly V2VoiceTargetWordGenerationV2[];
  readonly variantFingerprint: string;
}

export interface V2VoiceTargetV2 {
  readonly audioTargetId: string;
  readonly taskId: string;
  readonly sourceHash: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly wordCount: number;
  readonly variants: readonly V2VoiceTargetVariantV2[];
  readonly targetFingerprint: string;
}

export interface V2VoiceTargetsTaskVoiceGroupV2 {
  readonly taskId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly orderedAudioTargetIds: readonly string[];
  readonly orderedWordIds: readonly string[];
  readonly requiredVoiceIds: typeof V2_REQUIRED_VOICE_IDS;
  readonly selectionScope: "once_per_task_attempt";
  readonly selectionResolution: "one_voice_id_indexes_every_target_and_word_variant";
  readonly groupFingerprint: string;
}

export interface V2VoiceTargetsSessionShardV2 {
  readonly schemaVersion: typeof V2_VOICE_TARGETS_SESSION_SHARD_SCHEMA_V2;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly audioCatalogSessionFingerprint: string;
  readonly targetCount: number;
  readonly targets: readonly V2VoiceTargetV2[];
  readonly taskVoiceGroups: readonly V2VoiceTargetsTaskVoiceGroupV2[];
  readonly sessionFingerprint: string;
}

export interface V2VoiceTargetsSessionShardRefV2 {
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly targetCount: number;
  readonly sessionFingerprint: string;
  readonly canonicalByteSize: number;
}

export interface V2VoiceTargetsArtifactV2 {
  readonly schemaVersion: typeof V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly speechLocale: string;
  readonly activityAudioCatalogFingerprint: string;
  readonly activitySourceAggregateFingerprint: string;
  readonly activityRenderAggregateFingerprint: string;
  readonly speechProfileRef: V2VoiceProfileRefV1;
  readonly voiceGenerationProfileRef: V2VoiceProfileRefV1;
  readonly playbackPolicyRef: typeof V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref;
  readonly prefetchPolicyRef: typeof V2_AUDIO_PREFETCH_POLICY_V1.ref;
  readonly requiredVoiceIds: typeof V2_REQUIRED_VOICE_IDS;
  readonly variantsPerTarget: 4;
  readonly voiceSelectionScope: "once_per_task_attempt";
  readonly sessionCount: 12;
  readonly targetCount: number;
  readonly wordTargetCount: number;
  readonly variantCount: number;
  readonly generationTargetCount: number;
  readonly sessionRefs: readonly V2VoiceTargetsSessionShardRefV2[];
  readonly sourceAuthority: "structural_catalog_only";
  readonly repositoryAuthority: "none";
  readonly profileLifecycleAuthority: "none";
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
  readonly artifactFingerprint: string;
}

export interface V2VoiceTargetsPackageV2 {
  readonly root: V2VoiceTargetsArtifactV2;
  readonly sessionShards: readonly V2VoiceTargetsSessionShardV2[];
}

export interface V2VoiceTargetsMaterializationInputV2 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly catalog: V2ActivityAudioTargetCatalogV1;
  readonly voiceGenerationProfile: V2VoiceGenerationProfileBodyV1;
}

const handles = new WeakSet<object>();
const packageHandles = new WeakSet<object>();
const sessionHandles = new WeakSet<object>();

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

function exactRef(left: unknown, right: unknown): boolean {
  return canonicalJsonV1(left) === canonicalJsonV1(right);
}

function generationTargetFingerprint(
  input: Readonly<{
    generationProfileRef: V2VoiceProfileRefV1;
    speechProfileRef: V2VoiceProfileRefV1;
    targetLanguage: string;
    speechLocale: string;
    audioTargetId: string;
    sourceHash: string;
    wordId: string | null;
    wordOrdinal: number | null;
    sourceWordHash: string | null;
    voiceId: (typeof V2_REQUIRED_VOICE_IDS)[number];
  }>,
): string {
  return hashCanonicalBody({
    schemaVersion: "v2-voice-generation-target.v2",
    ...input,
    output: Object.freeze({ format: "mp3", contentType: "audio/mpeg" }),
  });
}

function target(
  value: V2ActivityAudioTargetV1,
  catalog: V2ActivityAudioTargetCatalogV1,
  generationProfileRef: V2VoiceProfileRefV1,
): V2VoiceTargetV2 {
  const variants = V2_REQUIRED_VOICE_IDS.map((voiceId) => {
    const variantBody = {
      voiceId,
      taskVoiceGroupFingerprint: value.taskVoiceGroupFingerprint,
      fullUtteranceGenerationTargetFingerprint: generationTargetFingerprint({
        generationProfileRef,
        speechProfileRef: catalog.speechProfileRef,
        targetLanguage: catalog.targetLanguage,
        speechLocale: catalog.speechLocale,
        audioTargetId: value.audioTargetId,
        sourceHash: value.sourceHash,
        wordId: null,
        wordOrdinal: null,
        sourceWordHash: null,
        voiceId,
      }),
      words: Object.freeze(
        value.words.map((word) =>
          Object.freeze({
            wordId: word.wordId,
            wordOrdinal: word.wordOrdinal,
            sourceWordHash: word.sourceHash,
            voiceId,
            generationTargetFingerprint: generationTargetFingerprint({
              generationProfileRef,
              speechProfileRef: catalog.speechProfileRef,
              targetLanguage: catalog.targetLanguage,
              speechLocale: catalog.speechLocale,
              audioTargetId: value.audioTargetId,
              sourceHash: value.sourceHash,
              wordId: word.wordId,
              wordOrdinal: word.wordOrdinal,
              sourceWordHash: word.sourceHash,
              voiceId,
            }),
          }),
        ),
      ),
    };
    return Object.freeze({
      ...variantBody,
      variantFingerprint: hashCanonicalBody(variantBody),
    });
  });
  const targetBody = {
    audioTargetId: value.audioTargetId,
    taskId: value.taskId,
    sourceHash: value.sourceHash,
    taskVoiceGroupFingerprint: value.taskVoiceGroupFingerprint,
    wordCount: value.wordCount,
    variants: Object.freeze(variants),
  };
  return Object.freeze({
    ...targetBody,
    targetFingerprint: hashCanonicalBody(targetBody),
  });
}

export function materializeV2VoiceTargetsPackageV2(
  input: Readonly<V2VoiceTargetsMaterializationInputV2>,
): V2VoiceTargetsPackageV2 {
  if (!isV2CanonicalSeasonPlanV2(input.plan))
    fail("v2_voice_targets_plan_untrusted");
  if (!isV2GenerationStageWorkspaceV2(input.workspace))
    fail("v2_voice_targets_workspace_untrusted");
  if (!isV2ActivityAudioTargetCatalogV1(input.catalog))
    fail("v2_voice_targets_catalog_untrusted");
  if (!isV2VoiceGenerationProfileBodyV1(input.voiceGenerationProfile))
    fail("v2_voice_targets_generation_profile_untrusted");
  const stage = input.plan.stages.find(
    (candidate) => candidate.stageId === input.workspace.stage.stageId,
  );
  if (
    input.workspace.planFingerprint !== input.plan.planFingerprint ||
    input.workspace.courseContractFingerprint !==
      input.plan.courseContract.courseContractFingerprint ||
    !stage ||
    stage.kind !== "v2_voice_targets" ||
    stage.episodeId !== input.catalog.episodeId ||
    input.catalog.targetLanguage !== input.plan.targetLanguage
  )
    fail("v2_voice_targets_binding_invalid");
  const generationProfileRef = v2VoiceGenerationProfileRefV1(
    input.voiceGenerationProfile,
  );
  const stageRequirements = new Map(
    input.plan.externalRequirementCatalog.map((entry) => [
      entry.requirementId,
      entry.requirement,
    ]),
  );
  const speechRequirement = stage.externalRequirementIds
    .map((id) => stageRequirements.get(id))
    .find((requirement) => requirement?.dependencyType === "speech_profile");
  const generationRequirement = stage.externalRequirementIds
    .map((id) => stageRequirements.get(id))
    .find(
      (requirement) =>
        requirement?.dependencyType === "voice_generation_profile",
    );
  if (
    speechRequirement?.dependencyType !== "speech_profile" ||
    generationRequirement?.dependencyType !== "voice_generation_profile" ||
    !exactRef(input.catalog.speechProfileRef, {
      profileId: speechRequirement.profileId,
      version: speechRequirement.version,
      contentHash: speechRequirement.contentHash,
    }) ||
    !exactRef(generationProfileRef, {
      profileId: generationRequirement.profileId,
      version: generationRequirement.version,
      contentHash: generationRequirement.contentHash,
    })
  )
    fail("v2_voice_targets_profile_mismatch");

  let wordTargetCount = 0;
  const sessions = input.catalog.sessions.map((session) => {
    const targets = session.targets.map((value) => {
      wordTargetCount += value.wordCount;
      return target(value, input.catalog, generationProfileRef);
    });
    const targetsById = new Map(
      targets.map((targetValue) => [targetValue.audioTargetId, targetValue]),
    );
    const taskVoiceGroups = session.taskVoiceGroups.map((catalogGroup) => {
      const groupTargets = catalogGroup.orderedAudioTargetIds.map((id) =>
        targetsById.get(id),
      );
      if (
        groupTargets.some(
          (targetValue) =>
            !targetValue ||
            targetValue.taskVoiceGroupFingerprint !==
              catalogGroup.taskVoiceGroupFingerprint,
        )
      )
        fail("v2_voice_targets_voice_group_mismatch");
      const groupBody = {
        taskId: catalogGroup.taskId,
        taskVoiceGroupFingerprint: catalogGroup.taskVoiceGroupFingerprint,
        orderedAudioTargetIds: catalogGroup.orderedAudioTargetIds,
        orderedWordIds: catalogGroup.orderedWordIds,
        requiredVoiceIds: V2_REQUIRED_VOICE_IDS,
        selectionScope: "once_per_task_attempt" as const,
        selectionResolution:
          "one_voice_id_indexes_every_target_and_word_variant" as const,
      };
      return Object.freeze({
        ...groupBody,
        groupFingerprint: hashCanonicalBody(groupBody),
      });
    });
    const sessionBody = {
      schemaVersion: V2_VOICE_TARGETS_SESSION_SHARD_SCHEMA_V2,
      sessionOrdinal: session.sessionOrdinal,
      sessionId: session.sessionId,
      sourceFingerprint: session.sourceFingerprint,
      renderFingerprint: session.renderFingerprint,
      audioCatalogSessionFingerprint: session.sessionTargetAggregateFingerprint,
      targetCount: targets.length,
      targets: Object.freeze(targets),
      taskVoiceGroups: Object.freeze(taskVoiceGroups),
    };
    const shard = Object.freeze({
      ...sessionBody,
      sessionFingerprint: hashCanonicalBody(sessionBody),
    });
    if (
      utf8ByteLengthV1(canonicalJsonV1(shard)) >
      V2_VOICE_TARGETS_SESSION_SHARD_MAX_BYTES_V2
    )
      fail("v2_voice_targets_session_too_large");
    sessionHandles.add(shard);
    return shard;
  });
  const targetCount = sessions.reduce(
    (sum, session) => sum + session.targetCount,
    0,
  );
  const body = {
    schemaVersion: V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2,
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    workspaceFingerprint: input.workspace.workspaceFingerprint,
    stageId: stage.stageId,
    episodeId: input.catalog.episodeId,
    targetLanguage: input.catalog.targetLanguage,
    speechLocale: input.catalog.speechLocale,
    activityAudioCatalogFingerprint: input.catalog.catalogFingerprint,
    activitySourceAggregateFingerprint:
      input.catalog.activitySourceAggregateFingerprint,
    activityRenderAggregateFingerprint:
      input.catalog.activityRenderAggregateFingerprint,
    speechProfileRef: input.catalog.speechProfileRef,
    voiceGenerationProfileRef: generationProfileRef,
    playbackPolicyRef: V2_FOUR_VOICE_PLAYBACK_POLICY_V1.ref,
    prefetchPolicyRef: V2_AUDIO_PREFETCH_POLICY_V1.ref,
    requiredVoiceIds: V2_REQUIRED_VOICE_IDS,
    variantsPerTarget: 4 as const,
    voiceSelectionScope: "once_per_task_attempt" as const,
    sessionCount: 12 as const,
    targetCount,
    wordTargetCount,
    variantCount: targetCount * 4,
    generationTargetCount: (targetCount + wordTargetCount) * 4,
    sessionRefs: Object.freeze(
      sessions.map((session) =>
        Object.freeze({
          sessionOrdinal: session.sessionOrdinal,
          sessionId: session.sessionId,
          targetCount: session.targetCount,
          sessionFingerprint: session.sessionFingerprint,
          canonicalByteSize: utf8ByteLengthV1(canonicalJsonV1(session)),
        }),
      ),
    ),
    sourceAuthority: "structural_catalog_only" as const,
    repositoryAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
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
  const artifact = deepFreeze({
    ...body,
    artifactFingerprint: hashCanonicalBody(body),
  }) as V2VoiceTargetsArtifactV2;
  if (
    utf8ByteLengthV1(canonicalJsonV1(artifact)) >
    V2_VOICE_TARGETS_ARTIFACT_MAX_BYTES_V2
  )
    fail("v2_voice_targets_artifact_too_large");
  handles.add(artifact);
  const result = Object.freeze({
    root: artifact,
    sessionShards: Object.freeze(sessions),
  });
  packageHandles.add(result);
  return result;
}

export function parseV2VoiceTargetsPackageV2(
  input: Readonly<
    V2VoiceTargetsMaterializationInputV2 & {
      rootRaw: string;
      sessionShardRaws: readonly string[];
    }
  >,
): V2VoiceTargetsPackageV2 {
  if (
    typeof input.rootRaw !== "string" ||
    input.rootRaw.length > V2_VOICE_TARGETS_ARTIFACT_MAX_BYTES_V2 ||
    utf8ByteLengthV1(input.rootRaw) > V2_VOICE_TARGETS_ARTIFACT_MAX_BYTES_V2 ||
    !Array.isArray(input.sessionShardRaws) ||
    input.sessionShardRaws.length !== 12 ||
    input.sessionShardRaws.some(
      (raw) =>
        typeof raw !== "string" ||
        raw.length > V2_VOICE_TARGETS_SESSION_SHARD_MAX_BYTES_V2 ||
        utf8ByteLengthV1(raw) > V2_VOICE_TARGETS_SESSION_SHARD_MAX_BYTES_V2,
    )
  )
    fail("v2_voice_targets_raw_invalid");
  const expected = materializeV2VoiceTargetsPackageV2(input);
  if (input.rootRaw !== canonicalJsonV1(expected.root))
    fail("v2_voice_targets_root_mismatch");
  expected.sessionShards.forEach((shard, index) => {
    if (input.sessionShardRaws[index] !== canonicalJsonV1(shard))
      fail("v2_voice_targets_session_mismatch");
  });
  return expected;
}

export const isV2VoiceTargetsArtifactV2 = (
  value: unknown,
): value is V2VoiceTargetsArtifactV2 =>
  typeof value === "object" && value !== null && handles.has(value);

export const isV2VoiceTargetsPackageV2 = (
  value: unknown,
): value is V2VoiceTargetsPackageV2 =>
  typeof value === "object" && value !== null && packageHandles.has(value);

export const isV2VoiceTargetsSessionShardV2 = (
  value: unknown,
): value is V2VoiceTargetsSessionShardV2 =>
  typeof value === "object" && value !== null && sessionHandles.has(value);

export const isV2VoiceTargetsPackageBoundToV2 = (
  value: V2VoiceTargetsPackageV2,
  input: Readonly<V2VoiceTargetsMaterializationInputV2>,
): boolean => {
  if (!isV2VoiceTargetsPackageV2(value)) return false;
  try {
    const expected = materializeV2VoiceTargetsPackageV2(input);
    return (
      canonicalJsonV1(value.root) === canonicalJsonV1(expected.root) &&
      value.sessionShards.every(
        (shard, index) =>
          canonicalJsonV1(shard) ===
          canonicalJsonV1(expected.sessionShards[index]),
      )
    );
  } catch {
    return false;
  }
};
