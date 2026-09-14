import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import FlashcardsSwipeScreen from '../app/flashcards_swipe';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockMarkReplace = jest.fn();
const mockLoadSaved = jest.fn();
const mockReadCustom = jest.fn();
const mockConfirmEnergy = jest.fn();
const mockRefundEnergy = jest.fn();
const mockAcknowledgeEnergy = jest.fn();
const mockPracticeRunesInput = jest.fn();
const mockSessionAttemptsInput = jest.fn();
const mockConsumeQuota = jest.fn();
const mockPreparePending = jest.fn();
let mockPendingRecord: Record<string, any> | null = null;

let mockAccessResolved = false;
let mockFlashcardsAccess = false;
let mockParams: Record<string, string> = { quick: '1', deck: 'saved' };
let mockAttemptIdFactory = () => 'attempt';

const cards = [
  { id: '1', en: 'one', ru: 'один', studyTarget: 'en' },
  { id: '2', en: 'two', ru: 'два', studyTarget: 'en' },
];

jest.mock('react-native', () => {
  class AnimatedValue {
    value: unknown;
    constructor(value: unknown) { this.value = value; }
    setValue(value: unknown) { this.value = value; }
    stopAnimation() { return undefined; }
    interpolate() { return 0; }
  }
  class AnimatedValueXY {
    x = new AnimatedValue(0);
    y = new AnimatedValue(0);
    setValue(value: { x: number; y: number }) { this.x.setValue(value.x); this.y.setValue(value.y); }
    stopAnimation() { return undefined; }
    getLayout() { return {}; }
  }
  const immediateAnimation = () => ({
    start: (callback?: (result: { finished: boolean }) => void) => callback?.({ finished: true }),
    stop: jest.fn(),
  });
  return ({
  Animated: {
    Value: AnimatedValue,
    ValueXY: AnimatedValueXY,
    View: 'AnimatedView',
    ScrollView: 'AnimatedScrollView',
    event: jest.fn(() => jest.fn()),
    parallel: immediateAnimation,
    spring: immediateAnimation,
    timing: immediateAnimation,
  },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Easing: { cubic: 'cubic', in: (value: unknown) => value, out: (value: unknown) => value },
  PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  ScrollView: 'ScrollView',
  StatusBar: 'StatusBar',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  useWindowDimensions: () => ({ width: 390, height: 844 }),
  });
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));
jest.mock('../components/PremiumContext', () => ({
  usePremium: () => ({ accessResolved: mockAccessResolved }),
  useFeatureAccess: () => mockFlashcardsAccess,
}));
jest.mock('../components/personal_plan_sunset_guard', () => ({
  withOptionalPersonalPlanSunsetGuard: (Component: unknown) => Component,
}));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({
    confirmSpendOne: mockConfirmEnergy,
    refundOne: mockRefundEnergy,
    acknowledgeSessionStart: mockAcknowledgeEnergy,
  }),
  useEnergySessionIntent: () => ({
    operationId: 'energy:test:swipe',
    grant: { kind: 'flashcards_swipe', subjectId: 'selected_decks', attemptId: 'attempt' },
  }),
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#111111' }),
    themeMode: 'dark', statusBarLight: true,
    f: { caption: 12, body: 16, bodyLg: 18, h1: 24, h2: 20 },
    ds: { spacing: { sm: 8, md: 12, lg: 16 }, buttonHeight: 48 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../constants/i18n', () => ({ triLang: (lang: string, values: Record<string, string>) => values[lang] ?? values.en ?? values.ru }));
jest.mock('../components/ScreenGradient', () => function MockScreenGradient({ children }: { children?: React.ReactNode }) {
  return React.createElement('ScreenGradient', null, children);
});
jest.mock('../components/ContentWrap', () => function MockContentWrap({ children }: { children?: React.ReactNode }) {
  return React.createElement('ContentWrap', null, children);
});
jest.mock('../components/DuoPressable', () => function MockDuoPressable(props: Record<string, unknown>) {
  return React.createElement('DuoPressable', props, props.children as React.ReactNode);
});
jest.mock('../components/TapScale', () => 'TapScale');
jest.mock('../components/FeatureIntroModal', () => 'FeatureIntroModal');
jest.mock('../components/NoEnergyModal', () => 'NoEnergyModal');
jest.mock('../components/EnergyCostBadge', () => 'EnergyCostBadge');
jest.mock('../components/ReportErrorButton', () => 'ReportErrorButton');
jest.mock('../components/session_attempts/SessionAttemptsHud', () => 'SessionAttemptsHud');
jest.mock('../components/PracticeRuneCounter', () => ({ PracticeRuneCounter: 'PracticeRuneCounter' }));
jest.mock('../components/LearningV2RuneFlight', () => ({ LearningV2RuneFlight: 'LearningV2RuneFlight' }));
jest.mock('../components/text-integrity/FlowText', () => ({
  FlowText: function MockFlowText(props: Record<string, unknown>) {
    return React.createElement('Text', props, props.children as React.ReactNode);
  },
}));
jest.mock('../components/GlassSurface', () => ({ glassFill: (value: string) => value }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => false }));
jest.mock('../app/feature_intro_dev_replay', () => ({ useDevFeatureIntroReplay: () => false }));
jest.mock('../app/feature_intro_registry', () => ({ featureIntroById: () => null }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../hooks/use-audio', () => ({ useAudio: () => ({ play: jest.fn() }), inferExpoSpeechLanguage: () => 'en-US' }));
jest.mock('../hooks/use-correct-sound', () => ({ useCorrectSound: () => ({ playCorrect: jest.fn() }) }));
jest.mock('../hooks/use-haptics', () => ({ hapticError: jest.fn(), hapticSuccess: jest.fn(), hapticTap: jest.fn() }));
jest.mock('../hooks/use-screen', () => ({ normalizeSafeAreaBottomInset: () => 0 }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../hooks/usePracticeRunes', () => ({
  usePracticeRunes: (input: unknown) => {
    mockPracticeRunesInput(input);
    return { hydrating: false, runes: 0, settle: jest.fn(), forfeitPendingRunes: jest.fn(), onCorrectAnswer: jest.fn() };
  },
}));
jest.mock('../hooks/usePracticeRuneFlight', () => ({
  usePracticeRuneFlight: () => ({ flight: null, counterRef: { current: null }, originRef: { current: null }, fly: jest.fn(), clearFlight: jest.fn() }),
}));
jest.mock('../hooks/useSessionAttempts', () => ({
  useSessionAttempts: (input: unknown) => {
    mockSessionAttemptsInput(input);
    return {
      state: { phase: 'active', remainingAttempts: 3 }, hydrated: true, inventoryTrusted: true, giftCount: 0,
      registerVerdict: jest.fn(() => 'continue'), updateQuestion: jest.fn(), recoverWithGift: jest.fn(), restoreAfterSessionRuneForfeit: jest.fn(),
    };
  },
}));
jest.mock('../hooks/useSessionAttemptAutoReset', () => ({ useSessionAttemptAutoReset: jest.fn() }));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: false }));
jest.mock('../app/spanish_content_gate', () => ({ flashcardContentLang: () => 'en' }));
jest.mock('../app/flashcards/saved_language_contour', () => ({
  peekSelectedSavedContour: () => [],
  loadSelectedSavedContour: (...args: unknown[]) => mockLoadSaved(...args),
}));
jest.mock('../app/flashcards/storage', () => ({ peekCustomCardsCache: () => [], readCustomCards: (...args: unknown[]) => mockReadCustom(...args) }));
jest.mock('../app/flashcards_target_gate', () => ({
  flashcardsCommunityPacksAvailableForTarget: () => false,
  flashcardsOfficialPacksAvailableForTarget: () => false,
}));
jest.mock('../app/community_packs/communityFirestore', () => ({
  fetchCommunityPackCards: jest.fn(), fetchCommunityPackMeta: jest.fn(), loadAuthorCommunityPacksPendingUpdate: jest.fn(async () => []), loadPublishedCommunityMarketPacks: jest.fn(async () => []),
}));
jest.mock('../app/community_packs/communityOwnedStorage', () => ({ loadCommunityOwnedPackIds: jest.fn(async () => []) }));
jest.mock('../app/flashcards/marketplace', () => ({
  buildMarketplaceOwnedCards: () => [], bundledPacksForOwned: () => [], loadAccessiblePackIds: jest.fn(async () => []), packTitleForInterface: () => 'Pack',
}));
jest.mock('../app/flashcards_swipe_session', () => ({
  clearFlashcardsSwipeSessionDraft: jest.fn(async () => undefined),
  deckIdsForSwipeSources: () => ['saved'],
  loadFlashcardsSwipeSessionDraft: jest.fn(async () => null),
  saveFlashcardsSwipeSessionDraft: jest.fn(async () => undefined),
  swipeSourceIdsForDeckIds: (sources: { id: string }[]) => sources.map((source) => source.id),
  swipeBadgeFullAtPx: () => false,
  swipeCommitDirection: () => null,
}));
jest.mock('../app/flashcards/deck_selection', () => ({ parseDeckIdList: () => ['saved'] }));
jest.mock('../app/flashcards/mode_prefs', () => ({ FC_DEFAULT_SESSION_SIZE: 10, isValidSessionSize: () => false, setLastPreset: jest.fn(async () => undefined) }));
jest.mock('../app/flashcards/types', () => ({ resolveFlashcardBackText: (card: { ru?: string }) => card.ru ?? '' }));
jest.mock('../app/navigation_back', () => ({
  markNextNavigationAsReplace: (...args: unknown[]) => mockMarkReplace(...args),
  safeRouterBack: (...args: unknown[]) => mockBack(...args),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => 'test-user' }));
jest.mock('../app/target_storage_keys', () => ({ flashcardsSwipeHintSeenKey: () => 'hint', flashcardsSwipeMemoryKey: () => 'memory' }));
jest.mock('../app/mistake_practice_capture', () => ({ captureCurrentAccountObjectiveAttempt: jest.fn() }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ stableId: 'test-user', generation: 1 }) }));
jest.mock('../app/feedback_attempt_identity', () => ({ makeFeedbackAttemptId: () => mockAttemptIdFactory() }));
jest.mock('../app/dev_practice_runes_seed', () => ({ readDevPracticeRunesFakeState: () => null }));
jest.mock('../app/flashcards/word_strength', () => ({ loadWordStrengthMap: jest.fn(async () => ({})) }));
jest.mock('../app/flashcards/SessionResultScreen', () => ({ SessionResultScreen: 'SessionResultScreen' }));
jest.mock('../app/revenue_quota_access', () => ({
  consumeFlashcardTrainingQuota: (...args: unknown[]) => mockConsumeQuota(...args),
}));
jest.mock('../app/flashcard_training_pending_grant', () => ({
  resolveFlashcardTrainingPendingGrantAccount: async (runtimeToken: unknown) => ({
    stableUid: 'test-user', lineage: 1, runtimeToken,
  }),
  prepareFlashcardTrainingPendingGrant: (...args: any[]) => {
    mockPreparePending(...args);
    const input = args[0];
    if (mockPendingRecord) return Promise.resolve({ status: 'reused', record: mockPendingRecord });
    mockPendingRecord = {
      ...input,
      fingerprint: 'swipe-scope',
      phase: 'prepared',
      energyState: 'pending',
      quotaResetAt: null,
      manifest: input.manifest,
      attemptId: input.attemptId,
      receiptId: input.receiptId,
      energyOperationId: input.energyOperationId,
    };
    return Promise.resolve({ status: 'prepared', record: mockPendingRecord });
  },
  reconcileFlashcardTrainingPendingGrant: async () => (
    mockPendingRecord ? { status: 'found', record: mockPendingRecord } : { status: 'missing' }
  ),
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
  abandonFlashcardTrainingPendingGrant: async (_account: unknown, _fingerprint: string, refund: (operationId: string, reason: string) => Promise<void>, _nowMs?: number, reason = 'entry_cancelled') => {
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
  mockParams = { quick: '1', deck: 'saved' };
  mockAttemptIdFactory = () => 'attempt';
  mockPendingRecord = null;
  mockLoadSaved.mockResolvedValue(cards);
  mockReadCustom.mockResolvedValue([]);
  mockConfirmEnergy.mockResolvedValue('unlimited');
  mockRefundEnergy.mockResolvedValue(undefined);
  mockAcknowledgeEnergy.mockResolvedValue(true);
  mockConsumeQuota.mockResolvedValue({ status: 'allowed', used: 1, limit: 3 });
});

afterEach(() => cleanup());

test('unresolved does no work; an exhausted free start refunds energy and redirects once', async () => {
  const timeoutSpy = jest.spyOn(global, 'setTimeout');
  const view = await render(React.createElement(FlashcardsSwipeScreen));
  await act(async () => Promise.resolve());

  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockLoadSaved).not.toHaveBeenCalled();
  expect(mockReadCustom).not.toHaveBeenCalled();
  expect(mockConfirmEnergy).not.toHaveBeenCalled();
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: false,
    persistenceEnabled: false,
  }));
  expect(view.queryByTestId('flashcards-swipe-prompt')).toBeNull();
  expect(timeoutSpy).not.toHaveBeenCalled();

  mockAccessResolved = true;
  mockConfirmEnergy.mockResolvedValue('spent');
  mockConsumeQuota.mockResolvedValue({ status: 'exhausted', used: 3, limit: 3 });
  await view.rerender(React.createElement(FlashcardsSwipeScreen));
  await view.rerender(React.createElement(FlashcardsSwipeScreen));
  await act(async () => Promise.resolve());

  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/premium_modal',
    params: { context: 'flashcard_training', source: 'flashcards_training_start' },
  });
  expect(mockLoadSaved).toHaveBeenCalledTimes(1);
  expect(mockConfirmEnergy).toHaveBeenCalledTimes(1);
  expect(mockConsumeQuota).toHaveBeenCalledWith(expect.objectContaining({ mode: 'swipe', receiptId: 'swipe:attempt' }));
  expect(mockRefundEnergy).toHaveBeenCalledWith('energy:test:swipe', 'quota_refused');
  expect(view.queryByTestId('flashcards-swipe-prompt')).toBeNull();
  timeoutSpy.mockRestore();
});

test('an unavailable quota after a deferred spend refunds exactly once without a false paywall', async () => {
  let resolveConfirm!: (result: string) => void;
  mockConfirmEnergy.mockImplementationOnce(() => new Promise((resolve) => { resolveConfirm = resolve; }));
  mockAccessResolved = true;
  mockConsumeQuota.mockResolvedValue({ status: 'unavailable', used: 0, limit: 3 });
  const view = await render(React.createElement(FlashcardsSwipeScreen));

  await waitFor(() => expect(mockConfirmEnergy).toHaveBeenCalledTimes(1));
  await act(async () => {
    resolveConfirm('spent');
    await Promise.resolve();
  });
  await view.rerender(React.createElement(FlashcardsSwipeScreen));
  await act(async () => Promise.resolve());

  expect(mockRefundEnergy).toHaveBeenCalledTimes(1);
  expect(mockRefundEnergy).toHaveBeenCalledWith('energy:test:swipe', 'quota_refused');
  expect(mockAcknowledgeEnergy).not.toHaveBeenCalled();
  expect(view.queryByTestId('flashcards-swipe-prompt')).toBeNull();
  expect(mockReplace).not.toHaveBeenCalled();
});

test('an allowed free quota runs quick-start and rerender cannot consume the same start twice', async () => {
  mockAccessResolved = true;
  mockConfirmEnergy.mockResolvedValue('spent');
  const view = await render(React.createElement(FlashcardsSwipeScreen));

  await waitFor(() => expect(mockLoadSaved).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(mockConfirmEnergy).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(view.getByTestId('flashcards-swipe-prompt')).toBeTruthy());
  await waitFor(() => expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1));
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: true,
    persistenceEnabled: true,
  }));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);

  await view.rerender(React.createElement(FlashcardsSwipeScreen));
  await act(async () => Promise.resolve());

  expect(view.getByTestId('flashcards-swipe-prompt')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockConfirmEnergy).toHaveBeenCalledTimes(1);
  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockPracticeRunesInput).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  expect(mockSessionAttemptsInput).toHaveBeenLastCalledWith(expect.objectContaining({
    autoHydrate: true,
    persistenceEnabled: true,
  }));
});

test('pending allowed consume survives unmount and same-intent remount without a second quota count', async () => {
  let attemptOrdinal = 0;
  mockAttemptIdFactory = () => `attempt-${++attemptOrdinal}`;
  mockAccessResolved = true;
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

  const first = await render(React.createElement(FlashcardsSwipeScreen));
  await waitFor(() => expect(mockConsumeQuota).toHaveBeenCalledTimes(1));
  const firstReceipt = mockConsumeQuota.mock.calls[0]?.[0].receiptId;
  await first.unmount();
  await act(async () => { resolvePending(); await Promise.resolve(); });

  const second = await render(React.createElement(FlashcardsSwipeScreen));
  await waitFor(() => expect(second.getByTestId('flashcards-swipe-prompt')).toBeTruthy());

  expect(mockConsumeQuota).toHaveBeenCalledTimes(1);
  expect(mockConsumeQuota.mock.calls[0]?.[0].receiptId).toBe(firstReceipt);
  expect(countedReceipts.size).toBe(1);
  expect(mockRefundEnergy).not.toHaveBeenCalled();
  expect(mockAcknowledgeEnergy).toHaveBeenCalledTimes(1);
});
