import {
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  buildLearningV2CourseTopologyV1,
} from "../content/course_topology_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";
import { peekLearningV2DevProgressOverrideV1 } from "./dev_progress_override_v1";
import {
  LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1,
  parseCourseProgressSyncCountV1,
} from "./progress_sync_v1";

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
// зачем (04.10, холодный старт): порядок сессий и индекс строятся при первом обращении, не при импорте —
// модуль в графе корня, а топология курса стоила ~0,95 с на старте (дев).
let orderedSessionIdsCache: readonly string[] | null = null;
let sessionIndexCache: Map<string, number> | null = null;
function orderedSessionIds(): readonly string[] {
  if (!orderedSessionIdsCache) {
    orderedSessionIdsCache = Object.freeze(
      buildLearningV2CourseTopologyV1().lessons.flatMap((lesson) =>
        lesson.sessions.map((session) => session.sessionId),
      ),
    );
  }
  return orderedSessionIdsCache;
}
/** Порядок занятий курса — один кэш на приложение (Ревизор 22.10: хранилище звёзд строило топологию второй раз). */
export function learningV2OrderedCourseSessionIdsV1(): readonly string[] {
  return orderedSessionIds();
}
function sessionIndex(): Map<string, number> {
  if (!sessionIndexCache) {
    sessionIndexCache = new Map(orderedSessionIds().map((sessionId, index) => [sessionId, index]));
  }
  return sessionIndexCache;
}

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
      (sessionId, index) => orderedSessionIds()[index] !== sessionId,
    )
  )
    fail();
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_LOCAL_PROGRESS_SCHEMA_V1,
    accountScopeHash,
    completedSessionIds: Object.freeze([...completedSessionIds]),
    currentSessionId: orderedSessionIds()[completedSessionIds.length] ?? null,
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
        // зачем (Макеты 15.10, съёмка курса): dev lv2progress=N — первые N занятий «пройдены» только в памяти; диск не трогаем
        const devCompleted = peekLearningV2DevProgressOverrideV1();
        if (devCompleted !== null) {
          return build(accountScopeHash, orderedSessionIds().slice(0, Math.min(devCompleted, LEARNING_V2_COURSE_SESSION_COUNT_V1)));
        }
        const raw = await storage.getItem(key(accountScopeHash));
        let parsed: LearningV2CourseLocalProgressV1;
        if (raw === null) {
          parsed = initialLearningV2CourseLocalProgressV1(accountScopeHash);
        } else {
          let value: unknown;
          try {
            value = JSON.parse(raw);
          } catch {
            fail();
          }
          parsed = parseLearningV2CourseLocalProgressV1(value);
          if (
            parsed.accountScopeHash !== accountScopeHash ||
            canonicalJsonV1(parsed) !== raw
          )
            fail();
        }
        // зачем (координатор 22.10, вариант А): после переустановки или на новом телефоне облачная копия
        // (learning_v2_course_progress_sync_v1, восстанавливается вместе с документом пользователя) знает больше —
        // дотягиваем цепочку до неё. Меньше или столько же — ничего не трогаем: пройденное никогда не теряется.
        const synced = Math.min(
          parseCourseProgressSyncCountV1(await storage.getItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)),
          LEARNING_V2_COURSE_SESSION_COUNT_V1,
        );
        if (synced > parsed.completedSessionIds.length) {
          const hydrated = build(accountScopeHash, orderedSessionIds().slice(0, synced));
          await storage.setItem(key(accountScopeHash), canonicalJsonV1(hydrated));
          console.log("[V2-PROGRESS-SYNC] load:hydrated_from_cloud", JSON.stringify({ local: parsed.completedSessionIds.length, cloud: synced, source: "sync_key" })); // guard-ok: откуда пришло
          return hydrated;
        }
        // зачем: прогресс, пройденный до синхронизации (или пока облако не знало), сразу поднимает облачную копию
        if (parsed.completedSessionIds.length > synced) {
          await storage.setItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, String(parsed.completedSessionIds.length));
          console.log("[V2-PROGRESS-SYNC] load:mirrored_local", JSON.stringify({ local: parsed.completedSessionIds.length, cloud: synced })); // guard-ok: что ушло в облачную копию
        }
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
        const index = sessionIndex().get(courseSessionId);
        if (index === undefined) fail();
        if (index < current.completedSessionIds.length) return current;
        if (index !== current.completedSessionIds.length) fail();
        const next = build(accountScopeHash, [
          ...current.completedSessionIds,
          courseSessionId,
        ]);
        await storage.setItem(key(accountScopeHash), canonicalJsonV1(next));
        // зачем (координатор 22.10, вариант А): облачная копия — одно число; уменьшать её нельзя (другое устройство могло уйти дальше).
        try {
          const synced = parseCourseProgressSyncCountV1(await storage.getItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1));
          if (next.completedSessionIds.length > synced) {
            await storage.setItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, String(next.completedSessionIds.length));
            console.log("[V2-PROGRESS-SYNC] complete:mirrored", JSON.stringify({ from: synced, to: next.completedSessionIds.length })); // guard-ok: что ушло в облачную копию
          }
        } catch (error) {
          console.warn("[V2-PROGRESS-SYNC] complete:mirror_failed", JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
        }
        return next;
      });
    },
  });
}
