import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

// зачем (владелец 15.10, D196): голос — один общий дневной счётчик на все микрофоны, без исключений. Кнопка зажатия больше не держит собственный гейт
// (серверная квота «speaking») и обход для авторизованной карточной сессии: гейт и цифра остатка приходят от хозяина через `allowance`.
// Тест держит поведение кнопки: без allowance (Plus / доступ ещё неизвестен) запись стартует; при остатке 0 тап зовёт onSpentPress и запись не стартует.
jest.mock('react-native', () => ({
  Pressable: 'Pressable', Text: 'Text', View: 'View',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style,
  },
}));
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  Easing: { bezier: () => 'ease' },
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => ({ value }),
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
  withSequence: (...values: unknown[]) => values[values.length - 1],
}));
jest.mock('../components/ThemeContext', () => ({
  useTheme: () => ({ theme: { bgSurface: '#111', textMuted: '#777' }, themeMode: 'dark' }),
}));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('../constants/i18n', () => ({ triLang: (_lang: string, values: { en: string }) => values.en }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
// зачем (§SPEECH-NA): кнопка сама спрашивает, есть ли распознаватель на устройстве; здесь считаем «с распознавателем».
jest.mock('../app/speech_device_availability', () => ({
  useSpeechUnavailableOnDevice: () => false,
  speechUnavailableOnDeviceText: () => 'Speech recognition doesn’t work on this device',
}));

import SpeakHoldButton from '../app/flashcards/SpeakHoldButton';

const baseProps = {
  accent: '#0f0', listening: false, label: 'Hold',
  onHoldStart: jest.fn(), onHoldEnd: jest.fn(),
};
const colors = { fill: '#000', ink: '#fff', ring: '#111', plusFill: '#fff', plusInk: '#000', spentFill: '#333', spentInk: '#999' };

beforeEach(() => jest.clearAllMocks());
afterEach(async () => { await cleanup(); });

test('без allowance (Plus или доступ ещё неизвестен) удержание доходит до записи без пейвола', async () => {
  const onHoldStart = jest.fn();
  const onHoldEnd = jest.fn();
  const view = await render(React.createElement(SpeakHoldButton, { ...baseProps, onHoldStart, onHoldEnd }));
  const button = view.getByTestId('fc-speak-hold');
  await fireEvent(button, 'pressIn');
  await fireEvent(button, 'pressOut');
  expect(onHoldStart).toHaveBeenCalledTimes(1);
  expect(onHoldEnd).toHaveBeenCalledTimes(1);
});

test('остаток есть — запись стартует, цифра показана', async () => {
  const onHoldStart = jest.fn();
  const onSpentPress = jest.fn();
  const view = await render(React.createElement(SpeakHoldButton, {
    ...baseProps, onHoldStart, allowance: { remaining: 2, colors, onSpentPress },
  }));
  await fireEvent(view.getByTestId('fc-speak-hold'), 'pressIn');
  expect(onHoldStart).toHaveBeenCalledTimes(1);
  expect(onSpentPress).not.toHaveBeenCalled();
  expect(view.getByTestId('fc-speak-hold-allowance-text', { hidden: true }).props.children).toBe('2');
});

test('остаток 0 — тап зовёт onSpentPress (пейвол), запись и конец записи не вызываются, на значке «PLUS»', async () => {
  const onHoldStart = jest.fn();
  const onHoldEnd = jest.fn();
  const onSpentPress = jest.fn();
  const view = await render(React.createElement(SpeakHoldButton, {
    ...baseProps, onHoldStart, onHoldEnd, allowance: { remaining: 0, colors, onSpentPress },
  }));
  await fireEvent(view.getByTestId('fc-speak-hold'), 'pressIn');
  await fireEvent(view.getByTestId('fc-speak-hold'), 'pressOut');
  expect(onSpentPress).toHaveBeenCalledTimes(1);
  expect(onHoldStart).not.toHaveBeenCalled();
  expect(onHoldEnd).not.toHaveBeenCalled();
  expect(view.getByTestId('fc-speak-hold-allowance-text', { hidden: true }).props.children).toBe('PLUS');
});
