/* eslint-disable import/first, @typescript-eslint/no-require-imports */
// Контракт героического модала бонуса дня (владелец, 2026-09-21).
//
// Сторожит две вещи, которые ломались бы молча:
//  1) каждый из пяти «тихих» бонусов получает СВОЙ символ — иначе пять экранов
//     незаметно сольются в один;
//  2) пять бонусов не откатываются на старую заглушку RetiredRasterFallback.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DARK, GOLD, INDIGO, SAGE_PORCELAIN } from '../constants/theme';

// зачем: общий tests/__mocks__/react-native.js подключён через moduleNameMapper
// и отдаёт только Platform/AsyncStorage/AppState — ни StyleSheet, ни View.
// `jest.unmock` против подмены пути бессилен (см. home_rune_balance_render.test.tsx),
// поэтому даём локальную заглушку с нужным минимумом. Общую расширять нельзя:
// на ней висят сотни тестов.
jest.mock('react-native', () => {
  class MockAnimatedValue {
    private current: number;
    constructor(initial: number) { this.current = initial; }
    setValue(next: number) { this.current = next; }
    stopAnimation() { /* значение уже финальное: reduce motion в этих тестах включён */ }
    interpolate() { return this; }
  }
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown) => (Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style),
      absoluteFill: {},
      hairlineWidth: 1,
    },
    Easing: { linear: (v: number) => v },
    Animated: {
      View: 'AnimatedView',
      Value: MockAnimatedValue,
      timing: () => ({ start: (done?: () => void) => done?.(), stop: () => {} }),
    },
  };
});

let mockTheme = INDIGO;
const mockDismiss = jest.fn();
jest.mock('../app/config', () => ({ ENGLISH_UI_LOCALE_ENABLED: true, SPANISH_UI_LOCALE_ENABLED: true }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('@expo/vector-icons/Ionicons', () => require('react-native').View);
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: mockTheme, f: { h1: 30, body: 16, small: 13 } }) }));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotionPreference: () => true, useReduceMotion: () => true }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/modal_fx/HybridSheetShell', () => {
  const { View } = require('react-native');
  // testID пробрасываем: по нему тест развилки узнаёт, какой именно модал открылся.
  return {
    __esModule: true,
    default: ({ visible, children, onClose, testID }: any) => visible
      ? <View testID={testID}>{children({ requestDismiss: () => { mockDismiss(); onClose(); } })}</View>
      : null,
  };
});
jest.mock('../components/PressableHybrid', () => {
  const { Pressable } = require('react-native');
  return { __esModule: true, default: ({ children, contentStyle, ...props }: any) => <Pressable {...props} style={contentStyle}>{children}</Pressable> };
});
// зачем: BoonActivatedSheet (развилка) тянет reanimated ради СТАРОЙ ветки-заглушки.
// Сам героический модал его не использует, но без мока пакет валит весь сюит:
// он поставляется как ESM и не проходит трансформ.
jest.mock('react-native-reanimated', () => ({ __esModule: true, default: { View: 'AnimatedView' } }));
jest.mock('../components/celebration/use_reward_impact_hybrid', () => ({
  useRewardImpactHybrid: () => ({ showRings: false, reduceMotion: true, styles: {} }),
}));
jest.mock('react-native-svg', () => {
  const { View, Text } = require('react-native');
  return { __esModule: true, default: View, Defs: View, LinearGradient: View, Stop: View, Text, Ellipse: View, Path: View };
});

import BoonHeroSheet from '../components/BoonHeroSheet';
import BoonActivatedSheet from '../components/BoonActivatedSheet';
import { hasBoonHeroEmblem } from '../components/boon_hero/BoonHeroEmblem';
import { getBoonFacts } from '../app/boons/boon_facts_copy';
import { ALL_BOON_IDS, type BoonId } from '../app/boons/boon_types';

const HERO_BOONS: readonly BoonId[] = [
  'streak_saver',
  'energy_free_window',
  'turbo_regen',
  'flashcard_friday',
  'speaking_saturday',
];

/** Символ у каждого бонуса свой — иначе пять экранов выглядят одинаково. */
const EXPECTED_SYMBOL: Record<string, string> = {
  streak_saver: 'boon-hero-emblem-shield',
  energy_free_window: 'boon-hero-emblem-bolt',
  turbo_regen: 'boon-hero-emblem-chevrons',
  flashcard_friday: 'boon-hero-emblem-cards',
  speaking_saturday: 'boon-hero-emblem-wave',
};

beforeEach(() => { mockTheme = INDIGO; mockDismiss.mockClear(); });

test('скрытый модал ничего не рисует', async () => {
  const ui = await render(<BoonHeroSheet visible={false} boon="streak_saver" lang="ru" onClose={jest.fn()} />);
  expect(ui.queryByText('Продолжить')).toBeNull();
});

test.each(HERO_BOONS)('%s показывает свой символ и две непустые графы фактов', async (boon) => {
  const ui = await render(<BoonHeroSheet visible boon={boon} lang="ru" onClose={jest.fn()} />);
  expect(ui.getByTestId(EXPECTED_SYMBOL[boon], { includeHiddenElements: true })).toBeTruthy();

  const facts = getBoonFacts(boon, 'ru');
  for (const fact of [facts.effect, facts.duration]) {
    expect(fact.label.trim().length).toBeGreaterThan(0);
    expect(fact.value.trim().length).toBeGreaterThan(0);
    expect(ui.getByText(fact.label)).toBeTruthy();
    expect(ui.getByText(fact.value)).toBeTruthy();
  }
});

test('символы у пяти бонусов различаются — ни одного повтора', () => {
  const symbols = HERO_BOONS.map((boon) => EXPECTED_SYMBOL[boon]);
  expect(new Set(symbols).size).toBe(HERO_BOONS.length);
});

test('CTA закрывает шторку ровно один раз', async () => {
  const onClose = jest.fn();
  const ui = await render(<BoonHeroSheet visible boon="turbo_regen" lang="ru" onClose={onClose} />);
  await fireEvent.press(ui.getByLabelText('Продолжить'));
  expect(mockDismiss).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test.each([DARK, GOLD, INDIGO, SAGE_PORCELAIN])('CTA берёт цвет активной темы', async (theme) => {
  mockTheme = theme;
  const ui = await render(<BoonHeroSheet visible boon="streak_saver" lang="ru" onClose={jest.fn()} />);
  expect(ui.getByLabelText('Продолжить')).toHaveStyle({ backgroundColor: theme.accent });
});

test('заголовок объявлен заголовком для озвучки, герой из озвучки исключён', async () => {
  const ui = await render(<BoonHeroSheet visible boon="speaking_saturday" lang="ru" onClose={jest.fn()} />);
  expect(ui.getByRole('header')).toBeTruthy();
  // Герой декоративный: символ виден только при includeHiddenElements.
  expect(ui.queryByTestId('boon-hero-emblem-wave')).toBeNull();
});

test('эмблема есть ровно у пяти «тихих» бонусов — удвоение и сундук идут своими путями', () => {
  const withEmblem = ALL_BOON_IDS.filter(hasBoonHeroEmblem);
  expect([...withEmblem].sort()).toEqual([...HERO_BOONS].sort());
  expect(hasBoonHeroEmblem('double_xp')).toBe(false);
  expect(hasBoonHeroEmblem('mystery_monday')).toBe(false);
});

test.each(HERO_BOONS)('развилка ведёт %s в новый модал, а не в старую заглушку', async (boon) => {
  const ui = await render(<BoonActivatedSheet visible boon={boon} onClose={jest.fn()} />);
  expect(ui.getByTestId(`boon-hero-sheet-${boon}`, { includeHiddenElements: true })).toBeTruthy();
});
