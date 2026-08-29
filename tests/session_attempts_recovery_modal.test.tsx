/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import SessionAttemptsRecoveryModal from '../components/session_attempts/SessionAttemptsRecoveryModal';

jest.mock('react-native', () => {
  const ReactLocal = require('react');
  const flatten = (style: unknown): Record<string, unknown> => {
    if (!style) return {};
    if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
    return typeof style === 'object' ? style as Record<string, unknown> : {};
  };
  return {
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    Pressable: ({ style, children, ...props }: Record<string, unknown>) => ReactLocal.createElement(
      'Pressable',
      { ...props, style: typeof style === 'function' ? style({ pressed: false }) : style },
      children,
    ),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten,
    },
  };
});

jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      bgCard: '#101710', bgSurface2: '#203028', textPrimary: '#F0F7F2',
      textMuted: '#8AB49A', border: '#333', accent: '#47C870',
      correctText: '#042010', wrong: '#F05454', wrongBg: '#330000',
    },
    f: { h2: 24, bodyLg: 17, body: 15, caption: 13 },
  }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../components/modal_fx/HybridAlertShell', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return ({ visible, children, ...props }: Record<string, unknown>) => visible
    ? ReactLocal.createElement(View, props, children)
    : null;
});

describe('SessionAttemptsRecoveryModal', () => {
  test('is blocking and offers gift, runes, then session exit', async () => {
    const onUseGift = jest.fn();
    const onSpendRunes = jest.fn();
    const onRestartWithEnergy = jest.fn();
    const onEndSession = jest.fn();
    const view = await render(
      <SessionAttemptsRecoveryModal
        visible
        locale="ru"
        giftCount={2}
        runeBalance={100}
        onUseGift={onUseGift}
        onSpendRunes={onSpendRunes}
        onRestartWithEnergy={onRestartWithEnergy}
        restartWithEnergyAvailable
        onEndSession={onEndSession}
      />,
    );

    const modal = view.getByTestId('session-attempts-recovery-modal');
    expect(modal.props.dismissible).toBe(false);
    expect(view.getByText('Попытки закончились')).toBeTruthy();
    expect(view.getByText('Без срока действия')).toBeTruthy();

    const labels = within(modal).getAllByLabelText(/.+/).map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual([
      'Использовать подарок',
      'Восстановить · 25 рун',
      'Начать заново · −1',
      'Завершить сессию',
    ]);

    await fireEvent.press(view.getByLabelText('Использовать подарок'));
    await fireEvent.press(view.getByLabelText('Восстановить · 25 рун'));
    await fireEvent.press(view.getByLabelText('Начать заново · −1'));
    await fireEvent.press(view.getByLabelText('Завершить сессию'));
    expect(onUseGift).toHaveBeenCalledTimes(1);
    expect(onSpendRunes).toHaveBeenCalledTimes(1);
    expect(onRestartWithEnergy).toHaveBeenCalledTimes(1);
    expect(onEndSession).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('session-attempts-restart-energy-asset')).toBeTruthy();
    expect(view.getByText(/−1/)).toBeTruthy();
  });

  test('removes the gift action without leaving a gap and only disables unaffordable runes', async () => {
    const onSpendRunes = jest.fn();
    const onEndSession = jest.fn();
    const view = await render(
      <SessionAttemptsRecoveryModal
        visible
        locale="ru"
        giftCount={0}
        runeBalance={24}
        onUseGift={jest.fn()}
        onSpendRunes={onSpendRunes}
        onRestartWithEnergy={jest.fn()}
        restartWithEnergyAvailable={false}
        onEndSession={onEndSession}
      />,
    );

    expect(view.queryByText('Использовать подарок')).toBeNull();
    expect(view.queryByText('Без срока действия')).toBeNull();
    expect(view.getByText('Нужно ещё 1 руну')).toBeTruthy();

    const runeButton = view.getByLabelText('Восстановить · 25 рун');
    const restartButton = view.getByLabelText('Начать заново · −1');
    const exitButton = view.getByLabelText('Завершить сессию');
    expect(runeButton.props.accessibilityState).toEqual({ disabled: true });
    expect(runeButton.props.onPress).toBeUndefined();
    expect(restartButton.props.accessibilityState).toEqual({ disabled: true });
    expect(restartButton.props.onPress).toBeUndefined();
    expect(exitButton.props.accessibilityState).toEqual({ disabled: false });
    expect(StyleSheet.flatten(runeButton.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(StyleSheet.flatten(exitButton.props.style).minHeight).toBeGreaterThanOrEqual(44);

    await fireEvent.press(exitButton);
    expect(onSpendRunes).not.toHaveBeenCalled();
    expect(onEndSession).toHaveBeenCalledTimes(1);
  });

  test('busy state disables every recovery decision', async () => {
    const view = await render(
      <SessionAttemptsRecoveryModal
        visible
        locale="en"
        giftCount={1}
        runeBalance={100}
        busy
        onUseGift={jest.fn()}
        onSpendRunes={jest.fn()}
        onRestartWithEnergy={jest.fn()}
        restartWithEnergyAvailable
        onEndSession={jest.fn()}
      />,
    );

    for (const button of view.getAllByLabelText(/.+/)) {
      expect(button.props.accessibilityState).toEqual({ disabled: true });
    }
  });
});
