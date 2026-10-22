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
  LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1,
  contiguousCompletedLengthV1,
  courseCurrentIndexV1,
  packCourseMasksV1,
  parseCourseMasksV1,
  unionCourseMasksV1,
  type CourseProgressMasksV1,
} from "./course_progress_masks_v1";
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

/**
 * Вид прогресса для экранов: пройденное (цепочка ∪ маска), открытое и текущее.
 * зачем (владелец 21.10 №8/№10, стр. 87; координатор 22.10, план раздела 8): пропущенные после экзамена и входного
 * теста занятия «ПРОСТО ОТКРЫТЫ» — не пройдены, без звёзд, но играть можно; прохождение открытого сохраняется.
 * Без открытого и без прохождений не по порядку вид совпадает с прежней цепочкой один в один.
 */
export type LearningV2CourseProgressViewV2 = LearningV2CourseLocalProgressV1 & Readonly<{
  /** Открыты экзаменом или входным тестом и ещё не пройдены. */
  openedSessionIds: readonly string[];
  /** Длина непрерывной цепочки — старая запись на диске и старое облачное число (старые сборки читают только её). */
  chainCompletedCount: number;
}>;

export const LEARNING_V2_COURSE_LOCAL_MASKS_STORAGE_PREFIX_V1 =
  "learning-v2:course-local-progress:masks:v1:" as const;

const EMPTY_MASKS: CourseProgressMasksV1 = Object.freeze({ completed: new Set<number>(), opened: new Set<number>() });

function masksKey(accountScopeHash: string): string {
  if (!HASH_RE.test(accountScopeHash)) fail();
  return `${LEARNING_V2_COURSE_LOCAL_MASKS_STORAGE_PREFIX_V1}${accountScopeHash}`;
}

function viewOf(chainRecord: LearningV2CourseLocalProgressV1, masks: CourseProgressMasksV1): LearningV2CourseProgressViewV2 {
  const ids = orderedSessionIds();
  const completed = new Set<number>(masks.completed);
  chainRecord.completedSessionIds.forEach((_id, index) => completed.add(index));
  const opened = new Set<number>([...masks.opened].filter((index) => !completed.has(index)));
  const current = courseCurrentIndexV1({ completed, opened }, LEARNING_V2_COURSE_SESSION_COUNT_V1);
  const byOrder = (set: ReadonlySet<number>) => Object.freeze([...set].sort((a, b) => a - b).map((index) => ids[index]));
  return Object.freeze({
    ...chainRecord,
    completedSessionIds: byOrder(completed),
    currentSessionId: current === null ? null : ids[current],
    openedSessionIds: byOrder(opened),
    chainCompletedCount: chainRecord.completedSessionIds.length,
  });
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
  const readChain = async (accountScopeHash: string): Promise<LearningV2CourseLocalProgressV1> => {
    const raw = await storage.getItem(key(accountScopeHash));
    if (raw === null) return initialLearningV2CourseLocalProgressV1(accountScopeHash);
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      fail();
    }
    const parsed = parseLearningV2CourseLocalProgressV1(value);
    if (parsed.accountScopeHash !== accountScopeHash || canonicalJsonV1(parsed) !== raw) fail();
    return parsed;
  };
  /** Маски с телефона и восстановленные из облака — объединение (ничего не теряется). */
  const readMasks = async (accountScopeHash: string): Promise<CourseProgressMasksV1> => unionCourseMasksV1(
    parseCourseMasksV1(await storage.getItem(masksKey(accountScopeHash)), LEARNING_V2_COURSE_SESSION_COUNT_V1),
    parseCourseMasksV1(await storage.getItem(LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1), LEARNING_V2_COURSE_SESSION_COUNT_V1),
  );
  const writeMasks = async (accountScopeHash: string, masks: CourseProgressMasksV1): Promise<void> => {
    await storage.setItem(masksKey(accountScopeHash), packCourseMasksV1(masks));
    // облачная копия — только растёт: ИЛИ с тем, что уже лежит (другое устройство могло открыть или пройти больше)
    try {
      const cloud = parseCourseMasksV1(await storage.getItem(LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1), LEARNING_V2_COURSE_SESSION_COUNT_V1);
      if (cloud.foreignLayout) {
        console.warn("[LV2-PROGRESS] masks:cloud_foreign_layout_not_overwritten", JSON.stringify({ accountScopeHash: accountScopeHash.slice(0, 8) })); // guard-ok: ранний выход с причиной — чужую раскладку не затираем
        return;
      }
      await storage.setItem(LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, packCourseMasksV1(unionCourseMasksV1(cloud, masks)));
    } catch (error) {
      console.warn("[LV2-PROGRESS] masks:mirror_failed", JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину; телефон уже записал
    }
  };
  // зачем (координатор 22.10, вариант А): облачная копия — одно число; уменьшать её нельзя (другое устройство могло уйти дальше).
  const mirrorCount = async (length: number): Promise<void> => {
    try {
      const synced = parseCourseProgressSyncCountV1(await storage.getItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1));
      if (length > synced) {
        await storage.setItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, String(length));
        console.log("[V2-PROGRESS-SYNC] complete:mirrored", JSON.stringify({ from: synced, to: length })); // guard-ok: что ушло в облачную копию
      }
    } catch (error) {
      console.warn("[V2-PROGRESS-SYNC] complete:mirror_failed", JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    }
  };
  /** Если маска сделала начало непрерывным — дотягиваем старую цепочку и старое число (старые сборки видят максимум). */
  const absorb = async (accountScopeHash: string, chainRecord: LearningV2CourseLocalProgressV1, masks: CourseProgressMasksV1): Promise<LearningV2CourseLocalProgressV1> => {
    const completed = new Set<number>(masks.completed);
    chainRecord.completedSessionIds.forEach((_id, index) => completed.add(index));
    const length = contiguousCompletedLengthV1(completed);
    if (length <= chainRecord.completedSessionIds.length) return chainRecord;
    const next = build(accountScopeHash, orderedSessionIds().slice(0, length));
    await storage.setItem(key(accountScopeHash), canonicalJsonV1(next));
    await mirrorCount(next.completedSessionIds.length);
    console.log("[LV2-PROGRESS] chain:absorbed", JSON.stringify({ from: chainRecord.completedSessionIds.length, to: length })); // guard-ok: цепочка дотянута из маски
    return next;
  };
  return Object.freeze({
    load(accountScopeHash: string) {
      return serialize(async (): Promise<LearningV2CourseProgressViewV2> => {
        // зачем (Макеты 15.10, съёмка курса): dev lv2progress=N — первые N занятий «пройдены» только в памяти; диск не трогаем
        const devCompleted = peekLearningV2DevProgressOverrideV1();
        if (devCompleted !== null) {
          return viewOf(build(accountScopeHash, orderedSessionIds().slice(0, Math.min(devCompleted, LEARNING_V2_COURSE_SESSION_COUNT_V1))), EMPTY_MASKS);
        }
        let parsed = await readChain(accountScopeHash);
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
          parsed = hydrated;
        } else if (parsed.completedSessionIds.length > synced) {
          // зачем: прогресс, пройденный до синхронизации (или пока облако не знало), сразу поднимает облачную копию
          await storage.setItem(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, String(parsed.completedSessionIds.length));
          console.log("[V2-PROGRESS-SYNC] load:mirrored_local", JSON.stringify({ local: parsed.completedSessionIds.length, cloud: synced })); // guard-ok: что ушло в облачную копию
        }
        const masks = await readMasks(accountScopeHash);
        parsed = await absorb(accountScopeHash, parsed, masks);
        return viewOf(parsed, masks);
      });
    },
    complete(accountScopeHash: string, courseSessionId: string) {
      return serialize(async (): Promise<LearningV2CourseProgressViewV2> => {
        let current = await readChain(accountScopeHash);
        const index = sessionIndex().get(courseSessionId);
        if (index === undefined) fail();
        let masks = await readMasks(accountScopeHash);
        if (index < current.completedSessionIds.length || masks.completed.has(index)) return viewOf(current, masks);
        if (index === current.completedSessionIds.length) {
          current = build(accountScopeHash, [...current.completedSessionIds, courseSessionId]);
          await storage.setItem(key(accountScopeHash), canonicalJsonV1(current));
          await mirrorCount(current.completedSessionIds.length);
        } else {
          // зачем (план раздела 8): пройти можно открытое занятие или текущее (первое не пройденное и не открытое) —
          // например, эпизод 1 урока N после входного теста; прохождение ложится в маску, цепочка не рвётся
          const before = viewOf(current, masks);
          const currentIndex = before.currentSessionId === null ? null : sessionIndex().get(before.currentSessionId) ?? null;
          if (!masks.opened.has(index) && index !== currentIndex) {
            console.warn("[LV2-PROGRESS] complete:rejected", JSON.stringify({ courseSessionId, index, chain: current.completedSessionIds.length, currentIndex, opened: masks.opened.size, reason: "not_next_not_opened" })); // guard-ok: ранний выход с причиной
            fail();
          }
          masks = unionCourseMasksV1(masks, { completed: new Set([index]), opened: new Set<number>() });
          await writeMasks(accountScopeHash, masks);
          console.log("[LV2-PROGRESS] complete:out_of_chain", JSON.stringify({ courseSessionId, index, chain: current.completedSessionIds.length, wasOpened: before.openedSessionIds.includes(courseSessionId) })); // guard-ok: куда легло прохождение
        }
        current = await absorb(accountScopeHash, current, masks);
        return viewOf(current, masks);
      });
    },
    /** Открыть занятия (экзамен главы, входной тест): не пройдены, без звёзд, играть можно. Пройденное не трогается. */
    open(accountScopeHash: string, courseSessionIds: readonly string[], source: string) {
      return serialize(async (): Promise<LearningV2CourseProgressViewV2> => {
        const current = await readChain(accountScopeHash);
        let masks = await readMasks(accountScopeHash);
        const before = viewOf(current, masks);
        const done = new Set(before.completedSessionIds);
        const fresh = courseSessionIds
          .map((id) => sessionIndex().get(id))
          .filter((index): index is number => index !== undefined && !done.has(orderedSessionIds()[index]) && !masks.opened.has(index));
        console.log("[LV2-PROGRESS] open", JSON.stringify({ source, requested: courseSessionIds.length, fresh: fresh.length, chain: current.completedSessionIds.length })); // guard-ok: вход и решение
        if (fresh.length === 0) return before;
        masks = unionCourseMasksV1(masks, { completed: new Set<number>(), opened: new Set(fresh) });
        await writeMasks(accountScopeHash, masks);
        return viewOf(current, masks);
      });
    },
  });
}
