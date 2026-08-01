import type { PersonalPlanId, PlanDailyTask } from './personal_plan_catalog';
import type { PlanArtIconName } from './personal_plan_art';
import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

export type PersonalPlanTaskVisualSource =
  | 'core_lesson'
  | 'route_phrase'
  | 'recall'
  | 'quiz'
  | 'practice'
  | 'choice'
  | 'listening'
  | 'sentence_build'
  | 'speaking'
  | 'trainer'
  | 'flashcards';

export const PERSONAL_PLAN_TASK_VISUAL_SOURCES: PersonalPlanTaskVisualSource[] = [
  'core_lesson',
  'route_phrase',
  'recall',
  'quiz',
  'practice',
  'choice',
  'listening',
  'sentence_build',
  'speaking',
  'trainer',
  'flashcards',
];

export type PersonalPlanTaskVisual = {
  source: PersonalPlanTaskVisualSource;
  label: string;
  intent: string;
  icon: PlanArtIconName;
  assetKey: string;
  asset: ImageSourcePropType;
  artStyle: 'bookGlow' | 'routeKey' | 'memoryLoop' | 'quizPulse' | 'practiceGrid' | 'coachSignal' | 'cardStack';
};

export const PERSONAL_PLAN_TASK_VISUAL_THEMES: ThemeMode[] = [
  'midnight',
  'minimalDark',
  'ember',
  'aurora',
  'volt',
  'dark',
  'coral',
  'gold',
];

const DEFAULT_VISUAL_THEME: ThemeMode = 'midnight';

const MINIMAL_DARK_TASK_ASSETS: Record<PersonalPlanTaskVisualSource, ImageSourcePropType> = {
  core_lesson: require('../assets/images/personal_plan_tasks_fit/minimalDark/core_lesson.webp'),
  route_phrase: require('../assets/images/personal_plan_tasks_fit/minimalDark/route_gavan.webp'),
  recall: require('../assets/images/personal_plan_tasks_fit/minimalDark/recall.webp'),
  quiz: require('../assets/images/personal_plan_tasks_fit/minimalDark/choice.webp'),
  practice: require('../assets/images/personal_plan_tasks_fit/minimalDark/practice.webp'),
  choice: require('../assets/images/personal_plan_tasks_fit/minimalDark/choice.webp'),
  listening: require('../assets/images/personal_plan_tasks_fit/minimalDark/listening.webp'),
  sentence_build: require('../assets/images/personal_plan_tasks_fit/minimalDark/sentence_build.webp'),
  speaking: require('../assets/images/personal_plan_tasks_fit/minimalDark/speaking.webp'),
  trainer: require('../assets/images/personal_plan_tasks_fit/minimalDark/trainer.webp'),
  flashcards: require('../assets/images/personal_plan_tasks_fit/minimalDark/flashcards.webp'),
};

const THEMED_TASK_ASSETS: Record<ThemeMode, Record<PersonalPlanTaskVisualSource, ImageSourcePropType>> = {
  midnight: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/midnight/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/midnight/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/midnight/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/midnight/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/midnight/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/midnight/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/midnight/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/midnight/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/midnight/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/midnight/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/midnight/flashcards.webp'),
  },
  minimalDark: MINIMAL_DARK_TASK_ASSETS,
  // Новые темы переиспользуют набор minimalDark без новых ассетов (как business-fallback).
  candyBlue: MINIMAL_DARK_TASK_ASSETS,
  indigo: MINIMAL_DARK_TASK_ASSETS,
  business: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/business/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/business/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/business/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/business/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/business/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/business/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/business/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/business/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/business/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/business/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/business/flashcards.webp'),
  },
  businessLight: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/businessLight/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/businessLight/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/businessLight/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/businessLight/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/businessLight/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/businessLight/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/businessLight/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/businessLight/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/businessLight/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/businessLight/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/businessLight/flashcards.webp'),
  },
  sagePorcelain: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/businessLight/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/businessLight/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/businessLight/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/businessLight/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/businessLight/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/businessLight/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/businessLight/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/businessLight/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/businessLight/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/businessLight/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/businessLight/flashcards.webp'),
  },
  ember: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/ember/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/ember/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/ember/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/ember/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/ember/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/ember/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/ember/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/ember/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/ember/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/ember/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/ember/flashcards.webp'),
  },
  aurora: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/aurora/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/aurora/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/aurora/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/aurora/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/aurora/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/aurora/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/aurora/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/aurora/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/aurora/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/aurora/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/aurora/flashcards.webp'),
  },
  volt: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/volt/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/volt/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/volt/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/volt/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/volt/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/volt/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/volt/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/volt/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/volt/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/volt/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/volt/flashcards.webp'),
  },
  dark: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/dark/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/dark/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/dark/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/dark/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/dark/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/dark/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/dark/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/dark/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/dark/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/dark/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/dark/flashcards.webp'),
  },
  coral: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/coral/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/coral/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/coral/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/coral/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/coral/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/coral/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/coral/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/coral/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/coral/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/coral/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/coral/flashcards.webp'),
  },
  gold: {
    core_lesson: require('../assets/images/personal_plan_tasks_fit/gold/core_lesson.webp'),
    route_phrase: require('../assets/images/personal_plan_tasks_fit/gold/route_gavan.webp'),
    recall: require('../assets/images/personal_plan_tasks_fit/gold/recall.webp'),
    quiz: require('../assets/images/personal_plan_tasks_fit/gold/choice.webp'),
    practice: require('../assets/images/personal_plan_tasks_fit/gold/practice.webp'),
    choice: require('../assets/images/personal_plan_tasks_fit/gold/choice.webp'),
    listening: require('../assets/images/personal_plan_tasks_fit/gold/listening.webp'),
    sentence_build: require('../assets/images/personal_plan_tasks_fit/gold/sentence_build.webp'),
    speaking: require('../assets/images/personal_plan_tasks_fit/gold/speaking.webp'),
    trainer: require('../assets/images/personal_plan_tasks_fit/gold/trainer.webp'),
    flashcards: require('../assets/images/personal_plan_tasks_fit/gold/flashcards.webp'),
  },
};

const MINIMAL_DARK_ROUTE_ASSETS: Record<PersonalPlanId, ImageSourcePropType> = {
  gavan: require('../assets/images/personal_plan_tasks_fit/minimalDark/route_gavan.webp'),
  voyazh: require('../assets/images/personal_plan_tasks_fit/minimalDark/route_voyazh.webp'),
  mitap: require('../assets/images/personal_plan_tasks_fit/minimalDark/route_mitap.webp'),
  impuls: require('../assets/images/personal_plan_tasks_fit/minimalDark/route_impuls.webp'),
  echo: require('../assets/images/personal_plan_tasks_fit/minimalDark/route_echo.webp'),
};

const THEMED_ROUTE_ASSETS: Record<ThemeMode, Record<PersonalPlanId, ImageSourcePropType>> = {
  midnight: {
    gavan: require('../assets/images/personal_plan_tasks_fit/midnight/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/midnight/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/midnight/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/midnight/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/midnight/route_echo.webp'),
  },
  minimalDark: MINIMAL_DARK_ROUTE_ASSETS,
  candyBlue: MINIMAL_DARK_ROUTE_ASSETS,
  indigo: MINIMAL_DARK_ROUTE_ASSETS,
  business: {
    gavan: require('../assets/images/personal_plan_tasks_fit/business/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/business/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/business/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/business/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/business/route_echo.webp'),
  },
  businessLight: {
    gavan: require('../assets/images/personal_plan_tasks_fit/businessLight/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/businessLight/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/businessLight/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/businessLight/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/businessLight/route_echo.webp'),
  },
  sagePorcelain: {
    gavan: require('../assets/images/personal_plan_tasks_fit/businessLight/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/businessLight/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/businessLight/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/businessLight/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/businessLight/route_echo.webp'),
  },
  ember: {
    gavan: require('../assets/images/personal_plan_tasks_fit/ember/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/ember/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/ember/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/ember/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/ember/route_echo.webp'),
  },
  aurora: {
    gavan: require('../assets/images/personal_plan_tasks_fit/aurora/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/aurora/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/aurora/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/aurora/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/aurora/route_echo.webp'),
  },
  volt: {
    gavan: require('../assets/images/personal_plan_tasks_fit/volt/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/volt/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/volt/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/volt/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/volt/route_echo.webp'),
  },
  dark: {
    gavan: require('../assets/images/personal_plan_tasks_fit/dark/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/dark/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/dark/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/dark/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/dark/route_echo.webp'),
  },
  coral: {
    gavan: require('../assets/images/personal_plan_tasks_fit/coral/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/coral/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/coral/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/coral/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/coral/route_echo.webp'),
  },
  gold: {
    gavan: require('../assets/images/personal_plan_tasks_fit/gold/route_gavan.webp'),
    voyazh: require('../assets/images/personal_plan_tasks_fit/gold/route_voyazh.webp'),
    mitap: require('../assets/images/personal_plan_tasks_fit/gold/route_mitap.webp'),
    impuls: require('../assets/images/personal_plan_tasks_fit/gold/route_impuls.webp'),
    echo: require('../assets/images/personal_plan_tasks_fit/gold/route_echo.webp'),
  },
};

function normalizeTaskVisualTheme(themeMode?: ThemeMode): ThemeMode {
  return themeMode && THEMED_TASK_ASSETS[themeMode] ? themeMode : DEFAULT_VISUAL_THEME;
}

export function getPersonalPlanTaskVisualAsset(
  source: PersonalPlanTaskVisualSource,
  planId?: PersonalPlanId,
  themeMode?: ThemeMode,
): ImageSourcePropType {
  const visualTheme = normalizeTaskVisualTheme(themeMode);
  if (source === 'route_phrase') {
    const routeAssets = THEMED_ROUTE_ASSETS[visualTheme] ?? THEMED_ROUTE_ASSETS[DEFAULT_VISUAL_THEME];
    return planId ? routeAssets[planId] : routeAssets.gavan;
  }
  return THEMED_TASK_ASSETS[visualTheme][source] ?? THEMED_TASK_ASSETS[DEFAULT_VISUAL_THEME][source];
}

function getPersonalPlanTaskVisualAssetKey(source: PersonalPlanTaskVisualSource, planId?: PersonalPlanId): string {
  if (source === 'route_phrase') return planId ? `${planId}_route_phrase` : 'gavan_route_phrase';
  return source;
}

export function getPersonalPlanTaskVisual(
  task: PlanDailyTask,
  planId?: PersonalPlanId,
  themeMode?: ThemeMode,
): PersonalPlanTaskVisual {
  switch (task.destination.type) {
    case 'lesson':
      return {
        source: 'core_lesson',
        label: 'Урок',
        intent: 'База перед фразами дня',
        icon: 'book-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('core_lesson', planId),
        asset: getPersonalPlanTaskVisualAsset('core_lesson', planId, themeMode),
        artStyle: 'bookGlow',
      };
    case 'plan_phrase_lesson':
      return {
        source: 'route_phrase',
        label: 'Фразы дня',
        intent: 'Живые фразы для сегодняшней ситуации',
        icon: 'key-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('route_phrase', planId),
        asset: getPersonalPlanTaskVisualAsset('route_phrase', planId, themeMode),
        artStyle: 'routeKey',
      };
    case 'plan_phrase_recall':
    case 'recall':
      return {
        source: 'recall',
        label: 'Закрепление',
        intent: 'Проверим, что вспоминается без подсказок',
        icon: 'refresh-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('recall', planId),
        asset: getPersonalPlanTaskVisualAsset('recall', planId, themeMode),
        artStyle: 'memoryLoop',
      };
    case 'plan_exercise':
      if (task.destination.exerciseType === 'plan_missing_word') {
        return {
          source: 'practice',
          label: 'Слово в фразе',
          intent: 'Вставляем одно нужное слово и сразу понимаем почему',
          icon: 'text-outline',
          assetKey: getPersonalPlanTaskVisualAssetKey('practice', planId),
          asset: getPersonalPlanTaskVisualAsset('practice', planId, themeMode),
          artStyle: 'practiceGrid',
        };
      }
      if (task.destination.exerciseType === 'plan_choose_natural_phrase') {
        return {
          source: 'choice',
          label: 'Выбор',
          intent: 'Выбери самый естественный короткий ответ',
          icon: 'checkmark-circle-outline',
          assetKey: getPersonalPlanTaskVisualAssetKey('choice', planId),
          asset: getPersonalPlanTaskVisualAsset('choice', planId, themeMode),
          artStyle: 'cardStack',
        };
      }
      if (task.destination.exerciseType === 'plan_listen_choose') {
        return {
          source: 'listening',
          label: 'На слух',
          intent: 'Слушаем фразу и выбираем смысл без спешки',
          icon: 'volume-high-outline',
          assetKey: getPersonalPlanTaskVisualAssetKey('listening', planId),
          asset: getPersonalPlanTaskVisualAsset('listening', planId, themeMode),
          artStyle: 'coachSignal',
        };
      }
      if (task.destination.exerciseType === 'plan_listen_build') {
        return {
          source: 'sentence_build',
          label: 'Собрать',
          intent: 'Послушай и собери короткую фразу',
          icon: 'reorder-four-outline',
          assetKey: getPersonalPlanTaskVisualAssetKey('sentence_build', planId),
          asset: getPersonalPlanTaskVisualAsset('sentence_build', planId, themeMode),
          artStyle: 'routeKey',
        };
      }
      if (task.destination.exerciseType === 'plan_pronunciation_repeat') {
        return {
          source: 'speaking',
          label: 'Вслух',
          intent: 'Повтори без финальной оценки',
          icon: 'mic-outline',
          assetKey: getPersonalPlanTaskVisualAssetKey('speaking', planId),
          asset: getPersonalPlanTaskVisualAsset('speaking', planId, themeMode),
          artStyle: 'memoryLoop',
        };
      }
      return {
        source: 'route_phrase',
        label: 'Практика',
        intent: 'Короткое упражнение по фразам дня',
        icon: 'sparkles-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('route_phrase', planId),
        asset: getPersonalPlanTaskVisualAsset('route_phrase', planId, themeMode),
        artStyle: 'routeKey',
      };
    case 'quiz':
      return {
        source: 'quiz',
        label: 'Вызов',
        intent: '10 коротких проверок по фразам дня',
        icon: 'help-circle-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('quiz', planId),
        asset: getPersonalPlanTaskVisualAsset('quiz', planId, themeMode),
        artStyle: 'quizPulse',
      };
    case 'practice':
      return {
        source: 'practice',
        label: 'Моя практика',
        intent: 'Берём то, что уже просится на повтор',
        icon: 'fitness-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('practice', planId),
        asset: getPersonalPlanTaskVisualAsset('practice', planId, themeMode),
        artStyle: 'practiceGrid',
      };
    case 'trainer':
      return {
        source: 'trainer',
        label: 'Тренер',
        intent: 'Разберём слабое место без суеты',
        icon: 'sparkles-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('trainer', planId),
        asset: getPersonalPlanTaskVisualAsset('trainer', planId, themeMode),
        artStyle: 'coachSignal',
      };
    case 'flashcards':
      return {
        source: 'flashcards',
        label: 'Карточки',
        intent: 'Быстро освежим нужные слова',
        icon: 'albums-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('flashcards', planId),
        asset: getPersonalPlanTaskVisualAsset('flashcards', planId, themeMode),
        artStyle: 'cardStack',
      };
    default:
      return {
        source: 'route_phrase',
        label: 'Практика',
        intent: 'Один понятный шаг на сегодня',
        icon: 'checkmark-circle-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('route_phrase', planId),
        asset: getPersonalPlanTaskVisualAsset('route_phrase', planId, themeMode),
        artStyle: 'routeKey',
      };
  }
}
