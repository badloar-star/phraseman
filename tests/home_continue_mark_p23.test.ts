// зачем (Ревизор P23, координатор 15.10): карточка «Продолжить» на Главной показывает то, что свежее — старый урок или занятие V2;
// метки только локальные; смена аккаунта их чистит; запуск V2 на вкладке «Уроки» пишет метку, старые уроки — время.
import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, mockStore.get(k) ?? null])),
    setItem: (k: string, v: string) => { mockStore.set(k, v); return Promise.resolve(); },
    multiRemove: (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); return Promise.resolve(); },
  },
}));
let mockOwnerReset: (() => void) | null = null;
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (_n: string, reset: () => void) => { mockOwnerReset = reset; } }));

import {
  loadHomeContinueMarks,
  peekHomeContinueMarks,
  pickHomeContinue,
  recordHomeContinueLegacy,
  recordHomeContinueV2,
  refreshHomeContinueV2Progress,
  resetHomeContinueMarksForTests,
  type HomeContinueV2Mark,
} from '../app/home_continue_mark';

const v2 = (atMs: number): HomeContinueV2Mark => ({ lessonOrdinal: 1, sessionOrdinal: 4, sessionId: 'lesson-01:session:04', done: 3, total: 11, route: { id: 'lesson-01:session:04' }, atMs });
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('P23 · выбор карточки «Продолжить»', () => {
  it('только старый урок — старый', () => {
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 1000, v2: null })).toEqual({ kind: 'legacy', reason: 'legacy_only' });
  });
  it('только V2 — V2', () => {
    expect(pickHomeContinue({ hasLegacyLesson: false, legacyAtMs: null, v2: v2(500) })).toEqual({ kind: 'v2', reason: 'v2_only' });
  });
  it('оба — свежее по времени; старый урок без метки времени считается старым', () => {
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 1000, v2: v2(2000) }).kind).toBe('v2');
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: 3000, v2: v2(2000) }).kind).toBe('legacy');
    expect(pickHomeContinue({ hasLegacyLesson: true, legacyAtMs: null, v2: v2(1) }).kind).toBe('v2');
  });
  it('ничего — карточки нет', () => {
    expect(pickHomeContinue({ hasLegacyLesson: false, legacyAtMs: null, v2: null }).kind).toBe('none');
  });
});

describe('P23 · метки: только локально, сверка прогресса, смена аккаунта', () => {
  beforeEach(() => { mockStore.clear(); resetHomeContinueMarksForTests(); });
  it('запись V2 и время старого урока — в памяти сразу и на диске; перезапуск читает с диска', async () => {
    recordHomeContinueV2('en', v2(2000));
    recordHomeContinueLegacy('en', 1500);
    expect(peekHomeContinueMarks('en')?.v2?.sessionId).toBe('lesson-01:session:04');
    await Promise.resolve();
    resetHomeContinueMarksForTests();
    const marks = await loadHomeContinueMarks('en');
    expect(marks.v2?.atMs).toBe(2000);
    expect(marks.legacyAtMs).toBe(1500);
  });
  it('вкладка «Уроки» обновляет «пройдено / выпущено» той же метки, время не меняется', () => {
    recordHomeContinueV2('en', v2(2000));
    refreshHomeContinueV2Progress('en', 1, 5, 11);
    expect(peekHomeContinueMarks('en')?.v2).toMatchObject({ done: 5, total: 11, atMs: 2000 });
    refreshHomeContinueV2Progress('en', 2, 9, 9);
    expect(peekHomeContinueMarks('en')?.v2).toMatchObject({ done: 5 });
  });
  it('смена владельца аккаунта чистит память и ключи', async () => {
    recordHomeContinueV2('en', v2(2000));
    await Promise.resolve();
    expect(mockStore.size).toBeGreaterThan(0);
    mockOwnerReset?.();
    await Promise.resolve();
    expect(peekHomeContinueMarks('en')).toBeNull();
    expect(mockStore.size).toBe(0);
  });
});

describe('P23 · подключение экранов', () => {
  it('Главная выбирает свежее, тап ведёт в занятие V2, журнал [HOME-CONTINUE]', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('const continueChoice = pickHomeContinue(continueInput);');
    expect(home).toContain('nav.push(homeContinueV2Href(continueV2.route) as never);');
    expect(home).toContain('v2: homeLearnVisible && HOME_CONTINUE_V2_ENABLED ? continueMarks.v2 : null');
    expect(home).toContain('logHomeContinueChoice(continueChoice, continueInput, String(studyTarget));');
  });
  it('запуск занятия V2 пишет метку, старые уроки пишут время', () => {
    expect(read('app/(tabs)/lessons.tsx')).toContain('recordHomeContinueV2(studyTarget, {');
    expect(read('app/lesson1.tsx')).toContain('recordHomeContinueLegacy(studyTarget);');
    expect(read('app/lesson_menu.tsx')).toContain('recordHomeContinueLegacy(studyTarget);');
  });
});
