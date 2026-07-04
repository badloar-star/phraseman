declare const require: any;

const registry = require('../scripts/lib/heisenberg_locales.cjs');
const core = require('../scripts/lib/heisenberg_core.cjs');

// Snapshot of the constants as they were hardcoded before the registry
// refactor. The registry must derive EXACTLY these values so extraction
// behavior does not drift for existing locales.
const LEGACY_LOCALIZED_KEY_EXACT = [
  'ru',
  'uk',
  'es',
  'russian',
  'ukrainian',
  'spanish',
  'trru',
  'truk',
  'tres',
  'textru',
  'textuk',
  'textes',
  'titleru',
  'titleuk',
  'titlees',
  'subtitleru',
  'subtitleuk',
  'subtitlees',
  'labelru',
  'labeluk',
  'labeles',
  'tagru',
  'taguk',
  'tages',
  'descru',
  'descuk',
  'desces',
  'descriptionru',
  'descriptionuk',
  'descriptiones',
  'messageru',
  'messageuk',
  'messagees',
  'nameru',
  'nameuk',
  'namees',
  'explainru',
  'explainuk',
  'explaines',
  'explanations',
  'explanationsuk',
  'explanationses',
  'linesru',
  'linesuk',
  'lineses',
];

describe('heisenberg locale registry', () => {
  it('derives the same locale lists the pipeline hardcoded before', () => {
    expect(registry.ACTIVE_APP_LOCALES).toEqual(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(registry.PLANNED_APP_LOCALES).toEqual([]);
    expect(registry.LEGACY_INLINE_APP_LOCALES).toEqual(['ru', 'uk', 'es']);
    expect(registry.DEFAULT_SOURCE_LOCALES).toEqual(['ru', 'uk', 'es']);
    expect(registry.HEISENBERG_BATCH_SOURCE_LOCALES).toEqual(['es', 'pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(registry.STRUCTURED_BATCH_SOURCE_LOCALES).toEqual(['pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(Array.from(registry.AMBIGUOUS_EXACT_LOCALE_KEYS)).toEqual(['id']);
  });

  it('derives exactly the legacy localized key marker set', () => {
    const derived = Array.from(registry.buildLocalizedKeyExact()).sort();
    expect(derived).toEqual([...LEGACY_LOCALIZED_KEY_EXACT].sort());
  });

  it('derives exactly the legacy locale variable-name map', () => {
    expect(registry.buildVariableLocaleMap()).toEqual({
      RU: 'ru',
      UK: 'uk',
      ES: 'es',
      PT_BR: 'pt-BR',
      PTBR: 'pt-BR',
      VI: 'vi',
      ID: 'id',
      TR: 'tr',
      PL: 'pl',
    });
  });

  it('derives field marker regexes equivalent to the legacy ru/uk/es patterns', () => {
    const map = registry.buildFieldMarkerRegexMap('title|text');
    expect(Object.keys(map)).toEqual(['ru', 'uk', 'es']);
    expect('titleRU titleRu title_ru russian'.match(map.ru)).toEqual([
      'titleRU',
      'titleRu',
      'title_ru',
      'russian',
    ]);
    expect('textUK textUk text_uk ukrainian'.match(map.uk)).toEqual([
      'textUK',
      'textUk',
      'text_uk',
      'ukrainian',
    ]);
    expect('titleES titleEs title_es spanish'.match(map.es)).toEqual([
      'titleES',
      'titleEs',
      'title_es',
      'spanish',
    ]);
    expect(map.ru.test('titleDE')).toBe(false);
  });

  it('keeps legacy suffix and key inference behavior', () => {
    const suffix = registry.buildLegacyInlineSuffixRegexes();
    expect(suffix.separated.test('label_ru')).toBe(true);
    expect(suffix.upper.test('labelES')).toBe(true);
    expect(suffix.title.test('labelUk')).toBe(true);
    expect(suffix.separated.test('label_de')).toBe(false);
    expect(registry.inferLegacyInlineLocaleFromKey('explanations')).toBe('ru');
    expect(registry.inferLegacyInlineLocaleFromKey('titleru')).toBe('ru');
    expect(registry.inferLegacyInlineLocaleFromKey('spanish')).toBe('es');
    expect(registry.inferLegacyInlineLocaleFromKey('titlede')).toBe(null);
  });

  it('exposes a language signal for every non-cyrillic batch locale', () => {
    const signals = registry.buildLocaleLanguageSignals();
    for (const code of registry.HEISENBERG_BATCH_SOURCE_LOCALES) {
      expect(signals[code]).toBeDefined();
      expect(signals[code].words.length).toBeGreaterThan(10);
      expect(signals[code].minMatches).toBe(2);
    }
    expect(signals.ru).toBeUndefined();
    expect(signals.uk).toBeUndefined();
  });

  it('generates every derived structure for a brand-new locale from one entry', () => {
    const de = {
      code: 'de',
      englishName: 'German',
      keyWord: 'german',
      active: false,
      planned: true,
      legacyInline: false,
      defaultSource: false,
      batch: false,
      ambiguousKey: false,
      languageSignal: { words: Array.from({ length: 12 }, (_v, i) => `wort${i}`), minMatches: 2 },
    };
    expect(registry.localeVariableNames('de')).toEqual(['DE']);
    expect(registry.localeVariableNames('pt-BR')).toEqual(['PT_BR', 'PTBR']);
    const markers = registry.buildFieldMarkerRegexFor(de, 'title|text');
    expect('titleDE title_de german textDe'.match(markers)).toEqual([
      'titleDE',
      'title_de',
      'german',
      'textDe',
    ]);
    const keys = registry.buildLocalizedKeyExact([de]);
    expect(keys.has('de')).toBe(true);
    expect(keys.has('german')).toBe(true);
    expect(keys.has('titlede')).toBe(true);
    expect(keys.has('explanationsde')).toBe(true);
    expect(registry.buildVariableLocaleMap([de])).toEqual({ DE: 'de' });
    expect(registry.buildLocaleLanguageSignals([de]).de.words.length).toBe(12);
  });

  it('feeds the core pipeline from the registry (no duplicated locale lists)', () => {
    expect(core.LOCALE_REGISTRY).toBe(registry.LOCALE_REGISTRY);
    expect(core.ACTIVE_APP_LOCALES).toBe(registry.ACTIVE_APP_LOCALES);
    expect(core.HEISENBERG_BATCH_SOURCE_LOCALES).toBe(registry.HEISENBERG_BATCH_SOURCE_LOCALES);
    expect(core.LEGACY_INLINE_APP_LOCALES).toBe(registry.LEGACY_INLINE_APP_LOCALES);
    expect(core.isExplicitLocaleKey('titleRu')).toBe(true);
    expect(core.isExplicitLocaleKey('titleDe')).toBe(false);
    expect(core.inferLocaleFromKey('explanations', null)).toBe('ru');
    expect(core.inferLocaleFromKey('text_es', null)).toBe('es');
  });

  it('skips compiled functions output in repo scans', () => {
    expect(core.shouldSkipRelative('functions/lib/re_engage_push.js')).toBe(true);
    expect(core.shouldSkipRelative('functions/src/re_engage_push.ts')).toBe(false);
  });
});
