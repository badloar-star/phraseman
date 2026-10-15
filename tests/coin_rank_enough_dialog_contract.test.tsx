// зачем (владелец 14.10, ТЗ ETALON_MOMENTS_V3_TRANSFER m14A): окно «Хватает на ранг N» — тексты и цена из таблицы рангов (N × 1000), две кнопки, звуки V2, ничего не списывает.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  const chain = { duration: () => chain };
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0, inOut: () => () => 0, quad: () => 0 },
    FadeIn: chain,
    cancelAnimation: () => undefined,
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => true,
    withRepeat: (v: unknown) => v,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    withTiming: (v: unknown) => v,
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => true }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn(), hapticMediumImpact: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
const mockPlayEvent = jest.fn();
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: (...args: unknown[]) => mockPlayEvent(...args) }));
jest.mock('../app/coin_rank_table_v1', () => ({
  COIN_RANK_MAX: 19,
  isValidCoinRank: (r: unknown) => typeof r === 'number' && r >= 0 && r <= 19,
  coinRankRowForDisplay: (r: number) => ({ priceToReach: r * 1000 }),
}));
jest.mock('../components/moments/MomentCoin', () => ({ __esModule: true, default: 'MomentCoin' }));
jest.mock('../components/spire/SpireRankCoin', () => ({ __esModule: true, default: 'SpireRankCoin' }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {} }) }));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({ card: '#1B2123', text: '#FFFFFF', textSecondary: '#B8C0C4' }) }));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});

import CoinRankEnoughDialog from '../components/coin_rank_moments/CoinRankEnoughDialog';
import { COIN_RANK_LANGS, COIN_RANK_STRING_KEYS, coinRankNumber, coinRankText, coinRankCoinsWord } from '../components/coin_rank_moments/coin_rank_strings';
import { normalizeEol } from './helpers/read_source';

const read = (rel: string) => normalizeEol(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')).split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('окно «Хватает на ранг N» (m14A)', () => {
  beforeEach(() => { mockPlayEvent.mockClear(); });

  it('ранг 5 → «Хватает на ранг 6», цена 6 000 из таблицы, две кнопки, звуки sheet_open и coin_rank', async () => {
    const onUpgrade = jest.fn();
    const onLater = jest.fn();
    await render(<CoinRankEnoughDialog lang="ru" coinRank={5} coins={7004} onUpgrade={onUpgrade} onLater={onLater} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(screen.getByText('Хватает на ранг 6')).toBeTruthy();
    expect(screen.getByText(/7\s004 монеты — ранг 6 стоит 6\s000\./)).toBeTruthy();
    expect(screen.getByText(/Повысить за 6\s000/)).toBeTruthy();
    expect(mockPlayEvent).toHaveBeenCalledWith('sheet_open');
    expect(mockPlayEvent).toHaveBeenCalledWith('coin_rank');
    await fireEvent.press(screen.getByTestId('coin-rank-enough-upgrade'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('coin-rank-enough-later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('максимальный ранг → окно не рисуется (следующего нет)', async () => {
    await render(<CoinRankEnoughDialog lang="ru" coinRank={19} coins={99999} onUpgrade={jest.fn()} onLater={jest.fn()} />);
    expect(screen.queryByTestId('coin-rank-enough')).toBeNull();
  });
});

describe('тексты и исходник', () => {
  it('каждая строка есть на 9 языках; подстановки работают', () => {
    for (const key of COIN_RANK_STRING_KEYS) for (const lang of COIN_RANK_LANGS) expect([key, lang, coinRankText(lang, key).length > 0]).toEqual([key, lang, true]);
    expect(coinRankText('en', 'title', { n: 6 })).toBe('You can afford rank 6');
    expect(coinRankNumber(6000)).toBe('6 000');
    // лист приёмки m14: слово «монета» склоняется по числу
    expect([1, 2, 5, 11, 21, 22].map((n) => coinRankCoinsWord('ru', n))).toEqual(['монета', 'монеты', 'монет', 'монет', 'монета', 'монеты']);
    expect([1, 2].map((n) => coinRankCoinsWord('en', n))).toEqual(['coin', 'coins']);
  });

  it('окно ничего не списывает и не пишет; бесконечная пульсация под охраной', () => {
    const src = read('components/coin_rank_moments/CoinRankEnoughDialog.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/AsyncStorage|upgradeCoinRank|firestore|fetch\(/.test(src)).toBe(false);
    expect(src).toContain('useRuntimeActive');
    expect(/borderWidth|borderColor/.test(src)).toBe(false);
  });
});
