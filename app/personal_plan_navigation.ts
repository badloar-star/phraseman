import type { Router } from 'expo-router';
import type {
  PersonalPlanDefinition,
  PlanDailyTask,
  PlanDay,
  PlanTaskDestination,
} from './personal_plan_catalog';
import {
  getPersonalPlanPhraseLesson,
  getGeneratedPersonalPlanPhraseLessonContentUnitIds,
} from './personal_plan_phrase_lessons';

export function planTaskDestinationLabel(destination: PlanTaskDestination): string {
  const phraseLabel = (count: number): string => {
    const mod10 = Math.abs(count) % 10;
    const mod100 = Math.abs(count) % 100;
    if (mod10 === 1 && mod100 !== 11) return `${count} фраза`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} фразы`;
    return `${count} фраз`;
  };

  if (destination.type === 'lesson') return `Урок · ${phraseLabel(destination.requiredPhrases)}`;
  if (destination.type === 'plan_phrase_lesson') return `Фразы дня · ${destination.requiredPhrases}`;
  if (destination.type === 'plan_phrase_recall') return `Повтор · ${phraseLabel(destination.requiredPhrases)}`;
  if (destination.type === 'plan_exercise') {
    if (destination.exerciseType === 'plan_missing_word') return `Слова в фразе · ${destination.requiredCorrect}`;
    if (destination.exerciseType === 'plan_choose_natural_phrase') return `Выбор фразы · ${destination.requiredCorrect}`;
    if (destination.exerciseType === 'plan_listen_choose') return `На слух · ${destination.requiredCorrect}`;
    if (destination.exerciseType === 'plan_listen_build') return `Собрать на слух · ${destination.requiredCorrect}`;
    return `Произношение · ${destination.requiredCorrect}`;
  }
  if (destination.type === 'quiz') return `Квиз дня · ${destination.questionCount} вопросов`;
  if (destination.type === 'practice') {
    return `Моя практика · ${phraseLabel(destination.requiredPhrases ?? 3)}`;
  }
  if (destination.type === 'trainer') {
    const modeLabel = destination.mode === 'weak'
      ? 'слабое место'
      : destination.mode === 'hard'
        ? 'сложные фразы'
        : 'точечная тренировка';
    return `Тренер · ${modeLabel}`;
  }
  if (destination.type === 'flashcards') return `Карточки · ${destination.requiredCards ?? 3}`;
  return 'Повтор из памяти';
}

function generatedDayPhraseLessonId(plan: PersonalPlanDefinition, day: PlanDay): string {
  return `${plan.id}_d${String(day.dayIndex).padStart(3, '0')}_content_unit`;
}

function phraseLessonContentUnitIds(lessonId: string, count: number): string[] {
  const generatedIds = getGeneratedPersonalPlanPhraseLessonContentUnitIds(lessonId, count);
  if (generatedIds.length > 0) return generatedIds;
  const lesson = getPersonalPlanPhraseLesson(lessonId);
  return lesson?.phrases.slice(0, count).map((phrase) => String(phrase.id)) ?? [];
}

export function openPersonalPlanTask(
  router: Router,
  plan: PersonalPlanDefinition,
  day: PlanDay,
  task: PlanDailyTask,
  planInstanceId?: string,
): void {
  const { destination } = task;
  if (destination.type === 'lesson') {
    return;
  }
  if (destination.type === 'plan_phrase_lesson') {
    router.push({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_phrase_build',
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        lessonId: destination.lessonId,
        contentUnitIds: phraseLessonContentUnitIds(destination.lessonId, destination.requiredPhrases).join(','),
        requiredCorrect: String(destination.requiredPhrases),
      },
    } as any);
    return;
  }
  if (destination.type === 'recall') {
    const lessonId = generatedDayPhraseLessonId(plan, day);
    const destinationContentUnitIds = destination.phraseIds.filter((phraseId) => phraseId.startsWith(`${lessonId}_phrase_`));
    const fallbackContentUnitIds = getGeneratedPersonalPlanPhraseLessonContentUnitIds(lessonId, 4);
    const contentUnitIds = destinationContentUnitIds.length > 0 ? destinationContentUnitIds : fallbackContentUnitIds;

    router.push({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_phrase_recall',
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        lessonId,
        contentUnitIds: contentUnitIds.join(','),
        requiredCorrect: String(Math.max(1, Math.min(4, contentUnitIds.length))),
      },
    } as any);
    return;
  }
  if (destination.type === 'plan_phrase_recall') {
    const scheduledContentUnitIds = day.recallSchedule
      ?.filter((item) => item.phraseLessonId === destination.lessonId)
      .flatMap((item) => item.phraseIds) ?? [];
    const contentUnitIds = scheduledContentUnitIds.length > 0
      ? scheduledContentUnitIds
      : phraseLessonContentUnitIds(destination.lessonId, destination.requiredPhrases);

    router.push({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_phrase_recall',
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        lessonId: destination.lessonId,
        contentUnitIds: contentUnitIds.join(','),
        requiredCorrect: String(destination.requiredPhrases),
      },
    } as any);
    return;
  }
  if (destination.type === 'plan_exercise') {
    router.push({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: destination.exerciseType,
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        lessonId: destination.lessonId,
        contentUnitIds: destination.contentUnitIds.join(','),
        requiredCorrect: String(destination.requiredCorrect),
      },
    } as any);
    return;
  }
  if (destination.type === 'quiz') {
    router.push({
      pathname: '/quizzes_screen',
      params: {
        planQuizId: destination.quizId,
        planQuizLevel: destination.level,
        ...(destination.thematicCategoryId ? { planQuizThematicCategoryId: destination.thematicCategoryId } : {}),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
      },
    } as any);
    return;
  }
  if (destination.type === 'trainer') {
    router.push({
      pathname: '/trainer_smart_session',
      params: {
        mode: destination.mode,
        planTrainerTask: '1',
        requiredItems: String(destination.requiredItems ?? 1),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
      },
    } as any);
    return;
  }
  if (destination.type === 'flashcards') {
    router.push({
      pathname: '/flashcards_swipe',
      params: {
        planFlashcardsTask: '1',
        source: destination.deckId || 'saved:all',
        requiredCards: String(destination.requiredCards ?? 3),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
      },
    } as any);
    return;
  }
  if (destination.type === 'practice') {
    router.push({
      pathname: '/review',
      params: {
        planPracticeTask: '1',
        trainingId: destination.trainingId,
        requiredPhrases: String(destination.requiredPhrases ?? 3),
        requiredWords: String(destination.requiredWords ?? 5),
        planTaskId: task.id,
        ...(planInstanceId ? { planInstanceId } : {}),
        planId: plan.id,
        planDayIndex: String(day.dayIndex),
      },
    } as any);
    return;
  }
}

export default function __RouteShim() { return null; }
