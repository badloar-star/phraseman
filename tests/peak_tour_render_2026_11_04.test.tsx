// зачем (тур первого входа в Пик, 04.11): живой прогон оверлея на моках — три страницы, «Далее»/«Пропустить»/«Начать», окна и стрелки, Reduce Motion.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
const mockReduce = { value: false };
jest.mock('react-native-reanimated', () => {
  const chain = () => { const c: Record<string, unknown> = {}; c.duration = () => c; c.easing = () => c; return c; };
  return {
    __esModule: true,
    default: { View: 'View', createAnimatedComponent: (c: unknown) => c },
    Easing: { out: (f: unknown) => f, inOut: (f: unknown) => f, cubic: 'cubic' },
    FadeIn: chain(), FadeInDown: chain(),
    useReducedMotion: () => mockReduce.value,
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withDelay: (_d: number, a: unknown) => a, withRepeat: (a: unknown) => a, withSequence: (...a: unknown[]) => a[0], withTiming: (to: number) => to,
    cancelAnimation: () => undefined,
  };
});
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Defs: 'Defs', Mask: 'Mask', Rect: 'Rect' }));
// зачем (сторож perf_freeze_contract): стрелки тура стоят, пока экран не в фокусе или приложение в фоне — хук активности подменён «активно»
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../components/v2/ShadowSurface', () => ({ useShadowGlass: () => ({ scrim: 'rgba(0,0,0,0.6)', opaqueCard: '#151517' }) }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({ text: '#fff', textSecondary: '#bbb', control: '#222', cta: '#eee', ctaText: '#000', correct: '#4c8' }) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../components/v2/V2Pressable', () => ({
  __esModule: true,
  default: (props: { testID?: string; onPress?: () => void; children?: unknown }) => require('react').createElement('Pressable', { testID: props.testID, onPress: props.onPress }, props.children),
}));

/* eslint-disable import/first -- моки подняты выше */
import PeakTour from '../components/spire/peak/PeakTour';
import type { PeakTourRects } from '../components/spire/peak/peak_tour_core';
/* eslint-enable import/first */

const R = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const RECTS: PeakTourRects = { head: R(166, 110, 190, 80), pill: R(166, 150, 190, 40), rail: R(2, 120, 150, 600), top: R(154, 300, 240, 250) };

describe('PeakTour — прогон', () => {
  beforeEach(() => { mockReduce.value = false; });

  it('три страницы: «Далее» ×2 → «Начать»; на последней нет «Пропустить»; «Начать» закрывает тур', async () => {
    const onDone = jest.fn();
    await render(<PeakTour lang="ru" rankBy="coins" rects={RECTS} topCount={5} upCount={5} onDone={onDone} />);
    expect(screen.getByTestId('peak-tour-card-1')).toBeTruthy();
    expect(screen.getByTestId('peak-tour-skip')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('peak-tour-next'));
    expect(screen.getByTestId('peak-tour-card-2')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('peak-tour-next'));
    expect(screen.getByTestId('peak-tour-card-3')).toBeTruthy();
    expect(screen.queryByTestId('peak-tour-skip')).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('peak-tour-next'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('«Пропустить» на любой странице закрывает тур', async () => {
    const onDone = jest.fn();
    await render(<PeakTour lang="en" rankBy="steps" rects={RECTS} topCount={5} upCount={3} onDone={onDone} />);
    await fireEvent.press(screen.getByTestId('peak-tour-next'));
    await fireEvent.press(screen.getByTestId('peak-tour-skip'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('dev-съёмка: initialPage=2 открывает сразу третью страницу', async () => {
    await render(<PeakTour lang="ru" rankBy="coins" rects={RECTS} topCount={5} upCount={5} initialPage={2} onDone={jest.fn()} />);
    expect(screen.getByTestId('peak-tour-card-3')).toBeTruthy();
  });

  it('Reduce Motion: тур всё равно показывается и проходится (без входных анимаций)', async () => {
    mockReduce.value = true;
    const onDone = jest.fn();
    await render(<PeakTour lang="vi" rankBy="coins" rects={RECTS} topCount={5} upCount={5} initialPage={2} onDone={onDone} />);
    await fireEvent.press(screen.getByTestId('peak-tour-next'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
