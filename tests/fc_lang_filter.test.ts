// зачем (владелец 12.10, п.83, cards-027): сторож чистой логики фильтра языка наборов Карточек и запуска тренировки на языке выбранных наборов.
import {
  canSwitchLanguage,
  countByLanguage,
  decksForLanguage,
  flashcardsReadyLanguages,
  languageMenuEntries,
  readTargetParam,
  reconcileSelectedDeckIds,
  resolveTrainingTarget,
  trainingTargetFromParams,
  trainingTargetRouteParam,
} from '../app/flashcards/fc_lang_filter';
import { buildCardsTrainingRoute } from '../app/flashcards/training_entry';

describe('fc_lang_filter: языки-кандидаты', () => {
  it('«Карточки» готовы у всех пяти языков, порядок как в выборе языка наборов', () => {
    expect(flashcardsReadyLanguages()).toEqual(['en', 'fr', 'de', 'es', 'it']);
  });
});

describe('fc_lang_filter: меню языков', () => {
  // зачем (владелец 15.10: «все языки должны быть и должны быть доступны»): в меню ВСЕ пять языков, в том числе без наборов (count 0).
  it('в меню все пять языков, язык приложения первым, остальные по порядку, счётчики по наборам', () => {
    const entries = languageMenuEntries({ en: 3, es: 2, it: 1, fr: 0 }, 'es');
    expect(entries).toEqual([
      { code: 'es', count: 2 }, { code: 'en', count: 3 }, { code: 'fr', count: 0 }, { code: 'de', count: 0 }, { code: 'it', count: 1 },
    ]);
  });

  it('язык без наборов остаётся в меню; пустой словарь → пять языков с нулями', () => {
    expect(languageMenuEntries({}, 'en').map((entry) => entry.code)).toEqual(['en', 'fr', 'de', 'es', 'it']);
    expect(languageMenuEntries({ de: 0 }, 'de').map((entry) => entry.code)).toEqual(['de', 'en', 'fr', 'es', 'it']);
  });

  it('переключиться можно всегда: другие языки есть и без наборов', () => {
    expect(canSwitchLanguage(languageMenuEntries({ en: 4 }, 'en'), 'en')).toBe(true);
    expect(canSwitchLanguage(languageMenuEntries({}, 'de'), 'de')).toBe(true);
  });

  it('два языка → стрелка есть', () => {
    expect(canSwitchLanguage(languageMenuEntries({ en: 1, es: 1 }, 'en'), 'en')).toBe(true);
  });
});

describe('fc_lang_filter: фильтр наборов по языку', () => {
  const byLanguage = { en: ['saved', 'pack:a'], es: ['saved', 'custom', 'pack:b'] } as const;

  it('счётчики по языкам; языка нет в карте — нет и записи', () => {
    expect(countByLanguage(byLanguage)).toEqual({ en: 2, es: 3 });
  });

  it('наборы выбранного языка; языка без наборов → пусто, а не чужие', () => {
    expect(decksForLanguage(byLanguage, 'es')).toEqual(['saved', 'custom', 'pack:b']);
    expect(decksForLanguage(byLanguage, 'de')).toEqual([]);
  });

  it('смена языка сбрасывает выбор: остаются только наборы, видимые в новом списке', () => {
    expect(reconcileSelectedDeckIds(['pack:a', 'saved'], ['saved', 'custom'])).toEqual(['saved']);
    expect(reconcileSelectedDeckIds(['pack:a'], ['pack:b'])).toEqual([]);
  });
});

describe('fc_lang_filter: язык тренировки из маршрута (условие координатора: проверка target)', () => {
  it('параметр читается из строки и массива; пустое → нет параметра', () => {
    expect(readTargetParam('es')).toBe('es');
    expect(readTargetParam(['fr', 'de'])).toBe('fr');
    expect(readTargetParam('  ')).toBeNull();
    expect(readTargetParam(undefined)).toBeNull();
    expect(readTargetParam(5)).toBeNull();
  });

  it('нет параметра → язык приложения без отказа', () => {
    expect(resolveTrainingTarget(undefined, 'en')).toEqual({ target: 'en', source: 'app' });
  });

  it('готовый язык принимается: язык наборов вместо языка приложения', () => {
    expect(resolveTrainingTarget('es', 'en')).toEqual({ target: 'es', source: 'route' });
    expect(trainingTargetFromParams('it', 'en')).toBe('it');
  });

  it('мусор и чужой регистр не принимаются → откат на язык приложения с причиной', () => {
    expect(resolveTrainingTarget('xx', 'en')).toMatchObject({ target: 'en', source: 'app', rejected: 'not_a_language' });
    expect(resolveTrainingTarget('ES', 'de')).toMatchObject({ target: 'de', rejected: 'not_a_language' });
    expect(resolveTrainingTarget('none', 'fr')).toMatchObject({ target: 'fr', rejected: 'not_a_language' });
  });

  it('откат пишет причину в лог [FC-LANG-FILTER] target_rejected (один раз на исход)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(trainingTargetFromParams('klingon', 'en')).toBe('en');
      expect(trainingTargetFromParams('klingon', 'en')).toBe('en');
      const lines = warn.mock.calls.map((call) => String(call[0]));
      const matches = lines.filter((line) => line.includes('[FC-LANG-FILTER] target_rejected'));
      expect(matches).toHaveLength(1);
      expect(matches[0]).toContain('not_a_language');
      expect(matches[0]).toContain('klingon');
    } finally {
      warn.mockRestore();
    }
  });
});

describe('fc_lang_filter: параметр маршрута запуска', () => {
  it('для языка приложения маршрут не меняется (старые ссылки и тесты живы)', () => {
    expect(trainingTargetRouteParam('en', 'en')).toBeUndefined();
  });

  it('для другого готового языка — параметр target', () => {
    expect(trainingTargetRouteParam('es', 'en')).toBe('es');
  });

  it('все четыре режима несут target и не теряют прежние параметры', () => {
    expect(buildCardsTrainingRoute('blitz', ['saved'], undefined, { sec: '90', target: 'es' })?.params)
      .toEqual({ deck: 'saved', sec: '90', target: 'es' });
    expect(buildCardsTrainingRoute('speaking', ['saved'], '10', { target: 'es' })?.params)
      .toEqual({ deck: 'saved', size: '10', target: 'es' });
    expect(buildCardsTrainingRoute('recall', ['saved'], '20', { dir: 'to_source', target: 'fr' })?.params)
      .toEqual({ deck: 'saved', size: '20', dir: 'to_source', target: 'fr' });
    expect(buildCardsTrainingRoute('truefalse', ['saved'], '10', { target: 'de' })?.params)
      .toEqual({ deck: 'saved', quick: '1', size: '10', target: 'de' });
  });

  it('без target маршрут прежний (параметра нет вовсе)', () => {
    for (const mode of ['blitz', 'speaking', 'truefalse', 'recall'] as const) {
      expect(Object.keys(buildCardsTrainingRoute(mode, ['saved'])!.params)).not.toContain('target');
    }
  });
});
