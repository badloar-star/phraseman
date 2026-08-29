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
  parseLearningV2ActivityAuxiliaryClientDescriptorV1,
  type LearningV2ActivityAuxiliaryClientDescriptorV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import {
  learningV2ActivityAuxiliaryClientCacheKeyV1,
  loadLearningV2ActivityAuxiliaryClientWithLkgV1,
  type LearningV2ActivityAuxiliaryClientCacheV1,
  type LearningV2ActivityAuxiliaryClientExpectedV1,
  type LearningV2ActivityAuxiliaryClientLoadResultV1,
} from "../modules/learning-v2/runtime/activity_auxiliary_client_loader_v1";

export const LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-cache.v1" as const;
export const LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_ENTRIES_V1 = 12;
export const LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_BYTES_V1 =
  8 * 1024 * 1024;

const STORAGE_KEY = "learning_v2_activity_auxiliary_cache_v1";
const FUNCTIONS_REGION = "us-central1";
const CALLABLE_NAME = "learningV2ActivityAuxiliarySessionGetV1";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const encoder = new TextEncoder();

type CacheRow = Readonly<{
  key: string;
  locatorKey: string;
  accountScopeHash: string;
  expected: LearningV2ActivityAuxiliaryClientExpectedV1;
  canonicalRaw: string;
  byteSize: number;
  touchedAtMs: number;
}>;

type CacheEnvelope = Readonly<{
  schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1;
  rows: readonly CacheRow[];
}>;

export interface LearningV2ActivityAuxiliaryLocatorV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly sessionOrdinal: number;
}

export type LearningV2ActivityAuxiliaryCurrentLocatorV1 = Omit<
  LearningV2ActivityAuxiliaryLocatorV1,
  "activeManifestHash"
>;

type ScopedLocator = LearningV2ActivityAuxiliaryLocatorV1 &
  Readonly<{ accountScopeHash: string }>;

export type LearningV2ActivityAuxiliaryAppResultV1 =
  LearningV2ActivityAuxiliaryClientLoadResultV1 &
    Readonly<{
      transport: "firebase_callable" | "offline_lkg";
    }>;

type CallableResponse = Readonly<{
  schemaVersion: "v2-activity-auxiliary-session-response.v1";
  activeManifestHash: string;
  episodeId: string;
  sessionId: string;
  sessionOrdinal: number;
  activityPackageFingerprint: string;
  auxiliaryIndexFingerprint: string;
  descriptorFingerprint: string;
  canonicalDescriptorRaw: string;
  transportAuthority: "firebase_callable_auth_and_app_check_boundary";
  repositoryOriginProjection: "server_private_release_handle_projection";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
}>;

const peek = new Map<string, LearningV2ActivityAuxiliaryClientDescriptorV1>();
const currentPreloads = new Map<string, Promise<void>>();
let writeChain: Promise<void> = Promise.resolve();

function fail(): never {
  throw new Error("learning_v2_activity_auxiliary_app_client_invalid");
}

function setPeek(
  key: string,
  descriptor: LearningV2ActivityAuxiliaryClientDescriptorV1,
): void {
  peek.delete(key);
  peek.set(key, descriptor);
  while (peek.size > LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_ENTRIES_V1) {
    const oldest = peek.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    peek.delete(oldest);
  }
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

function exactLocator(
  value: LearningV2ActivityAuxiliaryLocatorV1,
): LearningV2ActivityAuxiliaryLocatorV1 {
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

function locatorKey(locator: ScopedLocator): string {
  if (!HASH_RE.test(locator.accountScopeHash)) fail();
  return `learning-v2:activity-auxiliary-locator:${locator.accountScopeHash}:${locator.environment}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:${locator.activeManifestHash}:${locator.episodeId}:${locator.sessionOrdinal}`;
}

function locatorFromExpected(
  expected: LearningV2ActivityAuxiliaryClientExpectedV1,
  accountScopeHash: string,
): ScopedLocator {
  return Object.freeze({
    ...exactLocator({
      environment: expected.environment,
      studyTarget: expected.studyTarget,
      learnerSourceLocale: expected.learnerSourceLocale,
      seasonId: expected.seasonId,
      activeManifestHash: expected.activeManifestHash,
      episodeId: expected.episodeId,
      sessionOrdinal: expected.sessionOrdinal,
    }),
    accountScopeHash,
  });
}

function byteSize(value: string): number {
  return encoder.encode(value).byteLength;
}

function parseEnvelope(raw: string | null): CacheEnvelope {
  if (raw === null) {
    return Object.freeze({
      schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1,
      rows: Object.freeze([]),
    });
  }
  if (byteSize(raw) > LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_BYTES_V1) fail();
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
      LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1 ||
    !Array.isArray((value as { rows?: unknown }).rows) ||
    (value as { rows: unknown[] }).rows.length >
      LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_ENTRIES_V1
  )
    fail();
  const rows = (value as { rows: unknown[] }).rows.map((candidate) => {
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate) ||
      Object.keys(candidate).sort().join("|") !==
        "accountScopeHash|byteSize|canonicalRaw|expected|key|locatorKey|touchedAtMs"
    )
      fail();
    const row = candidate as Record<string, unknown>;
    if (
      typeof row.key !== "string" ||
      typeof row.locatorKey !== "string" ||
      typeof row.accountScopeHash !== "string" ||
      !HASH_RE.test(row.accountScopeHash) ||
      typeof row.canonicalRaw !== "string" ||
      !Number.isSafeInteger(row.byteSize) ||
      row.byteSize !== byteSize(row.canonicalRaw) ||
      !Number.isSafeInteger(row.touchedAtMs) ||
      Number(row.touchedAtMs) < 0
    )
      fail();
    const descriptor = parseLearningV2ActivityAuxiliaryClientDescriptorV1(
      row.canonicalRaw,
    );
    const expected =
      row.expected as LearningV2ActivityAuxiliaryClientExpectedV1;
    if (
      learningV2ActivityAuxiliaryClientCacheKeyV1(expected) !== row.key ||
      locatorKey(locatorFromExpected(expected, row.accountScopeHash)) !==
        row.locatorKey ||
      descriptor.environment !== expected.environment ||
      descriptor.activeManifestHash !== expected.activeManifestHash ||
      descriptor.sessionId !== expected.sessionId
    )
      fail();
    setPeek(row.locatorKey, descriptor);
    return Object.freeze({
      key: row.key,
      locatorKey: row.locatorKey,
      accountScopeHash: row.accountScopeHash,
      expected: Object.freeze({ ...expected }),
      canonicalRaw: row.canonicalRaw,
      byteSize: Number(row.byteSize),
      touchedAtMs: Number(row.touchedAtMs),
    });
  });
  return Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1,
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
      schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1,
      rows: [],
    }),
  );
  for (const row of [...rows].sort((a, b) => b.touchedAtMs - a.touchedAtMs)) {
    if (selected.length >= LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_ENTRIES_V1)
      break;
    const rowBytes = byteSize(JSON.stringify(row)) + 1;
    if (
      totalBytes + rowBytes >
      LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_BYTES_V1
    )
      continue;
    selected.push(row);
    totalBytes += rowBytes;
  }
  return Object.freeze(selected);
}

async function mutateRows(
  mutate: (rows: readonly CacheRow[]) => readonly CacheRow[],
): Promise<void> {
  writeChain = writeChain
    .then(async () => {
      const current = await readEnvelope();
      const rows = boundedRows(mutate(current.rows));
      const raw = JSON.stringify({
        schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_SCHEMA_V1,
        rows,
      });
      if (byteSize(raw) > LEARNING_V2_ACTIVITY_AUXILIARY_CACHE_MAX_BYTES_V1)
        fail();
      await AsyncStorage.setItem(STORAGE_KEY, raw);
    })
    .catch(() => undefined);
  return writeChain;
}

function createCache(
  expected: LearningV2ActivityAuxiliaryClientExpectedV1,
  accountScopeHash: string,
): LearningV2ActivityAuxiliaryClientCacheV1 {
  if (!HASH_RE.test(accountScopeHash)) fail();
  const key = learningV2ActivityAuxiliaryClientCacheKeyV1(expected);
  const location = locatorKey(locatorFromExpected(expected, accountScopeHash));
  const cache: LearningV2ActivityAuxiliaryClientCacheV1 = {
    get: async (requestedKey: string) => {
      if (requestedKey !== key) fail();
      const envelope = await readEnvelope();
      return (
        envelope.rows.find(
          (row) => row.key === key && row.accountScopeHash === accountScopeHash,
        )?.canonicalRaw ?? null
      );
    },
    set: async (requestedKey: string, canonicalRaw: string) => {
      if (requestedKey !== key) fail();
      const descriptor =
        parseLearningV2ActivityAuxiliaryClientDescriptorV1(canonicalRaw);
      setPeek(location, descriptor);
      const row: CacheRow = Object.freeze({
        key,
        locatorKey: location,
        accountScopeHash,
        expected: Object.freeze({ ...expected }),
        canonicalRaw,
        byteSize: byteSize(canonicalRaw),
        touchedAtMs: Date.now(),
      });
      await mutateRows((rows) => [
        row,
        ...rows.filter(
          (item) =>
            item.key !== key || item.accountScopeHash !== accountScopeHash,
        ),
      ]);
    },
    remove: async (requestedKey: string) => {
      if (requestedKey !== key) fail();
      peek.delete(location);
      await mutateRows((rows) =>
        rows.filter(
          (row) => row.key !== key || row.accountScopeHash !== accountScopeHash,
        ),
      );
    },
  };
  return Object.freeze(cache);
}

function parseResponse(
  value: unknown,
  locator: LearningV2ActivityAuxiliaryLocatorV1,
): Readonly<{
  expected: LearningV2ActivityAuxiliaryClientExpectedV1;
  canonicalRaw: string;
}> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join("|") !==
      "activeManifestHash|activityPackageFingerprint|auxiliaryIndexFingerprint|canonicalDescriptorRaw|descriptorFingerprint|episodeId|evidenceAuthority|masteryAuthority|releaseAuthority|repositoryOriginProjection|schemaVersion|sessionId|sessionOrdinal|transportAuthority|walletAuthority"
  )
    fail();
  const row = value as CallableResponse;
  if (
    row.schemaVersion !== "v2-activity-auxiliary-session-response.v1" ||
    row.transportAuthority !==
      "firebase_callable_auth_and_app_check_boundary" ||
    row.repositoryOriginProjection !==
      "server_private_release_handle_projection" ||
    row.walletAuthority !== "none" ||
    row.masteryAuthority !== "none" ||
    row.evidenceAuthority !== "none" ||
    row.releaseAuthority !== false ||
    row.activeManifestHash !== locator.activeManifestHash ||
    row.episodeId !== locator.episodeId ||
    row.sessionOrdinal !== locator.sessionOrdinal ||
    !ID_RE.test(row.sessionId) ||
    !HASH_RE.test(row.activityPackageFingerprint) ||
    !HASH_RE.test(row.auxiliaryIndexFingerprint) ||
    !HASH_RE.test(row.descriptorFingerprint) ||
    typeof row.canonicalDescriptorRaw !== "string"
  )
    fail();
  const descriptor = parseLearningV2ActivityAuxiliaryClientDescriptorV1(
    row.canonicalDescriptorRaw,
  );
  if (
    descriptor.descriptorFingerprint !== row.descriptorFingerprint ||
    descriptor.activeManifestHash !== row.activeManifestHash ||
    descriptor.episodeId !== row.episodeId ||
    descriptor.sessionId !== row.sessionId ||
    descriptor.sessionOrdinal !== row.sessionOrdinal ||
    descriptor.activityPackageFingerprint !== row.activityPackageFingerprint ||
    descriptor.auxiliaryIndexFingerprint !== row.auxiliaryIndexFingerprint
  )
    fail();
  return Object.freeze({
    expected: Object.freeze({
      environment: locator.environment,
      studyTarget: locator.studyTarget,
      learnerSourceLocale: locator.learnerSourceLocale,
      seasonId: locator.seasonId,
      activeManifestHash: row.activeManifestHash,
      episodeId: row.episodeId,
      sessionId: row.sessionId,
      sessionOrdinal: row.sessionOrdinal,
      activityPackageFingerprint: row.activityPackageFingerprint,
      auxiliaryIndexFingerprint: row.auxiliaryIndexFingerprint,
    }),
    canonicalRaw: row.canonicalDescriptorRaw,
  });
}

async function fetchNetwork(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1 &
    Readonly<{ activeManifestHash: string | null }>,
): Promise<unknown> {
  return withBackgroundNetworkLease(
    "learning-v2.activity-auxiliary",
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

export function peekLearningV2ActivityAuxiliarySessionV1(
  locatorInput: LearningV2ActivityAuxiliaryLocatorV1,
): LearningV2ActivityAuxiliaryClientDescriptorV1 | null {
  const locator = exactLocator(locatorInput);
  const stableId = peekStableId();
  if (!stableId) return null;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  return peek.get(locatorKey({ ...locator, accountScopeHash })) ?? null;
}

export function peekCurrentLearningV2ActivityAuxiliarySessionV1(
  locatorInput: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): LearningV2ActivityAuxiliaryClientDescriptorV1 | null {
  const locator = exactCurrentLocator(locatorInput);
  const stableId = peekStableId();
  if (!stableId) return null;
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const candidates = [...peek.values()].filter(
    (descriptor) =>
      descriptor.environment === locator.environment &&
      descriptor.studyTarget === locator.studyTarget &&
      descriptor.learnerSourceLocale === locator.learnerSourceLocale &&
      descriptor.seasonId === locator.seasonId &&
      descriptor.episodeId === locator.episodeId &&
      descriptor.sessionOrdinal === locator.sessionOrdinal,
  );
  const descriptor = candidates.at(-1) ?? null;
  if (!descriptor) return null;
  const expected = Object.freeze({
    environment: descriptor.environment,
    studyTarget: descriptor.studyTarget,
    learnerSourceLocale: descriptor.learnerSourceLocale,
    seasonId: descriptor.seasonId,
    activeManifestHash: descriptor.activeManifestHash,
    episodeId: descriptor.episodeId,
    sessionId: descriptor.sessionId,
    sessionOrdinal: descriptor.sessionOrdinal,
    activityPackageFingerprint: descriptor.activityPackageFingerprint,
    auxiliaryIndexFingerprint: descriptor.auxiliaryIndexFingerprint,
  });
  return (
    peek.get(locatorKey(locatorFromExpected(expected, accountScopeHash))) ??
    null
  );
}

export async function hydrateLearningV2ActivityAuxiliaryCacheV1(): Promise<void> {
  await readEnvelope();
}

export async function loadLearningV2ActivityAuxiliarySessionV1(
  locatorInput: LearningV2ActivityAuxiliaryLocatorV1,
): Promise<LearningV2ActivityAuxiliaryAppResultV1> {
  const locator = exactLocator(locatorInput);
  // зачем ensureStableAuthLink (владелец, 2026-08-27, «сессии должны быть
  // доступны всегда, даже без привязки аккаунта») — см. подробный комментарий
  // в learning_v2_course_released_session_client_v3.ts, тот же класс бага.
  await ensureStableAuthLink().catch(() => false);
  const stableId = await ensureAnonUser();
  if (!stableId) fail();
  const accountScopeHash = deriveLocalOfflineProgressAccountScopeHash(stableId);
  const scopedLocator = Object.freeze({ ...locator, accountScopeHash });
  let rawResponse: unknown;
  try {
    rawResponse = await fetchNetwork(locator);
  } catch (networkError) {
    if (!allowsOfflineFallback(networkError)) throw networkError;
    const envelope = await readEnvelope();
    const row = envelope.rows.find(
      (candidate) => candidate.locatorKey === locatorKey(scopedLocator),
    );
    if (!row) throw networkError;
    const result = await loadLearningV2ActivityAuxiliaryClientWithLkgV1({
      expected: row.expected,
      cache: createCache(row.expected, accountScopeHash),
      fetchCanonicalRaw: async () => {
        throw networkError;
      },
    });
    setPeek(locatorKey(scopedLocator), result.descriptor);
    return Object.freeze({ ...result, transport: "offline_lkg" as const });
  }
  // Once bytes arrived, every response/descriptor mismatch is a protocol error.
  // It is deliberately outside the network catch and cannot be hidden by LKG.
  const response = parseResponse(rawResponse, locator);
  const result = await loadLearningV2ActivityAuxiliaryClientWithLkgV1({
    expected: response.expected,
    cache: createCache(response.expected, accountScopeHash),
    fetchCanonicalRaw: async () => response.canonicalRaw,
  });
  setPeek(locatorKey(scopedLocator), result.descriptor);
  return Object.freeze({ ...result, transport: "firebase_callable" as const });
}

function exactCurrentLocator(
  value: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): LearningV2ActivityAuxiliaryCurrentLocatorV1 {
  const synthetic = exactLocator({
    ...value,
    activeManifestHash: "0".repeat(64),
  });
  const { activeManifestHash: _ignored, ...current } = synthetic;
  return Object.freeze(current);
}

function currentLocatorPrefix(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1,
  accountScopeHash: string,
): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return `learning-v2:activity-auxiliary-locator:${accountScopeHash}:${locator.environment}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:`;
}

function currentPreloadKey(
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): string {
  return `learning-v2:activity-auxiliary-preload:${locator.environment}:${locator.studyTarget}:${locator.learnerSourceLocale}:${locator.seasonId}:${locator.episodeId}:${locator.sessionOrdinal}`;
}

function rowMatchesCurrentLocator(
  row: CacheRow,
  locator: LearningV2ActivityAuxiliaryCurrentLocatorV1,
  accountScopeHash: string,
): boolean {
  return (
    row.accountScopeHash === accountScopeHash &&
    row.locatorKey.startsWith(
      currentLocatorPrefix(locator, accountScopeHash),
    ) &&
    row.expected.episodeId === locator.episodeId &&
    row.expected.sessionOrdinal === locator.sessionOrdinal
  );
}

export async function loadCurrentLearningV2ActivityAuxiliarySessionV1(
  locatorInput: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): Promise<LearningV2ActivityAuxiliaryAppResultV1> {
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
      .filter((candidate) =>
        rowMatchesCurrentLocator(candidate, locator, accountScopeHash),
      )
      .sort((a, b) => b.touchedAtMs - a.touchedAtMs)[0];
    if (!row) throw networkError;
    const result = await loadLearningV2ActivityAuxiliaryClientWithLkgV1({
      expected: row.expected,
      cache: createCache(row.expected, accountScopeHash),
      fetchCanonicalRaw: async () => {
        throw networkError;
      },
    });
    setPeek(row.locatorKey, result.descriptor);
    return Object.freeze({ ...result, transport: "offline_lkg" as const });
  }
  const response = parseResponse(rawResponse, {
    ...locator,
    activeManifestHash:
      typeof rawResponse === "object" &&
      rawResponse !== null &&
      "activeManifestHash" in rawResponse
        ? String(
            (rawResponse as { activeManifestHash: unknown }).activeManifestHash,
          )
        : fail(),
  });
  const result = await loadLearningV2ActivityAuxiliaryClientWithLkgV1({
    expected: response.expected,
    cache: createCache(response.expected, accountScopeHash),
    fetchCanonicalRaw: async () => response.canonicalRaw,
  });
  setPeek(
    locatorKey(locatorFromExpected(response.expected, accountScopeHash)),
    result.descriptor,
  );
  return Object.freeze({ ...result, transport: "firebase_callable" as const });
}

export function preloadCurrentLearningV2ActivityAuxiliarySessionV1(
  locatorInput: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): Promise<void> {
  const locator = exactCurrentLocator(locatorInput);
  const key = currentPreloadKey(locator);
  const existing = currentPreloads.get(key);
  if (existing) return existing;
  let promise: Promise<void>;
  promise = loadCurrentLearningV2ActivityAuxiliarySessionV1(locator)
    .then(() => undefined)
    .finally(() => {
      if (currentPreloads.get(key) === promise) currentPreloads.delete(key);
    });
  currentPreloads.set(key, promise);
  return promise;
}

export function waitForCurrentLearningV2ActivityAuxiliaryPreloadV1(
  locatorInput: LearningV2ActivityAuxiliaryCurrentLocatorV1,
): Promise<void> | null {
  const locator = exactCurrentLocator(locatorInput);
  return currentPreloads.get(currentPreloadKey(locator)) ?? null;
}

export async function clearLearningV2ActivityAuxiliaryCacheV1(): Promise<void> {
  peek.clear();
  currentPreloads.clear();
  writeChain = writeChain
    .then(() => AsyncStorage.removeItem(STORAGE_KEY))
    .catch(() => undefined);
  await writeChain;
}
