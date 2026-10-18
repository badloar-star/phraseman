// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m07; образец floor3/summit3): итог этажа и вершины — отдельный экран; монеты за этаж по правилу 10×N и бонус вершины — из config/spire_v1,
// «На N этаж» / «Дальше» зовут прежний подъём, «Передохнуть» закрывает; компонент ничего не пишет.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const Text = (props: Record<string, unknown>) => R.createElement('Text', props, props.children);
  const chain = { delay: () => chain, duration: () => chain };
  return { __esModule: true, default: { View, Text }, FadeIn: chain, useReducedMotion: () => true };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn(), hapticMediumImpact: jest.fn(), hapticHeavyImpact: jest.fn() }));
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn() }));
jest.mock('../modules/sound_v2/legacy_bridge', () => ({ playUnlessRecentlyPlayed: jest.fn() }));
jest.mock('../components/streak/moments/StreakConfetti', () => ({ __esModule: true, default: 'StreakConfetti' }));
// зачем (R02, 15.10): кадр башни момента считает границу лиги (spire_tower_bounds → SpireTowerFinial → react-native-svg) — навершие подменено, у наряда есть радиус ореола
jest.mock('../components/spire/SpireTowerFinial', () => ({ spireFinialTopY: () => 0 }));
jest.mock('../modules/spire/tower_skins', () => ({ spireSkinForTier: () => ({ id: 'mock-skin', premium: false, glowR: 40, pennant: false }) }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/SpireTowerSvg', () => ({ __esModule: true, default: 'SpireTowerSvg' }));
jest.mock('../components/spire/useSpireScene', () => ({ useSpireScene: () => ({ light: false }) }));
jest.mock('../components/spire/moments/moments_effects', () => ({ __esModule: true, default: () => null, useMomentRumble: () => ({ style: {}, play: jest.fn() }) }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ bg: '#0E1214', bgTop: '#16241F', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8' }),
}));

import SpireFloorMoment from '../components/spire/moments/SpireFloorMoment';
import type { SpireStepOutcome } from '../app/spire/use_spire_game';
import type { SpireCoinsConfig } from '../modules/spire/config_contract';
import { normalizeEol } from './helpers/read_source';
import { glueNumbers } from '../components/moments/glue_numbers'; // зачем (18.10, adc27e26e): тексты моментов склеивают число со словом

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const COINS = { perStep: 10, perFloorPerLevel: 10, guardianMultiplier: 2, summitBonus: 200 } as unknown as SpireCoinsConfig;
const outcome = (patch: Partial<SpireStepOutcome>, local: Record<string, number>): SpireStepOutcome => ({
  kind: 'floor', report: {} as never, errors: 0, usedMs: 72_000, budgetMs: 120_000, floorBefore: 4, local: { tier: 0, floor: 5, stepInFloor: 0, stepsCleared: 20, ...local } as never, failReason: null as never, ...patch,
});

describe('m07 · этаж пройден', () => {
  it('«Этаж 4 пройден», монеты 10×4 = 40 из конфига, следующий этаж — Страж (каждый 5-й): «Впереди Страж», «На 5 этаж» зовёт подъём, «Передохнуть» закрывает', async () => {
    const onNext = jest.fn();
    const onLater = jest.fn();
    await render(<SpireFloorMoment lang="ru" outcome={outcome({}, {})} coins={COINS} coinRank={5} onNext={onNext} onLater={onLater} />);
    expect(screen.getByText('ЭТАЖ 4 ПРОЙДЕН')).toBeTruthy();
    expect(screen.getByTestId('floor-moment-count').props.children).toBe('+40');
    expect(screen.getByTestId('floor-moment-title').props.children).toBe('Впереди Страж');
    expect(screen.getByTestId('floor-moment-tower')).toBeTruthy();
    expect(screen.getByText('На 5 этаж')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('floor-moment-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('floor-moment-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('следующий этаж обычный: «Впереди этаж 4», монеты за пройденный этаж 3 — 30', async () => {
    await render(<SpireFloorMoment lang="ru" outcome={outcome({ floorBefore: 3 }, { floor: 4 })} coins={COINS} coinRank={5} onNext={jest.fn()} onLater={jest.fn()} />);
    expect(screen.getByTestId('floor-moment-title').props.children).toBe('Впереди этаж 4');
    expect(screen.getByTestId('floor-moment-count').props.children).toBe('+30');
  });
});

describe('m07 · вершина', () => {
  it('«Вершина», «15 этаж», бонус из config.coins.summitBonus, «Дальше» зовёт подъём; захардкоженного «+200» в коде нет', async () => {
    const onNext = jest.fn();
    await render(<SpireFloorMoment lang="ru" outcome={outcome({ kind: 'summit', floorBefore: 15 }, { floor: 16 })} coins={{ ...COINS, summitBonus: 250 } as SpireCoinsConfig} coinRank={5} onNext={onNext} onLater={jest.fn()} />);
    expect(screen.getByText('ВЕРШИНА')).toBeTruthy();
    expect(screen.getByTestId('floor-moment-title').props.children).toBe(glueNumbers('15 этаж'));
    expect(screen.getByTestId('floor-moment-bonus').props.children).toBe(glueNumbers('+250 монет за вершину'));
    await fireEvent.press(screen.getByTestId('floor-moment-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(read('components/spire/moments/SpireFloorMoment.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')).not.toMatch(/\+200/);
  });
});

describe('исходник', () => {
  it('момент ничего не пишет; бесконечных анимаций и обводок нет; карточки шеринга нет (D76)', () => {
    const src = read('components/spire/moments/SpireFloorMoment.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|firestore|withRepeat|borderWidth|borderColor|Share/.test(src)).toBe(false);
  });
});
