// зачем (Ревизор P23, координатор 15.10): карточка «Продолжить» на Главной показывает то, что свежее — старый урок или занятие V2;
// метки только локальные; смена аккаунта их чистит; запуск V2 на вкладке «Уроки» пишет метку, старые уроки — время.
import fs from 'node:fs';
import { lastOpenedLessonKey } from '../app/target_storage_keys';
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
  resetHomeContinueMarksForTests,
  type HomeContinueV2Mark,
} from '../app/home_continue_mark';

const v2 = (atMs: number): HomeContinueV2Mark => ({ lessonOrdinal: 1, sessionOrdinal: 4, sessionId: 'lesson-01:session:04', route: { id: 'lesson-01:session:04' }, atMs });
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
  // зачем (координатор 15.10, поправка 1): «пройдено / выпущено» в метке не хранится — иначе после занятия число устаревало
  it('метка не хранит прогресс; старая метка с done/total читается без них', async () => {
    mockStore.set(`${lastOpenedLessonKey('es')}__continue_v2`, JSON.stringify({ ...v2(2000), done: 3, total: 11 }));
    const marks = await loadHomeContinueMarks('es');
    expect(marks.v2).toEqual(v2(2000));
    expect(marks.v2).not.toHaveProperty('done');
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
    expect(home).toContain('void launchHomeContinueV2(continueV2.route, {');
    // зачем (R92, 17.10): занятие V2 в карточке — только при языке интерфейса с пояснениями курса
    expect(home).toContain("v2: homeLearnVisible && HOME_CONTINUE_V2_ENABLED && isLearningV2OpenForUiLangV1(lang, 'home_continue') ? continueMarks.v2 : null");
    expect(home).toContain('logHomeContinueChoice(continueChoice, continueInput, String(studyTarget));');
    // прогресс — при показе, на каждый возврат на Главную
    expect(home).toContain('useHomeContinueV2Progress(continueV2?.lessonOrdinal ?? null, focusTick, homeRuntimeActive)');
    expect(home).not.toMatch(/continueV2\.(done|total)\b/);
  });
  it('запуск занятия V2 пишет метку, старые уроки пишут время', () => {
    expect(read('app/(tabs)/lessons.tsx')).toContain('recordHomeContinueV2(studyTarget, {');
    expect(read('app/lesson1.tsx')).toContain('recordHomeContinueLegacy(studyTarget);');
    expect(read('app/lesson_menu.tsx')).toContain('recordHomeContinueLegacy(studyTarget);');
  });
});

// зачем (координатор 15.10, поправка 2): метка теряется, если в занятие V2 ведёт вход мимо вкладки «Уроки». Сейчас вход один —
// launchSelectedLearningV2Session (карта learning-v2/course рисует ту же вкладку); глубоких ссылок и «следующего занятия» внутри
// занятия нет. Сторож: новый вход в /learning-v2/session/[id] обязан поставить метку (или попасть сюда осознанно).
describe('P23 · все входы в занятие V2 ставят метку', () => {
  const ALLOWED = new Map<string, string>([
    // R09: маршрут занятия строит только общий модуль запуска; его зовут вкладка «Уроки» и карточка «Продолжить» (обе ставят метку)
    ['app/learning_v2_session_launch_v1.ts', ''],
    ['app/_learning_v2_authoring_preview.tsx', ''], // дев-превью автора, не курс игрока
  ]);
  const walk = (dir: string): string[] => fs.readdirSync(path.join(__dirname, '..', dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(rel);
    return /\.(ts|tsx)$/.test(e.name) ? [rel] : [];
  });
  it('пути в занятие есть только там, где пишется метка', () => {
    const pushers = [...walk('app'), ...walk('components')]
      .filter((rel) => !rel.startsWith('app/learning-v2/session/'))
      .filter((rel) => /pathname:\s*["']\/learning-v2\/session\/\[id\]["']/.test(read(rel)));
    expect(pushers.sort()).toEqual([...ALLOWED.keys()].sort());
    for (const [rel, marker] of ALLOWED) if (marker) expect(read(rel)).toContain(marker);
    const callers = [...walk('app'), ...walk('components')].filter((rel) => rel !== 'app/learning_v2_session_launch_v1.ts' && read(rel).includes('learningV2SessionHrefV1('));
    expect(callers.sort()).toEqual(['app/(tabs)/lessons.tsx', 'app/learning_v2_home_continue_route.ts']);
    expect(read('app/(tabs)/lessons.tsx')).toContain('rememberHomeContinueV2(selected, sessionId)');
    expect(read('app/learning_v2_home_continue_route.ts')).toContain('recordHomeContinueV2(ctx.studyTarget as RuntimeStudyTarget');
  });
});
