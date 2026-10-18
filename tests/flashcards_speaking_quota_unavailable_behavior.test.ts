import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockConsumeQuota = jest.fn();
const mockConfirmEnergy = jest.fn();
const mockRefundEnergy = jest.fn();
const mockAcknowledgeEnergy = jest.fn();
const mockBack = jest.fn();
const mockRouter = { replace: mockReplace, back: mockBack };
const mockEnergyIntent = {
  operationId: 'energy:test:speaking',
  grant: { kind: 'flashcards_speaking', subjectId: 'saved', attemptId: 'speaking-attempt' },
};
const mockSpeak = jest.fn();
const mockStopSpeech = jest.fn();
let mockAttemptIdFactory = () => 'attempt-stable';
let mockPendingRecord: Record<string, any> | null = null;
let mockSpeechNa = false;

jest.mock('react-native', () => ({
  ScrollView: 'ScrollView', Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View',
  // зачем: 17fbb3d32 — шапка тренировок по practice.html (PracticeChrome) собрана на Pressable.
  Pressable: 'Pressable',
  Platform: { OS: 'android', select: (values: Record<string, unknown>) => values.android ?? values.default },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ deck: 'saved', size: '10' }),
  useRouter: () => mockRouter,
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// зачем (Карточки 2.0 12.10, «Продолжить»): запись позиции — отдельный хук (покрыт pack_continue_recorder.test.ts); в поведенческом тесте экрана он заглушка
jest.mock('../app/flashcards/use_pack_continue_recorder', () => ({ usePackContinueRecorder: () => ({ record: () => undefined, flush: () => undefined }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
// зачем: экран «Устно» берёт отступы через useStableSafeAreaInsets (правило стабильной раскладки, Performance Bible).
jest.mock('../app/stable_safe_area_metrics', () => ({
  useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('../components/ThemeContext', () => ({
  // зачем: D139 (шкала текста 16/13) и стекло 2.0 — экран берёт FONT_SCALE, fontSize, uiScale и тему стекла.
  FONT_SCALE: { small: 1, medium: 1, large: 1.15 },
  useTheme: () => ({
    theme: { bgCard: '#111', bgSurface: '#222', textPrimary: '#fff', textMuted: '#aaa', textGhost: '#777', border: '#333', accent: '#0f0', correct: '#0f0', danger: '#f00' },
    f: { caption: 12, body: 16, bodyLg: 18, h1: 24, h2: 22 },
    fontSize: 'medium',
    uiScale: 1,
    liquidGlassThemeId: 'graphite',
  }),
}));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ accessResolved: true }) }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ confirmSpendOne: mockConfirmEnergy, refundOne: mockRefundEnergy, acknowledgeSessionStart: mockAcknowledgeEnergy }),
  useEnergySessionIntent: () => mockEnergyIntent,
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../hooks/use-audio', () => ({ useAudio: () => ({ speak: mockSpeak, stop: mockStopSpeech }) }));
// зачем: 17fbb3d32 (30.09) — «Устно» списывает месячный лимит тренировок (30 в месяц), а не старую квоту.
jest.mock('../app/monthly_training_sessions', () => ({
  consumeMonthlyTrainingSession: (...args: unknown[]) => mockConsumeQuota(...args),
}));
jest.mock('../app/flashcard_training_pending_grant', () => ({
  resolveFlashcardTrainingPendingGrantAccount: async (runtimeToken: unknown) => ({ stableUid: 'account-a', lineage: 1, runtimeToken }),
  prepareFlashcardTrainingPendingGrant: async (input: any) => {
    if (mockPendingRecord) return { status: 'reused', record: mockPendingRecord };
    mockPendingRecord = {
      ...input,
      fingerprint: 'speaking-scope',
      phase: 'prepared',
      energyState: 'pending',
    };
    return { status: 'prepared', record: mockPendingRecord };
  },
  // зачем (лимит тренировок 04.10): экраны делают claim старта через помощник модуля.
  claimFlashcardTrainingRoundStart: async (input: any) => {
    if (mockPendingRecord) mockPendingRecord = { ...mockPendingRecord, startInProgress: mockPendingRecord.startInProgress ?? { claimId: 'test-claim' } };
    return mockPendingRecord ?? input.record;
  },
  logFlashcardTrainingRoundClear: () => undefined,
  reconcileFlashcardTrainingPendingGrant: async () => mockPendingRecord
    ? { status: 'found', record: mockPendingRecord }
    : { status: 'missing' },
  markFlashcardTrainingEnergyCharged: async () => {
    mockPendingRecord = { ...mockPendingRecord, energyState: 'charged' };
    return { status: 'charged', record: mockPendingRecord };
  },
  markFlashcardTrainingQuotaCommitted: async () => {
    mockPendingRecord = { ...mockPendingRecord, phase: 'quota_committed' };
    return { status: 'quota_committed', record: mockPendingRecord };
  },
  markFlashcardTrainingPendingGrantPlayable: async () => {
    mockPendingRecord = { ...mockPendingRecord, phase: 'playable' };
    return { status: 'playable', record: mockPendingRecord };
  },
  acknowledgeAndClearFlashcardTrainingPendingGrant: async (
    _account: unknown,
    _fingerprint: string,
    acknowledge: (operationId: string) => Promise<boolean>,
  ) => {
    if (mockPendingRecord?.energyOperationId) await acknowledge(mockPendingRecord.energyOperationId);
    mockPendingRecord = null;
    return { status: 'cleared' };
  },
  abandonFlashcardTrainingPendingGrant: async (
    _account: unknown,
    _fingerprint: string,
    refund: (operationId: string, reason: string) => Promise<void>,
    _now?: number,
    reason = 'entry_cancelled',
  ) => {
    if (mockPendingRecord?.energyState === 'charged') {
      await refund(mockPendingRecord.energyOperationId, reason);
      mockPendingRecord = { ...mockPendingRecord, energyState: 'refunded' };
      return { status: 'refunded' };
    }
    return { status: 'nothing_to_refund' };
  },
  discardFlashcardTrainingPendingGrant: async () => {
    if (mockPendingRecord?.phase === 'prepared') mockPendingRecord = null;
    return { status: 'removed' };
  },
}));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ generation: 1, stableId: 'account-a', phase: 'active' }) }));
jest.mock('../app/flashcards/deck_sources', () => ({
  deckRefKey: () => 'saved', parseDeckParams: () => [{ kind: 'saved' }],
  loadDeckCardsMulti: jest.fn(async () => [{ id: 'one', en: 'hello', translation: 'привет' }]),
  // зачем: D127 (2acba6874) — «Устно» отбрасывает карточки без языка озвучки; у тестовой карточки язык есть.
  voicedDeckCards: (cards: unknown[]) => cards,
}));
jest.mock('../app/flashcards/mode_prefs', () => ({
  FC_DEFAULT_SESSION_SIZE: 10, isValidSessionSize: () => true, getLastPreset: jest.fn(async () => null), presetDeckIds: () => [],
}));
jest.mock('../app/flashcards/word_strength', () => ({ loadWordStrengthMap: jest.fn() }));
jest.mock('../hooks/useSessionAttempts', () => ({ useSessionAttempts: () => ({
  state: { phase: 'ready', remainingAttempts: 3 }, hydrated: true, hydrationTrusted: true,
  registerVerdict: jest.fn(), updateQuestion: jest.fn(), restoreAfterSessionRuneForfeit: jest.fn(),
}) }));
jest.mock('../hooks/useSessionAttemptAutoReset', () => ({ useSessionAttemptAutoReset: jest.fn() }));
jest.mock('../hooks/usePracticeRunes', () => ({ usePracticeRunes: () => ({ hydrating: false, runes: 0, settle: jest.fn(), startNewCompletion: jest.fn(), forfeitPendingRunes: jest.fn() }) }));
jest.mock('../hooks/useCoinRewardFlight', () => ({ useCoinRewardFlight: () => ({ counterRef: { current: null }, flight: null, fly: jest.fn(), clearFlight: jest.fn() }) }));
jest.mock('../app/dev_practice_runes_seed', () => ({ readDevPracticeRunesFakeState: () => null }));
jest.mock('../app/feedback_attempt_identity', () => ({ makeFeedbackAttemptId: () => mockAttemptIdFactory() }));
jest.mock('../app/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../app/mistake_practice_capture', () => ({ captureCurrentAccountObjectiveAttempt: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: jest.fn() } }));
jest.mock('../app/flashcards/deck_options', () => ({ loadFcDeckOptions: jest.fn(async () => []) }));
jest.mock('../app/flashcards/SoundService', () => ({ fcHaptic: jest.fn(), playSfx: jest.fn() }));
jest.mock('../app/navigation_back', () => ({ markNextNavigationAsReplace: jest.fn(), safeRouterBack: jest.fn() }));
jest.mock('../components/NoEnergyModal', () => 'NoEnergyModal');
// зачем (§SPEECH-NA): экран «Устно» спрашивает, есть ли распознаватель на устройстве.
jest.mock('../app/speech_device_availability', () => ({
  useSpeechUnavailableOnDevice: () => mockSpeechNa,
  speechUnavailableOnDeviceText: () => 'Speech recognition doesn’t work on this device',
}));
jest.mock('../components/ScreenGradient', () => 'ScreenGradient');
jest.mock('../components/ContentWrap', () => 'ContentWrap');
jest.mock('../components/SkeletonShimmer', () => 'SkeletonBlock');
jest.mock('../components/ReportErrorButton', () => 'ReportErrorButton');
jest.mock('../components/SpeakingInlineSlot', () => 'SpeakingInlineSlot');
jest.mock('../components/SpeakingInlineResultStars', () => 'SpeakingInlineResultStars');
jest.mock('../components/session_attempts/SessionAttemptsHud', () => 'SessionAttemptsHud');
jest.mock('../components/PracticeRuneCounter', () => ({ PracticeRuneCounter: 'PracticeRuneCounter' }));
jest.mock('../components/rewards/CoinRewardFlight', () => ({ CoinRewardFlight: 'CoinRewardFlight' }));
jest.mock('../app/flashcards/SpeakingTaskHint', () => () => null);
jest.mock('../app/flashcards/PhraseCard', () => ({ __esModule: true, default: 'PhraseCard', useFcReduceMotion: () => true }));
// зачем (Карточки 2.0 12.10): «Устно» рисует карточку через CardFlipV2 (Reanimated) — в этом тесте проверяется логика квоты, вид карточки заглушен
jest.mock('../app/flashcards/CardFlipV2', () => ({ __esModule: true, CardFlipV2: 'CardFlipV2', default: 'CardFlipV2' }));
jest.mock('../app/flashcards/DeckPickerSheet', () => 'DeckPickerSheet');
jest.mock('../app/flashcards/SessionResultScreen', () => ({ SessionResultScreen: 'SessionResultScreen' }));
jest.mock('../components/SpeakingPanel', () => ({ SpeakingPanel: 'SpeakingPanel', buildSpeakingPanelTheme: () => ({}) }));
jest.mock('../app/flashcards/SpeakHoldButton', () => ({ __esModule: true, default: (props: unknown) => React.createElement('SpeakHoldButton', { ...props as object, testID: 'mock-speak-hold' }), SPEAK_HOLD_LABEL_HEIGHT: 20 }));
jest.mock('../app/flashcards/SpeakMicButton', () => ({ __esModule: true, default: (props: unknown) => React.createElement('SpeakMicButton', { ...props as object, testID: 'mock-speak-hold' }), SPEAK_HOLD_LABEL_HEIGHT: 20 }));

import FlashcardsSpeakingSession from '../app/flashcards_speaking_session';

beforeEach(() => {
  jest.clearAllMocks();
  mockAttemptIdFactory = () => 'attempt-stable';
  mockPendingRecord = null;
  mockSpeechNa = false;
  mockConfirmEnergy.mockResolvedValue('spent');
  mockRefundEnergy.mockResolvedValue(undefined);
  mockAcknowledgeEnergy.mockResolvedValue(true);
});
afterEach(async () => { await cleanup(); });

test('unavailable quota is retryable with the same receipt and never double-consumes', async () => {
  mockConsumeQuota
    .mockResolvedValueOnce({ status: 'unavailable', used: 0, limit: 3 })
    .mockResolvedValueOnce({ status: 'allowed', used: 1, limit: 3 });
  const view = await render(React.createElement(FlashcardsSpeakingSession));

  await waitFor(() => expect(view.getByTestId('fc-speak-quota-unavailable')).toBeTruthy());
  expect(mockRefundEnergy).toHaveBeenCalledTimes(1);
  expect(mockAcknowledgeEnergy).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(view.queryByTestId('mock-speak-hold')).toBeNull();

  // зачем (правило «экранов-ошибок нигде», 18.10): кнопки «Попробовать снова» нет — первый тихий повтор через 1 с.
  await waitFor(() => expect(mockConsumeQuota).toHaveBeenCalledTimes(2), { timeout: 4000 });
  expect({
    consume: mockConsumeQuota.mock.calls.length,
    confirm: mockConfirmEnergy.mock.calls.length,
    refund: mockRefundEnergy.mock.calls.length,
    acknowledge: mockAcknowledgeEnergy.mock.calls.length,
  }).toEqual({ consume: 2, confirm: 2, refund: 1, acknowledge: 1 });
  await waitFor(() => expect(view.getByTestId('mock-speak-hold')).toBeTruthy());

  expect(mockConsumeQuota.mock.calls[0]?.[0].receiptId).toBe(mockConsumeQuota.mock.calls[1]?.[0].receiptId);
  expect(mockRefundEnergy).toHaveBeenCalledTimes(1);
  expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

test('pending allowed Speaking consume survives unmount and same-intent remount without a second quota count', async () => {
  let attemptOrdinal = 0;
  mockAttemptIdFactory = () => `attempt-${++attemptOrdinal}`;
  let resolvePending!: () => void;
  mockConsumeQuota.mockImplementationOnce((input: { receiptId: string }) => new Promise((resolve) => {
    resolvePending = () => {
      resolve({ status: 'allowed', used: 1, limit: 3, resetAt: Date.now() + 60_000 });
    };
  }));

  const first = await render(React.createElement(FlashcardsSpeakingSession));
  await waitFor(() => expect(mockConsumeQuota).toHaveBeenCalledTimes(1));
  const firstReceipt = mockConsumeQuota.mock.calls[0]?.[0].receiptId;
  await first.unmount();
  await act(async () => { resolvePending(); await Promise.resolve(); });

  const second = await render(React.createElement(FlashcardsSpeakingSession));
  await waitFor(() => expect(second.getByTestId('mock-speak-hold')).toBeTruthy());
  expect(firstReceipt).toBe('speaking:attempt-1');
  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
  expect(mockPendingRecord).toBeNull();
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1);
});

test('§SPEECH-NA: «Устно» на устройстве без распознавателя тихо уходит назад и не тратит энергию', async () => {
  mockSpeechNa = true;
  const view = await render(React.createElement(FlashcardsSpeakingSession));

  await waitFor(() => expect(view.getByTestId('fc-speak-speech-unavailable')).toBeTruthy());
  // зачем (правило «экранов-ошибок нигде», 18.10): сообщения во весь экран больше нет — тихий уход ([NO-ERROR-SCREEN]).
  expect(view.queryByText('Speech recognition doesn’t work on this device')).toBeNull();
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  expect(mockConfirmEnergy).not.toHaveBeenCalled();
  expect(mockConsumeQuota).not.toHaveBeenCalled();
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockPendingRecord).toBeNull();
  expect(view.queryByTestId('mock-speak-hold')).toBeNull();
});
