import { createHash } from "node:crypto";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1,
  encodeLearningV2CourseLessonAudioReleaseIndexV1,
  learningV2CourseLessonAudioReleaseIndexObjectPathV1,
  parseLearningV2CourseLessonAudioReleaseIndexV1,
  type LearningV2CourseLessonAudioReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_audio_release_index_v1";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
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
  parseV2UnifiedCourseReleaseRootV2,
  type V2UnifiedCourseReleaseRootV2,
} from "./v2_unified_course_release_v2";
import { v2UnifiedCourseReleaseRootObjectPathV2 } from "./v2_unified_course_release_repository_v2";
import {
  V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3,
  decideV2UnifiedCourseReleaseHeadV3,
  isV2UnifiedCourseReleaseRootV3,
  parseV2UnifiedCourseReleaseHeadV3,
  parseV2UnifiedCourseReleaseRootV3,
  type V2UnifiedCourseReleaseHeadV3,
  type V2UnifiedCourseReleaseRootV3,
} from "./v2_unified_course_release_v3";

export const V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V3 =
  "learning-v2/unified-course-release-v3/roots" as const;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V3 =
  "content_v2_unified_course_release_heads_v3" as const;
export const V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V3 =
  "content_v2_unified_course_release_roots_v3" as const;

export interface V2UnifiedCourseReleaseAdvanceInputV3 {
  readonly target: V2UnifiedCourseReleaseRootV3;
  readonly action: "activate" | "rollback";
  readonly expectedRevision: number;
  readonly operationId: string;
  readonly updatedAtIso: string;
}

export interface V2UnifiedCourseReleaseReadInputV3 {
  readonly environment: "lab" | "staging" | "production";
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
}

export interface V2UnifiedCourseReleaseActiveHandleV3 {
  readonly kind: "v2_unified_course_release_active_handle_v3";
}

export type V2UnifiedCourseReleaseActiveMaterialV3 = Readonly<{
  root: V2UnifiedCourseReleaseRootV3;
  rootObject: V2RepositoryImmutableObjectPinV1;
  baseRoot: V2UnifiedCourseReleaseRootV2;
  audioIndexes: readonly LearningV2CourseLessonAudioReleaseIndexV1[];
  head: V2UnifiedCourseReleaseHeadV3;
}>;

export interface V2UnifiedCourseReleaseRepositoryV3 {
  persistAndAdvance(input: V2UnifiedCourseReleaseAdvanceInputV3): Promise<
    V2UnifiedCourseReleaseActiveMaterialV3 &
      Readonly<{
        persistenceKind: "created" | "exact_replay";
        headDecision: "commit" | "exact_replay";
        activeHandle: V2UnifiedCourseReleaseActiveHandleV3;
      }>
  >;
  readActive(
    input: V2UnifiedCourseReleaseReadInputV3,
  ): Promise<
    V2UnifiedCourseReleaseActiveMaterialV3 &
      Readonly<{ activeHandle: V2UnifiedCourseReleaseActiveHandleV3 }>
  >;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const activeHandles = new WeakSet<object>();
const activeMaterials = new WeakMap<
  object,
  V2UnifiedCourseReleaseActiveMaterialV3
>();

function fail(code: string): never {
  throw new Error(`v2_unified_course_release_repository_v3_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail("path_invalid");
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail("path_invalid");
  return value;
}

function exactPin(value: unknown): V2RepositoryImmutableObjectPinV1 {
  if (!record(value)) fail("pin_invalid");
  const actual = Object.keys(value).sort();
  const expected = [...PIN_KEYS].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index]) ||
    typeof value.objectPath !== "string" ||
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 2 ||
    value.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail("pin_invalid");
  return Object.freeze({
    objectPath: value.objectPath,
    contentHash: exactHash(value.contentHash),
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  });
}

function preflightDecodedJson(value: unknown): void {
  const stack: Readonly<{ value: unknown; depth: number }>[] = [
    { value, depth: 0 },
  ];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 100_000 || current.depth > 24) fail("json_complexity_invalid");
    if (Array.isArray(current.value)) {
      if (current.value.length > 4_096) fail("json_complexity_invalid");
      for (const child of current.value)
        stack.push({ value: child, depth: current.depth + 1 });
      continue;
    }
    if (record(current.value)) {
      const entries = Object.entries(current.value);
      if (entries.length > 256) fail("json_complexity_invalid");
      for (const [key, child] of entries) {
        if (key === "__proto__" || key === "prototype" || key === "constructor")
          fail("json_complexity_invalid");
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
}

function decodeJsonForPin(raw: string): Record<string, unknown> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail("json_invalid");
  }
  preflightDecodedJson(decoded);
  if (!record(decoded)) fail("json_invalid");
  return decoded;
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readExactRaw(
  storage: V2RepositoryImmutableStoragePortV1,
  pinValue: V2RepositoryImmutableObjectPinV1,
  maximumBytes: number,
  kind: string,
): Promise<string> {
  const pin = exactPin(pinValue);
  if (pin.byteSize > maximumBytes) fail(`${kind}_oversize`);
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
    fail(`${kind}_metadata_mismatch`);
  const downloaded = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes,
  });
  if (
    downloaded.kind !== "downloaded" ||
    !(downloaded.bytes instanceof Uint8Array) ||
    downloaded.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(downloaded.bytes) !== pin.contentHash
  )
    fail(`${kind}_readback_mismatch`);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(downloaded.bytes);
  } catch {
    fail(`${kind}_utf8_invalid`);
  }
}

export function v2UnifiedCourseReleaseRootObjectPathV3(input: {
  readonly releaseId: string;
  readonly rootFingerprint: string;
  readonly rawHash: string;
}): string {
  return `${V2_UNIFIED_COURSE_RELEASE_ROOT_STORAGE_PREFIX_V3}/${sha256Utf8(exactId(input.releaseId))}/${exactHash(input.rootFingerprint)}/${exactHash(input.rawHash)}.json`;
}

function exactReadScope(input: V2UnifiedCourseReleaseReadInputV3) {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "environment|learnerSourceLocale|seasonId|studyTarget|targetLanguage" ||
    (input.environment !== "lab" &&
      input.environment !== "staging" &&
      input.environment !== "production") ||
    !ID_RE.test(input.seasonId) ||
    parseV2ExactLanguageTagV1(input.targetLanguage) === null ||
    parseV2ExactLanguageTagV1(input.studyTarget) === null ||
    parseV2ExactLanguageTagV1(input.learnerSourceLocale) === null
  )
    fail("scope_invalid");
  return input;
}

export function v2UnifiedCourseReleaseHeadDocumentPathV3(
  input: V2UnifiedCourseReleaseReadInputV3,
): string {
  const scope = exactReadScope(input);
  const id = sha256Utf8(canonicalJsonV1(scope));
  return `${V2_UNIFIED_COURSE_RELEASE_HEAD_COLLECTION_V3}/${id}`;
}

export function v2UnifiedCourseReleaseRootRecordDocumentPathV3(
  releaseId: string,
): string {
  return `${V2_UNIFIED_COURSE_RELEASE_ROOT_RECORD_COLLECTION_V3}/${sha256Utf8(exactId(releaseId))}`;
}

function exactBasePin(
  baseRoot: V2UnifiedCourseReleaseRootV2,
  pin: V2RepositoryImmutableObjectPinV1,
  raw: string,
): void {
  const rawHash = sha256Utf8(raw);
  if (
    pin.objectPath !==
      v2UnifiedCourseReleaseRootObjectPathV2({
        releaseId: baseRoot.releaseId,
        rootFingerprint: baseRoot.rootFingerprint,
        rawHash,
      }) ||
    pin.contentHash !== rawHash ||
    pin.byteSize !== utf8ByteLengthV1(raw)
  )
    fail("base_root_pin_mismatch");
}

async function readBaseRoot(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: V2RepositoryImmutableObjectPinV1,
): Promise<V2UnifiedCourseReleaseRootV2> {
  const raw = await readExactRaw(
    storage,
    pin,
    V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
    "base_root",
  );
  preflightDecodedJson(decodeJsonForPin(raw));
  const root = parseV2UnifiedCourseReleaseRootV2(raw);
  exactBasePin(root, pin, raw);
  return root;
}

async function readAudioIndexes(
  storage: V2RepositoryImmutableStoragePortV1,
  root: V2UnifiedCourseReleaseRootV3,
): Promise<readonly LearningV2CourseLessonAudioReleaseIndexV1[]> {
  const indexes: LearningV2CourseLessonAudioReleaseIndexV1[] = [];
  for (const lesson of root.lessons) {
    const raw = await readExactRaw(
      storage,
      lesson.audioIndexObject,
      LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1,
      "audio_index",
    );
    preflightDecodedJson(decodeJsonForPin(raw));
    const index = parseLearningV2CourseLessonAudioReleaseIndexV1(raw);
    const rawHash = sha256Utf8(raw);
    if (
      lesson.audioIndexObject.objectPath !==
        learningV2CourseLessonAudioReleaseIndexObjectPathV1({
          releaseId: index.releaseId,
          lessonId: index.lessonId,
          indexFingerprint: index.indexFingerprint,
          rawHash,
        }) ||
      lesson.audioIndexObject.contentHash !== rawHash ||
      lesson.audioIndexObject.byteSize !== utf8ByteLengthV1(raw) ||
      index.releaseId !== root.releaseId ||
      index.lessonId !== lesson.lessonId ||
      index.lessonOrdinal !== lesson.lessonOrdinal ||
      index.baseLessonIndexFingerprint !== lesson.baseLessonIndexFingerprint ||
      index.indexFingerprint !== lesson.audioIndexFingerprint ||
      index.extensionSetFingerprint !== lesson.extensionSetFingerprint ||
      index.audioSetFingerprint !== lesson.audioSetFingerprint
    )
      fail("audio_index_join_mismatch");
    if (encodeLearningV2CourseLessonAudioReleaseIndexV1(index) !== raw)
      fail("audio_index_canonical_mismatch");
    indexes.push(index);
  }
  return Object.freeze(indexes);
}

async function readDependencies(
  storage: V2RepositoryImmutableStoragePortV1,
  root: V2UnifiedCourseReleaseRootV3,
): Promise<
  Readonly<{
    baseRoot: V2UnifiedCourseReleaseRootV2;
    audioIndexes: readonly LearningV2CourseLessonAudioReleaseIndexV1[];
  }>
> {
  const baseRaw = await readExactRaw(
    storage,
    root.baseRootObject,
    V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2,
    "base_root",
  );
  preflightDecodedJson(decodeJsonForPin(baseRaw));
  const baseRoot = parseV2UnifiedCourseReleaseRootV2(baseRaw);
  exactBasePin(baseRoot, root.baseRootObject, baseRaw);
  if (baseRoot.rootFingerprint !== root.baseRootFingerprint)
    fail("base_root_join_mismatch");
  const audioIndexes = await readAudioIndexes(storage, root);
  return Object.freeze({ baseRoot, audioIndexes });
}

async function coldReadCompositeRoot(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: V2RepositoryImmutableObjectPinV1,
): Promise<
  Readonly<{
    root: V2UnifiedCourseReleaseRootV3;
    baseRoot: V2UnifiedCourseReleaseRootV2;
    audioIndexes: readonly LearningV2CourseLessonAudioReleaseIndexV1[];
  }>
> {
  const raw = await readExactRaw(
    storage,
    pin,
    V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3,
    "root",
  );
  const decoded = decodeJsonForPin(raw);
  const basePin = exactPin(decoded.baseRootObject);
  const baseRoot = await readBaseRoot(storage, basePin);
  const root = parseV2UnifiedCourseReleaseRootV3(raw, baseRoot);
  const rawHash = sha256Utf8(raw);
  if (
    pin.objectPath !==
      v2UnifiedCourseReleaseRootObjectPathV3({
        releaseId: root.releaseId,
        rootFingerprint: root.rootFingerprint,
        rawHash,
      }) ||
    pin.contentHash !== rawHash ||
    pin.byteSize !== utf8ByteLengthV1(raw)
  )
    fail("root_pin_mismatch");
  const audioIndexes = await readAudioIndexes(storage, root);
  return Object.freeze({ root, baseRoot, audioIndexes });
}

function rootRecordRaw(
  root: V2UnifiedCourseReleaseRootV3,
  rootObject: V2RepositoryImmutableObjectPinV1,
): string {
  return canonicalJsonV1({
    schemaVersion: "v2-unified-course-release-root-record.v3",
    releaseId: root.releaseId,
    topologyFingerprint: root.topologyFingerprint,
    rootFingerprint: root.rootFingerprint,
    baseRootFingerprint: root.baseRootFingerprint,
    audioLessonIndexAggregate: root.audioLessonIndexAggregate,
    rootObject,
    recordAuthority: "none_server_readback_required",
    serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
    releaseAuthority: false,
  });
}

async function commitRootRecord(
  firestore: V2RepositoryFirestorePortV1,
  root: V2UnifiedCourseReleaseRootV3,
  rootObject: V2RepositoryImmutableObjectPinV1,
): Promise<void> {
  const path = v2UnifiedCourseReleaseRootRecordDocumentPathV3(root.releaseId);
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

async function coldReadHead(
  firestore: V2RepositoryFirestorePortV1,
  path: string,
): Promise<V2UnifiedCourseReleaseHeadV3 | null> {
  return firestore.runTransaction(async (transaction) => {
    const value = await transaction.readExact(path);
    return value.exists ? parseV2UnifiedCourseReleaseHeadV3(value.raw) : null;
  });
}

function exactJoin(
  material: Omit<V2UnifiedCourseReleaseActiveMaterialV3, "head">,
  head: V2UnifiedCourseReleaseHeadV3,
  request?: V2UnifiedCourseReleaseReadInputV3,
): void {
  const { root, rootObject, baseRoot, audioIndexes } = material;
  if (
    root.rootFingerprint !== head.activeRootFingerprint ||
    root.baseRootFingerprint !== head.activeBaseRootFingerprint ||
    root.releaseId !== head.activeReleaseId ||
    root.topologyFingerprint !== head.topologyFingerprint ||
    canonicalJsonV1(rootObject) !== canonicalJsonV1(head.activeRootObject) ||
    baseRoot.rootFingerprint !== root.baseRootFingerprint ||
    audioIndexes.length !== root.lessons.length ||
    (request &&
      (root.environment !== request.environment ||
        root.seasonId !== request.seasonId ||
        root.targetLanguage !== request.targetLanguage ||
        root.studyTarget !== request.studyTarget ||
        root.learnerSourceLocale !== request.learnerSourceLocale))
  )
    fail("active_join_mismatch");
}

function mintActiveHandle(
  material: V2UnifiedCourseReleaseActiveMaterialV3,
): V2UnifiedCourseReleaseActiveHandleV3 {
  const handle = Object.freeze({
    kind: "v2_unified_course_release_active_handle_v3" as const,
  });
  activeHandles.add(handle);
  activeMaterials.set(handle, material);
  return handle;
}

export function isV2UnifiedCourseReleaseActiveHandleV3(
  value: unknown,
): value is V2UnifiedCourseReleaseActiveHandleV3 {
  return (
    typeof value === "object" && value !== null && activeHandles.has(value)
  );
}

export function resolveV2UnifiedCourseReleaseActiveMaterialV3(
  handle: V2UnifiedCourseReleaseActiveHandleV3,
): V2UnifiedCourseReleaseActiveMaterialV3 {
  const material = activeMaterials.get(handle);
  if (!material || !activeHandles.has(handle)) fail("active_handle_invalid");
  return material;
}

export function createV2UnifiedCourseReleaseRepositoryV3(input: {
  readonly firestore: V2RepositoryFirestorePortV1;
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): V2UnifiedCourseReleaseRepositoryV3 {
  if (!record(input) || !input.firestore || !input.storage)
    fail("ports_invalid");
  const { firestore, storage } = input;
  return Object.freeze({
    persistAndAdvance: async (
      request: V2UnifiedCourseReleaseAdvanceInputV3,
    ) => {
      if (!record(request) || !isV2UnifiedCourseReleaseRootV3(request.target))
        fail("root_handle_invalid");
      await readDependencies(storage, request.target);
      const raw = canonicalJsonV1(request.target);
      const bytes = new TextEncoder().encode(raw);
      const rawHash = sha256Bytes(bytes);
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage,
        objectPath: v2UnifiedCourseReleaseRootObjectPathV3({
          releaseId: request.target.releaseId,
          rootFingerprint: request.target.rootFingerprint,
          rawHash,
        }),
        bytes,
        maximumBytes: V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const coldTarget = await coldReadCompositeRoot(storage, persisted.pin);
      if (coldTarget.root.rootFingerprint !== request.target.rootFingerprint)
        fail("root_logical_mismatch");
      await commitRootRecord(firestore, coldTarget.root, persisted.pin);
      const scope = {
        environment: coldTarget.root.environment,
        seasonId: coldTarget.root.seasonId,
        targetLanguage: coldTarget.root.targetLanguage,
        studyTarget: coldTarget.root.studyTarget,
        learnerSourceLocale: coldTarget.root.learnerSourceLocale,
      };
      const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV3(scope);
      const committed = await firestore.runTransaction(async (transaction) => {
        const currentRaw = await transaction.readExact(documentPath);
        const current = currentRaw.exists
          ? parseV2UnifiedCourseReleaseHeadV3(currentRaw.raw)
          : null;
        const decision = decideV2UnifiedCourseReleaseHeadV3({
          current,
          target: coldTarget.root,
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
      const cold = await coldReadCompositeRoot(storage, head.activeRootObject);
      const material = Object.freeze({
        ...cold,
        rootObject: head.activeRootObject,
        head,
      });
      exactJoin(material, head);
      return Object.freeze({
        ...material,
        persistenceKind: persisted.kind,
        headDecision: committed.kind,
        activeHandle: mintActiveHandle(material),
      });
    },
    readActive: async (request: V2UnifiedCourseReleaseReadInputV3) => {
      const scope = exactReadScope(request);
      const documentPath = v2UnifiedCourseReleaseHeadDocumentPathV3(scope);
      const head = await coldReadHead(firestore, documentPath);
      if (!head) fail("head_missing");
      const cold = await coldReadCompositeRoot(storage, head.activeRootObject);
      const material = Object.freeze({
        ...cold,
        rootObject: head.activeRootObject,
        head,
      });
      exactJoin(material, head, scope);
      return Object.freeze({
        ...material,
        activeHandle: mintActiveHandle(material),
      });
    },
  });
}

export function createFirebaseAdminV2UnifiedCourseReleaseRepositoryV3(): V2UnifiedCourseReleaseRepositoryV3 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return createV2UnifiedCourseReleaseRepositoryV3({
    firestore: io.firestore,
    storage: io.storage,
  });
}
