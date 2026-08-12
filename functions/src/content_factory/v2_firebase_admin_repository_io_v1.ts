import { createHash } from "node:crypto";
import * as admin from "firebase-admin";
import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1,
  v2LanguageProfileLifecycleDocumentPathV1,
  v2LanguageProfileObjectPathV1,
  v2LanguageProfileVersionDocumentPathV1,
  v2ModeTemplateLifecycleDocumentPathV1,
  v2ModeTemplateObjectPathV1,
  v2ModeTemplateVersionDocumentPathV1,
  type V2AuthenticatedRepositoryFirestoreTimestampV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";
import {
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  validateV2FirebaseRepositoryTrustRootV1,
} from "./v2_firebase_repository_trust_root_v1";
import type {
  V2RepositoryFirestorePortV1,
  V2RepositoryFirestoreTransactionPortV1,
  V2RepositoryImmutableContentTypeV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
  V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1,
  v2VoiceProfileRepositoryLifecycleDocumentPathV1,
  v2VoiceProfileRepositoryObjectPathV1,
  v2VoiceProfileRepositoryRecordDocumentPathV1,
  type V2VoiceProfileRepositoryKindV1,
} from "./v2_voice_profile_repository_contract_v1";

const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const encoder = new TextEncoder();

type JsonRecord = Record<string, unknown>;

export interface V2FirebaseAdminRepositoryHeadSnapshotEntryV1 {
  readonly requirement: V2AuthenticatedRepositoryRequirementV1;
  readonly versionDocumentPath: string;
  readonly lifecycleDocumentPath: string;
  readonly recordBytes: Uint8Array;
  readonly lifecycleBytes: Uint8Array;
  readonly recordUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly lifecycleUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
}

export interface V2FirebaseAdminRepositoryHeadSnapshotV1 {
  readonly readTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly entries: readonly V2FirebaseAdminRepositoryHeadSnapshotEntryV1[];
}

export interface V2FirebaseAdminRepositoryObjectReadV1 {
  readonly requirement: V2AuthenticatedRepositoryRequirementV1;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentHash: string;
  readonly bytes: Uint8Array;
}

export interface V2FirebaseAdminVoiceProfileRequirementV1 {
  readonly profileKind: V2VoiceProfileRepositoryKindV1;
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface V2FirebaseAdminVoiceProfileHeadSnapshotEntryV1 {
  readonly requirement: V2FirebaseAdminVoiceProfileRequirementV1;
  readonly versionDocumentPath: string;
  readonly lifecycleDocumentPath: string;
  readonly recordBytes: Uint8Array;
  readonly lifecycleBytes: Uint8Array;
  readonly recordUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly lifecycleUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
}

export interface V2FirebaseAdminVoiceProfileHeadSnapshotV1 {
  readonly readTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly entries: readonly V2FirebaseAdminVoiceProfileHeadSnapshotEntryV1[];
}

export interface V2FirebaseAdminVoiceProfileObjectReadV1 {
  readonly requirement: V2FirebaseAdminVoiceProfileRequirementV1;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentHash: string;
  readonly bytes: Uint8Array;
}

export interface V2FirebaseAdminRepositoryIoV1 {
  readonly firestore: V2RepositoryFirestorePortV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readCoherentHeadSnapshot(
    requirements: readonly V2AuthenticatedRepositoryRequirementV1[],
  ): Promise<V2FirebaseAdminRepositoryHeadSnapshotV1>;
  readRequirementObjectGenerationExact(input: {
    readonly requirement: V2AuthenticatedRepositoryRequirementV1;
    readonly objectGeneration: string;
    readonly declaredByteSize: number;
    readonly maximumBytes: number;
  }): Promise<V2FirebaseAdminRepositoryObjectReadV1>;
  readCoherentVoiceProfileHeadSnapshot(
    requirements: readonly V2FirebaseAdminVoiceProfileRequirementV1[],
  ): Promise<V2FirebaseAdminVoiceProfileHeadSnapshotV1>;
  readVoiceProfileObjectGenerationExact(input: {
    readonly requirement: V2FirebaseAdminVoiceProfileRequirementV1;
    readonly objectGeneration: string;
    readonly declaredByteSize: number;
    readonly maximumBytes: number;
  }): Promise<V2FirebaseAdminVoiceProfileObjectReadV1>;
}

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

function timestamp(
  value: unknown,
): V2AuthenticatedRepositoryFirestoreTimestampV1 {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.seconds) ||
    Number(value.seconds) < 0 ||
    !Number.isSafeInteger(value.nanoseconds) ||
    Number(value.nanoseconds) < 0 ||
    Number(value.nanoseconds) > 999_999_999
  )
    fail("v2_firebase_admin_repository_timestamp_invalid");
  return Object.freeze({
    seconds: String(value.seconds),
    nanoseconds: Number(value.nanoseconds),
  });
}

function timestampEqual(
  left: V2AuthenticatedRepositoryFirestoreTimestampV1,
  right: V2AuthenticatedRepositoryFirestoreTimestampV1,
): boolean {
  return (
    left.seconds === right.seconds && left.nanoseconds === right.nanoseconds
  );
}

function canonicalDocumentBytes(
  value: unknown,
  maximumBytes: number,
): Uint8Array {
  if (!isRecord(value)) fail("v2_firebase_admin_repository_document_invalid");
  const raw = canonicalJsonV1(value);
  if (utf8ByteLengthV1(raw) < 1 || utf8ByteLengthV1(raw) > maximumBytes)
    fail("v2_firebase_admin_repository_document_size_invalid");
  return encoder.encode(raw);
}

function requirementPaths(requirement: V2AuthenticatedRepositoryRequirementV1) {
  return requirement.dependencyType === "language_profile"
    ? Object.freeze({
        versionDocumentPath: v2LanguageProfileVersionDocumentPathV1(
          requirement.profileId,
          requirement.version,
        ),
        lifecycleDocumentPath: v2LanguageProfileLifecycleDocumentPathV1(
          requirement.profileId,
          requirement.version,
        ),
        objectPath: v2LanguageProfileObjectPathV1(
          requirement.profileId,
          requirement.version,
          requirement.contentHash,
        ),
      })
    : Object.freeze({
        versionDocumentPath: v2ModeTemplateVersionDocumentPathV1(
          requirement.templateId,
          requirement.version,
        ),
        lifecycleDocumentPath: v2ModeTemplateLifecycleDocumentPathV1(
          requirement.templateId,
          requirement.version,
        ),
        objectPath: v2ModeTemplateObjectPathV1(
          requirement.templateId,
          requirement.version,
          requirement.contentHash,
        ),
      });
}

function parseStateDocument(value: unknown): string {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["canonicalRaw"]) ||
    typeof value.canonicalRaw !== "string"
  )
    fail("v2_firebase_admin_repository_state_document_invalid");
  return value.canonicalRaw;
}

function firestorePort(
  db: admin.firestore.Firestore,
): V2RepositoryFirestorePortV1 {
  return Object.freeze({
    runTransaction: async <T>(
      body: (transaction: V2RepositoryFirestoreTransactionPortV1) => Promise<T>,
    ): Promise<T> =>
      db.runTransaction(async (nativeTransaction) => {
        const reads = new Map<string, admin.firestore.DocumentSnapshot>();
        const port: V2RepositoryFirestoreTransactionPortV1 = Object.freeze({
          readExact: async (documentPath: string) => {
            const snapshot = await nativeTransaction.get(db.doc(documentPath));
            reads.set(documentPath, snapshot);
            return snapshot.exists
              ? Object.freeze({
                  exists: true as const,
                  raw: parseStateDocument(snapshot.data()),
                })
              : Object.freeze({ exists: false as const });
          },
          createExact: async (documentPath: string, canonicalRaw: string) => {
            nativeTransaction.create(db.doc(documentPath), { canonicalRaw });
          },
          compareAndSetExact: async (
            documentPath: string,
            expected: Readonly<{
              operationRevision: number;
              operationFingerprint: string;
            }>,
            canonicalRaw: string,
          ) => {
            const snapshot = reads.get(documentPath);
            if (!snapshot?.exists)
              fail("v2_firebase_admin_repository_cas_read_missing");
            let current: unknown;
            try {
              current = JSON.parse(parseStateDocument(snapshot.data()));
            } catch {
              fail("v2_firebase_admin_repository_state_document_invalid");
            }
            if (
              !isRecord(current) ||
              current.operationRevision !== expected.operationRevision ||
              current.operationFingerprint !== expected.operationFingerprint
            )
              fail("v2_firebase_admin_repository_cas_conflict");
            nativeTransaction.update(db.doc(documentPath), { canonicalRaw });
          },
        });
        return body(port);
      }),
  });
}

function metadata(value: unknown): V2RepositoryImmutableObjectMetadataV1 {
  if (
    !isRecord(value) ||
    typeof value.generation !== "string" ||
    !GENERATION_RE.test(value.generation) ||
    typeof value.size !== "string" ||
    !/^(0|[1-9][0-9]{0,15})$/.test(value.size) ||
    typeof value.contentType !== "string" ||
    !isRecord(value.metadata) ||
    typeof value.metadata.contentHash !== "string" ||
    !HASH_RE.test(value.metadata.contentHash)
  )
    fail("v2_firebase_admin_repository_storage_metadata_invalid");
  const byteSize = Number(value.size);
  if (!Number.isSafeInteger(byteSize) || byteSize < 1)
    fail("v2_firebase_admin_repository_storage_metadata_invalid");
  return Object.freeze({
    generation: value.generation,
    byteSize,
    contentType: value.contentType as V2RepositoryImmutableContentTypeV1,
    contentHash: value.metadata.contentHash,
  });
}

function errorCode(error: unknown): number | string | null {
  return isRecord(error) &&
    (typeof error.code === "number" || typeof error.code === "string")
    ? error.code
    : null;
}

function storagePort(
  bucket: ReturnType<admin.storage.Storage["bucket"]>,
): V2RepositoryImmutableStoragePortV1 {
  return Object.freeze({
    readMetadataExact: async (objectPath: string) => {
      try {
        const [value] = await bucket.file(objectPath).getMetadata();
        return metadata(value);
      } catch (error) {
        if (errorCode(error) === 404) return null;
        throw error;
      }
    },
    createExact: async (
      input: Parameters<V2RepositoryImmutableStoragePortV1["createExact"]>[0],
    ) => {
      const file = bucket.file(input.objectPath);
      try {
        await file.save(Buffer.from(input.bytes), {
          resumable: false,
          validation: "crc32c",
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: {
            contentType: input.contentType,
            metadata: { contentHash: input.contentHash },
          },
        });
        const [value] = await file.getMetadata();
        return Object.freeze({
          kind: "created" as const,
          metadata: metadata(value),
        });
      } catch (error) {
        if (errorCode(error) === 412)
          return Object.freeze({ kind: "precondition_failed" as const });
        throw error;
      }
    },
    downloadGenerationExact: async (
      input: Parameters<
        V2RepositoryImmutableStoragePortV1["downloadGenerationExact"]
      >[0],
    ) => {
      try {
        const [value] = await bucket
          .file(input.objectPath, { generation: input.ifGenerationMatch })
          .download({ validation: "crc32c" });
        if (value.byteLength > input.maximumBytes)
          fail("v2_firebase_admin_repository_storage_download_oversize");
        return Object.freeze({
          kind: "downloaded" as const,
          bytes: new Uint8Array(value),
        });
      } catch (error) {
        if (errorCode(error) === 404)
          return Object.freeze({ kind: "not_found" as const });
        if (errorCode(error) === 412)
          return Object.freeze({ kind: "generation_mismatch" as const });
        throw error;
      }
    },
    quarantineConflict: async () => {
      console.error("v2_firebase_admin_repository_immutable_conflict");
    },
  });
}

async function readHeadSnapshot(
  db: admin.firestore.Firestore,
  requirements: readonly V2AuthenticatedRepositoryRequirementV1[],
): Promise<V2FirebaseAdminRepositoryHeadSnapshotV1> {
  if (
    !Array.isArray(requirements) ||
    requirements.length < 2 ||
    requirements.length > 29
  )
    fail("v2_firebase_admin_repository_requirement_count_invalid");
  const paths = requirements.map(requirementPaths);
  const references = paths.flatMap((value) => [
    db.doc(value.versionDocumentPath),
    db.doc(value.lifecycleDocumentPath),
  ]);
  const snapshots = await db.getAll(...references);
  if (snapshots.length !== references.length)
    fail("v2_firebase_admin_repository_snapshot_count_invalid");
  let coherentReadTime: V2AuthenticatedRepositoryFirestoreTimestampV1 | null =
    null;
  const entries = requirements.map((requirement, index) => {
    const record = snapshots[index * 2];
    const lifecycle = snapshots[index * 2 + 1];
    const expected = paths[index]!;
    if (
      !record?.exists ||
      !lifecycle?.exists ||
      record.ref.path !== expected.versionDocumentPath ||
      lifecycle.ref.path !== expected.lifecycleDocumentPath
    )
      fail("v2_firebase_admin_repository_snapshot_path_invalid");
    const recordReadTime = timestamp(record.readTime);
    const lifecycleReadTime = timestamp(lifecycle.readTime);
    if (!timestampEqual(recordReadTime, lifecycleReadTime))
      fail("v2_firebase_admin_repository_read_time_incoherent");
    if (coherentReadTime === null) coherentReadTime = recordReadTime;
    if (!timestampEqual(coherentReadTime, recordReadTime))
      fail("v2_firebase_admin_repository_read_time_incoherent");
    return Object.freeze({
      requirement,
      versionDocumentPath: expected.versionDocumentPath,
      lifecycleDocumentPath: expected.lifecycleDocumentPath,
      recordBytes: canonicalDocumentBytes(
        record.data(),
        V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1,
      ),
      lifecycleBytes: canonicalDocumentBytes(
        lifecycle.data(),
        V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
      ),
      recordUpdateTime: timestamp(record.updateTime),
      lifecycleUpdateTime: timestamp(lifecycle.updateTime),
    });
  });
  if (coherentReadTime === null)
    fail("v2_firebase_admin_repository_read_time_incoherent");
  return Object.freeze({
    readTime: coherentReadTime,
    entries: Object.freeze(entries),
  });
}

function voiceProfileRequirementPaths(
  requirement: V2FirebaseAdminVoiceProfileRequirementV1,
) {
  return Object.freeze({
    versionDocumentPath: v2VoiceProfileRepositoryRecordDocumentPathV1(
      requirement.profileKind,
      requirement.profileId,
      requirement.version,
    ),
    lifecycleDocumentPath: v2VoiceProfileRepositoryLifecycleDocumentPathV1(
      requirement.profileKind,
      requirement.profileId,
      requirement.version,
    ),
    objectPath: v2VoiceProfileRepositoryObjectPathV1(requirement),
  });
}

async function readVoiceProfileHeadSnapshot(
  db: admin.firestore.Firestore,
  requirements: readonly V2FirebaseAdminVoiceProfileRequirementV1[],
): Promise<V2FirebaseAdminVoiceProfileHeadSnapshotV1> {
  if (
    !Array.isArray(requirements) ||
    requirements.length !== 2 ||
    requirements[0]?.profileKind !== "speech_profile" ||
    requirements[1]?.profileKind !== "voice_generation_profile"
  )
    fail("v2_firebase_admin_voice_profile_requirement_set_invalid");
  const paths = requirements.map(voiceProfileRequirementPaths);
  const references = paths.flatMap((value) => [
    db.doc(value.versionDocumentPath),
    db.doc(value.lifecycleDocumentPath),
  ]);
  const snapshots = await db.getAll(...references);
  if (snapshots.length !== references.length)
    fail("v2_firebase_admin_voice_profile_snapshot_count_invalid");
  let coherentReadTime: V2AuthenticatedRepositoryFirestoreTimestampV1 | null =
    null;
  const entries = requirements.map((requirement, index) => {
    const record = snapshots[index * 2];
    const lifecycle = snapshots[index * 2 + 1];
    const expected = paths[index]!;
    if (
      !record?.exists ||
      !lifecycle?.exists ||
      record.ref.path !== expected.versionDocumentPath ||
      lifecycle.ref.path !== expected.lifecycleDocumentPath
    )
      fail("v2_firebase_admin_voice_profile_snapshot_path_invalid");
    const recordReadTime = timestamp(record.readTime);
    const lifecycleReadTime = timestamp(lifecycle.readTime);
    if (!timestampEqual(recordReadTime, lifecycleReadTime))
      fail("v2_firebase_admin_voice_profile_read_time_incoherent");
    if (coherentReadTime === null) coherentReadTime = recordReadTime;
    if (!timestampEqual(coherentReadTime, recordReadTime))
      fail("v2_firebase_admin_voice_profile_read_time_incoherent");
    return Object.freeze({
      requirement,
      versionDocumentPath: expected.versionDocumentPath,
      lifecycleDocumentPath: expected.lifecycleDocumentPath,
      recordBytes: canonicalDocumentBytes(
        record.data(),
        V2_VOICE_PROFILE_REPOSITORY_RECORD_MAX_BYTES_V1,
      ),
      lifecycleBytes: canonicalDocumentBytes(
        lifecycle.data(),
        V2_VOICE_PROFILE_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
      ),
      recordUpdateTime: timestamp(record.updateTime),
      lifecycleUpdateTime: timestamp(lifecycle.updateTime),
    });
  });
  if (coherentReadTime === null)
    fail("v2_firebase_admin_voice_profile_read_time_incoherent");
  return Object.freeze({
    readTime: coherentReadTime,
    entries: Object.freeze(entries),
  });
}

async function readRequirementObject(
  bucket: ReturnType<admin.storage.Storage["bucket"]>,
  input: {
    readonly requirement: V2AuthenticatedRepositoryRequirementV1;
    readonly objectGeneration: string;
    readonly declaredByteSize: number;
    readonly maximumBytes: number;
  },
): Promise<V2FirebaseAdminRepositoryObjectReadV1> {
  if (
    !isRecord(input) ||
    !GENERATION_RE.test(input.objectGeneration) ||
    !Number.isSafeInteger(input.declaredByteSize) ||
    Number(input.declaredByteSize) < 1 ||
    !Number.isSafeInteger(input.maximumBytes) ||
    Number(input.maximumBytes) < 1 ||
    Number(input.declaredByteSize) > Number(input.maximumBytes)
  )
    fail("v2_firebase_admin_repository_object_read_input_invalid");
  const objectPath = requirementPaths(input.requirement).objectPath;
  const [rawMetadata] = await bucket.file(objectPath).getMetadata();
  const observed = metadata(rawMetadata);
  if (
    observed.generation !== input.objectGeneration ||
    observed.byteSize !== input.declaredByteSize ||
    observed.byteSize > input.maximumBytes ||
    observed.contentHash !== input.requirement.contentHash ||
    !observed.contentType.startsWith("application/json")
  )
    fail("v2_firebase_admin_repository_object_metadata_mismatch");
  let downloaded: Buffer;
  try {
    [downloaded] = await bucket
      .file(objectPath, { generation: input.objectGeneration })
      .download({ validation: "crc32c" });
  } catch (error) {
    if (errorCode(error) === 404 || errorCode(error) === 412)
      fail("v2_firebase_admin_repository_object_generation_mismatch");
    throw error;
  }
  if (
    downloaded.byteLength !== observed.byteSize ||
    downloaded.byteLength > input.maximumBytes ||
    sha256Bytes(downloaded) !== input.requirement.contentHash
  )
    fail("v2_firebase_admin_repository_object_readback_mismatch");
  return Object.freeze({
    requirement: input.requirement,
    objectPath,
    objectGeneration: observed.generation,
    byteSize: observed.byteSize,
    contentHash: observed.contentHash,
    bytes: new Uint8Array(downloaded),
  });
}

async function readVoiceProfileObject(
  bucket: ReturnType<admin.storage.Storage["bucket"]>,
  input: {
    readonly requirement: V2FirebaseAdminVoiceProfileRequirementV1;
    readonly objectGeneration: string;
    readonly declaredByteSize: number;
    readonly maximumBytes: number;
  },
): Promise<V2FirebaseAdminVoiceProfileObjectReadV1> {
  if (
    !isRecord(input) ||
    !GENERATION_RE.test(input.objectGeneration) ||
    !Number.isSafeInteger(input.declaredByteSize) ||
    input.declaredByteSize < 1 ||
    !Number.isSafeInteger(input.maximumBytes) ||
    input.maximumBytes < 1 ||
    input.declaredByteSize > input.maximumBytes
  )
    fail("v2_firebase_admin_voice_profile_object_read_input_invalid");
  const objectPath = voiceProfileRequirementPaths(input.requirement).objectPath;
  const [rawMetadata] = await bucket.file(objectPath).getMetadata();
  const observed = metadata(rawMetadata);
  if (
    observed.generation !== input.objectGeneration ||
    observed.byteSize !== input.declaredByteSize ||
    observed.byteSize > input.maximumBytes ||
    observed.contentHash !== input.requirement.contentHash ||
    observed.contentType !== "application/json; charset=utf-8"
  )
    fail("v2_firebase_admin_voice_profile_object_metadata_mismatch");
  let downloaded: Buffer;
  try {
    [downloaded] = await bucket
      .file(objectPath, { generation: input.objectGeneration })
      .download({ validation: "crc32c" });
  } catch (error) {
    if (errorCode(error) === 404 || errorCode(error) === 412)
      fail("v2_firebase_admin_voice_profile_object_generation_mismatch");
    throw error;
  }
  if (
    downloaded.byteLength !== observed.byteSize ||
    downloaded.byteLength > input.maximumBytes ||
    sha256Bytes(downloaded) !== input.requirement.contentHash
  )
    fail("v2_firebase_admin_voice_profile_object_readback_mismatch");
  return Object.freeze({
    requirement: input.requirement,
    objectPath,
    objectGeneration: observed.generation,
    byteSize: observed.byteSize,
    contentHash: observed.contentHash,
    bytes: new Uint8Array(downloaded),
  });
}

function emulatorObservation() {
  return Object.freeze({
    functionsEmulator: process.env.FUNCTIONS_EMULATOR ?? null,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? null,
    storageEmulatorHost: process.env.STORAGE_EMULATOR_HOST ?? null,
    firebaseStorageEmulatorHost:
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? null,
    firebaseEmulatorHub: process.env.FIREBASE_EMULATOR_HUB ?? null,
  });
}

/**
 * Acquires only the default production Admin SDK context. The returned value is
 * an unbranded I/O boundary and carries no repository-origin or release authority.
 */
export function createV2FirebaseAdminRepositoryIoV1(): V2FirebaseAdminRepositoryIoV1 {
  const app = admin.app();
  const expected = V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1;
  if (
    app.name !== expected.appName ||
    app.options.projectId !== expected.projectId ||
    app.options.storageBucket !== expected.bucketName
  )
    fail("v2_firebase_admin_repository_app_invalid");
  const db = admin.firestore(app);
  const bucket = admin.storage(app).bucket(expected.bucketName);
  if (bucket.name !== expected.bucketName)
    fail("v2_firebase_admin_repository_bucket_invalid");
  validateV2FirebaseRepositoryTrustRootV1({
    projectId: app.options.projectId,
    databaseId: expected.databaseId,
    bucketName: bucket.name,
    appName: app.name,
    emulatorEnvironment: emulatorObservation(),
  });
  const io: V2FirebaseAdminRepositoryIoV1 = {
    firestore: firestorePort(db),
    storage: storagePort(bucket),
    readCoherentHeadSnapshot: (
      requirements: readonly V2AuthenticatedRepositoryRequirementV1[],
    ) => readHeadSnapshot(db, requirements),
    readRequirementObjectGenerationExact: (
      input: Parameters<
        V2FirebaseAdminRepositoryIoV1["readRequirementObjectGenerationExact"]
      >[0],
    ) => readRequirementObject(bucket, input),
    readCoherentVoiceProfileHeadSnapshot: (requirements) =>
      readVoiceProfileHeadSnapshot(db, requirements),
    readVoiceProfileObjectGenerationExact: (input) =>
      readVoiceProfileObject(bucket, input),
  };
  return Object.freeze(io);
}
