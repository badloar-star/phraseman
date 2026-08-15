import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_SPEECH_PROFILE_BODY_SCHEMA_V1,
  V2_SPEECH_SCRIPT_POLICY_V1,
  V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1,
  V2_WORD_SEGMENTATION_POLICY_V1,
} from "./v2_voice_profile_contracts_v1";
import {
  V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1,
  V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1,
  isV2VoiceProfileRepositoryObservationV1,
  observeV2VoiceProfileRepositoryClaimV1,
  parseV2VoiceProfileRepositoryLifecycleV1,
  parseV2VoiceProfileRepositoryRecordV1,
  v2VoiceProfileRepositoryLifecycleDocumentPathV1,
  v2VoiceProfileRepositoryObjectPathV1,
  v2VoiceProfileRepositoryRecordDocumentPathV1,
} from "./v2_voice_profile_repository_contract_v1";

function bodyRaw() {
  return canonicalJsonV1({
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
  });
}

function fixture() {
  const raw = bodyRaw();
  const contentHash = sha256Utf8(raw);
  const record = parseV2VoiceProfileRepositoryRecordV1(
    canonicalJsonV1({
      schemaVersion: V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1,
      profileKind: "speech_profile",
      profileId: "speech-en-us",
      version: 1,
      contentHash,
      object: {
        objectPath: v2VoiceProfileRepositoryObjectPathV1({
          profileKind: "speech_profile",
          profileId: "speech-en-us",
          version: 1,
          contentHash,
        }),
        contentHash,
        objectGeneration: "17",
        byteSize: utf8ByteLengthV1(raw),
        contentType: "application/json; charset=utf-8",
      },
      createdAt: "2026-08-12T10:00:00.000Z",
      createdBy: "content-owner",
      recordAuthority: "none",
    }),
  );
  const lifecycle = parseV2VoiceProfileRepositoryLifecycleV1(
    canonicalJsonV1({
      schemaVersion: V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1,
      profileKind: "speech_profile",
      profileId: "speech-en-us",
      version: 1,
      contentHash,
      status: "published",
      lifecycleRevision: 2,
      changedAt: "2026-08-12T10:01:00.000Z",
      changedBy: "content-owner",
      reason: "approved for repository observation",
      lifecycleAuthority: "none",
    }),
  );
  return { raw, contentHash, record, lifecycle };
}

describe("Learning V2 structural voice-profile repository contract", () => {
  it("binds exact documents, published lifecycle and canonical object bytes with zero authority", () => {
    const value = fixture();
    const result = observeV2VoiceProfileRepositoryClaimV1({
      record: value.record,
      lifecycle: value.lifecycle,
      bodyRaw: value.raw,
    });
    expect(isV2VoiceProfileRepositoryObservationV1(result.observation)).toBe(
      true,
    );
    expect(
      isV2VoiceProfileRepositoryObservationV1({ ...result.observation }),
    ).toBe(false);
    expect(result.observation).toMatchObject({
      profileKind: "speech_profile",
      contentHash: value.contentHash,
      recordOriginAuthority: "none",
      lifecycleAuthority: "none",
      storageAuthority: "none",
      providerExecutionAuthority: "none",
      audioByteAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(
      v2VoiceProfileRepositoryRecordDocumentPathV1(
        "speech_profile",
        "speech-en-us",
        1,
      ),
    ).toMatch(/^content_speech_profile_versions\/[a-f0-9]{64}__v1$/);
    expect(
      v2VoiceProfileRepositoryLifecycleDocumentPathV1(
        "speech_profile",
        "speech-en-us",
        1,
      ),
    ).toMatch(/^content_speech_profile_lifecycle\/[a-f0-9]{64}__v1$/);
  });

  it("rejects lifecycle, path, generation, hash, size, bytes and authority drift", () => {
    const value = fixture();
    const baseRecord = JSON.parse(canonicalJsonV1(value.record)) as Record<
      string,
      unknown
    >;
    const baseLifecycle = JSON.parse(
      canonicalJsonV1(value.lifecycle),
    ) as Record<string, unknown>;
    for (const mutate of [
      (record: Record<string, unknown>) => {
        (record.object as Record<string, unknown>).objectPath += "/wrong";
      },
      (record: Record<string, unknown>) => {
        (record.object as Record<string, unknown>).objectGeneration = "0";
      },
      (record: Record<string, unknown>) => {
        (record.object as Record<string, unknown>).byteSize = 1;
      },
      (record: Record<string, unknown>) => {
        record.recordAuthority = "repository";
      },
    ]) {
      const changed = JSON.parse(canonicalJsonV1(baseRecord));
      mutate(changed);
      expect(() =>
        parseV2VoiceProfileRepositoryRecordV1(canonicalJsonV1(changed)),
      ).toThrow("v2_voice_profile_repository_record_invalid");
    }
    const draft = { ...baseLifecycle, status: "draft" };
    expect(() =>
      parseV2VoiceProfileRepositoryLifecycleV1(canonicalJsonV1(draft)),
    ).toThrow("v2_voice_profile_repository_lifecycle_invalid");
    expect(() =>
      observeV2VoiceProfileRepositoryClaimV1({
        record: value.record,
        lifecycle: value.lifecycle,
        bodyRaw: `${value.raw} `,
      }),
    ).toThrow("v2_voice_profile_repository_claim_mismatch");
  });
});
