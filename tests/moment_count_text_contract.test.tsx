// зачем (координатор 15.10, аудит скорости окон моментов; UX-приятности 04.11): счётчики «+монеты» (этаж) и «время шага» раньше жили в родителе
// (setInterval → setState, окно перерисовывалось ~25 раз/с), потом в CountText (JS в кадрах). Теперь число рисует UI-поток (AnimatedCountUpText),
// формат — описание, а не функция. Сторож: формат («+N», «м:сс», знаки) считается верно, reduceMotion/кривая/метка сценария доходят до UI-счётчика,
// ширину держит скрытый Text с финальным числом, а окна берут число из CountText и не заводят таймеры.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));

const mockTiming: unknown[] = [];
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: (component: unknown) => component },
  Easing: { out: (fn: unknown) => ({ out: fn }), cubic: 'cubic' },
  useAnimatedProps: () => ({}),
  useReducedMotion: () => false,
  useSharedValue: (initial: number) => ({ value: initial }),
  withDelay: (ms: number, anim: unknown) => ({ delay: ms, anim }),
  withTiming: (to: number, config: unknown) => { const a = { to, config }; mockTiming.push(a); return a; },
  cancelAnimation: () => undefined,
}));

/* eslint-disable import/first -- моки подняты выше */
import { formatCountValue } from '../components/count_format';
import CountText from '../components/spire/moments/CountText';
/* eslint-enable import/first */

describe('formatCountValue — формат считается на UI-потоке по описанию', () => {
  it('целые с префиксом/суффиксом, отрицательное не показываем, дробные — знаки после запятой', () => {
    expect(formatCountValue(33.4, { prefix: '+' })).toBe('+33');
    expect(formatCountValue(-5)).toBe('0');
    expect(formatCountValue(40)).toBe('40');
    expect(formatCountValue(1.85, { prefix: '×', decimals: 2 })).toBe('×1.85');
    expect(formatCountValue(12, { suffix: ' ч' })).toBe('12 ч');
  });
  it('«м:сс» из миллисекунд — как spireClock: секунды вверх, ноль с запасом', () => {
    expect(formatCountValue(0, { clock: true })).toBe('0:00');
    expect(formatCountValue(1, { clock: true })).toBe('0:01');
    expect(formatCountValue(59_001, { clock: true })).toBe('1:00');
    expect(formatCountValue(125_000, { clock: true })).toBe('2:05');
    expect(formatCountValue(-10, { clock: true })).toBe('0:00');
  });
});

describe('CountText', () => {
  beforeEach(() => { mockTiming.length = 0; });

  it('число рисует UI-счётчик: цель, метка сценария, кривая, формат и reduceMotion доходят до него; ширину держит скрытый Text с финальным числом', async () => {
    await render(<CountText to={40} delayMs={1100} durationMs={900} reduceMotion={false} format={{ prefix: '+' }} testID="c" />);
    expect(screen.getByTestId('c')).toBeTruthy(); // UI-счётчик (TextInput)
    expect(screen.getByText('+40', { includeHiddenElements: true })).toBeTruthy(); // скрытый размерный Text с финальным числом
    expect(mockTiming[0]).toMatchObject({ to: 40, config: { duration: 900, easing: { out: 'cubic' } } });
  });

  it('reduceMotion: счёта нет вовсе, число сразу финальное', async () => {
    await render(<CountText to={40} delayMs={1100} durationMs={900} reduceMotion format={{ prefix: '+' }} testID="c" />);
    expect(mockTiming).toHaveLength(0);
    expect(screen.getByText('+40', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('окна берут число из CountText, без таймеров и состояния', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('CountText: ни setInterval, ни setState, ни функции-формата из родителя', () => {
    const src = read('components/spire/moments/CountText.tsx').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/setInterval|setTimeout|useState|useEffect/);
    expect(src).toContain('<AnimatedCountUpText');
  });
  it('этаж: нет setCounted/setInterval, есть CountText с меткой сценария и форматом-описанием', () => {
    const src = read('components/spire/moments/SpireFloorMoment.tsx');
    expect(src).not.toMatch(/setCounted|setInterval/);
    expect(src).toMatch(/<CountText to=\{reward\} delayMs=\{FLOOR_MOMENT_TIMELINE\.count\} durationMs=\{FLOOR_MOMENT_TIMELINE\.countMs\}/);
    expect(src).toContain("const plusFormat = { prefix: '+' } as const;");
  });
  it('итог шага: нет setShownMs/setInterval, есть CountText с меткой сценария и форматом «м:сс»', () => {
    const src = read('components/spire/moments/SpireStepResultMoment.tsx');
    expect(src).not.toMatch(/setShownMs|setInterval/);
    expect(src).toMatch(/<CountText to=\{outcome\.usedMs\} delayMs=\{STEP_MOMENT_TIMELINE\.ring\} durationMs=\{STEP_MOMENT_TIMELINE\.ringMs\}/);
    expect(src).toContain('format={CLOCK_FORMAT}');
  });
  it('статистика: число растёт от прежнего, с нуля — только первый показ', () => {
    const src = read('components/stats/StatCountUpText.tsx');
    expect(src).toContain('const startedRef = React.useRef(false);');
    expect(src).toContain('if (!startedRef.current) {');
  });
});
