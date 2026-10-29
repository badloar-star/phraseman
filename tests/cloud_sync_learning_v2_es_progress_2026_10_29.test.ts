// Сторож (координатор 29.10): прогресс испанского курса Learning V2 едет в облачный синк и восстанавливается на новом устройстве теми же
// правилами, что английский (пройденное не теряется), и не смешивается с английским — у него свои ключи с суффиксом «:target:es».
import { LEARNING_V2_ES_PROGRESS_SYNC_KEYS_V1, SYNC_KEYS, __cloudSyncTestHooks } from '../app/cloud_sync';
import { LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, LEARNING_V2_SESSION_STARS_SYNC_KEY_V1 } from '../modules/learning-v2/progress/progress_sync_v1';
import { LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, packCourseMasksV1, parseCourseMasksV1 } from '../modules/learning-v2/progress/course_progress_masks_v1';
import { LEARNING_V2_COURSE_SESSION_COUNT_V1 } from '../modules/learning-v2/content/course_topology_v1';

const es = LEARNING_V2_ES_PROGRESS_SYNC_KEYS_V1;
const merge = (key: string) => {
  const strategy = __cloudSyncTestHooks.restoreMergeStrategyForKey(key);
  if (!strategy) throw new Error(`no merge strategy for ${key}`);
  return strategy;
};

test('the three Spanish keys are synced, scoped to es and distinct from the English ones', () => {
  expect(es).toEqual({
    courseProgress: `${LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1}:target:es`,
    masks: `${LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1}:target:es`,
    stars: `${LEARNING_V2_SESSION_STARS_SYNC_KEY_V1}:target:es`,
  });
  const keys = SYNC_KEYS as readonly string[];
  for (const key of [es.courseProgress, es.masks, es.stars]) expect(keys).toContain(key);
  for (const key of [LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, LEARNING_V2_SESSION_STARS_SYNC_KEY_V1]) {
    expect(keys).toContain(key);
  }
});

test('a new device restores Spanish progress without losing what either side passed', () => {
  // новое устройство: локально пусто — облако восстанавливается целиком
  expect(merge(es.courseProgress)(null, '12')).toBe('12');
  // число подряд пройденных — максимум: ни одна сторона не уменьшает другую
  expect(merge(es.courseProgress)('20', '12')).toBe('20');
  expect(merge(es.courseProgress)('5', '12')).toBe('12');

  // маски — побитовое ИЛИ: пройденное на одном устройстве и на другом складывается
  const local = packCourseMasksV1({ completed: new Set([0, 1]), opened: new Set([2]) });
  const cloud = packCourseMasksV1({ completed: new Set([5]), opened: new Set([6]) });
  const merged = parseCourseMasksV1(merge(es.masks)(local, cloud), LEARNING_V2_COURSE_SESSION_COUNT_V1);
  expect([...merged.completed].sort((a, b) => a - b)).toEqual([0, 1, 5]);
  expect([...merged.opened].sort((a, b) => a - b)).toEqual(expect.arrayContaining([2, 6]));

  // звёзды — лучшая по каждому занятию
  expect(merge(es.stars)('3102', '1230')).toBe('3232');
});

test('Spanish and English use separate keys, so restoring one never touches the other', () => {
  // правило слияния есть у каждого ключа отдельно; восстановление пишет по ключу, поэтому es и en не пересекаются
  expect(es.courseProgress).not.toBe(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1);
  expect(merge(es.courseProgress)).not.toBe(undefined);
  expect(merge(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)).not.toBe(undefined);
  expect(merge(es.courseProgress)('3', '40')).toBe('40');
  expect(merge(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)('3', '7')).toBe('7');
});
