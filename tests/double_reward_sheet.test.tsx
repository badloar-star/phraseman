/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { DARK, GOLD, OLIVE, MIDNIGHT, EMBER, AURORA, VOLT, INDIGO, SAGE_PORCELAIN } from '../constants/theme';
jest.unmock('react-native');

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
  expect(ui.getByTestId('double-reward-metal-accent', { includeHiddenElements: true }).props.stopColor).toBe(theme.accent);
});

test('Sunday banner opens the rune sheet and removes it at the UTC boundary', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-20T23:59:58Z'));
  try {
    const ui = await render(<LeagueSuperSundayBanner lang="ru" />);
    expect(ui.queryByText('Продолжить')).toBeNull();
    await fireEvent.press(ui.getByRole('button', { name: /СУПЕРВОСКРЕСЕНЬЕ/ }));
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
