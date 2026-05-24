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

  it('exposes kitchen and cooking as a separate English thematic category', () => {
    const categories = getAvailableThematicQuizCategories('en');

    expect(categories.map(category => category.id)).toEqual(['kitchen-and-cooking']);
    expect(categories[0]!.pack.releasePolicy?.environment).toBe('production');
    expect(categories[0]!.pack.releasePolicy?.productionActivation).toBe('approved_by_user');
    expect(categories[0]!.pack.items).toHaveLength(30);
    expect(categories[0]!.pack.items.every(item => (item as { quizItemType?: string }).quizItemType === undefined)).toBe(true);
  });

  it('keeps every non-kitchen thematic quiz pack dev-only for store release builds', () => {
    const devRegistrySource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_dev_registry.ts'), 'utf8');
    const homePackSource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_home_and_rooms.ts'), 'utf8');
    const doctorPackSource = fs.readFileSync(path.join(__dirname, '../app/quiz_thematic_at_the_doctor.ts'), 'utf8');

    expect(THEMATIC_QUIZ_CATEGORIES.map(category => category.id)).toEqual(['kitchen-and-cooking']);
    expect(devRegistrySource).toContain('HOME_AND_ROOMS_CATEGORY');
    expect(devRegistrySource).toContain('AT_THE_DOCTOR_CATEGORY');
    expect(homePackSource).toContain('"environment": "dev-only"');
    expect(homePackSource).toContain('"productionActivation": "blocked_until_explicit_user_approval"');
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
      sourceLocale: 'ru',
      studyTarget: 'en',
    });

    expect(phrases).toHaveLength(30);
    expect(phrases.every(phrase => phrase.quizItemType === 'skyler_thematic:kitchen-and-cooking')).toBe(true);
    expect(phrases.map(phrase => phrase.questionId)).toEqual(
      expect.arrayContaining(['kitchen-and-cooking-001', 'kitchen-and-cooking-010']),
    );
    expect(phrases.map(phrase => phrase.questionId)).toContain('kitchen-and-cooking-030');
  });

  it('has locale copy for every active interface locale before a category can render', () => {
    for (const category of THEMATIC_QUIZ_CATEGORIES) {
      expect(thematicQuizCategoryHasAllActiveLocaleCopy(category)).toBe(true);
      for (const locale of ACTIVE_INTERFACE_SOURCE_LOCALES) {
        expect(category.title[locale]).toEqual(expect.any(String));
        expect(category.subtitle[locale]).toEqual(expect.any(String));
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
