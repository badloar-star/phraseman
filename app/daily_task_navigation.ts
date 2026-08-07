import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Lang } from '../constants/i18n';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { dailyTaskAvailableForStudyTarget, type DailyTask } from './daily_tasks';
import { LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';
import { resolveLessonRuntimeGate } from './lesson_premium_gate';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { emitAppEvent } from './events';
import { getVerifiedPremiumStatus } from './premium_guard';
import type { TrainerSessionRoute } from './trainer_session';
import { startReservedTrainerSession } from './trainer_session_navigation';
import { lastOpenedLessonKey } from './target_storage_keys';

type DailyTaskRouter = {
  push: (route: any) => void;
  replace: (route: any) => void;
};

const dailyTaskTrainerSessionLock = { current: false };
const MIN_LESSON_ID = 1;
const MAX_LESSON_ID = 32;

type NavigateDailyTaskInput = {
  lang: Lang;
  router: DailyTaskRouter;
  studyTarget?: RuntimeStudyTarget;
  task: DailyTask;
};

export function normalizeDailyTaskLessonId(raw: string | null | undefined): number {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(parsed) && parsed >= MIN_LESSON_ID && parsed <= MAX_LESSON_ID
    ? parsed
    : MIN_LESSON_ID;
}

async function resolveAccessibleIrregularVerbLesson(
  preferredLessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<number | null> {
  const sorted = [...LESSONS_WITH_IRREGULAR_VERBS].sort((a, b) => a - b);
  const candidates = sorted.includes(preferredLessonId)
    ? [preferredLessonId, ...sorted.filter((id) => id !== preferredLessonId)]
    : sorted;

  for (const lessonId of candidates) {
    const gate = await resolveLessonRuntimeGate(lessonId, studyTarget).catch(() => 'progress_required' as const);
    if (gate === 'available') return lessonId;
  }
  return null;
}

export async function navigateDailyTask({ lang, router, studyTarget, task }: NavigateDailyTaskInput): Promise<void> {
  // lang остаётся частью публичного контракта, чтобы существующие entry points не
  // расходились по сигнатуре. Маршрутизация больше не содержит French-specific UI.
  void lang;

  if (!dailyTaskAvailableForStudyTarget(task, studyTarget)) {
    router.replace('/lessons_list' as any);
    return;
  }

  const lastLesson = await AsyncStorage.getItem(lastOpenedLessonKey(studyTarget));
  const lessonId = normalizeDailyTaskLessonId(lastLesson);

  const openLesson = async (): Promise<void> => {
    // Priming — только ускорение. Сам helper fail-open, а экран урока выполняет
    // собственную authoritative загрузку.
    await primeLessonScreenFromStorage(lessonId, studyTarget);
    router.push({ pathname: '/lesson1', params: { id: lessonId } });
  };

  const openTrainer = async (route: '/trainer' | TrainerSessionRoute): Promise<void> => {
    if (route === '/trainer') {
      router.push(route);
      return;
    }
    await startReservedTrainerSession({
      route,
      router,
      studyTarget,
      premiumAccess: getVerifiedPremiumStatus,
      lock: dailyTaskTrainerSessionLock,
    });
  };

  switch (task.type) {
    case 'different_lessons':
      router.replace('/lessons_list' as any);
      break;

    case 'total_answers':
    case 'correct_streak':
    case 'lesson_no_mistakes':
    case 'daily_active':
    case 'lesson_complete':
    case 'morning_session':
    case 'evening_session':
    case 'energy_spend':
    case 'early_all_done':
    case 'last_chance':
    case 'weekend_marathon':
    case 'revision_lesson':
    case 'perfect_big_lesson':
    case 'comeback_lesson':
      await openLesson();
      break;

    case 'verb_learned': {
      const verbLessonId = await resolveAccessibleIrregularVerbLesson(lessonId, studyTarget);
      if (verbLessonId == null) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Сначала открой урок с неправильными глаголами.',
          messageUk: 'Спочатку відкрий урок із неправильними дієсловами.',
          messageEs: 'Primero desbloquea una lección con verbos irregulares.',
        });
        router.replace('/lessons_list' as any);
        break;
      }
      router.push({
        pathname: '/lesson_irregular_verbs',
        params: { id: verbLessonId, autoPractice: '1' },
      });
      break;
    }

    case 'words_learned':
      router.push({
        pathname: '/lesson_words',
        params: { id: lessonId, autoPractice: '1' },
      });
      break;

    case 'open_theory':
      router.push({ pathname: '/lesson_help', params: { id: lessonId } });
      break;

    case 'flashcard_view':
    case 'flashcard_save':
    case 'flashcard_flip':
      router.push('/flashcards');
      break;

    case 'recall_session':
    case 'recall_answers':
    case 'recall_perfect':
      // Эти задания измеряют SRS-очередь `/review`, а не «Мою практику».
      router.push('/review' as any);
      break;

    case 'trainer_words':
      await openTrainer('/trainer_words_session');
      break;

    case 'trainer_phrases':
      await openTrainer('/trainer_phrases_session');
      break;

    case 'daily_phrase_read':
    case 'daily_phrase_save':
      router.replace('/(tabs)/home');
      break;

    case 'diagnostic_complete':
      router.push('/diagnostic_test');
      break;

    case 'invite_friend':
    case 'mentor_friend':
      router.push('/referrals' as any);
      break;

    case 'polyglot_day':
      // Legacy-сохранение старого типа не должно вести в несуществующий French flow.
      router.replace('/lessons_list' as any);
      break;

    case 'streak_freeze_use':
      router.push('/streak_stats' as any);
      break;

    default:
      await openLesson();
      break;
  }
}
