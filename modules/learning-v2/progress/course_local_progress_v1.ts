import {
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  buildLearningV2CourseTopologyV1,
} from "../content/course_topology_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";

export const LEARNING_V2_COURSE_LOCAL_PROGRESS_SCHEMA_V1 =
  "learning-v2-course-local-progress.v1" as const;
export const LEARNING_V2_COURSE_LOCAL_PROGRESS_STORAGE_PREFIX_V1 =
  "learning-v2:course-local-progress:v1:" as const;

export type LearningV2CourseLocalProgressV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_LOCAL_PROGRESS_SCHEMA_V1;
  accountScopeHash: string;
  completedSessionIds: readonly string[];
  currentSessionId: string | null;
  revision: number;
  progressionAuthority: "local_completed_session_sequence_only";
  serverUnlockAuthority: "none";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
  progressFingerprint: string;
}>;

export interface LearningV2CourseLocalProgressStorageV1 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const orderedSessionIds = Object.freeze(
  buildLearningV2CourseTopologyV1().lessons.flatMap((lesson) =>
    lesson.sessions.map((session) => session.sessionId),
  ),
);
const sessionIndex = new Map(
  orderedSessionIds.map((sessionId, index) => [sessionId, index]),
);

function fail(): never {
  throw new Error("learning_v2_course_local_progress_invalid");
}

function key(accountScopeHash: string): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return `${LEARNING_V2_COURSE_LOCAL_PROGRESS_STORAGE_PREFIX_V1}${accountScopeHash}`;
}

function build(
  accountScopeHash: string,
  completedSessionIds: readonly string[],
): LearningV2CourseLocalProgressV1 {
  if (
    !HASH_RE.test(accountScopeHash) ||
    completedSessionIds.length > LEARNING_V2_COURSE_SESSION_COUNT_V1 ||
    completedSessionIds.some(
      (sessionId, index) => orderedSessionIds[index] !== sessionId,
    )
  )
    fail();
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_LOCAL_PROGRESS_SCHEMA_V1,
    accountScopeHash,
    completedSessionIds: Object.freeze([...completedSessionIds]),
    currentSessionId: orderedSessionIds[completedSessionIds.length] ?? null,
    revision: completedSessionIds.length,
    progressionAuthority: "local_completed_session_sequence_only" as const,
    serverUnlockAuthority: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    ...body,
    progressFingerprint: hashCanonicalBody(body),
  });
}

export function initialLearningV2CourseLocalProgressV1(
  accountScopeHash: string,
): LearningV2CourseLocalProgressV1 {
  return build(accountScopeHash, []);
}

export function parseLearningV2CourseLocalProgressV1(
  value: unknown,
): LearningV2CourseLocalProgressV1 {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).sort().join("|") !==
      "accountScopeHash|completedSessionIds|currentSessionId|evidenceAuthority|masteryAuthority|progressFingerprint|progressionAuthority|releaseAuthority|revision|schemaVersion|serverUnlockAuthority|walletAuthority"
  )
    fail();
  const row = value as LearningV2CourseLocalProgressV1;
  if (
    row.schemaVersion !== LEARNING_V2_COURSE_LOCAL_PROGRESS_SCHEMA_V1 ||
    !Array.isArray(row.completedSessionIds) ||
    row.progressionAuthority !== "local_completed_session_sequence_only" ||
    row.serverUnlockAuthority !== "none" ||
    row.walletAuthority !== "none" ||
    row.masteryAuthority !== "none" ||
    row.evidenceAuthority !== "none" ||
    row.releaseAuthority !== false
  )
    fail();
  const result = build(row.accountScopeHash, row.completedSessionIds);
  if (
    row.currentSessionId !== result.currentSessionId ||
    row.revision !== result.revision ||
    row.progressFingerprint !== result.progressFingerprint
  )
    fail();
  return result;
}

export function createLearningV2CourseLocalProgressStoreV1(
  storage: LearningV2CourseLocalProgressStorageV1,
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
    load(accountScopeHash: string) {
      return serialize(async () => {
        const raw = await storage.getItem(key(accountScopeHash));
        if (raw === null)
          return initialLearningV2CourseLocalProgressV1(accountScopeHash);
        let value: unknown;
        try {
          value = JSON.parse(raw);
        } catch {
          fail();
        }
        const parsed = parseLearningV2CourseLocalProgressV1(value);
        if (
          parsed.accountScopeHash !== accountScopeHash ||
          canonicalJsonV1(parsed) !== raw
        )
          fail();
        return parsed;
      });
    },
    complete(accountScopeHash: string, courseSessionId: string) {
      return serialize(async () => {
        const raw = await storage.getItem(key(accountScopeHash));
        let current: LearningV2CourseLocalProgressV1;
        if (raw === null) {
          current = initialLearningV2CourseLocalProgressV1(accountScopeHash);
        } else {
          try {
            current = parseLearningV2CourseLocalProgressV1(JSON.parse(raw));
          } catch {
            fail();
          }
        }
        if (current.accountScopeHash !== accountScopeHash) fail();
        const index = sessionIndex.get(courseSessionId);
        if (index === undefined) fail();
        if (index < current.completedSessionIds.length) return current;
        if (index !== current.completedSessionIds.length) fail();
        const next = build(accountScopeHash, [
          ...current.completedSessionIds,
          courseSessionId,
        ]);
        await storage.setItem(key(accountScopeHash), canonicalJsonV1(next));
        return next;
      });
    },
  });
}
