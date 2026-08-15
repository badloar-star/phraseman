import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import type { V2VoiceAudioPageReceiptV1 } from "./v2_voice_audio_page_receipt_v1";

export const V2_VOICE_AUDIO_EPISODE_RECEIPT_SCHEMA_V1 =
  "v2-voice-audio-episode-receipt.v1" as const;
export const V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_PAGES_V1 = 1_404;
// 1,404 maximum-size page rows are ~1.3 MiB with exact content-addressed paths.
// Keep the receipt bounded but large enough for every contract-valid episode.
export const V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1 = 2 * 1024 * 1024;

export interface V2VoiceAudioEpisodeReceiptPageV1 {
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly pageReceiptFingerprint: string;
  readonly pageReceiptPin: V2RepositoryImmutableObjectPinV1;
  readonly pageAudioReadbackAggregateFingerprint: string;
  readonly pageFingerprint: string;
}

export interface V2VoiceAudioEpisodeReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_AUDIO_EPISODE_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly audioObjectCount: number;
  readonly pageCount: number;
  readonly pages: readonly V2VoiceAudioEpisodeReceiptPageV1[];
  readonly orderedPageAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly codecEvidenceAuthority: "unverified_serialized_claim";
  readonly decoderEvidenceAuthority: "none";
  readonly artifactStorageAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface V2VoiceAudioEpisodePageEvidenceV1 {
  readonly receipt: V2VoiceAudioPageReceiptV1;
  readonly receiptPin: V2RepositoryImmutableObjectPinV1;
  readonly audioReadbackAggregateFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_audio_episode_receipt_invalid");
}

function preflightJson(value: unknown): void {
  const stack: (readonly [unknown, number])[] = [[value, 0]];
  let nodes = 0;
  while (stack.length > 0) {
    const [current, depth] = stack.pop()!;
    nodes += 1;
    if (nodes > 100_000 || depth > 32) fail();
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "boolean"
    )
      continue;
    if (typeof current === "number") {
      if (!Number.isFinite(current) || Object.is(current, -0)) fail();
      continue;
    }
    if (typeof current !== "object") fail();
    if (Array.isArray(current)) {
      if (current.length > V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_PAGES_V1) fail();
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

function exactPin(pin: V2RepositoryImmutableObjectPinV1): boolean {
  return (
    typeof pin === "object" &&
    pin !== null &&
    typeof pin.objectPath === "string" &&
    pin.objectPath.startsWith("learning-v2/voice-audio-page-receipts/") &&
    HASH_RE.test(pin.contentHash) &&
    /^[1-9][0-9]{0,30}$/u.test(pin.objectGeneration) &&
    Number.isSafeInteger(pin.byteSize) &&
    pin.byteSize > 0 &&
    pin.contentType === "application/json; charset=utf-8"
  );
}

export function materializeV2VoiceAudioEpisodeReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly pages: readonly V2VoiceAudioEpisodePageEvidenceV1[];
}): V2VoiceAudioEpisodeReceiptV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !Array.isArray(input.pages) ||
    input.pages.length < 1 ||
    input.pages.length > V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_PAGES_V1
  )
    fail();
  let expectedStart = 0;
  const pageRows = Object.freeze(
    input.pages.map((evidence, index) => {
      const receipt = evidence.receipt;
      const expectedNext =
        index === input.pages.length - 1
          ? null
          : receipt.pageStartIndex + receipt.pageItemCount;
      if (
        receipt.planFingerprint !== input.manifest.planFingerprint ||
        receipt.stageId !== input.manifest.stageId ||
        receipt.episodeId !== input.manifest.episodeId ||
        receipt.manifestFingerprint !== input.manifest.manifestFingerprint ||
        receipt.manifestAudioObjectCount !== input.manifest.audioObjectCount ||
        receipt.pageStartIndex !== expectedStart ||
        receipt.pageItemCount < 1 ||
        receipt.nextPageStartIndex !== expectedNext ||
        !exactPin(evidence.receiptPin) ||
        !HASH_RE.test(evidence.audioReadbackAggregateFingerprint)
      )
        fail();
      expectedStart += receipt.pageItemCount;
      const body = {
        pageStartIndex: receipt.pageStartIndex,
        pageItemCount: receipt.pageItemCount,
        nextPageStartIndex: receipt.nextPageStartIndex,
        pageReceiptFingerprint: receipt.receiptFingerprint,
        pageReceiptPin: evidence.receiptPin,
        pageAudioReadbackAggregateFingerprint:
          evidence.audioReadbackAggregateFingerprint,
      };
      return Object.freeze({
        ...body,
        pageFingerprint: hashCanonicalBody(body),
      });
    }),
  );
  if (expectedStart !== input.manifest.audioObjectCount) fail();
  const body = {
    schemaVersion: V2_VOICE_AUDIO_EPISODE_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    audioObjectCount: input.manifest.audioObjectCount,
    pageCount: pageRows.length,
    pages: pageRows,
    orderedPageAggregateFingerprint: hashCanonicalBody(
      pageRows.map((page) => page.pageFingerprint),
    ),
    repositoryOriginAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    codecEvidenceAuthority: "unverified_serialized_claim" as const,
    decoderEvidenceAuthority: "none" as const,
    artifactStorageAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
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
    V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1
  )
    fail();
  handles.add(result);
  return result;
}

export function parseV2VoiceAudioEpisodeReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly pageReceipts: readonly V2VoiceAudioPageReceiptV1[];
}): V2VoiceAudioEpisodeReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1
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
  const value = decoded as Record<string, unknown>;
  if (
    !Array.isArray(value.pages) ||
    value.pages.length !== input.pageReceipts.length
  )
    fail();
  const pages = value.pages.map((page, index) => {
    if (typeof page !== "object" || page === null || Array.isArray(page))
      fail();
    const body = page as Record<string, unknown>;
    const receipt = input.pageReceipts[index];
    if (!receipt || body.pageReceiptFingerprint !== receipt.receiptFingerprint)
      fail();
    return Object.freeze({
      receipt,
      receiptPin: body.pageReceiptPin,
      audioReadbackAggregateFingerprint:
        body.pageAudioReadbackAggregateFingerprint,
    }) as V2VoiceAudioEpisodePageEvidenceV1;
  });
  const rebuilt = materializeV2VoiceAudioEpisodeReceiptV1({
    manifest: input.manifest,
    pages,
  });
  if (canonicalJsonV1(rebuilt) !== input.raw) fail();
  return rebuilt;
}

export function isV2VoiceAudioEpisodeReceiptV1(
  value: unknown,
): value is V2VoiceAudioEpisodeReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
