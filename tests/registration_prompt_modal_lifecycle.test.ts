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
// зачем (TG-AA6EC9A6D998): Google теперь синхронный, Apple — peek (null = iOS ещё не ответил).
const mockApplePeek = jest.fn();
const mockPeekLinkedAuth = jest.fn();
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
  isGoogleSignInAvailableSync: () => mockGoogleAvailability(),
  peekAppleSignInAvailability: () => mockApplePeek(),
  peekLinkedAuthFromCurrentUser: () => mockPeekLinkedAuth(),
  AUTH_PROMPT_SHOWN_KEY: 'auth_prompt_shown_v1',
  APPLE_ANDROID_MISSING_SERVICE_ID: 'apple_android_missing_service_id',
}));
jest.mock('../app/firebase', () => ({ logEvent: (...args: unknown[]) => mockLogEvent(...args) }));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmitAppEvent(...args) }));
jest.mock('../app/cloud_sync', () => ({
  fetchAuthRecoveryHint: jest.fn(async () => null),
  restoreFromCloudDetailed: jest.fn(async () => 'restored'),
  // зачем: модалка при открытии прогревает callable-функции входа (2026-08-22).
  warmAuthSignInCallables: jest.fn(),
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
      wrongBg: 'rgba(239,68,68,0.12)',
    },
    f: { h1: 24, body: 16, caption: 13 },
    liquidGlassThemeId: 'graphite',
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
jest.mock('../components/keyboardAvoidance', () => ({ useKeyboardBottomInset: () => 0 }));
// зачем: PressableHybrid тянет expo-audio (ESM) — в этом наборе не нужен, ломал разбор файла.
jest.mock('../components/PressableHybrid', () => ({ __esModule: true, default: 'Pressable' }));
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
    AuthProviderButtonPlaceholder: ({ testID }: { testID?: string }) => (
      mockReact.createElement('View', { testID: testID ?? 'auth-provider-button-placeholder' })
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
  mockApplePeek.mockReset();
  mockPeekLinkedAuth.mockReset();
  mockSignInWithProvider.mockReset();
  mockCreateCleanInstallRecoveryFlow.mockReset();
  mockGoogleOnPress = null;
  require('@react-native-async-storage/async-storage').__reset();
  mockGoogleAvailability.mockReturnValue(true);
  mockAppleAvailability.mockResolvedValue(false);
  mockApplePeek.mockReturnValue(false);
  mockPeekLinkedAuth.mockReturnValue(null);
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

// зачем (TG-AA6EC9A6D998): гонка «поздний ответ скрытого показа» теперь живёт только у Apple на iOS
// (Google синхронный) — проверяем её там же; заглушка держит место до ответа.
test('deferred Apple availability from a hidden render cannot overwrite the reopened modal', async () => {
  const oldAvailability = controlledThenable<boolean>();
  const newAvailability = controlledThenable<boolean>();
  mockApplePeek.mockReturnValue(null);
  mockAppleAvailability
    .mockReturnValueOnce(oldAvailability.value)
    .mockReturnValueOnce(newAvailability.value);
  const onClose = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }),
  );
  expect(mockAppleAvailability).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('provider-google')).toBeTruthy();
  expect(screen.getByTestId('provider-apple-placeholder')).toBeTruthy();

  await screen.rerender(React.createElement(RegistrationPromptModal, { visible: false, context: 'settings', onClose }));
  await screen.rerender(React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }));
  expect(mockAppleAvailability).toHaveBeenCalledTimes(2);
  await act(() => {
    newAvailability.resolve(true);
  });
  expect(screen.getByTestId('provider-apple')).toBeTruthy();
  expect(screen.queryByTestId('provider-apple-placeholder')).toBeNull();

  await act(() => {
    oldAvailability.resolve(false);
  });
  expect(screen.getByTestId('provider-apple')).toBeTruthy();
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

test('slow state is announced after the threshold and close invalidates only modal continuations', async () => {
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
    // зачем: порог «вход идёт медленно» опущен 45с → 8с (ускорение входа 2026-08-22).
    jest.advanceTimersByTime(8_000);
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

// зачем (координатор §48, 2026-10-01): владелец 28.08 — «вход через провайдера —
// единственный живой путь восстановления и создания»: существующий профиль
// восстанавливается сам, удалённый создаёт пустой. Входы «восстановить» и
// «восстановление после переустановки» в окне выключены жёстко
// (showRecoveryEntry/showCleanRecoveryEntry = false). Три сценария шагов этого
// потока (провайдер → почта → код → готово) исполнялись против скрытого UI и
// сняты; сторожим, что входы не вернутся без решения владельца.
test('provider sign-in is the only recovery path: recovery entries stay hidden', async () => {
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose: jest.fn() }),
  );
  expect(screen.queryByTestId('auth-recovery-entry')).toBeNull();
  expect(screen.queryByTestId('auth-clean-recovery-entry')).toBeNull();
  expect(mockCreateCleanInstallRecoveryFlow).not.toHaveBeenCalled();
});

// зачем (TG-AA6EC9A6D998): окно после переустановки не обещает «вернём прогресс», пока
// привязка не доказана: сессия Google/Apple → прежний текст, аноним → нейтральный без «вернём».
test('startup recovery with a provider session keeps the reassuring copy', async () => {
  mockPeekLinkedAuth.mockReturnValue({ provider: 'google' });
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'startup_recovery', onClose: jest.fn() }),
  );
  expect(screen.getByText('Всё в безопасности')).toBeTruthy();
  expect(screen.getByText('Войди в тот же аккаунт Google или Apple — вернём прогресс из облака.')).toBeTruthy();
});

test('startup recovery without proof of a provider link shows neutral copy and no saved-journey promise', async () => {
  mockPeekLinkedAuth.mockReturnValue(null);
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'startup_recovery', onClose: jest.fn() }),
  );
  expect(screen.queryByText('Всё в безопасности')).toBeNull();
  expect(screen.getByText('Был ли вход раньше?')).toBeTruthy();
  expect(screen.getByText('Войди тем способом, которым входил раньше. Если входа не было, этот прогресс вернуть нельзя.')).toBeTruthy();
  expect(screen.queryByText('Твой путь сохранится и дождётся тебя')).toBeNull();
});

test('first frame reserves the Apple slot while iOS has not answered; no "no provider" flash', async () => {
  mockGoogleAvailability.mockReturnValue(false);
  mockApplePeek.mockReturnValue(null);
  mockAppleAvailability.mockReturnValue(new Promise<boolean>(() => undefined));
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose: jest.fn() }),
  );
  expect(screen.getByTestId('provider-apple-placeholder')).toBeTruthy();
  // зачем (переводчик 18.10): текст переименован без слова «провайдер» — тест ищет новый, иначе проверка стала бы пустой
  expect(screen.queryByText('На этом телефоне нет доступного способа входа.')).toBeNull();
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RegistrationPromptModal = require('../components/RegistrationPromptModal').default;
