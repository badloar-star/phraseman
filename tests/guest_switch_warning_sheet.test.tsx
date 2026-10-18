/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

// зачем (координатор 18.10, шторка «Войти в другой аккаунт?», макет b973ac57d): обе кнопки на месте, «Войти» после тапа сразу неактивна и вход зовётся один раз,
// «Отмена» и смахивание (закрытие оболочки) дают ровно один onCancel, после «Войти» закрытие жестом ничего не отменяет; журнал [AUTH-SWITCH-SHEET].
// зачем: общий двойник react-native в этом проекте без StyleSheet/View/Text/Pressable — переопределения слоем поверх настоящего модуля (как в session_attempts_hud.test)
jest.mock('react-native', () => Object.setPrototypeOf({
  Platform: { OS: 'ios', select: (values: Record<string, unknown>) => values.ios ?? values.default },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: {
    absoluteFillObject: { position: 'absolute', inset: 0 },
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style),
  },
}, jest.requireActual('react-native')));

let mockShellProps: Record<string, any> = {};

jest.mock('../components/modal_fx/HybridSheetShell', () => {
  const ReactActual = require('react');
  return {
    __esModule: true,
    default: (props: any) => {
      mockShellProps = props;
      return props.visible
        ? ReactActual.createElement('View', { testID: props.testID }, props.children({ requestDismiss: () => props.onClose() }))
        : null;
    },
  };
});
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'test' }) }));
jest.mock('../constants/liquidGlassThemePalette', () => ({
  liquidGlassTokens: () => ({
    opaqueControl: '#222429', text: '#FFFFFF', secondary: '#B8B9BD', ctaFill: '#F2F1F6', ctaFillInk: '#0B0C0E', buttonFill: '#2E2E32', accent: '#F2F1F6',
  }),
}));
jest.mock('../components/v2/ShadowSurface', () => ({ actionBoxShadow: () => [], nestedBoxShadow: () => [] }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));

import GuestSwitchWarningSheet from '../components/auth/GuestSwitchWarningSheet';

const flush = async () => { await Promise.resolve(); };

async function mountSheet(extra: Partial<React.ComponentProps<typeof GuestSwitchWarningSheet>> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const view = await render(<GuestSwitchWarningSheet visible accountLabel="a@b.c" onConfirm={onConfirm} onCancel={onCancel} {...extra} />);
  await flush();
  return { view, onConfirm, onCancel };
}

describe('GuestSwitchWarningSheet', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => { logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { logSpy.mockRestore(); });
  const logs = () => logSpy.mock.calls.map((call) => call.join(' '));

  it('рисует заголовок, текст и обе кнопки из guestSignInOtherAccountCopy', async () => {
    const { view } = await mountSheet();
    expect(view.getByText('Войти в другой аккаунт?')).toBeTruthy();
    expect(view.getByText('Прогресс на этом телефоне не привязан к аккаунту и пропадёт.')).toBeTruthy();
    expect(view.getByTestId('guest-switch-confirm')).toBeTruthy();
    expect(view.getByTestId('guest-switch-cancel')).toBeTruthy();
    expect(view.getByText('Войти')).toBeTruthy();
    expect(view.getByText('Отмена')).toBeTruthy();
    expect(logs().some((line) => line.includes('[AUTH-SWITCH-SHEET]') && line.includes('show'))).toBe(true);
    // имя аккаунта в журнал не попадает
    expect(logs().some((line) => line.includes('a@b.c'))).toBe(false);
  });

  it('«Войти»: один вызов onConfirm, двойной тап гасится, кнопки сразу неактивны, смахивание после входа не отменяет', async () => {
    const { view, onConfirm, onCancel } = await mountSheet();
    await fireEvent.press(view.getByTestId('guest-switch-confirm'));
    await fireEvent.press(view.getByTestId('guest-switch-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('guest-switch-confirm').props.accessibilityState).toMatchObject({ disabled: true });
    expect(view.getByTestId('guest-switch-cancel').props.accessibilityState).toMatchObject({ disabled: true });
    expect(mockShellProps.dismissDisabled).toBe(true);
    // поздний жест закрытия оболочки после входа не превращается в «Отмена»
    await act(async () => { mockShellProps.onClose(); });
    expect(onCancel).not.toHaveBeenCalled();
    expect(logs().some((line) => line.includes('choice') && line.includes('confirm'))).toBe(true);
  });

  it('«Отмена» кнопкой: ровно один onCancel, журнал называет путь «button»', async () => {
    const { view, onConfirm, onCancel } = await mountSheet();
    await fireEvent.press(view.getByTestId('guest-switch-cancel'));
    await fireEvent.press(view.getByTestId('guest-switch-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(logs().some((line) => line.includes('choice') && line.includes('"via":"button"'))).toBe(true);
  });

  it('смахивание вниз (закрытие оболочки) = «Отмена»', async () => {
    const { onConfirm, onCancel } = await mountSheet();
    await act(async () => { mockShellProps.onClose(); });
    await act(async () => { mockShellProps.onClose(); });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(logs().some((line) => line.includes('choice') && line.includes('swipe_or_backdrop'))).toBe(true);
  });

  it('новый показ после закрытия снова активен', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const view = await render(<GuestSwitchWarningSheet visible onConfirm={onConfirm} onCancel={onCancel} />);
    await fireEvent.press(view.getByTestId('guest-switch-confirm'));
    await view.rerender(<GuestSwitchWarningSheet visible={false} onConfirm={onConfirm} onCancel={onCancel} />);
    await view.rerender(<GuestSwitchWarningSheet visible onConfirm={onConfirm} onCancel={onCancel} />);
    await flush();
    await fireEvent.press(view.getByTestId('guest-switch-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
