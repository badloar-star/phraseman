import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceAudioEpisodeReceiptV1,
  type V2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  V2_VOICE_NATIVE_DECODER_PAGE_MAX_ITEMS_V1,
  isV2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderDeviceClassV1,
  type V2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderPageRowV1,
  type V2VoiceNativeDecoderPlatformV1,
} from "./v2_voice_native_decoder_page_receipt_v1";

export const V2_VOICE_NATIVE_DECODER_EPISODE_RECEIPT_SCHEMA_V1 =
  "v2-voice-native-decoder-episode-receipt.v1" as const;
export const V2_VOICE_NATIVE_DECODER_EPISODE_MAX_PAGES_V1 = 1_404;
export const V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1 = 512 * 1024;

export interface V2VoiceNativeDecoderEpisodePageV1 {
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly pageReceiptFingerprint: string;
  readonly orderedRowAggregateFingerprint: string;
  readonly pageFingerprint: string;
}

export interface V2VoiceNativeDecoderEpisodeReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_NATIVE_DECODER_EPISODE_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioEpisodeReceiptFingerprint: string;
  readonly platform: V2VoiceNativeDecoderPlatformV1;
  readonly deviceClass: V2VoiceNativeDecoderDeviceClassV1;
  readonly osVersion: string;
  readonly appBuildFingerprint: string;
  readonly expoAudioVersion: "1.1.1";
  readonly nativeDecoderFamily: "avplayer" | "exoplayer";
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly pages: readonly V2VoiceNativeDecoderEpisodePageV1[];
  readonly orderedPageAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly decoderEvidenceAuthority: "unverified_serialized_device_observation";
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
  throw new Error("v2_voice_native_decoder_episode_receipt_invalid");
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
      if (current.length > V2_VOICE_NATIVE_DECODER_EPISODE_MAX_PAGES_V1) fail();
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

export function materializeV2VoiceNativeDecoderEpisodeReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly pages: readonly V2VoiceNativeDecoderPageReceiptV1[];
}): V2VoiceNativeDecoderEpisodeReceiptV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2VoiceAudioEpisodeReceiptV1(input.audioEpisodeReceipt) ||
    input.audioEpisodeReceipt.manifestFingerprint !==
      input.manifest.manifestFingerprint ||
    input.audioEpisodeReceipt.audioObjectCount !==
      input.manifest.audioObjectCount ||
    !Array.isArray(input.pages) ||
    input.pages.length < 1 ||
    input.pages.length > V2_VOICE_NATIVE_DECODER_EPISODE_MAX_PAGES_V1 ||
    input.pages.length !==
      Math.ceil(
        input.manifest.audioObjectCount /
          V2_VOICE_NATIVE_DECODER_PAGE_MAX_ITEMS_V1,
      ) ||
    input.pages.some((page) => !isV2VoiceNativeDecoderPageReceiptV1(page))
  )
    fail();

  const first = input.pages[0]!;
  const firstRow = first.rows[0]!;
  let expectedStart = 0;
  const pageRows = Object.freeze(
    input.pages.map((page, index) => {
      const expectedNext =
        index === input.pages.length - 1
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
        page.pageStartIndex !== expectedStart ||
        page.pageItemCount !== page.rows.length ||
        page.pageItemCount < 1 ||
        page.nextPageStartIndex !== expectedNext ||
        page.rows.some(
          (row: V2VoiceNativeDecoderPageRowV1) =>
            row.platform !== first.platform ||
            row.deviceClass !== first.deviceClass ||
            row.osVersion !== firstRow.osVersion ||
            row.appBuildFingerprint !== firstRow.appBuildFingerprint ||
            row.expoAudioVersion !== firstRow.expoAudioVersion ||
            row.nativeDecoderFamily !== firstRow.nativeDecoderFamily,
        )
      )
        fail();
      expectedStart += page.pageItemCount;
      const body = {
        pageStartIndex: page.pageStartIndex,
        pageItemCount: page.pageItemCount,
        nextPageStartIndex: page.nextPageStartIndex,
        pageReceiptFingerprint: page.receiptFingerprint,
        orderedRowAggregateFingerprint: page.orderedRowAggregateFingerprint,
      };
      return Object.freeze({
        ...body,
        pageFingerprint: hashCanonicalBody(body),
      });
    }),
  );
  if (expectedStart !== input.manifest.audioObjectCount) fail();

  const body = {
    schemaVersion: V2_VOICE_NATIVE_DECODER_EPISODE_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint:
      input.audioEpisodeReceipt.receiptFingerprint,
    platform: first.platform,
    deviceClass: first.deviceClass,
    osVersion: firstRow.osVersion,
    appBuildFingerprint: firstRow.appBuildFingerprint,
    expoAudioVersion: firstRow.expoAudioVersion,
    nativeDecoderFamily: firstRow.nativeDecoderFamily,
    audioObjectCount: input.manifest.audioObjectCount,
    pageCount: pageRows.length,
    pages: pageRows,
    orderedPageAggregateFingerprint: hashCanonicalBody(
      pageRows.map((page) => page.pageFingerprint),
    ),
    repositoryOriginAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    decoderEvidenceAuthority:
      "unverified_serialized_device_observation" as const,
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
    V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function parseV2VoiceNativeDecoderEpisodeReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly audioEpisodeReceipt: V2VoiceAudioEpisodeReceiptV1;
  readonly pages: readonly V2VoiceNativeDecoderPageReceiptV1[];
}): V2VoiceNativeDecoderEpisodeReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1
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
  const rebuilt = materializeV2VoiceNativeDecoderEpisodeReceiptV1({
    manifest: input.manifest,
    audioEpisodeReceipt: input.audioEpisodeReceipt,
    pages: input.pages,
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}

export function isV2VoiceNativeDecoderEpisodeReceiptV1(
  value: unknown,
): value is V2VoiceNativeDecoderEpisodeReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
