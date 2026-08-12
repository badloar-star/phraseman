import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_REQUIRED_VOICE_IDS } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import { v2ExactLanguageTagsCompatibleV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";

export const V2_SPEECH_PROFILE_BODY_SCHEMA_V1 =
  "v2-speech-profile-body.v1" as const;
export const V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1 =
  "v2-voice-generation-profile-body.v1" as const;
export const V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 = 64 * 1024;
export const V2_VOICE_WORD_VARIANT_MAX_BYTES_V1 = 64 * 1024;

const sourceNormalizationPolicyBody = Object.freeze({
  schemaVersion: "v2-speech-source-normalization-policy.v1" as const,
  policyId: "canonical-nfc-source-without-implicit-rewrite" as const,
  version: 1 as const,
  unicodeNormalization: "NFC" as const,
  trimOrCaseFoldAuthoredSource: false as const,
  interfaceLocaleIsDuplicationAxis: false as const,
});

const wordSegmentationPolicyBody = Object.freeze({
  schemaVersion: "v2-word-segmentation-policy.v1" as const,
  policyId: "explicit-author-owned-word-boundaries" as const,
  version: 1 as const,
  inferWordsFromLearnerOptions: false as const,
  requireOrdinalDistinctRepeatedWords: true as const,
  splitGraphemeClusters: false as const,
});

const speechScriptPolicyBody = Object.freeze({
  schemaVersion: "v2-speech-script-policy.v1" as const,
  policyId: "locale-compatible-plain-text-only" as const,
  version: 1 as const,
  allowSsml: false as const,
  allowXml: false as const,
  allowControlOrBidiOverrideCharacters: false as const,
});

const generationInstructionsPolicyBody = Object.freeze({
  schemaVersion: "v2-voice-generation-instructions-policy.v1" as const,
  policyId: "clear-neutral-learning-pronunciation" as const,
  version: 1 as const,
  instructions:
    "Clear natural learning pronunciation; preserve authored words and punctuation; do not add commentary.",
  instructionsAuthority: "code_owned_exact_text" as const,
});

const ref = <T extends { readonly policyId: string; readonly version: number }>(
  body: T,
) =>
  Object.freeze({
    policyId: body.policyId,
    version: body.version,
    contentHash: hashCanonicalBody(body),
  });

export const V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1 = Object.freeze({
  body: sourceNormalizationPolicyBody,
  ref: ref(sourceNormalizationPolicyBody),
});
export const V2_WORD_SEGMENTATION_POLICY_V1 = Object.freeze({
  body: wordSegmentationPolicyBody,
  ref: ref(wordSegmentationPolicyBody),
});
export const V2_SPEECH_SCRIPT_POLICY_V1 = Object.freeze({
  body: speechScriptPolicyBody,
  ref: ref(speechScriptPolicyBody),
});
export const V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1 = Object.freeze({
  body: generationInstructionsPolicyBody,
  ref: ref(generationInstructionsPolicyBody),
});

export interface V2SpeechProfileBodyV1 {
  readonly schemaVersion: typeof V2_SPEECH_PROFILE_BODY_SCHEMA_V1;
  readonly profileId: string;
  readonly version: number;
  readonly targetLanguage: string;
  readonly speechLocale: string;
  readonly sourceNormalizationRef: typeof V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1.ref;
  readonly wordSegmentationRef: typeof V2_WORD_SEGMENTATION_POLICY_V1.ref;
  readonly scriptPolicyRef: typeof V2_SPEECH_SCRIPT_POLICY_V1.ref;
  readonly profileAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly lifecycleAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2VoiceGenerationProfileBodyV1 {
  readonly schemaVersion: typeof V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1;
  readonly profileId: string;
  readonly version: number;
  readonly providerFamily: "openai";
  readonly model: "gpt-4o-mini-tts";
  readonly format: "mp3";
  readonly contentType: "audio/mpeg";
  readonly requiredVoiceIds: typeof V2_REQUIRED_VOICE_IDS;
  readonly variantsPerApprovedTarget: 4;
  readonly speed: 1;
  readonly generationInstructionsPolicyRef: typeof V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1.ref;
  readonly pipelineVersion: 1;
  readonly maximumBytesPerWordVariant: typeof V2_VOICE_WORD_VARIANT_MAX_BYTES_V1;
  readonly profileAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly lifecycleAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
}

export interface V2VoiceProfileRefV1 {
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
}

interface V2VoicePolicyRefV1 {
  readonly policyId: string;
  readonly version: number;
  readonly contentHash: string;
}

const speechHandles = new WeakSet<object>();
const generationHandles = new WeakSet<object>();
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const CONTROL_OR_BIDI_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;

const SPEECH_KEYS = [
  "executionAuthority",
  "lifecycleAuthority",
  "profileAuthority",
  "profileId",
  "publicationAuthority",
  "releaseAuthority",
  "releaseEligible",
  "repositoryAuthority",
  "runtimeConsumer",
  "schemaVersion",
  "scriptPolicyRef",
  "sourceNormalizationRef",
  "speechLocale",
  "targetLanguage",
  "version",
  "wordSegmentationRef",
] as const;
const GENERATION_KEYS = [
  "audioByteAuthority",
  "contentType",
  "deviceEvidenceAuthority",
  "executionAuthority",
  "format",
  "generationInstructionsPolicyRef",
  "lifecycleAuthority",
  "listeningEvidenceAuthority",
  "maximumBytesPerWordVariant",
  "model",
  "pipelineVersion",
  "profileAuthority",
  "profileId",
  "providerExecutionAuthority",
  "providerFamily",
  "publicationAuthority",
  "releaseAuthority",
  "releaseEligible",
  "repositoryAuthority",
  "requiredVoiceIds",
  "runtimeConsumer",
  "schemaVersion",
  "speed",
  "variantsPerApprovedTarget",
  "version",
] as const;
const REF_KEYS = ["contentHash", "policyId", "version"] as const;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(
  value: unknown,
  keys: readonly string[],
  code: string,
): void {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join("|") !== [...keys].sort().join("|")
  )
    fail(code);
}

function preflight(value: unknown, code: string): void {
  const work: { readonly value: unknown; readonly depth: number }[] = [
    { value, depth: 0 },
  ];
  let nodes = 0;
  while (work.length > 0) {
    const current = work.pop() as { value: unknown; depth: number };
    nodes += 1;
    if (nodes > 512 || current.depth > 16) fail(code);
    if (typeof current.value === "string") {
      if (
        current.value.length > 1000 ||
        current.value.normalize("NFC") !== current.value ||
        CONTROL_OR_BIDI_RE.test(current.value)
      )
        fail(code);
      continue;
    }
    if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail(code);
      continue;
    }
    if (Array.isArray(current.value)) {
      if (current.value.length > 32) fail(code);
      current.value.forEach((child) =>
        work.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (current.value !== null && typeof current.value === "object") {
      if (!isRecord(current.value)) fail(code);
      const currentRecord = current.value;
      const keys = Object.keys(currentRecord);
      if (
        keys.length > 64 ||
        keys.some(
          (key) =>
            RESERVED_KEYS.has(key) ||
            key.normalize("NFC") !== key ||
            CONTROL_OR_BIDI_RE.test(key),
        )
      )
        fail(code);
      keys.forEach((key) =>
        work.push({ value: currentRecord[key], depth: current.depth + 1 }),
      );
    }
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function parseRaw(raw: string, code: string): unknown {
  if (
    typeof raw !== "string" ||
    raw.length > V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_VOICE_PROFILE_BODY_MAX_BYTES_V1
  )
    fail(code);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail(code);
  }
  preflight(value, code);
  if (canonicalJsonV1(value) !== raw) fail(`${code}_noncanonical`);
  return value;
}

function exactRef(value: unknown, expected: V2VoicePolicyRefV1): boolean {
  if (!isRecord(value)) return false;
  exactKeys(value, REF_KEYS, "v2_voice_profile_policy_ref_invalid");
  return (
    value.policyId === expected.policyId &&
    value.version === expected.version &&
    value.contentHash === expected.contentHash
  );
}

function exactProfileIdentity(value: Record<string, unknown>): boolean {
  return (
    typeof value.profileId === "string" &&
    TOKEN_RE.test(value.profileId) &&
    Number.isSafeInteger(value.version) &&
    Number(value.version) > 0 &&
    Number(value.version) <= 1_000_000
  );
}

const PROFILE_AUTHORITY = Object.freeze({
  profileAuthority: "none" as const,
  repositoryAuthority: "none" as const,
  lifecycleAuthority: "none" as const,
  executionAuthority: "none" as const,
  publicationAuthority: "none" as const,
  runtimeConsumer: false as const,
  releaseEligible: false as const,
  releaseAuthority: false as const,
});

export function parseV2SpeechProfileBodyV1(raw: string): V2SpeechProfileBodyV1 {
  const value = parseRaw(raw, "v2_speech_profile_body_invalid");
  exactKeys(value, SPEECH_KEYS, "v2_speech_profile_body_invalid");
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== V2_SPEECH_PROFILE_BODY_SCHEMA_V1 ||
    !exactProfileIdentity(candidate) ||
    typeof candidate.targetLanguage !== "string" ||
    typeof candidate.speechLocale !== "string" ||
    !v2ExactLanguageTagsCompatibleV1(
      candidate.targetLanguage,
      candidate.speechLocale,
    ) ||
    !exactRef(
      candidate.sourceNormalizationRef,
      V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1.ref,
    ) ||
    !exactRef(
      candidate.wordSegmentationRef,
      V2_WORD_SEGMENTATION_POLICY_V1.ref,
    ) ||
    !exactRef(candidate.scriptPolicyRef, V2_SPEECH_SCRIPT_POLICY_V1.ref) ||
    Object.entries(PROFILE_AUTHORITY).some(
      ([key, expected]) => candidate[key] !== expected,
    )
  )
    fail("v2_speech_profile_body_invalid");
  const result = deepFreeze(value) as V2SpeechProfileBodyV1;
  speechHandles.add(result);
  return result;
}

export function parseV2VoiceGenerationProfileBodyV1(
  raw: string,
): V2VoiceGenerationProfileBodyV1 {
  const value = parseRaw(raw, "v2_voice_generation_profile_body_invalid");
  exactKeys(value, GENERATION_KEYS, "v2_voice_generation_profile_body_invalid");
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1 ||
    !exactProfileIdentity(candidate) ||
    candidate.providerFamily !== "openai" ||
    candidate.model !== "gpt-4o-mini-tts" ||
    candidate.format !== "mp3" ||
    candidate.contentType !== "audio/mpeg" ||
    canonicalJsonV1(candidate.requiredVoiceIds) !==
      canonicalJsonV1(V2_REQUIRED_VOICE_IDS) ||
    candidate.variantsPerApprovedTarget !== 4 ||
    candidate.speed !== 1 ||
    !exactRef(
      candidate.generationInstructionsPolicyRef,
      V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1.ref,
    ) ||
    candidate.pipelineVersion !== 1 ||
    candidate.maximumBytesPerWordVariant !==
      V2_VOICE_WORD_VARIANT_MAX_BYTES_V1 ||
    Object.entries(PROFILE_AUTHORITY).some(
      ([key, expected]) => candidate[key] !== expected,
    ) ||
    candidate.providerExecutionAuthority !== "none" ||
    candidate.audioByteAuthority !== "none" ||
    candidate.listeningEvidenceAuthority !== "none" ||
    candidate.deviceEvidenceAuthority !== "none"
  )
    fail("v2_voice_generation_profile_body_invalid");
  const result = deepFreeze(value) as V2VoiceGenerationProfileBodyV1;
  generationHandles.add(result);
  return result;
}

export const isV2SpeechProfileBodyV1 = (
  value: unknown,
): value is V2SpeechProfileBodyV1 =>
  typeof value === "object" && value !== null && speechHandles.has(value);

export const isV2VoiceGenerationProfileBodyV1 = (
  value: unknown,
): value is V2VoiceGenerationProfileBodyV1 =>
  typeof value === "object" && value !== null && generationHandles.has(value);

export const v2SpeechProfileRefV1 = (
  body: V2SpeechProfileBodyV1,
): V2VoiceProfileRefV1 => {
  if (!isV2SpeechProfileBodyV1(body)) fail("v2_speech_profile_body_untrusted");
  return Object.freeze({
    profileId: body.profileId,
    version: body.version,
    contentHash: hashCanonicalBody(body),
  });
};

export const v2VoiceGenerationProfileRefV1 = (
  body: V2VoiceGenerationProfileBodyV1,
): V2VoiceProfileRefV1 => {
  if (!isV2VoiceGenerationProfileBodyV1(body))
    fail("v2_voice_generation_profile_body_untrusted");
  return Object.freeze({
    profileId: body.profileId,
    version: body.version,
    contentHash: hashCanonicalBody(body),
  });
};
