// зачем (владелец 15.10, m08 «Молния» за moments_v3 — «ДА ДЕЛАЙ, НА КОЛЬЦЕ», монету «ОСТАВЛЯЕМ»): удары только на пересечении порогов 3/5/10, обрыв — только из серии ≥ 3;
// плашка «N подряд» и «серия сброшена» на кольце; без флага шапка урока прежняя (кольцо с 3 подряд), модули m08 не загружаются.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const R = jest.requireActual('react');
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement(name, props, props.children as React.ReactNode);
  return {
    View: host('View'),
    Text: host('Text'),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
    NativeModules: {},
  };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0 },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withTiming: (v: unknown) => v,
  };
});
const mockHaptic = { light: jest.fn(() => Promise.resolve()), medium: jest.fn(() => Promise.resolve()), heavy: jest.fn(() => Promise.resolve()) };
jest.mock('../hooks/use-haptics', () => ({ hapticLightImpact: () => mockHaptic.light(), hapticMediumImpact: () => mockHaptic.medium(), hapticHeavyImpact: () => mockHaptic.heavy() }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { accent: '#7EF0C8', accentGraphic: '#7EF0C8', gold: '#FFC800', wrong: '#F05454', textMuted: '#888', textPrimary: '#fff', bgSurface2: '#222', bgCard: '#111' } }) }));
const mockRing = jest.fn();
jest.mock('../components/feedback/ComboRing', () => ({ __esModule: true, default: (props: Record<string, unknown>) => { mockRing(props); return null; } }));

import ComboHeatSlot from '../components/feedback/ComboHeatSlot';
import { deriveComboBeat } from '../components/feedback/combo_moment_gate';
import { COMBO_MOMENT_LANGS, COMBO_MOMENT_STRING_KEYS, comboMomentText } from '../components/feedback/combo_moment_strings';

describe('m08 · удары серии', () => {
  it('пороги 3/5/10 вверх — spark/lightning/storm ровно один раз; обрыв — только из серии ≥ 3', () => {
    expect(deriveComboBeat(2, 3)).toBe('spark');
    expect(deriveComboBeat(3, 4)).toBeNull();
    expect(deriveComboBeat(4, 5)).toBe('lightning');
    expect(deriveComboBeat(9, 10)).toBe('storm');
    expect(deriveComboBeat(10, 11)).toBeNull();
    expect(deriveComboBeat(7, 0)).toBe('break');
    expect(deriveComboBeat(2, 0)).toBeNull();
    expect(deriveComboBeat(0, 0)).toBeNull();
  });
  it('тексты на 9 языках: «N подряд», «серия сброшена»', () => {
    for (const key of COMBO_MOMENT_STRING_KEYS) for (const lang of COMBO_MOMENT_LANGS) expect(comboMomentText(lang, key, 3).length).toBeGreaterThan(0);
    expect(comboMomentText('ru', 'inRow', 5)).toBe('5 подряд');
    expect(comboMomentText('ru', 'broken')).toBe('серия сброшена');
  });
});

describe('m08 · кольцо в шапке', () => {
  beforeEach(() => { jest.useFakeTimers(); mockRing.mockClear(); Object.values(mockHaptic).forEach((f) => f.mockClear()); });
  afterEach(() => jest.useRealTimers());

  it('меньше 3 — пусто; 3 — «3 подряд» акцентом; 5 — тёплый, хаптик medium; 10 — горячий, хаптик heavy', async () => {
    const r = await render(<ComboHeatSlot comboCount={2} lang="ru" />);
    expect(screen.queryByTestId('lesson1-combo-heat')).toBeNull();
    await r.rerender(<ComboHeatSlot comboCount={3} lang="ru" />);
    expect(screen.getByText('3 подряд')).toBeTruthy();
    expect(mockRing).toHaveBeenLastCalledWith(expect.objectContaining({ heatColor: '#7EF0C8' }));
    await r.rerender(<ComboHeatSlot comboCount={4} lang="ru" />);
    await r.rerender(<ComboHeatSlot comboCount={5} lang="ru" />);
    expect(mockRing).toHaveBeenLastCalledWith(expect.objectContaining({ heatColor: '#FFC800' }));
    expect(mockHaptic.medium).toHaveBeenCalledTimes(1);
    for (let n = 6; n <= 10; n += 1) await r.rerender(<ComboHeatSlot comboCount={n} lang="ru" />);
    expect(mockRing).toHaveBeenLastCalledWith(expect.objectContaining({ heatColor: '#F05454' }));
    expect(mockHaptic.heavy).toHaveBeenCalledTimes(1);
  });

  it('ошибка после серии — «серия сброшена» 1,6 с, потом кольцо уходит', async () => {
    const r = await render(<ComboHeatSlot comboCount={6} lang="ru" />);
    await r.rerender(<ComboHeatSlot comboCount={0} lang="ru" />);
    expect(screen.getByText('серия сброшена')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(1700); });
    expect(screen.queryByTestId('lesson1-combo-heat')).toBeNull();
  });
});

describe('m08 · подключение к уроку', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
  it('без флага — прежнее кольцо с 3 подряд; модули m08 только require при флаге', () => {
    expect(src).toContain("const ComboHeatSlot = comboMomentsOn ? (require('../components/feedback/ComboHeatSlot')");
    expect(src).toContain(': comboCount >= 3 && (\n            <ComboRing value={comboCount} level={comboLevelFor(comboCount)} size={34} />');
    expect(src).toContain("const ComboMomentLayer = momentsV3 ? (require('../components/feedback/ComboMomentLayer')");
    expect(src).toContain('{ComboMomentLayer ? <ComboMomentLayer comboCount={comboCount} /> : null}');
    expect(src).not.toMatch(/^import .*(ComboHeatSlot|ComboMomentLayer)/m);
  });
});
