// зачем (ТЗ владельца 11.10, два режима энергии; макет energy-modes-states.html Б1–Б4): режим Б показывает энергию вместо сердечек;
// тряска, «−1» и перекат цифры — только на явное списание за ошибку (lossSeq от Ядра), а не на любое падение energy (полночь, сверка с сервером).
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { withSequence } from 'react-native-reanimated';
import { hapticWarning } from '../hooks/use-haptics';
import EnergyMistakeHud, { ENERGY_MISTAKE_MOTION } from '../components/energy/EnergyMistakeHud';

let mockReduceMotion = false;

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFillObject: {} },
}));
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: { View: 'Animated.View' },
    Easing: { bezier: () => 0 },
    useSharedValue: (initial: number) => React.useRef({ value: initial }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withDelay: (_delay: number, value: unknown) => value,
    withTiming: jest.fn((to: number) => to),
    withSequence: jest.fn((...steps: unknown[]) => steps[steps.length - 1]),
    withRepeat: jest.fn((value: unknown) => value),
    cancelAnimation: jest.fn(),
  };
});
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => mockReduceMotion }));
jest.mock('../hooks/use-haptics', () => ({ hapticWarning: jest.fn(() => Promise.resolve()) }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../components/EnergyIcon', () => ({
  __esModule: true,
  default: (props: { filled: boolean }) => {
    const React = require('react');
    return React.createElement('EnergyIcon', { testID: 'icon', filled: props.filled });
  },
}));

const base = {
  maxEnergy: 5, accent: '#7EF0C8', muted: '#75757A', textColor: '#fff', bad: '#FF6B6B',
  accessibilityLabel: 'Энергия: 3 из 5',
};
const value = () => screen.getByTestId('energy-mistake-hud-value').props.children;

describe('EnergyMistakeHud', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); mockReduceMotion = false; });
  afterEach(() => { jest.useRealTimers(); });

  test('первый кадр: число энергии, без анимации и haptic', async () => {
    await render(<EnergyMistakeHud {...base} energy={3} lossSeq={0} />);
    expect(value()).toBe(3);
    expect(hapticWarning).not.toHaveBeenCalled();
    expect(withSequence).not.toHaveBeenCalled();
  });

  test('падение energy БЕЗ роста lossSeq (полночь, сверка) — цифра сразу, без тряски и haptic', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={2} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={2} />);
    expect(value()).toBe(3);
    expect(hapticWarning).not.toHaveBeenCalled();
    expect(withSequence).not.toHaveBeenCalled();
  });

  test('рост lossSeq: haptic, тряска и «−1» стартуют, цифра меняется через 260 мс по макету', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={0} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={1} />);
    expect(hapticWarning).toHaveBeenCalledTimes(1);
    expect(withSequence).toHaveBeenCalled();
    expect(value()).toBe(4);
    await act(async () => { jest.advanceTimersByTime(ENERGY_MISTAKE_MOTION.numberSwapDelayMs + 10); });
    expect(value()).toBe(3);
  });

  test('две ошибки подряд — две потери', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={0} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={1} />);
    await act(async () => { jest.advanceTimersByTime(300); });
    await view.rerender(<EnergyMistakeHud {...base} energy={2} lossSeq={2} />);
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(hapticWarning).toHaveBeenCalledTimes(2);
    expect(value()).toBe(2);
  });

  test('reduce motion: haptic есть, тряски нет (ни одной последовательности), цифра сразу', async () => {
    mockReduceMotion = true;
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={0} />);
    (withSequence as jest.Mock).mockClear();
    await view.rerender(<EnergyMistakeHud {...base} energy={3} lossSeq={1} />);
    await act(async () => { jest.advanceTimersByTime(5); });
    expect(hapticWarning).toHaveBeenCalledTimes(1);
    expect(withSequence).not.toHaveBeenCalled();
    expect(value()).toBe(3);
  });

  test('сброс lossSeq (новое занятие) — не потеря', async () => {
    const view = await render(<EnergyMistakeHud {...base} energy={4} lossSeq={3} />);
    await view.rerender(<EnergyMistakeHud {...base} energy={5} lossSeq={0} />);
    expect(hapticWarning).not.toHaveBeenCalled();
    expect(value()).toBe(5);
  });

  test('энергия 0 — иконка пустая, цифра красная', async () => {
    await render(<EnergyMistakeHud {...base} energy={0} lossSeq={0} />);
    expect(screen.getByTestId('icon').props.filled).toBe(false);
    expect(value()).toBe(0);
  });

  // зачем (владелец 18.10, без подложки): кольцо-пульс по контуру пилюли снято — последнюю энергию показывает красная цифра.
  test('последняя энергия (1) — цифра красная', async () => {
    await render(<EnergyMistakeHud {...base} energy={1} lossSeq={0} />);
    const style = screen.getByTestId('energy-mistake-hud-value').props.style;
    expect(JSON.stringify(style)).toContain(base.bad);
  });
});
