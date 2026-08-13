import { CryptoDigestAlgorithm, digest } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

import { hashCanonicalBody } from "../policies/decision_registry";
import {
  parseLearningV2NativeDecoderIdentityV1,
  type LearningV2NativeDecoderIdentityV1,
} from "./voice_native_decoder_observer_v1";
import { LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1 } from "./voice_pcm_signal_observer_v1";

export const LEARNING_V2_VOICE_AUDIO_OFFLINE_CACHE_SCHEMA_V1 =
  "learning-v2-voice-audio-offline-cache.v1" as const;
export const LEARNING_V2_VOICE_AUDIO_CACHE_DIRECTORY_V1 =
  "learning-v2-voice-audio-v1" as const;
export const LEARNING_V2_VOICE_AUDIO_CACHE_MAX_FILES_V1 = 8_192;
export const LEARNING_V2_VOICE_AUDIO_CACHE_TARGET_FILES_V1 = 7_680;
export const LEARNING_V2_VOICE_AUDIO_CACHE_MAX_BYTES_V1 = 512 * 1024 * 1024;
export const LEARNING_V2_VOICE_AUDIO_CACHE_TARGET_BYTES_V1 = 480 * 1024 * 1024;
export const LEARNING_V2_VOICE_AUDIO_CACHE_SWEEP_INTERVAL_MS_V1 =
  10 * 60 * 1_000;

export interface LearningV2VoiceAudioOfflineCacheHandleV1 {
  readonly __opaqueLearningV2VoiceAudioOfflineCacheHandleV1: unique symbol;
}

export interface LearningV2VoiceAudioOfflineCacheSummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_VOICE_AUDIO_OFFLINE_CACHE_SCHEMA_V1;
  readonly contentHash: string;
  readonly byteSize: number;
  readonly objectGeneration: string;
  readonly entryFingerprint: string;
  readonly cacheIdentity: "immutable_content_hash";
  readonly cacheDisposition: "exact_cache_hit" | "downloaded_and_verified";
  readonly localByteEvidence: "exact_sha256_and_byte_size_readback";
  readonly storageGenerationAuthority: "unverified_manifest_declaration";
  readonly repositoryOriginAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

interface CacheMaterial {
  readonly fileUri: string;
  readonly identity: Readonly<LearningV2NativeDecoderIdentityV1>;
  readonly summary: LearningV2VoiceAudioOfflineCacheSummaryV1;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<object, CacheMaterial>();
const inFlight = new Map<
  string,
  Promise<
    Readonly<{
      fileUri: string;
      cacheDisposition: LearningV2VoiceAudioOfflineCacheSummaryV1["cacheDisposition"];
    }>
  >
>();
const AUDIO_PATH_RE =
  /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const EXACT_BUCKET = "phraseman-ea0b3.firebasestorage.app";
let lastSweepAtMs = 0;
let sweepInProgress = false;

type ExactByteLoader = () => Promise<Uint8Array>;

function fail(): never {
  throw new Error("learning_v2_voice_audio_offline_cache_invalid");
}

function exactSourceUrl(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 4_096)
    fail();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail();
  }
  const firebasePath = `/v0/b/${EXACT_BUCKET}/o/`;
  const storagePath = `/${EXACT_BUCKET}/`;
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== "" ||
    !(
      (url.hostname === "firebasestorage.googleapis.com" &&
        url.pathname.startsWith(firebasePath)) ||
      (url.hostname === "storage.googleapis.com" &&
        url.pathname.startsWith(storagePath))
    )
  )
    fail();
  return value;
}

function bytesToHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function exactFileBytes(
  file: File,
  expectedHash: string,
  expectedByteSize: number,
): Promise<boolean> {
  try {
    if (
      !file.exists ||
      file.size !== expectedByteSize ||
      expectedByteSize < 1 ||
      expectedByteSize > LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1
    )
      return false;
    const bytes = await file.bytes();
    if (bytes.byteLength !== expectedByteSize) return false;
    const observedHash = bytesToHex(
      await digest(CryptoDigestAlgorithm.SHA256, bytes),
    );
    return observedHash === expectedHash;
  } catch {
    return false;
  }
}

function safeDelete(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // A later exact readback still prevents a stale or partial file from use.
  }
}

function cacheDirectory(): Directory {
  return new Directory(Paths.cache, LEARNING_V2_VOICE_AUDIO_CACHE_DIRECTORY_V1);
}

function isAudioFile(value: File | Directory): value is File {
  return value instanceof File && value.uri.endsWith(".mp3");
}

async function sweepCache(protectedUri: string): Promise<void> {
  if (sweepInProgress) return;
  const now = Date.now();
  if (
    lastSweepAtMs !== 0 &&
    now - lastSweepAtMs < LEARNING_V2_VOICE_AUDIO_CACHE_SWEEP_INTERVAL_MS_V1
  )
    return;
  sweepInProgress = true;
  lastSweepAtMs = now;
  try {
    const directory = cacheDirectory();
    if (!directory.exists) return;
    const files = directory
      .list()
      .filter(isAudioFile)
      .map((file) => {
        let byteSize = 0;
        let modifiedAt = 0;
        try {
          byteSize = file.size ?? 0;
          modifiedAt = file.modificationTime ?? file.creationTime ?? 0;
        } catch {
          byteSize = 0;
          modifiedAt = 0;
        }
        return { file, byteSize, modifiedAt };
      });
    let totalBytes = files.reduce((sum, file) => sum + file.byteSize, 0);
    let totalFiles = files.length;
    if (
      totalBytes <= LEARNING_V2_VOICE_AUDIO_CACHE_MAX_BYTES_V1 &&
      totalFiles <= LEARNING_V2_VOICE_AUDIO_CACHE_MAX_FILES_V1
    )
      return;
    files.sort((left, right) => left.modifiedAt - right.modifiedAt);
    for (const entry of files) {
      if (
        totalBytes <= LEARNING_V2_VOICE_AUDIO_CACHE_TARGET_BYTES_V1 &&
        totalFiles <= LEARNING_V2_VOICE_AUDIO_CACHE_TARGET_FILES_V1
      )
        break;
      if (entry.file.uri === protectedUri) continue;
      try {
        entry.file.delete();
        totalBytes -= entry.byteSize;
        totalFiles -= 1;
      } catch {
        // Cache eviction is best-effort; exact readback gates every later use.
      }
    }
  } finally {
    sweepInProgress = false;
  }
}

function materializeHandle(input: {
  readonly fileUri: string;
  readonly identity: Readonly<LearningV2NativeDecoderIdentityV1>;
  readonly cacheDisposition: LearningV2VoiceAudioOfflineCacheSummaryV1["cacheDisposition"];
}): LearningV2VoiceAudioOfflineCacheHandleV1 {
  const body = {
    schemaVersion: LEARNING_V2_VOICE_AUDIO_OFFLINE_CACHE_SCHEMA_V1,
    contentHash: input.identity.contentHash,
    byteSize: input.identity.byteSize,
    objectGeneration: input.identity.objectGeneration,
    entryFingerprint: input.identity.entryFingerprint,
    cacheIdentity: "immutable_content_hash" as const,
    cacheDisposition: input.cacheDisposition,
    localByteEvidence: "exact_sha256_and_byte_size_readback" as const,
    storageGenerationAuthority: "unverified_manifest_declaration" as const,
    repositoryOriginAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const summary = Object.freeze({
    ...body,
    summaryFingerprint: hashCanonicalBody(body),
  });
  const handle = Object.freeze({}) as LearningV2VoiceAudioOfflineCacheHandleV1;
  handles.add(handle);
  metadata.set(handle, Object.freeze({ ...input, summary }));
  return handle;
}

async function prepareExactCacheFile(
  identityInput: LearningV2NativeDecoderIdentityV1,
  writeTemporaryFile: (temporaryFile: File) => Promise<File>,
): Promise<LearningV2VoiceAudioOfflineCacheHandleV1> {
  let identity: Readonly<LearningV2NativeDecoderIdentityV1>;
  try {
    identity = parseLearningV2NativeDecoderIdentityV1(identityInput);
  } catch {
    fail();
  }
  if (
    identity.byteSize > LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1 ||
    !AUDIO_PATH_RE.test(identity.objectPath) ||
    !identity.objectPath.endsWith(`/${identity.contentHash}.mp3`)
  )
    fail();
  const cacheKey = `${identity.contentHash}:${identity.byteSize}`;
  const existing = inFlight.get(cacheKey);
  if (existing) {
    try {
      const result = await existing;
      return materializeHandle({ ...result, identity });
    } catch {
      fail();
    }
  }

  const operation = (async () => {
    const directory = cacheDirectory();
    try {
      if (!directory.exists)
        directory.create({ intermediates: true, idempotent: true });
      const finalFile = new File(directory, `${identity.contentHash}.mp3`);
      if (
        await exactFileBytes(finalFile, identity.contentHash, identity.byteSize)
      ) {
        void sweepCache(finalFile.uri);
        return Object.freeze({
          fileUri: finalFile.uri,
          cacheDisposition: "exact_cache_hit",
        });
      }
      safeDelete(finalFile);

      const temporaryFile = new File(
        directory,
        `${identity.contentHash}.download-part`,
      );
      safeDelete(temporaryFile);
      let downloaded: File;
      try {
        downloaded = await writeTemporaryFile(temporaryFile);
      } catch {
        safeDelete(temporaryFile);
        fail();
      }
      if (
        !(await exactFileBytes(
          downloaded,
          identity.contentHash,
          identity.byteSize,
        ))
      ) {
        safeDelete(downloaded);
        fail();
      }
      try {
        downloaded.move(finalFile);
      } catch {
        safeDelete(downloaded);
        fail();
      }
      if (
        !(await exactFileBytes(
          finalFile,
          identity.contentHash,
          identity.byteSize,
        ))
      ) {
        safeDelete(finalFile);
        fail();
      }
      void sweepCache(finalFile.uri);
      return Object.freeze({
        fileUri: finalFile.uri,
        cacheDisposition: "downloaded_and_verified",
      });
    } catch {
      fail();
    }
  })();
  inFlight.set(cacheKey, operation);
  try {
    const result = await operation;
    return materializeHandle({ ...result, identity });
  } finally {
    if (inFlight.get(cacheKey) === operation) inFlight.delete(cacheKey);
  }
}

export async function prepareLearningV2VoiceAudioOfflineFileV1(input: {
  readonly sourceUrl: string;
  readonly identity: LearningV2NativeDecoderIdentityV1;
}): Promise<LearningV2VoiceAudioOfflineCacheHandleV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "identity|sourceUrl"
  )
    fail();
  const sourceUrl = exactSourceUrl(input.sourceUrl);
  return prepareExactCacheFile(
    input.identity,
    async (temporaryFile) =>
      File.downloadFileAsync(sourceUrl, temporaryFile, {
        idempotent: true,
      }) as Promise<File>,
  );
}

/**
 * Runtime preload seam: the caller owns authenticated transport, while this
 * cache owns only exact byte verification and immutable local persistence.
 * The loader is invoked only on a real cache miss and its credentials/headers
 * are never accepted, retained or returned by this module.
 */
export async function prepareLearningV2VoiceAudioOfflineBytesV1(input: {
  readonly identity: LearningV2NativeDecoderIdentityV1;
  readonly loadBytes: ExactByteLoader;
}): Promise<LearningV2VoiceAudioOfflineCacheHandleV1> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "identity|loadBytes" ||
    typeof input.loadBytes !== "function"
  )
    fail();
  return prepareExactCacheFile(input.identity, async (temporaryFile) => {
    const bytes = await input.loadBytes();
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.byteLength !== input.identity.byteSize ||
      bytes.byteLength < 1 ||
      bytes.byteLength > LEARNING_V2_PCM_SIGNAL_SOURCE_MAX_BYTES_V1
    )
      fail();
    try {
      temporaryFile.write(bytes);
    } catch {
      safeDelete(temporaryFile);
      fail();
    }
    return temporaryFile;
  });
}

export function isLearningV2VoiceAudioOfflineCacheHandleV1(
  value: unknown,
): value is LearningV2VoiceAudioOfflineCacheHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getLearningV2VoiceAudioOfflineCacheSummaryV1(
  handle: LearningV2VoiceAudioOfflineCacheHandleV1,
): LearningV2VoiceAudioOfflineCacheSummaryV1 {
  const material = metadata.get(handle as object);
  if (!material || !handles.has(handle as object)) fail();
  return material.summary;
}

export function resolveLearningV2VoiceAudioOfflineCacheMaterialV1(input: {
  readonly handle: LearningV2VoiceAudioOfflineCacheHandleV1;
  readonly identity: LearningV2NativeDecoderIdentityV1;
}): Readonly<{
  readonly fileUri: string;
  readonly identity: Readonly<LearningV2NativeDecoderIdentityV1>;
  readonly summary: LearningV2VoiceAudioOfflineCacheSummaryV1;
}> {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !== "handle|identity" ||
    !isLearningV2VoiceAudioOfflineCacheHandleV1(input.handle)
  )
    fail();
  let identity: Readonly<LearningV2NativeDecoderIdentityV1>;
  try {
    identity = parseLearningV2NativeDecoderIdentityV1(input.identity);
  } catch {
    fail();
  }
  const material = metadata.get(input.handle as object);
  if (
    !material ||
    hashCanonicalBody(material.identity) !== hashCanonicalBody(identity)
  )
    fail();
  return material;
}
