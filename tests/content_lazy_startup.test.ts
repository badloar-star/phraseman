import fs from 'node:fs';
import path from 'node:path';

import { lazyContent, loadedContentKeys, resetContentLazyForTests } from '../app/content_lazy';

// зачем (PM-216 / [CONTENT-LAZY], координатор 2026-10-03; владелец: «так чтобы все летало»): крупный учебный контент
// (озвучка Learning V2, индекс уроков, карта ссылок фраз, глоссы словаря) не должен выполняться при ИМПОРТЕ — только
// при первом обращении. Тест держит: сам помощник (однократная загрузка, лог, ошибка не молчит), отсутствие
// статических import тяжёлых модулей на стартовом пути и что поведение данных не изменилось.
jest.mock('expo-asset', () => ({ Asset: { loadAsync: jest.fn(), fromModule: jest.fn() } }));
jest.mock('expo-file-system', () => ({ File: class {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), multiGet: jest.fn(), multiSet: jest.fn(), multiRemove: jest.fn(), getAllKeys: jest.fn() } }));

const root = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8');

describe('lazyContent', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    resetContentLazyForTests();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  test('load() не вызывается до первого обращения; результат запоминается; строка [CONTENT-LAZY] одна', () => {
    const load = jest.fn(() => ({ big: [1, 2, 3] }));
    const get = lazyContent('test_key_once', load);
    expect(load).not.toHaveBeenCalled();
    const first = get();
    const second = get();
    expect(second).toBe(first);
    expect(load).toHaveBeenCalledTimes(1);
    const lines = warn.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith('[CONTENT-LAZY]'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[CONTENT-LAZY\] loaded key=test_key_once ms=\d+ epochMs=\d+$/);
    expect(loadedContentKeys()).toContain('test_key_once');
  });

  test('сбой загрузчика не молчит: пишется причина, исключение летит дальше, следующая попытка пробует снова', () => {
    let attempts = 0;
    const get = lazyContent('test_key_fail', () => {
      attempts += 1;
      if (attempts === 1) throw new Error('boom');
      return 'ok';
    });
    expect(() => get()).toThrow('boom');
    expect(warn.mock.calls.map((c) => String(c[0]))).toContain('[CONTENT-LAZY] failed key=test_key_fail reason=boom');
    expect(loadedContentKeys()).not.toContain('test_key_fail');
    expect(get()).toBe('ok');
    expect(attempts).toBe(2);
  });
});

describe('стартовый путь не выполняет тяжёлый контент при импорте', () => {
  const importsOf = (src: string): string[] => src.split('\n').filter((l) => /^import\s/.test(l));

  test.each([
    ['app/lesson_words_spanish_gloss.ts', 'lesson_words_source_locales', 'lesson_words_source_locales'],
  ])('%s: нет статического import %s, есть lazyContent("%s")', (file, heavy, key) => {
    const src = read(file);
    expect(importsOf(src).filter((l) => l.includes(heavy) && !/^import type\b/.test(l))).toEqual([]);
    expect(src.includes('lazyContent("' + key + '"') || src.includes("lazyContent('" + key + "'")).toBe(true);
    expect(src).toContain('require(');
  });

  test('плееру фраз нужен только ключ нормализации — не карта ссылок', () => {
    expect(read('hooks/phrase_audio_player.ts')).not.toContain('phrase_audio_url_map.generated');
    expect(read('hooks/phrase_audio_player.ts')).toContain("from '../app/phrase_audio_key'");
  });
});
