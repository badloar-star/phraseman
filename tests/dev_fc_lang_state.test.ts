// зачем (координатор 12.10, п.83/п.85(2)): Сверка снимает кадры языка наборов и «Из видео — пусто» только через dev-подмены в памяти.
// Сторож: подмена работает в dev, молчит в стор-сборке, не пишет в хранилище/Firestore, ссылки разбираются парсером без отказов.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiGet: jest.fn(async () => []), multiRemove: jest.fn(async () => undefined), getAllKeys: jest.fn(async () => []) },
}));

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev_fc_lang_state: списки других языков в памяти', () => {
  beforeEach(() => {
    jest.resetModules();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('по умолчанию выключено: геттер null', () => {
    const mod = require('../app/dev_fc_lang_state');
    expect(mod.getDevOtherLanguageDecks('en')).toBeNull();
  });

  it('cardslangs=on при языке приложения en: испанский 3 набора, французский 2; английского нет; off снимает', () => {
    const mod = require('../app/dev_fc_lang_state');
    expect(mod.setDevFcLangs(true)).toBe(true);
    const lists = mod.getDevOtherLanguageDecks('en');
    expect(lists.es).toHaveLength(3);
    expect(lists.fr).toHaveLength(2);
    expect(lists.en).toBeUndefined();
    expect(lists.es[0]).toMatchObject({ deckId: 'saved', sourceKind: 'saved', count: 12 });
    expect(mod.setDevFcLangs(false)).toBe(true);
    expect(mod.getDevOtherLanguageDecks('en')).toBeNull();
  });

  it('при языке приложения es подмена даёт английский и французский, но не испанский', () => {
    const mod = require('../app/dev_fc_lang_state');
    mod.setDevFcLangs(true);
    const lists = mod.getDevOtherLanguageDecks('es');
    expect(lists.es).toBeUndefined();
    expect(lists.en).toHaveLength(2);
    expect(lists.fr).toHaveLength(2);
  });

  it('в стор-сборке установка отклоняется, геттер всегда null', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const mod = require('../app/dev_fc_lang_state');
    expect(mod.setDevFcLangs(true)).toBe(false);
    expect(mod.getDevOtherLanguageDecks('en')).toBeNull();
  });

  it('модуль не трогает хранилище и сеть', () => {
    const src = read('app/dev_fc_lang_state.ts');
    expect(src).not.toMatch(/AsyncStorage|@react-native-firebase|fetch\(/);
  });
});

describe('dev_state: cardslangs / videopacks разбираются', () => {
  it('допустимые значения принимаются, мусор отклоняется', () => {
    const { parseDevStateParams } = require('../app/dev_state_fixtures');
    expect(parseDevStateParams({ cardslangs: 'on' }).request.cardsLangs).toBe('on');
    expect(parseDevStateParams({ cardslangs: 'off' }).request.cardsLangs).toBe('off');
    expect(parseDevStateParams({ cardslangs: 'x' }).rejected.cardslangs).toBeTruthy();
    expect(parseDevStateParams({ videopacks: 'empty' }).request.videoPacks).toBe('empty');
    expect(parseDevStateParams({ videopacks: 'demo' }).request.videoPacks).toBe('demo');
    expect(parseDevStateParams({ videopacks: 'zzz' }).rejected.videopacks).toBeTruthy();
  });

  it('применение: cardslangs идёт через dev_fc_lang_state, videopacks — через seed локального кэша; Firestore не вызывается', () => {
    const src = read('app/dev_state_fixtures.ts');
    expect(src).toContain("const { setDevFcLangs } = await import('./dev_fc_lang_state');");
    expect(src).toContain("seedVideoPhraseSetPacksForDev(request.videoPacks === 'empty' ? [] : demoVideoPacks())");
  });

  it('хук списков других языков сперва берёт dev-подмену, затем память localOnly', () => {
    const hook = read('app/flashcards/use_other_language_decks.ts');
    expect(hook).toContain('const devLists = getDevOtherLanguageDecks(appTarget);');
    expect(hook.indexOf('getDevOtherLanguageDecks')).toBeLessThan(hook.indexOf('peekFcDeckOptionsLocal(mode, lang, code)'));
  });
});

describe('DEV_LINKS_R1: кадры п.83 и «Из видео» описаны', () => {
  const doc = read('docs/phraseman-2.0/DEV_LINKS_R1.md');
  it('строка cards-027 с шагами меню и 7 кадров языка наборов + 3 кадра «Из видео»', () => {
    expect(doc).toMatch(/^\| cards-027 \| Подготовка тренировки · Кнопка языка открыта \|/m);
    for (const id of ['cards-027·1', 'cards-027·2', 'cards-027·3', 'cards-027·4', 'cards-027·5', 'cards-027·6', 'cards-027·7', 'video-pusto', 'video-oshibka', 'video-spisok']) {
      expect(doc).toContain(`| ${id} `);
    }
  });
  it('cards-030 ждёт тихие повторы (≈12 с), а не 800 мс, иначе снимается скелет', () => {
    const line = doc.split('\n').find((l) => l.startsWith('| cards-030 |')) ?? '';
    expect(line).toContain('| `wait:14000` | да |');
  });
  it('переключатели описаны в DEV_SWITCHES_R1_CORE', () => {
    const sw = read('docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md');
    expect(sw).toContain('`cardslangs=on\\|off`');
    expect(sw).toContain('`videopacks=empty\\|demo`');
  });
});
