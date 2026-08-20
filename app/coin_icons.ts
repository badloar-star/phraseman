import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

/**
 * Тематические иконки жемчуга. Все require статические — для Metro.
 *
 * Число рядом с иконкой — всегда главный индикатор.
 * Доступность: VoiceOver/TalkBack-текст обязателен («Баланс: 42 жемчужины»), не полагаемся на картинку.
 */
export const PEARL_ICONS: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/currency/pearl_dark.webp'),
  gold: require('../assets/images/currency/pearl_gold.webp'),
  olive: require('../assets/images/currency/pearl_olive.webp'),
  midnight: require('../assets/images/currency/pearl_midnight.webp'),
  ember: require('../assets/images/currency/pearl_ember.webp'),
  aurora: require('../assets/images/currency/pearl_aurora.webp'),
  volt: require('../assets/images/currency/pearl_volt.webp'),
  indigo: require('../assets/images/currency/pearl_indigo.webp'),
  sagePorcelain: require('../assets/images/currency/pearl_sagePorcelain.webp'),
} as const;

export type PearlIconKey = keyof typeof PEARL_ICONS;

export function pearlIconForTheme(themeMode: ThemeMode): ImageSourcePropType {
  return PEARL_ICONS[themeMode] ?? PEARL_ICONS.indigo;
}

/** @deprecated Технический алиас: используйте pearlIconForTheme(themeMode). */
export function coinIconForBalance(_balance: number, themeMode: ThemeMode = 'indigo'): ImageSourcePropType {
  return pearlIconForTheme(themeMode);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
