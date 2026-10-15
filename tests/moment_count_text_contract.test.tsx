// зачем (координатор 15.10, аудит скорости окон моментов): счётчики «+монеты» (этаж) и «время шага» раньше жили в состоянии родителя на setInterval 40 мс и
// перерисовывали целое окно ~25 раз/с. CountText держит интервал и число у себя. Сторож: кривая та же, reduceMotion — сразу финальное число,
// нет обновлений после размонтирования, а оба окна берут число из CountText, а не из своего состояния.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));

// eslint-disable-next-line import/first
import CountText from '../components/spire/moments/CountText';

const plus = (n: number): string => `+${n}`;
const text = (): unknown => screen.getByTestId('c').props.children;

describe('CountText', () => {
  let setIntervalSpy: jest.SpyInstance;
  let clearIntervalSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
  });
  afterEach(() => { setIntervalSpy.mockRestore(); clearIntervalSpy.mockRestore(); jest.useRealTimers(); });

  it('reduceMotion: сразу финальное число, таймеры не заводятся', async () => {
    await render(<CountText to={40} delayMs={1100} durationMs={900} reduceMotion format={plus} testID="c" />);
    expect(text()).toBe('+40');
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('начинает с 0, до метки не меняется, досчитывает до цели по кривой 1-(1-t)^3', async () => {
    await render(<CountText to={40} delayMs={1100} durationMs={900} reduceMotion={false} format={plus} testID="c" />);
    expect(text()).toBe('+0');
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(text()).toBe('+0');
    await act(async () => { jest.advanceTimersByTime(100 + 400); }); // метка 1100 + 400 мс счёта: t = 0.444, 1-(0.556)^3 = 0.828 -> 33
    expect(text()).toBe('+33');
    await act(async () => { jest.advanceTimersByTime(600); });
    expect(text()).toBe('+40');
  });

  it('после размонтирования таймеров не остаётся (нет setState в пустоту)', async () => {
    await render(<CountText to={40} delayMs={100} durationMs={900} reduceMotion={false} format={plus} testID="c" />);
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});

describe('окна берут число из CountText, а не из своего состояния', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('этаж: нет setCounted/setInterval, есть CountText с меткой сценария', () => {
    const src = read('components/spire/moments/SpireFloorMoment.tsx');
    expect(src).not.toMatch(/setCounted|setInterval/);
    expect(src).toMatch(/<CountText to=\{reward\} delayMs=\{FLOOR_MOMENT_TIMELINE\.count\} durationMs=\{FLOOR_MOMENT_TIMELINE\.countMs\}/);
  });
  it('итог шага: нет setShownMs/setInterval, есть CountText с меткой сценария', () => {
    const src = read('components/spire/moments/SpireStepResultMoment.tsx');
    expect(src).not.toMatch(/setShownMs|setInterval/);
    expect(src).toMatch(/<CountText to=\{outcome\.usedMs\} delayMs=\{STEP_MOMENT_TIMELINE\.ring\} durationMs=\{STEP_MOMENT_TIMELINE\.ringMs\}/);
  });
});
