import {
  ACTIVE_INTERFACE_SOURCE_LOCALES as APP_ACTIVE_INTERFACE_SOURCE_LOCALES,
  HEISENBERG_BATCH_SOURCE_LOCALES as APP_BATCH_SOURCE_LOCALES,
  PLANNED_INTERFACE_SOURCE_LOCALES as APP_PLANNED_INTERFACE_SOURCE_LOCALES,
  REGISTERED_INTERFACE_SOURCE_LOCALES as APP_REGISTERED_INTERFACE_SOURCE_LOCALES,
} from '../app/source_locales';

declare const require: any;

const core = require('../scripts/lib/heisenberg_core.cjs');

describe('heisenberg localization pipeline core', () => {
  it('normalizes BCP 47 locale tags', () => {
    expect(core.normalizeLocale('fr-fr')).toBe('fr-FR');
    expect(core.localeSlug('pt-BR')).toBe('pt-br');
  });

  it('keeps Heisenberg batch locales in sync with the app source-locale registry', () => {
    expect(core.HEISENBERG_BATCH_SOURCE_LOCALES).toEqual(APP_BATCH_SOURCE_LOCALES);
    expect(core.ACTIVE_APP_LOCALES).toEqual(APP_ACTIVE_INTERFACE_SOURCE_LOCALES);
    expect(core.PLANNED_APP_LOCALES).toEqual(APP_PLANNED_INTERFACE_SOURCE_LOCALES);
    expect(core.REGISTERED_INTERFACE_SOURCE_LOCALES).toEqual(APP_REGISTERED_INTERFACE_SOURCE_LOCALES);
    expect(core.STRUCTURED_BATCH_SOURCE_LOCALES).toEqual(['pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(core.STRUCTURED_BATCH_COVERAGE_CONTRACTS.length).toBe((121 + 100) * 5);
    expect(core.DAILY_PHRASE_SOURCE_LOCALE_COVERAGE_CONTRACTS.length).toBe(176 * 3);
    expect(core.DAILY_PHRASE_ES_COVERAGE_CONTRACTS.length).toBe(176 * 3);
    expect(core.DAILY_PHRASE_BATCH_COVERAGE_CONTRACTS.length).toBe(176 * 3 * 2);
    expect(core.IRREGULAR_VERB_BATCH_COVERAGE_CONTRACTS.length).toBe(core.IRREGULAR_VERB_BASES.length);
    expect(core.STRUCTURED_BATCH_COVERAGE_CONTRACTS[0].locales).toEqual(['pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(core.DAILY_PHRASE_SOURCE_LOCALE_COVERAGE_CONTRACTS[0].locales).toEqual(['pt-BR', 'vi', 'id', 'tr', 'pl']);
    expect(core.DAILY_PHRASE_ES_COVERAGE_CONTRACTS[0]).toEqual(expect.objectContaining({
      file: 'app/idioms_data.ts',
      surface: 'daily-phrase',
      keyPath: 'id:11.literal_<locale>',
      locales: ['es'],
    }));
    expect(core.IRREGULAR_VERB_BATCH_COVERAGE_CONTRACTS).toContainEqual(expect.objectContaining({
      file: 'app/irregular_verbs_data.ts',
      surface: 'app-other',
      keyPath: 'break.<locale>',
      locales: core.HEISENBERG_BATCH_SOURCE_LOCALES,
    }));
    expect(core.BATCH_COVERAGE_CONTRACTS.length).toBe(((121 + 100) * 5) + (176 * 3 * 2) + core.IRREGULAR_VERB_BASES.length);
  });

  it('classifies important repo surfaces', () => {
    expect(core.classifySurface('app/lesson_data_1_8.ts')).toBe('lessons');
    expect(core.classifySurface('app/quiz_data.ts')).toBe('quizzes');
    expect(core.classifySurface('app/idioms_data.ts')).toBe('daily-phrase');
    expect(core.classifySurface('admin/personal-trainings.js')).toBe('personal-training');
    expect(core.classifySurface('knowly-www/index.html')).toBe('public-web');
    expect(core.classifySurface('exports/lesson-theory-dump/lesson_theory_help.json')).toBe('docs');
  });

  it('does not re-scan generated Heisenberg outputs', () => {
    expect(core.shouldSkipRelative('docs/heisenberg/es/manifest.json')).toBe(true);
    expect(core.shouldSkipRelative('docs/HEISENBERG_LOCALIZATION_PIPELINE.md')).toBe(false);
    expect(core.shouldSkipRelative('.claude/settings.local.json')).toBe(true);
  });

  it('infers locales from existing field contracts', () => {
    expect(core.inferLocaleFromKey('titleRU')).toBe('ru');
    expect(core.inferLocaleFromKey('messageUk')).toBe('uk');
    expect(core.inferLocaleFromKey('titleEs')).toBe('es');
    expect(core.inferLocaleFromKey('spanish')).toBe('es');
    expect(core.isExplicitLocaleKey('explanationsES')).toBe(true);
    expect(core.isExplicitLocaleKey('literal_es')).toBe(true);
  });

  it('extracts locale-pack and localized-field strings from TS source', () => {
    const text = `
      const RU = { tabs: { home: 'Home RU' }, features: ['One RU'], count: (n) => \`\${n} things RU\` };
      const ES = { tabs: { home: 'Inicio' } };
      export const row = {
        titleRU: 'Title RU',
        titleUK: 'Title UK',
        titleES: 'Title ES',
        titleEs: 'Camel ES',
        explanations: ['Correct RU'],
        explanationsES: ['Correct ES']
      };
    `;
    const items = core.extractLocalizedItemsFromText('components/LangContext.tsx', text);
    const ids = items.map((item: any) => `${item.locale}:${item.keyPath}:${item.text}`);

    expect(ids).toContain('ru:RU.tabs.home:Home RU');
    expect(ids).toContain('ru:RU.features[0]:One RU');
    expect(ids.some((id: string) => id.includes('ru:RU.count:(n) =>'))).toBe(true);
    expect(ids).toContain('es:ES.tabs.home:Inicio');
    expect(ids).toContain('ru:titleRU:Title RU');
    expect(ids).toContain('uk:titleUK:Title UK');
    expect(ids).toContain('es:titleES:Title ES');
    expect(ids).toContain('es:titleEs:Camel ES');
    expect(ids).toContain('ru:explanations[0]:Correct RU');
    expect(ids).toContain('es:explanationsES[0]:Correct ES');
  });

  it('extracts structured batch locale payloads with item-level key paths', () => {
    const text = `
      const p = (prompt: string, explanations: [string, string, string, string]) => ({ prompt, explanations });
      export const QUIZ_SOURCE_LOCALE_PAYLOADS = {
        hard: {
          91: {
            'pt-BR': p('PT prompt', ['PT A', 'PT B', 'PT C', 'PT D']),
            vi: { prompt: 'VI prompt', explanations: ['VI A', 'VI B', 'VI C', 'VI D'] },
          },
        },
      };
    `;
    const items = core.extractLocalizedItemsFromText('app/quiz_source_locale_payloads.ts', text);
    const ids = items.map((item: any) => `${item.locale}:${item.keyPath}:${item.text}`);

    expect(ids).toContain('pt-BR:hard.91.pt-BR.prompt:PT prompt');
    expect(ids).toContain('pt-BR:hard.91.pt-BR.explanations[0]:PT A');
    expect(ids).toContain('vi:hard.91.vi.prompt:VI prompt');
  });

  it('extracts planned UI locale bundles while keeping ordinary id fields unambiguous', () => {
    const text = `
      export const T = {
        'pt-BR': { allLearned: 'PT done' },
        vi: { allLearned: 'VI done' },
        id: { allLearned: 'ID done' },
        tr: { allLearned: 'TR done' },
        pl: { allLearned: 'PL done' },
      };
      const PT_BR = { tabs: { home: 'PT home' } };
      const ID = { tabs: { home: 'ID home' } };
      const row = { id: 'not locale', title: 'plain title' };
    `;
    const items = core.extractLocalizedItemsFromText('constants/i18n.ts', text);
    const ids = items.map((item: any) => `${item.locale}:${item.keyPath}:${item.text}`);

    expect(ids).toContain('pt-BR:pt-BR.allLearned:PT done');
    expect(ids).toContain('id:id.allLearned:ID done');
    expect(ids).toContain('pt-BR:PT_BR.tabs.home:PT home');
    expect(ids).toContain('id:ID.tabs.home:ID home');
    expect(ids.some((id: string) => id.includes('not locale'))).toBe(false);
  });

  it('extracts Daily Phrase sourceLocales with stable idiom id key paths', () => {
    const text = `
      export const IDIOMS = [
        {
          id: 11,
          english: 'Break a leg',
          sourceLocales: {
            'pt-BR': { literal: 'PT literal', meaning: 'PT meaning', text: 'PT text' },
            id: { literal: 'ID literal', meaning: 'ID meaning', text: 'ID text' },
          },
        },
      ];
    `;
    const items = core.extractLocalizedItemsFromText('app/idioms_data.ts', text);
    const ids = items.map((item: any) => `${item.locale}:${item.keyPath}:${item.text}`);

    expect(ids).toContain('pt-BR:id:11.sourceLocales.pt-BR.literal:PT literal');
    expect(ids).toContain('pt-BR:id:11.sourceLocales.pt-BR.meaning:PT meaning');
    expect(ids).toContain('id:id:11.sourceLocales.id.text:ID text');
  });

  it('extracts direct irregular-verb source locale maps without treating ordinary id as a locale', () => {
    const text = `
      export const IRREGULAR_VERB_SOURCE_LOCALES = {
        break: {
          es: 'Romper',
          'pt-BR': 'Quebrar',
          vi: 'Làm vỡ',
          id: 'Memecahkan',
          tr: 'Kırmak',
          pl: 'Łamać',
        },
      };
      export const row = { id: 'plain id', title: 'Plain title' };
    `;
    const items = core.extractLocalizedItemsFromText('app/irregular_verbs_data.ts', text);
    const ids = items.map((item: any) => `${item.locale}:${item.keyPath}:${item.text}`);

    expect(ids).toContain('es:break.es:Romper');
    expect(ids).toContain('pt-BR:break.pt-BR:Quebrar');
    expect(ids).toContain('vi:break.vi:Làm vỡ');
    expect(ids).toContain('id:break.id:Memecahkan');
    expect(ids).toContain('tr:break.tr:Kırmak');
    expect(ids).toContain('pl:break.pl:Łamać');
    expect(ids.some((id: string) => id.includes('plain id'))).toBe(false);
  });

  it('reports partial structured batch locale coverage by unit', () => {
    const inventory = {
      totals: { filesScanned: 1, localizedItems: 3, byLocale: { 'pt-BR': 2, vi: 1 }, bySurface: { quizzes: 1 } },
      files: [{ file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', localizedItems: 3, markers: {} }],
      items: [
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'pt-BR', keyPath: 'hard.91.pt-BR.prompt', line: 1, text: 'PT' },
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'vi', keyPath: 'hard.91.vi.prompt', line: 2, text: 'VI' },
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'pt-BR', keyPath: 'hard.92.pt-BR.prompt', line: 3, text: 'PT only' },
      ],
    };

    const report = core.buildBatchLocaleCoverageAudit(inventory, ['pt-BR', 'vi'], { expectedUnits: false });

    expect(report.summary.partialUnits).toBe(1);
    expect(report.summary.missingByLocale.vi).toBe(1);
    expect(report.partialUnits[0]).toMatchObject({
      file: 'app/quiz_source_locale_payloads.ts',
      keyPath: 'hard.92.<locale>.prompt',
      present: ['pt-BR'],
      missing: ['vi'],
    });
  });

  it('does not confuse verbs.tr translation fields with the Turkish locale code', () => {
    const inventory = {
      totals: { filesScanned: 1, localizedItems: 2, byLocale: { 'pt-BR': 1, tr: 1 }, bySurface: { 'ui-locale': 1 } },
      files: [{ file: 'components/LangContext.tsx', surface: 'ui-locale', localizedItems: 2, markers: {} }],
      items: [
        { file: 'components/LangContext.tsx', surface: 'ui-locale', locale: 'pt-BR', keyPath: 'PT_BR.verbs.tr', line: 1, text: 'Tradução' },
        { file: 'components/LangContext.tsx', surface: 'ui-locale', locale: 'tr', keyPath: 'TR.verbs.tr', line: 2, text: 'Çeviri' },
      ],
    };

    const report = core.buildBatchLocaleCoverageAudit(inventory, ['pt-BR', 'tr'], { expectedUnits: false });

    expect(report.summary.partialUnits).toBe(0);
    expect(report.summary.completeUnits).toBe(1);
  });

  it('reports structured units missing from every batch locale', () => {
    const inventory = {
      totals: { filesScanned: 1, localizedItems: 2, byLocale: { 'pt-BR': 1, vi: 1 }, bySurface: { quizzes: 1 } },
      files: [{ file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', localizedItems: 2, markers: {} }],
      items: [
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'pt-BR', keyPath: 'hard.91.pt-BR.prompt', line: 1, text: 'PT' },
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'vi', keyPath: 'hard.91.vi.prompt', line: 2, text: 'VI' },
      ],
    };

    const report = core.buildBatchLocaleCoverageAudit(inventory, ['pt-BR', 'vi'], {
      expectedUnits: [
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', keyPath: 'hard.91.<locale>.prompt' },
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', keyPath: 'hard.92.<locale>.prompt' },
      ],
    });

    expect(report.summary.expectedUnits).toBe(2);
    expect(report.summary.partialUnits).toBe(0);
    expect(report.summary.missingAllLocaleUnits).toBe(1);
    expect(report.summary.missingAllByLocale['pt-BR']).toBe(1);
    expect(report.summary.missingAllByLocale.vi).toBe(1);
    expect(report.missingAllLocaleUnits[0]).toMatchObject({
      file: 'app/quiz_source_locale_payloads.ts',
      keyPath: 'hard.92.<locale>.prompt',
      present: [],
      missing: ['pt-BR', 'vi'],
    });
  });

  it('reports Daily Phrase units missing from every batch locale', () => {
    const inventory = {
      totals: { filesScanned: 1, localizedItems: 2, byLocale: { 'pt-BR': 1, vi: 1 }, bySurface: { 'daily-phrase': 1 } },
      files: [{ file: 'app/idioms_data.ts', surface: 'daily-phrase', localizedItems: 2, markers: {} }],
      items: [
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', locale: 'pt-BR', keyPath: 'id:11.sourceLocales.pt-BR.literal', line: 1, text: 'PT' },
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', locale: 'vi', keyPath: 'id:11.sourceLocales.vi.literal', line: 2, text: 'VI' },
      ],
    };

    const report = core.buildBatchLocaleCoverageAudit(inventory, ['pt-BR', 'vi'], {
      expectedUnits: [
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', keyPath: 'id:11.sourceLocales.<locale>.literal' },
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', keyPath: 'id:11.sourceLocales.<locale>.meaning' },
      ],
    });

    expect(report.summary.partialUnits).toBe(0);
    expect(report.summary.missingAllLocaleUnits).toBe(1);
    expect(report.missingAllLocaleUnits[0]).toMatchObject({
      file: 'app/idioms_data.ts',
      surface: 'daily-phrase',
      keyPath: 'id:11.sourceLocales.<locale>.meaning',
      present: [],
      missing: ['pt-BR', 'vi'],
    });
  });

  it('allows expected coverage contracts to require Spanish only where the unit owns Spanish copy', () => {
    const inventory = {
      totals: { filesScanned: 2, localizedItems: 7, byLocale: { es: 1, 'pt-BR': 3, vi: 3 }, bySurface: { quizzes: 2 } },
      files: [
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', localizedItems: 6, markers: {} },
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', localizedItems: 1, markers: {} },
      ],
      items: [
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'pt-BR', keyPath: 'hard.91.pt-BR.prompt', line: 1, text: 'PT' },
        { file: 'app/quiz_source_locale_payloads.ts', surface: 'quizzes', locale: 'vi', keyPath: 'hard.91.vi.prompt', line: 2, text: 'VI' },
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', locale: 'es', keyPath: 'id:11.sourceLocales.es.literal', line: 3, text: 'ES' },
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', locale: 'pt-BR', keyPath: 'id:11.sourceLocales.pt-BR.literal', line: 4, text: 'PT' },
        { file: 'app/idioms_data.ts', surface: 'daily-phrase', locale: 'vi', keyPath: 'id:11.sourceLocales.vi.literal', line: 5, text: 'VI' },
      ],
    };

    const report = core.buildBatchLocaleCoverageAudit(inventory, ['pt-BR', 'vi'], {
      expectedUnits: [
        {
          file: 'app/quiz_source_locale_payloads.ts',
          surface: 'quizzes',
          keyPath: 'hard.91.<locale>.prompt',
          locales: ['pt-BR', 'vi'],
        },
        {
          file: 'app/idioms_data.ts',
          surface: 'daily-phrase',
          keyPath: 'id:11.sourceLocales.<locale>.literal',
          locales: ['es', 'pt-BR', 'vi'],
        },
      ],
    });

    expect(report.summary.partialUnits).toBe(0);
    expect(report.summary.missingAllLocaleUnits).toBe(0);
    expect(report.summary.missingByLocale.es).toBe(0);
  });

  it('counts camel and snake locale field markers in existing-locale audits', () => {
    const inventory = core.inventoryFiles('.', []);
    const text = `
      const row = {
        titleRu: 'RU',
        titleUk: 'UK',
        titleEs: 'ES',
        literal_es: 'ES literal',
      };
    `;
    const fs = require('fs');
    const path = require('path');
    const tmpDir = path.join(process.cwd(), 'tmp', 'heisenberg-test');
    const tmpFile = path.join(tmpDir, 'sample.ts');
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(tmpFile, text, 'utf8');
    try {
      const inv = core.inventoryFiles(process.cwd(), ['tmp/heisenberg-test/sample.ts']);
      expect(inv.files[0].markers.ruFields).toBeGreaterThan(0);
      expect(inv.files[0].markers.ukFields).toBeGreaterThan(0);
      expect(inv.files[0].markers.esFields).toBeGreaterThan(1);
      expect(inventory.totals.filesScanned).toBe(0);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('keeps new-language work isolated in guard policy', () => {
    const inventory = {
      files: [{ file: 'app/lesson_data_fr.ts' }],
      totals: { bySurface: {}, byLocale: {} },
    };
    const report = core.guardReport(inventory, 'fr');
    expect(report.knownLocaleConflict).toBe(false);
    expect(report.targetRegisteredAsAppLocale).toBe(false);
    expect(report.integrationBlockers.join(' ')).toContain('not registered');
    expect(report.pathCollisions).toHaveLength(1);
    expect(report.isolationPolicy.join(' ')).toContain('Do not write generated target-language content');
  });

  it('does not report interface-registration blockers for existing app locales', () => {
    const report = core.guardReport({ files: [], totals: { bySurface: {}, byLocale: {} } }, 'es');

    expect(report.knownLocaleConflict).toBe(true);
    expect(report.targetInterfaceStatus).toBe('active');
    expect(report.targetRegisteredAsAppLocale).toBe(true);
    expect(report.integrationBlockers).toEqual([]);
  });

  it('treats batch locales as planned interface slots, not missing app locales', () => {
    const report = core.guardReport({ files: [], totals: { bySurface: {}, byLocale: {} } }, 'pt-BR');

    expect(report.knownLocaleConflict).toBe(false);
    expect(report.targetInterfaceStatus).toBe('planned');
    expect(report.targetRegisteredAsAppLocale).toBe(true);
    expect(report.integrationBlockers).toEqual([]);
    expect(report.isolationPolicy.join(' ')).toContain('planned/disabled');
  });

  it('audits an existing UI locale without treating it as a study target', () => {
    const inventory = {
      totals: {
        filesScanned: 2,
        localizedItems: 3,
        byLocale: { ru: 2, es: 1 },
        bySurface: { lessons: 1, 'ui-locale': 1 },
      },
      files: [
        {
          file: 'app/lesson_data_sample.ts',
          surface: 'lessons',
          localizedItems: 2,
          markers: {
            ruFields: 1,
            ukFields: 1,
            esFields: 0,
            localeTriples: 0,
          },
        },
        {
          file: 'app/study_target_lang_dev.ts',
          surface: 'app-other',
          localizedItems: 1,
          markers: {
            ruFields: 0,
            ukFields: 0,
            esFields: 1,
            localeTriples: 0,
            enableDevStudyTargetLang: 1,
            studyTargetLang: 1,
          },
        },
      ],
      items: [
        { file: 'app/lesson_data_sample.ts', surface: 'lessons', locale: 'ru' },
        { file: 'app/lesson_data_sample.ts', surface: 'lessons', locale: 'uk' },
        { file: 'app/study_target_lang_dev.ts', surface: 'app-other', locale: 'es' },
      ],
    };

    const audit = core.buildExistingLocaleAudit(inventory, 'es');
    expect(audit.mode).toBe('existing-locale-production-audit');
    expect(audit.targetIsInterfaceSourceLanguage).toBe(true);
    expect(audit.studyTargetMustRemain).toBe('en');
    expect(audit.summary.fieldCoverageGapFiles).toBe(1);
    expect(audit.summary.isolatedStudyTargetFiles).toBe(1);
    expect(audit.summary.studyTargetRiskFiles).toBe(0);
    expect(audit.blockers.join(' ')).not.toContain('study-target logic');
    expect(core.buildExistingLocaleAuditMarkdown(audit)).toContain('Study target: `en`');
    expect(core.buildExistingLocaleAuditMarkdown(audit)).toContain('Isolated Study-Target Files');
  });

  it('treats known Spanish sidecar locale files as coverage for their source files', () => {
    const inventory = {
      totals: {
        filesScanned: 2,
        localizedItems: 3,
        byLocale: { ru: 1, uk: 1, es: 1 },
        bySurface: { 'app-other': 2 },
      },
      files: [
        {
          file: 'app/achievements.ts',
          surface: 'app-other',
          localizedItems: 2,
          markers: {
            ruFields: 1,
            ukFields: 1,
            esFields: 0,
            localeTriples: 0,
          },
        },
        {
          file: 'app/achievements_es_locale.ts',
          surface: 'app-other',
          localizedItems: 1,
          markers: {
            ruFields: 0,
            ukFields: 0,
            esFields: 1,
            localeTriples: 0,
          },
        },
      ],
      items: [
        { file: 'app/achievements.ts', surface: 'app-other', locale: 'ru' },
        { file: 'app/achievements.ts', surface: 'app-other', locale: 'uk' },
        { file: 'app/achievements_es_locale.ts', surface: 'app-other', locale: 'es' },
      ],
    };

    const audit = core.buildExistingLocaleAudit(inventory, 'es');

    expect(audit.summary.fieldCoverageGapFiles).toBe(0);
    expect(audit.summary.itemCoverageGapFiles).toBe(0);
    expect(audit.summary.sidecarCoverageFiles).toBe(1);
    expect(audit.blockers).toEqual([]);
    expect(core.buildExistingLocaleAuditMarkdown(audit)).toContain('Resolved Sidecar Coverage');
  });

  it('separates verified existing-locale fallbacks from unresolved fallback risks', () => {
    const inventory = {
      totals: {
        filesScanned: 2,
        localizedItems: 2,
        byLocale: { ru: 1, es: 1 },
        bySurface: { 'ui-locale': 1, 'app-other': 1 },
      },
      files: [
        {
          file: 'constants/i18n.ts',
          surface: 'ui-locale',
          localizedItems: 1,
          markers: {
            bundleLang: 1,
            esFields: 1,
          },
        },
        {
          file: 'app/unknown_runtime_fallback.tsx',
          surface: 'app-other',
          localizedItems: 1,
          markers: {
            bundleLang: 1,
          },
        },
      ],
      items: [
        { file: 'constants/i18n.ts', surface: 'ui-locale', locale: 'es' },
        { file: 'app/unknown_runtime_fallback.tsx', surface: 'app-other', locale: 'ru' },
      ],
    };

    const audit = core.buildExistingLocaleAudit(inventory, 'es');

    expect(audit.summary.verifiedFallbackFiles).toBe(1);
    expect(audit.summary.fallbackRiskFiles).toBe(1);
    expect(audit.risks.verifiedFallbackFiles[0].file).toBe('constants/i18n.ts');
    expect(audit.risks.fallbackRiskFiles[0].file).toBe('app/unknown_runtime_fallback.tsx');
    expect(core.buildExistingLocaleAuditMarkdown(audit)).toContain('Verified Fallback Files');
  });

  it('builds translation work only from existing-locale gap files', () => {
    const inventory = {
      totals: { filesScanned: 2, localizedItems: 4, byLocale: { ru: 2, uk: 1, es: 1 }, bySurface: {} },
      files: [
        { file: 'app/missing_es.ts', surface: 'lessons', localizedItems: 2, markers: {} },
        { file: 'app/ready_es.ts', surface: 'lessons', localizedItems: 2, markers: {} },
      ],
      items: [
        { file: 'app/missing_es.ts', surface: 'lessons', locale: 'ru', text: 'RU' },
        { file: 'app/missing_es.ts', surface: 'lessons', locale: 'uk', text: 'UK' },
        { file: 'app/ready_es.ts', surface: 'lessons', locale: 'ru', text: 'RU2' },
        { file: 'app/ready_es.ts', surface: 'lessons', locale: 'es', text: 'ES2' },
      ],
    };

    const items = core.missingTargetSourceItems(inventory, 'es');
    expect(items.map((item: any) => `${item.file}:${item.locale}`)).toEqual([
      'app/missing_es.ts:ru',
      'app/missing_es.ts:uk',
    ]);
  });
});
