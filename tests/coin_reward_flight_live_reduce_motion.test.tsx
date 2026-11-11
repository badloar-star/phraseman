import React from 'react';
import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import CoinRewardFlight from '../components/rewards/CoinRewardFlight';
import { useCoinRewardFlight } from '../hooks/useCoinRewardFlight';

let nativeListener: ((enabled: boolean) => void) | undefined;
let resolveInitial: ((enabled: boolean) => void) | undefined;
let rejectInitial: ((reason?: unknown) => void) | undefined;
let nativeRemove: jest.Mock;
let originMeasure: jest.Mock;
let counterMeasure: jest.Mock;
let rankOwners = 0;
let observedControllerFlight: ReturnType<typeof useCoinRewardFlight>['flight'] = null;

jest.mock('react-native', () => {
  const React = require('react');
  const View = React.forwardRef(({ children, onLayout, ...props }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ measureInWindow: (done: any) => done(0, 0, 390, 844) }));
    React.useEffect(() => { onLayout?.(); }, []);
    return React.createElement('View', props, children);
  });
  return {
    View,
    Platform: { OS: 'ios' },
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(() => new Promise<boolean>((resolve, reject) => { resolveInitial = resolve; rejectInitial = reject; })),
      addEventListener: jest.fn((_name: string, listener: (enabled: boolean) => void) => {
        nativeListener = listener;
        nativeRemove = jest.fn();
        return { remove: nativeRemove };
      }),
    },
    StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: { View: 'Animated.View' },
    Easing: { bezier: () => 0 }, ReduceMotion: { Never: 'never' },
    useReducedMotion: () => false,
    useSharedValue: (value: number) => React.useRef({ value }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: jest.fn(() => 1), cancelAnimation: jest.fn(),
  };
});
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (fn: () => void) => fn() }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn() } }));
jest.mock('../hooks/use_my_rank_coin', () => ({ useMyRankCoinSource: () => {
  React.useEffect(() => { rankOwners += 1; return () => { rankOwners -= 1; }; }, []);
  return { uri: 'rank' };
} }));

function FlightFixture({ done }: { done: () => void }): React.JSX.Element {
  const controller = useCoinRewardFlight();
  React.useEffect(() => { observedControllerFlight = controller.flight; }, [controller.flight]);
  React.useEffect(() => {
    (controller.originRef as any).current = { measureInWindow: originMeasure };
    (controller.counterRef as any).current = { measureInWindow: counterMeasure };
    controller.fly(2);
  }, [controller.fly]);
  return <CoinRewardFlight from={{ x: 10, y: 20 }} to={{ x: 100, y: 40 }} count={2} onDone={done} />;
}

describe('coin reward flight live reduce-motion integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    nativeListener = undefined;
    resolveInitial = undefined;
    rejectInitial = undefined;
    nativeRemove = jest.fn();
    rankOwners = 0;
    observedControllerFlight = null;
    originMeasure = jest.fn();
    counterMeasure = jest.fn();
  });

  afterEach(async () => {
    await act(async () => { jest.runOnlyPendingTimers(); });
    jest.useRealTimers();
  });

  test('shares the real native preference through unknown, false, and live true without resurrecting its keyed flight', async () => {
    const done = jest.fn();
    const view = await render(<FlightFixture done={done} />);

    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledTimes(1);
    expect(originMeasure).not.toHaveBeenCalled();
    expect(rankOwners).toBe(0);
    expect(withTiming).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => resolveInitial?.(false));
    const activeDone = jest.fn();
    await view.rerender(<React.Fragment key="fresh-controller"><FlightFixture done={activeDone} /></React.Fragment>);
    expect(originMeasure).toHaveBeenCalledTimes(1);
    await act(async () => originMeasure.mock.calls[0][0](10, 20, 30, 40));
    expect(counterMeasure).toHaveBeenCalledTimes(1);
    await act(async () => counterMeasure.mock.calls[0][0](100, 40, 30, 40));
    expect(rankOwners).toBe(1);
    expect(withTiming).toHaveBeenCalledTimes(2);
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1);
    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledTimes(1);
    const queuedLastCompletion = (withTiming as jest.Mock).mock.calls[1][2];
    await act(async () => nativeListener?.(true));
    expect(cancelAnimation).toHaveBeenCalledTimes(2);
    expect(rankOwners).toBe(0);
    expect(activeDone).toHaveBeenCalledTimes(1);
    queuedLastCompletion(true);
    expect(activeDone).toHaveBeenCalledTimes(1);
    await act(async () => nativeListener?.(false));
    expect(withTiming).toHaveBeenCalledTimes(2);
    await view.unmount();
  });

  test('initial true stays inert and final deferred cleanup removes the one shared observer', async () => {
    const done = jest.fn();
    const view = await render(<FlightFixture done={done} />);
    await act(async () => resolveInitial?.(true));
    expect(originMeasure).not.toHaveBeenCalled();
    expect(rankOwners).toBe(0);
    expect(withTiming).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    await view.unmount();
    await act(async () => { jest.runOnlyPendingTimers(); });
    expect(nativeRemove).toHaveBeenCalledTimes(1);
  });

  test('a rejected initial read remains inert until a real live false event permits a new key', async () => {
    const done = jest.fn();
    const view = await render(<CoinRewardFlight from={{ x: 1, y: 1 }} to={{ x: 2, y: 2 }} count={2} onDone={done} />);
    await act(async () => rejectInitial?.(new Error('native read failed')));
    expect(withTiming).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    await act(async () => nativeListener?.(false));
    await view.rerender(<React.Fragment key="recovered"><CoinRewardFlight from={{ x: 1, y: 1 }} to={{ x: 2, y: 2 }} count={2} onDone={jest.fn()} /></React.Fragment>);
    expect(withTiming).toHaveBeenCalledTimes(2);
    await view.unmount();
  });

  test('live suppression invalidates callbacks pending at both native measurement stages', async () => {
    const view = await render(<FlightFixture done={jest.fn()} />);
    await act(async () => resolveInitial?.(false));
    await view.rerender(<React.Fragment key="origin-stage"><FlightFixture done={jest.fn()} /></React.Fragment>);
    await act(async () => nativeListener?.(true));
    await act(async () => originMeasure.mock.calls[0][0](10, 20, 30, 40));
    expect(counterMeasure).not.toHaveBeenCalled();

    await act(async () => nativeListener?.(false));
    await view.rerender(<React.Fragment key="target-stage"><FlightFixture done={jest.fn()} /></React.Fragment>);
    await act(async () => originMeasure.mock.calls[1][0](10, 20, 30, 40));
    expect(counterMeasure).toHaveBeenCalledTimes(1);
    const animationsBeforeTargetCompletion = (withTiming as jest.Mock).mock.calls.length;
    await act(async () => nativeListener?.(true));
    await act(async () => counterMeasure.mock.calls[0][0](100, 40, 30, 40));
    expect(withTiming).toHaveBeenCalledTimes(animationsBeforeTargetCompletion);
    expect(observedControllerFlight).toBeNull();
    await view.unmount();
  });

  test('StrictMode replays queued worklet completion without duplicating the latest callback', async () => {
    const suppressed = jest.fn();
    const first = await render(<React.StrictMode><CoinRewardFlight from={{ x: 1, y: 1 }} to={{ x: 2, y: 2 }} count={2} onDone={suppressed} /></React.StrictMode>);
    expect(suppressed).toHaveBeenCalledTimes(1);
    await act(async () => resolveInitial?.(false));
    const latest = jest.fn();
    await first.rerender(<React.StrictMode><React.Fragment key="strict-fresh"><CoinRewardFlight from={{ x: 1, y: 1 }} to={{ x: 2, y: 2 }} count={2} onDone={latest} /></React.Fragment></React.StrictMode>);
    const callbacks = (withTiming as jest.Mock).mock.calls.map((call) => call[2]);
    callbacks.filter(Boolean).forEach((complete) => complete(true));
    expect(latest).toHaveBeenCalledTimes(1);
    await first.unmount();
  });
});
