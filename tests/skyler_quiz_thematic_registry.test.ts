import { ACTIVE_INTERFACE_SOURCE_LOCALES } from '../app/source_locales';
import fs from 'fs';
import path from 'path';
import {
  getAvailableThematicQuizCategories,
  getThematicQuizCategory,
  getThematicQuizPhrases,
  thematicQuizCategoryHasAllActiveLocaleCopy,
  themedQuizAsset,
  THEMATIC_QUIZ_CATEGORIES,
} from '../app/quiz_thematic_registry';

describe('Skyler thematic quiz registry', () => {
  it('keeps thematic registry and phrase target punctuation free of legacy locale fallback markers', () => {
    const registrySource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_registry.ts'), 'utf8');
    const phraseTargetSource = fs.readFileSync(path.join(__dirname, '../app/phrase_target_utils.ts'), 'utf8');
    const sourceLocalesSource = fs.readFileSync(path.join(__dirname, '../app/source_locales.ts'), 'utf8');

    expect(registrySource).not.toContain('?? assets.dark');
    expect(phraseTargetSource).not.toContain("uiLang === 'uk'");
    expect(phraseTargetSource).not.toMatch(/\?\?/);
    expect(sourceLocalesSource).not.toContain('return (SOURCE_LOCALES');
    expect(phraseTargetSource).toContain('PUNCTUATION_SOURCE_BY_LANG');
  });

  it('exposes approved English thematic categories', () => {
    const categories = getAvailableThematicQuizCategories('en');

    expect(categories.map(category => category.id)).toEqual(['kitchen-and-cooking', 'home-and-rooms']);
    for (const category of categories) {
      expect(category.pack.releasePolicy?.environment).toBe('production');
      expect(category.pack.releasePolicy?.productionActivation).toBe('approved_by_user');
      expect(category.pack.items).toHaveLength(100);
      expect(category.pack.items.every(item => (item as { quizItemType?: string }).quizItemType === undefined)).toBe(true);
    }
  });

  it('keeps only unfinished thematic quiz packs dev-only for store release builds', () => {
    const devRegistrySource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_dev_registry.ts'), 'utf8');
    const homePackSource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_home_and_rooms.ts'), 'utf8');
    const doctorPackSource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_at_the_doctor.ts'), 'utf8');

    expect(THEMATIC_QUIZ_CATEGORIES.map(category => category.id)).toEqual(['kitchen-and-cooking', 'home-and-rooms']);
    expect(devRegistrySource).not.toContain('HOME_AND_ROOMS_CATEGORY');
    expect(devRegistrySource).toContain('AT_THE_DOCTOR_CATEGORY');
    expect(homePackSource).toContain('"environment": "production"');
    expect(homePackSource).toContain('"productionActivation": "approved_by_user"');
    expect(doctorPackSource).toContain('"environment": "dev-only"');
    expect(doctorPackSource).toContain('"productionActivation": "blocked_until_explicit_user_approval"');
  });

  it('keeps thematic categories hidden while the French source gate is active', () => {
    expect(getAvailableThematicQuizCategories('fr')).toEqual([]);
    expect(getThematicQuizCategory('kitchen-and-cooking', 'fr')).toBeUndefined();
    expect(getThematicQuizPhrases('kitchen-and-cooking', { studyTarget: 'fr' })).toEqual([]);
  });

  it('builds thematic quiz phrases without reading the existing level pools', () => {
    const phrases = getThematicQuizPhrases('kitchen-and-cooking', {
      count: 100,
      sourceLocale: 'ru',
      studyTarget: 'en',
    });

    expect(phrases).toHaveLength(100);
    expect(phrases.every(phrase => phrase.quizItemType === 'skyler_thematic:kitchen-and-cooking')).toBe(true);
    expect(phrases.map(phrase => phrase.questionId)).toEqual(
      expect.arrayContaining(['kitchen-and-cooking-001', 'kitchen-and-cooking-010']),
    );
    expect(phrases.map(phrase => phrase.questionId)).toContain('kitchen-and-cooking-100');
  });

  it('loads approved production categories and starter dev thematic categories with generated assets', () => {
    const originalDev = (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__;
    const originalStoreRelease = process.env.EXPO_PUBLIC_STORE_RELEASE;

    try {
      (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
      delete process.env.EXPO_PUBLIC_STORE_RELEASE;

      const categories = getAvailableThematicQuizCategories('en');
      const home = categories.find(category => category.id === 'home-and-rooms');

      expect(categories.map(category => category.id)).toEqual([
        'kitchen-and-cooking',
        'home-and-rooms',
        'at-the-doctor',
        'body-and-health',
        'shopping-and-money',
      ]);
      expect(home).toBeTruthy();
      expect(home!.pack.releasePolicy?.environment).toBe('production');
      expect(home!.pack.releasePolicy?.productionActivation).toBe('approved_by_user');
      expect(home!.pack.items).toHaveLength(100);
      expect(thematicQuizCategoryHasAllActiveLocaleCopy(home!)).toBe(true);

      for (const devId of ['at-the-doctor', 'body-and-health', 'shopping-and-money']) {
        const devCategory = categories.find(category => category.id === devId);
        expect(devCategory).toBeTruthy();
        expect(devCategory!.pack.releasePolicy?.environment).toBe('dev-only');
        expect(devCategory!.pack.releasePolicy?.productionActivation).toBe('blocked_until_explicit_user_approval');
        expect(devCategory!.badge).toMatch(/^DEV\b/);
        expect(devCategory!.pack.items.length).toBeGreaterThan(0);
        expect(thematicQuizCategoryHasAllActiveLocaleCopy(devCategory!)).toBe(true);
        for (const themeMode of ['forest', 'dark', 'neon', 'neonGreen', 'gold', 'coral', 'minimalLight', 'minimalDark']) {
          expect(themedQuizAsset(devCategory!.cardBackgrounds, themeMode)).toBeTruthy();
          expect(themedQuizAsset(devCategory!.logos, themeMode)).toBeTruthy();
        }
      }

      for (const themeMode of ['forest', 'dark', 'neon', 'neonGreen', 'gold', 'coral', 'minimalLight', 'minimalDark']) {
        expect(themedQuizAsset(home!.cardBackgrounds, themeMode)).toBeTruthy();
        expect(themedQuizAsset(home!.logos, themeMode)).toBeTruthy();
      }

      const phrases = getThematicQuizPhrases('home-and-rooms', {
        count: 100,
        sourceLocale: 'uk',
        studyTarget: 'en',
      });

      expect(phrases).toHaveLength(100);
      expect(phrases.every(phrase => phrase.quizItemType === 'skyler_thematic:home-and-rooms')).toBe(true);
      expect(phrases.map(phrase => phrase.questionId)).toEqual(expect.arrayContaining([
        'home-and-rooms-001',
        'home-and-rooms-100',
      ]));
      expect(phrases.every(phrase => phrase.sourceLocale === 'uk')).toBe(true);

      process.env.EXPO_PUBLIC_STORE_RELEASE = '1';
      expect(getAvailableThematicQuizCategories('en').map(category => category.id)).toEqual([
        'kitchen-and-cooking',
        'home-and-rooms',
      ]);
      expect(getThematicQuizCategory('home-and-rooms', 'en')).toBeTruthy();
      expect(getThematicQuizPhrases('home-and-rooms', { studyTarget: 'en' })).toHaveLength(10);
    } finally {
      (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = originalDev;
      if (originalStoreRelease === undefined) {
        delete process.env.EXPO_PUBLIC_STORE_RELEASE;
      } else {
        process.env.EXPO_PUBLIC_STORE_RELEASE = originalStoreRelease;
      }
    }
  });

  it('keeps home and rooms Russian task text fully localized', () => {
    const home = getThematicQuizCategory('home-and-rooms', 'en');

    expect(home).toBeTruthy();
    for (const item of home!.pack.items) {
      expect(item.localizedPrompts.ru).toEqual(expect.any(String));
      expect(item.localizedPrompts.ru).not.toMatch(/[A-Za-z]/);
      expect(item.localizedPrompts.ru).toMatch(/^Выберите английский вариант: «.+»\.$/);
      expect(item.explanations.ru).toHaveLength(4);
      for (const explanation of item.explanations.ru ?? []) {
        expect(explanation).not.toMatch(/домашней тем|подходит к смыслу|Здесь нужен ответ|нужен ответ/i);
        const withoutChoices = item.choices.reduce(
          (copy, choice) => copy.replaceAll(choice, ''),
          explanation,
        );
        expect(withoutChoices).not.toMatch(/\b(a|an|the|where|with|used|object|device|room|furniture|surface)\b/i);
      }
    }
  });

  it('has locale copy for every active interface locale before a category can render', () => {
    for (const category of THEMATIC_QUIZ_CATEGORIES) {
      expect(thematicQuizCategoryHasAllActiveLocaleCopy(category)).toBe(true);
      for (const locale of ACTIVE_INTERFACE_SOURCE_LOCALES) {
        expect(category.title[locale]).toEqual(expect.any(String));
        expect(category.subtitle[locale]).toEqual(expect.any(String));
        expect(category.title[locale]).not.toMatch(/[ÐÑÃÄÅ]/);
        expect(category.subtitle[locale]).not.toMatch(/[ÐÑÃÄÅ]/);
      }
    }
  });

  it('has explicit per-theme generated assets for forest and neon green', () => {
    const category = THEMATIC_QUIZ_CATEGORIES[0]!;

    for (const themeMode of ['forest', 'dark', 'neon', 'neonGreen', 'gold', 'coral', 'minimalLight', 'minimalDark']) {
      expect(themedQuizAsset(category.cardBackgrounds, themeMode)).toBeTruthy();
      expect(themedQuizAsset(category.logos, themeMode)).toBeTruthy();
    }
    expect(themedQuizAsset(category.cardBackgrounds, 'neon-green')).toBe(
      themedQuizAsset(category.cardBackgrounds, 'neonGreen'),
    );
  });
});
