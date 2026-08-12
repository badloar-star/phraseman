import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_VOICE_PROFILE_BODY_MAX_BYTES_V1,
  isV2SpeechProfileBodyV1,
  isV2VoiceGenerationProfileBodyV1,
  parseV2SpeechProfileBodyV1,
  parseV2VoiceGenerationProfileBodyV1,
  type V2SpeechProfileBodyV1,
  type V2VoiceGenerationProfileBodyV1,
} from "./v2_voice_profile_contracts_v1";

export const V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1 =
  "v2-voice-profile-repository-record.v1" as const;
export const V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1 =
  "v2-voice-profile-repository-lifecycle.v1" as const;
export const V2_VOICE_PROFILE_REPOSITORY_OBSERVATION_SCHEMA_V1 =
  "v2-voice-profile-repository-observation.v1" as const;
export const V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1 = 64 * 1024;
export const V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1 = 32 * 1024;

export const V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1 = Object.freeze({
  schemaVersion: "v2-voice-profile-repository-namespace.v1" as const,
  firestore: Object.freeze({
    speechVersions: "content_speech_profile_versions" as const,
    speechLifecycle: "content_speech_profile_lifecycle" as const,
    generationVersions: "content_voice_generation_profile_versions" as const,
    generationLifecycle: "content_voice_generation_profile_lifecycle" as const,
  }),
  storage: Object.freeze({
    speechPrefix: "content-studio/speech-profiles" as const,
    generationPrefix: "content-studio/voice-generation-profiles" as const,
  }),
  recordAuthority: "none" as const,
  lifecycleAuthority: "none" as const,
  storageAuthority: "none" as const,
});
export const V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1);

export type V2VoiceProfileRepositoryKindV1 =
  | "speech_profile"
  | "voice_generation_profile";

export interface V2VoiceProfileRepositoryObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}

export interface V2VoiceProfileRepositoryRecordV1 {
  readonly schemaVersion: typeof V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1;
  readonly profileKind: V2VoiceProfileRepositoryKindV1;
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
  readonly object: V2VoiceProfileRepositoryObjectPinV1;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly recordAuthority: "none";
}

export interface V2VoiceProfileRepositoryLifecycleV1 {
  readonly schemaVersion: typeof V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1;
  readonly profileKind: V2VoiceProfileRepositoryKindV1;
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
  readonly status: "published";
  readonly lifecycleRevision: number;
  readonly changedAt: string;
  readonly changedBy: string;
  readonly reason: string;
  readonly lifecycleAuthority: "none";
}

export interface V2VoiceProfileRepositoryObservationV1 {
  readonly schemaVersion: typeof V2_VOICE_PROFILE_REPOSITORY_OBSERVATION_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly profileKind: V2VoiceProfileRepositoryKindV1;
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
  readonly recordDocumentPath: string;
  readonly lifecycleDocumentPath: string;
  readonly objectPin: V2VoiceProfileRepositoryObjectPinV1;
  readonly recordFingerprint: string;
  readonly lifecycleFingerprint: string;
  readonly bodyFingerprint: string;
  readonly recordOriginAuthority: "none";
  readonly lifecycleAuthority: "none";
  readonly storageAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly observationFingerprint: string;
}

const ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:@-]{0,159}$/;
const records = new WeakSet<object>();
const lifecycles = new WeakSet<object>();
const observations = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function parseCanonical(raw: string, maximum: number, code: string) {
  if (
    typeof raw !== "string" ||
    raw.length > maximum ||
    utf8ByteLengthV1(raw) > maximum
  )
    fail(code);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail(code);
  }
  if (!isRecord(value) || canonicalJsonV1(value) !== raw) fail(code);
  return value;
}

function identity(
  input: Readonly<{
    profileKind: V2VoiceProfileRepositoryKindV1;
    profileId: string;
    version: number;
    contentHash: string;
  }>,
) {
  if (
    (input.profileKind !== "speech_profile" &&
      input.profileKind !== "voice_generation_profile") ||
    !ID_RE.test(input.profileId) ||
    !Number.isSafeInteger(input.version) ||
    input.version < 1 ||
    input.version > 1_000_000 ||
    !HASH_RE.test(input.contentHash)
  )
    fail("v2_voice_profile_repository_identity_invalid");
  return input;
}

function documentId(profileId: string, version: number): string {
  return `${sha256Utf8(profileId)}__v${version}`;
}

export function v2VoiceProfileRepositoryRecordDocumentPathV1(
  profileKind: V2VoiceProfileRepositoryKindV1,
  profileId: string,
  version: number,
): string {
  identity({ profileKind, profileId, version, contentHash: "0".repeat(64) });
  const root =
    profileKind === "speech_profile"
      ? V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.speechVersions
      : V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.generationVersions;
  return `${root}/${documentId(profileId, version)}`;
}

export function v2VoiceProfileRepositoryLifecycleDocumentPathV1(
  profileKind: V2VoiceProfileRepositoryKindV1,
  profileId: string,
  version: number,
): string {
  identity({ profileKind, profileId, version, contentHash: "0".repeat(64) });
  const root =
    profileKind === "speech_profile"
      ? V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.speechLifecycle
      : V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.firestore.generationLifecycle;
  return `${root}/${documentId(profileId, version)}`;
}

export function v2VoiceProfileRepositoryObjectPathV1(
  input: Readonly<{
    profileKind: V2VoiceProfileRepositoryKindV1;
    profileId: string;
    version: number;
    contentHash: string;
  }>,
): string {
  identity(input);
  const root =
    input.profileKind === "speech_profile"
      ? V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.storage.speechPrefix
      : V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_V1.storage.generationPrefix;
  return `${root}/${sha256Utf8(input.profileId)}/v${input.version}/${input.contentHash}.json`;
}

export function parseV2VoiceProfileRepositoryRecordV1(
  raw: string,
): V2VoiceProfileRepositoryRecordV1 {
  const value = parseCanonical(
    raw,
    V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1,
    "v2_voice_profile_repository_record_invalid",
  );
  if (
    !exactKeys(value, [
      "schemaVersion",
      "profileKind",
      "profileId",
      "version",
      "contentHash",
      "object",
      "createdAt",
      "createdBy",
      "recordAuthority",
    ]) ||
    !isRecord(value.object) ||
    !exactKeys(value.object, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
      "contentType",
    ])
  )
    fail("v2_voice_profile_repository_record_invalid");
  const candidate = value as unknown as V2VoiceProfileRepositoryRecordV1;
  identity(candidate);
  const expectedPath = v2VoiceProfileRepositoryObjectPathV1(candidate);
  if (
    candidate.schemaVersion !== V2_VOICE_PROFILE_REPOSITORY_RECORD_SCHEMA_V1 ||
    candidate.object.objectPath !== expectedPath ||
    candidate.object.contentHash !== candidate.contentHash ||
    !GENERATION_RE.test(candidate.object.objectGeneration) ||
    !Number.isSafeInteger(candidate.object.byteSize) ||
    candidate.object.byteSize < 2 ||
    candidate.object.byteSize > V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 ||
    candidate.object.contentType !== "application/json; charset=utf-8" ||
    !ISO_RE.test(candidate.createdAt) ||
    !TOKEN_RE.test(candidate.createdBy) ||
    candidate.recordAuthority !== "none"
  )
    fail("v2_voice_profile_repository_record_invalid");
  Object.freeze(candidate.object);
  Object.freeze(candidate);
  records.add(candidate);
  return candidate;
}

export function parseV2VoiceProfileRepositoryLifecycleV1(
  raw: string,
): V2VoiceProfileRepositoryLifecycleV1 {
  const value = parseCanonical(
    raw,
    V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
    "v2_voice_profile_repository_lifecycle_invalid",
  );
  if (
    !exactKeys(value, [
      "schemaVersion",
      "profileKind",
      "profileId",
      "version",
      "contentHash",
      "status",
      "lifecycleRevision",
      "changedAt",
      "changedBy",
      "reason",
      "lifecycleAuthority",
    ])
  )
    fail("v2_voice_profile_repository_lifecycle_invalid");
  const candidate = value as unknown as V2VoiceProfileRepositoryLifecycleV1;
  identity(candidate);
  if (
    candidate.schemaVersion !==
      V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_SCHEMA_V1 ||
    candidate.status !== "published" ||
    !Number.isSafeInteger(candidate.lifecycleRevision) ||
    candidate.lifecycleRevision < 1 ||
    !ISO_RE.test(candidate.changedAt) ||
    !TOKEN_RE.test(candidate.changedBy) ||
    typeof candidate.reason !== "string" ||
    candidate.reason.length < 1 ||
    candidate.reason.length > 500 ||
    candidate.lifecycleAuthority !== "none"
  )
    fail("v2_voice_profile_repository_lifecycle_invalid");
  Object.freeze(candidate);
  lifecycles.add(candidate);
  return candidate;
}

export function observeV2VoiceProfileRepositoryClaimV1(
  input: Readonly<{
    record: V2VoiceProfileRepositoryRecordV1;
    lifecycle: V2VoiceProfileRepositoryLifecycleV1;
    bodyRaw: string;
  }>,
): Readonly<{
  observation: V2VoiceProfileRepositoryObservationV1;
  body: V2SpeechProfileBodyV1 | V2VoiceGenerationProfileBodyV1;
}> {
  if (!records.has(input.record) || !lifecycles.has(input.lifecycle))
    fail("v2_voice_profile_repository_claim_untrusted");
  if (
    canonicalJsonV1({
      profileKind: input.record.profileKind,
      profileId: input.record.profileId,
      version: input.record.version,
      contentHash: input.record.contentHash,
    }) !==
      canonicalJsonV1({
        profileKind: input.lifecycle.profileKind,
        profileId: input.lifecycle.profileId,
        version: input.lifecycle.version,
        contentHash: input.lifecycle.contentHash,
      }) ||
    utf8ByteLengthV1(input.bodyRaw) !== input.record.object.byteSize ||
    sha256Utf8(input.bodyRaw) !== input.record.contentHash
  )
    fail("v2_voice_profile_repository_claim_mismatch");
  const body =
    input.record.profileKind === "speech_profile"
      ? parseV2SpeechProfileBodyV1(input.bodyRaw)
      : parseV2VoiceGenerationProfileBodyV1(input.bodyRaw);
  if (
    (!isV2SpeechProfileBodyV1(body) &&
      !isV2VoiceGenerationProfileBodyV1(body)) ||
    body.profileId !== input.record.profileId ||
    body.version !== input.record.version
  )
    fail("v2_voice_profile_repository_body_mismatch");
  const observationBody = {
    schemaVersion: V2_VOICE_PROFILE_REPOSITORY_OBSERVATION_SCHEMA_V1,
    namespaceFingerprint: V2_VOICE_PROFILE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
    profileKind: input.record.profileKind,
    profileId: input.record.profileId,
    version: input.record.version,
    contentHash: input.record.contentHash,
    recordDocumentPath: v2VoiceProfileRepositoryRecordDocumentPathV1(
      input.record.profileKind,
      input.record.profileId,
      input.record.version,
    ),
    lifecycleDocumentPath: v2VoiceProfileRepositoryLifecycleDocumentPathV1(
      input.record.profileKind,
      input.record.profileId,
      input.record.version,
    ),
    objectPin: input.record.object,
    recordFingerprint: hashCanonicalBody(input.record),
    lifecycleFingerprint: hashCanonicalBody(input.lifecycle),
    bodyFingerprint: hashCanonicalBody(body),
    recordOriginAuthority: "none" as const,
    lifecycleAuthority: "none" as const,
    storageAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const observation = Object.freeze({
    ...observationBody,
    observationFingerprint: hashCanonicalBody(observationBody),
  });
  observations.add(observation);
  return Object.freeze({ observation, body });
}

export const isV2VoiceProfileRepositoryObservationV1 = (
  value: unknown,
): value is V2VoiceProfileRepositoryObservationV1 =>
  typeof value === "object" && value !== null && observations.has(value);
