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
  V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1,
  decideV2UnifiedCourseReleaseHeadV1,
  isV2UnifiedCourseReleaseRootV1,
  parseV2UnifiedCourseReleaseHeadV1,
  parseV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseHeadV1,
  type V2UnifiedCourseReleaseRootV1,
} from "./v2_unified_course_release_v1";

export const V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V1 =
  "learning-v2/unified-course-releases" as const;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V1 =
  "content_v2_unified_course_release_heads" as const;
export const V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V1 =
  "content_v2_unified_course_release_roots" as const;

export interface V2UnifiedCourseReleaseAdvanceInputV1 {
  readonly target: V2UnifiedCourseReleaseRootV1;
  readonly action: "activate" | "rollback";
  readonly expectedRevision: number;
  readonly operationId: string;
  readonly updatedAtIso: string;
}

export interface V2UnifiedCourseReleaseReadInputV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
}

export interface V2UnifiedCourseReleaseRepositoryV1 {
  persistAndAdvance(input: V2UnifiedCourseReleaseAdvanceInputV1): Promise<
    Readonly<{
      root: V2UnifiedCourseReleaseRootV1;
      rootObject: V2RepositoryImmutableObjectPinV1;
      head: V2UnifiedCourseReleaseHeadV1;
      persistenceKind: "created" | "exact_replay";
      headDecision: "commit" | "exact_replay";
      activeHandle: V2UnifiedCourseReleaseActiveHandleV1;
    }>
  >;
  readActive(input: V2UnifiedCourseReleaseReadInputV1): Promise<
    Readonly<{
      head: V2UnifiedCourseReleaseHeadV1;
      root: V2UnifiedCourseReleaseRootV1;
      rootObject: V2RepositoryImmutableObjectPinV1;
      activeHandle: V2UnifiedCourseReleaseActiveHandleV1;
    }>
  >;
}

export interface V2UnifiedCourseReleaseActiveHandleV1 {
  readonly kind: "v2_unified_course_release_active_handle";
}

const activeHandles = new WeakSet<object>();
const activeMaterials = new WeakMap<
  object,
  Readonly<{
    head: V2UnifiedCourseReleaseHeadV1;
    root: V2UnifiedCourseReleaseRootV1;
    rootObject: V2RepositoryImmutableObjectPinV1;
  }>
>();

function mintActiveHandle(
  material: Readonly<{
    head: V2UnifiedCourseReleaseHeadV1;
    root: V2UnifiedCourseReleaseRootV1;
    rootObject: V2RepositoryImmutableObjectPinV1;
  }>,
): V2UnifiedCourseReleaseActiveHandleV1 {
  const handle = Object.freeze({
    kind: "v2_unified_course_release_active_handle" as const,
  });
  activeHandles.add(handle);
  activeMaterials.set(handle, material);
  return handle;
}

export function resolveV2UnifiedCourseReleaseActiveMaterialV1(
  handle: V2UnifiedCourseReleaseActiveHandleV1,
): Readonly<{
  head: V2UnifiedCourseReleaseHeadV1;
  root: V2UnifiedCourseReleaseRootV1;
  rootObject: V2RepositoryImmutableObjectPinV1;
}> {
  const material = activeMaterials.get(handle);
  if (!material || !activeHandles.has(handle)) fail("active_handle_invalid");
  return material;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LOCALE_RE = /^[a-z]{2,8}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/u;

function fail(code: string): never {
  throw new Error(`v2_unified_course_release_repository_${code}`);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function v2UnifiedCourseReleaseRootObjectPathV1(input: {
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !ID_RE.test(input.releaseId) ||
    !HASH_RE.test(input.rootFingerprint) ||
    !HASH_RE.test(input.rawHash)
  )
    fail("path_invalid");
  return `${V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V1}/${input.releaseId}/${input.rootFingerprint}/${input.rawHash}.json`;
}

export function v2UnifiedCourseReleaseHeadDocumentPathV1(input: {
  readonly environment: "lab" | "staging" | "production";
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
}): string {
  if (
    !["lab", "staging", "production"].includes(input.environment) ||
    !ID_RE.test(input.seasonId) ||
    !LOCALE_RE.test(input.studyTarget) ||
    !LOCALE_RE.test(input.learnerSourceLocale)
  )
    fail("path_invalid");
  const id = createHash("sha256").update(canonicalJsonV1(input)).digest("hex");
  return `${V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V1}/${id}`;
}

export function v2UnifiedCourseReleaseRootRecordDocumentPathV1(
  releaseId: string,
): string {
  if (!ID_RE.test(releaseId)) fail("path_invalid");
  return `${V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V1}/${createHash("sha256").update(releaseId).digest("hex")}`;
}

function rootRecordRaw(
  root: V2UnifiedCourseReleaseRootV1,
  rootObject: V2RepositoryImmutableObjectPinV1,
): string {
  return canonicalJsonV1({
    schemaVersion: "v2-unified-course-release-root-record.v1",
    releaseId: root.releaseId,
    rootFingerprint: root.rootFingerprint,
    rootObject,
    recordAuthority: "none_server_readback_required",
    releaseAuthority: false,
  });
}

async function commitRootRecord(
  firestore: V2RepositoryFirestorePortV1,
  root: V2UnifiedCourseReleaseRootV1,
  rootObject: V2RepositoryImmutableObjectPinV1,
): Promise<void> {
  const path = v2UnifiedCourseReleaseRootRecordDocumentPathV1(root.releaseId);
  const expectedRaw = rootRecordRaw(root, rootObject);
  await firestore.runTransaction(async (transaction) => {
    const current = await transaction.readExact(path);
    if (!current.exists) {
      await transaction.createExact(path, expectedRaw);
      return;
    }
    if (current.raw !== expectedRaw) fail("release_id_reuse_conflict");
  });
}

async function coldReadRoot(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: V2RepositoryImmutableObjectPinV1,
): Promise<V2UnifiedCourseReleaseRootV1> {
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
    maximumBytes: V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1,
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
  return parseV2UnifiedCourseReleaseRootV1(raw);
}

async function coldReadHead(
  firestore: V2RepositoryFirestorePortV1,
  path: string,
): Promise<V2UnifiedCourseReleaseHeadV1 | null> {
  return firestore.runTransaction(async (transaction) => {
    const value = await transaction.readExact(path);
    return value.exists ? parseV2UnifiedCourseReleaseHeadV1(value.raw) : null;
  });
}

export function createV2UnifiedCourseReleaseRepositoryV1(input: {
  readonly firestore: V2RepositoryFirestorePortV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): V2UnifiedCourseReleaseRepositoryV1 {
  if (!input || typeof input !== "object" || !input.firestore || !input.storage)
    fail("ports_invalid");
  const { firestore, storage } = input;
  return Object.freeze({
    persistAndAdvance: async (
      request: V2UnifiedCourseReleaseAdvanceInputV1,
    ) => {
      if (!isV2UnifiedCourseReleaseRootV1(request.target))
        fail("root_handle_invalid");
      const raw = canonicalJsonV1(request.target);
      const bytes = new TextEncoder().encode(raw);
      const rawHash = sha256Bytes(bytes);
      const objectPath = v2UnifiedCourseReleaseRootObjectPathV1({
        releaseId: request.target.releaseId,
        rootFingerprint: request.target.rootFingerprint,
        rawHash,
      });
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage,
        objectPath,
        bytes,
        maximumBytes: V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const coldTarget = await coldReadRoot(storage, persisted.pin);
      if (coldTarget.rootFingerprint !== request.target.rootFingerprint)
        fail("root_logical_mismatch");
      await commitRootRecord(firestore, coldTarget, persisted.pin);
      const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV1({
        environment: coldTarget.environment,
        seasonId: coldTarget.seasonId,
        studyTarget: coldTarget.studyTarget,
        learnerSourceLocale: coldTarget.learnerSourceLocale,
      });
      const committed = await firestore.runTransaction(async (transaction) => {
        const currentRaw = await transaction.readExact(documentPath);
        const current = currentRaw.exists
          ? parseV2UnifiedCourseReleaseHeadV1(currentRaw.raw)
          : null;
        const decision = decideV2UnifiedCourseReleaseHeadV1({
          current,
          target: coldTarget,
          targetObject: persisted.pin,
          action: request.action,
          expectedRevision: request.expectedRevision,
          operationId: request.operationId,
          updatedAtIso: request.updatedAtIso,
        });
        if (decision.kind === "commit") {
          if (current === null)
            await transaction.createExact(
              documentPath,
              canonicalJsonV1(decision.head),
            );
          else
            await transaction.compareAndSetExact(
              documentPath,
              {
                operationRevision: current.operationRevision,
                operationFingerprint: current.operationFingerprint,
              },
              canonicalJsonV1(decision.head),
            );
        }
        return decision;
      });
      const coldHead = await coldReadHead(firestore, documentPath);
      if (
        !coldHead ||
        coldHead.headFingerprint !== committed.head.headFingerprint
      )
        fail("head_readback_mismatch");
      const finalRoot = await coldReadRoot(storage, coldHead.activeRootObject);
      if (
        finalRoot.rootFingerprint !== coldHead.activeRootFingerprint ||
        finalRoot.releaseId !== coldHead.activeReleaseId
      )
        fail("active_join_mismatch");
      return Object.freeze({
        root: finalRoot,
        rootObject: coldHead.activeRootObject,
        head: coldHead,
        persistenceKind: persisted.kind,
        headDecision: committed.kind,
        activeHandle: mintActiveHandle(
          Object.freeze({
            head: coldHead,
            root: finalRoot,
            rootObject: coldHead.activeRootObject,
          }),
        ),
      });
    },
    readActive: async (request: V2UnifiedCourseReleaseReadInputV1) => {
      const path = v2UnifiedCourseReleaseHeadDocumentPathV1(request);
      const head = await coldReadHead(firestore, path);
      if (!head) fail("head_missing");
      const root = await coldReadRoot(storage, head.activeRootObject);
      if (
        root.environment !== request.environment ||
        root.seasonId !== request.seasonId ||
        root.studyTarget !== request.studyTarget ||
        root.learnerSourceLocale !== request.learnerSourceLocale ||
        root.rootFingerprint !== head.activeRootFingerprint ||
        root.releaseId !== head.activeReleaseId
      )
        fail("active_join_mismatch");
      const material = Object.freeze({
        head,
        root,
        rootObject: head.activeRootObject,
      });
      return Object.freeze({
        ...material,
        activeHandle: mintActiveHandle(material),
      });
    },
  });
}

export function createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1(): V2UnifiedCourseReleaseRepositoryV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return createV2UnifiedCourseReleaseRepositoryV1({
    firestore: io.firestore,
    storage: io.storage,
  });
}
