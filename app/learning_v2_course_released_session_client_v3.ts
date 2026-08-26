import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";

import { initFirebaseAppCheckIfAvailable } from "./app_check_init";
import { withCallableTimeout } from "./callable_timeout";
import { ensureAnonUser } from "./cloud_sync";
import { withBackgroundNetworkLease } from "./interactive_network_quiet";
import {
  getLearningV2CourseSessionAudioPreloadSummaryV1,
  isLearningV2CourseSessionAudioPreloadHandleV1,
  preloadLearningV2CourseSessionAudioV1,
  type LearningV2CourseSessionAudioPreloadHandleV1,
} from "./learning_v2_course_session_audio_preload_v1";
import { buildLearningV2Session1BundledAudioChildV1 } from "./learning_v2_session1_production_audio_v1";
import { peekStableId } from "./stable_id";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../modules/learning-v2/content/course_topology_v1";
import { parseV2ExactLanguageTagV1 } from "../modules/learning-v2/contracts/language_tag_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import {
  LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1,
  parseLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1,
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionAuxiliaryChildV1,
  type LearningV2CourseSessionIntroChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1,
  parseLearningV2CourseSessionEvaluatorCapsuleChildV1,
  type LearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import { materializeLearningV2CourseSessionAudioChildV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  authoredLearningV2SessionShard,
  type AuthoredLearningV2SessionShard,
} from "../modules/learning-v2/content/source/authored_sessions_v1";
import { authoredEsLearningV2SessionShard } from "../modules/learning-v2/content/source/es_authored_sessions_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";

export const LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3 =
  "learning-v2-course-released-session-cache.v3" as const;
export const LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V3 = 6;
export const LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V3 =
  40 * 1024 * 1024;
export const LEARNING_V2_COURSE_SESSION_READY_SCHEMA_V3 =
  "learning-v2-course-session-ready.v3" as const;

const STORAGE_KEY = "learning_v2_course_released_session_cache_v3";
const FUNCTIONS_REGION = "us-central1";
const CALLABLE_NAME = "learningV2CourseReleasedSessionGetV3";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const encoder = new TextEncoder();

export interface LearningV2CourseReleasedSessionLocatorV3 {
  readonly environment: "lab" | "staging" | "production";
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly activeRootFingerprint: string;
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
}

export type LearningV2CourseReleasedSessionCurrentLocatorV3 = Omit<
  LearningV2CourseReleasedSessionLocatorV3,
  "activeRootFingerprint"
>;

export type LearningV2CourseReleasedSessionMaterialV3 = Readonly<{
  releaseId: string;
  activeRootFingerprint: string;
  activeBaseRootFingerprint: string;
  activeHeadFingerprint: string;
  topologyFingerprint: string;
  lessonId: string;
  lessonOrdinal: number;
  baseLessonIndexFingerprint: string;
  audioLessonIndexFingerprint: string;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  audioExtensionFingerprint: string;
  introChild: LearningV2CourseSessionIntroChildV1;
  learnerChild: LearningV2CourseSessionLearnerChildV1;
  evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
  audioChild: LearningV2CourseSessionAudioChildV1;
}>;

export type LearningV2CourseReleasedSessionAppResultV3 = Readonly<{
  material: LearningV2CourseReleasedSessionMaterialV3;
  source: "network" | "lkg";
  transport: "firebase_callable" | "offline_lkg";
  cacheAuthority: "availability_only_not_release_or_origin_authority";
  evaluatorCapsuleAvailableToClient: true;
  evaluatorSidecarAvailableToClient: false;
  answerPayloadAvailableToTransport: false;
  audioDescriptorsAvailableToClient: true;
}>;

export interface LearningV2CourseSessionReadyHandleV3 {
  readonly __opaqueLearningV2CourseSessionReadyHandleV3: unique symbol;
}

export interface LearningV2CourseSessionReadySummaryV3 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_READY_SCHEMA_V3;
  readonly activeRootFingerprint: string;
  readonly courseSessionId: string;
  readonly sessionRunId: string;
  readonly packageFingerprint: string;
  readonly learnerFingerprint: string;
  readonly audioFingerprint: string;
  readonly textSource: "network" | "lkg";
  readonly textReadiness: "canonical_children_parsed_and_account_scoped_cached";
  readonly audioReadiness: "all_selected_mp3_hash_verified_local_files";
  readonly startPolicy: "intro_may_open_only_after_text_and_audio_ready";
  readonly answerPathTransport: "none";
  readonly serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  readonly releaseAuthority: false;
  readonly readyFingerprint: string;
}

type CallableResponse = Readonly<{
  schemaVersion: "v2-course-released-session-response.v3";
  releaseId: string;
  activeRootFingerprint: string;
  activeBaseRootFingerprint: string;
  activeHeadFingerprint: string;
  topologyFingerprint: string;
  lessonId: string;
  lessonOrdinal: number;
  baseLessonIndexFingerprint: string;
  audioLessonIndexFingerprint: string;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  introFingerprint: string;
  learnerFingerprint: string;
  auxiliaryFingerprint: string;
  evaluatorCapsuleSetFingerprint: string;
  audioExtensionFingerprint: string;
  audioFingerprint: string;
  canonicalIntroRaw: string;
  canonicalLearnerRaw: string;
  canonicalEvaluatorCapsuleRaw: string;
  canonicalAuxiliaryRaw: string;
  canonicalAudioChildRaw: string;
  transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  repositoryOriginProjection: "active_v3_composite_text_audio_exact_session_join";
  learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only";
  evaluatorIsolation: "server_sidecar_not_exposed";
  answerPayload: "absent";
  correctnessAuthority: "local_device_only";
  serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  cacheAuthority: "none_client_lkg_is_availability_only";
  playbackPreparation: "client_generation_pinned_mp3_prefetch_required_before_session";
  serverRequestPerPlayback: false;
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  completionAuthority: "none";
  releaseAuthority: false;
}>;

type CacheRow = Readonly<{
  key: string;
  accountScopeHash: string;
  locator: LearningV2CourseReleasedSessionLocatorV3;
  canonicalResponseRaw: string;
  byteSize: number;
  touchedAtMs: number;
}>;

type CacheEnvelope = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3;
  rows: readonly CacheRow[];
}>;

type ReadyMaterial = Readonly<{
  result: LearningV2CourseReleasedSessionAppResultV3;
  audio: LearningV2CourseSessionAudioPreloadHandleV1;
  summary: LearningV2CourseSessionReadySummaryV3;
  learnerSourceLocale: string;
}>;

const RESPONSE_KEYS = Object.freeze([
  "activeBaseRootFingerprint",
  "activeHeadFingerprint",
  "activeRootFingerprint",
  "answerPayload",
  "audioExtensionFingerprint",
  "audioFingerprint",
  "audioLessonIndexFingerprint",
  "auxiliaryFingerprint",
  "baseLessonIndexFingerprint",
  "cacheAuthority",
  "canonicalAudioChildRaw",
  "canonicalAuxiliaryRaw",
  "canonicalEvaluatorCapsuleRaw",
  "canonicalIntroRaw",
  "canonicalLearnerRaw",
  "childSetFingerprint",
  "completionAuthority",
  "correctnessAuthority",
  "courseSessionId",
  "evaluatorCapsuleSetFingerprint",
  "evaluatorIsolation",
  "evidenceAuthority",
  "introFingerprint",
  "learnerFingerprint",
  "learnerProjection",
  "lessonId",
  "lessonOrdinal",
  "masteryAuthority",
  "packageFingerprint",
  "playbackPreparation",
  "releaseAuthority",
  "releaseId",
  "repositoryOriginProjection",
  "schemaVersion",
  "serverAnswerAuthority",
  "serverRequestPerPlayback",
  "sessionOrdinal",
  "topologyFingerprint",
  "transportAuthority",
  "walletAuthority",
] as const);
const peek = new Map<string, LearningV2CourseReleasedSessionMaterialV3>();
const currentPreloads = new Map<string, Promise<void>>();
const readyHandles = new WeakSet<object>();
const readyMetadata = new WeakMap<object, ReadyMaterial>();
const readyInFlight = new Map<
  string,
  Promise<LearningV2CourseSessionReadyHandleV3>
>();
let writeChain: Promise<void> = Promise.resolve();

function fail(): never {
  throw new Error("learning_v2_course_released_session_app_client_v3_invalid");
}

function byteSize(value: string): number {
  return encoder.encode(value).byteLength;
}

function plain(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value).sort();
  const sorted = [...expected].sort();
  if (
    keys.length !== sorted.length ||
    keys.some((key, index) => key !== sorted[index])
  )
    fail();
}

function exactLocator(
  value: LearningV2CourseReleasedSessionLocatorV3,
): LearningV2CourseReleasedSessionLocatorV3 {
  if (!plain(value)) fail();
  exactKeys(value, [
    "activeRootFingerprint",
    "environment",
    "learnerSourceLocale",
    "lessonOrdinal",
    "seasonId",
    "sessionOrdinal",
    "studyTarget",
    "targetLanguage",
  ]);
  if (
    !["lab", "staging", "production"].includes(value.environment) ||
    parseV2ExactLanguageTagV1(value.targetLanguage) === null ||
    parseV2ExactLanguageTagV1(value.studyTarget) === null ||
    parseV2ExactLanguageTagV1(value.learnerSourceLocale) === null ||
    !ID_RE.test(value.seasonId) ||
    !HASH_RE.test(value.activeRootFingerprint) ||
    !Number.isSafeInteger(value.lessonOrdinal) ||
    value.lessonOrdinal < 1 ||
    value.lessonOrdinal > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    value.sessionOrdinal < 1 ||
    value.sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1
  )
    fail();
  return Object.freeze({ ...value });
}

function exactCurrentLocator(
  value: LearningV2CourseReleasedSessionCurrentLocatorV3,
): LearningV2CourseReleasedSessionCurrentLocatorV3 {
  const parsed = exactLocator({
    ...value,
    activeRootFingerprint: "0".repeat(64),
  });
  const { activeRootFingerprint: _ignored, ...current } = parsed;
  return Object.freeze(current);
}

function cacheKey(
  locator: LearningV2CourseReleasedSessionLocatorV3,
  accountScopeHash: string,
): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return [
    "learning-v2:course-session-v3",
    accountScopeHash,
    locator.environment,
    locator.targetLanguage,
    locator.studyTarget,
    locator.learnerSourceLocale,
    locator.seasonId,
    locator.activeRootFingerprint,
    locator.lessonOrdinal,
    locator.sessionOrdinal,
  ].join(":");
}

function currentKey(
  locator: LearningV2CourseReleasedSessionCurrentLocatorV3,
): string {
  return canonicalJsonV1(locator);
}

function parseResponse(
  value: unknown,
  locator: LearningV2CourseReleasedSessionLocatorV3,
): LearningV2CourseReleasedSessionMaterialV3 {
  if (!plain(value)) fail();
  exactKeys(value, RESPONSE_KEYS);
  const row = value as unknown as CallableResponse;
  const expectedLessonId = learningV2CourseLessonIdV1(locator.lessonOrdinal);
  const expectedSessionId = learningV2CourseSessionIdV1(
    locator.lessonOrdinal,
    locator.sessionOrdinal,
  );
  const hashes = [
    row.activeRootFingerprint,
    row.activeBaseRootFingerprint,
    row.activeHeadFingerprint,
    row.topologyFingerprint,
    row.baseLessonIndexFingerprint,
    row.audioLessonIndexFingerprint,
    row.packageFingerprint,
    row.childSetFingerprint,
    row.introFingerprint,
    row.learnerFingerprint,
    row.auxiliaryFingerprint,
    row.evaluatorCapsuleSetFingerprint,
    row.audioExtensionFingerprint,
    row.audioFingerprint,
  ];
  if (
    row.schemaVersion !== "v2-course-released-session-response.v3" ||
    !ID_RE.test(row.releaseId) ||
    hashes.some((hash) => !HASH_RE.test(hash)) ||
    row.activeRootFingerprint !== locator.activeRootFingerprint ||
    row.lessonId !== expectedLessonId ||
    row.lessonOrdinal !== locator.lessonOrdinal ||
    row.courseSessionId !== expectedSessionId ||
    row.sessionOrdinal !== locator.sessionOrdinal ||
    row.transportAuthority !==
      "firebase_callable_auth_and_app_check_boundary" ||
    row.repositoryOriginProjection !==
      "active_v3_composite_text_audio_exact_session_join" ||
    row.learnerProjection !==
      "intro_learner_capsule_auxiliary_audio_child_only" ||
    row.evaluatorIsolation !== "server_sidecar_not_exposed" ||
    row.answerPayload !== "absent" ||
    row.correctnessAuthority !== "local_device_only" ||
    row.serverAnswerAuthority !==
      "none_answers_never_transported_or_rechecked" ||
    row.cacheAuthority !== "none_client_lkg_is_availability_only" ||
    row.playbackPreparation !==
      "client_generation_pinned_mp3_prefetch_required_before_session" ||
    row.serverRequestPerPlayback !== false ||
    row.walletAuthority !== "none" ||
    row.masteryAuthority !== "none" ||
    row.evidenceAuthority !== "none" ||
    row.completionAuthority !== "none" ||
    row.releaseAuthority !== false ||
    typeof row.canonicalIntroRaw !== "string" ||
    typeof row.canonicalLearnerRaw !== "string" ||
    typeof row.canonicalEvaluatorCapsuleRaw !== "string" ||
    typeof row.canonicalAuxiliaryRaw !== "string" ||
    typeof row.canonicalAudioChildRaw !== "string" ||
    byteSize(row.canonicalIntroRaw) >
      LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalLearnerRaw) >
      LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalEvaluatorCapsuleRaw) >
      LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalAuxiliaryRaw) >
      LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalAudioChildRaw) >
      LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1
  )
    fail();
  const introChild = parseLearningV2CourseSessionIntroChildV1(
    row.canonicalIntroRaw,
  );
  const learnerChild = parseLearningV2CourseSessionLearnerChildV1(
    row.canonicalLearnerRaw,
  );
  const evaluatorCapsuleChild =
    parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
      row.canonicalEvaluatorCapsuleRaw,
    );
  const auxiliaryChild = parseLearningV2CourseSessionAuxiliaryChildV1(
    row.canonicalAuxiliaryRaw,
  );
  const audioChild = parseLearningV2CourseSessionAudioChildV1(
    row.canonicalAudioChildRaw,
    learnerChild,
  );
  if (
    introChild.courseSessionId !== expectedSessionId ||
    learnerChild.courseSessionId !== expectedSessionId ||
    evaluatorCapsuleChild.courseSessionId !== expectedSessionId ||
    auxiliaryChild.courseSessionId !== expectedSessionId ||
    audioChild.courseSessionId !== expectedSessionId ||
    introChild.introFingerprint !== row.introFingerprint ||
    learnerChild.learnerFingerprint !== row.learnerFingerprint ||
    evaluatorCapsuleChild.capsuleSetFingerprint !==
      row.evaluatorCapsuleSetFingerprint ||
    auxiliaryChild.auxiliaryFingerprint !== row.auxiliaryFingerprint ||
    audioChild.learnerFingerprint !== learnerChild.learnerFingerprint ||
    audioChild.audioFingerprint !== row.audioFingerprint ||
    learnerChild.targetLanguage !== locator.targetLanguage
  )
    fail();
  return Object.freeze({
    releaseId: row.releaseId,
    activeRootFingerprint: row.activeRootFingerprint,
    activeBaseRootFingerprint: row.activeBaseRootFingerprint,
    activeHeadFingerprint: row.activeHeadFingerprint,
    topologyFingerprint: row.topologyFingerprint,
    lessonId: row.lessonId,
    lessonOrdinal: row.lessonOrdinal,
    baseLessonIndexFingerprint: row.baseLessonIndexFingerprint,
    audioLessonIndexFingerprint: row.audioLessonIndexFingerprint,
    courseSessionId: row.courseSessionId,
    sessionOrdinal: row.sessionOrdinal,
    packageFingerprint: row.packageFingerprint,
    childSetFingerprint: row.childSetFingerprint,
    audioExtensionFingerprint: row.audioExtensionFingerprint,
    introChild,
    learnerChild,
    evaluatorCapsuleChild,
    auxiliaryChild,
    audioChild,
  });
}

function setPeek(
  key: string,
  response: unknown,
  locator: LearningV2CourseReleasedSessionLocatorV3,
) {
  const material = parseResponse(response, locator);
  peek.delete(key);
  peek.set(key, material);
  while (peek.size > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V3) {
    const oldest = peek.keys().next().value as string | undefined;
    if (!oldest) break;
    peek.delete(oldest);
  }
  return material;
}

function emptyEnvelope(): CacheEnvelope {
  return Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3,
    rows: Object.freeze([]),
  });
}

function parseEnvelope(raw: string | null): CacheEnvelope {
  if (raw === null) return emptyEnvelope();
  if (byteSize(raw) > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V3)
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!plain(value)) fail();
  exactKeys(value, ["rows", "schemaVersion"]);
  if (
    value.schemaVersion !==
      LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3 ||
    !Array.isArray(value.rows) ||
    value.rows.length > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V3
  )
    fail();
  const rows = value.rows.map((candidate): CacheRow => {
    if (!plain(candidate)) fail();
    exactKeys(candidate, [
      "accountScopeHash",
      "byteSize",
      "canonicalResponseRaw",
      "key",
      "locator",
      "touchedAtMs",
    ]);
    const locator = exactLocator(
      candidate.locator as LearningV2CourseReleasedSessionLocatorV3,
    );
    if (
      typeof candidate.accountScopeHash !== "string" ||
      !HASH_RE.test(candidate.accountScopeHash) ||
      typeof candidate.key !== "string" ||
      candidate.key !== cacheKey(locator, candidate.accountScopeHash) ||
      typeof candidate.canonicalResponseRaw !== "string" ||
      !Number.isSafeInteger(candidate.byteSize) ||
      candidate.byteSize !== byteSize(candidate.canonicalResponseRaw) ||
      !Number.isSafeInteger(candidate.touchedAtMs) ||
      Number(candidate.touchedAtMs) < 0
    )
      fail();
    let response: unknown;
    try {
      response = JSON.parse(candidate.canonicalResponseRaw);
    } catch {
      fail();
    }
    setPeek(candidate.key, response, locator);
    return Object.freeze({
      key: candidate.key,
      accountScopeHash: candidate.accountScopeHash,
      locator,
      canonicalResponseRaw: candidate.canonicalResponseRaw,
      byteSize: Number(candidate.byteSize),
      touchedAtMs: Number(candidate.touchedAtMs),
    });
  });
  return Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3,
    rows: Object.freeze(rows),
  });
}

async function readEnvelope(): Promise<CacheEnvelope> {
  try {
    return parseEnvelope(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    peek.clear();
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    return emptyEnvelope();
  }
}

function boundedRows(rows: readonly CacheRow[]): readonly CacheRow[] {
  const selected: CacheRow[] = [];
  for (const row of [...rows].sort((a, b) => b.touchedAtMs - a.touchedAtMs)) {
    if (
      selected.length >=
      LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V3
    )
      break;
    const raw = canonicalJsonV1({
      schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3,
      rows: [...selected, row],
    });
    if (byteSize(raw) <= LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V3)
      selected.push(row);
  }
  return Object.freeze(selected);
}

async function persistRow(row: CacheRow): Promise<void> {
  writeChain = writeChain
    .then(async () => {
      const current = await readEnvelope();
      const rows = boundedRows([
        row,
        ...current.rows.filter((candidate) => candidate.key !== row.key),
      ]);
      await AsyncStorage.setItem(
        STORAGE_KEY,
        canonicalJsonV1({
          schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V3,
          rows,
        }),
      );
    })
    .catch(() => undefined);
  return writeChain;
}

function allowsOfflineFallback(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  return ![
    "functions/invalid-argument",
    "functions/unauthenticated",
    "functions/permission-denied",
    "functions/failed-precondition",
    "functions/data-loss",
    "invalid-argument",
    "unauthenticated",
    "permission-denied",
    "failed-precondition",
    "data-loss",
  ].includes(code);
}

async function fetchNetwork(
  locator: LearningV2CourseReleasedSessionCurrentLocatorV3 &
    Readonly<{ activeRootFingerprint: string | null }>,
): Promise<unknown> {
  return withBackgroundNetworkLease(
    "learning-v2.course-released-session-v3",
    async (lease) => {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      lease.assertCurrent();
      const callable = httpsCallable<
        {
          environment: string;
          targetLanguage: string;
          studyTarget: string;
          learnerSourceLocale: string;
          seasonId: string;
          expectedActiveRootFingerprint: string | null;
          lessonOrdinal: number;
          sessionOrdinal: number;
        },
        CallableResponse
      >(getFunctions(getApp(), FUNCTIONS_REGION), CALLABLE_NAME);
      const result = await withCallableTimeout(
        callable({
          environment: locator.environment,
          targetLanguage: locator.targetLanguage,
          studyTarget: locator.studyTarget,
          learnerSourceLocale: locator.learnerSourceLocale,
          seasonId: locator.seasonId,
          expectedActiveRootFingerprint: locator.activeRootFingerprint,
          lessonOrdinal: locator.lessonOrdinal,
          sessionOrdinal: locator.sessionOrdinal,
        }),
        CALLABLE_NAME,
        30_000,
      );
      lease.assertCurrent();
      return result.data;
    },
  );
}

function appResult(
  material: LearningV2CourseReleasedSessionMaterialV3,
  source: "network" | "lkg",
): LearningV2CourseReleasedSessionAppResultV3 {
  return Object.freeze({
    material,
    source,
    transport: source === "network" ? "firebase_callable" : "offline_lkg",
    cacheAuthority: "availability_only_not_release_or_origin_authority",
    evaluatorCapsuleAvailableToClient: true as const,
    evaluatorSidecarAvailableToClient: false as const,
    answerPayloadAvailableToTransport: false as const,
    audioDescriptorsAvailableToClient: true as const,
  });
}

export function peekCurrentLearningV2CourseReleasedSessionV3(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV3,
): LearningV2CourseReleasedSessionMaterialV3 | null {
  const locator = exactCurrentLocator(locatorInput);
  const stableId = peekStableId();
  if (!stableId) return null;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const prefix = `learning-v2:course-session-v3:${accountScopeHash}:${locator.environment}:${locator.targetLanguage}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:`;
  const matches = [...peek.entries()].filter(
    ([key, material]) =>
      key.startsWith(prefix) &&
      material.lessonOrdinal === locator.lessonOrdinal &&
      material.sessionOrdinal === locator.sessionOrdinal,
  );
  return matches.at(-1)?.[1] ?? null;
}

export async function hydrateLearningV2CourseReleasedSessionCacheV3(): Promise<void> {
  await readEnvelope();
}

// зачем этот блок целиком (владелец, 2026-08-17): «первый урок уже должен быть
// в бандле». Урок 1 (10 написанных сессий) лежит в коде приложения с прошлой
// сессии работы, но проигрыватель всё равно уходил в сеть за КАЖДОЙ сессией —
// экран висел на «Подготавливаем занятие» и мог показать «Сессия недоступна»,
// хотя весь текст уже был на телефоне. Здесь — прямой путь без единого
// сетевого вызова для сессий, у которых есть локальный источник; остальные
// уроки (пока не написаны локально) идут через сеть как раньше.
//
// Отпечатки релиза (activeRootFingerprint, packageFingerprint и т.д.) для
// бандла условны: они не сверяются ни с чем внешним — createLearningV2Course-
// SessionDeviceRunV1 проверяет только их ФОРМУ (валидный id/64-hex), не
// подлинность. Единственная сверка, которая реально что-то проверяет —
// courseSessionId детей ДОЛЖЕН совпадать с каноническим id из топологии,
// и это гарантируется тем, что buildSessionChildBodiesFromShard получает его
// явным параметром, а не вычисляет сам.
const BUNDLED_RELEASE_ID = "bundled-lesson-01" as const;
const BUNDLED_FINGERPRINT = "0".repeat(64);

// зачем (владелец, 2026-08-23): раньше здесь строилась ВСЯ пачка из 56 сессий
// ради одной. Это и лишняя работа на открытии экрана, и — главное — падение
// любой недописанной сессии закрывало доступ ко всем готовым. Теперь строится
// ровно запрошенная, а неготовая просто возвращает null и уходит в сеть.
// зачем targetLanguage-ветка (владелец, 2026-08-24, "добавь язык везде, где
// сейчас только номер сессии"): раньше бандл всегда читал английский источник
// независимо от того, какой курс проходит человек — испанская сессия 1 не
// могла дойти до экрана вообще. Английская ветка не меняет поведение ни на
// бит: тот же вызов, тот же порядок аргументов.
function bundledShardFor(
  targetLanguage: string,
  lessonOrdinal: number,
  sessionOrdinal: number,
): AuthoredLearningV2SessionShard | null {
  if (lessonOrdinal !== 1) return null;
  if (targetLanguage === "es") return authoredEsLearningV2SessionShard(sessionOrdinal);
  return authoredLearningV2SessionShard(sessionOrdinal);
}

/**
 * Материал урока из бандла, если он для этой сессии написан локально.
 * Возвращает null, когда локального источника нет — вызывающая сторона тогда
 * идёт в сеть как раньше. Синхронная: сборка занимает миллисекунды, сеть
 * здесь не участвует вообще.
 */
export function bundledLearningV2CourseSessionMaterialV3(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV3,
): LearningV2CourseReleasedSessionMaterialV3 | null {
  const locator = exactCurrentLocator(locatorInput);
  const shard = bundledShardFor(
    locator.targetLanguage,
    locator.lessonOrdinal,
    locator.sessionOrdinal,
  );
  if (!shard) return null;
  const courseSessionId = learningV2CourseSessionIdV1(
    locator.lessonOrdinal,
    locator.sessionOrdinal,
  );
  const lessonId = learningV2CourseLessonIdV1(locator.lessonOrdinal);
  const children = buildSessionChildBodiesFromShard(
    shard,
    locator.learnerSourceLocale,
    courseSessionId,
  ) as {
    intro: LearningV2CourseSessionIntroChildV1;
    learner: LearningV2CourseSessionLearnerChildV1;
    evaluatorCapsule: LearningV2CourseSessionEvaluatorCapsuleChildV1;
    auxiliary: LearningV2CourseSessionAuxiliaryChildV1;
  };
  const bindsSessionOneProductionAudio =
    locator.targetLanguage === "en" &&
    locator.lessonOrdinal === 1 &&
    locator.sessionOrdinal === 1;
  const audioChild = bindsSessionOneProductionAudio
    ? buildLearningV2Session1BundledAudioChildV1(children.learner)
    : materializeLearningV2CourseSessionAudioChildV1({
        learner: children.learner,
        interactions: Object.freeze([]),
      });
  const bindsSessionOneRewardPublication =
    locator.targetLanguage === "en" && locator.lessonOrdinal === 1 &&
    locator.sessionOrdinal === 1;
  const sourceFingerprint = shard.generationInputFingerprint;
  const childSetFingerprint = bindsSessionOneRewardPublication
    ? hashCanonicalBody({
        schemaVersion: "learning-v2-bundled-child-set.v1",
        courseSessionId,
        introFingerprint: children.intro.introFingerprint,
        learnerFingerprint: children.learner.learnerFingerprint,
        evaluatorCapsuleSetFingerprint:
          children.evaluatorCapsule.capsuleSetFingerprint,
        auxiliaryFingerprint: children.auxiliary.auxiliaryFingerprint,
        audioFingerprint: audioChild.audioFingerprint,
      })
    : BUNDLED_FINGERPRINT;
  const packageFingerprint = bindsSessionOneRewardPublication
    ? hashCanonicalBody({
        schemaVersion: "learning-v2-bundled-session-package.v1",
        releaseId: BUNDLED_RELEASE_ID,
        courseSessionId,
        sourceFingerprint,
        childSetFingerprint,
      })
    : BUNDLED_FINGERPRINT;
  const activeBaseRootFingerprint = bindsSessionOneRewardPublication
    ? hashCanonicalBody({
        schemaVersion: "learning-v2-bundled-base-root.v1",
        releaseId: BUNDLED_RELEASE_ID,
        sourceFingerprint,
      })
    : BUNDLED_FINGERPRINT;
  const activeHeadFingerprint = bindsSessionOneRewardPublication
    ? hashCanonicalBody({
        schemaVersion: "learning-v2-bundled-head.v1",
        releaseId: BUNDLED_RELEASE_ID,
        activeBaseRootFingerprint,
        packageFingerprint,
      })
    : BUNDLED_FINGERPRINT;
  const activeRootFingerprint = bindsSessionOneRewardPublication
    ? hashCanonicalBody({
        schemaVersion: "learning-v2-bundled-active-root.v1",
        releaseId: BUNDLED_RELEASE_ID,
        activeBaseRootFingerprint,
        activeHeadFingerprint,
      })
    : BUNDLED_FINGERPRINT;
  return Object.freeze({
    releaseId: BUNDLED_RELEASE_ID,
    activeRootFingerprint,
    activeBaseRootFingerprint,
    activeHeadFingerprint,
    topologyFingerprint: bindsSessionOneRewardPublication ? hashCanonicalBody({
      schemaVersion: "learning-v2-bundled-topology.v1",
      lessonId,
      courseSessionId,
    }) : BUNDLED_FINGERPRINT,
    lessonId,
    lessonOrdinal: locator.lessonOrdinal,
    baseLessonIndexFingerprint: bindsSessionOneRewardPublication ? hashCanonicalBody({
      schemaVersion: "learning-v2-bundled-base-index.v1",
      lessonId,
      packageFingerprint,
    }) : BUNDLED_FINGERPRINT,
    audioLessonIndexFingerprint: bindsSessionOneRewardPublication ? hashCanonicalBody({
      schemaVersion: "learning-v2-bundled-audio-index.v1",
      lessonId,
      audioFingerprint: audioChild.audioFingerprint,
    }) : BUNDLED_FINGERPRINT,
    courseSessionId,
    sessionOrdinal: locator.sessionOrdinal,
    packageFingerprint,
    childSetFingerprint,
    audioExtensionFingerprint: bindsSessionOneRewardPublication ? hashCanonicalBody({
      schemaVersion: "learning-v2-bundled-audio-extension.v1",
      courseSessionId,
      audioFingerprint: audioChild.audioFingerprint,
    }) : BUNDLED_FINGERPRINT,
    introChild: children.intro,
    learnerChild: children.learner,
    evaluatorCapsuleChild: children.evaluatorCapsule,
    auxiliaryChild: children.auxiliary,
    audioChild,
  });
}

export async function loadCurrentLearningV2CourseReleasedSessionV3(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV3,
): Promise<LearningV2CourseReleasedSessionAppResultV3> {
  const locator = exactCurrentLocator(locatorInput);
  // зачем это первая строка функции (владелец, 2026-08-17: «первый урок уже
  // должен быть в бандле» / «убери сервер наглухо»): если сессия написана
  // локально — отдаём её и выходим, ДО ensureAnonUser/сети целиком. Раньше
  // локальный источник существовал в коде, но проигрыватель ни разу его не
  // читал — экран висел на сетевом запросе даже для контента, который уже был
  // на телефоне.
  const bundled = bundledLearningV2CourseSessionMaterialV3(locator);
  if (bundled) return appResult(bundled, "network");
  const stableId = await ensureAnonUser();
  if (!stableId) fail();
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  let response: unknown;
  try {
    response = await fetchNetwork({ ...locator, activeRootFingerprint: null });
  } catch (networkError) {
    if (!allowsOfflineFallback(networkError)) throw networkError;
    const envelope = await readEnvelope();
    const row = [...envelope.rows]
      .filter(
        (candidate) =>
          candidate.accountScopeHash === accountScopeHash &&
          candidate.locator.environment === locator.environment &&
          candidate.locator.targetLanguage === locator.targetLanguage &&
          candidate.locator.studyTarget === locator.studyTarget &&
          candidate.locator.learnerSourceLocale ===
            locator.learnerSourceLocale &&
          candidate.locator.seasonId === locator.seasonId &&
          candidate.locator.lessonOrdinal === locator.lessonOrdinal &&
          candidate.locator.sessionOrdinal === locator.sessionOrdinal,
      )
      .sort((a, b) => b.touchedAtMs - a.touchedAtMs)[0];
    if (!row) throw networkError;
    return appResult(peek.get(row.key) ?? fail(), "lkg");
  }
  if (!plain(response) || typeof response.activeRootFingerprint !== "string")
    fail();
  const exact = exactLocator({
    ...locator,
    activeRootFingerprint: response.activeRootFingerprint,
  });
  const material = parseResponse(response, exact);
  const key = cacheKey(exact, accountScopeHash);
  peek.set(key, material);
  const canonicalResponseRaw = canonicalJsonV1(response);
  if (
    byteSize(canonicalResponseRaw) >
    LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V3
  )
    fail();
  await persistRow(
    Object.freeze({
      key,
      accountScopeHash,
      locator: exact,
      canonicalResponseRaw,
      byteSize: byteSize(canonicalResponseRaw),
      touchedAtMs: Date.now(),
    }),
  );
  return appResult(material, "network");
}

export function preloadCurrentLearningV2CourseReleasedSessionV3(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV3,
): Promise<void> {
  const locator = exactCurrentLocator(locatorInput);
  const key = currentKey(locator);
  const existing = currentPreloads.get(key);
  if (existing) return existing;
  let promise: Promise<void>;
  promise = loadCurrentLearningV2CourseReleasedSessionV3(locator)
    .then(() => undefined)
    .finally(() => {
      if (currentPreloads.get(key) === promise) currentPreloads.delete(key);
    });
  currentPreloads.set(key, promise);
  return promise;
}

export function waitForCurrentLearningV2CourseReleasedSessionPreloadV3(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV3,
): Promise<void> | null {
  const locator = exactCurrentLocator(locatorInput);
  return currentPreloads.get(currentKey(locator)) ?? null;
}

export async function prepareCurrentLearningV2CourseSessionV3(input: {
  readonly locator: LearningV2CourseReleasedSessionCurrentLocatorV3;
  readonly sessionRunId: string;
}): Promise<LearningV2CourseSessionReadyHandleV3> {
  if (
    !plain(input) ||
    Object.keys(input).sort().join("|") !== "locator|sessionRunId" ||
    !ID_RE.test(input.sessionRunId)
  )
    fail();
  const locator = exactCurrentLocator(input.locator);
  const key = `${currentKey(locator)}:${input.sessionRunId}`;
  const existing = readyInFlight.get(key);
  if (existing) return existing;
  let operation: Promise<LearningV2CourseSessionReadyHandleV3>;
  operation = (async () => {
    const result = await loadCurrentLearningV2CourseReleasedSessionV3(locator);
    const audio = await preloadLearningV2CourseSessionAudioV1({
      learner: result.material.learnerChild,
      audioChild: result.material.audioChild,
      sessionRunId: input.sessionRunId,
    });
    if (!isLearningV2CourseSessionAudioPreloadHandleV1(audio)) fail();
    const audioSummary = getLearningV2CourseSessionAudioPreloadSummaryV1(audio);
    // зачем: сессия отказывалась открываться, если не скачался хотя бы один
    // Владелец утвердил production audio: и dev-проверка на телефоне, и release
    // открывают первое интро только после локальной проверки всех выбранных MP3.
    // Пустая анимация воспроизведения больше не маскируется текстовым fallback.
    const audioComplete =
      audioSummary.localFileCount === audioSummary.selectedFileCount;
    if (
      audioSummary.courseSessionId !== result.material.courseSessionId ||
      audioSummary.sessionRunId !== input.sessionRunId ||
      audioSummary.learnerFingerprint !==
        result.material.learnerChild.learnerFingerprint ||
      audioSummary.audioFingerprint !==
        result.material.audioChild.audioFingerprint ||
      !audioComplete
    )
      fail();
    const body = {
      schemaVersion: LEARNING_V2_COURSE_SESSION_READY_SCHEMA_V3,
      activeRootFingerprint: result.material.activeRootFingerprint,
      courseSessionId: result.material.courseSessionId,
      sessionRunId: input.sessionRunId,
      packageFingerprint: result.material.packageFingerprint,
      learnerFingerprint: result.material.learnerChild.learnerFingerprint,
      audioFingerprint: result.material.audioChild.audioFingerprint,
      textSource: result.source,
      textReadiness:
        "canonical_children_parsed_and_account_scoped_cached" as const,
      audioReadiness: "all_selected_mp3_hash_verified_local_files" as const,
      startPolicy: "intro_may_open_only_after_text_and_audio_ready" as const,
      answerPathTransport: "none" as const,
      serverAnswerAuthority:
        "none_answers_never_transported_or_rechecked" as const,
      releaseAuthority: false as const,
    };
    const summary = Object.freeze({
      ...body,
      readyFingerprint: hashCanonicalBody({
        ...body,
        audioPreloadFingerprint: audioSummary.preloadFingerprint,
      }),
    });
    const handle = Object.freeze({}) as LearningV2CourseSessionReadyHandleV3;
    readyHandles.add(handle);
    readyMetadata.set(handle, Object.freeze({
      result,
      audio,
      summary,
      learnerSourceLocale: locator.learnerSourceLocale,
    }));
    return handle;
  })().finally(() => {
    if (readyInFlight.get(key) === operation) readyInFlight.delete(key);
  });
  readyInFlight.set(key, operation);
  return operation;
}

export function isLearningV2CourseSessionReadyHandleV3(
  value: unknown,
): value is LearningV2CourseSessionReadyHandleV3 {
  if (typeof value !== "object" || value === null || !readyHandles.has(value))
    return false;
  const material = readyMetadata.get(value);
  return (
    !!material && isLearningV2CourseSessionAudioPreloadHandleV1(material.audio)
  );
}

export function getLearningV2CourseSessionReadySummaryV3(
  handle: LearningV2CourseSessionReadyHandleV3,
): LearningV2CourseSessionReadySummaryV3 {
  const material = readyMetadata.get(handle as object);
  if (!material || !isLearningV2CourseSessionReadyHandleV3(handle)) fail();
  return material.summary;
}

export function resolveLearningV2CourseSessionReadyMaterialV3(
  handle: LearningV2CourseSessionReadyHandleV3,
): ReadyMaterial {
  const material = readyMetadata.get(handle as object);
  if (!material || !isLearningV2CourseSessionReadyHandleV3(handle)) fail();
  return material;
}

export async function clearLearningV2CourseReleasedSessionCacheV3(): Promise<void> {
  peek.clear();
  currentPreloads.clear();
  readyInFlight.clear();
  writeChain = writeChain
    .then(() => AsyncStorage.removeItem(STORAGE_KEY))
    .catch(() => undefined);
  await writeChain;
}
