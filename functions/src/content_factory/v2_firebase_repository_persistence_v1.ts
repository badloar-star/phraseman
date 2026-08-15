import { createHash } from "node:crypto";
import {
  decideV2RepositorySingleflightClaimV1,
  decideV2RepositorySingleflightFinalizeV1,
  serializeV2RepositorySingleflightStateV1,
  v2RepositorySingleflightDocumentPathV1,
  type V2RepositorySingleflightClaimDecisionV1,
  type V2RepositorySingleflightFinalizeDecisionV1,
  type V2RepositorySingleflightIdentityV1,
  type V2RepositorySingleflightReceiptPinV1,
} from "./v2_repository_singleflight_state_v1";

export const V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 =
  "application/json; charset=utf-8" as const;
export const V2_REPOSITORY_IMMUTABLE_BINARY_CONTENT_TYPE_V1 =
  "application/octet-stream" as const;
export const V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1 =
  "audio/mpeg" as const;
export const V2_REPOSITORY_IMMUTABLE_STORAGE_MAX_BYTES_V1 = 24 * 1024 * 1024;

const HASH_RE = /^[a-f0-9]{64}$/;
const STORAGE_GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const PATH_SEGMENT_RE = /^[A-Za-z0-9._:+-]{1,200}$/;

type JsonRecord = Record<string, unknown>;

export type V2RepositoryImmutableContentTypeV1 =
  | typeof V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  | typeof V2_REPOSITORY_IMMUTABLE_BINARY_CONTENT_TYPE_V1
  | typeof V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1;

export type V2RepositoryFirestoreExactReadV1 =
  | Readonly<{ exists: false }>
  | Readonly<{ exists: true; raw: string }>;

export interface V2RepositoryFirestoreTransactionPortV1 {
  readExact(documentPath: string): Promise<V2RepositoryFirestoreExactReadV1>;
  createExact(documentPath: string, canonicalRaw: string): Promise<void>;
  compareAndSetExact(
    documentPath: string,
    expected: Readonly<{
      operationRevision: number;
      operationFingerprint: string;
    }>,
    canonicalRaw: string,
  ): Promise<void>;
}

export interface V2RepositoryFirestorePortV1 {
  runTransaction<T>(
    body: (transaction: V2RepositoryFirestoreTransactionPortV1) => Promise<T>,
  ): Promise<T>;
}

export interface V2RepositoryImmutableObjectMetadataV1 {
  readonly generation: string;
  readonly byteSize: number;
  readonly contentType: V2RepositoryImmutableContentTypeV1;
  readonly contentHash: string;
}

export type V2RepositoryImmutableCreateResultV1 =
  | Readonly<{
      kind: "created";
      metadata: V2RepositoryImmutableObjectMetadataV1;
    }>
  | Readonly<{ kind: "precondition_failed" }>;

export type V2RepositoryImmutableDownloadResultV1 =
  | Readonly<{ kind: "downloaded"; bytes: Uint8Array }>
  | Readonly<{ kind: "generation_mismatch" | "not_found" }>;

export interface V2RepositoryImmutableConflictV1 {
  readonly kind:
    | "metadata_conflict"
    | "create_race_missing_metadata"
    | "generation_conflict"
    | "readback_conflict";
  readonly objectPath: string;
  readonly expected: Readonly<{
    contentHash: string;
    byteSize: number;
    contentType: V2RepositoryImmutableContentTypeV1;
  }>;
  readonly observedMetadata: V2RepositoryImmutableObjectMetadataV1 | null;
  readonly observedReadback: Readonly<{
    contentHash: string | null;
    byteSize: number;
  }> | null;
}

export interface V2RepositoryImmutableStoragePortV1 {
  readMetadataExact(
    objectPath: string,
  ): Promise<V2RepositoryImmutableObjectMetadataV1 | null>;
  createExact(input: {
    readonly objectPath: string;
    readonly bytes: Uint8Array;
    readonly ifGenerationMatch: 0;
    readonly contentType: V2RepositoryImmutableContentTypeV1;
    readonly contentHash: string;
  }): Promise<V2RepositoryImmutableCreateResultV1>;
  downloadGenerationExact(input: {
    readonly objectPath: string;
    readonly ifGenerationMatch: string;
    readonly maximumBytes: number;
  }): Promise<V2RepositoryImmutableDownloadResultV1>;
  quarantineConflict(conflict: V2RepositoryImmutableConflictV1): Promise<void>;
}

export interface V2RepositoryImmutableObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: V2RepositoryImmutableContentTypeV1;
}

export type V2RepositoryImmutablePersistenceResultV1 = Readonly<{
  kind: "created" | "exact_replay";
  pin: V2RepositoryImmutableObjectPinV1;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function exactObjectPath(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 1000)
    fail("v2_repository_immutable_object_path_invalid");
  const segments = value.split("/");
  if (
    segments.length < 2 ||
    segments.some(
      (segment) =>
        segment === "." || segment === ".." || !PATH_SEGMENT_RE.test(segment),
    )
  ) {
    fail("v2_repository_immutable_object_path_invalid");
  }
  return value;
}

function exactContentType(value: unknown): V2RepositoryImmutableContentTypeV1 {
  if (
    value !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 &&
    value !== V2_REPOSITORY_IMMUTABLE_BINARY_CONTENT_TYPE_V1 &&
    value !== V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1
  ) {
    fail("v2_repository_immutable_content_type_invalid");
  }
  return value;
}

function parseExactRead(value: unknown): V2RepositoryFirestoreExactReadV1 {
  if (!isRecord(value) || typeof value.exists !== "boolean")
    fail("v2_repository_firestore_exact_read_invalid");
  if (value.exists === false) {
    if (!hasExactKeys(value, ["exists"]))
      fail("v2_repository_firestore_exact_read_invalid");
    return Object.freeze({ exists: false as const });
  }
  if (
    !hasExactKeys(value, ["exists", "raw"]) ||
    typeof value.raw !== "string"
  ) {
    fail("v2_repository_firestore_exact_read_invalid");
  }
  return Object.freeze({ exists: true as const, raw: value.raw });
}

async function applyClaimWrite(
  transaction: V2RepositoryFirestoreTransactionPortV1,
  decision: V2RepositorySingleflightClaimDecisionV1,
): Promise<void> {
  if (decision.kind === "create") {
    await transaction.createExact(
      decision.command.documentPath,
      serializeV2RepositorySingleflightStateV1(decision.command.next),
    );
    return;
  }
  if (decision.kind === "stale_takeover") {
    if (
      decision.command.expectedOperationRevision === null ||
      decision.command.expectedOperationFingerprint === null
    ) {
      fail("v2_repository_firestore_cas_command_invalid");
    }
    await transaction.compareAndSetExact(
      decision.command.documentPath,
      Object.freeze({
        operationRevision: decision.command.expectedOperationRevision,
        operationFingerprint: decision.command.expectedOperationFingerprint,
      }),
      serializeV2RepositorySingleflightStateV1(decision.command.next),
    );
  }
}

export async function executeV2RepositorySingleflightClaimTransactionV1(input: {
  readonly firestore: V2RepositoryFirestorePortV1;
  readonly identity: V2RepositorySingleflightIdentityV1;
  readonly claimToken: string;
  readonly nowEpochMs: number;
  readonly leaseSeconds: number;
}): Promise<V2RepositorySingleflightClaimDecisionV1> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "firestore",
      "identity",
      "claimToken",
      "nowEpochMs",
      "leaseSeconds",
    ])
  ) {
    fail("v2_repository_firestore_claim_input_invalid");
  }
  if (!input.firestore || typeof input.firestore.runTransaction !== "function")
    fail("v2_repository_firestore_port_invalid");
  const documentPath = v2RepositorySingleflightDocumentPathV1(
    input.identity.planFingerprint,
  );
  return input.firestore.runTransaction(async (transaction) => {
    if (
      !transaction ||
      typeof transaction.readExact !== "function" ||
      typeof transaction.createExact !== "function" ||
      typeof transaction.compareAndSetExact !== "function"
    ) {
      fail("v2_repository_firestore_transaction_port_invalid");
    }
    const current = parseExactRead(await transaction.readExact(documentPath));
    const decision = decideV2RepositorySingleflightClaimV1({
      currentRaw: current.exists ? current.raw : null,
      identity: input.identity,
      claimToken: input.claimToken,
      nowEpochMs: input.nowEpochMs,
      leaseSeconds: input.leaseSeconds,
    });
    await applyClaimWrite(transaction, decision);
    return decision;
  });
}

export async function executeV2RepositorySingleflightFinalizeTransactionV1(input: {
  readonly firestore: V2RepositoryFirestorePortV1;
  readonly identity: V2RepositorySingleflightIdentityV1;
  readonly claimEpoch: number;
  readonly claimToken: string;
  readonly nowEpochMs: number;
  readonly receiptFingerprint: string;
  readonly receiptPin: V2RepositorySingleflightReceiptPinV1;
}): Promise<V2RepositorySingleflightFinalizeDecisionV1> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "firestore",
      "identity",
      "claimEpoch",
      "claimToken",
      "nowEpochMs",
      "receiptFingerprint",
      "receiptPin",
    ])
  ) {
    fail("v2_repository_firestore_finalize_input_invalid");
  }
  if (!input.firestore || typeof input.firestore.runTransaction !== "function")
    fail("v2_repository_firestore_port_invalid");
  const documentPath = v2RepositorySingleflightDocumentPathV1(
    input.identity.planFingerprint,
  );
  return input.firestore.runTransaction(async (transaction) => {
    if (
      !transaction ||
      typeof transaction.readExact !== "function" ||
      typeof transaction.createExact !== "function" ||
      typeof transaction.compareAndSetExact !== "function"
    ) {
      fail("v2_repository_firestore_transaction_port_invalid");
    }
    const current = parseExactRead(await transaction.readExact(documentPath));
    if (!current.exists) fail("v2_repository_firestore_claim_missing");
    const decision = decideV2RepositorySingleflightFinalizeV1({
      currentRaw: current.raw,
      identity: input.identity,
      claimEpoch: input.claimEpoch,
      claimToken: input.claimToken,
      nowEpochMs: input.nowEpochMs,
      receiptFingerprint: input.receiptFingerprint,
      receiptPin: input.receiptPin,
    });
    if (decision.kind === "finalize") {
      if (
        decision.command.expectedOperationRevision === null ||
        decision.command.expectedOperationFingerprint === null
      ) {
        fail("v2_repository_firestore_cas_command_invalid");
      }
      await transaction.compareAndSetExact(
        decision.command.documentPath,
        Object.freeze({
          operationRevision: decision.command.expectedOperationRevision,
          operationFingerprint: decision.command.expectedOperationFingerprint,
        }),
        serializeV2RepositorySingleflightStateV1(decision.command.next),
      );
    }
    return decision;
  });
}

function parseMetadata(value: unknown): V2RepositoryImmutableObjectMetadataV1 {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "generation",
      "byteSize",
      "contentType",
      "contentHash",
    ]) ||
    typeof value.generation !== "string" ||
    !STORAGE_GENERATION_RE.test(value.generation) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > V2_REPOSITORY_IMMUTABLE_STORAGE_MAX_BYTES_V1 ||
    typeof value.contentHash !== "string" ||
    !HASH_RE.test(value.contentHash)
  ) {
    fail("v2_repository_immutable_metadata_invalid");
  }
  return Object.freeze({
    generation: value.generation,
    byteSize: Number(value.byteSize),
    contentType: exactContentType(value.contentType),
    contentHash: value.contentHash,
  });
}

async function quarantineBestEffort(
  storage: V2RepositoryImmutableStoragePortV1,
  conflict: V2RepositoryImmutableConflictV1,
): Promise<void> {
  try {
    await storage.quarantineConflict(Object.freeze(conflict));
  } catch {
    // Quarantine is audit-only; its failure must never mask the primary conflict.
  }
}

function metadataMatches(
  metadata: V2RepositoryImmutableObjectMetadataV1,
  expected: V2RepositoryImmutableConflictV1["expected"],
): boolean {
  return (
    metadata.contentHash === expected.contentHash &&
    metadata.byteSize === expected.byteSize &&
    metadata.contentType === expected.contentType
  );
}

async function conflict(
  storage: V2RepositoryImmutableStoragePortV1,
  value: V2RepositoryImmutableConflictV1,
): Promise<never> {
  await quarantineBestEffort(storage, value);
  fail("v2_repository_immutable_object_conflict");
}

async function readMetadata(
  storage: V2RepositoryImmutableStoragePortV1,
  objectPath: string,
): Promise<V2RepositoryImmutableObjectMetadataV1 | null> {
  const value = await storage.readMetadataExact(objectPath);
  return value === null ? null : parseMetadata(value);
}

export async function persistV2ImmutableRepositoryObjectV1(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly objectPath: string;
  readonly bytes: Uint8Array;
  readonly maximumBytes: number;
  readonly contentType: V2RepositoryImmutableContentTypeV1;
  readonly contentHash: string;
}): Promise<V2RepositoryImmutablePersistenceResultV1> {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      "storage",
      "objectPath",
      "bytes",
      "maximumBytes",
      "contentType",
      "contentHash",
    ])
  ) {
    fail("v2_repository_immutable_input_invalid");
  }
  if (
    !input.storage ||
    typeof input.storage.readMetadataExact !== "function" ||
    typeof input.storage.createExact !== "function" ||
    typeof input.storage.downloadGenerationExact !== "function" ||
    typeof input.storage.quarantineConflict !== "function"
  ) {
    fail("v2_repository_immutable_storage_port_invalid");
  }
  const objectPath = exactObjectPath(input.objectPath);
  const contentType = exactContentType(input.contentType);
  if (
    !Number.isSafeInteger(input.maximumBytes) ||
    Number(input.maximumBytes) < 1 ||
    Number(input.maximumBytes) > V2_REPOSITORY_IMMUTABLE_STORAGE_MAX_BYTES_V1 ||
    !(input.bytes instanceof Uint8Array) ||
    input.bytes.byteLength < 1 ||
    input.bytes.byteLength > Number(input.maximumBytes)
  ) {
    fail("v2_repository_immutable_byte_size_invalid");
  }
  if (typeof input.contentHash !== "string" || !HASH_RE.test(input.contentHash))
    fail("v2_repository_immutable_content_hash_invalid");
  const bytes = new Uint8Array(input.bytes);
  if (sha256Bytes(bytes) !== input.contentHash)
    fail("v2_repository_immutable_content_hash_mismatch");
  const expected = Object.freeze({
    contentHash: input.contentHash,
    byteSize: bytes.byteLength,
    contentType,
  });

  let metadata = await readMetadata(input.storage, objectPath);
  let kind: "created" | "exact_replay" = "exact_replay";
  if (metadata === null) {
    const createResult = await input.storage.createExact({
      objectPath,
      bytes: new Uint8Array(bytes),
      ifGenerationMatch: 0,
      contentType,
      contentHash: input.contentHash,
    });
    if (!isRecord(createResult) || typeof createResult.kind !== "string")
      fail("v2_repository_immutable_create_result_invalid");
    if (createResult.kind === "created") {
      if (!hasExactKeys(createResult, ["kind", "metadata"]))
        fail("v2_repository_immutable_create_result_invalid");
      metadata = parseMetadata(createResult.metadata);
      kind = "created";
    } else if (createResult.kind === "precondition_failed") {
      if (!hasExactKeys(createResult, ["kind"]))
        fail("v2_repository_immutable_create_result_invalid");
      metadata = await readMetadata(input.storage, objectPath);
      if (metadata === null) {
        return conflict(input.storage, {
          kind: "create_race_missing_metadata",
          objectPath,
          expected,
          observedMetadata: null,
          observedReadback: null,
        });
      }
    } else {
      fail("v2_repository_immutable_create_result_invalid");
    }
  }
  if (!metadataMatches(metadata, expected)) {
    return conflict(input.storage, {
      kind: "metadata_conflict",
      objectPath,
      expected,
      observedMetadata: metadata,
      observedReadback: null,
    });
  }
  const download = await input.storage.downloadGenerationExact({
    objectPath,
    ifGenerationMatch: metadata.generation,
    maximumBytes: Number(input.maximumBytes),
  });
  if (!isRecord(download) || typeof download.kind !== "string")
    fail("v2_repository_immutable_download_result_invalid");
  if (download.kind !== "downloaded") {
    if (
      (download.kind !== "generation_mismatch" &&
        download.kind !== "not_found") ||
      !hasExactKeys(download, ["kind"])
    ) {
      fail("v2_repository_immutable_download_result_invalid");
    }
    return conflict(input.storage, {
      kind: "generation_conflict",
      objectPath,
      expected,
      observedMetadata: metadata,
      observedReadback: null,
    });
  }
  if (
    !hasExactKeys(download, ["kind", "bytes"]) ||
    !(download.bytes instanceof Uint8Array)
  ) {
    fail("v2_repository_immutable_download_result_invalid");
  }
  const observedByteSize = download.bytes.byteLength;
  if (
    observedByteSize !== expected.byteSize ||
    observedByteSize > Number(input.maximumBytes)
  ) {
    return conflict(input.storage, {
      kind: "readback_conflict",
      objectPath,
      expected,
      observedMetadata: metadata,
      observedReadback: Object.freeze({
        contentHash: null,
        byteSize: observedByteSize,
      }),
    });
  }
  const observedReadback = Object.freeze({
    contentHash: sha256Bytes(download.bytes),
    byteSize: observedByteSize,
  });
  if (observedReadback.contentHash !== expected.contentHash) {
    return conflict(input.storage, {
      kind: "readback_conflict",
      objectPath,
      expected,
      observedMetadata: metadata,
      observedReadback,
    });
  }
  return Object.freeze({
    kind,
    pin: Object.freeze({
      objectPath,
      contentHash: expected.contentHash,
      objectGeneration: metadata.generation,
      byteSize: expected.byteSize,
      contentType,
    }),
  });
}
