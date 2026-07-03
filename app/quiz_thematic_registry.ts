import type { ImageSourcePropType } from 'react-native';

import { quizAssetThemeKey } from './quizzes/constants';
import {
  skylerThematicPackToQuizPhrases,
  thematicQuizPackSurfaceVisibleForTarget,
  type SkylerThematicPack,
  type SkylerThematicPackAdapterOptions,
} from './quiz_thematic_packs';
import type { QuizPhrase } from './quiz_data';
import { ACTIVE_INTERFACE_SOURCE_LOCALES, type SourceLocale } from './source_locales';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { sampleUniqueRandomIndices, shuffle } from './utils_shuffle';

export type ThematicQuizCategoryId =
  | 'kitchen-and-cooking'
  | 'home-and-rooms'
  | 'at-the-doctor'
  | 'body-and-health'
  | 'shopping-and-money';

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

type ThematicQuizPhrasesOptions = SkylerThematicPackAdapterOptions & {
  count?: number;
};

const DEFAULT_THEMATIC_QUIZ_SESSION_SIZE = 10;

/**
 * PERF (D2): each thematic pack's question-item array is ~750-850KB. This registry
 * used to statically import both production packs (kitchen-and-cooking,
 * home-and-rooms), so just mounting the "Quizzes" tab built ~1.6MB of quiz items in
 * memory before the user ever opened a category. `getThematicQuizCategory` /
 * `getAvailableThematicQuizCategories` only need lightweight metadata (title, badge,
 * accent, releasePolicy) to render the category list — the heavy `items` array is
 * only read once a category is actually opened (`skylerThematicPackToQuizPhrases`).
 *
 * `definePackLazily` installs `category.pack` as a getter: the module is required
 * (and cached) on first access to `.pack`, not at module-eval time. This keeps
 * `category.pack` a normal, synchronously-readable object everywhere it's used today
 * — callers and tests that do `category.pack.items` are unaffected.
 *
 * SEAM FOR SERVER MIGRATION: this lazy-require is the local stand-in for "fetch pack
 * from server + cache on disk" (the pattern already used by the French quiz bank, see
 * quiz_phrases_loader.ts). When thematic packs move server-side, only the loader
 * function passed to `definePackLazily` needs to change; category shape and callers
 * (getThematicQuizCategory / getThematicQuizPhrases) stay the same.
 */
function definePackLazily(
  target: { pack: SkylerThematicPack },
  load: () => SkylerThematicPack,
): void {
  let cached: SkylerThematicPack | null = null;
  Object.defineProperty(target, 'pack', {
    enumerable: true,
    configurable: true,
    get(): SkylerThematicPack {
      if (!cached) cached = load();
      return cached;
    },
  });
}

const kitchenCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-minimal-dark.webp'),
  business: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-business.webp'),
  businessLight: require('../assets/images/quizzes/theme_cards/quiz-theme-kitchen-and-cooking-businessLight.webp'),
};

const kitchenLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-minimal-dark.webp'),
  business: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-business.webp'),
  businessLight: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-businessLight.webp'),
  midnight: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-midnight.webp'),
  ember: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-ember.webp'),
  aurora: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-aurora.webp'),
  volt: require('../assets/images/quizzes/theme_logos/quiz-theme-kitchen-and-cooking-volt.webp'),
};

const homeCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-minimal-dark.webp'),
  business: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-business.webp'),
  businessLight: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-businessLight.webp'),
};

const homeLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-minimal-dark.webp'),
  business: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-business.webp'),
  businessLight: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-businessLight.webp'),
  midnight: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-midnight.webp'),
  ember: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-ember.webp'),
  aurora: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-aurora.webp'),
  volt: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-volt.webp'),
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
  // Placeholder — overwritten below by definePackLazily with a getter that requires
  // ./quiz_thematic_kitchen_and_cooking (~747KB) only on first access to `.pack`.
  pack: null as unknown as SkylerThematicPack,
  cardBackgrounds: kitchenCardBackgrounds,
  logos: kitchenLogos,
};
definePackLazily(
  KITCHEN_AND_COOKING_CATEGORY,
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lazy per-category require keeps unused ~750KB quiz item arrays out of memory (PERF D2)
  () => (require('./quiz_thematic_kitchen_and_cooking') as { KITCHEN_AND_COOKING_SKYLER_PACK: SkylerThematicPack }).KITCHEN_AND_COOKING_SKYLER_PACK,
);

const HOME_AND_ROOMS_CATEGORY: ThematicQuizCategory = {
  id: 'home-and-rooms',
  target: 'en',
  title: {
    ru: 'Дом и комнаты',
    uk: 'Дім і кімнати',
    es: 'Casa y habitaciones',
    'pt-BR': 'Casa e cômodos',
    vi: 'Nhà và phòng',
    id: 'Rumah dan ruangan',
    tr: 'Ev ve odalar',
    pl: 'Dom i pokoje',
  },
  subtitle: {
    ru: 'Комнаты, мебель и домашние слова',
    uk: 'Кімнати, меблі й домашні слова',
    es: 'Habitaciones, muebles y palabras de casa',
    'pt-BR': 'Cômodos, móveis e palavras da casa',
    vi: 'Phòng, đồ nội thất và từ vựng trong nhà',
    id: 'Ruangan, perabot, dan kata-kata rumah',
    tr: 'Odalar, mobilyalar ve ev sözcükleri',
    pl: 'Pokoje, meble i domowe słowa',
  },
  badge: 'A1 HOME',
  accent: '#93C5FD',
  // Placeholder — overwritten below by definePackLazily with a getter that requires
  // ./quiz_thematic_home_and_rooms (~847KB) only on first access to `.pack`.
  pack: null as unknown as SkylerThematicPack,
  cardBackgrounds: homeCardBackgrounds,
  logos: homeLogos,
};
definePackLazily(
  HOME_AND_ROOMS_CATEGORY,
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: lazy per-category require keeps unused ~850KB quiz item arrays out of memory (PERF D2)
  () => (require('./quiz_thematic_home_and_rooms') as { HOME_AND_ROOMS_SKYLER_PACK: SkylerThematicPack }).HOME_AND_ROOMS_SKYLER_PACK,
);

export const IN_PROGRESS_THEMATIC_QUIZZES_DEV_ONLY = true;
export const SKYLER_THEMATIC_QUIZZES_DEV_ONLY = IN_PROGRESS_THEMATIC_QUIZZES_DEV_ONLY;
export const THEMATIC_QUIZ_CATEGORIES = [
  KITCHEN_AND_COOKING_CATEGORY,
  HOME_AND_ROOMS_CATEGORY,
] as const satisfies readonly ThematicQuizCategory[];

export function skylerThematicQuizzesEnabledForRuntime(): boolean {
  return !SKYLER_THEMATIC_QUIZZES_DEV_ONLY || (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ === true &&
    process.env.EXPO_PUBLIC_STORE_RELEASE !== '1'
  );
}

export function inProgressThematicQuizzesEnabledForRuntime(): boolean {
  return skylerThematicQuizzesEnabledForRuntime();
}

let cachedDevThematicQuizCategories: readonly ThematicQuizCategory[] | null = null;

function loadDevThematicQuizCategories(): readonly ThematicQuizCategory[] {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_STORE_RELEASE !== '1') {
    if (!cachedDevThematicQuizCategories) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional: Metro drops this dev-only module from prod bundles behind literal __DEV__
      const { DEV_THEMATIC_QUIZ_CATEGORIES } = require('./quiz_thematic_dev_registry') as {
        DEV_THEMATIC_QUIZ_CATEGORIES: readonly ThematicQuizCategory[];
      };
      cachedDevThematicQuizCategories = DEV_THEMATIC_QUIZ_CATEGORIES;
    }
    return cachedDevThematicQuizCategories ?? [];
  }
  return [];
}

function thematicQuizCategoryEnabledForRuntime(category: ThematicQuizCategory): boolean {
  if (category.pack.releasePolicy?.environment !== 'dev-only') return true;
  return skylerThematicQuizzesEnabledForRuntime();
}

function getRuntimeThematicQuizCategories(): readonly ThematicQuizCategory[] {
  return [
    ...THEMATIC_QUIZ_CATEGORIES,
    ...loadDevThematicQuizCategories(),
  ].filter(thematicQuizCategoryEnabledForRuntime);
}

function isRuntimeQuizPhrase(phrase: QuizPhrase | undefined): phrase is QuizPhrase {
  if (!phrase) return false;
  if (!Array.isArray(phrase.choices) || phrase.choices.length !== 4) return false;
  const correctIndexes = Array.isArray(phrase.correct) ? phrase.correct : [phrase.correct];
  if (correctIndexes.length === 0) return false;
  if (!correctIndexes.every(index => Number.isInteger(index) && index >= 0 && index < phrase.choices.length)) return false;
  if (!Array.isArray(phrase.explanations) || phrase.explanations.length !== phrase.choices.length) return false;
  if (!Array.isArray(phrase.explanationsUK) || phrase.explanationsUK.length !== phrase.choices.length) return false;
  return true;
}

export function getThematicQuizCategory(
  id: ThematicQuizCategoryId,
  studyTarget?: RuntimeStudyTarget,
): ThematicQuizCategory | undefined {
  const normalizedTarget = storageStudyTarget(studyTarget);
  const category = getRuntimeThematicQuizCategories().find(item =>
    item.id === id &&
    item.target === 'en' &&
    thematicQuizPackSurfaceVisibleForTarget(item.pack, normalizedTarget)
  );
  return category;
}

export function getAvailableThematicQuizCategories(studyTarget?: RuntimeStudyTarget): ThematicQuizCategory[] {
  const normalizedTarget = storageStudyTarget(studyTarget);
  const categories = getRuntimeThematicQuizCategories().filter(category =>
    category.target === 'en' &&
    thematicQuizPackSurfaceVisibleForTarget(category.pack, normalizedTarget)
  );
  return categories;
}

export function getThematicQuizPhrases(
  categoryId: ThematicQuizCategoryId,
  options: ThematicQuizPhrasesOptions = {},
): QuizPhrase[] {
  const category = getThematicQuizCategory(categoryId, options.studyTarget);
  if (!category) return [];
  const pool = skylerThematicPackToQuizPhrases(category.pack, options).filter(isRuntimeQuizPhrase);
  const count = Math.max(0, Math.min(Math.floor(options.count ?? DEFAULT_THEMATIC_QUIZ_SESSION_SIZE), pool.length));
  const selected = sampleUniqueRandomIndices(pool.length, count)
    .map(index => pool[index])
    .filter((phrase): phrase is QuizPhrase => !!phrase);

  if (selected.length < count) {
    const selectedIds = new Set(selected.map(phrase => phrase.questionId));
    for (const phrase of pool) {
      if (selected.length >= count) break;
      if (!selectedIds.has(phrase.questionId)) {
        selected.push(phrase);
        selectedIds.add(phrase.questionId);
      }
    }
  }

  return selected.map(shuffleThematicQuizPhraseChoices);
}

function reorderByIndices(values: readonly string[] | undefined, indices: number[]): string[] | undefined {
  if (!values || values.length !== indices.length) return values ? [...values] : undefined;
  return indices.map(index => values[index]!);
}

function shuffleThematicQuizPhraseChoices(phrase: QuizPhrase): QuizPhrase {
  const indices = shuffle(phrase.choices.map((_, index) => index));
  const correctIndexes = Array.isArray(phrase.correct) ? phrase.correct : [phrase.correct];
  const shuffledCorrect = correctIndexes
    .map(index => indices.indexOf(index))
    .filter(index => index >= 0);
  const sourceLocales = phrase.sourceLocales
    ? Object.fromEntries(Object.entries(phrase.sourceLocales).map(([locale, copy]) => [
        locale,
        copy
          ? {
              ...copy,
              explanations: reorderByIndices(copy.explanations, indices) ?? [...copy.explanations],
            }
          : copy,
      ])) as QuizPhrase['sourceLocales']
    : phrase.sourceLocales;

  return {
    ...phrase,
    choices: indices.map(index => phrase.choices[index]!),
    correct: shuffledCorrect.length === 1 ? shuffledCorrect[0]! : shuffledCorrect,
    explanations: reorderByIndices(phrase.explanations, indices) ?? [...phrase.explanations],
    explanationsUK: reorderByIndices(phrase.explanationsUK, indices) ?? [...phrase.explanationsUK],
    explanationsES: reorderByIndices(phrase.explanationsES, indices) ?? [...phrase.explanationsES],
    sourceExplanations: reorderByIndices(phrase.sourceExplanations, indices),
    sourceLocales,
  };
}

export function themedQuizAsset<T>(
  assets: Record<string, T>,
  themeMode: string,
): T {
  const alias = quizAssetThemeKey(themeMode);
  const themedAsset = assets[alias];
  if (themedAsset) return themedAsset;
  if (alias === 'forest' && assets.dark) return assets.dark;
  if (alias === 'neonGreen' && assets['neon-green']) return assets['neon-green'];
  return assets.dark
    ?? assets.forest
    ?? assets.neonGreen
    ?? assets.minimalDark
    ?? Object.values(assets)[0]!;
}

export function thematicQuizCategoryHasAllActiveLocaleCopy(category: ThematicQuizCategory): boolean {
  const hasAllLocales = ACTIVE_INTERFACE_SOURCE_LOCALES.every(locale =>
    Boolean(category.title[locale]?.trim()) && Boolean(category.subtitle[locale]?.trim())
  );
  return hasAllLocales;
}
