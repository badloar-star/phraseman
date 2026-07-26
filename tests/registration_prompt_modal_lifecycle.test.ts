import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

jest.mock('react-native', () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: { openURL: jest.fn(async () => undefined) },
  Modal: 'Modal',
  Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.ios ?? options.default },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: unknown) => styles,
    absoluteFill: {},
    flatten: (style: unknown): Record<string, unknown> => {
      if (!style) return {};
      if (Array.isArray(style)) {
        return Object.assign({}, ...style.map((entry) => (
          entry && typeof entry === 'object' ? entry : {}
        )));
      }
      return typeof style === 'object' ? style as Record<string, unknown> : {};
    },
  },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

const mockSignInWithProvider = jest.fn();
const mockGoogleAvailability = jest.fn();
const mockAppleAvailability = jest.fn();
const mockEmitAppEvent = jest.fn();
const mockLogEvent = jest.fn();
const mockCreateCleanInstallRecoveryFlow = jest.fn();
let mockGoogleOnPress: (() => Promise<void>) | null = null;
const mockAsyncStorageState: Record<string, string> = {};
const mockAsyncStorage = {
  getItem: jest.fn(async (key: string) => mockAsyncStorageState[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockAsyncStorageState[key] = String(value); }),
  removeItem: jest.fn(async (key: string) => { delete mockAsyncStorageState[key]; }),
  __reset: () => {
    for (const key of Object.keys(mockAsyncStorageState)) delete mockAsyncStorageState[key];
  },
};

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
jest.mock('../app/cloud_sync', () => ({
  fetchAuthRecoveryHint: jest.fn(async () => null),
  restoreFromCloudDetailed: jest.fn(async () => 'restored'),
}));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-test') }));
jest.mock('../app/stable_safe_area_metrics', () => ({
  useStableSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));
jest.mock('../hooks/use_is_screen_focused', () => ({ useIsScreenFocused: () => true }));
jest.mock('../app/auth_recovery_flow', () => ({ createAuthRecoveryFlow: jest.fn() }));
jest.mock('../app/auth_clean_install_recovery_flow', () => ({
  createCleanInstallRecoveryFlow: () => mockCreateCleanInstallRecoveryFlow(),
}));
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
      bgCard: '#181b1e',
      border: '#343a40',
      text: '#ffffff',
      textPrimary: '#ffffff',
      textSecond: '#d1d5db',
      textMuted: '#9ca3af',
      textGhost: '#6b7280',
      wrong: '#ef4444',
      correctText: '#07110a',
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
jest.mock('../components/StreakChainIcon', () => ({ StreakChainIcon: () => null }));
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('react-native-gesture-handler', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  const chain: any = {};
  chain.activeOffsetY = jest.fn(() => chain);
  chain.failOffsetX = jest.fn(() => chain);
  chain.onUpdate = jest.fn(() => chain);
  chain.onEnd = jest.fn(() => chain);
  return {
    Gesture: { Pan: () => chain },
    GestureDetector: ({ children }: { children?: React.ReactNode }) => mockReact.createElement(MockView, null, children),
    GestureHandlerRootView: ({ children, style }: { children?: React.ReactNode; style?: unknown }) => mockReact.createElement(MockView, { style }, children),
  };
});
jest.mock('react-native-reanimated', () => {
  const mockReact = require('react');
  const { Text: MockText, View: MockView } = require('react-native');
  const AnimatedView = ({ children, ...props }: { children?: React.ReactNode }) => mockReact.createElement(MockView, props, children);
  const AnimatedText = ({ children, ...props }: { children?: React.ReactNode }) => mockReact.createElement(MockText, props, children);
  return {
    __esModule: true,
    default: { View: AnimatedView, Text: AnimatedText },
    interpolate: (_value: number, _input: number[], output: number[]) => output[output.length - 1],
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (value: unknown) => mockReact.useRef({ value }).current,
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
    Easing: { out: (fn: unknown) => fn, cubic: (value: number) => value, bezier: () => (value: number) => value },
  };
});
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
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

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
  mockCreateCleanInstallRecoveryFlow.mockReset();
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

test('clean-install recovery reaches provider proof, email, generic code and completion', async () => {
  let state: any = { stage: 'idle' };
  const flow = {
    getState: jest.fn(() => ({ ...state })),
    start: jest.fn(async (provider: 'google' | 'apple') => {
      state = { stage: 'ready', provider };
      return { ...state };
    }),
    requestCode: jest.fn(async (_email: string) => {
      state = {
        stage: 'code_sent', provider: 'google', expiresAt: Date.now() + 600_000, retryAfterSec: 0,
      };
      return { ...state };
    }),
    resendCode: jest.fn(async (_email: string) => ({ ...state, retryAfterSec: 0 })),
    confirmCode: jest.fn(async (_code: string) => {
      state = { stage: 'completed', provider: 'google' };
      return { result: 'completed' as const };
    }),
    resumeConfirmed: jest.fn(),
    dispose: jest.fn(async () => undefined),
    cancel: jest.fn(async () => undefined),
  };
  mockCreateCleanInstallRecoveryFlow.mockReturnValue(flow);
  const onClose = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }),
  );

  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-entry')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('auth-clean-recovery-entry'));
  await waitFor(() => expect(screen.getByLabelText('Продолжить через Google')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Продолжить через Google'));
  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-email-input')).toBeTruthy());

  await fireEvent.changeText(screen.getByTestId('auth-clean-recovery-email-input'), ' Owner@Example.COM ');
  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-email-input').props.value).toBe(' Owner@Example.COM '));
  await fireEvent.press(screen.getByLabelText('Отправить код'));
  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-code-input')).toBeTruthy());
  expect(flow.requestCode).toHaveBeenCalledWith('owner@example.com');
  expect(screen.getByText('Если данные подходят, письмо с 6-значным кодом уже отправлено.')).toBeTruthy();

  await fireEvent.press(screen.getByTestId('auth-clean-recovery-resend'));
  await waitFor(() => expect(flow.resendCode).toHaveBeenCalledWith('owner@example.com'));
  await fireEvent.changeText(screen.getByTestId('auth-clean-recovery-code-input'), '12a34-56');
  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-code-input').props.value).toBe('123456'));
  await fireEvent.press(screen.getByLabelText('Подтвердить и восстановить'));

  await waitFor(() => expect(flow.confirmCode).toHaveBeenCalledWith('123456'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('resumed clean-install challenge recollects email before resend and can cancel to change it', async () => {
  let state: any = { stage: 'idle' };
  const cancellation = deferred<void>();
  const cancellationSettled = deferred<void>();
  const flow = {
    getState: jest.fn(() => ({ ...state })),
    start: jest.fn(async (provider: 'google' | 'apple') => {
      state = {
        stage: 'code_sent', provider, expiresAt: Date.now() + 600_000, retryAfterSec: 0,
      };
      return { ...state };
    }),
    requestCode: jest.fn(),
    resendCode: jest.fn(async (_email: string) => ({ ...state, retryAfterSec: 0 })),
    confirmCode: jest.fn(),
    resumeConfirmed: jest.fn(),
    dispose: jest.fn(async () => undefined),
    cancel: jest.fn(async () => {
      await cancellation.promise;
      state = { stage: 'cancelled', provider: 'google' };
      cancellationSettled.resolve();
    }),
  };
  mockCreateCleanInstallRecoveryFlow.mockReturnValue(flow);
  const onClose = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }),
  );

  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-entry')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('auth-clean-recovery-entry'));
  await waitFor(() => expect(screen.getByLabelText('Продолжить через Google')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Продолжить через Google'));
  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-resend-email-input')).toBeTruthy());
  expect(screen.getByTestId('auth-clean-recovery-resend').props.accessibilityState.disabled).toBe(true);
  expect(flow.resendCode).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByTestId('auth-clean-recovery-resend-email-input'), 'corrected@example.com');
  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-resend').props.accessibilityState.disabled).toBe(false));
  await fireEvent.press(screen.getByTestId('auth-clean-recovery-resend'));
  expect(flow.resendCode).toHaveBeenCalledWith('corrected@example.com');

  await fireEvent.press(screen.getByLabelText('Изменить email'));
  await waitFor(() => expect(flow.cancel).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByTestId('auth-prompt-later').props.accessibilityState.disabled).toBe(true));
  await fireEvent.press(screen.getByTestId('auth-prompt-later'));
  expect(onClose).not.toHaveBeenCalled();
  expect(flow.dispose).not.toHaveBeenCalled();

  await act(async () => {
    cancellation.resolve();
    await cancellationSettled.promise;
    await Promise.resolve();
  });
  expect(flow.cancel).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByLabelText('Продолжить через Google')).toBeTruthy());
  expect(screen.queryByTestId('auth-clean-recovery-code-input')).toBeNull();
});

test('confirmed and adopting clean-install recovery cannot expose or invoke change-email cancellation', async () => {
  let state: any = { stage: 'idle' };
  const adoption = deferred<{ result: 'completed' }>();
  const adoptionSettled = deferred<void>();
  const flow = {
    getState: jest.fn(() => ({ ...state })),
    start: jest.fn(async (provider: 'google' | 'apple') => {
      state = { stage: 'confirmed', provider, expiresAt: Date.now() + 600_000 };
      return { ...state };
    }),
    requestCode: jest.fn(),
    resendCode: jest.fn(),
    confirmCode: jest.fn(),
    resumeConfirmed: jest.fn(async () => {
      const result = await adoption.promise;
      adoptionSettled.resolve();
      return result;
    }),
    dispose: jest.fn(async () => undefined),
    cancel: jest.fn(async () => undefined),
  };
  mockCreateCleanInstallRecoveryFlow.mockReturnValue(flow);
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose: jest.fn() }),
  );

  await waitFor(() => expect(screen.getByTestId('auth-clean-recovery-entry')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('auth-clean-recovery-entry'));
  await waitFor(() => expect(screen.getByLabelText('Продолжить через Google')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Продолжить через Google'));
  await waitFor(() => expect(screen.getByLabelText('Продолжить')).toBeTruthy());
  expect(screen.queryByLabelText('Изменить email')).toBeNull();
  expect(flow.cancel).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByLabelText('Продолжить'));
  await waitFor(() => expect(screen.getByTestId('auth-prompt-later').props.accessibilityState.disabled).toBe(true));
  expect(screen.queryByLabelText('Изменить email')).toBeNull();
  expect(flow.cancel).not.toHaveBeenCalled();

  await act(async () => {
    state = { stage: 'completed', provider: 'google' };
    adoption.resolve({ result: 'completed' });
    await adoptionSettled.promise;
    await Promise.resolve();
  });
  expect(flow.cancel).not.toHaveBeenCalled();
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RegistrationPromptModal = require('../components/RegistrationPromptModal').default;
