import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react-native';
import SpireRecordAttempt, { type RecordAttempt } from '../components/spire/SpireRecordAttempt';
import { arenaAnswerFingerprint } from '../modules/arena/answer_check';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Modal: 'Modal', ScrollView: 'ScrollView',
  StyleSheet: { create: (value: unknown) => value, flatten: (value: unknown) => value },
  Platform: { OS: 'android' },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: jest.fn() }) },
}));
jest.mock('../components/spire/SpireTaskView', () => ({ __esModule: true, default: (props: object) => require('react').createElement('View', { ...props, testID: 'record-task' }) }));
jest.mock('../components/v2/V2Pressable', () => ({ __esModule: true, default: 'Button' }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({}) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
const attempt: RecordAttempt = { token: 'token', floor: 1, step: 1, saltId: 'salt', packHash: 'pack', set: {
  tasks: Array.from({ length: 10 }, (_, i) => ({ taskId: `task${i}`, kind: 'choice', mode: 'guess_phrase', difficulty: 1, payload: {} })),
  answerFingerprints: Array.from({ length: 10 }, (_, i) => [arenaAnswerFingerprint('salt', `task${i}`, 0)]),
} };
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(100000); });
afterEach(async () => { await cleanup(); jest.useRealTimers(); });
async function start(onFinish: jest.Mock) {
  await render(<SpireRecordAttempt lang="ru" studyTarget="en" attempt={attempt} onFinish={onFinish} onClose={jest.fn()} />);
  expect(screen.getByTestId('record-task')).toBeTruthy();
}
test('ten correct answers finish once with the measured time', async () => {
  const finish = jest.fn(); await start(finish);
  for (let i = 0; i < 10; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
      const task = screen.getByTestId('record-task');
      task.props.onChoice(0);
      task.props.onChoice(0); // duplicate same-frame press cannot answer the following task
    });
  }
  expect(finish).toHaveBeenCalledTimes(1);
  expect(finish).toHaveBeenCalledWith(Array.from({ length: 10 }, () => ({ selectedIndex: 0 })), 10000);
});
test('one mistake ends the attempt without publishing a result', async () => {
  const finish = jest.fn(); await start(finish);
  await act(async () => screen.getByTestId('record-task').props.onChoice(1));
  expect(finish).not.toHaveBeenCalled();
  expect(screen.queryByTestId('record-task')).toBeNull();
});
