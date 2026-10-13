jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '11' }),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: any) => children }));
jest.mock('../components/AddToFlashcard', () => () => null);
jest.mock('../components/ContentWrap', () => ({ children }: any) => children);
jest.mock('../components/DuoPressable', () => ({ children }: any) => children);
// зачем: итог слов теперь общий экран 2.0 (тянет expo-image); тест — про банк слов, итог не нужен.
jest.mock('../components/completion/V2DoneScreen', () => () => null);
// зачем: экран слов теперь тянет UI-обвязку 2.0 (reanimated, монеты, счётчик); тест про банк слов, ей достаточно заглушек.
// зачем (10.10): заливка полосы прогресса берёт Animated/Easing из react-native, а в этой среде он урезан до заглушки — полоса тесту не нужна.
jest.mock('../components/KitProgressFill', () => ({ __esModule: true, default: () => null, KitProgressFill: () => null }));
jest.mock('../components/practice/PracticeStates', () => ({ PracticeCta: () => null, PracticeProgressRow: () => null, PracticeQuestionCard: () => null }));
jest.mock('../components/session_attempts/SessionAttemptsHud', () => () => null);
jest.mock('../components/PracticeRuneCounter', () => () => null);
jest.mock('../components/AnimatedCountUpText', () => () => null);
jest.mock('../components/rewards/CoinRewardFlight', () => () => null);
jest.mock('../hooks/useCoinRewardFlight', () => ({ useCoinRewardFlight: jest.fn() }));
jest.mock('../hooks/usePracticeRunes', () => ({ usePracticeRunes: jest.fn() }));
jest.mock('../components/practice/PracticeChrome', () => ({ PracticeBackButton: () => null, PracticeHeaderTitle: () => null }));
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
jest.mock('../components/ReportErrorButton', () => () => null);
jest.mock('../components/ThemedConfirmModal', () => () => null);
jest.mock('../components/ScreenGradient', () => ({ children }: any) => children);
jest.mock('../hooks/use-screen', () => ({ useScreen: () => ({ isSmallScreen: false }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticError: jest.fn(), hapticTap: jest.fn() }));
jest.mock('../hooks/use-flashcards', () => ({ loadFlashcards: jest.fn() }));
jest.mock('../hooks/use-audio', () => ({ useAudio: () => ({ speakAudio: jest.fn(), voiceOut: false, speechRate: 1 }) }));
jest.mock('../app/settings_edu', () => ({ loadSettings: jest.fn() }));
jest.mock('../app/shards_system', () => ({ addShards: jest.fn() }));
jest.mock('../app/stats_daily_breakdown', () => ({ bumpStatsDaily: jest.fn() }));
jest.mock('../app/feedback/feedback_kit', () => ({
  __esModule: true,
  default: {
    tap: jest.fn(),
    correct: jest.fn(),
    wrong: jest.fn(),
    combo: jest.fn(),
    comboBreak: jest.fn(),
  },
}));
jest.mock('../app/lesson_premium_gate', () => ({ openLessonAccessGate: jest.fn(), openLessonGateByRuntime: jest.fn(), shouldBlockLessonAccess: jest.fn() }));
// зачем (d425ffa08, 13.10): шлюз урока рисует скелет LessonFirstFrame → LessonLoadingSkeleton → AppArtBackdrop (StyleSheet на заглушке
// react-native падает при импорте); банку слов он не нужен.
jest.mock('../modules/lesson_first_frame', () => ({ __esModule: true, default: () => null }));
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

// зачем (холодный старт 04.10): таблицы счётчиков и ключей слов заменены ленивыми функциями с кэшем —
// сторожим, что значения прежние и кэш не портится, если вызывающий меняет полученный массив.
describe('lesson words lazy bank accessors', () => {
  it('count and keys match the bank for every lesson with words; lessons without words stay empty', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LESSONS_WITH_WORDS, lessonWordCount, lessonWordKeys } = require('../app/lesson_words') as typeof import('../app/lesson_words');
    expect(LESSONS_WITH_WORDS.size).toBeGreaterThan(0);
    for (const lessonId of LESSONS_WITH_WORDS) {
      const bank = lessonWordBank(lessonId);
      expect(lessonWordCount(lessonId)).toBe(bank.length);
      expect([...(lessonWordKeys(lessonId) ?? [])].sort()).toEqual([...new Set(bank.map((word) => word.en))].sort());
    }
    expect(lessonWordCount(9_999)).toBe(0);
    expect(lessonWordKeys(9_999)).toBeUndefined();
  });

  it('a caller mutating the returned bank does not change the cached bank', () => {
    const first = lessonWordBank(11);
    const length = first.length;
    first.splice(0, first.length);
    expect(lessonWordBank(11)).toHaveLength(length);
  });
});
