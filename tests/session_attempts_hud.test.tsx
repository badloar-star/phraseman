/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render } from '@testing-library/react-native';

import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';

jest.mock('react-native', () => ({
  View: 'View',
  StyleSheet: {
    absoluteFillObject: { position: 'absolute', inset: 0 },
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: { wrong: '#F05454', textGhost: '#506A5C' },
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return function Ionicons(props: Record<string, unknown>) {
    return ReactLocal.createElement(View, { ...props, testID: `attempt-heart-${props.name}` });
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    cancelAnimation: jest.fn(),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
  };
});

jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));

describe('SessionAttemptsHud', () => {
  test('renders three fixed visual slots as one accessible attempts status', async () => {
    const view = await render(<SessionAttemptsHud remaining={2} locale="ru" />);

    const status = view.getByTestId('session-attempts-hud');
    expect(status.props.accessibilityRole).toBe('text');
    expect(status.props.accessibilityLabel).toBe('Попытки: 2 из 3');
    expect(view.getAllByTestId(/attempt-heart-heart/)).toHaveLength(6);
    expect(view.getAllByTestId('attempt-heart-heart-outline')).toHaveLength(3);
    expect(view.getAllByTestId('attempt-heart-heart')).toHaveLength(3);
  });

  test('clamps malformed remaining values to the visual range', async () => {
    const view = await render(<SessionAttemptsHud remaining={99} locale="en" />);
    expect(view.getByTestId('session-attempts-hud').props.accessibilityLabel).toBe('Attempts: 3 of 3');
    expect(view.getAllByTestId('attempt-heart-heart')).toHaveLength(3);
  });
});
