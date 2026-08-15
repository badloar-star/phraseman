import type { LearningV2CourseSessionCompletedSummaryV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  encodeLearningV2CourseSessionCompletedSummaryV1,
  parseLearningV2CourseSessionCompletedSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import { canonicalJsonV1 } from "../modules/learning-v2/policies/decision_registry";

export const LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1 =
  "learning-v2-course-session-completed-spool.v1" as const;
export const LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_MAX_ENTRIES_V1 = 96;

export interface LearningV2CourseSessionCompletedSpoolStorageV1 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

type Index = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1;
  completionFingerprints: readonly string[];
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;

function fail(): never {
  throw new Error("learning_v2_course_session_completed_spool_invalid");
}

function scopeKey(accountScopeHash: string): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return `learning-v2:direct-completed:v1:${accountScopeHash}`;
}

function indexKey(accountScopeHash: string): string {
  return `${scopeKey(accountScopeHash)}:index`;
}

function entryKey(accountScopeHash: string, fingerprint: string): string {
  if (!HASH_RE.test(fingerprint)) fail();
  return `${scopeKey(accountScopeHash)}:${fingerprint}`;
}

function emptyIndex(): Index {
  return Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1,
    completionFingerprints: Object.freeze([]),
  });
}

function parseIndex(raw: string | null): Index {
  if (raw === null) return emptyIndex();
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
    Object.getPrototypeOf(value) !== Object.prototype
  )
    fail();
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join("|") !==
      "completionFingerprints|schemaVersion" ||
    row.schemaVersion !==
      LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1 ||
    !Array.isArray(row.completionFingerprints) ||
    row.completionFingerprints.length >
      LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_MAX_ENTRIES_V1 ||
    row.completionFingerprints.some(
      (entry) => typeof entry !== "string" || !HASH_RE.test(entry),
    ) ||
    new Set(row.completionFingerprints).size !==
      row.completionFingerprints.length ||
    canonicalJsonV1(row) !== raw
  )
    fail();
  return Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1,
    completionFingerprints: Object.freeze([
      ...(row.completionFingerprints as string[]),
    ]),
  });
}

export function createLearningV2CourseSessionCompletedSpoolV1(
  storage: LearningV2CourseSessionCompletedSpoolStorageV1,
) {
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const next = chain.then(work, work);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
  return Object.freeze({
    append(
      accountScopeHash: string,
      completion: LearningV2CourseSessionCompletedSummaryV1,
    ): Promise<void> {
      return serialize(async () => {
        const parsed =
          parseLearningV2CourseSessionCompletedSummaryV1(completion);
        const raw = encodeLearningV2CourseSessionCompletedSummaryV1(parsed);
        const current = await storage.getItem(indexKey(accountScopeHash));
        const index = parseIndex(current);
        const key = entryKey(accountScopeHash, parsed.completionFingerprint);
        const existing = await storage.getItem(key);
        if (existing !== null && existing !== raw) fail();
        if (existing === null) await storage.setItem(key, raw);
        if (index.completionFingerprints.includes(parsed.completionFingerprint))
          return;
        if (
          index.completionFingerprints.length >=
          LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_MAX_ENTRIES_V1
        )
          fail();
        await storage.setItem(
          indexKey(accountScopeHash),
          canonicalJsonV1({
            schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1,
            completionFingerprints: [
              ...index.completionFingerprints,
              parsed.completionFingerprint,
            ],
          }),
        );
      });
    },
    list(
      accountScopeHash: string,
    ): Promise<readonly LearningV2CourseSessionCompletedSummaryV1[]> {
      return serialize(async () => {
        const index = parseIndex(
          await storage.getItem(indexKey(accountScopeHash)),
        );
        const rows = [];
        for (const fingerprint of index.completionFingerprints) {
          const raw = await storage.getItem(
            entryKey(accountScopeHash, fingerprint),
          );
          if (raw === null) fail();
          let value: unknown;
          try {
            value = JSON.parse(raw);
          } catch {
            fail();
          }
          const parsed = parseLearningV2CourseSessionCompletedSummaryV1(value);
          if (
            parsed.completionFingerprint !== fingerprint ||
            encodeLearningV2CourseSessionCompletedSummaryV1(parsed) !== raw
          )
            fail();
          rows.push(parsed);
        }
        return Object.freeze(rows);
      });
    },
    remove(accountScopeHash: string, completionFingerprint: string) {
      return serialize(async () => {
        const index = parseIndex(
          await storage.getItem(indexKey(accountScopeHash)),
        );
        if (!index.completionFingerprints.includes(completionFingerprint))
          return;
        await storage.removeItem(
          entryKey(accountScopeHash, completionFingerprint),
        );
        await storage.setItem(
          indexKey(accountScopeHash),
          canonicalJsonV1({
            schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_SPOOL_SCHEMA_V1,
            completionFingerprints: index.completionFingerprints.filter(
              (entry) => entry !== completionFingerprint,
            ),
          }),
        );
      });
    },
  });
}
