import type { PersonalPlanId, PlanDailyTask } from './personal_plan_catalog';
import type { PlanArtIconName } from './personal_plan_art';
import type { ImageSourcePropType } from 'react-native';

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

const TASK_ASSETS = {
  coreLesson: require('../assets/images/personal_plan_tasks/core_lesson.png'),
  routePhraseGavan: require('../assets/images/personal_plan_tasks/route_phrase.png'),
  routePhraseVoyazh: require('../assets/images/personal_plan_tasks/voyazh_route.png'),
  routePhraseMitap: require('../assets/images/personal_plan_tasks/mitap_route.png'),
  routePhraseImpuls: require('../assets/images/personal_plan_tasks/impuls_route.png'),
  routePhraseEcho: require('../assets/images/personal_plan_tasks/echo_route.png'),
  recall: require('../assets/images/personal_plan_tasks/recall.png'),
  quiz: require('../assets/images/personal_plan_tasks/quiz.png'),
  practice: require('../assets/images/personal_plan_tasks/practice.png'),
  trainer: require('../assets/images/personal_plan_tasks/trainer.png'),
  flashcards: require('../assets/images/personal_plan_tasks/flashcards.png'),
};

const ROUTE_ASSETS: Record<PersonalPlanId, ImageSourcePropType> = {
  gavan: TASK_ASSETS.routePhraseGavan,
  voyazh: TASK_ASSETS.routePhraseVoyazh,
  mitap: TASK_ASSETS.routePhraseMitap,
  impuls: TASK_ASSETS.routePhraseImpuls,
  echo: TASK_ASSETS.routePhraseEcho,
};

export function getPersonalPlanTaskVisualAsset(
  source: PersonalPlanTaskVisualSource,
  planId?: PersonalPlanId,
): ImageSourcePropType {
  switch (source) {
    case 'core_lesson':
      return TASK_ASSETS.coreLesson;
    case 'route_phrase':
      return planId ? ROUTE_ASSETS[planId] : TASK_ASSETS.routePhraseGavan;
    case 'recall':
      return TASK_ASSETS.recall;
    case 'quiz':
      return TASK_ASSETS.quiz;
    case 'practice':
      return TASK_ASSETS.practice;
    case 'choice':
      return TASK_ASSETS.flashcards;
    case 'listening':
      return TASK_ASSETS.trainer;
    case 'sentence_build':
      return TASK_ASSETS.routePhraseGavan;
    case 'speaking':
      return TASK_ASSETS.recall;
    case 'trainer':
      return TASK_ASSETS.trainer;
    case 'flashcards':
      return TASK_ASSETS.flashcards;
    default:
      return TASK_ASSETS.routePhraseGavan;
  }
}

function getPersonalPlanTaskVisualAssetKey(source: PersonalPlanTaskVisualSource, planId?: PersonalPlanId): string {
  if (source === 'route_phrase') return planId ? `${planId}_route_phrase` : 'gavan_route_phrase';
  return source;
}

export function getPersonalPlanTaskVisual(task: PlanDailyTask, planId?: PersonalPlanId): PersonalPlanTaskVisual {
  switch (task.destination.type) {
    case 'lesson':
      return {
        source: 'core_lesson',
        label: 'Урок',
        intent: 'База перед фразами дня',
        icon: 'book-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('core_lesson', planId),
        asset: getPersonalPlanTaskVisualAsset('core_lesson', planId),
        artStyle: 'bookGlow',
      };
    case 'plan_phrase_lesson':
      return {
        source: 'route_phrase',
        label: 'Фразы дня',
        intent: 'Живые фразы для сегодняшней ситуации',
        icon: 'key-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('route_phrase', planId),
        asset: getPersonalPlanTaskVisualAsset('route_phrase', planId),
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
        asset: getPersonalPlanTaskVisualAsset('recall', planId),
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
          asset: getPersonalPlanTaskVisualAsset('practice', planId),
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
          asset: getPersonalPlanTaskVisualAsset('choice', planId),
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
          asset: getPersonalPlanTaskVisualAsset('listening', planId),
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
          asset: getPersonalPlanTaskVisualAsset('sentence_build', planId),
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
          asset: getPersonalPlanTaskVisualAsset('speaking', planId),
          artStyle: 'memoryLoop',
        };
      }
      return {
        source: 'route_phrase',
        label: 'Практика',
        intent: 'Короткое упражнение по фразам дня',
        icon: 'sparkles-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('route_phrase', planId),
        asset: getPersonalPlanTaskVisualAsset('route_phrase', planId),
        artStyle: 'routeKey',
      };
    case 'quiz':
      return {
        source: 'quiz',
        label: 'Вызов',
        intent: '10 коротких проверок по фразам дня',
        icon: 'help-circle-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('quiz', planId),
        asset: getPersonalPlanTaskVisualAsset('quiz', planId),
        artStyle: 'quizPulse',
      };
    case 'practice':
      return {
        source: 'practice',
        label: 'Моя практика',
        intent: 'Берём то, что уже просится на повтор',
        icon: 'fitness-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('practice', planId),
        asset: getPersonalPlanTaskVisualAsset('practice', planId),
        artStyle: 'practiceGrid',
      };
    case 'trainer':
      return {
        source: 'trainer',
        label: 'Тренер',
        intent: 'Разберём слабое место без суеты',
        icon: 'sparkles-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('trainer', planId),
        asset: getPersonalPlanTaskVisualAsset('trainer', planId),
        artStyle: 'coachSignal',
      };
    case 'flashcards':
      return {
        source: 'flashcards',
        label: 'Карточки',
        intent: 'Быстро освежим нужные слова',
        icon: 'albums-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('flashcards', planId),
        asset: getPersonalPlanTaskVisualAsset('flashcards', planId),
        artStyle: 'cardStack',
      };
    default:
      return {
        source: 'route_phrase',
        label: 'Практика',
        intent: 'Один понятный шаг на сегодня',
        icon: 'checkmark-circle-outline',
        assetKey: getPersonalPlanTaskVisualAssetKey('route_phrase', planId),
        asset: getPersonalPlanTaskVisualAsset('route_phrase', planId),
        artStyle: 'routeKey',
      };
  }
}
