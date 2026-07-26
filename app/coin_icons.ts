import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

/**
 * Иконки монет по балансу (экономика «Монеты и Звёзды», docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §8).
 * Все require статические — для Metro. Ассеты: assets/images/currency/coin_{1,2,3,5,10}.webp
 * (генератор: scripts/generate-coin-icons.mjs).
 *
 * Число рядом с иконкой — всегда главный индикатор; иконка лишь визуальный «уровень».
 * Доступность: VoiceOver/TalkBack-текст обязателен («Баланс: 42 монеты»), не полагаемся на картинку.
 */
export const PEARL_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/currency/pearl_dark.webp'), gold: require('../assets/images/currency/pearl_gold.webp'), coral: require('../assets/images/currency/pearl_coral.webp'), minimalDark: require('../assets/images/currency/pearl_minimalDark.webp'), midnight: require('../assets/images/currency/pearl_midnight.webp'), ember: require('../assets/images/currency/pearl_ember.webp'), aurora: require('../assets/images/currency/pearl_aurora.webp'), volt: require('../assets/images/currency/pearl_volt.webp'), business: require('../assets/images/currency/pearl_business.webp'), businessLight: require('../assets/images/currency/pearl_businessLight.webp'), candyBlue: require('../assets/images/currency/pearl_candyBlue.webp'), indigo: require('../assets/images/currency/pearl_indigo.webp'),
} as const;

export type CoinIconKey = keyof typeof PEARL_ICONS;

/** Пороги из спеки: 0–19 → coin_1, 20–99 → coin_2, 100–299 → coin_3, 300–999 → coin_5, 1000+ → coin_10. */
export function coinIconForBalance(_balance: number, themeMode: ThemeMode = 'minimalDark'): ImageSourcePropType {
  return PEARL_ICONS[themeMode] ?? PEARL_ICONS.minimalDark;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
