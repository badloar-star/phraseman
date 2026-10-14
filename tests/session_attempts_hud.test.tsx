/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render } from '@testing-library/react-native';

import SessionAttemptsHud from '../components/session_attempts/SessionAttemptsHud';

// зачем (координатор §48, 2026-10-01): самодельный мок react-native ломался при каждом
// новом API компонента (Pressable, useWindowDimensions, StyleSheet.create) и набор не
// исполнялся. Переопределения теперь — слой поверх настоящего модуля (прототип), всё
// неперечисленное берётся из react-native, ленивые геттеры не трогаются.
jest.mock('react-native', () => Object.setPrototypeOf({
  // зачем (координатор §48): HUD теперь читает app/config (ENABLE_DEV_TOOLS), а тот —
  // Platform.OS; без него набор падал на импорте и не исполнялся вовсе.
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  // HUD меряет своё место на экране (measureInWindow) — у хост-элемента тест-рендерера
  // такого метода нет; даём View ref с ним, как у настоящего View на устройстве.
  View: (() => {
    const ReactLocal = jest.requireActual('react');
    return ReactLocal.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      ReactLocal.useImperativeHandle(ref, () => ({
        measureInWindow: (callback: (x: number, y: number, w: number, h: number) => void) => callback(0, 0, 120, 32),
      }));
      return ReactLocal.createElement('View', props, props.children);
    });
  })(),
  // HUD получил кнопку (Pressable) — без неё «Element type is invalid».
  Pressable: 'Pressable',
  StyleSheet: {
    absoluteFillObject: { position: 'absolute', inset: 0 },
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}, jest.requireActual('react-native')));

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
    withDelay: (_delay: number, value: unknown) => value,
    withSpring: (value: unknown) => value,
  };
});

jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));

// зачем (полный прогон 15.10): с 14.10 HybridAlertShell оборачивает шторку в SheetSwipeRoot (жесты + reanimated.createAnimatedComponent),
// а заглушка reanimated выше этого не умеет — набор падал «failed to run» до первого теста. HUD свайп шторки не проверяет: обёртка рисует детей.
jest.mock('../components/modal_fx/SheetSwipeClose', () => {
  const ReactLocal = require('react');
  const Pass = ({ children }: { children?: React.ReactNode }) => ReactLocal.createElement(ReactLocal.Fragment, null, children);
  return { __esModule: true, default: Pass, SheetSwipeRoot: Pass, SHEET_SWIPE_CLOSE_DISTANCE: 0, SHEET_SWIPE_CLOSE_VELOCITY: 0 };
});

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
