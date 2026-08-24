import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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

  it('counts planned sourceLocales maps as locale coverage for structured copy objects', () => {
    const result = analyzeUiLocaleSource(
      'app/community_pack_create.tsx',
      `
        const row = {
          ru: 'Привет',
          uk: 'Привіт',
          es: 'Hola',
          sourceLocales: {
            'pt-BR': 'Olá',
            vi: 'Xin chào',
            id: 'Halo',
            tr: 'Merhaba',
            pl: 'Cześć',
          },
        };
      `,
    );

    expect(result.findings).toEqual([]);
  });

  it('counts ptBR helper seed aliases as pt-BR coverage outside triLang copy objects', () => {
    const result = analyzeUiLocaleSource(
      'app/vip_survey_content.ts',
      `
        const copy = loc({
          ru: 'RU',
          uk: 'UK',
          es: 'ES',
          ptBR: 'PT',
          vi: 'VI',
          id: 'ID',
          tr: 'TR',
          pl: 'PL',
        });
      `,
    );

    expect(result.localeObjectFindings).toBe(0);
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

  it('flags dynamic triLang copy objects for LLM official-source review', () => {
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

  it('proves local const identifiers, maps, and arrays with complete triLang copy', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const DIRECT = {
          ru: 'RU',
          uk: 'UK',
          es: 'ES',
          'pt-BR': 'PT',
          vi: 'VI',
          id: 'ID',
          tr: 'TR',
          pl: 'PL',
        };
        const MAP = {
          first: DIRECT,
          second: {
            ru: 'RU2',
            uk: 'UK2',
            es: 'ES2',
            'pt-BR': 'PT2',
            vi: 'VI2',
            id: 'ID2',
            tr: 'TR2',
            pl: 'PL2',
          },
        };
        const LIST = [DIRECT, MAP.second] as const;
        const title = triLang(lang, DIRECT);
        const mapTitle = triLang(lang, MAP[kind]);
        const listTitle = triLang(lang, LIST[index]);
      `,
    );

    expect(result.triLangCalls).toBe(3);
    expect(result.staticTriLangCalls).toBe(3);
    expect(result.dynamicTriLangCalls).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it('keeps dynamic triLang warnings when a local map has incomplete copy candidates', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const MAP = {
          ok: {
            ru: 'RU',
            uk: 'UK',
            es: 'ES',
            'pt-BR': 'PT',
            vi: 'VI',
            id: 'ID',
            tr: 'TR',
            pl: 'PL',
          },
          missing: { ru: 'RU', uk: 'UK', es: 'ES' },
        };
        const title = triLang(lang, MAP[kind]);
      `,
    );

    expect(result.dynamicTriLangCalls).toBe(1);
    expect(result.findings.some((finding) => finding.code === 'dynamic-trilang-copy')).toBe(true);
  });

  it('proves property access after selecting a local const map candidate', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const DATA = {
          first: {
            title: {
              ru: 'RU',
              uk: 'UK',
              es: 'ES',
              'pt-BR': 'PT',
              vi: 'VI',
              id: 'ID',
              tr: 'TR',
              pl: 'PL',
            },
          },
          second: {
            title: {
              ru: 'RU2',
              uk: 'UK2',
              es: 'ES2',
              'pt-BR': 'PT2',
              vi: 'VI2',
              id: 'ID2',
              tr: 'TR2',
              pl: 'PL2',
            },
          },
        };
        const picked = DATA[kind];
        const title = triLang(lang, picked.title);
      `,
    );

    expect(result.staticTriLangCalls).toBe(1);
    expect(result.dynamicTriLangCalls).toBe(0);
    expect(result.findings).toEqual([]);
  });

  it('proves nullish fallback expressions only when both copy branches are complete', () => {
    const complete = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const MAP = {
          first: {
            ru: 'RU',
            uk: 'UK',
            es: 'ES',
            'pt-BR': 'PT',
            vi: 'VI',
            id: 'ID',
            tr: 'TR',
            pl: 'PL',
          },
          other: {
            ru: 'RU2',
            uk: 'UK2',
            es: 'ES2',
            'pt-BR': 'PT2',
            vi: 'VI2',
            id: 'ID2',
            tr: 'TR2',
            pl: 'PL2',
          },
        };
        const copy = MAP[kind] ?? MAP.other;
        const title = triLang(lang, copy);
      `,
    );
    expect(complete.staticTriLangCalls).toBe(1);
    expect(complete.dynamicTriLangCalls).toBe(0);
    expect(complete.findings).toEqual([]);

    const incomplete = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        const MAP = {
          first: {
            ru: 'RU',
            uk: 'UK',
            es: 'ES',
            'pt-BR': 'PT',
            vi: 'VI',
            id: 'ID',
            tr: 'TR',
            pl: 'PL',
          },
          other: { ru: 'RU2', uk: 'UK2', es: 'ES2' },
        };
        const copy = MAP[kind] ?? MAP.other;
        const title = triLang(lang, copy);
      `,
    );
    expect(incomplete.staticTriLangCalls).toBe(0);
    expect(incomplete.dynamicTriLangCalls).toBe(1);
  });

  it('proves imported const copy maps only when every candidate is complete', () => {
    const fixtureRoot = join(process.cwd(), '.codex-tmp', 'heisenberg-ui-audit-test');
    mkdirSync(fixtureRoot, { recursive: true });
    writeFileSync(
      join(fixtureRoot, 'imported_copy.ts'),
      `
        export const DIRECT = {
          ru: 'RU',
          uk: 'UK',
          es: 'ES',
          'pt-BR': 'PT',
          vi: 'VI',
          id: 'ID',
          tr: 'TR',
          pl: 'PL',
        } as const;
        export const MAP = {
          first: DIRECT,
          second: {
            ru: 'RU2',
            uk: 'UK2',
            es: 'ES2',
            'pt-BR': 'PT2',
            vi: 'VI2',
            id: 'ID2',
            tr: 'TR2',
            pl: 'PL2',
          },
        } as const;
        export const BAD_MAP = {
          ok: DIRECT,
          missing: { ru: 'RU', uk: 'UK', es: 'ES' },
        } as const;
      `,
      'utf8',
    );

    const complete = analyzeUiLocaleSource(
      '.codex-tmp/heisenberg-ui-audit-test/Sample.tsx',
      `
        import { DIRECT, MAP } from './imported_copy';
        const title = triLang(lang, DIRECT);
        const mapTitle = triLang(lang, MAP[kind]);
      `,
    );
    expect(complete.staticTriLangCalls).toBe(2);
    expect(complete.dynamicTriLangCalls).toBe(0);
    expect(complete.findings).toEqual([]);

    const incomplete = analyzeUiLocaleSource(
      '.codex-tmp/heisenberg-ui-audit-test/Sample.tsx',
      `
        import { BAD_MAP } from './imported_copy';
        const mapTitle = triLang(lang, BAD_MAP[kind]);
      `,
    );
    expect(incomplete.staticTriLangCalls).toBe(0);
    expect(incomplete.dynamicTriLangCalls).toBe(1);
    expect(incomplete.findings.some((finding) => finding.code === 'dynamic-trilang-copy')).toBe(true);
  });

  it('proves local helper parameters typed as complete language records', () => {
    const result = analyzeUiLocaleSource(
      'components/Sample.tsx',
      `
        type CompareCell = Record<Lang, string>;
        const pick = (d: CompareCell) => triLang(lang, d);
      `,
    );

    expect(result.staticTriLangCalls).toBe(1);
    expect(result.dynamicTriLangCalls).toBe(0);
    expect(result.findings).toEqual([]);
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

  it('keeps lesson hint titles explicit for every planned interface locale', () => {
    const source = readFileSync(join(__dirname, '../app/hint.tsx'), 'utf8');
    const hintBody = source.slice(source.indexOf('const HINTS:'));
    const lessonCount = (hintBody.match(/titleRU:/g) || []).length;

    expect(lessonCount).toBeGreaterThanOrEqual(32);
    for (const field of ['titlePtBr', 'titleVi', 'titleId', 'titleTr', 'titlePl']) {
      expect((hintBody.match(new RegExp(`${field}:`, 'g')) || []).length).toBe(lessonCount);
    }
    expect(hintBody).not.toContain('HINT_TITLE_PLANNED');
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

  it('does not flag TriText helper seed objects as learner-facing locale copy', () => {
    const result = analyzeUiLocaleSource(
      'app/diagnosis_training_sample.ts',
      `
        import type { TriText } from './diagnosis_training_types';
        const tri = (ru: string, uk: string, es: string): TriText => {
          const copy: TriText = { ru, uk, es };
          return copy;
        };
      `,
    );

    expect(result.findings.some((finding) => finding.code === 'locale-object-missing-all-planned-locales')).toBe(false);
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

  /* Quiz payload locale coverage was retired with the Quiz/Arena surface.
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

  */
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
