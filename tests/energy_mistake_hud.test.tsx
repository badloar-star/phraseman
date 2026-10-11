// зачем (ТЗ владельца 11.10, два режима энергии): режим Б показывает энергию вместо сердечек; shake и «−1» только на явное списание
// за ошибку (lossSeq от Ядра), а не на любое падение energy (полночь, сверка с сервером).
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import { hapticWarning } from '../hooks/use-haptics';
import EnergyMistakeHud from '../components/energy/EnergyMistakeHud';

let mockReduceMotion = false;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
}));
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: { View: 'Animated.View' },
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: jest.fn((to: number) => to),
    cancelAnimation: jest.fn(),
  };
});
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => mockReduceMotion }));
jest.mock('../hooks/use-haptics', () => ({ hapticWarning: jest.fn(() => Promise.resolve()) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../components/EnergyIcon', () => ({
  __esModule: true,
  default: (props: { shouldShake?: boolean; filled: boolean }) => {
    const React = require('react');
    return React.createElement('EnergyIcon', { testID: 'icon', shouldShake: props.shouldShake, filled: props.filled });
  },
}));
jest.mock('../components/energy/AnimatedEnergyNumber', () => ({
  AnimatedEnergyNumber: (props: { value: number }) => {
    const React = require('react');
    return React.createElement('EnergyNumber', { testID: 'num', value: props.value });
  },
}));

const base = { maxEnergy: 5, color: '#fff', lossColor: '#f55', accessibilityLabel: 'Энергия: 3 из 5' };

describe('EnergyMistakeHud', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); mockReduceMotion = false; });
  afterEach(() => { jest.useRealTimers(); });

  test('первый кадр: число энергии без потери, shake выключен, haptic молчит', async () => {
    await render(<EnergyMistakeHud {...base} energy={3} lossSeq={0} />);
    expect(screen.getByTestId('num').props.value).toBe(3);
    expect(screen.getByTestId('icon').props.shouldShake).toBe(false);
    expect(hapticWarning).not.toHaveBeenCalled();
  });

  test('падение energy БЕЗ роста lossSeq (полночь, сверка) — без shake и haptic', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={2} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={2} />);
    expect(screen.getByTestId('icon').props.shouldShake).toBe(false);
    expect(hapticWarning).not.toHaveBeenCalled();
  });

  test('рост lossSeq: shake иконки, haptic, «−1» стартует; shake гаснет по таймеру', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={0} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={1} />);
    expect(screen.getByTestId('icon').props.shouldShake).toBe(true);
    expect(hapticWarning).toHaveBeenCalledTimes(1);
    expect(withTiming).toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(screen.getByTestId('icon').props.shouldShake).toBe(false);
  });

  test('две ошибки подряд — две потери, анимация перезапускается', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={0} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={1} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={2} lossSeq={2} />);
    expect(hapticWarning).toHaveBeenCalledTimes(2);
    expect(cancelAnimation).toHaveBeenCalled();
  });

  test('reduce motion: без shake и подъёма, «−1» только растворяется', async () => {
    mockReduceMotion = true;
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={0} />);
    (withTiming as jest.Mock).mockClear();
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={1} />);
    expect(screen.getByTestId('icon').props.shouldShake).toBe(false);
    // растворение «−1» — единственная анимация; подъёма (translateY) нет
    expect(withTiming).toHaveBeenCalledTimes(1);
  });

  test('сброс lossSeq (новое занятие) — не потеря', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={3} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={5} lossSeq={0} />);
    expect(screen.getByTestId('icon').props.shouldShake).toBe(false);
    expect(hapticWarning).not.toHaveBeenCalled();
  });

  test('энергия 0 — иконка пустая', async () => {
    await render(<EnergyMistakeHud {...base} energy={0} lossSeq={0} />);
    expect(screen.getByTestId('icon').props.filled).toBe(false);
  });
});
