// Governance-ID: TG-599187487F25
jest.mock('react-native', () => {
  const base: Record<string, unknown> = {
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, hairlineWidth: 1, absoluteFillObject: {} },
    Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios ?? options.default },
    Dimensions: { get: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }) },
    PixelRatio: { get: () => 3, getFontScale: () => 1 },
    Text: 'Text',
    View: 'View',
  };
  return new Proxy(base, { get: (target, key: string) => (key in target ? target[key] : 'RNStub') });
});
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
import { legacyIntroValue, plainIntroText, richIntroLines, richTitle } from '../components/lesson_intro_rich';
import type { LessonIntroScreen } from '../app/lesson_data_types';

// зачем (слово владельца через координатора 05.11, находка Maestro): интерфейс EN + курс English показывал вступление урока 1 на русском.
// Правило: ru→RU, uk→UK, остальные локали → свой перевод или EN; чужой язык (RU) в не-ru локали недопустим, если есть EN.

const screen: LessonIntroScreen = {
  lessonId: 1,
  screenId: 'l1-s1',
  titleRU: 'Что учим сегодня',
  titleUK: 'Що вчимо сьогодні',
  titleEN: 'Saying how things are',
  titleES: 'Imagina la situación',
  titlePtBr: 'Imagine a situação',
  textRU: 'Текст по-русски',
  textUK: 'Текст українською',
  textEN: 'English text',
  textES: 'Texto en español',
  textPtBr: 'Texto em português',
} as LessonIntroScreen;

// карточка без собственных переводов для планируемых локалей — должна упасть на EN, а не на RU
const noOwn: LessonIntroScreen = { lessonId: 1, screenId: 'x', titleRU: 'RU', titleUK: 'UK', titleEN: 'EN', textRU: 'ru', textUK: 'uk', textEN: 'en' } as LessonIntroScreen;

describe('вступление классического урока: язык по локали интерфейса', () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { log.mockRestore(); });

  test('en: заголовок и текст — EN, не RU', () => {
    expect(richTitle(screen, 'en', 'en')).toBe('Saying how things are');
    expect(plainIntroText(screen, 'en', 'en')).toBe('English text');
  });

  test('ru: RU; uk: UK', () => {
    expect(richTitle(screen, 'ru', 'en')).toBe('Что учим сегодня');
    expect(richTitle(screen, 'uk', 'en')).toBe('Що вчимо сьогодні');
    expect(plainIntroText(screen, 'ru', 'en')).toBe('Текст по-русски');
    expect(plainIntroText(screen, 'uk', 'en')).toBe('Текст українською');
  });

  test('pt-BR: собственный перевод есть — берём его', () => {
    expect(richTitle(screen, 'pt-BR', 'en')).toBe('Imagine a situação');
  });

  test.each(['pt-BR', 'vi', 'id', 'tr', 'pl'] as const)('%s без собственного перевода — EN, не RU', (lang) => {
    expect(richTitle(noOwn, lang, 'en')).toBe('EN');
    expect(plainIntroText(noOwn, lang, 'en')).toBe('en');
  });

  test('en без EN-поля (старые экраны) — прежний запасной RU', () => {
    const legacy = { titleRU: 'RU', titleUK: 'UK' } as LessonIntroScreen;
    expect(richTitle(legacy, 'en', 'en')).toBe('RU');
  });

  test('legacyIntroValue без EN-значения не меняет прежнее поведение', () => {
    expect(legacyIntroValue('en', 'en', 'ru', 'uk', 'es')).toBe('ru');
    expect(legacyIntroValue('uk', 'en', 'ru', 'uk', 'es')).toBe('uk');
    expect(legacyIntroValue('en', 'en', 'ru', 'uk', 'es', 'en')).toBe('en');
    expect(legacyIntroValue('ru', 'en', 'ru', 'uk', 'es', 'en')).toBe('ru');
  });

  test('строки из EN-набора используются для en, из RU — для ru', () => {
    const withLines = { linesRU: [{ parts: [{ text: 'р' }] }], linesEN: [{ parts: [{ text: 'e' }] }] } as unknown as LessonIntroScreen;
    expect(richIntroLines(withLines, 'en', 'en')).toBe(withLines.linesEN);
    expect(richIntroLines(withLines, 'ru', 'en')).toBe(withLines.linesRU);
  });

  test('журнал [CLASSIC-INTRO] объясняет выбранное поле', () => {
    const fresh = { ...screen, lessonId: 99, screenId: 'log-probe' } as LessonIntroScreen;
    richTitle(fresh, 'en', 'en');
    const line = log.mock.calls.map((c) => c.join(' ')).find((l) => l.startsWith('[CLASSIC-INTRO]')) ?? '';
    expect(line).toContain('"lessonId":99');
    expect(line).toContain('"ui":"en"');
    expect(line).toContain('en_for_non_ru_uk_locale');
  });

  test('реальные данные курса English, урок 1: в en-локали нет кириллицы в заголовке и тексте', () => {
    const intro = require('../modules/classic-courses/en/intro.json') as Record<string, LessonIntroScreen[]>;
    const blocks = intro['1'];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const title = richTitle(block, 'en', 'en') ?? '';
      const text = plainIntroText(block, 'en', 'en') ?? '';
      expect(/[А-Яа-яЁё]/.test(title)).toBe(false);
      expect(/[А-Яа-яЁё]/.test(text)).toBe(false);
    }
  });
});
