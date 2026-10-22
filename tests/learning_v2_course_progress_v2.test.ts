// ЗАМОК ВЛАДЕЛЬЦА 21.10 (№8/№10, docs/work/OWNER_DECISIONS_2026-10-21.md стр. 87): «пропущенные занятия — ПРОСТО ОТКРЫТЫ
// (не засчитаны пройденными, без звёзд — проходить можно)». Реестр docs/work/OWNER_LOCKS.md. Ослабить — только по новому слову
// владельца. Прогресс v2 (координатор 22.10, план раздела 8): маски пройденного и открытого поверх старой цепочки.
// Сторожа: открыто ≠ пройдено; прогресс никогда не теряется (слияние — только ИЛИ); совместимость в обе стороны со старыми
// сборками (старая цепочка и старое облачное число пишутся дальше и всегда валидны).
import {
  createLearningV2CourseLocalProgressStoreV1,
  learningV2OrderedCourseSessionIdsV1,
  parseLearningV2CourseLocalProgressV1,
  LEARNING_V2_COURSE_LOCAL_PROGRESS_STORAGE_PREFIX_V1,
} from '../modules/learning-v2/progress/course_local_progress_v1';
import {
  LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1,
  contiguousCompletedLengthV1,
  courseMasksFromChainCountV1,
  decodeCourseMaskV1,
  encodeCourseMaskV1,
  mergeCourseMasksRestoreValueV1,
  parseCourseMasksV1,
} from '../modules/learning-v2/progress/course_progress_masks_v1';
import { LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1 } from '../modules/learning-v2/progress/progress_sync_v1';
import { learningV2CourseSessionIdV1 as sid, LEARNING_V2_COURSE_SESSION_COUNT_V1 as TOTAL } from '../modules/learning-v2/content/course_topology_v1';

const scope = 'b'.repeat(64);
const lessonIds = (lesson: number) => Array.from({ length: 56 }, (_x, i) => sid(lesson, i + 1));

function memory() {
  const rows = new Map<string, string>();
  return { rows, storage: { getItem: async (k: string) => rows.get(k) ?? null, setItem: async (k: string, v: string) => { rows.set(k, v); } } };
}

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });

describe('progress v2: open ≠ completed (ЗАМОК ВЛАДЕЛЬЦА)', () => {
  it('opened sessions are playable but not completed; current is the first not completed and not opened', async () => {
    const { storage } = memory();
    const store = createLearningV2CourseLocalProgressStoreV1(storage);
    const view = await store.open(scope, [...lessonIds(1), ...lessonIds(2), ...lessonIds(3)], 'placement_test');
    expect(view.completedSessionIds).toEqual([]);
    expect(view.openedSessionIds).toHaveLength(56 * 3);
    expect(view.currentSessionId).toBe(sid(4, 1));
    // эпизод 1 урока 4 (текущий) и открытый эпизод урока 2 проходятся и сохраняются
    expect((await store.complete(scope, sid(4, 1))).completedSessionIds).toEqual([sid(4, 1)]);
    const after = await store.complete(scope, sid(2, 5));
    expect(after.completedSessionIds).toEqual([sid(2, 5), sid(4, 1)]);
    expect(after.openedSessionIds).not.toContain(sid(2, 5));
    expect(after.currentSessionId).toBe(sid(4, 2));
    // не открытое и не текущее — отказ, как раньше
    await expect(store.complete(scope, sid(5, 3))).rejects.toThrow('learning_v2_course_local_progress_invalid');
  });

  it('opening never marks or unmarks completed sessions', async () => {
    const { storage } = memory();
    const store = createLearningV2CourseLocalProgressStoreV1(storage);
    await store.complete(scope, sid(1, 1));
    const view = await store.open(scope, [sid(1, 1), sid(1, 2)], 'chapter_exam');
    expect(view.completedSessionIds).toEqual([sid(1, 1)]);
    expect(view.openedSessionIds).toEqual([sid(1, 2)]);
  });
});

describe('progress v2: map and season see «open» (ЗАМОК ВЛАДЕЛЬЦА)', () => {
  it('opened sessions are «open» on the map — not completed, not locked; season card is playable', () => {
    const { buildLearningV2CourseAccordionMapFromPreparedProgressV1, prepareLearningV2CourseAccordionProgressV1 } =
      require('../modules/learning-v2/map/course_accordion_map_model_v1') as typeof import('../modules/learning-v2/map/course_accordion_map_model_v1');
    const { seasonCardState } = require('../components/learning-v2/season/season_course_model') as typeof import('../components/learning-v2/season/season_course_model');
    const preparedProgress = prepareLearningV2CourseAccordionProgressV1({
      completedSessionIds: [sid(1, 1)],
      currentSessionId: sid(2, 1),
      openedSessionIds: [sid(1, 1), sid(1, 2), sid(1, 3)],
    });
    const rows = buildLearningV2CourseAccordionMapFromPreparedProgressV1({ projectionScopeKey: 'open-test', expandedLessonOrdinal: 1, preparedProgress }).rows;
    const state = (s: number) => (rows.find((r) => r.kind === 'session' && r.lessonOrdinal === 1 && r.sessionOrdinal === s) as { state: string }).state;
    expect(state(1)).toBe('completed');
    expect(state(2)).toBe('open');
    expect(state(3)).toBe('open');
    expect(state(4)).toBe('locked');
    expect(seasonCardState('open')).toBe('open');
  });
});

describe('progress v2: backward compatibility', () => {
  it('old data (chain + old cloud number) reads exactly as before', async () => {
    const { storage, rows } = memory();
    rows.set(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, '5');
    const view = await createLearningV2CourseLocalProgressStoreV1(storage).load(scope);
    expect(view.completedSessionIds).toEqual(learningV2OrderedCourseSessionIdsV1().slice(0, 5));
    expect(view.currentSessionId).toBe(learningV2OrderedCourseSessionIdsV1()[5]);
    expect(view.openedSessionIds).toEqual([]);
    expect(view.chainCompletedCount).toBe(5);
  });

  it('old number → mask without loss', () => {
    const masks = courseMasksFromChainCountV1(37, TOTAL);
    expect(contiguousCompletedLengthV1(masks.completed)).toBe(37);
    expect(masks.completed.size).toBe(37);
  });

  it('an old build reading new data: the chain record still parses and the old number never goes down', async () => {
    const { storage, rows } = memory();
    const store = createLearningV2CourseLocalProgressStoreV1(storage);
    await store.complete(scope, sid(1, 1));
    await store.complete(scope, sid(1, 2));
    await store.open(scope, lessonIds(2), 'chapter_exam');
    await store.complete(scope, sid(2, 3));
    const chainRaw = rows.get(`${LEARNING_V2_COURSE_LOCAL_PROGRESS_STORAGE_PREFIX_V1}${scope}`)!;
    const chain = parseLearningV2CourseLocalProgressV1(JSON.parse(chainRaw));
    expect(chain.completedSessionIds).toEqual([sid(1, 1), sid(1, 2)]);
    expect(rows.get(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)).toBe('2');
  });

  it('out-of-order completions are absorbed into the chain once it becomes contiguous', async () => {
    const { storage, rows } = memory();
    const store = createLearningV2CourseLocalProgressStoreV1(storage);
    await store.open(scope, [sid(1, 2), sid(1, 3)], 'chapter_exam');
    await store.complete(scope, sid(1, 2));
    await store.complete(scope, sid(1, 3));
    const view = await store.complete(scope, sid(1, 1));
    expect(view.chainCompletedCount).toBe(3);
    expect(rows.get(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)).toBe('3');
  });
});

describe('progress v2: progress is never lost', () => {
  it('restore merge is bitwise OR: nothing from either side disappears', () => {
    const a = JSON.stringify({ c: encodeCourseMaskV1([0, 5, 9]), o: encodeCourseMaskV1([20]) });
    const b = JSON.stringify({ c: encodeCourseMaskV1([1, 5]), o: encodeCourseMaskV1([21, 1791]) });
    const merged = parseCourseMasksV1(mergeCourseMasksRestoreValueV1(a, b, TOTAL), TOTAL);
    expect([...merged.completed].sort((x, y) => x - y)).toEqual([0, 1, 5, 9]);
    expect([...merged.opened].sort((x, y) => x - y)).toEqual([20, 21, 1791]);
    expect(parseCourseMasksV1(mergeCourseMasksRestoreValueV1('{broken', b, TOTAL), TOTAL).completed.size).toBe(2);
  });

  it('mask round-trips and fits the cloud size budget (≤ 1792 chars)', () => {
    const all = Array.from({ length: TOTAL }, (_x, i) => i);
    const hex = encodeCourseMaskV1(all);
    expect(hex.length).toBeLessThanOrEqual(1792);
    expect(decodeCourseMaskV1(hex, TOTAL).size).toBe(TOTAL);
  });

  it('cloud masks restored on a fresh phone come back into the view', async () => {
    const { storage, rows } = memory();
    rows.set(LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, JSON.stringify({ c: encodeCourseMaskV1([60]), o: encodeCourseMaskV1([56, 57]) }));
    const view = await createLearningV2CourseLocalProgressStoreV1(storage).load(scope);
    const ids = learningV2OrderedCourseSessionIdsV1();
    expect(view.completedSessionIds).toEqual([ids[60]]);
    expect(view.openedSessionIds).toEqual([ids[56], ids[57]]);
  });
});
