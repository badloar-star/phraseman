import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';

const mockConsumeQuota = jest.fn();
const mockConfirmEnergy = jest.fn();
const mockRefundEnergy = jest.fn();
const mockAcknowledgeEnergy = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace, back: jest.fn() };
const mockEnergyIntent = {
  operationId: 'energy:test:recall',
  grant: { kind: 'flashcards_recall', subjectId: 'saved', attemptId: 'recall-attempt' },
};
let mockAttemptIdFactory = () => 'attempt-stable';
let mockPendingRecord: Record<string, any> | null = null;

// зачем (10.10): заливка полосы прогресса берёт Animated из react-native, а в этом тесте он урезан до заглушки — полоса тесту не нужна.
jest.mock('../components/KitProgressFill', () => ({ __esModule: true, default: () => null, KitProgressFill: () => null }));
jest.mock('react-native', () => ({
  AccessibilityInfo: { setAccessibilityFocus: jest.fn() },
  ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable', ScrollView: 'ScrollView', StatusBar: 'StatusBar',
  Text: 'Text', TextInput: 'TextInput', View: 'View', findNodeHandle: () => 1,
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true, default: { View: 'AnimatedView' }, FadeInDown: { duration: () => undefined }, FadeInUp: { duration: () => undefined }, useReducedMotion: () => true,
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// зачем (Карточки 2.0 12.10, «Продолжить»): запись позиции — отдельный хук (покрыт pack_continue_recorder.test.ts); в поведенческом тесте экрана он заглушка
jest.mock('../app/flashcards/use_pack_continue_recorder', () => ({ usePackContinueRecorder: () => ({ record: () => undefined, flush: () => undefined }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
// зачем (координатор §47, 2026-10-01): квота тренировок переехала из
// revenue_quota_access.consumeFlashcardTrainingQuota в monthly_training_sessions;
// без этого мока экран звал настоящую квоту, и шпион не видел ни одного вызова.
jest.mock('../app/monthly_training_sessions', () => ({
  consumeMonthlyTrainingSession: (...args: unknown[]) => mockConsumeQuota(...args),
}));
// зачем: expo-linear-gradient — ESM; в node-конфиге jest без мока набор не загружался вовсе.
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ deck: 'saved', size: '10' }), useRouter: () => mockRouter }));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ accessResolved: true }) }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ confirmSpendOne: mockConfirmEnergy, refundOne: mockRefundEnergy, acknowledgeSessionStart: mockAcknowledgeEnergy }),
  useEnergySessionIntent: () => mockEnergyIntent,
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: new Proxy({}, { get: () => '#111' }), f: { caption: 12, body: 16, bodyLg: 18, h1: 24 }, statusBarLight: true }),
}));
jest.mock('../constants/i18n', () => ({ triLang: (lang: string, values: Record<string, string>) => values[lang] ?? values.en }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ stableId: 'account-a', generation: 1, phase: 'active' }) }));
jest.mock('../app/spanish_content_gate', () => ({ flashcardContentLang: () => 'en' }));
jest.mock('../app/feedback_attempt_identity', () => ({ makeFeedbackAttemptId: () => mockAttemptIdFactory() }));
jest.mock('../app/revenue_quota_access', () => ({ consumeFlashcardTrainingQuota: (...args: unknown[]) => mockConsumeQuota(...args) }));
jest.mock('../app/flashcard_training_pending_grant', () => ({
  resolveFlashcardTrainingPendingGrantAccount: async (runtimeToken: unknown) => ({ stableUid: 'account-a', lineage: 1, runtimeToken }),
  prepareFlashcardTrainingPendingGrant: async (input: any) => {
    if (mockPendingRecord) return { status: 'reused', record: mockPendingRecord };
    mockPendingRecord = {
      ...input,
      fingerprint: 'recall-scope',
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
  abandonFlashcardTrainingPendingGrant: async () => ({ status: 'nothing_to_refund' }),
  discardFlashcardTrainingPendingGrant: async () => ({ status: 'removed' }),
}));
// зачем (03.10, компактный manifest): экран теперь строит интент под запись через
// resolveEnergyIntentForRecord → реальный реестр энергии тянет firebase/config (Platform.OS в моке RN).
// Реестр здесь не нужен: интент записи совпадает с текущим (первая ветка помощника).
jest.mock('../app/energy_session_operation_ledger', () => ({
  createEnergySessionIntent: (kind: string, subjectId: string, attemptId: string) => ({
    operationId: `energy:${kind}:${attemptId}`, grant: { kind, subjectId, attemptId },
  }),
}));
// зачем (12.10, dev-состояния Карточек): экран читает isDevCardsFail из dev_cards_state, а тот тянет app/config → Platform.OS, которого в моке RN нет («Cannot read properties of undefined (reading 'OS')»).
// Здесь dev-сбоев нет по определению — подменяем модуль целиком.
// Авторизация 12.10: экран читает и getDevAnswerTarget (dev `answer=…` для робота) — без подмены null.
jest.mock('../app/dev_cards_state', () => ({ isDevCardsFail: () => false, getDevAnswerTarget: () => null }));
jest.mock('../app/flashcards/deck_sources', () => ({
  deckRefKey: () => 'saved', parseDeckParams: () => [{ kind: 'saved' }],
  loadDeckCardsMulti: jest.fn(async () => [{ id: 'one', en: 'hello', translation: 'привет' }]),
}));
jest.mock('../app/flashcards/mode_prefs', () => ({ FC_DEFAULT_SESSION_SIZE: 10, isValidSessionSize: () => true }));
jest.mock('../app/flashcards/word_strength', () => ({ loadWordStrengthMap: jest.fn(async () => ({})) }));
jest.mock('../hooks/useSessionAttempts', () => ({ useSessionAttempts: () => ({
  state: { phase: 'active', remainingAttempts: 3 }, registerVerdict: jest.fn(), updateQuestion: jest.fn(),
  restoreAfterSessionRuneForfeit: jest.fn(), hydrated: true, hydrationTrusted: true,
}) }));
jest.mock('../hooks/useSessionAttemptAutoReset', () => ({ useSessionAttemptAutoReset: () => undefined }));
jest.mock('../hooks/usePracticeRunes', () => ({ usePracticeRunes: () => ({ hydrating: false, runes: 0, settle: jest.fn(), forfeitPendingRunes: jest.fn(), onCorrectAnswer: jest.fn() }) }));
// зачем (координатор §47): экран вешает ref карточки на originRef — без него мок падал
// TypeError внутри React и всплывал «немым» AggregateError (причина skip с 14.09).
jest.mock('../hooks/useCoinRewardFlight', () => ({ useCoinRewardFlight: () => ({ flight: null, originRef: { current: null }, counterRef: { current: null }, bump: jest.fn(), fly: jest.fn(), clearFlight: jest.fn() }) }));
jest.mock('../app/mistake_practice_capture', () => ({ captureCurrentAccountObjectiveAttempt: jest.fn() }));
jest.mock('../app/navigation_back', () => ({ markNextNavigationAsReplace: jest.fn(), safeRouterBack: jest.fn() }));
// зачем (закон владельца 22.10 «назад/✕ в одном месте»): шапка тренировки рисует общую кнопку; её цепочка (звук → firebase/config,
// useFocusEffect) в подменах этого теста не поднимается — подменяем простым Pressable с тем же testID и обработчиком.
jest.mock('../components/v2/ScreenBackButton', () => {
  const React = require('react');
  const Btn = ({ testID, onPress }: { testID?: string; onPress?: () => void }) => React.createElement('Pressable', { testID, onPress });
  return { __esModule: true, default: Btn, ScreenCloseButton: Btn, SafeTopBackButton: Btn, SafeTopCloseButton: Btn, ScreenBackSlot: () => null, SCREEN_BACK_SIZE: 48, SCREEN_BACK_LEFT: 20 };
});
jest.mock('../app/flashcards/SoundService', () => ({ fcHaptic: jest.fn(), playSfx: jest.fn() }));
jest.mock('../components/ContentWrap', () => 'ContentWrap');
jest.mock('../components/ScreenGradient', () => 'ScreenGradient');
jest.mock('../components/NoEnergyModal', () => 'NoEnergyModal');
jest.mock('../components/ReportErrorButton', () => 'ReportErrorButton');
jest.mock('../components/SkeletonShimmer', () => 'SkeletonBlock');
jest.mock('../components/session_attempts/SessionAttemptsHud', () => 'SessionAttemptsHud');
jest.mock('../components/PracticeRuneCounter', () => ({ PracticeRuneCounter: 'PracticeRuneCounter' }));
jest.mock('../components/rewards/CoinRewardFlight', () => ({ CoinRewardFlight: 'CoinRewardFlight' }));
jest.mock('../app/flashcards/SessionResultScreen', () => ({ SessionResultScreen: 'SessionResultScreen' }));

import FlashcardsRecallSession from '../app/flashcards_recall_session';

beforeEach(() => {
  jest.clearAllMocks();
  mockAttemptIdFactory = () => 'attempt-stable';
  mockPendingRecord = null;
  mockConfirmEnergy.mockResolvedValue('spent');
  mockRefundEnergy.mockResolvedValue(undefined);
  mockAcknowledgeEnergy.mockResolvedValue(true);
});
afterEach(async () => { await cleanup(); });

// зачем (координатор §47, 2026-10-01): кейс был test.skip с 14.09 — «непрозрачный
// AggregateError». Развёрнутая ошибка: мок useCoinRewardFlight без originRef
// (TypeError в ref карточки). Плюс квота переехала в monthly_training_sessions и
// ESM expo-linear-gradient не грузился. Моки приведены — кейс снова исполняется.
test('pending allowed Recall consume survives unmount and same-intent remount without a second quota count', async () => {
  let attemptOrdinal = 0;
  mockAttemptIdFactory = () => `attempt-${++attemptOrdinal}`;
  let resolvePending!: () => void;
  mockConsumeQuota.mockImplementationOnce((input: { receiptId: string }) => new Promise((resolve) => {
    resolvePending = () => {
      resolve({ status: 'allowed', used: 1, limit: 3, resetAt: Date.now() + 60_000 });
    };
  }));

  const first = await render(React.createElement(FlashcardsRecallSession));
  await waitFor(() => expect(mockConsumeQuota).toHaveBeenCalledTimes(1));
  const firstReceipt = mockConsumeQuota.mock.calls[0]?.[0].receiptId;
  try {
    await first.unmount();
  } catch (error) {
    const nested = error instanceof AggregateError ? error.errors : [error];
    throw new Error(nested.map((item) => String((item as Error)?.stack ?? item)).join('\n---\n'));
  }
  await act(async () => { resolvePending(); await Promise.resolve(); });

  const second = await render(React.createElement(FlashcardsRecallSession));
  await waitFor(() => expect(second.getByTestId('fc-recall-input')).toBeTruthy());
  expect(firstReceipt).toBe('recall:attempt-1');
  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
  expect(mockPendingRecord).toBeNull();
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1);
});
