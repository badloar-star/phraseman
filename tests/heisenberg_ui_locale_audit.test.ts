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
