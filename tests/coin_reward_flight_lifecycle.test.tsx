import React from 'react';
import { render } from '@testing-library/react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import { soundDirector } from '../modules/audio/sound_director';
import LearningV2RuneFlight from '../components/rewards/CoinRewardFlight'; // зачем (PM-052): реализация полёта перенесена в CoinRewardFlight

let mockReducedMotion = false;
let mockRankSource: unknown = { uri: 'rank-a' };
let mockMountedRankOwners = 0;
let mockImageSources: unknown[] = [];
const mockRankSubscribers = new Set<() => void>();
const mockPublishRankSource = (source: unknown) => {
  mockRankSource = source;
  mockRankSubscribers.forEach((notify) => notify());
};

jest.mock('react-native', () => {
  const React = require('react');
  const View = React.forwardRef(function MockMeasuredView({ children, onLayout, ...props }: any, ref: any) {
    React.useImperativeHandle(ref, () => ({ measureInWindow: (done: any) => done(0, 0, 390, 844) }));
    React.useEffect(() => { onLayout?.(); }, []);
    return React.createElement('View', props, children);
  });
  // зачем (координатор 18.10, дуга монеты через правый край): полёт читает ширину окна (useWindowDimensions) для выноса дуги
  return { View, Platform: { OS: 'ios' }, StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {}, flatten: (style: unknown) => style }, useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) };
});
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true, default: { View: 'Animated.View', Image: 'Animated.Image' },
    Easing: { bezier: () => 0 },
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    ReduceMotion: { Never: 'never' },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: jest.fn(() => 1), cancelAnimation: jest.fn(),
  };
});
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (fn: () => void) => fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotionPreference: () => mockReducedMotion }));
// зачем (R129): монета полёта — expo-image (декод под размер вида)
jest.mock('expo-image', () => ({ Image: ({ source, ...props }: any) => {
  mockImageSources.push(source);
  return React.createElement('Image', props);
} }));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn() } }));
jest.mock('../hooks/use_my_rank_coin', () => {
  const React = require('react');
  return {
    useMyRankCoinSource: () => {
      const [, refresh] = React.useState(0);
      React.useEffect(() => {
        mockMountedRankOwners += 1;
        mockRankSubscribers.add(refresh);
        return () => {
          mockRankSubscribers.delete(refresh);
          mockMountedRankOwners -= 1;
        };
      }, []);
      return mockRankSource;
    },
  };
});

describe('rune flight lifetime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion = false;
    mockRankSource = { uri: 'rank-a' };
    mockMountedRankOwners = 0;
    mockImageSources = [];
    mockRankSubscribers.clear();
  });
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

  test('one active flight owns one rank source and passes it to every passive image without replay', async () => {
    const done = jest.fn();
    const view = await render(<LearningV2RuneFlight from={from} to={to} count={3} onDone={done} />);
    expect(mockMountedRankOwners).toBe(1);
    expect(mockImageSources).toHaveLength(3);
    expect(mockImageSources.every((source) => source === mockRankSource)).toBe(true);
    await React.act(async () => mockPublishRankSource({ uri: 'rank-b' }));
    expect(mockImageSources.slice(-3).every((source) => source === mockRankSource)).toBe(true);
    expect(withTiming).toHaveBeenCalledTimes(3);
    expect(soundDirector.request).toHaveBeenCalledTimes(1);
    await view.unmount();
    expect(mockMountedRankOwners).toBe(0);
  });

  test('suppressed flight mounts no rank owner, images, animation, or sound', async () => {
    mockReducedMotion = true;
    const done = jest.fn();
    const view = await render(<LearningV2RuneFlight from={from} to={to} count={3} onDone={done} />);
    expect(mockMountedRankOwners).toBe(0);
    expect(mockImageSources).toHaveLength(0);
    expect(withTiming).not.toHaveBeenCalled();
    expect(soundDirector.request).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  test('turning on reduced motion cancels the active particles and completes once', async () => {
    const firstDone = jest.fn();
    const reducedDone = jest.fn();
    const view = await render(<LearningV2RuneFlight from={from} to={to} count={2} onDone={firstDone} />);
    mockReducedMotion = true;
    await view.rerender(<LearningV2RuneFlight from={from} to={to} count={2} onDone={reducedDone} />);
    expect(cancelAnimation).toHaveBeenCalledTimes(2);
    expect(mockMountedRankOwners).toBe(0);
    expect(reducedDone).toHaveBeenCalledTimes(1);
    expect(firstDone).not.toHaveBeenCalled();
    await view.unmount();
  });
});
