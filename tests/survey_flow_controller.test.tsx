/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

jest.unmock('react-native');

const mockSubmitSurvey = jest.fn();
const mockCommitConfirmedExternalShardEvent = jest.fn();
const mockMarkSurveyOfferDone = jest.fn();
const mockBeginSurveyOfferRequest = jest.fn();
const mockCommitSurveyOfferRequest = jest.fn();
const mockEmitAppEvent = jest.fn();

jest.mock('../app/survey_client', () => ({
  submitSurvey: (...args: unknown[]) => mockSubmitSurvey(...args),
}));
jest.mock('../app/shards_system', () => ({
  commitConfirmedExternalShardEvent: (...args: unknown[]) => mockCommitConfirmedExternalShardEvent(...args),
  SHARD_REWARDS: { survey_completed: 1 },
}));
jest.mock('../app/survey_completion_marker', () => ({
  markSurveyOfferDone: (...args: unknown[]) => mockMarkSurveyOfferDone(...args),
}));
jest.mock('../app/survey_offer_cache', () => ({
  beginSurveyOfferRequest: (...args: unknown[]) => mockBeginSurveyOfferRequest(...args),
  commitSurveyOfferRequest: (...args: unknown[]) => mockCommitSurveyOfferRequest(...args),
}));
jest.mock('../app/survey_offer_model', () => ({
  buildServerConfirmedLegacyCompletion: (lang: string) => ({ phase: 'completed', lang }),
}));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmitAppEvent(...args) }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn() }));

import {
  useSurveyFlowController,
  sameSurveyDurableScope,
  type SurveyFlowController,
  type SurveyLaunch,
} from '../app/survey_flow_controller';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const launch: SurveyLaunch = {
  survey: {
    surveyId: 'survey-a',
    title: 'Survey A',
    subtitle: '',
    rewardShards: 99,
    questions: [{
      id: 'q1',
      type: 'single_choice',
      text: 'Question one',
      options: [{ id: 'o1', label: 'Option one' }],
    }],
  },
  stableId: 'account-a',
  dayKey: '2026-08-21',
  lang: 'ru',
};
const ROOT = path.resolve(__dirname, '..');

function SurveyFlowHarness({
  onReconciled = jest.fn(),
  onDurablyReconciled = jest.fn(),
  expose,
  launchValue = launch,
}: {
  onReconciled?: () => void;
  onDurablyReconciled?: (scope: { stableId: string; dayKey: string; surveyId: string }) => void;
  expose?: (flow: SurveyFlowController) => void;
  launchValue?: SurveyLaunch;
}) {
  const flow = useSurveyFlowController({ launch: launchValue, onReconciled, onDurablyReconciled });
  expose?.(flow);
  return (
    <View>
      <Text testID="phase">{flow.submission.phase}</Text>
      <Text testID="error-key">{flow.submission.messageKey ?? ''}</Text>
      <Pressable testID="answer-q1-o1" onPress={() => flow.pickOption('q1', 'o1')} />
      <Pressable testID="submit" onPress={flow.goNext} />
      <Pressable testID="deactivate" onPress={flow.deactivate} />
    </View>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration(launch.stableId);
  mockCommitConfirmedExternalShardEvent.mockResolvedValue({ status: 'applied' });
  mockMarkSurveyOfferDone.mockResolvedValue(true);
  mockBeginSurveyOfferRequest.mockReturnValue(17);
  mockCommitSurveyOfferRequest.mockReturnValue(true);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('commits the immutable canonical reward only after submit completes, then marks the captured scope', async () => {
  const pending = deferred<{ ok: true; alreadyGranted: false; reward: number; eventId: string }>();
  const onReconciled = jest.fn();
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const view = await render(<SurveyFlowHarness onReconciled={onReconciled} />);

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('submit'));

  expect(mockSubmitSurvey).toHaveBeenCalledTimes(1);
  expect(mockCommitConfirmedExternalShardEvent).not.toHaveBeenCalled();
  expect(mockMarkSurveyOfferDone).not.toHaveBeenCalled();

  await act(async () => {
    pending.resolve({ ok: true, alreadyGranted: false, reward: 1, eventId: 'server-event-a' });
    await pending.promise;
  });

  await waitFor(() => expect(mockCommitConfirmedExternalShardEvent).toHaveBeenCalledWith({
    expectedOwnerStableId: launch.stableId,
    source: 'shard_survey',
    eventId: launch.survey.surveyId,
    delta: 1,
    reason: 'survey_completed',
    grant: {
      kind: 'survey_reward',
      subjectId: launch.survey.surveyId,
      payload: { surveyId: launch.survey.surveyId },
    },
  }));
  expect(mockMarkSurveyOfferDone).toHaveBeenCalledWith({
    stableId: launch.stableId,
    dayKey: launch.dayKey,
    summary: { surveyId: launch.survey.surveyId, title: launch.survey.title },
  });
  expect(mockCommitSurveyOfferRequest).toHaveBeenCalled();
  expect(view.getByTestId('phase').props.children).toBe('reconciled');
  expect(onReconciled).not.toHaveBeenCalled();
  await act(() => { jest.advanceTimersByTime(1400); });
  expect(onReconciled).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('passes the captured owner into the atomic reward commit so an A-to-B race cannot credit B', async () => {
  const creditedOwners: string[] = [];
  mockSubmitSurvey.mockResolvedValueOnce({
    ok: true,
    alreadyGranted: false,
    reward: 1,
    eventId: 'server-event-a',
  });
  mockCommitConfirmedExternalShardEvent.mockImplementationOnce(async (input: {
    expectedOwnerStableId?: string;
  }) => {
    // Model the account changing after the controller's outer check but before
    // the economy primitive captures its operation owner.
    beginAccountGeneration('account-b');
    const operationOwner = 'account-b';
    if (
      input.expectedOwnerStableId !== undefined
      && input.expectedOwnerStableId !== operationOwner
    ) {
      return { status: 'failed', reason: 'stale_account_generation' };
    }
    creditedOwners.push(operationOwner);
    return { status: 'applied' };
  });
  const view = await render(<SurveyFlowHarness />);

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('submit'));

  await waitFor(() => expect(view.getByTestId('error-key').props.children).toBe('account_changed'));
  expect(mockCommitConfirmedExternalShardEvent).toHaveBeenCalledWith(expect.objectContaining({
    expectedOwnerStableId: launch.stableId,
  }));
  expect(creditedOwners).toEqual([]);
  expect(mockMarkSurveyOfferDone).not.toHaveBeenCalled();
  expect(mockCommitSurveyOfferRequest).not.toHaveBeenCalled();
  await view.unmount();
});

test('blocks a late completion after account generation changes', async () => {
  const pending = deferred<{ ok: true; alreadyGranted: false; reward: number; eventId: string }>();
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const view = await render(<SurveyFlowHarness />);

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('submit'));
  beginAccountGeneration('account-b');

  await act(async () => {
    pending.resolve({ ok: true, alreadyGranted: false, reward: 1, eventId: 'server-event-a' });
    await pending.promise;
  });

  await waitFor(() => expect(view.getByTestId('error-key').props.children).toBe('account_changed'));
  expect(mockCommitConfirmedExternalShardEvent).not.toHaveBeenCalled();
  expect(mockMarkSurveyOfferDone).not.toHaveBeenCalled();
  expect(mockCommitSurveyOfferRequest).not.toHaveBeenCalled();
  await view.unmount();
});

test('deactivate suppresses presentation but lets an in-flight reconciliation finish', async () => {
  const pending = deferred<{ ok: true; alreadyGranted: false; reward: number; eventId: string }>();
  const onReconciled = jest.fn();
  const onDurablyReconciled = jest.fn();
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const view = await render(
    <SurveyFlowHarness onReconciled={onReconciled} onDurablyReconciled={onDurablyReconciled} />,
  );

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('submit'));
  await fireEvent.press(view.getByTestId('deactivate'));

  await act(async () => {
    pending.resolve({ ok: true, alreadyGranted: false, reward: 1, eventId: 'server-event-a' });
    await pending.promise;
  });

  await waitFor(() => expect(mockCommitConfirmedExternalShardEvent).toHaveBeenCalledTimes(1));
  expect(mockMarkSurveyOfferDone).toHaveBeenCalledTimes(1);
  expect(mockCommitSurveyOfferRequest).toHaveBeenCalledTimes(1);
  expect(onDurablyReconciled).toHaveBeenCalledTimes(1);
  expect(onDurablyReconciled).toHaveBeenCalledWith({
    stableId: launch.stableId,
    dayKey: launch.dayKey,
    surveyId: launch.survey.surveyId,
  });
  expect(view.getByTestId('phase').props.children).toBe('optimistic-reward');
  await act(() => { jest.advanceTimersByTime(1400); });
  expect(onReconciled).not.toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalled();
  await view.unmount();
});

test('finishes durable reconciliation after the presentation unmounts without late UI callbacks', async () => {
  const pending = deferred<{ ok: true; alreadyGranted: false; reward: number; eventId: string }>();
  const onReconciled = jest.fn();
  const onDurablyReconciled = jest.fn();
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const view = await render(
    <SurveyFlowHarness onReconciled={onReconciled} onDurablyReconciled={onDurablyReconciled} />,
  );

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('submit'));
  await view.unmount();
  await act(async () => {
    pending.resolve({ ok: true, alreadyGranted: false, reward: 1, eventId: 'server-event-a' });
    await pending.promise;
  });

  await waitFor(() => expect(onDurablyReconciled).toHaveBeenCalledTimes(1));
  expect(mockCommitConfirmedExternalShardEvent).toHaveBeenCalledTimes(1);
  expect(mockMarkSurveyOfferDone).toHaveBeenCalledTimes(1);
  expect(mockCommitSurveyOfferRequest).toHaveBeenCalledTimes(1);
  expect(onReconciled).not.toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalled();
});

test('matches a durable completion only to the exact stable/day/survey offer scope', () => {
  const current = { stableId: 'stable-a', dayKey: '2026-08-21', surveyId: 'survey-a' };
  expect(sameSurveyDurableScope(current, current)).toBe(true);
  expect(sameSurveyDurableScope(current, { ...current, stableId: 'stable-b' })).toBe(false);
  expect(sameSurveyDurableScope(current, { ...current, dayKey: '2026-08-22' })).toBe(false);
  expect(sameSurveyDurableScope(current, { ...current, surveyId: 'survey-b' })).toBe(false);
});

test('updates presentation callbacks only after commit instead of mutating refs during render', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app/survey_flow_controller.ts'), 'utf8');
  expect(source).not.toMatch(/const onReconciledRef = useRef\(input\.onReconciled\);\s*onReconciledRef\.current/s);
  expect(source).toMatch(/useEffect\(\(\) => \{\s*onReconciledRef\.current = input\.onReconciled;/s);
});

test('deactivate is idempotent and suppresses a late submit error plus every new UI command', async () => {
  const pending = deferred<never>();
  let flow!: SurveyFlowController;
  mockSubmitSurvey.mockReturnValueOnce(pending.promise);
  const view = await render(<SurveyFlowHarness expose={(value) => { flow = value; }} />);

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('submit'));
  await act(() => {
    flow.deactivate();
    flow.deactivate();
    flow.pickOption('q1', 'another');
    flow.setComment('q1', 'late');
    flow.goNext();
    flow.goBack();
  });
  await act(async () => {
    pending.reject(new Error('network'));
    await pending.promise.catch(() => undefined);
  });

  expect(view.getByTestId('phase').props.children).toBe('optimistic-reward');
  expect(view.getByTestId('error-key').props.children).toBe('');
  expect(mockCommitConfirmedExternalShardEvent).not.toHaveBeenCalled();
  expect(mockMarkSurveyOfferDone).not.toHaveBeenCalled();
  expect(mockCommitSurveyOfferRequest).not.toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalled();
  await view.unmount();
});

test('deactivate refuses a new retry after the presentation closes', async () => {
  let flow!: SurveyFlowController;
  const view = await render(<SurveyFlowHarness expose={(value) => { flow = value; }} />);

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await fireEvent.press(view.getByTestId('deactivate'));
  await act(async () => { await flow.retrySubmit(); });

  expect(mockSubmitSurvey).not.toHaveBeenCalled();
  expect(view.getByTestId('phase').props.children).toBe('editing');
  await view.unmount();
});

test('same-tick navigation calls move exactly one step and stay in bounds', async () => {
  const multiStepLaunch: SurveyLaunch = {
    ...launch,
    survey: {
      ...launch.survey,
      questions: [
        launch.survey.questions[0],
        { id: 'q2', type: 'single_choice', text: 'Question two', options: [] },
        { id: 'q3', type: 'single_choice', text: 'Question three', options: [] },
      ],
    },
  };
  let flow!: SurveyFlowController;
  const view = await render(
    <SurveyFlowHarness
      launchValue={multiStepLaunch}
      expose={(value) => { flow = value; }}
    />,
  );

  await fireEvent.press(view.getByTestId('answer-q1-o1'));
  await act(() => {
    flow.goNext();
    flow.goNext();
  });
  expect(flow.stepIndex).toBe(1);
  expect(flow.direction).toBe('forward');

  await act(() => {
    flow.goBack();
    flow.goBack();
  });
  expect(flow.stepIndex).toBe(0);
  expect(flow.direction).toBe('backward');
  await view.unmount();
});
