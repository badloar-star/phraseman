import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import { LEARNING_V2_PCM_SIGNAL_POLICY_V1 } from "../../../modules/learning-v2/runtime/voice_pcm_signal_observer_v1";
import {
  isV2VoiceAudioEpisodeReceiptV1,
  type V2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  isV2VoiceNativeDecoderEpisodeReceiptV1,
  type V2VoiceNativeDecoderEpisodeReceiptV1,
} from "./v2_voice_native_decoder_episode_receipt_v1";
import {
  V2_VOICE_PCM_SIGNAL_PAGE_MAX_ITEMS_V1,
  isV2VoicePcmSignalPageReceiptV1,
  type V2VoicePcmSignalPageReceiptV1,
  type V2VoicePcmSignalPageRowV1,
} from "./v2_voice_pcm_signal_page_receipt_v1";

export const V2_VOICE_PCM_SIGNAL_EPISODE_RECEIPT_SCHEMA_V1 =
  "v2-voice-pcm-signal-episode-receipt.v1" as const;
export const V2_VOICE_PCM_SIGNAL_EPISODE_MAX_PAGES_V1 = 1_404;
export const V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1 = 640 * 1024;

export interface V2VoicePcmSignalEpisodePageV1 {
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly decoderPageReceiptFingerprint: string;
  readonly signalPageReceiptFingerprint: string;
  readonly orderedSignalRowAggregateFingerprint: string;
  readonly blockingSignalItemCount: number;
  readonly pageDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly pageFingerprint: string;
}

export interface V2VoicePcmSignalEpisodeReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_PCM_SIGNAL_EPISODE_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly decoderEpisodeReceiptFingerprint: string;
  readonly signalPolicyRef: typeof LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref;
  readonly platform: "ios" | "android";
  readonly deviceClass: "physical_device" | "simulator_or_emulator";
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly expoAudioVersion: "1.1.1";
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly blockingSignalItemCount: number;
  readonly pages: readonly V2VoicePcmSignalEpisodePageV1[];
  readonly orderedPageAggregateFingerprint: string;
  readonly episodeDisposition:
    | "candidate_for_human_listening"
    | "blocked_signal_quality"
    | "blocked_nonphysical_device";
  readonly pcmSourceBindingAuthority: "unverified_serialized_device_observation";
  readonly signalMetricAuthority: "deterministic_pcm16_metrics_only";
  readonly noiseEvidenceAuthority: "none";
  readonly speechCorrectnessAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_pcm_signal_episode_receipt_invalid");
}

function preflightJson(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 50_000 || depth > 32) fail();
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
      if (current.length > V2_VOICE_PCM_SIGNAL_EPISODE_MAX_PAGES_V1) fail();
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

export function materializeV2VoicePcmSignalEpisodeReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly decoderEpisodeReceipt: V2VoiceNativeDecoderEpisodeReceiptV1;
  readonly signalPages: readonly V2VoicePcmSignalPageReceiptV1[];
}): V2VoicePcmSignalEpisodeReceiptV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2VoiceAudioEpisodeReceiptV1(input.audioEpisodeReceipt) ||
    !isV2VoiceNativeDecoderEpisodeReceiptV1(input.decoderEpisodeReceipt) ||
    input.audioEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.decoderEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.decoderEpisodeReceipt.audioEpisodeReceiptFingerprint !==
      input.audioEpisodeReceipt.receiptFingerprint ||
    input.decoderEpisodeReceipt.audioObjectCount !==
      input.manifest.audioObjectCount ||
    !Array.isArray(input.signalPages) ||
    input.signalPages.length < 1 ||
    input.signalPages.length > V2_VOICE_PCM_SIGNAL_EPISODE_MAX_PAGES_V1 ||
    input.signalPages.length !== input.decoderEpisodeReceipt.pages.length ||
    input.signalPages.length !==
      Math.ceil(
        input.manifest.audioObjectCount / V2_VOICE_PCM_SIGNAL_PAGE_MAX_ITEMS_V1,
      ) ||
    input.signalPages.some((page) => !isV2VoicePcmSignalPageReceiptV1(page))
  )
    fail();

  const first = input.signalPages[0]!;
  let expectedStart = 0;
  let blockingSignalItemCount = 0;
  const pages = Object.freeze(
    input.signalPages.map((page, index) => {
      const decoderPage = input.decoderEpisodeReceipt.pages[index]!;
      const expectedNext =
        index === input.signalPages.length - 1
          ? null
          : page.pageStartIndex + page.pageItemCount;
      if (
        page.planFingerprint !== input.manifest.planFingerprint ||
        page.stageId !== input.manifest.stageId ||
        page.episodeId !== input.manifest.episodeId ||
        page.manifestFingerprint !== input.manifest.manifestFingerprint ||
        page.audioEpisodeReceiptFingerprint !==
          input.audioEpisodeReceipt.receiptFingerprint ||
        page.platform !== first.platform ||
        page.deviceClass !== first.deviceClass ||
        page.osVersion !== first.osVersion ||
        page.appBuildFingerprint !== first.appBuildFingerprint ||
        page.expoAudioVersion !== first.expoAudioVersion ||
        page.pageStartIndex !== expectedStart ||
        page.pageItemCount !== page.rows.length ||
        page.pageItemCount < 1 ||
        page.nextPageStartIndex !== expectedNext ||
        decoderPage.pageStartIndex !== page.pageStartIndex ||
        decoderPage.pageItemCount !== page.pageItemCount ||
        decoderPage.nextPageStartIndex !== page.nextPageStartIndex ||
        decoderPage.pageReceiptFingerprint !==
          page.decoderPageReceiptFingerprint ||
        page.rows.some(
          (row: V2VoicePcmSignalPageRowV1) =>
            row.platform !== first.platform ||
            row.deviceClass !== first.deviceClass ||
            row.osVersion !== first.osVersion ||
            row.appBuildFingerprint !== first.appBuildFingerprint ||
            row.expoAudioVersion !== first.expoAudioVersion,
        )
      )
        fail();
      expectedStart += page.pageItemCount;
      blockingSignalItemCount += page.blockingSignalItemCount;
      const body = {
        pageStartIndex: page.pageStartIndex,
        pageItemCount: page.pageItemCount,
        nextPageStartIndex: page.nextPageStartIndex,
        decoderPageReceiptFingerprint: page.decoderPageReceiptFingerprint,
        signalPageReceiptFingerprint: page.receiptFingerprint,
        orderedSignalRowAggregateFingerprint:
          page.orderedRowAggregateFingerprint,
        blockingSignalItemCount: page.blockingSignalItemCount,
        pageDisposition: page.pageDisposition,
      };
      return Object.freeze({
        ...body,
        pageFingerprint: hashCanonicalBody(body),
      });
    }),
  );
  if (expectedStart !== input.manifest.audioObjectCount) fail();

  const episodeDisposition =
    first.deviceClass !== "physical_device"
      ? ("blocked_nonphysical_device" as const)
      : blockingSignalItemCount > 0
        ? ("blocked_signal_quality" as const)
        : ("candidate_for_human_listening" as const);
  const body = {
    schemaVersion: V2_VOICE_PCM_SIGNAL_EPISODE_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      input.audioEpisodeReceipt.receiptFingerprint,
    decoderEpisodeReceiptFingerprint:
      input.decoderEpisodeReceipt.receiptFingerprint,
    signalPolicyRef: LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref,
    platform: first.platform,
    deviceClass: first.deviceClass,
    osVersion: first.osVersion,
    appBuildFingerprint: first.appBuildFingerprint,
    expoAudioVersion: first.expoAudioVersion,
    audioObjectCount: input.manifest.audioObjectCount,
    pageCount: pages.length,
    blockingSignalItemCount,
    pages,
    orderedPageAggregateFingerprint: hashCanonicalBody(
      pages.map((page) => page.pageFingerprint),
    ),
    episodeDisposition,
    pcmSourceBindingAuthority:
      "unverified_serialized_device_observation" as const,
    signalMetricAuthority: "deterministic_pcm16_metrics_only" as const,
    noiseEvidenceAuthority: "none" as const,
    speechCorrectnessAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function parseV2VoicePcmSignalEpisodeReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly decoderEpisodeReceipt: V2VoiceNativeDecoderEpisodeReceiptV1;
  readonly signalPages: readonly V2VoicePcmSignalPageReceiptV1[];
}): V2VoicePcmSignalEpisodeReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_PCM_SIGNAL_EPISODE_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(input.raw);
  } catch {
    fail();
  }
  preflightJson(decoded);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    Array.isArray(decoded) ||
    canonicalJsonV1(decoded) !== input.raw
  )
    fail();
  const rebuilt = materializeV2VoicePcmSignalEpisodeReceiptV1({
    manifest: input.manifest,
    audioEpisodeReceipt: input.audioEpisodeReceipt,
    decoderEpisodeReceipt: input.decoderEpisodeReceipt,
    signalPages: input.signalPages,
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}

export function isV2VoicePcmSignalEpisodeReceiptV1(
  value: unknown,
): value is V2VoicePcmSignalEpisodeReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
