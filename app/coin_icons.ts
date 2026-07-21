import type { ImageSourcePropType } from 'react-native';

/**
 * Иконки монет по балансу (экономика «Монеты и Звёзды», docs/plans/2026-07-20-coins-stars-economy-plan.ru.md §8).
 * Все require статические — для Metro. Ассеты: assets/images/currency/coin_{1,2,3,5,10}.webp
 * (генератор: scripts/generate-coin-icons.mjs).
 *
 * Число рядом с иконкой — всегда главный индикатор; иконка лишь визуальный «уровень».
 * Доступность: VoiceOver/TalkBack-текст обязателен («Баланс: 42 монеты»), не полагаемся на картинку.
 */
export const COIN_ICONS = {
  coin_1: require('../assets/images/currency/coin_1.webp'),
  coin_2: require('../assets/images/currency/coin_2.webp'),
  coin_3: require('../assets/images/currency/coin_3.webp'),
  coin_5: require('../assets/images/currency/coin_5.webp'),
  coin_10: require('../assets/images/currency/coin_10.webp'),
} as const;

export type CoinIconKey = keyof typeof COIN_ICONS;

/** Пороги из спеки: 0–19 → coin_1, 20–99 → coin_2, 100–299 → coin_3, 300–999 → coin_5, 1000+ → coin_10. */
export function coinIconForBalance(balance: number): ImageSourcePropType {
  const n = Math.floor(Number(balance));
  if (!Number.isFinite(n) || n < 20) return COIN_ICONS.coin_1;
  if (n < 100) return COIN_ICONS.coin_2;
  if (n < 300) return COIN_ICONS.coin_3;
  if (n < 1000) return COIN_ICONS.coin_5;
  return COIN_ICONS.coin_10;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
