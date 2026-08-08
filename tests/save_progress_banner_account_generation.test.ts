import React from 'react';
import { act, render } from '@testing-library/react-native';

const listeners = new Set<(token: { generation: number; stableId: string | null }) => void>();
let resolveAuth!: (value: unknown) => void;
const authCheck = new Promise<unknown>((resolve) => { resolveAuth = resolve; });
let resolveReplacementAuth!: (value: unknown) => void;
const replacementAuthCheck = new Promise<unknown>((resolve) => { resolveReplacementAuth = resolve; });

jest.mock('react-native', () => ({
  Animated: { Value: class { setValue = jest.fn(); interpolate = jest.fn(() => 0); }, View: 'AnimatedView', timing: () => ({ start: jest.fn() }) },
  DeviceEventEmitter: { addListener: jest.fn(() => ({ remove: jest.fn() })) },
  Easing: { out: (value: unknown) => value, cubic: 'cubic' },
  Text: 'Text', TouchableOpacity: 'TouchableOpacity', View: 'View',
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => key === 'user_total_xp' ? '1200' : null),
  setItem: jest.fn(),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/auth_provider', () => ({
  getLinkedAuthInfo: jest.fn()
    .mockImplementationOnce(() => authCheck)
    .mockImplementationOnce(() => replacementAuthCheck),
}));
jest.mock('../app/account_generation', () => ({
  subscribeAccountGeneration: (listener: (token: { generation: number; stableId: string | null }) => void) => {
    listeners.add(listener);
    return { remove: () => listeners.delete(listener) };
  },
}));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { correct: '#0f0', correctText: '#000', textPrimary: '#fff', textMuted: '#999' }, f: { h3: 18, sub: 14 } }) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: ({ children }: { children?: React.ReactNode }) => children }));
jest.mock('../components/PremiumCard', () => ({ __esModule: true, default: ({ children }: { children?: React.ReactNode }) => children }));
jest.mock('../components/RegistrationPromptModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../constants/i18n', () => ({ triLang: () => 'Save progress' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../constants/androidGlow', () => ({ noAndroidOutline: {} }));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const SaveProgressBanner = require('../components/SaveProgressBanner').default;

test('an account-generation transition invalidates a pending banner check before its old auth result can display', async () => {
  const screen = await render(React.createElement(SaveProgressBanner, { ownerActive: true }));

  expect(listeners.size).toBe(1);

  await act(async () => {
    listeners.forEach((listener) => listener({ generation: 2, stableId: 'account-b' }));
    resolveAuth(null);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(screen.queryByTestId('save-progress-banner')).toBeNull();
  await act(async () => { resolveReplacementAuth({ provider: 'google' }); });
});
