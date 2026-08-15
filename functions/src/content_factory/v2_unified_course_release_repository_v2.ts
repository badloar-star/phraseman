import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  persistV2ImmutableRepositoryObjectV1,
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryFirestorePortV1,
  type V2RepositoryImmutableObjectPinV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
  decideV2UnifiedCourseReleaseHeadV2,
  isV2UnifiedCourseReleaseRootV2,
  parseV2UnifiedCourseReleaseHeadV2,
  parseV2UnifiedCourseReleaseRootV2,
  type V2UnifiedCourseReleaseHeadV2,
  type V2UnifiedCourseReleaseRootV2,
} from "./v2_unified_course_release_v2";

export const V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V2 =
  "learning-v2/unified-course-release-v2/roots" as const;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V2 =
  "content_v2_unified_course_release_heads" as const;
export const V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V2 =
  "content_v2_unified_course_release_roots" as const;

export interface V2UnifiedCourseReleaseAdvanceInputV2 {
  readonly target: V2UnifiedCourseReleaseRootV2;
  readonly action: "activate" | "rollback";
  readonly expectedRevision: number;
  readonly operationId: string;
  readonly updatedAtIso: string;
}

export interface V2UnifiedCourseReleaseReadInputV2 {
  readonly environment: "lab" | "staging" | "production";
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
}

export interface V2UnifiedCourseReleaseActiveHandleV2 {
  readonly kind: "v2_unified_course_release_active_handle_v2";
}

export interface V2UnifiedCourseReleaseRepositoryV2 {
  persistAndAdvance(input: V2UnifiedCourseReleaseAdvanceInputV2): Promise<
    Readonly<{
      root: V2UnifiedCourseReleaseRootV2;
      rootObject: V2RepositoryImmutableObjectPinV1;
      head: V2UnifiedCourseReleaseHeadV2;
      persistenceKind: "created" | "exact_replay";
      headDecision: "commit" | "exact_replay";
      activeHandle: V2UnifiedCourseReleaseActiveHandleV2;
    }>
  >;
  readActive(input: V2UnifiedCourseReleaseReadInputV2): Promise<
    Readonly<{
      root: V2UnifiedCourseReleaseRootV2;
      rootObject: V2RepositoryImmutableObjectPinV1;
      head: V2UnifiedCourseReleaseHeadV2;
      activeHandle: V2UnifiedCourseReleaseActiveHandleV2;
    }>
  >;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const activeHandles = new WeakSet<object>();
const activeMaterials = new WeakMap<
  object,
  Readonly<{
    root: V2UnifiedCourseReleaseRootV2;
    rootObject: V2RepositoryImmutableObjectPinV1;
    head: V2UnifiedCourseReleaseHeadV2;
  }>
>();

function fail(code: string): never {
  throw new Error(`v2_unified_course_release_repository_v2_${code}`);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function exactId(value: string): string {
  if (!ID_RE.test(value)) fail("path_invalid");
  return value;
}

function exactHash(value: string): string {
  if (!HASH_RE.test(value)) fail("path_invalid");
  return value;
}

export function v2UnifiedCourseReleaseRootObjectPathV2(input: {
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly rawHash: string;
}): string {
  return `${V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V2}/${createHash("sha256").update(exactId(input.releaseId)).digest("hex")}/${exactHash(input.rootFingerprint)}/${exactHash(input.rawHash)}.json`;
}

export function v2UnifiedCourseReleaseHeadDocumentPathV2(
  input: V2UnifiedCourseReleaseReadInputV2,
): string {
  const id = createHash("sha256").update(canonicalJsonV1(input)).digest("hex");
  return `${V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V2}/${id}`;
}

export function v2UnifiedCourseReleaseRootRecordDocumentPathV2(
  releaseId: string,
): string {
  return `${V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V2}/${createHash("sha256").update(exactId(releaseId)).digest("hex")}`;
}

function mintActiveHandle(
  material: Readonly<{
    root: V2UnifiedCourseReleaseRootV2;
    rootObject: V2RepositoryImmutableObjectPinV1;
    head: V2UnifiedCourseReleaseHeadV2;
  }>,
): V2UnifiedCourseReleaseActiveHandleV2 {
  const handle = Object.freeze({
    kind: "v2_unified_course_release_active_handle_v2" as const,
  });
  activeHandles.add(handle);
  activeMaterials.set(handle, material);
  return handle;
}

export function isV2UnifiedCourseReleaseActiveHandleV2(
  value: unknown,
): value is V2UnifiedCourseReleaseActiveHandleV2 {
  return (
    typeof value === "object" && value !== null && activeHandles.has(value)
  );
}

export function resolveV2UnifiedCourseReleaseActiveMaterialV2(
  handle: V2UnifiedCourseReleaseActiveHandleV2,
) {
  const material = activeMaterials.get(handle);
  if (!material || !activeHandles.has(handle)) fail("active_handle_invalid");
  return material;
}

function rootRecordRaw(
  root: V2UnifiedCourseReleaseRootV2,
  rootObject: V2RepositoryImmutableObjectPinV1,
): string {
  return canonicalJsonV1({
    schemaVersion: "v2-unified-course-release-root-record.v2",
    releaseId: root.releaseId,
    topologyFingerprint: root.topologyFingerprint,
    rootFingerprint: root.rootFingerprint,
    rootObject,
    recordAuthority: "none_server_readback_required",
    releaseAuthority: false,
  });
}

async function commitRootRecord(
  firestore: V2RepositoryFirestorePortV1,
  root: V2UnifiedCourseReleaseRootV2,
  rootObject: V2RepositoryImmutableObjectPinV1,
): Promise<void> {
  const path = v2UnifiedCourseReleaseRootRecordDocumentPathV2(root.releaseId);
  const raw = rootRecordRaw(root, rootObject);
  await firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(path);
    if (!current.exists) {
      await transaction.createExact(path, raw);
      return;
    }
    if (current.raw !== raw) fail("release_id_reuse_conflict");
  });
}

async function coldReadRoot(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: V2RepositoryImmutableObjectPinV1,
): Promise<V2UnifiedCourseReleaseRootV2> {
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    !metadata ||
    canonicalJsonV1(metadata) !==
      canonicalJsonV1({
        generation: pin.objectGeneration,
        byteSize: pin.byteSize,
        contentType: pin.contentType,
        contentHash: pin.contentHash,
      })
  )
    fail("root_metadata_mismatch");
  const result = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes: V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
  });
  if (
    result.kind !== "downloaded" ||
    !(result.bytes instanceof Uint8Array) ||
    result.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(result.bytes) !== pin.contentHash
  )
    fail("root_readback_mismatch");
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
  } catch {
    fail("root_utf8_invalid");
  }
  return parseV2UnifiedCourseReleaseRootV2(raw);
}

async function coldReadHead(
  firestore: V2RepositoryFirestorePortV1,
  path: string,
): Promise<V2UnifiedCourseReleaseHeadV2 | null> {
  return firestore.runTransaction(async (transaction) => {
    const value = await transaction.readExact(path);
    return value.exists ? parseV2UnifiedCourseReleaseHeadV2(value.raw) : null;
  });
}

function exactJoin(
  root: V2UnifiedCourseReleaseRootV2,
  head: V2UnifiedCourseReleaseHeadV2,
  request?: V2UnifiedCourseReleaseReadInputV2,
): void {
  if (
    root.rootFingerprint !== head.activeRootFingerprint ||
    root.releaseId !== head.activeReleaseId ||
    root.topologyFingerprint !== head.topologyFingerprint ||
    (request &&
      (root.environment !== request.environment ||
        root.seasonId !== request.seasonId ||
        root.targetLanguage !== request.targetLanguage ||
        root.studyTarget !== request.studyTarget ||
        root.learnerSourceLocale !== request.learnerSourceLocale))
  )
    fail("active_join_mismatch");
}

export function createV2UnifiedCourseReleaseRepositoryV2(input: {
  readonly firestore: V2RepositoryFirestorePortV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): V2UnifiedCourseReleaseRepositoryV2 {
  if (!input || typeof input !== "object" || !input.firestore || !input.storage)
    fail("ports_invalid");
  const { firestore, storage } = input;
  return Object.freeze({
    persistAndAdvance: async (
      request: V2UnifiedCourseReleaseAdvanceInputV2,
    ) => {
      if (!isV2UnifiedCourseReleaseRootV2(request.target))
        fail("root_handle_invalid");
      const raw = canonicalJsonV1(request.target);
      const bytes = new TextEncoder().encode(raw);
      const rawHash = sha256Bytes(bytes);
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage,
        objectPath: v2UnifiedCourseReleaseRootObjectPathV2({
          releaseId: request.target.releaseId,
          rootFingerprint: request.target.rootFingerprint,
          rawHash,
        }),
        bytes,
        maximumBytes: V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const coldTarget = await coldReadRoot(storage, persisted.pin);
      if (coldTarget.rootFingerprint !== request.target.rootFingerprint)
        fail("root_logical_mismatch");
      await commitRootRecord(firestore, coldTarget, persisted.pin);
      const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV2({
        environment: coldTarget.environment,
        seasonId: coldTarget.seasonId,
        targetLanguage: coldTarget.targetLanguage,
        studyTarget: coldTarget.studyTarget,
        learnerSourceLocale: coldTarget.learnerSourceLocale,
      });
      const committed = await firestore.runTransaction(async (transaction) => {
        const currentRaw = await transaction.readExact(documentPath);
        const current = currentRaw.exists
          ? parseV2UnifiedCourseReleaseHeadV2(currentRaw.raw)
          : null;
        const decision = decideV2UnifiedCourseReleaseHeadV2({
          current,
          target: coldTarget,
          targetObject: persisted.pin,
          action: request.action,
          expectedRevision: request.expectedRevision,
          operationId: request.operationId,
          updatedAtIso: request.updatedAtIso,
        });
        if (decision.kind === "commit") {
          const nextRaw = canonicalJsonV1(decision.head);
          if (current === null)
            await transaction.createExact(documentPath, nextRaw);
          else
            await transaction.compareAndSetExact(
              documentPath,
              {
                operationRevision: current.operationRevision,
                operationFingerprint: current.operationFingerprint,
              },
              nextRaw,
            );
        }
        return decision;
      });
      const head = await coldReadHead(firestore, documentPath);
      if (!head || head.headFingerprint !== committed.head.headFingerprint)
        fail("head_readback_mismatch");
      const root = await coldReadRoot(storage, head.activeRootObject);
      exactJoin(root, head);
      const material = Object.freeze({
        root,
        rootObject: head.activeRootObject,
        head,
      });
      return Object.freeze({
        ...material,
        persistenceKind: persisted.kind,
        headDecision: committed.kind,
        activeHandle: mintActiveHandle(material),
      });
    },
    readActive: async (request: V2UnifiedCourseReleaseReadInputV2) => {
      const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV2(request);
      const head = await coldReadHead(firestore, documentPath);
      if (!head) fail("head_missing");
      const root = await coldReadRoot(storage, head.activeRootObject);
      exactJoin(root, head, request);
      const material = Object.freeze({
        root,
        rootObject: head.activeRootObject,
        head,
      });
      return Object.freeze({
        ...material,
        activeHandle: mintActiveHandle(material),
      });
    },
  });
}

export function createFirebaseAdminV2UnifiedCourseReleaseRepositoryV2(): V2UnifiedCourseReleaseRepositoryV2 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return createV2UnifiedCourseReleaseRepositoryV2({
    firestore: io.firestore,
    storage: io.storage,
  });
}
