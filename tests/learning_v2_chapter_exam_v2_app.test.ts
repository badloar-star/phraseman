// Экзамен главы v2 в приложении (владелец утвердил прототип 25.10): глава с банком и включённым переключателем — новый экзамен,
// остальные — прежний; провал → пауза час, повтор эпизодов слабых тем снимает паузу сразу; сдача открывает главу как раньше, 40 монет
// — только за первую сдачу. Всё на устройстве: AsyncStorage в памяти, без сети.
import fs from 'node:fs';
import path from 'node:path';

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
let mockFlag: boolean | undefined;
jest.mock('../app/remote_flags', () => ({
  getRemoteBool: () => mockFlag,
  hasRemoteBoolOverride: () => mockFlag !== undefined,
}));
jest.mock('../app/premium_theme_progress', () => ({ notePremiumThemeProgress: () => undefined }));

import {
  __resetChapterExamV2ForTests,
  chapterExamV2BankFor,
  finishChapterExamV2,
  isChapterExamV2EnabledFor,
  noteChapterExamV2EpisodeFinishedV1,
  prepareChapterExamV2,
} from '../app/learning_v2_chapter_exam_v2';

const SCOPE = 'scope-test-1';

beforeEach(() => {
  mockStore.clear();
  mockFlag = undefined;
  __resetChapterExamV2ForTests();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('выбор экзамена', () => {
  it('глава с банком и переключатель по умолчанию — v2; без банка или выключено — прежний', () => {
    expect(isChapterExamV2EnabledFor(1, 2)).toBe(true);
    expect(isChapterExamV2EnabledFor(1, 3)).toBe(false);
    mockFlag = false;
    expect(isChapterExamV2EnabledFor(1, 2)).toBe(false);
  });
});

async function fail(nowMs: number) {
  const prepared = await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2, nowMs });
  if (prepared?.kind !== 'ready') throw new Error('not ready');
  const answers = prepared.items.map((i) => ({ itemId: i.id, grammarPoint: i.grammarPoint, correct: false }));
  return { prepared, out: await finishChapterExamV2({ scope: SCOPE, examKey: prepared.examKey, bank: prepared.bank, items: prepared.items, answers, finishedAtMs: nowMs }) };
}

describe('попытка, провал, повтор, пересдача', () => {
  it('10 заданий первой попытки из банка главы', async () => {
    const prepared = await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2 });
    expect(prepared).toMatchObject({ kind: 'ready', attempt: 1 });
    expect(prepared?.kind === 'ready' ? prepared.items : []).toHaveLength(10);
  });

  it('провал → пауза; повтор всех эпизодов слабых тем снимает паузу сразу; новая попытка — с другими заданиями впереди', async () => {
    const t0 = 1_000_000;
    const { prepared, out } = await fail(t0);
    expect(out.result.passed).toBe(false);
    expect(out.finish.record.retryAtMs).toBe(t0 + 60 * 60 * 1000);
    const cooldown = await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2, nowMs: t0 + 1000 });
    expect(cooldown?.kind).toBe('cooldown');
    const episodes = cooldown?.kind === 'cooldown' ? cooldown.review?.episodes ?? [] : [];
    expect(episodes.length).toBeGreaterThan(0);
    expect(cooldown?.kind === 'cooldown' ? cooldown.review?.weak.length : 0).toBeGreaterThan(0);

    // повторил все эпизоды, кроме последнего, — пауза ещё есть
    for (const e of episodes.slice(0, -1)) await noteChapterExamV2EpisodeFinishedV1(SCOPE, `en:lesson-01:session-${String(e).padStart(2, '0')}`, t0 + 2000);
    expect((await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2, nowMs: t0 + 3000 }))?.kind).toBe('cooldown');
    // эпизод другого урока — не в счёт
    await noteChapterExamV2EpisodeFinishedV1(SCOPE, `en:lesson-02:session-${String(episodes.at(-1)).padStart(2, '0')}`, t0 + 3500);
    expect((await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2, nowMs: t0 + 3600 }))?.kind).toBe('cooldown');
    // последний — пауза снята, попытка 2
    await noteChapterExamV2EpisodeFinishedV1(SCOPE, `en:lesson-01:session-${String(episodes.at(-1)).padStart(2, '0')}`, t0 + 4000);
    const second = await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2, nowMs: t0 + 5000 });
    expect(second).toMatchObject({ kind: 'ready', attempt: 2 });
    // задания прошлой попытки уходят в конец: в банке 16, значит первые 6 новой попытки — не из прошлой
    const previous = new Set(prepared.items.map((i) => i.id));
    const fresh = second?.kind === 'ready' ? second.items.filter((i) => !previous.has(i.id)) : [];
    expect(fresh).toHaveLength(chapterExamV2BankFor(1, 2)!.items.length - 10);
  });

  it('без повтора — через час можно и так', async () => {
    const t0 = 5_000_000;
    await fail(t0);
    expect((await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2, nowMs: t0 + 60 * 60 * 1000 + 1 }))?.kind).toBe('ready');
  });

  it('сдача: 8 из 10 — сдал, первая сдача одна; запись «сдан», повтор очищен', async () => {
    const prepared = await prepareChapterExamV2({ scope: SCOPE, lessonOrdinal: 1, chapterOrdinal: 2 });
    if (prepared?.kind !== 'ready') throw new Error('not ready');
    const answers = prepared.items.map((i, k) => ({ itemId: i.id, grammarPoint: i.grammarPoint, correct: k >= 2 }));
    const first = await finishChapterExamV2({ scope: SCOPE, examKey: prepared.examKey, bank: prepared.bank, items: prepared.items, answers, finishedAtMs: 10 });
    expect(first.result).toMatchObject({ correct: 8, total: 10, passed: true });
    expect(first.finish.firstPass).toBe(true);
    expect(first.finish.record.status).toBe('passed');
    const again = await finishChapterExamV2({ scope: SCOPE, examKey: prepared.examKey, bank: prepared.bank, items: prepared.items, answers, finishedAtMs: 20 });
    expect(again.finish.firstPass).toBe(false);
  });
});

describe('подключение', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('маршрут экзамена выбирает v2 по банку и переключателю; прежний экзамен остаётся', () => {
    const route = read('app/learning-v2/chapter-exam.tsx');
    expect(route).toContain('isChapterExamV2EnabledFor(lessonOrdinal, chapterOrdinal)');
    expect(route).toContain('<ChapterExamV2Run');
    expect(route).toContain('return <ChapterExamRun />;');
  });
  it('плеер отмечает пройденный эпизод для повтора тем; переключатель «Пульта» по умолчанию включён и принимается из Пульта', () => {
    expect(read('app/learning_v2_direct_session_player_v1.tsx')).toContain('noteChapterExamV2EpisodeFinishedV1(accountScopeHash, runSummary.courseSessionId)');
    const flags = read('app/remote_flags.ts');
    expect(flags).toContain('learning_chapter_exam_v2_enabled: true,');
    expect(flags).toMatch(/'learning_cant_speak_enabled', 'learning_chapter_exam_v2_enabled'/);
  });
  it('шторка экзамена показывает 10 вопросов у главы v2', () => {
    expect(read('components/learning-v2/LearningV2ChapterExamSheet.tsx')).toContain('isChapterExamV2EnabledFor(lessonOrdinal, chapterOrdinal) ? CHAPTER_EXAM_V2_QUESTION_COUNT : CHAPTER_EXAM_QUESTION_COUNT_V1');
  });
});
