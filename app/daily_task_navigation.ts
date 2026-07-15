import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { Lang } from '../constants/i18n';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { dailyTaskAvailableForStudyTarget, type DailyTask } from './daily_tasks';
import { dailyPhraseContentAvailableForTarget, frenchDailyPhraseGateCopy } from './daily_phrase_target_gate';
import { diagnosticContentAvailableForTarget, frenchDiagnosticGateCopy } from './diagnostic_target_gate';
import { emitAppEvent } from './events';
import { flashcardsSourceGatedContentAvailableForTarget, frenchFlashcardsGateCopy } from './flashcards_target_gate';
import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate';
import { LESSONS_WITH_IRREGULAR_VERBS } from './irregular_verbs_data';
import { primeLessonScreenFromStorage } from './lesson_screen_bootstrap';
import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate';
import { getVerifiedPremiumStatus } from './premium_guard';
import type { TrainerSessionRoute } from './trainer_session';
import { startReservedTrainerSession } from './trainer_session_navigation';
import { frenchQuizGateCopy, quizContentAvailableForTarget } from './quiz_target_gate';
import { frenchTrainerGateCopy, trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { lastOpenedLessonKey, quizNavLevelKey, storageStudyTarget } from './target_storage_keys';
import { frenchVocabularyGateCopy, vocabularyContentAvailableForTarget, type VocabularyGateSurface } from './vocabulary_target_gate';

type DailyTaskRouter = {
  push: (route: any) => void;
  replace: (route: any) => void;
};

const dailyTaskTrainerSessionLock = { current: false };

type NavigateDailyTaskInput = {
  lang: Lang;
  router: DailyTaskRouter;
  studyTarget?: RuntimeStudyTarget;
  task: DailyTask;
};

export async function navigateDailyTask({ lang, router, studyTarget, task }: NavigateDailyTaskInput): Promise<void> {
  if (!dailyTaskAvailableForStudyTarget(task, studyTarget)) {
    router.replace('/(tabs)/lessons' as any);
    return;
  }

  const lastLesson = await AsyncStorage.getItem(lastOpenedLessonKey(studyTarget));
  const lessonId = parseInt(lastLesson || '1', 10);

  const openLessonOrFrenchGate = async () => {
    if (!frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId)) {
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: 'French урок ещё на source gate. English фразы не будут открыты как замена.',
        messageUk: 'French урок ще на source gate. English фрази не відкриватимуться як заміна.',
        messageEs: 'French lesson is still behind source gate.',
      });
      router.replace('/(tabs)/lessons' as any);
      return;
    }
    await primeLessonScreenFromStorage(lessonId, studyTarget);
    router.push({ pathname: '/lesson1', params: { id: lessonId } });
  };

  const openQuizOrFrenchGate = async (level: 'easy' | 'medium' | 'hard') => {
    if (!quizContentAvailableForTarget(studyTarget)) {
      const copy = frenchQuizGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French quizzes are still behind source gate.',
      });
      router.replace('/quizzes_screen' as any);
      return;
    }
    await AsyncStorage.setItem(quizNavLevelKey(studyTarget), level);
    // push (не replace): экран заданий дейликов должен остаться в стеке, чтобы «назад»
    // из квиза возвращал на список заданий, а не проваливался на экран под ним.
    // (quizzes_screen — это Stack.Screen, а не вкладка таб-бара — см. app/_layout.tsx.)
    router.push('/quizzes_screen');
  };

  const openDiagnosticOrFrenchGate = () => {
    if (!diagnosticContentAvailableForTarget(studyTarget)) {
      const copy = frenchDiagnosticGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French diagnostic is still behind source gate.',
      });
      router.replace('/(tabs)/lessons' as any);
      return;
    }
    router.push('/diagnostic_test');
  };

  const openVocabularyOrFrenchGate = (surface: VocabularyGateSurface, route: any) => {
    if (!vocabularyContentAvailableForTarget(studyTarget, surface)) {
      const copy = frenchVocabularyGateCopy(surface, lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French vocabulary is still behind source gate.',
      });
      router.replace({ pathname: '/lesson_menu', params: { id: lessonId } });
      return;
    }
    router.push(route);
  };

  const openTrainerOrFrenchGate = async (route: '/trainer' | TrainerSessionRoute) => {
    if (!trainerSessionContentAvailableForTarget(studyTarget)) {
      const copy = frenchTrainerGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French trainer is still behind source gate.',
      });
      router.replace('/(tabs)/lessons' as any);
      return;
    }
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

  const openFlashcardsOrFrenchGate = () => {
    if (!flashcardsSourceGatedContentAvailableForTarget(storageStudyTarget(studyTarget), 'system_cards')) {
      const copy = frenchFlashcardsGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French flashcards are still behind source gate.',
      });
      router.replace('/(tabs)/lessons' as any);
      return;
    }
    router.push('/flashcards');
  };

  const openDailyPhraseOrFrenchGate = () => {
    if (!dailyPhraseContentAvailableForTarget(studyTarget)) {
      const copy = frenchDailyPhraseGateCopy(lang);
      emitAppEvent('action_toast', {
        type: 'info',
        messageRu: copy.title,
        messageUk: copy.title,
        messageEs: 'French daily phrase is still behind source gate.',
      });
    }
    router.replace('/(tabs)/home');
  };

  switch (task.type) {
    case 'different_lessons':
      router.replace('/(tabs)/lessons' as any);
      break;
    case 'total_answers':
    case 'correct_streak':
    case 'lesson_no_mistakes':
    case 'daily_active':
    case 'lesson_complete':
    case 'morning_session':
    case 'evening_session':
    case 'energy_spend':
      await openLessonOrFrenchGate();
      break;
    case 'verb_learned': {
      let verbLessonId = lessonId;
      if (!LESSONS_WITH_IRREGULAR_VERBS.has(verbLessonId)) {
        const sorted = [...LESSONS_WITH_IRREGULAR_VERBS].sort((a, b) => a - b);
        verbLessonId = sorted[0] ?? 1;
      }
      openVocabularyOrFrenchGate('irregular_verbs', { pathname: '/lesson_irregular_verbs', params: { id: verbLessonId } });
      break;
    }
    case 'words_learned':
      openVocabularyOrFrenchGate('lesson_words', { pathname: '/lesson_words', params: { id: lessonId } });
      break;
    case 'quiz_hard':
      await openQuizOrFrenchGate('hard');
      break;
    case 'quiz_score':
    case 'quiz_perfect':
    case 'quiz_easy':
      await openQuizOrFrenchGate('easy');
      break;
    case 'quiz_medium':
      await openQuizOrFrenchGate('medium');
      break;
    case 'quiz_hard_perfect':
      await openQuizOrFrenchGate('hard');
      break;
    case 'open_theory':
      if (!lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId)) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'French теория откроется после source gate. English theory не подставляется.',
          messageUk: 'French теорія відкриється після source gate. English theory не підставляється.',
          messageEs: 'French theory is still behind source gate.',
        });
        router.replace('/(tabs)/lessons' as any);
        break;
      }
      router.push({ pathname: '/lesson_help', params: { id: lessonId } });
      break;
    case 'flashcard_view':
    case 'flashcard_save':
    case 'flashcard_flip':
      openFlashcardsOrFrenchGate();
      break;
    case 'recall_session':
    case 'recall_answers':
    case 'recall_perfect':
      await openTrainerOrFrenchGate('/trainer');
      break;
    case 'trainer_words':
      await openTrainerOrFrenchGate('/trainer_words_session');
      break;
    case 'trainer_phrases':
      await openTrainerOrFrenchGate('/trainer_phrases_session');
      break;
    case 'trainer_arena':
      await openTrainerOrFrenchGate('/trainer_arena_session');
      break;
    case 'daily_phrase_read':
    case 'daily_phrase_save':
      openDailyPhraseOrFrenchGate();
      break;
    case 'diagnostic_complete':
      openDiagnosticOrFrenchGate();
      break;
    case 'invite_friend':
      if (Platform.OS === 'ios') {
        router.push('/(tabs)/friends' as any);
      } else {
        router.push('/settings_invite_friend' as any);
      }
      break;
    case 'arena_play':
    case 'arena_win':
    case 'arena_rank_promoted':
    case 'arena_plays_wins_combo':
      router.replace({
        pathname: '/(tabs)/arena' as any,
        params: { autoSearch: '1', playAgainTs: String(Date.now()) },
      });
      break;
    default:
      await openLessonOrFrenchGate();
      break;
  }
}
