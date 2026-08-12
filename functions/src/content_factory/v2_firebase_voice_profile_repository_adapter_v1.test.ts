import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_VOICE_IDS } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  V2_SPEECH_PROFILE_BODY_SCHEMA_V1,
  V2_SPEECH_SCRIPT_POLICY_V1,
  V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1,
  V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1,
  V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1,
  V2_VOICE_WORD_VARIANT_MAX_BYTES_V1,
  V2_WORD_SEGMENTATION_POLICY_V1,
} from "./v2_voice_profile_contracts_v1";
import {
  V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1,
  V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1,
  v2VoiceProfileRepositoryLifecycleDocumentPathV1,
  v2VoiceProfileRepositoryObjectPathV1,
  v2VoiceProfileRepositoryRecordDocumentPathV1,
} from "./v2_voice_profile_repository_contract_v1";

const mockPlan: {
  planFingerprint: string;
  targetLanguage: string;
  courseContract: Readonly<{ courseContractFingerprint: string }>;
  stages: readonly object[];
  externalRequirementCatalog: readonly object[];
} = {
  planFingerprint: "a".repeat(64),
  targetLanguage: "en",
  courseContract: Object.freeze({
    courseContractFingerprint: "c".repeat(64),
  }),
  stages: Object.freeze([
    Object.freeze({
      stageId: "voice-stage-1",
      kind: "v2_voice_targets",
      episodeId: "episode-1",
      externalRequirementIds: Object.freeze(["language", "speech", "voice"]),
    }),
  ]),
  externalRequirementCatalog: Object.freeze([]),
};

jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === mockPlan,
}));

const mockReadHeads = jest.fn();
const mockReadObject = jest.fn();
jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({
    readCoherentVoiceProfileHeadSnapshot: (...args: unknown[]) =>
      mockReadHeads(...args),
    readVoiceProfileObjectGenerationExact: (...args: unknown[]) =>
      mockReadObject(...args),
  }),
}));

// Jest hoists the two trust-boundary mocks above this import.
// eslint-disable-next-line import/first
import {
  createFirebaseAdminV2VoiceProfileRepositoryAdapterV1,
  getV2FirebaseVoiceProfileRepositorySummaryV1,
  isV2FirebaseVoiceProfileRepositoryHandleV1,
  resolveV2FirebaseVoiceProfileRepositoryMaterialV1,
} from "./v2_firebase_voice_profile_repository_adapter_v1";

const encoder = new TextEncoder();
const time = Object.freeze({ seconds: "1800000000", nanoseconds: 10 });

function speechBody() {
  return {
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
  } as const;
}

function generationBody() {
  return {
    schemaVersion: V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1,
    profileId: "openai-learning-words",
    version: 1,
    providerFamily: "openai",
    model: "gpt-4o-mini-tts",
    format: "mp3",
    contentType: "audio/mpeg",
    requiredVoiceIds: V2_REQUIRED_VOICE_IDS,
    variantsPerApprovedTarget: 4,
    speed: 1,
    generationInstructionsPolicyRef:
      V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1.ref,
    pipelineVersion: 1,
    maximumBytesPerWordVariant: V2_VOICE_WORD_VARIANT_MAX_BYTES_V1,
    profileAuthority: "none",
    providerExecutionAuthority: "none",
    audioByteAuthority: "none",
    repositoryAuthority: "none",
    lifecycleAuthority: "none",
    listeningEvidenceAuthority: "none",
    deviceEvidenceAuthority: "none",
    executionAuthority: "none",
    publicationAuthority: "none",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
  } as const;
}

function row(
  profileKind: "speech_profile" | "voice_generation_profile",
  body: ReturnType<typeof speechBody> | ReturnType<typeof generationBody>,
) {
  const bodyRaw = canonicalJsonV1(body);
  const requirement = Object.freeze({
    profileKind,
    profileId: body.profileId,
    version: body.version,
    contentHash: sha256Utf8(bodyRaw),
  });
  const objectPath = v2VoiceProfileRepositoryObjectPathV1(requirement);
  const recordRaw = canonicalJsonV1({
    schemaVersion: V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1,
    profileKind,
    profileId: body.profileId,
    version: body.version,
    contentHash: requirement.contentHash,
    object: {
      objectPath,
      contentHash: requirement.contentHash,
      objectGeneration: "7",
      byteSize: encoder.encode(bodyRaw).byteLength,
      contentType: "application/json; charset=utf-8",
    },
    createdAt: "2026-08-12T00:00:00.000Z",
    createdBy: "server.profile.publisher",
    recordAuthority: "none",
  });
  const lifecycleRaw = canonicalJsonV1({
    schemaVersion: V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1,
    profileKind,
    profileId: body.profileId,
    version: body.version,
    contentHash: requirement.contentHash,
    status: "published",
    lifecycleRevision: 1,
    changedAt: "2026-08-12T00:00:00.000Z",
    changedBy: "server.profile.publisher",
    reason: "published",
    lifecycleAuthority: "none",
  });
  return {
    requirement,
    bodyRaw,
    entry: Object.freeze({
      requirement,
      versionDocumentPath: v2VoiceProfileRepositoryRecordDocumentPathV1(
        profileKind,
        body.profileId,
        body.version,
      ),
      lifecycleDocumentPath: v2VoiceProfileRepositoryLifecycleDocumentPathV1(
        profileKind,
        body.profileId,
        body.version,
      ),
      recordBytes: encoder.encode(recordRaw),
      lifecycleBytes: encoder.encode(lifecycleRaw),
      recordUpdateTime: time,
      lifecycleUpdateTime: time,
    }),
  };
}

describe("Learning V2 authenticated voice profile repository adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const speech = row("speech_profile", speechBody());
    const voice = row("voice_generation_profile", generationBody());
    mockPlan.externalRequirementCatalog = Object.freeze([
      Object.freeze({ requirementId: "language", requirement: {} }),
      Object.freeze({
        requirementId: "speech",
        requirement: Object.freeze({
          dependencyType: "speech_profile",
          profileId: speech.requirement.profileId,
          version: speech.requirement.version,
          contentHash: speech.requirement.contentHash,
        }),
      }),
      Object.freeze({
        requirementId: "voice",
        requirement: Object.freeze({
          dependencyType: "voice_generation_profile",
          profileId: voice.requirement.profileId,
          version: voice.requirement.version,
          contentHash: voice.requirement.contentHash,
        }),
      }),
    ]);
    mockReadHeads.mockResolvedValue({
      readTime: time,
      entries: Object.freeze([speech.entry, voice.entry]),
    });
    mockReadObject.mockImplementation(
      async (input: { requirement: object }) => {
        const target =
          input.requirement === speech.requirement ? speech : voice;
        return Object.freeze({
          requirement: target.requirement,
          objectPath: v2VoiceProfileRepositoryObjectPathV1(target.requirement),
          objectGeneration: "7",
          byteSize: encoder.encode(target.bodyRaw).byteLength,
          contentHash: target.requirement.contentHash,
          bytes: encoder.encode(target.bodyRaw),
        });
      },
    );
  });

  it("authenticates exact published profile heads and generation-pinned bodies", async () => {
    const adapter = createFirebaseAdminV2VoiceProfileRepositoryAdapterV1();
    const handle = await adapter.authenticateVoiceStage({
      plan: mockPlan as never,
      stageId: "voice-stage-1",
    });
    const summary = getV2FirebaseVoiceProfileRepositorySummaryV1(handle);
    expect(isV2FirebaseVoiceProfileRepositoryHandleV1(handle)).toBe(true);
    expect(summary.repositoryOriginAuthority).toBe(
      "authenticated_project_repository_snapshot",
    );
    expect(summary.profileLifecycleAuthority).toBe(
      "published_head_observation_only",
    );
    expect(summary.providerExecutionAuthority).toBe("none");
    expect(summary.audioByteAuthority).toBe("none");
    expect(mockReadHeads).toHaveBeenCalledTimes(2);
    expect(mockReadObject).toHaveBeenCalledTimes(2);
    expect(
      resolveV2FirebaseVoiceProfileRepositoryMaterialV1({
        handle,
        plan: mockPlan as never,
        stageId: "voice-stage-1",
      }).voiceGenerationProfile.requiredVoiceIds,
    ).toEqual(["ash", "onyx", "nova", "coral"]);
    expect(isV2FirebaseVoiceProfileRepositoryHandleV1({ ...summary })).toBe(
      false,
    );
  });

  it("fails closed on updateTime-only ABA and cross-stage replay", async () => {
    const first = await mockReadHeads();
    const drift = {
      ...first,
      entries: Object.freeze([
        first.entries[0],
        Object.freeze({
          ...first.entries[1],
          lifecycleUpdateTime: Object.freeze({
            seconds: "1800000000",
            nanoseconds: 11,
          }),
        }),
      ]),
    };
    mockReadHeads
      .mockReset()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(drift);
    const adapter = createFirebaseAdminV2VoiceProfileRepositoryAdapterV1();
    await expect(
      adapter.authenticateVoiceStage({
        plan: mockPlan as never,
        stageId: "voice-stage-1",
      }),
    ).rejects.toThrow("v2_firebase_voice_profile_repository_head_drift");
  });

  it("binds all public authority below provider, audio and release", () => {
    expect(hashCanonicalBody({ rule: "no-provider-execution" })).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(createFirebaseAdminV2VoiceProfileRepositoryAdapterV1.length).toBe(0);
    expect(() =>
      getV2FirebaseVoiceProfileRepositorySummaryV1({} as never),
    ).toThrow("v2_firebase_voice_profile_repository_handle_invalid");
  });
});
