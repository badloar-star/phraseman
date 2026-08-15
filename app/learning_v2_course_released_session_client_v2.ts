import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import { initFirebaseAppCheckIfAvailable } from "./app_check_init";
import { withCallableTimeout } from "./callable_timeout";
import { ensureAnonUser } from "./cloud_sync";
import { withBackgroundNetworkLease } from "./interactive_network_quiet";
import { peekStableId } from "./stable_id";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import { parseV2ExactLanguageTagV1 } from "../modules/learning-v2/contracts/language_tag_v1";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../modules/learning-v2/content/course_topology_v1";
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
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

export const LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2 =
  "learning-v2-course-released-session-cache.v2" as const;
export const LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V2 = 6;
export const LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V2 =
  24 * 1024 * 1024;

const STORAGE_KEY = "learning_v2_course_released_session_cache_v2";
const FUNCTIONS_REGION = "us-central1";
const CALLABLE_NAME = "learningV2CourseReleasedSessionGetV2";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const encoder = new TextEncoder();

export interface LearningV2CourseReleasedSessionLocatorV2 {
  readonly environment: "lab" | "staging" | "production";
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly activeRootFingerprint: string;
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
}

export type LearningV2CourseReleasedSessionCurrentLocatorV2 = Omit<
  LearningV2CourseReleasedSessionLocatorV2,
  "activeRootFingerprint"
>;

export type LearningV2CourseReleasedSessionMaterialV2 = Readonly<{
  releaseId: string;
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  topologyFingerprint: string;
  lessonId: string;
  lessonOrdinal: number;
  lessonIndexFingerprint: string;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  introChild: LearningV2CourseSessionIntroChildV1;
  learnerChild: LearningV2CourseSessionLearnerChildV1;
  evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
}>;

export type LearningV2CourseReleasedSessionAppResultV2 = Readonly<{
  material: LearningV2CourseReleasedSessionMaterialV2;
  source: "network" | "lkg";
  transport: "firebase_callable" | "offline_lkg";
  cacheAuthority: "availability_only_not_release_or_origin_authority";
  evaluatorCapsuleAvailableToClient: true;
  evaluatorSidecarAvailableToClient: false;
}>;

type CallableResponse = Readonly<{
  schemaVersion: "v2-course-released-session-response.v2";
  releaseId: string;
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  topologyFingerprint: string;
  lessonId: string;
  lessonOrdinal: number;
  lessonIndexFingerprint: string;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  introFingerprint: string;
  learnerFingerprint: string;
  auxiliaryFingerprint: string;
  evaluatorCapsuleSetFingerprint: string;
  canonicalIntroRaw: string;
  canonicalLearnerRaw: string;
  canonicalEvaluatorCapsuleRaw: string;
  canonicalAuxiliaryRaw: string;
  transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  repositoryOriginProjection: "active_v2_32x56_release_exact_session_join";
  learnerProjection: "intro_learner_capsule_auxiliary_only";
  evaluatorIsolation: "server_sidecar_not_exposed";
  cacheAuthority: "none_client_lkg_is_availability_only";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  completionAuthority: "none";
  releaseAuthority: false;
}>;

type CacheRow = Readonly<{
  key: string;
  accountScopeHash: string;
  locator: LearningV2CourseReleasedSessionLocatorV2;
  canonicalResponseRaw: string;
  byteSize: number;
  touchedAtMs: number;
}>;

type CacheEnvelope = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2;
  rows: readonly CacheRow[];
}>;

const peek = new Map<string, LearningV2CourseReleasedSessionMaterialV2>();
const currentPreloads = new Map<string, Promise<void>>();
let writeChain: Promise<void> = Promise.resolve();

function fail(): never {
  throw new Error("learning_v2_course_released_session_app_client_invalid");
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

function exactLocator(
  value: LearningV2CourseReleasedSessionLocatorV2,
): LearningV2CourseReleasedSessionLocatorV2 {
  if (
    !plain(value) ||
    Object.keys(value).sort().join("|") !==
      "activeRootFingerprint|environment|learnerSourceLocale|lessonOrdinal|seasonId|sessionOrdinal|studyTarget|targetLanguage" ||
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
  value: LearningV2CourseReleasedSessionCurrentLocatorV2,
): LearningV2CourseReleasedSessionCurrentLocatorV2 {
  const parsed = exactLocator({
    ...value,
    activeRootFingerprint: "0".repeat(64),
  });
  const { activeRootFingerprint: _ignored, ...current } = parsed;
  return Object.freeze(current);
}

function cacheKey(
  locator: LearningV2CourseReleasedSessionLocatorV2,
  accountScopeHash: string,
): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return [
    "learning-v2:course-session-v2",
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
  locator: LearningV2CourseReleasedSessionCurrentLocatorV2,
): string {
  return canonicalJsonV1(locator);
}

function parseResponse(
  value: unknown,
  locator: LearningV2CourseReleasedSessionLocatorV2,
): LearningV2CourseReleasedSessionMaterialV2 {
  if (
    !plain(value) ||
    Object.keys(value).sort().join("|") !==
      "activeHeadFingerprint|activeRootFingerprint|auxiliaryFingerprint|cacheAuthority|canonicalAuxiliaryRaw|canonicalEvaluatorCapsuleRaw|canonicalIntroRaw|canonicalLearnerRaw|childSetFingerprint|completionAuthority|courseSessionId|evaluatorCapsuleSetFingerprint|evaluatorIsolation|evidenceAuthority|introFingerprint|learnerFingerprint|learnerProjection|lessonId|lessonIndexFingerprint|lessonOrdinal|masteryAuthority|packageFingerprint|releaseAuthority|releaseId|repositoryOriginProjection|schemaVersion|sessionOrdinal|topologyFingerprint|transportAuthority|walletAuthority"
  )
    fail();
  const row = value as CallableResponse;
  const expectedLessonId = learningV2CourseLessonIdV1(locator.lessonOrdinal);
  const expectedSessionId = learningV2CourseSessionIdV1(
    locator.lessonOrdinal,
    locator.sessionOrdinal,
  );
  const hashes = [
    row.activeRootFingerprint,
    row.activeHeadFingerprint,
    row.topologyFingerprint,
    row.lessonIndexFingerprint,
    row.packageFingerprint,
    row.childSetFingerprint,
    row.introFingerprint,
    row.learnerFingerprint,
    row.auxiliaryFingerprint,
    row.evaluatorCapsuleSetFingerprint,
  ];
  if (
    row.schemaVersion !== "v2-course-released-session-response.v2" ||
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
      "active_v2_32x56_release_exact_session_join" ||
    row.learnerProjection !== "intro_learner_capsule_auxiliary_only" ||
    row.evaluatorIsolation !== "server_sidecar_not_exposed" ||
    row.cacheAuthority !== "none_client_lkg_is_availability_only" ||
    row.walletAuthority !== "none" ||
    row.masteryAuthority !== "none" ||
    row.evidenceAuthority !== "none" ||
    row.completionAuthority !== "none" ||
    row.releaseAuthority !== false ||
    typeof row.canonicalIntroRaw !== "string" ||
    typeof row.canonicalLearnerRaw !== "string" ||
    typeof row.canonicalEvaluatorCapsuleRaw !== "string" ||
    typeof row.canonicalAuxiliaryRaw !== "string" ||
    byteSize(row.canonicalIntroRaw) >
      LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalLearnerRaw) >
      LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalEvaluatorCapsuleRaw) >
      LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1 ||
    byteSize(row.canonicalAuxiliaryRaw) >
      LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1
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
  if (
    introChild.courseSessionId !== expectedSessionId ||
    learnerChild.courseSessionId !== expectedSessionId ||
    evaluatorCapsuleChild.courseSessionId !== expectedSessionId ||
    auxiliaryChild.courseSessionId !== expectedSessionId ||
    introChild.introFingerprint !== row.introFingerprint ||
    learnerChild.learnerFingerprint !== row.learnerFingerprint ||
    evaluatorCapsuleChild.capsuleSetFingerprint !==
      row.evaluatorCapsuleSetFingerprint ||
    auxiliaryChild.auxiliaryFingerprint !== row.auxiliaryFingerprint ||
    learnerChild.targetLanguage !== locator.targetLanguage
  )
    fail();
  return Object.freeze({
    releaseId: row.releaseId,
    activeRootFingerprint: row.activeRootFingerprint,
    activeHeadFingerprint: row.activeHeadFingerprint,
    topologyFingerprint: row.topologyFingerprint,
    lessonId: row.lessonId,
    lessonOrdinal: row.lessonOrdinal,
    lessonIndexFingerprint: row.lessonIndexFingerprint,
    courseSessionId: row.courseSessionId,
    sessionOrdinal: row.sessionOrdinal,
    packageFingerprint: row.packageFingerprint,
    childSetFingerprint: row.childSetFingerprint,
    introChild,
    learnerChild,
    evaluatorCapsuleChild,
    auxiliaryChild,
  });
}

function setPeek(
  key: string,
  response: unknown,
  locator: LearningV2CourseReleasedSessionLocatorV2,
) {
  const material = parseResponse(response, locator);
  peek.delete(key);
  peek.set(key, material);
  while (peek.size > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V2) {
    const oldest = peek.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    peek.delete(oldest);
  }
  return material;
}

function parseEnvelope(raw: string | null): CacheEnvelope {
  if (raw === null)
    return Object.freeze({
      schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2,
      rows: Object.freeze([]),
    });
  if (byteSize(raw) > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V2)
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    !plain(value) ||
    Object.keys(value).sort().join("|") !== "rows|schemaVersion" ||
    value.schemaVersion !==
      LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2 ||
    !Array.isArray(value.rows) ||
    value.rows.length > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V2
  )
    fail();
  const rows = value.rows.map((candidate): CacheRow => {
    if (
      !plain(candidate) ||
      Object.keys(candidate).sort().join("|") !==
        "accountScopeHash|byteSize|canonicalResponseRaw|key|locator|touchedAtMs"
    )
      fail();
    const locator = exactLocator(
      candidate.locator as LearningV2CourseReleasedSessionLocatorV2,
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
    schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2,
    rows: Object.freeze(rows),
  });
}

async function readEnvelope(): Promise<CacheEnvelope> {
  try {
    return parseEnvelope(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    peek.clear();
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
    return parseEnvelope(null);
  }
}

function boundedRows(rows: readonly CacheRow[]): readonly CacheRow[] {
  const selected: CacheRow[] = [];
  for (const row of [...rows].sort((a, b) => b.touchedAtMs - a.touchedAtMs)) {
    if (
      selected.length >=
      LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_ENTRIES_V2
    )
      break;
    const candidate = canonicalJsonV1({
      schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2,
      rows: [...selected, row],
    });
    if (
      byteSize(candidate) <=
      LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V2
    )
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
      const raw = canonicalJsonV1({
        schemaVersion: LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_SCHEMA_V2,
        rows,
      });
      if (
        byteSize(raw) > LEARNING_V2_COURSE_RELEASED_SESSION_CACHE_MAX_BYTES_V2
      )
        fail();
      await AsyncStorage.setItem(STORAGE_KEY, raw);
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
  locator: LearningV2CourseReleasedSessionCurrentLocatorV2 &
    Readonly<{ activeRootFingerprint: string | null }>,
): Promise<unknown> {
  return withBackgroundNetworkLease(
    "learning-v2.course-released-session-v2",
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

function result(
  material: LearningV2CourseReleasedSessionMaterialV2,
  source: "network" | "lkg",
): LearningV2CourseReleasedSessionAppResultV2 {
  return Object.freeze({
    material,
    source,
    transport: source === "network" ? "firebase_callable" : "offline_lkg",
    cacheAuthority: "availability_only_not_release_or_origin_authority",
    evaluatorCapsuleAvailableToClient: true,
    evaluatorSidecarAvailableToClient: false,
  });
}

export function peekCurrentLearningV2CourseReleasedSessionV2(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV2,
): LearningV2CourseReleasedSessionMaterialV2 | null {
  const locator = exactCurrentLocator(locatorInput);
  const stableId = peekStableId();
  if (!stableId) return null;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const matches = [...peek.entries()].filter(
    ([key, material]) =>
      key.startsWith(
        `learning-v2:course-session-v2:${accountScopeHash}:${locator.environment}:${locator.targetLanguage}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:`,
      ) &&
      material.lessonOrdinal === locator.lessonOrdinal &&
      material.sessionOrdinal === locator.sessionOrdinal,
  );
  return matches.length > 0 ? matches[matches.length - 1]![1] : null;
}

export async function hydrateLearningV2CourseReleasedSessionCacheV2(): Promise<void> {
  await readEnvelope();
}

export async function loadCurrentLearningV2CourseReleasedSessionV2(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV2,
): Promise<LearningV2CourseReleasedSessionAppResultV2> {
  const locator = exactCurrentLocator(locatorInput);
  const stableId = await ensureAnonUser();
  if (!stableId) fail();
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  let response: unknown;
  try {
    response = await fetchNetwork({
      ...locator,
      activeRootFingerprint: null,
    });
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
    return result(peek.get(row.key) ?? fail(), "lkg");
  }
  if (!plain(response) || typeof response.activeRootFingerprint !== "string")
    fail();
  const exact = exactLocator({
    ...locator,
    activeRootFingerprint: response.activeRootFingerprint,
  });
  const material = parseResponse(response, exact);
  const key = cacheKey(exact, accountScopeHash);
  peek.delete(key);
  peek.set(key, material);
  const canonicalResponseRaw = canonicalJsonV1(response);
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
  return result(material, "network");
}

export function preloadCurrentLearningV2CourseReleasedSessionV2(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV2,
): Promise<void> {
  const locator = exactCurrentLocator(locatorInput);
  const key = currentKey(locator);
  const existing = currentPreloads.get(key);
  if (existing) return existing;
  let promise: Promise<void>;
  promise = loadCurrentLearningV2CourseReleasedSessionV2(locator)
    .then(() => undefined)
    .finally(() => {
      if (currentPreloads.get(key) === promise) currentPreloads.delete(key);
    });
  currentPreloads.set(key, promise);
  return promise;
}

export function waitForCurrentLearningV2CourseReleasedSessionPreloadV2(
  locatorInput: LearningV2CourseReleasedSessionCurrentLocatorV2,
): Promise<void> | null {
  const locator = exactCurrentLocator(locatorInput);
  return currentPreloads.get(currentKey(locator)) ?? null;
}

export async function clearLearningV2CourseReleasedSessionCacheV2(): Promise<void> {
  peek.clear();
  currentPreloads.clear();
  writeChain = writeChain
    .then(() => AsyncStorage.removeItem(STORAGE_KEY))
    .catch(() => undefined);
  await writeChain;
}
