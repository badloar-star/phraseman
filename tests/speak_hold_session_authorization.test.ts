import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockFeatureAccess = jest.fn(() => false);

jest.mock('react-native', () => ({
  Pressable: 'Pressable', Text: 'Text', View: 'View',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style,
  },
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => ({ value }),
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
}));
// 2026-09-13: гейт голоса — дневной лимит (useSpeakingAttemptGate); locked = лимит исчерпан.
jest.mock('../hooks/useSpeakingAttemptGate', () => ({
  useSpeakingAttemptGate: (input: { context: string; source: string }) => {
    const locked = !mockFeatureAccess();
    return {
      locked,
      quota: { status: locked ? 'exhausted' : 'allowed', used: 0, limit: 3, extra: 0, resetAt: null, period: null, bypass: null },
      tryStartAttempt: () => {
        if (locked) {
          mockPush({ pathname: '/premium_modal', params: { context: input.context, source: input.source } });
          return false;
        }
        return true;
      },
    };
  },
}));
jest.mock('../components/PlusBadge', () => ({
  __esModule: true,
  default: function MockPlusBadge() {
    const ReactRuntime = require('react') as typeof React;
    return ReactRuntime.createElement('PlusBadge', { testID: 'plus-badge' });
  },
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: { bgSurface: '#111', textMuted: '#777' }, themeMode: 'dark' }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, values: { en: string }) => values.en }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));

import SpeakHoldButton from '../app/flashcards/SpeakHoldButton';

const baseProps = {
  accent: '#0f0', listening: false, label: 'Hold',
  onHoldStart: jest.fn(), onHoldEnd: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());
afterEach(async () => { await cleanup(); });

test('a quota-authorized flashcard session reaches microphone callbacks without global speaking access', async () => {
  const onHoldStart = jest.fn();
  const onHoldEnd = jest.fn();
  const view = await render(React.createElement(SpeakHoldButton, {
    ...baseProps, onHoldStart, onHoldEnd, sessionAuthorized: true,
  }));
  const button = view.getByTestId('fc-speak-hold');
  await fireEvent(button, 'pressIn');
  await fireEvent(button, 'pressOut');
  expect(onHoldStart).toHaveBeenCalledTimes(1);
  expect(onHoldEnd).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  expect(view.queryByTestId('plus-badge')).toBeNull();
});

test('ordinary callers without session authorization retain the global speaking paywall gate', async () => {
  const onHoldStart = jest.fn();
  const onHoldEnd = jest.fn();
  const view = await render(React.createElement(SpeakHoldButton, {
    ...baseProps, onHoldStart, onHoldEnd,
  }));
  await fireEvent(view.getByTestId('fc-speak-hold'), 'pressIn');
  await fireEvent(view.getByTestId('fc-speak-hold'), 'pressOut');
  expect(onHoldStart).not.toHaveBeenCalled();
  expect(onHoldEnd).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/premium_modal', params: { context: 'speaking', source: 'flashcards_speak_hold' } });
  expect(view.getByTestId('plus-badge')).toBeTruthy();
});
