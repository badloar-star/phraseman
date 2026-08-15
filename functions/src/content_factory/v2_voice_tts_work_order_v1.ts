import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1,
  type V2VoiceGenerationProfileBodyV1,
} from "./v2_voice_profile_contracts_v1";
import {
  resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1,
  type V2FirebaseVoiceTargetsAuthenticatedInputHandleV1,
  type V2FirebaseVoiceTargetsAuthenticatedInputSummaryV1,
} from "./v2_firebase_voice_targets_authenticated_input_v1";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import type { V2VoiceTargetsPackageV2 } from "./v2_voice_targets_package_v2";

export const V2_VOICE_TTS_WORK_ORDER_SUMMARY_SCHEMA_V1 =
  "v2-voice-tts-work-order-summary.v1" as const;
export const V2_VOICE_TTS_WORK_ORDER_MAX_ITEM_COUNT_V1 = 44_928;

export type V2VoiceTtsSourceEvidenceV1 =
  | "exact_learner_visible_phrase_builder_chip"
  | "unverified_server_declaration";

export interface V2VoiceTtsWorkItemV1 {
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly taskId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly audioTargetId: string;
  readonly targetFingerprint: string;
  readonly inputKind: "full_utterance" | "word";
  readonly wordId: string | null;
  readonly wordOrdinal: number | null;
  readonly voiceId: "ash" | "onyx" | "nova" | "coral";
  readonly generationTargetFingerprint: string;
  readonly inputText: string;
  readonly sourceEvidence: V2VoiceTtsSourceEvidenceV1;
  readonly model: "gpt-4o-mini-tts";
  readonly format: "mp3";
  readonly contentType: "audio/mpeg";
  readonly speed: 1;
  readonly instructions: string;
  readonly maximumOutputBytes: number;
  readonly itemFingerprint: string;
}

export interface V2VoiceTtsWorkOrderSummaryV1 {
  readonly schemaVersion: typeof V2_VOICE_TTS_WORK_ORDER_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly workspaceFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly packageFingerprint: string;
  readonly authenticatedInputSummaryFingerprint: string;
  readonly profileObservationAggregateFingerprint: string;
  readonly targetCount: number;
  readonly wordTargetCount: number;
  readonly generationTargetCount: number;
  readonly workItemCount: number;
  readonly exactVisibleChipItemCount: number;
  readonly unverifiedDeclarationItemCount: number;
  readonly executionDisposition:
    | "eligible_for_guarded_tts_execution"
    | "blocked_unverified_spoken_source";
  readonly blockingIssueCodes: readonly string[];
  readonly sourceAuthority: "per_item_explicit_evidence_only";
  readonly repositoryOriginAuthority: "authenticated_project_repository_snapshot";
  readonly profileLifecycleAuthority: "published_head_observation_only";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly storageAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly workOrderFingerprint: string;
}

export interface V2VoiceTtsWorkOrderHandleV1 {
  readonly __opaqueV2VoiceTtsWorkOrderHandleV1: unique symbol;
}

export interface V2VoiceTtsWorkOrderMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly authenticatedInput: V2FirebaseVoiceTargetsAuthenticatedInputSummaryV1;
  readonly generationProfile: V2VoiceGenerationProfileBodyV1;
  readonly packageValue: V2VoiceTargetsPackageV2;
  readonly items: readonly V2VoiceTtsWorkItemV1[];
  readonly summary: V2VoiceTtsWorkOrderSummaryV1;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<object, V2VoiceTtsWorkOrderMaterialV1>();

function fail(code: string): never {
  throw new Error(code);
}

export function materializeV2VoiceTtsWorkOrderV1(input: {
  readonly authenticatedInputHandle: V2FirebaseVoiceTargetsAuthenticatedInputHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2VoiceTtsWorkOrderHandleV1 {
  const material = resolveV2FirebaseVoiceTargetsAuthenticatedInputMaterialV1({
    handle: input.authenticatedInputHandle,
    plan: input.plan,
    stageId: input.stageId,
  });
  const catalogSessions = new Map(
    material.packageInputs.catalog.sessions.map((session) => [
      session.sessionOrdinal,
      session,
    ]),
  );
  const items: V2VoiceTtsWorkItemV1[] = [];
  for (const shard of material.packageValue.sessionShards) {
    const catalogSession = catalogSessions.get(shard.sessionOrdinal);
    if (!catalogSession || catalogSession.sessionId !== shard.sessionId)
      fail("v2_voice_tts_work_order_catalog_session_mismatch");
    const catalogTargets = new Map(
      catalogSession.targets.map((target) => [target.audioTargetId, target]),
    );
    for (const target of shard.targets) {
      const catalogTarget = catalogTargets.get(target.audioTargetId);
      if (
        !catalogTarget ||
        catalogTarget.taskId !== target.taskId ||
        catalogTarget.sourceHash !== target.sourceHash ||
        catalogTarget.taskVoiceGroupFingerprint !==
          target.taskVoiceGroupFingerprint ||
        catalogTarget.wordCount !== target.wordCount
      )
        fail("v2_voice_tts_work_order_target_mismatch");
      const sourceEvidence: V2VoiceTtsSourceEvidenceV1 =
        catalogTarget.sourceRef.kind === "phrase_builder_response_option"
          ? "exact_learner_visible_phrase_builder_chip"
          : "unverified_server_declaration";
      for (const variant of target.variants) {
        const fullBody = {
          sessionOrdinal: shard.sessionOrdinal,
          sessionId: shard.sessionId,
          taskId: target.taskId,
          taskVoiceGroupFingerprint: target.taskVoiceGroupFingerprint,
          audioTargetId: target.audioTargetId,
          targetFingerprint: target.targetFingerprint,
          inputKind: "full_utterance" as const,
          wordId: null,
          wordOrdinal: null,
          voiceId: variant.voiceId,
          generationTargetFingerprint:
            variant.fullUtteranceGenerationTargetFingerprint,
          inputText: catalogTarget.spokenText,
          sourceEvidence,
          model: material.profiles.voiceGenerationProfile.model,
          format: material.profiles.voiceGenerationProfile.format,
          contentType: material.profiles.voiceGenerationProfile.contentType,
          speed: material.profiles.voiceGenerationProfile.speed,
          instructions:
            V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1.body.instructions,
          maximumOutputBytes:
            material.profiles.voiceGenerationProfile.maximumBytesPerWordVariant,
        };
        items.push(
          Object.freeze({
            ...fullBody,
            itemFingerprint: hashCanonicalBody(fullBody),
          }),
        );
        for (const word of variant.words) {
          const catalogWord = catalogTarget.words[word.wordOrdinal - 1];
          if (
            !catalogWord ||
            catalogWord.wordId !== word.wordId ||
            catalogWord.sourceHash !== word.sourceWordHash ||
            word.voiceId !== variant.voiceId
          )
            fail("v2_voice_tts_work_order_word_mismatch");
          const wordBody = {
            ...fullBody,
            inputKind: "word" as const,
            wordId: word.wordId,
            wordOrdinal: word.wordOrdinal,
            generationTargetFingerprint: word.generationTargetFingerprint,
            inputText: catalogWord.text,
          };
          items.push(
            Object.freeze({
              ...wordBody,
              itemFingerprint: hashCanonicalBody(wordBody),
            }),
          );
        }
      }
    }
  }
  if (
    items.length < 1 ||
    items.length > V2_VOICE_TTS_WORK_ORDER_MAX_ITEM_COUNT_V1 ||
    items.length !== material.packageValue.root.generationTargetCount ||
    new Set(items.map((item) => item.generationTargetFingerprint)).size !==
      items.length
  )
    fail("v2_voice_tts_work_order_count_invalid");
  const exactVisibleChipItemCount = items.filter(
    (item) =>
      item.sourceEvidence === "exact_learner_visible_phrase_builder_chip",
  ).length;
  const unverifiedDeclarationItemCount =
    items.length - exactVisibleChipItemCount;
  const blockingIssueCodes =
    unverifiedDeclarationItemCount === 0
      ? Object.freeze([] as string[])
      : Object.freeze(["v2_voice_tts_unverified_spoken_source"]);
  const authenticatedInput = material.summary;
  const summaryBody = {
    schemaVersion: V2_VOICE_TTS_WORK_ORDER_SUMMARY_SCHEMA_V1,
    planFingerprint: authenticatedInput.planFingerprint,
    workspaceFingerprint: authenticatedInput.workspaceFingerprint,
    stageId: authenticatedInput.stageId,
    episodeId: authenticatedInput.episodeId,
    candidateFingerprint: authenticatedInput.candidateFingerprint,
    packageFingerprint: authenticatedInput.packageFingerprint,
    authenticatedInputSummaryFingerprint: authenticatedInput.summaryFingerprint,
    profileObservationAggregateFingerprint:
      authenticatedInput.profileObservationAggregateFingerprint,
    targetCount: authenticatedInput.targetCount,
    wordTargetCount: authenticatedInput.wordTargetCount,
    generationTargetCount: authenticatedInput.generationTargetCount,
    workItemCount: items.length,
    exactVisibleChipItemCount,
    unverifiedDeclarationItemCount,
    executionDisposition:
      blockingIssueCodes.length === 0
        ? ("eligible_for_guarded_tts_execution" as const)
        : ("blocked_unverified_spoken_source" as const),
    blockingIssueCodes,
    sourceAuthority: "per_item_explicit_evidence_only" as const,
    repositoryOriginAuthority:
      "authenticated_project_repository_snapshot" as const,
    profileLifecycleAuthority: "published_head_observation_only" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    storageAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const summary = Object.freeze({
    ...summaryBody,
    workOrderFingerprint: hashCanonicalBody({
      summaryBody,
      orderedItemFingerprints: items.map((item) => item.itemFingerprint),
    }),
  });
  const handle = Object.freeze({}) as V2VoiceTtsWorkOrderHandleV1;
  handles.add(handle);
  metadata.set(
    handle,
    Object.freeze({
      plan: input.plan,
      authenticatedInput,
      generationProfile: material.profiles.voiceGenerationProfile,
      packageValue: material.packageValue,
      items: Object.freeze(items),
      summary,
    }),
  );
  return handle;
}

export function isV2VoiceTtsWorkOrderHandleV1(
  value: unknown,
): value is V2VoiceTtsWorkOrderHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2VoiceTtsWorkOrderSummaryV1(
  handle: V2VoiceTtsWorkOrderHandleV1,
): V2VoiceTtsWorkOrderSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_voice_tts_work_order_handle_invalid");
  return value.summary;
}

export function resolveV2VoiceTtsWorkOrderMaterialV1(input: {
  readonly handle: V2VoiceTtsWorkOrderHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2VoiceTtsWorkOrderMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.authenticatedInput.stageId !== input.stageId
  )
    fail("v2_voice_tts_work_order_handle_invalid");
  return value;
}
