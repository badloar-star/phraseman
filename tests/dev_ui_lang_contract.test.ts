// зачем (координатор 12.10, решение владельца п.76 «английский интерфейс входит в R1»): dev-подмена dev_state?uiLang=en открывает ворота en БЕЗ глобального флага,
// живёт только в памяти и не доступна в стор-сборке. Сторож держит три вещи: логику ворот, отсутствие записи языка на диск и подключение параметра ссылки.
import fs from 'node:fs';
import path from 'node:path';

import { isInterfaceLangEnabled, triLang } from '../constants/i18n';
import { isDevUiLangEnOn, setDevUiLang, subscribeDevUiLang } from '../app/dev_ui_lang';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev_state?uiLang — английский интерфейс без глобального флага', () => {
  // зачем: в окружении тестов __DEV__ не выставлен — модуль (как и dev_ai_consent) читает его при каждом вызове
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  afterEach(() => { setDevUiLang('off'); });

  it('по умолчанию ворота en закрыты (флаг конфига выключен), подмена открывает и закрывает их', () => {
    expect(isDevUiLangEnOn()).toBe(false);
    expect(isInterfaceLangEnabled('en')).toBe(false);
    expect(setDevUiLang('en')).toBe(true);
    expect(isDevUiLangEnOn()).toBe(true);
    expect(isInterfaceLangEnabled('en')).toBe(true);
    // словарь без ключа en: при открытых воротах — запасной es (и [I18N-FALLBACK] в журнале), а не русский
    expect(triLang('en', { ru: 'ру', uk: 'укр', es: 'es' })).toBe('es');
    expect(setDevUiLang('off')).toBe(true);
    expect(isInterfaceLangEnabled('en')).toBe(false);
    // без подмены словарь без en по-прежнему отдаёт русский, как у текущих пользователей
    expect(triLang('en', { ru: 'ру', uk: 'укр', es: 'es' })).toBe('ру');
  });

  it('подписчик LangContext получает каждый запрос', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeDevUiLang((request) => { seen.push(request); });
    setDevUiLang('en');
    setDevUiLang('off');
    unsubscribe();
    setDevUiLang('en');
    expect(seen).toEqual(['en', 'off']);
  });

  it('модуль в сторе отказывает: геттер и установка закрыты проверкой dev-сборки', () => {
    const src = read('app/dev_ui_lang.ts');
    expect(src).toContain("typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE");
    expect(src).toContain('return devAvailable() && enOn;');
    expect(src).toContain('[DEV-STATE] uiLang: отклонено — не dev-сборка');
  });

  it('язык применяется только в памяти: LangContext не пишет app_lang и подписан лишь в dev', () => {
    const src = read('components/LangContext.tsx');
    const at = src.indexOf('const apply = (request: DevUiLangRequest): void => {');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, src.indexOf('}, []);', at));
    expect(block).not.toContain('persistPortablePreference');
    expect(block).toContain('writePeekAppLang(');
    expect(block).toContain('if (isDevUiLangEnOn()) apply(\'en\');');
    expect(src).toContain("if (typeof __DEV__ === 'undefined' || !__DEV__) return undefined;\n    const apply");
  });

  it('параметр ссылки uiLang разобран и применяется шагом', () => {
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).toContain("request.uiLang = pick('uiLang', ['en', 'off'] as const);");
    expect(fixtures).toContain("await step('uiLang', request.uiLang, async () => setDevUiLang(request.uiLang!));");
  });

  it('ссылки «en-проход» все с uiLang=en и overlays=off', () => {
    const doc = read('docs/phraseman-2.0/DEV_LINKS_EN_PASS.md');
    const links = doc.split('\n').filter((line) => line.includes('`phraseman://dev_state?'));
    expect(links.length).toBeGreaterThan(40);
    for (const line of links) {
      expect(line).toContain('uiLang=en');
      expect(line).toContain('overlays=off');
    }
  });

  it('метки журнала ZoomBar — латиницей (сканер непереведённых строк больше не видит их как интерфейс)', () => {
    const src = read('components/cards-grid/ZoomBar.tsx');
    expect(src).toContain("moveTo(event.x, 'touch');");
    expect(src).toContain("moveTo(event.x, 'drag');");
  });
});

describe('находки EN-прохода 12.10 (Сверка)', () => {
  it('«Сохранённые»: подписи экрана идут на языке ИНТЕРФЕЙСА, контентный lang — только для перевода плитки', () => {
    const src = read('app/flashcards/CollectionGalleryView.tsx');
    expect(src).toContain("const { lang: uiLang } = useLang();");
    expect(src).toContain('const copy = useMemo(() => copyFor(uiLang), [uiLang]);');
    expect(src).toContain('const zoomCopy = useMemo(() => zoomCopyFor(uiLang), [uiLang]);');
    expect(src).toContain('unlimitedLabelFor(uiLang)');
    expect(src).not.toContain('copyFor(lang)');
  });

  it('редактор карточки: словарь STR берётся по языку интерфейса целиком (не сужен до ru/uk/es)', () => {
    const src = read('app/flashcards_card_editor.tsx');
    expect(src).toContain('const s = STR[lang] ?? STR.ru;');
    expect(src).not.toContain("lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru'");
    const consts = read('app/flashcards/constants.ts');
    expect(consts).toContain("newCard: 'New flashcard'");
  });
});
