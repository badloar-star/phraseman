import React from 'react';
import { render } from '@testing-library/react-native';
import { transformSync } from '@babel/core';
import fs from 'fs';
import path from 'path';
import DuoPressable from '../components/DuoPressable';
import { cancelAnimation, withSpring, withTiming } from 'react-native-reanimated';

let mockReduceMotion = false;
let mockSharedValueInitializations = 0;
let mockAnimatedStyleInitializations = 0;
let mockNativePressTargetMounts = 0;
let mockNativePressTargetUnmounts = 0;
let mockSharedValues: Array<{ value: number }> = [];
let mockSurfaceLayoutCommits: Array<{ translateY: number; values: number[] }> = [];

jest.mock('react-native', () => {
  const MockReact = require('react');

  const flattenStyle = (style: unknown): Record<string, unknown> | undefined => {
    if (!style) return undefined;
    if (!Array.isArray(style)) return style as Record<string, unknown>;
    return style.reduce((merged, part) => ({ ...merged, ...(flattenStyle(part) ?? {}) }), {});
  };

  const Pressable = ({
    children,
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    ...props
  }: Record<string, any>) => {
    MockReact.useState(() => {
      mockNativePressTargetMounts += 1;
      return null;
    });
    MockReact.useEffect(() => () => {
      mockNativePressTargetUnmounts += 1;
    }, []);
    return MockReact.createElement('NativePressTarget', {
      ...props,
      onPress,
      onLongPress,
      onPressIn,
      onPressOut,
    }, children);
  };

  return {
    Pressable,
    View: ({ children, ...props }: Record<string, unknown>) => MockReact.createElement('View', props, children),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: flattenStyle,
      absoluteFillObject: {},
      absoluteFill: {},
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const MockReact = require('react');
  return {
    __esModule: true,
    default: {
      View: ({ children, style, ...props }: Record<string, any>) => {
        const parts = Array.isArray(style) ? style : [style];
        const faceHandle = parts[parts.length - 1] as {
          __initialUpdater?: () => { transform?: Array<{ translateY?: number }> };
        } | undefined;
        const [initialFace] = MockReact.useState(() => faceHandle?.__initialUpdater?.() ?? faceHandle);
        MockReact.useLayoutEffect(() => {
          mockSurfaceLayoutCommits.push({
            translateY: initialFace?.transform?.[0]?.translateY ?? 0,
            values: mockSharedValues.slice(0, 2).map((shared) => shared.value),
          });
        }, [initialFace]);
        return MockReact.createElement('AnimatedSurface', { ...props, style }, children);
      },
    },
    useSharedValue: (initial: number) => MockReact.useState(() => {
      mockSharedValueInitializations += 1;
      const shared = { value: initial };
      mockSharedValues.push(shared);
      return shared;
    })[0],
    useAnimatedStyle: (factory: () => unknown) => {
      const [handle] = MockReact.useState(() => {
        mockAnimatedStyleInitializations += 1;
        return { __initialUpdater: factory, __latestUpdater: factory };
      });
      handle.__latestUpdater = factory;
      return handle;
    },
    withSpring: jest.fn((value: number) => value),
    withTiming: jest.fn((value: number) => value),
    cancelAnimation: jest.fn(),
  };
});

jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => mockReduceMotion }));

type FlowModule = { exports: any };

function loadInstalledFlowModule(filePath: string, localRequire: (id: string) => unknown): any {
  const transformed = transformSync(fs.readFileSync(filePath, 'utf8'), {
    filename: filePath,
    babelrc: false,
    configFile: false,
    plugins: [
      ['babel-plugin-syntax-hermes-parser', { parseLangTypes: 'flow' }],
      ['@babel/plugin-transform-flow-strip-types', { all: true }],
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  if (!transformed?.code) throw new Error(`Unable to transpile installed module: ${filePath}`);
  const loaded: FlowModule = { exports: {} };
  const evaluate = new Function('require', 'module', 'exports', '__filename', '__dirname', transformed.code);
  evaluate(localRequire, loaded, loaded.exports, filePath, path.dirname(filePath));
  return loaded.exports;
}

const installedPressabilityPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native',
  'Libraries',
  'Pressability',
  'Pressability.js',
);
const installedUsePressabilityPath = path.join(path.dirname(installedPressabilityPath), 'usePressability.js');
const installedPressabilityModule = loadInstalledFlowModule(installedPressabilityPath, (id) => {
  if (id === 'invariant') return require('invariant');
  if (id === '../Components/Sound/SoundManager') return { __esModule: true, default: { playTouchSound: jest.fn() } };
  if (id === '../ReactNative/ReactNativeFeatureFlags') {
    return { __esModule: true, default: { shouldPressibilityUseW3CPointerEventsForHover: () => false } };
  }
  if (id === '../ReactNative/UIManager') {
    return { __esModule: true, default: { measure: (_id: number, done: (...args: number[]) => void) => done(0, 0, 100, 40, 0, 0) } };
  }
  if (id === '../StyleSheet/Rect') {
    return { normalizeRect: (rect: unknown) => rect ?? { top: 0, left: 0, right: 0, bottom: 0 } };
  }
  if (id === '../Utilities/Platform') return { __esModule: true, default: { OS: 'ios' } };
  if (id === './HoverState') return { isHoverEnabled: () => false };
  if (id === './PressabilityPerformanceEventEmitter.js') {
    return { __esModule: true, default: { emitEvent: jest.fn() } };
  }
  throw new Error(`Unexpected installed Pressability dependency: ${id}`);
});
const InstalledPressability = installedPressabilityModule.default;
const installedUsePressabilityModule = loadInstalledFlowModule(installedUsePressabilityPath, (id) => {
  if (id === 'react') return React;
  if (id === './Pressability') return installedPressabilityModule;
  throw new Error(`Unexpected installed usePressability dependency: ${id}`);
});
const installedUsePressability = installedUsePressabilityModule.default as (config: Record<string, unknown>) => Record<string, any>;

function InstalledPressabilityTarget({
  targetKey,
  ...config
}: Record<string, any> & { targetKey: React.Key }) {
  const handlers = installedUsePressability(config);
  return React.createElement('InstalledPressabilityTarget', { ...handlers, testID: 'installed-pressability-target', targetKey });
}

function InstalledPressabilityHost(props: Record<string, any> & { targetKey: React.Key }) {
  return React.createElement(InstalledPressabilityTarget, { ...props, key: props.targetKey });
}

function responderEvent() {
  const target = { measure: (done: (...args: number[]) => void) => done(0, 0, 100, 40, 0, 0) };
  return {
    currentTarget: target,
    target,
    nativeEvent: { pageX: 10, pageY: 10 },
    persist: jest.fn(),
    stopPropagation: jest.fn(),
  };
}

const identityProps = (overrides: Record<string, unknown> = {}) => ({
  testID: 'word-target',
  pressTargetKey: 'phrase-a:0:0:old',
  children: React.createElement('View'),
  ...overrides,
} as any);

describe('DuoPressable semantic press-target identity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion = false;
    mockSharedValueInitializations = 0;
    mockAnimatedStyleInitializations = 0;
    mockNativePressTargetMounts = 0;
    mockNativePressTargetUnmounts = 0;
    mockSharedValues = [];
    mockSurfaceLayoutCommits = [];
  });

  test('replaces the native target, retaining press channels with a fresh neutral style owner', async () => {
    const oldPress = jest.fn();
    const oldLongPress = jest.fn();
    const oldPressOut = jest.fn();
    const nextPress = jest.fn();
    const nextLongPress = jest.fn();
    const nextPressOut = jest.fn();
    const screen = await render(React.createElement(DuoPressable, identityProps({
      onPress: oldPress,
      onLongPress: oldLongPress,
      onPressOut: oldPressOut,
      pressedExternally: true,
    })));

    expect(mockSharedValueInitializations).toBe(3);
    expect(mockAnimatedStyleInitializations).toBe(1);
    expect(mockNativePressTargetMounts).toBe(1);

    const oldTarget = screen.getByTestId('word-target');
    oldTarget.props.onPressIn({});
    expect(mockSharedValues[0].value).toBe(1);

    jest.clearAllMocks();
    const replacementCommitStart = mockSurfaceLayoutCommits.length;
    await screen.rerender(React.createElement(DuoPressable, identityProps({
      pressTargetKey: 'phrase-a:1:0:new',
      onPress: nextPress,
      onLongPress: nextLongPress,
      onPressOut: nextPressOut,
      pressedExternally: false,
    })));

    expect(mockSharedValueInitializations).toBe(4);
    expect(mockAnimatedStyleInitializations).toBe(2);
    expect(mockNativePressTargetMounts).toBe(2);
    expect(mockNativePressTargetUnmounts).toBe(1);
    expect(mockSurfaceLayoutCommits.slice(replacementCommitStart)[0]).toEqual({
      translateY: 0,
      values: [1, 1],
    });
    expect(cancelAnimation).toHaveBeenCalledTimes(2);
    expect(mockSharedValues.slice(0, 2).map((shared) => shared.value)).toEqual([0, 0]);

    const nextTarget = screen.getByTestId('word-target');
    nextTarget.props.onPress();
    nextTarget.props.onLongPress();
    nextTarget.props.onPressOut({});
    expect(nextPress).toHaveBeenCalledTimes(1);
    expect(nextLongPress).toHaveBeenCalledTimes(1);
    expect(nextPressOut).toHaveBeenCalledTimes(1);
    await screen.unmount();
  });

  test('keeps default callers unchanged when no semantic target key is supplied', async () => {
    const screen = await render(
      <DuoPressable testID="ordinary-button" onPress={jest.fn()}>{React.createElement('View')}</DuoPressable>,
    );
    expect(mockNativePressTargetMounts).toBe(1);
    expect(mockSharedValueInitializations).toBe(2);
    expect(mockAnimatedStyleInitializations).toBe(1);

    jest.clearAllMocks();
    await screen.rerender(
      <DuoPressable testID="ordinary-button" onPress={jest.fn()}>{React.createElement('View')}</DuoPressable>,
    );
    expect(mockNativePressTargetMounts).toBe(1);
    expect(mockNativePressTargetUnmounts).toBe(0);
    expect(mockSharedValueInitializations).toBe(2);
    expect(mockAnimatedStyleInitializations).toBe(1);
    expect(cancelAnimation).not.toHaveBeenCalled();
    await screen.unmount();
  });

  test('same-target external hold changes do not cancel an active physical press', async () => {
    const screen = await render(React.createElement(DuoPressable, identityProps({ pressedExternally: false })));
    const target = screen.getByTestId('word-target');
    jest.clearAllMocks();
    target.props.onPressIn({});
    expect(mockSharedValues.slice(0, 2).map((shared) => shared.value)).toEqual([1, 0]);

    await screen.rerender(React.createElement(DuoPressable, identityProps({ pressedExternally: true })));
    expect(mockSharedValues.slice(0, 2).map((shared) => shared.value)).toEqual([1, 1]);
    expect(cancelAnimation).not.toHaveBeenCalled();
    expect(mockNativePressTargetMounts).toBe(1);

    await screen.rerender(React.createElement(DuoPressable, identityProps({ pressedExternally: false })));
    expect(mockSharedValues.slice(0, 2).map((shared) => shared.value)).toEqual([1, 0]);
    expect(cancelAnimation).not.toHaveBeenCalled();
    expect(mockNativePressTargetMounts).toBe(1);
    await screen.unmount();
  });

  test('reduced motion snaps identity reset and unmount cancels both visual channels', async () => {
    mockReduceMotion = true;
    const oldPress = jest.fn();
    const nextPress = jest.fn();
    const screen = await render(React.createElement(DuoPressable, identityProps({ onPress: oldPress })));
    const oldTarget = screen.getByTestId('word-target');

    jest.clearAllMocks();
    oldTarget.props.onPressIn({});
    oldTarget.props.onPressOut({});
    expect(withTiming).not.toHaveBeenCalled();
    expect(withSpring).not.toHaveBeenCalled();

    await screen.rerender(React.createElement(DuoPressable, identityProps({
      pressTargetKey: 'phrase-b:0:0:new',
      onPress: nextPress,
      pressedExternally: true,
    })));
    expect(cancelAnimation).toHaveBeenCalledTimes(2);
    expect(mockSharedValues.slice(0, 2).map((shared) => shared.value)).toEqual([0, 1]);
    screen.getByTestId('word-target').props.onPress();
    expect(nextPress).toHaveBeenCalledTimes(1);

    await screen.unmount();
    expect(cancelAnimation).toHaveBeenCalledTimes(4);
  });

  test('installed usePressability resets a held old target and delivers the new target exactly once', async () => {
    jest.useFakeTimers();
    const resetSpy = jest.spyOn(InstalledPressability.prototype, 'reset');
    const oldPress = jest.fn();
    const oldLongPress = jest.fn();
    const oldPressOut = jest.fn();
    const nextPress = jest.fn();
    const nextLongPress = jest.fn();
    const nextPressOut = jest.fn();
    const common = { delayLongPress: 40, delayPressIn: 0, delayPressOut: 20, minPressDuration: 0 };
    const screen = await render(<InstalledPressabilityHost
      {...common}
      targetKey="old"
      onPress={oldPress}
      onLongPress={oldLongPress}
      onPressOut={oldPressOut}
    />);
    const oldHandlers = screen.getByTestId('installed-pressability-target').props;
    oldHandlers.onResponderGrant(responderEvent());

    await screen.rerender(<InstalledPressabilityHost
      {...common}
      targetKey="new"
      onPress={nextPress}
      onLongPress={nextLongPress}
      onPressOut={nextPressOut}
    />);
    expect(resetSpy).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(100);
    oldHandlers.onResponderRelease(responderEvent());
    oldHandlers.onClick(responderEvent());
    expect(oldPress).not.toHaveBeenCalled();
    expect(oldLongPress).not.toHaveBeenCalled();
    expect(oldPressOut).not.toHaveBeenCalled();

    const nextHandlers = screen.getByTestId('installed-pressability-target').props;
    nextHandlers.onResponderGrant(responderEvent());
    jest.advanceTimersByTime(5);
    nextHandlers.onResponderRelease(responderEvent());
    expect(nextPress).toHaveBeenCalledTimes(1);
    expect(nextLongPress).not.toHaveBeenCalled();
    expect(nextPressOut).not.toHaveBeenCalled();
    jest.advanceTimersByTime(20);
    expect(nextPressOut).toHaveBeenCalledTimes(1);

    await screen.unmount();
    expect(resetSpy).toHaveBeenCalledTimes(2);
    resetSpy.mockRestore();
    jest.useRealTimers();
  });

  test('installed Pressability reset cancels delayed press-out after target unmount', async () => {
    jest.useFakeTimers();
    const oldPress = jest.fn();
    const oldPressOut = jest.fn();
    const screen = await render(<InstalledPressabilityHost
      targetKey="old"
      delayPressIn={0}
      delayPressOut={50}
      minPressDuration={0}
      onPress={oldPress}
      onPressOut={oldPressOut}
    />);
    const oldHandlers = screen.getByTestId('installed-pressability-target').props;
    oldHandlers.onResponderGrant(responderEvent());
    oldHandlers.onResponderRelease(responderEvent());
    expect(oldPress).toHaveBeenCalledTimes(1);
    expect(oldPressOut).not.toHaveBeenCalled();

    await screen.rerender(<InstalledPressabilityHost targetKey="new" onPress={jest.fn()} />);
    jest.advanceTimersByTime(100);
    expect(oldPressOut).not.toHaveBeenCalled();
    await screen.unmount();
    jest.useRealTimers();
  });
});
