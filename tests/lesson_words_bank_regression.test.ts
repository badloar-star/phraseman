jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '11' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('../components/AddToFlashcard', () => () => null);
jest.mock('../components/ContentWrap', () => ({ children }: any) => children);
jest.mock('../components/LangContext', () => ({
  useLang: () => ({ lang: 'ru', s: { words: {} } }),
}));
jest.mock('../components/StudyTargetContext', () => ({
  useStudyTarget: () => ({ studyTarget: 'en' }),
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: {}, f: {}, themeMode: 'dark' }),
}));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ energy: 10, isUnlimited: true }),
}));
jest.mock('../components/NoEnergyModal', () => () => null);
jest.mock('../components/CoachToast', () => () => null);
jest.mock('../components/ReportErrorButton', () => () => null);
jest.mock('../components/ThemedConfirmModal', () => () => null);
jest.mock('../components/ScreenGradient', () => ({ children }: any) => children);
jest.mock('../hooks/use-screen', () => ({ useScreen: () => ({ isSmallScreen: false }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticError: jest.fn(), hapticTap: jest.fn() }));
jest.mock('../hooks/use-flashcards', () => ({ loadFlashcards: jest.fn() }));
jest.mock('../hooks/use-audio', () => ({ useAudio: () => ({ speakAudio: jest.fn(), voiceOut: false, speechRate: 1 }) }));
jest.mock('../app/daily_tasks', () => ({ updateMultipleTaskProgress: jest.fn() }));
jest.mock('../app/settings_edu', () => ({ loadSettings: jest.fn() }));
jest.mock('../app/xp_manager', () => ({ registerXP: jest.fn() }));
jest.mock('../app/shards_system', () => ({ addShards: jest.fn() }));
jest.mock('../app/mistake_log', () => ({ logMistake: jest.fn() }));
jest.mock('../app/trainer_store', () => ({ activateWordForTrainer: jest.fn(), recordWordMistake: jest.fn() }));
jest.mock('../app/coach_toast_trigger', () => ({ checkCoachToastNeededWithAnalytics: jest.fn() }));
jest.mock('../app/stats_daily_breakdown', () => ({ bumpStatsDaily: jest.fn() }));
jest.mock('../app/lesson_premium_gate', () => ({ openLessonAccessGate: jest.fn(), openLessonGateByRuntime: jest.fn(), shouldBlockLessonAccess: jest.fn() }));
jest.mock('../app/vocabulary_target_gate', () => ({
  frenchVocabularyGateCopy: jest.fn(),
  vocabularyContentAvailableForTarget: jest.fn(() => true),
}));

import { buildLessonWordOptions } from '../app/lesson_word_options';
import { isCorrectAnswer } from '../constants/contractions';
import { lessonWordBank } from '../app/lesson_words';

describe('lesson words bank regressions from error reports', () => {
  it('keeps lesson 11 past-simple verb forms aligned with past-tense RU prompts', () => {
    const words = lessonWordBank(11);
    const byEn = new Map(words.map((word) => [word.en, word]));

    expect(byEn.get('mailed')?.ru).toBe('Отправил(а) почтой');
    expect(byEn.get('packed')?.ru).toBe('Упаковал(а)');
    expect(byEn.get('turned')?.ru).toBe('Выключил(а) (с off) / повернул(а)');
    expect(byEn.get('charged')?.ru).toBe('Зарядил(а)');

    expect(byEn.has('maile')).toBe(false);
    expect(byEn.has('packe')).toBe(false);
    expect(byEn.has('turne')).toBe(false);
    expect(byEn.has('charge')).toBe(false);
  });

  it('does not accept missing-final-d variants as correct vocabulary answers', () => {
    expect(isCorrectAnswer('maile', 'mailed')).toBe(false);
    expect(isCorrectAnswer('packe', 'packed')).toBe(false);
    expect(isCorrectAnswer('turne', 'turned')).toBe(false);
    expect(isCorrectAnswer('charge', 'charged')).toBe(false);
  });

  it('builds lesson 11 choices around the actual past-simple correct option', () => {
    const words = lessonWordBank(11);
    for (const expected of ['mailed', 'packed', 'turned', 'charged']) {
      const word = words.find((item) => item.en === expected);
      expect(word).toBeDefined();
      const options = buildLessonWordOptions(word!, words, words);
      expect(options).toContain(expected);
    }
  });

  it('keeps lesson 22 learning selectable when its RU prompt asks for learning', () => {
    const words = lessonWordBank(22);
    const word = words.find((item) => item.en === 'learning');

    expect(word).toBeDefined();
    expect(word?.ru).toBe('Процесс обучения / изучения');
    expect(word?.uk).toBe('Процес навчання / вивчення');

    const options = buildLessonWordOptions(word!, words, words);
    expect(options).toContain('learning');
  });
});
