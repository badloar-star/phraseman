// зачем (владелец 25.10, «Мастерская фраз»: теория в составе; координатор от Learning V2): теория — страницы вступления занятия V2
// (Смысл / Схема / Ловушка), только ru/uk. Чистый разбор держим тестом на настоящем intro.json урока 1 занятия 1 и на мусоре.
import { phraseWorkshopTheoryLocale, parsePhraseWorkshopTheoryPages } from '../app/phrase_workshop_theory_v1';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const realIntro = require('../modules/learning-v2/content/factory_native/generated_release/en/l01/s01/intro.json') as unknown;

describe('мастерская фраз: теория из вступления занятия', () => {
  it('теория есть только на ru и uk', () => {
    expect(phraseWorkshopTheoryLocale('ru')).toBe('ru');
    expect(phraseWorkshopTheoryLocale('uk')).toBe('uk');
    for (const lang of ['en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', '']) expect(phraseWorkshopTheoryLocale(lang)).toBeNull();
  });

  it('настоящее вступление: страницы известных видов с текстом на обоих языках', () => {
    for (const locale of ['ru', 'uk'] as const) {
      const pages = parsePhraseWorkshopTheoryPages(realIntro, locale);
      expect(pages.length).toBeGreaterThanOrEqual(1);
      for (const page of pages) {
        expect(['concept', 'formula', 'trap']).toContain(page.kind);
        expect(page.body.length).toBeGreaterThan(0);
        expect(page.pageId).toMatch(/^en:lesson-01:session-01:intro[123]$/);
      }
    }
  });

  it('мусор и неизвестные виды отбрасываются без падения', () => {
    expect(parsePhraseWorkshopTheoryPages(null, 'ru')).toEqual([]);
    expect(parsePhraseWorkshopTheoryPages({ pages: 'x' }, 'ru')).toEqual([]);
    const raw = {
      pages: [
        { kind: 'concept', titleByLocale: { ru: ' Смысл ' }, bodyByLocale: { ru: ' Текст ' } },
        { kind: 'weird', titleByLocale: { ru: 'x' }, bodyByLocale: { ru: 'y' } },
        { kind: 'trap', titleByLocale: { ru: 'z' }, bodyByLocale: { uk: 'тільки uk' } },
        null,
      ],
    };
    expect(parsePhraseWorkshopTheoryPages(raw, 'ru')).toEqual([{ kind: 'concept', pageId: '', title: 'Смысл', body: 'Текст' }]);
    // для uk остаётся только страница, у которой есть украинский текст (заголовок может быть пустым)
    expect(parsePhraseWorkshopTheoryPages(raw, 'uk')).toEqual([{ kind: 'trap', pageId: '', title: '', body: 'тільки uk' }]);
  });
});
