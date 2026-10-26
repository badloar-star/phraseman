// Жалоба №17 (25.10): «главу 1 прошла без ошибок, но дальше не пустили, урок 8 не засчитан». Главы 1–3 урока 1 теперь сдаются по
// экзамену v2 — сдача обязана засчитывать главу ровно как прежний экзамен (глава 4): первый эпизод следующей главы становится
// текущим, восьмой эпизод главы ОТКРЫТ (не засчитан — «открыто ≠ пройдено», замок владельца 22.10). Ветки: первая сдача, после
// пересдачи, второе устройство (облачные копии масок и экзаменов). Сети нет ни в одной ветке — всё на устройстве.
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
    setItem: (k: string, v: string) => { mockStore.set(k, v); return Promise.resolve(); },
    multiSet: (pairs: [string, string][]) => { for (const [k, v] of pairs) mockStore.set(k, v); return Promise.resolve(); },
    multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, mockStore.get(k) ?? null])),
    removeItem: (k: string) => { mockStore.delete(k); return Promise.resolve(); },
    multiRemove: (keys: string[]) => { for (const k of keys) mockStore.delete(k); return Promise.resolve(); },
  },
}));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));
// экзамен v2 включён удалённо (по умолчанию выкл до склейки с макетом, d34be664d) — здесь проверяется зачёт главы, когда он включён
jest.mock('../app/remote_flags', () => ({ getRemoteBool: () => true, hasRemoteBoolOverride: () => true }));
jest.mock('../app/premium_theme_progress', () => ({ notePremiumThemeProgress: () => undefined }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { learningV2CourseSessionIdV1 as id } from '../modules/learning-v2/content/course_topology_v1';
import { createLearningV2CourseLocalProgressStoreV1 } from '../modules/learning-v2/progress/course_local_progress_v1';
import { LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1 } from '../modules/learning-v2/progress/course_progress_masks_v1';
import { LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1, LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, unpackChapterExamSyncV1 } from '../modules/learning-v2/progress/progress_sync_v1';
import { finishLearningV2ChapterExamV1 } from '../app/learning_v2_chapter_exam_v1';
import { __resetChapterExamV2ForTests, chapterExamV2BankFor, finishChapterExamV2, isChapterExamV2EnabledFor } from '../app/learning_v2_chapter_exam_v2';

const SCOPE = 'c'.repeat(64);
const store = () => createLearningV2CourseLocalProgressStoreV1(AsyncStorage);

async function completeEpisodes(from: number, to: number): Promise<void> {
  for (let n = from; n <= to; n += 1) await store().complete(SCOPE, id(1, n));
}

async function finishV2(chapter: number, correctCount: number, atMs: number) {
  const bank = chapterExamV2BankFor(1, chapter)!;
  const items = bank.items.slice(0, 10);
  const answers = items.map((i, k) => ({ itemId: i.id, grammarPoint: i.grammarPoint, correct: k < correctCount }));
  return finishChapterExamV2({ scope: SCOPE, examKey: `en:lesson-01:chapter-${chapter}`, bank, items, answers, finishedAtMs: atMs });
}

let warns: string[] = [];
beforeEach(() => {
  mockStore.clear();
  __resetChapterExamV2ForTests();
  warns = [];
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { warns.push(a.map(String).join(' ')); });
});
afterEach(() => jest.restoreAllMocks());

describe('жалоба №17: сдача экзамена засчитывает главу одинаково в v2 и прежнем экзамене', () => {
  it('выбор экзамена: главы 1–3 — v2, глава 4 — прежний', () => {
    expect([1, 2, 3, 4].map((c) => isChapterExamV2EnabledFor(1, c))).toEqual([true, true, true, false]);
  });

  it('v2, глава 1 с первого раза: текущий — эпизод 9, эпизод 8 открыт и не засчитан', async () => {
    await completeEpisodes(1, 7);
    const out = await finishV2(1, 10, 1_000);
    expect(out.result.passed).toBe(true);
    expect(out.finish.startSessionId).toBe(id(1, 9));
    const view = await store().load(SCOPE);
    expect(view.currentSessionId).toBe(id(1, 9));
    expect(view.openedSessionIds).toContain(id(1, 8));
    expect(view.completedSessionIds).not.toContain(id(1, 8));
    expect(warns.filter((w) => w.includes('[EXAM-V2-CREDIT]'))).toEqual([]); // nextReachable — журнал без тревоги
  });

  it('прежний экзамен, глава 4: тот же итог — текущий эпизод 33, эпизод 32 открыт и не засчитан', async () => {
    await completeEpisodes(1, 31);
    const out = await finishLearningV2ChapterExamV1({
      accountScopeHash: SCOPE, progressAccountScopeHash: SCOPE, examKey: 'en:lesson-01:chapter-4', lessonOrdinal: 1, chapterOrdinal: 4,
      answers: Array.from({ length: 12 }, (_, k) => ({ interactionId: `q${k}`, correct: true })), finishedAtMs: 1_000,
    });
    expect(out.result.passed).toBe(true);
    expect(out.startSessionId).toBe(id(1, 33));
    const view = await store().load(SCOPE);
    expect(view.currentSessionId).toBe(id(1, 33));
    expect(view.openedSessionIds).toContain(id(1, 32));
    expect(view.completedSessionIds).not.toContain(id(1, 32));
  });

  it('v2 после пересдачи: провал ничего не открывает, сдача — тот же итог', async () => {
    await completeEpisodes(1, 7);
    const failed = await finishV2(1, 3, 1_000);
    expect(failed.result.passed).toBe(false);
    expect((await store().load(SCOPE)).currentSessionId).toBe(id(1, 8));
    const passed = await finishV2(1, 9, 1_000 + 2 * 60 * 60 * 1000);
    expect(passed.result.passed).toBe(true);
    const view = await store().load(SCOPE);
    expect(view.currentSessionId).toBe(id(1, 9));
    expect(view.openedSessionIds).toContain(id(1, 8));
  });

  it('второе устройство: по облачным копиям текущий — эпизод 9, экзамен сдан; ни одного чтения сети', async () => {
    await completeEpisodes(1, 7);
    await finishV2(1, 10, 1_000);
    // облако — только три ключа копии, которые и так едут пачкой синхронизации
    const otherPhone = new Map<string, string>();
    for (const key of [LEARNING_V2_COURSE_MASKS_SYNC_KEY_V1, LEARNING_V2_COURSE_PROGRESS_SYNC_KEY_V1, LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1]) {
      const value = mockStore.get(key);
      expect({ key, present: typeof value === 'string' }).toEqual({ key, present: true });
      otherPhone.set(key, value as string);
    }
    const phoneB = createLearningV2CourseLocalProgressStoreV1({
      getItem: async (k: string) => otherPhone.get(k) ?? null,
      setItem: async (k: string, v: string) => { otherPhone.set(k, v); },
    });
    const view = await phoneB.load(SCOPE);
    expect(view.currentSessionId).toBe(id(1, 9));
    expect(view.openedSessionIds).toContain(id(1, 8));
    expect(unpackChapterExamSyncV1(otherPhone.get(LEARNING_V2_CHAPTER_EXAM_SYNC_KEY_V1))['en:lesson-01:chapter-1']?.status).toBe('passed');
  });
});
