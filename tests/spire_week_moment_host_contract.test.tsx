// зачем (владелец 14.10, D191; Ядро — use_spire_week_moment): окно итога недели рисует m01/m02/m03 строго по данным сервера: награда за повышение только из promotionCoins (0 — строки нет),
// лестница и граница зоны — только если поля пришли (с 17.10), напоминания нет — второй кнопки нет. Нет данных — ничего не выдумываем.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null, Ellipse: () => null, Path: () => null, Polygon: () => null, Rect: () => null }));
jest.mock('react-native-gesture-handler', () => {
  const R = jest.requireActual('react');
  return { GestureHandlerRootView: (props: { children: React.ReactNode }) => R.createElement('View', null, props.children) };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const chain = { duration: () => chain, easing: () => chain };
  return {
    __esModule: true,
    default: { View },
    Easing: { out: () => () => 0, cubic: () => 0, quad: () => 0, linear: () => 0, bezier: () => () => 0 },
    FadeIn: chain,
    FadeOut: chain,
    cancelAnimation: () => undefined,
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn(), hapticMediumImpact: jest.fn(), hapticHeavyImpact: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));
jest.mock('../components/spire/useSpireScene', () => ({ useSpireScene: () => ({ light: false }) }));
jest.mock('../components/spire/SpireTowerSvg', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', card: '#1B2123', cardRaised: '#242B2E', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', correct: '#5FE3C0', accentText: '#7EF0C8' }),
}));

import SpireWeekMomentHost, { spireWeekGapToTop5, spireWeekLadderRows } from '../components/spire/moments/SpireWeekMomentHost';
import type { SpireWeekMomentShow } from '../app/spire/spire_week_moment_gate';

type Result = SpireWeekMomentShow['result'];
const result = (patch: Partial<Result>): Result => ({
  weekId: '2026-W41', lang: 'en', steps: 12, roomRank: 5, roomTotal: 30, promoted: false, demoted: false, prevTier: 0, newTier: 0, placeCoins: 0, promotionCoins: 0, rankBy: 'coins', weekCoins: 470, ...patch,
});
const decision = (outcome: SpireWeekMomentShow['outcome'], patch: Partial<Result>): SpireWeekMomentShow => ({ show: true, uid: 'u1', lang: 'en', weekId: '2026-W41', outcome, result: result(patch) });
const LADDER = [
  { place: 1, name: 'Марк', coinRank: 12, coins: 610, isMe: false },
  { place: 2, name: 'Ты', coinRank: 5, coins: 470, isMe: true },
];

describe('окно итога недели (D191): вид по данным сервера', () => {
  it('повысили: награда только из promotionCoins; 0 → строки «+N монет за повышение» нет', async () => {
    const onClose = jest.fn();
    await render(<SpireWeekMomentHost lang="ru" decision={decision('promoted', { promoted: true, prevTier: 0, newTier: 1, promotionCoins: 100 })} coinRank={5} onClose={onClose} />);
    expect(screen.getByText('Базальт')).toBeTruthy();
    expect(screen.getByText('+100 монет за повышение')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('moment-promotion-play'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('повысили без награды сервера: строки бонуса нет', async () => {
    await render(<SpireWeekMomentHost lang="ru" decision={decision('promoted', { promoted: true, prevTier: 0, newTier: 1, promotionCoins: 0 })} coinRank={5} onClose={jest.fn()} />);
    expect(screen.getByText('Базальт')).toBeTruthy();
    expect(screen.queryByText(/за повышение/)).toBeNull();
  });

  it('повысили без лестницы (старый итог): акт 1 не рисуется — таблицы комнаты нет', async () => {
    await render(<SpireWeekMomentHost lang="ru" decision={decision('promoted', { promoted: true, prevTier: 0, newTier: 1, promotionCoins: 100 })} coinRank={5} onClose={jest.fn()} />);
    expect(screen.queryByTestId('moment-promotion-row-0')).toBeNull();
    expect(screen.queryByTestId('moment-promotion-drum')).toBeNull();
  });

  it('удержались без границы зоны: «Остаёшься в Граните», место и монеты, строки «не хватило» нет', async () => {
    const onClose = jest.fn();
    await render(<SpireWeekMomentHost lang="ru" decision={decision('stayed', { roomRank: 12, weekCoins: 1180 })} coinRank={5} onClose={onClose} />);
    expect(screen.getByText('Остаёшься в Граните')).toBeTruthy();
    expect(screen.getByText(/12 место · 1\s180 монет за неделю\./)).toBeTruthy();
    expect(screen.queryByText(/не хватило/)).toBeNull();
    await fireEvent.press(screen.getByTestId('moment-stay-play'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('удержались с границей зоны: «До топ-5 не хватило 240» из promotionLineCoins − weekCoins', async () => {
    await render(<SpireWeekMomentHost lang="ru" decision={decision('stayed', { roomRank: 12, weekCoins: 460, promotionLineCoins: 700 })} coinRank={5} onClose={jest.fn()} />);
    expect(screen.getByText(/До топ-5 не хватило/)).toBeTruthy();
    expect(screen.getByText('240')).toBeTruthy();
  });

  it('понизили: «Новая неделя», «Играть»; напоминания нет — второй кнопки нет', async () => {
    const onClose = jest.fn();
    await render(<SpireWeekMomentHost lang="ru" decision={decision('demoted', { demoted: true, prevTier: 1, newTier: 0 })} coinRank={5} onClose={onClose} />);
    expect(screen.getByTestId('moment-down-title').props.children).toBe('Новая неделя');
    expect(screen.queryByTestId('moment-down-remind')).toBeNull();
    await fireEvent.press(screen.getByTestId('moment-down-play'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('напоминание вечером (m03)', () => {
  it('хук Ядра дал напоминание → кнопка «Напомнить вечером» есть и зовёт колбэк', async () => {
    const onRemind = jest.fn();
    await render(<SpireWeekMomentHost lang="ru" decision={decision('demoted', { demoted: true, prevTier: 1, newTier: 0 })} coinRank={5} onClose={jest.fn()} onRemind={onRemind} />);
    await fireEvent.press(screen.getByTestId('moment-down-remind'));
    expect(onRemind).toHaveBeenCalledTimes(1);
  });
});

describe('помощники окна', () => {
  it('лестница сервера → строки момента; нет поля или пусто → undefined', () => {
    expect(spireWeekLadderRows(undefined)).toBeUndefined();
    expect(spireWeekLadderRows([])).toBeUndefined();
    expect(spireWeekLadderRows(LADDER)?.map((r) => [r.uid, r.name, r.isMe])).toEqual([['ladder-1', 'Марк', false], ['ladder-2', 'Ты', true]]);
  });

  it('разрыв до топ-5: граница − мои монеты, не меньше 0; нет границы — undefined', () => {
    expect(spireWeekGapToTop5(result({ weekCoins: 460, promotionLineCoins: 700 }))).toBe(240);
    expect(spireWeekGapToTop5(result({ weekCoins: 800, promotionLineCoins: 700 }))).toBe(0);
    expect(spireWeekGapToTop5(result({ weekCoins: 460 }))).toBeUndefined();
  });
});
