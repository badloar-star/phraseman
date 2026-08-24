import React from 'react';
import { render } from '@testing-library/react-native';

import HomeRuneBalance from '../components/home/HomeRuneBalance';

// зачем (2026-08-24): общий tests/__mocks__/react-native.js подключён через
// moduleNameMapper и отдаёт только Platform/AsyncStorage/AppState — ни
// StyleSheet, ни View, ни Text. `jest.unmock` тут бессилен: это подмена пути
// модуля, а не мок. Поэтому даём локальную заглушку с нужным минимумом — тем же
// приёмом, что рабочий tests/max_tutor_live_components.test.tsx. Расширять
// общую заглушку нельзя: на ней висят сотни тестов.
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => (Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style),
  },
}));

jest.mock('expo-image', () => {
  const ReactModule = jest.requireActual('react');
  return {
    Image: (props: Record<string, unknown>) => ReactModule.createElement('Image', props),
  };
});

describe('HomeRuneBalance', () => {
  it('actually renders the rune image and its live numeric value as one accessible group', async () => {
    const view = await render(
      <HomeRuneBalance balance={17} color="#F6E3A1" accessibilityLabel="Баланс: 17 рун" />,
    );

    expect(view.getByTestId('home-runes-balance')).toBeTruthy();
    expect(view.getByTestId('home-rune-asset', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByText('17')).toBeTruthy();
    expect(view.getByLabelText('Баланс: 17 рун')).toBeTruthy();

    await view.rerender(
      <HomeRuneBalance
        balance={Number.MAX_SAFE_INTEGER}
        color="#F6E3A1"
        accessibilityLabel="Баланс: много рун"
      />,
    );
    const compactValue = view.getByTestId('home-rune-balance-value').props.children;
    expect(String(compactValue).length).toBeLessThanOrEqual(6);
    expect(String(compactValue)).not.toBe(String(Number.MAX_SAFE_INTEGER));
  });

  // зачем: чип рун вне Главной (RuneBalanceChip) отдаёт свою группу доступности
  // обёртке-кнопке. Без этого скринридер находил ДВА фокусируемых элемента на
  // одном счётчике и читал баланс дважды.
  it('gives up its own accessibility group when nested in a button', async () => {
    const view = await render(
      <HomeRuneBalance
        testID="nested-runes"
        balance={5}
        color="#F6E3A1"
        standaloneA11y={false}
        accessibilityLabel="Баланс: 5 рун"
      />,
    );

    const node = view.getByTestId('nested-runes', { includeHiddenElements: true });
    expect(node.props.accessible).toBe(false);
    expect(node.props.accessibilityLabel).toBeUndefined();
  });

  // зачем: плотные строки (шапка Арены, карточка «Цель лиги») не могут отдать
  // 46pt резерва под тап-цель — он раздувал строку и толкал соседей вниз.
  it('drops the 46pt tap-target reserve when asked', async () => {
    const withReserve = await render(
      <HomeRuneBalance testID="a" balance={1} color="#fff" accessibilityLabel="a" />,
    );
    const compact = await render(
      <HomeRuneBalance
        testID="b"
        balance={1}
        color="#fff"
        reserveTapHeight={false}
        accessibilityLabel="b"
      />,
    );

    const flatten = (style: unknown): Record<string, unknown> => (Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : (style as Record<string, unknown>) ?? {});

    expect(flatten(withReserve.getByTestId('a').props.style).minHeight).toBe(46);
    expect(flatten(compact.getByTestId('b').props.style).minHeight).toBeUndefined();
  });
});
