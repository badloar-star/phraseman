/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
    hairlineWidth: 1,
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false }),
}));
function mockWrapper() {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  return ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(NativeView, null, children);
}
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: mockWrapper() }));
jest.mock('../components/BouncyScrollView', () => mockWrapper());
jest.mock('../components/ScreenGradient', () => mockWrapper());
jest.mock('../components/SectionSheetHeader', () => mockWrapper());
jest.mock('../components/ContentWrap', () => mockWrapper());
jest.mock('../components/CustomSwitch', () => mockWrapper());
jest.mock('../components/DeleteAccountConfirmModal', () => () => null);
jest.mock('../components/settings/SettingsGroup', () => ({
  SettingsGroup: mockWrapper(),
  SettingsSectionTitle: ({ title }: { title: string }) => {
    const ReactModule = require('react');
    const { Text: NativeText } = require('react-native');
    return ReactModule.createElement(NativeText, null, title);
  },
  SettingsRow: ({ testID, label, sub, onPress, accessibilityLabel }: {
    testID?: string;
    label: string;
    sub?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => {
    const ReactModule = require('react');
    const { Pressable: NativePressable, Text: NativeText } = require('react-native');
    return ReactModule.createElement(
      NativePressable,
      { testID, accessibilityRole: onPress ? 'button' : undefined, accessibilityLabel, onPress },
      ReactModule.createElement(NativeText, null, label),
      sub ? ReactModule.createElement(NativeText, null, sub) : null,
    );
  },
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: { bgCard: '#fff', border: '#ccc', textMuted: '#555' } }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../constants/i18n', () => ({
  triLang: (lang: string, values: Record<string, string>) => values[lang] ?? values.ru,
}));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../app/navigation_back', () => ({ safeRouterBack: jest.fn() }));
jest.mock('../app/analytics_consent', () => ({
  getAnalyticsConsentState: () => 'denied',
  setAnalyticsConsent: jest.fn(),
}));
jest.mock('../app/age_consent_cloud', () => ({ recordConsentToCloud: jest.fn() }));
jest.mock('../app/ai_explain_consent', () => ({
  getAiExplainConsentState: () => 'denied',
  setAiExplainConsent: jest.fn(),
  recordAiExplainConsentToCloud: jest.fn(),
}));
jest.mock('../app/ai_dialog_consent', () => ({
  getAiDialogConsentState: () => 'denied',
  setAiDialogConsent: jest.fn(),
  recordAiDialogConsentToCloud: jest.fn(),
}));
jest.mock('../app/max_voice_consent', () => ({
  getAiVoiceConsentState: () => 'denied',
  setAiVoiceConsent: jest.fn(),
  recordAiVoiceConsentToCloud: jest.fn(),
}));

import PrivacySettings from '../app/privacy_settings';
import { hapticTap } from '../hooks/use-haptics';

describe('privacy settings teacher-memory navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders an accessible localized row that opens the teacher-memory controls', async () => {
    const screen = await render(<PrivacySettings />);
    const row = screen.getByTestId('privacy-tutor-memory');

    expect(screen.getByText('Память преподавателя')).toBeTruthy();
    expect(screen.getByText('Просматривайте, изменяйте и удаляйте учебные заметки')).toBeTruthy();
    expect(row.props.accessibilityRole).toBe('button');
    fireEvent.press(row);
    expect(hapticTap).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/max_memory_settings');
  });
});
