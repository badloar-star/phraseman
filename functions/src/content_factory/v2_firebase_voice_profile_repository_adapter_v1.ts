import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  createV2FirebaseAdminRepositoryIoV1,
  type V2FirebaseAdminVoiceProfileHeadSnapshotEntryV1,
  type V2FirebaseAdminVoiceProfileRequirementV1,
} from "./v2_firebase_admin_repository_io_v1";
import { V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 } from "./v2_firebase_repository_trust_root_v1";
import {
  V2_VOICE_PROFILE_BODY_MAX_BYTES_V1,
  type V2SpeechProfileBodyV1,
  type V2VoiceGenerationProfileBodyV1,
} from "./v2_voice_profile_contracts_v1";
import {
  V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
  observeV2VoiceProfileRepositoryClaimV1,
  parseV2VoiceProfileRepositoryLifecycleV1,
  parseV2VoiceProfileRepositoryRecordV1,
  type V2VoiceProfileRepositoryObservationV1,
} from "./v2_voice_profile_repository_contract_v1";

export const V2_FIREBASE_VOICE_PROFILE_REPOSITORY_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-profile-repository-summary.v1" as const;

export interface V2FirebaseVoiceProfileRepositorySummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_PROFILE_REPOSITORY_SUMMARY_SCHEMA_V1;
  readonly firebaseRepositoryNamespaceFingerprint: string;
  readonly voiceProfileNamespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly speechProfileObservationFingerprint: string;
  readonly voiceGenerationProfileObservationFingerprint: string;
  readonly profileObservationAggregateFingerprint: string;
  readonly repositoryConnectionAuthentication: "firebase_admin_authenticated_exact_trust_root";
  readonly repositoryOriginAuthority: "authenticated_project_repository_snapshot";
  readonly profileLifecycleAuthority: "published_head_observation_only";
  readonly storageExistenceAuthority: "generation_pinned_authenticated_bucket_object_observed";
  readonly principalIdentityAuthority: "not_attested";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationDecisionAuthority: "none";
  readonly runtimeKernelAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceProfileRepositoryHandleV1 {
  readonly __opaqueV2FirebaseVoiceProfileRepositoryHandleV1: unique symbol;
}

export interface V2FirebaseVoiceProfileRepositoryMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly summary: V2FirebaseVoiceProfileRepositorySummaryV1;
  readonly speechProfile: V2SpeechProfileBodyV1;
  readonly voiceGenerationProfile: V2VoiceGenerationProfileBodyV1;
  readonly speechObservation: V2VoiceProfileRepositoryObservationV1;
  readonly voiceGenerationObservation: V2VoiceProfileRepositoryObservationV1;
}

export interface V2FirebaseVoiceProfileRepositoryAdapterV1 {
  authenticateVoiceStage(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
  }): Promise<V2FirebaseVoiceProfileRepositoryHandleV1>;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<
  object,
  V2FirebaseVoiceProfileRepositoryMaterialV1
>();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code: string): never {
  throw new Error(code);
}

function bytesRaw(bytes: Uint8Array): string {
  try {
    return decoder.decode(bytes);
  } catch {
    return fail("v2_firebase_voice_profile_repository_utf8_invalid");
  }
}

function exactEntryStable(
  before: V2FirebaseAdminVoiceProfileHeadSnapshotEntryV1,
  after: V2FirebaseAdminVoiceProfileHeadSnapshotEntryV1,
): boolean {
  return (
    canonicalJsonV1(before.requirement) ===
      canonicalJsonV1(after.requirement) &&
    before.versionDocumentPath === after.versionDocumentPath &&
    before.lifecycleDocumentPath === after.lifecycleDocumentPath &&
    bytesRaw(before.recordBytes) === bytesRaw(after.recordBytes) &&
    bytesRaw(before.lifecycleBytes) === bytesRaw(after.lifecycleBytes) &&
    canonicalJsonV1(before.recordUpdateTime) ===
      canonicalJsonV1(after.recordUpdateTime) &&
    canonicalJsonV1(before.lifecycleUpdateTime) ===
      canonicalJsonV1(after.lifecycleUpdateTime)
  );
}

function voiceRequirements(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): Readonly<{
  stage: V2CanonicalSeasonPlanV2["stages"][number];
  requirements: readonly [
    V2FirebaseAdminVoiceProfileRequirementV1,
    V2FirebaseAdminVoiceProfileRequirementV1,
  ];
}> {
  if (!isV2CanonicalSeasonPlanV2(input.plan))
    fail("v2_firebase_voice_profile_repository_plan_invalid");
  const stage = input.plan.stages.find(
    (candidate) => candidate.stageId === input.stageId,
  );
  if (!stage || stage.kind !== "v2_voice_targets" || !stage.episodeId)
    fail("v2_firebase_voice_profile_repository_stage_invalid");
  const stageEntries = stage.externalRequirementIds.map((requirementId) => {
    const entry = input.plan.externalRequirementCatalog.find(
      (candidate) => candidate.requirementId === requirementId,
    );
    if (!entry)
      fail("v2_firebase_voice_profile_repository_requirement_invalid");
    return entry.requirement;
  });
  const speech = stageEntries.filter(
    (requirement) => requirement.dependencyType === "speech_profile",
  );
  const generation = stageEntries.filter(
    (requirement) => requirement.dependencyType === "voice_generation_profile",
  );
  if (speech.length !== 1 || generation.length !== 1)
    fail("v2_firebase_voice_profile_repository_requirement_invalid");
  return Object.freeze({
    stage,
    requirements: Object.freeze([
      Object.freeze({
        profileKind: "speech_profile" as const,
        profileId: speech[0]!.profileId,
        version: speech[0]!.version,
        contentHash: speech[0]!.contentHash,
      }),
      Object.freeze({
        profileKind: "voice_generation_profile" as const,
        profileId: generation[0]!.profileId,
        version: generation[0]!.version,
        contentHash: generation[0]!.contentHash,
      }),
    ] as const),
  });
}

export function createFirebaseAdminV2VoiceProfileRepositoryAdapterV1(): V2FirebaseVoiceProfileRepositoryAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    authenticateVoiceStage: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly stageId: string;
    }) => {
      const expected = voiceRequirements(input);
      const before = await io.readCoherentVoiceProfileHeadSnapshot(
        expected.requirements,
      );
      const observations = [];
      for (const entry of before.entries) {
        const record = parseV2VoiceProfileRepositoryRecordV1(
          bytesRaw(entry.recordBytes),
        );
        const lifecycle = parseV2VoiceProfileRepositoryLifecycleV1(
          bytesRaw(entry.lifecycleBytes),
        );
        if (
          canonicalJsonV1({
            profileKind: record.profileKind,
            profileId: record.profileId,
            version: record.version,
            contentHash: record.contentHash,
          }) !== canonicalJsonV1(entry.requirement)
        )
          fail("v2_firebase_voice_profile_repository_requirement_mismatch");
        const object = await io.readVoiceProfileObjectGenerationExact({
          requirement: entry.requirement,
          objectGeneration: record.object.objectGeneration,
          declaredByteSize: record.object.byteSize,
          maximumBytes: V2_VOICE_PROFILE_BODY_MAX_BYTES_V1,
        });
        observations.push(
          observeV2VoiceProfileRepositoryClaimV1({
            record,
            lifecycle,
            bodyRaw: bytesRaw(object.bytes),
          }),
        );
      }
      const after = await io.readCoherentVoiceProfileHeadSnapshot(
        expected.requirements,
      );
      if (
        before.entries.length !== after.entries.length ||
        before.entries.some(
          (entry, index) => !exactEntryStable(entry, after.entries[index]!),
        )
      )
        fail("v2_firebase_voice_profile_repository_head_drift");
      const speech = observations[0]!;
      const generation = observations[1]!;
      if (
        speech.body.schemaVersion !== "v2-speech-profile-body.v1" ||
        generation.body.schemaVersion !==
          "v2-voice-generation-profile-body.v1" ||
        speech.body.targetLanguage !== input.plan.targetLanguage
      )
        fail("v2_firebase_voice_profile_repository_body_mismatch");
      const aggregate = hashCanonicalBody({
        speech: speech.observation.observationFingerprint,
        voiceGeneration: generation.observation.observationFingerprint,
      });
      const summaryBody = {
        schemaVersion: V2_FIREBASE_VOICE_PROFILE_REPOSITORY_SUMMARY_SCHEMA_V1,
        firebaseRepositoryNamespaceFingerprint:
          V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
        voiceProfileNamespaceFingerprint:
          V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
        planFingerprint: input.plan.planFingerprint,
        courseContractFingerprint:
          input.plan.courseContract.courseContractFingerprint,
        stageId: expected.stage.stageId,
        episodeId: expected.stage.episodeId!,
        targetLanguage: input.plan.targetLanguage,
        speechProfileObservationFingerprint:
          speech.observation.observationFingerprint,
        voiceGenerationProfileObservationFingerprint:
          generation.observation.observationFingerprint,
        profileObservationAggregateFingerprint: aggregate,
        repositoryConnectionAuthentication:
          "firebase_admin_authenticated_exact_trust_root" as const,
        repositoryOriginAuthority:
          "authenticated_project_repository_snapshot" as const,
        profileLifecycleAuthority: "published_head_observation_only" as const,
        storageExistenceAuthority:
          "generation_pinned_authenticated_bucket_object_observed" as const,
        principalIdentityAuthority: "not_attested" as const,
        providerExecutionAuthority: "none" as const,
        audioByteAuthority: "none" as const,
        listeningEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
        humanApprovalAuthority: "none" as const,
        publicationDecisionAuthority: "none" as const,
        runtimeKernelAuthority: "none" as const,
        executionAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      };
      const summary = Object.freeze({
        ...summaryBody,
        summaryFingerprint: hashCanonicalBody(summaryBody),
      });
      const handle = Object.freeze(
        {},
      ) as V2FirebaseVoiceProfileRepositoryHandleV1;
      const material = Object.freeze({
        plan: input.plan,
        stageId: input.stageId,
        summary,
        speechProfile: speech.body as V2SpeechProfileBodyV1,
        voiceGenerationProfile:
          generation.body as V2VoiceGenerationProfileBodyV1,
        speechObservation: speech.observation,
        voiceGenerationObservation: generation.observation,
      });
      handles.add(handle);
      metadata.set(handle, material);
      return handle;
    },
  });
}

export function isV2FirebaseVoiceProfileRepositoryHandleV1(
  value: unknown,
): value is V2FirebaseVoiceProfileRepositoryHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceProfileRepositorySummaryV1(
  handle: V2FirebaseVoiceProfileRepositoryHandleV1,
): V2FirebaseVoiceProfileRepositorySummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_firebase_voice_profile_repository_handle_invalid");
  return value.summary;
}

export function resolveV2FirebaseVoiceProfileRepositoryMaterialV1(input: {
  readonly handle: V2FirebaseVoiceProfileRepositoryHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseVoiceProfileRepositoryMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.stageId !== input.stageId ||
    !isV2CanonicalSeasonPlanV2(input.plan)
  )
    fail("v2_firebase_voice_profile_repository_handle_invalid");
  return value;
}
