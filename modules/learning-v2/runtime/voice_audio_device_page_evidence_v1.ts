import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { type LearningV2NativeDecoderObservationV1 } from "./voice_native_decoder_observer_v1";
import { type LearningV2PcmSignalObservationV1 } from "./voice_pcm_signal_observer_v1";

export const LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1 =
  "learning-v2-voice-audio-device-page-evidence.v1" as const;
export const LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1 =
  384 * 1024;
export const LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1 = 32;

export interface LearningV2VoiceAudioDevicePageEvidenceV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly audioPageReceiptFingerprint: string;
  readonly stableProjectionFingerprint: string;
  readonly pageRunFingerprint: string;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly nativeDecoderObservations: readonly LearningV2NativeDecoderObservationV1[];
  readonly pcmSignalObservations: readonly LearningV2PcmSignalObservationV1[];
  readonly orderedNativeObservationAggregateFingerprint: string;
  readonly orderedPcmObservationAggregateFingerprint: string;
  readonly uploadPurpose: "private_qa_receipt_assembly_only";
  readonly transportUrlRetention: "forbidden";
  readonly rawAudioRetention: "forbidden";
  readonly rawPcmRetention: "forbidden";
  readonly learnerDataRetention: "forbidden";
  readonly repositoryOriginAuthority: "none";
  readonly decoderEvidenceAuthority: "unverified_serialized_device_observation";
  readonly signalMetricAuthority: "deterministic_pcm16_metrics_only";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly evidenceFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,64}$/u;
const TOP_LEVEL_KEYS = Object.freeze([
  "appBuildFingerprint",
  "audioEpisodeReceiptFingerprint",
  "audioPageReceiptFingerprint",
  "decoderEvidenceAuthority",
  "deviceClass",
  "deviceEvidenceAuthority",
  "evidenceFingerprint",
  "humanApprovalAuthority",
  "learnerDataRetention",
  "listeningEvidenceAuthority",
  "manifestFingerprint",
  "nativeDecoderObservations",
  "nextPageStartIndex",
  "orderedNativeObservationAggregateFingerprint",
  "orderedPcmObservationAggregateFingerprint",
  "osVersion",
  "pageItemCount",
  "pageRunFingerprint",
  "pageStartIndex",
  "pcmSignalObservations",
  "platform",
  "publicationAuthority",
  "rawAudioRetention",
  "rawPcmRetention",
  "releaseAuthority",
  "releaseEligible",
  "repositoryOriginAuthority",
  "runtimeConsumer",
  "schemaVersion",
  "signalMetricAuthority",
  "stableProjectionFingerprint",
  "transportUrlRetention",
  "uploadPurpose",
] as const);

function fail(): never {
  throw new Error("learning_v2_voice_audio_device_page_evidence_invalid");
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  return Object.keys(value).sort().join("|") === [...expected].sort().join("|");
}

function preflightJson(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 20_000 || depth > 32) fail();
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    )
      continue;
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current) || Object.is(current, -0)) fail();
      continue;
    }
    if (typeof current !== "object") fail();
    if (Array.isArray(current)) {
      if (
        current.length >
        LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1
      )
        fail();
      for (const item of current) stack.push([item, depth + 1]);
      continue;
    }
    if (Object.getPrototypeOf(current) !== Object.prototype) fail();
    const keys = Object.keys(current as Record<string, unknown>);
    if (keys.length > 64) fail();
    for (const key of keys) {
      if (key === "__proto__" || key === "prototype" || key === "constructor")
        fail();
      stack.push([(current as Record<string, unknown>)[key], depth + 1]);
    }
  }
}

export function parseLearningV2VoiceAudioDevicePageEvidenceV1(
  raw: string,
): LearningV2VoiceAudioDevicePageEvidenceV1 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail();
  }
  preflightJson(decoded);
  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    Object.getPrototypeOf(decoded) !== Object.prototype ||
    canonicalJsonV1(decoded) !== raw
  )
    fail();
  const value = decoded as Record<string, unknown>;
  if (
    !exactKeys(value, TOP_LEVEL_KEYS) ||
    value.schemaVersion !==
      LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_SCHEMA_V1 ||
    !HASH_RE.test(String(value.manifestFingerprint)) ||
    !HASH_RE.test(String(value.audioEpisodeReceiptFingerprint)) ||
    !HASH_RE.test(String(value.audioPageReceiptFingerprint)) ||
    !HASH_RE.test(String(value.stableProjectionFingerprint)) ||
    !HASH_RE.test(String(value.pageRunFingerprint)) ||
    !Number.isSafeInteger(value.pageStartIndex) ||
    Number(value.pageStartIndex) < 0 ||
    !Number.isSafeInteger(value.pageItemCount) ||
    Number(value.pageItemCount) < 1 ||
    Number(value.pageItemCount) >
      LEARNING_V2_VOICE_AUDIO_DEVICE_PAGE_EVIDENCE_MAX_ITEMS_V1 ||
    !Array.isArray(value.nativeDecoderObservations) ||
    !Array.isArray(value.pcmSignalObservations) ||
    value.nativeDecoderObservations.length !== value.pageItemCount ||
    value.pcmSignalObservations.length !== value.pageItemCount ||
    !["ios", "android"].includes(String(value.platform)) ||
    !["physical_device", "simulator_or_emulator"].includes(
      String(value.deviceClass),
    ) ||
    !TOKEN_RE.test(String(value.osVersion)) ||
    !HASH_RE.test(String(value.appBuildFingerprint)) ||
    value.uploadPurpose !== "private_qa_receipt_assembly_only" ||
    value.transportUrlRetention !== "forbidden" ||
    value.rawAudioRetention !== "forbidden" ||
    value.rawPcmRetention !== "forbidden" ||
    value.learnerDataRetention !== "forbidden" ||
    value.repositoryOriginAuthority !== "none" ||
    value.decoderEvidenceAuthority !==
      "unverified_serialized_device_observation" ||
    value.signalMetricAuthority !== "deterministic_pcm16_metrics_only" ||
    value.listeningEvidenceAuthority !== "none" ||
    value.deviceEvidenceAuthority !== "none" ||
    value.humanApprovalAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.runtimeConsumer !== false ||
    value.releaseEligible !== false ||
    value.releaseAuthority !== false
  )
    fail();
  if (
    value.orderedNativeObservationAggregateFingerprint !==
      hashCanonicalBody(
        value.nativeDecoderObservations.map((observation) =>
          hashCanonicalBody(observation),
        ),
      ) ||
    value.orderedPcmObservationAggregateFingerprint !==
      hashCanonicalBody(
        value.pcmSignalObservations.map(
          (observation) =>
            (observation as Record<string, unknown>).observationFingerprint,
        ),
      )
  )
    fail();
  const body = { ...value };
  delete body.evidenceFingerprint;
  if (value.evidenceFingerprint !== hashCanonicalBody(body)) fail();
  return Object.freeze(
    value as unknown as LearningV2VoiceAudioDevicePageEvidenceV1,
  );
}
