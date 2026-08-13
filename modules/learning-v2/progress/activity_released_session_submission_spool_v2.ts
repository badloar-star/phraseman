import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2,
  parseLearningV2ActivityReleasedSessionSubmissionV2,
  type LearningV2ActivityReleasedSessionSubmissionV2,
} from "./activity_released_session_submission_v2";
import {
  progressAccountKey,
  type ProgressAccountScope,
  type ProgressGenerationGuard,
  type ProgressStorage,
} from "./progress_store";
import { withProgressStorageLock } from "./progress_storage_lock";

export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_SCHEMA_V2 =
  "learning-v2-activity-released-submission-spool.v2" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_ENTRIES_V2 = 64;
export const LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_BYTES_V2 =
  12 * 1024 * 1024;

type SubmissionIndexV2 = Readonly<{
  schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_SCHEMA_V2;
  accountKey: string;
  submissionFingerprints: readonly string[];
  indexFingerprint: string;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const INDEX_KEYS = Object.freeze([
  "schemaVersion",
  "accountKey",
  "submissionFingerprints",
  "indexFingerprint",
] as const);

function fail(code = "activity_released_submission_spool_invalid"): never {
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

function prefix(scope: ProgressAccountScope): string {
  return `v2:activity-released-submission-spool:v2:${progressAccountKey(scope)}`;
}

function indexKey(scope: ProgressAccountScope): string {
  return `${prefix(scope)}:index`;
}

function entryKey(scope: ProgressAccountScope, fingerprint: string): string {
  if (!HASH_RE.test(fingerprint)) fail();
  return `${prefix(scope)}:${fingerprint}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function accountScopeIndexPattern(scope: ProgressAccountScope): RegExp {
  return new RegExp(
    `^v2:activity-released-submission-spool:v2:v2:progress:v1:${escapeRegExp(scope.accountScopeHash)}:([A-Za-z0-9._-]{1,128}):([A-Za-z0-9._-]{1,128}):([A-Za-z0-9._-]{1,128}):g${scope.generation}:index$`,
    "u",
  );
}

function makeIndex(
  accountKey: string,
  submissionFingerprints: readonly string[],
): SubmissionIndexV2 {
  if (
    submissionFingerprints.length >
      LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_ENTRIES_V2 ||
    new Set(submissionFingerprints).size !== submissionFingerprints.length ||
    submissionFingerprints.some((value) => !HASH_RE.test(value))
  )
    fail("activity_released_submission_spool_capacity");
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_SCHEMA_V2,
    accountKey,
    submissionFingerprints: Object.freeze([...submissionFingerprints]),
  });
  return Object.freeze({ ...body, indexFingerprint: hashCanonicalBody(body) });
}

function encodeIndex(index: SubmissionIndexV2): string {
  const raw = canonicalJsonV1(index);
  if (utf8ByteLengthV1(raw) > 32 * 1024) fail();
  return raw;
}

function parseIndex(raw: string | null, accountKey: string): SubmissionIndexV2 {
  if (raw === null) return makeIndex(accountKey, []);
  if (raw.length > 32 * 1024 || utf8ByteLengthV1(raw) > 32 * 1024) fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!record(value)) fail();
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== INDEX_KEYS.length ||
    keys.some(
      (key) => typeof key !== "string" || !INDEX_KEYS.includes(key as never),
    ) ||
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_SCHEMA_V2 ||
    value.accountKey !== accountKey ||
    !Array.isArray(value.submissionFingerprints) ||
    typeof value.indexFingerprint !== "string"
  )
    fail();
  const parsed = makeIndex(
    accountKey,
    value.submissionFingerprints as readonly string[],
  );
  if (
    parsed.indexFingerprint !== value.indexFingerprint ||
    canonicalJsonV1(parsed) !== raw
  )
    fail();
  return parsed;
}

function exactScope(
  scope: ProgressAccountScope,
  submission: LearningV2ActivityReleasedSessionSubmissionV2,
): void {
  const completion = submission.completion;
  if (
    completion.accountScopeHash !== scope.accountScopeHash ||
    completion.accountGeneration !== scope.generation ||
    completion.seasonId !== scope.seasonId ||
    completion.studyTarget !== scope.studyTarget ||
    completion.learnerSourceLocale !== scope.learnerSourceLocale
  )
    fail("activity_released_submission_spool_scope_mismatch");
}

export function createLearningV2ActivityReleasedSessionSubmissionSpoolV2(
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
      `activity-released-submission-spool:${progressAccountKey(scope)}`,
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
  ) => {
    const raw = await durable.getItem(entryKey(scope, fingerprint));
    if (
      raw === null ||
      raw.length >
        LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2 ||
      utf8ByteLengthV1(raw) >
        LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2
    )
      fail("activity_released_submission_spool_corrupt");
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      fail("activity_released_submission_spool_corrupt");
    }
    const submission =
      parseLearningV2ActivityReleasedSessionSubmissionV2(value);
    if (
      submission.submissionFingerprint !== fingerprint ||
      canonicalJsonV1(submission) !== raw
    )
      fail("activity_released_submission_spool_corrupt");
    exactScope(scope, submission);
    return submission;
  };
  return Object.freeze({
    append: async (
      scope: ProgressAccountScope,
      input: unknown,
    ): Promise<void> =>
      lock(scope, async () => {
        assertCurrent(scope);
        const submission =
          parseLearningV2ActivityReleasedSessionSubmissionV2(input);
        exactScope(scope, submission);
        const raw = canonicalJsonV1(submission);
        const key = entryKey(scope, submission.submissionFingerprint);
        const index = await readIndex(scope);
        const existing = await durable.getItem(key);
        if (existing !== null && existing !== raw)
          fail("activity_released_submission_spool_conflict");
        if (existing === null) await durable.setItem(key, raw);
        assertCurrent(scope);
        if ((await durable.getItem(key)) !== raw)
          fail("activity_released_submission_spool_indeterminate");
        if (
          !index.submissionFingerprints.includes(
            submission.submissionFingerprint,
          )
        ) {
          const next = makeIndex(progressAccountKey(scope), [
            ...index.submissionFingerprints,
            submission.submissionFingerprint,
          ]);
          await durable.setItem(indexKey(scope), encodeIndex(next));
          assertCurrent(scope);
          if ((await durable.getItem(indexKey(scope))) !== encodeIndex(next))
            fail("activity_released_submission_spool_indeterminate");
        }
      }),
    list: async (scope: ProgressAccountScope) =>
      lock(scope, async () => {
        const index = await readIndex(scope);
        const rows: LearningV2ActivityReleasedSessionSubmissionV2[] = [];
        let totalBytes = 0;
        for (const fingerprint of index.submissionFingerprints) {
          const submission = await readEntry(scope, fingerprint);
          totalBytes += utf8ByteLengthV1(canonicalJsonV1(submission));
          if (
            totalBytes >
            LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_SPOOL_MAX_BYTES_V2
          )
            fail("activity_released_submission_spool_overflow");
          rows.push(submission);
        }
        assertCurrent(scope);
        return Object.freeze(rows);
      }),
    discoverAccountScopes: async (scope: ProgressAccountScope) =>
      lock(scope, async () => {
        assertCurrent(scope);
        if (!durable.getAllKeys)
          throw new Error(
            "activity_released_submission_spool_discovery_unsupported",
          );
        const pattern = accountScopeIndexPattern(scope);
        const found = new Map<string, ProgressAccountScope>();
        const keys = await durable.getAllKeys();
        if (keys.length > 20_000)
          fail("activity_released_submission_spool_discovery_overflow");
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
          const parsed = parseIndex(
            await durable.getItem(key),
            progressAccountKey(candidate),
          );
          if (parsed.submissionFingerprints.length > 0)
            found.set(progressAccountKey(candidate), candidate);
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
    remove: async (scope: ProgressAccountScope, fingerprint: string) =>
      lock(scope, async () => {
        assertCurrent(scope);
        if (!HASH_RE.test(fingerprint)) fail();
        const index = await readIndex(scope);
        if (!index.submissionFingerprints.includes(fingerprint)) return;
        await durable.removeItem!(entryKey(scope, fingerprint));
        const next = makeIndex(
          progressAccountKey(scope),
          index.submissionFingerprints.filter((value) => value !== fingerprint),
        );
        await durable.setItem(indexKey(scope), encodeIndex(next));
        assertCurrent(scope);
      }),
  });
}
