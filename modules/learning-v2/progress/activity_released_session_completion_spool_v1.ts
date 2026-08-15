import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  parseLearningV2ActivityReleasedSessionCompletionV1,
  type LearningV2ActivityReleasedSessionCompletionV1,
} from "./activity_released_session_completion_v1";
import {
  progressAccountKey,
  type ProgressAccountScope,
  type ProgressGenerationGuard,
  type ProgressStorage,
} from "./progress_store";
import { withProgressStorageLock } from "./progress_storage_lock";

export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_SCHEMA_V1 =
  "learning-v2-activity-released-completion-spool.v1" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_ENTRIES_V1 = 64;
export const LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_BYTES_V1 =
  6 * 1024 * 1024;

type SpoolIndexV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_SCHEMA_V1;
  accountKey: string;
  completionFingerprints: readonly string[];
  indexFingerprint: string;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const INDEX_KEYS = Object.freeze([
  "schemaVersion",
  "accountKey",
  "completionFingerprints",
  "indexFingerprint",
] as const);

function fail(code = "activity_released_completion_spool_invalid"): never {
  throw new Error(code);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function indexKey(scope: ProgressAccountScope): string {
  return `v2:activity-released-completion-spool:v1:${progressAccountKey(scope)}:index`;
}

function entryKey(scope: ProgressAccountScope, fingerprint: string): string {
  if (!HASH_RE.test(fingerprint)) fail();
  return `v2:activity-released-completion-spool:v1:${progressAccountKey(scope)}:${fingerprint}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function accountScopeIndexPattern(scope: ProgressAccountScope): RegExp {
  return new RegExp(
    `^v2:activity-released-completion-spool:v1:v2:progress:v1:${escapeRegExp(scope.accountScopeHash)}:([A-Za-z0-9._-]{1,128}):([A-Za-z0-9._-]{1,128}):([A-Za-z0-9._-]{1,128}):g${scope.generation}:index$`,
    "u",
  );
}

function emptyIndex(accountKey: string): SpoolIndexV1 {
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_SCHEMA_V1,
    accountKey,
    completionFingerprints: Object.freeze([]) as readonly string[],
  });
  return Object.freeze({ ...body, indexFingerprint: hashCanonicalBody(body) });
}

function encodeIndex(input: SpoolIndexV1): string {
  const raw = canonicalJsonV1(input);
  if (utf8ByteLengthV1(raw) > 32 * 1024) fail();
  return raw;
}

function parseIndex(raw: string | null, accountKey: string): SpoolIndexV1 {
  if (raw === null) return emptyIndex(accountKey);
  if (raw.length > 32 * 1024 || utf8ByteLengthV1(raw) > 32 * 1024) fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    !record(value) ||
    Reflect.ownKeys(value).length !== INDEX_KEYS.length ||
    Reflect.ownKeys(value).some(
      (key) => typeof key !== "string" || !INDEX_KEYS.includes(key as never),
    ) ||
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_SCHEMA_V1 ||
    value.accountKey !== accountKey ||
    !Array.isArray(value.completionFingerprints) ||
    value.completionFingerprints.length >
      LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_ENTRIES_V1 ||
    value.completionFingerprints.some(
      (fingerprint) =>
        typeof fingerprint !== "string" || !HASH_RE.test(fingerprint),
    ) ||
    new Set(value.completionFingerprints).size !==
      value.completionFingerprints.length ||
    typeof value.indexFingerprint !== "string" ||
    !HASH_RE.test(value.indexFingerprint)
  )
    fail();
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_SCHEMA_V1,
    accountKey,
    completionFingerprints: Object.freeze([
      ...value.completionFingerprints,
    ]) as readonly string[],
  });
  const index = Object.freeze({
    ...body,
    indexFingerprint: value.indexFingerprint,
  });
  if (
    hashCanonicalBody(body) !== index.indexFingerprint ||
    canonicalJsonV1(index) !== raw
  )
    fail();
  return index;
}

function nextIndex(
  accountKey: string,
  fingerprints: readonly string[],
): SpoolIndexV1 {
  if (
    fingerprints.length >
      LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_ENTRIES_V1 ||
    new Set(fingerprints).size !== fingerprints.length ||
    fingerprints.some((fingerprint) => !HASH_RE.test(fingerprint))
  )
    fail("activity_released_completion_spool_capacity");
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_SCHEMA_V1,
    accountKey,
    completionFingerprints: Object.freeze([...fingerprints]),
  });
  return Object.freeze({ ...body, indexFingerprint: hashCanonicalBody(body) });
}

function exactScope(
  scope: ProgressAccountScope,
  completion: LearningV2ActivityReleasedSessionCompletionV1,
): void {
  if (
    completion.accountScopeHash !== scope.accountScopeHash ||
    completion.accountGeneration !== scope.generation ||
    completion.seasonId !== scope.seasonId ||
    completion.studyTarget !== scope.studyTarget ||
    completion.learnerSourceLocale !== scope.learnerSourceLocale
  )
    fail("activity_released_completion_spool_scope_mismatch");
}

export function createLearningV2ActivityReleasedSessionCompletionSpoolV1(
  storage: ProgressStorage,
  isCurrentGeneration: ProgressGenerationGuard,
) {
  if (
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  )
    fail();
  const durable: ProgressStorage = Object.freeze({
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    removeItem: storage.removeItem.bind(storage),
    getAllKeys: storage.getAllKeys?.bind(storage),
    operationTimeoutMs: null,
  });
  const assertCurrent = (scope: ProgressAccountScope) => {
    if (!isCurrentGeneration(scope))
      throw new Error("progress_generation_stale");
  };
  const lock = <T>(scope: ProgressAccountScope, operation: () => Promise<T>) =>
    withProgressStorageLock(
      `activity-released-completion-spool:${progressAccountKey(scope)}`,
      operation,
    );
  const readIndex = async (scope: ProgressAccountScope) => {
    assertCurrent(scope);
    const found = parseIndex(
      await durable.getItem(indexKey(scope)),
      progressAccountKey(scope),
    );
    assertCurrent(scope);
    return found;
  };
  const readEntry = async (
    scope: ProgressAccountScope,
    fingerprint: string,
  ): Promise<LearningV2ActivityReleasedSessionCompletionV1> => {
    const raw = await durable.getItem(entryKey(scope, fingerprint));
    if (
      raw === null ||
      raw.length > 96 * 1024 ||
      utf8ByteLengthV1(raw) > 96 * 1024
    )
      fail("activity_released_completion_spool_corrupt");
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      fail("activity_released_completion_spool_corrupt");
    }
    const completion =
      parseLearningV2ActivityReleasedSessionCompletionV1(value);
    if (
      completion.completionFingerprint !== fingerprint ||
      canonicalJsonV1(completion) !== raw
    )
      fail("activity_released_completion_spool_corrupt");
    exactScope(scope, completion);
    return completion;
  };
  return Object.freeze({
    append: async (
      scope: ProgressAccountScope,
      input: unknown,
    ): Promise<void> =>
      lock(scope, async () => {
        assertCurrent(scope);
        const completion =
          parseLearningV2ActivityReleasedSessionCompletionV1(input);
        exactScope(scope, completion);
        const raw = canonicalJsonV1(completion);
        const key = entryKey(scope, completion.completionFingerprint);
        const index = await readIndex(scope);
        const existing = await durable.getItem(key);
        if (existing !== null && existing !== raw)
          fail("activity_released_completion_spool_conflict");
        if (existing === null) await durable.setItem(key, raw);
        assertCurrent(scope);
        if ((await durable.getItem(key)) !== raw)
          fail("activity_released_completion_spool_indeterminate");
        if (
          !index.completionFingerprints.includes(
            completion.completionFingerprint,
          )
        ) {
          const next = nextIndex(progressAccountKey(scope), [
            ...index.completionFingerprints,
            completion.completionFingerprint,
          ]);
          await durable.setItem(indexKey(scope), encodeIndex(next));
          assertCurrent(scope);
          if ((await durable.getItem(indexKey(scope))) !== encodeIndex(next))
            fail("activity_released_completion_spool_indeterminate");
        }
      }),
    list: async (
      scope: ProgressAccountScope,
    ): Promise<readonly LearningV2ActivityReleasedSessionCompletionV1[]> =>
      lock(scope, async () => {
        const index = await readIndex(scope);
        const rows: LearningV2ActivityReleasedSessionCompletionV1[] = [];
        let totalBytes = 0;
        for (const fingerprint of index.completionFingerprints) {
          const completion = await readEntry(scope, fingerprint);
          totalBytes += utf8ByteLengthV1(canonicalJsonV1(completion));
          if (
            totalBytes >
            LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_SPOOL_MAX_BYTES_V1
          )
            fail("activity_released_completion_spool_overflow");
          rows.push(completion);
        }
        assertCurrent(scope);
        return Object.freeze(rows);
      }),
    discoverAccountScopes: async (
      scope: ProgressAccountScope,
    ): Promise<readonly ProgressAccountScope[]> =>
      lock(scope, async () => {
        assertCurrent(scope);
        if (!durable.getAllKeys)
          throw new Error(
            "activity_released_completion_spool_discovery_unsupported",
          );
        const pattern = accountScopeIndexPattern(scope);
        const found = new Map<string, ProgressAccountScope>();
        const keys = await durable.getAllKeys();
        if (keys.length > 20_000)
          fail("activity_released_completion_spool_discovery_overflow");
        for (const key of keys) {
          const match = pattern.exec(key);
          if (!match) continue;
          const candidate = Object.freeze({
            stableId: scope.stableId,
            accountScopeHash: scope.accountScopeHash,
            generation: scope.generation,
            seasonId: match[1]!,
            studyTarget: match[2]!,
            learnerSourceLocale: match[3]!,
          });
          const accountKey = progressAccountKey(candidate);
          const parsed = parseIndex(await durable.getItem(key), accountKey);
          if (parsed.completionFingerprints.length > 0)
            found.set(accountKey, candidate);
        }
        assertCurrent(scope);
        return Object.freeze(
          [...found.entries()]
            .sort(([left], [right]) =>
              left < right ? -1 : left > right ? 1 : 0,
            )
            .map(([, candidate]) => candidate),
        );
      }),
    remove: async (
      scope: ProgressAccountScope,
      completionFingerprint: string,
    ): Promise<void> =>
      lock(scope, async () => {
        assertCurrent(scope);
        if (!HASH_RE.test(completionFingerprint)) fail();
        const index = await readIndex(scope);
        if (!index.completionFingerprints.includes(completionFingerprint))
          return;
        await durable.removeItem!(entryKey(scope, completionFingerprint));
        const next = nextIndex(
          progressAccountKey(scope),
          index.completionFingerprints.filter(
            (candidate) => candidate !== completionFingerprint,
          ),
        );
        await durable.setItem(indexKey(scope), encodeIndex(next));
        assertCurrent(scope);
      }),
  });
}
