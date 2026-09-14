import React from 'react';
import { render } from '@testing-library/react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import { soundDirector } from '../modules/audio/sound_director';
import LearningV2RuneFlight from '../components/LearningV2RuneFlight';

jest.mock('react-native', () => {
  const React = require('react');
  const View = React.forwardRef(function MockMeasuredView({ children, onLayout, ...props }: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ measureInWindow: (done: any) => done(0, 0, 390, 844) }));
    React.useEffect(() => { onLayout?.(); }, []);
    return React.createElement('View', props, children);
  });
  return { View, StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {}, flatten: (style: unknown) => style } };
});
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true, default: { View: 'Animated.View', Image: 'Animated.Image' },
    Easing: { bezier: () => 0 },
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: jest.fn(() => 1), cancelAnimation: jest.fn(),
  };
});
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (fn: () => void) => fn() }));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn() } }));

describe('rune flight lifetime', () => {
  beforeEach(() => jest.clearAllMocks());
  const from = { x: 140, y: 450 }, to = { x: 340, y: 70 };

  test('rerender updates completion without replaying particles or sound', async () => {
    const oldDone = jest.fn(), latestDone = jest.fn();
    const view = await render(<LearningV2RuneFlight from={from} to={to} count={3} onDone={oldDone} />);
    expect(withTiming).toHaveBeenCalledTimes(3);
    await view.rerender(<LearningV2RuneFlight from={from} to={to} count={3} onDone={latestDone} />);
    expect(withTiming).toHaveBeenCalledTimes(3);
    expect(soundDirector.request).toHaveBeenCalledTimes(1);
    const completeLast = (withTiming as jest.Mock).mock.calls[2][2];
    completeLast(true);
    expect(oldDone).not.toHaveBeenCalled();
    expect(latestDone).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  test('unmount cancels all particles; an interrupted flight cannot finish', async () => {
    const done = jest.fn();
    const view = await render(<LearningV2RuneFlight from={from} to={to} count={2} onDone={done} />);
    const completeLast = (withTiming as jest.Mock).mock.calls[1][2];
    await view.unmount();
    expect(cancelAnimation).toHaveBeenCalledTimes(2);
    completeLast(false);
    expect(done).not.toHaveBeenCalled();
  });
});
