// зачем (координатор 22.10, вариант А): пройденные эпизоды Learning V2 и сданные экзамены глав жили только на телефоне.
// Тесты требований: переустановка — прогресс вернулся; смена аккаунта — чужой не виден; пустой телефон не стирает облако;
// слияние двух устройств.
import fs from 'node:fs';
import path from 'node:path';
import {
  createLearningV2CourseLocalProgressStoreV1,
} from '../modules/learning-v2/progress/course_local_progress_v1';
import { learningV2CourseSessionIdV1 } from '../modules/learning-v2/content/course_topology_v1';
import {
  LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1,
  LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1,
  mergeChapterExamSyncRestoreValueV1,
  mergeCourseProgressSyncRestoreValueV1,
  packChapterExamSyncV1,
  unpackChapterExamSyncV1,
  type ChapterExamSyncRecordV1,
} from '../modules/learning-v2/progress/progress_sync_v1';

const scopeA = 'a'.repeat(64);
const scopeB = 'b'.repeat(64);
const phone = () => {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: async (key: string) => rows.get(key) ?? null,
    setItem: async (key: string, value: string) => { rows.set(key, value); },
  };
};
const exam = (examKey: string, over: Partial<ChapterExamSyncRecordV1>): ChapterExamSyncRecordV1 => ({
  examKey, status: 'failed', passedCorrect: null, lastCorrect: 8, attempts: 1, lastFinishedAtMs: 1000, retryAtMs: 1000 + 3_600_000, ...over,
});

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });

describe('Learning V2 progress cloud copy', () => {
  it('a completed episode updates the cloud copy (one number, never decreases)', async () => {
    const p = phone();
    const store = createLearningV2CourseLocalProgressStoreV1(p);
    await store.complete(scopeA, learningV2CourseSessionIdV1(1, 1));
    await store.complete(scopeA, learningV2CourseSessionIdV1(1, 2));
    expect(p.rows.get(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)).toBe('2');
    p.rows.set(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, '7'); // другое устройство ушло дальше
    await store.complete(scopeA, learningV2CourseSessionIdV1(1, 2)); // повтор — копия не уменьшается
    expect(p.rows.get(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)).toBe('7');
  });

  it('reinstall: an empty phone with the restored cloud copy gets its progress back', async () => {
    const p = phone();
    p.rows.set(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, '3'); // восстановлено вместе с документом пользователя
    const loaded = await createLearningV2CourseLocalProgressStoreV1(p).load(scopeA);
    expect(loaded.completedSessionIds).toEqual([1, 2, 3].map((s) => learningV2CourseSessionIdV1(1, s)));
    expect(loaded.currentSessionId).toBe(learningV2CourseSessionIdV1(1, 4));
  });

  it('progress made before sync raises the cloud copy on first load', async () => {
    const p = phone();
    const store = createLearningV2CourseLocalProgressStoreV1(p);
    await store.complete(scopeA, learningV2CourseSessionIdV1(1, 1));
    p.rows.delete(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1); // как у тех, кто прошёл эпизод до этой правки
    await store.load(scopeA);
    expect(p.rows.get(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1)).toBe('1');
  });

  it('an empty phone never erases the cloud', () => {
    expect(mergeCourseProgressSyncRestoreValueV1(null, '5')).toBe('5');
    expect(mergeCourseProgressSyncRestoreValueV1('', '5')).toBe('5');
    expect(mergeCourseProgressSyncRestoreValueV1('garbage', '5')).toBe('5');
    const cloud = packChapterExamSyncV1({ k: exam('k', { status: 'passed', passedCorrect: 11, retryAtMs: null }) });
    expect(unpackChapterExamSyncV1(mergeChapterExamSyncRestoreValueV1(null, cloud)).k).toMatchObject({ status: 'passed', passedCorrect: 11 });
    expect(unpackChapterExamSyncV1(mergeChapterExamSyncRestoreValueV1('{}', cloud)).k?.status).toBe('passed');
  });

  it('two devices merge without losing anything', () => {
    expect(mergeCourseProgressSyncRestoreValueV1('9', '4')).toBe('9');
    expect(mergeCourseProgressSyncRestoreValueV1('4', '9')).toBe('9');
    const phoneSide = packChapterExamSyncV1({
      a: exam('a', { status: 'passed', passedCorrect: 10, retryAtMs: null, attempts: 2, lastFinishedAtMs: 5000 }),
      b: exam('b', { lastCorrect: 6, attempts: 1, lastFinishedAtMs: 7000, retryAtMs: 7000 + 3_600_000 }),
    });
    const cloudSide = packChapterExamSyncV1({
      a: exam('a', { status: 'failed', lastCorrect: 7, attempts: 3, lastFinishedAtMs: 9000, retryAtMs: 9000 + 3_600_000 }),
      c: exam('c', { status: 'passed', passedCorrect: 12, retryAtMs: null }),
    });
    const merged = unpackChapterExamSyncV1(mergeChapterExamSyncRestoreValueV1(phoneSide, cloudSide));
    expect(merged.a).toMatchObject({ status: 'passed', passedCorrect: 10, attempts: 3, retryAtMs: null });
    expect(merged.b).toMatchObject({ status: 'failed', lastCorrect: 6 });
    expect(merged.c).toMatchObject({ status: 'passed', passedCorrect: 12 });
  });

  it('account switch: progress of another account is not visible', async () => {
    const p = phone();
    await createLearningV2CourseLocalProgressStoreV1(p).complete(scopeA, learningV2CourseSessionIdV1(1, 1));
    // смена аккаунта стирает ключи синка (getRuntimeSyncKeys в списке стирания) — облачная копия A уходит вместе с ним
    p.rows.delete(LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1);
    const b = await createLearningV2CourseLocalProgressStoreV1(p).load(scopeB);
    expect(b.completedSessionIds).toEqual([]);
  });

  it('cloud sync wiring: both keys sync, merge by rule, local keys travel and wipe with the account', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    const syncKeys = src.slice(src.indexOf('export const SYNC_KEYS = ['), src.indexOf('export function getRuntimeSyncKeys('));
    expect(syncKeys).toContain('LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1,');
    expect(syncKeys).toContain('LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1,');
    expect(src).toContain('[LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1]: mergeCourseProgressSyncRestoreValueV1,');
    expect(src).toContain('[LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1]: mergeChapterExamSyncRestoreValueV1,');
    const prefixes = src.slice(src.indexOf('const ACCOUNT_LOCAL_KEY_PREFIXES = ['), src.indexOf('export function isAccountLocalJournalStorageKey'));
    expect(prefixes).toContain("'learning-v2:course-local-progress:v1:',");
    expect(prefixes).toContain("'v2:chapter-exam:v1:',");
    // стирание при смене аккаунта: все ключи синка уходят общим списком, отдельного multiRemove нет
    expect(src).toContain('...getRuntimeSyncKeys(),');
    expect(LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1).toBe('learning_v2_chapter_exam_sync_v1');
  });

  it('the full-course cloud copy stays tiny (far below the 1 MB document limit)', () => {
    const all: Record<string, ChapterExamSyncRecordV1> = {};
    for (let lesson = 1; lesson <= 32; lesson += 1) for (let chapter = 1; chapter <= 7; chapter += 1) {
      const key = `en:lesson-${String(lesson).padStart(2, '0')}:chapter-${chapter}`;
      all[key] = exam(key, { status: 'passed', passedCorrect: 12, attempts: 99, lastFinishedAtMs: 1_790_000_000_000, retryAtMs: null });
    }
    const bytes = Buffer.byteLength(packChapterExamSyncV1(all), 'utf8') + Buffer.byteLength('1792', 'utf8');
    expect(bytes).toBeLessThan(16_000);
  });
});

// зачем (координатор 22.10): звёзды эпизодов переживают переустановку — строка цифр по порядку курса, слияние по максимуму.
describe('episode stars cloud copy', () => {
  const {
    LEARNING_V2_SESSION_STARS_SYNC_KEY_V1,
    mergeSessionStarsSyncRestoreValueV1,
    packSessionStarsSyncV1,
    unpackSessionStarsSyncV1,
  } = require('../modules/learning-v2/progress/progress_sync_v1');
  const order = ['s1', 's2', 's3', 's4'];
  it('packs one digit per session and trims the empty tail', () => {
    expect(packSessionStarsSyncV1({ s1: 3, s3: 1 }, order)).toBe('3-1');
    expect(unpackSessionStarsSyncV1('3-1', order)).toEqual({ s1: 3, s3: 1 });
    expect(unpackSessionStarsSyncV1('3x92', order)).toEqual({ s1: 3, s4: 2 });
    expect(unpackSessionStarsSyncV1('3---2', order)).toEqual({ s1: 3 });
  });
  it('best star per session wins; an empty phone never erases the cloud', () => {
    expect(mergeSessionStarsSyncRestoreValueV1('312', '13-3')).toBe('3323');
    expect(mergeSessionStarsSyncRestoreValueV1(null, '13-3')).toBe('13-3');
    expect(mergeSessionStarsSyncRestoreValueV1('', '13-3')).toBe('13-3');
  });
  it('full course is at most one byte per episode', () => {
    expect(packSessionStarsSyncV1({}, order)).toBe('');
    expect(LEARNING_V2_SESSION_STARS_SYNC_KEY_V1).toBe('learning_v2_session_stars_sync_v1');
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    expect(src).toContain('[LEARNING_V2_SESSION_STARS_SYNC_KEY_V1]: mergeSessionStarsSyncRestoreValueV1,');
    expect(src).toContain("'learning-v2:session-star-results:v1:',");
  });
});
