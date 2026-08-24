/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.unmock('react-native');

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  const chain = () => {
    const gesture: Record<string, unknown> = {};
    for (const method of ['activeOffsetY', 'failOffsetX', 'onUpdate', 'onEnd']) {
      gesture[method] = () => gesture;
    }
    return gesture;
  };
  return {
    Gesture: { Pan: chain },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: ({ children, ...props }: { children: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: jest.fn(), out: jest.fn(() => 'out') },
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: number) => ReactActual.useRef({ value }).current,
    withSpring: (value: number) => value,
    withTiming: (value: number, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});

jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ bottom: 0 }) }));
jest.mock('../app/safe_modal_navigation', () => ({ NATIVE_MODAL_DISMISS_GAP_MS: 1 }));
jest.mock('../hooks/use-screen', () => ({ normalizeSafeAreaBottomInset: (value: number) => value }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('../components/keyboardAvoidance', () => ({ useKeyboardBottomInset: () => 0 }));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: { accent: '#9cff00', bgCard: '#111', border: '#444' } }),
}));
jest.mock('../components/SafeLinearGradient', () => ({
  LinearGradient: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));
jest.mock('../components/TonalSurface', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

import { View } from 'react-native';
import HybridSheetShell from '../components/modal_fx/HybridSheetShell';

test('a throwing dismiss observer is best-effort and cannot strand or duplicate shell close', async () => {
  const onDismissRequested = jest.fn(() => {
    throw new Error('observer failed');
  });
  const onClose = jest.fn();
  const screen = await render(
    <HybridSheetShell
      visible
      closeLabel="Close sheet"
      onClose={onClose}
      onDismissRequested={onDismissRequested}
    >
      <View testID="content" />
    </HybridSheetShell>,
  );
  const close = screen.getByRole('button', { name: 'Close sheet' });

  await expect(fireEvent.press(close)).resolves.toBeUndefined();
  await expect(fireEvent.press(close)).resolves.toBeUndefined();
  expect(onDismissRequested).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('accessibility escape follows the same coalesced dismiss path', async () => {
  const onDismissRequested = jest.fn();
  const onClose = jest.fn();
  const screen = await render(
    <HybridSheetShell
      visible
      closeLabel="Close sheet"
      onClose={onClose}
      onDismissRequested={onDismissRequested}
      backdropAccessible={false}
      testID="sheet"
    >
      <View testID="content" />
    </HybridSheetShell>,
  );

  await fireEvent(screen.getByTestId('sheet'), 'accessibilityEscape');
  await fireEvent(screen.getByTestId('sheet'), 'accessibilityEscape');

  expect(onDismissRequested).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});
