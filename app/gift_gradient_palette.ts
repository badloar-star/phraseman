// ════════════════════════════════════════════════════════════════════════════
// gift_gradient_palette.ts — цвет и форма градиента подарка ПОД ТЕМУ.
//
// зачем 2026-08-03 (владелец: «полностью измени цвета градиентов подарков,
// сделай под каждую тему свои цвета и форму градиента, сейчас она говнянная,
// мне не нравится вообще»): цвет подарка считался ТОЛЬКО от редкости тремя
// захардкоженными hex — золото #FFD700, синий #60A5FA, песочный #D6B85C. Одни и
// те же три цвета показывались во всех 13 темах, поэтому в «Индиго» подарки
// выглядели чужеродно жёлтыми, а в «Изумруде» — синими. Тема на них не влияла
// вообще, отсюда ощущение случайного цвета.
//
// Владелец выбрал вариант «от темы + редкость оттенком»: палитру задаёт тема,
// редкость меняет насыщенность и угол внутри неё. Подарки выглядят родными
// каждой теме, но эпический по-прежнему видно.
//
// Цвета НЕ выдумываются: берутся из токенов активной темы (accent/gold), уже
// подобранных под её фон и проверенных на контраст.
// ════════════════════════════════════════════════════════════════════════════
import type { ThemeMode } from '../constants/theme';

export type GiftRarity = 'epic' | 'rare' | 'common';

/** Точки градиента: start/end в долях от 0 до 1, как ждёт LinearGradient. */
export interface GiftGradientShape {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

/**
 * Форма градиента у каждой редкости своя.
 *
 * зачем: владелец просил менять не только цвет, но и ФОРМУ. Эпический льётся
 * по диагонали сверху вниз (самый «объёмный» ход), редкий — мягче и положе,
 * обычный — почти горизонтальный, спокойный. Разницу видно даже боковым зрением,
 * до чтения названия.
 */
const SHAPE_BY_RARITY: Record<GiftRarity, GiftGradientShape> = {
  epic: { start: { x: 0.1, y: 0 }, end: { x: 0.9, y: 1 } },
  rare: { start: { x: 0, y: 0.15 }, end: { x: 1, y: 0.85 } },
  common: { start: { x: 0, y: 0.35 }, end: { x: 1, y: 0.65 } },
};

export function giftGradientShape(rarity: GiftRarity): GiftGradientShape {
  return SHAPE_BY_RARITY[rarity];
}

/**
 * Насыщенность заливки: эпический плотнее, обычный едва тронут цветом.
 * Значения — альфа в hex (две цифры), как их принимает giftTone.
 */
const ALPHA_BY_RARITY: Record<GiftRarity, { dark: string; light: string }> = {
  epic: { dark: '3D', light: '2A' },
  rare: { dark: '2E', light: '20' },
  common: { dark: '1F', light: '16' },
};

export function giftGradientAlpha(rarity: GiftRarity, isLight: boolean): string {
  const entry = ALPHA_BY_RARITY[rarity];
  return isLight ? entry.light : entry.dark;
}

/**
 * Темы, где ЗОЛОТО является лицом темы, а не служебным акцентом.
 *
 * зачем: в «Золоте» и «Полночи» эпический подарок обязан звучать золотом —
 * иначе высшая редкость потеряется на фоне, который сам золотой. В остальных
 * темах эпический берёт accent темы, усиленный до максимальной плотности.
 */
const GOLD_LED_THEMES: ReadonlySet<ThemeMode> = new Set<ThemeMode>([
  'gold', 'midnight', 'ember',
]);

/**
 * Базовый цвет подарка: тема задаёт семейство, редкость — роль внутри него.
 *
 * @param accent  токен accent активной темы
 * @param gold    токен gold активной темы
 */
export function giftGradientBaseColor(
  themeMode: ThemeMode,
  rarity: GiftRarity,
  accent: string,
  gold: string,
): string {
  if (rarity === 'epic') return GOLD_LED_THEMES.has(themeMode) ? gold : accent;
  if (rarity === 'rare') return accent;
  // Обычный подарок не должен спорить с редкими: он берёт тот же тон темы,
  // но самой низкой плотностью (см. ALPHA_BY_RARITY) — цвет читается как
  // оттенок фона, а не как отдельная краска.
  return accent;
}
