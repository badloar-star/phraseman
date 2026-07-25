/* eslint-disable @typescript-eslint/no-require-imports, react/display-name, import/first */
import React, { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

jest.unmock('react-native');

const mockBack = jest.fn();
const mockSubmitSurvey: jest.Mock = jest.fn();
const mockReplaceBalance: jest.Mock = jest.fn(() => Promise.resolve());
const mockMarkDone: jest.Mock = jest.fn(() => Promise.resolve());
const mockBeginCache: jest.Mock = jest.fn(() => 17);
const mockCommitCache: jest.Mock = jest.fn();
const mockEmit: jest.Mock = jest.fn();
const mockClearPrimed: jest.Mock = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ surveyId: 'survey-a', stableId: 'account-a', dayKey: '2026-07-11', lang: 'en' }),
}));
jest.mock('../app/navigation_back', () => ({ safeRouterBack: () => mockBack() }));
jest.mock('../app/survey_client', () => ({ submitSurvey: (...args: unknown[]) => mockSubmitSurvey(...args) }));
jest.mock('../app/shards_system', () => ({
  replaceShardsBalanceForAccountGeneration: (...args: unknown[]) => mockReplaceBalance(...args),
}));
jest.mock('../app/survey_daily_task', () => ({ markSurveyDailyTaskDone: (...args: unknown[]) => mockMarkDone(...args) }));
jest.mock('../app/survey_daily_task_cache', () => ({
  beginSurveyDailyTaskRequest: (...args: unknown[]) => mockBeginCache(...args),
  commitSurveyDailyTaskRequest: (...args: unknown[]) => mockCommitCache(...args),
}));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));
jest.mock('../app/survey_handoff', () => ({
  takePrimedSurvey: () => ({
    surveyId: 'survey-a', title: 'Survey A', subtitle: 'Keep this subtitle', rewardShards: 3,
    finalTitle: 'Thank you', finalSubtitle: 'Complete final copy',
    questions: [{ id: 'q1', type: 'text', text: 'Your answer', options: [] }],
  }),
  clearPrimedSurvey: () => mockClearPrimed(),
}));
jest.mock('../app/survey_daily_challenge_model', () => ({
  buildServerConfirmedLegacyCompletion: () => ({ phase: 'completed', survey: null, surveyId: 'survey-a', title: 'Survey A' }),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(() => Promise.resolve('account-a')) }));
jest.mock('../app/daily_tasks', () => ({ getTodayKey: () => '2099-01-01' }));
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
  return { SafeAreaView: ({ children }: any) => <MockView>{children}</MockView> };
});
jest.mock('@expo/vector-icons', () => {
  const { Text: MockText } = require('react-native');
  return { Ionicons: ({ name }: any) => <MockText>{name}</MockText> };
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
  mockReplaceBalance.mockResolvedValue('applied');
  mockMarkDone.mockResolvedValue(true);
  mockCommitCache.mockReturnValue(true);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('ordinary unmount still reconciles same-generation durable state without presentation effects', async () => {
  const request = deferred<any>();
  mockSubmitSurvey.mockReturnValue(request.promise);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const view = await submitMounted();
  await view.unmount();

  await act(async () => {
    request.resolve({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
    await request.promise;
    await Promise.resolve(); await Promise.resolve();
  });
  jest.runOnlyPendingTimers();

  expect(mockReplaceBalance).toHaveBeenCalledWith(13, expect.any(Object), 'account-a', expect.any(Object));
  expect(mockMarkDone).toHaveBeenCalledWith(expect.objectContaining({ stableId: 'account-a', dayKey: '2026-07-11' }));
  expect(mockCommitCache).toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(errorSpy.mock.calls.flat().join(' ')).not.toMatch(/unmounted|state update/i);
  errorSpy.mockRestore();
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
  beginAccountGeneration('account-b');

  await act(async () => {
    request.resolve({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
    await request.promise;
    await Promise.resolve();
  });

  expect(mockReplaceBalance).not.toHaveBeenCalled();
  expect(mockMarkDone).not.toHaveBeenCalled();
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(view.getByTestId('reward-phase').props.children).toBe('retryable-error');
  expect(view.getByText('Аккаунт изменился. Вернись и открой опрос снова.')).toBeTruthy();
  expect(view.getByTestId('retry').props.accessibilityState).toEqual({ disabled: true });
  expect(view.getByTestId('back')).toBeTruthy();
  await view.unmount();
});

test('account switch while guarded balance reconciliation is pending stops marker, cache, and presentation', async () => {
  const balance = deferred<'stale-generation'>();
  mockSubmitSurvey.mockResolvedValue({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
  mockReplaceBalance.mockReturnValue(balance.promise);
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); });
  expect(mockReplaceBalance).toHaveBeenCalled();
  beginAccountGeneration('account-b');
  await act(async () => balance.resolve('stale-generation'));

  expect(mockMarkDone).not.toHaveBeenCalled();
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  expect(view.getByTestId('reward-phase').props.children).toBe('retryable-error');
  expect(view.getByTestId('retry').props.accessibilityState).toEqual({ disabled: true });
  await view.unmount();
});

test('reward zero reconciles completion without a shards event or positive reward display', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 0, balanceAfter: 13, shardsUpdatedAtMs: 42 });
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(view.getByTestId('reward-phase').props.children).toBe('reconciled');
  expect(view.getByTestId('reward-value').props.children).toBe(0);
  expect(mockMarkDone).toHaveBeenCalled();
  expect(mockCommitCache).toHaveBeenCalled();
  expect(mockEmit).not.toHaveBeenCalledWith('shards_earned', expect.anything());
});

test('balance or marker failure stays retryable and never records false completion', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
  mockReplaceBalance.mockResolvedValueOnce('failed');
  const balanceFailure = await submitMounted();
  await act(async () => { await Promise.resolve(); });
  expect(mockMarkDone).not.toHaveBeenCalled();
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(balanceFailure.getByTestId('reward-phase').props.children).toBe('retryable-error');
  await balanceFailure.unmount();

  mockReplaceBalance.mockResolvedValue('applied');
  mockMarkDone.mockRejectedValueOnce(new Error('storage failed'));
  const markerFailure = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockCommitCache).not.toHaveBeenCalled();
  expect(markerFailure.getByTestId('reward-phase').props.children).toBe('retryable-error');
});

test('cache commit failure never presents success or emits a reward event', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
  mockCommitCache.mockReturnValue(false);
  const view = await submitMounted();
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockReplaceBalance).toHaveBeenCalled();
  expect(mockMarkDone).toHaveBeenCalled();
  expect(view.getByTestId('reward-phase').props.children).toBe('retryable-error');
  expect(mockEmit).not.toHaveBeenCalledWith('shards_earned', expect.anything());
});

test('already-newer wallet outcome still completes marker and cache without retry loop', async () => {
  mockSubmitSurvey.mockResolvedValue({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
  mockReplaceBalance.mockResolvedValue('already-newer');
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
  mockSubmitSurvey.mockResolvedValue({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
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
    second.resolve({ reward: 3, balanceAfter: 13, shardsUpdatedAtMs: 42 });
    await second.promise;
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(view.getByTestId('reward-phase').props.children).toBe('reconciled');
  expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1400);
  await fireEvent.press(view.getByTestId('done'));
  await act(async () => { jest.advanceTimersByTime(1400); });
  expect(mockBack).toHaveBeenCalledTimes(1);
  timeoutSpy.mockRestore();
});
