import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_VOICE_IDS } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import {
  V2_SPEECH_PROFILE_BODY_SCHEMA_V1,
  V2_SPEECH_SCRIPT_POLICY_V1,
  V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1,
  V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1,
  V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1,
  V2_VOICE_PROFILE_BODY_MAX_BYTES_V1,
  V2_VOICE_WORD_VARIANT_MAX_BYTES_V1,
  V2_WORD_SEGMENTATION_POLICY_V1,
  isV2SpeechProfileBodyV1,
  isV2VoiceGenerationProfileBodyV1,
  parseV2SpeechProfileBodyV1,
  parseV2VoiceGenerationProfileBodyV1,
  v2SpeechProfileRefV1,
  v2VoiceGenerationProfileRefV1,
} from "./v2_voice_profile_contracts_v1";

function speechFixture() {
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

function generationFixture() {
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

describe("Learning V2 pure voice profile bodies", () => {
  it("brands detached canonical speech and four-voice generation profiles", () => {
    const speech = parseV2SpeechProfileBodyV1(canonicalJsonV1(speechFixture()));
    const generation = parseV2VoiceGenerationProfileBodyV1(
      canonicalJsonV1(generationFixture()),
    );

    expect(isV2SpeechProfileBodyV1(speech)).toBe(true);
    expect(isV2VoiceGenerationProfileBodyV1(generation)).toBe(true);
    expect(isV2SpeechProfileBodyV1({ ...speech })).toBe(false);
    expect(isV2VoiceGenerationProfileBodyV1({ ...generation })).toBe(false);
    expect(generation.requiredVoiceIds).toEqual([
      "ash",
      "onyx",
      "nova",
      "coral",
    ]);
    expect(v2SpeechProfileRefV1(speech)).toEqual({
      profileId: speech.profileId,
      version: speech.version,
      contentHash: hashCanonicalBody(speech),
    });
    expect(v2VoiceGenerationProfileRefV1(generation)).toEqual({
      profileId: generation.profileId,
      version: generation.version,
      contentHash: hashCanonicalBody(generation),
    });
    expect(Object.isFrozen(speech)).toBe(true);
    expect(Object.isFrozen(generation.requiredVoiceIds)).toBe(true);
  });

  it("fails closed on locale mismatch, policy drift and authority escalation", () => {
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({ ...speechFixture(), speechLocale: "fr-FR" }),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({
          ...speechFixture(),
          sourceNormalizationRef: {
            ...V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1.ref,
            contentHash: "a".repeat(64),
          },
        }),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    expect(() =>
      parseV2VoiceGenerationProfileBodyV1(
        canonicalJsonV1({
          ...generationFixture(),
          providerExecutionAuthority: "provider_called",
        }),
      ),
    ).toThrow("v2_voice_generation_profile_body_invalid");
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({
          ...speechFixture(),
          targetLanguage: "es-419",
          speechLocale: "es-ES",
        }),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({
          ...speechFixture(),
          targetLanguage: "es-419",
          speechLocale: "es-419",
        }),
      ),
    ).not.toThrow();
  });

  it("requires exact Ash/Onyx/Nova/Coral order and code-owned model settings", () => {
    for (const mutation of [
      { requiredVoiceIds: ["ash", "onyx", "nova"] },
      { requiredVoiceIds: ["coral", "nova", "onyx", "ash"] },
      { requiredVoiceIds: ["ash", "onyx", "nova", "coral", "alloy"] },
      { model: "tts-1" },
      { speed: 0.9 },
      { format: "wav" },
    ]) {
      expect(() =>
        parseV2VoiceGenerationProfileBodyV1(
          canonicalJsonV1({ ...generationFixture(), ...mutation }),
        ),
      ).toThrow("v2_voice_generation_profile_body_invalid");
    }
  });

  it("rejects secrets, provider endpoints, unknown keys and noncanonical bytes", () => {
    for (const secretKey of [
      "apiKey",
      "authorization",
      "endpoint",
      "organizationId",
      "projectId",
      "signedUrl",
    ]) {
      expect(() =>
        parseV2VoiceGenerationProfileBodyV1(
          canonicalJsonV1({
            ...generationFixture(),
            [secretKey]: "must-never-enter-profile",
          }),
        ),
      ).toThrow("v2_voice_generation_profile_body_invalid");
    }
    expect(() =>
      parseV2SpeechProfileBodyV1(JSON.stringify(speechFixture())),
    ).toThrow("v2_speech_profile_body_invalid_noncanonical");
  });

  it("bounds locale subtags, canonical complexity, unsafe numeric values and bytes", () => {
    const tooManySubtags = `en${"-AA".repeat(16)}`;
    expect(tooManySubtags.length).toBeLessThan(255);
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({
          ...speechFixture(),
          targetLanguage: tooManySubtags,
          speechLocale: tooManySubtags,
        }),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    for (const profileId of ["Speech-EN", "speech:en", "x".repeat(129)]) {
      expect(() =>
        parseV2SpeechProfileBodyV1(
          canonicalJsonV1({ ...speechFixture(), profileId }),
        ),
      ).toThrow("v2_speech_profile_body_invalid");
    }
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({ ...speechFixture(), version: 1_000_001 }),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    expect(() =>
      parseV2VoiceGenerationProfileBodyV1(
        canonicalJsonV1({ ...generationFixture(), version: 1_000_001 }),
      ),
    ).toThrow("v2_voice_generation_profile_body_invalid");
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1({
          ...speechFixture(),
          version: Number.MAX_SAFE_INTEGER + 1,
        }),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    expect(() =>
      parseV2SpeechProfileBodyV1(
        canonicalJsonV1(speechFixture()).replace('"version":1', '"version":-0'),
      ),
    ).toThrow("v2_speech_profile_body_invalid");
    expect(() =>
      parseV2SpeechProfileBodyV1(
        `{"padding":"${"x".repeat(V2_VOICE_PROFILE_BODY_MAX_BYTES_V1)}"}`,
      ),
    ).toThrow("v2_speech_profile_body_invalid");
  });
});
