// Сторож перед сборкой (координатор 04.11, ЖЁСТКОЕ условие владельца «прогресс не пропадает НИ В КОЕМ СЛУЧАЕ»):
// при ВКЛЮЧЁННОМ CLASSIC_COURSES_RUNTIME_ENABLED прогресс старых пользователей не меняется.
// (1) старый EN-пользователь: тот же урок, та же позиция, ключи не удалены (хвосты сохраняются, «вариант Б»);
// (2) без прогресса — старт с урока 1 нового курса; (3) ветеран с Plus — доступы от флага не зависят; (4) языки не смешиваются.
// Сработал — чини код курсов (согласовав с Ядром), а не сторожа.
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CLASSIC_COURSES_RUNTIME_ENABLED,
  CLASSIC_COURSE_LANGS,
  classicCourseActiveFor,
  getClassicLessonPhrases,
} from '../app/classic_course_phrases';
import { getLessonData } from '../app/lesson_data_all';
import { countPassedMarks, mergeLessonProgressForSave, restoreLessonProgressPreserving } from '../app/classic_progress_preserve';
import { lessonBestScoreKey, lessonProgressKey, lessonSessionKey, unlockedLessonsKey } from '../app/target_storage_keys';
import { resolveLessonAccess } from '../app/monetization_policy';

const storage = AsyncStorage as unknown as { __reset: () => void };
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const marks50 = Array.from({ length: 50 }, (_, i) => (i === 2 ? 'wrong' : i < 30 ? 'correct' : 'empty'));
const ORDER = JSON.stringify(Array.from({ length: 50 }, (_, i) => (i * 7) % 50));

/** Старый EN-пользователь: урок 10 начат (позиция 17), есть порядок, очередь повтора ошибок, открытые уроки, лучший результат. */
async function seedOldEnglishUser(): Promise<Record<string, string>> {
  const seed: Record<string, string> = {
    [lessonProgressKey(10, 'en')]: JSON.stringify(marks50),
    [lessonSessionKey(10, 'cellIndex', 'en')]: '17',
    [lessonSessionKey(10, 'phraseOrder', 'en')]: ORDER,
    [lessonSessionKey(10, 'errorReplayQueue', 'en')]: JSON.stringify([3, 9]),
    [unlockedLessonsKey('en')]: JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    [lessonBestScoreKey(1, 'en')]: '5',
    [lessonBestScoreKey(9, 'en')]: '4.5',
  };
  await AsyncStorage.multiSet(Object.entries(seed));
  return seed;
}

async function snapshot(): Promise<Record<string, string | null>> {
  const keys = await AsyncStorage.getAllKeys();
  const rows = await AsyncStorage.multiGet(keys);
  return Object.fromEntries(rows);
}

beforeEach(() => {
  storage.__reset();
  jest.restoreAllMocks();
});

describe('выключатель курсов включён (D202)', () => {
  it('CLASSIC_COURSES_RUNTIME_ENABLED = true и действует для пяти языков курса, не для остальных', () => {
    expect(CLASSIC_COURSES_RUNTIME_ENABLED).toBe(true);
    for (const lang of CLASSIC_COURSE_LANGS) expect(classicCourseActiveFor(lang)).toBe(true);
    expect(classicCourseActiveFor('ru')).toBe(false);
    expect(classicCourseActiveFor(null)).toBe(false);
  });
});

describe('(1) старый английский пользователь: урок 10, позиция 17 — ничего не потеряно', () => {
  it('ключи старого прогресса — прежние имена (lesson10_progress / cellIndex / phraseOrder / errorReplayQueue)', () => {
    expect(lessonProgressKey(10, 'en')).toBe('lesson10_progress');
    expect(lessonSessionKey(10, 'cellIndex', 'en')).toBe('lesson10_cellIndex');
    expect(lessonSessionKey(10, 'phraseOrder', 'en')).toBe('lesson10_phraseOrder');
    expect(lessonSessionKey(10, 'errorReplayQueue', 'en')).toBe('lesson10_errorReplayQueue');
    expect(unlockedLessonsKey('en')).toBe('unlocked_lessons');
  });

  it.each([50, 30, 70, 40])('урок нового курса длиной %i: вход в урок только читает — хранилище не изменилось ни на байт', async (total) => {
    const seed = await seedOldEnglishUser();
    const before = await snapshot();
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    const multiSet = jest.spyOn(AsyncStorage, 'multiSet');
    const removeItem = jest.spyOn(AsyncStorage, 'removeItem');
    const multiRemove = jest.spyOn(AsyncStorage, 'multiRemove');
    for (const spy of [setItem, multiSet, removeItem, multiRemove]) spy.mockClear(); // у мока хранилища история вызовов общая — отсекаем запись самого посева

    const restored = restoreLessonProgressPreserving(seed[lessonProgressKey(10, 'en')], total);

    // та же позиция: каждая сохранённая отметка осталась на своём месте (в пределах длины нового урока)
    for (let i = 0; i < Math.min(total, marks50.length); i += 1) expect(restored.view[i]).toBe(marks50[i]);
    expect(restored.view).toHaveLength(total);
    // пройденное не уменьшилось, если урок короче — хвост сохранён
    expect(countPassedMarks([...restored.view, ...restored.tail])).toBe(countPassedMarks(marks50));

    expect(await snapshot()).toEqual(before);
    for (const spy of [setItem, multiSet, removeItem, multiRemove]) expect(spy).not.toHaveBeenCalled();
    expect(before[lessonSessionKey(10, 'cellIndex', 'en')]).toBe('17'); // позиция на месте
  });

  it('после первого ответа в новом курсе меняются только прогресс и позиция урока 10; хвост сохраняется при записи', async () => {
    const seed = await seedOldEnglishUser();
    const before = await snapshot();
    const restored = restoreLessonProgressPreserving(seed[lessonProgressKey(10, 'en')], 30); // новый урок короче старого
    const view = [...restored.view];
    const cell = view.findIndex((mark) => mark === 'empty');
    view[Math.max(0, cell)] = 'correct';
    await AsyncStorage.setItem(lessonProgressKey(10, 'en'), JSON.stringify(mergeLessonProgressForSave(view, restored.tail)));
    await AsyncStorage.setItem(lessonSessionKey(10, 'cellIndex', 'en'), String(Math.max(0, cell) + 1));
    const after = await snapshot();
    for (const [key, value] of Object.entries(before)) {
      if (key === lessonProgressKey(10, 'en') || key === lessonSessionKey(10, 'cellIndex', 'en')) continue;
      expect(after[key]).toBe(value); // порядок, очередь ошибок, открытые уроки, лучшие результаты — байт в байт
    }
    const saved = JSON.parse(after[lessonProgressKey(10, 'en')] as string) as string[];
    expect(saved.length).toBeGreaterThanOrEqual(marks50.length); // хвост не обрезан
    expect(countPassedMarks(saved)).toBeGreaterThanOrEqual(countPassedMarks(marks50));
  });

  it('уроки 10 и 17 нового английского курса существуют (есть что показать на сохранённой позиции)', () => {
    expect(getLessonData(10, 'en').length).toBeGreaterThan(0);
    expect(getLessonData(17, 'en').length).toBeGreaterThan(0);
  });

  it('код курса не удаляет ключи: адаптер и помощник не трогают хранилище', () => {
    for (const rel of ['app/classic_course_phrases.ts', 'app/classic_progress_preserve.ts']) {
      expect(read(rel)).not.toMatch(/AsyncStorage|removeItem|multiRemove|setItem/);
    }
  });
});

describe('(2) пользователь без прогресса — начинает с урока 1 нового курса', () => {
  it('пустое хранилище: отметки пустые, пройдено 0, позиции нет', async () => {
    const restored = restoreLessonProgressPreserving(null, 50);
    expect(restored.view.every((mark) => mark === 'empty')).toBe(true);
    expect(countPassedMarks(restored.view)).toBe(0);
    expect(await AsyncStorage.getItem(lessonSessionKey(1, 'cellIndex', 'en'))).toBeNull();
  });
  it('урок 1 открыт без условий, урок 1 есть во всех пяти курсах', () => {
    expect(resolveLessonAccess({ lessonId: 1, unlocked: false, isPremium: false })).toBe('available');
    for (const lang of CLASSIC_COURSE_LANGS) {
      expect(getClassicLessonPhrases(1, lang).length).toBeGreaterThan(0);
      expect(getLessonData(1, lang).length).toBeGreaterThan(0);
    }
  });
});

describe('(3) ветеран с Plus — доступы не зависят от выключателя курсов', () => {
  it('модули доступа не знают про классические курсы', () => {
    for (const rel of ['app/monetization_policy.ts', 'app/premium_guard.ts', 'app/lesson_lock_system.ts', 'app/lesson_premium_gate.ts', 'app/main_course_access.ts']) {
      expect(read(rel)).not.toContain('classic_course_phrases');
    }
  });
  it('Plus открывает платные уроки, Free — нет; решение то же, что до включения флага', () => {
    expect(resolveLessonAccess({ lessonId: 9, unlocked: true, isPremium: true })).toBe('available');
    expect(resolveLessonAccess({ lessonId: 9, unlocked: false, isPremium: false })).not.toBe('available');
  });
});

describe('(4) смена языка курса — прогресс по языкам не смешивается', () => {
  it('ключи одного урока у разных языков различаются, у английского — прежнее имя', () => {
    const keys = CLASSIC_COURSE_LANGS.map((lang) => lessonProgressKey(10, lang));
    expect(new Set(keys).size).toBe(CLASSIC_COURSE_LANGS.length);
    expect(keys[0]).toBe('lesson10_progress');
    const cells = CLASSIC_COURSE_LANGS.map((lang) => lessonSessionKey(10, 'cellIndex', lang));
    expect(new Set(cells).size).toBe(CLASSIC_COURSE_LANGS.length);
  });
  it('запись прогресса испанского не трогает английский и наоборот; у языка без записей — чистый старт', async () => {
    await seedOldEnglishUser();
    const englishBefore = await AsyncStorage.getItem(lessonProgressKey(10, 'en'));
    expect(await AsyncStorage.getItem(lessonProgressKey(10, 'es'))).toBeNull();
    expect(restoreLessonProgressPreserving(await AsyncStorage.getItem(lessonProgressKey(10, 'es')), 50).view.every((m) => m === 'empty')).toBe(true);
    await AsyncStorage.setItem(lessonProgressKey(10, 'es'), JSON.stringify(Array.from({ length: 50 }, (_, i) => (i < 5 ? 'correct' : 'empty'))));
    expect(await AsyncStorage.getItem(lessonProgressKey(10, 'en'))).toBe(englishBefore);
    expect(await AsyncStorage.getItem(lessonSessionKey(10, 'cellIndex', 'en'))).toBe('17');
  });
  it('фразы курса берутся по языку: у каждого языка свои данные урока', () => {
    const en = getClassicLessonPhrases(10, 'en').map((p) => p.id);
    const es = getClassicLessonPhrases(10, 'es').map((p) => p.id);
    expect(en.length).toBeGreaterThan(0);
    expect(es.length).toBeGreaterThan(0);
    expect(en).not.toEqual(es);
  });
});
