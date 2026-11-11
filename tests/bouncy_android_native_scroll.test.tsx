import React, { forwardRef, useImperativeHandle } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

let platformOS: 'android' | 'ios' = 'android';

jest.mock('react-native', () => {
  const React = require('react');
  const View = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('View', { ...props, ref }, children),
  );
  return {
    View,
    ScrollView: View,
    StyleSheet: { flatten: (style: unknown) => style },
    Platform: { get OS() { return platformOS; } },
    useWindowDimensions: () => ({ width: 400, height: 900 }),
  };
});

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View, ScrollView: ReactNative.ScrollView },
    ReduceMotion: { System: 'system' },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useAnimatedScrollHandler: (handler: unknown) => handler,
    withSpring: (value: number) => value,
    cancelAnimation: jest.fn(),
  };
});

const nativeChain = () => {
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>;
  for (const key of ['enabled', 'simultaneousWithExternalGesture', 'activeOffsetY', 'failOffsetX', 'onUpdate', 'onFinalize']) {
    chain[key] = jest.fn(() => chain);
  }
  return chain;
};

jest.mock('react-native-gesture-handler', () => {
  const ReactNative = require('react-native');
  return {
    Gesture: {
      Native: () => nativeChain(),
      Pan: () => nativeChain(),
      Simultaneous: jest.fn(() => nativeChain()),
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <ReactNative.View testID="bouncy-gesture-detector">{children}</ReactNative.View>
    ),
  };
});

import { View } from 'react-native';
import { useBouncy } from '../components/BouncyScrollView';

type NativeOptions = Readonly<{
  dimension: number;
  androidGestureDetectorEnabled?: boolean;
}>;

const ProbeChild = forwardRef<
  { readonly token: string },
  { readonly onScroll: () => void; readonly overScrollMode?: 'never' }
>(
  ({ onScroll, overScrollMode }, ref) => {
    useImperativeHandle(ref, () => ({ token: 'child' }), []);
    return <View testID="bouncy-native-child" nativeID="preserved-child" onScroll={onScroll} overScrollMode={overScrollMode} />;
  },
);

function Harness({ options = { dimension: 900 }, childRef, onScroll }: Readonly<{
  options?: NativeOptions;
  childRef: React.Ref<{ readonly token: string }>;
  onScroll: () => void;
}>) {
  // Passing a typed variable means the old hook accepts the call structurally;
  // RED therefore fails on rendered behavior, not a missing option/type error.
  const { GestureWrap } = useBouncy(options);
  return <GestureWrap><ProbeChild ref={childRef} onScroll={onScroll} /></GestureWrap>;
}

describe('Android native-scroll detector opt-out', () => {
  afterEach(() => { platformOS = 'android'; });

  test('keeps the detector when the Android option is omitted and preserves child props/ref', async () => {
    const ref = React.createRef<{ readonly token: string }>();
    const onScroll = jest.fn();
    const { getByTestId } = await render(<Harness childRef={ref} onScroll={onScroll} />);

    expect(getByTestId('bouncy-gesture-detector')).toBeTruthy();
    const child = getByTestId('bouncy-native-child');
    expect(child.props.nativeID).toBe('preserved-child');
    fireEvent(child, 'scroll');
    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(ref.current).toEqual({ token: 'child' });
  });

  test('bypasses only the Android detector when explicitly requested while preserving child props/ref', async () => {
    const ref = React.createRef<{ readonly token: string }>();
    const onScroll = jest.fn();
    const { getByTestId, queryByTestId } = await render(<Harness options={{ dimension: 900, androidGestureDetectorEnabled: false }} childRef={ref} onScroll={onScroll} />);

    expect(queryByTestId('bouncy-gesture-detector')).toBeNull();
    const nativeChild = getByTestId('bouncy-native-child');
    expect(nativeChild.props.overScrollMode).toBe('never');
    expect(nativeChild.props.nativeID).toBe('preserved-child');
    fireEvent(nativeChild, 'scroll');
    expect(onScroll).toHaveBeenCalledTimes(1);
    expect(ref.current).toEqual({ token: 'child' });
  });

  test('keeps iOS outside the Android detector branch for either option', async () => {
    platformOS = 'ios';
    for (const androidGestureDetectorEnabled of [true, false]) {
      const { queryByTestId } = await render(<Harness options={{ dimension: 900, androidGestureDetectorEnabled }} childRef={React.createRef()} onScroll={jest.fn()} />);
      expect(queryByTestId('bouncy-gesture-detector')).toBeNull();
    }
  });
});
