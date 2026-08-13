import { hashCanonicalBody } from "../policies/decision_registry";

export const LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1 =
  "learning-v2-voice-audio-device-episode-upload-ack.v1" as const;

export interface LearningV2VoiceAudioDeviceEpisodeUploadAckV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly orderedPageCommitAggregateFingerprint: string;
  readonly decoderEpisodeReceiptFingerprint: string;
  readonly pcmEpisodeReceiptFingerprint: string;
  readonly pcmEpisodeDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly receiptPersistenceResult: "generation_pinned_exact_readback";
  readonly receiptAuthority: "none_serialized_server_acknowledgement";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly acknowledgementFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;

function fail(): never {
  throw new Error("learning_v2_voice_audio_device_episode_upload_ack_invalid");
}

export function materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1(
  input: Omit<
    LearningV2VoiceAudioDeviceEpisodeUploadAckV1,
    | "schemaVersion"
    | "receiptPersistenceResult"
    | "receiptAuthority"
    | "listeningEvidenceAuthority"
    | "deviceEvidenceAuthority"
    | "publicationAuthority"
    | "runtimeConsumer"
    | "releaseEligible"
    | "releaseAuthority"
    | "acknowledgementFingerprint"
  >,
): LearningV2VoiceAudioDeviceEpisodeUploadAckV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    !HASH_RE.test(input.manifestFingerprint) ||
    !HASH_RE.test(input.audioEpisodeReceiptFingerprint) ||
    !["ios", "android"].includes(input.platform) ||
    !["physical_device", "simulator_or_emulator"].includes(input.deviceClass) ||
    !TOKEN_RE.test(input.osVersion) ||
    !HASH_RE.test(input.appBuildFingerprint) ||
    !Number.isSafeInteger(input.audioObjectCount) ||
    input.audioObjectCount < 1 ||
    !Number.isSafeInteger(input.pageCount) ||
    input.pageCount < 1 ||
    input.pageCount > 1_404 ||
    !HASH_RE.test(input.orderedPageCommitAggregateFingerprint) ||
    !HASH_RE.test(input.decoderEpisodeReceiptFingerprint) ||
    !HASH_RE.test(input.pcmEpisodeReceiptFingerprint) ||
    ![
      "candidate_for_human_listening",
      "blocked_signal_quality",
      "blocked_nonphysical_device",
    ].includes(input.pcmEpisodeDisposition)
  )
    fail();
  const body = {
    schemaVersion: LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1,
    ...input,
    receiptPersistenceResult: "generation_pinned_exact_readback" as const,
    receiptAuthority: "none_serialized_server_acknowledgement" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  return Object.freeze({
    ...body,
    acknowledgementFingerprint: hashCanonicalBody(body),
  });
}

export function parseLearningV2VoiceAudioDeviceEpisodeUploadAckV1(
  value: unknown,
): LearningV2VoiceAudioDeviceEpisodeUploadAckV1 {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail();
  const candidate = value as LearningV2VoiceAudioDeviceEpisodeUploadAckV1;
  if (
    Object.keys(candidate).sort().join("|") !==
      [
        "acknowledgementFingerprint",
        "appBuildFingerprint",
        "audioEpisodeReceiptFingerprint",
        "audioObjectCount",
        "decoderEpisodeReceiptFingerprint",
        "deviceClass",
        "deviceEvidenceAuthority",
        "listeningEvidenceAuthority",
        "manifestFingerprint",
        "orderedPageCommitAggregateFingerprint",
        "osVersion",
        "pageCount",
        "pcmEpisodeDisposition",
        "pcmEpisodeReceiptFingerprint",
        "platform",
        "publicationAuthority",
        "receiptAuthority",
        "receiptPersistenceResult",
        "releaseAuthority",
        "releaseEligible",
        "runtimeConsumer",
        "schemaVersion",
      ]
        .sort()
        .join("|") ||
    candidate.schemaVersion !==
      LEARNING_V2_VOICE_AUDIO_DEVICE_EPISODE_UPLOAD_ACK_SCHEMA_V1 ||
    candidate.receiptPersistenceResult !== "generation_pinned_exact_readback" ||
    candidate.receiptAuthority !== "none_serialized_server_acknowledgement" ||
    candidate.listeningEvidenceAuthority !== "none" ||
    candidate.deviceEvidenceAuthority !== "none" ||
    candidate.publicationAuthority !== "none" ||
    candidate.runtimeConsumer !== false ||
    candidate.releaseEligible !== false ||
    candidate.releaseAuthority !== false
  )
    fail();
  const rebuilt = materializeLearningV2VoiceAudioDeviceEpisodeUploadAckV1({
    manifestFingerprint: candidate.manifestFingerprint,
    audioEpisodeReceiptFingerprint: candidate.audioEpisodeReceiptFingerprint,
    platform: candidate.platform,
    deviceClass: candidate.deviceClass,
    osVersion: candidate.osVersion,
    appBuildFingerprint: candidate.appBuildFingerprint,
    audioObjectCount: candidate.audioObjectCount,
    pageCount: candidate.pageCount,
    orderedPageCommitAggregateFingerprint:
      candidate.orderedPageCommitAggregateFingerprint,
    decoderEpisodeReceiptFingerprint:
      candidate.decoderEpisodeReceiptFingerprint,
    pcmEpisodeReceiptFingerprint: candidate.pcmEpisodeReceiptFingerprint,
    pcmEpisodeDisposition: candidate.pcmEpisodeDisposition,
  });
  if (
    rebuilt.acknowledgementFingerprint !== candidate.acknowledgementFingerprint
  )
    fail();
  return rebuilt;
}
