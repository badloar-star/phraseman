// зачем (владелец 15.10, m08 «Молния» за moments_v3 — «ДА ДЕЛАЙ, НА КОЛЬЦЕ», монету «ОСТАВЛЯЕМ»): удары только на пересечении порогов 3/5/10, обрыв — только из серии ≥ 3;
// плашка «N подряд» и «серия сброшена» на кольце; без флага шапка урока прежняя (кольцо с 3 подряд), модули m08 не загружаются.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, act, within } from '@testing-library/react-native';

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
    default: { View, createAnimatedComponent: () => View },
    Easing: { bezier: () => () => 0 },
    useAnimatedProps: (fn: () => unknown) => fn(),
    withDelay: (_d: number, v: unknown) => v,
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

jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Defs: 'Defs', Path: 'Path', RadialGradient: 'RadialGradient', Rect: 'Rect', Stop: 'Stop' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: (props: Record<string, unknown>) => jest.requireActual('react').createElement('MomentCoin', props) }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => 5 }));
jest.mock('../components/streak/moments/use_streak_colors', () => ({ useStreakColors: () => ({ second: '#88f' }) }));
jest.mock('../modules/sound_v2/sound_v2_flag', () => ({ isSoundV2Enabled: () => false }));

import ComboHeatSlot from '../components/feedback/ComboHeatSlot';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import ComboMomentLayer from '../components/feedback/ComboMomentLayer';
import { deriveComboBeat } from '../components/feedback/combo_moment_gate';
import { COMBO_MOMENT_LANGS, COMBO_MOMENT_STRING_KEYS, comboMomentText } from '../components/feedback/combo_moment_strings';
import { glueNumbers } from '../components/moments/glue_numbers'; // зачем (18.10): тексты моментов склеивают число со словом неразрывным пробелом

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
    expect(comboMomentText('ru', 'inRow', 5)).toBe(glueNumbers('5 подряд'));
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
    // зачем (Макеты 8c04f47db: нагрев не виден): пороги эталона из токенов темы (мок темы без id → graphite); кольцо залито целиком
    const g = liquidGlassTokens(undefined as never);
    expect(mockRing).toHaveBeenLastCalledWith(expect.objectContaining({ heatColor: g.accentGraphic, heatNumberColor: g.accentTextSafe, heatFull: true }));
    await r.rerender(<ComboHeatSlot comboCount={4} lang="ru" />);
    await r.rerender(<ComboHeatSlot comboCount={5} lang="ru" />);
    expect(mockRing).toHaveBeenLastCalledWith(expect.objectContaining({ heatColor: g.warn, heatNumberColor: g.warn, heatFull: true }));
    expect(mockHaptic.medium).toHaveBeenCalledTimes(1);
    for (let n = 6; n <= 10; n += 1) await r.rerender(<ComboHeatSlot comboCount={n} lang="ru" />);
    expect(mockRing).toHaveBeenLastCalledWith(expect.objectContaining({ heatColor: g.bad, heatNumberColor: g.bad, heatFull: true }));
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

// зачем (координатор 18.10, вариант «а»): монету решает слой, а рисует шапка (справа от плашки «N подряд») — проверяем их вместе, как в уроке
const Pair = ({ n }: { n: number }) => (<>
  <ComboMomentLayer comboCount={n} />
  <ComboHeatSlot comboCount={n} lang="ru" />
</>);

describe('m08 · быстрые ответы подряд не оставляют залипших окон (Ревизор 15.10)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('монета: 4 → 5 (выглядывает) → 6 сразу же — через 1,8 с монеты нет', async () => {
    const r = await render(<Pair n={4} />);
    await r.rerender(<Pair n={5} />);
    expect(screen.getByTestId('lesson1-combo-coin')).toBeTruthy();
    await r.rerender(<Pair n={6} />);
    await r.rerender(<Pair n={7} />);
    await act(async () => { jest.advanceTimersByTime(1900); });
    expect(screen.queryByTestId('lesson1-combo-coin')).toBeNull();
  });

  it('монета: обрыв 6 → 0 и сразу верный 0 → 1 — монета уходит по таймеру', async () => {
    const r = await render(<Pair n={6} />);
    await r.rerender(<Pair n={0} />);
    expect(screen.getByTestId('lesson1-combo-coin')).toBeTruthy();
    await r.rerender(<Pair n={1} />);
    await act(async () => { jest.advanceTimersByTime(1900); });
    expect(screen.queryByTestId('lesson1-combo-coin')).toBeNull();
  });

  it('монета стоит в шапке справа от плашки, а не под шапкой (top:118) поверх задания', async () => {
    const r = await render(<Pair n={4} />);
    await r.rerender(<Pair n={5} />);
    const heat = screen.getByTestId('lesson1-combo-heat');
    expect(within(heat).getByTestId('lesson1-combo-coin')).toBeTruthy();
    expect(within(screen.getByTestId('lesson1-combo-layer')).queryByTestId('lesson1-combo-coin')).toBeNull();
    expect(fs.readFileSync(path.join(__dirname, '..', 'components/feedback/ComboMomentLayer.tsx'), 'utf8')).not.toContain('top: 118');
  });

  it('«серия сброшена»: обрыв и сразу два верных — надпись уходит через 1,6 с', async () => {
    const r = await render(<ComboHeatSlot comboCount={6} lang="ru" />);
    await r.rerender(<ComboHeatSlot comboCount={0} lang="ru" />);
    expect(screen.getByText('серия сброшена')).toBeTruthy();
    await r.rerender(<ComboHeatSlot comboCount={1} lang="ru" />);
    await r.rerender(<ComboHeatSlot comboCount={2} lang="ru" />);
    await act(async () => { jest.advanceTimersByTime(1700); });
    expect(screen.queryByText('серия сброшена')).toBeNull();
    expect(screen.queryByTestId('lesson1-combo-heat')).toBeNull();
  });
});

describe('m08 · подключение к уроку', () => {
  // зачем (координатор 15.10): сторож падал у одних сессий и проходил у других — рабочая копия lesson1.tsx на Windows
  // бывает с CRLF, а ожидание содержит '\n'. Смысл тот же (без флага — прежнее кольцо), переводы строк не важны.
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8').replace(/\r\n/g, '\n');
  it('без флага — прежнее кольцо с 3 подряд; модули m08 только require при флаге', () => {
    expect(src).toContain("const ComboHeatSlot = comboMomentsOn ? (require('../components/feedback/ComboHeatSlot')");
    expect(src).toContain(': comboCount >= 3 && (\n            <ComboRing value={comboCount} level={comboLevelFor(comboCount)} size={34} />');
    expect(src).toContain("const ComboMomentLayer = momentsV3 ? (require('../components/feedback/ComboMomentLayer')");
    expect(src).toContain('{ComboMomentLayer ? <ComboMomentLayer comboCount={comboCount} /> : null}');
    expect(src).not.toMatch(/^import .*(ComboHeatSlot|ComboMomentLayer)/m);
  });
});
