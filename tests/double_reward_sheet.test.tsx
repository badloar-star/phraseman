/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DARK, GOLD, OLIVE, MIDNIGHT, EMBER, AURORA, VOLT, INDIGO, SAGE_PORCELAIN } from '../constants/theme';
// зачем (2026-09-21): этот сюит никогда не запускался — его не было в testMatch,
// и `jest.unmock` тут бессилен: react-native подменён через moduleNameMapper на
// урезанную заглушку без StyleSheet. Даём локальную, как в других рабочих .tsx-тестах.
jest.mock('react-native', () => {
  class MockAnimatedValue {
    private current: number;
    constructor(initial: number) { this.current = initial; }
    setValue(next: number) { this.current = next; }
    stopAnimation() { /* значение финальное: reduce motion в этих тестах включён */ }
    interpolate() { return this; }
  }
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style),
      absoluteFill: {},
      hairlineWidth: 1,
    },
    Easing: { linear: (v: number) => v },
    Animated: {
      View: 'AnimatedView',
      Value: MockAnimatedValue,
      timing: () => ({ start: (done?: () => void) => done?.(), stop: () => {} }),
    },
  };
});

let mockTheme = INDIGO;
const mockDismiss = jest.fn();
let mockClockTick: ((now: number) => void) | undefined;
jest.mock('../app/config', () => ({ ENGLISH_UI_LOCALE_ENABLED: true, SPANISH_UI_LOCALE_ENABLED: true }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('@expo/vector-icons/Ionicons', () => require('react-native').View);
jest.mock('../hooks/use_is_screen_focused', () => ({ useIsScreenFocused: () => true }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../app/visible_wall_clock', () => ({ visibleWallClock: { subscribe: (fn: (now: number) => void) => { mockClockTick = fn; return () => { mockClockTick = undefined; }; } } }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme, f: { h1: 30, body: 16, small: 13 } }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotionPreference: () => true }));
jest.mock('../components/modal_fx/HybridSheetShell', () => ({
  __esModule: true,
  default: ({ visible, children, onClose }: any) => visible ? children({ requestDismiss: () => { mockDismiss(); onClose(); } }) : null,
}));
jest.mock('../components/PressableHybrid', () => {
  const { Pressable } = require('react-native');
  return { __esModule: true, default: ({ children, contentStyle, ...props }: any) => <Pressable {...props} style={contentStyle}>{children}</Pressable> };
});
jest.mock('react-native-svg', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: View, Defs: View, LinearGradient: View, Stop: View, Text, Ellipse: View };
});

import DoubleRewardSheet from '../components/DoubleRewardSheet';
import { LeagueSuperSundayBanner } from '../components/league/LeagueSuperSundayBanner';

beforeEach(() => { mockTheme = INDIGO; mockDismiss.mockClear(); });

test('does not render when hidden', async () => {
  const ui = await render(<DoubleRewardSheet visible={false} kind="runes" lang="ru" onClose={jest.fn()} />);
  expect(ui.queryByText('Продолжить')).toBeNull();
});

test('keeps XP and rune copy separate and dismisses through the sheet shell', async () => {
  const onClose = jest.fn();
  const ui = await render(<DoubleRewardSheet visible kind="runes" lang="ru" onClose={onClose} />);
  expect(ui.getByText('×2 руны')).toBeTruthy();
  expect(ui.getByText('До 00:00 UTC')).toBeTruthy();
  await fireEvent.press(ui.getByLabelText('Продолжить'));
  expect(mockDismiss).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
  await ui.rerender(<DoubleRewardSheet visible kind="xp" lang="ru" onClose={onClose} />);
  expect(ui.getByText('Двойной опыт')).toBeTruthy();
  expect(ui.queryByText('×2 руны')).toBeNull();
});

test.each([DARK, GOLD, OLIVE, MIDNIGHT, EMBER, AURORA, VOLT, INDIGO, SAGE_PORCELAIN])('uses the active theme for the CTA and emblem', async (theme) => {
  mockTheme = theme;
  const ui = await render(<DoubleRewardSheet visible kind="runes" lang="ru" onClose={jest.fn()} />);
  expect(ui.getByLabelText('Продолжить')).toHaveStyle({ backgroundColor: theme.accent });
  expect(ui.getByTestId('double-reward-cta-text')).toHaveStyle({ color: theme.correctText });
  // зачем (2026-09-21): метка переехала со <Stop> на <Svg> — testID нет ни в
  // StopProps, ни в LinearGradientProps, и типы валили запуск всего сюита.
  const metal = ui.getByTestId('double-reward-metal', { includeHiddenElements: true });
  const stopColors: unknown[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const element = node as { props?: Record<string, unknown>; children?: unknown[] };
    if (element.props && 'stopColor' in element.props) stopColors.push(element.props.stopColor);
    element.children?.forEach(walk);
  };
  walk(metal);
  expect(stopColors).toContain(theme.accent);
});

test('Sunday banner opens the rune sheet and removes it at the UTC boundary', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-20T23:59:58Z'));
  try {
    const ui = await render(<LeagueSuperSundayBanner lang="ru" />);
    expect(ui.queryByText('Продолжить')).toBeNull();
    // зачем: Pressable здесь — строковый мок, getByRole по нему не матчит роль.
    // Метка продублирована на внутренней AnimatedView (она accessible={false}),
    // поэтому берём первый — внешний нажимаемый элемент.
    await fireEvent.press(ui.getAllByLabelText(/СУПЕРВОСКРЕСЕНЬЕ/)[0]);
    expect(ui.getByText('×2 руны')).toBeTruthy();
    await act(() => { mockClockTick?.(Date.parse('2026-09-21T00:00:00Z')); });
    expect(ui.queryByText('Продолжить')).toBeNull();
    expect(ui.queryByTestId('league-super-sunday-banner')).toBeNull();
    await ui.unmount();
  } finally { jest.useRealTimers(); }
});

test('updates an already open sheet when the theme changes', async () => {
  const ui = await render(<DoubleRewardSheet visible kind="runes" lang="en" onClose={jest.fn()} />);
  mockTheme = SAGE_PORCELAIN;
  await ui.rerender(<DoubleRewardSheet visible kind="runes" lang="en" onClose={jest.fn()} />);
  expect(ui.getByLabelText('Continue')).toHaveStyle({ backgroundColor: SAGE_PORCELAIN.accent });
});
