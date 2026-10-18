/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

// зачем (координатор 18.10, макет auth-states.html): состояния входа — нажата (кольцо на кнопке, остальные приглушены 38 % и не нажимаются),
// «Входим…» через 3 с и «занимает больше времени» через 8 с, мягкая карточка сбоя без красного и с одним «Попробовать ещё раз».
let mockLang = 'ru';
let mockReduceMotion = false;
const mockWithTiming = jest.fn((value: number) => value);

jest.mock('react-native', () => Object.setPrototypeOf({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    absoluteFillObject: { position: 'absolute', inset: 0 },
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style),
  },
}, jest.requireActual('react-native')));
jest.mock('react-native-reanimated', () => {
  const ReactActual = require('react');
  const AnimatedView = ReactActual.forwardRef((props: any, ref: unknown) => ReactActual.createElement('View', { ...props, ref }));
  return {
    __esModule: true,
    default: { View: AnimatedView },
    Easing: { bezier: () => 'bezier' },
    cancelAnimation: () => undefined,
    useSharedValue: (value: number) => ReactActual.useRef({ value }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => mockWithTiming(value),
    withDelay: (_delay: number, value: number) => value,
    withRepeat: (value: number) => value,
    withSequence: (...values: number[]) => values[values.length - 1],
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../components/AuthProviderIcons', () => ({ GoogleIcon: 'GoogleIcon', GoogleIconMono: 'GoogleIconMono', AppleIcon: 'AppleIcon' }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: mockLang }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'test' }) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({ text: '#FFFFFF', secondary: '#B8B9BD', ctaFill: '#F2F1F6', ctaFillInk: '#0B0C0E', buttonFill: '#2E2E32', accent: '#F2F1F6' }),
}));
jest.mock('../components/v2/ShadowSurface', () => ({ actionBoxShadow: () => [], nestedBoxShadow: () => [] }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => mockReduceMotion }));

import SignInProgressButton from '../components/auth/SignInProgressButton';
import { SIGN_IN_CALM_AFTER_MS, SIGN_IN_LONG_AFTER_MS, SignInFailureCard, SignInStatusLine } from '../components/auth/SignInProgressNote';
import { signInCalmText, signInFailureBody, signInLongText } from '../components/auth/sign_in_progress_copy';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('SignInProgressButton', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { mockLang = 'ru'; mockReduceMotion = false; mockWithTiming.mockClear(); logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); });

  it('в покое: значок и подпись на месте, тап зовёт onPress один раз', async () => {
    const onPress = jest.fn();
    const view = await render(<SignInProgressButton provider="google" label="Войти через Google" surface="dark" sheetColor="#1B1B1D" onPress={onPress} />);
    expect(view.getByText('Войти через Google')).toBeTruthy();
    expect(view.queryByTestId('sign-in-progress-ring')).toBeNull();
    await fireEvent.press(view.getByTestId('sign-in-progress-google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('нажата: на месте значка кольцо, подпись остаётся, кнопка не нажимается, читалка слышит «Входим»', async () => {
    const onPress = jest.fn();
    const view = await render(<SignInProgressButton provider="apple" label="Войти через Apple" busyLabel="Входим" busy surface="light" sheetColor="#FCFCFF" onPress={onPress} />);
    expect(view.getByTestId('sign-in-progress-ring')).toBeTruthy();
    expect(view.getByText('Войти через Apple')).toBeTruthy();
    const button = view.getByTestId('sign-in-progress-apple');
    expect(button.props.accessibilityLabel).toBe('Входим');
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('остальные приглушены до 38 % и не нажимаются', async () => {
    const onPress = jest.fn();
    const view = await render(<SignInProgressButton provider="apple" label="Войти через Apple" dimmed surface="dark" sheetColor="#1B1B1D" onPress={onPress} />);
    expect(mockWithTiming).toHaveBeenCalledWith(0.38);
    expect(view.getByTestId('sign-in-progress-apple').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(view.getByTestId('sign-in-progress-apple'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SignInStatusLine', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { jest.useFakeTimers(); mockLang = 'ru'; mockReduceMotion = false; logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); jest.useRealTimers(); });

  it('до 3 с строки нет, с 3 с — «Входим…», с 8 с — «Вход занимает больше времени…», при active=false исчезает', async () => {
    const view = await render(<SignInStatusLine active />);
    expect(view.queryByTestId('sign-in-status')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(SIGN_IN_CALM_AFTER_MS - 1); });
    expect(view.queryByTestId('sign-in-status')).toBeNull();
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(view.getByText('Входим…')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(SIGN_IN_LONG_AFTER_MS - SIGN_IN_CALM_AFTER_MS); });
    expect(view.getByText('Вход занимает больше времени. Можно закрыть это окно — вход продолжится.')).toBeTruthy();
    expect(view.queryByText('Входим…')).toBeNull();
    await view.rerender(<SignInStatusLine active={false} />);
    expect(view.queryByTestId('sign-in-status')).toBeNull();
  });

  it('новая попытка начинает отсчёт заново', async () => {
    const view = await render(<SignInStatusLine active />);
    await act(async () => { jest.advanceTimersByTime(SIGN_IN_CALM_AFTER_MS); });
    expect(view.getByText('Входим…')).toBeTruthy();
    await view.rerender(<SignInStatusLine active={false} />);
    await view.rerender(<SignInStatusLine active />);
    expect(view.queryByTestId('sign-in-status')).toBeNull();
  });

  it('«Меньше движения» не прячет строку', async () => {
    mockReduceMotion = true;
    const view = await render(<SignInStatusLine active />);
    await act(async () => { jest.advanceTimersByTime(SIGN_IN_CALM_AFTER_MS); });
    expect(view.getByText('Входим…')).toBeTruthy();
  });
});

describe('SignInFailureCard', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { mockLang = 'ru'; logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); });

  it('сеть: заголовок, человеческая причина и «Попробовать ещё раз», повтор один при двойном тапе', async () => {
    const onRetry = jest.fn();
    const view = await render(<SignInFailureCard kind="network" onRetry={onRetry} />);
    expect(view.getByText('Не получилось войти')).toBeTruthy();
    expect(view.getByText('Связь пропала. Попробуй ещё раз.')).toBeTruthy();
    await fireEvent.press(view.getByTestId('sign-in-retry'));
    await fireEvent.press(view.getByTestId('sign-in-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('«слишком много попыток» — кнопки повтора нет; без обработчика тоже нет', async () => {
    const tooMany = await render(<SignInFailureCard kind="too_many" onRetry={jest.fn()} />);
    expect(tooMany.getByText('Слишком много попыток подряд. Подожди пару минут и попробуй снова.')).toBeTruthy();
    expect(tooMany.queryByTestId('sign-in-retry')).toBeNull();
    const noHandler = await render(<SignInFailureCard kind="other" />);
    expect(noHandler.queryByTestId('sign-in-retry')).toBeNull();
  });

  it('окно закрыли и «другое» — свои фразы, повтор доступен', async () => {
    const cancelled = await render(<SignInFailureCard kind="cancelled" onRetry={jest.fn()} />);
    expect(cancelled.getByText('Окно входа закрылось без выбора аккаунта. Нажми кнопку ещё раз или выбери другой способ.')).toBeTruthy();
    expect(cancelled.getByTestId('sign-in-retry')).toBeTruthy();
    const other = await render(<SignInFailureCard kind="other" onRetry={jest.fn()} />);
    expect(other.getByText('Вход не завершился. Попробуй ещё раз или выбери другой способ.')).toBeTruthy();
  });

  it('без красного и без рамки: карточка на buttonFill, красные токены и обводки в коде не упоминаются', () => {
    const source = read('components/auth/SignInProgressNote.tsx');
    expect(source).toContain('backgroundColor: g.buttonFill');
    expect(source).not.toMatch(/g\.bad|glass\.bad|borderWidth|borderColor|#FF[0-9A-F]{4}/i);
    expect(source).not.toContain('adjustsFontSizeToFit');
  });
});

describe('тексты состояний входа', () => {
  it('на всех 9 языках непустые и без технических слов', () => {
    for (const lang of LANGS) {
      const texts = [signInCalmText(lang), signInLongText(lang), signInFailureBody('network', lang), signInFailureBody('too_many', lang), signInFailureBody('cancelled', lang), signInFailureBody('other', lang)];
      for (const text of texts) {
        expect(text.length).toBeGreaterThan(5);
        expect(text).not.toMatch(/firebase|server|сервер|error code|native_|\bAPI\b/i);
      }
    }
  });
});
