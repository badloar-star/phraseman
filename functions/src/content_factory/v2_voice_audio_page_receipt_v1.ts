import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestEntryV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";

export const V2_VOICE_AUDIO_PAGE_RECEIPT_SCHEMA_V1 =
  "v2-voice-audio-page-receipt.v1" as const;
export const V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_ITEMS_V1 = 32;
export const V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1 = 128 * 1024;

export interface V2VoiceAudioPageReceiptRowV1 {
  readonly itemIndex: number;
  readonly generationTargetFingerprint: string;
  readonly entryFingerprint: string;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "audio/mpeg";
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
  readonly rowFingerprint: string;
}

export interface V2VoiceAudioPageReceiptV1 {
  readonly schemaVersion: typeof V2_VOICE_AUDIO_PAGE_RECEIPT_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly manifestFingerprint: string;
  readonly manifestAudioObjectCount: number;
  readonly pageStartIndex: number;
  readonly pageItemCount: number;
  readonly nextPageStartIndex: number | null;
  readonly rows: readonly V2VoiceAudioPageReceiptRowV1[];
  readonly orderedRowAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly codecEvidenceAuthority: "unverified_serialized_claim";
  readonly artifactStorageAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

export interface V2VoiceAudioPageObservationV1 {
  readonly itemIndex: number;
  readonly generationTargetFingerprint: string;
  readonly entryFingerprint: string;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "audio/mpeg";
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_voice_audio_page_receipt_invalid");
}

function preflightJson(value: unknown): void {
  const stack: Array<readonly [unknown, number]> = [[value, 0]];
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
      if (!Number.isFinite(current) || Object.is(current, -0)) fail();
      continue;
    }
    if (typeof current !== "object") fail();
    if (Array.isArray(current)) {
      if (current.length > 64) fail();
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

function flatEntries(
  manifest: V2VoiceAudioManifestV1,
): readonly V2VoiceAudioManifestEntryV1[] {
  return Object.freeze(
    manifest.sessionManifests.flatMap((session) => session.entries),
  );
}

function exactObservation(
  observed: V2VoiceAudioPageObservationV1,
  expected: V2VoiceAudioManifestEntryV1,
  itemIndex: number,
): V2VoiceAudioPageReceiptRowV1 {
  if (
    observed.itemIndex !== itemIndex ||
    observed.generationTargetFingerprint !==
      expected.generationTargetFingerprint ||
    observed.entryFingerprint !== expected.entryFingerprint ||
    observed.objectPath !== expected.objectPath ||
    observed.contentHash !== expected.contentHash ||
    observed.objectGeneration !== expected.objectGeneration ||
    observed.byteSize !== expected.byteSize ||
    observed.contentType !== "audio/mpeg" ||
    observed.codecRulesFingerprint !== expected.codecRulesFingerprint ||
    observed.codecResultFingerprint !== expected.codecResultFingerprint ||
    !HASH_RE.test(observed.contentHash) ||
    !GENERATION_RE.test(observed.objectGeneration) ||
    !Number.isSafeInteger(observed.byteSize) ||
    observed.byteSize < 1
  )
    fail();
  const body = {
    itemIndex,
    generationTargetFingerprint: observed.generationTargetFingerprint,
    entryFingerprint: observed.entryFingerprint,
    objectPath: observed.objectPath,
    contentHash: observed.contentHash,
    objectGeneration: observed.objectGeneration,
    byteSize: observed.byteSize,
    contentType: "audio/mpeg" as const,
    codecRulesFingerprint: observed.codecRulesFingerprint,
    codecResultFingerprint: observed.codecResultFingerprint,
  };
  return Object.freeze({ ...body, rowFingerprint: hashCanonicalBody(body) });
}

export function materializeV2VoiceAudioPageReceiptV1(input: {
  readonly manifest: V2VoiceAudioManifestV1;
  readonly pageStartIndex: number;
  readonly observations: readonly V2VoiceAudioPageObservationV1[];
}): V2VoiceAudioPageReceiptV1 {
  if (
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !Number.isSafeInteger(input.pageStartIndex) ||
    input.pageStartIndex < 0 ||
    !Array.isArray(input.observations) ||
    input.observations.length < 1 ||
    input.observations.length > V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_ITEMS_V1
  )
    fail();
  const entries = flatEntries(input.manifest);
  if (
    entries.length !== input.manifest.audioObjectCount ||
    input.pageStartIndex + input.observations.length > entries.length
  )
    fail();
  const rows = Object.freeze(
    input.observations.map((observed, offset) => {
      const itemIndex = input.pageStartIndex + offset;
      const expected = entries[itemIndex];
      if (!expected) fail();
      return exactObservation(observed, expected, itemIndex);
    }),
  );
  const nextPageStartIndex =
    input.pageStartIndex + rows.length === entries.length
      ? null
      : input.pageStartIndex + rows.length;
  const body = {
    schemaVersion: V2_VOICE_AUDIO_PAGE_RECEIPT_SCHEMA_V1,
    planFingerprint: input.manifest.planFingerprint,
    stageId: input.manifest.stageId,
    episodeId: input.manifest.episodeId,
    manifestFingerprint: input.manifest.manifestFingerprint,
    manifestAudioObjectCount: input.manifest.audioObjectCount,
    pageStartIndex: input.pageStartIndex,
    pageItemCount: rows.length,
    nextPageStartIndex,
    rows,
    orderedRowAggregateFingerprint: hashCanonicalBody(
      rows.map((row) => row.rowFingerprint),
    ),
    repositoryOriginAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    codecEvidenceAuthority: "unverified_serialized_claim" as const,
    artifactStorageAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const receipt = Object.freeze({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(receipt)) >
    V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1
  )
    fail();
  handles.add(receipt);
  return receipt;
}

export function parseV2VoiceAudioPageReceiptV1(input: {
  readonly raw: string;
  readonly manifest: V2VoiceAudioManifestV1;
}): V2VoiceAudioPageReceiptV1 {
  if (
    typeof input.raw !== "string" ||
    input.raw.length < 2 ||
    input.raw.length > V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1 ||
    utf8ByteLengthV1(input.raw) > V2_VOICE_AUDIO_PAGE_RECEIPT_MAX_BYTES_V1
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
  if (!Number.isSafeInteger(value.pageStartIndex) || !Array.isArray(value.rows))
    fail();
  const observations = value.rows.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) fail();
    const body = row as Record<string, unknown>;
    return Object.freeze({
      itemIndex: body.itemIndex,
      generationTargetFingerprint: body.generationTargetFingerprint,
      entryFingerprint: body.entryFingerprint,
      objectPath: body.objectPath,
      contentHash: body.contentHash,
      objectGeneration: body.objectGeneration,
      byteSize: body.byteSize,
      contentType: body.contentType,
      codecRulesFingerprint: body.codecRulesFingerprint,
      codecResultFingerprint: body.codecResultFingerprint,
    }) as V2VoiceAudioPageObservationV1;
  });
  const rebuilt = materializeV2VoiceAudioPageReceiptV1({
    manifest: input.manifest,
    pageStartIndex: Number(value.pageStartIndex),
    observations,
  });
  if (
    canonicalJsonV1(rebuilt) !== input.raw ||
    sha256Utf8(input.raw) !== sha256Utf8(canonicalJsonV1(rebuilt))
  )
    fail();
  return rebuilt;
}

export function isV2VoiceAudioPageReceiptV1(
  value: unknown,
): value is V2VoiceAudioPageReceiptV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
