// зачем: те же заглушки экранных зависимостей, что в lesson_words_bank_regression (банк слов тянет экран слов)
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
// зачем (закон владельца 22.10 «назад в одном месте»): «Слова урока» берут общую кнопку; её цепочка (стекло темы, StyleSheet)
// на заглушке react-native падает при импорте, а банку слов кнопка не нужна.
jest.mock('../components/v2/ScreenBackButton', () => ({
  __esModule: true,
  default: () => null,
  SafeTopBackButton: () => null,
  ScreenBackSlot: () => null,
  ScreenBackZone: () => null,
  SCREEN_BACK_SIZE: 48,
  SCREEN_BACK_LEFT: 20,
}));
jest.mock('../app/vocabulary_target_gate', () => ({
  frenchVocabularyGateCopy: jest.fn(),
  vocabularyContentAvailableForTarget: jest.fn(() => true),
}));


// зачем (владелец 05.11 09:05, образец — старый курс английского): «Слова урока N» показывает ТОЛЬКО слова, впервые встретившиеся в этом уроке;
// слова прошлых уроков не повторяются, чтобы повторить их, человек возвращается в тот урок. Сторож: ни одно слово не показано в двух уроках —
// для английского курса (прежний банк) и для fr/es/de/it (словарь курса).
import { LESSONS_WITH_WORDS, lessonWordBank } from '../app/lesson_words';
import { classicLessonWordBank } from '../app/classic_lesson_words';

const norm = (w: string): string => w.trim().toLocaleLowerCase();

describe('lesson words: every word belongs to exactly one lesson', () => {
  it('English course: no word is shown in two lessons', () => {
    const owner = new Map<string, number>();
    const repeats: string[] = [];
    for (const lessonId of [...LESSONS_WITH_WORDS].sort((a, b) => a - b)) {
      for (const word of lessonWordBank(lessonId)) {
        const key = norm(word.en);
        const first = owner.get(key);
        if (first !== undefined && first !== lessonId) repeats.push(`${word.en}: ${first} и ${lessonId}`);
        else owner.set(key, lessonId);
      }
    }
    expect(repeats).toEqual([]);
  });

  it.each(['fr', 'es', 'de', 'it'] as const)('%s course: no lemma is shown in two lessons', (target) => {
    const owner = new Map<string, number>();
    const repeats: string[] = [];
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      for (const word of classicLessonWordBank(target, lessonId)) {
        const key = norm(word.en);
        const first = owner.get(key);
        if (first !== undefined) repeats.push(`${word.en}: ${first} и ${lessonId}`);
        owner.set(key, lessonId);
      }
    }
    expect(repeats).toEqual([]);
  });
});
