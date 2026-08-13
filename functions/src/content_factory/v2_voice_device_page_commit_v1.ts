import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { type V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_VOICE_DEVICE_PAGE_COMMIT_SCHEMA_V1 =
  "v2-voice-device-page-commit.v1" as const;
export const V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1 = 32 * 1024;

export interface V2VoiceDevicePageCommitV1 {
  readonly schemaVersion: typeof V2_VOICE_DEVICE_PAGE_COMMIT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly stableProjectionFingerprint: string;
  readonly evidenceFingerprint: string;
  readonly pageRunFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly decoderPageReceiptFingerprint: string;
  readonly decoderPageReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pcmPageReceiptFingerprint: string;
  readonly pcmPageReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pcmPageDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly commitAuthority: "durable_page_receipt_pin_mapping_only";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly commitFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8" as const;
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_device_page_commit_invalid");
}

function exactPin(
  value: V2RepositoryImmutableObjectPinV1,
  receiptKind: "decoder-page" | "pcm-page",
  planFingerprint: string,
  manifestFingerprint: string,
  receiptFingerprint: string,
): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).sort().join("|") ===
      [
        "byteSize",
        "contentHash",
        "contentType",
        "objectGeneration",
        "objectPath",
      ]
        .sort()
        .join("|") &&
    value.objectPath.startsWith(
      `learning-v2/voice-device-receipts/${planFingerprint}/`,
    ) &&
    value.objectPath.includes(`/${manifestFingerprint}/${receiptKind}/`) &&
    value.objectPath.includes(`/${receiptFingerprint}/`) &&
    HASH_RE.test(value.contentHash) &&
    value.objectPath.endsWith(`/${value.contentHash}.json`) &&
    GENERATION_RE.test(value.objectGeneration) &&
    Number.isSafeInteger(value.byteSize) &&
    value.byteSize > 0 &&
    value.byteSize <= 160 * 1024 &&
    value.contentType === JSON_CONTENT_TYPE
  );
}

export function materializeV2VoiceDevicePageCommitV1(
  input: Omit<
    V2VoiceDevicePageCommitV1,
    | "schemaVersion"
    | "commitAuthority"
    | "listeningEvidenceAuthority"
    | "deviceEvidenceAuthority"
    | "publicationAuthority"
    | "runtimeConsumer"
    | "releaseEligible"
    | "releaseAuthority"
    | "commitFingerprint"
  >,
): V2VoiceDevicePageCommitV1 {
  if (
    !HASH_RE.test(input.planFingerprint) ||
    !STAGE_RE.test(input.stageId) ||
    !STAGE_RE.test(input.episodeId) ||
    !HASH_RE.test(input.manifestFingerprint) ||
    !HASH_RE.test(input.audioEpisodeReceiptFingerprint) ||
    !HASH_RE.test(input.stableProjectionFingerprint) ||
    !HASH_RE.test(input.evidenceFingerprint) ||
    !HASH_RE.test(input.pageRunFingerprint) ||
    !HASH_RE.test(input.decoderPageReceiptFingerprint) ||
    !HASH_RE.test(input.pcmPageReceiptFingerprint) ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0 ||
    !Number.isSafeInteger(input.pageItemCount) ||
    input.pageItemCount < 1 ||
    input.pageItemCount > 32 ||
    (input.nextPageStartIndex !== null &&
      input.nextPageStartIndex !==
        input.pageStartIndex + input.pageItemCount) ||
    !["ios", "android"].includes(input.platform) ||
    !["physical_device", "simulator_or_emulator"].includes(input.deviceClass) ||
    !TOKEN_RE.test(input.osVersion) ||
    !HASH_RE.test(input.appBuildFingerprint) ||
    !exactPin(
      input.decoderPageReceiptPin,
      "decoder-page",
      input.planFingerprint,
      input.manifestFingerprint,
      input.decoderPageReceiptFingerprint,
    ) ||
    !exactPin(
      input.pcmPageReceiptPin,
      "pcm-page",
      input.planFingerprint,
      input.manifestFingerprint,
      input.pcmPageReceiptFingerprint,
    ) ||
    ![
      "candidate_for_human_listening",
      "blocked_signal_quality",
      "blocked_nonphysical_device",
    ].includes(input.pcmPageDisposition)
  )
    fail();
  const body = {
    schemaVersion: V2_VOICE_DEVICE_PAGE_COMMIT_SCHEMA_V1,
    ...input,
    commitAuthority: "durable_page_receipt_pin_mapping_only" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    commitFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function parseV2VoiceDevicePageCommitV1(
  raw: string,
): V2VoiceDevicePageCommitV1 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_VOICE_DEVICE_PAGE_COMMIT_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    canonicalJsonV1(value) !== raw
  )
    fail();
  const candidate = value as V2VoiceDevicePageCommitV1;
  if (
    candidate.schemaVersion !== V2_VOICE_DEVICE_PAGE_COMMIT_SCHEMA_V1 ||
    candidate.commitAuthority !== "durable_page_receipt_pin_mapping_only" ||
    candidate.listeningEvidenceAuthority !== "none" ||
    candidate.deviceEvidenceAuthority !== "none" ||
    candidate.publicationAuthority !== "none" ||
    candidate.runtimeConsumer !== false ||
    candidate.releaseEligible !== false ||
    candidate.releaseAuthority !== false
  )
    fail();
  const {
    schemaVersion: _schema,
    commitAuthority: _commitAuthority,
    listeningEvidenceAuthority: _listening,
    deviceEvidenceAuthority: _device,
    publicationAuthority: _publication,
    runtimeConsumer: _runtime,
    releaseEligible: _eligible,
    releaseAuthority: _release,
    commitFingerprint: _fingerprint,
    ...input
  } = candidate;
  const rebuilt = materializeV2VoiceDevicePageCommitV1(input);
  if (canonicalJsonV1(rebuilt) !== raw) fail();
  return rebuilt;
}

export function isV2VoiceDevicePageCommitV1(
  value: unknown,
): value is V2VoiceDevicePageCommitV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
