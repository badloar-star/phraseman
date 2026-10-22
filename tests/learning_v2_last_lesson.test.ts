// зачем (поручение владельца через координатора 18.10): «в обучении всегда открывается урок 1, даже если последним открывал урок 2 или другой» —
// карта Learning V2 помнит последний открытый урок ЛОКАЛЬНО: запомнил урок 3 → после перезапуска карта открывается на уроке 3; нет запомненного — как раньше.
import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
const mockSetItem = jest.fn((k: string, v: string) => { mockStore.set(k, v); return Promise.resolve(); });
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
    multiGet: (keys: string[]) => Promise.resolve(keys.map((k) => [k, mockStore.get(k) ?? null])),
    setItem: (k: string, v: string) => mockSetItem(k, v),
    multiRemove: (keys: string[]) => { keys.forEach((k) => mockStore.delete(k)); return Promise.resolve(); },
  },
}));
let mockOwnerReset: (() => void) | null = null;
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: (_n: string, reset: () => void) => { mockOwnerReset = reset; } }));

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
type Mod = typeof import('../app/learning_v2_last_lesson');
// «перезапуск приложения» = новый экземпляр модуля с пустой памятью, диск (mockStore) остаётся
const freshProcess = (): Mod => {
  let mod!: Mod;
  jest.isolateModules(() => { mod = require('../app/learning_v2_last_lesson'); });
  return mod;
};

describe('последний открытый урок карты Learning V2', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => { mockStore.clear(); mockSetItem.mockClear(); logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); warnSpy.mockRestore(); });

  it('запомнил урок 3 → после перезапуска карта открылась на уроке 3', async () => {
    const before = freshProcess();
    before.rememberLearningV2LastLesson('en', 3, 'map_open');
    expect(before.peekLearningV2LastLesson('en')).toBe(3); // память — мгновенно, без ожидания диска
    await Promise.resolve();
    expect(mockStore.get(before.learningV2LastLessonKey('en'))).toBe('3');

    const after = freshProcess();
    expect(after.peekLearningV2LastLesson('en')).toBeUndefined(); // новый процесс: память холодная
    const remembered = await after.loadLearningV2LastLesson('en');
    expect(remembered).toBe(3);
    // первый незавершённый — урок 1, но запомнен 3: карта берёт запомненный
    expect(after.pickInitialLessonOrdinal({ remembered, canonical: 1, visibleOrdinals: [1, 2, 3, 4] })).toEqual({ ordinal: 3, branch: 'remembered' });
  });

  it('язык изучения — отдельная память: урок в английском не открывает испанский', async () => {
    const mod = freshProcess();
    mod.rememberLearningV2LastLesson('en', 3, 'map_open');
    mod.rememberLearningV2LastLesson('es', 5, 'map_open');
    expect(mod.learningV2LastLessonKey('en')).not.toBe(mod.learningV2LastLessonKey('es'));
    const after = freshProcess();
    expect(await after.loadLearningV2LastLesson('en')).toBe(3);
    expect(await after.loadLearningV2LastLesson('es')).toBe(5);
    expect(await after.loadLearningV2LastLesson('fr')).toBeNull();
  });

  it('нет запомненного урока — как раньше, урок первого незавершённого занятия', () => {
    const mod = freshProcess();
    expect(mod.pickInitialLessonOrdinal({ remembered: null, canonical: 2, visibleOrdinals: [1, 2, 3] })).toEqual({ ordinal: 2, branch: 'canonical' });
    expect(mod.pickInitialLessonOrdinal({ remembered: undefined, canonical: 1, visibleOrdinals: null })).toEqual({ ordinal: 1, branch: 'canonical' });
  });

  it('запомненный урок скрыт (занятия сняты) — урок первого незавершённого занятия, не пустая карта', () => {
    const mod = freshProcess();
    expect(mod.pickInitialLessonOrdinal({ remembered: 7, canonical: 1, visibleOrdinals: [1, 2, 3] })).toEqual({ ordinal: 1, branch: 'canonical_remembered_hidden' });
  });

  it('тот же урок повторно не пишет на диск: ни одной лишней записи при каждом открытии', () => {
    const mod = freshProcess();
    mod.rememberLearningV2LastLesson('en', 2, 'map_open');
    mod.rememberLearningV2LastLesson('en', 2, 'toggle_chapter');
    mod.rememberLearningV2LastLesson('en', 2, 'launch_session');
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    mod.rememberLearningV2LastLesson('en', 4, 'map_open');
    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });

  it('мусор не записывается и не читается как урок', async () => {
    const mod = freshProcess();
    mod.rememberLearningV2LastLesson('en', 0, 'map_open');
    mod.rememberLearningV2LastLesson('en', 1.5, 'map_open');
    mod.rememberLearningV2LastLesson('en', 100, 'map_open');
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mod.parseLearningV2LastLesson('abc')).toBeNull();
    expect(mod.parseLearningV2LastLesson('0')).toBeNull();
    expect(mod.parseLearningV2LastLesson('7')).toBe(7);
    mockStore.set(mod.learningV2LastLessonKey('en'), 'не число');
    expect(await freshProcess().loadLearningV2LastLesson('en')).toBeNull();
  });

  it('Главная читает метки одной пачкой — запомненный урок прогревается из неё без второго чтения', () => {
    const mod = freshProcess();
    mod.hydrateLearningV2LastLesson('en', '4');
    expect(mod.peekLearningV2LastLesson('en')).toBe(4);
    mod.hydrateLearningV2LastLesson('en', '9'); // уже известно — не перетирает
    expect(mod.peekLearningV2LastLesson('en')).toBe(4);
  });

  it('смена владельца аккаунта очищает память (диск снимает общее стирание меток)', () => {
    const mod = freshProcess();
    mod.rememberLearningV2LastLesson('en', 3, 'map_open');
    mockOwnerReset?.();
    expect(mod.peekLearningV2LastLesson('en')).toBeUndefined();
  });

  it('журнал [V2-LAST-LESSON] называет ключ, значение, источник и откуда прочитано', async () => {
    const mod = freshProcess();
    mod.rememberLearningV2LastLesson('en', 3, 'map_open');
    const written = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(written).toContain('[V2-LAST-LESSON] write: key=');
    expect(written).toContain('value=3 source=map_open');
    await freshProcess().loadLearningV2LastLesson('en');
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('[V2-LAST-LESSON] read: source=storage');
  });
});

describe('подключение: Уроки пишут, карта читает, гость остаётся «чистым», метка стирается с аккаунтом', () => {
  it('Уроки запоминают открытие урока на карте и запуск занятия; карте передаётся запомненный урок', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('rememberLearningV2LastLesson(studyTarget, lessonOrdinal, "map_open")');
    // зачем (работа 19.10, восстановлена 22.10): «последний урок» при запуске пишет экран занятия после входа
    // (session_arrival), а не вкладка до открытия — подготовка и закрытие модалки ещё не значат, что урок открылся.
    expect(lessons).not.toContain('rememberLearningV2LastLesson(studyTarget, selected.lessonOrdinal, "launch_session")');
    expect(read('app/learning-v2/session/[id].tsx')).toContain('rememberLearningV2LastLesson(studyTarget as RuntimeStudyTarget, coordinates.lessonOrdinal, "session_arrival")');
    expect(lessons).toContain('const learningV2LastLesson = useLearningV2LastLesson(studyTarget);');
    expect(lessons).toContain('preferredLessonOrdinal={learningV2LastLesson ?? null}');
  });

  it('карта берёт запомненный урок в первом кадре, а не только урок первого незавершённого занятия; свой выбор не затирается', () => {
    const map = read('components/learning-v2/LearningV2ChaptersCourse.tsx');
    expect(map).toContain('pickInitialLessonOrdinal({ remembered: preferredLessonOrdinal, canonical: canonicalCurrentLessonOrdinal, visibleOrdinals: null })');
    expect(map).toContain('[V2-LAST-LESSON] map:init');
    expect(map).toContain('userChoseLessonRef.current = true;');
    // прежний безусловный сброс выбора на урок первого незавершённого занятия при монтировании убран
    expect(map).not.toMatch(/useEffect\(\(\) => \{\s*setSelectedLessonOrdinal\(canonicalCurrentLessonOrdinal\);\s*\}, \[canonicalCurrentLessonOrdinal\]\);/);
  });

  it('метка map — пятый вид меток аккаунта и служебная для гостя (f004c322d: last_opened_lesson=1 остаётся умолчанием гостя)', () => {
    const keys = read('app/target_storage_keys.ts');
    expect(keys).toContain("['v2', 'at', 'dialog', 'cards', 'map']");
    const classifier = read('app/guest_clean_classifier.ts');
    expect(classifier).toContain('last_opened_lesson__continue_(?:v2|at|dialog|cards|map)$/');
    expect(classifier).toContain("if (key === 'last_opened_lesson') return value === '1' ? 'default' : 'progress';");
    const marks = read('app/home_continue_mark.ts');
    expect(marks).toContain('hydrateLearningV2LastLesson(target, pairs[4]?.[1] ?? null);');
  });

  it('чужие правки «Все уроки» не затронуты', () => {
    expect(read('app/learning_v2_last_lesson.ts')).not.toContain('LearningV2AllLessonsList');
  });
});
