import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import { initFirebaseAppCheckIfAvailable } from "./app_check_init";
import { withCallableTimeout } from "./callable_timeout";
import { ensureAnonUser, ensureStableAuthLink } from "./cloud_sync";
import { withBackgroundNetworkLease } from "./interactive_network_quiet";
import { peekStableId } from "./stable_id";
import { deriveLocalOfflineProgressAccountScopeHash } from "../modules/learning-v2/progress/progress_account_scope";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
  type LearningV2ActivityReleasedSessionPackageHandleV1,
  type LearningV2ActivityReleasedSessionPackageSummaryV1,
} from "../modules/learning-v2/runtime/activity_released_session_package_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1 =
  "learning-v2-activity-released-session-cache.v1" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_ENTRIES_V1 = 12;
export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_BYTES_V1 =
  12 * 1024 * 1024;

const STORAGE_KEY = "learning_v2_activity_released_session_cache_v1";
const FUNCTIONS_REGION = "us-central1";
const CALLABLE_NAME = "learningV2ActivityReleasedSessionGetV1";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const encoder = new TextEncoder();

export interface LearningV2ActivityReleasedSessionLocatorV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly sessionOrdinal: number;
}

export type LearningV2ActivityReleasedSessionCurrentLocatorV1 = Omit<
  LearningV2ActivityReleasedSessionLocatorV1,
  "activeManifestHash"
>;

export type LearningV2ActivityReleasedSessionAppResultV1 = Readonly<{
  packageHandle: LearningV2ActivityReleasedSessionPackageHandleV1;
  summary: LearningV2ActivityReleasedSessionPackageSummaryV1;
  source: "network" | "lkg";
  transport: "firebase_callable" | "offline_lkg";
  cacheAuthority: "availability_only_not_release_or_origin_authority";
}>;

type CallableResponse = Readonly<{
  schemaVersion: "v2-activity-released-session-response.v1";
  activeManifestHash: string;
  unifiedReleaseId: string;
  unifiedRootFingerprint: string;
  episodeId: string;
  sessionId: string;
  sessionOrdinal: number;
  activityPackageFingerprint: string;
  auxiliaryIndexFingerprint: string;
  descriptorFingerprint: string;
  sourceFingerprint: string;
  renderFingerprint: string;
  capsuleEnvelopeFingerprint: string;
  packageFingerprint: string;
  canonicalPackageRaw: string;
  transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  repositoryOriginProjection: "joined_unified_active_release_learner_evaluator_auxiliary";
  localFeedbackAuthority: "local_provisional_only";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  completionAuthority: "none";
  releaseAuthority: false;
}>;

type CacheRow = Readonly<{
  key: string;
  accountScopeHash: string;
  locator: LearningV2ActivityReleasedSessionLocatorV1;
  packageFingerprint: string;
  canonicalRaw: string;
  byteSize: number;
  touchedAtMs: number;
}>;

type CacheEnvelope = Readonly<{
  schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1;
  rows: readonly CacheRow[];
}>;

const peek = new Map<
  string,
  Readonly<{
    packageHandle: LearningV2ActivityReleasedSessionPackageHandleV1;
    summary: LearningV2ActivityReleasedSessionPackageSummaryV1;
  }>
>();
const currentPreloads = new Map<string, Promise<void>>();
let writeChain: Promise<void> = Promise.resolve();

function fail(): never {
  throw new Error("learning_v2_activity_released_session_app_client_invalid");
}

function byteSize(value: string): number {
  return encoder.encode(value).byteLength;
}

function exactLocator(
  value: LearningV2ActivityReleasedSessionLocatorV1,
): LearningV2ActivityReleasedSessionLocatorV1 {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "activeManifestHash|environment|episodeId|learnerSourceLocale|seasonId|sessionOrdinal|studyTarget" ||
    !["lab", "staging", "production"].includes(value.environment) ||
    !CODE_RE.test(value.studyTarget) ||
    !CODE_RE.test(value.learnerSourceLocale) ||
    !ID_RE.test(value.seasonId) ||
    !HASH_RE.test(value.activeManifestHash) ||
    !ID_RE.test(value.episodeId) ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    value.sessionOrdinal < 1 ||
    value.sessionOrdinal > 12
  )
    fail();
  return Object.freeze({ ...value });
}

function exactCurrentLocator(
  value: LearningV2ActivityReleasedSessionCurrentLocatorV1,
): LearningV2ActivityReleasedSessionCurrentLocatorV1 {
  const synthetic = exactLocator({
    ...value,
    activeManifestHash: "0".repeat(64),
  });
  const { activeManifestHash: _ignored, ...current } = synthetic;
  return Object.freeze(current);
}

function cacheKey(
  locator: LearningV2ActivityReleasedSessionLocatorV1,
  accountScopeHash: string,
): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return `learning-v2:activity-released-session:${accountScopeHash}:${locator.environment}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:${locator.activeManifestHash}:${locator.episodeId}:${locator.sessionOrdinal}`;
}

function currentPreloadKey(
  locator: LearningV2ActivityReleasedSessionCurrentLocatorV1,
): string {
  return `learning-v2:activity-released-session-preload:${locator.environment}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:${locator.episodeId}:${locator.sessionOrdinal}`;
}

function parseCanonicalPackage(raw: string) {
  if (byteSize(raw) > LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_BYTES_V1)
    fail();
  const packageHandle = parseLearningV2ActivityReleasedSessionPackageV1(raw);
  const summary =
    getLearningV2ActivityReleasedSessionPackageSummaryV1(packageHandle);
  return Object.freeze({ packageHandle, summary });
}

function matchesLocator(
  summary: LearningV2ActivityReleasedSessionPackageSummaryV1,
  locator: LearningV2ActivityReleasedSessionLocatorV1,
): boolean {
  return (
    summary.episodeId === locator.episodeId &&
    summary.sessionOrdinal === locator.sessionOrdinal
  );
}

function setPeek(key: string, canonicalRaw: string) {
  const parsed = parseCanonicalPackage(canonicalRaw);
  peek.delete(key);
  peek.set(key, parsed);
  while (
    peek.size > LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_ENTRIES_V1
  ) {
    const oldest = peek.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    peek.delete(oldest);
  }
  return parsed;
}

function parseEnvelope(raw: string | null): CacheEnvelope {
  if (raw === null)
    return Object.freeze({
      schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1,
      rows: Object.freeze([]),
    });
  if (byteSize(raw) > LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_BYTES_V1)
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("|") !== "rows|schemaVersion" ||
    (value as { schemaVersion?: unknown }).schemaVersion !==
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1 ||
    !Array.isArray((value as { rows?: unknown }).rows) ||
    (value as { rows: unknown[] }).rows.length >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_ENTRIES_V1
  )
    fail();
  const rows = (value as { rows: unknown[] }).rows.map((candidate) => {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate) ||
      Object.keys(candidate).sort().join("|") !==
        "accountScopeHash|byteSize|canonicalRaw|key|locator|packageFingerprint|touchedAtMs"
    )
      fail();
    const row = candidate as Record<string, unknown>;
    const locator = exactLocator(
      row.locator as LearningV2ActivityReleasedSessionLocatorV1,
    );
    if (
      typeof row.accountScopeHash !== "string" ||
      !HASH_RE.test(row.accountScopeHash) ||
      typeof row.key !== "string" ||
      row.key !== cacheKey(locator, row.accountScopeHash) ||
      typeof row.canonicalRaw !== "string" ||
      !Number.isSafeInteger(row.byteSize) ||
      Number(row.byteSize) !== byteSize(row.canonicalRaw) ||
      typeof row.packageFingerprint !== "string" ||
      !HASH_RE.test(row.packageFingerprint) ||
      !Number.isSafeInteger(row.touchedAtMs) ||
      Number(row.touchedAtMs) < 0
    )
      fail();
    const parsed = setPeek(row.key, row.canonicalRaw);
    if (
      parsed.summary.packageFingerprint !== row.packageFingerprint ||
      !matchesLocator(parsed.summary, locator)
    )
      fail();
    return Object.freeze({
      key: row.key,
      accountScopeHash: row.accountScopeHash,
      locator,
      packageFingerprint: row.packageFingerprint,
      canonicalRaw: row.canonicalRaw,
      byteSize: Number(row.byteSize),
      touchedAtMs: Number(row.touchedAtMs),
    });
  });
  return Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1,
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
  let totalBytes = byteSize(
    JSON.stringify({
      schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1,
      rows: [],
    }),
  );
  for (const row of [...rows].sort((a, b) => b.touchedAtMs - a.touchedAtMs)) {
    if (
      selected.length >=
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_ENTRIES_V1
    )
      break;
    const rowBytes = byteSize(JSON.stringify(row)) + 1;
    if (
      totalBytes + rowBytes >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_BYTES_V1
    )
      continue;
    selected.push(row);
    totalBytes += rowBytes;
  }
  return Object.freeze(selected);
}

async function persistRow(row: CacheRow): Promise<void> {
  writeChain = writeChain
    .then(async () => {
      const current = await readEnvelope();
      const rows = boundedRows([
        row,
        ...current.rows.filter(
          (candidate) =>
            candidate.key !== row.key ||
            candidate.accountScopeHash !== row.accountScopeHash,
        ),
      ]);
      const raw = JSON.stringify({
        schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_SCHEMA_V1,
        rows,
      });
      if (
        byteSize(raw) > LEARNING_V2_ACTIVITY_RELEASED_SESSION_CACHE_MAX_BYTES_V1
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

function parseResponse(
  value: unknown,
  locator: LearningV2ActivityReleasedSessionLocatorV1,
): Readonly<{
  canonicalRaw: string;
  packageHandle: LearningV2ActivityReleasedSessionPackageHandleV1;
  summary: LearningV2ActivityReleasedSessionPackageSummaryV1;
}> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("|") !==
      "activeManifestHash|activityPackageFingerprint|auxiliaryIndexFingerprint|canonicalPackageRaw|capsuleEnvelopeFingerprint|completionAuthority|descriptorFingerprint|episodeId|evidenceAuthority|localFeedbackAuthority|masteryAuthority|packageFingerprint|releaseAuthority|renderFingerprint|repositoryOriginProjection|schemaVersion|sessionId|sessionOrdinal|sourceFingerprint|transportAuthority|unifiedReleaseId|unifiedRootFingerprint|walletAuthority"
  )
    fail();
  const row = value as CallableResponse;
  if (
    row.schemaVersion !== "v2-activity-released-session-response.v1" ||
    row.transportAuthority !==
      "firebase_callable_auth_and_app_check_boundary" ||
    row.repositoryOriginProjection !==
      "joined_unified_active_release_learner_evaluator_auxiliary" ||
    typeof row.unifiedReleaseId !== "string" ||
    !ID_RE.test(row.unifiedReleaseId) ||
    typeof row.unifiedRootFingerprint !== "string" ||
    !HASH_RE.test(row.unifiedRootFingerprint) ||
    row.localFeedbackAuthority !== "local_provisional_only" ||
    row.walletAuthority !== "none" ||
    row.masteryAuthority !== "none" ||
    row.evidenceAuthority !== "none" ||
    row.completionAuthority !== "none" ||
    row.releaseAuthority !== false ||
    row.activeManifestHash !== locator.activeManifestHash ||
    row.episodeId !== locator.episodeId ||
    row.sessionOrdinal !== locator.sessionOrdinal ||
    typeof row.canonicalPackageRaw !== "string"
  )
    fail();
  const parsed = parseCanonicalPackage(row.canonicalPackageRaw);
  if (
    parsed.summary.packageFingerprint !== row.packageFingerprint ||
    parsed.summary.episodeId !== row.episodeId ||
    parsed.summary.sessionId !== row.sessionId ||
    parsed.summary.sessionOrdinal !== row.sessionOrdinal ||
    parsed.summary.activityPackageFingerprint !==
      row.activityPackageFingerprint ||
    parsed.summary.auxiliaryDescriptorFingerprint !==
      row.descriptorFingerprint ||
    parsed.summary.sourceFingerprint !== row.sourceFingerprint ||
    parsed.summary.renderFingerprint !== row.renderFingerprint ||
    parsed.summary.capsuleEnvelopeFingerprint !==
      row.capsuleEnvelopeFingerprint ||
    !HASH_RE.test(row.auxiliaryIndexFingerprint)
  )
    fail();
  return Object.freeze({
    canonicalRaw: row.canonicalPackageRaw,
    ...parsed,
  });
}

async function fetchNetwork(
  locator: LearningV2ActivityReleasedSessionCurrentLocatorV1 &
    Readonly<{ activeManifestHash: string | null }>,
): Promise<unknown> {
  return withBackgroundNetworkLease(
    "learning-v2.activity-released-session",
    async (lease) => {
      await initFirebaseAppCheckIfAvailable().catch(() => false);
      lease.assertCurrent();
      const callable = httpsCallable<
        {
          environment: string;
          studyTarget: string;
          learnerSourceLocale: string;
          seasonId: string;
          expectedActiveManifestHash: string | null;
          episodeId: string;
          sessionOrdinal: number;
        },
        CallableResponse
      >(getFunctions(getApp(), FUNCTIONS_REGION), CALLABLE_NAME);
      const response = await withCallableTimeout(
        callable({
          environment: locator.environment,
          studyTarget: locator.studyTarget,
          learnerSourceLocale: locator.learnerSourceLocale,
          seasonId: locator.seasonId,
          expectedActiveManifestHash: locator.activeManifestHash,
          episodeId: locator.episodeId,
          sessionOrdinal: locator.sessionOrdinal,
        }),
        CALLABLE_NAME,
        30_000,
      );
      lease.assertCurrent();
      return response.data;
    },
  );
}

function appResult(
  parsed: Readonly<{
    packageHandle: LearningV2ActivityReleasedSessionPackageHandleV1;
    summary: LearningV2ActivityReleasedSessionPackageSummaryV1;
  }>,
  source: "network" | "lkg",
): LearningV2ActivityReleasedSessionAppResultV1 {
  return Object.freeze({
    ...parsed,
    source,
    transport: source === "network" ? "firebase_callable" : "offline_lkg",
    cacheAuthority: "availability_only_not_release_or_origin_authority",
  });
}

export function peekLearningV2ActivityReleasedSessionV1(
  locatorInput: LearningV2ActivityReleasedSessionLocatorV1,
) {
  const locator = exactLocator(locatorInput);
  const stableId = peekStableId();
  if (!stableId) return null;
  return (
    peek.get(
      cacheKey(locator, deriveLocalOfflineProgressAccountScopeHash(stableId)),
    ) ?? null
  );
}

export function peekCurrentLearningV2ActivityReleasedSessionV1(
  locatorInput: LearningV2ActivityReleasedSessionCurrentLocatorV1,
) {
  const locator = exactCurrentLocator(locatorInput);
  const stableId = peekStableId();
  if (!stableId) return null;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  return (
    [...peek.entries()]
      .filter(
        ([key, candidate]) =>
          key.startsWith(
            `learning-v2:activity-released-session:${accountScopeHash}:${locator.environment}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:`,
          ) &&
          candidate.summary.episodeId === locator.episodeId &&
          candidate.summary.sessionOrdinal === locator.sessionOrdinal,
      )
      .at(-1)?.[1] ?? null
  );
}

export async function hydrateLearningV2ActivityReleasedSessionCacheV1(): Promise<void> {
  await readEnvelope();
}

export async function loadCurrentLearningV2ActivityReleasedSessionV1(
  locatorInput: LearningV2ActivityReleasedSessionCurrentLocatorV1,
): Promise<LearningV2ActivityReleasedSessionAppResultV1> {
  const locator = exactCurrentLocator(locatorInput);
  // зачем ensureStableAuthLink (владелец, 2026-08-27, «сессии должны быть
  // доступны всегда, даже без привязки аккаунта») — см. подробный комментарий
  // в learning_v2_course_released_session_client_v3.ts, тот же класс бага.
  await ensureStableAuthLink().catch(() => false);
  const stableId = await ensureAnonUser();
  if (!stableId) fail();
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  let rawResponse: unknown;
  try {
    rawResponse = await fetchNetwork({ ...locator, activeManifestHash: null });
  } catch (networkError) {
    if (!allowsOfflineFallback(networkError)) throw networkError;
    const envelope = await readEnvelope();
    const row = [...envelope.rows]
      .filter(
        (candidate) =>
          candidate.accountScopeHash === accountScopeHash &&
          candidate.locator.environment === locator.environment &&
          candidate.locator.studyTarget === locator.studyTarget &&
          candidate.locator.learnerSourceLocale ===
            locator.learnerSourceLocale &&
          candidate.locator.seasonId === locator.seasonId &&
          candidate.locator.episodeId === locator.episodeId &&
          candidate.locator.sessionOrdinal === locator.sessionOrdinal,
      )
      .sort((left, right) => right.touchedAtMs - left.touchedAtMs)[0];
    if (!row) throw networkError;
    return appResult(setPeek(row.key, row.canonicalRaw), "lkg");
  }
  const activeManifestHash =
    typeof rawResponse === "object" &&
    rawResponse !== null &&
    "activeManifestHash" in rawResponse
      ? String(
          (rawResponse as { activeManifestHash: unknown }).activeManifestHash,
        )
      : fail();
  const exact = exactLocator({ ...locator, activeManifestHash });
  const parsed = parseResponse(rawResponse, exact);
  const key = cacheKey(exact, accountScopeHash);
  setPeek(key, parsed.canonicalRaw);
  await persistRow(
    Object.freeze({
      key,
      accountScopeHash,
      locator: exact,
      packageFingerprint: parsed.summary.packageFingerprint,
      canonicalRaw: parsed.canonicalRaw,
      byteSize: byteSize(parsed.canonicalRaw),
      touchedAtMs: Date.now(),
    }),
  );
  return appResult(parsed, "network");
}

export function preloadCurrentLearningV2ActivityReleasedSessionV1(
  locatorInput: LearningV2ActivityReleasedSessionCurrentLocatorV1,
): Promise<void> {
  const locator = exactCurrentLocator(locatorInput);
  const key = currentPreloadKey(locator);
  const existing = currentPreloads.get(key);
  if (existing) return existing;
  let promise: Promise<void>;
  promise = loadCurrentLearningV2ActivityReleasedSessionV1(locator)
    .then(() => undefined)
    .finally(() => {
      if (currentPreloads.get(key) === promise) currentPreloads.delete(key);
    });
  currentPreloads.set(key, promise);
  return promise;
}

export function waitForCurrentLearningV2ActivityReleasedSessionPreloadV1(
  locatorInput: LearningV2ActivityReleasedSessionCurrentLocatorV1,
): Promise<void> | null {
  const locator = exactCurrentLocator(locatorInput);
  return currentPreloads.get(currentPreloadKey(locator)) ?? null;
}

export async function clearLearningV2ActivityReleasedSessionCacheV1(): Promise<void> {
  peek.clear();
  currentPreloads.clear();
  writeChain = writeChain
    .then(() => AsyncStorage.removeItem(STORAGE_KEY))
    .catch(() => undefined);
  await writeChain;
}
