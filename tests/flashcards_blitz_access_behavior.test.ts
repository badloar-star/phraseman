import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import FlashcardsBlitzSession from '../app/flashcards_blitz_session';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockMarkReplace = jest.fn();
const mockLoadDeckRefs = jest.fn();
const mockLoadDeckCards = jest.fn();
const mockConfirmEnergy = jest.fn();
const mockRefundEnergy = jest.fn();
const mockAcknowledgeEnergy = jest.fn();
const mockBuildQuestion = jest.fn();
const mockRuneSettle = jest.fn();
const mockRuneCorrect = jest.fn();
const mockRuneForfeit = jest.fn();
const mockPracticeRunesInput = jest.fn();
const mockSessionAttemptsInput = jest.fn();
const mockLoadStrengths = jest.fn();
const mockClearAnimation = jest.fn();
const mockGetBlitzBest = jest.fn();
const mockConsumeQuota = jest.fn();
let mockPendingRecord: Record<string, any> | null = null;

let mockAccessResolved = false;
let mockFlashcardsAccess = false;
let mockParams: Record<string, string> = {};
let mockAttemptIdFactory = () => 'attempt';

const mockCards = [
  { id: '1', en: 'one', translation: 'один' },
  { id: '2', en: 'two', translation: 'два' },
  { id: '3', en: 'three', translation: 'три' },
  { id: '4', en: 'four', translation: 'четыре' },
];

jest.mock('react-native', () => ({
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'View' },
  Easing: { linear: 'linear' },
  cancelAnimation: (...args: unknown[]) => mockClearAnimation(...args),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => ({ value }),
  withSequence: (...values: unknown[]) => values.at(-1),
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));
jest.mock('../components/PremiumContext', () => ({
  usePremium: () => ({ accessResolved: mockAccessResolved }),
  useFeatureAccess: () => mockFlashcardsAccess,
}));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({
    isUnlimited: false,
    confirmSpendOne: mockConfirmEnergy,
    refundOne: mockRefundEnergy,
    acknowledgeSessionStart: mockAcknowledgeEnergy,
  }),
  useEnergySessionIntent: () => ({
    operationId: 'energy:test:blitz-round',
    grant: { kind: 'flashcards_blitz', subjectId: 'saved', attemptId: 'round' },
  }),
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgCard: 'card', bgSurface: 'surface', textGhost: 'ghost',
      textMuted: 'muted', textPrimary: 'primary',
    },
    f: { body: 16, caption: 12, h1: 24, h2: 20, sub: 14 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, values: Record<string, string>) => values[lang] ?? values.en ?? values.ru,
}));
jest.mock('../components/ScreenGradient', () => function MockScreenGradient(
  { children }: { children?: React.ReactNode },
) {
  return React.createElement('ScreenGradient', null, children);
});
jest.mock('../components/ContentWrap', () => function MockContentWrap(
  { children }: { children?: React.ReactNode },
) {
  return React.createElement('ContentWrap', null, children);
});
jest.mock('../components/SkeletonShimmer', () => 'SkeletonBlock');
jest.mock('../components/NoEnergyModal', () => 'NoEnergyModal');
jest.mock('../components/ReportErrorButton', () => 'ReportErrorButton');
jest.mock('../components/session_attempts/SessionAttemptsHud', () => 'SessionAttemptsHud');
jest.mock('../components/PracticeRuneCounter', () => ({ PracticeRuneCounter: 'PracticeRuneCounter' }));
jest.mock('../components/LearningV2RuneFlight', () => ({ LearningV2RuneFlight: 'LearningV2RuneFlight' }));
jest.mock('../hooks/usePracticeRunes', () => ({
  usePracticeRunes: (input: unknown) => {
    mockPracticeRunesInput(input);
    return ({
    hydrating: false,
    runes: 0,
    settle: mockRuneSettle,
    forfeitPendingRunes: mockRuneForfeit,
    onCorrectAnswer: mockRuneCorrect,
    });
  },
}));
jest.mock('../hooks/usePracticeRuneFlight', () => ({
  usePracticeRuneFlight: () => ({
    flight: null,
    counterRef: { current: null },
    originRef: { current: null },
    fly: jest.fn(),
    clearFlight: jest.fn(),
  }),
}));
jest.mock('../hooks/useSessionAttempts', () => ({
  useSessionAttempts: (input: unknown) => {
    mockSessionAttemptsInput(input);
    return ({
    state: { phase: 'active', remainingAttempts: 3 },
    hydrated: true,
    inventoryTrusted: true,
    giftCount: 0,
    registerVerdict: jest.fn(() => 'continue'),
    updateQuestion: jest.fn(),
    recoverWithGift: jest.fn(),
    restoreAfterSessionRuneForfeit: jest.fn(),
    });
  },
}));
jest.mock('../hooks/useSessionAttemptAutoReset', () => ({ useSessionAttemptAutoReset: jest.fn() }));
jest.mock('../app/spanish_content_gate', () => ({ flashcardContentLang: () => 'en' }));
jest.mock('../app/flashcards/PhraseCard', () => ({ useFcReduceMotion: () => true }));
jest.mock('../app/flashcards/low_power', () => ({ isLowPowerEffective: () => false }));
jest.mock('../app/flashcards/SoundService', () => ({
  comboSfxForStreak: () => 'combo', fcHaptic: jest.fn(), playSfx: jest.fn(),
}));
jest.mock('../app/flashcards/blitz_logic', () => ({
  BLITZ_ADVANCE_OK_MS: 350,
  BLITZ_ADVANCE_WRONG_MS: 700,
  BLITZ_DURATION_SEC: 60,
  applyBlitzAnswer: jest.fn(),
  canStartBlitz: (count: number) => count >= 4,
  buildBlitzQuestion: (...args: unknown[]) => mockBuildQuestion(...args),
  initialBlitzState: () => ({ score: 0, streak: 0, lives: 3 }),
}));
jest.mock('../app/flashcards/deck_sources', () => ({
  deckRefKey: () => 'saved',
  loadDeckCardsMulti: (...args: unknown[]) => mockLoadDeckCards(...args),
  parseDeckParams: () => [],
}));
jest.mock('../app/flashcards/deck_options', () => ({
  loadAllFcDeckRefs: (...args: unknown[]) => mockLoadDeckRefs(...args),
  loadFcDeckOptions: jest.fn(async () => []),
}));
jest.mock('../app/flashcards/DeckPickerSheet', () => ({ __esModule: true, default: () => null }));
jest.mock('../app/flashcards/deck_selection', () => ({
  SOLO_DECK_ID: 'solo', deckRouteParam: () => 'saved', decksCountLabel: () => 'Saved',
}));
jest.mock('../app/flashcards/mode_prefs', () => ({ getLastPreset: jest.fn(), presetDeckIds: () => [] }));
jest.mock('../app/flashcards/blitz_record', () => ({
  getBlitzBest: (...args: unknown[]) => mockGetBlitzBest(...args),
  commitBlitzScore: jest.fn(async (score: number) => ({ score, best: score, isRecord: true })),
}));
jest.mock('../app/navigation_back', () => ({
  markNextNavigationAsReplace: (...args: unknown[]) => mockMarkReplace(...args),
  safeRouterBack: (...args: unknown[]) => mockBack(...args),
}));
jest.mock('../app/flashcards/session_queue', () => ({ summarizeSession: () => ({ correct: 0, wrong: 0, total: 0, accuracy: 0, learnKeys: [] }) }));
jest.mock('../app/mistake_practice_capture', () => ({ captureCurrentAccountObjectiveAttempt: jest.fn() }));
jest.mock('../app/feedback_attempt_identity', () => ({ makeFeedbackAttemptId: () => mockAttemptIdFactory() }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ stableId: 'test', generation: 1 }) }));
jest.mock('../app/dev_practice_runes_seed', () => ({ readDevPracticeRunesFakeState: () => null }));
jest.mock('../app/flashcards/word_strength', () => ({ loadWordStrengthMap: (...args: unknown[]) => mockLoadStrengths(...args) }));
jest.mock('../app/flashcards/SessionResultScreen', () => ({
  SessionResultScreen: function MockSessionResultScreen() {
    return React.createElement('SessionResultScreen', { testID: 'fc-blitz-result' });
  },
}));
jest.mock('../app/revenue_quota_access', () => ({
  consumeFlashcardTrainingQuota: (...args: unknown[]) => mockConsumeQuota(...args),
}));
jest.mock('../app/flashcard_training_pending_grant', () => ({
  resolveFlashcardTrainingPendingGrantAccount: async (runtimeToken: unknown) => ({ stableUid: 'test', lineage: 1, runtimeToken }),
  prepareFlashcardTrainingPendingGrant: async (input: any) => {
    if (mockPendingRecord) return { status: 'reused', record: mockPendingRecord };
    mockPendingRecord = {
      ...input, fingerprint: 'blitz-scope', phase: 'prepared', energyState: 'pending',
      manifest: input.manifest, attemptId: input.attemptId, receiptId: input.receiptId,
      energyOperationId: input.energyOperationId,
    };
    return { status: 'prepared', record: mockPendingRecord };
  },
  reconcileFlashcardTrainingPendingGrant: async () => mockPendingRecord ? { status: 'found', record: mockPendingRecord } : { status: 'missing' },
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
  acknowledgeAndClearFlashcardTrainingPendingGrant: async (_account: unknown, _fingerprint: string, ack: (operationId: string) => Promise<boolean>) => {
    const operationId = mockPendingRecord?.energyOperationId;
    if (operationId) await ack(operationId);
    mockPendingRecord = null;
    return { status: 'cleared' };
  },
  abandonFlashcardTrainingPendingGrant: async (_account: unknown, _fingerprint: string, refund: (operationId: string, reason: string) => Promise<void>, _now?: number, reason = 'entry_cancelled') => {
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessResolved = false;
  mockFlashcardsAccess = false;
  mockParams = {};
  mockAttemptIdFactory = () => 'attempt';
  mockPendingRecord = null;
  mockLoadDeckRefs.mockResolvedValue([{ kind: 'saved' }]);
  mockLoadDeckCards.mockResolvedValue(mockCards);
  mockConfirmEnergy.mockResolvedValue('unlimited');
  mockRefundEnergy.mockResolvedValue(undefined);
  mockAcknowledgeEnergy.mockResolvedValue(true);
  mockLoadStrengths.mockResolvedValue({});
  mockGetBlitzBest.mockResolvedValue(0);
  mockConsumeQuota.mockResolvedValue({ status: 'allowed', used: 1, limit: 3 });
  mockBuildQuestion.mockImplementation((_card: unknown, pool: typeof mockCards) => ({
    card: pool[0], options: pool.map((card) => card.translation), correctIndex: 0,
  }));
});

afterEach(() => cleanup());

test('unresolved performs no work; exhausted direct start refunds and redirects once', async () => {
  const intervalSpy = jest.spyOn(global, 'setInterval');
  const view = await render(React.createElement(FlashcardsBlitzSession));

  await act(async () => Promise.resolve());
  expect(mockLoadDeckRefs).not.toHaveBeenCalled();
  expect(mockLoadDeckCards).not.toHaveBeenCalled();
  expect(mockConfirmEnergy).not.toHaveBeenCalled();
  expect(mockBuildQuestion).not.toHaveBeenCalled();
  expect(view.queryByTestId('fc-blitz-question')).toBeNull();
  expect(intervalSpy).not.toHaveBeenCalled();
  expect(mockRuneSettle).not.toHaveBeenCalled();
  expect(mockRuneCorrect).not.toHaveBeenCalled();
  expect(mockGetBlitzBest).not.toHaveBeenCalled();
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: false,
    persistenceEnabled: false,
  }));
  expect(view.queryByTestId('fc-blitz-result')).toBeNull();
  expect(mockReplace).not.toHaveBeenCalled();

  mockAccessResolved = true;
  mockConfirmEnergy.mockResolvedValue('spent');
  mockConsumeQuota.mockResolvedValue({ status: 'exhausted', used: 3, limit: 3 });
  await view.rerender(React.createElement(FlashcardsBlitzSession));
  await act(async () => Promise.resolve());
  await view.rerender(React.createElement(FlashcardsBlitzSession));
  await act(async () => Promise.resolve());

  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/premium_modal',
    params: { context: 'flashcard_training', source: 'flashcards_blitz_direct' },
  });
  expect(mockLoadDeckRefs).toHaveBeenCalledTimes(1);
  expect(mockLoadDeckCards).toHaveBeenCalledTimes(1);
  expect(mockConfirmEnergy).toHaveBeenCalledTimes(1);
  expect(mockConsumeQuota).toHaveBeenCalledWith(expect.objectContaining({ mode: 'blitz', receiptId: 'blitz:attempt:0' }));
  expect(mockRefundEnergy).toHaveBeenCalledWith('energy:test:blitz-round', 'quota_refused');
  expect(mockBuildQuestion).toHaveBeenCalledTimes(1);
  expect(view.queryByTestId('fc-blitz-question')).toBeNull();
  expect(intervalSpy).not.toHaveBeenCalled();
  expect(mockRuneSettle).not.toHaveBeenCalled();
  expect(mockRuneCorrect).not.toHaveBeenCalled();
  expect(mockGetBlitzBest).toHaveBeenCalledTimes(1);
  expect(view.queryByTestId('fc-blitz-result')).toBeNull();
  intervalSpy.mockRestore();
});

test('granted direct access keeps the normal deck, energy, question and timer path', async () => {
  mockAccessResolved = true;
  mockFlashcardsAccess = true;
  mockParams = {};
  const intervalSpy = jest.spyOn(global, 'setInterval');

  await render(React.createElement(FlashcardsBlitzSession));

  await waitFor(() => expect(mockBuildQuestion).toHaveBeenCalledTimes(1));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockLoadDeckRefs).toHaveBeenCalledTimes(1);
  expect(mockLoadDeckCards).toHaveBeenCalledTimes(1);
  expect(mockConfirmEnergy).toHaveBeenCalledTimes(1);
  expect(mockGetBlitzBest).toHaveBeenCalledTimes(1);
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: true,
    persistenceEnabled: true,
  }));
  expect(intervalSpy).toHaveBeenCalled();
  intervalSpy.mockRestore();
});

test('an unavailable quota refunds once and can retry the same quota receipt when storage becomes ready', async () => {
  let resolveConfirm: ((result: string) => void) | undefined;
  mockConfirmEnergy.mockImplementation(() => new Promise((resolve) => { resolveConfirm = resolve; }));
  mockAccessResolved = true;
  mockConsumeQuota.mockResolvedValue({ status: 'unavailable', used: 0, limit: 3 });
  const view = await render(React.createElement(FlashcardsBlitzSession));

  await waitFor(() => expect(mockConfirmEnergy).toHaveBeenCalledTimes(1));
  await act(async () => { resolveConfirm?.('spent'); await Promise.resolve(); });
  await waitFor(() => expect(view.getByTestId('fc-blitz-quota-unavailable')).toBeTruthy());

  expect(mockRefundEnergy).toHaveBeenCalledTimes(1);
  expect(mockRefundEnergy).toHaveBeenCalledWith('energy:test:blitz-round', 'quota_refused');
  expect(mockAcknowledgeEnergy).not.toHaveBeenCalled();
  expect(mockRuneSettle).not.toHaveBeenCalled();
  expect(mockRuneCorrect).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockBuildQuestion).toHaveBeenCalledTimes(1);
  expect(view.queryByTestId('fc-blitz-question')).toBeNull();
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: true,
    persistenceEnabled: true,
  }));

  mockConfirmEnergy.mockResolvedValue('spent');
  mockConsumeQuota.mockResolvedValue({ status: 'allowed', used: 1, limit: 3 });
  await fireEvent.press(view.getByTestId('fc-blitz-quota-retry'));
  await waitFor(() => expect(view.getByTestId('fc-blitz-question')).toBeTruthy());

  expect(mockConsumeQuota).toHaveBeenCalledTimes(2);
  expect(mockConsumeQuota.mock.calls[0]?.[0].receiptId).toBe(mockConsumeQuota.mock.calls[1]?.[0].receiptId);
  expect(mockRefundEnergy).toHaveBeenCalledTimes(1);
  expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1);
  expect(mockBuildQuestion).toHaveBeenCalledTimes(2);
  expect(mockReplace).not.toHaveBeenCalled();
});

test('a quota-granted active round survives entitlement rerenders without a second consume', async () => {
  mockAccessResolved = true;
  mockFlashcardsAccess = true;
  mockConfirmEnergy.mockResolvedValue('spent');
  const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
  const view = await render(React.createElement(FlashcardsBlitzSession));

  await waitFor(() => expect(view.getByTestId('fc-blitz-question')).toBeTruthy());
  await waitFor(() => expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1));
  await view.rerender(React.createElement(FlashcardsBlitzSession));
  await act(async () => Promise.resolve());

  expect(view.getByTestId('fc-blitz-question')).toBeTruthy();
  expect(mockRuneSettle).not.toHaveBeenCalled();
  expect(mockRuneCorrect).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: true,
    persistenceEnabled: true,
  }));
  clearIntervalSpy.mockRestore();
});

test('pending allowed Blitz consume survives unmount and same-intent remount without a second quota count', async () => {
  let attemptOrdinal = 0;
  mockAttemptIdFactory = () => `attempt-${++attemptOrdinal}`;
  mockAccessResolved = true;
  mockFlashcardsAccess = true;
  mockConfirmEnergy.mockResolvedValue('spent');
  const countedReceipts = new Set<string>();
  let resolvePending!: () => void;
  mockConsumeQuota.mockImplementationOnce((input: { receiptId: string }) => new Promise((resolve) => {
    resolvePending = () => {
      countedReceipts.add(input.receiptId);
      resolve({ status: 'allowed', used: countedReceipts.size, limit: 3 });
    };
  })).mockImplementation(async (input: { receiptId: string }) => {
    const duplicate = countedReceipts.has(input.receiptId);
    countedReceipts.add(input.receiptId);
    return { status: 'allowed', used: countedReceipts.size, limit: 3, bypass: duplicate ? 'idempotent' : null };
  });

  const first = await render(React.createElement(FlashcardsBlitzSession));
  await waitFor(() => expect(mockConsumeQuota).toHaveBeenCalledTimes(1));
  const firstReceipt = mockConsumeQuota.mock.calls[0]?.[0].receiptId;
  await first.unmount();
  await act(async () => { resolvePending(); await Promise.resolve(); });

  const second = await render(React.createElement(FlashcardsBlitzSession));
  await waitFor(() => expect(second.getByTestId('fc-blitz-question')).toBeTruthy());

  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
  expect(mockConsumeQuota.mock.calls[0]?.[0].receiptId).toBe(firstReceipt);
  expect(countedReceipts.size).toBe(1);
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1);
});
