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
    // зачем (228448bfe): catalog / catalog_upcoming добавил демо-каталог YouTube («Видео») — парсер обязан их принимать
    expect(parseDevStateParams({ videopacks: 'catalog' }).request.videoPacks).toBe('catalog');
    expect(parseDevStateParams({ videopacks: 'catalog_upcoming' }).request.videoPacks).toBe('catalog_upcoming');
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

describe('DEV_LINKS_P83 / DEV_LINKS_R1: кадры п.83 и «Из видео» описаны', () => {
  const p83 = read('docs/phraseman-2.0/DEV_LINKS_P83.md');
  const r1 = read('docs/phraseman-2.0/DEV_LINKS_R1.md');
  it('ручной документ: 7 кадров языка наборов + 3 кадра «Из видео»', () => {
    for (const id of ['cards-027·1', 'cards-027·2', 'cards-027·3', 'cards-027·4', 'cards-027·5', 'cards-027·6', 'cards-027·7', 'video-pusto', 'video-oshibka', 'video-spisok']) {
      expect(p83).toContain(`| ${id} `);
    }
  });
  it('все ссылки ручного документа разбираются парсером без отказов', () => {
    const { parseDevStateParams } = require('../app/dev_state_fixtures');
    const links = [...p83.matchAll(/`phraseman:\/\/dev_state\?([^`]+)`/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThanOrEqual(10);
    for (const link of links) {
      const params: Record<string, string> = {};
      for (const pair of link.split('&')) {
        const at = pair.indexOf('=');
        params[decodeURIComponent(at < 0 ? pair : pair.slice(0, at))] = decodeURIComponent(at < 0 ? '' : pair.slice(at + 1));
      }
      expect(parseDevStateParams(params).rejected).toEqual({});
    }
  });
  it('генерируемые строки реестра: cards-027 (меню), cards-080 («Пока пусто»), cards-030 (ждёт повторы)', () => {
    const rowOf = (id: string) => r1.split('\n').find((l) => l.startsWith(`| ${id} |`)) ?? '';
    expect(rowOf('cards-027')).toContain('cardslangs=on');
    expect(rowOf('cards-080')).toContain('videopacks=empty');
    expect(rowOf('cards-030')).toContain('| `wait:14000` | да |');
  });
  it('переключатели описаны в DEV_SWITCHES_R1_CORE', () => {
    const sw = read('docs/phraseman-2.0/DEV_SWITCHES_R1_CORE.md');
    expect(sw).toContain('`cardslangs=on\\|off`');
    // зачем (228448bfe): строка videopacks расширена значениями catalog / catalog_upcoming; сторож требует ВСЕ четыре значения парсера, а не префикс
    expect(sw).toContain('`videopacks=empty\\|demo\\|catalog\\|catalog_upcoming`');
  });
});
