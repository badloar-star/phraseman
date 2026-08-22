/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import MaxMemorySettings from '../app/max_memory_settings';
import { clearMaxMemory, getMaxMemory } from '../app/max_memory_client';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
    hairlineWidth: 1,
  },
}));

jest.mock('../app/max_memory_client', () => ({
  getMaxMemory: jest.fn(),
  updateMaxMemory: jest.fn(),
  deleteMaxMemoryItem: jest.fn(),
  clearMaxMemory: jest.fn(),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, copy: Record<string, string>) => copy.ru }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../app/navigation_back', () => ({ safeRouterBack: jest.fn() }));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#fff', textSecond: '#ccc', textMuted: '#aaa', accent: '#80e060', correctText: '#07110A',
      bgCard: '#151515', bgSurface2: '#222', border: '#333', wrong: '#d84c4c',
    },
    f: { h2: 24, bodyLg: 17, body: 15 },
    ds: { radius: { xl: 22 } },
  }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-safe-area-context', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return { SafeAreaView: ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(View, null, children) };
});
jest.mock('../components/ScreenGradient', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(View, null, children);
});
jest.mock('../components/ContentWrap', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ({ children }: { children: React.ReactNode }) => ReactLocal.createElement(View, null, children);
});
jest.mock('../components/BouncyScrollView', () => {
  const ReactLocal = require('react');
  const { ScrollView } = require('react-native');
  return ({ children, ...props }: { children: React.ReactNode }) => ReactLocal.createElement(ScrollView, props, children);
});
jest.mock('../components/SectionSheetHeader', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return ({ title }: { title: string }) => ReactLocal.createElement(Text, null, title);
});
jest.mock('../components/modal_fx/HybridAlertShell', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ({ visible, children, testID }: { visible: boolean; children: React.ReactNode; testID?: string }) => visible
    ? ReactLocal.createElement(View, { testID }, children)
    : null;
});
jest.mock('../components/ui/PrimaryButton', () => {
  const ReactLocal = require('react');
  const { Pressable, Text } = require('react-native');
  return ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => ReactLocal.createElement(Pressable, { onPress, disabled }, ReactLocal.createElement(Text, null, label));
});

const fullMemory = {
  schemaVersion: 2 as const,
  preferredName: 'Мия',
  learningGoal: 'Свободно говорить в поездках',
  languagePreference: 'more_target' as const,
  pacePreference: 'slower' as const,
  conversationHooks: [{ id: 'h1', text: 'Любит пешие прогулки' }],
  activeIssues: [{ id: 'a1', label: 'Прошедшее время', evidenceCount: 2 }],
  resolvedIssues: [{ id: 'r1', label: 'Артикли' }],
  homework: [],
  nextTopic: '',
  callCount: 3,
  lastCefr: 'A2' as const,
};

describe('MAX memory settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a calm grouped learner projection and opens destructive confirmation', async () => {
    (getMaxMemory as jest.Mock).mockResolvedValue(fullMemory);
    const screen = await render(<MaxMemorySettings />);

    await waitFor(() => expect(screen.getByText('Твои настройки')).toBeTruthy());
    expect(screen.getByText('MAX помнит')).toBeTruthy();
    expect(screen.getByText('Сейчас работаем над')).toBeTruthy();
    expect(screen.getByText('Уже стало лучше')).toBeTruthy();
    expect(screen.getByText(/На сервере аудио и полный текст разговора не хранятся/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('max-memory-clear'));
    expect(screen.getByTestId('max-memory-confirm-modal')).toBeTruthy();
    expect(screen.getByText('Очистить память MAX?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('max-memory-confirm-action'));
    await waitFor(() => expect(clearMaxMemory).toHaveBeenCalledTimes(1));
    expect(getMaxMemory).toHaveBeenCalledTimes(2);
  });

  it('renders explicit empty and retryable error states', async () => {
    (getMaxMemory as jest.Mock).mockResolvedValueOnce({
      ...fullMemory,
      preferredName: null,
      learningGoal: null,
      languagePreference: null,
      pacePreference: null,
      conversationHooks: [],
      activeIssues: [],
      resolvedIssues: [],
    });
    const empty = await render(<MaxMemorySettings />);
    await waitFor(() => expect(empty.getByTestId('max-memory-empty')).toBeTruthy());
    await empty.unmount();

    (getMaxMemory as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const failed = await render(<MaxMemorySettings />);
    await waitFor(() => expect(failed.getByTestId('max-memory-error')).toBeTruthy());
    expect(failed.getByText('Попробовать снова')).toBeTruthy();
    await failed.unmount();
  });

});
