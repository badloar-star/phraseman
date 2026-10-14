// зачем (координатор 14.10, момент m11): кольца дня в блоке «Сегодня» — только за флагом moments_v3 (по умолчанию выключен): рубежи серии и кольца «Сегодня» собираются в трёх темах
// (Аврора тёмная, Аврора светлая, Ирис светлая); у каждого из 19 рубежей есть сцена, длительность, тайм-лист и тексты на 9 языках; цифра на плашке читается (≥ 4,5:1) на огне любого цвета;
// флаг moments_v3 по умолчанию выключен; никто не импортирует components/streak/moments до решения Ядра; огонь — только StreakFlameFill / LiveStreakFlame; звук — имена событий.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-svg', () => {
  const Null = () => null;
  return { __esModule: true, default: Null, Circle: Null, Path: Null, Defs: Null, RadialGradient: Null, Stop: Null, Rect: Null };
});
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const chain: Record<string, unknown> = {};
  chain.duration = () => chain;
  chain.delay = () => chain;
  chain.easing = () => chain;
  const bezier = () => () => 0;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    Easing: { out: () => () => 0, cubic: () => 0, quad: () => 0, linear: () => 0, bezier },
    FadeIn: chain,
    FadeInDown: chain,
    ZoomIn: chain,
    cancelAnimation: () => undefined,
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedProps: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withDelay: (_d: number, v: unknown) => v,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock('../app/stable_safe_area_metrics', () => ({ useStableSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ themeMode: 'dark', liquidGlassThemeId: 'aurora' }) }));
jest.mock('../components/icons/LiveStreakFlame', () => ({ __esModule: true, default: 'LiveStreakFlame' }));
jest.mock('../components/streak/StreakFlameFill', () => ({ StreakFlameFill: 'StreakFlameFill' }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/AchievementArt', () => ({ __esModule: true, default: 'AchievementArt' }));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/moments/moments_effects', () => ({
  __esModule: true,
  default: 'MomentFirework',
  useMomentRumble: () => ({ style: {}, play: jest.fn() }),
  momentJitter: (i: number, salt: number) => ((i * 7 + salt * 13) % 100) / 100,
}));
jest.mock('../components/spire/moments/moments_layout', () => {
  const R = jest.requireActual('react');
  return { MomentFullScreen: (props: { children: unknown }) => R.createElement('View', null, props.children) };
});
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress?: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, accessibilityRole: 'button', accessibilityLabel: props.label, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn(() => ({ event: 'x', played: true })) }));
jest.mock('../app/flashcards/SoundService', () => ({ playSfx: jest.fn() }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));

type Pal = Record<string, string>;
const PALETTES: Readonly<Record<string, Pal>> = {
  'Аврора тёмная': { bg: '#0E1214', bgTop: '#16241F', card: '#1B2123', control: '#2A3234', track: '#2F3A3C', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', ctaText: '#06241A', accentText: '#7EF0C8', gold: '#FFD27A' },
  'Аврора светлая': { bg: '#EAF3EF', bgTop: '#F4FAF7', card: '#FFFFFF', control: '#DDE8E3', track: '#CFDCD6', text: '#14121C', textSecondary: '#514D63', cta: '#1F9E7A', ctaText: '#FFFFFF', accentText: '#127556', gold: '#8A5A00' },
  'Ирис светлая': { bg: '#E8E4F2', bgTop: '#F6F2FA', card: '#FFFFFF', control: '#DDD8EA', track: '#CFC9E0', text: '#14121C', textSecondary: '#514D63', cta: '#6B5BD6', ctaText: '#FFFFFF', accentText: '#4A3BB0', gold: '#8A5A00' },
};
let mockPalette: Pal = PALETTES['Аврора тёмная'];
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => mockPalette }));

jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => 5 }));
jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: (n: unknown) => typeof n === 'number' }));
let mockBools: Record<string, unknown> = {};
jest.mock('../app/remote_config_client', () => ({ readRemoteConfigCacheRaw: async () => JSON.stringify({ bools: mockBools }) }));
jest.mock('../app/events', () => ({ onAppEvent: () => ({ remove: () => undefined }) }));

import TodayRingsSlot from '../components/streak/moments/TodayRingsSlot';
import { todayRingColors } from '../components/streak/moments/TodayRings';

const TASKS = [{ progress: 1, target: 1 }, { progress: 3, target: 3 }, { progress: 10, target: 10 }];

describe('кольца «Сегодня» в блоке — флаг moments_v3', () => {
  it('флаг выключен (нет ключа в кэше): слот ничего не рисует', async () => {
    mockBools = {};
    await render(<TodayRingsSlot tasks={TASKS} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('today-rings')).toBeNull();
  });
  it('цвета колец = акцент, второй цвет, золото темы (те же, что у отметок строк)', () => {
    expect(todayRingColors({ accent: '#111111', second: '#222222', gold: '#333333' })).toEqual(['#111111', '#222222', '#333333']);
  });
});
