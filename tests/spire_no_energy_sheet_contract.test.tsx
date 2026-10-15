// зачем (координатор 15.10, m22 к сборке 16.10; эталон engagement-moments-v3-all.html m22 · A): шторка «Энергия закончилась → Plus» над доком Пика.
// Живой отсчёт энергии в подзаголовке; «Попробовать Plus» — колбэк (пейвол открывает док, путь покупки не тронут); «Подожду 10 минут» — закрыть;
// мелкая строка: пробный доступен → fineTrial, нет → finePrice, нет цены в кэше → строки нет; двойной тап гасится; тексты на 9 языках.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

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
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Ionicons' }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../modules/sound_v2/sound_bank', () => ({ playEvent: jest.fn() }));
jest.mock('../components/spire/useSpireShadow', () => ({ useSpireShadow: () => ({ plate: {}, nested: {}, action: () => ({}) }) }));
jest.mock('../components/v2/V2Pressable', () => ({
  __esModule: true,
  default: (props: { testID?: string; onPress?: () => void; children?: unknown; accessibilityLabel?: string }) =>
    require('react').createElement('Pressable', { testID: props.testID, onPress: props.onPress, accessibilityLabel: props.accessibilityLabel }, props.children),
}));
jest.mock('../components/v2/KitSheetModal', () => ({
  KitSheetModal: (props: { visible: boolean; header: unknown; children: unknown; testID?: string }) =>
    (props.visible ? require('react').createElement('View', { testID: props.testID }, props.header, props.children) : null),
}));
jest.mock('../components/v2/V2Kit', () => {
  const R = jest.requireActual('react');
  return { V2Button: (props: { label: string; onPress: () => void; testID?: string }) => R.createElement('Pressable', { testID: props.testID, onPress: props.onPress }, R.createElement('Text', null, props.label)) };
});
jest.mock('../components/spire/useSpirePalette', () => ({
  useSpirePalette: () => ({ card: '#1B2123', control: '#2A3234', text: '#FFFFFF', textSecondary: '#B8C0C4', cta: '#7EF0C8', ctaText: '#04261D', accentTextSafe: '#7EF0C8' }),
}));
jest.mock('../components/spire/spire_game_strings', () => ({ spireGameText: () => 'Close' }));

let mockClock = '9:40';
jest.mock('../components/EnergyContext', () => ({ useEnergyCountdown: () => ({ formattedTime: mockClock }) }));
let mockTrial = false;
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ trialEligible: mockTrial }) }));
type Cache = { v: 1; savedAt: number; monthly?: { productId: string; price: string; perMonth: string }; yearly?: { productId: string; price: string; perMonth: string } } | null;
let mockCache: Cache = null;
jest.mock('../app/paywall_price_cache', () => ({
  peekPaywallPriceCache: () => mockCache,
  hydratePaywallPriceCache: () => Promise.resolve(mockCache),
}));

import SpireNoEnergySheet, { noEnergyPriceLine } from '../components/spire/moments/SpireNoEnergySheet';
import { NO_ENERGY_SHEET_LANGS, NO_ENERGY_SHEET_STRING_KEYS, noEnergySheetText } from '../components/spire/moments/no_energy_sheet_strings';

const MONTHLY = { v: 1 as const, savedAt: 1, monthly: { productId: 'm', price: '€4,99', perMonth: '€4,99' } };
const YEARLY_ONLY = { v: 1 as const, savedAt: 1, yearly: { productId: 'y', price: '€39,99', perMonth: '€3,33' } };

beforeEach(() => { mockClock = '9:40'; mockTrial = false; mockCache = null; });

describe('m22 шторка «Энергия закончилась → Plus»', () => {
  it('скрыта, пока не открыта', async () => {
    await render(<SpireNoEnergySheet lang="ru" visible={false} onPlus={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByTestId('no-energy-sheet')).toBeNull();
  });

  it('тексты эталона и живой отсчёт в подзаголовке', async () => {
    await render(<SpireNoEnergySheet lang="ru" visible onPlus={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Энергия')).toBeTruthy();
    expect(screen.getByText('Энергия закончилась')).toBeTruthy();
    expect(screen.getByTestId('no-energy-sheet-sub').props.children).toBe('Следующая — через 9:40. С Plus — без ожидания.');
    expect(screen.getByText('Энергия не кончается')).toBeTruthy();
    expect(screen.getByText('Попробовать Plus')).toBeTruthy();
    expect(screen.getByText('Подожду 10 минут')).toBeTruthy();
  });

  it('«Попробовать Plus» зовёт onPlus один раз (двойной тап гасится), onClose не зовёт', async () => {
    const onPlus = jest.fn();
    const onClose = jest.fn();
    await render(<SpireNoEnergySheet lang="ru" visible onPlus={onPlus} onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('no-energy-sheet-plus'));
    await fireEvent.press(screen.getByTestId('no-energy-sheet-plus'));
    expect(onPlus).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('«Подожду 10 минут» закрывает шторку', async () => {
    const onClose = jest.fn();
    await render(<SpireNoEnergySheet lang="ru" visible onPlus={jest.fn()} onClose={onClose} />);
    await fireEvent.press(screen.getByTestId('no-energy-sheet-wait'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('нет цены в кэше — строки цены нет', async () => {
    await render(<SpireNoEnergySheet lang="ru" visible onPlus={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByTestId('no-energy-sheet-price')).toBeNull();
  });

  it('цена есть, пробного нет — только цена', async () => {
    mockCache = MONTHLY;
    await render(<SpireNoEnergySheet lang="ru" visible onPlus={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('no-energy-sheet-price').props.children).toBe('≈ €4,99/мес');
  });

  it('цена есть, пробный доступен — строка эталона с пробным', async () => {
    mockCache = MONTHLY;
    mockTrial = true;
    await render(<SpireNoEnergySheet lang="ru" visible onPlus={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('no-energy-sheet-price').props.children).toBe('пробный период из магазина · ≈ €4,99/мес');
  });

  it('нет месячного — годовой в пересчёте на месяц', () => {
    expect(noEnergyPriceLine('ru', YEARLY_ONLY, false)).toEqual({ text: '≈ €3,33/мес', source: 'cache', plan: 'yearly_per_month' });
    expect(noEnergyPriceLine('ru', null, true)).toEqual({ text: null, source: 'none', plan: 'none' });
  });

  it('все строки есть на 9 языках, подстановки не теряются', () => {
    for (const lang of NO_ENERGY_SHEET_LANGS) {
      for (const key of NO_ENERGY_SHEET_STRING_KEYS) {
        const text = noEnergySheetText(lang, key, { t: '9:40', price: '€4,99' });
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/\{\w+\}/);
      }
    }
  });
});
