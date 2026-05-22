import type { ImageSourcePropType } from 'react-native';

import { KITCHEN_AND_COOKING_SKYLER_PACK } from './quiz_thematic_kitchen_and_cooking';
import {
  skylerThematicPackToQuizPhrases,
  thematicQuizPackAvailableForTarget,
  type SkylerThematicPack,
  type SkylerThematicPackAdapterOptions,
} from './quiz_thematic_packs';
import type { QuizPhrase } from './quiz_data';
import { ACTIVE_INTERFACE_SOURCE_LOCALES, type SourceLocale } from './source_locales';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

export type ThematicQuizCategoryId = 'kitchen-and-cooking';

type ThemeAssetMap = Record<string, ImageSourcePropType>;
type LocalizedCategoryCopy = Record<SourceLocale, string>;

export type ThematicQuizCategory = {
  id: ThematicQuizCategoryId;
  target: 'en';
  title: LocalizedCategoryCopy;
  subtitle: LocalizedCategoryCopy;
  badge: string;
  accent: string;
  pack: SkylerThematicPack;
  cardBackgrounds: ThemeAssetMap;
  logos: ThemeAssetMap;
};

const kitchenCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-dark.webp'),
  neon: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-neon.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-coral.webp'),
  minimalLight: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-minimal-light.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-minimal-dark.webp'),
};

const kitchenLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-dark.webp'),
  neon: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-neon.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-coral.webp'),
  minimalLight: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-minimal-light.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-minimal-dark.webp'),
};

const KITCHEN_AND_COOKING_CATEGORY: ThematicQuizCategory = {
  id: 'kitchen-and-cooking',
  target: 'en',
  title: {
    ru: 'Кухня и готовка',
    uk: 'Кухня та готування',
    es: 'Cocina y cocinar',
    'pt-BR': 'Cozinha e preparo',
    vi: 'Nhà bếp và nấu ăn',
    id: 'Dapur dan memasak',
    tr: 'Mutfak ve yemek pişirme',
    pl: 'Kuchnia i gotowanie',
  },
  subtitle: {
    ru: 'Предметы, действия и базовые слова',
    uk: 'Предмети, дії та базові слова',
    es: 'Objetos, acciones y palabras básicas',
    'pt-BR': 'Objetos, ações e palavras básicas',
    vi: 'Đồ vật, hành động và từ cơ bản',
    id: 'Benda, aksi, dan kata dasar',
    tr: 'Eşyalar, eylemler ve temel kelimeler',
    pl: 'Przedmioty, czynności i podstawowe słowa',
  },
  badge: 'A1 WORDS',
  accent: '#5EEAD4',
  pack: KITCHEN_AND_COOKING_SKYLER_PACK,
  cardBackgrounds: kitchenCardBackgrounds,
  logos: kitchenLogos,
};

export const THEMATIC_QUIZ_CATEGORIES = [
  KITCHEN_AND_COOKING_CATEGORY,
] as const satisfies readonly ThematicQuizCategory[];

export function getThematicQuizCategory(
  id: ThematicQuizCategoryId,
  studyTarget?: RuntimeStudyTarget,
): ThematicQuizCategory | undefined {
  const normalizedTarget = storageStudyTarget(studyTarget);
  const category = THEMATIC_QUIZ_CATEGORIES.find(item =>
    item.id === id &&
    item.target === 'en' &&
    thematicQuizPackAvailableForTarget(item.pack, normalizedTarget)
  );
  return category;
}

export function getAvailableThematicQuizCategories(studyTarget?: RuntimeStudyTarget): ThematicQuizCategory[] {
  const normalizedTarget = storageStudyTarget(studyTarget);
  const categories = THEMATIC_QUIZ_CATEGORIES.filter(category =>
    category.target === 'en' &&
    thematicQuizPackAvailableForTarget(category.pack, normalizedTarget)
  );
  return categories;
}

export function getThematicQuizPhrases(
  categoryId: ThematicQuizCategoryId,
  options: SkylerThematicPackAdapterOptions = {},
): QuizPhrase[] {
  const category = getThematicQuizCategory(categoryId, options.studyTarget);
  if (!category) return [];
  return skylerThematicPackToQuizPhrases(category.pack, options);
}

export function themedQuizAsset<T>(
  assets: Record<string, T>,
  themeMode: string,
): T {
  const alias = themeMode === 'forest'
    ? 'forest'
    : themeMode === 'neonGreen' || themeMode === 'neon-green'
      ? 'neonGreen'
      : themeMode;
  const themedAsset = assets[alias];
  if (themedAsset) return themedAsset;
  return assets.dark;
}

export function thematicQuizCategoryHasAllActiveLocaleCopy(category: ThematicQuizCategory): boolean {
  const hasAllLocales = ACTIVE_INTERFACE_SOURCE_LOCALES.every(locale =>
    Boolean(category.title[locale]?.trim()) && Boolean(category.subtitle[locale]?.trim())
  );
  return hasAllLocales;
}
