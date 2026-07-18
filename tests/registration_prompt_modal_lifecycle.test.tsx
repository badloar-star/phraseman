import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

jest.unmock('react-native');

const mockSignInWithProvider = jest.fn();
const mockGoogleAvailability = jest.fn();
const mockAppleAvailability = jest.fn();
const mockEmitAppEvent = jest.fn();
const mockLogEvent = jest.fn();
let mockGoogleOnPress: (() => Promise<void>) | null = null;

jest.mock('../app/auth_provider', () => ({
  signInWithProvider: (...args: unknown[]) => mockSignInWithProvider(...args),
  signOutAndWipeForAccountSwitch: jest.fn(async () => ({ ok: true })),
  isAppleSignInAvailable: () => mockAppleAvailability(),
  isGoogleSignInAvailable: () => mockGoogleAvailability(),
  AUTH_PROMPT_SHOWN_KEY: 'auth_prompt_shown_v1',
  APPLE_ANDROID_MISSING_SERVICE_ID: 'apple_android_missing_service_id',
}));
jest.mock('../app/firebase', () => ({ logEvent: (...args: unknown[]) => mockLogEvent(...args) }));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmitAppEvent(...args) }));
jest.mock('../app/config', () => ({
  KNOWLY_LEGAL_PRIVACY_URL: 'https://example.test/privacy',
  KNOWLY_LEGAL_TERMS_URL: 'https://example.test/terms',
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      accent: '#84cc16',
      bgPrimary: '#101214',
      bgSurface: '#202428',
      border: '#343a40',
      text: '#ffffff',
      textSecond: '#d1d5db',
      textMuted: '#9ca3af',
      textGhost: '#6b7280',
      wrong: '#ef4444',
    },
    f: { h1: 24, body: 16, caption: 13 },
  }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/SafeLinearGradient', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return {
    LinearGradient: ({ children }: { children?: React.ReactNode }) => (
      mockReact.createElement(MockView, null, children)
    ),
  };
});
jest.mock('../components/CompassDepthSurface', () => () => null);
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../components/AuthProviderButtons', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    GoogleSignInButton: ({ onPress, disabled }: { onPress: () => Promise<void>; disabled?: boolean }) => {
      mockGoogleOnPress = onPress;
      return mockReact.createElement(
        MockPressable,
        { testID: 'provider-google', onPress, disabled },
        mockReact.createElement(MockText, null, 'Google'),
      );
    },
    AppleSignInButton: ({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) => (
      mockReact.createElement(
        MockPressable,
        { testID: 'provider-apple', onPress, disabled },
        mockReact.createElement(MockText, null, 'Apple'),
      )
    ),
  };
});
jest.mock('@react-native-async-storage/async-storage', () => (
  require('./__mocks__/async-storage.js')
));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function controlledThenable<T>() {
  let resolve!: (value: T) => void;
  const value = {
    then(onFulfilled: (result: T) => void) {
      resolve = onFulfilled;
      return value;
    },
  };
  return { value: value as unknown as Promise<T>, resolve: (result: T) => resolve(result) };
}

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useRealTimers();
  jest.clearAllMocks();
  mockGoogleAvailability.mockReset();
  mockAppleAvailability.mockReset();
  mockSignInWithProvider.mockReset();
  mockGoogleOnPress = null;
  require('@react-native-async-storage/async-storage').__reset();
  mockGoogleAvailability.mockResolvedValue(true);
  mockAppleAvailability.mockResolvedValue(false);
  mockSignInWithProvider.mockResolvedValue({
    result: 'created_new',
    email: 'user@example.test',
    displayName: 'User',
  });
  (globalThis as any).requestAnimationFrame = (callback: (time: number) => void) => {
    callback(0);
    return 1;
  };
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

test('deferred provider availability from a hidden render cannot overwrite the reopened modal', async () => {
  const oldAvailability = controlledThenable<boolean>();
  const newAvailability = controlledThenable<boolean>();
  mockGoogleAvailability
    .mockReturnValueOnce(oldAvailability.value)
    .mockReturnValueOnce(newAvailability.value);
  const onClose = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }),
  );
  expect(mockGoogleAvailability).toHaveBeenCalledTimes(1);

  await screen.rerender(React.createElement(RegistrationPromptModal, { visible: false, context: 'settings', onClose }));
  await screen.rerender(React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }));
  expect(mockGoogleAvailability).toHaveBeenCalledTimes(2);
  await act(() => {
    newAvailability.resolve(true);
  });
  expect(screen.getByTestId('provider-google')).toBeTruthy();

  await act(() => {
    oldAvailability.resolve(false);
  });
  expect(screen.getByTestId('provider-google')).toBeTruthy();
});

test('provider success after hide or unmount starts no marker write and no modal continuation', async () => {
  const signIn = deferred<any>();
  mockSignInWithProvider.mockReturnValueOnce(signIn.promise);
  const onClose = jest.fn();
  const onSignedIn = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, {
      visible: true,
      context: 'settings',
      onClose,
      onSignedIn,
    }),
  );
  await waitFor(() => expect(screen.getByTestId('provider-google')).toBeTruthy());
  await act(async () => {
    void mockGoogleOnPress?.();
    await Promise.resolve();
  });
  await screen.rerender(
    React.createElement(RegistrationPromptModal, {
      visible: false,
      context: 'settings',
      onClose,
      onSignedIn,
    }),
  );

  await act(async () => {
    signIn.resolve({ result: 'created_new', email: null, displayName: null });
    await signIn.promise;
    await Promise.resolve();
  });

  const storage = require('@react-native-async-storage/async-storage');
  expect(storage.setItem).not.toHaveBeenCalledWith('auth_prompt_shown_v1', '1');
  expect(mockEmitAppEvent).not.toHaveBeenCalledWith('auth_provider_linked');
  expect(onSignedIn).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  await screen.unmount();
});

test('45-second slow state is announced and close invalidates only modal continuations', async () => {
  const signIn = deferred<any>();
  mockSignInWithProvider.mockReturnValueOnce(signIn.promise);
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const onClose = jest.fn();
  const onSignedIn = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, {
      visible: true,
      context: 'settings',
      onClose,
      onSignedIn,
    }),
  );
  await waitFor(() => expect(screen.getByTestId('provider-google')).toBeTruthy());
  jest.useFakeTimers();
  await act(async () => {
    void mockGoogleOnPress?.();
    await Promise.resolve();
  });
  await act(() => {
    jest.advanceTimersByTime(45_000);
  });

  expect(screen.getByTestId('auth-prompt-slow')).toBeTruthy();
  expect(announce).toHaveBeenCalledWith(expect.stringContaining('Вход занимает больше времени'));
  const later = screen.getByTestId('auth-prompt-later');
  expect(later.props.accessibilityRole).toBe('button');
  expect(later.props.accessibilityState).toEqual({ disabled: false });
  await fireEvent.press(later);
  expect(onClose).toHaveBeenCalledTimes(1);

  await act(async () => {
    signIn.resolve({ result: 'created_new', email: null, displayName: null });
    await signIn.promise;
    await Promise.resolve();
  });
  expect(onSignedIn).not.toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalledWith('auth_provider_linked');
  announce.mockRestore();
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RegistrationPromptModal = require('../components/RegistrationPromptModal').default;
