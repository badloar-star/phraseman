/* eslint-disable @typescript-eslint/no-require-imports, react/display-name, import/first */
import React, { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Animated } from 'react-native';

jest.unmock('react-native');

const mockBack = jest.fn();
const mockSubmitSurvey: jest.Mock = jest.fn();
const mockCommitEvent: jest.Mock = jest.fn(() => Promise.resolve({ status: 'applied' }));
const mockMarkDone: jest.Mock = jest.fn(() => Promise.resolve());
const mockBeginCache: jest.Mock = jest.fn(() => 17);
const mockCommitCache: jest.Mock = jest.fn();
const mockEmit: jest.Mock = jest.fn();
const mockClearPrimed: jest.Mock = jest.fn();
const mockGetCanonicalUserId: jest.Mock = jest.fn();
const mockTakePrimedSurvey: jest.Mock = jest.fn();
let mockRouteParams: Record<string, string | undefined> = {};
let mockPrimedSurvey: Record<string, any> = {};
let mockUtcDayKey = '2099-01-01';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockRouteParams,
  usePathname: () => '/survey_screen',
}));
jest.mock('../app/navigation_back', () => ({ safeRouterBack: () => mockBack() }));
jest.mock('../app/survey_client', () => ({ submitSurvey: (...args: unknown[]) => mockSubmitSurvey(...args) }));
jest.mock('../app/shards_system', () => ({
  commitConfirmedExternalShardEvent: (...args: unknown[]) => mockCommitEvent(...args),
  SHARD_REWARDS: { survey_completed: 1 },
}));
jest.mock('../app/survey_completion_marker', () => ({ markSurveyOfferDone: (...args: unknown[]) => mockMarkDone(...args) }));
jest.mock('../app/survey_offer_cache', () => ({
  beginSurveyOfferRequest: (...args: unknown[]) => mockBeginCache(...args),
  commitSurveyOfferRequest: (...args: unknown[]) => mockCommitCache(...args),
}));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));
jest.mock('../app/survey_handoff', () => ({
  takePrimedSurvey: (...args: unknown[]) => mockTakePrimedSurvey(...args),
  clearPrimedSurvey: () => mockClearPrimed(),
}));
jest.mock('../app/survey_offer_model', () => ({
  buildServerConfirmedLegacyCompletion: () => ({ phase: 'completed', survey: null, surveyId: 'survey-a', title: 'Survey A' }),
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: (...args: unknown[]) => mockGetCanonicalUserId(...args),
}));
jest.mock('../app/local_date', () => ({ getUtcDayKey: () => mockUtcDayKey }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { bgCard: '#111', bgPrimary: '#000', accent: '#9cff00', correctText: '#07110A' },
    f: { body: 16, label: 14, h1: 28, h2: 22, numMd: 18 }, themeMode: 'dark',
  }),
}));
jest.mock('../constants/theme', () => ({
  screenTextOnGradient: () => ({ primary: '#fff', muted: '#aaa', second: '#B98CFF', ghost: '#222' }),
}));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, copy: Record<string, string>) => copy.en ?? copy.ru }));
jest.mock('../components/TapScale', () => {
  const { Pressable: MockPressable } = require('react-native');
  return ({ children, ...props }: any) => <MockPressable {...props}>{children}</MockPressable>;
});
jest.mock('../components/ScreenGradient', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: any) => <MockView>{children}</MockView>;
});
jest.mock('../components/ContentWrap', () => {
  const { View: MockView } = require('react-native');
  return ({ children }: any) => <MockView>{children}</MockView>;
});
jest.mock('react-native-safe-area-context', () => {
  const { View: MockView } = require('react-native');
  return {
    SafeAreaView: ({ children }: any) => <MockView>{children}</MockView>,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
jest.mock('@expo/vector-icons', () => {
  const { Text: MockText } = require('react-native');
  return { Ionicons: ({ name }: any) => <MockText>{name}</MockText> };
});
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text: MockText } = require('react-native');
  return ({ name }: any) => <MockText>{name}</MockText>;
});
jest.mock('../components/survey/SurveyRewardPanel', () => {
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return (props: any) => (
    <MockView testID="reward-panel">
      <MockText testID="reward-phase">{props.phase}</MockText>
      <MockText testID="reward-value">{props.reward}</MockText>
      <MockText>{props.title}</MockText><MockText>{props.subtitle}</MockText><MockText>{props.error}</MockText>
      {props.phase === 'retryable-error'
        ? <>
          <MockPressable testID="retry" disabled={props.retryDisabled} accessibilityState={{ disabled: !!props.retryDisabled }} onPress={props.onRetry}><MockText>Retry</MockText></MockPressable>
          <MockPressable testID="back" onPress={props.onBack}><MockText>Back</MockText></MockPressable>
        </>
        : <MockPressable testID="done" onPress={props.onDone}><MockText>Done</MockText></MockPressable>}
    </MockView>
  );
});
jest.mock('../components/survey/SurveySheetModal', () => {
  const { Pressable: MockPressable, Text: MockText, TextInput: MockTextInput, View: MockView } = require('react-native');
  const { useSurveyFlowController } = require('../app/survey_flow_controller');
  const MockRewardPanelModule = require('../components/survey/SurveyRewardPanel');
  const MockRewardPanel = MockRewardPanelModule.default ?? MockRewardPanelModule;
  return ({ visible, launch, onClose, onDismissed }: any) => {
    const flow = useSurveyFlowController({ launch, onReconciled: onClose });
    if (!visible) {
      return <MockPressable testID="compat-native-dismiss" onPress={onDismissed} />;
    }
    const question = flow.currentQuestion;
    if (flow.submission.phase !== 'editing') {
      const error = flow.submission.messageKey === 'account_changed'
        ? 'Аккаунт изменился. Вернись и открой опрос снова.'
        : flow.submission.messageKey === 'rate_limited'
          ? 'Слишком много опросов подряд. Попробуй позже.'
          : flow.submission.messageKey === 'unknown_survey'
            ? 'Опрос уже недоступен.'
            : 'Не удалось отправить. Попробуй снова.';
      return (
        <MockView testID="compat-survey-sheet">
          <MockRewardPanel
            phase={flow.submission.phase}
            reward={flow.submission.confirmedReward}
            title={launch.survey.finalTitle ?? 'Спасибо!'}
            subtitle={launch.survey.finalSubtitle ?? ''}
            error={error}
            onDone={onClose}
            onRetry={() => { void flow.retrySubmit(); }}
            retryDisabled={flow.submission.messageKey === 'account_changed'}
            onBack={onClose}
          />
          <MockPressable testID="compat-native-dismiss" onPress={onDismissed} />
        </MockView>
      );
    }
    return (
      <MockView testID="compat-survey-sheet">
        <MockText>{launch.survey.title}</MockText>
        <MockText testID="compat-launch-scope">{`${launch.stableId}|${launch.dayKey}|${launch.lang}`}</MockText>
        <MockText>{question.text}</MockText>
        {question.type === 'text' ? (
          <MockTextInput
            testID="compat-survey-input"
            value={flow.answers[question.id]?.comment ?? ''}
            placeholder="Напиши ответ…"
            onChangeText={(text: string) => flow.setComment(question.id, text)}
          />
        ) : question.options.map((option: any) => (
          <MockPressable key={option.id} onPress={() => flow.pickOption(question.id, option.id)}>
            <MockText>{option.label}</MockText>
          </MockPressable>
        ))}
        <MockPressable disabled={!flow.currentAnswered || flow.submitting} onPress={flow.goNext}>
          <MockText>{flow.isLastStep ? 'Отправить' : 'Дальше'}</MockText>
        </MockPressable>
        <MockPressable testID="compat-close" onPress={onClose} />
        <MockPressable testID="compat-native-dismiss" onPress={onDismissed} />
      </MockView>
    );
  };
});

import SurveyScreen from '../app/survey_screen';
import { beginAccountGeneration, __resetAccountGenerationForTests } from '../app/account_generation';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function submitMounted() {
  const view = await render(<SurveyScreen />);
  expect(view.getByText('Survey A').props.numberOfLines).toBeUndefined();
  await fireEvent.changeText(view.getByPlaceholderText('Напиши ответ…'), 'kept answer');
  await fireEvent.press(view.getByText('Отправить'));
  return view;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('account-a');
  mockRouteParams = {
    surveyId: 'survey-a',
    stableId: 'account-a',
    dayKey: '2099-01-01',
    lang: 'en',
  };
  mockUtcDayKey = '2099-01-01';
  jest.setSystemTime(new Date('2099-01-01T23:59:59.900Z'));
  mockPrimedSurvey = {
    surveyId: 'survey-a', title: 'Survey A', subtitle: 'Keep this subtitle', rewardShards: 3,
    finalTitle: 'Thank you', finalSubtitle: 'Complete final copy',
    questions: [{ id: 'q1', type: 'text', text: 'Your answer', options: [] }],
  };
  mockGetCanonicalUserId.mockResolvedValue('account-a');
  mockTakePrimedSurvey.mockImplementation(() => mockPrimedSurvey);
  jest.spyOn(Animated, 'timing').mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as never);
  mockCommitEvent.mockResolvedValue({ status: 'applied' });
  mockMarkDone.mockResolvedValue(true);
  mockCommitCache.mockReturnValue(true);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('ordinary unmount still reconciles same-generation durable state without presentation effects', async () => {
  const request = deferred<any>();
  mockSubmitSurvey.mockReturnValue(request.promise);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const view = await submitMounted();
  await view.unmount();

  await act(async () => {
    request.resolve({ reward: 1, eventId: 'survey-a' });
    await request.promise;
    await Promise.resolve(); await Promise.resolve();
  });
  jest.runOnlyPendingTimers();

  expect(mockCommitEvent).toHaveBeenCalledWith({
    expectedOwnerStableId: 'account-a',
    source: 'shard_survey',
    eventId: 'survey-a',
    delta: 1,
    reason: 'survey_completed',
    grant: {
      kind: 'survey_reward',
      subjectId: 'survey-a',
      payload: { surveyId: 'survey-a' },
    },
  });
  expect(mockMarkDone).toHaveBeenCalledWith(expect.objectContaining({ stableId: 'account-a', dayKey: '2099-01-01' }));
  expect(mockCommitCache).toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(errorSpy.mock.calls.flat().join(' ')).not.toMatch(/unmounted|state update/i);
  errorSpy.mockRestore();
});

test('unscoped identity rejection exits the loader through the unavailable state', async () => {
  mockRouteParams = { surveyId: 'survey-a' };
  mockGetCanonicalUserId.mockRejectedValue(new Error('identity unavailable'));

  const view = await render(<SurveyScreen />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(view.getByText('Опрос недоступен.')).toBeTruthy();
  expect(mockSubmitSurvey).not.toHaveBeenCalled();
  await view.unmount();
});

test('passes the validated route scope to the shared sheet and closes the route once', async () => {
  const view = await render(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockTakePrimedSurvey).toHaveBeenCalledWith('survey-a', {
    stableId: 'account-a', dayKey: '2099-01-01', lang: 'en',
  });
  expect(view.getByTestId('compat-launch-scope').props.children).toBe('account-a|2099-01-01|en');
  await fireEvent.press(view.getByTestId('compat-close'));
  expect(mockBack).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockClearPrimed).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('rejects URL account A before reading its handoff when active identity is account B', async () => {
  beginAccountGeneration('account-b');
  mockGetCanonicalUserId.mockResolvedValue('account-b');
  mockRouteParams = {
    surveyId: 'survey-a', stableId: 'account-a', dayKey: '2099-01-01', lang: 'en',
  };

  const view = await render(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });

  expect(mockTakePrimedSurvey).not.toHaveBeenCalled();
  expect(view.queryByTestId('compat-survey-sheet')).toBeNull();
  expect(view.getByText('Опрос недоступен.')).toBeTruthy();
  await view.unmount();
});

test.each(['2098-12-31', '2099-01-02'])('rejects non-current route day %s before reading the handoff', async (dayKey) => {
  mockRouteParams = { surveyId: 'survey-a', stableId: 'account-a', dayKey, lang: 'en' };

  const view = await render(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });

  expect(mockTakePrimedSurvey).not.toHaveBeenCalled();
  expect(view.queryByTestId('compat-survey-sheet')).toBeNull();
  expect(view.getByText('Опрос недоступен.')).toBeTruthy();
  await view.unmount();
});

test('UTC rollover hides the route sheet before native dismissal navigates once', async () => {
  const view = await render(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(view.getByTestId('compat-survey-sheet')).toBeTruthy();

  mockUtcDayKey = '2099-01-02';
  await act(async () => { jest.advanceTimersByTime(200); });

  expect(view.queryByTestId('compat-survey-sheet')).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('same stable ID with a new account generation hides before native dismissal', async () => {
  const view = await render(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(view.getByTestId('compat-survey-sheet')).toBeTruthy();

  await act(async () => { beginAccountGeneration('account-a'); });
  expect(view.queryByTestId('compat-survey-sheet')).toBeNull();
  expect(mockBack).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('route scope changes remount the controller with the new survey key', async () => {
  const surveyA = mockPrimedSurvey;
  const surveyB = {
    ...surveyA,
    surveyId: 'survey-b',
    title: 'Survey B',
    questions: [{ id: 'q2', type: 'text', text: 'Fresh answer', options: [] }],
  };
  mockTakePrimedSurvey.mockImplementation((surveyId: string) => surveyId === 'survey-b' ? surveyB : surveyA);
  const view = await render(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  await fireEvent.changeText(view.getByTestId('compat-survey-input'), 'old answer');
  expect(view.getByDisplayValue('old answer')).toBeTruthy();

  mockRouteParams = {
    surveyId: 'survey-b', stableId: 'account-a', dayKey: '2099-01-01', lang: 'en',
  };
  await view.rerender(<SurveyScreen />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });

  expect(view.getByText('Survey B')).toBeTruthy();
  expect(view.getByTestId('compat-launch-scope').props.children).toBe('account-a|2099-01-01|en');
  expect(view.getByTestId('compat-survey-input').props.value).toBe('');
  await view.unmount();
});

test('rejection after ordinary unmount has no dispatch, timer, or navigation', async () => {
  const request = deferred<any>();
  mockSubmitSurvey.mockReturnValue(request.promise);
  const timeoutSpy = jest.spyOn(global, 'setTimeout');
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const view = await submitMounted();
  await view.unmount();

  await act(async () => {
    request.reject(new Error('network unavailable'));
    await request.promise.catch(() => undefined);
    await Promise.resolve();
  });

  expect(mockBack).not.toHaveBeenCalled();
  expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 1400);
  expect(errorSpy.mock.calls.flat().join(' ')).not.toMatch(/unmounted|state update/i);
  timeoutSpy.mockRestore(); errorSpy.mockRestore();
});

test('account switch before account A resolves suppresses every local effect', async () => {
  const request = deferred<any>();
  mockSubmitSurvey.mockReturnValue(request.promise);
  const view = await submitMounted();
  await act(async () => { beginAccountGeneration('account-b'); });

  await act(async () => {
    request.resolve({ reward: 1, eventId: 'survey-a' });
    await request.promise;
    await Promise.resolve();
  });

  expect(mockCommitEvent).not.toHaveBeenCalled();
  expect(mockMarkDone).not.toHaveBeenCalled();
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(view.queryByTestId('reward-phase')).toBeNull();
  expect(view.queryByTestId('compat-survey-sheet')).toBeNull();
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('account switch while the immutable event is pending stops marker, cache, and presentation', async () => {
  const event = deferred<{ status: 'applied' }>();
  mockSubmitSurvey.mockResolvedValue({ reward: 1, eventId: 'survey-a' });
  mockCommitEvent.mockReturnValue(event.promise);
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); });
  expect(mockCommitEvent).toHaveBeenCalled();
  await act(async () => { beginAccountGeneration('account-b'); });
  await act(async () => event.resolve({ status: 'applied' }));

  expect(mockMarkDone).not.toHaveBeenCalled();
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(view.queryByTestId('reward-phase')).toBeNull();
  expect(view.queryByTestId('compat-survey-sheet')).toBeNull();
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  expect(mockBack).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('reward zero reconciles completion without a shards event or positive reward display', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 0, eventId: 'survey-a' });
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(view.getByTestId('reward-phase').props.children).toBe('reconciled');
  expect(view.getByTestId('reward-value').props.children).toBe(0);
  expect(mockMarkDone).toHaveBeenCalled();
  expect(mockCommitCache).toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalledWith('shards_earned', expect.anything());
});

test('event or marker failure stays retryable and never records false completion', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 1, eventId: 'survey-a' });
  mockCommitEvent.mockResolvedValueOnce({ status: 'failed' });
  const eventFailure = await submitMounted();
  await act(async () => { await Promise.resolve(); });
  expect(mockMarkDone).not.toHaveBeenCalled();
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(eventFailure.getByTestId('reward-phase').props.children).toBe('retryable-error');
  await eventFailure.unmount();

  mockCommitEvent.mockResolvedValue({ status: 'applied' });
  mockMarkDone.mockRejectedValueOnce(new Error('storage failed'));
  const markerFailure = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(markerFailure.getByTestId('reward-phase').props.children).toBe('retryable-error');
});

test('cache commit failure never presents success or emits a reward event', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 1, eventId: 'survey-a' });
  mockCommitCache.mockReturnValue(false);
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockCommitEvent).toHaveBeenCalled();
  expect(mockMarkDone).toHaveBeenCalled();
  expect(view.getByTestId('reward-phase').props.children).toBe('retryable-error');
  expect(mockEmit).not.toHaveBeenCalledWith('shards_earned', expect.anything());
});

test('already-applied immutable event still completes marker and cache without retry loop', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 1, eventId: 'survey-a' });
  mockCommitEvent.mockResolvedValue({ status: 'already-applied' });
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockMarkDone).toHaveBeenCalled();
  expect(mockCommitCache).toHaveBeenCalled();
  expect(view.getByTestId('reward-phase').props.children).toBe('reconciled');
});

test('repeated final presses create only one active request', async () => {
  const request = deferred<any>();
  mockSubmitSurvey.mockReturnValue(request.promise);
  const view = await render(<SurveyScreen />);
  await fireEvent.changeText(view.getByPlaceholderText('Напиши ответ…'), 'one answer');
  const submit = view.getByText('Отправить');
  await fireEvent.press(submit);
  await fireEvent.press(submit);
  expect(mockSubmitSurvey).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test.each([
  ['resource-exhausted rate_limited', 'Слишком много опросов подряд. Попробуй позже.'],
  ['unknown_survey', 'Опрос уже недоступен.'],
] as const)('shows distinct in-panel guidance for %s', async (failure, copy) => {
  mockSubmitSurvey.mockRejectedValue(new Error(failure));
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); });
  expect(view.getByText(copy)).toBeTruthy();
});

test('StrictMode effect replay leaves the mounted instance active and unmount clears reconciled return', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 1, eventId: 'survey-a' });
  const view = await render(<StrictMode><SurveyScreen /></StrictMode>);
  await fireEvent.changeText(view.getByPlaceholderText('Напиши ответ…'), 'strict answer');
  await fireEvent.press(view.getByText('Отправить'));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(view.getByTestId('reward-phase').props.children).toBe('reconciled');
  await view.unmount();
  jest.advanceTimersByTime(1400);
  expect(mockBack).not.toHaveBeenCalled();
});

test('failure preserves the answer, retry is monotonic, and only reconciliation schedules return', async () => {
  const first = deferred<any>(); const second = deferred<any>();
  mockSubmitSurvey.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const timeoutSpy = jest.spyOn(global, 'setTimeout');
  const view = await submitMounted();
  expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 1400);

  await act(async () => first.reject(new Error('network unavailable')));
  expect(view.getByTestId('reward-phase').props.children).toBe('retryable-error');
  await fireEvent.press(view.getByTestId('retry'));
  expect(mockSubmitSurvey).toHaveBeenCalledTimes(2);
  expect(mockSubmitSurvey.mock.calls[1][0].answers).toEqual({ q1: { comment: 'kept answer' } });
  expect(timeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 1400);

  await act(async () => {
    second.resolve({ reward: 1, eventId: 'survey-a' });
    await second.promise;
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(view.getByTestId('reward-phase').props.children).toBe('reconciled');
  expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1400);
  await fireEvent.press(view.getByTestId('done'));
  expect(mockBack).not.toHaveBeenCalled();
  await fireEvent.press(view.getByTestId('compat-native-dismiss'));
  await act(async () => { jest.advanceTimersByTime(1400); });
  expect(mockBack).toHaveBeenCalledTimes(1);
  timeoutSpy.mockRestore();
});
