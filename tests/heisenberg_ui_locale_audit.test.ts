import {
  analyzeUiBundleSource,
  analyzeUiLocaleSource,
  PLANNED_UI_LOCALES,
} from '../scripts/heisenberg_ui_locale_audit';

describe('heisenberg UI locale audit', () => {
  it('detects static triLang calls that are missing planned interface locales', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const title = triLang(lang, {
          ru: 'Привет',
          uk: 'Привіт',
          es: 'Hola',
        });
      `,
    );

    expect(result.triLangCalls).toBe(1);
    expect(result.staticTriLangCalls).toBe(1);
    expect(result.dynamicTriLangCalls).toBe(0);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      code: 'trilang-missing-all-planned-locales',
      missing: PLANNED_UI_LOCALES,
    });
  });

  it('does not flag a triLang object when all planned locales are present', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const title = triLang(lang, {
          ru: 'Фраза дня',
          uk: 'Фраза дня',
          es: 'Frase del día',
          'pt-BR': 'Frase do dia',
          vi: 'Cụm từ trong ngày',
          id: 'Frasa hari ini',
          tr: 'Günün ifadesi',
          pl: 'Fraza dnia',
        });
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('detects corrupted planned-locale strings inside locale maps', () => {
    const result = analyzeUiLocaleSource(
      'app/Sample.tsx',
      `
        const title = triLang(lang, {
          ru: 'Арена',
          uk: 'Арена',
          es: 'Arena',
          'pt-BR': 'Revis?o',
          vi: 'Ng??i ch?i',
          id: 'Pemain',
          tr: 'S?ralamal?',
          pl: 'Powtórka',
        });
      `,
    );

    expect(result.findings.filter((finding) => finding.code === 'locale-string-mojibake')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyPath: 'pt-BR' }),
        expect.objectContaining({ keyPath: 'vi' }),
        expect.objectContaining({ keyPath: 'tr' }),
      ]),
    );
  });

  it('does not treat Indonesian id fields as locale text outside locale maps', () => {
    const result = analyzeUiLocaleSource(
      'app/Sample.tsx',
      `
        const row = {
          id: 'broken?id',
          title: 'Plain object',
        };
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('flags dynamic triLang copy objects for manual review', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const copy = { ru: 'Да', uk: 'Так', es: 'Sí' };
        const title = triLang(lang, copy);
      `,
    );

    expect(result.dynamicTriLangCalls).toBe(1);
    expect(result.findings.some((finding) => finding.code === 'dynamic-trilang-copy')).toBe(true);
    expect(result.findings.some((finding) => finding.code === 'locale-object-missing-all-planned-locales')).toBe(true);
  });

  it('detects legacy L(lang, ru, uk, es) helpers that bypass planned locales', () => {
    const result = analyzeUiLocaleSource(
      'app/hint.tsx',
      `
        const label = L(lang, 'Конструкция', 'Конструкція', 'Estructura');
      `,
    );

    expect(result.legacyLangHelperCalls).toBe(1);
    expect(result.findings[0]).toMatchObject({
      code: 'legacy-lang-helper-missing-planned-locales',
      missing: PLANNED_UI_LOCALES,
    });
  });

  it('detects local triLang helper calls that only pass ru, uk, es', () => {
    const result = analyzeUiLocaleSource(
      'app/premium_modal.tsx',
      `
        const L = (ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es });
        const title = L('Премиум', 'Преміум', 'Premium');
      `,
    );

    expect(result.legacyLangHelperCalls).toBe(1);
    expect(result.findings.some((finding) => finding.code === 'local-trilang-helper-missing-planned-locales')).toBe(true);
  });

  it('detects direct ru/uk/es locale objects outside triLang helpers', () => {
    const result = analyzeUiLocaleSource(
      'admin/personal-trainings.js',
      `
        const block = {
          title: {
            ru: 'Вопросы',
            uk: 'Питання',
            es: 'Preguntas',
          },
        };
      `,
    );

    expect(result.localeObjectFindings).toBe(1);
    expect(result.findings[0]).toMatchObject({
      code: 'locale-object-missing-all-planned-locales',
      missing: PLANNED_UI_LOCALES,
    });
  });

  it('does not flag preposition explanation rule objects covered by planned runtime fallback', () => {
    const result = analyzeUiLocaleSource(
      'app/preposition_explanations.ts',
      `
        const phraseRules = [
          {
            preposition: 'on',
            matches: [/\\bon time\\b/],
            explain: {
              ru: '"On time" значит "вовремя".',
              uk: '"On time" означає "вчасно".',
              es: '"On time" significa "a tiempo".',
            },
          },
        ];
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('does not flag lesson word rows covered by the central source-locale gloss map', () => {
    const result = analyzeUiLocaleSource(
      'app/lesson_words.tsx',
      `
        const WORDS_BY_LESSON = {
          1: [
            { en: 'ready', ru: 'Готовый', uk: 'Готовий', es: 'listo', pos: 'adjectives' },
          ],
        };
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('does not flag lesson word rows covered by a pos-specific source-locale gloss map key', () => {
    const result = analyzeUiLocaleSource(
      'app/lesson_words.tsx',
      `
        const WORDS_BY_LESSON = {
          1: [
            { en: 'like', ru: 'Нравиться / Любить', uk: 'Подобатися / Любити', es: 'gustar / querer', pos: 'verbs' },
          ],
        };
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('still flags lesson word rows that are not covered inline or by the source-locale gloss map', () => {
    const result = analyzeUiLocaleSource(
      'app/lesson_words.tsx',
      `
        const WORDS_BY_LESSON = {
          1: [
            { en: 'uncovered-test-word', ru: 'Тест', uk: 'Тест', es: 'prueba', pos: 'nouns' },
          ],
        };
      `,
    );

    expect(result.findings.some((finding) => finding.code === 'locale-object-missing-all-planned-locales')).toBe(true);
  });

  it('does not flag quiz rows covered by structured source-locale payloads', () => {
    const result = analyzeUiLocaleSource(
      'app/quiz_data.ts',
      `
        const EASY_POOL = [
          {
            ru: 'Я хочу пить',
            uk: 'Я хочу пити',
            es: 'Quiero beber',
            choices: ['I want to drink.', 'I want drink.', 'I want to drunk.', 'I want drinking.'],
          },
        ];
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('still flags quiz rows that are not covered by structured source-locale payloads', () => {
    const result = analyzeUiLocaleSource(
      'app/quiz_data.ts',
      `
        const EASY_POOL = [
          {
            ru: 'Тестовая строка без покрытия',
            uk: 'Тестовий рядок без покриття',
            es: 'Línea de prueba sin cobertura',
            choices: ['A', 'B', 'C', 'D'],
          },
        ];
      `,
    );

    expect(result.findings.some((finding) => finding.code === 'locale-object-missing-all-planned-locales')).toBe(true);
  });

  it('detects missing top-level constants/i18n bundles', () => {
    const findings = analyzeUiBundleSource(
      'constants/i18n.ts',
      `
        export const T = {
          ru: { tabSettings: 'Настройки' },
          uk: { tabSettings: 'Налаштування' },
          es: { tabSettings: 'Ajustes' },
        };
      `,
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      code: 'i18n-t-bundle-missing-planned-locales',
      missing: PLANNED_UI_LOCALES,
    });
  });

  it('detects missing LangContext runtime string bundles', () => {
    const findings = analyzeUiBundleSource(
      'components/LangContext.tsx',
      `
        const RU = {};
        const UK = {};
        const ES = {};
        const PT_BR = {};
      `,
    );

    expect(findings.map((finding) => finding.missing?.[0]).sort()).toEqual(['id', 'pl', 'tr', 'vi']);
  });
});
