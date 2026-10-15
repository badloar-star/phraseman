// зачем (координатор 15.10, m10 «Итог урока — семь ударов» за moments_v3): гейт показа (флаг/комбо/счёт/звёзды), строки серии и «Сегодня» не выдумывают переходов,
// и главное — без chain (флаг выключен) V2DoneScreen рисуется ровно прежним и даже не загружает модуль цепочки.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const R = jest.requireActual('react');
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement(name, props, props.children as React.ReactNode);
  return {
    View: host('View'),
    Text: host('Text'),
    Pressable: (props: Record<string, unknown>) => R.createElement('Pressable', props, typeof props.children === 'function' ? (props.children as (s: { pressed: boolean }) => React.ReactNode)({ pressed: false }) : props.children),
    ScrollView: host('ScrollView'),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
    Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
    Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
    NativeModules: {},
  };
});
let mockReduced = true;
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0 },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => mockReduced,
    withDelay: (_d: number, v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: (props: { name: string }) => jest.requireActual('react').createElement('Icon', props) }));
jest.mock('expo-image', () => ({ Image: 'Image' }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/learning-v2/LearningV2Glass', () => ({
  useLv2Glass: () => ({ bg: '#000', text: '#fff', secondary: '#aaa', mutedText: '#999', good: '#0f0', bad: '#f00', opaqueCard: '#111', opaqueControl: '#222', opaqueSheet: '#222', plateFillFrom: '#111', dividerTone: '#333', cta: '#fff', ctaInk: '#000' }),
}));
jest.mock('../components/home/homeRuneAsset', () => ({ HOME_RUNE_ICON_SOURCE: 1 }));
jest.mock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => 'none', nestedBoxShadow: () => 'none' }));
jest.mock('../components/v2/V2Glass', () => ({ V2IconTile: 'V2IconTile' }));
jest.mock('../components/streak/moments/use_streak_colors', () => ({ useStreakColors: () => ({ accent: '#7EF0C8', accentGraphic: '#7EF0C8', second: '#88f', gold: '#fc0', text: '#fff' }) }));
jest.mock('../app/runes_system', () => ({ peekRunes: () => 7004 }));
jest.mock('../app/app_snapshot_store', () => ({ subscribeAppSnapshot: () => () => undefined }));
jest.mock('../constants/runes', () => ({ runeWord: () => 'монет' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticLightImpact: jest.fn(() => Promise.resolve()), hapticMediumImpact: jest.fn(() => Promise.resolve()), hapticSuccess: jest.fn(() => Promise.resolve()) }));
jest.mock('../modules/sound_v2/sound_v2_flag', () => ({ isSoundV2Enabled: () => false }));
jest.mock('../app/flashcards/SoundService', () => ({ playSfx: jest.fn() }));
jest.mock('../components/streak/moments/streak_moments_strings', () => ({ streakDayWord: (_l: string, n: number) => (n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'дня' : 'дней') }));

const mockStreak: { v: { dayKey: string; counted: boolean; days: number } | null } = { v: null };
jest.mock('../app/streak_day_signal', () => ({ peekStreakDayState: () => mockStreak.v, subscribeStreakDayState: () => () => undefined }));
const mockToday: { v: unknown } = { v: null };
jest.mock('../modules/today-tasks/today_tasks_store', () => ({ peekTodayTasks: () => mockToday.v, subscribeTodayTasks: () => () => undefined }));
jest.mock('../modules/today-tasks/today_tasks_view', () => ({ todayTasksToView: (state: { tasks: { kind: string }[] }) => state.tasks.map((t) => ({ kind: t.kind, title: 'Пройти урок' })) }));
jest.mock('../modules/today-tasks/today_tasks_core', () => ({
  TODAY_TASK_RULES: { lesson: { target: 1, unitsPerStep: 1 } },
  todayTaskProgress: (t: { units: number }) => Math.min(1, t.units),
}));

const mockChainLoaded = jest.fn();
jest.mock('../components/completion/V2DoneChain', () => {
  mockChainLoaded();
  return jest.requireActual('../components/completion/V2DoneChain');
});

import V2DoneScreen from '../components/completion/V2DoneScreen';
import { decideDoneChain, deriveStreakRow, deriveTodayRow, doneChainBeatAt, DONE_CHAIN_TIMELINE } from '../components/completion/done_chain_gate';

const day = '2026-10-15';
const lessonDay = (units: number) => ({ schemaVersion: 1, ownerKey: 'u', dayKey: day, tasks: [{ kind: 'lesson', units, unitKeys: [], done: units >= 1, doneAtMs: null, rewardCoins: 50, rewardStatus: 'none' }] });
const baseProps = { title: 'Урок пройден', subtitle: 'Урок 5 · Present Simple', stars: 3, correct: 17, wrong: 3, coinsGained: 150, primaryLabel: 'Следующий урок', onPrimary: jest.fn(), onClose: jest.fn() } as const;

describe('m10 · гейт показа', () => {
  const ok = { momentsV3: true, isCombo: false, counts: { correct: 17, wrong: 3 }, stars: 3 };
  it('играет только при moments_v3, не для комбо, со счётом и звёздами; причина в журнал', () => {
    expect(decideDoneChain(ok)).toEqual({ play: true, reason: expect.stringContaining('звёзды=3') });
    expect(decideDoneChain({ ...ok, momentsV3: false }).play).toBe(false);
    expect(decideDoneChain({ ...ok, isCombo: true }).play).toBe(false);
    expect(decideDoneChain({ ...ok, counts: null }).play).toBe(false);
    expect(decideDoneChain({ ...ok, stars: null }).play).toBe(false);
  });
  it('тайминги эталона: 300 мс + 620 × i, восемь блоков, 500 мс на всплытие', () => {
    expect([0, 4, 6, 7].map(doneChainBeatAt)).toEqual([300, 2780, 4020, 4640]);
    expect(DONE_CHAIN_TIMELINE.beats).toBe(8);
    expect(DONE_CHAIN_TIMELINE.enter).toBe(500);
  });
});

describe('m10 · строки серии и «Сегодня» не выдумывают переходов', () => {
  it('серия: 5 → 6 только если день засчитал этот урок', () => {
    const row = deriveStreakRow({ dayKey: day, counted: false, days: 5 }, { dayKey: day, counted: true, days: 6 });
    expect(row).toMatchObject({ animate: true, from: { days: 5, counted: false }, to: { days: 6, counted: true } });
    expect(deriveStreakRow({ dayKey: day, counted: true, days: 6 }, { dayKey: day, counted: true, days: 6 })).toMatchObject({ animate: false });
    expect(deriveStreakRow(null, { dayKey: day, counted: true, days: 6 })).toMatchObject({ animate: false });
    expect(deriveStreakRow({ dayKey: day, counted: false, days: 5 }, null)).toBeNull();
  });
  it('«Пройти урок»: 0/1 → 1/1 только если задачу закрыл этот урок; нет задачи — нет строки', () => {
    const before = { streak: null, lessonProgress: 0, dayKey: day };
    expect(deriveTodayRow(before, lessonDay(1) as never)).toMatchObject({ from: 0, to: 1, animate: true });
    expect(deriveTodayRow({ ...before, lessonProgress: 1 }, lessonDay(1) as never)).toMatchObject({ animate: false });
    expect(deriveTodayRow({ ...before, dayKey: '2026-10-14' }, lessonDay(1) as never)).toMatchObject({ animate: false });
    expect(deriveTodayRow(before, { ...lessonDay(1), tasks: [] } as never)).toBeNull();
  });
});

describe('m10 · экран итога', () => {
  beforeEach(() => { mockChainLoaded.mockClear(); mockStreak.v = { dayKey: day, counted: true, days: 6 }; mockToday.v = lessonDay(1); mockReduced = true; });

  it('флаг выключен (chain нет) — прежний экран: баланс в шапке, модуль цепочки не загружается', async () => {
    await render(<V2DoneScreen {...baseProps} />);
    expect(screen.getByTestId('v2-done-balance')).toBeTruthy();
    expect(screen.queryByTestId('v2-done-chain-streak')).toBeNull();
    expect(screen.queryByTestId('v2-done-chain-today')).toBeNull();
    expect(mockChainLoaded).not.toHaveBeenCalled();
  });

  it('chain + reduced-motion — сразу финальный кадр: серия 6 дней засчитана, «Пройти урок 1/1», баланс в строке монет', async () => {
    const onFinished = jest.fn();
    await render(<V2DoneScreen {...baseProps} chain={{ before: { streak: { dayKey: day, counted: false, days: 5 }, lessonProgress: 0, dayKey: day }, onFinished }} />);
    expect(screen.queryByTestId('v2-done-balance')).toBeNull();
    expect(screen.getByTestId('v2-done-chain-balance')).toBeTruthy();
    expect(screen.getByText('Серия — 6 дней')).toBeTruthy();
    expect(screen.getByText('сегодня засчитан')).toBeTruthy();
    expect(screen.getByText('1/1')).toBeTruthy();
    expect(screen.getByText('+150 монет')).toBeTruthy();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('chain с анимацией: тап досматривает до финала и зовёт onFinished один раз', async () => {
    jest.useFakeTimers();
    mockReduced = false;
    const onFinished = jest.fn();
    await render(<V2DoneScreen {...baseProps} chain={{ before: { streak: { dayKey: day, counted: false, days: 5 }, lessonProgress: 0, dayKey: day }, onFinished }} />);
    expect(onFinished).not.toHaveBeenCalled();
    await act(async () => { fireEvent(screen.getByTestId('v2-done-screen'), 'touchStart'); });
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Серия — 6 дней')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(6000); });
    expect(onFinished).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('серия неизвестна и задачи «урок» нет — строк нет, остальное на месте', async () => {
    mockStreak.v = null;
    mockToday.v = { ...lessonDay(1), tasks: [] };
    await render(<V2DoneScreen {...baseProps} chain={{ before: { streak: null, lessonProgress: null, dayKey: day } }} />);
    expect(screen.queryByTestId('v2-done-chain-streak')).toBeNull();
    expect(screen.queryByTestId('v2-done-chain-today')).toBeNull();
    expect(screen.getByText('+150 монет')).toBeTruthy();
  });
});

describe('m10 · подключение к итогу урока', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson_complete.tsx'), 'utf8');
  it('chain передаётся только по защёлкнутому решению, снимок «до» — с первого кадра; m09 ждёт конца цепочки', () => {
    expect(src).toContain('chain={doneChainOn && doneChainBeforeRef.current ?');
    expect(src).toContain('if (doneChainBeforeRef.current === null) doneChainBeforeRef.current = captureDoneChainBefore();');
    // зачем: другие условия очереди (рубеж серии Тем) могут стоять рядом — проверяем только, что m09 ждёт конца цепочки
    const perfectLine = src.split('\n').find((l) => l.includes('const perfectMomentOn = sequenceShowing && perfectDecision.show')) ?? '';
    expect(perfectLine).toContain('(!doneChainOn || doneChainFinished)');
  });
});
