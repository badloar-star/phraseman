// ════════════════════════════════════════════════════════════════════════════
// aa_auth_double_tap_contract.test.ts — аудит TG-F7EF093C2A25 (11.10).
//
// Точки входа (Google, Apple, «Позже», «У меня уже есть аккаунт», окно входа из
// настроек), удаление аккаунта и смена аккаунта обязаны:
//   1. на двойной/быстрый повторный тап НЕ запускать вторую операцию (лог причины);
//   2. при ошибке возвращать кнопки в рабочее состояние (ничего не «залипает»);
//   3. в КАЖДОМ catch писать причину с префиксом задачи (немой catch запрещён).
//
// Поведенчески (реальный компонент на моках, харнес как в
// registration_prompt_modal_lifecycle.test.ts): окно входа RegistrationPromptModal
// и подтверждение смены аккаунта в онбординге. Процессные замки auth_provider
// поведенчески сторожит auth_provider_behavior.test.ts («concurrent taps share one
// provider sign-in…», «a concurrent delete tap…»). Здесь — сторож по исходнику только
// там, где поведенческий прогон невозможен: онбординг (5 тыс. строк, натив) и окно
// удаления (нативная модалка + удаление с SecureStore), плюс логи catch в auth_provider.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import { readSource } from './helpers/read_source';

(globalThis as typeof globalThis & { __DEV__: boolean }).__DEV__ = false;

jest.mock('react-native', () => ({
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
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
const mockSignOutAndWipe = jest.fn();
const mockEnqueueChoice = jest.fn();
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
  signOutAndWipeForAccountSwitch: (...args: unknown[]) => mockSignOutAndWipe(...args),
  isAppleSignInAvailable: async () => false,
  isGoogleSignInAvailableSync: () => true,
  peekAppleSignInAvailability: () => false,
  peekAppleUnavailableReason: () => 'missing_service_id',
  peekLinkedAuthFromCurrentUser: () => null,
  AUTH_PROMPT_SHOWN_KEY: 'auth_prompt_shown_v1',
  APPLE_ANDROID_MISSING_SERVICE_ID: 'apple_android_missing_service_id',
}));
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: '__dismissed__',
  enqueueThemedBlockingChoiceAlert: (...args: unknown[]) => mockEnqueueChoice(...args),
  enqueueThemedBlockingInfoAlert: jest.fn(async () => undefined),
}));
jest.mock('../app/account_switch_unsaved_cards', () => ({
  readAccountSwitchUnsavedCardsDecision: jest.fn(async () => ({ kind: 'none' })),
}));
jest.mock('../app/firebase', () => ({ logEvent: jest.fn() }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/cloud_sync', () => ({
  fetchAuthRecoveryHint: jest.fn(async () => null),
  restoreFromCloudDetailed: jest.fn(async () => 'restored'),
  rememberSwapConfirmedStableAuthLink: jest.fn(async () => true),
  warmAuthSignInCallables: jest.fn(),
  // 12.10: экран аккаунта и смена в онбординге греют модули стирания заранее.
  prewarmAccountWipeModules: jest.fn(),
}));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-test') }));
jest.mock('../app/stable_safe_area_metrics', () => ({
  useStableSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('../app/smooth_layout', () => ({ animateNextLayoutTransition: jest.fn() }));
jest.mock('../hooks/use_is_screen_focused', () => ({ useIsScreenFocused: () => true }));
jest.mock('../app/auth_recovery_flow', () => ({ createAuthRecoveryFlow: jest.fn() }));
jest.mock('../app/auth_clean_install_recovery_flow', () => ({
  createCleanInstallRecoveryFlow: jest.fn(),
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
    AppleSignInButton: () => null,
    AuthProviderButtonPlaceholder: () => null,
  };
});
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

let warnSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockGoogleOnPress = null;
  mockAsyncStorage.__reset();
  mockSignInWithProvider.mockReset();
  mockSignOutAndWipe.mockReset();
  mockEnqueueChoice.mockReset();
  (globalThis as any).requestAnimationFrame = (callback: (time: number) => void) => {
    callback(0);
    return 1;
  };
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  warnSpy.mockRestore();
  logSpy.mockRestore();
});

function loggedLines(spy: jest.SpyInstance): string[] {
  return spy.mock.calls.map((call) => call.map((part: unknown) => String(part)).join(' '));
}

async function renderModal() {
  const onClose = jest.fn();
  const screen = await render(
    React.createElement(RegistrationPromptModal, { visible: true, context: 'settings', onClose }),
  );
  await waitFor(() => expect(screen.getByTestId('provider-google')).toBeTruthy());
  return { screen, onClose };
}

describe('окно входа (RegistrationPromptModal): Google из настроек/окна регистрации', () => {
  test('двойной тап в одном кадре → одна операция входа, второй тап пишет причину', async () => {
    const signIn = deferred<any>();
    mockSignInWithProvider.mockReturnValueOnce(signIn.promise);
    const { screen } = await renderModal();
    const press = mockGoogleOnPress!;
    await act(async () => {
      void press();
      void press();
      await Promise.resolve();
    });
    expect(mockSignInWithProvider).toHaveBeenCalledTimes(1);
    expect(loggedLines(logSpy).some((line) => line.includes('[AUTH-MODAL] sign_in ignored provider=google reason='))).toBe(true);

    await act(async () => {
      signIn.resolve({ result: 'cancelled' });
      await signIn.promise;
      await Promise.resolve();
    });
    expect(screen.getByTestId('provider-google').props.disabled).toBe(false);
  });

  test('отказ провайдера → кнопка снова доступна, повторный вход стартует заново', async () => {
    mockSignInWithProvider
      .mockResolvedValueOnce({ result: 'error', error: 'network_request_failed' })
      .mockResolvedValueOnce({ result: 'cancelled' });
    const { screen } = await renderModal();
    await act(async () => {
      await mockGoogleOnPress!();
    });
    expect(screen.getByTestId('provider-google').props.disabled).toBe(false);
    await act(async () => {
      await mockGoogleOnPress!();
    });
    expect(mockSignInWithProvider).toHaveBeenCalledTimes(2);
  });

  test('исключение входа → catch пишет причину кодом (без текста), кнопка снова доступна', async () => {
    const failure = Object.assign(new Error('secret user@example.test'), { code: 'auth/internal-error' });
    mockSignInWithProvider.mockRejectedValueOnce(failure);
    const { screen } = await renderModal();
    await act(async () => {
      await mockGoogleOnPress!();
    });
    const warned = loggedLines(warnSpy).find((line) => line.includes('[AUTH-MODAL] sign_in threw provider=google'));
    // код — через identityErrorCode (как в auth_provider), текст ошибки в лог не попадает
    expect(warned).toContain('code=auth/internal-error');
    expect(warned).not.toContain('user@example.test');
    expect(screen.getByTestId('provider-google').props.disabled).toBe(false);
  });
});

describe('смена аккаунта в онбординге (onboarding_account_switch_confirm)', () => {
  test('исключение смены → исход failed с причиной в логе, без второго запуска', async () => {
    mockEnqueueChoice.mockResolvedValueOnce('switch');
    mockSignOutAndWipe.mockRejectedValueOnce(new Error('marker_write_failed'));
    const { confirmAndSwitchAccountInOnboarding } = require('../app/onboarding_account_switch_confirm');
    const outcome = await confirmAndSwitchAccountInOnboarding('ru');
    expect(outcome).toEqual({ kind: 'failed', reason: 'marker_write_failed' });
    expect(mockSignOutAndWipe).toHaveBeenCalledTimes(1);
    expect(loggedLines(warnSpy).some((line) => line.includes('[AUTH-SWITCH-OFFER] onboarding switch_threw reason=marker_write_failed'))).toBe(true);
  });

  test('отмена пользователем → без операции и без окна ошибки', async () => {
    mockEnqueueChoice.mockResolvedValueOnce('cancel');
    const { confirmAndSwitchAccountInOnboarding } = require('../app/onboarding_account_switch_confirm');
    await expect(confirmAndSwitchAccountInOnboarding('ru')).resolves.toEqual({ kind: 'cancelled' });
    expect(mockSignOutAndWipe).not.toHaveBeenCalled();
    expect(mockEnqueueChoice).toHaveBeenCalledTimes(1);
  });
});

// ── Сторожа по исходнику: только там, где поведенческий прогон невозможен ──────

function sliceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

const CATCH_LOG = /console\.(warn|log|error)|logAuthModalCatch|swallowAuthAs|identityTrace|DebugLogger\.error|noteSwallowed/;

/** Тело блока от открывающей `{` до парной `}` (строки '…'/"…" пропускаются, `${}` сбалансированы). */
function blockBody(source: string, openBraceIndex: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openBraceIndex + 1, i);
    }
  }
  throw new Error('незакрытый блок catch');
}

/**
 * Каждый catch-блок в куске обязан писать причину — внутри СВОЕГО тела (по парным скобкам, а не
 * по окну символов) и раньше первого `return` в нём; `.catch(() => …)` без лога запрещён.
 */
function expectEveryCatchLogs(slice: string, label: string): void {
  const blockCatch = /\bcatch\s*(\([^)]*\))?\s*\{/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = blockCatch.exec(slice)) !== null) {
    count += 1;
    const body = blockBody(slice, match.index + match[0].length - 1);
    const logAt = body.search(CATCH_LOG);
    const returnAt = body.search(/\breturn\b/);
    if (logAt < 0 || (returnAt >= 0 && returnAt < logAt)) {
      throw new Error(`${label}: немой catch (или return раньше лога) → ${body.slice(0, 200)}`);
    }
  }
  expect(count).toBeGreaterThan(0);
  expect(slice).not.toMatch(/\.catch\(\s*\(\s*\)\s*=>/);
}

describe('онбординг (CleanOnboarding): Google/Apple, «У меня уже есть аккаунт», «Позже», «Назад»', () => {
  const source = readSource('components/CleanOnboarding.tsx');
  const handleAuth = sliceBetween(source, 'const handleAuth = useCallback(', 'const authFromPrivacy = useCallback(');
  const authFromPrivacy = sliceBetween(source, 'const authFromPrivacy = useCallback(', 'const ensureEnglishStudyTarget = useCallback(');

  test.each([
    ['handleAuth', handleAuth],
    ['authFromPrivacy', authFromPrivacy],
  ])('%s: синхронный замок, лог отбитого тапа, снятие в finally, catch с причиной', (label, slice) => {
    expect(slice).toMatch(/if \(authLoading \|\| authInFlightRef\.current\) \{\s*console\.log\(`\[ONBOARDING-AUTH\] tap ignored/);
    expect(slice).toContain('authInFlightRef.current = true;');
    expect(slice).toMatch(/finally \{\s*authInFlightRef\.current = false;[\s\S]*setAuthLoading\(null\);/);
    expect(slice).toContain('[ONBOARDING-AUTH] sign_in threw');
    expectEveryCatchLogs(slice, label);
  });

  test.each([
    ['handleAuth', handleAuth],
    ['authFromPrivacy', authFromPrivacy],
  ])('%s: поздний ответ после ухода — через settleLateOnboardingAuthResult, исключение отбрасывается, onDone один раз', (_label, slice) => {
    expect(slice).toContain('const attempt = beginOnboardingAuthAttempt(authAttemptRef);');
    // после ответа провайдера: сверка попытки → решение о позднем ответе (засчитать успех / отбросить)
    expect(slice).toMatch(/if \(!isOnboardingAuthAttemptCurrent\(authAttemptRef, attempt\)\) \{\s*await settleLateOnboardingAuthResult\(provider, result\.result, attempt\);\s*return;/);
    expect(slice.indexOf('settleLateOnboardingAuthResult(provider')).toBeLessThan(slice.indexOf("result.result === 'cancelled'"));
    // в catch исключение — не успех: отбрасывается с причиной
    const dropped = slice.match(/if \(!isOnboardingAuthAttemptCurrent\(authAttemptRef, attempt\)\) \{\s*console\.log\(`\[ONBOARDING-AUTH\] result dropped provider=\$\{provider\} result=threw reason=user_left`\)/g) ?? [];
    expect(dropped).toHaveLength(1);
    // штатный успех: onDone только если онбординг ещё не закрыт
    expect(slice).toMatch(/if \(authCompletionRef\.current\.doneCalled\) \{[\s\S]{0,200}success_after_completion[\s\S]{0,120}return;\s*\}\s*authCompletionRef\.current\.doneCalled = true;\s*onDone\(\);/);
    expect(slice).toContain('code=${identityErrorCode(error)}');
    expect(slice).not.toMatch(/reason=\$\{detail/);
  });

  test('поздний ответ: решение и завершение — из onboarding_auth_leave; анкета и финал не дают второго onDone', () => {
    const settle = sliceBetween(source, 'const settleLateOnboardingAuthResult = useCallback(', 'const handleAuth = useCallback(');
    expect(settle).toContain('decideLateOnboardingAuthResult(result, completion.doneCalled)');
    expect(settle).toMatch(/if \(action === 'drop'\) \{\s*console\.log\(`\[ONBOARDING-AUTH\] result dropped provider=\$\{provider\} result=\$\{result\} reason=user_left`\)/);
    expect(settle).toContain('await honorLateOnboardingAuthSuccess(completion, result, attempt, {');
    expect(settle).toContain('[DONE_KEY, \'1\']');
    expect(settle).toContain('AsyncStorage.removeItem(GENERATED_NICKNAME_PENDING_KEY)');

    const finish = sliceBetween(source, 'const finish = useCallback(async () => {', 'const completedRef = useRef(false);');
    expect(finish).toMatch(/if \(!canQuestionnaireWriteProfile\(authCompletionRef\.current\)\) \{\s*console\.log\('\[ONBOARDING-FINISH\] questionnaire skipped reason=late_auth_honored'\)/);
    expect(finish.indexOf('canQuestionnaireWriteProfile')).toBeLessThan(finish.indexOf("['user_profile'"));
    expect(finish).toContain('authCompletionRef.current.questionnaireWritten = true;');

    const complete = sliceBetween(source, 'const completeOnboarding = useCallback(async () => {', 'const completeOnboardingRef = useRef(completeOnboarding);');
    expect(complete).toMatch(/authCompletionRef\.current\.doneCalled = true;\s*onDone\(\);/);
    expect((complete.match(/if \(authCompletionRef\.current\.doneCalled\)/g) ?? []).length).toBe(2);
    // все прямые вызовы onDone() в онбординге помечают «закрыт» прямо перед вызовом
    const directOnDone = source.match(/^\s*onDone\(\);$/gm) ?? [];
    const guardedOnDone = source.match(/authCompletionRef\.current\.doneCalled = true;\s*onDone\(\);/g) ?? [];
    expect(guardedOnDone.length).toBe(directOnDone.length);
  });

  test('«Позже», «Назад» и стрелка сейфа идут через allowLeaveDuringAuth (до порога — ждём, после — уходим)', () => {
    expect(source).toMatch(/if \(!allowLeaveDuringAuth\('later'\)\) return;\s*go\('niceToMeet'\);/);
    expect(source).toMatch(/if \(!allowLeaveDuringAuth\('back'\)\) return;\s*setAuthMode\(false\);/);
    expect(source).toContain("onBack={() => { if (allowLeaveDuringAuth('back')) back(); }}");
    const leave = sliceBetween(source, 'const allowLeaveDuringAuth = useCallback(', 'const ensureEnglishStudyTarget = useCallback(');
    expect(leave).toContain('decideOnboardingAuthLeave(authInFlightRef.current, authSlow)');
    expect(leave).toMatch(/if \(decision === 'ignored_in_flight'\) \{\s*console\.log\(`\[ONBOARDING-AUTH\] \$\{action\} ignored reason=in_flight`\)/);
    expect(leave).toMatch(/if \(decision === 'leave_and_drop_result'\) \{\s*abandonOnboardingAuthAttempt\(authAttemptRef\);/);
    expect(leave).toContain('}, [authSlow]);');
    expect(source).not.toMatch(/finish_failed reason=\$\{error/);
  });
});

describe('уход с экрана входа при повисшем входе (onboarding_auth_leave) — поведенчески', () => {
  const leave = require('../components/onboarding_auth_leave') as typeof import('../components/onboarding_auth_leave');

  // Тот же порядок, что в CleanOnboarding.handleAuth: попытка → ожидание провайдера → сверка.
  async function runAttempt(
    ref: { current: number },
    provider: Promise<string>,
    effects: string[],
  ): Promise<void> {
    const attempt = leave.beginOnboardingAuthAttempt(ref);
    const result = await provider;
    if (!leave.isOnboardingAuthAttemptCurrent(ref, attempt)) {
      effects.push(`dropped:${result}`);
      return;
    }
    effects.push(`applied:${result}`);
  }

  test('до порога «медленно» уход игнорируется, ответ применяется', async () => {
    const ref = { current: 0 };
    const effects: string[] = [];
    const signIn = deferred<string>();
    const flight = runAttempt(ref, signIn.promise, effects);
    expect(leave.decideOnboardingAuthLeave(true, false)).toBe('ignored_in_flight');
    signIn.resolve('existing');
    await flight;
    expect(effects).toEqual(['applied:existing']);
  });

  test('после порога «медленно» выход разрешён, поздний результат отброшен; новая попытка своя', async () => {
    const ref = { current: 0 };
    const effects: string[] = [];
    const hung = deferred<string>();
    const flight = runAttempt(ref, hung.promise, effects);
    const decision = leave.decideOnboardingAuthLeave(true, true);
    expect(decision).toBe('leave_and_drop_result');
    leave.abandonOnboardingAuthAttempt(ref);
    hung.resolve('existing');
    await flight;
    expect(effects).toEqual(['dropped:existing']);

    const next = deferred<string>();
    const nextFlight = runAttempt(ref, next.promise, effects);
    next.resolve('created_new');
    await nextFlight;
    expect(effects).toEqual(['dropped:existing', 'applied:created_new']);
    expect(leave.decideOnboardingAuthLeave(false, false)).toBe('free');
  });
});

describe('поздний ответ входа после ухода (TG-C8E5C56B2F02) — поведенчески', () => {
  const leave = require('../components/onboarding_auth_leave') as typeof import('../components/onboarding_auth_leave');

  // Модель онбординга с тем же порядком, что в CleanOnboarding: settleLateOnboardingAuthResult,
  // finish (анкета «name») и completeOnboarding (финал после пейвола).
  function makeOnboarding() {
    const state = leave.createOnboardingCompletionState();
    const storage = new Map<string, string>([['user_profile', 'restored_from_account']]);
    const onDone = jest.fn();
    const lines: string[] = [];
    const effects: import('../components/onboarding_auth_leave').HonorLateOnboardingAuthEffects = {
      persistDone: async () => { storage.set('onboarding_done', '1'); },
      clearNicknamePending: async () => { storage.delete('generated_nickname_pending_v1'); },
      onDone,
      log: (line) => { lines.push(line); },
    };
    const finish = (): boolean => {
      if (!leave.canQuestionnaireWriteProfile(state)) return false;
      storage.set('user_profile', 'questionnaire_newbie');
      storage.set('generated_nickname_pending_v1', '{"createdAt":1}');
      state.questionnaireWritten = true;
      return true;
    };
    const completeOnboarding = (): void => {
      if (state.doneCalled) return;
      state.doneCalled = true;
      onDone();
    };
    const late = async (result: string, attempt = 1) => {
      const action = leave.decideLateOnboardingAuthResult(result, state.doneCalled);
      if (action === 'drop') { lines.push(`dropped:${result}`); return 'dropped'; }
      return leave.honorLateOnboardingAuthSuccess(state, result, attempt, effects);
    };
    return { state, storage, onDone, lines, effects, finish, completeOnboarding, late };
  }

  test.each(['linked_existing', 'merged_devices', 'linked_pending'])(
    'поздний %s → засчитан: onDone ровно один раз, анкета не перезаписывает профиль',
    async (result) => {
      const o = makeOnboarding();
      await expect(o.late(result, 3)).resolves.toBe('honored');
      expect(o.onDone).toHaveBeenCalledTimes(1);
      expect(o.storage.get('onboarding_done')).toBe('1');
      expect(o.lines).toContain(`[ONBOARDING-AUTH] late_success_honored result=${result} attempt=3 questionnaire=0`);
      // человек всё ещё мог нажать «Далее» на анкете — она уже не пишет поверх аккаунта
      expect(o.finish()).toBe(false);
      expect(o.storage.get('user_profile')).toBe('restored_from_account');
      expect(o.storage.has('generated_nickname_pending_v1')).toBe(false);
      o.completeOnboarding();
      expect(o.onDone).toHaveBeenCalledTimes(1);
    },
  );

  test.each(['created_new', 'error', 'cancelled'])('поздний %s → отброшен: онбординг продолжается как был', async (result) => {
    const o = makeOnboarding();
    await expect(o.late(result)).resolves.toBe('dropped');
    expect(o.onDone).not.toHaveBeenCalled();
    expect(o.lines).toEqual([`dropped:${result}`]);
    expect(o.finish()).toBe(true);
  });

  test('анкета уже записана, затем поздний успех → засчитан, метка автоника снята (новый ник существующему аккаунту не выдаётся)', async () => {
    const o = makeOnboarding();
    expect(o.finish()).toBe(true);
    await expect(o.late('linked_existing')).resolves.toBe('honored');
    expect(o.storage.has('generated_nickname_pending_v1')).toBe(false);
    expect(o.onDone).toHaveBeenCalledTimes(1);
    expect(o.lines[0]).toContain('questionnaire=1');
  });

  test('онбординг уже закрыт финалом → поздний успех только в лог, второго onDone нет', async () => {
    const o = makeOnboarding();
    o.completeOnboarding();
    await expect(o.late('linked_existing', 2)).resolves.toBe('already_completed');
    expect(o.onDone).toHaveBeenCalledTimes(1);
    expect(o.lines).toEqual(['[ONBOARDING-AUTH] late_success_after_completion result=linked_existing attempt=2']);
  });

  test('финал успел закрыть онбординг, пока поздний успех писал DONE_KEY → второго onDone нет', async () => {
    const o = makeOnboarding();
    o.effects.persistDone = async () => { o.completeOnboarding(); };
    await expect(o.late('merged_devices')).resolves.toBe('already_completed');
    expect(o.onDone).toHaveBeenCalledTimes(1);
    expect(o.lines.some((line) => line.includes('stage=after_persist'))).toBe(true);
  });
});

describe('окно удаления (DeleteAccountConfirmModal)', () => {
  const source = readSource('components/DeleteAccountConfirmModal.tsx');
  const handleConfirm = sliceBetween(source, 'const handleConfirmDelete = useCallback(', 'confirmDeleteRef.current = handleConfirmDelete;');

  test('повторный тап «Удалить» игнорируется с причиной; отказ и исключение снимают замок', () => {
    expect(handleConfirm).toMatch(/if \(deleteInFlightRef\.current \|\| deleting \|\|/);
    expect(handleConfirm).toContain('[ACCOUNT-DELETE-UI] confirm ignored reason=');
    expect(handleConfirm.indexOf('deleteInFlightRef.current = true;')).toBeLessThan(handleConfirm.indexOf('await beginAccountDeletion()'));
    // отказ быстрой фазы, успех и исключение — каждый снимает замок; finally гасит «удаляю».
    expect(handleConfirm.match(/deleteInFlightRef\.current = false;/g)?.length).toBeGreaterThanOrEqual(3);
    expect(handleConfirm).toMatch(/finally \{\s*setDeleting\(false\);/);
    expect(source).toContain('[ACCOUNT-DELETE-UI] cancel ignored reason=in_flight');
  });

  test('ни одного немого catch в окне удаления', () => {
    expectEveryCatchLogs(source, 'DeleteAccountConfirmModal');
  });
});

describe('auth_provider: процессные замки и причины в catch', () => {
  const source = readSource('app/auth_provider.ts');

  test('signInWithProvider: повторный тап присоединяется к идущему входу, каждый отказ пишет причину', () => {
    const signIn = sliceBetween(source, 'export async function signInWithProvider(', 'const PROVIDER_SIGN_IN_STALE_MS');
    expect(signIn).toMatch(/console\.log\(`\[AUTH-SIGNIN\] joined provider=\$\{provider\} reason=in_flight`\);\s*return providerSignInInFlight\.task;/);
    for (const reason of ['clean_recovery_transition_active', 'recovery_in_flight', 'native_reservation_held', 'in_flight_other', 'in_flight_stale']) {
      expect(signIn).toContain(`reason=${reason}`);
    }
    // каждый ранний `return { result: 'error'` предварён строкой лога
    const earlyReturns = signIn.split(/\n/).filter((line) => /return \{ result: 'error'|^\s*return \{$/.test(line)).length;
    const ignoredLogs = (signIn.match(/\[AUTH-SIGNIN\] ignored provider=/g) ?? []).length;
    expect(ignoredLogs).toBeGreaterThanOrEqual(earlyReturns);
    expectEveryCatchLogs(signIn, 'signInWithProvider');
  });

  test('signOutAndWipeForAccountSwitch: исключение превращается в отказ с причиной (UI не застревает в «стираю»)', () => {
    const wrapper = sliceBetween(source, 'export async function signOutAndWipeForAccountSwitch(', 'async function signOutAndWipeForAccountSwitchReserved(');
    expect(wrapper).toMatch(/catch \(error\) \{[\s\S]*\[ACC-MUT\] signout:out threw[\s\S]*return \{ ok: false, reason: 'unknown', detail: `threw:\$\{code\}` \};\s*\} finally \{\s*releaseTransitionReservation\(\);/);
    // поведенчески — tests/aa_auth_switch_resume_throw.test.ts; здесь: все три возобновления под защитой
    const reserved = sliceBetween(source, 'async function signOutAndWipeForAccountSwitchReserved(', 'export type DeleteAccountResult');
    expect(reserved).not.toContain('await resumePendingAccountSwitchQuarantine()');
    expect(reserved.match(/await resumeAccountSwitchQuarantineForSignOut\('(existing_marker|no_cloud|switch)'\)/g)).toHaveLength(3);
  });

  test('удаление (begin → prepare → finish): ни одного немого catch и ни одной причины только под __DEV__', () => {
    const deletion = sliceBetween(source, 'export async function beginAccountDeletion()', 'function startGuestDirectServerDeletion(');
    expectEveryCatchLogs(deletion, 'account deletion');
    expect(deletion).not.toMatch(/if \(__DEV__\) console\.warn\('\[auth_provider\]/);
    expect(deletion).toContain("run().catch(swallowAuthAs('[AUTH-DELETE]', 'local_step', onTimeout))");
    expect(deletion).toMatch(/delete:reserve_failed code=\$\{identityErrorCode\(reserveError\)\}/);
  });

  test('восстановление личности после удаления: catch пишут причину', () => {
    const fresh = sliceBetween(source, 'export async function ensureFreshPostDeletionIdentity(', 'export async function resumePendingAccountDeleteLocalExit(');
    expectEveryCatchLogs(fresh, 'ensureFreshPostDeletionIdentity');
  });
});

describe('окно входа: catch-блоки восстановления и сброса', () => {
  const source = readSource('components/RegistrationPromptModal.tsx');

  test('вход, «Позже», сброс и восстановление — ни одного немого catch', () => {
    const handlers = sliceBetween(source, 'const handleRecoveryStart = useCallback(', 'const handleLaterRef = useRef(handleLater);');
    expectEveryCatchLogs(handlers, 'RegistrationPromptModal');
    expect(handlers).toContain('[AUTH-MODAL] reset ignored reason=in_flight');
    expect(handlers).toContain('[AUTH-MODAL] later ignored reason=in_flight');
    // причины пишутся общим кодом identityErrorCode, без текста ошибки (там может быть почта)
    expect(source).toContain('[AUTH-MODAL] ${step} failed code=${identityErrorCode(error)}');
    expect(handlers).toContain('[AUTH-MODAL] reset failed code=${identityErrorCode(error)}');
    expect(source).toContain('sign_in threw provider=${provider} code=${identityErrorCode(e)}');
    expect(source).not.toMatch(/reset failed reason=/);
  });
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RegistrationPromptModal = require('../components/RegistrationPromptModal').default;
